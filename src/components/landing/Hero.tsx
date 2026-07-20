import { BrandLockup } from "@/components/BrandLockup";
import { Button } from "@/components/ds/Button";

export function Hero() {
  return (
    <section
      className="univ-starfield"
      style={{
        position: "relative",
        overflow: "hidden",
        padding: "80px 24px 72px",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <BrandLockup />

        <h1 style={{ margin: "32px 0 0", lineHeight: 1.05 }}>
          <span
            className="univ-gradient-text"
            style={{
              display: "block",
              fontFamily: "var(--font-display)",
              fontSize: "clamp(56px, 10vw, 84px)",
            }}
          >
            유니버설
          </span>
          <span
            style={{
              display: "block",
              marginTop: 14,
              fontFamily: "var(--font-display)",
              fontSize: 20,
              letterSpacing: "var(--tracking-wordmark)",
              paddingLeft: "var(--tracking-wordmark)",
              color: "var(--text-faint)",
            }}
          >
            UNIVERSEOL
          </span>
        </h1>

        <p
          style={{
            margin: "26px 0 0",
            fontSize: "var(--text-lg)",
            fontWeight: "var(--fw-bold)",
            color: "rgba(255,255,255,.9)",
          }}
        >
          논술 전형 추천 시스템
        </p>

        <p
          style={{
            margin: "18px auto 0",
            maxWidth: 520,
            fontSize: "var(--text-sm)",
            lineHeight: "var(--leading-relaxed)",
            color: "var(--text-muted)",
          }}
        >
          설문 3분이면 충분해요. 답변 하나하나가 우주설의 기준표를 통과한 대학에
          투표되고, 가장 많은 표를 받은 대학이 나의 논술 1지망이 됩니다.
        </p>

        <p
          style={{
            margin: "14px auto 0",
            maxWidth: 460,
            fontSize: "var(--text-xs)",
            lineHeight: "var(--leading-relaxed)",
            color: "var(--text-faint)",
          }}
        >
          🎟️ 우주설 수업 수강생에게 발급되는 <strong style={{ color: "var(--text-secondary)" }}>이용
          토큰</strong>으로 이용할 수 있어요 · 토큰 1개당 2회
        </p>

        <div style={{ marginTop: 36 }}>
          <Button size="lg" trailingIcon="→" href="#tracks">
            내 대학 찾으러 가기
          </Button>
        </div>
      </div>
    </section>
  );
}
