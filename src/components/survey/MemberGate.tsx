"use client";

import type { ConfirmationResult } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ds/Button";
import { inputStyle } from "@/components/ds/inputStyle";
import { clearRecaptcha, sendVerificationCode, signOutQuietly, toE164 } from "@/lib/firebase-client";
import type { FirebaseWebConfig } from "@/lib/firebase-config";
import { saveMemberToken } from "@/lib/storage";
import type { TrackMeta } from "@/lib/tracks";

interface MemberGateProps {
  meta: TrackMeta;
  /** 게이트 위에 띄울 사전 안내 (인증이 풀려 다시 확인하는 경우 등) */
  notice?: string | null;
  onPass: (token: string) => void;
}

/** 재전송 쿨다운 — 실수로 연타해 문자(=요금)를 태우지 않게 */
const RESEND_COOLDOWN_SEC = 60;

interface Challenge {
  challenge: string;
  config: FirebaseWebConfig;
}

/** Firebase 오류 코드를 학생이 읽을 말로 */
function authError(error: unknown, fallback: string): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";
  switch (code) {
    case "auth/invalid-phone-number":
      return "휴대폰번호 형식이 올바르지 않아요.";
    case "auth/too-many-requests":
    case "auth/quota-exceeded":
      return "인증 요청이 너무 많아요. 잠시 후 다시 시도해 주세요.";
    case "auth/invalid-verification-code":
      return "인증번호가 맞지 않아요. 다시 확인해 주세요.";
    case "auth/code-expired":
      return "인증번호가 만료됐어요. 재전송을 눌러 주세요.";
    case "auth/captcha-check-failed":
      return "보안 확인에 실패했어요. 다시 시도해 주세요.";
    default:
      return fallback;
  }
}

/**
 * 인클래스 본인 확인 게이트 — 두 단계다.
 *
 *  1. 아이디 + 휴대폰번호를 명단과 대조(`/api/members/verify`, 차감 없음)
 *  2. 그 번호로 온 인증번호를 입력(`/api/members/confirm`) → 학생 토큰 발급
 *
 * 통과하면 토큰이 sessionStorage에 저장되어 다른 계열 설문에서 다시 확인할
 * 필요가 없다. 사용 횟수 차감은 결과 발급 시점에 한 번 일어난다.
 */
