// ============================================
// data/changelog.js — 업데이트 로그
// ============================================
// 신규 버전 추가 시 배열 맨 위에 추가
// type: 'feature' (신규기능, 황금) / 'balance' (밸런스, 보라) / 'fix' (버그수정, 청색) / 'system' (시스템, 회색)
// ============================================

export const CHANGELOG = [
  {
    version: '1.8.1',
    date: '2026-05-13',
    label: '원정 선택 3탭 재구성 (클래식·챌린지·챔피언십)',
    changes: [
      { type: 'feature', text: '원정 선택을 3탭 구조로 재정비 — 클래식(튜토리얼+수련의 길) / 챌린지(일일+무한) / 챔피언십' },
      { type: 'feature', text: '신규 챌린지 탭에 일일 챌린지·무한모드 카드를 모아 한 곳에서 도전 콘텐츠 확인' },
    ],
  },
  {
    version: '1.8.0',
    date: '2026-05-13',
    label: '무한모드 황혼의 끝 (Tier 2B)',
    changes: [
      { type: 'feature', text: '무한모드 "황혼의 끝" 추가 — 보스 클리어해도 끝나지 않고 다음 챕터로 진행. 챕터는 1→2→3→4→1→2... 무한 순환' },
      { type: 'feature', text: '깊이가 깊어질수록 적 강화: HP ×(1 + 깊이×0.15), 데미지 ×(1 + 깊이×0.12). 챕터 진행할수록 가파른 도전' },
      { type: 'feature', text: '죽음 시 영혼 보상 = 누적 영혼 + (깊이 × 15). 일반 원정의 70% 페널티 대신 깊이 자체가 보상' },
      { type: 'feature', text: '맵 헤더에 챕터 표기가 "Depth N"으로 전환됨 (무한모드 전용)' },
      { type: 'feature', text: '해금 조건: 모든 튜토리얼(1~4) 클리어. 직업은 자유 선택' },
      { type: 'system', text: 'linearSequence/branchSequence 기반 챕터 모두 사이클 가능. 챕터 데이터에 추가 작업 불필요' },
    ],
  },
  {
    version: '1.7.0',
    date: '2026-05-13',
    label: '일일 챌린지 (Tier 2A)',
    changes: [
      { type: 'feature', text: '일일 챌린지 "오늘의 시련" 추가 — 매일 자정(KST) 갱신되는 시드 기반 도전. 직업·챕터·저주 2개가 그날 고정되어 모든 플레이어가 같은 조건' },
      { type: 'feature', text: '원정 선택 화면 클래식 탭 상단에 일일 챌린지 카드 노출. 오늘의 직업·챕터·저주를 미리 표시' },
      { type: 'feature', text: '일일 챌린지는 횟수 제한 없음. 같은 날 첫 클리어 시 영혼 +100 보너스 (이후 클리어는 기본 +80만)' },
      { type: 'system', text: '시드 RNG는 KST 날짜 문자열 해시 + mulberry32. 클라이언트만으로 결정적 결과 보장' },
      { type: 'system', text: '메타에 dailyClears 맵 추가 — 날짜별 첫 클리어 기록' },
    ],
  },
  {
    version: '1.6.0',
    date: '2026-05-13',
    label: '도감 5탭 확장 (Tier 2C)',
    changes: [
      { type: 'feature', text: '도감을 5개 탭으로 확장 — 적 / 사건 / 유물 / 패시브 / 레시피. 한 번이라도 만난/획득한 항목은 모든 런에 걸쳐 영구 등록' },
      { type: 'feature', text: '각 카테고리 카드 클릭 시 상세 정보 모달 — 적은 패턴 목록, 사건은 본문, 유물·패시브는 효과 전체 표시' },
      { type: 'feature', text: '카테고리별 발견 % 표시 — 도감 진행도를 한눈에 확인' },
      { type: 'system', text: '도감 트래킹 hook 자동 동작 — 전투 진입 시 적 ID, 사건 진입 시 이벤트 ID, 보상에서 유물·패시브 획득 시 자동 기록' },
      { type: 'system', text: '메타 데이터에 codex 객체 추가 (enemies/events/relics/passives), 기존 사용자는 자동 마이그레이션' },
    ],
  },
  {
    version: '1.5.1',
    date: '2026-05-13',
    label: '직업별 전용 사건 10개 (Tier 2D)',
    changes: [
      { type: 'feature', text: '5개 직업 각각 전용 사건 2개씩, 총 10개 추가. 같은 챕터를 다른 직업으로 돌면 새로운 직업 정체성 이벤트 등장' },
      { type: 'feature', text: '방랑검사 — 옛 스승의 흔적 / 어둠 속의 시험' },
      { type: 'feature', text: '술법사 — 잊혀진 마법서 / 정념의 폭주' },
      { type: 'feature', text: '혼혈 마족 — 마족의 동족 / 핏줄의 갈증' },
      { type: 'feature', text: '숲의 정령사 — 숲의 부름 / 황혼의 동족' },
      { type: 'feature', text: '여명의 사제 — 여명의 신탁 / 의심의 시험' },
      { type: 'system', text: '이벤트 데이터에 classOnly 필터 추가 — 사건이 특정 직업에만 등장하도록 지정 가능 (이벤트 풀 필터에 적용)' },
    ],
  },
  {
    version: '1.5.0',
    date: '2026-05-13',
    label: '콘텐츠 확장: 사건 30 / 유물 8 / 레시피 13 / 저주 4',
    changes: [
      { type: 'feature', text: '챕터별 사건 30개 추가 — 북부 극지대·죽은자의 숲·봉인된 신전·마계의 균열 각 챕터의 등장 사건 풀이 두꺼워져 반복 플레이 변주 증가' },
      { type: 'feature', text: '신규 유물 8개 추가 — 사냥꾼의 활시위·뱀파이어의 인장·폭풍의 인장(공격), 강철의 맹세·거룩한 부적(방어), 여명의 깃털·상인의 저울·시간의 모래(유틸·자원)' },
      { type: 'feature', text: '대장간 레시피 13종 추가 — 신규 유물 × 기존 유물 조합, 신규 × 신규 희귀 조합 포함. 총 레시피 12 → 25' },
      { type: 'feature', text: '신규 저주 4종 추가 — 심연(받는 +30%) · 가뭄(은화 -25%) · 탐욕(상점 가격 +50%) · 시기(전투 보석 -1). 총 저주 8 → 12' },
      { type: 'balance', text: '하드/지옥/광기 난이도에서 등장 가능한 저주 풀이 늘어남에 따라 동일 난이도 반복도 변주가 생김' },
      { type: 'system', text: 'ShopScreen이 curses prop 수용 — curse_shopPrice+50 활성 시 가격 1.5배' },
      { type: 'system', text: 'CombatScreen 데미지 처리에 curse_dmgTaken+30(심연) 핸들러 추가, 기존 +15와 누적' },
    ],
  },
  {
    version: '1.4.1',
    date: '2026-05-13',
    label: '튜토리얼 적 강도 상향 (특히 4번 저주의 시련)',
    changes: [
      { type: 'balance', text: '튜토리얼 4 저주의 시련: 강적 HP ×1.0 → ×1.6, 데미지 ×1.0 → ×1.2. 강적이 너무 빨리 쓰러져 저주 누적을 체감할 틈이 없던 문제를 해결' },
      { type: 'balance', text: '튜토리얼 3 갈림길의 시험: 강적 HP ×1.0 → ×1.1. 분기 선택의 무게를 살짝 끌어올림' },
      { type: 'balance', text: '튜토리얼 2 황혼의 시장: 적 능력치 ×0.9 → ×1.0 (기준치)' },
      { type: 'balance', text: '튜토리얼 1 여명의 시작: 적 능력치 ×0.8 → ×0.9. 입문 챕터지만 한두 턴 더 끌리도록 살짝 상향' },
    ],
  },
  {
    version: '1.4.0',
    date: '2026-05-13',
    label: '튜토리얼 4 저주의 시련 (저주 누적 체험)',
    changes: [
      { type: 'feature', text: '튜토리얼 4 "저주의 시련" 추가 — 강적과 거듭 맞붙으며 저주가 한 단계씩 누적되는 흐름으로 일반→하드→지옥→광기 난이도 곡선을 직접 체감 (튜토리얼 3 클리어 후 해금)' },
      { type: 'feature', text: '노드 시퀀스: 준비 → 강적(저주 0) → 강적+깨지기 쉬운 영혼 → +약화의 저주 → +부패의 저주 → 정비 → 보스' },
      { type: 'feature', text: '저주 시스템에 노드 단위 누적 트리거(addCurseId) 도입 — 챕터 데이터에서 특정 노드 진입 시 특정 저주가 활성화되도록 지정 가능' },
      { type: 'feature', text: '저주의 시련 클리어 업적 추가 (영혼 +120)' },
      { type: 'fix', text: '유물 정보 모달이 desc 외에 내부 statBonus 키-값(예: heal 50)을 노출하던 문제 — 자연어 설명만 표시하도록 수정' },
      { type: 'balance', text: '방랑검사의 수련 해금 조건이 튜토리얼 3 → 튜토리얼 4 클리어로 변경. 기존에 튜토리얼 3까지 클리어한 사용자는 저주의 시련을 추가로 클리어해야 합니다.' },
    ],
  },
  {
    version: '1.3.2',
    date: '2026-05-13',
    label: '튜토리얼 3 분기 버그 수정 + 카드 정보 모달 통합',
    changes: [
      { type: 'fix', text: '튜토리얼 3 가운데 컬럼을 따라가면 사건마다 천리안이 반복 지급되던 문제 — 강제 지급 이벤트(tutorialGift)를 일반 랜덤 풀에서 제외' },
      { type: 'fix', text: '튜토리얼 3 진입 시 첫 노드 안내 모달이 표시되지 않던 문제 — branchSequence의 modalOverride/forceEventId를 읽지 못하던 버그 수정' },
      { type: 'feature', text: '준비·정비 화면, 전투 중 상태창의 패시브/유물/액티브 스킬 카드 어디든 클릭 시 통합 정보 모달 표시 (별도 (i) 아이콘 제거)' },
      { type: 'feature', text: '준비 화면에서 카드 선택/해제는 정보 모달 내부의 활성화 버튼으로 수행' },
      { type: 'feature', text: '정비 화면·전투 중 상태창에도 직업 액티브 스킬 카드 추가 — 마나·쿨다운·데미지 범위를 어디서든 확인 가능' },
      { type: 'system', text: '패시브 정보 모달의 마일스톤 표시를 통일 — 같은 특수문자(◇) 사용, 해금 여부는 색상 차이로 표시' },
      { type: 'system', text: 'mapGen 분기 시퀀스에 columnIndex 저장, 노드 메타 조회가 branchSequence를 정확히 따라가도록 보강' },
    ],
  },
  {
    version: '1.3.1',
    date: '2026-05-13',
    label: '준비 화면 카드 정보 모달 + 튜토리얼 문구 정리',
    changes: [
      { type: 'feature', text: '전투 준비 화면에 액티브 스킬 섹션 추가 — 직업 고유 스킬 3종을 카드로 표시' },
      { type: 'feature', text: '준비 화면 모든 카드(패시브·유물·액티브 스킬)에 (i) 정보 아이콘 추가, 클릭 시 상세 정보 모달 표시' },
      { type: 'feature', text: '튜토리얼 3 준비 노드에 안내 모달 추가 — 일반 맵에서 노드는 비공개, 상점·대장간만 항상 공개임을 미리 설명' },
      { type: 'fix', text: '노드 진입 모달 본문이 한 문단으로 뭉쳐 보이던 문제 — 줄바꿈 보존(whitespace-pre-line) 처리로 단락이 구분되도록 수정' },
      { type: 'balance', text: '대장간 안내 문구를 불릿 형식(레시피 일치/불일치/튜토리얼 한정)으로 재구성해 가독성 향상 (튜토리얼 2·3 공통)' },
    ],
  },
  {
    version: '1.3.0',
    date: '2026-05-13',
    label: '튜토리얼 3 갈림길의 시험 (분기 선택)',
    changes: [
      { type: 'feature', text: '튜토리얼 3 "갈림길의 시험" 추가 — 노드 분기 학습 전용 튜토리얼 (튜토리얼 2 클리어 후 해금)' },
      { type: 'feature', text: '맵 구조: 준비 → 천리안 확정 지급 이벤트 → 3열 분기(전투/상점·사건·대장간/전투) → 정비 합류 → 보스. 상점과 대장간이 다른 컬럼에 배치되어 한 번에 한 쪽만 선택 가능' },
      { type: 'feature', text: '천리안 유물을 시작 단계에서 확정 지급하여 모든 노드 타입이 미리 공개됨 — 분기 선택 시 어떤 보상을 포기하는지 직접 확인 가능' },
      { type: 'feature', text: '갈림길의 시험 클리어 업적 추가 (영혼 +100)' },
      { type: 'system', text: 'mapGen에 branchSequence 옵션 추가 — 레이어별로 단일/3열을 섞어 분기·합류 구조 표현 가능' },
      { type: 'system', text: '사건 보상 타입 specific_relic 추가 — 지정된 이름의 유물을 확정 지급' },
      { type: 'balance', text: '방랑검사의 수련 해금 조건이 튜토리얼 2 클리어 → 튜토리얼 3 클리어로 변경. 기존에 튜토리얼 2까지 클리어한 사용자는 갈림길의 시험을 추가로 클리어해야 합니다.' },
    ],
  },
  {
    version: '1.2.1',
    date: '2026-05-13',
    label: '튜토리얼 클리어 화면·대장간 안내 문구 정리',
    changes: [
      { type: 'fix', text: '튜토리얼 2 원정 이름이 클리어 화면에서 옛 이름(대장간 길목)으로 표시되던 문제 — 황혼의 시장으로 통일' },
      { type: 'fix', text: '대장간 모달이 모든 대장간 노드에서 유물을 주는 것처럼 읽히던 문구 — 튜토리얼 한정 특별 지급임을 명시' },
      { type: 'feature', text: '튜토리얼 1·2 클리어 화면 상단 라벨을 EXPEDITION CLEAR → TUTORIAL CLEAR로 표시, 인용구도 튜토리얼 톤으로 변경' },
      { type: 'fix', text: '대장간 길목 클리어 업적 설명을 새 이름(황혼의 시장)으로 갱신' },
    ],
  },
  {
    version: '1.2.0',
    date: '2026-05-12',
    label: '튜토리얼 2 황혼의 시장 (상점·대장간 학습)',
    changes: [
      { type: 'feature', text: '튜토리얼 2 제목 변경: 대장간 길목 → 황혼의 시장 (상점·대장간 둘 다 다루는 챕터에 맞춰 개편)' },
      { type: 'feature', text: '튜토리얼 2를 7노드 일직선으로 재구성: 준비 → 사건 → 상점 → 사건 → 대장간 → 정비 → 보스' },
      { type: 'feature', text: '상점 직전 사건: 길 잃은 행상에게서 은화 250 확정 지급 (상점 이용 자금 보장)' },
      { type: 'feature', text: '대장간 직전 사건: 버려진 유물 발견으로 랜덤 유물 1개 확정 지급' },
      { type: 'feature', text: '대장간 노드 진입 시 추가 랜덤 유물 1개 자동 지급 — 조합용 두 번째 유물 보장' },
      { type: 'feature', text: '대장간 노드 모달에 조합 성공/실패 결과 설명 추가 (성공 시 패시브 Lv +1, 실패 시 영혼 +50)' },
      { type: 'system', text: 'linearSequence가 객체 형태 항목 지원 — forceEventId/tutorialForge/modalOverride로 노드별 맞춤 동작 지정 가능' },
    ],
  },
  {
    version: '1.1.0',
    date: '2026-05-12',
    label: '튜토리얼 1 일직선 + 노드 설명 모달',
    changes: [
      { type: 'feature', text: '튜토리얼 1(여명의 시작)을 7노드 일직선으로 재구성: 준비 → 일반 적 → 강적 → 미지 → 사건 → 정비 → 보스' },
      { type: 'feature', text: '튜토리얼 챕터에서 노드 진입 시 해당 노드 타입을 설명하는 모달 표시 (튜토리얼 1·2 모두 적용)' },
      { type: 'system', text: 'mapGen에 linearSequence 옵션 추가 — 챕터 데이터에서 노드 순서를 직접 지정 가능' },
      { type: 'system', text: '빈 placeholder 파일(dummy.txt / a.txt) 8개 저장소에서 정리' },
    ],
  },
  {
    version: '1.0.18',
    date: '2026-05-11',
    label: '튜토리얼/수련 출정 먹통 수정',
    changes: [
      { type: 'fix', text: '튜토리얼 1·2 출정 화면 탭 시 진입 안 되던 문제 (chapter ID가 string인데 array index로 처리되어 NaN)' },
      { type: 'fix', text: '수련의 길 1챕터에서 튜토리얼 챕터가 잘못 로드되던 문제 (CHAPTERS 배열 인덱스 밀림)' },
      { type: 'fix', text: '챕터 진행(다음 챕터) 시에도 동일한 인덱스 버그 수정' },
      { type: 'system', text: '챕터 데이터 조회를 array index 대신 ID 기반 검색으로 변경' },
    ],
  },
  {
    version: '1.0.17',
    date: '2026-05-11',
    label: '클래식 → 튜토리얼+수련의길 개편',
    changes: [
      { type: 'feature', text: '클래식 모드 = 튜토리얼 + 수련의 길로 개편' },
      { type: 'feature', text: '튜토리얼 1: 노드 입문 (방랑검사, 사건/미지/전투 위주)' },
      { type: 'feature', text: '튜토리얼 2: 대장간 길목 (상점+대장간 강제 배치)' },
      { type: 'feature', text: '수련의 길 5종: 직업별 4챕터, 클리어 시 다음 직업 + 챔피언십 직업 해금' },
      { type: 'feature', text: '챔피언십 탭: 수련 클리어한 직업만 사용 가능' },
      { type: 'system', text: '직업 해금 순서: 방랑검사 → 술법사 → 마족 → 엘프 → 사제' },
      { type: 'system', text: '시작 화면 → 원정 선택 → (강제 직업 또는 직업 선택) → 시작' },
      { type: 'fix', text: '옛 클래식 원정 4종, 옛 직업 해금 메타 강화 삭제' },
      { type: 'fix', text: '옛 클래식 업적 40개 → 튜토리얼/수련 업적 12개로 교체' },
    ],
  },
  {
    version: '1.0.16',
    date: '2026-05-11',
    label: 'useRef + rollRewards import 수정',
    changes: [
      { type: 'fix', text: '2번째 전투 노드 진입 시 블랙스크린 (CombatScreen useRef import 누락)' },
      { type: 'fix', text: '상점 진입 시 잠재적 블랙스크린 (ShopScreen rollRewards import 누락)' },
      { type: 'system', text: '6개 모듈 (react, lucide, helpers, data, storage, combat, utils, cloud) × 25개 컴포넌트 전수 점검 완료' },
    ],
  },
  {
    version: '1.0.15',
    date: '2026-05-11',
    label: 'PREP_CONFIG import 누락 수정',
    changes: [
      { type: 'fix', text: '첫 노드(전투 준비) 진입 시 블랙스크린 수정 (PrepScreen/RestScreen에 PREP_CONFIG import 누락)' },
      { type: 'system', text: '모든 컴포넌트 import 종합 점검 완료 (data.js, helpers, storage)' },
    ],
  },
  {
    version: '1.0.14',
    date: '2026-05-11',
    label: '추가 import 누락 수정',
    changes: [
      { type: 'fix', text: '챔피언십 진입 시 블랙스크린 (CHAMPIONSHIP_DIFFICULTIES, isChampionshipDifficultyUnlocked import 누락)' },
      { type: 'fix', text: '첫 노드 클릭 시 블랙스크린 (EventScreen ENEMIES/GAME_CONFIG, RestScreen PASSIVE_SKILLS import 누락)' },
    ],
  },
  {
    version: '1.0.13',
    date: '2026-05-11',
    label: '블랙스크린 + UI 위치 수정',
    changes: [
      { type: 'fix', text: '직업 선택 후 블랙스크린 버그 수정 (ChevronRight 등 아이콘 import 누락)' },
      { type: 'fix', text: '7개 컴포넌트 lucide-react 아이콘 import 일괄 추가' },
      { type: 'fix', text: '메인 화면 버전 텍스트가 타이틀과 겹치던 버그 수정 (PhoneFrame 크기 0 문제)' },
    ],
  },
  {
    version: '1.0.12',
    date: '2026-05-11',
    label: 'PC 사이드바 (실시간 상태)',
    changes: [
      { type: 'feature', text: 'PC 우측 사이드바 추가 — 현재 화면, HP, 영혼, 유물 수, 패시브 수 상시 표시' },
      { type: 'feature', text: '사이드바 항목 클릭 시 상세 모달 (유물 목록, 패시브 + 궁극기, 활성 저주)' },
      { type: 'fix', text: '옛 v1.4 좌측/우측 패널 제거 ("유물 스탯형 전환" 등)' },
      { type: 'system', text: 'ResponsiveLayout 컴포넌트 분리 (모바일/PC 분기)' },
    ],
  },
  {
    version: '1.0.11',
    date: '2026-05-11',
    label: 'PC 환경 UI 개선',
    changes: [
      { type: 'fix', text: 'PC에서 모달 X 버튼 클릭 안 되던 버그 수정 (transform scale 제거)' },
      { type: 'feature', text: 'PC 화면 적응형 레이아웃 — 더 큰 폰 프레임 (420×920)' },
      { type: 'feature', text: 'PC 전용 배경 디자인 — 좌측 게임 타이틀 + 그라데이션' },
      { type: 'system', text: 'PhoneFrame 재설계 (transform 제거, fixed 사용)' },
    ],
  },
  {
    version: '1.0.10',
    date: '2026-05-11',
    label: '리팩토링 완료',
    changes: [
      { type: 'system', text: 'CombatScreen 분리 (1647줄 → 별도 파일)' },
      { type: 'system', text: 'App.jsx 1464줄로 슬림화 (총 76% 감소)' },
      { type: 'system', text: '전체 15개 컴포넌트 + 4개 유틸 모듈로 재구성' },
      { type: 'system', text: '미사용 lucide 아이콘 import 정리' },
    ],
  },
  {
    version: '1.0.9',
    date: '2026-05-11',
    label: '리팩토링 3단계',
    changes: [
      { type: 'system', text: '화면 컴포넌트 14종 추가 분리 (ClassSelect, MapView, CombatScreen 외 12종)' },
      { type: 'system', text: 'App.jsx 약 37% 감소 (4966 → 3111줄)' },
      { type: 'system', text: '전체 누적 49% 감소 (6117 → 3111줄)' },
    ],
  },
  {
    version: '1.0.8',
    date: '2026-05-11',
    label: '계정 관리 + 모드 분리 수정',
    changes: [
      { type: 'feature', text: '계정 관리 화면 추가 — 메인 화면 "◆ 계정 관리" 버튼' },
      { type: 'feature', text: '로그아웃 기능 추가 (모드 변경 가능)' },
      { type: 'feature', text: '게스트 → Google 계정 연동 기능 (데이터 유지)' },
      { type: 'fix', text: '모드 전환 시 이전 데이터가 새 모드로 복사되던 버그 수정' },
      { type: 'system', text: '로그아웃 시 로컬 IndexedDB 자동 클리어' },
    ],
  },
  {
    version: '1.0.7',
    date: '2026-05-11',
    label: '패배 화면 블랙스크린 수정',
    changes: [
      { type: 'fix', text: '전투 패배 시 블랙스크린 버그 수정 (useEffect import 누락)' },
    ],
  },
  {
    version: '1.0.6',
    date: '2026-05-11',
    label: 'Firebase 통합 (1단계)',
    changes: [
      { type: 'feature', text: 'Google 로그인 추가 — 멀티 디바이스 데이터 공유' },
      { type: 'feature', text: '게스트 모드 추가 — 익명 클라우드 저장' },
      { type: 'feature', text: '로컬 모드 유지 — 인터넷 없이도 플레이 가능' },
      { type: 'system', text: '클라우드 자동 백업 (2초 디바운스)' },
    ],
  },
  {
    version: '1.0.5',
    date: '2026-05-11',
    label: '업데이트 로그 시스템 + 영혼 강화 목록',
    changes: [
      { type: 'feature', text: '업데이트 로그 모달 추가 (첫 접속 자동 표시)' },
      { type: 'feature', text: '메인 화면 하단 버전 클릭 시 전체 히스토리 확인' },
      { type: 'feature', text: '영혼의 제단 — 보유한 강화 목록 보기 모달' },
    ],
  },
  {
    version: '1.0.4',
    date: '2026-05-11',
    label: '대장간 모달 버그 수정',
    changes: [
      { type: 'fix', text: '대장간 발견한 조합식 클릭 시 블랙스크린 버그 수정' },
    ],
  },
  {
    version: '1.0.3',
    date: '2026-05-11',
    label: '리팩토링 2단계',
    changes: [
      { type: 'system', text: '화면 컴포넌트 6종 분리 (코드 정리)' },
      { type: 'system', text: 'App.jsx 약 18% 감소 (6117 → 4974줄)' },
    ],
  },
  {
    version: '1.0.2',
    date: '2026-05-11',
    label: '리팩토링 1단계',
    changes: [
      { type: 'system', text: '코드 모듈 분리 시작 (utils, combat 폴더 생성)' },
      { type: 'system', text: '데미지 계산, 헬퍼 함수, 보상 풀, 노드 맵 생성 분리' },
    ],
  },
  {
    version: '1.0.1',
    date: '2026-05-10',
    label: '술법사 빌드 변경 + 대장간 도감',
    changes: [
      { type: 'balance', text: '술법사 시작 스킬 변경 (마력3/이프리트2 → 이프리트3/마력2)' },
      { type: 'feature', text: '대장간에 발견한 조합식 보기 모달 추가' },
      { type: 'balance', text: '검로일여 충격 기절 시 3턴 저항 효과 추가 (강타와 동일)' },
      { type: 'balance', text: '심안류 받는 데미지 차단 50% → 30% 너프' },
      { type: 'balance', text: '심안류 minor 반격 데미지 +7%/Lv → +5%/Lv 너프' },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-05-10',
    label: '챔피언십 정식 출시',
    changes: [
      { type: 'feature', text: '챔피언십 모드 정식 추가 (5원정 × 4난이도)' },
      { type: 'feature', text: '챔피언십 전용 유물 5종 추가' },
      { type: 'feature', text: '챔피언십 종합 업적 4종 (입문/도전자/지옥자/정복자)' },
      { type: 'feature', text: '챕터 클리어 시 회복 정보 상세 표시' },
      { type: 'feature', text: '직업 선택 화면에서 스킬 정보 모달 추가' },
      { type: 'feature', text: '버전 관리 시스템 도입' },
      { type: 'balance', text: '방랑검사 심안류 패시브 대폭 강화 (반격 시스템 개편)' },
      { type: 'balance', text: '직업 전용 패시브 보상 풀 가중치 ×1.2 부스트' },
      { type: 'fix', text: '회피 시 봉인/충격 무효 처리 (동상은 환경 효과로 유지)' },
      { type: 'fix', text: '사건 보상 heal_full / maxhp / stat / gem 처리 누락 수정' },
      { type: 'fix', text: '난이도 변경 시 적 HP 표시 버그 (152/95) 수정' },
      { type: 'fix', text: '타 원정 챔피언십 유물이 다른 원정에 등장하던 버그 수정' },
      { type: 'fix', text: 'Lv.7 패시브의 궁극 진화 카드 등장 확률 부스트' },
    ],
  },
];

// 가장 최신 버전
export const LATEST_VERSION = CHANGELOG[0].version;

// 변경 타입별 색상/라벨
export const CHANGE_TYPES = {
  feature: { label: '신규', color: '#d4a574' },   // 황금
  balance: { label: '밸런스', color: '#5c4a8c' }, // 보라
  fix: { label: '버그수정', color: '#7ba3c4' },    // 청색
  system: { label: '시스템', color: '#9b8975' },   // 회색
};
