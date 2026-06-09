import { prisma } from './lib/prisma.js';
try {
  const [inv, legacy, tenants] = await Promise.all([
    prisma.$queryRawUnsafe('SELECT COUNT(*)::int as c FROM rental_invoices'),
    prisma.$queryRawUnsafe('SELECT COUNT(*)::int as c FROM rental_invoices_legacy'),
    prisma.$queryRawUnsafe('SELECT invoice_prefix, next_invoice_number FROM tenants LIMIT 5'),
  ]);
  console.log('✅ rental_invoices:', inv[0].c);
  console.log('📦 rental_invoices_legacy:', legacy[0].c);
  console.log('👤 tenants:', JSON.stringify(tenants, null, 2));
} catch(e) { console.error('❌', e.message); }
finally { await prisma.$disconnect(); }
