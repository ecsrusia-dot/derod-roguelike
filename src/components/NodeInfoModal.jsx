// ============================================
// components/NodeInfoModal.jsx — 노드 진입 설명 모달
// ============================================
// 튜토리얼 챕터에서 노드 진입 직전에 표시.
// 노드 타입별 설명을 보여주고, 확인 시 onConfirm 콜백으로 진입 진행.
// ============================================

import React from 'react';
import { BookOpen, Coins, Crown, Flame, Hammer, HelpCircle, Skull, Sword } from 'lucide-react';
import { PALETTE } from '../utils/helpers.js';

const NODE_INFO = {
  prep: {
    icon: Sword,
    color: '#9ad4a3',
    label: '준비',
    desc: '출정 전 패시브 스킬과 유물을 선택하는 단계.',
    detail: '여기서 고른 조합은 이번 원정 내내 유지됩니다. 다음 정비 노드에서만 재선택 가능합니다.',
  },
  battle: {
    icon: Skull,
    color: '#c4453d',
    label: '일반 적',
    desc: '챕터의 기본 적과 전투.',
    detail: '처치하면 은화·보석·영혼을 얻고, 보상에서 새 패시브/유물을 선택할 수 있습니다.',
  },
  elite: {
    icon: Crown,
    color: '#e8b04a',
    label: '강적',
    desc: '강력한 엘리트 적과 전투.',
    detail: '일반 적보다 까다롭지만, 더 좋은 보상과 영혼을 안깁니다. 만나기 전에 체력 관리 필수.',
  },
  unknown: {
    icon: HelpCircle,
    color: '#9b8975',
    label: '미지',
    desc: '진입 전엔 무엇이 나올지 알 수 없는 노드.',
    detail: '사건·회복의 샘·전투·강적 중 하나가 등장합니다. 모험을 즐기되, 강적이 나올 위험도 감수해야 합니다.',
  },
  event: {
    icon: BookOpen,
    color: '#7ba3c4',
    label: '사건',
    desc: '텍스트로 진행되는 선택형 이벤트.',
    detail: '여러 선택지 중 하나를 골라 보상이나 위험을 감수합니다. 일부 선택지는 비용이 필요합니다.',
  },
  fountain: {
    icon: BookOpen,
    color: '#7ba3c4',
    label: '회복의 샘',
    desc: '맑은 샘에서 휴식하며 체력을 회복.',
    detail: '미지 노드 진입 시 일정 확률로 등장. 최대 체력의 일부를 회복합니다.',
  },
  rest: {
    icon: Flame,
    color: '#d4a574',
    label: '정비',
    desc: '보스 직전의 모닥불.',
    detail: '체력을 회복하거나 패시브 스킬을 강화할 수 있습니다. 활성 패시브/유물을 재선택할 기회도 여기서 주어집니다.',
  },
  shop: {
    icon: Coins,
    color: '#d4a574',
    label: '상점',
    desc: '은화로 유물과 보충 아이템을 구매.',
    detail: '판매 품목은 매번 달라집니다. 필요한 빌드에 맞춰 신중하게 고르세요.',
  },
  forge: {
    icon: Hammer,
    color: '#c46535',
    label: '대장간',
    desc: '보유 유물 두 개를 합쳐 더 강한 유물로 단련.',
    detail: '레시피가 일치하면 특별한 유물이 만들어집니다. 시도해보고 도감에 등록하세요.',
  },
  boss: {
    icon: Crown,
    color: '#8b1f1f',
    label: '보스',
    desc: '챕터의 최종 보스.',
    detail: '쓰러뜨리면 챕터를 클리어하고 다음 챕터로 진행합니다. 패배 시 원정 종료, 영혼은 일부만 보존됩니다.',
  },
};

export default function NodeInfoModal({ nodeType, onConfirm }) {
  const info = NODE_INFO[nodeType];
  if (!info) {
    // 정의되지 않은 타입은 그냥 통과
    return null;
  }
  const Icon = info.icon;

  return (
    <div
      className="absolute inset-0 flex items-center justify-center px-4 z-50"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      onClick={onConfirm}
    >
      <div
        className="w-full max-w-sm flex flex-col"
        style={{
          background: PALETTE.panel,
          border: `2px solid ${info.color}`,
          boxShadow: `0 0 30px ${info.color}50`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 — 아이콘 + 라벨 */}
        <div
          className="px-4 py-3 flex items-center gap-3"
          style={{ borderBottom: `1px solid ${info.color}40` }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
            style={{
              background: `radial-gradient(circle, ${info.color}40, ${PALETTE.bgDeep})`,
              border: `2px solid ${info.color}`,
              boxShadow: `0 0 16px ${info.color}60`,
            }}
          >
            <Icon size={22} style={{ color: info.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] tracking-[0.3em]" style={{ color: PALETTE.textDim }}>
              ◆ 노드 진입
            </div>
            <div
              className="text-base font-bold mt-0.5"
              style={{ color: info.color, fontFamily: '"Cinzel", serif' }}
            >
              {info.label}
            </div>
          </div>
        </div>

        {/* 본문 — 설명 */}
        <div className="px-4 py-4 space-y-3">
          <div className="text-[12px] leading-relaxed" style={{ color: PALETTE.text }}>
            {info.desc}
          </div>
          <div
            className="text-[11px] leading-relaxed px-3 py-2"
            style={{
              color: PALETTE.textDim,
              background: `${info.color}10`,
              border: `1px solid ${info.color}30`,
            }}
          >
            {info.detail}
          </div>
        </div>

        {/* 확인 버튼 */}
        <div className="px-3 py-3" style={{ borderTop: `1px solid ${PALETTE.panelBorder}` }}>
          <button
            onClick={onConfirm}
            className="w-full py-2.5 text-[12px] tracking-[0.2em] font-bold"
            style={{
              background: `linear-gradient(180deg, ${info.color}40, ${info.color}20)`,
              border: `1px solid ${info.color}`,
              color: PALETTE.text,
            }}
          >
            진입한다
          </button>
        </div>
      </div>
    </div>
  );
}
