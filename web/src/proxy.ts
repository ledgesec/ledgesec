import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cabinetRewrite } from "@/shared/lib/cabinet-section";
import { surfaceOf } from "@/shared/lib/hosts";

export function proxy(request: NextRequest) {
  const target = cabinetRewrite(surfaceOf(request.headers.get("host") ?? ""), request.nextUrl.pathname);
  if (!target) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = target;
  return NextResponse.rewrite(url);
}
