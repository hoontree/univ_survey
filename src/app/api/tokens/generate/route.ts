import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/admin-auth";
import { formatCode, generateTokens } from "@/lib/tokens";

export const runtime = "nodejs";

const MAX_BATCH = 200;

/** 관리자 전용 — 이용 토큰 일괄 생성. 세션 쿠키 또는 Bearer ADMIN_TOKEN. */
export async function POST(request: Request) {
  const admin = await requireApiAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "인증이 필요해요." }, { status: 401 });
  }

  let body: { count?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문" }, { status: 400 });
  }
  const count = Number(body.count);
  if (!Number.isInteger(count) || count < 1 || count > MAX_BATCH) {
    return NextResponse.json(
      { error: `count는 1~${MAX_BATCH} 사이 정수여야 합니다` },
      { status: 400 },
    );
  }

  const codes = await generateTokens(count);
  return NextResponse.json({ ok: true, codes: codes.map(formatCode) });
}
