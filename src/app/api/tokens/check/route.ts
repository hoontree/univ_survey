import { NextResponse } from "next/server";
import { checkToken } from "@/lib/tokens";

export const runtime = "nodejs";

/** 설문 진입 전 토큰 유효성 확인 — 차감하지 않는다. */
export async function POST(request: Request) {
  let body: { code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문" }, { status: 400 });
  }
  if (typeof body.code !== "string" || !body.code.trim()) {
    return NextResponse.json({ error: "code가 필요합니다" }, { status: 400 });
  }

  const result = await checkToken(body.code);
  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 200 });
  }
  return NextResponse.json({ ok: true, remaining: result.remaining });
}
