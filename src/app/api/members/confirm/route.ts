import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { firebaseProjectId } from "@/lib/firebase-config";
import { fetchSecureTokenKeys, verifyIdToken } from "@/lib/firebase-id-token";
import { signMemberToken } from "@/lib/member-session";
import { hashPhone, maskName, normalizePhone, verifyPhone } from "@/lib/members";
import { CHALLENGE_TTL_MS, signChallenge, verifyChallenge } from "@/lib/otp-challenge";
import { IP_RULE, RateLimiter, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const limiter = new RateLimiter();

const RETRY = "인증에 실패했어요. 처음부터 다시 시도해 주세요.";

function hashEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * 본인 확인 2단계 — Firebase 전화 인증 결과를 검증하고 학생 토큰을 발급한다.
 *
 * 핵심은 **챌린지와 ID 토큰을 묶는 것**이다. ID 토큰만 보면 "이 사람이 어떤
 * 번호를 갖고 있다"까지만 알 수 있으므로, 자기 번호로 멀쩡히 받은 토큰을 다른
 * 번호의 챌린지에 붙이는 짓이 가능해진다. 번호 해시 대조가 그걸 막는다.
 *
 * 한 번호에 여러 명이 걸리면(형제자매가 같은 학부모 번호) 바로 토큰을 주지
 * 않고 **가린 이름 목록**을 돌려준다. 학생이 자기를 고르면 그 사람으로 확정된
 * 챌린지를 들고 다시 들어오고, 그때 같은 ID 토큰으로 다시 검증한다 —
 * 이름 목록은 문자 인증을 마친 사람에게만 나간다.
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
    return fail("challenge_expired", "확인 시간이 지났어요. 번호부터 다시 입력해 주세요.");
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

  // 명단을 다시 본다 — 1단계 이후 명단이 바뀌었을 수 있고, 소진 여부도 여기가 최신이다
  const result = await verifyPhone(phone);
  if (!result.ok) {
    if (result.reason === "exhausted") {
      return fail("exhausted", "이미 2회를 모두 사용했어요. 선생님께 문의해 주세요.");
    }
    if (result.reason === "stale") {
      return fail("stale", "지금은 본인 확인을 할 수 없어요. 선생님께 알려주세요.");
    }
    return fail("invalid", RETRY);
  }

  const picked = challenge.email
    ? result.matches.find((match) => match.email === challenge.email)
    : result.matches.length === 1
      ? result.matches[0]
      : null;

  if (!picked) {
    if (challenge.email) return fail("invalid", RETRY);
    // 형제자매 등 후보가 여럿 — 본인을 고르게 한다
    limiter.clear(ip);
    return NextResponse.json({
      ok: false,
      reason: "choose",
      error: "이 번호로 등록된 학생이 여러 명이에요. 본인을 골라 주세요.",
      options: result.matches.map((match) => ({
        name: maskName(match.name),
        challenge: signChallenge(challenge.phoneHash, match.email, now),
      })),
    });
  }

  limiter.clear(ip);
  return NextResponse.json({ ok: true, token: signMemberToken(picked.email, now), name: picked.name });
}
