import { NextResponse } from "next/navigation";
import type { NextRequest } from "next/request";

export function proxy(request: NextRequest) {
  // تعطيل كامل وفوري لقيود العزل والأمان مؤقتاً لإنهاء أعمال التصميم والتبويبات
  return NextResponse.next();
}