/* eslint-disable @next/next/no-img-element */

export function SiteFooter() {
  return (
    <footer
      style={{
        marginTop: "auto",
        borderTop: "1px solid var(--border-subtle)",
        padding: "40px 24px",
        textAlign: "center",
      }}
    >
      {/* 흰 배경 JPG 엠블럼 — 다크 표면에서는 녹아웃 처리 */}
      <img
        src="/brand/univer-seol-mark.png"
        alt="우주설 수리논술"
        width={40}
        height={40}
        style={{ display: "inline-block", opacity: 0.5 }}
      />
      <p
        style={{
          margin: "16px auto 0",
          maxWidth: 512,
          fontSize: "var(--text-xs)",
          lineHeight: 1.85,
          color: "var(--text-faint)",
        }}
      >
        본 추천은 우주설 강사의 논술 기준표를 바탕으로 한 참고용 결과이며, 특정
        학과가 아닌 지원 대학까지만 안내합니다. 최종 지원 전 반드시 각 대학
        모집요강을 확인하세요.
      </p>
      <p
        style={{
          margin: "16px 0 0",
          fontSize: "var(--text-xs)",
          fontWeight: "var(--fw-bold)",
          color: "var(--text-ghost)",
        }}
      >
        2027 우주설 수리논술
      </p>
    </footer>
  );
}
