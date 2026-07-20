import { admissionInfo } from "@/data/admission-info";
import type { TrackId } from "@/lib/types";

export function AdmissionTableView({ trackId }: { trackId: TrackId }) {
  const table = admissionInfo[trackId];
  return (
    <section className="mt-10">
      <h2 className="text-lg font-extrabold">{table.title}</h2>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[680px] border-collapse text-left text-xs">
          <thead>
            <tr className="bg-white/[0.06]">
              {table.columns.map((column) => (
                <th
                  key={column}
                  className="whitespace-pre-line border-b border-white/10 px-3 py-2.5 font-extrabold text-white/80"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, i) => (
              <tr key={i} className="odd:bg-white/[0.02]">
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className={`whitespace-pre-line border-b border-white/5 px-3 py-2.5 align-top leading-relaxed ${
                      j === 0 ? "font-extrabold text-white/90" : "text-white/60"
                    }`}
                  >
                    {cell || "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {table.note && (
        <p className="mt-2 text-xs font-bold text-white/50">{table.note}</p>
      )}
      <p className="mt-1 text-xs text-white/35">
        전형 정보는 변경될 수 있어요. 최종 지원 전 반드시 각 대학 모집요강을 확인하세요.
      </p>
    </section>
  );
}
