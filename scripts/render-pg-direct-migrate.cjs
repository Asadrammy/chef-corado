const crypto = require("crypto");
const fs = require("fs");
const net = require("net");
const path = require("path");
const tls = require("tls");

const sourceUrl = process.env.SOURCE_DATABASE_URL;
const destinationUrl = process.env.DESTINATION_DATABASE_URL;
const batchSize = Number.parseInt(process.env.MIGRATION_BATCH_SIZE || "100", 10);

if (require.main === module && (!sourceUrl || !destinationUrl)) {
  console.error("SOURCE_DATABASE_URL and DESTINATION_DATABASE_URL are required.");
  process.exit(1);
}

const expectedTableOrder = [
  "User",
  "Account",
  "Session",
  "VerificationToken",
  "ChefProfile",
  "Menu",
  "MenuSection",
  "MenuItem",
  "Experience",
  "Request",
  "RequestInvitation",
  "Proposal",
  "Booking",
  "Payment",
  "Review",
  "Notification",
  "NotificationPreference",
  "Message",
  "ModerationFlag",
  "Availability",
  "Payout",
  "Refund",
  "Dispute",
  "WebhookLog",
  "Ledger",
  "AuditLog",
  "SlotLock",
  "EventQueue",
  "ChefKpiSnapshot",
];

function cstring(value) {
  return Buffer.from(`${value}\0`);
}

function i32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeInt32BE(value, 0);
  return buffer;
}

function message(type, payload) {
  const body = payload || Buffer.alloc(0);
  return Buffer.concat([Buffer.from(type), i32(body.length + 4), body]);
}

function md5Password(password, user, salt) {
  const inner = crypto.createHash("md5").update(password + user).digest("hex");
  return "md5" + crypto.createHash("md5").update(Buffer.concat([Buffer.from(inner), salt])).digest("hex");
}

function parseScramAttributes(value) {
  return Object.fromEntries(value.split(",").map((part) => [part[0], part.slice(2)]));
}

function hmac(key, value) {
  return crypto.createHmac("sha256", key).update(value).digest();
}

function xorBuffers(left, right) {
  const output = Buffer.alloc(left.length);
  for (let index = 0; index < left.length; index += 1) {
    output[index] = left[index] ^ right[index];
  }
  return output;
}

function saslInitialResponse(user) {
  const nonce = crypto.randomBytes(18).toString("base64");
  const clientFirstBare = `n=${user.replace(/=/g, "=3D").replace(/,/g, "=2C")},r=${nonce}`;
  const clientFirst = `n,,${clientFirstBare}`;
  const mechanism = "SCRAM-SHA-256";
  return {
    nonce,
    clientFirstBare,
    payload: Buffer.concat([
      Buffer.from(mechanism),
      Buffer.from([0]),
      i32(Buffer.byteLength(clientFirst)),
      Buffer.from(clientFirst),
    ]),
  };
}

function saslFinalResponse(password, state, serverFirst) {
  const attrs = parseScramAttributes(serverFirst);
  if (!attrs.r || !attrs.r.startsWith(state.nonce)) {
    throw new Error("SCRAM server nonce did not include client nonce.");
  }

  const salt = Buffer.from(attrs.s, "base64");
  const iterations = Number.parseInt(attrs.i, 10);
  const clientFinalWithoutProof = `c=biws,r=${attrs.r}`;
  const authMessage = `${state.clientFirstBare},${serverFirst},${clientFinalWithoutProof}`;
  const saltedPassword = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256");
  const clientKey = hmac(saltedPassword, "Client Key");
  const storedKey = crypto.createHash("sha256").update(clientKey).digest();
  const clientSignature = hmac(storedKey, authMessage);
  const clientProof = xorBuffers(clientKey, clientSignature).toString("base64");
  const serverKey = hmac(saltedPassword, "Server Key");
  const serverSignature = hmac(serverKey, authMessage).toString("base64");

  return {
    serverSignature,
    payload: Buffer.from(`${clientFinalWithoutProof},p=${clientProof}`),
  };
}

