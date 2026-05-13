# 적 일러스트 생성 프롬프트

본 문서는 **Gemini 등 이미지 생성 AI**에 직접 입력해 적 일러스트를 만들기 위한 프롬프트 모음이다.

직업 일러스트(`public/classes/*.jpg`)와 **동일한 그림체·텍스처·색조**가 유지되도록 공통 헤더를 두고, 각 적의 외형·배경만 차이로 둔다.

---

## 1. 그림체 스펙 (직업 일러스트 분석 결과)

| 요소 | 특징 |
|---|---|
| 화풍 | CG 디지털 페인팅 / 세미 리얼리즘 + 애니메 얼굴 (한일 판타지 MMO 일러 계열) |
| 라이팅 | 시네마틱 라이팅, 림 라이트 + 황혼/역광 |
| 텍스처 | 자수·체인메일·보석·반짝이는 마법 입자 |
| 색조 | 보라·금·검정 + 진홍 (다크 판타지 톤) |
| 디테일 | 의상 정교·머리카락 윤기·깊은 심도 (bokeh) |
| 얼굴 | 아니메 영향 받은 또렷한 눈·입술, 사실적 그림자 |

## 2. 사이즈 규약

| 용도 | 비율 | 권장 픽셀 | 비고 |
|---|---|---|---|
| 전투 일러스트 (모든 적) | 4:3 가로 | **1600×1200** | 적이 중앙~좌측, 챕터 배경 |
| 보스 진입 풀컷 | 9:16 세로 | **1080×1920** | 풀바디 + 시네마틱 배경 |

> 모바일 PWA는 다운스케일되므로 1600×1200이면 4x retina에서도 깨끗.

## 3. 파일 명명 규칙

전투 일러스트 (가로):
```
public/enemies/<enemyKey>_combat.jpg
```

보스 진입 풀컷 (세로):
```
public/enemies/<enemyKey>_intro.jpg
```

예시:
- `public/enemies/goblin_combat.jpg`
- `public/enemies/wraith_combat.jpg`
- `public/enemies/wraith_intro.jpg`

(`enemyKey`는 `src/data.js`의 `ENEMIES` 객체 키와 동일)

---

## 4. 공통 프롬프트 헤더 (영문)

**모든 적 프롬프트의 맨 앞**에 붙여서 사용. 그림체·텍스처 통일을 보장한다.

```
Dark fantasy digital painting illustration, Korean MMO art style,
semi-realistic with anime-influenced facial structure, cinematic lighting
with strong rim light and twilight atmosphere, painterly textures,
intricate detail on armor/clothing including chainmail, embroidery,
gemstones and sparkling magical particles, rich color palette of deep
purple, gold, crimson and obsidian black, high contrast with dramatic
depth of field, 85mm cinematic composition, soft bokeh background,
masterpiece quality, ultra detailed, sharp focus on subject.
```

## 5. 챕터별 배경 키워드

| 챕터 | 배경 키워드 (영문) |
|---|---|
| 1 북부 극지대 | `frozen tundra, icy cliffs, blizzard wind, aurora sky, cracked permafrost, broken expedition camp ruins` |
| 2 죽은 자의 숲 | `twilight forest, rotting ancient trees, purple mist, glowing fungi, fallen elven ruins, mossy stone fragments` |
| 3 봉인된 신전 | `crumbling temple interior, broken stone pillars, glowing runic seals on floor, suspended time particles, dawn light filtering through cracks` |
| 4 마계의 균열 | `infernal rift, fractured dimension, crimson void, floating obsidian shards, hell-fire embers, demonic architecture in distance` |

---

## 6. 챕터 1 — 북부 극지대 (7개 프롬프트)

> 사용법: 각 코드 블록을 **공통 헤더 + 본문**을 한 번에 복사해 Gemini에 입력.
> 권장 aspect ratio 옵션을 같이 지정할 수 있다면 4:3 (또는 9:16) 명시.

