// app/api/properties/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return NextResponse.json({
    success: true,
    data: {
      id,
      title: `عقار رقم ${id}`,
      price: 1500000,
      status: 'available',
      media: ['https://picsum.photos/seed/prop/400/300'],
      description: 'وصف تفصيلي للعقار سيظهر هنا عند الربط بقاعدة البيانات.',
      dataCompleteness: 0.9,
      needsDetailedView: false,
      tourType: '360',
      tourUrl: 'https://vinc360.com/sample'
    }
  });
}
