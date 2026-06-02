import { NextResponse } from "next/navigation";
import type { NextRequest } from "next/request";

export function middleware(request: NextRequest) {
  // تعطيل كامل للأمان والعزل مؤقتاً لتسهيل أعمال التصميم والتطوير السريع
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};