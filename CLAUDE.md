# CLAUDE.md

이 파일은 Claude(또는 다른 AI 협업자)가 이 저장소에서 작업할 때 따라야 할 컨벤션·워크플로·현재 상태를 정리한 문서다. 새 세션을 시작할 때 먼저 이 파일을 읽고 시작하라.

---

## ⚠️ 0. PM 업무 스타일 — 절대 룰 (모든 응답·결정·산출물에 무조건 적용)

PM이 명시적으로 강조: **"내가 원하는 업무 스타일 절대적으로 지킬 것"**. 아래 룰을 어기는 응답은 다시 작성한다.

### 0.1. 응답 언어·구조 (모든 텍스트 응답에)
- **한국어 답변** 기본. 영어 기술용어(commit/branch/PR 등 필수어)는 OK
- **단락 구분 명확** — `---` 구분선, 빈 줄, `##` 헤더 적극 사용. 산문체 X
- **표(table) 적극 사용** — 비교·대조·진단·결과 요약은 무조건 표로
- **굵게 표시한 핵심 결정 사항** — 페이지에서 가장 중요한 단어는 `**…**`
- **숫자로 결과 명시** — HP/턴/배율/MB/% 등 정량 데이터를 산문에 묻지 말고 표나 굵게

### 0.2. 결정 묻기 (필수 흐름)
PM은 비개발자. 결정이 필요할 때:

1. **진단 먼저 보여주기** — "무엇이 문제인가" 표로 시각화
2. **옵션 제시** — 2~4개, 각각 트레이드오프 명시
3. **추천 옵션을 첫 번째에 두고 "(추천)" 표기**
4. `AskUserQuestion` 도구로 결정 묻기
5. **"어떻게 진행할까요?"** 식 닫기 — 결정 없이 "더 알아보겠습니다"로 끝내지 X

### 0.3. PR·작업 사이클 (필수 흐름)
- 작업 사이클: **편집 → `npm run build` 통과 확인 → git commit → git push → PR 생성**
- **PR 본문 한국어**, 다음 구조 필수:
  1. `## Summary` — 1~2문단으로 변경의 목적과 효과
  2. `## 변경 내역 / 변경 파일` — 표 또는 불릿
  3. `## 영향 범위` — 기존 게임플레이 영향 + 빌드 + 마이그레이션
  4. `## Test plan` — 체크리스트
  5. `## PM님이 결정/확인할 것` — 명시적 액션 항목
  6. 마지막에 **다음 PR 예고**
- **PR URL을 응답 가장 눈에 띄게** — URL 한 줄 → 제목 한 줄 → 표·요약

### 0.4. PM 응답 템플릿
```
[짧은 인삿말이나 상황 요약 한 줄]

## 무엇을 했나
- 핵심 항목들 (표 또는 불릿)

## 변경 사항
[표]

## 영향 범위
[기존 동작 변화 여부 — PM이 가장 신경 쓰는 부분]

## PM님이 결정/확인할 것
- 명시적 액션 항목 (체크리스트)
```

### 0.5. 절대 금지
- ❌ 영어 기술용어 벽 (PR/commit 같은 필수어 외)
- ❌ 두루뭉술한 추상적 설명 ("개선됩니다", "최적화됩니다" 등)
- ❌ 결정 없이 "더 알아보겠습니다" / "검토하겠습니다"로 끝맺기
- ❌ 한 단락이 4줄 이상 길게 늘어지는 산문체
- ❌ 표·헤더·구분선 없이 줄글로 변경 사항 나열
- ❌ 빌드 실패 상태로 커밋 (4.3절 강제)
- ❌ 절대 경로 (`/enemies/...`) 사용 — 반드시 `./` 상대 경로 (4.5절 강제)
- ❌ PNG 그대로 커밋 — JPG quality 90 변환 필수 (5.6절 강제)
- ❌ 사용자에게 영향 있는 PR에서 버전·changelog 갱신 누락 (4.1절 강제)

### 0.6. PM 스타일 학습 패턴 (1.21.0~1.62.1 누적)
- PM이 **"~ 보완이 필요해" / "~ 너무 똑같아" 식 추상 피드백**을 줄 때:
  1. **진단 표 먼저** (무엇이 어떻게 겹치는지 4축 분리로 시각화)
  2. **재설계 방향 표** (변경 전 / 변경 후 / 차별화 키워드)
  3. **차별화 검증 표** (n×n 매트릭스로 모든 축이 다른지 검증)
  4. `AskUserQuestion`으로 재설계 범위 결정 묻기
- 작업이 큰 청크(5컨셉 × 20장 등)면 **컨셉별 PR 분리**가 PM 선호 스타일
- 이미지 작업은 **변환 + 코드 연결을 한 PR**에 묶기 (PM 결정: PNG 변환 누락 발견 시 같이 처리)
- **PM "다시확인해봐 구현된걸 제안하는거같은데" 패턴** (1.62.1 학습):
  - 옵션 제시 후 PM이 outdated를 느끼면 즉시 **직접 코드 grep + 진단 표**로 정정
  - CLAUDE.md "다음 작업" 항목을 단독으로 신뢰하지 말고 **옵션 제시 전 반드시 코드 검증**
  - 매 PR마다 CLAUDE.md "다음 작업" 섹션도 같이 갱신 (outdated 재발 방지)

---

## 1. 프로젝트 개요

