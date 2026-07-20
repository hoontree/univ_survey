import { NextResponse } from "next/server";
import { computeResult } from "@/lib/scoring";
import { saveResponse } from "@/lib/store";
import { consumeToken } from "@/lib/tokens";
import { getTrack, isTrackId } from "@/lib/tracks";
import type { Answers } from "@/lib/types";

export const runtime = "nodejs";

/**
 * 설문 완료 → 결과 발급. 이용 토큰 1회를 차감하고 익명 응답을 저장한다.
 * 토큰 차감이 실패하면 결과를 발급하지 않는다(응답도 저장하지 않음).
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
    return NextResponse.json({ error: "이용 토큰이 필요합니다", reason: "missing" }, { status: 401 });
  }

  // 답변 유효성을 토큰 차감 전에 확인 — 무효 요청으로 횟수를 잃지 않게
  let winners: string[];
  try {
    winners = computeResult(getTrack(track), answers).winners;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "답변이 유효하지 않음" },
      { status: 400 },
    );
  }

  const consumed = await consumeToken(token);
  if (!consumed.ok) {
    return NextResponse.json(
      {
        error:
          consumed.reason === "exhausted"
            ? "토큰 사용 횟수를 모두 사용했습니다"
            : "유효하지 않은 토큰입니다",
        reason: consumed.reason,
      },
      { status: 403 },
    );
  }

  const id = await saveResponse(track, answers, winners);
  return NextResponse.json({ ok: true, id, remaining: consumed.remaining });
}
