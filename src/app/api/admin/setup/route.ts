import { NextResponse } from "next/server";
import { attachSession } from "@/lib/admin-auth";
import { createAdmin, hasAnyAdmin, normalizeUsername } from "@/lib/admins";

export const runtime = "nodejs";

/**
 * 최초 관리자 계정 생성 — 관리자가 하나도 없을 때만 열린다(first-run).
 * 성공 시 바로 로그인 세션을 심는다.
 */
export async function POST(request: Request) {
  if (await hasAnyAdmin()) {
    return NextResponse.json(
      { error: "이미 관리자 계정이 있어요. 로그인해 주세요." },
      { status: 409 },
    );
  }

  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문" }, { status: 400 });
  }
  const { username, password } = body;
  if (typeof username !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "아이디와 비밀번호가 필요해요." }, { status: 400 });
  }

  const created = await createAdmin(username, password);
  if (!created.ok) {
    return NextResponse.json({ error: created.error }, { status: 400 });
  }
  return attachSession(NextResponse.json({ ok: true }), normalizeUsername(username));
}
