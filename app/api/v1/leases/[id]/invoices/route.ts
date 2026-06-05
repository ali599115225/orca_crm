import { NextResponse } from 'next/server';

// POST /api/v1/leases/:id/invoices - Issue a new invoice for a lease contract
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: contractId } = await params;
  try {
    const body = await request.json();
    const { due, amount } = body;

    if (!due || !amount) {
      return NextResponse.json({ success: false, error: 'Missing required invoice parameters' }, { status: 400 });
    }

    const invoiceId = 'INV-' + Math.floor(9000 + Math.random() * 1000);

    return NextResponse.json({
      success: true,
      message: 'Invoice issued successfully',
      invoice: {
        id: invoiceId,
        contractId,
        due,
        amount,
        status: 'unpaid'
      }
    }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
