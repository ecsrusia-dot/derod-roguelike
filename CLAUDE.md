# CLAUDE.md

이 파일은 Claude(또는 다른 AI 협업자)가 이 저장소에서 작업할 때 따라야 할 컨벤션·워크플로·현재 상태를 정리한 문서다. 새 세션을 시작할 때 먼저 이 파일을 읽고 시작하라.

---

## 1. 프로젝트 개요

- **이름**: derod-roguelike (게임 내 표시: "Dawn and Twilight" / "던앤트와일라잇")
- **장르**: 한국어 텍스트 기반 다크 판타지 모바일 PWA 로그라이크
- **현재 게임 버전**: `src/data.js`의 `GAME_VERSION` 참조 (이 문서 갱신 시점 **1.14.1**)
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
├── App.jsx                       # 메인 게임 루프 (1900+ 줄)
├── data.js                       # 모든 게임 콘텐츠 + GAME_VERSION (4000+ 줄)
├── storage.js                    # IndexedDB 메타 (souls, codex, dailyClears, activeRun…)
├── main.jsx / index.css          # 진입점 + 전역 스타일 + FX 키프레임
├── combat/damage.js              # 데미지·치명·회피 계산
├── data/changelog.js             # 버전별 changelog (인게임 모달용)
├── utils/
│   ├── helpers.js                # PALETTE, 패시브/유물/저주 헬퍼, isUnlocked
│   ├── mapGen.js                 # linearSequence / branchSequence / 일반 가중치
│   ├── rewards.js                # 보상 풀·롤
│   └── dailyChallenge.js         # 일일 챌린지 시드/빌더
├── cloud/                        # Firebase auth + sync
└── components/                   # 26+ 화면 컴포넌트
    ├── CombatScreen.jsx          # 전투 (1700+ 줄, 가장 큼). 적 일러 <img>는 line 1394 부근
    ├── BossIntroScreen.jsx       # ★ 보스 진입 시네마틱 컷신 (1.14.0 신설)
    ├── CodexScreen.jsx           # 5탭 도감 (적/사건/유물/패시브/레시피)
    ├── CardInfoModal.jsx         # 공용 정보 모달 + buildPassive/Relic/ActiveSkillInfo 헬퍼
    ├── CombatEffects.jsx         # FX 컴포넌트 (FloatingLabel/DamageVignette/WhiteFlash/UltimateCutin)
    ├── NodeInfoModal.jsx         # 노드 진입 안내 (튜토리얼). 보스 컷신은 별도 컴포넌트
    ├── ExpeditionSelect.jsx      # 3탭 (클래식 / 챌린지 / 챔피언십)
    ├── PrepScreen.jsx            # 전투 준비 (패시브·유물·액티브 스킬)
    ├── RestScreen.jsx            # 보스 직전 정비
    ├── StatusPanel.jsx           # 전투 중 상태창
    ├── MapView.jsx               # 챕터 맵
    ├── TitleScreen.jsx           # 메인 (이어하기 버튼 포함)
    └── …

public/
├── classes/                      # 직업 일러스트
│   ├── <classId>.jpg, <classId>start.jpg, <classId>win.jpg, <classId>loss.jpg
│   └── combat/<classId>_combat.jpg
└── enemies/                      # ★ 적 일러스트 (1.13.0~ 도입)
    ├── classic/chapter_<n>/<enemyKey>_combat.jpg
    ├── classic/chapter_<n>/<enemyKey>_intro.jpg     # 보스 진입 풀컷 (9:16)
    └── championship/<concept>/<enemyKey>_combat.jpg

