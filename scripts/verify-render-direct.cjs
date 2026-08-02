const { PgClient } = require("./render-pg-direct-migrate.cjs");

const databaseUrl = process.env.DESTINATION_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DESTINATION_DATABASE_URL or DATABASE_URL is required.");
  process.exit(1);
}

async function main() {
  const db = new PgClient(databaseUrl);
  await db.connect();
  try {
    const indexes = await db.query("select count(*)::text as count from pg_indexes where schemaname = 'public'");
    const constraints = await db.query(`
      select constraint_type, count(*)::text as count
      from information_schema.table_constraints
      where table_schema = 'public'
      group by constraint_type
      order by constraint_type
    `);
    const users = await db.query(`
      select email, role
      from "User"
      where email in ('admin@example.com', 'chef@example.com', 'michael.thompson@example.com')
      order by role, email
    `);
    const invalid = await db.query("select count(*)::text as count from pg_constraint where contype = 'f' and not convalidated");

    console.log(`INDEX_COUNT ${indexes[0].count}`);
    console.log("CONSTRAINT_COUNTS");
    for (const row of constraints) {
      console.log(`${row.constraint_type}: ${row.count}`);
    }
    console.log("KNOWN_USERS");
    for (const row of users) {
      console.log(`${row.email} ${row.role}`);
    }
    console.log(`INVALID_FOREIGN_KEYS ${invalid[0].count}`);
  } finally {
    db.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
