// scratch/test_db_conn.js
const pg = require('pg');
require('dotenv').config({ path: "c:\\Users\\ali59\\Desktop\\REDC\\.env" });

console.log("DATABASE_URL:", process.env.DATABASE_URL);

// Try 1: with ssl: { rejectUnauthorized: false }
const pool1 = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool1.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error("Pool1 error:", err.message);
  } else {
    console.log("Pool1 success:", res.rows[0]);
  }
  pool1.end();
});

// Try 2: with ssl: true
const pool2 = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true
});

pool2.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error("Pool2 error:", err.message);
  } else {
    console.log("Pool2 success:", res.rows[0]);
  }
  pool2.end();
});

// Try 3: with no ssl option
const pool3 = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

pool3.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error("Pool3 error:", err.message);
  } else {
    console.log("Pool3 success:", res.rows[0]);
  }
  pool3.end();
});
