const { Client } = require('pg');

async function ensureDatabases() {
  const adminUrl = process.env.PG_ADMIN_URL || 'postgresql://postgres:1234@localhost:5432/postgres';
  const client = new Client({ connectionString: adminUrl });
  await client.connect();

  const targetDatabases = ['pixel_store_dev', 'pixel_store_test'];

  for (const dbName of targetDatabases) {
    const checkRes = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (checkRes.rows.length === 0) {
      // Database names cannot be parameterized in CREATE DATABASE
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Database "${dbName}" created successfully.`);
    } else {
      console.log(`Database "${dbName}" already exists.`);
    }
  }

  await client.end();
}

ensureDatabases().catch((err) => {
  console.error('Failed to ensure databases:', err);
  process.exit(1);
});
