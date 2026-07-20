import { BrandLockup } from "@/components/BrandLockup";

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
      <BrandLockup variant="footer" />
      <p
        style={{
          margin: "20px auto 0",
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
        2027 신준섭 X 우주설 논술연구소
      </p>
    </footer>
  );
}
