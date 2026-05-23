# 인스타 카드뉴스 — 디자인 시스템

`docs/marketing/cards/` — 인스타그램 캐러셀용 카드뉴스(1080×1080) 아카이브 + 재현 스크립트.

---

## 1. 카드뉴스란

`docs/marketing/instagram-profile.md`의 1주차 콘텐츠 캘린더에 정의된 **"5직업 소개 캐러셀 시리즈"** 첫 번째 결과물. 한 직업 = 5장 캐러셀.

| 카드 # | 역할 | 다음 카드로 이어지는 훅 |
|---|---|---|
| 1 | 표지 — 직업명·인용구 | "어떤 직업이지?" |
| 2 | 시작 패시브 — 직업 정체성 | "스킬은?" |
| 3 | 액티브 스킬 3종 | "필살기는?" |
| 4 | 소울 스킬 (시그니처) | "다음은?" |
| 5 | 다음 편 예고 | 시리즈 참여 유도 |

스와이프율이 높은 인스타 캐러셀 구조 (1장에서 멈추지 않게).

---

## 2. 디자인 시스템 — 핵심 토큰

### 2.1. 색상 (`make_cards.py` 상단)

| 토큰 | 값 | 용도 |
|---|---|---|
| `BG` | `(10, 10, 14)` | 가장 어두운 배경 |
| `TEXT_WHITE` | `(235, 230, 220)` | 본문 흰색 (살짝 따뜻한) |
| `TEXT_DIM` | `(160, 156, 148)` | 보조 텍스트, 라벨 |
| `GOLD` | `(232, 176, 74)` | 강조·라벨·서브 타이틀 |
| `SOUL_GLOW` | `(255, 223, 130)` | 소울 스킬 황금 광채 |
| `WANDERER` | `(196, 69, 61)` | 방랑검사 직업색 (붉은 검) |
| `SAGE_PURPLE` | `(140, 110, 180)` | 술법사 직업색 (정념·환각) |
| `INSIGHT_BLUE` | `(123, 163, 196)` | 심안·방어 보조색 |

다음 4직업 색상은 `make_cards.py`에 추가:
| 직업 | 추천 컬러 (확정 전) |
|---|---|
| `demonblood` 혼혈 마족 | 핏빛 진홍 `(168, 38, 50)` 또는 어두운 보라 |
| `elf` 숲의 정령사 | 숲 녹색 `(108, 158, 92)` 또는 청록 |
| `priest` 여명의 사제 | 여명 황금 `(240, 198, 122)` 또는 흰빛 |

### 2.2. 폰트 — Pretendard 패밀리

| 굵기 | 용도 |
|---|---|
| `Pretendard-Black.otf` | 직업명, 큰 한국어 헤드라인 |
| `Pretendard-Bold.otf` | 영문 부제, 강조 |
| `Pretendard-Medium.otf` | 라벨, 박스 헤더 |
| `Pretendard-Regular.otf` | 본문, 설명 |

⚠️ **한자 미지원** — 1차 시안에서 `無` `貫` `盾` 한자가 박스(豆腐) 글리프로 깨졌음. 한자 대신:
- 액티브 스킬: `01·02·03` 숫자 마크
- 소울 스킬: 황금 4방 광선 + 다이아몬드 별 도형

다른 직업 카드도 한자 사용 금지 (Noto Sans CJK 추가하면 가능하지만 폰트 의존성 증가).

### 2.3. 일러스트 활용

| 카드 | 원본 일러 | 처리 |
|---|---|---|
| 1 표지 | `public/classes/<id>.jpg` | dim 35%, blur 없음 |
| 2 패시브 | `public/classes/combat/<id>_combat.jpg` | dim 70%, blur 4 (가독성 우선) |
| 3 액티브 | `public/classes/combat/<id>_combat.jpg` | dim 78%, blur 8 (텍스트 박스 우선) |
| 4 소울 | `public/classes/<id>win.jpg` | dim 55%, blur 2 (승리 컷 임팩트) |
| 5 다음 편 | 다음 직업 `public/classes/<id>.jpg` | dim 50%, blur 2 (살짝 가리기) |

상단·하단에 어두운 띠를 합성해 텍스트 가독성 확보 (`band` overlay).

