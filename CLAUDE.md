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
├── data/buried.js                # ★ 무덤의 유산 — BB 모티브 모드의 데이터+순수 로직 전부 (1.103.0, 1.104.0 확장)
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
    ├── buried/                   # ★ 무덤의 유산 (1.103.0) — 본편 컴포넌트와 완전 분리
    │   ├── BuriedScreen.jsx      #   로비 (캐릭터 생성·이어하기·유산 보관함·기록)
    │   ├── BuriedDungeonScreen.jsx #  층 진행 + 방 선택 + 상점·제단·부장품·야영
    │   ├── BuriedBattleScreen.jsx #  1:1 턴제 전투 (SP·상태이상 13종·직업 특성)
    │   ├── BuriedManage.jsx      #   장비 6슬롯 교체 + 능력치 배분 (로비·던전 공용)
    │   └── BuriedCommon.jsx      #   공통 표시 부품 (아이템 카드·상태 칩·바)
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
| 현재 게임 버전 | **1.247.0** (황혼 연대기 캐릭터·스킬 정보창 본편 스타일·전투 후 흐름) / **1.246.0** (황혼 연대기 대장간·첨탑·원정대 화면 정리) / **1.245.0** (황혼 연대기 장비·성장·스킬 정보창 정리) / **1.244.0** (황혼 연대기 사역마 화면 정리) / **1.243.0** (황혼 연대기 자령 고유 패시브·베이스 등급·도발 수정) / **1.242.0** (황혼 연대기 사역마 성장 비용 개편) / **1.241.0** (황혼 연대기 스킬별 쿨감 옵션·인연 2단계 안내) / **1.240.1** (황혼 연대기 스킬 쿨타임 표시) / **1.240.0** (황혼 연대기 첨탑 자동 등반) / **1.239.2** (황혼 연대기 적 공격 분담 통계) / **1.239.1** (황혼 연대기 집계 창 여는 순서) / **1.239.0** (황혼 연대기 경험치 바) / **1.238.0** (황혼 연대기 상세 전투 통계) / **1.237.3** (본편 구글 로그인 초기화 사고 수정 — 「☁ 본편 저장 안전」 절) / 1.237.2 (아르카나 클라우드 저장·연대기 자동 저장 30초) / 1.237.1 (황혼 연대기 클라우드 저장) / 1.237.0 (황혼 연대기 보스 공략 기믹 6종) / 1.236.1 (황혼 연대기 저장 보호·자동 백업·내보내기) / 1.236.0 (황혼 연대기 3마리 무리·적 역할·특성 동행 시너지) / 1.235.1 (황혼 연대기 사역마 역할 밸런스) / 1.235.0 (황혼 연대기 위압 — 레벨 차이 적 강화) / 1.234.1 (황혼 연대기 레벨 차이 경험치 감쇠·던전 경험치 정상화) / 1.234.0 (황혼 연대기 사냥터 자동 진행) / 1.233.1 (황혼 연대기 오프라인 경험치 제거·소환권 통합) / 1.233.0 (황혼 연대기 오프라인 보상·일일 임무) / 1.232.2 (황혼 연대기 마을 재구성·연출) / 1.232.1 (황혼 연대기 확인 창·로그 줄바꿈·첨탑 집계) / 1.232.0 (황혼 연대기 효율 미리보기) / 1.231.4 (황혼 연대기 세부 능력치 표시) / 1.231.3 (황혼 연대기 분당 효율·효율 기록 비교) / 1.231.2 (황혼 연대기 선택 분해·희귀 자동 분해) / 1.231.1 (황혼 연대기 원정대 레이드 마을 입구) / 1.231.0 (황혼 연대기 원정대 레이드 「다섯 봉인」) / 1.230.0 (황혼 연대기 원정대 의뢰) / 1.229.0 (황혼 연대기 원정대 레벨 상한·전역 버프) / 1.228.0 (황혼 연대기 사역마 보유 효과·인연) / 1.227.1 (황혼 연대기 치유 사역마 발동 조건) / 1.227.0 (황혼 연대기 전투 화면 개편) / 1.226.2 (황혼 연대기 보호막 상한) / 1.226.1 (황혼 연대기 기여도 회복·보호막·방어) / 1.226.0 (황혼 연대기 사역마 독립 능력치) / 1.225.1 (황혼 연대기 사역마 경험치 보정 폐지) / 1.225.0 (황혼 연대기 사역마 레벨·장비 착용 레벨) / 1.224.0 (황혼 연대기 특성 트리) / 1.223.0 (황혼 연대기 초기화·업데이트 버튼) / 1.222.0 (황혼 연대기 3부 「황혼 너머」) / 1.221.0 (황혼 연대기 전승 단계·전승 장비) / 1.220.0 (황혼 연대기 전승) / 1.219.0 (황혼 연대기 대장간 위험·레벨링 ×2) / 1.218.0 (황혼 연대기 사역마 고유 스킬) / 1.217.0 (황혼 연대기 가방 확장·등급별 분해·사역마 스킬 상세) / 1.216.0 (황혼 연대기 사역마 역할 3종·던전 밸런스) / 1.215.1 (황혼 연대기 던전 연속 도전·전투 집계·대장간 분류) / 1.215.0 (황혼 연대기 무한 탑) / 1.214.0 (황혼 연대기 2부 던전) / 1.213.1 (황혼 연대기 가방 정렬·장비 비교) / 1.213.0 (황혼 연대기 스테이지·사냥 보고서·×4 이용권) / 1.212.0 (황혼 연대기 사역마) / 1.211.0 (황혼 연대기 2부 「여명의 배신」) / 1.210.0 (황혼 연대기 2.0 솔로·직업 장비·유니크·공용 창고 — 「⚔ 황혼 연대기」 절) / 1.209.0 (던전 열쇠) / 1.208.0 (던전 확장·에픽 고유 옵션) / 1.207.0 (후반 스킬·마스터리·보스 일일 제한) / 1.206.0 (📜 퀘스트·이야기) / 1.205.0 (⚔ 세 번째 게임 황혼 연대기) / 1.204.0 (🃏 게임 선택 화면 + 트와일라잇 아르카나 — 「🃏」 절) / 이전 **1.121.0** (⚰ 무덤의 유산 시리즈: 1.103 신설 → 1.104 원작 확장 → 1.105 재련소 → 1.106 유니크 30+방벽 → 1.107 이벤트 방+접두어 → 1.108 저주 18종 → 1.109 조우 직업 3종 → 1.110 유니크 60종 완성 → 1.111 마의 계약 18종(출정 지참 2, 영구 소장) → 1.112 연구실 부품 16종+☠죽음의 조각(보스 드랍)+🌑재앙 소환(이벤트 방 게이지 5, 유니크 확정·같은 층 복귀·기울기 0.16 시뮬 검증) → 1.113 난이도 전면 개편(PM 지시 5건: **층 무한**(정복=구 최종층 보스 처치, 런 계속, buriedBossKeyAt 로테이션) / **레벨 스탯 3p·HP18 폐지**(성장 100% 장비, 레벨업=전액회복만) / **장비 레벨 Lv 표시+옵션도 레벨 배율**(확률형 ×2.2 상한) / **굴림 폭 0.75~1.20, 전설은 고정 굴림** / **인벤토리 폐지**(획득 즉시 교체/버리기 → 자동 분해, resolveBuriedLoot+BuriedLootModal, 구세이브 가방은 loadMeta에서 자동 분해). ⚠️ 무한층 밸런스 핵심: 드랍 장비 레벨=마물 레벨(파리티)이라 **depthPressurePerFloor(BURIED_TUNING)** 없으면 무한 스노볼. 1.114에서 복리 3% → **선형 1%/층** 재조정 — 복리는 100층 적 14배로 체크포인트(PM 지시)가 영원히 불가능했음. 현행: 100층 ×1.9 / 사망 중앙값 ~112-132층) → 1.114~1.116 던전 정체성 3부작(PM 지시 "던전은 난이도 아닌 정체성으로": **기믹 4종**(maze 선택지 3-4 / flood 도트 ×1.5·회복 -25% / chute HP 25% 지불 3층 낙하 / dark 적 수치 은폐 — dungeon.gimmick 필드, 전투는 gimmickId 분기) + **100층 체크포인트**(buriedCheckpointFloors, 시작 장비 = 마물 레벨 + 압력 보정 낡은 6종) + **던전 전용 유니크 16종**(BURIED_UNIQUES dungeon 필드, 심층 보스만·미보유 50% 우선) + **전용 부품 8종**(needDeep 100 해금) + **심층 직업 4종**(BURIED_DEPTH_CLASSES, 100층+ 보스 처치 해금) + **심층 특성 4종**(BURIED_DEPTH_TRAITS 150층 기록 해금, char.depthTraits로 생성 시 구움 — buriedTraitIds가 병합)) → 1.117 설명 팝업+계승 폐지+전면 점검(①상태·기믹·층·방 칩 탭 → BuriedInfoModal ②장비 계승 폐지: buriedDeathSettlement가 장착+대기 장비 전부 분해 → 먼지(레벨 반영), 골드 30%만 legacyGold — 보관함 UI·expandBuriedLegacy 삭제, 구세이브 보관함 loadMeta 자동 정산 ③감사 에이전트 2기 31건 중 30건 픽스 — 치명: 새로고침 도주(던전 마운트 시 char.room 전투면 강제 재전투)/재련소 레벨=층수 파워브레이크(buriedForgeLevel 마물 레벨 환산)/전설 tierWeightAt 유출/체크포인트 보정식 오산((압력-1)×기저배율/0.14)/int 기본기 침묵 무력화(stat 없으면 max(atk,fin,mag))/적 골드 미스케일(심층 경제 사망). ⚠️ 재발 방지 룰: 랜덤 롤·setState는 setMeta updater 밖(StrictMode 이중 실행), 알림은 buriedForgeNotice → 던전 화면 notice prop으로도 전달됨) → 1.118 SP 개편(패시브 회복 3+int/12 — 기본기·SP스킬이 주 엔진, 가동률 100%→50% 시뮬)+사망 골드 전액 소멸(legacyGold 신규 누적 중단) → 1.119 로비 허브+4단계 출정 위저드(BuriedScreen view state: home/wizard/forge/contracts/lab/records — 체크포인트 없으면 층 단계 자동 스킵)+전투 이펙트(index.css fx-b-* 7종: 슬래시/버스트/치명 링+펀치/셰이크/피격 비네트/회복 글로우 — pushFloat 부호 자동 트리거 + reduced-motion 가드, Playwright e2e 스크린샷 검증) → 1.120 적 풀 38종(신규 26 — dungeons 필드로 던전 전용 배정, buildBuriedRoomEnemy 필터)+층계 수문장(BURIED_GUARDIAN_KEYS 3종 로테이션, buriedBossKeyAt floor%100 우선, 재앙 HP 7배, 조각 8배+유니크 확정, 체크포인트는 격파(F+1 도달) 시 해금·재출발 F+1층)+난이도 계단(depthStep50 1.5·depthStep100 2 — 기존 선형과 곱, 100층 ×5.7/200층 ×26) → 1.121 심층 경제 재설계(⚠️ Lv.1532 사태 교훈: **압력을 장비 레벨로 환산 금지** — 레벨 인플레·드랍 무쓸모·방어 감쇠 붕괴 3연쇄. 현행: 장비 레벨=마물 레벨 고정, 압력은 buriedGearPower(=압력÷깊이격차 depthEdgePerFloor 0.008) **위력 배율(powerMult)**로 rollBuriedItem 스탯에만 — 시작·드랍·상점·부장품·협상·관·재련소·유니크 전 생성처 공유. 확률형 옵션은 powerMult 제외. 방어 감쇠 하한 defMult ≥0.25. 시뮬: 201층 재출발 드랍=시작 장비 149%·3합 버팀, 조직 런은 100층 수문장이 벽). **원전: docs/buried-reference.md** — PM 제공 나무위키 7문서 요약, 유니크 113·직업 70·저주 72 등 미이식 원전 포함. PM 승인 4패키지 전부 출시 완료) → 1.122 종족 시스템(BB2 모티브 — `BURIED_RACES` 10종: statMods 기본 스탯 가감 + fx(특성·계약과 동일 어휘, `buriedRaceFx`가 rf bag으로 buriedDerived·전투 병합). createBuriedChar 8번째 인자 raceId, 위저드 5단계(던전→층→종족→직업→최종), 구 캐릭터 raceId 없음 → 빈 fx 회귀 안전. PM 시트 업로드 완료 → 1.123 보정 완료) → 1.123 ᚱ룬 소켓(BB2 시트 이식 2탄 — `BURIED_RUNES` 16종 ★~★★★★, fx 어휘는 접두어(BURIED_MODS)와 100% 동일·`applyBuriedSkillFx` 공용 적용, `buriedModdedSkill(skill, modId, runeId)` 3인자 확장. 드랍: 전투 승리 일반6%/강적22%/보스40%/수문장·재앙100% → `result.rune` → App이 char.runes 주머니 적재. 각인: BuriedManage 룬 주머니 → `socketBuriedRune` 영구(제거 불가, 장비 버리면 소멸 — 도박 룰), 장비당 소켓 1칸(`item.rune`). + 종족 statMods 시트(種族Race) 정밀 보정 — 엘프 barrier15·하플링 int-4·용인 str5/vit2/dex-4·페어리 str-3·뱀파이어 dex형. ⚠️ BB2 시트 원본: /root/.claude/uploads .../a29e2e4d-*.xlsx — 22시트(스킬 421·몬스터 1181·계약 176·유니온·楔石·전설무구 등 미이식 원전 다수)) → 1.124 ☠엘리트 변형(BB2 시트 이식 3탄, PM 선택 — `BURIED_ELITE_MODS` 12종: 강적 방 적에 랜덤 접두어. 스탯 변형(hpMult/atkMult/defMult/extraHit/addApply)은 `applyBuriedEliteMod`가 생성 시점에 굽고(보상 ×1.4 포함), 판정 변형(immuneCrit/enrage/undying/critAdd/takenPct/barrierPct)은 전투가 enemy.eliteFx로 소비 — foe init 병합 + resolveBuriedAttack(def.immuneCrit·att.enrage) + eliteRevive(사망 체크 3곳 선행). buildBuriedRoomEnemy가 roomType 'elite'에서 항상 적용, 일반·보스는 무변형) → 1.125 경제 개편(PM 지시 3건 — ①강화 폐지: buriedEnhanceMult 삭제·구 +N 장비 배율 무효, ②골드 용처 신설: 제단 봉헌 3종(BURIED_ALTAR_BOONS — 수호 carryBarrier/축복 pendingStatuses/정화 저주 해제, 제단당 1회·깊이 비례 비용) + 상점 리롤(buriedShopRerollCost 반복 2배), ③재련소 400먼지·유물 8%·랜덤 60 + 수입 너프 BURIED_TUNING.goldEarnMult 0.7/dustEarnMult 0.65 — 재화 체감 조정은 이 두 상수) → 1.126 스킬 풀 확장(BB2 스킬 시트 이식 4탄 — BURIED_SKILLS 49→79종: 10개 라인 ×2 + 공용 10. 기존 필드 어휘만 사용(신규 메커니즘 0) — 전투·룬·접두어·스킬레벨 파이프라인 코드 변경 0줄. gear 이름 유일성 필수(장비명 생성)) → 1.127 ⚔전설무구 20종(BB2 전설무구 시트 이식 5탄 — BURIED_UNIQUES 76→96: **선언형 fx bag 신설** `buriedUniqueFx`(uf) — fx 필드 있는 유니크만 합산, buriedDerived + 전투 소비 5곳(statusChance/statusResist/gold/exp/luck/takenPct) 병합. 구 유니크 76종은 fx 없음 → 기존 uq() 분기 그대로 회귀 0. rune/mod 필드로 **룬 내장 드랍** (rollBuriedUniqueItem 프리셋). 신규 유니크는 이제 분기 코드 없이 fx 데이터만으로 추가 가능) → 1.128 ⚓쐐기석(BB2 楔石 이식 6탄, PM 결정 3건: 정복 던전만 개방·재화 +12%/P + 드랍 운 P÷3·최대 3개 — `BURIED_KEYSTONES` 12종(★1~3) + `buriedKeystoneFx`(kf bag)/`buriedKeystoneBonus`. createBuriedChar 9번째 인자 keystones(생성 시 구움), 위저드 6단계(직업 다음 쐐기석 — 미정복 던전 스킵). 소비: noDodge=buriedEffDodge/noCrit=resolveBuriedAttack/noAcc=derived·EquippedSkills·UniqueIds 3축/takenPct·noBarrier·startConfuse·cdAdd·noPotion·noHeal·darkAll=전투/noCampHeal=던전 rest·shrineHeal. 먼지 보너스는 buriedDeathSettlement·resolveBuriedLoot) → 1.129 📦보급 계약(BB2 契約 이식 7탄 — BURIED_CONTRACTS 18→28: supply 필드 {potions/gold/rune:[min,max]/item:tier/skillLv} — createBuriedChar 말미에서 지참분 지급(파리티 floor·powerMult), fx는 빈 객체라 aggregateBuriedContracts 오염 0. rollBuriedRuneIn(minRar,maxRar) 헬퍼 신설) → 1.130 👹몬스터 38→57(BB2 몬스터 시트 이식 8탄 — 신규 19종(공용 7 + 던전 전용 12, 일러 재사용) + **내성 축**: 적 필드 physTakenPct/magTakenPct(음수=내성)·fullGuardPct(전쾌시 방어)·startBarrier(실드형, buriedEnemyAtLevel이 m 스케일)·dodge/crit 개별치 — resolveBuriedAttack def-side 판정(기본기는 최고 스탯으로 물리/마법 라우팅), foe init 복사, 전투 시작 로그 내성 힌트(darkBlind 시 은폐). 시트 잔여 0) → 1.131 🌾출신 8종(BB2 出自 이식 9탄 — **시리즈 완주**. BURIED_ORIGINS: statMods+fx+startGold, PM 결정 「종족 화면 하단 통합」으로 위저드 6단계 유지. `buriedRaceFx`가 종족+출신을 하나의 rf bag으로 합산(hpMult 곱산) — 소비 지점 추가 0, rf.def만 derived def 라인에 신규 합산. createBuriedChar 10번째 인자 originId. 생성 3축 = 직업 17 × 종족 10 × 출신 8 = 1,360 조합 → 1.131.1 이력 초기화(storage.resetBuried — meta.buried만 EMPTY_BURIED 교체, 기록 화면 위험 구역 2단 확인. 클라우드는 lastSavedAt 최신 우선 전체 교체라 초기화 유지됨) → 1.132 ⛓스킬 사용 횟수(PM 지시 4건 — ①야영 무한 휴식 픽스: roomData.rested 방당 1회 ②스킬 레벨 종류별 재설계: buriedSkillAt kind 분기(공격 +8%/Lv·상태이상 스택·회복 +10%/Lv·SP +8%/Lv) ③BURIED_SKILL_USES D30/C22/B15/A10 ×(1+Lv×8%) — 잔여 = max - item.usesSpent(구세이브 undefined=만충), 소진 시 스킬만 봉인. 전투 spentMap state → result.usesSpent → App 정산 ④충전 3종: 야영 30%(rechargeBuriedUses)+봉헌 보충(만충 130골드)+상점 정비(만충·상점당 1회). ⚠️ 밸런스는 BURIED_SKILL_USES 한 곳) → 1.133 단품 충전+%전설 → 1.134 ⛓장비 파손+이벤트 기록 → 1.135 📜계약 이중 게이트(비용 누진 60×n + 보유 한도 진행도 연동) → 1.136 ⚡신속(PM 지시 "버프 쓰면 한 턴 날린다" — **power·heal 없고 SP 순증 아닌 순수 버프·디버프 22종 턴 미소모**, 물약처럼 턴당 1회(swiftUsedThisTurn). `swift` 필드는 BURIED_SKILLS 정의 직후 자동 파생 루프 — 신규 스킬도 규칙만 지키면 자동. 회복·집중·관찰은 제외(회복 루프·SP 붕괴 방지), 혼란 실패 시엔 턴 소모. 신속 사용 후 같은 턴 round-end가 나중에 오므로 cd+1 부기 그대로 정합. 1.136.1 「⚡신속」 전용 배지 — skillKindMeta가 swift 최우선 판정) → 1.137 ⚔유니크 원전 완성(BB1 도감 [1]~[113] 113종 완성 — 잔여 53종 이식: fx 선언형 21 + 전투 분기 29 + 던전 분기 3(변모 pendingStatuses·건강한 잠 야영 2배·한달음 stepBuriedChar 걸음 50%). 효과 기록 없던 15종은 오리지널 각색(src 번호 유지). 총 149종 = u113 + 던전 전용 16 + 전설무구 lg20. ✅ BB 원전은 **구글 드라이브 「내 드라이브/buried bornes」 폴더 상주** (BB2 공식 xlsx 22시트 + BB1 나무위키 mhtml 6건) — Google Drive MCP search_files로 접근, 세션 소실 문제 해결) → 1.138 스킬 2차(BB2 스킬 시트 79→119종: 라인당 +2 + 공용 +20. **⚡신속 공격기 5종**(잽·수리검 투척·서든 거스트·퀵 샷·베놈 샷) — 원전 Quick 플래그 정합, 공격 스킬 명시 `swift: true`(자동 파생과 별개). 원전 P(선제발동)는 플레이어 상시 선공이라 미이식. ⚠️ BURIED_SKILLS는 객체라 **id 충돌 시 조용히 덮어씀** — 신규 스킬 추가 후 반드시 node로 id·gear·name 중복 검증) → 1.139 몬스터 2차(BB2 몬스터 시트 57→80종: 공용 11 + 던전 전용 12, 내성 축 적극 활용 — 물리 벽·마법 내성·회피형·실드형) → 1.140 전설무구 2차(伝説の武具 시트 lg21~lg40 — 전부 선언형 fx, 룬 내장 6종. lg7 「그람」→「그람의 파편」 동명 정리. 유니크 총 169종) → 1.141 🏛조직(BB2 유니온 솔로 각색, PM 결정 「평판형·직업/종족 해금 포함」 — `BURIED_UNIONS` 4개(던전 1:1) + `meta.buried.unionRep/unlockedRaces` + `addBuriedUnionRep`(레벨 도달 보상 원자 지급: Lv5 전속 종족·Lv7 전속 직업) + App 승리 정산 훅(BURIED_UNION_REP_GAIN). 전속 직업 4종 `BURIED_UNION_CLASSES`(buriedAllClasses 포함)·전속 종족 4종(BURIED_RACES에 union 필드 → 위저드 게이트). 원전 오더(일일 공동 퀘스트)는 솔로에 무의미해 폐기) → 1.142 📜계약 2차(28→58종: 일반 10 + 보급 8 + **조직 상급 12**(union/unionLv 필드 — rollBuriedContract 2번째 인자 unionRep로 게이트, 미도달은 풀 제외). buriedContractCap에 조직 평판 Lv4/Lv8당 +4 — 전종 58 = 4정복+200층+전조직 만렙) → 1.143 🕳500층 엔드콘텐츠(PM 결정 「전부+인장 도입」 — **대역 5개** BURIED_ZONES(100층 단위 테마·보상 +10~50%, buriedZoneAt) + **수문장 5종 고정 배치**(로테이션 폐지, 400 태초의 포식자·500 묘주 신규, buriedBossKeyAt clamp — 600+는 묘주 반복) + **🗝수문장의 인장** BURIED_SIGILS(관문 첫 격파당 계정 영구 +8%/-4%, meta.buried.gateSigils + char.sigils — 생성 시 굽고 런 중 획득도 즉시 반영, 전투 envDmgPct/envTakenPct 소비) + **👑묘주 첫 격파**(apexClears + 「묘주의 관」 tomb1 — dungeon:'apex'로 풀 격리, rollBuriedUniqueItem forceId 확정 지급). 시뮬: 500층 격차 ×5.0 → 인장 5개 실효 ×2.86) → 1.144 🕯괴이 사역(괴력난신 원혼 설정, PM 5차 승인 — 상세 설계는 docs/pet-system-design.md. **BURIED_GHOSTS 26종**(기존 적 일러 재사용, 등급 5: 적/녹/청/남/자 — 자령 = 수문장·묘주) + **제령부**(rollBuriedTalisman: 보스 10% 고정·버프 무관·등급 60/25/9/5/1·상한 초과 먼지·**char.talismans 런 한정**) + **제령 행동**(전투 kind 'tame': HP≤25% + 부적, buriedTameChance = 기본치+(25−HP%)×0.5. 실패 = 소진+턴+[격노]3+전투 잠금) + **동행 1체**(meta.buried.ghosts/companion → char.ghost 생성 시 굽기. 패시브는 aggregateBuriedContracts에 병합 — 소비 지점 공짜, 단 takenPct만 전투 envTakenPct에 cf 라인 추가) + **턴 종료 자동 액티브**(적 행동보다 우선, ghostCd state) + **한계돌파**(동행 동일 개체 재제령, buriedGhostKit: %형 ×(1+0.2b)·스택 +1/돌파·수치형 +5) + 로비 「사역각」. ⚠️ 밸런스는 BURIED_GHOST_RANKS 한 곳)) / 이전 **1.90.0** (1.79~1.81 레이드 백그라운드·자동 사냥 확장 → 1.82 각성 스킬 15종 → 1.83~1.84 자동 전적·업적 롤백 픽스 → 1.85 도박장 → 1.86~1.87 레이드 난이도·초월 → 1.88 Wake Lock → 1.89 마스터즈+칭호 → **1.90.0 업적 전면 개편**: 죽은 업적 11개 부활·리뉴얼 + 신규 콘텐츠 업적 20개) |
| **PR 머지 정책** | PM 상시 승인 (1.90.0 세션): **PR 생성 후 자동 머지** — 별도 확인 없이 진행 |
| **다음 세션 브랜치 전략** | 다음 PR은 **`git fetch origin main` + `git checkout -B <새브랜치> origin/main`**으로 최신 main에서 분기 |

