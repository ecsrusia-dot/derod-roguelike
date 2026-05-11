// ============================================
// components/CodexScreen.jsx — 도감 (대장간 조합식)
// ============================================
// 발견된 레시피만 공개, 미발견은 ??? + ??? = ??? 형식

import React from 'react';
import { PALETTE } from '../utils/helpers.js';
import { FORGE_RECIPES } from '../data.js';

export default function CodexScreen({ meta, onBack }) {
  const discovered = meta.discoveredRecipes || [];
  const totalRecipes = FORGE_RECIPES.length;
  
  // 발견된 것 먼저, 미발견 나중
  const sortedRecipes = [...FORGE_RECIPES].sort((a, b) => {
    const aDis = discovered.includes(a.result);
    const bDis = discovered.includes(b.result);
    if (aDis && !bDis) return -1;
    if (!aDis && bDis) return 1;
    return 0;
  });
  
  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: PALETTE.bgDeep }}>
      <div className="px-4 py-3 border-b flex items-center gap-3" style={{ borderColor: PALETTE.panelBorder }}>
        <button onClick={onBack} className="text-base font-bold" style={{ color: PALETTE.textDim }}>◂</button>
        <div className="flex-1 text-center">
          <div className="text-[10px] tracking-[0.3em]" style={{ color: '#c46535' }}>━━ C O D E X ━━</div>
          <div className="text-sm font-bold tracking-[0.2em] mt-0.5" style={{ color: PALETTE.text }}>황혼의 대장간 도감</div>
        </div>
        <div style={{ width: '20px' }} />
      </div>
      
      <div className="px-4 py-2 flex justify-between items-center" style={{ background: `${PALETTE.bgDeep}`, borderBottom: `1px solid ${PALETTE.panelBorder}` }}>
        <span className="text-[10px]" style={{ color: PALETTE.textDim }}>발견된 레시피</span>
        <span className="text-[12px] font-bold tabular-nums" style={{ color: '#c46535' }}>
          {discovered.length} / {totalRecipes}
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {sortedRecipes.map((recipe, idx) => {
          const isDiscovered = discovered.includes(recipe.result);
          return (
            <div key={idx} className="px-3 py-2.5" style={{
              background: isDiscovered ? `${PALETTE.bgDeep}` : '#0a0608',
              border: `1px solid ${isDiscovered ? '#c46535' : PALETTE.panelBorder}`,
              opacity: isDiscovered ? 1 : 0.6,
            }}>
              <div className="flex items-center gap-2 mb-1.5">
                <Hammer size={14} style={{ color: isDiscovered ? '#c46535' : PALETTE.textDim }} />
                <div className="text-[12px] font-bold" style={{ color: isDiscovered ? PALETTE.text : PALETTE.textDim }}>
                  {isDiscovered ? recipe.result : '???'}
                </div>
              </div>
              <div className="text-[10px] flex items-center gap-1.5 flex-wrap" style={{ color: PALETTE.textDim }}>
                {isDiscovered ? (
                  <>
                    <span>{recipe.ingredients[0]}</span>
                    <span style={{ color: '#c46535' }}>+</span>
                    <span>{recipe.ingredients[1]}</span>
                    <span style={{ color: '#c46535' }}>=</span>
                    <span style={{ color: PALETTE.legendary }}>{recipe.result} +1Lv</span>
                  </>
                ) : (
                  <>
                    <span>???</span>
                    <span>+</span>
                    <span>???</span>
                    <span>=</span>
                    <span>???</span>
                  </>
                )}
              </div>
            </div>
          );
        })}
        
        <div className="text-[9px] text-center mt-4 mb-2" style={{ color: PALETTE.textDim, opacity: 0.6 }}>
          유물 2개를 희생하면 정해진 패시브를 획득한다
        </div>
      </div>
    </div>
  );
}

// =========== 전투 준비 노드 ===========
// 보유 패시브 中 5개, 보유 유물 中 N개 (원정별) 선택 → 나머지 봉인
// =========== 전투 준비 / 재선택 노드 ===========
// mode: 'full' (둘 다) | 'skills' (패시브만) | 'relics' (유물만)
