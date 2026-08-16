import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/admin-auth";
import { deleteAllMembers } from "@/lib/members";

export const runtime = "nodejs";

/**
 * 관리자 전용 — 명단 전체 삭제.
 * 학기가 끝나면 보관할 이유가 없는 개인정보라 파기 경로를 열어둔다.
 */
export async function DELETE(request: Request) {
  const admin = await requireApiAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "인증이 필요해요." }, { status: 401 });
  }

  const removed = await deleteAllMembers();
  return NextResponse.json({ ok: true, removed });
}
