import { NextResponse } from 'next/server';

// POST /api/accounting/settle-lease - Trigger lease accounting settlement
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { contractId, amount } = body;

    if (!contractId || !amount) {
      return NextResponse.json({ success: false, error: 'Missing contractId or amount for accounting settlement' }, { status: 400 });
    }

    const settlementId = 'FS-Settle-' + Math.floor(3000 + Math.random() * 900);

    return NextResponse.json({
      success: true,
      message: 'Lease settled in General Ledger successfully',
      settlement: {
        id: settlementId,
        contractId,
        gross: amount,
        deductions: Math.round(amount * 0.1),
        net: Math.round(amount * 0.9),
        status: 'completed',
        ledgerRef: 'GL-REF-100223'
      }
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
