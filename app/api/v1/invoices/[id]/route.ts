import { NextResponse } from 'next/server';

// GET /api/v1/invoices/:id - Retrieve specific invoice details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return NextResponse.json({
    success: true,
    invoice: {
      id,
      contractId: 'L-1001',
      due: '2026-06-14',
      amount: 12000,
      status: 'unpaid'
    }
  });
}
