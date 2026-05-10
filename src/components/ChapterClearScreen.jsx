// ============================================
// components/ChapterClearScreen.jsx — 챕터 클리어 화면
// ============================================
import React from 'react';
import { PALETTE, getMetaBonus, hasCurse } from '../utils/helpers.js';
import { GAME_CONFIG } from '../data.js';

export default function ChapterClearScreen({ chapter, isLastChapter, hp, maxHp, meta, curses = [], onContinue }) {
  // 회복 계산 (다음 챕터 진입 시 적용될 값을 미리 계산해서 표시)
  const baseRatio = GAME_CONFIG.chapterHealRatio;
  const metaBonus = getMetaBonus(meta, 'chapterHeal+10%') * 0.1;
  let healRatio = baseRatio + metaBonus;
  const curseReduction = hasCurse(curses, 'curse_heal-50');
  if (curseReduction) healRatio *= 0.5;
  const targetHp = Math.floor(maxHp * healRatio);
  const finalHp = Math.min(maxHp, Math.max(hp, targetHp));
  const healAmount = finalHp - hp;
  const breakdownArr = [`기본 ${Math.floor(baseRatio * 100)}%`];
  if (metaBonus > 0) breakdownArr.push(`메타 +${Math.floor(metaBonus * 100)}%`);
  if (curseReduction) breakdownArr.push(`부패의 저주 ×0.5`);
  
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-6 py-8" style={{
      background: `radial-gradient(ellipse at center, ${chapter.color}25, ${PALETTE.bgDeep} 70%)`,
    }}>
      <div className="text-center mb-8">
        <div className="text-xs tracking-[0.4em] mb-3" style={{ color: chapter.color }}>━━ CHAPTER CLEAR ━━</div>
        <h2 className="text-3xl font-bold mb-2" style={{
          color: PALETTE.text, fontFamily: '"Cinzel", serif',
          textShadow: `0 0 20px ${chapter.color}80`,
        }}>{chapter.name}</h2>
        <p className="text-xs italic mt-3" style={{ color: PALETTE.textDim }}>{chapter.sub}</p>
      </div>
      <p className="text-sm text-center leading-relaxed mb-6 italic" style={{ color: PALETTE.text }}>
        "한 챕터의 어둠이 걷힌다.<br/>
        여정은 아직 끝나지 않았다."
      </p>
      <div className="mb-6 px-6 py-3 text-center" style={{
        border: `1px solid ${PALETTE.dawn}40`,
        background: `${PALETTE.dawn}10`,
      }}>
        <div className="text-[11px] mb-1" style={{ color: PALETTE.dawn }}>◇ 체력 회복 ◇</div>
        {healAmount > 0 ? (
          <>
            <div className="text-sm font-bold" style={{ color: PALETTE.text }}>
              {hp}/{maxHp} → {finalHp}/{maxHp} <span style={{ color: PALETTE.dawn }}>(+{healAmount})</span>
            </div>
            <div className="text-[10px] mt-1" style={{ color: PALETTE.textDim }}>
              {Math.floor(healRatio * 100)}% 회복 ({breakdownArr.join(' / ')})
            </div>
          </>
        ) : (
          <div className="text-[11px]" style={{ color: PALETTE.textDim }}>
            현재 체력이 충분합니다 ({hp}/{maxHp})
          </div>
        )}
      </div>
      <button onClick={onContinue} className="px-12 py-3" style={{
        background: `linear-gradient(180deg, ${chapter.color}40, ${chapter.color}20)`,
        border: `1px solid ${chapter.color}`,
        color: PALETTE.text, letterSpacing: '0.3em', fontSize: '14px',
      }}>▸ 다음 챕터</button>
    </div>
  );
}

// =========== 원정 클리어 ===========
