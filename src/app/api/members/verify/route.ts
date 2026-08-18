import { NextResponse } from "next/server";
import { firebaseWebConfig } from "@/lib/firebase-config";
import { hashPhone, normalizePhone, verifyPhone } from "@/lib/members";
import { signChallenge } from "@/lib/otp-challenge";
import { IP_RULE, PHONE_RULE, RateLimiter, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const limiter = new RateLimiter();

/**
 * 명단에 없는 번호라는 사실만 알려준다. 누가 등록돼 있는지는 알려주지 않는다.
 */
const GENERIC = "등록되지 않은 번호예요. 인클래스에 등록한 번호가 맞는지 확인해 주세요.";

/**
 * 본인 확인 1단계 — 휴대폰번호를 인클래스 명단과 대조한다. 통과해도 아직
 * 설문에 들어갈 수 없다. 여기서 나가는 건 **챌린지**뿐이고, 학생 토큰은 그
 * 번호로 온 문자를 실제로 받아 `/api/members/confirm`을 통과해야 발급된다.
 *
 * 명단 대조를 먼저 하는 이유가 곧 이 순서의 요점이다 — 명단에 없는 번호로는
 * 문자가 한 통도 나가지 않는다.
 *
 * 누가 걸렸는지(이름·인원수)는 여기서 절대 돌려주지 않는다. 번호만 넣으면
 * 되는 창구라 그대로 명단 조회기가 된다.
 *
 * 번호를 로그에 남기지 않는다.
 */
export async function POST(request: Request) {
  let body: { phone?: string };
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
  const phone = normalizePhone(body.phone);
  const phoneKey = `phone:${phone ?? ""}`;

  if (!limiter.allow(ip, IP_RULE, now) || !limiter.allow(phoneKey, PHONE_RULE, now)) {
    return NextResponse.json(
      { ok: false, reason: "throttled", error: "시도가 너무 잦아요. 잠시 후 다시 시도해 주세요." },
      { status: 429 },
    );
  }

  const fail = () => {
    limiter.record(ip, IP_RULE, now);
    limiter.record(phoneKey, PHONE_RULE, now);
    return NextResponse.json({ ok: false, reason: "invalid", error: GENERIC });
  };

  if (!phone) return fail();

  const result = await verifyPhone(phone);
  if (!result.ok) {
    if (result.reason === "exhausted") {
      // 번호는 맞았으니 사실대로 알려줘도 된다
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
  limiter.clear(phoneKey);
  // 누가 걸렸는지는 담지 않는다 — 확정은 문자 인증을 마친 뒤에
  return NextResponse.json({ ok: true, challenge: signChallenge(hashPhone(phone), null, now), firebase });
}