docs/
└── enemy-illustration-prompts.md # ★ 코파일럿 디자이너용 한국어 프롬프트 모음
```

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

- **브랜치**: `claude/review-claude-md-qM8Jx` 고정 (durable instruction — 시스템 메시지에 박혀 있음)
- **베이스**: `main`
- 모든 작업 사이클: `편집 → npm run build 확인 → git commit → git push → mcp__github__create_pull_request`
- **머지 후 새 push는 새 PR이 필요**. 같은 브랜치를 재사용해도 새 PR을 만들면 새 변경분만 묶임
- PR이 머지될 때까지 기다리지 않고 다음 작업을 같은 브랜치에 올리면 PR 본문이 이어붙어 누적된다. **PM이 머지 확인할 때까지 다음 작업 시작 X**가 깔끔
- 단, PR이 일찍 머지되면 후속 push가 PR에 안 들어갈 수 있다 — 머지 직후 push 했다면 새 PR 생성 (PR #22 → #23 사례)

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

## 5. 🎨 이미지 생성 파이프라인 (코파일럿 디자이너 → 게임 통합)

이 프로젝트의 모든 일러스트는 **OpenAI DALL-E 3** 엔진으로 생성된다. 직업 일러는 챗지피티(DALL-E 3)로, 적 일러는 동일 엔진을 무료로 쓸 수 있는 Microsoft Copilot Designer로 생성한다.

### 5.1. 도구 선택 — Copilot Designer (DALL-E 3) 권장

| 도구 | URL | 비고 |
|---|---|---|
| **Microsoft Copilot Designer** | `copilot.microsoft.com` (이미지 탭) | **권장**. DALL-E 3 무료. MS 계정 필요. 윈도우 기본 설치 |
| Bing Image Creator (대안) | `bing.com/images/create` | 동일 엔진. 일일 부스트 15개 |
| 챗지피티 (유료) | `chatgpt.com` | 직업 일러 원본 생성 도구. 동일 엔진 |

**제미나이(Imagen) 사용 금지** — 디폴트 화풍이 TCG·하스스톤 카드 일러 톤으로 강하게 고정되어 텍스트 프롬프트로 깨기 거의 불가능. 직업 일러와 화풍 통일 실패 확인 (3회 시도 후 포기, 1.13.0 직전).

### 5.2. DALL-E 3 사이즈 규약

DALL-E 3는 **1:1 / 16:9 / 9:16** 세 가지 비율만 지원. 프롬프트 안에 비율 명시 필수.

| 용도 | 비율 | 권장 픽셀 | 실제 출력 (라운드다운) |
|---|---|---|---|
| 전투 일러스트 (적·플레이어 공통) | **16:9 가로** | 1792×1024 | 1536×1024 (Copilot이 자동 라운드) |
| 보스 진입 풀컷 | **9:16 세로** | 1024×1792 | 1024×1536 |
| 직업 정면 일러 / 시작·승리·패배 컷 | 1:1 또는 2:3 | 1024×1024 등 | — |

> 4:3 (1600×1200) 등 비표준 비율 요청 금지. 라운드다운돼도 종횡비는 유지되므로 게임 표시에는 무관.

### 5.3. 코파일럿 디자이너 사용 팁

| 팁 | 효과 |
|---|---|
| **이전 직업 일러스트 1장 첨부** ("이 화풍으로") | 화풍 일치 ↑↑↑ |
| 결과 마음에 안 들면 같은 채팅에서 **"더 부드럽게, 카툰 톤 빼고 다시"** 식 멀티턴 보정 | 페이지 새로고침 없이 반복 보정 가능 |
| 한 번에 4장 생성 → 가장 잘 나온 거 선택 | 시도 횟수 절약 |
| 부스트 다 쓰면 생성 느려짐 (5~10분/장). 다음날 충전 | 페이스 조절 |
| **한국어 자연어**로 입력 | DALL-E 3는 한국어 입력 시 한국 웹소설 표지 톤으로 자연 이동 — 직업 일러와 일치 |

### 5.4. 프롬프트 구조 (4단 구성)

`docs/enemy-illustration-prompts.md`에 정착된 4단 구조를 그대로 사용:

```
1) 공통 화풍 헤더 — 다크 판타지, 페인터리, 카툰 톤 금지 (3~4문장)
2) 캐릭터 — 외형·자세·소품 (5~10문장)
3) 배경 — 챕터 환경 또는 중립 다크 판타지 (3~5문장)
4) 구도 — 비율 명시 + 샷 사이즈 + 보케 (2~3문장)
```

챕터별 배경 키워드는 `docs/enemy-illustration-prompts.md` 5절 참조. 직업 일러는 챕터 무관이므로 **중립 다크 판타지 톤**으로 작성 (어느 챕터에서 등장해도 어색하지 않게).

### 5.5. 파일 전달 — 채팅 첨부는 디스크에 안 저장됨 ⚠️

Claude Code 채팅에 PM이 PNG를 첨부하면 **나는 이미지로는 볼 수 있지만 파일 시스템에서 읽지 못한다**. 첨부 파일은 임시 메모리에만 존재.

→ **반드시 PM이 직접 repo 폴더에 넣어야 한다**:

1. PM이 코파일럿에서 PNG 다운로드 → 로컬 컴퓨터 저장
2. PM이 `public/enemies/classic/chapter_<n>/` 또는 `public/classes/combat/` 등 적절한 폴더에 드래그&드롭
3. PM이 main에 푸시 (또는 작업 브랜치에)
4. 내가 git pull → PNG 인식 후 변환 진행

PNG 파일명은 PM이 정확한 이름(예: `goblin_combat.png`)으로 저장해도 좋고, 아무 이름(`1.png`)으로 저장해도 OK — 내가 이미지를 식별·리네임할 수 있다 (멀티모달).

### 5.6. PNG → JPG 변환 (필수)

Copilot Designer는 PNG로 출력. PNG는 1장당 2~3 MB로 PWA에 부담. **반드시 JPG quality 90으로 변환** (직업 일러도 모두 .jpg). 절감 효과 약 86%.

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

### 5.7. 폴더 구조 (1.13.0~ 확정)

```
public/enemies/
├── classic/                  # 메인 스토리 (튜토리얼 + 수련의 길 공용)
│   ├── chapter_1/            # 북부 극지대 — 7장 완료 (1.14.0)
│   ├── chapter_2/            # 죽은 자의 숲 — 미작업
│   ├── chapter_3/            # 봉인된 신전 — 미작업
│   └── chapter_4/            # 마계의 균열 — 미작업
└── championship/             # 챔피언십 전용 적 — 미작업
    └── <concept>/