class PgClient {
  constructor(connectionUrl) {
    this.url = new URL(connectionUrl);
    this.user = decodeURIComponent(this.url.username);
    this.password = decodeURIComponent(this.url.password);
    this.database = this.url.pathname.slice(1);
    this.host = this.url.hostname;
    this.port = Number.parseInt(this.url.port || "5432", 10);
    this.buffer = Buffer.alloc(0);
    this.waiters = [];
    this.messages = [];
    this.closedError = null;
  }

  async connect() {
    const socket = await new Promise((resolve, reject) => {
      const raw = net.connect({ host: this.host, port: this.port }, () => resolve(raw));
      raw.once("error", reject);
      raw.setTimeout(20000, () => reject(new Error(`Connection timed out for ${this.host}:${this.port}`)));
    });

    socket.write(Buffer.concat([i32(8), i32(80877103)]));
    const sslResponse = await new Promise((resolve, reject) => {
      socket.once("data", resolve);
      socket.once("error", reject);
      socket.once("close", () => reject(new Error(`Connection closed during SSL negotiation for ${this.host}`)));
    });
    if (process.env.DEBUG_MIGRATION) console.error(`${this.host}: ssl response ${sslResponse.toString("utf8", 0, 1)}`);

    if (sslResponse.toString("utf8", 0, 1) !== "S") {
      throw new Error(`Server at ${this.host} did not accept SSL.`);
    }

    this.socket = tls.connect({
      socket,
      servername: this.host,
      rejectUnauthorized: false,
    });

    this.socket.on("data", (chunk) => this.onData(chunk));
    this.socket.on("error", (error) => this.failPending(error));
    this.socket.on("close", () => this.failPending(new Error(`Connection closed for ${this.host}`)));
    await new Promise((resolve, reject) => {
      this.socket.once("secureConnect", resolve);
      this.socket.once("error", reject);
    });
    if (process.env.DEBUG_MIGRATION) console.error(`${this.host}: tls secure`);

    const startupPairs = [
      cstring("user"),
      cstring(this.user),
      cstring("database"),
      cstring(this.database),
      cstring("client_encoding"),
      cstring("UTF8"),
      cstring("application_name"),
      cstring("codex-render-migration"),
      Buffer.from([0]),
    ];
    const startupBody = Buffer.concat([i32(196608), ...startupPairs]);
    this.socket.write(Buffer.concat([i32(startupBody.length + 4), startupBody]));

    await this.authenticate();
    if (process.env.DEBUG_MIGRATION) console.error(`${this.host}: authenticated`);
  }

  onData(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (this.buffer.length >= 5) {
      const length = this.buffer.readInt32BE(1);
      if (this.buffer.length < length + 1) return;
      const packet = this.buffer.subarray(0, length + 1);
      this.buffer = this.buffer.subarray(length + 1);
      const waiter = this.waiters.shift();
      if (waiter) {
        waiter.resolve(packet);
      } else {
        this.messages.push(packet);
      }
    }
  }

  readMessage() {
    const packet = this.messages.shift();
    if (packet) return Promise.resolve(packet);
    if (this.closedError) return Promise.reject(this.closedError);
    return new Promise((resolve, reject) => {
      this.waiters.push({ resolve, reject });
      this.onData(Buffer.alloc(0));
    });
  }

  failPending(error) {
    this.closedError = error;
    while (this.waiters.length) {
      const waiter = this.waiters.shift();
      waiter.reject(error);
    }
  }

