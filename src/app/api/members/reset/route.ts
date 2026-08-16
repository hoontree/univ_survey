import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/admin-auth";
import { resetMemberUses } from "@/lib/members";

export const runtime = "nodejs";

/**
 * 관리자 전용 — 한 구성원의 사용 횟수 초기화.
 *
 * 토큰 시절에는 2회를 다 쓴 학생에게 새 토큰을 주면 됐다. 명단 인증에는
 * 그 경로가 없어서 이게 유일한 탈출구다.
 */
export async function POST(request: Request) {
  const admin = await requireApiAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "인증이 필요해요." }, { status: 401 });
  }

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문" }, { status: 400 });
  }

  if (typeof body.email !== "string" || !body.email.trim()) {
    return NextResponse.json({ error: "아이디가 필요합니다" }, { status: 400 });
  }

  const done = await resetMemberUses(body.email);
  if (!done) {
    return NextResponse.json({ error: "명단에 없는 아이디예요." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
