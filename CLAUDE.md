# CLAUDE.md

이 파일은 Claude(또는 다른 AI 협업자)가 이 저장소에서 작업할 때 따라야 할 컨벤션·워크플로·현재 상태를 정리한 문서다. 새 세션을 시작할 때 먼저 이 파일을 읽고 시작하라.

---

## 1. 프로젝트 개요

- **이름**: derod-roguelike (게임 내 표시: "Dawn and Twilight" / "던앤트와일라잇")
- **장르**: 한국어 텍스트 기반 다크 판타지 모바일 PWA 로그라이크
- **현재 게임 버전**: `src/data.js`의 `GAME_VERSION` 참조 (이 문서 작성 시점 1.10.0)
- **배포**: GitHub Pages (`main` 브랜치 머지 시 `.github/workflows/deploy.yml`이 자동 빌드·배포)

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
└── components/                   # 25+ 화면 컴포넌트
    ├── CombatScreen.jsx          # 전투 (1700+ 줄, 가장 큼)
    ├── CodexScreen.jsx           # 5탭 도감 (적/사건/유물/패시브/레시피)
    ├── CardInfoModal.jsx         # 공용 정보 모달 + buildPassive/Relic/ActiveSkillInfo 헬퍼
    ├── CombatEffects.jsx         # FX 컴포넌트 (FloatingLabel/DamageVignette/WhiteFlash)
    ├── NodeInfoModal.jsx         # 노드 진입 안내 (튜토리얼)
    ├── ExpeditionSelect.jsx      # 3탭 (클래식 / 챌린지 / 챔피언십)
    ├── PrepScreen.jsx            # 전투 준비 (패시브·유물·액티브 스킬)
    ├── RestScreen.jsx            # 보스 직전 정비
    ├── StatusPanel.jsx           # 전투 중 상태창
    ├── MapView.jsx               # 챕터 맵
    ├── TitleScreen.jsx           # 메인 (이어하기 버튼 포함)
    └── …
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

내부 정리만 하고 사용자에게 안 보이는 PR(예: placeholder 파일 정리, 주석 추가)은 버전 안 올려도 된다.

### 4.2. PR 워크플로

- **브랜치**: `claude/analyze-project-structure-EzUGv` 고정 (durable instruction)
- **베이스**: `main`
- 모든 작업 사이클: `편집 → npm run build 확인 → git commit → git push → mcp__github__create_pull_request`
- PR이 머지될 때까지 기다리지 않고 다음 작업을 같은 브랜치에 올리면 PR 본문이 이어붙어 누적되니, **머지 후 다음 작업 시작이 깔끔**하다. 가능하면 PM이 머지할 때까지 다음 작업 시작 X.
- 같은 브랜치에 push되면 기존 PR이 갱신됨. 머지된 후 새 push는 새 PR이 필요.

### 4.3. 빌드 검증

커밋 전 항상 `npm run build` 실행 → ✓ built 출력 확인. 빌드 실패 상태로 커밋 금지.

### 4.4. 작업 단위 추적 (TodoWrite)

3개 이상의 단계가 있는 작업은 `TodoWrite`로 todo 리스트 만들고 진행 상태 갱신. 단순 1단계 작업은 불필요.

## 5. 게임 시스템 현황 (1.10.0 기준)

### 5.1. 모드 구조

3탭 구조의 원정 선택:

| 탭 | 내용 |
|---|---|
| 클래식 | 튜토리얼 1~4 + 수련의 길 (5직업) |
| 챌린지 | 일일 챌린지 + 무한모드 |
| 챔피언십 | 5컨셉 × 4난이도 |

### 5.2. 튜토리얼 (선형 진행)

| # | 이름 | 학습 주제 | 구조 |
|---|---|---|---|
| 1 | 여명의 시작 | 노드 타입 7가지 | linearSequence 7노드 |
| 2 | 황혼의 시장 | 상점·대장간 | linearSequence 7노드, forceEventId로 은화/유물 확정 지급 |
| 3 | 갈림길의 시험 | 분기 선택, 천리안 | branchSequence (3열) |
| 4 | 저주의 시련 | 저주 누적 (난이도 곡선) | linearSequence + addCurseId로 단계별 저주 추가 |

