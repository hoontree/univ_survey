import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { firebaseProjectId } from "@/lib/firebase-config";
import { fetchSecureTokenKeys, verifyIdToken } from "@/lib/firebase-id-token";
import { signMemberToken } from "@/lib/member-session";
import { hashPhone, normalizePhone } from "@/lib/members";
import { CHALLENGE_TTL_MS, verifyChallenge } from "@/lib/otp-challenge";
import { IP_RULE, RateLimiter, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const limiter = new RateLimiter();

const RETRY = "인증에 실패했어요. 처음부터 다시 시도해 주세요.";

function hashEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * 본인 확인 2단계 — Firebase 전화 로그인 결과를 검증하고 학생 토큰을 발급한다.
 *
 * 핵심은 **챌린지와 ID 토큰을 묶는 것**이다. ID 토큰만 보면 "이 사람이 어떤
 * 번호를 갖고 있다"까지만 알 수 있으므로, 자기 번호로 멀쩡히 받은 토큰을 남의
 * 아이디 챌린지에 붙이는 짓이 가능해진다. 번호 해시 대조가 그걸 막는다.
 *
 * 사용 횟수는 여기서도 차감하지 않는다 — 차감은 결과 발급 시점에 한 번.
 */
export async function POST(request: Request) {
  let body: { challenge?: string; idToken?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문" }, { status: 400 });
  }

  const now = Date.now();
  const ip = `ip:${clientIp(request)}`;
  if (!limiter.allow(ip, IP_RULE, now)) {
    return NextResponse.json(
      { ok: false, reason: "throttled", error: "시도가 너무 잦아요. 잠시 후 다시 시도해 주세요." },
      { status: 429 },
    );
  }

  const fail = (reason: string, error: string) => {
    limiter.record(ip, IP_RULE, now);
    return NextResponse.json({ ok: false, reason, error });
  };

  const projectId = firebaseProjectId();
  if (!projectId) {
    return NextResponse.json(
      {
        ok: false,
        reason: "otp_unavailable",
        error: "지금은 본인 확인을 할 수 없어요. 선생님께 알려주세요.",
      },
      { status: 503 },
    );
  }

  const challenge = verifyChallenge(body.challenge, now);
  if (!challenge) {
    return fail("challenge_expired", "확인 시간이 지났어요. 아이디부터 다시 입력해 주세요.");
  }
  if (typeof body.idToken !== "string" || !body.idToken) return fail("invalid", RETRY);

  let keys;
  try {
    keys = await fetchSecureTokenKeys(now);
  } catch {
    return NextResponse.json(
      {
        ok: false,
        reason: "unavailable",
        error: "인증 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.",
      },
      { status: 503 },
    );
  }

  const verified = verifyIdToken(keys, body.idToken, {
    projectId,
    now,
    // 챌린지와 같은 수명 — 문자를 받은 그 자리에서 끝내야 한다
    maxAuthAgeMs: CHALLENGE_TTL_MS,
  });
  if (!verified.ok) return fail("invalid", RETRY);

  const phone = normalizePhone(verified.phoneNumber);
  if (!phone || !hashEquals(hashPhone(phone), challenge.phoneHash)) {
    return fail("phone_mismatch", "인증한 번호가 처음 입력한 번호와 달라요. 다시 시도해 주세요.");
  }

  limiter.clear(ip);
  return NextResponse.json({ ok: true, token: signMemberToken(challenge.email, now) });
}