### 2.4. 공통 푸터

- 좌하단: `@dawn_and_twilight` (인스타 핸들)
- 우하단: `<직업명> N/5` (시리즈 진행도)
- 폰트: `Pretendard-Regular 22pt`, 색 `TEXT_DIM`

---

## 3. 재현·확장 — `make_cards.py`

방랑검사 5장은 `make_cards.py` 1개 스크립트로 통째로 생성. 다음 직업 추가 시 같은 패턴 복사 + 색상 토큰만 갈아끼우면 됨.

### 3.1. 의존성

```bash
pip install --quiet Pillow
# Pretendard 폰트 4종이 /tmp/cards/fonts/에 있어야 함
# 다운로드: https://github.com/orioncactus/pretendard/releases
```

### 3.2. 실행

```bash
cd /home/user/derod-roguelike
python3 docs/marketing/cards/make_cards.py
# 결과물: /tmp/cards/wanderer/01_cover.jpg ~ 05_next.jpg
```

### 3.3. 다음 직업 추가 가이드

1. `OUT_DIR`을 직업명으로 변경 (예: `/tmp/cards/sage`)
2. 직업 색상 토큰 추가 (예: `SAGE_PURPLE`)
3. 카드 2 (패시브) — 시작 패시브 2종을 해당 직업으로 교체
   - 술법사: 이프리트 Lv.3 / 마력 Lv.2
   - 정령사: 정밀 Lv.3 / 바람 Lv.2 (실제 데이터 확인 필요)
4. 카드 3 (액티브) — 액티브 스킬 3종 교체
5. 카드 4 (소울) — 소울 스킬 이름·인용구·SOUL 100 효과 교체
   - 술법사: 영겁의 화염 / 인용구 / 효과
6. 카드 5 (다음 편) — 다음 직업 일러·이름·서브타이틀 교체

`data.js`의 `CLASS_ULTIMATES` / `PASSIVES` / `ACTIVE_SKILLS`에서 실제 데이터 가져와 카드 내용 정확히 맞춤.

---

## 4. 발행 워크플로

```
[1] 카드 5장 PM 채팅으로 확인 → OK
[2] docs/marketing/cards/<NN>-<id>/ 폴더에 5장 JPG 보관
[3] make_cards.py에 해당 직업 함수 추가 (재현성)
[4] commit + push + PR (코드 변경 없음, docs only)
[5] PM이 인스타에 5장 캐러셀 업로드
    - 캡션: docs/marketing/instagram-profile.md "직업 소개 캐러셀" 섹션 템플릿 사용
    - 해시태그: PM 결정 — #던앤트와일라잇 #한국어로그라이크 #모바일PWA 등
[6] 인스타 인사이트 (도달·저장·공유) 24~48시간 후 PM이 채팅으로 공유
[7] 다음 직업 카드 제작
```

---

## 5. 진행 상태 (1.53.0 시점)

| # | 직업 | 폴더 | 일러 의존 | 상태 |
|---|---|---|---|---|
| 1 | 방랑검사 (wanderer) | `01-wanderer/` | wanderer.jpg / combat / win | ✅ 완료 |
| 2 | 술법사 (sage) | `02-sage/` | sage.jpg / combat / win | ⏳ 대기 |
| 3 | 혼혈 마족 (demonblood) | `03-demonblood/` | demonblood.jpg / combat / win | ⏳ 대기 (win 일러 최근 업로드 확인) |
| 4 | 숲의 정령사 (elf) | `04-elf/` | elf.jpg / combat / win | ⏳ 대기 |
| 5 | 여명의 사제 (priest) | `05-priest/` | priest.jpg / combat / win | ⏳ 대기 |

각 직업당 5장 × 5직업 = 총 **25장** 캐러셀 목표.

---

## 6. 라이선스·주의

- 폰트 (Pretendard)는 SIL Open Font License. 결과물에 임베드되므로 상업 사용 OK
- 원본 일러는 `public/classes/`의 ChatGPT(DALL-E 3) 생성물. 게임 내 사용 라이선스 그대로 인스타에 사용 가능
- 한자·이모지 사용 금지 (폰트 미지원)
