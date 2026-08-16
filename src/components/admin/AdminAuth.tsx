"use client";

import { useState } from "react";
import { BrandLockup } from "@/components/BrandLockup";
import { Button } from "@/components/ds/Button";
import { inputStyle as baseInputStyle } from "@/components/ds/inputStyle";

const inputStyle = { ...baseInputStyle, width: "100%", padding: "12px 14px" } as const;

/**
 * 관리자 로그인 / 최초 계정 생성 화면.
 * mode="setup" 은 관리자 계정이 아직 없을 때만 서버가 내려준다(first-run).
 */
export function AdminAuth({ mode }: { mode: "login" | "setup" }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSetup = mode === "setup";

  const submit = async () => {
    if (isSetup && password !== confirm) {
      setError("비밀번호가 서로 달라요.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/${isSetup ? "setup" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        window.location.reload();
      } else {
        setError(data.error ?? "처리에 실패했어요.");
      }
    } catch {
      setError("네트워크 문제로 실패했어요. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="univ-question-enter" style={{ width: "100%", maxWidth: 360, textAlign: "center" }}>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <BrandLockup variant="footer" />
      </div>
      <h1
        style={{
          margin: "28px 0 0",
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-h3)",
          fontWeight: "var(--fw-bold)",
          color: "var(--text-strong)",
        }}
      >
        {isSetup ? "관리자 계정 만들기" : "관리자 로그인"}
      </h1>
      <p style={{ margin: "10px 0 0", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
        {isSetup
          ? "첫 관리자 계정을 만들어 주세요. 이후에는 이 아이디로 로그인해요."
          : "발급받은 관리자 아이디로 로그인해 주세요."}
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        style={{ margin: "24px 0 0", display: "flex", flexDirection: "column", gap: 10, textAlign: "left" }}
      >
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="아이디"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          aria-label="아이디"
          style={inputStyle}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={isSetup ? "비밀번호 (8자 이상)" : "비밀번호"}
          autoComplete={isSetup ? "new-password" : "current-password"}
          aria-label="비밀번호"
          style={inputStyle}
        />
        {isSetup && (
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="비밀번호 확인"
            autoComplete="new-password"
            aria-label="비밀번호 확인"
            style={inputStyle}
          />
        )}
        {error && (
          <p role="alert" style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--danger)" }}>
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy} fullWidth>
          {busy ? "처리 중..." : isSetup ? "계정 만들고 시작하기" : "로그인"}
        </Button>
      </form>
    </div>
  );
}
