import { NextResponse } from "next/server";
import { attachSession } from "@/lib/admin-auth";
import { normalizeUsername, verifyLogin } from "@/lib/admins";

export const runtime = "nodejs";

export async function POST(request: Request) {
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

  const ok = await verifyLogin(username, password);
  if (!ok) {
    return NextResponse.json(
      { error: "아이디 또는 비밀번호가 올바르지 않아요." },
      { status: 401 },
    );
  }
  return attachSession(NextResponse.json({ ok: true }), normalizeUsername(username));
}
