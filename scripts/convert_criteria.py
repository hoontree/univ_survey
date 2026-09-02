#!/usr/bin/env python3
"""엑셀 기준표(data-src/*.xlsx) → src/data/criteria/*.json 변환기.

기준표 갱신 시 엑셀을 data-src/에 덮어쓰고 재실행:
    python3 scripts/convert_criteria.py

셀 규칙:
  "N▲"  → 답변 번호 ≤ N 이면 해당 대학 +1표 (mode: lte)
  "N"   → 답변 번호 = N 일 때만 +1표      (mode: eq)
문항 규칙:
  HARD_FILTER_QUESTIONS 에 있는 문항(성별·탐구 과목 선택)은 hardFilter —
  미충족 대학은 득표와 무관하게 최종 추천에서 제외(지원 불가 표시).
  임계값별 제외 사유(filterLabels)를 함께 내려 결과 화면이 묶어 보여준다.
"""
import json
import re
import sys
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / "data-src"
OUT_DIR = ROOT / "src" / "data" / "criteria"

TRACKS = [
    {"file": "의대기준.xlsx", "id": "medical", "name": "의대"},
    {"file": "약대기준.xlsx", "id": "pharmacy", "name": "약대"},
    {"file": "비메디컬기준.xlsx", "id": "nonmedical", "name": "비메디컬"},
]

# 하드 필터 문항: 득표가 아니라 지원 자격이다. 값은 임계값(N▲의 N) → 결과 화면 제외 사유.
# 마지막 선택지가 임계값인 대학(모두 통과)은 라벨이 필요 없다.
# 탐구 문항 임계값은 강의자료(2027 최저학력기준) 기준: 과(2) 요구=1▲, 과(1) 요구=2▲, 탐구 무관=3▲.
HARD_FILTER_QUESTIONS = {
    "성별": {1: "여학생만 지원 가능"},
    "수능 탐구 과목은 어떻게 응시합니까?": {
        1: "과탐 2과목 응시 필요",
        2: "과탐 1과목 이상 응시 필요",
    },
}

# 선택지 마커: 문자열 시작 또는 공백 뒤의 "N." (선택지 본문 속 숫자와 구분)
OPTION_MARKER = re.compile(r"(?:(?<=^)|(?<=\s))([1-9])\.\s*")


def parse_options(raw: str, ctx: str) -> list[dict]:
    markers = list(OPTION_MARKER.finditer(raw))
    if not markers:
        sys.exit(f"[ERROR] 선택지 파싱 실패 ({ctx}): {raw!r}")
    options = []
    for i, m in enumerate(markers):
        end = markers[i + 1].start() if i + 1 < len(markers) else len(raw)
        options.append({"value": int(m.group(1)), "label": raw[m.end():end].strip()})
    values = [o["value"] for o in options]
    if values != list(range(1, len(values) + 1)):
        sys.exit(f"[ERROR] 선택지 번호가 1..n 연속이 아님 ({ctx}): {values} / {raw!r}")
    return options


def parse_rule(cell, ctx: str) -> dict:
    s = str(cell).strip()
    if s.endswith("▲"):
        return {"threshold": int(s[:-1].strip()), "mode": "lte"}
    if re.fullmatch(r"[1-9]", s):
        return {"threshold": int(s), "mode": "eq"}
    sys.exit(f"[ERROR] 규칙 셀 해석 불가 ({ctx}): {cell!r}")


def convert(track: dict) -> dict:
    wb = openpyxl.load_workbook(SRC_DIR / track["file"], data_only=True)
    ws = wb.worksheets[0]
    rows = list(ws.iter_rows(values_only=True))

    header = rows[0]
    universities = [str(c).strip() for c in header[2:] if c is not None and str(c).strip()]

    questions = []
    for r_idx, row in enumerate(rows[1:], start=2):
        q_text = str(row[0]).strip() if row[0] is not None else ""
        if not q_text or q_text.startswith("요청사항"):
            break
        ctx = f"{track['file']} R{r_idx}"
        raw_options = str(row[1]).strip() if row[1] is not None else ""
        rules = {}
        for u_idx, univ in enumerate(universities):
            cell = row[2 + u_idx]
            if cell is None:
                sys.exit(f"[ERROR] 규칙 셀 비어있음 ({ctx}, {univ})")
            rules[univ] = parse_rule(cell, f"{ctx} {univ}")
        q = {
            "id": f"q{len(questions) + 1}",
            "text": q_text,
            "options": parse_options(raw_options, ctx),
            "rules": rules,
        }
        # 규칙 임계값이 선택지 범위를 벗어나면 데이터 오류
        max_opt = max(o["value"] for o in q["options"])
        for univ, rule in rules.items():
            if not (1 <= rule["threshold"] <= max_opt):
                sys.exit(f"[ERROR] 임계값 {rule['threshold']}이 선택지 범위(1~{max_opt}) 밖 ({ctx}, {univ})")
        if q_text in HARD_FILTER_QUESTIONS:
            labels = HARD_FILTER_QUESTIONS[q_text]
            q["hardFilter"] = True
            q["filterLabels"] = {str(k): v for k, v in labels.items()}
            for univ, rule in rules.items():
                if rule["mode"] != "lte":
                    sys.exit(f"[ERROR] 하드 필터 문항은 N▲ 규칙만 허용 ({ctx}, {univ})")
                if rule["threshold"] < max_opt and rule["threshold"] not in labels:
                    sys.exit(f"[ERROR] 임계값 {rule['threshold']}의 제외 사유 라벨 없음 ({ctx}, {univ})")
        questions.append(q)

    return {
        "id": track["id"],
        "name": track["name"],
        "universities": universities,
        "questions": questions,
    }


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for track in TRACKS:
        data = convert(track)
        out = OUT_DIR / f"{track['id']}.json"
        out.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        hard = [q["text"] for q in data["questions"] if q.get("hardFilter")]
        eq_qs = [
            q["text"] for q in data["questions"]
            if all(r["mode"] == "eq" for r in q["rules"].values())
        ]
        print(
            f"{track['id']:>10}: 대학 {len(data['universities'])}개, "
            f"문항 {len(data['questions'])}개, hardFilter={hard}, eq문항={eq_qs}"
        )


if __name__ == "__main__":
    main()