public/classes/
├── <classId>.jpg, <classId>start.jpg, <classId>win.jpg, <classId>loss.jpg
└── combat/<classId>_combat.jpg
```

### 5.8. 런타임 경로 자동 계산 (코드 패턴)

`ENEMIES[key].chapter` 필드로 경로를 런타임 계산. `ENEMIES`에 `combatImage` 필드 추가 안 함 (DRY).

```js
// CombatScreen.jsx — 적 일러
const combatSrc = enemy.championship
  ? `./enemies/championship/${enemy.concept}/${enemyKey}_combat.jpg`
  : `./enemies/classic/chapter_${enemy.chapter}/${enemyKey}_combat.jpg`;

// BossIntroScreen.jsx — 보스 진입 풀컷
const introSrc = `./enemies/classic/chapter_${enemy.chapter}/${enemyKey}_intro.jpg`;
```

**onError 시 폴백** — 어두운 배경 + 사선 패턴 + "[ 적 모습 미구현 ]" 텍스트. 챕터 2~4 적은 일러 추가 전까지 이 폴백을 보게 된다. 회귀 없음.

### 5.9. 전체 작업 흐름 (체크리스트)

```
[1] 프롬프트 작성 (docs/enemy-illustration-prompts.md 형식)
[2] PM이 Copilot Designer에 한국어 프롬프트 입력 + 직업 일러 1장 첨부
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
| 화풍이 TCG·카툰 톤으로 나옴 | Gemini Imagen 사용 | 5.1절 — Copilot Designer로 통일 |
| PNG 그대로 커밋 | JPG 변환 안 함 | 5.6절 — Pillow 변환 필수 |
| 캐릭터 비례 어색·표정 평범 | 한 번 시도로 만족 | 같은 채팅에서 "더 OOO하게" 멀티턴 보정 |
| 채팅 첨부 PNG를 Claude가 읽으려 함 | 첨부는 메모리에만 존재 | 5.5절 — PM이 직접 repo에 넣어야 함 |

---

## 6. 게임 시스템 현황 (1.14.1 기준)

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

### 6.3. 직업 5종

| ID | 이름 | 시작 패시브 | 시그니처 궁극 |
|---|---|---|---|
| `lanthert` | 방랑검사 | 심안류 Lv.3, 심안 Lv.2 | 무영(無影)의 일격 (1.12.0~) |
| `sage` | 술법사 | 이프리트 Lv.3, 마력 Lv.2 | (다음 업데이트) |
| `demonblood` | 혼혈 마족 | (광기 계열) | (미정) |
| `elf` | 숲의 정령사 | (정밀·바람 계열) | (미정) |
| `priest` | 여명의 사제 | (신앙·축복 계열) | (미정) |

방랑검사만 항상 사용 가능. 나머지는 직전 직업의 수련의 길 클리어로 해금.

### 6.4. 챕터 4개 (메인 스토리)

| # | 이름 | 적 일러 상태 (1.14.1) |
|---|---|---|
| 1 | 북부 극지대 (얼음) | ✅ 6종 + 보스 진입 컷신 완료 |
| 2 | 죽은 자의 숲 (황혼) | ❌ placeholder만 |
| 3 | 봉인된 신전 (봉인·시간) | ❌ placeholder만 |
| 4 | 마계의 균열 (마족·나크젤리온) | ❌ placeholder만 |

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

### 6.8. 전투 시각 이팩트

| Phase | 내용 | 상태 |
|---|---|---|
| Phase 1 | 부유 라벨 / 데미지 비네트 / 흰 플래시 / 적 흔들림 | ✅ (1.10.0) |
| Phase 2 | 슬래시 SVG / 마법 임팩트·입자 / 방어 결계 / 상태이상 시각화 | ✅ (1.11.0) |
| 궁극 컷인 | 풀스크린 골든 버스트 + 궁극명 배너 0.9초 (`UltimateCutin`) | ✅ (1.12.0) |
| **보스 진입 컷신** | 9:16 풀컷 일러 페이드인 + 보스 이름 배너 + 2.5초 자동 스킵 (`BossIntroScreen`) | ✅ (1.14.0) |
| Phase 3 | 보스 임팩트 프레임, 승리 골든 버스트, 사망 흑백 페이드 | ❌ |

