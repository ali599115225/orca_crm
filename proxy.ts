import { NextResponse } from "next/navigation";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // تمرير مطلق وفوري لكافة الروابط والتبويبات دون أي حظر أو عزل
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};