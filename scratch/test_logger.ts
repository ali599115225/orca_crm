import { systemLogger } from '../lib/resilience/logger';
import fs from 'fs';
import path from 'path';

console.log('=== RUNNING LOGGER VERIFICATION ===\n');

// 1. Log INFO message
systemLogger.info('نظام المحاكاة تم بنجاح وتغذية البيانات مكتملة', {
  tenantId: 'tenant-basic-1',
  subdomain: 'sim-basic-1',
  userId: 'usr-1111',
  action: 'SEEK_MONITOR_HEALTH',
  path: '/api/v1/health',
  details: 'All systems operating within acceptable parameters.'
});

// 2. Log WARN message
systemLogger.warn('تجاوز استهلاك الباقة الحالية 80% لـ TenantID المحدد', {
  tenantId: 'tenant-pro-5',
  subdomain: 'sim-pro-5',
  userId: 'usr-2222',
  action: 'GROWTH_MONITOR_WARNING',
  path: '/api/cron/billing',
  leadsCount: 812,
  limit: 1000
});

// 3. Log ERROR message with real Error object stack trace
try {
  // Simulate an AI Service failure
  throw new Error('Mansour AI Agent gateway connection timed out after 5000ms');
} catch (err) {
  systemLogger.error('فشل استدعاء وكيل منصور الذكي للرد على العميل', err, {
    tenantId: 'tenant-gold-10',
    subdomain: 'sim-gold-10',
    userId: 'usr-3333',
    action: 'AGENT_CHAT_MANSOUR',
    path: '/api/whatsapp/webhook',
    clientPhone: '0501234567'
  });
}

// 4. Print contents of logs/system.log to show the user how it looks
console.log('\n=== READING logs/system.log OUTPUT ===\n');
try {
  const logFilePath = path.join(__dirname, '../logs/system.log');
  if (fs.existsSync(logFilePath)) {
    const logsContent = fs.readFileSync(logFilePath, 'utf8');
    console.log(logsContent);
  } else {
    console.log('Log file system.log does not exist!');
  }
} catch (e: any) {
  console.error('Failed to read log file:', e.message);
}
