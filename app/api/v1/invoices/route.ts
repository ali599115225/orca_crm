import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/session";
import { cookies } from "next/headers";

async function authenticateRequest(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token")?.value;
  if (sessionToken) {
    const payload = await decrypt(sessionToken);
    if (payload && payload.tenantId) return payload;
  }
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const payload = await decrypt(token);
    if (payload && payload.tenantId) return payload;
  }
  return null;
}

export async function GET(request: NextRequest) {
  const session = await authenticateRequest(request);
  if (!session) {
    return NextResponse.json({ error: "غير مصرح بالوصول" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const leaseId = searchParams.get("leaseId") || "";
    const status = searchParams.get("status") || "";
    const search = searchParams.get("search") || "";

    const where: any = { lease: { tenantId: session.tenantId } };
    if (leaseId) where.leaseId = leaseId;
    if (status) where.status = status;

    const invoices = await prisma.rentalInvoice.findMany({
      where,
      include: { lease: { select: { unitName: true, tenantName: true } } },
      orderBy: { dueDate: "asc" },
    });

    let list = invoices.map((inv) => ({
      id: inv.id,
      contractId: inv.leaseId,
      unit: inv.lease.unitName,
      tenant: inv.lease.tenantName,
      due: inv.dueDate.toISOString().split("T")[0],
      amount: Number(inv.amount),
      status: inv.status,
      paymentMethod: inv.paymentMethod,
      paymentRef: inv.paymentRef,
      paidAt: inv.paidAt?.toISOString() || null,
    }));

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((i) => i.unit.toLowerCase().includes(q) || i.tenant.toLowerCase().includes(q));
    }

    return NextResponse.json({ success: true, invoices: list });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await authenticateRequest(request);
  if (!session) {
    return NextResponse.json({ error: "غير مصرح بالوصول" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { contractId, due, amount } = body;
    if (!contractId || !due || !amount) {
      return NextResponse.json({ success: false, error: "الحقول contractId, due, amount إلزامية" }, { status: 400 });
    }

    const lease = await prisma.rentalLease.findFirst({ where: { id: contractId, tenantId: session.tenantId } });
    if (!lease) {
      return NextResponse.json({ success: false, error: "عقد الإيجار غير موجود" }, { status: 404 });
    }

    const invoice = await prisma.rentalInvoice.create({
      data: {
        leaseId: contractId,
        dueDate: new Date(due),
        amount: parseFloat(amount),
        status: "unpaid",
      },
    });

    return NextResponse.json({
      success: true,
      invoice: {
        id: invoice.id,
        contractId: invoice.leaseId,
        due: invoice.dueDate.toISOString().split("T")[0],
        amount: Number(invoice.amount),
        status: invoice.status,
      },
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
