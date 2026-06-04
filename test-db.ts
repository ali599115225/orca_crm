// test-db.ts
import 'dotenv/config';
import { Pool } from 'pg';

async function testConnection() {
  const connectionString = process.env.DIRECT_URL; // نختبر الرابط المباشر
  
  if (!connectionString) {
    console.error("❌ الرابط غير موجود في ملف .env!");
    return;
  }

  const pool = new Pool({ connectionString });

  try {
    const res = await pool.query('SELECT NOW()');
    console.log("✅ الاتصال ناجح! الوقت في قاعدة البيانات هو:", res.rows[0].now);
  } catch (err) {
    console.error("❌ فشل الاتصال! التفاصيل:", err);
  } finally {
    await pool.end();
  }
}

testConnection();