### 6.1 북부 고블린 (일반 · 전투 일러스트 1600×1200)

`enemyKey: goblin`

```
Dark fantasy digital painting illustration, Korean MMO art style,
semi-realistic with anime-influenced facial structure, cinematic lighting
with strong rim light and twilight atmosphere, painterly textures,
intricate detail on armor/clothing including chainmail, embroidery,
gemstones and sparkling magical particles, rich color palette of deep
purple, gold, crimson and obsidian black, high contrast with dramatic
depth of field, 85mm cinematic composition, soft bokeh background,
masterpiece quality, ultra detailed, sharp focus on subject.

Subject: a feral northern goblin warrior, gaunt frostbitten greenish-gray
skin with frost burns, hunched aggressive posture, tattered fur cloak
crusted with ice and snow, wielding a crude jagged ice-bone dagger
dripping with frost, sharp yellow eyes glowing under matted black hair,
crooked yellow teeth bared in a snarl, leather wraps on forearms with
bone trinkets. Background: frozen tundra at dusk, icy cliffs and blizzard
wind, aurora sky in violet-green ribbons above, cracked permafrost
ground, scattered broken expedition crates half-buried in snow, faint
campfire embers in mid-distance. Composition: midshot, subject slightly
left of center, 4:3 landscape orientation, the goblin crouched in attack
readiness, depth of field blurring background gently.
```

### 6.2 얼음 늑대 (일반 · 전투 일러스트 1600×1200)

`enemyKey: iceWolf`

```
Dark fantasy digital painting illustration, Korean MMO art style,
semi-realistic with anime-influenced facial structure, cinematic lighting
with strong rim light and twilight atmosphere, painterly textures,
intricate detail on armor/clothing including chainmail, embroidery,
gemstones and sparkling magical particles, rich color palette of deep
purple, gold, crimson and obsidian black, high contrast with dramatic
depth of field, 85mm cinematic composition, soft bokeh background,
masterpiece quality, ultra detailed, sharp focus on subject.

Subject: a massive polar ice wolf predator, frost-white fur with pale
glacial blue underlayer, glowing cyan eyes, breath of crystallized mist
exhaled in cold air, fangs of pure transparent ice protruding from
snarling jaws, frost crystals on shoulders and back catching light, paws
sinking slightly into snow. Background: frozen tundra under aurora sky
pulsing violet and green, blizzard wind streaks of snow flying past
horizontally, broken expedition camp ruins half-visible in distance,
cracked permafrost ground. Composition: midshot 4:3 landscape, wolf in
mid-stride lunging slightly toward camera, body angled three-quarters
left, soft bokeh on background.
```

### 6.3 동상 거인 (일반 · 전투 일러스트 1600×1200)

`enemyKey: frostGiant`

```
Dark fantasy digital painting illustration, Korean MMO art style,
semi-realistic with anime-influenced facial structure, cinematic lighting
with strong rim light and twilight atmosphere, painterly textures,
intricate detail on armor/clothing including chainmail, embroidery,
gemstones and sparkling magical particles, rich color palette of deep
purple, gold, crimson and obsidian black, high contrast with dramatic
depth of field, 85mm cinematic composition, soft bokeh background,
masterpiece quality, ultra detailed, sharp focus on subject.

Subject: a hulking frost giant of the frozen tundra, towering humanoid
figure with pale blue frostbitten skin, frozen shards embedded in
shoulders and back like natural armor, ragged mammoth-hide loincloth and
wraps, massive ice-encrusted club resting on shoulder, exhaling a chilling
mist, hollow icy eyes with no pupils, beard of frozen icicles. Background:
frozen tundra at dusk, icy cliffs forming a canyon walls, blizzard wind
swirling around giant's feet, aurora sky above with violet-green ribbons,
cracked permafrost ground, mammoth bones in mid-distance. Composition:
midshot from a low angle to emphasize scale, 4:3 landscape, giant
slightly off-center to the right.
```

