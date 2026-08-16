"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ds/Button";
import { inputStyle } from "@/components/ds/inputStyle";
import type { MemberRecord } from "@/lib/members";

const LIST_LIMIT = 100;

/**
 * 명단 조회 + 사용 횟수 초기화 + 전체 삭제.
 *
 * 초기화 버튼이 있는 이유: 토큰 시절에는 2회를 다 쓴 학생에게 새 토큰을
 * 주면 됐지만, 명단 인증에는 그 경로가 없다.
 */
export function MemberManager({ initialMembers }: { initialMembers: MemberRecord[] }) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return members;
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(needle) ||
        m.email.includes(needle) ||
        m.phoneTail.includes(needle) ||
        m.groups.some((group) => group.toLowerCase().includes(needle)),
    );
  }, [members, query]);

  const resetUses = async (email: string, name: string) => {
    setBusy(email);
    setMsg(null);
    try {
      const res = await fetch("/api/members/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setMembers((prev) => prev.map((m) => (m.email === email ? { ...m, uses: 0 } : m)));
        setMsg({ kind: "ok", text: `${name || email}님의 사용 횟수를 초기화했어요.` });
      } else {
        setMsg({ kind: "err", text: data.error ?? "초기화에 실패했어요." });
      }
    } catch {
      setMsg({ kind: "err", text: "네트워크 오류로 초기화에 실패했어요." });
    } finally {
      setBusy(null);
    }
  };

  const deleteAll = async () => {
    if (!window.confirm(`명단 ${members.length}명을 모두 삭제할까요? 되돌릴 수 없어요.`)) return;
    setBusy("__all__");
    setMsg(null);
    try {
      const res = await fetch("/api/members", { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setMembers([]);
        setMsg({ kind: "ok", text: `${data.removed}명을 삭제했어요.` });
        router.refresh();
      } else {
        setMsg({ kind: "err", text: data.error ?? "삭제에 실패했어요." });
      }
    } catch {
      setMsg({ kind: "err", text: "네트워크 오류로 삭제에 실패했어요." });
    } finally {
      setBusy(null);
    }
  };

  if (members.length === 0) {
    return (
      <p style={{ margin: "16px 0 0", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
        아직 등록된 구성원이 없어요. 인클래스에서 내려받은 구성원 목록 엑셀을 올려주세요.
      </p>
    );
  }

  return (
    <div style={{ marginTop: 16 }}>
      {msg && (
        <p
          role="status"
          style={{
            margin: "0 0 12px",
            fontSize: "var(--text-xs)",
            fontWeight: "var(--fw-bold)",
            color: msg.kind === "ok" ? "var(--success)" : "var(--danger)",
          }}
        >
          {msg.text}
        </p>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="이름·아이디·번호 뒤 4자리·반 검색"
          aria-label="구성원 검색"
          style={{ ...inputStyle, flex: "1 1 200px", minWidth: 0 }}
        />
        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>
          {filtered.length} / {members.length}명
        </span>
      </div>

      <div
        style={{
          marginTop: 12,
          overflowX: "auto",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <table
          className="univ-table"
          style={{
            width: "100%",
            minWidth: 560,
            borderCollapse: "collapse",
            fontSize: "var(--text-xs)",
            textAlign: "left",
          }}
        >
          <thead>
            <tr style={{ background: "var(--surface-raised)" }}>
              {["이름", "아이디", "번호", "반", "사용", ""].map((col, index) => (
                <th
                  key={col || `action${index}`}
                  style={{
                    padding: "8px 12px",
                    borderBottom: "1px solid var(--border-subtle)",
                    fontWeight: "var(--fw-bold)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, LIST_LIMIT).map((m) => {
              const done = m.uses >= m.maxUses;
              return (
                <tr key={m.email} style={{ borderBottom: "1px solid var(--w-06)" }}>
                  <td style={{ padding: "8px 12px", color: "var(--text-primary)" }}>{m.name || "—"}</td>
                  <td
                    style={{
                      padding: "8px 12px",
                      color: "var(--text-muted)",
                      fontFamily: "ui-monospace, Menlo, monospace",
                    }}
                  >
                    {m.email}
                  </td>
                  <td style={{ padding: "8px 12px", color: "var(--text-faint)" }}>
                    {m.phoneTail ? `••••${m.phoneTail}` : "—"}
                  </td>
                  <td style={{ padding: "8px 12px", color: "var(--text-faint)" }}>
                    {m.groups.join(", ") || "—"}
                  </td>
                  <td
                    style={{
                      padding: "8px 12px",
                      fontWeight: "var(--fw-bold)",
                      color: done ? "var(--danger)" : m.uses > 0 ? "var(--text-accent)" : "var(--success)",
                    }}
                  >
                    {m.uses} / {m.maxUses}
                  </td>
                  <td style={{ padding: "8px 12px" }}>
                    {m.uses > 0 && (
                      <button
                        type="button"
                        disabled={busy === m.email}
                        onClick={() => resetUses(m.email, m.name)}
                        style={{
                          background: "transparent",
                          border: "1px solid var(--border-strong)",
                          color: "var(--text-secondary)",
                          borderRadius: "var(--radius-full)",
                          padding: "4px 10px",
                          fontSize: "var(--text-xs)",
                          fontWeight: "var(--fw-bold)",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {busy === m.email ? "..." : "초기화"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length > LIST_LIMIT && (
        <p style={{ margin: "8px 0 0", fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>
          {LIST_LIMIT}명까지만 표시했어요. 검색으로 좁혀보세요.
        </p>
      )}

      <div style={{ marginTop: 16, borderTop: "1px solid var(--border-subtle)", paddingTop: 16 }}>
        <Button variant="ghost" size="sm" disabled={busy === "__all__"} onClick={deleteAll}>
          명단 전체 삭제
        </Button>
        <span style={{ marginLeft: 10, fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>
          학기가 끝나면 지워주세요 — 이름·번호가 담긴 개인정보입니다.
        </span>
      </div>
    </div>
  );
}
