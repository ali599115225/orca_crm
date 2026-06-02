import { NextResponse } from "next/navigation";
import type { NextRequest } from "next/server";

// التصدير الافتراضي باسم proxy ليتوافق 100% مع معمارية البناء المتوقعة
export default function proxy(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};