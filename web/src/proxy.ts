import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  if (!host.startsWith("dash.")) return NextResponse.next();
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }
  const url = request.nextUrl.clone();
  url.pathname = "/dashboard";
  return NextResponse.rewrite(url);
}