  async authenticate() {
    let scramState = null;
    let expectedServerSignature = null;

    while (true) {
      const packet = await this.readMessage();
      const type = packet.toString("utf8", 0, 1);
      const body = packet.subarray(5);

      if (type === "R") {
        const authType = body.readInt32BE(0);
        if (process.env.DEBUG_MIGRATION) console.error(`${this.host}: auth type ${authType}`);
        if (authType === 0) continue;
        if (authType === 3) {
          this.socket.write(message("p", cstring(this.password)));
          continue;
        }
        if (authType === 5) {
          this.socket.write(message("p", cstring(md5Password(this.password, this.user, body.subarray(4, 8)))));
          continue;
        }
        if (authType === 10) {
          scramState = saslInitialResponse(this.user);
          this.socket.write(message("p", scramState.payload));
          continue;
        }
        if (authType === 11) {
          const serverFirst = body.subarray(4).toString("utf8");
          const final = saslFinalResponse(this.password, scramState, serverFirst);
          expectedServerSignature = final.serverSignature;
          this.socket.write(message("p", final.payload));
          continue;
        }
        if (authType === 12) {
          const attrs = parseScramAttributes(body.subarray(4).toString("utf8"));
          if (attrs.v && expectedServerSignature && attrs.v !== expectedServerSignature) {
            throw new Error("SCRAM server signature verification failed.");
          }
          continue;
        }
        throw new Error(`Unsupported PostgreSQL authentication type: ${authType}`);
      }

      if (type === "E") {
        throw new Error(parseError(body));
      }

      if (type === "Z") return;
    }
  }

  async query(sql) {
    this.socket.write(message("Q", cstring(sql)));
    const results = [];
    let columns = null;

    while (true) {
      const packet = await this.readMessage();
      const type = packet.toString("utf8", 0, 1);
      const body = packet.subarray(5);

      if (type === "T") {
        columns = parseRowDescription(body);
      } else if (type === "D") {
        results.push(parseDataRow(body, columns));
      } else if (type === "E") {
        throw new Error(parseError(body));
      } else if (type === "Z") {
        return results;
      }
    }
  }

  end() {
    if (this.socket) {
      this.socket.end(message("X"));
    }
  }
}

function parseRowDescription(body) {
  let offset = 2;
  const count = body.readInt16BE(0);
  const columns = [];
  for (let index = 0; index < count; index += 1) {
    const end = body.indexOf(0, offset);
    columns.push(body.toString("utf8", offset, end));
    offset = end + 19;
  }
  return columns;
}

function parseDataRow(body, columns) {
  let offset = 2;
  const count = body.readInt16BE(0);
  const row = {};
  for (let index = 0; index < count; index += 1) {
    const length = body.readInt32BE(offset);
    offset += 4;
    row[columns[index]] = length === -1 ? null : body.toString("utf8", offset, offset + length);
    if (length > -1) offset += length;
  }
  return row;
}

function parseError(body) {
  const fields = {};
  let offset = 0;
  while (offset < body.length && body[offset] !== 0) {
    const field = String.fromCharCode(body[offset]);
    const end = body.indexOf(0, offset + 1);
    fields[field] = body.toString("utf8", offset + 1, end);
    offset = end + 1;
  }
  return `${fields.S || "ERROR"} ${fields.C || ""}: ${fields.M || "Unknown PostgreSQL error"}`.trim();
}

function qident(identifier) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function literal(value) {
  return `'${value.replace(/'/g, "''")}'`;
}

async function objectSummary(client) {
  const tables = await client.query(`
    select table_schema, table_name, table_type
    from information_schema.tables
    where table_schema not in ('pg_catalog', 'information_schema')
    order by table_schema, table_name
  `);
  const indexes = await client.query(`
    select schemaname, tablename, indexname, indexdef
    from pg_indexes
    where schemaname not in ('pg_catalog', 'information_schema')
    order by schemaname, tablename, indexname
  `);
  const constraints = await client.query(`
    select table_schema, table_name, constraint_name, constraint_type
    from information_schema.table_constraints
    where table_schema not in ('pg_catalog', 'information_schema')
    order by table_schema, table_name, constraint_name
  `);
  const sequences = await client.query(`
    select sequence_schema, sequence_name
    from information_schema.sequences
    where sequence_schema not in ('pg_catalog', 'information_schema')
    order by sequence_schema, sequence_name
  `);
  const functions = await client.query(`
    select n.nspname as schema_name, p.proname as function_name, pg_get_function_identity_arguments(p.oid) as arguments
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname not in ('pg_catalog', 'information_schema')
    order by n.nspname, p.proname, arguments
  `);
  const triggers = await client.query(`
    select trigger_schema, event_object_table, trigger_name
    from information_schema.triggers
    where trigger_schema not in ('pg_catalog', 'information_schema')
    order by trigger_schema, event_object_table, trigger_name
  `);
  return { tables, indexes, constraints, sequences, functions, triggers };
}

