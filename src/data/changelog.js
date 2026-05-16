// ============================================
// data/changelog.js — 업데이트 로그
// ============================================
// 신규 버전 추가 시 배열 맨 위에 추가
// type: 'feature' (신규기능, 황금) / 'balance' (밸런스, 보라) / 'fix' (버그수정, 청색) / 'system' (시스템, 회색)
// ============================================

export const CHANGELOG = [
  {
    version: '1.21.3',
    date: '2026-05-16',
    label: '명경지수 회피→반격 +100% 즉시 적용 + 반격 데미지 산출식 로그',
    changes: [
      { type: 'fix', text: '[방랑검사 / 명경지수] 회피 직후 발동되는 "다음 반격 데미지 +100%" 버프가 실제로 같은 턴 반격에 미적용되던 버프 수정. 원인: 회피 시 mirrorCounterDmgNext 플래그를 설정하고 반격 종료 후 Pending으로 변환하는 2단계 구조였기 때문에, 같은 턴 반격 판정 시점엔 Pending이 아직 false. 이제 회피 시점에 mirrorCounterDmgPending을 직접 true로 설정 → 같은 턴 반격에서 즉시 ×2.0 적용. 로그 표기 "다음 반격 데미지 +100%"와 실제 동작 일치' },
      { type: 'feature', text: '반격 데미지 산출식 로그 신설 — 일반 공격 로그의 (기본 N / 근력 +N) 패턴과 동일하게 (기본 N / 심안류 ×N.NN / 명경지수 ×2.0 / 회피→반격 ×2.0 / 적 방어 -N) 형식으로 곱셈 인자를 모두 표시. 무영검 누적 폭발, 검로일여, Lv.5/Lv.7 보너스 등 모든 반격 보너스가 어떻게 합산됐는지 한눈에 확인 가능' },
      { type: 'feature', text: '전투 메인 헤더·≡ 모달 활성 상태 칩 영역에 "◇ 회피→반격 +100%" 칩 추가. 회피 직후 buff가 활성됐는지 시각적으로 추적 가능' },
    ],
  },
  {
    version: '1.21.2',
    date: '2026-05-16',
    label: '방랑검사 버그 수정 — 무영의 일격 턴 구분선 + 모달 반격률 100% 표시',
    changes: [
      { type: 'fix', text: '방랑검사 시그니처 궁극 "무영의 일격" 발동 후 전투 로그에 "턴 N" 구분선이 그려지지 않던 버그 수정 — 궁극 발동 코드 경로가 일반 스킬과 분리되어 있어 turnDivider 로그 삽입이 누락돼 있었음. 이제 궁극 사용 턴도 일반 스킬과 동일하게 구분선이 표시됨' },
      { type: 'fix', text: '전투 화면 ≡ 스테이터스 모달에서 무영의 잔영(반격 100%) 활성 중에도 반격률이 35%(심안류 Lv.3 기준) 등으로 표시되던 버그 수정 — 모달의 반격률 계산식이 player.buffs.shadowCounterTurns를 보지 않아 정적 패시브·궁극 값만 합산하고 있었음. 실제 반격 발동률은 코드 상 100%로 정상 처리되고 있었으며 이번 수정은 표시만 정합화 (게임플레이 동작 변화 없음)' },
      { type: 'feature', text: '전투 화면 ≡ 스테이터스 모달에 "활성 상태" 칩 영역 신설 — 무영의 잔영 / 분노 / 치명타 확정 / 회피 버프 / 무적 1회 / 동상 / 패시브 봉인 / 충격 / 기절 등 임시 효과를 한눈에 확인 가능. 기존엔 메인 헤더 칩에만 보여서 모달 진입 시 활성 효과를 추적할 수 없었음' },
    ],
  },
  {
    version: '1.21.1',
    date: '2026-05-16',
    label: '챔피언십 forest 보스 스킬 이름 일러 컨셉 정합화',
    changes: [
      { type: 'system', text: '챔피언십 forest(부패·숲) 컨셉의 일러 방향을 4보스 차별화 형태(식물 모성 정령 / 부패 망자 검왕 / 노쇠한 인간 정원사 / 다중 머리 키메라 신)로 사전 확정. 이에 맞춰 일러 컨셉과 어긋나던 보스·강적 스킬 이름 7개를 일러 방향과 일치하도록 정리: 시든 자들의 어머니 "광기 분쇄" → "시든 자식 소환" / 망자의 군주 "왕좌의 가호" → "부패 갑옷" / 광기의 정원사 "광기의 폭주" → "큰 가지치기" / 심부의 폭군 "폭군의 강타" → "거대 발톱" + "광기의 절대 분쇄" → "신적 분쇄" / 광기의 폭군(강적) "나무 방패" → "광기의 가호" / 심부의 사도(강적) "사도의 일격" → "심부의 봉인". 데미지·턴·heavy/defense 메커니즘은 모두 1바이트도 변경되지 않으며 게임 시스템 동작은 동일' },
    ],
  },
  {
    version: '1.21.0',
    date: '2026-05-16',
    label: '챔피언십 frost 적 일러스트 20장 적용 (4보스 차별화)',
    changes: [
      { type: 'feature', text: '챔피언십 frost(서리·동토) 컨셉 적 16종에 신규 전투 일러스트 일괄 적용 — 4난이도 환경 단계가 명확히 분리됨: 1단계 동토 황무지 / 2단계 빙하 동굴 / 3단계 빙하 협곡 / 4단계 절대영도의 옥좌. 색조도 단계별 점진 변화 (창백한 청록 → 짙은 청록 → 빙하 청 → 백청 별빛)' },
      { type: 'feature', text: '4보스를 4가지 완전히 다른 존재 형태로 차별화 — 눈보라의 군주(인간 야성 정복자 전사, 손마법 X) / 동굴의 빙왕(거대 동굴 빙거인, 천장 닿는 거인) / 협곡의 한기룡(공중·하강 위협, 양쪽 빙벽 매달림) / 절대영도의 군주(무형 반투명 망령왕, 옥좌와 일체). 자세·무기·운동감 4축 모두 분리' },
      { type: 'feature', text: '4보스 진입 풀컷 시네마틱 9:16 일러 4종 추가 — 보스 노드 진입 시 자동 활성화. 한기의 마녀(클래식 챕터 1)·타락한 황혼의 자녀(2)·망각의 봉인자(3)·마왕의 그림자(4)에 이어 챔피언십 frost 보스 4명 모두 컷신 보유' },
      { type: 'system', text: '적 일러스트 경로 헬퍼 `getEnemyImageSrc` 추가 — chapter 값이 number면 클래식 경로, string(`frost_1` 등)이면 챔피언십 경로 자동 분기. CombatScreen / BossIntroScreen 코드 단순화 + 향후 4컨셉(forest·sanctum·rift·dawn) 추가 시 자동 동작' },
      { type: 'system', text: 'PNG 20장 → JPG quality 90 변환으로 총 55.83 MB → 10.57 MB (81% 절감). 챔피언십 5컨셉 중 frost 1번째 완료, 나머지 forest·sanctum·rift·dawn 4컨셉(80장) 진행 예정' },
    ],
  },
  {
    version: '1.20.0',
    date: '2026-05-15',
    label: '챕터 4 적 일러스트 6장 적용 (마계의 균열)',
    changes: [
      { type: 'feature', text: '챕터 4 적 5종에 신규 전투 일러스트 적용 — 마계 정찰병 / 분노한 악마 / 차원의 균열 / 마왕의 사도 / 마왕의 그림자. 전투 화면 적 영역의 "[ 적 모습 미구현 ]" 플레이스홀더가 자동으로 교체됨. 진홍·검정·마계 톤이 챕터 3 신성과 명확히 구분되며 화풍은 챕터 3·4 통일' },
      { type: 'feature', text: '마왕의 그림자(챕터 4 보스) 진입 풀컷 일러 추가 — 보스 노드 진입 시 9:16 시네마틱 컷신이 자동 활성화. 한기의 마녀(챕터 1) / 타락한 황혼의 자녀(챕터 2) / 망각의 봉인자(챕터 3)에 이어 네 번째 보스 진입 컷' },
      { type: 'system', text: '6장 PNG → JPG quality 90 변환으로 총 16.7 MB → 3.1 MB (82% 절감). 메인 스토리 챕터 4개 모두 일러 적용 완료 — placeholder는 챔피언십 컨셉별 적에만 남음' },
    ],
  },
  {
    version: '1.19.0',
    date: '2026-05-15',
    label: '전투 로그 UX 개선 — 턴 구분선 + 확장 모달',
    changes: [
      { type: 'feature', text: '전투 로그에 턴 구분선 추가 — 매 턴 시작 시 "턴 N" 라벨이 가로선과 함께 표시되어 어디서부터 어디까지가 한 턴인지 시각적으로 명확. 로그 항목이 많이 쌓여도 행동 단위를 한눈에 구분 가능' },
      { type: 'feature', text: '전투 로그 확장 모달 추가 — 로그 영역 우상단의 ⛶ 버튼을 누르면 풀스크린 모달이 열리며 큰 글자 크기로 전체 로그를 천천히 확인 가능. 닫기 버튼 또는 X 아이콘으로 전투 복귀. 110px 고정 영역에 가려 못 보던 과거 행동을 자유롭게 스크롤하며 검토 가능' },
    ],
  },
  {
    version: '1.18.0',
    date: '2026-05-14',
    label: '구 IP 잔재 제거 — 마왕/여명의 봉인으로 재구성',
    changes: [
      { type: 'system', text: '데로드앤데블랑 시기의 구 IP 명칭(나크젤리온/엘디마이어) 모두 제거. "나크젤리온" → "마왕", "엘디마이어" → "여명의 봉인"으로 재구성. 챕터 4 보스 "나크젤리온의 그림자" → "마왕의 그림자", 유물 "나크젤리온의 송곳니" → "마왕의 송곳니", 챔피언십 챕터 "나크젤리온의 옥좌" → "마왕의 옥좌", 챕터 3 보스 desc "엘디마이어의 마지막 수호자" → "여명의 봉인을 지키는 마지막 수호자" 등 사용자에게 보이는 모든 텍스트 정리' },
      { type: 'system', text: '챔피언십 적 이름 중복 회피 — 메인 스토리 "마왕의 사도(demonApostle)"와 구분되도록 챔피언십 강적은 "절대 사도"로, 챔피언십 보스는 "마왕의 화신"으로 차별화' },
      { type: 'system', text: '내부 코드 식별자(enemyKey `nakzelionShadow`, 궁극 effect `ult_deblanCurse`)는 보존 — 저장 데이터 호환성 위해. 사용자에게는 노출되지 않으므로 무영향. 대장간 레시피의 유물 이름 참조 3곳은 함께 갱신' },
    ],
  },
  {
    version: '1.17.2',
    date: '2026-05-14',
    label: '패시브 카드 즉시 토글 (UX 개선)',
    changes: [
      { type: 'feature', text: '전투 준비 및 정비 화면에서 패시브 스킬 카드 클릭 시 모달 없이 즉시 활성/해제 토글되도록 변경. 빌드 구성 속도 개선. 정보 확인은 도감에서' },
      { type: 'system', text: '유물·액티브 스킬 카드는 기존대로 클릭 시 정보 모달 유지 — 효과 수치가 복잡한 카드는 정보 확인이 더 중요하기 때문' },
    ],
  },
  {
    version: '1.17.1',
    date: '2026-05-14',
    label: '튜토리얼 4 저주의 시련 너프',
    changes: [
      { type: 'balance', text: '[튜토리얼 4 저주의 시련] elite 노드 4개 → 3개로 축소. 저주 3단계(부패의 저주, 회복-50%) 노드 제거. 보스(한기의 마녀)전 진입 시 누적 저주 3개 → 2개로 감소. 부패의 저주가 rest 노드 회복을 절반으로 깎아 보스 부담이 과중하던 문제 해소' },
      { type: 'balance', text: '[튜토리얼 4 노드 수] 7노드(prep / elite×4 / rest / boss) → 6노드(prep / elite×3 / rest / boss)로 축소. 첫 클리어 학습 흐름 부드러워짐. 부패의 저주는 실제 원정·챔피언십(광기 난이도 3저주)에서 처음 만나게 됨' },
    ],
  },
  {
    version: '1.17.0',
    date: '2026-05-14',
    label: '챕터 3 적 일러스트 6장 적용 (봉인된 신전)',
    changes: [
      { type: 'feature', text: '챕터 3 적 5종에 신규 전투 일러스트 적용 — 시간의 수호자 / 깨진 골렘 / 봉인 마법사 / 옛 사제 / 망각의 봉인자. 전투 화면 적 영역의 "[ 적 모습 미구현 ]" 플레이스홀더가 자동으로 교체됨' },
      { type: 'feature', text: '망각의 봉인자(챕터 3 보스) 진입 풀컷 일러 추가 — 보스 노드 진입 시 9:16 시네마틱 컷신이 자동 활성화. 한기의 마녀(챕터 1) / 타락한 황혼의 자녀(챕터 2)에 이어 세 번째 보스 진입 컷' },
      { type: 'system', text: '6장 PNG → JPG quality 90 변환으로 총 17.8 MB → 3.2 MB (82% 절감). 챕터 3은 페인터리 톤이 더 정밀해 챕터 1·2(86%)보다 절감률 약간 낮지만 화질 유지' },
    ],
  },
  {
    version: '1.16.0',
    date: '2026-05-14',
    label: '챕터 2 적 일러스트 7장 적용 (죽은 자의 숲)',
    changes: [
      { type: 'feature', text: '챕터 2 적 6종에 신규 전투 일러스트 적용 — 타락한 엘프 / 그림자 늑대 / 부패한 거미 / 오염된 정령 / 숲의 폭군 / 타락한 황혼의 자녀. 전투 화면 적 영역의 "[ 적 모습 미구현 ]" 플레이스홀더가 자동으로 교체됨' },
      { type: 'feature', text: '타락한 황혼의 자녀(챕터 2 보스) 진입 풀컷 일러 추가 — 보스 노드 진입 시 9:16 시네마틱 컷신이 자동 활성화. 한기의 마녀에 이어 두 번째 보스 진입 컷' },
      { type: 'system', text: '7장 PNG → JPG quality 90 변환으로 총 15.5 MB → 2.2 MB (86% 절감). PWA 오프라인 캐시 부담 최소화. 모든 경로는 상대 경로(./enemies/...) 컨벤션 준수' },
    ],
  },
  {
    version: '1.15.1',
    date: '2026-05-14',
    label: '방어 이펙트 재마운트 버그 + 무영의 일격 너프 + 버프 아이콘',
    changes: [
      { type: 'fix', text: '방어 이펙트가 방어 0인 상태에서도 적 공격받을 때마다 발현되던 버그 해결 — 근본 원인은 적/플레이어 영역의 shake wrapper(`key={`...-${fxShake}`}`)가 흔들림 트리거마다 re-mount되면서 자식 FX 컴포넌트들이 함께 재-마운트되어 mount-시점 애니메이션을 재생하던 것. shake wrapper를 inner div로 분리해 일러스트만 흔들리도록 격리, FX 오버레이는 외부 안정 컨테이너에 배치 → 이제 trigger 값이 실제로 변할 때만 재생' },
      { type: 'balance', text: '[무영의 일격] 데미지 80 → 45 너프 — 80은 챕터 1 일반 적(HP 60~90)을 한 방에 처치해 반격 100% 3턴 버프 발동 기회가 사라지는 문제. 45로 낮춰 일반 적도 한 방에 안 죽고 반격 사이클이 돌아가도록 조정' },
      { type: 'feature', text: '버프 아이콘 표시 추가 — 무영의 잔영(반격 100% 잔여 턴) + 치명타 확정 버프가 상태 BAR에 골든 테두리로 표시. 분노/에테르와 동일한 슬롯에. 발동 여부를 시각적으로 즉시 확인 가능' },
    ],
  },
  {
    version: '1.15.0',
    date: '2026-05-14',
    label: '방랑검사 스킬 이펙트 차별화 + 무영의 일격 재설계',
    changes: [
      { type: 'feature', text: '방랑검사 4슬롯 전투 이펙트 차별화 — 참격(기존 슬래시), 관통(직선 스러스트 빔), 방검(다이아몬드 가드 + 사방 스파크), 무영의 일격(3중 슬래시 X자+가로 + 그림자 오라). 각 스킬마다 고유 시각 언어 정립' },
      { type: 'feature', text: '크리티컬 이펙트도 스킬별로 분기 — 참격 크리(황금 슬래시), 관통 크리(황금 스러스트 + 강조). 슬래시 색상 플래그가 다른 스킬에 잘못 적용되던 동기화 버그 해소' },
      { type: 'balance', text: '[무영의 일격] 재설계 — 기존 "현재 HP의 30%" 방식은 적 HP가 낮을 때 일반 공격보다 약해지는 역설. 고정 80 데미지(방어 무시) + 다음 3턴간 반격 확률 100% + 다음 공격 치명타 확정. 반격/회피 특화 컨셉을 살리는 생존기로 전환' },
      { type: 'fix', text: '방어 이펙트가 방어 수치 없는 상태에서도 발동되던 문제 — 방어 흡수가 실제로 발생한 시점에만 새로운 "방어 소진" FX(작은 펄스 + 사방 파편)가 발동되도록 게이팅. 방어 0에서는 적 공격받아도 방어 FX 발동 안 함' },
      { type: 'fix', text: '방어 차감이 데미지 breakdown에 묻혀 안 보이던 문제 — "🛡 방어 -N (잔여 M)" 별도 로그 라인 추가. 차감 시점이 한눈에 보임' },
      { type: 'system', text: '신규 FX 컴포넌트 4종 추가 (ThrustFx / BladeGuardFx / ShadowStrikeFx / BarrierBreakFx) + 대응 키프레임 7종. 향후 타 직업 슬롯별 차별화 작업의 기반' },
    ],
  },
  {
    version: '1.14.1',
    date: '2026-05-14',
    label: '적 일러스트 경로 핫픽스',
    changes: [
      { type: 'fix', text: '챕터 1 적 일러스트가 보이지 않던 문제 수정 — `<img src>`가 절대 경로(`/enemies/...`)로 작성돼 GitHub Pages의 `/derod-roguelike/` 베이스를 무시하고 404가 났음. 직업 일러(`./classes/...`)와 동일하게 상대 경로(`./enemies/...`)로 통일' },
      { type: 'fix', text: '보스 진입 컷신의 풀컷 일러도 동일 원인으로 안 보이던 문제 수정' },
    ],
  },
  {
    version: '1.14.0',
    date: '2026-05-14',
    label: '챕터 1 적 일러스트 + 보스 진입 시네마틱 컷신',
    changes: [
      { type: 'feature', text: '챕터 1 적 6종에 신규 전투 일러스트 적용 — 북부 고블린 / 얼음 늑대 / 동토의 약탈자 / 동상 거인 / 극지의 망령 / 한기의 마녀. 전투 화면 적 영역의 "[ 적 모습 미구현 ]" 자리에 표시' },
      { type: 'feature', text: '신규 시스템: 보스 진입 시네마틱 컷신 (BossIntroScreen) — 보스 노드 진입 시 9:16 풀컷 일러 페이드인 + 미세 줌 + 보스 이름 배너 라이즈. 2.5초 자동 진행 또는 탭으로 즉시 스킵' },
      { type: 'feature', text: '한기의 마녀 진입 풀컷 일러 추가 — 챕터 1 보스 한정. 챕터 2~4 보스는 일러 추가 시 자동 활성화 (시스템은 이미 준비됨)' },
      { type: 'system', text: '적 일러스트 파일 구조 정착: public/enemies/classic/chapter_<n>/<적key>_combat.jpg 와 _intro.jpg. 챕터 2~4 적은 일러 추가 전까지 기존 placeholder 유지 (회귀 없음)' },
    ],
  },
  {
    version: '1.13.1',
    date: '2026-05-14',
    label: '챕터 1 티어 재조정 — 동상 거인 강적 승격 / 동토의 약탈자 일반 강등',
    changes: [
      { type: 'balance', text: '[동상 거인] 일반 → 강적 승격: HP 130 → 180, 얼어붙은 주먹 16-22 → 18-24, 한파 10-14 → 14-20, 냉기 결계 방어 25 → 35, 눈사태(heavy) 24-32 → 30-40. 드롭 40-60 골드 → 70-100 골드 + 보석 1-2' },
      { type: 'balance', text: '[동토의 약탈자] 강적 → 일반 강등: HP 130 → 110, 얼어붙은 도끼 16-22 → 14-18, 광폭한 돌진(heavy) 24-30 → 20-26, 늑대 가죽 방어 30 → 20, 빙결 회수 12-16 → 10-14. 드롭 65-95 골드 + 보석 1-2 → 35-55 골드 (보석 제거)' },
      { type: 'system', text: '챕터 1 적 풀 5곳 갱신 — 모든 일반 풀에 동토의 약탈자가, 모든 강적 풀에 동상 거인이 배치됨' },
    ],
  },
  {
    version: '1.13.0',
    date: '2026-05-14',
    label: '챕터 1 적 재구성 — 동토의 약탈자 + 한기의 마녀 보스 승격',
    changes: [
      { type: 'balance', text: '챕터 1 보스 교체: 극지의 망령 → 한기의 마녀로 승격 (HP 145 → 320, 패턴 4 → 5개, 절대영도 신규 시그니처 공격 추가)' },
      { type: 'balance', text: '극지의 망령 강등: 보스 → 강적 (HP 250 → 180, 패턴 4 → 3개, heavy 공격 제거). 챕터 1 강적 풀에 합류' },
      { type: 'feature', text: '신규 강적 [동토의 약탈자] 추가 — 한기에 미친 인간 야만전사. 마족 첩자 대체. 광폭한 돌진(heavy) 보유' },
      { type: 'balance', text: '챕터 1과 컨셉이 안 맞는 [마족 첩자]를 풀에서 제거 (북부 극지대 → 약탈자 컨셉으로 통일)' },
      { type: 'system', text: '5개 원정(튜토리얼 1·2·3·4 + 챕터1 수련의 길) 적 풀 재배치. 챕터 1 desc 갱신' },
      { type: 'system', text: '"의문의 행상" 이벤트 실패 시 전투 대상이 망령으로 변경 — "망자였다!" 텍스트와 일치' },
    ],
  },
  {
    version: '1.12.0',
    date: '2026-05-13',
    label: '직업 액티브 궁극 + 영혼 게이지 — 방랑검사 프로토타입',
    changes: [
      { type: 'feature', text: '직업별 액티브 궁극(필살기) 시스템 신설 — 전투 화면 4번째 버튼으로 발동' },
      { type: 'feature', text: '"영혼 게이지(혼)" 추가 — 데미지 입힘(+dmg/5) / 피격(+dmg/3) / 매 턴(+5) / 치명타(+10)로 충전. 100 도달 시 궁극 발동 가능, 발동 후 0으로 리셋' },
      { type: 'feature', text: '방랑검사 시그니처 궁극 [무영의 일격] — 적 현재 HP 30%를 방어 무시로 즉시 제거 + 다음 1턴 치명타 확정. 발동 시 풀스크린 골든 컷인 (직업명·궁극명 배너 0.9초)' },
      { type: 'system', text: '기존 패시브 Lv.7 진화 시스템의 UI 라벨을 "궁극" → "각성"으로 통일 (사일런트 강화 = 각성, 액티브 발동 = 궁극으로 컨셉 분리)' },
      { type: 'system', text: '술법사/혼혈 마족/정령사/사제는 다음 업데이트에서 시그니처 궁극 추가 예정 — 현재는 방랑검사만 4번째 버튼 노출' },
    ],
  },
  {
    version: '1.11.0',
    date: '2026-05-13',
    label: '전투 시각 이팩트 Phase 2 — 스킬 타입 비주얼·상태이상 시각화',
    changes: [
      { type: 'feature', text: '물리 공격 시 대각선 검선(슬래시) SVG가 적 위로 그어진다 — 치명타 시 황금색·굵은 선·잔광 강조' },
      { type: 'feature', text: '마법 공격 시 룬 원형 진(陣)이 회전·확장하며 사라지는 마법 임팩트 추가' },
      { type: 'feature', text: '마법 공격 시 직업색 입자 8~10개가 적 중심에서 방사형으로 튀어나가는 입자 버스트' },
      { type: 'feature', text: '방어 스킬 사용 시 플레이어 둘레에 청록 결계 링이 이중 펄스로 확장' },
      { type: 'feature', text: '적 상태이상 시각화 — 출혈 시 빨간 액 드립, 화염 각인 시 주황 글로우, 기절 시 머리 위 별 회전' },
      { type: 'system', text: 'CombatEffects.jsx에 SlashFx/MagicImpactFx/MagicParticles/BarrierRing/StatusOverlay 컴포넌트 추가 — Phase 3 보스 컷인·궁극 컷인 확장 시 재사용 가능' },
    ],
  },
  {
    version: '1.10.1',
    date: '2026-05-13',
    label: '협업 인수인계 문서(CLAUDE.md) 추가',
    changes: [
      { type: 'system', text: 'CLAUDE.md 추가 — 새 협업 세션에서도 동일한 워크플로(버전·changelog 룰, PR 패턴, PM 커뮤니케이션 스타일)가 유지되도록 인수인계 문서 작성' },
    ],
  },
  {
    version: '1.10.0',
    date: '2026-05-13',
    label: '전투 시각 이팩트 Phase 1 — 박진감 업그레이드',
    changes: [
      { type: 'feature', text: '전투 시 데미지 숫자가 적/플레이어 위로 떠올랐다 사라지는 부유 라벨 표시 (이전엔 HP 옆 작은 숫자)' },
      { type: 'feature', text: '크리티컬 시 데미지 숫자가 1.5배 크기·황금색·잔광으로 강조' },
      { type: 'feature', text: '회피 성공 시 "회피!" 부유 라벨이 떠오름' },
      { type: 'feature', text: '강타/보스 공격에 화면 흔들림, 일반 피격에 적/플레이어 진동 + 흰색 깜빡임' },
      { type: 'feature', text: '플레이어 피격 시 화면 가장자리 빨간 비네트로 위기감 표현' },
      { type: 'balance', text: 'HP 바 감소를 0.45초 부드러운 트랜지션으로 변경 (이전 150ms → 더 무거운 체감)' },
      { type: 'system', text: '재사용 가능한 FX 컴포넌트 분리 (FloatingLabel / DamageVignette / WhiteFlash), Phase 2 이팩트 확장 시 활용 가능' },
    ],
  },
  {
    version: '1.9.0',
    date: '2026-05-13',
    label: '맵 진행 이어하기 — 앱 종료 후 재개 가능',
    changes: [
      { type: 'feature', text: '맵 화면에서 어떤 식으로든 앱이 종료/새로고침되더라도 진행 상황이 자동 저장 — 다음 접속 시 이어하기 가능' },
      { type: 'feature', text: '메인 화면에 [이어하기] 버튼 추가 — 진행 중 직업·원정·챕터/깊이 정보가 함께 표시됨' },
      { type: 'feature', text: '맵에서 나가기로 메인 메뉴로 돌아가도 스냅샷 유지 — 휴식 후 같은 런 이어가능' },
      { type: 'system', text: '맵 진입/노드 완료 시점마다 메타에 스냅샷 저장. 새 런 시작·사망·원정 클리어 시 자동 정리' },
      { type: 'system', text: '튜토리얼·수련·일일·무한·챔피언십 모든 모드 호환' },
    ],
  },
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
