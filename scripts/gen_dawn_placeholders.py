#!/usr/bin/env python3
"""
Pillow procedural placeholder generator for dawn (천상·여명) championship illustrations.

Generates 20 combat illustrations (16:9) + 4 boss intro illustrations (9:16) = 24 files.
Quality is intentionally placeholder-level — these are stand-ins until real DALL-E 3
artwork from the docs prompts replaces them by file name match.

Run once from repo root:
  python3 scripts/gen_dawn_placeholders.py
"""
from PIL import Image, ImageDraw, ImageFont
import math
import os
import random

OUT_DIR = "public/enemies/championship/dawn"
COMBAT_SIZE = (1792, 1024)  # 16:9 — DALL-E 3 spec
INTRO_SIZE = (1024, 1792)   # 9:16 — DALL-E 3 spec

# Try Korean-capable fonts in order of preference
FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
    "/usr/share/fonts/opentype/unifont/unifont.otf",
    "/usr/share/fonts/opentype/unifont/unifont_jp.otf",
]

def load_font(size):
    for path in FONT_CANDIDATES:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()

# Chapter palettes (dawn 1~4: 따뜻한 황금 → 신적 백금)
PALETTES = {
    1: {  # 천국 외곽 — 입문 (옅은 황금·하늘색)
        "bg_top": (40, 30, 55),
        "bg_bot": (180, 140, 80),
        "ray": (255, 220, 140, 70),
        "accent": (255, 240, 180),
        "title_color": (255, 245, 200),
        "frame": (220, 180, 100),
    },
    2: {  # 천국 성소 — 중급 (황금·흰빛)
        "bg_top": (50, 35, 60),
        "bg_bot": (220, 180, 100),
        "ray": (255, 230, 160, 90),
        "accent": (255, 250, 220),
        "title_color": (255, 250, 230),
        "frame": (230, 200, 130),
    },
    3: {  # 여명 차원 — 고급 (광휘 황금·보라빛)
        "bg_top": (60, 30, 80),
        "bg_bot": (230, 190, 110),
        "ray": (255, 240, 180, 100),
        "accent": (240, 220, 255),
        "title_color": (255, 250, 235),
        "frame": (200, 160, 230),
    },
    4: {  # 신적 여명 — 최종 (광휘 백금·신적)
        "bg_top": (30, 25, 50),
        "bg_bot": (250, 230, 180),
        "ray": (255, 250, 220, 120),
        "accent": (255, 255, 240),
        "title_color": (255, 255, 245),
        "frame": (255, 220, 140),
    },
}

# Enemy roster: 4 chapters × 5 enemies each = 20 combat illustrations.
# Last entry of each chapter is the boss (also gets a 9:16 intro).
ENEMIES = {
    1: [
        ("champ_dawn_acolyte",   "빛의 견습 천사",  "일반"),
        ("champ_dawn_lantern",   "등불 정령",       "일반"),
        ("champ_dawn_choir",     "성가 사도",       "일반"),
        ("champ_dawn_warden",    "빛의 사제",       "강적"),
        ("champ_dawn_boss1",     "타락한 견습 천사", "보스"),
    ],
    2: [
        ("champ_dawn_seraph",    "6날개 사도",      "일반"),
        ("champ_dawn_paladin",   "황금 갑주 천사",  "일반"),
        ("champ_dawn_judge",     "광휘 사신",       "일반"),
        ("champ_dawn_archmage",  "빛의 마법사",     "강적"),
        ("champ_dawn_boss2",     "거대 세라핌 군주", "보스"),
    ],
    3: [
        ("champ_dawn_dominion",  "광휘 권능",       "일반"),
        ("champ_dawn_elite",     "천사 정예",       "일반"),
        ("champ_dawn_arbiter",   "심판 화신",       "일반"),
        ("champ_dawn_oracle",    "여명의 어머니",   "강적"),
        ("champ_dawn_boss3",     "여명의 마녀",     "보스"),
    ],
    4: [
        ("champ_dawn_sovereign", "천상의 군주",     "일반"),
        ("champ_dawn_eternal",   "영원한 빛",       "일반"),
        ("champ_dawn_myriad",    "무수한 날개",     "일반"),
        ("champ_dawn_avatar",    "신성 광휘 화신",  "강적"),
        ("champ_dawn_boss4",     "여명의 신",       "보스"),
    ],
}

def vertical_gradient(size, top, bot):
    w, h = size
    img = Image.new("RGB", size, top)
    pixels = img.load()
    for y in range(h):
        t = y / max(1, h - 1)
        r = int(top[0] * (1 - t) + bot[0] * t)
        g = int(top[1] * (1 - t) + bot[1] * t)
        b = int(top[2] * (1 - t) + bot[2] * t)
        for x in range(w):
            pixels[x, y] = (r, g, b)
    return img

