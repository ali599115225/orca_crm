const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: 'c:/Users/ali59/Desktop/REDC/.env' });

async function testConnection(sslConfig) {
  console.log("Testing with SSL config:", sslConfig);
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: sslConfig
  });
  
  try {
    await client.connect();
    console.log("✅ Connection SUCCESSFUL!");
    const res = await client.query('SELECT NOW()');
    console.log("Result:", res.rows[0]);
    await client.end();
    return true;
  } catch (err) {
    console.error("❌ Connection FAILED:", err.message);
    try { await client.end(); } catch (e) {}
    return false;
  }
}

async function main() {
  console.log("DATABASE_URL:", process.env.DATABASE_URL);
  
  // Try 1: default config used in lib/prisma.ts
  await testConnection({ rejectUnauthorized: false });
  
  // Try 2: true
  await testConnection(true);
  
  // Try 3: false
  await testConnection(false);
  
  // Try 4: undefined (let connection string handle it)
  await testConnection(undefined);
}

main();
