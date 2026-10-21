import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { surfaceOf } from "@/shared/lib/hosts";

export function proxy(request: NextRequest) {
  const surface = surfaceOf(request.headers.get("host") ?? "");
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/_next") || pathname.startsWith("/api")) return NextResponse.next();
  if (surface === "client" && !pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.rewrite(url);
  }
  if (surface === "admin" && !pathname.startsWith("/admin")) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}
