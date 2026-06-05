import { NextResponse } from 'next/server';

// GET /api/v1/invoices - Retrieve list of invoices
export async function GET(request: Request) {
  return NextResponse.json({
    success: true,
    invoices: [
      { id: 'INV-9001', contractId: 'L-1001', due: '2026-06-14', amount: 12000, status: 'unpaid' },
      { id: 'INV-9002', contractId: 'L-1002', due: '2026-05-01', amount: 45000, status: 'paid' },
      { id: 'INV-9003', contractId: 'L-1003', due: '2026-07-01', amount: 25000, status: 'unpaid' }
    ]
  });
}
