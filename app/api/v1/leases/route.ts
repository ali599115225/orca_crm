import { NextResponse } from 'next/server';

// GET /api/v1/leases - Fetch all leases under tenant context
export async function GET(request: Request) {
  return NextResponse.json({
    success: true,
    leases: [
      { id: 'L-1001', unit: 'A-101', tenant: 'محمد العلي', start: '2026-01-01', end: '2026-12-31', rent: 12000, currency: 'SAR', status: 'active', deposit: 3000 },
      { id: 'L-1002', unit: 'B-201', tenant: 'سارة الأحمد', start: '2025-07-01', end: '2026-06-30', rent: 45000, currency: 'SAR', status: 'expired', deposit: 5000 },
      { id: 'L-1003', unit: 'C-301', tenant: 'شركة النخبة', start: '2026-03-01', end: '2027-02-28', rent: 25000, currency: 'SAR', status: 'active', deposit: 5000 }
    ]
  });
}

// POST /api/v1/leases - Create a new lease contract
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { unit, tenant, start, end, rent } = body;

    if (!unit || !tenant || !start || !end || !rent) {
      return NextResponse.json({ success: false, error: 'Missing required lease fields' }, { status: 400 });
    }

    const leaseId = 'L-' + Math.floor(1000 + Math.random() * 9000);
    return NextResponse.json({
      success: true,
      message: 'Lease contract registered successfully',
      lease: { id: leaseId, unit, tenant, start, end, rent, currency: 'SAR', status: 'active' }
    }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