### 6.4 마족 첩자 (엘리트 · 전투 일러스트 1600×1200)

`enemyKey: cultist`

```
Dark fantasy digital painting illustration, Korean MMO art style,
semi-realistic with anime-influenced facial structure, cinematic lighting
with strong rim light and twilight atmosphere, painterly textures,
intricate detail on armor/clothing including chainmail, embroidery,
gemstones and sparkling magical particles, rich color palette of deep
purple, gold, crimson and obsidian black, high contrast with dramatic
depth of field, 85mm cinematic composition, soft bokeh background,
masterpiece quality, ultra detailed, sharp focus on subject.

Subject: a demon-blood Naxellion cultist spy, slim figure in a hooded
crimson and obsidian-black robe with intricate gold-thread Naxellion
sigils embroidered along the hem and sleeves, pale gaunt face partially
shadowed by hood with glowing crimson eyes visible, holding a curved
obsidian sacrificial dagger dripping black ichor, demonic tattooed sigils
glowing faintly along exposed forearm, ritualistic silver chains around
waist. Background: frozen tundra with cracked permafrost ground and
aurora sky above, faint floating crimson demonic glyphs hovering nearby
in the air, ritual blood drawn in a circle on the snow, broken
expedition crates half-buried. Composition: midshot 4:3 landscape,
subject slightly off-center left, three-quarter ritualistic pose with
dagger raised.
```

### 6.5 한기의 마녀 (엘리트 · 전투 일러스트 1600×1200)

`enemyKey: iceMage`

```
Dark fantasy digital painting illustration, Korean MMO art style,
semi-realistic with anime-influenced facial structure, cinematic lighting
with strong rim light and twilight atmosphere, painterly textures,
intricate detail on armor/clothing including chainmail, embroidery,
gemstones and sparkling magical particles, rich color palette of deep
purple, gold, crimson and obsidian black, high contrast with dramatic
depth of field, 85mm cinematic composition, soft bokeh background,
masterpiece quality, ultra detailed, sharp focus on subject.

Subject: a frost witch sorceress, beautiful pale woman with long
silver-blue hair flowing in cold wind, dressed in deep midnight-blue
mage robes with pale cyan crystalline embroidery and silver chainmail
underlayer, intricate frost-rune jewelry, holding a tall icy staff topped
with a floating spinning glacial crystal that emits cyan light, summoning
a glowing ice spear hovering beside her, her glowing pale-cyan eyes
focused with cold malice, frost particles drifting around her body.
Background: frozen tundra at deep twilight, icy cliffs with blizzard
wind and aurora sky in violet-green, cracked permafrost ground reflecting
the cyan magical light, broken expedition camp ruins in mid-distance.
Composition: midshot 4:3 landscape, sorceress slightly off-center to the
left in a casting pose, soft bokeh.
```

### 6.6 극지의 망령 (보스 · 전투 일러스트 1600×1200)

`enemyKey: wraith`

```
Dark fantasy digital painting illustration, Korean MMO art style,
semi-realistic with anime-influenced facial structure, cinematic lighting
with strong rim light and twilight atmosphere, painterly textures,
intricate detail on armor/clothing including chainmail, embroidery,
gemstones and sparkling magical particles, rich color palette of deep
purple, gold, crimson and obsidian black, high contrast with dramatic
depth of field, 85mm cinematic composition, soft bokeh background,
masterpiece quality, ultra detailed, sharp focus on subject.

Subject: a polar wraith boss, translucent ghostly figure of a long-dead
expedition leader hovering above the frozen ground, ragged frost-armor
fragments and broken sword orbiting around the spectral form, blue-white
ethereal flames rising from shoulders and back, hollow glowing pale-blue
sockets where eyes should be, twisted icy chains trailing behind in the
air, jaw locked open in a silent eternal scream, fragments of the
expedition's cloak still recognizable but corrupted with frost. Background:
frozen tundra graveyard at deep night, vast aurora sky pulsing violet and
green above, frozen corpses of past adventurers half-buried in the ice
ground, blizzard wind sweeping past horizontally, faint expedition
campfire long extinguished in mid-distance. Composition: midshot 4:3
landscape, the wraith dominating center-right of frame in a threatening
forward-leaning pose, oppressive cinematic scale, soft bokeh.
```

