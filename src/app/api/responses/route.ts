import { NextResponse } from "next/server";
import { computeResult } from "@/lib/scoring";
import { saveResponse } from "@/lib/store";
import { getTrack, isTrackId } from "@/lib/tracks";
import type { Answers } from "@/lib/types";

export const runtime = "nodejs";

/** 설문 완료 시 익명 응답 저장. 결과(winners)는 신뢰를 위해 서버에서 재계산한다. */
export async function POST(request: Request) {
  let body: { track?: string; answers?: Answers };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문" }, { status: 400 });
  }

  const { track, answers } = body;
  if (!track || !isTrackId(track) || !answers || typeof answers !== "object") {
    return NextResponse.json({ error: "track 또는 answers가 유효하지 않음" }, { status: 400 });
  }

  try {
    const result = computeResult(getTrack(track), answers);
    const id = saveResponse(track, answers, result.winners);
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "저장 실패" },
      { status: 400 },
    );
  }
}