async function tableColumns(client, tableName) {
  const rows = await client.query(`
    select column_name
    from information_schema.columns
    where table_schema = 'public' and table_name = ${literal(tableName)}
    order by ordinal_position
  `);
  return rows.map((row) => row.column_name);
}

async function tableCount(client, tableName) {
  const rows = await client.query(`select count(*)::text as count from ${qident(tableName)}`);
  return Number.parseInt(rows[0].count, 10);
}

async function allCounts(client, tables) {
  const counts = {};
  for (const tableName of tables) {
    counts[tableName] = await tableCount(client, tableName);
  }
  return counts;
}

async function readRowsJson(client, tableName, columns, offset) {
  const projection = columns.map(qident).join(", ");
  const rows = await client.query(`
    select coalesce(json_agg(row_to_json(t)), '[]'::json)::text as rows
    from (
      select ${projection}
      from ${qident(tableName)}
      offset ${offset}
      limit ${batchSize}
    ) t
  `);
  return rows[0].rows;
}

async function insertRowsJson(client, tableName, columns, json) {
  if (json === "[]") return;
  const columnList = columns.map(qident).join(", ");
  await client.query(`
    insert into ${qident(tableName)} (${columnList})
    select ${columnList}
    from json_populate_recordset(null::${qident(tableName)}, ${literal(json)}::json)
  `);
}

