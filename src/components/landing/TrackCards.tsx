import { SectionHeading } from "@/components/ds/SectionHeading";
import { TrackCard } from "@/components/ds/TrackCard";
import { TRACK_METAS, getTrack } from "@/lib/tracks";

export function TrackCards() {
  return (
    <section
      id="tracks"
      style={{
        scrollMarginTop: "2rem",
        padding: "56px 24px",
        maxWidth: "var(--container-page)",
        margin: "0 auto",
      }}
    >
      <SectionHeading
        title="어느 우주로 떠날까요?"
        subtitle="목표 계열을 선택하면 바로 설문이 시작돼요."
      />
      <div
        style={{
          marginTop: 40,
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
        {TRACK_METAS.map((meta) => {
          const track = getTrack(meta.id);
          return (
            <TrackCard
              key={meta.id}
              track={meta.id}
              emoji={meta.emoji}
              name={meta.name}
              tagline={meta.tagline}
              meta={`대학 ${track.universities.length}곳 · 문항 ${track.questions.length}개 · 약 3분`}
              href={`/survey/${meta.id}`}
            />
          );
        })}
      </div>
    </section>
  );
}