export function MemberGate({ meta, notice, onPass }: MemberGateProps) {
  const [step, setStep] = useState<"identity" | "code">("identity");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);

  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((left) => left - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // 화면을 떠날 때 reCAPTCHA 위젯을 정리한다
  useEffect(() => () => clearRecaptcha(), []);

  const backToIdentity = () => {
    confirmationRef.current = null;
    clearRecaptcha();
    setCode("");
    setCooldown(0);
    setStep("identity");
  };

  const requestCode = async (config: FirebaseWebConfig) => {
    const container = recaptchaRef.current;
    if (!container) throw new Error("reCAPTCHA 컨테이너를 찾지 못했습니다");
    confirmationRef.current = await sendVerificationCode(config, toE164(phone), container);
    setCooldown(RESEND_COOLDOWN_SEC);
  };

  /** 1단계 — 명단 대조 후 곧바로 문자 발송 */
  const submitIdentity = async () => {
    if (!email.trim() || !phone.trim()) {
      setError("아이디와 휴대폰번호를 모두 입력해 주세요.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/members/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "본인 확인에 실패했어요. 다시 시도해 주세요.");
        return;
      }
      await requestCode(data.firebase);
      setChallenge({ challenge: data.challenge, config: data.firebase });
      setStep("code");
    } catch (err) {
      setError(authError(err, "인증 문자를 보내지 못했어요. 잠시 후 다시 시도해 주세요."));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (!challenge || cooldown > 0) return;
    setBusy(true);
    setError(null);
    try {
      await requestCode(challenge.config);
    } catch (err) {
      setError(authError(err, "인증 문자를 다시 보내지 못했어요. 잠시 후 시도해 주세요."));
    } finally {
      setBusy(false);
    }
  };

  /** 2단계 — 인증번호 확인 → 학생 토큰 */
  const submitCode = async () => {
    const confirmation = confirmationRef.current;
    if (!confirmation || !challenge) return;
    if (code.length < 6) {
      setError("인증번호 6자리를 입력해 주세요.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const credential = await confirmation.confirm(code);
      const idToken = await credential.user.getIdToken();
      const res = await fetch("/api/members/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge: challenge.challenge, idToken }),
      });
      const data = await res.json();
      await signOutQuietly();
      if (!data.ok) {
        setError(data.error ?? "인증에 실패했어요. 다시 시도해 주세요.");
        if (data.reason === "challenge_expired") backToIdentity();
        return;
      }
      clearRecaptcha();
      saveMemberToken(data.token);
      onPass(data.token);
    } catch (err) {
      setError(authError(err, "인증에 실패했어요. 다시 시도해 주세요."));
    } finally {
      setBusy(false);
    }
  };

  const headingStyle = {
    margin: "20px 0 0",
    fontFamily: "var(--font-display)",
    fontSize: "var(--text-h3)",
    fontWeight: "var(--fw-bold)",
    color: "var(--text-strong)",
  } as const;

  const bodyStyle = {
    margin: "12px auto 0",
    maxWidth: 380,
    fontSize: "var(--text-sm)",
    lineHeight: "var(--leading-relaxed)",
    color: "var(--text-muted)",
  } as const;

  const formStyle = {
    margin: "28px auto 0",
    maxWidth: 320,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  } as const;

  const fieldStyle = { ...inputStyle, width: "100%", padding: "14px 16px", textAlign: "center" } as const;

  const errorLine = error && (
    <p
      role="alert"
      style={{
        margin: 0,
        fontSize: "var(--text-xs)",
        lineHeight: "var(--leading-relaxed)",
        color: "var(--danger)",
      }}
    >
      {error}
    </p>
  );

  return (
    <div className="univ-question-enter" style={{ marginTop: 48, textAlign: "center" }}>
      <span style={{ fontSize: 40 }} aria-hidden>
        {step === "identity" ? "🪪" : "📲"}
      </span>

      {step === "identity" ? (
        <>
          <h1 style={headingStyle}>본인 확인이 필요해요</h1>
          <p style={bodyStyle}>
            {meta.name} 설문은 인클래스에 등록된 우주설 수업 수강생이 이용할 수 있어요. 인클래스
            아이디와 가입할 때 쓴 휴대폰번호를 입력하면 그 번호로 인증번호를 보내드려요.{" "}
            <strong style={{ color: "var(--text-primary)" }}>2회</strong>까지 추천을 받을 수 있습니다.
          </p>

          {notice && (
            <p
              style={{
                margin: "16px auto 0",
                maxWidth: 380,
                fontSize: "var(--text-xs)",
                color: "#fecdd3",
              }}
            >
              {notice}
            </p>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitIdentity();
            }}
            style={formStyle}
          >
            <input
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              placeholder="인클래스 아이디"
              autoFocus
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              inputMode="email"
              aria-label="인클래스 아이디(이메일)"
              style={fieldStyle}
            />
            <input
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value.replace(/[^0-9-]/g, ""));
                setError(null);
              }}
              placeholder="휴대폰번호"
              autoComplete="tel"
              inputMode="numeric"
              aria-label="휴대폰번호"
              style={fieldStyle}
            />
            {errorLine}
            <Button type="submit" track={meta.id} disabled={busy} fullWidth>
              {busy ? "확인 중..." : "인증번호 받기 ✉️"}
            </Button>
          </form>

          <p
            style={{
              margin: "24px auto 0",
              maxWidth: 380,
              fontSize: "var(--text-xs)",
              lineHeight: "var(--leading-relaxed)",
              color: "var(--text-ghost)",
            }}
          >
            아이디는 <b>@inclass.co.kr</b> 앞부분만 입력해도 돼요. 본인 번호가 등록돼 있지 않다면
            학부모님 번호로도 확인할 수 있어요(그 번호로 문자가 갑니다). 입력한 번호는 본인 확인에만
            쓰고 명단에는 해시로만 남습니다.
          </p>
        </>
      ) : (
        <>
          <h1 style={headingStyle}>인증번호를 입력해 주세요</h1>
          <p style={bodyStyle}>
            <strong style={{ color: "var(--text-primary)" }}>{phone}</strong> 로 보낸 6자리 숫자를
            입력하면 설문이 시작돼요.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitCode();
            }}
            style={formStyle}
          >
            <input
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                setError(null);
              }}
              placeholder="000000"
              autoFocus
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={6}
              aria-label="인증번호 6자리"
              style={{ ...fieldStyle, letterSpacing: "0.4em", fontSize: "var(--text-body)" }}
            />
            {errorLine}
            <Button type="submit" track={meta.id} disabled={busy} fullWidth>
              {busy ? "확인 중..." : "설문 시작하기 🚀"}
            </Button>
          </form>

          <div
            style={{
              margin: "16px auto 0",
              display: "flex",
              justifyContent: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <Button variant="ghost" size="sm" disabled={busy || cooldown > 0} onClick={resend}>
              {cooldown > 0 ? `재전송 (${cooldown}초)` : "인증번호 재전송"}
            </Button>
            <Button variant="ghost" size="sm" disabled={busy} onClick={backToIdentity}>
              번호 바꾸기
            </Button>
          </div>

          <p
            style={{
              margin: "24px auto 0",
              maxWidth: 380,
              fontSize: "var(--text-xs)",
              lineHeight: "var(--leading-relaxed)",
              color: "var(--text-ghost)",
            }}
          >
            문자가 오지 않으면 번호를 다시 확인하거나 잠시 뒤 재전송을 눌러 주세요. 계속 안 되면
            선생님께 알려주세요.
          </p>
        </>
      )}

      {/* invisible reCAPTCHA가 붙는 자리 — 두 단계 모두에서 살아 있어야 한다 */}
      <div ref={recaptchaRef} />
    </div>
  );
}
