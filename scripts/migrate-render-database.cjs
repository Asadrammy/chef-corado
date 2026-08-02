const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const sourceUrl = process.env.SOURCE_DATABASE_URL;
const destinationUrl = process.env.DESTINATION_DATABASE_URL;

if (!sourceUrl || !destinationUrl) {
  console.error("SOURCE_DATABASE_URL and DESTINATION_DATABASE_URL are required.");
  process.exit(1);
}

const source = new PrismaClient({
  datasources: { db: { url: sourceUrl } },
  log: ["error"],
});

const destination = new PrismaClient({
  datasources: { db: { url: destinationUrl } },
  log: ["error"],
});

const models = [
  ["user", "User"],
  ["account", "Account"],
  ["session", "Session"],
  ["verificationToken", "VerificationToken"],
  ["chefProfile", "ChefProfile"],
  ["menu", "Menu"],
  ["menuSection", "MenuSection"],
  ["menuItem", "MenuItem"],
  ["experience", "Experience"],
  ["request", "Request"],
  ["requestInvitation", "RequestInvitation"],
  ["proposal", "Proposal"],
  ["booking", "Booking"],
  ["payment", "Payment"],
  ["review", "Review"],
  ["notification", "Notification"],
  ["notificationPreference", "NotificationPreference"],
  ["message", "Message"],
  ["moderationFlag", "ModerationFlag"],
  ["availability", "Availability"],
  ["payout", "Payout"],
  ["refund", "Refund"],
  ["dispute", "Dispute"],
  ["webhookLog", "WebhookLog"],
  ["ledger", "Ledger"],
  ["auditLog", "AuditLog"],
  ["slotLock", "SlotLock"],
  ["eventQueue", "EventQueue"],
  ["chefKpiSnapshot", "ChefKpiSnapshot"],
];

const copyOrder = [
  "user",
  "account",
  "session",
  "verificationToken",
  "chefProfile",
  "menu",
  "menuSection",
  "menuItem",
  "experience",
  "request",
  "requestInvitation",
  "proposal",
  "booking",
  "payment",
  "review",
  "notification",
  "notificationPreference",
  "message",
  "moderationFlag",
  "availability",
  "payout",
  "refund",
  "dispute",
  "webhookLog",
  "ledger",
  "auditLog",
  "slotLock",
  "eventQueue",
  "chefKpiSnapshot",
];

const batchSize = Number.parseInt(process.env.MIGRATION_BATCH_SIZE || "250", 10);
const artifactsDir = path.join(process.cwd(), "artifacts");

async function getObjectSummary(client) {
  const tables = await client.$queryRaw`
    select table_schema, table_name, table_type
    from information_schema.tables
    where table_schema not in ('pg_catalog', 'information_schema')
    order by table_schema, table_name
  `;

  const indexes = await client.$queryRaw`
    select schemaname, tablename, indexname, indexdef
    from pg_indexes
    where schemaname not in ('pg_catalog', 'information_schema')
    order by schemaname, tablename, indexname
  `;

  const constraints = await client.$queryRaw`
    select tc.table_schema, tc.table_name, tc.constraint_name, tc.constraint_type
    from information_schema.table_constraints tc
    where tc.table_schema not in ('pg_catalog', 'information_schema')
    order by tc.table_schema, tc.table_name, tc.constraint_name
  `;

  const sequences = await client.$queryRaw`
    select sequence_schema, sequence_name
    from information_schema.sequences
    where sequence_schema not in ('pg_catalog', 'information_schema')
    order by sequence_schema, sequence_name
  `;

  const views = tables.filter((table) => table.table_type === "VIEW");

  const functions = await client.$queryRaw`
    select n.nspname as schema_name, p.proname as function_name, pg_get_function_identity_arguments(p.oid) as arguments
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname not in ('pg_catalog', 'information_schema')
    order by n.nspname, p.proname, arguments
  `;

  const triggers = await client.$queryRaw`
    select trigger_schema, event_object_table, trigger_name
    from information_schema.triggers
    where trigger_schema not in ('pg_catalog', 'information_schema')
    order by trigger_schema, event_object_table, trigger_name
  `;

  return { tables, indexes, constraints, sequences, views, functions, triggers };
}

