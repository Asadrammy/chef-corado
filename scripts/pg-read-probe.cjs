let Client;

try {
  ({ Client } = require("pg"));
} catch (error) {
  console.error("pg client FAILED: package 'pg' is not installed");
  process.exit(2);
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

client
  .connect()
  .then(async () => {
    const result = await client.query('select count(*)::int as count from "User"');
    console.log("pg client OK User count=" + result.rows[0].count);
    await client.end();
  })
  .catch(async (error) => {
    console.error("pg client FAILED");
    console.error(error);
    try {
      await client.end();
    } catch {}
    process.exit(1);
  });
