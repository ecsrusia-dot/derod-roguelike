"""
방랑검사 카드뉴스 5장 완성판 (1080x1080)
시안 1·2번 톤 확정 후 3·4·5번 추가.
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

FONT_DIR = '/tmp/cards/fonts'
F_BLACK = os.path.join(FONT_DIR, 'Pretendard-Black.otf')
F_BOLD = os.path.join(FONT_DIR, 'Pretendard-Bold.otf')
F_MEDIUM = os.path.join(FONT_DIR, 'Pretendard-Medium.otf')
F_REGULAR = os.path.join(FONT_DIR, 'Pretendard-Regular.otf')

def font(path, size):
    return ImageFont.truetype(path, size)

BG = (10, 10, 14)
WANDERER = (196, 69, 61)
GOLD = (232, 176, 74)
TEXT_WHITE = (235, 230, 220)
TEXT_DIM = (160, 156, 148)
SOUL_GLOW = (255, 223, 130)
INSIGHT_BLUE = (123, 163, 196)
SAGE_PURPLE = (140, 110, 180)

OUT_DIR = '/tmp/cards/wanderer'
os.makedirs(OUT_DIR, exist_ok=True)

CARD_SIZE = 1080

def base_with_illust(illust_path, dim=0.45, blur=0):
    canvas = Image.new('RGB', (CARD_SIZE, CARD_SIZE), BG)
    if illust_path and os.path.exists(illust_path):
        illust = Image.open(illust_path).convert('RGB')
        w, h = illust.size
        side = min(w, h)
        illust = illust.crop(((w-side)//2, (h-side)//2, (w-side)//2+side, (h-side)//2+side))
        illust = illust.resize((CARD_SIZE, CARD_SIZE), Image.LANCZOS)
        if blur > 0:
            illust = illust.filter(ImageFilter.GaussianBlur(blur))
        dark = Image.new('RGB', (CARD_SIZE, CARD_SIZE), (0,0,0))
        illust = Image.blend(illust, dark, dim)
        canvas = illust
    overlay = Image.new('RGBA', (CARD_SIZE, CARD_SIZE), (0,0,0,0))
    odraw = ImageDraw.Draw(overlay)
    for y in range(CARD_SIZE):
        if y > CARD_SIZE*0.4:
            alpha = int(220 * ((y - CARD_SIZE*0.4) / (CARD_SIZE*0.6))**1.6)
            odraw.line([(0,y),(CARD_SIZE,y)], fill=(0,0,0,min(alpha, 220)))
    canvas = Image.alpha_composite(canvas.convert('RGBA'), overlay).convert('RGB')
    return canvas

def draw_centered(draw, text, y, fnt, fill):
    bbox = draw.textbbox((0, 0), text, font=fnt)
    w = bbox[2] - bbox[0]
    draw.text(((CARD_SIZE - w) // 2 - bbox[0], y), text, font=fnt, fill=fill)
    return bbox[3] - bbox[1]

def draw_handle_footer(draw, total_label):
    """공통 하단: @dawn_and_twilight + 5장 라벨"""
    draw.text((50, CARD_SIZE-50), '@dawn_and_twilight', font=font(F_REGULAR, 22), fill=TEXT_DIM)
    bbox = draw.textbbox((0,0), total_label, font=font(F_REGULAR, 22))
    draw.text((CARD_SIZE-50-(bbox[2]-bbox[0]), CARD_SIZE-50), total_label, font=font(F_REGULAR, 22), fill=TEXT_DIM)

# ===========================================================================
# 카드 1 — 표지
# ===========================================================================
def card_01_cover():
    img = base_with_illust('public/classes/wanderer.jpg', dim=0.35, blur=0)
    draw = ImageDraw.Draw(img)

    # 상단에 어두운 띠 추가 (라벨 가독성)
    band = Image.new('RGBA', (CARD_SIZE, 180), (0,0,0,140))
    img.paste(Image.alpha_composite(img.crop((0,0,CARD_SIZE,180)).convert('RGBA'), band).convert('RGB'), (0,0))
    draw = ImageDraw.Draw(img)

    label = '직업 소개 시리즈 1 / 5'
    draw_centered(draw, label, 80, font(F_MEDIUM, 32), GOLD)

    cx = CARD_SIZE // 2
    draw.line([(cx-180, 130), (cx-30, 130)], fill=GOLD, width=2)
    draw.line([(cx+30, 130), (cx+180, 130)], fill=GOLD, width=2)
    draw.ellipse([cx-6, 124, cx+6, 136], outline=GOLD, width=2)

    en_sub = 'WANDERER'
    en_fnt = font(F_BOLD, 38)
    char_widths = [draw.textbbox((0,0), c, font=en_fnt) for c in en_sub]
    char_ws = [b[2]-b[0] for b in char_widths]
    spacing = 12
    total_with_spacing = sum(char_ws) + spacing*(len(en_sub)-1)
    sx = (CARD_SIZE - total_with_spacing) // 2
    for c, cw in zip(en_sub, char_ws):
        draw.text((sx, 660), c, font=en_fnt, fill=GOLD)
        sx += cw + spacing

    draw_centered(draw, '방랑검사', 720, font(F_BLACK, 140), TEXT_WHITE)
    draw_centered(draw, '어둠 속에서도 검을 뻗는 자', 890, font(F_MEDIUM, 38), TEXT_DIM)
    draw_centered(draw, '"다녀오겠습니다..."', 970, font(F_REGULAR, 30), WANDERER)

    draw.text((50, CARD_SIZE-65), '@dawn_and_twilight', font=font(F_REGULAR, 22), fill=TEXT_DIM)
    draw.text((CARD_SIZE-220, CARD_SIZE-65), '— Dawn and Twilight', font=font(F_REGULAR, 22), fill=TEXT_DIM)

    img.save(os.path.join(OUT_DIR, '01_cover.jpg'), 'JPEG', quality=92, optimize=True)
    print('✓ card 01 cover')

# ===========================================================================
# 카드 2 — 시작 패시브
# ===========================================================================
def card_02_passive():
    img = base_with_illust('public/classes/combat/wanderer_combat.jpg', dim=0.7, blur=4)
    draw = ImageDraw.Draw(img)

    draw_centered(draw, '2 / 5', 60, font(F_MEDIUM, 26), TEXT_DIM)
    draw_centered(draw, '시작 패시브', 110, font(F_REGULAR, 30), GOLD)
    draw_centered(draw, '심안류 + 심안', 160, font(F_BLACK, 76), TEXT_WHITE)

    cx = CARD_SIZE // 2
    draw.line([(cx-100, 280), (cx+100, 280)], fill=WANDERER, width=3)

    box1_y = 330
    draw.rounded_rectangle([60, box1_y, CARD_SIZE-60, box1_y+280], radius=20, outline=WANDERER, width=2, fill=(20, 14, 14))
    draw.text((100, box1_y+30), '심안류', font=font(F_BOLD, 42), fill=WANDERER)
    draw.text((CARD_SIZE-180, box1_y+44), 'Lv. 3', font=font(F_BOLD, 32), fill=GOLD)
    draw.text((100, box1_y+90), '직업 전용 패시브', font=font(F_REGULAR, 22), fill=TEXT_DIM)
    draw.text((100, box1_y+135), '· 반격 확률 +20%', font=font(F_MEDIUM, 28), fill=TEXT_WHITE)
    draw.text((100, box1_y+175), '· 반격율 / 반격 데미지 +15%', font=font(F_MEDIUM, 28), fill=TEXT_WHITE)
    draw.text((100, box1_y+215), '· Lv.7 도달 시 "궁극 진화" 3분기', font=font(F_MEDIUM, 28), fill=GOLD)

    box2_y = 660
    draw.rounded_rectangle([60, box2_y, CARD_SIZE-60, box2_y+280], radius=20, outline=INSIGHT_BLUE, width=2, fill=(14, 18, 22))
    draw.text((100, box2_y+30), '심안', font=font(F_BOLD, 42), fill=INSIGHT_BLUE)
    draw.text((CARD_SIZE-180, box2_y+44), 'Lv. 2', font=font(F_BOLD, 32), fill=GOLD)
    draw.text((100, box2_y+90), '시야와 인지', font=font(F_REGULAR, 22), fill=TEXT_DIM)
    draw.text((100, box2_y+135), '· 회피율 +6%', font=font(F_MEDIUM, 28), fill=TEXT_WHITE)
    draw.text((100, box2_y+175), '· Lv.3: 적 행동 감지 (공격/방어)', font=font(F_MEDIUM, 28), fill=TEXT_WHITE)
    draw.text((100, box2_y+215), '· Lv.7: 약점 파악 (치명타 +50%)', font=font(F_MEDIUM, 28), fill=GOLD)

    draw_handle_footer(draw, '방랑검사 2/5')
    img.save(os.path.join(OUT_DIR, '02_passive.jpg'), 'JPEG', quality=92, optimize=True)
    print('✓ card 02 passive')

# ===========================================================================
# 카드 3 — 액티브 스킬 3종
# ===========================================================================
def card_03_active():
    img = base_with_illust('public/classes/combat/wanderer_combat.jpg', dim=0.78, blur=8)
    draw = ImageDraw.Draw(img)

    draw_centered(draw, '3 / 5', 60, font(F_MEDIUM, 26), TEXT_DIM)
    draw_centered(draw, '액티브 스킬', 110, font(F_REGULAR, 30), GOLD)
    draw_centered(draw, '검의 정공법', 160, font(F_BLACK, 76), TEXT_WHITE)

    cx = CARD_SIZE // 2
    draw.line([(cx-100, 280), (cx+100, 280)], fill=WANDERER, width=3)

    # 3개 박스 세로 배치 (한자 대신 번호 마크 사용)
    skills = [
        ('참격', '01', '일반 공격', '안정적 데미지의 검술 기본기.', TEXT_WHITE),
        ('관통', '02', '방어 무시', '적의 갑주를 그대로 꿰뚫는다.', WANDERER),
        ('방검', '03', '방어·받아치기', '검으로 막고 즉시 반격으로.', INSIGHT_BLUE),
    ]

    box_h = 195
    gap = 18
    start_y = 340
    for i, (name, num, type_label, desc, color) in enumerate(skills):
        y = start_y + i * (box_h + gap)
        draw.rounded_rectangle([60, y, CARD_SIZE-60, y+box_h], radius=18, outline=color, width=2, fill=(16, 14, 18))
        # 좌측 번호 디자인: 큰 숫자 + 위에 작은 라인 + 색깔 강조
        draw.line([(105, y+45), (185, y+45)], fill=color, width=3)
        draw.text((105, y+55), num, font=font(F_BLACK, 90), fill=color)
        # 이름
        draw.text((230, y+30), name, font=font(F_BLACK, 56), fill=TEXT_WHITE)
        # 타입 라벨
        draw.text((230, y+105), type_label, font=font(F_MEDIUM, 26), fill=color)
        # 설명
        draw.text((230, y+145), desc, font=font(F_REGULAR, 26), fill=TEXT_DIM)

    draw_handle_footer(draw, '방랑검사 3/5')
    img.save(os.path.join(OUT_DIR, '03_active.jpg'), 'JPEG', quality=92, optimize=True)
    print('✓ card 03 active')

# ===========================================================================
# 카드 4 — 소울 스킬 (시그니처)
# ===========================================================================
def card_04_soul():
    img = base_with_illust('public/classes/wandererwin.jpg', dim=0.55, blur=2)
    draw = ImageDraw.Draw(img)

    # 상단 어두운 띠
    band = Image.new('RGBA', (CARD_SIZE, 220), (0,0,0,160))
    img.paste(Image.alpha_composite(img.crop((0,0,CARD_SIZE,220)).convert('RGBA'), band).convert('RGB'), (0,0))
    draw = ImageDraw.Draw(img)

    draw_centered(draw, '4 / 5', 60, font(F_MEDIUM, 26), TEXT_DIM)
    draw_centered(draw, '★ 직업 소울 스킬', 100, font(F_BOLD, 32), SOUL_GLOW)

    # 가운데 황금 광채 효과 + 큰 별
    cx = CARD_SIZE // 2
    glow = Image.new('RGBA', (CARD_SIZE, CARD_SIZE), (0,0,0,0))
    gdraw = ImageDraw.Draw(glow)
    # 광채 (큰 원 그라데이션)
    for r in range(320, 0, -8):
        alpha = int(180 * (1 - r/320)**1.8)
        gdraw.ellipse([cx-r, 460-r, cx+r, 460+r], fill=(232, 176, 74, alpha//8))
    img = Image.alpha_composite(img.convert('RGBA'), glow).convert('RGB')
    draw = ImageDraw.Draw(img)

    # 가운데 큰 별 4방향 도형 (방사형 광선)
    cy = 460
    import math
    # 4방향 긴 광선
    for angle_deg in [0, 90, 45, 135]:
        rad = math.radians(angle_deg)
        for length, width in [(260, 4), (180, 8)]:
            x1 = cx + math.cos(rad) * 30
            y1 = cy + math.sin(rad) * 30
            x2 = cx + math.cos(rad) * length
            y2 = cy + math.sin(rad) * length
            draw.line([(x1, y1), (x2, y2)], fill=SOUL_GLOW, width=width)
            # 반대방향
            x1n = cx - math.cos(rad) * 30
            y1n = cy - math.sin(rad) * 30
            x2n = cx - math.cos(rad) * length
            y2n = cy - math.sin(rad) * length
            draw.line([(x1n, y1n), (x2n, y2n)], fill=SOUL_GLOW, width=width)
    # 가운데 4각 별 (다이아몬드 모양)
    diamond = [(cx, cy-60), (cx+45, cy), (cx, cy+60), (cx-45, cy)]
    draw.polygon(diamond, fill=SOUL_GLOW)
    # 검은 내부 (속이 빈 다이아)
    inner = [(cx, cy-30), (cx+22, cy), (cx, cy+30), (cx-22, cy)]
    draw.polygon(inner, fill=(20, 16, 8))

    # 한국어 이름 (한자 제거)
    draw_centered(draw, '무영의 일격', 660, font(F_BLACK, 78), TEXT_WHITE)
    # 영문
    draw_centered(draw, 'SHADOW STRIKE', 740, font(F_BOLD, 28), SOUL_GLOW)
    # 인용구
    draw_centered(draw, '"검은 그림자보다 빠르다."', 790, font(F_REGULAR, 28), TEXT_DIM)

    # 하단 효과 박스
    box_y = 850
    draw.rounded_rectangle([60, box_y, CARD_SIZE-60, box_y+150], radius=14, outline=SOUL_GLOW, width=2, fill=(20, 16, 8))
    # SOUL 100 뱃지
    draw.rounded_rectangle([90, box_y+25, 240, box_y+65], radius=20, fill=SOUL_GLOW)
    draw.text((110, box_y+30), 'SOUL 100', font=font(F_BLACK, 26), fill=(20, 16, 8))
    # 효과 텍스트
    draw.text((90, box_y+78), '· 45 데미지 (방어 무시)', font=font(F_MEDIUM, 24), fill=TEXT_WHITE)
    draw.text((90, box_y+108), '· 다음 3턴 반격 100% + 치명타 확정', font=font(F_MEDIUM, 24), fill=TEXT_WHITE)

    draw_handle_footer(draw, '방랑검사 4/5')
    img.save(os.path.join(OUT_DIR, '04_soul.jpg'), 'JPEG', quality=92, optimize=True)
    print('✓ card 04 soul')

# ===========================================================================
# 카드 5 — 다음 편 예고
# ===========================================================================
def card_05_next():
    img = base_with_illust('public/classes/sage.jpg', dim=0.5, blur=2)
    draw = ImageDraw.Draw(img)

    # 상단 어두운 띠
    band = Image.new('RGBA', (CARD_SIZE, 250), (0,0,0,170))
    img.paste(Image.alpha_composite(img.crop((0,0,CARD_SIZE,250)).convert('RGBA'), band).convert('RGB'), (0,0))
    draw = ImageDraw.Draw(img)

    draw_centered(draw, '5 / 5', 60, font(F_MEDIUM, 26), TEXT_DIM)
    draw_centered(draw, '다음 편 예고', 100, font(F_REGULAR, 28), GOLD)
    draw_centered(draw, 'NEXT EPISODE', 145, font(F_BOLD, 32), GOLD)

    # 가운데 큰 자물쇠/실루엣 자리
    # 일러를 그대로 보여주는 게 더 임팩트
    # 텍스트는 하단에 모음

    # 하단 부드러운 어두운 띠
    bot = Image.new('RGBA', (CARD_SIZE, 460), (0,0,0,160))
    img.paste(Image.alpha_composite(img.crop((0,620,CARD_SIZE,CARD_SIZE)).convert('RGBA'), bot).convert('RGB'), (0,620))
    draw = ImageDraw.Draw(img)

    # 다음 직업 정보
    draw_centered(draw, '직업 소개 2 / 5', 660, font(F_MEDIUM, 28), TEXT_DIM)
    draw_centered(draw, '술법사', 710, font(F_BLACK, 130), TEXT_WHITE)
    draw_centered(draw, 'SAGE — SORCERER OF TOUR', 870, font(F_BOLD, 26), SAGE_PURPLE)
    draw_centered(draw, '정념계 마법을 익힌 자', 920, font(F_MEDIUM, 32), TEXT_DIM)
    draw_centered(draw, '— 화염 각인 빌드의 핵심 —', 970, font(F_REGULAR, 26), GOLD)

    # 좌측 화살표
    draw.text((50, CARD_SIZE-65), '◀ 슬라이드로 다시 보기', font=font(F_REGULAR, 22), fill=TEXT_DIM)
    draw.text((CARD_SIZE-240, CARD_SIZE-65), '@dawn_and_twilight', font=font(F_REGULAR, 22), fill=TEXT_DIM)

    img.save(os.path.join(OUT_DIR, '05_next.jpg'), 'JPEG', quality=92, optimize=True)
    print('✓ card 05 next')

card_01_cover()
card_02_passive()
card_03_active()
card_04_soul()
card_05_next()

print('\nOutput:', OUT_DIR)
for f in sorted(os.listdir(OUT_DIR)):
    size_kb = os.path.getsize(os.path.join(OUT_DIR, f)) / 1024
    print(f'  {f}: {size_kb:.0f} KB')