async function backupDestination(client) {
  const summary = await objectSummary(client);
  const tables = summary.tables
    .filter((table) => table.table_schema === "public" && table.table_type === "BASE TABLE")
    .map((table) => table.table_name);
  const backup = {};

  for (const tableName of tables) {
    const columns = await tableColumns(client, tableName);
    const count = await tableCount(client, tableName);
    backup[tableName] = [];
    for (let offset = 0; offset < count; offset += batchSize) {
      backup[tableName].push(...JSON.parse(await readRowsJson(client, tableName, columns, offset)));
    }
  }

  fs.mkdirSync(path.join(process.cwd(), "artifacts"), { recursive: true });
  const backupPath = path.join(
    process.cwd(),
    "artifacts",
    `destination-before-migration-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
  return backupPath;
}

async function migrate(source, destination, ddl) {
  const beforeSource = await objectSummary(source);
  const sourceTables = beforeSource.tables
    .filter((table) => table.table_schema === "public" && table.table_type === "BASE TABLE")
    .map((table) => table.table_name);
  const unknownTables = sourceTables.filter((tableName) => !expectedTableOrder.includes(tableName));
  const tablesToCopy = expectedTableOrder.filter((tableName) => sourceTables.includes(tableName));
  const sourceCounts = await allCounts(source, tablesToCopy);
  const backupPath = await backupDestination(destination);

  await destination.query('drop schema if exists "public" cascade; create schema "public";');
  await destination.query(ddl);

  const copied = {};
  for (const tableName of tablesToCopy) {
    const columns = await tableColumns(source, tableName);
    copied[tableName] = 0;
    for (let offset = 0; offset < sourceCounts[tableName]; offset += batchSize) {
      const rowsJson = await readRowsJson(source, tableName, columns, offset);
      const rows = JSON.parse(rowsJson);
      await insertRowsJson(destination, tableName, columns, rowsJson);
      copied[tableName] += rows.length;
    }
    console.log(`${tableName}: ${copied[tableName]}`);
  }

  const destinationCounts = await allCounts(destination, tablesToCopy);
  const afterDestination = await objectSummary(destination);
  const mismatchedCounts = Object.entries(sourceCounts)
    .filter(([tableName, count]) => destinationCounts[tableName] !== count)
    .map(([tableName, sourceCount]) => ({ tableName, sourceCount, destinationCount: destinationCounts[tableName] }));
  const invalidForeignKeys = await destination.query(`
    select conrelid::regclass::text as table_name, conname as constraint_name
    from pg_constraint
    where contype = 'f' and not convalidated
    order by table_name, constraint_name
  `);

  return {
    backupPath,
    sourceObjects: beforeSource,
    destinationObjects: afterDestination,
    sourceCounts,
    destinationCounts,
    copied,
    mismatchedCounts,
    invalidForeignKeys,
    warnings: [
      ...unknownTables.map((tableName) => `Source table ${tableName} is not represented in prisma/schema.prisma and was not copied by this Prisma-schema migration.`),
      ...(beforeSource.functions.length ? [`Source contains ${beforeSource.functions.length} custom function/procedure object(s); Prisma schema DDL does not recreate custom functions.`] : []),
      ...(beforeSource.triggers.length ? [`Source contains ${beforeSource.triggers.length} trigger object(s); Prisma schema DDL does not recreate custom triggers.`] : []),
      ...(beforeSource.tables.some((table) => table.table_type === "VIEW") ? ["Source contains view object(s); Prisma schema DDL does not recreate custom views."] : []),
    ],
  };
}

async function main() {
  const mode = process.argv[2] || "inspect";
  if (process.env.DEBUG_MIGRATION) console.error(`mode=${mode}`);
  const source = new PgClient(sourceUrl);
  const destination = new PgClient(destinationUrl);
  if (process.env.DEBUG_MIGRATION) console.error("connecting source");
  await source.connect();
  if (process.env.DEBUG_MIGRATION) console.error("connecting destination");
  await destination.connect();
  if (process.env.DEBUG_MIGRATION) console.error("connected both");

  try {
    if (mode === "inspect") {
      if (process.env.DEBUG_MIGRATION) console.error("reading source objects");
      const sourceObjects = await objectSummary(source);
      if (process.env.DEBUG_MIGRATION) console.error("reading destination objects");
      const destinationObjects = await objectSummary(destination);
      const sourceTables = sourceObjects.tables
        .filter((table) => table.table_schema === "public" && table.table_type === "BASE TABLE")
        .map((table) => table.table_name)
        .filter((tableName) => expectedTableOrder.includes(tableName));
      const destinationTables = destinationObjects.tables
        .filter((table) => table.table_schema === "public" && table.table_type === "BASE TABLE")
        .map((table) => table.table_name)
        .filter((tableName) => expectedTableOrder.includes(tableName));
      console.log(JSON.stringify({
        sourceObjects,
        destinationObjects,
        sourceCounts: await allCounts(source, sourceTables),
        destinationCounts: await allCounts(destination, destinationTables),
      }, null, 2));
      return;
    }

    if (mode === "migrate") {
      const ddl = fs.readFileSync(0, "utf8");
      if (!ddl.trim()) throw new Error("DDL must be provided on stdin.");
      const result = await migrate(source, destination, ddl);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    throw new Error(`Unknown mode: ${mode}`);
  } finally {
    source.end();
    destination.end();
  }
}

if (require.main === module) {
  (async () => {
    try {
      await main();
    } catch (error) {
      console.error(error);
      process.exitCode = 1;
    }
  })();
}

module.exports = {
  PgClient,
  qident,
  literal,
  objectSummary,
  tableColumns,
  tableCount,
  allCounts,
  insertRowsJson,
};
