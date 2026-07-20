#!/usr/bin/env python3
"""ONE Mobile 원본 폰트(OTF) → 서브셋 WOFF2 웹폰트 생성기.

원본은 1.9~4MB라 모바일 배포에 부적합하다. KS X 1001 상용 한글 2,350자 +
라틴 + UI 글리프로 서브셋해 face당 수백 KB로 줄인다.

원본 위치(사용자 제공, 저장소에 커밋하지 않음):
    ~/Downloads/ONE Mobile Regular/, ~/Downloads/ONE Mobile Title/

실행:
    python3 scripts/build_fonts.py
"""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "src" / "app" / "fonts"
DOWNLOADS = Path.home() / "Downloads"

# (원본 경로, 출력 파일명)
FACES = [
    (DOWNLOADS / "ONE Mobile Title" / "ONE Mobile Title OTF.otf", "ONEMobileTitle.woff2"),
    (DOWNLOADS / "ONE Mobile Regular" / "ONE Mobile OTF Regular.otf", "ONEMobileRegular.woff2"),
    (DOWNLOADS / "ONE Mobile Regular" / "ONE Mobile OTF Bold.otf", "ONEMobileBold.woff2"),
]


def ks_x_1001_syllables() -> list[str]:
    """KS X 1001 상용 한글 2,350자 — euc-kr 인코딩 가능 여부로 판별."""
    out = []
    for code in range(0xAC00, 0xD7A4):
        ch = chr(code)
        try:
            ch.encode("euc-kr")
        except UnicodeEncodeError:
            continue
        out.append(ch)
    return out


def extra_glyphs() -> list[str]:
    chars = []
    chars += [chr(c) for c in range(0x0020, 0x007F)]        # ASCII 출력 가능
    chars += list("·×÷…‘’“”—–°%‰")                            # 문장부호
    chars += list("←→↑↓↺✓✕⌄⌃※∙•")                          # UI 글리프
    chars += list("設")                                       # UNIVER設 표기
    chars += [chr(c) for c in range(0x3000, 0x3040)]        # CJK 문장부호
    chars += [chr(c) for c in range(0x3130, 0x3190)]        # 호환용 자모
    chars += [chr(c) for c in range(0xFF01, 0xFF61)]        # 전각 영숫자
    return chars


def hollow_glyphs(src: Path, candidates: list[str]) -> set[str]:
    """cmap에 있지만 외곽선이 비어 있는 글리프를 찾는다.

    ONE Mobile은 —(U+2014), –(U+2013)이 이런 결함 글리프다. 서브셋에 남겨두면
    브라우저가 "이 폰트가 지원한다"고 판단해 Noto Sans KR로 폴백하지 않고
    보이지 않는 대시를 그린다. 그래서 아예 빼서 폴백이 작동하게 한다.
    """
    from fontTools.pens.boundsPen import BoundsPen
    from fontTools.ttLib import TTFont

    font = TTFont(src)
    cmap = font.getBestCmap()
    glyph_set = font.getGlyphSet()
    hollow = set()
    for ch in candidates:
        if ch.isspace():
            continue
        name = cmap.get(ord(ch))
        if name is None:
            continue
        pen = BoundsPen(glyph_set)
        glyph_set[name].draw(pen)
        if pen.bounds is None:
            hollow.add(ch)
    return hollow


def main() -> None:
    missing = [src for src, _ in FACES if not src.exists()]
    if missing:
        print("[ERROR] 원본 폰트를 찾을 수 없습니다:", file=sys.stderr)
        for m in missing:
            print(f"  - {m}", file=sys.stderr)
        sys.exit(1)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    syllables = ks_x_1001_syllables()
    extras = extra_glyphs()

    for src, out_name in FACES:
        out_path = OUT_DIR / out_name
        hollow = hollow_glyphs(src, extras)
        if hollow:
            print(f"  {out_name}: 빈 글리프 제외 → {' '.join(sorted(hollow))}")
        kept = [ch for ch in syllables + extras if ch not in hollow]
        unicodes = ",".join(f"U+{ord(ch):04X}" for ch in kept)
        subprocess.run(
            [
                "pyftsubset",
                str(src),
                f"--unicodes={unicodes}",
                "--flavor=woff2",
                "--layout-features=*",
                f"--output-file={out_path}",
            ],
            check=True,
        )
        before = src.stat().st_size / 1024 / 1024
        after = out_path.stat().st_size / 1024
        print(f"{out_name:<26} {before:5.1f}MB → {after:6.1f}KB")


if __name__ == "__main__":
    main()
