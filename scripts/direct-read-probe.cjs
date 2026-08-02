const { PgClient } = require("./render-pg-direct-migrate.cjs");

(async () => {
  const client = new PgClient(process.env.DESTINATION_DATABASE_URL || process.env.DATABASE_URL);
  await client.connect();
  const result = await client.query('select count(*)::int as count from "User"');
  console.log("Direct protocol TLS probe OK User count=" + result[0].count);
  await client.end();
})().catch((error) => {
  console.error("Direct protocol TLS probe FAILED");
  console.error(error);
  process.exit(1);
});
