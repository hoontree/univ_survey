import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/admin-auth";
import {
  changePassword,
  createAdmin,
  deleteAdmin,
  listAdmins,
  normalizeUsername,
} from "@/lib/admins";

export const runtime = "nodejs";

/** 로그인한 관리자만 계정을 관리할 수 있다(세션 쿠키 필수 — Bearer 불가). */
async function requireLogin(): Promise<string | NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  return user;
}

export async function GET() {
  const me = await requireLogin();
  if (me instanceof NextResponse) return me;
  return NextResponse.json({ me, admins: await listAdmins() });
}

/** 새 관리자 계정 추가 */
export async function POST(request: Request) {
  const me = await requireLogin();
  if (me instanceof NextResponse) return me;

  const body = (await request.json().catch(() => ({}))) as {
    username?: string;
    password?: string;
  };
  if (typeof body.username !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ error: "아이디와 비밀번호가 필요해요." }, { status: 400 });
  }
  const created = await createAdmin(body.username, body.password);
  if (!created.ok) return NextResponse.json({ error: created.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}

/** 내 비밀번호 변경 */
export async function PATCH(request: Request) {
  const me = await requireLogin();
  if (me instanceof NextResponse) return me;

  const body = (await request.json().catch(() => ({}))) as { password?: string };
  if (typeof body.password !== "string") {
    return NextResponse.json({ error: "새 비밀번호가 필요해요." }, { status: 400 });
  }
  const changed = await changePassword(me, body.password);
  if (!changed.ok) return NextResponse.json({ error: changed.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}

/** 다른 관리자 계정 삭제 (자기 자신·마지막 계정은 불가) */
export async function DELETE(request: Request) {
  const me = await requireLogin();
  if (me instanceof NextResponse) return me;

  const body = (await request.json().catch(() => ({}))) as { username?: string };
  if (typeof body.username !== "string") {
    return NextResponse.json({ error: "삭제할 아이디가 필요해요." }, { status: 400 });
  }
  if (normalizeUsername(body.username) === me) {
    return NextResponse.json({ error: "자기 계정은 삭제할 수 없어요." }, { status: 400 });
  }
  const removed = await deleteAdmin(body.username);
  if (!removed.ok) return NextResponse.json({ error: removed.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
