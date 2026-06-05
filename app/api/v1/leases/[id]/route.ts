import { NextResponse } from 'next/server';

// GET /api/v1/leases/:id - Retrieve details for a specific lease contract
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  // Return simulated detail payload
  return NextResponse.json({
    success: true,
    lease: {
      id,
      unit: 'A-101',
      tenant: 'محمد العلي',
      start: '2026-01-01',
      end: '2026-12-31',
      rent: 12000,
      currency: 'SAR',
      status: 'active',
      deposit: 3000,
      financialRef: 'FS-3001',
      invoices: [
        { id: 'INV-9001', due: '2026-06-14', amount: 12000, status: 'unpaid' },
        { id: 'INV-9002', due: '2026-05-01', amount: 12000, status: 'paid' }
      ]
    }
  });
}