### ⚰ 무덤의 유산 2.0 개편 시리즈 (1.169.1~, PM 결정 — 순서대로 PR 분리)

| 순서 | 항목 | PM 결정 | 상태 |
|---|---|---|---|
| 0 | 드랍 운 재설계 | 등급 가중을 레벨과 분리한 배율(`BURIED_LUCK_TIER_PCT`) + 유니크 확률 +1%p/운(상한 2배, 캐릭터 출처 운만) | ✅ 1.169.1 |
| ⑤ | 능력치 단순화 | **핵심 6개**(공격력·HP·방어·치명·회피·SP회복). 4스탯 표시 폐지 — 직업 기본 스탯은 기본치 환산(Lv1 불변), 그 외 포인트는 `BURIED_STAT_PT` % 보정. 공격력 1종 통합(atk=fin, mag는 마법%만 다름). 옵션 풀 15→6 (수치 폭 축소로 전투력 ±5%) | ✅ 1.170.0 |
| ④ | 스킬 구조 | **수동 2 + 자동 4** — 쿨다운 자동 순환(PM 결정: SP 무료·횟수 무제한). `BURIED_AUTO_POOLS`(투구 매 턴 / 갑옷 피격 후 / 장신구 공격 후) + 전투 `act(..., {auto:true})`가 신속 경로처럼 턴 미소모. 발동은 turnNo effect가 내 턴 시작에 슬롯 순서대로 1개씩 | ✅ 1.171.0 |
| ③ | 내구도 | **전투당 D8/C5/B3/A2회** (`BURIED_SKILL_USES`, 매 전투 리셋 — 전투 `spentMap`만 차감, App은 `item.usesSpent` 누적 중단). 마모(`BURIED_WEAR_PCT`=0)·파손(`isBuriedSlotDepleted`=false) 폐지. 보급의 봉헌 = 다음 전투 +2, 야영 = +1 (`char.bonusUses`, 전투 승리 정산에서 0으로 소비) | ✅ 1.172.0 |
| ①② | 추가 | ✅ 자동 전투+배속 1.174.0 (전투 화면 `autoBattle`·`speed` localStorage, 모듈 `BATTLE_SPEED`가 wait 압축, 자동 행동은 자동 슬롯 발동 완료 후 380ms 타이머 — busy 변화 시 cleanup으로 이중 행동 방지) / ✅ 획득 자동 규칙 1.175.0 (`buriedLootAutoTrash` 순수 함수 + 던전 화면 effect, 유니크 제외, 설정 localStorage) / ✅ 빌드 시너지 태그 1.176.0 (`BURIED_SYNERGY_TAGS` 5종 — 스킬 데이터에서 match로 자동 판정, `buriedSynergy(char).fx`를 `aggregateBuriedContracts`에 병합 → 전투 코드 0줄. 보너스 키는 cf 소비 어휘만 사용) | ✅ 시리즈 완료 |

⚠️ 1.176.1 시즌 결산: App `buildBuriedSeasonSummary`는 랭킹 화면과 **같은 입력**(myRuns + myLive)을 써야 한다 — 어긋나면 화면 순위 ≠ 보상 순위. 남령 보상은 `pickRandomBuriedGhost('indigo', owned)`. 사과 보상 플래그 `seasonComp1177`(계정당 1회).

⚠️ 1.175.0 교훈: `BuriedDungeonScreen`은 `if (!char) return null` 조기 반환이 있다 — **신규 훅은 반드시 그 위에** 두고, effect 안에서 char 확인 후에만 아래 함수를 호출할 것.
| + | 방 무작위화 | PM 지시 「방은 랜덤, 이벤트 결과만 고른다」 — `pickBuriedDoor`(전투 최소 `BURIED_DOOR_BATTLE_PCT` 45%, 나머지 균등, chute 제외) + `char.door`{floor,idx,seen,rerolls}로 결과 고정. 미궁 기믹·길잡이·dl1은 「다른 문 찾기」(`buriedDoorRerolls`)로 전환 | ✅ 1.173.0 |
| + | 방 자동 진입 | PM 지시 「2단계 번거롭다」 — 던전 화면 `autoEnter` effect(키 floor:steps, pendingLoot·재앙 게이지 시 정지)가 층 도착 즉시 진입. 리롤은 방 안 `rerollRoom`(door.fresh = 진입 직후 roomData JSON과 같을 때만). 재앙 거절은 `char.calamityDeclined = floor` | ✅ 1.173.1 |

⚠️ 1.170.0 주의: `char.stats` 저장 구조는 그대로(해석만 변경). 새 포인트 지급처를 만들면 문구는 `buriedStatGainText(k, n)` 사용. 기본 공격 물리/마법 판정은 동률 시 `att.mainMag`(직업 주 속성).

### 🌀 회귀의 탐험가 (「무림귀환」 운용 방식 모티브 — 판타지 탐험으로 각색, PM 확정)

