"use client";

import { useState } from "react";
import { Button } from "@/components/ds/Button";
import type { AdminRecord } from "@/lib/admins";

const inputStyle = {
  background: "var(--space-800)",
  color: "var(--text-strong)",
  border: "1px solid var(--border-strong)",
  borderRadius: "var(--radius-md)",
  padding: "10px 12px",
  fontSize: "var(--text-sm)",
} as const;

/** 관리자 계정 관리 — 목록·추가·삭제·내 비밀번호 변경. */
export function AccountManager({
  me,
  initialAdmins,
}: {
  me: string;
  initialAdmins: AdminRecord[];
}) {
  const [admins, setAdmins] = useState(initialAdmins);
  const [newUser, setNewUser] = useState("");
  const [newPass, setNewPass] = useState("");
  const [pwOpen, setPwOpen] = useState(false);
  const [myPass, setMyPass] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const res = await fetch("/api/admin/accounts");
    if (res.ok) {
      const data = await res.json();
      setAdmins(data.admins);
    }
  };

  const addAdmin = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUser, password: newPass }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setNewUser("");
        setNewPass("");
        setMsg({ kind: "ok", text: "계정을 추가했어요." });
        await refresh();
      } else {
        setMsg({ kind: "err", text: data.error ?? "추가에 실패했어요." });
      }
    } finally {
      setBusy(false);
    }
  };

  const removeAdmin = async (username: string) => {
    setMsg(null);
    const res = await fetch("/api/admin/accounts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) {
      setMsg({ kind: "ok", text: `${username} 계정을 삭제했어요.` });
      await refresh();
    } else {
      setMsg({ kind: "err", text: data.error ?? "삭제에 실패했어요." });
    }
  };

  const changeMyPassword = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: myPass }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setMyPass("");
        setPwOpen(false);
        setMsg({ kind: "ok", text: "비밀번호를 변경했어요." });
      } else {
        setMsg({ kind: "err", text: data.error ?? "변경에 실패했어요." });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {msg && (
        <p
          role="status"
          style={{
            margin: "0 0 14px",
            fontSize: "var(--text-xs)",
            fontWeight: "var(--fw-bold)",
            color: msg.kind === "ok" ? "var(--success)" : "var(--danger)",
          }}
        >
          {msg.text}
        </p>
      )}

      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {admins.map((a) => (
          <li
            key={a.username}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
              background: "var(--surface-card)",
              padding: "10px 14px",
              fontSize: "var(--text-sm)",
            }}
          >
            <span style={{ minWidth: 0 }}>
              <b style={{ color: "var(--text-primary)" }}>{a.username}</b>
              {a.username === me && (
                <span style={{ marginLeft: 8, fontSize: "var(--text-xs)", color: "var(--text-accent)" }}>
                  나
                </span>
              )}
              <span style={{ display: "block", fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>
                {a.lastLoginAt ? `최근 로그인 ${a.lastLoginAt.slice(0, 10)}` : "로그인 이력 없음"}
              </span>
            </span>
            {a.username !== me && (
              <button
                type="button"
                onClick={() => removeAdmin(a.username)}
                style={{
                  flex: "0 0 auto",
                  background: "transparent",
                  border: "1px solid var(--danger-border)",
                  color: "var(--danger)",
                  borderRadius: "var(--radius-full)",
                  padding: "5px 12px",
                  fontSize: "var(--text-xs)",
                  fontWeight: "var(--fw-bold)",
                  cursor: "pointer",
                }}
              >
                삭제
              </button>
            )}
          </li>
        ))}
      </ul>

      {/* 계정 추가 */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          addAdmin();
        }}
        style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}
      >
        <input
          value={newUser}
          onChange={(e) => setNewUser(e.target.value)}
          placeholder="새 아이디"
          autoCapitalize="none"
          aria-label="새 관리자 아이디"
          style={{ ...inputStyle, flex: "1 1 130px", minWidth: 0 }}
        />
        <input
          type="password"
          value={newPass}
          onChange={(e) => setNewPass(e.target.value)}
          placeholder="비밀번호"
          autoComplete="new-password"
          aria-label="새 관리자 비밀번호"
          style={{ ...inputStyle, flex: "1 1 130px", minWidth: 0 }}
        />
        <Button type="submit" size="sm" variant="secondary" disabled={busy}>
          계정 추가
        </Button>
      </form>

      {/* 내 비밀번호 변경 */}
      <div style={{ marginTop: 16, borderTop: "1px solid var(--border-subtle)", paddingTop: 16 }}>
        {!pwOpen ? (
          <button
            type="button"
            onClick={() => setPwOpen(true)}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-secondary)",
              fontSize: "var(--text-sm)",
              fontWeight: "var(--fw-bold)",
              cursor: "pointer",
              padding: 0,
            }}
          >
            내 비밀번호 변경 →
          </button>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              changeMyPassword();
            }}
            style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}
          >
            <input
              type="password"
              value={myPass}
              onChange={(e) => setMyPass(e.target.value)}
              placeholder="새 비밀번호 (8자 이상)"
              autoComplete="new-password"
              aria-label="새 비밀번호"
              autoFocus
              style={{ ...inputStyle, flex: "1 1 180px", minWidth: 0 }}
            />
            <Button type="submit" size="sm" disabled={busy}>
              변경
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setPwOpen(false);
                setMyPass("");
              }}
            >
              취소
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
