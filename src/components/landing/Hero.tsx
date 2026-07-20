import { Button } from "@/components/ds/Button";
import { Chip } from "@/components/ds/Chip";

export function Hero() {
  return (
    <section
      className="univ-starfield"
      style={{
        position: "relative",
        overflow: "hidden",
        padding: "88px 24px 72px",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Chip leadingIcon="🔭">우주설 수리논술 · 2027 논술 시즌</Chip>

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
          나의 대학<span style={{ color: "var(--indigo-300)" }}>(Universe)</span>이
          열리는 곳
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

        <div style={{ marginTop: 36 }}>
          <Button size="lg" trailingIcon="→" href="#tracks">
            내 대학 찾으러 가기
          </Button>
        </div>
      </div>
    </section>
  );
}