## 7. PM 커뮤니케이션 스타일

이 프로젝트의 PM은 **비개발자**다. 다음 스타일을 유지할 것:

### 좋아하는 것
- **한국어 답변** 기본
- 단락 분명한 구분 (`---` 구분선, 빈 줄, `##` 헤더 적극 활용)
- **표(table)** — 비교/대조에 매우 효과적
- 굵게 표시한 핵심 결정 사항
- 결과를 숫자로 (HP/턴/배율 등)
- 옵션 제시 → 추천 표시 → "어떻게 진행할까요?" 닫기

### 싫어하는 것
- 영어 기술용어 벽 (commit/branch 같은 필수어는 OK)
- 두루뭉술한 추상적 설명
- 결정 없이 "더 알아보겠습니다" 끝맺기
- 한 단락이 길게 늘어지는 산문체

### 결정이 필요할 때
- `AskUserQuestion` 도구로 옵션 2~4개 제시
- 추천 옵션은 첫 번째에 두고 "(추천)" 표기
- 결정 사항이 여러 개면 다중 질문으로 한 번에

### 응답 구조 템플릿
```
[짧은 인삿말이나 상황 요약 한 줄]

## 무엇을 했나
- 핵심 항목들

## 변경 사항
[표 또는 불릿]

## 영향 범위
[기존 동작 변화 여부 명시 — PM이 가장 신경 쓰는 부분]

## PM님이 결정/확인할 것
- 명시적 액션 항목
```

### PR 생성 후 응답
- **PR URL을 가장 눈에 띄게** (URL 한 줄, 그 다음 제목)
- 표로 무엇을 했는지 요약
- 다음 단계 안내

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
2. PM이 Copilot Designer로 생성 → PNG 받음
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

## 11. 작업 로드맵 (1.14.1 기준)

### 진행 가능한 다음 작업
- **챕터 2~4 적 일러스트 생성** — 챕터별 적 5~6종 + 보스 진입 풀컷 1종. 각 ~7장
- **도감 일러 노출** — `CodexScreen.jsx`에 신규 일러 썸네일. 발견 못 한 적은 그레이스케일
- **직업 일러 vs 챕터 배경 분위기 충돌 재논의** — 1.14.0 일러 들어온 후 실기기 화면 보고 판단
- **방랑검사 전투 일러 개편** — 프롬프트 작성 완료, PM 생성 대기 (직전 세션)
- **타 직업(술법사·마족·엘프·사제) 전투 일러 개편** — 동일 파이프라인

### 시스템 미구현 (PM 결정 대기)
- **Tier 3A — 신규 클래스 6번째**
- **Tier 3B — 신규 챕터 5번째** (컨셉 후보 3가지 제시: 여명의 폐허 / 나크젤리온의 심장 / 시간의 폐허 — 추천은 B)
- **Tier 3C — Mutator 시스템** (출정 직전 자가 선택 변형)

### 부분 진행 가능한 것
- **이팩트 Phase 3** (보스 임팩트 프레임, 승리 골든 버스트, 사망 흑백 페이드)
- **튜토리얼 5 — 보상 선택의 갈림길** / **6 — 전투의 흐름** / **7 — 영혼의 행로**
- **나머지 4직업 시그니처 궁극** (술법사·마족·엘프·사제 — 방랑검사만 1.12.0에 추가됨)

### 잠재적 개선
- 일일 챌린지 리더보드 (Firebase 활용)
- 무한모드 깊이 기록·랭킹
- 도감 발견율 → 영혼 보너스
- 챔피언십 변형 (mutator)

## 12. 첫 메시지 권장 응답

새 세션에서 PM이 작업을 요청하면:

1. 이 파일을 먼저 읽기 (Read tool)
2. 관련 데이터 파일 1~2개 확인 (현재 상태 파악)
3. 작업 단위가 3+ 단계면 TodoWrite로 추적 시작
4. 결정이 필요하면 AskUserQuestion으로 옵션 제시
5. 모든 사용자 영향 작업은 버전+changelog 같이 처리
6. 에셋 작업이면 4.5절 + 5절 룰 재확인 (절대 경로 금지, 상대 경로 `./`)

---

**마지막 업데이트**: 1.14.1 (적 일러스트 경로 핫픽스) 완료 시점 — PR #25 머지 후 갱신. 챕터 1 적 일러 6장 + 한기의 마녀 보스 진입 풀컷 1장 적용 완료. 코파일럿 디자이너 + DALL-E 3 + 한국어 자연어 + 상대 경로 컨벤션 정착.
