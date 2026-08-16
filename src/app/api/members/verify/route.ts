import { NextResponse } from "next/server";
import { signMemberToken } from "@/lib/member-session";
import { normalizeEmail, verifyMember } from "@/lib/members";
import { EMAIL_RULE, IP_RULE, RateLimiter, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const limiter = new RateLimiter();

/**
 * "없는 아이디"와 "번호 불일치"를 구분해 주지 않는다 — 구분하면 이 엔드포인트가
 * 특정 아이디의 인클래스 가입 여부를 알려주는 조회창이 된다.
 */
const GENERIC = "아이디 또는 휴대폰번호가 일치하지 않아요. 다시 확인해 주세요.";

/**
 * 설문 진입 게이트 — 인클래스 명단과 대조하고, 통과하면 학생 토큰을 발급한다.
 * 사용 횟수 차감은 여기서 하지 않는다(결과 발급 시점에 한 번).
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

  if (!email || typeof body.phone !== "string") return fail();

  const result = await verifyMember(email, body.phone);
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
    token: signMemberToken(email),
    remaining: result.remaining,
    name: result.name,
  });
}
