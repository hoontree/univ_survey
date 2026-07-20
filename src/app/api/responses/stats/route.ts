import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/admin-auth";
import { getStats } from "@/lib/store";

export const runtime = "nodejs";

/** 관리자 통계 조회 — 세션 쿠키 또는 Bearer ADMIN_TOKEN. */
export async function GET(request: Request) {
  const admin = await requireApiAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "인증이 필요해요." }, { status: 401 });
  }
  return NextResponse.json({ stats: await getStats() });
}