튜토리얼 4 클리어가 수련의 길 해금 조건. **이 잠금 체인을 깨면 안 됨.**

### 5.3. 직업 5종

| ID | 이름 | 시작 패시브 |
|---|---|---|
| `lanthert` | 방랑검사 | 심안류 Lv.3, 심안 Lv.2 |
| `sage` | 술법사 | 이프리트 Lv.3, 마력 Lv.2 |
| `demonblood` | 혼혈 마족 | (광기 계열) |
| `elf` | 숲의 정령사 | (정밀·바람 계열) |
| `priest` | 여명의 사제 | (신앙·축복 계열) |

방랑검사만 항상 사용 가능. 나머지는 직전 직업의 수련의 길 클리어로 해금.

### 5.4. 챕터 4개 (메인 스토리)

1. 북부 극지대 (얼음)
2. 죽은 자의 숲 (황혼)
3. 봉인된 신전 (봉인·시간)
4. 마계의 균열 (마족·나크젤리온)

### 5.5. 메타 시스템

- **영혼 (souls)**: 영구 재화. 사망 시 70% 보존 (무한모드는 깊이×15 보너스)
- **영혼의 제단**: 영구 메타 강화 (시작 HP+, 보석+, 등). KST 0시/12시 슬롯 갱신, 일일 리롤
- **도감**: 적·사건·유물·패시브·레시피 5탭, 만나면 자동 등록
- **이어하기**: `meta.activeRun`에 스냅샷 저장, 타이틀 화면 [이어하기] 버튼

### 5.6. 모드 시스템

- **일일 챌린지**: KST 날짜 시드로 직업·챕터·저주 2개 고정. 첫 클리어 +100 영혼
- **무한모드 "황혼의 끝"**: 챕터 1→2→3→4→1→… 무한 순환, 깊이×0.15 HP/0.12 dmg 스케일
- **챔피언십**: 5컨셉 × 4난이도 (normal/hard/hell/madness), 직업별 해금

## 6. PM 커뮤니케이션 스타일

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

## 7. 커밋·PR 메시지 컨벤션

### 커밋 메시지
- **영어**, 멀티라인 OK
- 첫 줄: `<type>: <짧은 설명>` (`feat`, `fix`, `chore`, `balance`, `feat(2A)` 같은 스코프 OK)
- 본문: 무엇을 왜 했는지 / 어떻게 구현했는지 / 어떤 파일이 바뀌었는지
- 마지막 줄: `https://claude.ai/code/session_01YKyCYk6fh56A1tHcWYK3yf` (Claude Code 세션 링크 - 자동 채워짐)

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

## 8. 자주 쓰는 패턴

### 8.1. 새 챕터/원정 추가
1. `CHAPTERS` 배열에 챕터 데이터 추가 (`linearSequence` 또는 `branchSequence` 또는 일반 가중치)
2. `EXPEDITIONS` 배열에 원정 엔트리 (`forcedClassId` / `unlockId` / `category` 등)
3. 필요시 새 이벤트를 `EVENTS`에 추가 (`classOnly`, `forceEventId`, `tutorialGift` 플래그 활용)
4. 잠금 체인 갱신 (이전 원정의 `unlockId` 조정)
5. 클리어 업적을 `ACHIEVEMENTS`에 추가 (`clear_<expId>`)
6. `App.jsx`의 튜토리얼 업적 트래킹에 expId 추가 (해당되면)

### 8.2. 새 시각 효과 추가
1. `src/index.css`에 `@keyframes fx-*` 정의 + `.fx-*` 클래스
2. 필요시 `src/components/CombatEffects.jsx`에 재사용 컴포넌트 추가
3. `CombatScreen.jsx`에 트리거 상태 + `pushFxLabel` 같은 헬퍼 호출 추가

