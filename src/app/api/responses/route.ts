import { NextResponse } from "next/server";
import { verifyMemberToken } from "@/lib/member-session";
import { consumeMemberUse } from "@/lib/members";
import { computeResult } from "@/lib/scoring";
import { saveResponse } from "@/lib/store";
import { isTestBypassEmail } from "@/lib/test-bypass";
import { getTrack, isTrackId } from "@/lib/tracks";
import type { Answers } from "@/lib/types";

export const runtime = "nodejs";

/**
 * 설문 완료 → 결과 발급. 인클래스 구성원의 사용 횟수 1회를 차감하고 익명
 * 응답을 저장한다. 차감이 실패하면 결과를 발급하지 않는다(응답도 저장 안 함).
 *
 * 응답에는 이메일·이름을 넣지 않는다 — `responses`는 개인정보 없는 통계용이다.
 */
export async function POST(request: Request) {
  let body: { track?: string; answers?: Answers; token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문" }, { status: 400 });
  }

  const { track, answers, token } = body;
  if (!track || !isTrackId(track) || !answers || typeof answers !== "object") {
    return NextResponse.json({ error: "track 또는 answers가 유효하지 않음" }, { status: 400 });
  }
  if (typeof token !== "string" || !token.trim()) {
    return NextResponse.json({ error: "본인 확인이 필요합니다", reason: "missing" }, { status: 401 });
  }

  // 답변 유효성을 차감 전에 확인 — 무효 요청으로 횟수를 잃지 않게
  let winners: string[];
  try {
    winners = computeResult(getTrack(track), answers).winners;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "답변이 유효하지 않음" },
      { status: 400 },
    );
  }

  const email = verifyMemberToken(token);
  if (!email) {
    return NextResponse.json(
      { error: "본인 확인이 만료되었습니다. 다시 확인해 주세요", reason: "invalid" },
      { status: 403 },
    );
  }

  // 개발·검수용 우회 토큰 — 횟수를 차감하지 않고, 통계도 더럽히지 않게 저장도 건너뛴다.
  // 결과(winners)는 이미 계산됐으므로 그대로 발급만 한다.
  if (isTestBypassEmail(email)) {
    return NextResponse.json({ ok: true, id: null, remaining: null, test: true });
  }

  const consumed = await consumeMemberUse(email);
  if (!consumed.ok) {
    return NextResponse.json(
      {
        error:
          consumed.reason === "exhausted"
            ? "추천 가능 횟수를 모두 사용했습니다"
            : "본인 확인 정보를 찾을 수 없습니다",
        reason: consumed.reason,
      },
      { status: 403 },
    );
  }

  const id = await saveResponse(track, answers, winners);
  return NextResponse.json({ ok: true, id, remaining: consumed.remaining });
}
