import { NextResponse } from "next/server";
import { isAdminTokenValid } from "@/lib/admin";
import { getStats } from "@/lib/store";

export const runtime = "nodejs";

/** 관리자 통계 조회. Authorization: Bearer <ADMIN_TOKEN> 또는 ?token= */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    url.searchParams.get("token");

  const check = isAdminTokenValid(token);
  if (check !== true) {
    return NextResponse.json({ error: check }, { status: check === "미설정" ? 503 : 401 });
  }
  return NextResponse.json({ stats: getStats() });
}
