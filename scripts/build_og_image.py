#!/usr/bin/env python3
"""카톡·SNS 공유 썸네일(Open Graph 이미지) 생성 → src/app/opengraph-image.png (1200x630).

브랜드 디자인(코스믹 다크 + 네뷸라 그라디언트 워드마크 + 신준섭 X 우주설 락업)을
ONE Mobile 원본 폰트로 렌더링한다. 카피·색을 바꾸려면 이 파일만 고치고 재실행:
    python3 scripts/build_og_image.py
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
HOME = Path.home()
OUT = ROOT / "src" / "app" / "opengraph-image.png"

W, H = 1200, 630
BG = (7, 11, 24)  # #070b18

TITLE_FONT = HOME / "Downloads/ONE Mobile Title/ONE Mobile Title OTF.otf"
BOLD_FONT = HOME / "Downloads/ONE Mobile Regular/ONE Mobile OTF Bold.otf"
REG_FONT = HOME / "Downloads/ONE Mobile Regular/ONE Mobile OTF Regular.otf"

JOONLAB = ROOT / "public/brand/joonlab-logo-white.png"
EMBLEM = ROOT / "public/brand/univer-seol-mark.png"


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size)


def text_size(draw, s, f, tracking=0):
    if tracking == 0:
        box = draw.textbbox((0, 0), s, font=f)
        return box[2] - box[0], box[3] - box[1], box[1]
    w = 0
    for ch in s:
        b = draw.textbbox((0, 0), ch, font=f)
        w += (b[2] - b[0]) + tracking
    w -= tracking
    box = draw.textbbox((0, 0), s, font=f)
    return w, box[3] - box[1], box[1]


def draw_tracked(draw, xy, s, f, fill, tracking):
    x, y = xy
    for ch in s:
        draw.text((x, y), ch, font=f, fill=fill)
        b = draw.textbbox((0, 0), ch, font=f)
        x += (b[2] - b[0]) + tracking


def build_background() -> Image.Image:
    img = Image.new("RGB", (W, H), BG)
    px = np.array(img).astype(np.float32)

    # 상단 중앙 인디고 블룸 (radial glow)
    yy, xx = np.mgrid[0:H, 0:W]
    cx, cy = W * 0.5, -H * 0.15
    dist = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / (H * 0.95)
    glow = np.clip(1 - dist, 0, 1) ** 2.2
    for c, add in zip(range(3), (60, 62, 120)):  # 인디고 톤
        px[:, :, c] += glow * add
    img = Image.fromarray(np.clip(px, 0, 255).astype(np.uint8))

    # 별 산점
    rng = np.random.default_rng(7)
    d = ImageDraw.Draw(img, "RGBA")
    for _ in range(90):
        x, y = rng.integers(0, W), rng.integers(0, H)
        r = rng.choice([1, 1, 1, 2])
        a = int(rng.integers(40, 150))
        d.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255, a))
    return img


def gradient_wordmark(draw_tmp, s, f) -> Image.Image:
    """네뷸라 그라디언트로 채운 텍스트 (a5b4fc → c4b5fd → f0abfc)."""
    box = draw_tmp.textbbox((0, 0), s, font=f)
    tw, th = box[2] - box[0], box[3] - box[1]
    pad = 20
    mask = Image.new("L", (tw + pad * 2, th + pad * 2), 0)
    ImageDraw.Draw(mask).text((pad - box[0], pad - box[1]), s, font=f, fill=255)

    stops = [(0.0, (165, 180, 252)), (0.5, (196, 181, 253)), (1.0, (240, 171, 252))]
    grad = np.zeros((mask.height, mask.width, 3), dtype=np.uint8)
    xs = np.linspace(0, 1, mask.width)
    for i in range(3):
        vals = np.interp(xs, [s0 for s0, _ in stops], [c[i] for _, c in stops])
        grad[:, :, i] = vals.astype(np.uint8)[None, :]
    grad_img = Image.fromarray(grad, "RGB").convert("RGBA")
    grad_img.putalpha(mask)
    return grad_img


def fit(logo_path: Path, height: int) -> Image.Image:
    im = Image.open(logo_path).convert("RGBA")
    w = int(im.width * height / im.height)
    return im.resize((w, height), Image.LANCZOS)


def main() -> None:
    img = build_background()
    draw = ImageDraw.Draw(img, "RGBA")

    # ── 상단: JOONLAB × 우주설 엠블럼 락업 ──
    jl = fit(JOONLAB, 30)
    em = fit(EMBLEM, 44)
    x_font = font(REG_FONT, 26)
    xw = draw.textlength("×", font=x_font)
    gap = 18
    lockup_w = jl.width + gap + xw + gap + em.width
    lx = (W - lockup_w) // 2
    ly = 70
    img.paste(jl, (int(lx), ly + (44 - jl.height) // 2), jl)
    lx += jl.width + gap
    draw.text((lx, ly + (44 - 30) // 2), "×", font=x_font, fill=(255, 255, 255, 120))
    lx += xw + gap
    img.paste(em, (int(lx), ly), em)

    # ── 워드마크 "유니버설" (그라디언트) ──
    tf = font(TITLE_FONT, 168)
    wm = gradient_wordmark(draw, "유니버설", tf)
    wy = 150
    img.paste(wm, ((W - wm.width) // 2, wy), wm)

    # ── "UNIVERSEOL" (자간 넓게, faint) ──
    ef = font(TITLE_FONT, 30)
    tracking = 22
    tw, _, _ = text_size(draw, "UNIVERSEOL", ef, tracking)
    draw_tracked(draw, ((W - tw) // 2, 350), "UNIVERSEOL", ef, (255, 255, 255, 110), tracking)

    # ── "논술 전형 추천 시스템" (white bold) ──
    sf = font(BOLD_FONT, 58)
    sw = draw.textlength("논술 전형 추천 시스템", font=sf)
    draw.text(((W - sw) // 2, 420), "논술 전형 추천 시스템", font=sf, fill=(255, 255, 255, 255))

    # ── 하단 태그라인 ──
    cf = font(BOLD_FONT, 27)
    cap = "신준섭 X 우주설 논술연구소"
    cw = draw.textlength(cap, font=cf)
    draw.text(((W - cw) // 2, 528), cap, font=cf, fill=(255, 255, 255, 140))

    img.convert("RGB").save(OUT, "PNG")
    print(f"생성: {OUT} ({img.width}x{img.height}, {OUT.stat().st_size // 1024}KB)")


if __name__ == "__main__":
    main()
