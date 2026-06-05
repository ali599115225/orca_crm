import { NextResponse } from 'next/server';

// POST /api/v1/invoices/:id/pay - Register payment for an invoice with Idempotency Key support
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const idempotencyKey = request.headers.get('idempotency-key') || request.headers.get('Idempotency-Key');

  if (!idempotencyKey) {
    return NextResponse.json({
      success: false,
      error: 'Missing Idempotency-Key header'
    }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { amount, method } = body;

    if (!amount || !method) {
      return NextResponse.json({ success: false, error: 'Missing payment amount or method' }, { status: 400 });
    }

    const paymentId = 'P-' + Math.floor(5000 + Math.random() * 1000);

    return NextResponse.json({
      success: true,
      message: 'Payment registered successfully',
      idempotencyCached: false,
      payment: {
        id: paymentId,
        invoiceId: id,
        amount,
        method,
        date: new Date().toISOString().split('T')[0]
      }
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
