export function Hero() {
  return (
    <section className="starfield relative overflow-hidden px-6 pt-24 pb-20 text-center sm:pt-32 sm:pb-28">
      <div className="mx-auto max-w-3xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium tracking-wide text-indigo-200 sm:text-sm">
          🔭 우주설 수리논술 · 2027 논술 시즌
        </span>
        <h1 className="mt-8 text-5xl font-black leading-tight sm:text-7xl">
          <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
            유니버설
          </span>
          <span className="mt-3 block text-lg font-bold tracking-[0.35em] text-white/50 sm:text-xl">
            UNIVER設
          </span>
        </h1>
        <p className="mt-6 text-xl font-bold text-white/90 sm:text-2xl">
          나의 대학<span className="text-indigo-300">(Universe)</span>이 열리는 곳
        </p>
        <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-white/60 sm:text-base">
          설문 3분이면 충분해요. 답변 하나하나가 우주설의 기준표를 통과한 대학에
          투표되고, 가장 많은 표를 받은 대학이 나의 논술 1지망이 됩니다.
        </p>
        <a
          href="#tracks"
          className="mt-10 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 px-8 py-4 text-base font-bold text-white shadow-lg shadow-indigo-500/30 transition hover:scale-[1.03] hover:shadow-indigo-500/50 active:scale-[0.98]"
        >
          내 대학 찾으러 가기
          <span aria-hidden>→</span>
        </a>
      </div>
    </section>
  );
}