- **이름**: derod-roguelike (게임 내 표시: "Dawn and Twilight" / "던앤트와일라잇")
- **장르**: 한국어 텍스트 기반 다크 판타지 모바일 PWA 로그라이크
- **현재 게임 버전**: `src/data/version.js`의 `GAME_VERSION` 참조 (이 문서 갱신 시점 **1.52.0** — 각성도 보상 적용 버그 수정 완료. PR #101 머지. 1.44.0 이후 각성도 Lv.3·4·6·7·9·10 보상 30개가 데이터·UI는 정의돼 있지만 실제 게임 적용 코드가 없던 큰 버그를 `aggregateAwakeningRewards` + `getCombinedClassFx` 신설로 해결)
- **배포**: GitHub Pages (`main` 브랜치 머지 시 `.github/workflows/deploy.yml`이 자동 빌드·배포)
- **호스팅 경로**: `https://<owner>.github.io/derod-roguelike/` — `vite.config.js`의 `base: '/derod-roguelike/'`. ⚠️ 에셋 경로는 항상 **상대 경로(`./`)** 사용 (4.5절 참조)

## 2. 기술 스택

- React 18 + Vite 5 + Tailwind CSS
- lucide-react (아이콘)
- Firebase (Auth + Firestore) — 게스트/Google 로그인, 클라우드 메타 sync
- IndexedDB (`src/storage.js`) — 로컬 메타 영속화
- `vite-plugin-pwa` — 풀스크린/오프라인/홈 화면 설치

## 3. 파일 맵 (꼭 알아둬야 할 곳)

```
src/
├── App.jsx                       # 메인 게임 루프 (1900+ 줄). 1.27.0~ 각인 fx prop 전달
├── data.js                       # 모든 게임 콘텐츠 + GAME_VERSION (4300+ 줄). 1.25.0~ ENGRAVINGS/ENGRAVING_TIERS/ENGRAVING_AWAKENING_TABLE / 1.38.0~ CLASS_ULTIMATES 주석에 "소울 스킬·소울 게이지" 용어 통일
├── storage.js                    # IndexedDB 메타. 1.25.0~ engravings / 1.26.0~ ultimatesPickedByClass·championshipClearsByClass
├── main.jsx / index.css          # 진입점 + 전역 스타일 + FX 키프레임
├── combat/damage.js              # 데미지·치명·회피 계산. 1.27.0~ engravingFx 인자
├── data/changelog.js             # 버전별 changelog (인게임 모달용)
├── utils/
│   ├── helpers.js                # PALETTE, 패시브/유물/저주 헬퍼, getEnemyImageSrc, aggregateEngravingEffects(1.27.0~), isAwakeningConditionMet(1.26.0~), 4스탯 시그니처 헬퍼 9종(1.37.0~)
│   ├── mapGen.js                 # linearSequence / branchSequence / 일반 가중치
│   ├── rewards.js                # 보상 풀·롤
│   └── dailyChallenge.js         # 일일 챌린지 시드/빌더
├── cloud/                        # Firebase auth + sync
└── components/                   # 28+ 화면 컴포넌트
    ├── CombatScreen.jsx          # 전투 (2000+ 줄, 가장 큼). 1.27.0~ engravingFx prop / 1.38.0~ "소울 스킬·소울 게이지" 용어 통일
    ├── BossIntroScreen.jsx       # ★ 보스 진입 시네마틱 컷신 (1.14.0 신설)
    ├── CodexScreen.jsx           # 5탭 도감 (적/사건/유물/패시브/레시피)
    ├── CardInfoModal.jsx         # 공용 정보 모달. buildPassive/Relic/ActiveSkillInfo + buildClassUltimateInfo(1.39.0~) + buildBreakdownInfo(1.40.0~)
    ├── CombatEffects.jsx         # FX 컴포넌트 (FloatingLabel/DamageVignette/WhiteFlash/UltimateCutin)
    ├── NodeInfoModal.jsx         # 노드 진입 안내 (튜토리얼). 보스 컷신은 별도 컴포넌트
    ├── ExpeditionSelect.jsx      # 3탭 (클래식 / 챌린지 / 챔피언십)
    ├── PrepScreen.jsx            # 전투 준비 (패시브·유물·액티브 스킬)
    ├── RestScreen.jsx            # 보스 직전 정비
    ├── StatusPanel.jsx           # 캐릭터 정보창. 1.39.0~ 액티브/소울 스킬 4번째 슬롯 / 1.40.0~ 시그니처 합산 + 출처 모달 / 1.41.0~ 전 라인 클릭 모달(35개) + 액티브/소울 별도 섹션 분리 + 회복 합산 + 계산식 명확화
    ├── StatSignatureModal.jsx    # ★ 능력치(근/민/지/매) 시그니처 설명 모달 (1.37.0~). 1.41.0~ formula(stats) 함수로 "적용 포인트 N(=스탯-10) × +단위/p" 형식 통일
    ├── MapView.jsx               # 챕터 맵
    ├── TitleScreen.jsx           # 메인 (이어하기 버튼 포함)
    ├── EngravingScreen.jsx       # ★ 직업 각인 시스템 (1.25.0~). 각성도 10단계 + 슬롯 3칸 + 가챠. EngravingMigrationModal + AwakeningConditionNoticeModal(1.26.0~) export
    └── …

public/
├── classes/                      # 직업 일러스트
│   ├── <classId>.jpg, <classId>start.jpg, <classId>win.jpg, <classId>loss.jpg
│   └── combat/<classId>_combat.jpg
└── enemies/                      # ★ 적 일러스트 (1.13.0~ 도입)
    ├── classic/chapter_<n>/<enemyKey>_combat.jpg
    ├── classic/chapter_<n>/<enemyKey>_intro.jpg     # 보스 진입 풀컷 (9:16)
    ├── championship/<concept>/<enemyKey>_combat.jpg  # ★ 1.21.0~ frost 완료
    └── championship/<concept>/<enemyKey>_intro.jpg   # ★ 1.21.0~ frost 4보스 컷신

docs/
├── enemy-illustration-prompts.md                            # ★ 메인 프롬프트 인덱스 + 클래식 챕터 4
└── enemy-illustration-prompts-championship-frost.md         # ★ 1.21.0 frost 컨셉 20장 (forest·sanctum·rift·dawn 예정)
```

### 코드 헬퍼 (1.21.0 신설)

`src/utils/helpers.js` — `getEnemyImageSrc(enemyKey, enemy, kind)` 함수가 `enemy.chapter` 값 타입으로 자동 분기:
- `number` (1, 2, 3, 4) → `./enemies/classic/chapter_<n>/...`
- `string` ('frost_1', 'forest_2', …) → `./enemies/championship/<concept>/...` (concept = split('_')[0])

`CombatScreen.jsx`·`BossIntroScreen.jsx` 둘 다 이 헬퍼 사용. **forest·sanctum·rift·dawn 추가 시 코드 수정 0줄** — 데이터에 `chapter: '<concept>_<stage>'`만 넣으면 자동 동작.

## 4. ⚠️ 매번 지켜야 할 핵심 룰

### 4.1. 버전 + Changelog 룰 — 절대 잊지 말 것

**사용자에게 영향이 있는 모든 PR**은 다음을 반드시 같이 처리한다.

1. `src/data.js`의 `GAME_VERSION` / `VERSION_DATE` / `VERSION_LABEL` 갱신
2. `src/data/changelog.js`의 `CHANGELOG` 배열 맨 앞에 새 항목 prepend
3. SemVer 규칙:
   - **MAJOR** (1.x.x → 2.0.0): 큰 시스템 재설계
   - **MINOR** (x.1.x → x.2.0): 새 기능, 새 모드, 새 콘텐츠
   - **PATCH** (x.x.1 → x.x.2): 버그 수정, 밸런스, UI 개선, 문구 정리

Changelog 항목 타입: `feature` / `balance` / `fix` / `system`

인게임 `ChangelogModal`이 `meta.lastSeenVersion` < `LATEST_VERSION`이면 첫 화면에서 자동으로 신규 항목을 모달로 보여주므로, **changelog 갱신을 빠뜨리면 사용자가 변경사항을 인지하지 못한다.**

내부 정리만 하고 사용자에게 안 보이는 PR(예: placeholder 파일 정리, 주석 추가, docs/ 갱신)은 버전 안 올려도 된다.

### 4.2. PR 워크플로

- **브랜치**: 시스템 메시지에 박힌 브랜치 사용 (세션마다 다를 수 있음. 최근 세션: `claude/review-claude-md-7f1ib`)
- **베이스**: `main`
- 모든 작업 사이클: `편집 → npm run build 확인 → git commit → git push → mcp__github__create_pull_request`
- **머지 후 새 push는 새 PR이 필요**. 같은 브랜치를 재사용해도 새 PR을 만들면 새 변경분만 묶임
- PR이 머지될 때까지 기다리지 않고 다음 작업을 같은 브랜치에 올리면 PR 본문이 이어붙어 누적된다. **PM이 머지 확인할 때까지 다음 작업 시작 X**가 깔끔
- PR이 일찍 머지되면 후속 push가 PR에 안 들어갈 수 있다 — 머지 직후 push 했다면 새 PR 생성 (PR #40 → #41 사례)
- PR이 머지된 후 다음 PR을 만들 때는 **반드시 `git fetch origin main` + `git checkout -B <브랜치> origin/main`**으로 최신 main에서 분기 (PR 누적 방지)

### 4.3. 빌드 검증

커밋 전 항상 `npm run build` 실행 → `✓ built` 출력 확인. 빌드 실패 상태로 커밋 금지.

### 4.4. 작업 단위 추적 (TodoWrite)

3개 이상의 단계가 있는 작업은 `TodoWrite`로 todo 리스트 만들고 진행 상태 갱신. 단순 1단계 작업은 불필요.

### 4.5. 🔥 에셋 경로 — 절대 경로 금지

GitHub Pages는 이 프로젝트를 `/derod-roguelike/` 하위 경로에 호스팅한다. 따라서:

```jsx
// ❌ 절대 경로 — base 무시하고 도메인 루트로 가서 404
src="/enemies/classic/chapter_1/goblin_combat.jpg"
src="/classes/lanthert.jpg"

// ✅ 상대 경로 — base 반영해서 정상 로드
src="./enemies/classic/chapter_1/goblin_combat.jpg"
src="./classes/lanthert.jpg"
```

`vite.config.js`의 `base: process.env.NODE_ENV === 'production' ? '/derod-roguelike/' : '/'` 때문에 **로컬 dev는 절대/상대 둘 다 동작 → 배포 후에만 드러나는 버그**. 1.14.1에서 이 함정에 한 번 빠졌으므로(`/enemies/...`로 작성 → GH Pages 배포 시 적 일러 전부 404), 새 에셋 추가 시 **반드시 `./` 접두사 확인**.

---

## 5. 🎨 이미지 생성 파이프라인 (챗지피티 → 게임 통합)

이 프로젝트의 모든 일러스트는 **OpenAI DALL-E 3** 엔진(챗지피티 내장)으로 생성된다. 직업 일러·적 일러 모두 챗지피티(ChatGPT, DALL-E 3)로 통일 (1.53.0~).

> **1.53.0 도구 변경**: Microsoft Copilot Designer → **ChatGPT**로 전환. PM 결정. 이유: Copilot Designer의 부스트 소진 시 생성 5~10분/장으로 느려지고 멀티턴 보정 제어가 떨어짐. ChatGPT는 안정적인 멀티턴 보정 + 직업 일러와 동일 인터페이스. 기존 frost·forest 일러는 Copilot Designer 사용분이며 화풍 통일은 유지됨.

### 5.1. 도구 선택 — ChatGPT (DALL-E 3) 권장

| 도구 | URL | 비고 |
|---|---|---|
| **ChatGPT (권장)** | `chatgpt.com` | **권장**. DALL-E 3 내장. 멀티턴 보정 우수. ChatGPT Plus 구독 권장 (무료는 일일 한도) |
| Bing Image Creator (대안) | `bing.com/images/create` | 동일 엔진. 일일 부스트 15개. 멀티턴 보정 없음 |
| ~~Microsoft Copilot Designer~~ | ~~`copilot.microsoft.com`~~ | ~~1.21.0~1.51.0 사용. 1.53.0 폐기 (부스트 소진 시 느림·보정 제어 약함)~~ |

**제미나이(Imagen) 사용 금지** — 디폴트 화풍이 TCG·하스스톤 카드 일러 톤으로 강하게 고정되어 텍스트 프롬프트로 깨기 거의 불가능. 직업 일러와 화풍 통일 실패 확인 (3회 시도 후 포기, 1.13.0 직전).

### 5.2. DALL-E 3 사이즈 규약

DALL-E 3는 **1:1 / 16:9 / 9:16** 세 가지 비율만 지원. 프롬프트 안에 비율 명시 필수.

| 용도 | 비율 | 권장 픽셀 | 실제 출력 (라운드다운) |
|---|---|---|---|
| 전투 일러스트 (적·플레이어 공통) | **16:9 가로** | 1792×1024 | 1792×1024 (ChatGPT 정확 출력) |
| 보스 진입 풀컷 | **9:16 세로** | 1024×1792 | 1024×1792 |
| 직업 정면 일러 / 시작·승리·패배 컷 | 1:1 또는 2:3 | 1024×1024 등 | — |

> 4:3 (1600×1200) 등 비표준 비율 요청 금지. 라운드다운돼도 종횡비는 유지되므로 게임 표시에는 무관.

### 5.3. ChatGPT 사용 팁

| 팁 | 효과 |
|---|---|
| **이전 직업 일러스트 1장 첨부** ("이 화풍으로") | 화풍 일치 ↑↑↑ |
| 결과 마음에 안 들면 같은 채팅에서 **"더 부드럽게, 카툰 톤 빼고 다시"** 식 멀티턴 보정 | ChatGPT는 보정 제어가 Copilot보다 정확 |
| 한 번에 1~2장 생성 → 멀티턴 보정으로 다듬기 | DALL-E 3 토큰 절약 |
| ChatGPT Plus 한도 다 쓰면 다음 세션까지 대기 (3시간) | 페이스 조절 — 4~6장/세션 권장 |
| **한국어 자연어**로 입력 | DALL-E 3는 한국어 입력 시 한국 웹소설 표지 톤으로 자연 이동 — 직업 일러와 일치 |
| **시스템 메시지 우회** 필요 시 "다크 판타지 RPG 적 일러" 명시 | DALL-E 3가 폭력·잔혹 묘사 거부 시 컨텍스트 강조 |

### 5.4. 프롬프트 구조 (4단 구성)

`docs/enemy-illustration-prompts.md`에 정착된 4단 구조를 그대로 사용:

```
1) 공통 화풍 헤더 — 다크 판타지, 페인터리, 카툰 톤 금지 (3~4문장)
2) 캐릭터 — 외형·자세·소품 (5~10문장)
3) 배경 — 챕터 환경 또는 중립 다크 판타지 (3~5문장)
4) 구도 — 비율 명시 + 샷 사이즈 + 보케 (2~3문장)
```

챕터별 배경 키워드는 `docs/enemy-illustration-prompts.md` 5절 참조. 직업 일러는 챕터 무관이므로 **중립 다크 판타지 톤**으로 작성 (어느 챕터에서 등장해도 어색하지 않게).

#### 5.4.1. 1.52.0 스타일 갱신 — 새 헤더 + 새 구도 + 단어형 (sanctum~ 적용)

PM 1.52.0 결정: 기존 frost·forest 헤더/구도는 그대로 두되, **sanctum부터 새 스타일** 적용. rift·dawn도 동일.

**새 헤더 (sanctum~)**:
```
레퍼런스 첨부 일러스트의 화풍 그대로 유지. 특히 머리카락, 의상 구현방법 (직물로 짠듯한 디테일), 화풍 절대적으로 유지. 의상 가슴노출금지 (목~가슴라인 일체형 의상으로). 피부표현 극상, 광채표현, 잡티제거. 빛반사 효과를 통한 3D수준의 최상급 퀄리티 구현.
```

추가 키워드:
- "머리카락" → "머리카락, **의상** 구현방법" (의상까지 직물 디테일 강조)
- "**피부표현 극상, 광채표현, 잡티제거**" 추가
- "**빛반사 효과를 통한 3D수준의 최상급 퀄리티 구현**" 추가

**새 구도 (sanctum~)**:
```
구도: 약 5° 로우 앵글. 가로 16:9 비율 (1792×1024 픽셀), 머리~골반까지 클로즈업. 박진감 느껴지는 전투모션과 이펙트 필요. 원본과는 완전 다른 얼굴, 다른 모션으로. 캐릭터 주변 아우라 [이펙트 키워드 나열].
```

핵심 변화:
- "미들샷, 캐릭터 약간 좌측 중앙, ~ 자세" → "**약 5° 로우 앵글, 머리~골반 클로즈업**"
- "**박진감 + 원본과 다른 얼굴·모션** + 캐릭터 주변 아우라" 강조

**스타일 변화** — 서술형(문장) → **단어형(키워드 나열)**:

| 변경 전 (서술형) | 변경 후 (단어형) |
|---|---|
| "황혼의 시든 외곽숲에 시들어 가는 부패한 영혼이 깃든 인간 시체, 시든 자. 인간 비례의 야윈 신체..." | "캐릭터: 신전 봉인사. 작은 석조 인형 골렘, 사제 양식, 봉인된 영혼 약한 룬 광채, 봉인 두건..." |

이유: 정확한 의사 전달 — DALL-E 3는 키워드 인식이 산문보다 정확.

기존 frost·forest docs는 그대로 (이미 일러 완성). 새로 작성하는 sanctum·rift·dawn은 모두 1.52.0 스타일.

### 5.5. 파일 전달 — 채팅 첨부는 디스크에 안 저장됨 ⚠️

Claude Code 채팅에 PM이 PNG를 첨부하면 **나는 이미지로는 볼 수 있지만 파일 시스템에서 읽지 못한다**. 첨부 파일은 임시 메모리에만 존재.

→ **반드시 PM이 직접 repo 폴더에 넣어야 한다**:

1. PM이 ChatGPT에서 PNG 다운로드 → 로컬 컴퓨터 저장
2. PM이 `public/enemies/classic/chapter_<n>/` 또는 `public/classes/combat/` 등 적절한 폴더에 드래그&드롭
3. PM이 main에 푸시 (또는 작업 브랜치에)
4. 내가 git pull → PNG 인식 후 변환 진행

PNG 파일명은 PM이 정확한 이름(예: `goblin_combat.png`)으로 저장해도 좋고, 아무 이름(`1.png`)으로 저장해도 OK — 내가 이미지를 식별·리네임할 수 있다 (멀티모달).

### 5.6. PNG → JPG 변환 (필수)

ChatGPT는 WebP/PNG로 출력 (다운로드 시 선택 가능, 기본 PNG). PNG는 1장당 2~3 MB로 PWA에 부담. **반드시 JPG quality 90으로 변환** (직업 일러도 모두 .jpg). 절감 효과 약 86%.

```bash
# 필요 시 Pillow 설치 (이미 설치돼 있을 수 있음)
pip install --quiet Pillow

# 변환 스크립트 (한 폴더 안의 모든 .png 변환)
cd public/enemies/classic/chapter_<n>
python3 <<'PY'
from PIL import Image
import os, glob
for png in sorted(glob.glob('*.png')):
    jpg = png.replace('.png', '.jpg')
    img = Image.open(png)
    if img.mode in ('RGBA', 'LA', 'P'):
        bg = Image.new('RGB', img.size, (0, 0, 0))
        bg.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
        img = bg
    elif img.mode != 'RGB':
        img = img.convert('RGB')
    img.save(jpg, 'JPEG', quality=90, optimize=True, progressive=True)
    print(f"{png}: {os.path.getsize(png)/1024:.0f} KB -> {os.path.getsize(jpg)/1024:.0f} KB")
PY

# 원본 PNG 삭제 (repo 용량 절감)
rm *.png
```

### 5.7. 폴더 구조 (1.21.0 시점)

```
public/enemies/
├── classic/                  # 메인 스토리 (튜토리얼 + 수련의 길 공용)
│   ├── chapter_1/            # 북부 극지대 — ✅ 완료 (1.14.0)
│   ├── chapter_2/            # 죽은 자의 숲 — ✅ 완료
│   ├── chapter_3/            # 봉인된 신전 — ✅ 완료 (1.17.0)
│   └── chapter_4/            # 마계의 균열 — ✅ 완료 (1.20.0)
└── championship/             # 챔피언십 전용 적 (5컨셉 × 20장 = 100장 목표)
    ├── frost/                # 서리·동토 — ✅ 완료 (1.21.0, combat 16 + intro 4)
    ├── forest/               # 부패·숲 — 프롬프트·일러 미작업
    ├── sanctum/              # 신전·봉인 — 프롬프트·일러 미작업
    ├── rift/                 # 마계·균열 — 프롬프트·일러 미작업
    └── dawn/                 # 천상·여명 — 프롬프트·일러 미작업

public/classes/
├── <classId>.jpg, <classId>start.jpg, <classId>win.jpg, <classId>loss.jpg
└── combat/<classId>_combat.jpg
```

**진행률**: 클래식 4/4 ✅ + 챔피언십 1/5 (frost) = **메인 일러 100% + 챔피언십 20%**.

### 5.8. 런타임 경로 자동 계산 (코드 패턴, 1.21.0 갱신)

`ENEMIES[key].chapter` 값 타입으로 자동 분기 — **데이터에 `championship`/`concept` 별도 필드 안 만듬** (DRY). 이미 1.21.0에서 모든 frost 적은 `chapter: 'frost_1'` 같은 string 값을 가지고 있고, 클래식은 `chapter: 1` 같은 number.

```js
// src/utils/helpers.js — 공통 헬퍼 (CombatScreen·BossIntroScreen 모두 사용)
export function getEnemyImageSrc(enemyKey, enemy, kind = 'combat') {
  if (!enemy?.chapter) return null;
  if (typeof enemy.chapter === 'string') {
    const concept = enemy.chapter.split('_')[0];
    return `./enemies/championship/${concept}/${enemyKey}_${kind}.jpg`;
  }
  return `./enemies/classic/chapter_${enemy.chapter}/${enemyKey}_${kind}.jpg`;
}

// CombatScreen.jsx (line 1500 부근)
<img src={getEnemyImageSrc(enemyKey, enemy, 'combat')} onError={() => setEnemyImgFailed(true)} />

// BossIntroScreen.jsx (line 22)
const introSrc = getEnemyImageSrc(enemyKey, enemy, 'intro');
```

**onError 시 폴백** — 어두운 배경 + 사선 패턴 + "[ 적 모습 미구현 ]" 텍스트. 챔피언십 forest/sanctum/rift/dawn 적은 일러 추가 전까지 이 폴백. 회귀 없음.

**forest 등 새 챔피언십 컨셉 추가 시 코드 수정 0줄** — `ENEMIES`에 `chapter: 'forest_1'` 등으로 입력하고 `public/enemies/championship/forest/` 폴더에 일러만 넣으면 헬퍼가 자동 라우팅.

### 5.9. 전체 작업 흐름 (체크리스트)

```
[1] 프롬프트 작성 (docs/enemy-illustration-prompts.md 형식)
[2] PM이 ChatGPT에 한국어 프롬프트 입력 + 직업 일러 1장 첨부
[3] PM이 결과 4장 중 마음에 드는 것 선택 (필요 시 멀티턴 보정)
[4] PM이 PNG 다운로드 → 로컬 repo의 적절한 폴더에 저장
[5] PM이 main에 푸시 (또는 작업 브랜치에)
[6] Claude가 git pull → Pillow로 JPG 변환 → 원본 PNG 삭제
[7] 필요 시 코드 연결 (CombatScreen, BossIntroScreen 등)
[8] 빌드 검증 → 커밋 → 푸시 → PR
[9] PR 본문에 변환 전후 용량 표 + 다음 단계 명시
[10] 머지 후 GH Pages 배포 (1~2분) → PM 실기기 확인
```

### 5.10. 알려진 실패 패턴 (재발 방지)

| 실패 | 원인 | 대응 |
|---|---|---|
| 적 일러가 배포 후 안 보임 | `<img src>` 절대 경로 사용 | 4.5절 — 반드시 `./` 접두사 |
| 화풍이 TCG·카툰 톤으로 나옴 | Gemini Imagen 사용 | 5.1절 — ChatGPT(DALL-E 3)로 통일 |
| PNG 그대로 커밋 | JPG 변환 안 함 | 5.6절 — Pillow 변환 필수 |
| 캐릭터 비례 어색·표정 평범 | 한 번 시도로 만족 | 같은 채팅에서 "더 OOO하게" 멀티턴 보정 |
| 채팅 첨부 PNG를 Claude가 읽으려 함 | 첨부는 메모리에만 존재 | 5.5절 — PM이 직접 repo에 넣어야 함 |

---

## 6. 게임 시스템 현황 (1.27.0 기준)

### 6.1. 모드 구조

3탭 구조의 원정 선택:

| 탭 | 내용 |
|---|---|
| 클래식 | 튜토리얼 1~4 + 수련의 길 (5직업) |
| 챌린지 | 일일 챌린지 + 무한모드 |
| 챔피언십 | 5컨셉 × 4난이도 |

### 6.2. 튜토리얼 (선형 진행)

| # | 이름 | 학습 주제 | 구조 |
|---|---|---|---|
| 1 | 여명의 시작 | 노드 타입 7가지 | linearSequence 7노드 |
| 2 | 황혼의 시장 | 상점·대장간 | linearSequence 7노드, forceEventId로 은화/유물 확정 지급 |
| 3 | 갈림길의 시험 | 분기 선택, 천리안 | branchSequence (3열) |
| 4 | 저주의 시련 | 저주 누적 (난이도 곡선) | linearSequence + addCurseId로 단계별 저주 추가 |

튜토리얼 4 클리어가 수련의 길 해금 조건. **이 잠금 체인을 깨면 안 됨.**

### 6.3. 직업 5종 (1.62.0 시점 풀스택 완성)

| ID | 이름 | 시작 패시브 | 직업 전용 패시브 (classOnly) | 직업 소울 스킬 |
|---|---|---|---|---|
| `wanderer` | 방랑검사 | 심안류 Lv.3, 심안 Lv.2 | 심안류 (반격 컨셉) | 무영(無影)의 일격 (1.12.0~) |
| `sage` | 술법사 | 이프리트 Lv.3, 마력 Lv.2 | 이프리트 (화염·겁화) | 영겁(永劫)의 화염 |
| `demonblood` | 혼혈 마족 | 혈광 Lv.3, 강타 Lv.1 | 혈광 (자해·분노·잃은 HP) | 혈마(血魔)의 격노 (1.61.0~) |
| `elf` | 숲의 정령사 | 풍령 Lv.3, 정밀 Lv.2 | 풍령 (회피·치명·정령 화살) | 천공(天空)의 화살비 (1.59.0~) |
| `priest` | 여명의 사제 | 수신 Lv.3, 재생 Lv.2 | 수신 (회복·신성·부활) | 여명(黎明)의 강림 (1.60.0~) |

**1.38.0 명명 정리**:
- **소울 스킬** = 직업 시그니처 액티브(이전: "액티브 궁극") — `classData.ultimateId` + `CLASS_ULTIMATES[ultimateId]`
- **소울 게이지** = 전투 중 0~100 충전(이전: "영혼 게이지") — `player.soulGauge`, 100에서 소울 스킬 발동 가능
- **각성 스킬** = 패시브 7Lv 보상(`ULTIMATE_SKILLS`) — 별개 시스템
- **영혼** = 영구 메타 재화(영혼의 제단·사망 시 70% 보존) — 변경 없음

**1.24.0~** 5직업 모두 클래식 모드에서 처음부터 사용 가능. 챔피언십에서는 해당 직업의 수련의 길 클리어 시 사용 가능 (`isChampionshipClassUnlocked` 기준). 수련의 길 5종은 모두 튜토리얼 4 클리어 시 일괄 해금.

### 6.4. 챕터 4개 (메인 스토리, 1.21.0 시점)

| # | 이름 | 적 일러 상태 |
|---|---|---|
| 1 | 북부 극지대 (얼음) | ✅ 완료 (1.14.0) |
| 2 | 죽은 자의 숲 (황혼) | ✅ 완료 |
| 3 | 봉인된 신전 (봉인·시간) | ✅ 완료 (1.17.0) |
| 4 | 마계의 균열 (마족·마왕) | ✅ 완료 (1.20.0) |

**메인 스토리 일러 100% 완료.**

### 6.5. 챕터 1 적 구성 (1.13.0~1.13.1 정착)

| 적 | 티어 | HP | 일러 |
|---|---|---|---|
| 북부 고블린 | 일반 | 60 | ✅ |
| 얼음 늑대 | 일반 | 90 | ✅ |
| 동토의 약탈자 | 일반 (1.13.1에 강등) | 110 | ✅ |
| 동상 거인 | 강적 (1.13.1에 승격) | 180 | ✅ |
| 극지의 망령 | 강적 | 180 | ✅ |
| 한기의 마녀 | 보스 (1.13.0에 신설) | 320 | ✅ + 진입 컷신 |

### 6.6. 메타 시스템

- **영혼 (souls)**: 영구 재화. 사망 시 70% 보존 (무한모드는 깊이×15 보너스)
- **영혼의 제단**: 영구 메타 강화 (시작 HP+, 보석+, 등). KST 0시/12시 슬롯 갱신, 일일 리롤
- **도감**: 적·사건·유물·패시브·레시피 5탭, 만나면 자동 등록
- **이어하기**: `meta.activeRun`에 스냅샷 저장, 타이틀 화면 [이어하기] 버튼. 복귀 시 항상 맵 화면으로

### 6.7. 모드 시스템

- **일일 챌린지**: KST 날짜 시드로 직업·챕터·저주 2개 고정. 첫 클리어 +100 영혼
- **무한모드 "황혼의 끝"**: 챕터 1→2→3→4→1→… 무한 순환, 깊이×0.15 HP/0.12 dmg 스케일
- **챔피언십**: 5컨셉 × 4난이도 (normal/hard/hell/madness), 직업별 해금

#### 챔피언십 5컨셉 일러 진행 상태 (1.62.1 시점)

| 컨셉 | 일러 상태 | 비고 |
|---|---|---|
| frost (서리·동토) | ✅ 완료 (1.21.0) | combat 16 + intro 4 = 20장. 4보스: 인간 전사 / 빙거인 / 사룡 / 무형 망령왕 |
| forest (부패·숲·광기) | ✅ 완료 | PM 일러 20장 + 헬퍼 chapter 분기 머지. 4보스: 식물 모성 정령 / 부패 망자 검왕 / 광기의 마녀 / 광기의 종말 마에스트로 |
| sanctum (신전·골렘·봉인된 영혼) | 📝 프롬프트 20장 완료 (1.52.0) | PM ChatGPT 생성 대기. **통일 컨셉: 골렘 본체 + 봉인된 영혼 누설**. 4보스: 노년 사제 조각 골렘 / 거대 왕좌 룬 갑주 골렘 / 4팔 봉인자 인형 골렘 / 거대 봉인된 신 골렘 |
| rift (마계·균열·핏빛) | 📝 프롬프트 20장 완료 (1.53.0) | PM ChatGPT 생성 대기. **통일 컨셉: 마족 종족 + 균열 차원 배경 + 핏빛-검은 톤**. 4보스: 마족 검사 / 4족 3머리 마수 / 공중 부유 마족 / 거대 마왕 |
| dawn (천상·여명) | 📝 프롬프트 20장 완료 (1.58.0) + Pillow placeholder 24장 | docs/enemy-illustration-prompts-championship-dawn.md. PM ChatGPT 생성 대기. 4보스: 타락 견습 천사 / 거대 6날개 군주 / 여명의 마녀 / 신적 무수한 날개. placeholder는 PM이 진짜 일러로 덮어쓰면 자동 대체 (코드 변경 0줄) |

**현재**: 일러 완성 2/5 (frost, forest) / 프롬프트 완성 5/5. PM ChatGPT 생성 = sanctum, rift, dawn 3컨셉 60장.

### 6.8. 전투 시각 이팩트

| Phase | 내용 | 상태 |
|---|---|---|
| Phase 1 | 부유 라벨 / 데미지 비네트 / 흰 플래시 / 적 흔들림 | ✅ (1.10.0) |
| Phase 2 | 슬래시 SVG / 마법 임팩트·입자 / 방어 결계 / 상태이상 시각화 | ✅ (1.11.0) |
| 궁극 컷인 | 풀스크린 골든 버스트 + 궁극명 배너 0.9초 (`UltimateCutin`) | ✅ (1.12.0) |
| **보스 진입 컷신** | 9:16 풀컷 일러 페이드인 + 보스 이름 배너 + 2.5초 자동 스킵 (`BossIntroScreen`) | ✅ (1.14.0) |
| Phase 3 | 보스 임팩트 프레임, 승리 골든 버스트, 사망 흑백 페이드 | ❌ |

### 6.9. 직업 각인 시스템 (1.25.0~1.27.0) — 메타 강화 신축

이 세션(1.25.0~1.27.0)에서 한 큰 신축 시스템. **5직업 영원한 메타 진행도** + **장기 목표 게이트** + **빌드 다양화**의 세 축.

#### 6.9.1. 데이터 구조

| 구성 | 위치 | 설명 |
|---|---|---|
| `ENGRAVINGS[classId]` | `src/data.js` | 직업별 카드 풀. 1.27.0 시점 lanthert만 24장 작성. sage·demonblood·elf·priest는 빈 배열 |
| `ENGRAVING_TIERS` | `src/data.js` | C/R/E/L + NEG_FLAW/NEG_CURSE 등급 + 가중치 |
| `ENGRAVING_AWAKENING_TABLE[classId]` | `src/data.js` | 직업별 각성도 9단계 보상 + 1.26.0~ `condition` 활성화 조건 |
| `CHAMPIONSHIP_EXP_IDS` | `src/data.js` | `['frost', 'forest', 'sanctum', 'rift', 'dawn']` — 챔피언십 올 클리어 검사용 |
| `meta.engravings[classId]` | `src/storage.js` | `{ lv: 1~10, slots: [cardId|null, cardId|null, cardId|null] }` |
| `meta.ultimatesPickedByClass[classId]` | `src/storage.js` | 1.26.0~ 직업별 ULTIMATE_SKILLS 픽 기록 |
| `meta.championshipClearsByClass[classId][expId][difficulty]` | `src/storage.js` | 1.26.0~ 직업별 챔피언십 클리어 추적 (기존 `championshipClears`와 별개) |

#### 6.9.2. 카드 effect 키 21종 (lanthert 24장 풀에 사용)

| 카테고리 | 키 | 적용 위치 |
|---|---|---|
| 능력치 | `str` / `dex` / `int` / `cha` / `startHp` | `App.jsx` 직업 시작 시점 (PrepScreen에도 반영) |
| 회피·치명·데미지 | `dodgeRate` / `critRate` / `physDmgPct` / `dmgTakenPct` / `afterDodgeDmg` | `damage.js` rollDodge·rollCrit·calculateDamage + `CombatScreen` 피격 처리 |
| 반격 | `counterRatePct` / `counterDmgPct` / `counterHitSoul` / `counterShock` / `counterCanCrit` | `CombatScreen` 심안류 반격 시스템 (사전 굴림도 일치 적용) |
| 영혼·턴 | `startSoul` / `perTurnSoul` / `dodgeSoul` / `soulGainMult` / `perTurnHpLoss` | `CombatScreen` useState init + endTurn + 회피 + 영혼 획득 3경로 |
| 시스템 | `disableInsightPredict` | UI 의도 카드 차단 + Lv.5 detailIntent 회피 보너스 무효 |

음수 effect (결함·저주) 모두 정상 작동.

#### 6.9.3. 핵심 코드 패턴

```js
// utils/helpers.js — fx bag 집계
export function aggregateEngravingEffects(classId, slots) {
  // 슬롯 → 합산 effect 객체. 수치 합산, 불린 OR. 빈 슬롯 무시
}

// App.jsx — CombatScreen에 prop으로 전달
<CombatScreen ... engravingFx={aggregateEngravingEffects(classData?.id, meta?.engravings?.[classData?.id]?.slots)} />

// damage.js — 모든 함수의 마지막 인자로 engravingFx = {}
export function rollDodge(skills, defender, activeSkills, relicStat, ultimates, engravingFx = {}) { ... }
```

**확장성**: 새 effect 키 추가 시 1~2곳 switch 분기만 추가. 새 직업 풀 추가 시 코드 0줄 — 데이터(ENGRAVINGS) + storage 슬롯만.

#### 6.9.4. 각성도 활성화 조건 (1.26.0~)

영혼만으로 만렙 도달 불가. **영혼 + 조건 둘 다 충족**해야 강화. 9단계 공통 패턴:

| Lv | 조건 |
|---|---|
| 2 | 해당 직업 수련의 길 클리어 |
| 3 | 해당 직업 런에서 ULTIMATE_SKILLS 1개 이상 픽 |
| 4 | 해당 직업으로 챔피언십 normal 5컨셉 모두 클리어 |
| 5 | 해당 직업 시작 패시브 1개의 3궁극 모두 픽 (택일) |
| 6 | 해당 직업으로 챔피언십 hard 5컨셉 모두 클리어 |
| 7 | 3개 이상 직업의 각성도 Lv.5 이상 |
| 8 | 해당 직업으로 챔피언십 hell 5컨셉 모두 클리어 |
| 9 | 모든 직업 각성도 Lv.6 이상 |
| 10 | 모든 직업 각성도 Lv.8 이상 |

조건 정의는 `COMMON_AWAKENING_CONDITIONS` 공통 표 → `_mergeConditions` 머지. madness는 조건에 미사용 (너무 어려움). **만렙 = 5직업 챔피언십 지옥 정복**.

조건 체크: `utils/helpers.js`의 `isAwakeningConditionMet(meta, classId, lv)` / 진행도: `describeAwakeningConditionProgress`.

#### 6.9.4b. 보상 적용 (1.52.0~) — 🔥 1.44.0 큰 버그 픽스

1.44.0에서 보상 매트릭스를 재설계했으나, **데이터·UI만 작성하고 실제 게임 적용 코드를 작성하지 않은 버그**가 1.52.0까지 존재. EngravingScreen에 보상 텍스트는 정확히 표시되어 사용자가 "적용된 줄" 알았지만 실제로는 `slotUnlock`(Lv.2·5·8)만 작동. 5직업 × 6레벨 = 30개 보상 무효였음.

**1.52.0 픽스 (PR #101)** — 옵션 A (fx bag 패턴 1.27.0 동일):

```js
// src/utils/helpers.js
// 1) 활성화된 모든 단계 보상 누적 → 3종 델타 객체
aggregateAwakeningRewards(meta, classId) → { skillDeltas, statDeltas, fxDeltas }
//   - skillDeltas: { 심안류: 1 } → App.jsx initializeRun baseSkills에 가산 (maxLv 클램프)
//   - statDeltas:  { 근력: 5 }   → App.jsx initializeRun adjustedStats에 가산
//   - fxDeltas:    { counterRatePct: 5 } → engravingFx와 같은 키로 머지
//   - composite는 parts 재귀 처리

// 2) 슬롯 effect + 각성도 fxDeltas 머지 헬퍼
getCombinedClassFx(meta, classId) → engravingFx 단일 객체
//   - App.jsx 5곳 engravingFx prop이 일괄 호출
//   - damage.js / CombatScreen / RestScreen / PrepScreen / StatusPanel 모두 변경 0줄

// 3) 데이터 statPctBonus.key → engravingFx 키 매핑 (AWAKENING_PCT_KEY_MAP)
counterRate → counterRatePct  // 방랑검사 Lv.7 / Lv.9
igniteRate  → igniteApplyPct  // 술법사 Lv.7 / Lv.9
physDmg     → physDmgPct      // 혼혈 마족 Lv.7 / Lv.9
dodge       → dodgeRate       // 정령사 Lv.7 / Lv.9
combatHeal  → combatHealPct   // 사제 Lv.7 / Lv.9 — ⚠️ 사제 회복 시스템 미구현 (잔여)
```

**적용 결과**: 1.52.0 이후 첫 런부터 30개 보상 모두 자동 적용. PM 결정으로 별도 영혼 환불 X — changelog 고지만.

**잔여**: 1.60.0에서 사제 `combatHealPct` 회복 시스템 정상 구현됨 (`getEffectiveHealPct` 헬퍼 + 회복 시점 4곳 적용). 1.62.0에서 selfHeal 누락도 픽스. **잔여 0**.

#### 6.9.5. 풀 완성 상태 (1.62.0 기준)

| 직업 | 각인 풀 | 직업 패시브 | 소울 스킬 | 완성 PR |
|---|---|---|---|---|
| wanderer | 24장 | 심안류 (기존) | 무영의 일격 | 1.27.0 |
| sage | 24장 | 이프리트 (기존) | 영겁의 화염 | 1.46.0 |
| demonblood | 24장 | 혈광 (신축) | 혈마의 격노 | 1.57.0 + 1.61.0 |
| elf | 24장 | 풍령 (신축) | 천공의 화살비 | 1.59.0 |
| priest | 24장 | 수신 (신축) | 여명의 강림 | 1.60.0 |

**5직업 풀스택 완성**. 코드 인프라(1.27.0 fx bag + 1.52.0 aggregateAwakeningRewards) 그대로 5직업 모두 작동. 다음 시스템 확장 시 동일 패턴 재사용.

- **PrepScreen 표시**: 1.48.0 BuildSummaryPanel로 능력치/HP 가산 + 출처 모달 정상 노출. RestScreen도 동일 적용 완료
- **각성도 진행 조회 UI** (선택): 다음 단계 카드 외에 전체 9단계 진행도를 한눈에 — 미구현, PM 결정 대기

#### 6.9.6. 신규 모달

| 모달 | 트리거 | 컴포넌트 |
|---|---|---|
| `EngravingMigrationModal` | 1.25.0 첫 부팅 — `meta_startSkillLv` 영혼 환불 안내 | `EngravingScreen.jsx` export |
| `AwakeningConditionNoticeModal` | 1.26.0 첫 부팅 — 조건 시스템 추가 + 소급 불가 안내 | `EngravingScreen.jsx` export |
| `ChangelogModal` | 1.27.0 changelog 신규 항목 표시 | `App.jsx` 자동 |

모달 트리거 데이터는 `loadMeta` 마이그레이션에서 자동 세팅. acknowledge 시 `clearXxxNotice(meta)` 호출 + saveMeta.

### 6.10. 정보창 가독성 시스템 (1.38.0~1.41.0) — UI 정보 노출 풀스택

이 세션(1.38.0~1.41.0)의 두 번째 큰 작업. PM 비개발자가 "내 효과가 어디서 오는지" 한눈에 검증할 수 있도록 정보창(StatusPanel) 전체를 재설계.

#### 6.10.1. 4단계 변천 (PR A/B/C + 추가 다듬기)

| 버전 | PR | 핵심 변화 |
|---|---|---|
| 1.38.0 | #67 | **용어 통일** — "액티브 궁극 → 소울 스킬", "영혼 게이지 → 소울 게이지", "혼 → 소울" (63건 일괄 치환). 데이터 키(`ultimateId` / `soulGauge` / `CLASS_ULTIMATES`)는 코드 호환 유지 |
| 1.39.0 | #68 | **소울 스킬 정보 카드** — StatusPanel "액티브 스킬" 4번째 슬롯에 직업 소울 스킬 카드 + 탭 시 정보 모달. `buildClassUltimateInfo` 헬퍼 신설 |
| 1.40.0 | #69 | **시그니처 합산 + 출처 모달** — 분산 라인 4종(치명타 데미지 / 시작 소울 / 회피 시 소울 / 받는 데미지) 합산 통합. 합산 라인 ◇ 탭 시 출처 모달. `buildBreakdownInfo` 헬퍼 신설. 라벨 19종 풀네임화 |
| 1.41.0 | #70 | **모든 라인 클릭 모달 + 회복 합산 + 액티브/소울 별도 섹션 + 계산식 명확화** — 35개 라인 모두 ◇ + 클릭 모달. 액티브 3컬럼 + 별도 "★ 직업 소울 스킬" 풀폭 섹션. `StatSignatureModal.formula(stats)` 함수 추가 |

#### 6.10.2. 핵심 헬퍼 (CardInfoModal.jsx)

| 헬퍼 | 버전 | 입력 → 출력 |
|---|---|---|
| `buildPassiveInfo(name, lv)` | 기존 | 패시브 카드 정보 모달 |
| `buildRelicInfo(rel)` | 기존 | 유물 카드 정보 모달 |
| `buildActiveSkillInfo(name, color)` | 기존 | 액티브 스킬 카드 정보 모달 |
| **`buildClassUltimateInfo(ultimateId)`** | 1.39.0 | `CLASS_ULTIMATES[ultimateId]` → 소울 스킬 정보 모달 (충전 조건 6종 stats) |
| **`buildBreakdownInfo({ title, totalText, subtitle, sources, color })`** | 1.40.0 | 합산 라인 출처 분해 모달. `sources` 배열에서 value 0인 항목 자동 필터링 |

#### 6.10.3. 합산 라인 5종 (StatusPanel)

| 합산 라인 | 출처 | 계산 |
|---|---|---|
| **치명타 데미지** | 기본(50) + 심안 Lv.4(+30) + 약점 노출(+50) + 유물 critDmg + 민첩 시그 1단계 | 합산 |
| **시작 소울 게이지** | 지능 시그 1단계 + 각인 startSoul | 합산 |
| **회피 시 소울** | 민첩 시그 2단계 + 각인 dodgeSoul | 합산 |
| **받는 데미지** | 메타(dmgTaken-3%×N) + 유물 + 패시브 Lv.5(-20) + 매력 시그 2단계 - 각인 dmgTakenPct | 합산 (음수 각인은 빼기) |
| **회복량 보너스** (1.41.0~) | 유물 heal × 매력 시그 1단계 | **곱셈** `(1+a/100)×(1+b/100)` — 단순 합산과 다름! |

회복량은 곱셈이라 특수: 표시값 `Math.round((healMult - 1) * 1000) / 10`. 모달엔 두 출처 + 계산식 노출.

#### 6.10.4. 라인 클릭 패턴 (1.41.0~)

모든 라인은 `<button onClick={() => openLine({...})}>` 형식. 헬퍼:

```js
const openLine = (info) => setModalState({ kind: 'breakdown', info: buildBreakdownInfo(info) });

// 사용
openLine({
  title: '치명타 데미지',
  totalText: `+${Math.round(critDmg)}%`,
  subtitle: '치명타 발동 시 가하는 추가 데미지의 합산.',
  color: PALETTE.legendary,
  sources: [
    { label: '기본 (전 직업 공통)', value: 50, unit: '%' },
    { label: '민첩 시그니처 1단계', value: critDmgSig, unit: '%',
      note: `적용 포인트 ${dexPts}(=민첩-10) × +2%/p` },
    ...
  ],
});
```

**규칙**:
- `value: 0` 출처는 자동 필터링 (보유한 출처만 표시)
- `unit`: `'%'` / `''` / `'/턴'` 등 자유. 숫자면 `+N{unit}`, 문자열이면 그대로
- `note`: 임계 미달은 `미달 (X 이상 필요)`, 5단위 누진은 `17~21 +N / 22~26 +M (현재 +K)`
- 영어 키 노출 OK (`각인 startSoul` 등) — 코드 추적 가능

#### 6.10.5. 계산식 표기 규칙 (1.41.0~)

`StatSignatureModal`과 `buildBreakdownInfo` note 모두 동일 형식:

| 시그 유형 | 표기 |
|---|---|
| 임계 + 포인트 배수 (예: 매력 1단계) | `적용 포인트 N(=매력-10) × +0.5%/p` |
| 5단위 누진 (예: 매력 2단계) | `17~21 -5% / 22~26 -10% / 27~31 -15% (현재 -N%)` |
| 임계 미달 | `매력 17 필요 (현재 15)` |

**왜 이 형식인가**: 기존 "매력 15 × 0.5%/p"는 `15 × 0.5 = 7.5%`로 오해 가능. "적용 포인트 5(=매력-10) × 0.5%/p"로 풀어 쓰면 `5 × 0.5 = 2.5%`로 정확.

#### 6.10.6. 액티브/소울 분리 섹션 (1.41.0~)

```
◆ 액티브 스킬     <- 3컬럼 그리드 (참격·관통·방검 등)
─────────────
★ 직업 소울 스킬   <- 풀폭 카드 1개 (★ 아이콘 + 이름 + desc + "SOUL 100" 뱃지 + 황금 글로우)
```

**1.62.0~** 5직업 모두 ultimateId 정의 → 모든 직업 소울 스킬 섹션 자동 노출. 게이트(`showSoul`)는 1.62.0 이후 모두 true이지만, 향후 신규 직업(ultimateId 미정 상태)에 대비해 게이트 코드는 유지.

#### 6.10.7. 직업 소울 스킬 미보유 직업 게이트 (구 시스템)

```js
const showSoul = !!classData?.ultimateId;
// "기타 효과" 섹션에서 소울 게이지 관련 라인 6종(시작 소울·매 턴·회피·소울 배수·반격→소울·반격→충격) 모두
// {showSoul && ...} 조건으로 표시
```

1.62.0 이후 5직업 모두 ultimateId 보유라 사실상 항상 true. 신규 직업 추가 시점에 다시 활성화.

#### 6.10.8. 다음 작업 (이 시스템 확장)

- **PrepScreen·RestScreen·CombatScreen ≡ 모달**에도 같은 출처 모달 패턴 확산 (1.41.0은 정보창만)
- **모달 출처 라벨 한글화** — 현재 "각인 startSoul" / "유물 critRate" 영어 키 노출. PM이 어색하다 판단하면 한글 풀명으로
- **합산 라인 확장 가능 효과** — `magicDmgBonus`(패시브+Lv.5+유물 3개 합산)도 합산 라인 후보

## 7. PM 커뮤니케이션 스타일

이 프로젝트의 PM은 **비개발자**. **0절(절대 룰)이 기본**이고, 이 절은 실전 응용 사례 모음.

> **0절을 어기는 응답은 즉시 재작성**. 이 절은 0절의 보충 + 실제 세션 학습 패턴.

### 7.1. 추상 피드백 응대 패턴 (1.21.0 학습)

PM이 **"~ 너무 비슷해" / "보완이 필요해" / "별로야"** 식 추상 피드백을 줄 때 — 절대 산문체로 변명하거나 "검토하겠습니다"로 받지 X. 항상 다음 4단계:

1. **진단 표** — 무엇이 어떻게 겹치는지/문제인지 4축 분리로 시각화
2. **재설계 옵션 표** — 변경 전 / 변경 후 / 차별화 키워드
3. **차별화 검증 표** — n×n 매트릭스로 모든 축이 다른지 검증
4. `AskUserQuestion` — 재설계 범위·방향 결정 묻기 (2~4 옵션, 첫 번째 추천)

**실전 예시 (PR #41 frost 4보스 재설계)**:
- 진단: 4보스 중 boss1·2·4가 같은 컨셉의 색깔 변주 → "왕관 + 로브 + 무기 + 손마법" 4축 표로 시각화
- 옵션: 4명 모두 재설계(추천) / 2명만 / PM이 직접 조합 지정
- 검증: 재설계 후 종족·자세·무기·마법 4축이 모두 다른지 매트릭스로 보여줌

### 7.2. 큰 청크 작업 분할

작업이 5컨셉 × 20장 같은 큰 청크면 **컨셉별 PR 분리**가 PM 선호. 한 PR에 50장 묶지 X. 이미 PR #40·#41·#42에서 정착.

### 7.3. 이미지 처리 + 코드 연결

PM이 PNG를 푸시했다면 **JPG 변환 + 코드 헬퍼 연결 + 버전 갱신 + changelog 갱신**을 한 PR에 묶기. 작업 사이클 1회. 분리 X.

### 7.4. 사전 문제 발견 시

빌드 검증 중 PM 작업과 무관한 사전 문제(예: 누락된 PNG 변환)를 발견하면:
- 산문으로 길게 설명 X
- **표로 진단** + 처리 방법 3옵션 (같이 묶기 / 별도 PR / 무시) + `AskUserQuestion`
- 실전: PR #40 챕터 4 PNG cleanup이 이렇게 처리됨

### 7.5. 결정이 필요할 때 (도구·옵션 형식)
- `AskUserQuestion` 도구로 옵션 2~4개 제시 (4개 초과 시 분할)
- **추천 옵션은 항상 첫 번째**, label 끝에 "(추천)" 표기
- 결정 사항이 여러 개면 다중 질문(`questions` 배열에 여러 객체)으로 한 번에

### 7.6. PR 생성 후 응답
- **PR URL을 응답 맨 위 가장 눈에 띄게** — `## 🔗 PR #<N>` 헤더 + URL 한 줄 → 인용으로 제목
- 표로 무엇을 했는지 요약
- 다음 단계 안내 + PM이 결정/확인할 것 체크리스트

### 7.7. 응답 구조 템플릿 (0.4절과 동일, 강제)
```
[짧은 상황 요약 한 줄]

## 무엇을 했나
[표 또는 불릿]

## 변경 사항
[표]

## 영향 범위
[기존 동작 변화 여부 — PM이 가장 신경 쓰는 부분]

## PM님이 결정/확인할 것
- 명시적 액션 체크리스트
```

## 8. 커밋·PR 메시지 컨벤션

### 커밋 메시지
- **영어**, 멀티라인 OK
- 첫 줄: `<type>: <짧은 설명>` (`feat`, `fix`, `chore`, `balance`, `feat(2A)` 같은 스코프 OK)
- 본문: 무엇을 왜 했는지 / 어떻게 구현했는지 / 어떤 파일이 바뀌었는지
- 마지막 줄: `https://claude.ai/code/session_...` (Claude Code 세션 링크 — 자동 채움)

### PR 제목
- 영어, 50자 내외
- 커밋 첫 줄과 비슷한 형식

### PR 본문 (한국어)
```
## Summary
[1~2문단으로 변경의 목적과 효과]

## 변경 내역 / 변경 파일
[표 또는 불릿]

## 영향 범위
- 기존 게임플레이 영향 여부
- 빌드 통과 확인
- 마이그레이션 필요 여부

## Test plan
- [ ] 체크리스트

---
**다음 PR 예고**: [있다면 다음 작업]
```

## 9. 자주 쓰는 패턴

### 9.1. 새 챕터/원정 추가
1. `CHAPTERS` 배열에 챕터 데이터 추가 (`linearSequence` 또는 `branchSequence` 또는 일반 가중치)
2. `EXPEDITIONS` 배열에 원정 엔트리 (`forcedClassId` / `unlockId` / `category` 등)
3. 필요시 새 이벤트를 `EVENTS`에 추가 (`classOnly`, `forceEventId`, `tutorialGift` 플래그 활용)
4. 잠금 체인 갱신 (이전 원정의 `unlockId` 조정)
5. 클리어 업적을 `ACHIEVEMENTS`에 추가 (`clear_<expId>`)
6. `App.jsx`의 튜토리얼 업적 트래킹에 expId 추가 (해당되면)

### 9.2. 새 시각 효과 추가
1. `src/index.css`에 `@keyframes fx-*` 정의 + `.fx-*` 클래스
2. 필요시 `src/components/CombatEffects.jsx`에 재사용 컴포넌트 추가
3. `CombatScreen.jsx`에 트리거 상태 + `pushFxLabel` 같은 헬퍼 호출 추가

### 9.3. 새 저주 추가
1. `CURSES` 배열에 항목 추가 (id, name, desc, effect 문자열, color)
2. 효과 핸들러 추가 — 위치는 효과에 따라 다름:
   - 데미지: `CombatScreen.jsx`의 데미지 처리부
   - 보상: `App.jsx`의 `handleVictory`
   - 회복: `App.jsx`/`CombatScreen.jsx`의 heal 처리부
   - 상점: `ShopScreen.jsx` (curses prop 전달 필요)
3. 효과 문자열은 `hasCurse(curses, 'curse_xxx')`로 체크

### 9.4. 새 유물 추가
1. `RELICS`에 항목 (name, statBonus, weight, color, desc)
2. 신규 statBonus 키면 적용 위치도 추가 (`App.jsx` `applyReward` / `CombatScreen.jsx` 빌드 시점)
3. 옵션: `FORGE_RECIPES`에 조합 추가
4. **`buildRelicInfo`는 statBonus 키를 노출하지 않음** — desc 문구로만 효과 표현 (PM 결정)

### 9.5. 새 적 일러스트 추가 (5절 파이프라인과 함께)
1. `docs/enemy-illustration-prompts.md`에 한국어 4단 프롬프트 작성
2. PM이 ChatGPT로 생성 → PNG 받음
3. PM이 `public/enemies/classic/chapter_<n>/`에 PNG 드롭 + main 푸시
4. Claude가 git pull → Pillow JPG 변환 → 원본 PNG 삭제 → 커밋
5. 코드 연결은 자동 — `ENEMIES[key].chapter` 필드만 있으면 `CombatScreen.jsx`가 알아서 로드
6. 보스 진입 컷신 일러는 `<key>_intro.jpg` 추가만 하면 `BossIntroScreen`이 자동 활성화

### 9.6. 새 보스 진입 컷신 추가
- 일러스트 `<bossKey>_intro.jpg`를 폴더에 넣기만 하면 끝. 코드 수정 불필요.
- 일러 없으면 `BossIntroScreen`이 0.3초 만에 자동 스킵 → 전투 직행 (1.14.0~)

## 10. 알려진 시스템 제약 / 함정

- **챕터 ID 타입 혼재**: 튜토리얼은 string (`'tutorial_basic'`), 클래식/수련은 number (`1`~`4`), 챔피언십도 별도. 챕터 조회는 ID 기반 검색(`CHAPTERS.find(c => c.id === id)`) 사용. 인덱스 사용 금지.
- **`getNodeMeta`는 `linearSequence`와 `branchSequence` 둘 다 지원해야 함** — 새 시퀀스 타입 추가 시 여기도 갱신.
- **`tutorialGift` 이벤트**는 강제 트리거 전용 (랜덤 풀 제외). 새 선물 이벤트 추가 시 이 플래그 잊지 말 것.
- **`endless` 원정**은 `currentExpedition._baseExp`에 원본 멀티플라이어 보존 — 깊이 스케일링이 누적되지 않도록.
- **`activeRun` 스냅샷**은 맵 화면에서만 저장. 전투/이벤트/상점 화면에서 별도 저장 X — 손상되면 자동 정리되고 일반 타이틀로 폴백. 복귀 시 항상 맵으로.
- **🔥 에셋 경로**: 4.5절 — 반드시 `./` 상대 경로. 절대 경로는 GH Pages 배포 후 404.
- **📷 채팅 첨부 이미지**: 5.5절 — PM 채팅 첨부 PNG는 Claude 디스크에 저장 안 됨. PM이 직접 repo에 넣어야 함.

## 11. 작업 로드맵 (1.62.1 기준)

### ⭐ 진행 가능한 다음 작업 (우선순위 순)

1. **챔피언십 sanctum + rift + dawn 일러 60장 (PM 생성 대기)** — 프롬프트 3컨셉 완료. PM이 **ChatGPT(DALL-E 3)**로 생성 + chapter1/2/3/4 서브폴더에 저장 → Claude가 변환·헬퍼 분기·PR. dawn은 1.58.0 placeholder 24장 배치 완료, PM 진짜 일러 받으면 동일 파일명 덮어쓰기
2. **챔피언십 sanctum / rift / dawn 적 데이터 통합** — `ENEMIES[champ_sanctum_*]` / `champ_rift_*` / `champ_dawn_*` 정의 + 챔피언십 expedition 추가. `getEnemyImageSrc` 헬퍼는 chapter: `sanctum_<N>` / `rift_<N>` / `dawn_<N>` 문자열 자동 분기 → 코드 변경 0줄. 데이터 PR만으로 일러 자동 라우팅
3. **모달 출처 라벨 한글화** — 현재 "각인 startSoul" / "유물 critRate" 영어 키 노출. PM 피드백 받으면 한글 풀명으로
4. **도감 일러 노출** — `CodexScreen.jsx`에 신규 일러 썸네일. 발견 못 한 적은 그레이스케일
5. **타 직업(술법사·마족·엘프·사제) 전투 일러 개편** — 동일 파이프라인 (방랑검사 1.12.0 완료)
6. **인스타 마케팅 카드뉴스 — 술법사 편** (PM 보류 상태 — 방랑검사 1편 완료 후 PM 우선순위 따라 재개)
7. **이팩트 Phase 3** (보스 임팩트 프레임, 승리 골든 버스트, 사망 흑백 페이드)
8. **튜토리얼 5/6/7** (보상 선택의 갈림길 / 전투의 흐름 / 영혼의 행로)
9. **각인 시스템 보조 UI**: 각성도 전체 9단계 한눈에 보기

### 시스템 미구현 (PM 결정 대기)
- **Tier 3A** — 신규 클래스 6번째
- **Tier 3B** — 신규 챕터 5번째 (컨셉 후보: 여명의 폐허 / 마왕의 심장 / 시간의 폐허)
- **Tier 3C** — Mutator 시스템 (출정 직전 자가 선택 변형)

### 🗡️ 레이드 시스템 — PM 설계 확정 (1.73.0 세션, PR #131 머지 후 MVP 착수)

PM이 AskUserQuestion으로 확정한 설계. **던전앤파이터 모티브, "아예 별개의 게임" 컨셉**:

| 축 | PM 확정 결정 |
|---|---|
| 진행 방식 | **PR #131 머지 후 별도 PR 시리즈로 MVP 착수** (이번 PR에 포함 X) |
| 파티 | **5직업 전원 출전** (검사·술법사·마족·정령사·사제) — 탱/딜/힐 역할 분담 |
| 전투 조작 | **풀오토 + 관전** — 5명 전원 AI (1.72.0 자동 사냥 AI 패턴 재사용), 편성한 장비·스킬 세팅이 승패 결정 |
| 장비 | **직업별 3부위** (무기/방어구/장신구), 등급 랜덤 드랍, **레이드 전용** (본편 미적용 — 밸런스 분리) |
| 레이드 전용 스킬 | 직업당 레이드 스킬 세트 별도 지정 (본편 COMBAT_SKILLS와 분리) |
| 던전 구조 | 파밍 던전(장비 드랍) → 장비 갖추고 상위 레이드 보스 (던파 루프) |
| 보상 | 레이드 전용 재화 + 장비 — 본편과 분리된 성장 축 |

**✅ MVP 1차 구현 완료 (1.74.0)**: `src/data/raid.js`(RAID_CLASSES·RAID_SKILLS·RAID_DUNGEONS 2종·rollRaidDrop) + `RaidScreen.jsx`(로비·장비 관리·일괄 장착) + `RaidBattleScreen.jsx`(라운드제 풀오토·배속·전멸기·격노) + `meta.raid`(inventory/equipped/clears + addRaidDrops·equipRaidItem·autoEquipRaidBest). 해금: `tutorial_curse_clear`. 타이틀 메뉴 진입.

**✅ 1.74.0 확장 (PR #133)**: 방 진행형(쫄→네임드→보스, 방 사이 HP 10%만 회복) + 지역 3개 × 7던전(몹 26종) + 등급 6단계(일반~에픽, 드랍율 단조 감소 — PM 룰) + 던전 티어 장비(gearMult ×1.0~×2.2 + 시리즈 접두어). 던파 구조 참고·이름 100% 오리지널 (IP 리스크 0, PM 결정).

**✅ 2차 완료 (1.75.0)**: 장비 분해→💠심연석→강화 +1~+10(단계당 +8%, `RAID_ENHANCE`) / 세트 효과(시리즈 3부위, `RAID_SET_BONUSES`) / 주간 첫 클리어 보상(`getKstWeekKey` 월요일 리셋, 심연 레이드는 유니크↑ 확정 추가) / 보스 기믹 3종(쫄 소환 summonEvery·힐컷 healCutEvery·도발 무시 pierceTankChance).

**✅ 3차 완료 (1.76.0)**: 난이도 전면 상향(`RAID_TUNING` 공 +45%/HP +35% — 체감 조정은 이 상수만) / 막보 전용 드랍(중간 네임드는 심연석만 — 1관문 반복 익스플로잇 픽스) / ◈군주의 정수(첨탑 1·심연 2 막보 확정) + 제작소(정수 제작 에픽·레전더리 확정, 부위·직업 랜덤) + 심연석 가챠(30석, 에픽 1.5%). 전리품 구조 `{ items, stones, essence }`.

**✅ 4차 완료 (1.77.0)**: 스킬 다양화 — 직업당 3종 자동 발동(`RAID_SKILLS` 배열화: 철벽·응수 / 광란·흡혈 / 관통·가호 / 잔염·과부하 / 소생·정화) / 에픽 고유 옵션(`RAID_EPIC_UNIQUES` — 직업 에픽 1개 이상 장착 시 스킬 강화 발동) / 지역 4 몰락한 여명(T7 몰락한 성소 + T8 종막의 왕좌 3관문, 에픽 13%·정수 3). 1.76.1 프론트엔드 = 비주얼 전투 스테이지(부유 데미지·엠블럼·초상 칩) + 로비 리디자인.

**✅ 1.77.0 추가 (PR #136)**: 기본 전투 ×2 배속(토글 ×2→×4→×1) / 기여도 팝업(딜 순위 바+MVP+탱킹·회복) / 기연 비전 시스템.

**✅ 1.78.0 기연 재설계 (PM 피드백 — 저티어 회전 구멍 차단)**: 기연이 던전 소속 9종으로 변경(`RAID_SECRET_SKILLS` — dungeonId·tier·파티 단위 fx, 상위 던전일수록 강력) / 재발생 방지(`secretHistory` — 던전당 평생 1회) / 활성 1슬롯(`secretSkill` — 조우 시 유지/변경 선택, 버리면 소멸) / 던전 반복 토글(승리 시 자동 재입장, `raidRepeat` — 기연 선택 대기 시 정지).

**✅ 1.78.1~1.79.0**: 에픽 고유·세트 효과 설명 UI(장비 카드 desc + 직업 카드 세트 현황 N/3) / **전후방 배치**(PM 제안 — `RAID_FORMATION`: 전열 공+10%·단일기/광역 주 타겟, 후열 광역 -30%·단일기 보호, 전멸기 배치 무관. `meta.raid.formation` + 로비 토글 + 전투 2줄 배치).

**✅ 1.79.1**: 세트 픽스 — 레거시 장비 `series` 백필(`backfillRaidSeries`, loadMeta+클라우드 병합 양쪽) + 여명의 15/15·종막의 18/18 세트 신설 + 승리·전멸 보상 패널 스크롤화(36vh).

**✅ 1.80.0 백그라운드 파밍**: RaidBattleScreen을 `PhoneFrame`의 **persistent 레이어**(키 리마운트 제외)에 상시 마운트 — `raidDungeon` 있으면 화면을 떠나도 전투·반복 파밍 계속. `background` prop(승리·전멸 자동 정산, 기연 선택만 대기) + `onMinimize`(▾ 버튼) + `onStatus` → App 플로팅 필(탭하여 복귀). handleRaidVictory/Partial은 `screen === 'raidBattle'`일 때만 화면 전환 (싱글모드 방해 금지). ⚠️ 주의: PhoneFrame 자식은 `key={screenKey}`로 화면 전환마다 리마운트 — 영속이 필요한 컴포넌트는 반드시 persistent로.

**✅ 1.86.0 난이도 단계제**: 전 던전 일반/영웅(×2.2)/종막(×4.0) — `RAID_DIFFICULTIES` + `applyRaidDifficulty(dungeon, diff)`가 실효 던전 객체 생성(방 hp/atk·보상·에픽 가중 조정), RaidBattleScreen은 난이도 무지. 클리어 키 `dungeonId@diffId`(일반은 기존 키 — 하위 호환), 해금은 하위 단계 클리어. 도박장 상점 1.86.0 개편: 심연석·정수 제거 → 기연 재조우권(secretHistory 초기화)·레전더리 각인 확정권(GambleScreen 2단 피커 → applyEngravingSlot).

**5차 확장 후보 (PM 결정 대기)**: 레이드 보스 일러스트 프롬프트(ChatGPT 파이프라인) / 레이드 랭킹·기록

### 완성 항목 (1.62.x 기준 — outdated 정보 재발 방지)
- **5직업 풀스택** — 각인 풀 5×24 = 120장 + 5직업 전용 패시브 + 5직업 소울 스킬 모두 완성
- **5직업 각성 스킬 (1.82.0)** — ULTIMATE_SKILLS에 혈광·풍령·수신 3종씩 추가 (심안류·이프리트 포함 총 15종). 각성도 Lv.3·5·7·9·10 조건이 전 직업 개방. 새 각성 effect 추가 시: passives.js 정의 → damage.js(스탯형)/CombatScreen(트리거형) hasUltimate 분기 → StatusPanel 합산 라인·출처 모달 3축 체크
- **각성도 보상 적용** — 1.52.0 `aggregateAwakeningRewards`로 30개 보상 모두 자동 적용
- **PrepScreen·RestScreen ◇ 출처 모달** — 1.48.0 BuildSummaryPanel로 양쪽 적용 완료
- **회복 시스템** — 1.60.0 `getEffectiveHealPct` + 1.62.0 selfHeal 픽스로 회복 보너스 4곳 정상 적용
- **dawn 프롬프트** — 1.58.0 작성 완료

### 잠재적 개선
- 일일 챌린지 리더보드 (Firebase 활용)
- 무한모드 깊이 기록·랭킹
- 도감 발견율 → 영혼 보너스
- 챔피언십 변형 (mutator)
- 각인 가챠 비용 차등 (legendary 가챠 비용 더 높게)

## 12. 첫 메시지 권장 응답

새 세션에서 PM이 작업을 요청하면 **반드시** 다음 순서로:

1. **이 파일을 처음부터 읽기** (Read tool) — 특히 0절(절대 룰), 7절(PM 응대 패턴)
2. 관련 데이터 파일 1~2개 확인 (현재 상태 파악)
3. 작업 단위가 3+ 단계면 TodoWrite로 추적 시작
4. 결정이 필요하면 **반드시 `AskUserQuestion`** — 산문으로 결정 요청 X
5. 모든 사용자 영향 작업은 **버전+changelog 같이 처리** (4.1절 강제)
6. 에셋 작업이면 **4.5절 + 5절 룰 재확인** (절대 경로 X, 상대 경로 `./`)
7. PR 본문은 **0.3절 6단 구조** 강제 (Summary / 변경 내역 / 영향 범위 / Test plan / PM이 결정·확인할 것 / 다음 PR 예고)

### 첫 응답에서 흔히 빠지는 실수 (절대 X)
- ❌ "안녕하세요, 무엇을 도와드릴까요?" 같은 빈 인삿말 → 바로 작업 시작
- ❌ 산문체로 "확인해보겠습니다" → 즉시 진단 표 + 옵션 표
- ❌ 영어 헤더 (`## Summary` 빼고는 모두 한국어)
- ❌ 빌드 검증 없이 커밋
- ❌ "더 알아보겠습니다"로 끝맺기

---

**마지막 업데이트**: 1.62.1 시점 — **세션 인계 정확화 (코드 변경 0줄, 문서만 갱신)**. 이전 1.52.0 시점 작성된 "다음 작업" 항목 4건이 1.52.0~1.62.1 사이 모두 구현됐는데 CLAUDE.md가 갱신 안 됨 → 다음 세션에 "구현된 걸 미구현으로 제안"하는 결함 발생. 본 갱신으로 outdated 항목 정정 + 진짜 잔여 항목 재정리.

**1.53.0~1.62.1 사이 구현 완료된 항목 (이 갱신으로 정정)**:
- ✅ demonblood / elf / priest 각인 풀 24장씩 (1.57.0 / 1.59.0 / 1.60.0)
- ✅ demonblood / elf / priest 소울 스킬 (1.59.0 / 1.60.0 / 1.61.0)
- ✅ demonblood / elf / priest 직업 전용 패시브 — 혈광 / 풍령 / 수신 (1.59.0~1.61.0)
- ✅ 사제 회복 시스템 — `getEffectiveHealPct` 헬퍼 + 회복 시점 4곳 적용 (1.60.0 + 1.62.0 selfHeal 픽스)
- ✅ 챔피언십 dawn 프롬프트 20장 + Pillow placeholder 24장 (1.58.0)
- ✅ PrepScreen·RestScreen ◇ 출처 모달 — BuildSummaryPanel 양쪽 적용 (1.48.0)


## 🔥 다음 세션 즉시 작업 — 1.62.1 기준 인계

### 현재 상태 (브랜치 / commit)

| 항목 | 값 |
|---|---|
| 브랜치 | `claude/set-effect-not-applied-3m931u` (1.79.1~1.90.0 시리즈 — 매 PR 머지 후 `git checkout -B <브랜치> origin/main`으로 재분기) |
| 현재 게임 버전 | **1.90.0** (1.79~1.81 레이드 백그라운드·자동 사냥 확장 → 1.82 각성 스킬 15종 → 1.83~1.84 자동 전적·업적 롤백 픽스 → 1.85 도박장 → 1.86~1.87 레이드 난이도·초월 → 1.88 Wake Lock → 1.89 마스터즈+칭호 → **1.90.0 업적 전면 개편**: 죽은 업적 11개 부활·리뉴얼 + 신규 콘텐츠 업적 20개) |
| **PR 머지 정책** | PM 상시 승인 (1.90.0 세션): **PR 생성 후 자동 머지** — 별도 확인 없이 진행 |
| **다음 세션 브랜치 전략** | 다음 PR은 **`git fetch origin main` + `git checkout -B <새브랜치> origin/main`**으로 최신 main에서 분기 |

### 🏆 업적 시스템 (1.90.0 전면 개편 — 신규 콘텐츠 추가 시 필수 체크)

| 규칙 | 내용 |
|---|---|
| **총 103개 / 카테고리 10종** | tutorial·training·clear·special·meta·forge·champ + **gamble·masters·raid** (1.90.0 신설). AchievementScreen 탭·뱃지도 같이 갱신할 것 |
| **데이터 정의 = 배선 의무** | 1.90.0에서 special_* 11개가 정의만 있고 판정 코드 0으로 영구 미달성이던 버그 해소. **새 업적 추가 시 반드시 추적 코드까지 한 PR에** (데이터 정의 → UI 표시 → 적용 코드 3축 체크리스트와 동일 원칙) |
| **런 조건 업적 훅** | App.jsx `runKillsRef`(몰살자)/`runEventsRef`(운명의 심판자)/`initialSkillTotalRef`(공허한 승리) — initializeRun idx===0에서 리셋, 이어하기(resume)에서는 보수적 리셋(initialSkillTotal=null → 판정 스킵, 오지급 방지). 클리어 판정은 handleChapterContinue 클리어 분기 |
| **전투 단위 훅** | CombatScreen `dodgeCountRef` → onVictory 3번째 인자 `{..., dodges}` / EventScreen 판정 결과 `result.check = 'ok'|'fail'` |
| **storage 내장 훅** | addTwilightCoins(획득분 `twilightCoinsEarned` 누적+주화 부자) / addRaidDrops·spendRaidResourcesForItem(에픽 EP 획득 판정) — 호출 경로 전체 자동 커버 |
| **함수형 setMeta 필수** | 업적 트래킹은 반드시 `setMeta(prev => ...)` (1.84.0 롤백 사고 재발 방지) |

### 이번 세션 결과 요약 — 문서 갱신 (코드 변경 0줄)

| 작업 | 결과 |
|---|---|
| **CLAUDE.md outdated 진단** | PM이 옵션 4개 중 3개가 이미 구현됨을 지적 → 코드 검증으로 1.52.0~1.62.1 사이 4건 추가 구현 발견 |
| **6.3절 (직업 5종)** | 5직업 모두 풀스택 완성 표로 갱신. 직업 전용 패시브 + 소울 스킬 모두 표시 |
| **6.7절 (챔피언십 일러)** | 5컨셉 진행 상태 1.52.0 → 1.62.1 갱신. forest 완료 / dawn 프롬프트 완료 추가 |
| **6.9.5절 (각인 풀)** | 4직업 풀 작성 → 5직업 풀스택 완성 표로 갱신. PrepScreen·RestScreen 출처 모달 적용 확정 |
| **6.10.7절 (소울 스킬 게이트)** | 5직업 모두 ultimateId 보유로 사실상 항상 true 명시 |
| **11절 (작업 로드맵)** | 1.52.0 → 1.62.1 기준 재정렬. 완성 항목 별도 섹션으로 outdated 재발 방지 |

### 🎨 UI 디자인 시스템 (1.64.0~1.67.0 신설 — 신규 화면 작성 시 필수)

| 규칙 | 내용 |
|---|---|
| **토큰** | `src/index.css` `:root`의 `--ui-*` 색 / `--r-chip(8)·--r-btn(13)·--r-panel(18)` 모서리. 하드코딩 헥스 신규 추가 금지 |
| **공통 부품** | `src/components/ui/CommonUI.jsx` — ScreenHeader(뒤로가기 통일)·GlassPanel·Chip·UIButton(primary/ghost/gold)·BottomSheet |
| **색 역할** | accent(와인)는 화면당 주 액션 1개에만. 재화·소울=gold, 보조=dawn |
| **모션** | `.ui-screen-enter`(전환)·`.ui-stagger`(리스트)·`.ui-press`(프레스)·`.ui-sheen`(CTA). 전부 reduced-motion 가드됨 |
| **타이포 하한** | 11px (기존 8~10px 신규 사용 금지) / 터치 타깃 40px+ |
| **미적용 잔여** | 정보창 접이식 섹션(PM 검증 워크플로 보존 위해 의도적 미적용) / 전투 HP바 데미지 잔상 트레일 |

### ⚔️ 콘텐츠 개편 시스템 (1.68.0~1.71.0 신설 — 전투·이벤트 확장 시 필수)

| 시스템 | 위치 | 확장 방법 |
|---|---|---|
| **적 의도 가중치** | `initCombat.js` rollEnemyIntent/assignNextIntent | 적 pattern에 `weight: N` (기본 1). 보스 HP 50% 격노 자동 (isBoss 공통 규칙) |
| **대공격 간파** | 적 pattern `heavy: true` | 전 직업 예고 칩 + 방어/회피/기절 카운터 보상 자동 |
| **AP 턴** | `initCombat.js` AP_PER_TURN=3, getSkillApCost | 스킬에 `ap: N` 명시 (기본: 기본기1/주력2/방어·버프1). **밸런스는 AP_TUNING {enemyHpMult 1.6, enemyDmgMult 1.25} 한 곳** |
| **콤보 연계** | skills.js `comboAfter/comboBonusPct/comboLabel/comboHealMult` | 데이터만 추가 — 같은 턴 선행 스킬 사용 시 발동 |
| **연쇄 이벤트** | events.js `chain: '<id>'` / `chainOnly: true` | 예약 큐(pendingChainEvents)는 스냅샷 포함. 판정 success/fail별 chain 가능 |
| **챕터 기믹** | chapters.js `gimmick: {id,name,desc}` | id: frost/decay/sealEcho/surge 구현됨. 신규 id는 CombatScreen 분기 추가 |
| **이벤트 비용/페널티** | 1.70.0 실적용 픽스 | cost는 penalty로 정산 + 잔액 부족 비활성. 일반 선택지 penalty도 적용됨 |
| **일일 임무** (1.72.0) | `data/meta.js` DAILY_MISSIONS + `storage.js` trackDailyMission | 임무 추가는 DAILY_MISSIONS 배열 + App.jsx 트래킹 지점 1곳. KST 날짜 키 자동 리셋, 완료 즉시 영혼 자동 지급. TitleScreen 진행도 패널 |
| **도감 발견 보너스** (1.72.0) | `storage.js` recordCodex 내장 | 신규 발견 ✦5 / 카테고리 완성 ✦100 (codexCompletionClaimed 1회 기록). 소급 지급 없음 |
| **마스터즈 퓨전 던전 + 칭호** (1.89.0) | `data/masters.js`(듀얼 10+트리플 10, buildMastersChapter/Expedition, MASTERS_TUNING) + `data/titles.js`(CLASS_TITLES 5×4등급, 태초 0.1%) + `meta.titles/equippedTitle` | 기믹 융합: chapter.gimmick **배열** → CombatScreen `hasGimmick(id)` (dawnheal 신규 — 적 3%/턴 회복). 보스 체인: chapter.bossChain → App `bossChain` state, handleVictory에서 다음 페이즈 즉시 진입(HP 이월). 칭호 fx는 `getCombinedClassFx`에서 병합 — 전투 코드 0줄. 마스터즈 런은 스냅샷 제외. 밸런스는 MASTERS_TUNING·TITLE_DROP_RATES 한 곳 |
| **황혼의 벨트 — 포션** (1.96.0, 1.97.0 직업별 개편) | `data/potions.js`(POTIONS 4종·CLASS_BELT 기본/최대·BELT_EXPANSIONS 조건) + helpers `getClassBeltSlots/getBeltExpansionCount` + App `belt` state(런 한정, 스냅샷 포함) + CombatScreen `handleUsePotion/chooseAutoPotion` + ShopScreen 포션 진열 + 사건 `twilight_alchemist`(potion_random) | 직업별 슬롯(PM 지정): 검사 2/4·술법사 1/3·마족 0/1·정령사 1/3·사제 1/2. 확장 = 조건 순차 달성(수련 클리어 → 원정 20회), 확장 1칸당 챕터 시작 랜덤 포션 +1. 제단 meta_beltSlot은 1.97.0 폐기·환불(loadMeta). 사용: AP 미소모·턴당 1회. 자동 룰: HP<50% 최소 충족 물약 / 에테르 0 → 에테르 물약. 회복 보정 미적용 |
| **황혼의 도박장** (1.85.0) | `data/gamble.js`(GAMBLE_CONFIG·GAMBLE_SHOP·buildGambleExpedition) + `chapters.js` gamble_arena(챕터 1·2 적 풀 재사용, boss 배열 지원) + `GambleScreen.jsx` + `meta.twilightCoins/fateShards/gambleDaily` | 일일 3회 3연전 더블 업(❂10→20→40, 전멸 시 소멸) + 승리당 0.5% 잭팟 ❂500 + 천장(조각 100=❂500) + 전용 상점(영혼·심연석·정수). 도박 런은 스냅샷·반복·전문가 카운트 제외. 밸런스는 GAMBLE_CONFIG 한 곳 |
| **자동 사냥 대기화면·정산·반복** (1.81.0) | `AutoHuntOverlay.jsx`(persistent 레이어) + CombatScreen `dmgStatsRef/trackDmg` + App `runStats/victoryStats/runRepeat/runRestartRef` | 대기화면: 자동 ON 시 상태창 오버레이(관전 토글). 정산: onVictory 3번째 인자 `{total, bySource}` → VictoryScreen(전투)·ExpeditionClearScreen(런). 반복: 드라이버 expeditionClear 분기에서 `runRestartRef.current()` 재출정 (클래식 startExpedition / 챔피언십 startChampionship 클로저 보존, 전멸 시 해제). 새 데미지 경로 추가 시 **trackDmg 호출 잊지 말 것** |
| **자동 사냥** (1.72.0, 1.80.0 확장) | App 드라이버 useEffect + CombatScreen `chooseAutoAction` + EventScreen autoPlay | 1.80.0~ **전 원정 허용** (`autoHuntAllowed = !!currentExpedition`, 미클리어 포함) + **배속 ×1/×5/×10** (`autoSpeed` state → CombatScreen `dly()` 헬퍼로 자동 중에만 딜레이 압축). 전투 AI 우선순위: 소울100 → heavy·저체력 방어 → **회복 방어 선제(사제 가호, HP<50%)** → 버프 → 콤보 셋업 → **마지막 AP 방어 전환(적 공격 의도+HP<65%)** → AP당 기대 데미지 최대. **자해 스킬은 잔여 HP<15면 금지**. usable() 가드는 handlePlayerAction과 반드시 일치 유지 |
| **🔒 직업별 자동 플랜 — PM 룰 동결** (1.91.2 확정, 1.92.0 술법사 추가) | CombatScreen 방랑검사·술법사 분기(3AP 플랜 + 소울 3룰 + `autoUltCommitRef` 커밋 플래그) + App 드라이버 `CLASS_SKILL_PRIO` 맵(직업별 우선순위 + 상위 5 부재 시 보석 리롤) | **⚠️ PM 명시 지시 (1.91.2 세션): PM이 설정한 자동 AI 룰을 임의로 변경·"개선" 금지.** 전적분석(autoRunLog→AutoStatsScreen)은 **데이터 축적·표시 전용** — AI 룰에 자동 반영하는 코드를 만들지 말 것 (옵션 B 추천 조합도 PM 승인 전 구현 금지). 잔여 직업(마족·정령사·사제) 전용 플랜은 **PM이 직접 플레이 후 룰을 지시하면** 동일 구조(전용 분기 + CLASS_SKILL_PRIO 항목)로만 구현. 소울 스킬은 잔여 AP 전부 소모 → 기본기로 AP 깎은 뒤 마지막 발동이 정석 |

### 다음 세션 우선순위 (PM 미지정 시 기본값)

| 우선순위 | 작업 | 메모 |
|---|---|---|
| **0** | **챔피언십 sanctum + rift + dawn 일러 (PM 생성 대기)** | 프롬프트 3컨셉 완료. dawn은 1.58.0 Pillow placeholder 24장 배치 완료. PM이 ChatGPT(DALL-E 3)로 생성 후 chapter1/2/3/4 서브폴더 푸시 → Claude가 JPG 변환 + 헬퍼 분기 + PR. PM 생성 없으면 대기 |
| 1 | **챔피언십 sanctum / rift / dawn 적 데이터 통합** | `ENEMIES[champ_*_*]` 정의 + expedition 추가. 헬퍼 chapter 문자열 자동 분기로 코드 0줄. 일러 없어도 폴백("[ 적 모습 미구현 ]")으로 정상 작동 |
| 2 | **모달 출처 라벨 한글화** | "각인 startSoul" / "유물 critRate" 영어 키 → 한글 풀명. PM 피드백 받으면 시작 |
| 3 | ~~도감 일러 노출~~ | ✅ 1.63.0 완료 (PR #121) — 16:9 썸네일 + 미발견 그레이스케일 자물쇠 |
| 4 | **이팩트 Phase 3** | 보스 임팩트 프레임, 승리 골든 버스트, 사망 흑백 페이드 |
| 5 | **튜토리얼 5/6/7** | 보상 선택의 갈림길 / 전투의 흐름 / 영혼의 행로 |
| 6 | **타 직업 전투 일러 개편** | 술법사·마족·엘프·사제 (방랑검사 1.12.0 완료) |
| 7 | **각인 시스템 보조 UI** | 각성도 전체 9단계 한눈에 보기 |
| 8 | **인스타 카드뉴스 술법사 편** (PM 보류) | 방랑검사 1편 완료. PM 우선순위 따라 재개 |

### 다음 세션 첫 응답 흐름

1. **CLAUDE.md 0절·7절 + "🔥 다음 세션 즉시 작업" 섹션 정독**
2. PM 지시 확인 — 명시적이면 그것 우선
3. 위 0순위(챔피언십 일러 대기)는 PM 생성 없으면 다른 우선순위로 이동
4. 결정 필요 시 `AskUserQuestion` (산문체 X)
5. **옵션 제시 전 반드시 코드 검증** — CLAUDE.md "다음 작업" 항목이 실제로 미구현인지 확인. 이번 세션 outdated 사례 재발 방지

---

### 핵심 변경 (1.52.0 → 1.62.1)

1.52.0 이후 5개월간 5직업 풀스택을 완성한 큰 시기. 1직업 = 1 PR 시리즈로 진행.

| 버전 | PR | 작업 |
|---|---|---|
| 1.57.0 | demonblood 각인 풀 24장 |
| 1.58.0 | 챔피언십 dawn 프롬프트 20장 + Pillow placeholder 24장 |
| 1.59.0 | elf 풀스택 — 풍령 패시브 + 천공의 화살비 + 각인 풀 24장 |
| 1.60.0 | priest 풀스택 — 수신 패시브 + 여명의 강림 + 각인 풀 24장 + 회복 시스템 |
| 1.61.0 | demonblood 풀스택 — 혈광 패시브 + 혈마의 격노 (각인 풀은 1.57.0에서 선행) |
| 1.62.0 | elf + priest 통합 머지 + 코드 리뷰 10건 픽스 |
| 1.62.1 | 코드 리뷰 잔여 픽스 4건 (dawnRevive 우선 / StatusPanel 표시 / getDisplayDamage / Codex) |

### 새 코드 패턴 (1.52.0~1.62.1 기간 학습)

| 패턴 | 적용 |
|---|---|
| **데이터·UI 정의 + 적용 코드 누락은 큰 버그** | 1.52.0에서 학습. 1.60.0 selfHeal 누락(1.62.0 #2), 1.62.0 6 buff 상태바 누락(#10) 등 동일 안티패턴 재발 → 매번 **데이터 정의 → UI 표시 → 적용 코드** 3축 체크리스트 |
| **CLAUDE.md "다음 작업" 정기 갱신** | 이번 세션 학습. 4건이 outdated 상태로 PM에게 옵션 제시 → 결정 후 "이미 구현됨" 재발견. 매 PR마다 CLAUDE.md "다음 작업" 섹션도 같이 갱신 |
| **옵션 제시 전 코드 검증** | CLAUDE.md를 신뢰하지 말고 직접 grep/Read로 현재 상태 확인 후 옵션 제시 |
| **`aggregateAwakeningRewards` 패턴** (1.52.0) | 메타 상태 → 단일 델타 객체 `{skillDeltas, statDeltas, fxDeltas}`. 외부 상태 변경 X(순수 함수). composite 타입은 parts 재귀 |
| **`getCombinedClassFx` 패턴** (1.52.0) | 두 출처 → 단일 engravingFx 객체. App.jsx 5곳 prop 통합 |
| **데이터 key → engravingFx 키 매핑** (1.52.0) | `AWAKENING_PCT_KEY_MAP` 상수로 매핑 |
| **`getEffectiveHealPct` 패턴** (1.60.0) | 회복 시점에 각인 combatHealPct + 수신 minor + 수신 Lv.5 합산. selfHeal 같은 경로도 빠짐없이 |
| **buff 1회 소비를 hitCount 루프 OUT으로** (1.62.0 #5) | multi-hit 스킬에서 buff 1회만 발동되도록 루프 밖에서 클리어 |
| **fx bag 집계** (1.27.0 기존) | 장착물 → 단일 합산 effect 객체 → prop 전달. 미장착 시 빈 객체라 회귀 안전 |
| **함수 시그니처 확장** (1.27.0 기존) | 기존 호출 호환 위해 새 인자는 **항상 마지막 + 기본값 `= {}`** |

### PM 응대 학습 (1.62.1 시점)

| 패턴 | 적용 |
|---|---|
| **PM의 "~ 적용 안 된 것 같다" 보고는 진단 표 먼저** | 산문체 변명 X. 1) 진단 표 (데이터·UI·적용 코드 3축) → 2) 영향 범위 표 → 3) 옵션 표 → 4) AskUserQuestion |
| **PM "다시확인해봐 구현된걸 제안하는거같은데" 패턴** | 1.62.1 학습. PM이 옵션 제시에서 outdated를 느끼면 직접 코드 grep으로 검증 후 진단 표 + 정정 옵션으로 재제시. 절대 "확인해보겠습니다"로 끝내지 X |
| **큰 버그라도 PM 결정으로 영혼 환불 X 가능** | 영혼 환불 비용 분석 → PM이 "changelog 고지만"으로 결정 → PR 본문에 결정 사유 명시 |
| **PR 본문 "PM이 결정/확인할 것" 섹션은 명시적 액션 체크리스트** | "[ ] PR 머지 / [ ] 실기 검증" 등. 한눈에 액션 항목을 알 수 있어야 함 |

### 알려진 잔여 항목 (다음 세션 인계)

| 항목 | 상태 | 다음 작업 |
|---|---|---|
| 챔피언십 sanctum / rift / dawn 일러 | 프롬프트 완료, PM ChatGPT 생성 대기. dawn은 placeholder 24장 배치됨 | PM 생성 → Claude JPG 변환 + 코드 연결 |
| 챔피언십 sanctum / rift / dawn 적 데이터 | `ENEMIES[champ_*_*]` 미정의 | 별도 PR. 헬퍼 분기는 chapter 문자열로 자동 |
| 모달 출처 라벨 한글화 | "각인 startSoul" 등 영어 키 노출 | PM 피드백 받으면 시작 |
| 도감 신규 일러 노출 | CodexScreen 썸네일 미적용 | 발견 못 한 적은 그레이스케일 |
| 이팩트 Phase 3 | 미구현 | 보스 임팩트 / 승리 골든 / 사망 흑백 |
| 튜토리얼 5/6/7 | 미구현 | 보상의 갈림길 / 전투의 흐름 / 영혼의 행로 |

PM이 직접 다른 작업을 지시하면 그것을 우선. **첫 응답은 0절 응답 템플릿 + 표 기반**, 산문체 X. **옵션 제시 전 반드시 코드 검증 — CLAUDE.md 단독 신뢰 X**.
