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

/** 한 번호에 여러 명이 걸렸을 때 고르는 후보 (이름은 가려서 온다) */
interface Candidate {
  name: string;
  challenge: string;
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
 * 본인 확인 게이트 — 휴대폰번호 하나로 시작한다.
 *
 *  1. 번호를 인클래스 명단과 대조(`/api/members/verify`, 차감 없음) → 문자 발송
 *  2. 인증번호 확인(`/api/members/confirm`) → 학생 토큰 발급
 *  3. (드묾) 한 번호에 형제자매가 걸려 있으면 본인을 고른다
 *
 * 통과하면 토큰이 sessionStorage에 저장되어 다른 계열 설문에서 다시 확인할
 * 필요가 없다. 사용 횟수 차감은 결과 발급 시점에 한 번 일어난다.
 */
export function MemberGate({ meta, notice, onPass }: MemberGateProps) {
  const [step, setStep] = useState<"phone" | "code" | "choose">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const idTokenRef = useRef<string | null>(null);
  const recaptchaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((left) => left - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // 화면을 떠날 때 reCAPTCHA 위젯을 정리한다
  useEffect(() => () => clearRecaptcha(), []);

  const backToPhone = () => {
    confirmationRef.current = null;
    idTokenRef.current = null;
    clearRecaptcha();
    setCode("");
    setCandidates([]);
    setCooldown(0);
    setStep("phone");
  };

  /** 확인이 끝났다 — 토큰을 저장하고 설문으로 */
  const pass = async (token: string) => {
    await signOutQuietly();
    clearRecaptcha();
    saveMemberToken(token);
    onPass(token);
  };

  const requestCode = async (config: FirebaseWebConfig) => {
    const container = recaptchaRef.current;
    if (!container) throw new Error("reCAPTCHA 컨테이너를 찾지 못했습니다");
    confirmationRef.current = await sendVerificationCode(config, toE164(phone), container);
    setCooldown(RESEND_COOLDOWN_SEC);
  };

  /** 1단계 — 명단 대조 후 곧바로 문자 발송 */
  const submitPhone = async () => {
    if (!phone.trim()) {
      setError("휴대폰번호를 입력해 주세요.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/members/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "본인 확인에 실패했어요. 다시 시도해 주세요.");
        return;
      }
      // 개발·검수용 우회 번호 — 서버가 OTP 없이 바로 토큰을 내줬다. 문자 단계를 건너뛴다.
      if (data.bypass && data.token) {
        await pass(data.token);
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

  /** 검증된 ID 토큰을 서버에 제출 — 후보 선택 때도 같은 토큰을 다시 쓴다 */
  const submitToServer = async (challengeValue: string) => {
    const idToken = idTokenRef.current;
    if (!idToken) return;
    const res = await fetch("/api/members/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challenge: challengeValue, idToken }),
    });
    const data = await res.json();
    if (data.ok) {
      await pass(data.token);
      return;
    }
    if (data.reason === "choose") {
      setCandidates(data.options ?? []);
      setStep("choose");
      setError(null);
      return;
    }
    setError(data.error ?? "인증에 실패했어요. 다시 시도해 주세요.");
    if (data.reason === "challenge_expired") backToPhone();
  };

  /** 2단계 — 인증번호 확인 */
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
      idTokenRef.current = await credential.user.getIdToken();
      await submitToServer(challenge.challenge);
    } catch (err) {
      setError(authError(err, "인증에 실패했어요. 다시 시도해 주세요."));
    } finally {
      setBusy(false);
    }
  };

  /** 3단계 — 후보 중 본인 선택 */
  const choose = async (candidate: Candidate) => {
    setBusy(true);
    setError(null);
    try {
      await submitToServer(candidate.challenge);
    } catch {
      setError("인증에 실패했어요. 다시 시도해 주세요.");
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

  const fieldStyle = {
    ...inputStyle,
    width: "100%",
    padding: "14px 16px",
    textAlign: "center",
  } as const;

  const footNoteStyle = {
    margin: "24px auto 0",
    maxWidth: 380,
    fontSize: "var(--text-xs)",
    lineHeight: "var(--leading-relaxed)",
    color: "var(--text-ghost)",
  } as const;

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

  const icon = step === "phone" ? "🪪" : step === "code" ? "📲" : "🙋";

  return (
    <div className="univ-question-enter" style={{ marginTop: 48, textAlign: "center" }}>
      <span style={{ fontSize: 40 }} aria-hidden>
        {icon}
      </span>

      {step === "phone" && (
        <>
          <h1 style={headingStyle}>본인 확인이 필요해요</h1>
          <p style={bodyStyle}>
            {meta.name} 설문은 인클래스에 등록된 우주설 수업 수강생이 이용할 수 있어요. 인클래스에
            등록한 휴대폰번호를 입력하면 그 번호로 인증번호를 보내드려요.{" "}
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
              submitPhone();
            }}
            style={formStyle}
          >
            <input
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value.replace(/[^0-9-]/g, ""));
                setError(null);
              }}
              placeholder="휴대폰번호"
              autoFocus
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

          <p style={footNoteStyle}>
            본인 번호가 인클래스에 등록돼 있지 않다면 학부모님 번호로도 확인할 수 있어요(그 번호로
            문자가 갑니다). 입력한 번호는 본인 확인에만 쓰고 명단에는 해시로만 남습니다.
          </p>
        </>
      )}

      {step === "code" && (
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
            <Button variant="ghost" size="sm" disabled={busy} onClick={backToPhone}>
              번호 바꾸기
            </Button>
          </div>

          <p style={footNoteStyle}>
            문자가 오지 않으면 번호를 다시 확인하거나 잠시 뒤 재전송을 눌러 주세요. 계속 안 되면
            선생님께 알려주세요.
          </p>
        </>
      )}

      {step === "choose" && (
        <>
          <h1 style={headingStyle}>본인을 골라 주세요</h1>
          <p style={bodyStyle}>이 번호로 등록된 학생이 여러 명이에요. 설문을 볼 학생을 고르세요.</p>

          <div style={formStyle}>
            {candidates.map((candidate) => (
              <Button
                key={candidate.challenge}
                variant="secondary"
                track={meta.id}
                disabled={busy}
                fullWidth
                onClick={() => choose(candidate)}
              >
                {candidate.name}
              </Button>
            ))}
            {errorLine}
          </div>

          <div style={{ margin: "16px auto 0" }}>
            <Button variant="ghost" size="sm" disabled={busy} onClick={backToPhone}>
              처음부터 다시
            </Button>
          </div>

          <p style={footNoteStyle}>
            이름이 가려져 있어도 순서는 그대로예요. 누구인지 모르겠으면 선생님께 문의해 주세요.
          </p>
        </>
      )}

      {/* invisible reCAPTCHA가 붙는 자리 — 모든 단계에서 살아 있어야 한다 */}
      <div ref={recaptchaRef} />
    </div>
  );
}