def draw_light_rays(img, palette, n=8, seed=0):
    rng = random.Random(seed)
    w, h = img.size
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    cx, cy = w // 2, int(h * 0.35)
    for _ in range(n):
        angle = rng.uniform(-math.pi / 2, math.pi / 2)
        length = max(w, h) * 1.5
        ex = cx + length * math.cos(angle)
        ey = cy + length * math.sin(angle)
        thickness = rng.randint(18, 60)
        od.line([(cx, cy), (ex, ey)], fill=palette["ray"], width=thickness)
    img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
    return img

def draw_halo(img, palette, size_ratio=0.45):
    w, h = img.size
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    cx, cy = w // 2, int(h * 0.42)
    r = int(min(w, h) * size_ratio)
    # Concentric halos with decreasing alpha
    for i, alpha in enumerate([18, 30, 50, 80]):
        rr = r - i * 35
        if rr < 20:
            break
        col = palette["ray"][:3] + (alpha,)
        od.ellipse([(cx - rr, cy - rr), (cx + rr, cy + rr)], outline=col, width=14)
    img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
    return img

def render(out_path, size, chapter, name, role, *, is_intro=False):
    palette = PALETTES[chapter]
    img = vertical_gradient(size, palette["bg_top"], palette["bg_bot"])
    seed_val = (hash(name) ^ chapter) & 0xFFFFFFFF
    img = draw_light_rays(img, palette, n=10 if is_intro else 8, seed=seed_val)
    img = draw_halo(img, palette, size_ratio=0.50 if is_intro else 0.40)

    d = ImageDraw.Draw(img)
    w, h = size

    # Frame border
    border_w = 14 if is_intro else 10
    d.rectangle([(border_w, border_w), (w - border_w, h - border_w)],
                outline=palette["frame"], width=border_w)

    # Title — enemy name (large, centered)
    title_font = load_font(140 if is_intro else 110)
    role_font = load_font(70 if is_intro else 56)
    chapter_font = load_font(48 if is_intro else 40)
    note_font = load_font(38 if is_intro else 30)

    # Measure & center title
    bbox = d.textbbox((0, 0), name, font=title_font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = (w - tw) // 2
    ty = int(h * 0.45) if is_intro else int(h * 0.55)
    # Shadow then highlight
    d.text((tx + 4, ty + 4), name, font=title_font, fill=(0, 0, 0))
    d.text((tx, ty), name, font=title_font, fill=palette["title_color"])

    # Role badge below title
    role_bbox = d.textbbox((0, 0), f"〈 {role} 〉", font=role_font)
    rw = role_bbox[2] - role_bbox[0]
    rx = (w - rw) // 2
    ry = ty + th + 30
    d.text((rx + 3, ry + 3), f"〈 {role} 〉", font=role_font, fill=(0, 0, 0))
    d.text((rx, ry), f"〈 {role} 〉", font=role_font, fill=palette["accent"])

    # Chapter label (top-left)
    chap_text = f"dawn_{chapter}"
    d.text((40, 30), chap_text, font=chapter_font, fill=palette["accent"])

    # Concept label (top-right)
    concept = "천상·여명"
    cb = d.textbbox((0, 0), concept, font=chapter_font)
    cw = cb[2] - cb[0]
    d.text((w - cw - 40, 30), concept, font=chapter_font, fill=palette["accent"])

    # Bottom note — placeholder warning
    note = "임시 일러 (placeholder) — DALL-E 3 일러 대체 대상"
    nb = d.textbbox((0, 0), note, font=note_font)
    nw = nb[2] - nb[0]
    nx = (w - nw) // 2
    d.text((nx, h - 70), note, font=note_font, fill=palette["title_color"])

    img.save(out_path, "JPEG", quality=88, optimize=True, progressive=True)
    print(f"  → {out_path} ({os.path.getsize(out_path)//1024} KB)")

def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    print(f"\nGenerating dawn placeholders → {OUT_DIR}/\n")

    for chapter, lineup in ENEMIES.items():
        print(f"Chapter dawn_{chapter}:")
        for key, name, role in lineup:
            combat_path = os.path.join(OUT_DIR, f"{key}_combat.jpg")
            render(combat_path, COMBAT_SIZE, chapter, name, role, is_intro=False)
            if role == "보스":
                intro_path = os.path.join(OUT_DIR, f"{key}_intro.jpg")
                render(intro_path, INTRO_SIZE, chapter, name, role, is_intro=True)

    total = len([f for f in os.listdir(OUT_DIR) if f.endswith(".jpg")])
    print(f"\nDone. {total} files generated.")

if __name__ == "__main__":
    main()
