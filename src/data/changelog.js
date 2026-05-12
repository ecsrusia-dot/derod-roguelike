// ============================================
// data/changelog.js — 업데이트 로그
// ============================================
// 신규 버전 추가 시 배열 맨 위에 추가
// type: 'feature' (신규기능, 황금) / 'balance' (밸런스, 보라) / 'fix' (버그수정, 청색) / 'system' (시스템, 회색)
// ============================================

export const CHANGELOG = [
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
