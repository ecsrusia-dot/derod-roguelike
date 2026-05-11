// ============================================
// data/changelog.js — 업데이트 로그
// ============================================
// 신규 버전 추가 시 배열 맨 위에 추가
// type: 'feature' (신규기능, 황금) / 'balance' (밸런스, 보라) / 'fix' (버그수정, 청색) / 'system' (시스템, 회색)
// ============================================

export const CHANGELOG = [
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
