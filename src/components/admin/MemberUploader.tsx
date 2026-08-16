"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface SheetIssue {
  row: number;
  message: string;
}

interface UploadResult {
  added: number;
  updated: number;
  skipped: number;
  warnings: SheetIssue[];
  errors: SheetIssue[];
}

/**
 * 인클래스 구성원 엑셀 업로드 — 병합(추가·갱신만).
 * 인증은 로그인 세션 쿠키로 (same-origin fetch에 자동 포함).
 */
export function MemberUploader() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/members/upload", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setResult(data);
        router.refresh(); // 아래 명단 표를 새로 그린다
      } else {
        setError(data.error ?? "업로드에 실패했어요.");
      }
    } catch {
      setError("네트워크 오류로 업로드에 실패했어요.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xlsm"
          disabled={busy}
          aria-label="인클래스 구성원 엑셀 파일"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file);
          }}
          style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", maxWidth: "100%" }}
        />
        {busy && (
          <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
            읽는 중...
          </span>
        )}
      </div>

      {error && (
        <p
          role="alert"
          style={{
            margin: "10px 0 0",
            fontSize: "var(--text-xs)",
            lineHeight: "var(--leading-relaxed)",
            color: "var(--danger)",
          }}
        >
          {error}
        </p>
      )}

      {result && (
        <div style={{ marginTop: 12 }}>
          <p role="status" style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: "var(--fw-bold)" }}>
            <span style={{ color: "var(--success)" }}>추가 {result.added}</span>
            <span style={{ color: "var(--text-faint)" }}> · </span>
            <span style={{ color: "var(--text-accent)" }}>갱신 {result.updated}</span>
            {result.skipped > 0 && (
              <>
                <span style={{ color: "var(--text-faint)" }}> · </span>
                <span style={{ color: "var(--danger)" }}>건너뜀 {result.skipped}</span>
              </>
            )}
          </p>
          <p style={{ margin: "6px 0 0", fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>
            파일에 없는 구성원은 그대로 유지되고, 이미 쓴 횟수도 초기화되지 않아요.
          </p>

          {[...result.errors, ...result.warnings].length > 0 && (
            <ul
              style={{
                listStyle: "none",
                margin: "12px 0 0",
                padding: "10px 14px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
                background: "var(--surface-card)",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {result.errors.map((issue) => (
                <li key={`e${issue.row}`} style={{ fontSize: "var(--text-xs)", color: "var(--danger)" }}>
                  {issue.row}번째 줄 — {issue.message}
                </li>
              ))}
              {result.warnings.map((issue) => (
                <li key={`w${issue.row}`} style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                  {issue.row}번째 줄 — {issue.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