### 8.3. 새 저주 추가
1. `CURSES` 배열에 항목 추가 (id, name, desc, effect 문자열, color)
2. 효과 핸들러 추가 — 위치는 효과에 따라 다름:
   - 데미지: `CombatScreen.jsx`의 데미지 처리부
   - 보상: `App.jsx`의 `handleVictory`
   - 회복: `App.jsx`/`CombatScreen.jsx`의 heal 처리부
   - 상점: `ShopScreen.jsx` (curses prop 전달 필요)
3. 효과 문자열은 `hasCurse(curses, 'curse_xxx')`로 체크

### 8.4. 새 유물 추가
1. `RELICS`에 항목 (name, statBonus, weight, color, desc)
2. 신규 statBonus 키면 적용 위치도 추가 (`App.jsx` `applyReward` / `CombatScreen.jsx` 빌드 시점)
3. 옵션: `FORGE_RECIPES`에 조합 추가
4. **`buildRelicInfo`는 statBonus 키를 노출하지 않음** — desc 문구로만 효과 표현 (PM 결정)

## 9. 알려진 시스템 제약 / 함정

- **챕터 ID 타입 혼재**: 튜토리얼은 string (`'tutorial_basic'`), 클래식/수련은 number (`1`~`4`), 챔피언십도 별도. 챕터 조회는 ID 기반 검색(`CHAPTERS.find(c => c.id === id)`) 사용. 인덱스 사용 금지.
- **`getNodeMeta`는 `linearSequence`와 `branchSequence` 둘 다 지원해야 함** — 새 시퀀스 타입 추가 시 여기도 갱신.
- **`tutorialGift` 이벤트**는 강제 트리거 전용 (랜덤 풀 제외). 새 선물 이벤트 추가 시 이 플래그 잊지 말 것.
- **`endless` 원정**은 `currentExpedition._baseExp`에 원본 멀티플라이어 보존 — 깊이 스케일링이 누적되지 않도록.
- **`activeRun` 스냅샷**은 맵 화면에서만 저장. 전투/이벤트/상점 화면에서 별도 저장 X — 손상되면 자동 정리되고 일반 타이틀로 폴백.

## 10. 작업 로드맵 (1.10.0 기준)

### 진행 안 한 것 (PM 결정 대기)
- **Tier 3A — 신규 클래스 6번째** (제안만 했고 일러스트 필요)
- **Tier 3B — 신규 챕터 5번째** (컨셉 후보 3가지 제시: 여명의 폐허 / 나크젤리온의 심장 / 시간의 폐허 — 추천은 B)
- **Tier 3C — Mutator 시스템** (출정 직전 자가 선택 변형)

### 부분 진행 가능한 것
- **이팩트 Phase 2** (스킬 타입별 슬래시 SVG, 마법 입자, 방어 결계 링, 상태이상 시각화)
- **이팩트 Phase 3** (보스 임팩트 프레임, 궁극 컷인, 승리 골든 버스트, 사망 흑백 페이드)
- **튜토리얼 5 — 보상 선택의 갈림길** (제안만 함, 매 전투의 보상 학습용)
- **튜토리얼 6 — 전투의 흐름** (마나/CD/방어/궁극 학습)
- **튜토리얼 7 — 영혼의 행로** (메타 진행 학습)

### 잠재적 개선
- 일일 챌린지 리더보드 (Firebase 활용)
- 무한모드 깊이 기록·랭킹
- 도감 발견율 → 영혼 보너스
- 챔피언십 변형 (mutator)

## 11. 첫 메시지 권장 응답

새 세션에서 PM이 작업을 요청하면:

1. 이 파일을 먼저 읽기 (Read tool)
2. 관련 데이터 파일 1~2개 확인 (현재 상태 파악)
3. 작업 단위가 3+ 단계면 TodoWrite로 추적 시작
4. 결정이 필요하면 AskUserQuestion으로 옵션 제시
5. 모든 사용자 영향 작업은 버전+changelog 같이 처리

---

**마지막 업데이트**: 1.10.0 (전투 이팩트 Phase 1) 완료 시점 — PR #16 머지 후 작성.