| 항목 | 내용 |
|---|---|
| 설계서 | `docs/regression-exploration-mode-design.md` (PR #271) — PM 확정: **40일** · **본편 메타 강화(각인·각성도) 미적용**(engravingFx={}) · 전투·UI는 **본편 CombatScreen 등 오리지널 재사용** |
| MVP 1차 ✅ | `src/data/regression.js` 데이터+순수 로직 (지역 4 = 클래식 챕터 1~4 재사용 · 기록 18종 · 기억 조각 10종 · 첨탑 4연전) + `scripts/sim-regression.mjs` 시뮬. `FEATURE_FLAGS.regression=false` — 진입점 없음, 사용자 비노출(버전 미변경) |
| 시뮬 기준 | 1생 첨탑 자격 ~24% → 2생 ~97% / 첫 정복 중앙값 3생 / 생당 기록 6~8종. 밸런스는 `REGRESSION_TUNING` 한 곳 |
| MVP 2차 ✅ (1.177.0) | `components/regression/RegressionGame.jsx` (로비·날짜 허브·기록서·회귀 정산) + 본편 `CombatScreen` 재사용 — 신규 prop `enemyOverride`(ENEMIES에 없는 적, `buildInitialEnemy`도 동일) + `observationsRef`(적 행동 [{heavy,countered}] → onVictory 3번째 인자·onDefeat 1번째 인자 `observations`). 저장 `meta.regression`(`getRegression`, 진행 중 생 = `.run`, 전투 중 새로고침 = `run.pending`/`spireRound`로 재전투). 전투 meta는 `upgrades:{}`로 제단 미적용. 타이틀 메뉴 「회귀의 탐험가」 |
| MVP 3-1 ✅ (1.178.0) | PM 결정: **출전 준비 → 자동 전투(개입 불가)**. CombatScreen 신규 prop `spectate`(수동 버튼 4종 onClick 차단, AI는 같은 핸들러 직접 호출). 출전 준비 = 적 미리보기 + 본편 `PrepScreen`(패시브·유물 2칸) + 포션 벨트(`CLASS_BELT.max`). 랜덤 획득 `rollRegressionLoot`(유물 풀 = 전투 효과 키만 `REGRESSION_RELIC_POOL` / 패시브 풀 강타 제외 / 포션). 밸런스 = `REGRESSION_TUNING.regionEnemyMult`(expedition 배율로 전달) + `classFx`(직업별 engravingFx, 현재 비어 있음). ⚠️ 실측 도구: Playwright 봇으로 생 단위 자동 진행 — 사제는 보정(회복 -75%·피해 +35%)에도 매 전투 HP ~95% 유지로 1생 정복 → PM 결정 대기 |
| 1.178.1 상처 규칙 ✅ | PM 결정(사제 독주 해소): 전투 후 HP = 전투 전 HP − 받은 피해 × `woundPct` 0.6 (첨탑 `spireWoundPct` 0.8). 전투 중 회복은 이월 안 됨. CombatScreen `damageTakenRef`(player.hp 감소분 누적 effect) → onVictory 3번째 인자 `damageTaken`. 봇 실측: 사제 1생 정복 → 2생 정복 / 검사·술법사·마족 3생 내 미정복 |
| MVP 3-2 ✅ (1.179.0) | `REGRESSION_COMPANIONS` 4명(지역 1:1, 호감 0~100 · 동행 40 / 맹약 100, `perks` 선언형 → `aggregateRegressionCompanions` 한 곳에서 합산: 수비 패시브·restHealPct·spireRestPct·potionCap·recordBonusPct·spireWeakness·goldPct·famePerWin·spireWoundCut) + `REGRESSION_EVENTS` 24개(본편 EventScreen 스키마, 모드 전용 reward: fame/affinity/record/heal_pct/combat — ⚠️ 본편 EventScreen은 판정 없는 선택지의 `combat`을 전달하지 않으므로 `reward:{type:'combat',name,bonus}`로 표현, `requireMemory`로 기억 조각 선택지) + `REGRESSION_SHOP`(마을, 0일) + 엔딩 5종(`regressionEndingFor` — 맹약 동료 엔딩 우선). 사건 진행 중 = `run.pendingEvent`, 사건 전투 = `pending.fromEvent`(날짜 미소모) |
| 1.180.0 이야기 화면 ✅ | PM 결정(무림귀환 스크린샷 「이런 스타일」 — 구글 드라이브 폴더 17c7SGUm… 스크린샷 5장): 허브 → **이야기 화면**(지역 서술 `regressionNarration` → `>` 선택지 → 결과 장면 `run.scene`{title,text,tags} → 「다음」). 상단 목표 바 `regressionFameStage`(명성 4단계 n/4). 사건은 EventScreen 대신 인라인(`resolveRegressionChoice` + `regressionCheckChance`/`regressionChanceLabel` 성공 가능성 라벨). 적 등급 `regressionEnemyLabel`([하급]/[상급]/[군주]). 전투 결과·대화(`regressionCompanionLine`)·야영·구매 모두 결과 장면 |
| 2.0 시리즈 | 설계서 `docs/regression-v2-design.md` (PR #279). PM 확정: **전투 = 시안 2(본편 전투 화면 스타일)** — 단, 본편 CombatScreen을 개조하지 않고 **회귀 전용 전투 컴포넌트**로 만든다(본편 회귀 위험 0) · 능력치 10종 승인 · 직업 = 초상화+프리셋 · 전투 태세 넣음 · 기존 시스템 연결 |
| 2.0 PR A ✅ (1.181.0) | 능력치 10종(키 = 한글 이름 `REGRESSION_STATS`, run.stats) · 시작 커스텀 12포인트/상한 5(`REGRESSION_PRESETS` 직업별) · 경험치·레벨(`gainRegressionExp`, `REGRESSION_EXP`, 레벨당 statPoints +1) · 판정 공식 `능력치×2 + d6 ≥ DC − 9`(`REGRESSION_DC_OFFSET`) · 명성 경로 `run.fameBy`/`regressionFamePath`. PR B 전까지 `regressionLegacyCombatStats`로 본편 CombatScreen에 환산 |
| 2.0 PR B ✅ (1.182.0) | `src/data/regressionCombat.js` — **순수 전투 시뮬** `simulateRegressionCombat`(rng 주입 → 사건 목록) + `REGRESSION_SKILLS`(일반 12/고급 8/기연 6, trigger·effect·scale 선언형) + `REGRESSION_STANCES`(평상/투지/연소/돌파, `run.flames` 3) + 밸런스 `REGRESSION_COMBAT` 한 곳(지역별 enemyHp/enemyDmg). 화면 `components/regression/RegressionBattle.jsx`(시안 2 — 준비: 태세·스킬·벨트 / 재생: 적·로그·주인공·스킬 카드·컷인). 본편 CombatScreen 미사용. 모드 HP 기준 100(+강인×12+레벨×6). 시작 커스텀에 일반 스킬 3개 선택(`run.skills`, 구세이브 = `REGRESSION_SKILL_PRESETS`). ⚠️ node 실측: 사제·혼혈 마족(강인·회복)이 첨탑에 강하고 술법사가 약함 → PR D 봇 실측으로 직업 간 보정 |
| 2.0 PR C ✅ (1.183.0) | 스킬 습득 개연성 — `REGRESSION_LEARN`(밸런스 한 곳: 등급 기본률 normal .85/advanced .7/fortune .55 · 적성 하한 .05 · 학식 +1%p · (스킬 상한은 1.184.0에서 폐지) · 기회 확률 normal .12/elite .6/boss 1). 적성 `regressionSkillAptitude` = 관련 능력치 평균 ÷ 내 최고 능력치, 성공률 `regressionLearnChance` = 기본률×(하한+(1−하한)×적성²)+학식. 승리 후 `offerRegressionLearn` → `run.pendingLearn`{skillId,source,from} → 이야기 화면 습득 카드 → `resolveRegressionLearn`(날짜 미소모, 실패 = 기회 소멸·빌드별 실패 서술). 기연 사건 6종(이벤트 `fortune` 필드 + reward `{type:'learn',name}`) · 사건 빌드 가중 `regressionEventWeight` · 판정 경험치 `regressionCheckExp`(DC 15부터 +3) · 판정 덤 회복약 10%. ⚠️ 첨탑 전투 게이트는 `inSpire && !run.scene && !run.pendingLearn` — 층 사이 결과 장면·기연 카드가 먼저 나온다. 유니크 장비 적성 판정은 PR D(장비)에서 같은 함수 재사용 |
| 2.0 PR D ✅ (1.184.0) | 장비 3칸 `REGRESSION_GEAR`(일반·고급·보물 27 + 유니크 6, stats/fx/rel) · `run.gear`{weapon,armor,accessory} + `run.bag` · **실효 능력치 `regressionEffectiveStats` = 기본 + statBonus + 장비** (전투·판정·적성·최대 HP 모두 이것 — 능력치 배분만 `regressionRunStats` 기본값) · 유니크 = 강적 8% `offerRegressionUnique` → `run.pendingGear` → `resolveRegressionUnique`(스킬과 같은 적성 공식, 기본률 .6) · 상점 `run.shop`{offers,resets} 마을 도착마다 `buildRegressionShopStock`, 리셋 1회, 스킬 교습비 = 기본가×(1+(1−적성)×1.5) 확정 습득 · 경제 `REGRESSION_ECON` 한 곳(은화 ×0.5, 드랍 장비 8%/35%, 유물·패시브 드랍 폐지) · 직업 밸런스 `REGRESSION_COMBAT.weaponMult`{검술 2.0, 사격 1.8, 마법 2.2, 신성 1.3}·`lorePower` .04(학식 스킬 위력)·강인 HP 10/방어 .6 — 첨탑 Lv9 생명 연소 정복률 56~95%. PM 결정: **스킬 수 제한 없음** |
| 1.185.0 하루 랜덤 ✅ | (1.186.0에서 60일·지역 15일로 변경) PM 결정: **매일 행동 메뉴 폐지 → 「오늘의 일」 카드 1장 완전 랜덤**(그 카드의 선택지만 고름) · **지역은 날짜로 자동 진행**(`regressionRegionForDay`, 10일 단위, 이동 메뉴 폐지) · 밸런스 `REGRESSION_DAY` 한 곳(카드 가중 battle 32/elite 12/event 26/companion 9/merchant 7/shelter 10 + fortune = 4 + 0.55×(D−1) + 기억 보너스 · `enemyRamp` .012/일 → `regressionEnemyCombatant` 4번째 인자 dayMult · 아침 자연 회복 10% · 단련 25). `rollRegressionDay`가 `run.today`{kind,…} 또는 `pendingEvent` 또는 지역 전환 scene을 만든다 — RegressionGame `needRoll` effect(렌더 밖 1회, 새로고침 안전). 일반 사건 풀과 기연 사건 풀 분리(`rollRegressionEvent` fortune 옵션), 지역 기연 소진 시 떠도는 은자(`hermit`). 상점 = 떠돌이 상인 카드(만날 때마다 진열). 경험치·명성 상향. ⚠️ 시뮬 `scratchpad/lifesim.mjs`(봇 한 생 전체) — 1생 정복 8~23% / 사망 30~61% / 명성미달 27~47% |
| 1.186.0 스토리 엔딩 ✅ | PM 결정: **60일(지역당 15일)** + **메인 스토리 5편**(`REGRESSION_MAIN_STORY` — 지역 8일째 + 마지막 날 `eve`, `regressionMainStoryFor`가 `rollRegressionDay` 맨 앞에서 확정 등장) · **성향 3갈래** `run.traits`{truth,power,bond}(choice.trait/traitValue + success.traitBonus, `resolveRegressionChoice` → res.trait → `applyRegressionEvent` 가산) · `choice.requireTrait`·`choice.flag`(→ `run.storyFlags`) · 선택지 표시 `regressionChoiceVisible` · 사건 조회는 `regressionEventById`(일반 사건 + 메인 스토리) · **엔딩** `regressionEndingFor` = 사망 null / spireLose·timeout 패배 엔딩 / 정복 시 `regressionTopTrait`(동점 = 기울지 않음): truth+breakLoop → 회귀의 끝, truth → 진실의 기록자, power → 황혼의 계승자, bond+맹약 → 동료 엔딩, 그 외 황혼을 끊은 자. 난이도: 첨탑 명성 140(단계 35씩) · enemyRamp .015 · fortune perDay .37 — 시뮬 1생 정복 14~25% |
| 1.187.0 시작 특성 ✅ | 원작 「생환·노잣돈·시작 무공」 각색 — `REGRESSION_START_TRAITS` 6종(fx 선언형) + `REGRESSION_TRAIT_TUNING`(슬롯 2 · 생환 HP 30% · 잔향 공식). 재화 **잔향** `meta.regression.echo` = `regressionEchoGain`(settle 시 가산, `echoGain` 반환) · `unlockedTraits`(영구 해금)·`equippedTraits`(다음 생 지참, 최대 2) — `unlockRegressionStartTrait`/`toggleRegressionStartTrait`. `createRegressionRun` 5번째 인자 startTraits → `applyRegressionStartTraits`(gold·fortuneBonus·affinity·revives). 시작 커스텀 포인트/스킬 수는 UI가 `aggregateRegressionStartTraits`로 가산. 생환 = `applyRegressionCombat` 패배 시 `run.revives` 차감 + `revivedNow` 플래그(UI가 장면 만들고 제거) |
| 1.188.0 패시브 폐지 ✅ | PM 결정: **패시브 → 능력치**. 기록 보상 type `'stat'`{id: 능력치, n} · 동료 perks `stats` · 구 `bonusSkills`는 `REGRESSION_LEGACY_PASSIVE_STAT`로 환산 — 전부 `regressionStatSources(run)`(사건·장비·기록서·동료·이전 패시브) → `regressionEffectiveStats`가 합산. UI의 「패시브 Lv×공격 2%」 숨은 환산 삭제. 스킬 정보 시트 `components/regression/RegressionSkillInfo.jsx`(능력치 창·전투 준비·전투 카드 공용, 위력 계산식 `regressionSkillPowerLines`). 상인 장비 판매 `sellRegressionGear`/`regressionSellableGear`(장착분 제외, `REGRESSION_SELL_PRICE`). ⚠️ `BottomSheet`의 닫기는 손잡이뿐이라 모드 시트엔 하단 「닫기」 버튼을 직접 둔다 |
| 1.188.1 상인 창 유지 ✅ | 구매·판매 시 창을 닫지 않음 — `shopLog` state(이번 방문 거래)·`leaveMerchant`(창 닫기 + `passRegressionDay` + 거래 내역 태그 장면). 「잠시 닫기」는 날짜 미소모 |
| 1.189.0 스킬 컷인 ✅ | PM 요청: 스킬 발동 시 화면 전체 스킬명 + 등급별 화려함 차등 — `components/regression/RegressionSkillCutin.jsx` + index.css `rg-cut-*`(일반 띠·고급 청색 섬광·광선·약흔들림·기연 방사광·링 2겹·불꽃 입자·금빛 그라데이션·강흔들림, reduced-motion 가드). 길이 `REGRESSION_CUTIN_MS`{normal 1100, advanced 1450, fortune 2000} ÷ 배속 — 재생 타이머 skill 이벤트도 같은 값. speed ≥100(스킵)은 미표시. ⚠️ 중앙 정렬은 `.rg-cut-center` 절대 flex 래퍼(루트 grid 정렬은 transform 흔들림 때 깨짐) |
| 1.190.0 난이도·동료 ✅ | PM 결정 3건: ①전투 전체 상향 — `REGRESSION_COMBAT.enemyHp`{1:1.15,2:1.05,3:.9,4:.82,spire:1.3}·`enemyDmg`{1:1.2,2:1,3:.8,4:.72,spire:1.15}·신설 `tierMult`(하급 hp 1.05/dmg 1.15) ②첨탑 진입 대비 정복 30~40% ③동료 「동행(40)이면 따라옴」 — `regressionCompanionFollowers`/`regressionCompanionCandidates`(동료 카드 후보 = 지역 동료 + 따라오는 동료, 가중 +`REGRESSION_DAY.followerWeight`/명) + 효과 강화(perks에 dmgDealt/dmgTaken/critRate/dailyHealPct) → 전투 보정은 `regressionCombatBonus(run)`(장비 fx + 동료). 시뮬(조심스러운 봇 `scratchpad/diag3.mjs`): 하급 승 93~98%·HP 28~49% 소모 / 강적 78~91% / 첨탑 진입 대비 32% / 맹약 발터 36%·세레나 10%·오렌 4%·니아 1% (늦게 만나는 동료일수록 어려움). ⚠️ 봇 1생 정복 0~10%(정령사 1% — 직업 격차 후속 검토) |
| 1.191.0 잔향 소비처 ✅ | PM 지적 「잔향이 남는다」(한 생 평균 17 · 특성 전부 152 → 약 9생 뒤 쓸모 0) → PM 결정 A+B: **특성 Lv.1~5**(`REGRESSION_START_TRAITS[].fxAt(lv)`/`desc(lv)`, `meta.regression.traitLv`, 구세이브 unlockedTraits → Lv.1 `regressionTraitLevel`, 강화 비용 = cost × `upgradeMult`[1,1.5,2,2.5]) + **슬롯 확장**(`traitSlotsBought`, `slotCosts` 120/300, `regressionTraitSlots`) + **출발 준비물** `REGRESSION_PROVISIONS` 5종(createRegressionRun 6번째 인자 → `applyRegressionProvisions`, 잔향 차감은 UI onSave 패치 `echo`). 소비처 합계 1,636 + 매 생 준비물 |
| 1.191.1 전투 전 속도 ✅ | PM 요청 — RegressionBattle 준비 화면에 「⏱ 전투 속도」 버튼 줄(props `speedOptions`/`onSetSpeed`, RegressionGame `setSpeed`가 localStorage `regressionSpeed` 저장). 재생 중 배속 버튼은 그대로 |
| 1.191.2 방어 표시 ✅ | PM 요청 「방어·방어막 식별」 — `simulateRegressionCombat`의 `ev.push`가 모든 사건에 `ps`(내 보호막)·`gd`(막기 준비)·`ed`(적 방어)를 붙이고, 피격 사건에 `absorbed`/`guarded`, 내 공격에 `blocked`. RegressionBattle: 색 `RG_SHIELD`(하늘)·`RG_DEF`(강철)·`RG_GUARD`(보라) — 그림 테두리 링·상태 칩·HP 바 보호막 구간·떠오르는 내역 숫자·하늘색 로그. ⚠️ 방어 상태는 `last`(마지막 사건) 기준 — `lastState`는 HP 있는 사건만이라 방어 행동이 늦게 반영됨 |
| 1.192.0 스킬 레벨 ✅ | PM 결정: **같은 스킬 재습득 = Lv+1 (최대 5)** — `run.skillLv`{id: lv}(없으면 Lv.1), `addRegressionSkill`(신규/승급 공용 — 습득·상점·기연 전부 이것), `canRegressionSkillGrow`(습득 기회·상점·은자 후보 필터 — 만렙만 제외). 밸런스 `REGRESSION_SKILL_LV` 한 곳(위력 +15%/Lv·버프 +5%p·부활 +5%p·막기 +10%p). 재습득 성공률 +`REGRESSION_LEARN.upgradeBonus` .1, 교습비 현재 Lv당 +40%. 비전서 fx `startSkillLvUps`(Lv.2 1개·Lv.4 2개 → 고른 순서 앞부터 Lv.2). 전투 `regressionPlayerCombatant({skillLv})` |
| 1.193.0 기연 20종 ✅ | PM 결정 「능력치당 2개」 — `REGRESSION_SKILLS` fortune 20종(첫 scale 능력치 = 대표 능력치, 10종 × 2) + 기연 사건 20개 전부 **`region: 0`(어느 지역에서나)** — `rollRegressionEvent`가 `e.region === run.region` 또는 `e.region === 0`. 빌드 가중은 기존 `regressionEventWeight`(0.3 + 2×적성). 이미 아는 기연 = 숙련(Lv+1). 첨탑 enemyHp spire 1.35 (diag3 정복 33~38%) |
| 1.194.0 성향 루트 ✅ | PM 결정 「성향 루트제」 — `run.route`(지역 진입마다 `regressionRouteFor` = regressionTopTrait 또는 'none', 2지역부터 `REGRESSION_ROUTE_FROM_REGION`) · **길목의 군주** `REGRESSION_ROUTE_BOSSES[route][region]`(key = 일러스트를 빌릴 적, name·line = 정체) — `regressionRouteBossToday`가 2~4지역 13일째 today `{kind:'routeBoss', routeBoss, route}`, `pending.routeBoss` → `buildRegressionRouteBoss`(수치는 `REGRESSION_ROUTE_BOSS_REF` 기준 보스에 `regressionScaleEnemy`로 맞춤) → 승리 `applyRegressionRouteReward`(`REGRESSION_ROUTE_REWARDS`: 2지역 능력치 / 3지역 여정 장비 grade 'route' / 4지역 storyFlags lordUnmasked·apostleBlood·alliesRally·flames) · **첨탑** `run.spireRoute`(진입 시 run.route) → `regressionSpireChain`/`regressionSpireEnemyFor(run, round, forceWeak)` {key, obj} — 3·4층 특수 적 `REGRESSION_SPIRE_SPECIAL`. ⚠️ 구 `REGRESSION_SPIRE_CHAIN`·`buildRegressionSpireEnemy`는 방랑 길/호환용 · **엔딩** spireRoute 기준(패배 엔딩도 길별), 총 14종. `regressionEnemyLabel(key, tier, obj)` 3번째 인자 = 이름 덮어쓰기. 밸런스 `REGRESSION_ROUTE_TUNING` 한 곳 + 첨탑 enemyHp spire 1.55 — 시뮬 `scratchpad/diag4.mjs`(루트 보스·루트별 첨탑 집계): 군주 승률 2지역 82~92% / 3지역 76~85% / 4지역 65~87%, 첨탑 진입 대비 33~41% |
| 1.194.1 직업 보정 ✅ | PM 지시 — `REGRESSION_CLASS_PERKS`(regressionCombat.js, 직업별 dodge·critRate·counterPct(회피 시 반격)·openerPct(전투 시작 선제)) → `regressionPlayerCombatant({classId})`. 방랑검사 「검객의 직감」·정령사 「정령의 가호」. 시뮬 diag4: 사망 83~87% → 53~60%, 정복 1~4% → 10~12% (타 직업 13~22%) |
| 1.195.0 붉은 달 ✅ | PM 선택 재미 요소 1 — `REGRESSION_RED_MOON`{dayInRegion 11, enemyMult 1.15, rewardMult 2, eliteChance .3} · `isRegressionRedMoonDay`/`regressionDaysToRedMoon`. rollRegressionDay가 군주 다음 순위로 today `{redMoon:true}` 전투 카드 → `pending.redMoon` → 적 배율(UI enemyMult)·보상 배율(applyRegressionCombat 명성·경험치, UI 은화·전리품 2회). 시뮬: 사망 +5~10%p(봇은 붉은 달도 무조건 싸움), 첨탑 진입 대비 39~40% |
| 1.196.0 전생의 유품 ✅ | PM 선택 재미 요소 2 — `meta.regression.grave`{gearId,gold,day,life,cause}(storage getRegression 필드 추가) · `buildRegressionGrave`(장착 장비 중 최고 등급 → 없으면 가방, 은화 `REGRESSION_GRAVE.goldPct` .3, day 2~maxDays-1) · settleRegression이 사망 시 새 무덤, 정복+회수 시 null · createRegressionRun이 run.grave 복사 · rollRegressionDay가 군주 다음·붉은 달 앞에서 `day >= grave.day && !graveDone`이면 today `{kind:"grave"}` → `resolveRegressionGrave(run, take)` |
| 1.197.0 황혼의 맹세 ✅ | PM 선택 재미 요소 3 — `REGRESSION_OATHS` 7종(fx: enemyDmg/enemyHp/rampMult/startGoldZero·goldMult/affinityMult/fameGate/startSkills, echo 보너스) · `run.oaths`(createRegressionRun 7번째 인자) · `regressionOathFx`/`regressionOathEchoMult`(regressionEchoGain에 곱) · `regressionFameGate(run)`(isRegressionSpireEligible·regressionFameStage 2번째 인자) · 전투 적 배율은 `regressionOathEnemyMult(run, inSpire)` → RegressionBattle `enemyExtra`{hp,dmg} → `regressionEnemyCombatant` 5번째 인자(주어지면 dayMult 대신). 해금 `REGRESSION_OATH_UNLOCK_LOOPS` 2 |
| 1.198.0 엔딩 도감 ✅ | PM 선택 재미 요소 4 — `REGRESSION_EPILOGUES`(엔딩 id → 후일담) · `REGRESSION_ENDING_MILESTONES`(3/6/10/14종 → 잔향 30/60/100/200, `regressionEndingMilestoneGain`이 settleRegression echo에 가산 + 반환 `endingReward`) · `meta.regression.endingLog`{id:{life,classId,day}}(storage 필드) · 로비 「엔딩 도감」 버튼 → `EndingCodex` 시트(RegressionGame 상단 컴포넌트) |
| 1.199.0 직업 특성·각성 ✅ | PM 선택 재미 요소 5 — `REGRESSION_CLASS_PERKS` 5직업 완성 + **각성** `REGRESSION_AWAKENINGS`(직업별 2택, `REGRESSION_AWAKEN_LEVEL` 7 — Lv.10은 도달 55%·중앙 D41이라 조정, Lv.7 = 77%·D26) · `regressionClassFx(classId, awakenId)` 합산 → `regressionPlayerCombatant({awakenId})`. 신규 전투 fx: skillPowerPct·berserkBelow/Pct·lifesteal·regenPct·startShieldPct·critMultBonus·reviveOncePct·turnStrikeEvery/Pct. 트리거: `gainRegressionExp`가 레벨 통과 시 `run.pendingAwaken` → 이야기 화면 2택 → `chooseRegressionAwakening`. ⚠️ 각성이 첨탑을 36%→52%로 올려 spire 1.7로 보정. 시뮬 1생 정복: 사제 34~36%(최고, 다음 조정 후보) / 방랑검사 13~17% / 정령사 11~12% |
| 1.200.0 동료 개인 퀘스트 ✅ | PM 선택 재미 요소 6 — `REGRESSION_COMPANION_QUESTS` 8편(동료당 2, 사건 스키마 + 성공 갈래 `quest:{c,s}` → resolveRegressionChoice가 res.quest → applyRegressionEvent가 `run.questStage[c]` 갱신, 2단계 = `addRegressionSkill(bondSkill)`) · 트리거 rollRegressionDay companion 분기에서 `regressionCompanionQuestFor`(호감 `REGRESSION_QUEST_AFFINITY` 60/80)면 pendingEvent · 스킬 등급 **bond**(`REGRESSION_SKILL_TIERS`, 컷인 TIER.bond look advanced) 4종 — 습득 기회·상점 후보 아님 · `regressionEventById`에 퀘스트 포함 |
| 1.201.0 숨겨진 장소 ✅ | PM 선택 재미 요소 7 — `REGRESSION_SECRET`(weight 5 · minRegionDay 5 · dc 15 · puzzleDc 16 · guardianMult 1.0) + `REGRESSION_SECRET_PLACES` 지역 4곳 · 하루 카드 `secret`(regressionDayTable 가중, `run.secretSeen` 지역당 1회) → `discoverRegressionSecret` → `run.secret`{region,floor} → 1층 `solveRegressionSecretPuzzle` / 2층 `fightRegressionSecretGuardian`(pending.secret·fromEvent, 1지역은 일반 적 — 강적 승률 60%라 치명적) / 3층 `claimRegressionSecretTreasure`(보물 장비 + 유니크 offer 또는 기연 offer, 하루 소모) / `leaveRegressionSecret`. needRoll에 `!run.secret`. 첨탑 spire 1.8 — 시뮬 `scratchpad/diag8.mjs` |
| 1.202.0 라이벌 카엘 ✅ | PM 선택 재미 요소 8 — `REGRESSION_RIVAL`(art champ_frost_brute · 지역 1~3 dayInRegion 6 이후 첫 날 · ref 지역 강적 · hp/dmg ×0.75 × (1+0.08×Lv) · raceDc 16 · 패배 HP 30%·은화 30%) · `meta.regression.rival`{level,met,defeats}(storage 필드, createRegressionRun이 run.rival로 복사, settleRegression이 run.rivalGain·rivalWins·rivalMet로 갱신) · today `rival` → `duelRegressionRival`(pending.rival, 패배는 `loseRegressionRivalDuel` — applyRegressionCombat 전에 가로채 사망 없음) / `raceRegressionRival` / `yieldRegressionRival` · 대사 `regressionRivalLine`(만남 횟수별 4단). 시뮬 diag9: 결투 승 90%(Lv0), 사망 49~62%, 첨탑 37% |
| 1.203.0 도전 과제·칭호 ✅ | PM 선택 재미 요소 9 (시리즈 완료) — `REGRESSION_CHALLENGES` 32개 {id, group, name, desc, echo, title?, check(run, meta0, cause)} — settleRegression이 meta0(정산 반영)으로 판정 → `meta.challenges`·`meta.titles`·echo 가산, 반환 `newChallenges`/`challengeEcho`. 칭호 = 도전 과제 id(`regressionTitleName`), 장착 `meta.title`(`setRegressionTitle`, 표시 전용). 붉은 달 승리 추적 `run.redMoonWins`(applyRegressionCombat). 로비 `ChallengeBook` 시트. ⚠️ 신규 콘텐츠에 도전 과제를 더할 때 check는 run에 남는 필드만 쓸 것 (없으면 추적 필드부터) |
| 1.203.1 직업 밸런스 ✅ | PM 「다음 PR 진행」(사제 밸런스) — 600생 표본으로 재측정하니 사제 26%·술법사 25%·방랑검사 11%·마족 12%·정령사 14% (300생 표본은 ±5%p 흔들림 → **직업 밸런스 판단은 최소 600생**). 사제·술법사 각성/특성 하향, 방랑검사·마족 상향 → 1생 정복 14~23%, 첨탑 진입 대비 34%. ⚠️ 술법사 `weaponMult.마법` 2.2→2.0은 사망 69%로 과하향이라 기각. 시뮬 `scratchpad/pv.mjs`(변형 주입 래퍼, `N=600 node pv.mjs <variant>`) |
| 다음 | 실기 피드백 대기 — 술법사(23%)가 여전히 최상위, 정령사·방랑검사는 첨탑 패배율 35~44%(첨탑 4층 생존력) |

### 🃏 게임 선택 화면 + 트와일라잇 아르카나 (1.204.0 — 신작, 덱빌딩 로그라이크)

| 항목 | 내용 |
|---|---|
| 진입 구조 | `src/main.jsx` → `src/Launcher.jsx`(게임 선택) → `App.jsx`(D&T, `onSwitchGame` prop) 또는 `arcana/ArcanaGame.jsx`(`onExit`). 두 게임 모두 `React.lazy`. 마지막 선택은 localStorage `dnt_launcher_last`(「최근」 표시만, 자동 진입 X). D&T 복귀 버튼 = TitleScreen·LoginScreen 하단 「⇄ 게임 선택」 |
| PM 결정 | 장르 = **로그라이크 덱빌딩**(트렌드 분석 후 선택) · 분리 방식 = **런처 화면** · 레포·호스팅 주소 그대로 |
| 파일 | `src/arcana/data.js`(카드 68장 선언형 fx · 유물 15 · 사건 4 · `ARCANA_TUNING`) / `engine.js`(순수 함수 — run → 새 run) / `ArcanaGame.jsx`(화면만) / `scripts/sim-arcana.mjs`(탐욕 봇 시뮬, `CLS=`·`BAN=`·`TRACE=` 환경변수) |
| 재사용 | 본편 `CLASSES`(이름·색·일러) + 클래식 챕터 1~4 `ENEMIES`(1막=챕터1 …). 수치는 `buildArcanaEnemy`가 환산 — 본편 적 데이터를 바꾸면 아르카나도 바뀐다 |
| 저장 | localStorage `dnt_arcana_v1` {run, records} — 본편 IndexedDB와 완전 분리 |
| 카드 문구 | `describeCard`가 fx에서 자동 생성 — **문구를 손으로 쓰지 말 것** (새 연산자 추가 시 describeOp + engine applyOps 두 곳) |
| 밸런스 | 봇 클리어율(400런): 사제 73% · 정령사 26% · 검사 10% · 마족 5% · 술법사 3% → 직업 선택 화면 「난이도」 표시로 안내. 사제는 방어 누적이 강함 — 후속 조정 후보 |

### ⚔ 황혼 연대기 (1.205.0 — 세 번째 게임, 정통 RPG)

| 항목 | 내용 |
|---|---|
| PM 결정 | **세 번째 게임으로 추가**(아르카나 유지) · 전투 **풀오토 관전** · 파티 **주인공 1 + 동료 최대 3** · 첫 PR = 핵심 루프 MVP |
| 파일 | `src/chronicle/data.js`(직업 확장·스킬 20·사냥터 4·던전 1·장비/드랍/대장간 표·`CHRONICLE_TUNING`) / `engine.js`(순수 함수: 성장·장비·대장간·`simulateChronicleBattle`·`applyBattle`) / `ChronicleGame.jsx`(마을·사냥터·던전·파티·가방·대장간·전투 재생) / `scripts/sim-chronicle.mjs`(봇 진행 시뮬) |
| 루프 | 사냥터 처치 수(`bossKills` 15/30/45/60) → 보스 → 다음 지역 + 동료 합류(`companionOrder` = 주인공 제외 4직업 순) · 2지역 보스 후 던전 개방(HP 이월, 보스 에픽 45%×2) |
| 전투 | 시작 순간 끝까지 계산 → `applyBattle`로 저장 반영 → 화면은 `events`(st = {id: [hp, 보호막]} 스냅샷) 재생만. 새로고침해도 보상 중복·유실 없음 |
| 적 수치 | 본편 적 데이터는 **이름·일러·개성 비율**만 사용 — 수치는 `enemyHpBase/PerLv`·`enemyAtkBase/PerLv` × 등급(`enemyTier`) × 지역(`area` = 예상 파티 인원 반영). 사냥터 몹 레벨은 파티 평균 ±1 (`partyLevel`) |
| 밸런스 | 봇(10회 중앙값): 보스 1~4 처치 Lv **6 / 12 / 20 / 30**, 누적 **35~47 / 65~92 / 92~127 / 132~160전** · 던전 첫 클리어 Lv 25~28 · 직업 격차 작음 |
| 저장 | localStorage `dnt_chronicle_v1` — 본편·아르카나와 분리 |
| 1.206.0 퀘스트·이야기 ✅ | `src/chronicle/story.js`(장면 `SCENES` 16 · 동료 합류 `RECRUIT_SCENES` 5 · 의뢰 `QUESTS` 27 — 메인 4/의뢰 18/동료 5) + `quest.js`(순수 함수: `questStatus` locked/available/active/done/claimed · 완료 여부는 저장하지 않고 goal로 매번 계산 · killKey/kills/elites/dungeon은 수락 시점 `base` 대비 · `nextScene(save, ctx)` ctx.at = town/field/bossPre). 저장 추가 필드 `quests`·`story{seen,recruitSeen}`·`progress.killsByKey`·`stats.elites` — 구 저장은 `ensureQuestFields`(loadSave)로 보정. ⚠️ 보스 앞 장면은 끝난 뒤 자동 전투하지 않음(재클릭) — 장면 콜백의 fightField가 낡은 save를 잡아 장면 표시·보상이 유실되기 때문 |
| 1.207.0 PM 실플레이 피드백 ✅ | ①「Lv.25면 스킬 포인트 쓸 데 없다」(스킬 4×5=20, 마지막 Lv.8 개방) → 직업당 **후반 스킬 2개**(Lv.15·25, 신규 kind `healAll`) + **마스터리**(`unit.mastery`, 1포인트 = 공격·최대 HP +`MASTERY_PCT` 1%, 상한 없음 — `deriveUnit`에서 합산, 동료 `autoGrowUnit`은 배울 스킬 없으면 마스터리로) ②「이전 보스 반복이 최고 효율」(보스 경험치 10배·희귀 확정·제한 없음) → **처치한 보스 재도전 하루 `BOSS_DAILY_LIMIT` 3회**(`save.bossDaily`{date KST, counts}, `bossAttemptsLeft`/`useBossAttempt` — applyBattle에서 결과 무관 1회 소모, 첫 처치는 무제한) |
| 1.208.0 던전 확장·에픽 고유 옵션 ✅ | PM 「1,2 동시진행」 — **던전** `CHRONICLE_DUNGEONS`(서리 왕의 무덤 + 광기의 숲 심장부 — 챔피언십 forest 일러, unlockField 3) · **난이도** `DUNGEON_TIERS` 일반/영웅/전설(lv +0/5/10, hp ×1/2.2/3.6, atk ×1/1.7/2.4, 에픽 ×1/1.6/2.4, 파편 ×1/2/3) — `save.dungeon`{id, tier, floor, hp} · 최고 클리어 `progress.dungeonTier[id]` → `dungeonTierUnlocked`. `dungeonEncounter(save.dungeon, rng)` 시그니처 변경. **에픽 고유 옵션** `UNIQUE_OPTIONS` 12종(부위별 4) — `rollItem(rng, grade, ilv, slot, set)`이 epic이면 `item.unique`·`item.set`, 승급·의뢰 보상도 동일, 구 에픽은 `ensureQuestFields`가 uid로 고정 부여. fx는 `gearTotals.uniq` → `deriveUnit` → 전투 시뮬(`damage`의 execute/armorPen/guts/lifesteal/thorns, `chainHit`, regen, cdr, startShield). ⚠️ 적 일러 경로는 `chronicleEnemyArt` → 본편 `getEnemyImageSrc` 위임 (forest는 `chapterN/` 하위 폴더). 시뮬 `scratchpad/dg.mjs`: 무덤 영웅 Lv.24 98%·전설 Lv.28 80% / 심장부 일반 Lv.30 100%·전설 Lv.34(에픽+3) 73% |
| 1.209.0 던전 열쇠 ✅ | PM 「던전 무한 입장이라 너무 쉽다」 → PM 결정: **입장권 + 일일 충전 · 입장 시 소모 · 난이도별 차등** — `DUNGEON_KEYS`{dailyRefill 3, max 10, eliteDrop .1, shopPrice 400, shopDailyLimit 2} · `DUNGEON_TIERS[].keyCost` 1/2/3 · `save.keys`{count, refillDate(KST), boughtDate, bought}. `refreshDungeonKeys`(날짜 바뀌면 3개까지 채움 — loadSave의 `ensureQuestFields`·화면 이동 effect·startDungeon·buyDungeonKey에서 호출), `startDungeon`이 keyCost 차감(부족하면 save0 그대로), applyBattle 사냥터 강적 처치당 10% `summary.keys`, 의뢰 reward `keys`(`_addKeys`, 최대치 캡) |
| 2.0 설계 ✅ | `docs/chronicle-v2-design.md` — PM 확정: 초기화 + 시작 보상 · 캐릭터별 진행(창고·재화·사역마 계정 공유) · 사역마 동행 1 + 보조 2 |
| 1.210.0 2.0 PR ① ✅ | **솔로 RPG** — `src/chronicle/account.js`(계정 = 캐릭터 슬롯 `chars[classId]` + 공유 gold/mats/keys/stash/bossDaily, `toView`/`fromView`로 기존 「save 뷰」 유지 → engine·quest는 거의 그대로). 저장 키 `dnt_chronicle_v2`(v1 키는 읽기 전용 — 있으면 `V1_GIFT` 시작 보상: 골드 3000·열쇠 5·상급 봉인부 3·직업 희귀 2). **장비 4칸**(weapon/offhand/armor = 직업 전용 `item.cls`, accessory = 공용 `cls:'common'`) · 드랍 직업 비율 `CLASS_DROP` 70/25/5 · 옵션 `OPTION_DEFS` 22종 + 직업별 `OPTION_POOLS` · `item.opts[]`(고급1/희귀2/에픽3, 승급 시 +1) · 에픽 장신구 `item.eopt` · **유니크** `UNIQUE_ITEMS` 24종(`item.named`, 승급 불가, 드랍 `UNIQUE_CHANCE` 보스 0.5%·던전 보스 2/5/10%, `u_c_collar`는 disabled — 사역마 PR에서 활성) · 공용 창고 `moveToStash/takeFromStash/dismantleStash`(100칸). **밸런스** `CHRONICLE_TUNING` maxLevel 60 · soloHp .9/soloAtk 1.3/**soloGrowth .055**(적 hp·atk에 `1+0.055×(lv-1)` — 플레이어 장비 배율 성장이 레벨보다 빨라서) · elite 3.2/1.4 · boss 3.8/1.35. 솔로 도발은 HP<60%에서만. 시뮬 `scripts/sim-chronicle.mjs`(보스 패배 시 1레벨 더 올린 뒤 재도전): 보스 1~4 처치 Lv 13~14 / 24~26 / 36 / 48, 1부 완주 **528~584전**(v1 132~160), 직업 격차 ±1. 레벨별 검증 스크래치 = 일반 2마리 승률 95%+·HP 30~50% 손실 |
| 1.211.0 2부 「여명의 배신」 ✅ | PM 「콘텐츠 소모 → 스테이지·스토리 확장, 일러는 임시」 → PM 결정: 2부 · Lv.100 · 기존 일러 색 보정. **사냥터 5~9**(`champField` — 챔피언십 컨셉 적 16종 재사용: frost/forest/sanctum/rift/dawn, `part: 2`, Lv 48~98, 보스 Lv 60/70/80/90/100, 처치 100~150) + `CHRONICLE_PARTS`(사냥터 화면 1부/2부 탭) · `maxLevel` 100 · 아이템 이름 7단계(`tierOf` ≤6, 61+ = `LATE_PREFIX` 성역의/핏빛/황혼의) · `maxRounds` 50 · 사제 p_light 1.9/0.18(Lv.100 보스 시간 초과 해소). 이야기 `p2_prologue`(ending 본 뒤 마을)·f5~f9 enter/boss/clear·`ending2` + NPC `herald` · 의뢰 m5~m9 + s5a~s9c + g4. **임시 일러**: `public/enemies/championship/{sanctum,rift,dawn}` — 클래식 일러 색 보정(Pillow, 스크립트는 스크래치 tint.py: 컨셉 색 colorize 68~72% + 개체별 크롭·좌우반전, 1280×731 / 인트로 720×1260 q85). 본편 챔피언십에도 그대로 보임(구 dawn 이름 카드 placeholder 삭제). 시뮬(6회): 보스 5~9 처치 Lv 58/68/78/88/98, 1+2부 완주 **1,523~1,723전**, 5직업 6/6 |
| 1.212.0 사역마 ✅ | PM 재설계 「자동 전투라 포획 개입 불가 → 조각 모아 가챠 소환」 + PM 결정: 천장 있음 · 진화 실패 -3단계 · 약 25전에 1회 · 진행 지역 적만. `src/chronicle/familiar.js`(데이터+순수 함수, engine만 import) — `FAM_GRADES`(적/녹/청/남/자 62/27/8.5/2.2/0.3%, mult 1/1.3/1.7/2.2/2.9, 중복 사역혼 1/3/10/30/100, 진화율 .6/.4/.2/.07) · `FAM_TUNING`(조각 10/회 · 10연 청령+ 확정 · 자령 천장 150(자령 풀이 열린 뒤부터 카운트) · 강화 +10 단계당 +5% · 비용 (n+1)×cost · 진화 10×cost · 실패 -3 · 드랍 일반 15%/강적 60%×1~2/보스 3/던전 5·8·12 · 칸 개방 Lv 5/20/40) · `FAM_ROLES` 5종(이름 정규식 `ROLE_WORDS` → 없으면 키 해시) · `famPool(progress)`(적·녹=개방 지역 일반 / 청=강적 / 남=처치한 1부 보스 / 자=클리어 던전 보스+처치한 2부 보스, 빈 등급은 한 단계 아래로). 저장: 계정 `fams{key:{grade,plus}}`·`famPity`·`mats.famShard/famSoul/sealPlus(=소환권)` + 캐릭터 `famTeam{main,sub1,sub2}` (toView/fromView). 엔진: `partyCombatants`가 동행을 `id:'fam'` 유닛으로 추가(주인공 능력치 비례, 던전 층 사이 최소 30%), 보조는 `deriveUnit`에서 장비 합산 키로 더함, 적 표적은 주인공 70%, **주인공 사망 = 패배**(leader 플래그). 시뮬 `FAM=0`이면 사역마 없이: 사역마 있음 → 일반전 HP 손실 15~37% → 8~22%, 1+2부 완주 1,474~1,578전, 소환 약 54회 |
| 1.213.0 스테이지·보고서·×4 ✅ | PM 요청 3건 + PM 결정(×4 = 골드 시간권 · 지역당 6스테이지 · 처치 목표 + 관문 강적). **스테이지** `FIELD_STAGES` 6 · `fieldStages(field)`(레벨 = lv[0]~lv[1] 균등 6칸 고정, 처치 목표 = ceil(bossKills/6)) · `progress.stages[fid]`{cleared 0~6, kills[6]} — `stageState`(구 저장은 bossCleared → 6, 진행 중은 fieldKills ÷ 목표로 환산) / `stageUnlocked` / `gateReady` / `bossReady`(=cleared 6, 기존 fieldKills ≥ bossKills 조건 대체) · `rollFieldEncounter(…, stage)` 5번째 인자 → 몹 레벨 고정(강적 +1, partyLevel 추종 폐지) · `rollGateEncounter`(type 'gate', 강적 Lv+1 + 일반, `DROP_TABLE.gate`) · applyBattle `ctx.stage`로 kills/cleared 갱신 + `summary.stageClear`. **×4** `BOOST`{30분, 300+15×Lv, 최대 180분} · 계정 `boostUntil`(toView/fromView) · `buyBoost`/`boostLeftMs` · BattleView 실효 배속 = 이용권 없으면 ×4 → ×2. **보고서** `battleDamageStats(sim, party)`(도트 `dotSrc`·반격 `by` 귀속 — 엔진 사건에 출처 추가) → UI `huntRecord`/`addHuntRecord`(repStatsRef: 반복 켤 때 직전 전투 포함 시작, 꺼질 때 2회 이상이면 `HuntReport`). 반복은 사냥(hunt)만 — 관문·보스·패배·의뢰 완료 시 정지. 시뮬(4회): 관문 승률 71~90%, 보스 처치 Lv 동일, 1+2부 완주 1,348~1,401전 |
| 1.213.1 가방 정렬·비교 ✅ | PM 요청 — BagView 정렬: 착용 장비(부위 순) 맨 위 → `itemPower` 높은 순(「전투력」, PM 표현 「주스탯」) / 등급 순 토글(localStorage `chronicleBagSort`). 비교 `itemDiff(item, cur)`·`powerDiff`·`DiffLine`(compact = 목록 한 줄 / 전체 = 상세 시트 + 특수 효과 상실 경고) — 가방 목록·장비 상세·성장 화면 장착 선택 3곳. 일괄 분해 체크박스 「타직업 장비 포함」(localStorage `chronicleBulkOther`, 착용 장비는 항상 제외) |
| 1.214.0 2부 던전 ✅ | PM 「무한탑·2부던전 모두 진행」 → PR 2개 분리(①던전 ②탑). `CHRONICLE_DUNGEONS` +4(`part: 2` — frostAbyss 필드6/Lv68·sanctumVault 7/78·riftHeart 8/88·dawnGarden 9/98, 보스 = 지역 보스와 다른 챔피언십 보스 boss2/boss3) · `EPIC_PREFIX` abyss/sanctum/rift/dawn · 장면 dungeon3~6_open · 의뢰 d6~d10. **던전 솔로 보정**(⚠️ 1.210.0 솔로 전환 후 던전 미조정이라 2부 던전 0% 직업 다수였음): `CHRONICLE_TUNING.dungeonSolo`{hp .6, atk .75}·`dungeonFloorEnemies` [1,2]·`dungeonFloorHeal` .25(partyCombatants hpMap 경로) · `DUNGEON_TIERS` 영웅 lv+3/hp1.5/atk1.25 · 전설 lv+6/hp2.0/atk1.5. 시뮬 `scratchpad/dg2.mjs`(봇이 던전 개방 시점 저장으로 3단계 각 40회): 2부 일반 98~100% · 영웅 13~98% · 전설 0~75% (흡혈 마족·회복 사제가 여전히 강함 — 전설은 장비 목표) |
| 1.215.0 무한 탑 ✅ | 설계서 7.3 그대로. `src/chronicle/tower.js`(데이터+순수 함수, engine만 import) — `TOWER`{개방 필드4 · 적 Lv = 48+층 · 층당 HP·공격 +2% · solo hp .7/atk .8 · 5층 강적·10층 보스 · 주화 2+층/5 (보스 ×5) · 유니크 5%→20% · 주간 보너스 층×3} · `TOWER_SHOP` 6종(유니크 선택 상자 600 = 현 직업·공용 유니크 중 선택, ilv = 내 레벨) · `towerTheme`(10층마다 사냥터 테마 순환) · `towerBossKey`(사냥터 보스·던전 보스 번갈아) · `kstWeekKey`(월요일). 저장: 캐릭터 `tower`{best, checkpoint, run{floor,hp}} · 계정 `mats.towerCoin` · `towerWeek`{key,best,claimed}. 엔진 `startTower/leaveTower/towerEncounter/applyBattle(ctx.kind 'tower' → towerAdvance)/buyTowerItem/towerShopCanBuy` · DROP_TABLE towerFloor/towerElite/towerBoss · 층 사이 회복은 던전과 같은 `dungeonFloorHeal` · 퀘스트 goal `tower` + t1~t3 · 장면 `tower_open`(p2_prologue 뒤). 주화 아이콘 ✪(🜂는 모바일 폰트 미지원). 시뮬 `scratchpad/tw.mjs`(봇 저장, 6회 도전): 개방 직후 Lv.48 최고 9~24층 · Lv.68 25~39층 · Lv.98 44~64층 |
| 1.215.1 편의 기능 ✅ | PM 요청 3건 — **대장간 분류**(가방과 공용 `useItemSort`/`sortItems`/`filterItems`/`ItemFilterBar`/`SortButtons`, 정렬 키 `chronicleBagSort` 공유) · **전투 집계**(BattleView `stats` state → `HuntReport`(title prop, 1회면 승패·라운드 표시·패배 시 획득 숨김) — 반복 사냥 보고서와 같은 `huntRecord`/`addHuntRecord`) · **던전 연속 도전**(`dungeonAuto` localStorage `chronicleDungeonAuto`, BattleView effect가 승리·미정복이면 1.8초 뒤 `onAgain` = fightDungeon. 집계 열림 중엔 정지. 던전 한 판 기록 `dungRunRef` → 끝나면 `battle.runReport` 「던전 전체 집계」) |
| 1.216.0 사역마 역할·던전 밸런스 ✅ | PM 요청 「마족·사제 너프 0~18%」 + 「사역마 탱커·딜러·힐러 명확히, 고등급은 보조로도 충분히」. `FAM_ROLES` 3종 tank/dps/healer(역할은 저장 안 함 — `famRole`이 이름 정규식 + 보스 `ROLE_OVERRIDE`로 매번 결정, 마이그레이션 0) · 보조 효과 = 등급별 배열 `sub{key:[적..자]}` × 강화(`famSubValues`) · 수호 태세 `guardian`(engine `pickEnemyTarget`에서 도발 다음 순위) + `startTaunt` · 사역마 HP 기준 min(주인공 HP, Lv×70) · 힐러 회복 기준 = 주인공 공격력 · 추천 `FAM_CLASS_TIP`. 상한 3종 `CHRONICLE_TUNING` lifestealCap .07 / shieldCap .15 / holyCap .2 (보유 장비에도 적용). 전설 hp 2.6/atk 1.8. 시뮬 `scripts/sim-chronicle-dungeon.mjs`(snap → eval, 직업×동행 역할×난이도): 2부 던전 권장 레벨 전설 최고 조합 0~30%, 영웅 수호 동행 83~100%. 술법사+수호 후반 던전 전설 68~82%는 **PM 결정으로 유지** (몸 약한 딜러를 수호로 메우는 보상 — 조정 금지) |
| 1.217.0 가방·분해·×4·사역마 상세 ✅ | PM 결정 3건 — **가방 확장** `BAG_EXPAND`{step 10, max 100, cost 5000×2^n}, 캐릭터 필드 `bagExpand`(toView/fromView), 한도는 반드시 `E.bagMax(save)` (`T.inventoryMax` 직접 사용 금지) · **분해** `SALVAGE` 등급별 재화(일반 골드 10+2×ilv / 고급 ✦3 / 희귀 ✦8+📜1 / 에픽 ✦20+◆2 / 유니크 ◆5+🔮10, 강화 단계 ✦ 환급) — `salvageOf`/`salvageText`/`addSalvage`가 가방·창고·자동 분해 공용, 반환 `r.salvage` · **×4** `BOOST.cost` ×15 · **사역마 상세** `famSkillInfo`(효과·재사용·발동 조건 — engine `chooseSkill` 순서와 문구 일치 유지)·`famStatRatios`. 진행 시뮬 변화 없음 |
| 1.218.0 사역마 고유 스킬 ✅ | PM 「같은 역할이면 스킬이 같다 → 남령부터 고유 스킬」. `FAM_SIGS` 13종(수호 T1 결투(단일 도발 장기)·T2 함성(광역 단기)·T3 보호·T4 방어 강화 / 치유 H1 즉시·H2 지속·H3 회복+보호막·H4 회복+공격 / 맹공 D1 방어 파괴·D2 약화·D3 취약·D4 처형·D5 역병) · 배정 `famSignatureId`(보스 출신 `BOSS_SIGS` 전용 이름, 그 외 키 해시 — 저장 안 함) · `famSignature(key, grade)`(자령 지속 +1) · `FAM_SIG_MIN_GRADE` 3. 엔진 신규 상태: 유닛 `fx{armorBreak,weak,vuln,guardDef,guardRed}`(`fxv`)·`hots`·`forced`(적 강제 대상)·`cover`(피해 분담 → 적 공격 hits에 `cover:true`) — 각 유닛 자기 턴 끝에 감소. `chooseSkill`은 고유 스킬 조건이 맞으면 최우선. 시뮬 `scripts/sim-chronicle-fam-sig.mjs`(고유 스킬별 × 직업): 남령+5 금고 전설 — 수호 13~100 · 치유 10~85 · 맹공 0~68(사제만 강함). 사제는 수호·치유 동행 시 시간 초과 0% (맹공 필수) |
| 1.219.0 대장간 위험·레벨링 ✅ | PM 「게임이 너무 쉽다」 → PM 결정(강한 패널티+파괴 · 경험치 ×2 · 전승 PR B~D 예정). `FORGE.enhanceRate[현재 단계]`·`enhanceDropFrom 6`·`enhanceBreakFrom 8`·`enhanceBreakChance .3`·`promoteRate`{.8/.5/.2}·`promoteBreak.epic`, 에픽 승급비 ×4. 엔진 `forgeEnhance`/`forgePromote` → {save, result: success/fail/down/destroy} (구 `enhanceItem`/`promoteItem`은 .save 래퍼 — 시뮬 호환), `enhanceRisk`/`promoteRisk`(UI 안내), 파괴 시 `destroyItem`이 착용 칸 비움 + `stats.destroyed`. `expNeed` 60×lv^1.6. 시뮬: 완주 2,726~2,866전(이전 ~1,350) |
| 전승 시리즈 (PM 결정) | PR B 전승 시스템(직업당 2갈래 · 레벨 1 · 경험치 2배 · 장비·사역마 유지 + 착용 레벨 제한 ≤ 내 레벨+5) → PR C 전승 단계 난이도 + 전승 등급 장비·갈래 유니크 → PR D 3부 신규 지역(전승자 전용) |
| 1.220.0 전승 ✅ (PR B) | `REBIRTH`{reqLevel 100, max 5, expMult 2, wearMargin 5, bonusPct .05} · `REBIRTH_BRANCHES` 10종(직업당 2, fx는 gearTotals 합산 키 + `healFromAtk`) · 갈래 스킬 30개는 `CHRONICLE_SKILLS`에 `branch` 필드로 병합 — `classSkills(cid, branch)`·`canLearn`이 갈래 필터 · 유닛 `rebirth`{branch, count} (캐릭터 unit에 저장 → account 변경 0) · `rebirth(save, branchId)`/`canRebirth` · `expNeedFor(u)` = expNeed × 2^count (engine gainExp·quest 보상·UI 3곳 — `T.expNeed` 직접 사용 금지) · `canWear(it, u)`(gearTotals·equipItem·autoEquip) · `famSlotOpen` 전승자 개방 유지 · 전투 `SPECIAL_KINDS`(사역마 고유 스킬과 같은 조건 규칙, 주인공 cover 제외). 봇: 전승 후 Lv.100까지 1회차의 1.4~1.8배 전투 |
| 1.221.0 전승 확장 ① ✅ (PR C) | **전승 단계** `REBIRTH.enemyHp .25/enemyAtk .15` × 전승 횟수 — `scaleEnemiesForRebirth(save, enemies)`를 UI 조우 직후 3곳(fightField·fightDungeon·fightTower)에서 호출 (⚠️ 새 전투 경로를 만들면 같이 호출할 것, 보상 rewardMult는 그대로) · **전승 등급** GRADES 맨 끝 `mythic`(×2.3·옵션 4·승급 불가, 이름 「전승의」, 분해 ◆10+🔮20) · 드랍 `REBIRTH.mythicDrop`/`branchUnique`(applyBattle — 전승 캐릭터 승리 시) · **갈래 유니크 10종** UNIQUE_ITEMS `branch` 필드(일반 유니크 풀·첨탑 상자에서 제외, `canWear`가 갈래 확인) · 경험치 배율 `rebirthExpMult`(2, 2.5, 3…). 봇(최고 스테이지 사냥): 전승 1회차 Lv.100 6.7k~11k전 · 2회차 9k전+ · 승률 방랑검사 91~96% / 정령사 57~68% / 사제 38~55% (1회차부터 사제 46%) |
| 1.222.0 3부 ✅ (PR D — 전승 시리즈 완료) | **`src/chronicle/enemies.js` `CENEMIES`** = 본편 ENEMIES + 3부 적 21종(원본 키를 복제해 이름·소속·등급만 변경) — 연대기 파일은 `import { CENEMIES as ENEMIES }` (⚠️ 본편 `data/enemies.js`에 연대기 적을 넣지 말 것: 본편 도감 오염). 사냥터 10~12(`part: 3`, `reqRebirth: 1`, area 1.2/1.35/1.5, Lv 100~115) · `fieldUnlocked`가 reqRebirth 확인 · `CHRONICLE_PARTS` 3부 · 의뢰 req `rebirth` · 장면 p3_prologue~ending3 · 사역마 풀 자령에 3부 보스. 임시 일러 `public/enemies/championship/{memory,void,origin}` (스크래치 tint3.py 색 보정). 봇(전승 1회 Lv.100, 희귀+6): 사역마 없음 보스 0~100%, 적·청령+5 폐허 보스 95~100 · 회랑 0~78 · 근원 0~10%, 남령+5면 전부 100%. 전승 장비 드랍 하향·성기사 하향 |
| 1.223.0 초기화·업데이트 버튼 ✅ | PM 요청 — `TitleView` 「↺ 처음부터 다시」(2단계 확인 → `A.newAccount(false)`: v1 시작 보상 재지급 없음, 연대기 저장만 교체) · 업데이트 버튼을 공용 컴포넌트 `src/components/ui/UpdateButton.jsx`로 분리(본편 TitleScreen·연대기 TitleView 공용) |
| 1.224.0 특성 트리 ✅ | PM 「스킬 만렙 뒤 전부 마스터리로 몰린다 → 와우식 특성」 + PM 결정(갈래 3×5단 · 마스터리 전액 환급 · 전승 시 초기화 · 초기화 Lv.60↓ 골드 / Lv.61↑ 골드+주문서, 10레벨마다 +1장). `src/chronicle/talents.js`(데이터+순수 함수, engine만 import) — `TALENT_TREES[직업]` 3갈래 × 5단(1~3단 노드 2×5랭크 · 4단 2노드 1~3랭크 · 5단 궁극 1) · 노드 fx = 1포인트당 값, 장비 합산 키와 같은 어휘 + `sb_<스킬id>`(스킬 위력, engine act에서 `u.skillBoost`) · 배율 키(`dotTurnsMult`·`blessMult`)는 **max 병합**(장비 ×2와 곱하지 않게) · 단 개방 = 그 갈래 투자 (단-1)×5 · 문구 `talentFxText` 자동 생성. 엔진 `learnTalent`/`autoSpendTalents`/`autoAllocateTalents`/`canResetTalents`/`resetTalents` · 주문서 `mats.talentScroll` = battleRewards uChance(보스 UNIQUE_CHANCE.boss · 던전/탑 보스 mods.uniqueChance)와 같은 확률 · 마이그레이션 `ensureQuestFields`(mastery → sp, 반복 안전). 직업별 특성 총합 102~108점 vs Lv.100 잔여 약 70점. 시뮬: 보스9 처치 2,672~2,880전(마스터리 시절 2,703~2,870 — 동등) |
| 1.225.0 사역마 레벨·착용 레벨 ✅ | PM 지시 3건 — ①**사역마 레벨** `fams[key].lv/exp`(신규 Lv.1 · 진화는 레벨 유지) · `FAM_LEVEL`{expNeed 주인공 곡선, catchUp ×10, subMin .3, lvOffset 10} · 실효 레벨 `famEffLv` = min(사역마, 주인공) · 전투 배율 `famLvRatio` = (10+실효)/(10+주인공) — famCombatant m·HP 기준에 곱함 · 경험치는 applyBattle 승리 시 **동행(activeMain)만** `gainFamExp`(주인공 레벨 상한, summary.famExp) ②**보조 재화 특성** `FAM_ECON`{expPct·goldPct·dropPct 등급별} — `famEconId`(키 해시, 저장 안 함) · `famSubValues(key, f, heroLv)`가 역할 보조 + 재화 1개 × 레벨 비례 · `dropPct`는 PASS_KEYS → battleRewards `mods.dropPct`(itemChance 상향, 100% 초과분은 추가 장비 확률) ③**착용 레벨** `canWear` = ilv ≤ 내 레벨 (전승 여부 무관, REBIRTH.wearMargin 미사용). 마이그레이션: lv 없는 사역마 = 현재 주인공 레벨(전승자 100). 시뮬(원인 분리): 사역마 레벨 단독 +3% · 장비 제한 단독 +30~60% → 보스9 처치 3,192~5,302전(이전 2,672~2,880) |
| 1.225.1 사역마 보정 폐지 ✅ | PM 「×10 보정은 노력 없이 너무 쉽다」 → `FAM_LEVEL.catchUp` 1 (따라잡기 1,897전 @Lv.98 · 365전 @Lv.36) · PM 「적·녹·청령에 고유 스킬이 보인다」 → `famSkillInfo`가 남령 미만은 고유 스킬 제외 (전투 famCombatant는 원래 남령 이상만 장착 — 표시 문제였음), FamSkillPanel에 「남령으로 진화하면 열린다」 안내 |
| 1.226.0 사역마 독립 능력치 ✅ | PM 「사역마가 주인공 능력치를 따라가나? 탱커면 힐러 힐량은?」 → 진단: HP·공격·방어·**회복력(=주인공 공격력)**·속도 전부 주인공 비례 → 치유 1회 = 주인공 HP 9%(방랑검사·마족)~23%(술법사), 수호 방어 2.9배 격차, 주인공 장비 이중 적용. PM 결정: **독립 능력치 + 고정 회복량**. `FAM_STAT_CURVE`(5직업 봇 평균 능력치 [레벨, HP, 공격, 방어, 속도], 선형 보간 `famBaseStats`) → `famStats(key, f, heroLv, famPct)` = 곡선(실효 레벨) × 역할 × 등급·강화 × (1+famPct) — famCombatant·UI 공용. `famLvRatio`·`famStatRatios`·`hpPerLv` 삭제, `famGuard` 신설. ⚠️ 곡선 재측정은 scratch curve.mjs 방식(사역마 없이 봇 진행, 레벨별 deriveUnit 평균). 던전 시뮬 `withFam`은 사역마 lv = 주인공 lv로 수정. 시뮬: 보스9 처치 2,817~4,125전(이전 3,309~5,025) · 정령사+수호 심연 전설 17→47% · 방랑검사+수호 영웅 100→73% |
| 1.226.1 기여도 지원 반영 ✅ | PM 「사역마 힐량은 기여도에 반영 안 되나?」 → `battleDamageStats`가 적 피해만 셈. 엔진 회복 hits에 `eh`(healUnit 반환 = 실제 찬 HP)·보호막 hits에 `es`(실제 증가량) 추가, 집계에 `healBy`/`shieldBy`/`takenBy`(적 공격·cover 피해) → huntRecord units `heal/shield/taken` → HuntReport 유닛 행에 ✚◈🛡 표시. ⚠️ 새 회복·보호막 경로를 만들면 hits에 eh/es를 같이 넣을 것 (지속 회복 'hot' 이벤트는 h가 이미 실제값) |
| 1.226.2 보호막 상한 ✅ | PM 「보호막이 최대 체력을 넘나?」 → 경로 4개 진단: 시작 보호막(15% 상한) · 보호막 스킬(max 갱신형) · overhealShield·skillShield(**누적·상한 없음** — 술법사 결계 긴 전투 114%). PM 결정 50% → `CHRONICLE_TUNING.shieldMaxPct` 0.5 + 시뮬 내부 `addShield(t, v, 'add'|'max')`(반환 = 실제 증가량, 기여도 es) — ⚠️ 새 보호막 경로는 반드시 addShield 사용. 보스전 실측 영향 0 |
| 1.227.0 전투 화면 개편 ✅ | PM 「로그창이 좁다 · 색 구분 · 아군도 적처럼 큰 일러」 → BattleView: 적/아군 공용 `BattleCard`(높이 150, 일러 + 하단 HP바·보호막, 주인공 = class.combatImage · 사역마 = chronicleEnemyArt) · 로그 `BattleLogLine`(최근 80개 사건, 자동 스크롤, 라운드 구분선, 아이콘·색 `LOG_C`) · 스킬 호명 `.chr-skill-call` · 카드 이펙트 `.chr-fx-crit/heal/shield`(index.css, reduced-motion 가드). 엔진 피격 hits에 `ab`(보호막 흡수량) 추가 → 「◈흡수」 표시 |
| 1.227.1 치유 사역마 조건 ✅ | PM 「남령 힐러 힐량·보호막이 적어 보인다」 → 검증: 보호막 168 = 회복력 145 × 116% (설정대로). 원인은 발동 조건(치유 HP<55% · 보호막 「아무도 없을 때」)이 보수적이라 보스전 턴의 60%가 평타. PM 결정 「조건 완화」 → `FAM_AI`{healBelow .75, shieldBelow .1}(familiar.js) — engine `chooseSkill`이 **u.fam일 때만** 사용(주인공 사제 55% 유지) · famSkillInfo 문구 동기화. 재현(200회): 실제 회복 64→200, 치유 0.1→0.9회, 평타 3.8→2.9회. 던전 시뮬 치유 동행 소폭 상승·과강화 없음 |
| 1.228.0 보유 효과·인연 ✅ | PM 「남령 1개만 메인이라 나머지 쓰임새 부족 → 남령부터 보유 효과 + 인연」. familiar.js 말미: **보유 효과** `FAM_OWN`(역할별 [남령, 자령] × plusMult) · `famOwnValues`/`famOwnFx`(합계 상한 `FAM_OWN_CAP` 공·HP·방 .3 / 치피 .6 / 피감 .08 / 재생 .01) · **인연** `FAM_BONDS` 21(region = 지역 보스+강적 12 · pack = 1부 일반 4 · special 5 — 이름으로 키 해석) · `bondTier`(1 = 전원 보유 / 2 = 전원 tier2Grade 이상 + 강화 `BOND_TIER2_PLUS` 5 → fx ×2) · `famBondFx` · 문구 `famFxText`. engine deriveUnit에서 famSubFx 다음에 합산 (편성 무관). UI `FamBondView`(사역마 「인연」 탭) + 상세 시트 보유 효과·인연 줄. 시뮬: 보스9 처치 2,761~4,476전(이전 2,993~4,304, 편차 범위) · 후반 예상 보유 공격 +25% |
| 1.229.0 원정대 ① ✅ | PM 「모든 캐릭터를 키우게 하는 장치」 — PR 3개 시리즈(①상한·버프·화면 ②원정대 의뢰 ③원정대 레이드). `src/chronicle/roster.js`(데이터+순수 함수): `ROSTER`{baseCap 60, perChar 10, unlockLv 60} · `peakOf`(전승자 = 100) · `buildRoster(chars)` → account.toView가 뷰에 `roster` 주입(읽기 전용), fromView가 캐릭터 `peakLv` 갱신 · `levelCap(roster)`(roster 없으면 만렙 → 시뮬 영향 0) · engine `levelCapOf(save)` → gainExp(u, n, cap)·quest 경험치 보상 둘 다 적용 (⚠️ 새 경험치 경로도 cap 필수) · `GLOBAL_BUFFS`(직업별 Lv.20~100 5단계 fx) → `globalBuffFx(roster, self)` deriveUnit 합산(자기 직업 제외). UI `RosterView`(마을 「원정대」) + 성장 화면 Lv/상한 표시. PM 결정: 기존 고레벨 저장은 레벨 유지·경험치만 정지, 「선배의 가르침」(경험치 보너스) 미채택 |
| 1.230.0 원정대 ② 의뢰 ✅ | roster.js 말미 `ROSTER_QUESTS` 11종({id, need, cur(roster), reward}) — 진행도는 roster로 매번 계산(저장 X), 받은 것만 계정 `rosterQuests.claimed`(account toView/fromView) · `rosterQuestState`/`rosterQuestBadge`/`claimRosterQuest`(gold·mats 지급, 중복 차단)/`rosterRewardText`. UI: RosterView 상단 의뢰 목록 + 마을 「원정대」 배지 |
| 1.231.0 원정대 ③ 레이드 ✅ | PM 「키운 캐릭터들로 파티 레이드 · 하드캐리 불가 · 고르게 키워 각자 역할 · 60→80→100→각성 20~100」. `src/chronicle/raid.js`: `RAID_TIERS` 8단계(req{lv, rebirth} · 보스 hp/atk · 봉인 seal/sealAtk) · `RAID_SEAL_CLASS_HP`(직업 화력 보정 — 검 .55 술 1.7 마 1.25 정 2.0 사 .3) · `RAID_SEAL_CLASS_ATK`(탱커 보정 — 검 2.4 마 1.5) · `raidEligible`(5직업 전원 **현재** 레벨·전승) · `raidUnlocked`(앞 단계 클리어) · `buildRaidEnemies`(보스 sealedBoss + 봉인 5 sealOf) · `raidReward`/`applyRaidResult`(계정 `raid`{clears, daily{date,done}} — 단계별 하루 1회 + 첫 클리어). engine: `immuneTo`(봉인 = 그 직업만, 봉인 남으면 보스 무적 — damage·thorns·holy·도트 틱·스킬 대상 필터) · 봉인 act = 「봉인의 반향」(주인만 공격) · 파티 표적 = 자기 봉인 우선 · 봉인 주인 사망 = 즉시 lose. account `raidParty(acc)`(5캐릭 deriveUnit, 동행 사역마 불참) · 뷰 `raid` 읽기 전용. UI `RaidView`(원정대 화면 → 레이드) · `fightRaid`/afterBattle 'raid' · BattleCard 좁은 모드(`u.short`). 시뮬 `scripts/sim-chronicle-raid-snap.mjs`(봇 5직업 Lv.20~100 저장) → `scripts/sim-chronicle-raid.mjs`: 균형 파티 55~78% · 전원+20 100% · 1명 −20 대부분 0~30% (예외: 방랑검사 a60·a80 50~73% — 탱커라 본인 봉인은 깸) |
| 1.231.1 레이드 입구 ✅ | PM 「원정대 레이드가 안 보인다」 → 입구가 원정대 화면 안에만 있었음. 마을 타일 `raid` 추가(도전 가능 단계 수 · 오늘 보상 남으면 배지), RaidView 뒤로가기 = 마을 |
| 1.231.2 선택 분해·자동 분해 ✅ | PM 「분해 복수 선택 + 희귀까지 자동 분해」 → BagView 선택 모드(`picking`/`picked` Set · 하단 바: 재화 미리보기·전체 선택·분해·창고) · 일괄 「희귀 이하」 · 계정 `autoSalvage`{grade -1~2, other}(account toView/fromView) → engine applyBattle 드랍 루프에서 등급 ≤ min(grade, 희귀) && (other || itemUsable)면 즉시 분해(`summary.autoSalvaged`/`autoSalvage` 재화) — 에픽 이상 항상 보존 |
| 1.231.3 분당 효율 ✅ | PM 「어느 조합·어느 던전이 효율적인가 분석」 → `huntRecord(sim, party, enc, summary, speed, label)`가 `ms`(= `battlePlayMs`: BattleView 재생 공식 ÷ 배속 + 대기 1.8초 — 결과 화면 체류 시간 제외)·`setup`(직업·레벨·동행)·`label`·파편·열쇠·사역마 경험치·분해 재화(`salv` = summary.autoSalvage + 신규 `summary.dismantleLoot`(가방 가득 분해)) 기록 → `HuntReport` 「획득 · 분당 효율」 표(총량/분당/전투당, `gainRows`). 배속은 `readSpeedPref`(localStorage chronicleSpeed + 이용권). 반복 사냥·던전 한 판(2전투+) 종료 시 `logEfficiency` → localStorage `chronicleEffLog` 최근 40건 → `EfficiencyLog` 시트(정렬 경험치/골드/정수/장비 per 분). ⚠️ 새 전투 경로에서 huntRecord를 부를 땐 speed·label 인자 필수 |
| 1.231.4 세부 능력치 ✅ | PM 「방랑검사 반격 확률이 안 보인다 → 안 보이는 스탯 전부」 → 성장 화면 능력치 표 아래 `DetailStats`(ChronicleGame.jsx) — `DETAIL_STATS` [키, 라벨, 형식] 40종을 `deriveUnit` 결과에서 값 있는 것만 표시(치명 피해는 항상, 방랑검사 반격 확률은 0이어도). ⚠️ deriveUnit·PASS_KEYS에 새 전투 키를 추가하면 DETAIL_STATS에도 라벨 추가 |
| 1.232.0 효율 미리보기 ✅ | PM 「사역마·장비를 바꾸면 효율이 오를지 미리」 + PM 결정(장비 상세·사역마 편성에 버튼 · 기준 = 마지막 사냥 스테이지). `src/chronicle/preview.js`(순수): `previewCompare(before, after, target, {battles 200, speed})` — 조우 목록을 시드로 미리 굴려 양쪽 공유 + 전투 i번째 난수 `seededRng(seed+i×7919)` 고정 → 같은 상태면 결과 100% 동일 · 보상은 `applyBattle` summary만 읽고 버림(저장 불변) · `previewTarget(save, last)`(localStorage `chronicleLastHunt`{hero,fieldId,stage} — fightField hunt에서 기록, 없으면 열린 최고 스테이지) · `battlePlayMs`를 여기로 이동(ChronicleGame은 재사용). UI `PreviewSheet`(BagView 장비 상세 · FamiliarView 편성 후보 옆 📊) — 경험치·골드 ±3%·승률 ±1%p는 「=」. 성능 200전×2 ≈ 0.13초 |
| 1.232.1 점검 후속 ① ✅ | PM 점검 보고 2번 묶음. 공용 `ConfirmSheet`(ChronicleGame.jsx) — BagView `askDismantle`(일괄·선택 분해 공통, 등급별 수·재화·강화 장비 경고) · Forge `guard`(enhanceRisk.drop/breakChance · promoteRisk.breaks일 때만, 모듈 변수 `forgeConfirmSkip` = 이번 접속 동안 묻지 않기) · 전투 로그 칩 `display:inline-block`(칩 사이 줄바꿈 — 인접 span은 공백이 없어 줄바꿈 지점이 없었음) · 첨탑 `towerRunRef`(층이 이어지지 않으면 새 도전, 패배 시 runReport kind 'tower' + logEfficiency). 레이드는 단일 전투라 기존 📊 전투 집계로 충분 |
| 1.232.2 점검 후속 ② ✅ | PM 점검 보고 3번 묶음. TownView `todos`(우선순위: 성장 포인트 → 의뢰 소식 → 보스/관문 → 원정대 의뢰 → 레이드 일일 → 소환 → 열쇠 가득 → 가방 90%, 최대 3) + 메뉴 `GROUPS` 4묶음 × 3열(타일 id `exit` = 게임 선택). 연출 index.css `chr-win/chr-levelup/chr-drop(--g 등급색)/chr-flip/chr-flip-hi/chr-pop/chr-pop-destroy`(reduced-motion 가드) · `CountUp`(승리 경험치·골드) · `ForgePop`(대장간 결과, onDone은 ref로 — 리렌더 시 타이머 재시작 방지). ⚠️ 새 마을 메뉴는 tiles + GROUPS 둘 다에 추가 |
| 1.233.0 오프라인·일일 ✅ | PM 점검 보고 4번 중 2개. **오프라인** `src/chronicle/offline.js` — `OFFLINE`{minMs 5분 · maxMs 8시간 · eff .5 · battles 40} · `offlineReward(save, target, awayMs)`(= `P.estimateRate` ×1 분당 값 × 분 × eff, 승률 반영, 장비 없음) · `mergeOffline`(같은 캐릭터면 합산·8시간 비례 축소) · `claimOffline(acc)`(toView(active=pd.hero) → engine `grantOffline`(gainExp 원정대 상한 적용) → fromView). 접속 시각 localStorage `chronicleLastSeen`(30초 간격·hidden·pagehide 기록, 마운트·visible 시 계산 → 계정 `offline.pending`에 저장 = 새로고침 안전). UI `OfflineSheet`(마을에서만, 닫아도 수령). 실측: 방랑검사 Lv.60 광란의 숲 4, 3시간 → 경험치 59만(Lv.60→72) · 🪙11만. **일일** `src/chronicle/daily.js` — `DAILY_MISSIONS` 5종(metric win/elite/dungeonWin/forge/summon) + `DAILY_BONUS`(🎫1) · 계정 `daily`{date(KST),prog,claimed,bonus} · `trackDaily(acc, deltas)`(UI: fightField·fightDungeon·fightTower 승리 `winDeltas` + Forge/Familiar `onTrack` prop) · `claimDaily`/`claimDailyBonus`(열쇠는 DUNGEON_KEYS.max 상한). UI `DailyView`(view 'daily') + 마을 타일·지금 할 일. ⚠️ 새 승리 경로를 만들면 trackDaily도 호출 |
| 1.233.1 오프라인 경험치 제거·소환권 통합 ✅ | PM 「오프라인 경험치 너무 많이 오른다」 → `offlineReward` exp 0 · `claimOffline`도 exp 0으로 지급(구 대기분 포함) — 골드·정수만. PM 「소환권·계약서 조각 구분 의미?」 → 진단: 효과 같음 + 소환권은 10연 확정 불가 + 첨탑 ✪60 vs 조각 ✪50 → PM 결정 **조각으로 통합**: `mats.sealPlus` 폐지 — `ensureQuestFields`가 보유분 ×10 조각 환산(환산 후 0 → 반복 안전) · 보상 sealPlus N → famShard N×10(roster·raid·daily 보너스·V1_GIFT, 구 gift.sealPlus 호환) · `TOWER_SHOP` 'ticket' 삭제 · `summonFam(save, n, rng)`(useTicket 인자 삭제 — 시뮬 스크립트도 수정) · UI 소환권 버튼·지갑 표시 삭제. ⚠️ 새 보상에 sealPlus 쓰지 말 것 |
| 1.234.0 자동 진행 ✅ | PM 「관문 조건 달성 → 관문 → 다음 스테이지 → 반복 → 보스(이야기 자동 스킵), 실패 시 중단」 + 「의뢰 완료로 반복이 멈춘다」. engine `autoProgressStep(save, field)` → {field, mode hunt/gate/boss, stage} 또는 {field:null, reason} (보스 잡은 지역이면 다음 지역, 미개방이면 종료) · UI main `autoProg` state + `startAuto`/`autoStep`/`stopAuto`(repStatsRef 보고서 공유, repeat와 배타) · `fightField(…, opts.auto)`: 보스 앞 장면은 `Q.markSceneSeen`으로 건너뛰고(로컬 `let save = saveNow`) 패배 시 stopAuto · BattleView `autoProg` effect(승리 1.8초 뒤 onAgain = autoStep) + 「자동 진행 중… (끄기)」 · afterBattle(계속)도 정지. 반복 사냥 정지 조건에서 `questsDone` 제거. node 검증: 광란의 숲 4 → 6 관문 → 보스 → 봉인 성역 1 관문 패배에서 정지 |
| 1.234.1 경험치 감쇠 ✅ | PM 「렙업이 너무 잘된다·전설 던전 너무 쉽다」 → 진단: 레벨 차이 무관 경험치 + 던전 rewardMult = 난이도 HP 배율(전설 ×2.6) → 낮은 던전 전설이 최고 사냥터(Lv.70 심장부 전설 분당 56,588 vs 사냥 13,302). PM 결정 「레벨 차이 감쇠 + 던전 경험치 정상화」(필요 경험치 곡선은 유지). `CHRONICLE_TUNING.expGap`{free 5, perLv .15, min .1} · engine `expGapMult(heroLv, enemyLv)` → battleRewards exp(mods.heroLv = applyBattle에서 주입) · `DUNGEON_TIERS[].expMult` 1/1.2/1.4 → dungeonEncounter가 적 rewardMult를 `D.area.hpMult × dungeonSolo.hp × expMult`로 덮음. 실측: 적정 사냥터 변화 0 · Lv.60→Lv.48 사냥 -90% · Lv.70 심장부 전설 전투당 1,146→60 |
| 1.235.0 위압 ✅ | PM 「Lv.30대 술법사+남령 탱커가 Lv.50 몹을 쉽게 잡는다 → 레벨 차이 위압, 10렙 차이는 극복 불가」. `CHRONICLE_TUNING.intimidate` 4단계 [{gap 3, hp 1.3, atk 1.25} / {5, 1.8, 1.8} / {7, 2.6, 2.8} / {10, 8, 7 절대 위압}] · engine `intimidateLevel(heroLv, enemyLv)`/`intimidateStep(n)` · 적용은 `scaleEnemiesForRebirth`(전승 + 위압, 적에 `intim` 필드) — UI 3경로·미리보기·시뮬 스크립트 전부 이 함수 경유 (⚠️ 새 전투 경로·시뮬도 반드시 호출). 기준 = 주인공 레벨. UI `IntimNote`(사냥터·던전) + 적 카드 배지 + 전투 상단. 시뮬 `scratchpad/sweep.mjs`(레벨 차 +0~+10 승률): 남령 수호 술법사 +7 85% · +9 78% · +10 0~8% / 사역마 없음 +5 3~45% · +7 0~15%. 진행 시뮬 보스9 3,422~4,034전(변화 없음) · 첨탑 기록 변화 없음 |
| 1.235.1 사역마 역할 밸런스 ✅ | PM 「모든 직업 최적이 수호 → 원인 분석·개선」 → 진단(`scratchpad/diagfam.mjs`, +5 몹): 수호가 받는 피해의 **74~90%**를 대신 맞음(원인 ① `f_guard` 도발 cd 3·지속 3 = **상시 도발 85%** + 수호 태세 + 패배 조건이 「주인공 사망」뿐이라 피해 전가가 최강 효과 ② 독립 능력치 곡선 × 남령 2.2 → 수호 HP 3,700 > 모든 주인공 HP) · 치유는 회복력 = 곡선 공격 × 0.2 **고정값**이라 위압으로 적이 강해지면 주인공 HP의 35~60%만 메움 · 기존 검증은 「역할별 승률」만 봤고 **역할 간 격차·피해 분담 비율**은 안 봤음. PM 결정 「수호 하향 + 치유 상향」: `FAM_SKILLS.tank f_guard` turns 3→1 · `FAM_ROLES.tank` guard [.3,.35,.4,.45,.5]·hp .7 · `healer` heal .4·hp .45 · 맹공 유지. ⚠️ 1.216.0 「술법사+수호 강세 유지」는 이번 PM 결정으로 완화(여전히 술법사 최적은 수호). 검증 `scratchpad/sigcheck.mjs`(고유 스킬 13종 × 직업 × 레벨 차 +0~+7, 남령): +5 수호 34~88 · 치유 46~68 · 맹공 42~62 / 진행 시뮬 보스8 2,951~3,588전(+5%) / 던전 영웅은 치유 동행 75~100%(긴 전투 = 치유 정체성) |
| 1.236.0 무리·시너지 ✅ | PM 「수호가 여전히 압도적 → 몹 3마리 고정(역할 랜덤) · 보스는 공략 필요한 조합 · 특성 테크에 따라 최적 동행이 바뀌게」. **무리** `CHRONICLE_TUNING.enemyParty`{packSize 3 · packMult hp/atk .6 · packReward .6(경험치 rewardMult·골드 goldMult·조각 dropNormal) · roleWeights tank 1/healer 1/dps 2 · roles} — engine `roleEnemy`/`packOf`(일반·강적·관문, 보스 제외) · 적 `erole` · 적 act: tank = turn 1,4,7…에 도발(taunt) / healer = 아군 HP<75% 회복(cd 2) · 파티 표적 `pickEnemyTarget` = 도발 중인 적 80% + 맹공 사역마는 적 치유 우선. **시너지** talents.js `TREE_FAM`(갈래→짝 역할: 딜→tank · 생존→dps · 반격/지속→healer) → `talentFx`가 `fam_<role>` = 그 갈래 포인트 수 → PASS_KEYS → engine `famSynergyFx(role, pts)`(`CHRONICLE_TUNING.famSynergy` 포인트당: tank guard .008 / healer healPower .02·healBelow .004·healShield .01 / dps chain .012·atk .008) → `applyFamSynergy`(partyCombatants). UI `FamSynergyNote`(특성 화면) · 적 카드 역할 배지. ⚠️ 수치형 시너지(+1.5%/점 능력치)는 최적 동행을 2/15만 바꿔 기각 → 기능형 채택. 시뮬 `scratchpad/eff.mjs`(직업 × 2갈래 빌드 × 역할, +3·+5 무리 분당 승리): +5 최적 맹공 6·치유 5·수호 3 (이전 수호 독주) / 진행 시뮬 보스9 3,225~3,472전. ⚠️ 혼혈 마족 +5 무리 치유·맹공 동행 8~68% (생존력 약점 — 다음 조정 후보) |
| 1.236.1 저장 안전 ✅ | PM 결정(점검 보고 1번 「보호·백업 먼저, 클라우드는 다음」). `src/chronicle/backup.js`(localStorage만): `loadAccountSafe`(→ {acc, status ok/empty/restored/lost} — 본 저장 파싱·`isValidAccount` 실패 시 원본을 `_corrupt` 키에 보관 → `_bak`로 복구, 둘 다 실패면 lost) · `writeAccountSafe`(쓰기 전 `BACKUP.everyMs` 10분마다 **현재 정상 저장본**을 `_bak`/`_bak_at`에 복사 — 깨진 본 저장은 백업을 덮지 않음) · `exportText`(감싼 형식 {tag 'dnt-chronicle', v, at, acc})/`exportFileName`/`parseImport`(감싼 형식·계정 원본 둘 다 허용)/`backupInfo`/`accountSummary`. ChronicleGame: `loadAccount`/`writeAccount`가 BK 경유 · 모듈 변수 `loadStatus` → main `loadNotice` 시트 · TitleView 「💾 백업」 → `BackupSheet`(파일 저장 Blob · 클립보드 · 파일 선택 FileReader · 붙여 넣기 · 자동 백업 복원, 바꾸기 전 확인 창) → main `onImport`. 검증 `scratchpad/bktest.mjs`(11개 통과) + Playwright(깨진 저장 → 복구 안내·골드 일치·원본 보관). ⚠️ 클라우드 저장(Firebase)은 다음 PR |
| 1.237.0 보스 기믹 ✅ | PM 「보스는 화력보다 파티·스킬 조합으로 공략」 + PM 승인 설계. data.js `BOSS_MECHS` 6종{name,icon,desc,tip} · `BOSS_MECH_OF`{field: 1 ward·2 ritual·3 reflect·4 execute·5 storm·6 ritual·7 ward·8 execute·9 storm·10 enrage·11 reflect·12 enrage / dungeon: frostTomb ward·forestHeart ritual·frostAbyss storm·sanctumVault reflect·riftHeart execute·dawnGarden enrage} · 수치 `CHRONICLE_TUNING.bossMech` 한 곳. engine `bossMechOf(kind, id)` · `withBossMech(boss, mech, pool, make, rng)`(ward = 호위 tank 2기 `warden` · ritual = healer 1기 `acolyte`{healPct .07, healCd 0, healBelow 1 → 보스 우선}, 수행원 보상 ×0.2) — rollFieldEncounter 보스·dungeonEncounter 보스에서 호출(첨탑·레이드 제외) · 전투: `immuneTo`에 ward(호위 생존 시 보스 무적) · storm(turn%3 광역 1.1, 기존 bossAoe 대체) · execute(주인공 HP<35% → ×3 「처형」) · reflect(`u.fx.reflect` → damage() 끝에서 공격자에게 30% · 상한 최대 HP 8% · 'reflect' 이벤트, 도트는 damage() 미경유라 반사 안 됨) · enrage(atkMod round>8 → +25%/R). 적 healer 로직은 `u.healPct/healCd/healBelow` 우선. UI `BossMechNote`(사냥터 보스 버튼·던전 패널) · 전투 상단 기믹 · 적 카드 「결계 호위」「의식 사제」. 시뮬 `scratchpad/mech.mjs`(기믹 × 직업 × 동행, Lv.88~97 +3): 직업·기믹마다 최적 동행이 갈림(방랑검사 = 치유 / 마족 = 수호 위주·폭풍은 치유 / 사제 = 맹공) · ⚠ 반사 50%는 술법사 2라운드 즉사 → 30%+상한. 진행 시뮬 보스 승률 83~92% → 58~73%, 보스9 3,242~3,403전 |
| 1.237.1 클라우드 저장 ✅ | PM 「클라우드 저장 진행」. `src/chronicle/cloudSave.js`(firebase 사용 — backup.js는 순수 유지): 위치 **`users/{uid}/chronicle/save`**(본편 `users/{uid}`는 setDoc 전체 교체라 필드로 넣으면 지워짐 → 하위 문서로 분리) · 문서 {data: 계정 JSON **문자열**(Firestore 배열 속 배열·undefined 회피), savedAt, version, summary} · `uploadChronicle`/`downloadChronicle`(→ {ok, error} — permission-denied는 「보안 규칙 허용 필요」 문구) · `compareSummaries` · `CLOUD`{autoEveryMs 3분, maxBytes 900KB}. ChronicleGame main: `watchAuthState`(본편과 같은 계정, 로그아웃 버튼 없음 — 본편 계정 꼬임 방지) · `cloud`{checkedUid, lastUp, busy, error, conflict} — **checkedUid 전에는 자동 업로드 금지**(빈 새 기기가 덮어쓰기 방지) · 로그인 시 다운로드 → 없으면 업로드 / 요약 같으면 확인 완료 / 다르면 `conflict` 시트(클라우드로 이어하기 vs 이 기기 유지) · 자동 업로드 = dirtyRef + 3분 interval + visibility hidden · BackupSheet `CloudPanel`(구글 로그인 · 지금 올리기 · 불러오기 → 가져오기 확인 창 재사용). ⚠️ **Firestore 보안 규칙**은 저장소에 없음 — `users/{uid}` 규칙이 하위 문서를 허용하지 않으면 permission-denied (PM이 콘솔에서 `match /users/{userId}/chronicle/{doc}` 허용 추가 필요). 실제 Firebase 연동 테스트는 미실시(샌드박스) — Playwright로 UI만 확인 |
| 1.237.2 클라우드 확장 ✅ | PM 「Firestore 자동 저장 연동」 → PM 결정 「아르카나 연동 + 연대기 간격 단축」(Firebase Hosting 이전은 불필요 — GitHub Pages에서도 Firestore 동작). 공용 `src/cloud/gameSave.js`(`uploadGameSave/downloadGameSave(uid, slot, …)` → `users/{uid}/{slot}/save` {data JSON 문자열, savedAt, version, summary}) · 공용 훅 `src/cloud/useGameCloudSync.js`({slot, data, onLoad, summarize, compare, validate, everyMs 30초} → {user, state, conflict, chooseCloud, chooseLocal, login, upload, download} — checkedUid 전 자동 업로드 금지 규칙 동일). 연대기 `cloudSave.js`는 공용 함수 래퍼로 정리 + `CLOUD.autoEveryMs` 30초(ChronicleGame 동기화 로직은 1.237.1 그대로 — 훅과 동일 규칙). 아르카나 `ArcanaGame.jsx`: 훅 사용 · 타이틀 「☁ 클라우드 저장」 시트 · conflict 시트 · `arcanaSummary`(runs/wins/bestAct/inRun). ⚠️ 새 미니 게임 저장은 이 훅으로 연결할 것. 보안 규칙: `users/{userId}` 블록 안 `match /{sub=**}` 허용 필요 |
| 1.238.0 상세 전투 통계 ✅ | PM 「주인공·사역마의 스킬 사용횟수·딜량·회복량·보호막·받아낸 피해·크리·회피·반격 등 집계 가능한 모든 수치를 통계 탭으로」. engine `battleDetailStats(sim, party)` → {units{id: 36개 지표 — acts/skillUses/basicUses/dmg/hitDmg/landed/crits/critDmg/misses/maxHit/dotDmg/counters/counterDmg/chains/chainDmg/holyDmg/reflectDmg/kills/heal/overheal/hotHeal/maxHeal/shield/buffs/debuffs/taken/timesHit/maxTaken/absorbed/dodged/coverHits/coverDmg/dotTaken/healRecv/shieldRecv/deaths}, skills{`id|스킬`: uses/dmg/hits/crits/heal/shield}} · `mergeDetailStats`(DETAIL_MAX_KEYS = max, 나머지 합) — 처치·쓰러짐은 사건 스냅샷 st의 HP 0 전환(공로 = 반격 주인 > 지속 피해 최대 기여자 > 사건 주체). 검증: dmg·heal·taken이 battleDamageStats와 일치. UI: huntRecord `detail` → addHuntRecord(사역마 키 fam:키로 변환 후 병합) → HuntReport 탭 「📊 요약 / 📈 상세 통계」(localStorage `chronicleReportTab`) · `DetailReport`(유닛 칩 · 공격/행동/지원/방어 4구역 · 스킬별 표). ⚠️ 새 사건·hit 필드를 엔진에 추가하면 battleDetailStats도 같이 |
| 1.239.0 경험치 바 ✅ | PM 「나와 사역마의 경험치 바 — 이미지 먼저」 → 시안 3곳 PM 승인. ChronicleGame `expSnap(save)`(주인공 {lv,exp,need,cap} + 동행 사역마 {key,lv,exp,need,cap}) → fightField·fightDungeon·fightTower의 setBattle에 `xp: {before, after}`(레이드 제외) · BattleCard `xp` prop(HP 아래 4px 바 + 승리 후 +획득량, 좁은 카드 제외) · 결과창 `XpResultRow`/`XpGainBar`(어두운 구간 = 원래 · 밝은 구간 = 이번 획득, 레벨 업이면 0부터 · 0.9초 차오름) · 마을 프로필 동행 사역마 줄. 색 상수 `XP_HERO`(금)·`XP_FAM`(보라). ⚠️ 새 전투 경로의 setBattle에도 xp를 넣을 것 |
| 1.239.1 집계 창 순서 ✅ | PM 「패배 화면 전에 전투 통계가 먼저 열린다 → 구조 정리」 → 원인: 반복 사냥·자동 진행 종료 effect가 **계산 시점**(fightField 안 setRepeat(false)/stopAuto)에 바로 setReport → 재생 시작 전에 보고서가 열림. 구조: 세션 집계(반복 사냥·자동 진행·던전 한 판·첨탑 도전)는 전부 `queueReport(rep, battleKey)` → `pendingReport` 대기 → BattleView `onReplayDone`(재생 끝) → `replayDoneKey === battle.key`일 때 0.9초 뒤 `report` 열기(전투 화면이 아니면 즉시) · `sessionReport`(결과창 「📋 사냥 보고서」 다시 열기) · BattleView `holdAuto`(집계 대기·열림 중 반복·자동 진행·연속 도전 정지). 1회 전투 「📊 전투 집계」는 버튼으로만. ⚠️ 새 세션 집계는 setReport 직접 호출 금지 — queueReport 사용 |
| 1.239.2 공격 분담 통계 ✅ | PM 「탱커 사역마가 탱을 안 하는 느낌 — 사제가 다 맞는 것 같다」 → 진단: ①표시 문제 — `battleDetailStats` 피격(timesHit)이 HP 피해(d>0)만 세서 보호막에 전부 막힌 타격 누락 ②실제 분담(scratch `tankshare.mjs`, 숲 4 무리·보스 300전): 청령+6 공격 대상 46~61% · 피해량 35~43%(사역마 방어로 타격당 피해가 작음 + 보스 「처형」은 주인공 전용) · 남령+5 59~75% / 48~60%. PM 결정 **「통계 수정만」(밸런스 유지)**. 신규 지표 `targeted`(회피 포함 공격 대상 횟수)·`incoming`(HP+보호막) · timesHit = d>0 또는 ab>0 · maxTaken = incoming 기준. UI 방어 구역 「공격받은 횟수 · 적 공격의 n% · 들어온 피해의 n%」/「들어온 피해」/「HP로 받은 피해」 · 요약 기여도 줄 「적 공격의 n% 받음」 |
| 1.240.0 첨탑 자동 등반 ✅ | PM 「황혼의 첨탑 자동 등반, 실패 시까지」. main `towerAuto`(localStorage `chronicleTowerAuto`) · `startTowerAuto`(E.startTower → `fightTower(s0)` — fightTower가 선택 인자 `sArg`로 막 만든 도전 저장을 받음, 내부 변수 `sv`) · BattleView `towerNext`(첨탑 승리) + effect(1.8초 뒤 onAgain = fightTower, `holdAuto`·집계 열림 중 정지) · 결과창 「자동 등반 중… (끄기)」 · TowerView 「⏫ N층부터 자동 등반」 + `TowerAutoToggle`. 패배 = 도전 종료라 자동 정지 + 기존 첨탑 도전 집계(queueReport). Playwright: 1→19층 무개입 등반 확인 |
| 1.240.1 쿨타임 표시 ✅ | PM 「스킬 쿨이 어디에도 없다 · 쿨감 옵션 반영 표시 · 쿨 0이면 우선순위?」. 엔진 규칙(변경 없음): 사용 시 `cds = max(1, cd+1-cdr)` → 자기 턴 끝에 −1 → **실제 대기 = max(0, cd − cdr)** (cdr = deriveUnit, 장비·유니크·특성 합산 상한 2) · cd 0인 스킬은 전부 패시브(16종) · 우선순위는 쿨타임과 무관 — chooseSkill 상황 순서(고유/특수 → 전체 회복(2명+ 부상) → 회복(위급) → 보호막 → 강화 → 광란 → 도발 → 광역(적 2+) → 단일 최고 위력 → 기본 공격). UI `CdChip`(스킬 목록 「⏱ 4→3턴」/「매 턴」/「패시브」)·`CdDetail`(정보 시트 계산식)·목록 하단 우선순위 안내. ⚠️ 단일기는 위력 최고만 골라 대기 0이면 다른 단일기를 안 씀 |
| 1.241.0 스킬별 쿨감 ✅ | PM 「모든 스킬 쿨감은 유니크에만 · 일반 장비는 랜덤 특정 스킬 쿨감으로 선택 폭 확대」 + 「인연 2단계 달성법을 모르겠다」. data `OPTION_DEFS.scdr`(옵션 객체 {k:'scdr', v:1, sk: 스킬 id}) · 5직업 `OPTION_POOLS`에 scdr 2 (sage의 cdr 삭제 — `cdr`은 유니크 전용, 일반 풀 없음) · 직업 장신구 유니크 5종 fx에 `cdr: 1` · 에픽 `c_time` fx `longCdr`(가장 긴 쿨 스킬 -1). engine `scdrSkillList(cls)`(갈래 제외·재사용 2턴+) · `normOpt`(구 장비 opts cdr → 그 직업 스킬 1개, uid로 고정 — 저장 변환 없이 읽을 때 변환) · itemStats 키 `scdr_<스킬>` · statLabel 「「스킬」 재사용 -1턴」 · deriveUnit `skillCdr` 맵(scdr_ + longCdr) · **`skillCdrOf(u, id)` = min(CDR_CAP 2, cdr + skillCdr[id])** → act 쿨 계산 · UI CdChip/CdDetail(출처 표시). 인연: FamBondView 2단계 조건 문구(지역 남령/무리 청령/특별 자령 + 강화 +5)·아이콘 ✓·「n/m」. ⚠️ 진행 시뮬은 시간 초과로 미실행 |
| 1.242.0 사역마 경제 ✅ | PM 「진화까지 강화 비용이 너무 든다 — 재화·비용 시뮬 돌려봤나?」 → **처음 실측**(scripts/sim-chronicle-fam-econ.mjs): 사역혼 수입이 중복 소환뿐(소환 1회당 초반 0.6 → 500회 뒤 3.1) · 청령→남령+5 31시간+ · 남령→자령 142시간+(초반 3~5배). PM 결정 「수입↑ + 진화 천장」: familiar.js `FAM_TUNING` soulNormal .05/soulElite .4×[1,3]/soulBoss 8/soulTowerBoss 12/soulDungeonBoss [15,22,32] → `rollFamSouls`(engine applyBattle 승리 시 `summary.famSouls`) · `evolveFailDrop` 1 + `evolveFailDropBy`{indigo 3} · `evolvePityAdd`{red .2, green .2, blue .15, indigo .03} → `famEvolveRate(f)`(f.evoFails, 성공 시 0) · `famEvolveMaxTries`·`famEvolveFailDrop`. UI 진화 버튼 실시간 성공률·천장·확정 시도 · 승리/보고서 사역혼. 결과(×2, 초반~후반): 청령→남령+5 **9.6~6.9시간** · 남령→자령 **37~26시간** · 적령→남령+5 14~10시간. ⚠️ 사역마 비용·수입을 바꾸면 이 시뮬로 시간 환산 확인 |
| 1.243.0 자령 패시브·베이스 등급 ✅ | PM 「도발 1턴이면 쓴 턴에 이미 맞는다 · 자령도 고유 패시브 · 진화로 상위 등급 고유 능력이 생기면 안 된다」. ①**도발 버그**: `u.taunt = s.turns`가 같은 자기 턴 끝 감소로 즉시 0 → `s.turns + 1` (적 탱커 도발과 같은 규칙, duel·warcry의 guardDef도 +1). 사역마 공격 대상 비율 +5~10%p ②**베이스 등급** familiar.js `famBaseGrade`(f.base = 소환 등급, 소환으로 상위 재획득 시 갱신 · 구 저장 = min(현재, `famNaturalGrade` 출신 한계: 일반 녹 / 강적 청 / 1부 보스 남 / 2부+·던전 보스 자)) · `famHasSignature`(현재·베이스 둘 다 남령+) · `famHasPassive`(자령) — famCombatant·famSkillInfo가 사용 ③**자령 패시브** `FAM_PASSIVES` 역할별(수호 vGuard .2 = engine onHurt에서 주인공 전투당 1회 버팀 / 치유 vRegenAll .15 = 사역마 행동 전 아군 전원 회복 'hot' 이벤트 / 맹공 armorPen .3·crit +.15) · `BOSS_PASSIVE_NAMES` · `famPassive`. 검증 scratch vp.mjs(+3 무리, 같은 자령 베이스 남령→자령): 승률 +0~17%p. 진화 = 같은 사역마 등급 상승(강화 0 초기화), 새 사역마 아님 |
| 1.244.0 사역마 화면 정리 ✅ | PM 피드백 4건(보조 효과를 알 수 없음 · 편성/대기 구분 없음 · 설명창이 글 나열 · 능력치·스킬 식별 어려움) → 시안 이미지 PM 승인 후 구현. **공용 부품** `src/components/ui/InfoBlocks.jsx`(InfoSection 색 띠 구획 · InfoRow 항목-값 · StatTiles · ValueChip(▲▼ delta) · HiNum 숫자 강조) — PM 결정 「사역마 먼저, 장비·스킬 정보창 등 전역은 후속 PR」. familiar.js `famSubItems`/`famSubDelta`/`famSubPctOf`. ChronicleGame: `FamCard`(보조 효과 칩·slot 배지·cur 비교·hideSub) · `FamSlotBadge` · 편성 시트(지금 칸 / 다른 칸 편성 중 / 대기, 동행 칸은 `FamMainDelta` 능력치 증감) · 보관함 편성 중/대기 묶음 · 설명창 `selTab` 효과/능력치·스킬/성장 — `FamEffectSections`(동행 칸·보조 칸·보유·인연) · `FamSkillPanel`(타일 + 스킬 카드) |
| 1.245.0 장비·성장·스킬 정보창 ✅ | PM 「다음 정보창도 이미지 먼저」 → 시안 3건 승인 후 InfoBlocks 확산. **장비** `ItemDetailBody`(BagView 장비 시트: 머리 칩 · ⇄ 착용 비교(가방 장비만, 키별 ▲▼/신규/사라짐) · ◆ 기본 능력치 타일(`BASE_STATS` atk/def/hp/spd + 전투력) · ✦ 추가 옵션(나머지 itemStats 키, GRADES.opts 칸) · ★ 특수 효과(uniqueDef/epicOptOf) · ⚒ 강화(enhanceRisk)) — 착용 중 장비 버튼 = 「착용 해제」(E.unequipItem, 중복 「착용 중」 버튼 버그 해소). **성장** 전투 능력치 StatTiles · `DETAIL_GROUPS`(공격/생존/스킬/획득 — ⚠️ DETAIL_STATS에 새 키를 넣으면 그룹 keys에도 추가) · **스킬** 카드(`SKILL_KIND_LABEL` · ●○ · ⏱ 칩 · `skillParts` 효과 칩) + 「자동 사용 규칙」 접기(`rulesOpen`) · `SkillInfoBody`(위력/재사용/대상 타일 · 레벨별 위력 · 재사용 계산 · `SKILL_WHEN_TEXT` 발동) |
| 1.246.0 대장간·첨탑·원정대 화면 ✅ | PM 「대장간·첨탑 상점·원정대도 시안 먼저」 → 시안 승인 후 구현. **대장간** ForgeView 시트: `ForgeHead` · `ftab` 강화/승급 탭 · `ForgeCompare`(지금 → 이후, itemStats 키별 ▲▼) · `ForgeCost`(`FORGE_COST_ROWS` gold/essence/shard 필요/보유) · `ForgeOdds`(결과 막대 — 강화: 성공 rate / 하락 (1-rate)(1-break) / 파괴 (1-rate)break, 승급: 성공/파괴) · `forgeShort`(부족 문구) · 규칙 `rulesOpen` 접기. **첨탑** 규칙·주화 InfoSection + 상점 2열 카드(towerShopCanBuy · 「N 부족」). **원정대** `buffSrc`(다른 캐릭터 peak ≥ 마일스톤 → GLOBAL_BUFFS fx, 출처 표시 + 합계) · 의뢰 `qs` 정렬(done → progress → claimed) · 보상 ValueChip. ⚠️ 시트 교체 시 같은 title 패턴이 StashView에도 있음 — 함수 시작 index부터 검색할 것 |
| 1.247.0 본편 스타일 정보창·흐름 ✅ | PM 「트와일라잇(본편) UI가 더 깔끔 — 캐릭터 정보창·스킬창부터」 + 「전투 집계 자동으로 열리지 않게」 + 「사냥 종료 후 다음 던전·홈 가는 과정이 돌아간다」 + 「광기의 낙인 = 피의 광란?」 → 시안 ⑪⑫ 승인. ChronicleGame 본편 부품: `MS`(본편 색 — 와인 테두리·#231014 상자) · `CLASS_PATH` · `MainSecHead`(「— 구 획 —」) · `MainKvGrid`(2열 줄, 누르면 `rowInfo` 설명) · `MainModal`(붉은 2px 테두리 · 머리말+큰 이름+배지 · 닫기) · `MainCell` · `MainSkillCard`(액티브 3열)·`MainPassiveCard`(레벨 막대)·`MainSkillModal`(강화 버튼 포함 — 목록의 강화 버튼 삭제) · 능력치 상자 → `statPick` 모달(+1/전부) · `DetailStats`(onPick, 스킬·획득 병합, `detailColor`/`detailValue`/`DETAIL_DESC`) · SkillInfoBody 삭제. 흐름: `queueReport`는 `sessionReport`만 저장(자동 열기 폐지 — 📋 버튼) · 「다음 층으로」= onAgain(바로 전투) + 「잠시 멈추기」 · afterBattle 복귀 = raid/dungeon/tower/field(마을 X). **광기의 낙인**: PM 결정 「겹칠 때만 대체」 — deriveUnit에서 `g.rageDouble ≥ 2`(낙인 + 특성 dt_b9)면 `rageTurnsAdd +1`·`rageLifesteal 1`(engine rage 버프 지속·흡혈(기본 흡혈·흡혈 스킬) ×2), out.rageDouble은 1로 고정. 시뮬 scratch brand3.mjs(마족 + 남령 수호, 영웅): 특성 없음 63/53% 유지 · 특성 있음 57→68 / 48→68%. 덤: 1.243.0 도발 hits.push가 주석에 묻혀 있던 것 복구 |
| 다음 | 남은 정보창(창고·레이드·일일 임무 등) InfoBlocks 확산 · 클라우드 저장 실기 확인(보안 규칙) · 보스 기믹 실기 피드백 (사제는 맹공 외 시간 초과 — 사제 화력 점검 후보) · 원정대 레이드 실기 피드백 · 혼혈 마족 무리전 생존력

### ☁ 본편 클라우드 저장 안전 (1.237.3 — PM 실사고 「구글 로그인 후 초기화가 잦다」)

| 항목 | 내용 |
|---|---|
| 원인 | `loadCloudMeta`가 실패해도 null → handleSelectGoogle/Guest가 「새 계정」으로 오판 → 로컬 삭제 + 기본값 + 클라우드 덮어쓰기. 부팅 로드도 실패 시 기본값 → 2초 디바운스 자동 저장이 클라우드를 덮음 |
| 불러오기 | `fetchCloudMeta(uid, tries)` → {ok, exists, meta} — 실패와 「없음」 구분, 3회 재시도. ⚠️ `loadCloudMeta`(null 반환)는 신규 코드에서 쓰지 말 것 |
| 업로드 게이트 | App `cloudChecked`(확인 끝난 uid) — 같을 때만 자동 저장. 실패 시 재시도 effect(15초·online·visible)가 확인 후 비교(shouldOfferRecovery → 선택 창 / 클라우드가 최신+진행도 큼 → 교체) |
| 급락 차단 | `CLOUD_GUARD.blockBelow` .3 — 진행도(`progressScore`)가 마지막 클라우드(`cloudBaseRef`)의 30% 미만이면 저장 차단 + 배너(데이터 선택). 85% 미만·6시간마다·데이터 선택 직전엔 덮어쓰기 전 **백업본** `users/{uid}/backup/main`(JSON 문자열) |
| 기타 | 로그인 공통 `afterCloudSignIn` · redirect 로그인 복귀 `consumePendingGoogle` · 1MB 초과 `too-large` · 계정 화면 상태·백업본 되돌리기(recoveryChoice kind 'backup') |

### ⬆ 최신 버전 업데이트 버튼 (1.179.1)

| 항목 | 내용 |
|---|---|
| 구조 | `vite.config.js` `versionJsonPlugin` — 빌드마다 `dist/version.json`({version}) 생성 (GAME_VERSION 정규식 추출). precache globPatterns에 json 없음 → SW 캐시 비대상 |
| 로직 | `src/utils/appUpdate.js` — `checkLatestVersion`(`./version.json?t=` no-store) / `compareVersions` / `forceAppUpdate`(SW update→unregister, 일러·폰트 캐시 제외 전부 삭제, `?v=` 붙여 replace). 저장은 IndexedDB라 무관 |
| UI | `TitleScreen` 하단 `UpdateButton` — 진입 시 자동 확인, 상태 5종(확인 중/최신/업데이트 가능/업데이트 중/확인 불가). dev 서버는 version.json 없음 → 「업데이트 확인」 표시가 정상 |

### ⬆ 최신 버전 업데이트 버튼 (1.179.1)

| 항목 | 내용 |
|---|---|
| 구조 | `vite.config.js` `versionJsonPlugin` — 빌드마다 `dist/version.json`({version}) 생성 (GAME_VERSION 정규식 추출). precache globPatterns에 json 없음 → SW 캐시 비대상 |
| 로직 | `src/utils/appUpdate.js` — `checkLatestVersion`(`./version.json?t=` no-store) / `compareVersions` / `forceAppUpdate`(SW update→unregister, 일러·폰트 캐시 제외 전부 삭제, `?v=` 붙여 replace). 저장은 IndexedDB라 무관 |
| UI | `TitleScreen` 하단 `UpdateButton` — 진입 시 자동 확인, 상태 5종(확인 중/최신/업데이트 가능/업데이트 중/확인 불가). dev 서버는 version.json 없음 → 「업데이트 확인」 표시가 정상 |

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
| **에테르 시스템 삭제** (1.101.0) | skills.js cost 필드 전삭제 + initCombat(ether 초기화·재생 삭제, 기본기 판정 cd 0 기준) + CombatScreen(가드·HUD 칩·≡ 모달 3칸 체력/방어/소울) + storage.js loadMeta 「에테르의 그릇」 환불(1,500+3,000, 1.44.2 블록 **뒤**에 배치 — 구가격 이중정산 방지) | PM 결정: 에테르는 실제 제약이 아니었음(기본 3 + 턴당 +1 vs 소모 1~2 + CD). 스킬 제한 = **CD + AP만**. 침묵의 저주 → [물약 봉인](curse_potionSeal — handleUsePotion/chooseAutoPotion/벨트 UI 3곳 가드) / 에테르 물약 → 소울 물약(soul: 40, 이어하기 belt 'ether'→'soul' 치환). 신규 스킬에 cost 필드 재도입 금지 |
| **황혼의 벨트 — 포션** (1.96.0, 1.97.0 직업별 개편) | `data/potions.js`(POTIONS 4종·CLASS_BELT 기본/최대·BELT_EXPANSIONS 조건) + helpers `getClassBeltSlots/getBeltExpansionCount` + App `belt` state(런 한정, 스냅샷 포함) + CombatScreen `handleUsePotion/chooseAutoPotion` + ShopScreen 포션 진열 + 사건 `twilight_alchemist`(potion_random) | 직업별 슬롯(PM 지정): 검사 2/4·술법사 1/3·마족 0/1·정령사 1/3·사제 1/2. 확장 = 조건 순차 달성(수련 클리어 → 원정 20회), 확장 1칸당 챕터 시작 랜덤 포션 +1. 제단 meta_beltSlot은 1.97.0 폐기·환불(loadMeta). 사용: AP 미소모·턴당 1회. 자동 룰: HP<50% 최소 충족 물약 / 소울 게이지 ≤60 → 소울 물약(1.101.0~). 회복 보정 미적용 |
| **명예의 전당 — HOF** (1.98.0) | `data/hof.js`(HOF_CLASSES 5인·HOF_SKILLS·HOF_CONDITIONS 8종·HOF_STAGES 10단계·simulateHofBattle 순수 함수) + `HofScreen`(로비+패턴 편집기)/`HofBattleScreen`(로그 재생) + `meta.hof`(levels/patterns/clears/medals) | Hall of Fame(제로식) 모티브 — 유저가 짠 패턴(조건+값+스킬, 위→아래 첫 충족 실행)이 곧 전투력. 본편·레이드와 완전 분리. 시뮬은 순수 함수 → UI는 이벤트 로그 재생만 (밸런스 검증도 node로 가능). 밸런스: 스테이지 mult·훈장은 HOF_STAGES 한 곳, 성장은 hofStatAt(+10%/lv)·hofLevelCost. 검증 기준: 기본 패턴으로 8단계까지, 9~10단계는 패턴 튜닝 필수 |
| **⚰ 무덤의 유산** (1.103.0 신설 / 1.104.0 확장) | `data/buried.js`(단일 데이터+순수함수 파일, 1,300줄) + `components/buried/`(Screen·Dungeon·Battle·Manage·Common) + `meta.buried` + `FEATURE_FLAGS.buried` | **BuriedBornes(Nussy) 모티브 별도 모드**. PM 결정: "캐릭터만 살리고" — 본편에서 계승하는 것은 5직업의 이름·일러·컬러뿐. 패시브·유물·각인·노드맵·AP 일절 미사용.<br>**1.103.0 6축**: ①**장비=스킬**(6슬롯 각각에 스킬 1개 내장) ②**SP**(턴당 회복, 기본 공격이 회수) ③**상태이상 13종**(중독은 미감소·저주는 회복 차단) ④**층 진행형 던전** ⑤**유산 계승형 사망** ⑥**레벨업 스탯 배분**(3p/lv).<br>**1.104.0 원작 확장 9종**: ⑦**보호막**(HP보다 먼저 깎임, 관통·도트는 무시 → `applyBuriedDamage`) ⑧**추격 피해**(적중 시 별개로 1회 추가, 방어 무시 → `resolveBuriedAttack`의 `chase`) ⑨**스킬 레벨 1~8**(같은 스킬 재획득 시 상승, Lv.3·8 추가 효과 → `buriedSkillAt`이 실효 스킬 생성) ⑩**방 효과 15종 + 층 효과 5종**(붉은 방은 양쪽 적용 → `resolveBuriedEnvFx`가 env 뭉치 반환, 전투는 `env*` 필드만 읽음) ⑪**걸음수 기반 마물 레벨**(층 아님 → `buriedMonsterLevel`) ⑫**던전 4종**(미궁→폐허→나락→심연, 순차 해금) ⑬**전직 상위 직업 5종**(미궁 클리어로 해금) ⑭**특성 3개**(1개 전용 + 공용 2, 스탯형은 `aggregateBuriedTraits`가 자동 합산) ⑮**신규 방 2종**(협상·망자의 서고).<br>**1.105.0**: 재련소(먼지→장비 제작)·보관함 확장·일괄 분해·스킬 풀이·실물 비교. **1.106.0**: ⚔**전설의 무구 30종**(`BURIED_UNIQUES` — 갤러리 유니크 효과 [84]~[113] 이식, 보스 전용 드랍 `rollBuriedUniqueDrop`, 판정은 `hasBuriedUnique` 하나로 전투·던전·App 분기) + 🧱**방벽**(개수형 — 적 공격 행동 1회 무효, 보호막과 별개) + 혼란·노화 (상태이상 16종) + 강적·보스 보호막.<br>⚠️ **밸런스 조정은 `data/buried.js` 한 곳** — `BURIED_DUNGEONS`(난이도 4축: floors/stepsPerLevel/baseLevel/보상배율) / `BURIED_TUNING` / `buriedDerived` / 적 hp·atk.<br>⚠️ **난이도 함정 2건 (재발 방지)**: ①상위 던전의 보상 배율(expMult·dropLuck)이 높으면 캐릭터가 더 빨리 자라 **난이도가 역전**된다 ②특정 보스만 유독 강하면 **그 보스가 있는 던전만** 어려워진다 → 최종 보스는 전 던전 공통(무덤의 폭군)으로 통일하고 난이도 축은 마물 레벨만 담당. UI가 순수 함수를 호출만 하므로 **node 시뮬로 검증 필수** |
| **황혼의 도박장** (1.85.0) | `data/gamble.js`(GAMBLE_CONFIG·GAMBLE_SHOP·buildGambleExpedition) + `chapters.js` gamble_arena(챕터 1·2 적 풀 재사용, boss 배열 지원) + `GambleScreen.jsx` + `meta.twilightCoins/fateShards/gambleDaily` | 일일 3회 3연전 더블 업(❂10→20→40, 전멸 시 소멸) + 승리당 0.5% 잭팟 ❂500 + 천장(조각 100=❂500) + 전용 상점(영혼·심연석·정수). 도박 런은 스냅샷·반복·전문가 카운트 제외. 밸런스는 GAMBLE_CONFIG 한 곳 |
| **자동 사냥 대기화면·정산·반복** (1.81.0) | `AutoHuntOverlay.jsx`(persistent 레이어) + CombatScreen `dmgStatsRef/trackDmg` + App `runStats/victoryStats/runRepeat/runRestartRef` | 대기화면: 자동 ON 시 상태창 오버레이(관전 토글). 정산: onVictory 3번째 인자 `{total, bySource}` → VictoryScreen(전투)·ExpeditionClearScreen(런). 반복: 드라이버 expeditionClear 분기에서 `runRestartRef.current()` 재출정 (클래식 startExpedition / 챔피언십 startChampionship 클로저 보존, 전멸 시 해제). 새 데미지 경로 추가 시 **trackDmg 호출 잊지 말 것** |
| **자동 사냥** (1.72.0, 1.80.0 확장) | App 드라이버 useEffect + CombatScreen `chooseAutoAction` + EventScreen autoPlay | 1.80.0~ **전 원정 허용** (`autoHuntAllowed = !!currentExpedition`, 미클리어 포함) + **배속 ×1/×5/×10/×20/⏩스킵** (`autoSpeed` state → CombatScreen `dly()` 헬퍼로 자동 중에만 딜레이 압축. 1.102.1~ **⏩ 던전 스킵은 별도 버튼** (PM 정정 — 배속 단계 아님): App `runSkip` state + `startRunSkip/cancelRunSkip`, 내부적으로 autoSpeed를 `AUTO_SPEED_SKIP`(config.js)으로 올려 전 딜레이 0 + zIndex 88 커버 화면으로 가림, 결과 화면(expeditionClear/defeat) 도달 시 이전 배속 자동 복원. 보스 컷신 fastSkip, 스킵 런은 런타임 베스트 기록 무효). 전투 AI 우선순위: 소울100 → heavy·저체력 방어 → **회복 방어 선제(사제 가호, HP<50%)** → 버프 → 콤보 셋업 → **마지막 AP 방어 전환(적 공격 의도+HP<65%)** → AP당 기대 데미지 최대. **자해 스킬은 잔여 HP<15면 금지**. usable() 가드는 handlePlayerAction과 반드시 일치 유지 |
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