async function getModelCounts(client) {
  const counts = {};
  for (const [delegate, tableName] of models) {
    counts[tableName] = await client[delegate].count();
  }
  return counts;
}

async function backupDestinationRows() {
  fs.mkdirSync(artifactsDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(artifactsDir, `destination-before-migration-${timestamp}.json`);
  const backup = {};

  for (const [delegate, tableName] of models) {
    backup[tableName] = await destination[delegate].findMany();
  }

  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
  return backupPath;
}

async function copyModel(delegate) {
  const total = await source[delegate].count();
  let copied = 0;

  for (let skip = 0; skip < total; skip += batchSize) {
    const rows = await source[delegate].findMany({
      skip,
      take: batchSize,
    });

    if (rows.length > 0) {
      await destination[delegate].createMany({ data: rows });
      copied += rows.length;
    }
  }

  return copied;
}

async function validateForeignKeys() {
  const rows = await destination.$queryRaw`
    select
      conrelid::regclass::text as table_name,
      conname as constraint_name
    from pg_constraint
    where contype = 'f'
      and connamespace not in (
        select oid from pg_namespace where nspname in ('pg_catalog', 'information_schema')
      )
      and not convalidated
    order by table_name, constraint_name
  `;

  return rows;
}

async function main() {
  const mode = process.argv[2] || "inspect";

  await source.$connect();
  await destination.$connect();

  if (mode === "inspect") {
    const sourceObjects = await getObjectSummary(source);
    const destinationObjects = await getObjectSummary(destination);
    const sourceCounts = await getModelCounts(source);
    const destinationCounts = await getModelCounts(destination);

    console.log(JSON.stringify({
      sourceObjects,
      destinationObjects,
      sourceCounts,
      destinationCounts,
    }, null, 2));
    return;
  }

  if (mode === "backup-destination") {
    const backupPath = await backupDestinationRows();
    console.log(JSON.stringify({ backupPath }, null, 2));
    return;
  }

  if (mode === "drop-destination-schema") {
    await destination.$executeRawUnsafe('drop schema if exists "public" cascade');
    await destination.$executeRawUnsafe('create schema "public"');
    console.log(JSON.stringify({ droppedAndRecreatedPublicSchema: true }, null, 2));
    return;
  }

  if (mode === "copy-data") {
    const copied = {};
    for (const delegate of copyOrder) {
      const tableName = models.find(([modelDelegate]) => modelDelegate === delegate)?.[1] || delegate;
      copied[tableName] = await copyModel(delegate);
      console.log(`${tableName}: ${copied[tableName]}`);
    }
    console.log(JSON.stringify({ copied }, null, 2));
    return;
  }

  if (mode === "verify") {
    const sourceObjects = await getObjectSummary(source);
    const destinationObjects = await getObjectSummary(destination);
    const sourceCounts = await getModelCounts(source);
    const destinationCounts = await getModelCounts(destination);
    const mismatchedCounts = Object.entries(sourceCounts)
      .filter(([tableName, count]) => destinationCounts[tableName] !== count)
      .map(([tableName, sourceCount]) => ({
        tableName,
        sourceCount,
        destinationCount: destinationCounts[tableName],
      }));
    const invalidForeignKeys = await validateForeignKeys();

    console.log(JSON.stringify({
      sourceObjects,
      destinationObjects,
      sourceCounts,
      destinationCounts,
      mismatchedCounts,
      invalidForeignKeys,
    }, null, 2));
    return;
  }

  throw new Error(`Unknown mode: ${mode}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await source.$disconnect();
    await destination.$disconnect();
  });
