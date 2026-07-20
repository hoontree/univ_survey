"use client";

import { useState } from "react";
import { Button } from "@/components/ds/Button";

/**
 * 관리자 토큰 생성 폼 — 개수를 입력하면 코드 목록이 생성된다.
 * 인증은 로그인 세션 쿠키로 (same-origin fetch에 자동 포함).
 */
export function TokenGenerator() {
  const [count, setCount] = useState("30");
  const [busy, setBusy] = useState(false);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    const n = Number(count);
    if (!Number.isInteger(n) || n < 1 || n > 200) {
      setError("1~200 사이 개수를 입력해 주세요.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/tokens/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: n }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setCodes(data.codes);
        setCopied(false);
      } else {
        setError(data.error ?? "생성에 실패했습니다.");
      }
    } catch {
      setError("네트워크 오류로 생성에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const copyAll = async () => {
    if (!codes) return;
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard 미지원 시 텍스트 영역에서 직접 복사
    }
  };

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          generate();
        }}
        style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}
      >
        <input
          value={count}
          onChange={(e) => setCount(e.target.value.replace(/[^0-9]/g, ""))}
          inputMode="numeric"
          aria-label="생성할 토큰 개수"
          style={{
            width: 90,
            background: "var(--space-800)",
            color: "var(--text-strong)",
            border: "1px solid var(--border-strong)",
            borderRadius: "var(--radius-md)",
            padding: "10px 12px",
            fontSize: "var(--text-sm)",
            textAlign: "center",
          }}
        />
        <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>개</span>
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? "생성 중..." : "토큰 생성"}
        </Button>
        {codes && (
          <Button variant="secondary" size="sm" onClick={copyAll}>
            {copied ? "복사 완료 ✓" : "전체 복사"}
          </Button>
        )}
      </form>
      {error && (
        <p role="alert" style={{ margin: "10px 0 0", fontSize: "var(--text-xs)", color: "var(--danger)" }}>
          {error}
        </p>
      )}
      {codes && (
        <textarea
          readOnly
          value={codes.join("\n")}
          aria-label="생성된 토큰 목록"
          style={{
            marginTop: 12,
            width: "100%",
            minHeight: 120,
            background: "var(--space-950)",
            color: "var(--indigo-300)",
            border: "1px solid var(--border-strong)",
            borderRadius: "var(--radius-md)",
            padding: 12,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: "var(--text-sm)",
            letterSpacing: "0.08em",
            lineHeight: 1.8,
            resize: "vertical",
          }}
        />
      )}
      {codes && (
        <p style={{ margin: "8px 0 0", fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>
          {codes.length}개 생성됨 — 새로고침하면 아래 목록에도 반영됩니다. 학생들에게 한 줄씩
          나눠주세요.
        </p>
      )}
    </div>
  );
}