### 6.7 극지의 망령 — 보스 진입 풀컷 (1080×1920, 9:16)

`enemyKey: wraith` (별도 파일 `wraith_intro.jpg`)

```
Dark fantasy digital painting illustration, Korean MMO art style,
semi-realistic with anime-influenced facial structure, cinematic lighting
with strong rim light and twilight atmosphere, painterly textures,
intricate detail on armor/clothing including chainmail, embroidery,
gemstones and sparkling magical particles, rich color palette of deep
purple, gold, crimson and obsidian black, high contrast with dramatic
depth of field, 85mm cinematic composition, soft bokeh background,
masterpiece quality, ultra detailed, sharp focus on subject.

Subject: a polar wraith boss in full body shot, translucent ghostly
figure of a long-dead expedition leader hovering above the frozen ground,
ragged frost-armor fragments and a broken sword orbiting around the
spectral form, blue-white ethereal flames rising from shoulders and back,
hollow glowing pale-blue sockets where eyes should be, twisted icy chains
trailing behind in the air, jaw locked open in a silent eternal scream,
fragments of the expedition's cloak still recognizable but corrupted with
frost, arms outstretched wide in an intimidating boss-reveal pose,
spectral lower body trailing off into mist. Background: frozen tundra
graveyard at deep night, vast aurora sky filling the upper half of the
frame with pulsing violet and green ribbons, frozen corpses of past
expedition members half-buried in the ice ground, blizzard wind streaking
through the scene, faint extinguished campfire in the foreground snow,
oppressive cinematic scale showing vast desolate emptiness. Composition:
full body shot 9:16 portrait orientation, subject centered vertically,
environment giving sense of vast desolate scale, dramatic cinematic boss
reveal framing, low camera angle looking up slightly.
```

---

## 7. 검수 체크리스트 (이미지 받은 후)

각 일러스트 받은 후 아래를 확인:

- [ ] **그림체 통일성** — 직업 일러스트와 한 화풍으로 보이는가? (CG 페인팅, 림 라이트, 색조)
- [ ] **사이즈/비율** — 전투 4:3, 진입 9:16 정확한가?
- [ ] **주제 배치** — 적이 너무 가장자리에 가지 않았는가? (`object-cover`로 잘릴 수 있음)
- [ ] **배경 챕터 매칭** — 챕터 1이면 한기·오로라가 보이는가?
- [ ] **얼굴/표정** — 너무 평범하거나 컨셉과 어긋나지 않는가?
- [ ] **컬러 톤** — 보라/금/검정/진홍 다크 판타지 톤 유지되는가?

---

## 8. 다음 작업 (TODO)

- [ ] 챕터 2 (죽은 자의 숲) 6종 + 보스 진입 풀컷 1종
- [ ] 챕터 3 (봉인된 신전) 5종 + 보스 진입 풀컷 1종
- [ ] 챕터 4 (마계의 균열) 5종 + 보스 진입 풀컷 1종
- [ ] 챔피언십 전용 적 (40+ 종) — 별도 문서
- [ ] 적 일러스트가 모이면 `CombatScreen.jsx`에서 placeholder를 `<img>`로 교체 + `ENEMIES`에 `combatImage`/`introImage` 필드 추가
- [ ] 보스 진입 시 진입 일러스트 풀컷 페이즈 추가 (NodeInfoModal 또는 별도 스크린)
