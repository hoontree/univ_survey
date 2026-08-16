import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/admin-auth";
import { MemberSheetError, parseMemberSheet, upsertMembers } from "@/lib/members";
import { XlsxError, parseXlsx } from "@/lib/xlsx";

export const runtime = "nodejs";

/** 실제 명단은 12KB 남짓 — 넉넉히 잡아도 이 정도면 충분하다 */
const MAX_BYTES = 2 * 1024 * 1024;

/**
 * 관리자 전용 — 인클래스 구성원 엑셀 업로드(병합).
 *
 * Server Action이 아니라 라우트 핸들러인 이유: Server Action은 본문 1MB 제한에
 * 걸리면 불투명한 에러를 던진다. 여기서는 우리가 직접 크기를 재고 거절한다.
 *
 * 업로드 파일은 **디스크·GCS에 쓰지 않는다.** 이름·생년월일·학교·학부모
 * 번호까지 든 제3자 정보라 메모리에서 처리하고 그대로 버린다.
 * 같은 이유로 이 라우트는 본문·이메일·번호를 로그로 남기지 않는다.
 */
export async function POST(request: Request) {
  const admin = await requireApiAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "인증이 필요해요." }, { status: 401 });
  }

  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BYTES) {
    return NextResponse.json({ error: "파일이 너무 커요(2MB 이하)." }, { status: 413 });
  }

  let file: File | null = null;
  try {
    const value = (await request.formData()).get("file");
    if (value instanceof File) file = value;
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문" }, { status: 400 });
  }

  if (!file) {
    return NextResponse.json({ error: "엑셀 파일을 선택해 주세요." }, { status: 400 });
  }
  if (!/\.xlsx$|\.xlsm$/i.test(file.name)) {
    return NextResponse.json(
      { error: "엑셀(.xlsx) 파일만 올릴 수 있어요." },
      { status: 400 },
    );
  }

  // content-length는 클라이언트가 정하는 값이라 실제 크기를 다시 잰다
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "파일이 너무 커요(2MB 이하)." }, { status: 413 });
  }

  let parsed;
  try {
    parsed = parseMemberSheet(parseXlsx(bytes));
  } catch (error) {
    if (error instanceof XlsxError || error instanceof MemberSheetError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  const { added, updated } = await upsertMembers(parsed.members);
  return NextResponse.json({
    ok: true,
    added,
    updated,
    skipped: parsed.errors.length,
    warnings: parsed.warnings,
    errors: parsed.errors,
  });
}
