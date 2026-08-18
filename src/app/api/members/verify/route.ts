import { NextResponse } from "next/server";
import { firebaseWebConfig } from "@/lib/firebase-config";
import { hashPhone, normalizeEmail, normalizePhone, verifyMember } from "@/lib/members";
import { signChallenge } from "@/lib/otp-challenge";
import { EMAIL_RULE, IP_RULE, RateLimiter, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const limiter = new RateLimiter();

/**
 * "없는 아이디"와 "번호 불일치"를 구분해 주지 않는다 — 구분하면 이 엔드포인트가
 * 특정 아이디의 인클래스 가입 여부를 알려주는 조회창이 된다.
 */
const GENERIC = "아이디 또는 휴대폰번호가 일치하지 않아요. 다시 확인해 주세요.";

/**
 * 본인 확인 1단계 — 인클래스 명단과 대조한다. 통과해도 아직 설문에 들어갈 수
 * 없다. 여기서 나가는 건 **챌린지**뿐이고, 학생 토큰은 그 번호로 온 문자를
 * 실제로 받아 `/api/members/confirm`을 통과해야 발급된다.
 *
 * 명단 대조를 먼저 하는 이유가 곧 이 순서의 요점이다 — 명단에 없는 번호로는
 * 문자가 한 통도 나가지 않는다.
 *
 * 이메일·번호를 로그에 남기지 않는다.
 */
export async function POST(request: Request) {
  let body: { email?: string; phone?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문" }, { status: 400 });
  }

  // 설정이 빠졌으면 **문을 닫는다.** OTP를 건너뛰고 통과시키는 폴백을 두면
  // 환경변수 하나 빠뜨린 배포가 곧 인증 우회가 된다.
  const firebase = firebaseWebConfig();
  if (!firebase) {
    return NextResponse.json(
      {
        ok: false,
        reason: "otp_unavailable",
        error: "지금은 본인 확인을 할 수 없어요. 선생님께 알려주세요.",
      },
      { status: 503 },
    );
  }

  const now = Date.now();
  const ip = `ip:${clientIp(request)}`;
  const email = normalizeEmail(body.email);
  const emailKey = `email:${email ?? ""}`;

  if (!limiter.allow(ip, IP_RULE, now) || !limiter.allow(emailKey, EMAIL_RULE, now)) {
    return NextResponse.json(
      { ok: false, reason: "throttled", error: "시도가 너무 잦아요. 잠시 후 다시 시도해 주세요." },
      { status: 429 },
    );
  }

  const fail = () => {
    limiter.record(ip, IP_RULE, now);
    limiter.record(emailKey, EMAIL_RULE, now);
    return NextResponse.json({ ok: false, reason: "invalid", error: GENERIC });
  };

  const phone = normalizePhone(body.phone);
  if (!email || !phone) return fail();

  const result = await verifyMember(email, phone);
  if (!result.ok) {
    if (result.reason === "exhausted") {
      // 여기까지 왔다는 건 번호가 맞았다는 뜻이라 사실대로 알려줘도 된다
      return NextResponse.json({
        ok: false,
        reason: "exhausted",
        error: "이미 2회를 모두 사용했어요. 선생님께 문의해 주세요.",
      });
    }
    if (result.reason === "stale") {
      return NextResponse.json({
        ok: false,
        reason: "stale",
        error: "지금은 본인 확인을 할 수 없어요. 선생님께 알려주세요.",
      });
    }
    return fail();
  }

  limiter.clear(ip);
  limiter.clear(emailKey);
  return NextResponse.json({
    ok: true,
    challenge: signChallenge(email, hashPhone(phone), now),
    firebase,
    remaining: result.remaining,
    name: result.name,
  });
}
