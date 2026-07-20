"use client";

export function LogoutButton() {
  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.reload();
  };
  return (
    <button
      type="button"
      onClick={logout}
      style={{
        background: "transparent",
        border: "1px solid var(--border-strong)",
        color: "var(--text-secondary)",
        borderRadius: "var(--radius-full)",
        padding: "6px 16px",
        fontSize: "var(--text-sm)",
        fontWeight: "var(--fw-bold)",
        cursor: "pointer",
      }}
    >
      로그아웃
    </button>
  );
}
