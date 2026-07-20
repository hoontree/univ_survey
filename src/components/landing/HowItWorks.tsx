const STEPS = [
  {
    title: "계열 선택",
    description: "의대 · 약대 · 비메디컬 중 나의 목표 계열을 골라요.",
    emoji: "🧭",
  },
  {
    title: "설문 응답",
    description:
      "수학 실력과 성향에 대한 문항에 솔직하게 답해요. 답변마다 기준을 충족한 대학에 1표씩 쌓여요.",
    emoji: "🗳️",
  },
  {
    title: "추천 확인",
    description:
      "가장 많은 표를 받은 대학과 전체 득표 랭킹, 수능최저·시험 일정까지 한 번에 확인해요.",
    emoji: "🎓",
  },
];

export function HowItWorks() {
  return (
    <section className="px-6 py-16 sm:py-20">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center text-2xl font-black sm:text-3xl">
          이렇게 찾아드려요
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-full bg-indigo-500/20 text-sm font-black text-indigo-300">
                  {i + 1}
                </span>
                <span className="text-2xl" aria-hidden>
                  {step.emoji}
                </span>
              </div>
              <h3 className="mt-4 font-extrabold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/55">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
