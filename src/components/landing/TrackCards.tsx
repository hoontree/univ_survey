import Link from "next/link";
import { TRACK_METAS, getTrack } from "@/lib/tracks";

export function TrackCards() {
  return (
    <section id="tracks" className="scroll-mt-8 px-6 py-16 sm:py-20">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center text-2xl font-black sm:text-3xl">
          어느 우주로 떠날까요?
        </h2>
        <p className="mt-3 text-center text-sm text-white/55 sm:text-base">
          목표 계열을 선택하면 바로 설문이 시작돼요.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {TRACK_METAS.map((meta) => {
            const track = getTrack(meta.id);
            return (
              <Link
                key={meta.id}
                href={`/survey/${meta.id}`}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition hover:-translate-y-1 hover:border-white/25 hover:bg-white/[0.07]"
              >
                <div
                  className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${meta.accent}`}
                />
                <span className="text-3xl">{meta.emoji}</span>
                <h3 className="mt-4 text-xl font-extrabold">{meta.name}</h3>
                <p className="mt-1.5 text-sm text-white/55">{meta.tagline}</p>
                <p className="mt-5 text-xs font-medium text-white/45">
                  대학 {track.universities.length}곳 · 문항 {track.questions.length}개 · 약 3분
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-indigo-300 transition group-hover:gap-2">
                  시작하기 <span aria-hidden>→</span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
