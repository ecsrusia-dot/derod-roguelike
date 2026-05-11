// ============================================
// components/ForgeScreen.jsx — 황혼의 대장간 (유물 2개 → 패시브)
// ============================================

import React, { useState } from 'react';
import { PALETTE } from '../utils/helpers.js';
import { FORGE_RECIPES, PASSIVE_SKILLS, findRecipe } from '../data.js';

export default function ForgeScreen({ relics, skills, activeRelicNames, meta, onCombine, onLeave }) {
  const [selected, setSelected] = useState([]);
  const [resultMsg, setResultMsg] = useState(null);
  const [showRecipes, setShowRecipes] = useState(false);
  
  const availableRelics = relics; // 봉인 무관 — 모든 보유 유물 희생 가능
  const discoveredRecipes = meta?.discoveredRecipes || [];
  
  const toggleSelect = (idx) => {
    if (resultMsg) return;
    if (selected.includes(idx)) {
      setSelected(selected.filter(i => i !== idx));
    } else if (selected.length < 2) {
      setSelected([...selected, idx]);
    }
  };
  
  const handleCombine = () => {
    if (selected.length !== 2) return;
    const r1 = availableRelics[selected[0]];
    const r2 = availableRelics[selected[1]];
    const recipe = findRecipe(r1.name, r2.name);
    
    let result;
    if (recipe) {
      const curLv = skills[recipe.result] || 0;
      if (curLv >= 7) {
        // 이미 Lv.7 → 영혼 보상
        result = { type: 'souls', value: 50, msg: `[${recipe.result}] 이미 Lv.7\n영혼 +50` };
      } else {
        // 패시브 +1
        result = { type: 'skill', skillName: recipe.result, msg: `★ [${recipe.result}] Lv.${curLv} → Lv.${curLv + 1}` };
      }
    } else {
      // 정의 안 된 조합 → 영혼 보상
      result = { type: 'souls', value: 50, msg: `정의되지 않은 조합\n영혼 +50` };
    }
    
    setResultMsg(result.msg);
    onCombine(selected, result);
  };
  
  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: PALETTE.bgDeep }}>
      <div className="px-4 py-3 border-b text-center" style={{ borderColor: PALETTE.panelBorder }}>
        <div className="text-[10px] tracking-[0.4em]" style={{ color: '#c46535' }}>━━ T W I L I G H T   F O R G E ━━</div>
        <div className="text-base font-bold tracking-[0.2em] mt-1" style={{ color: PALETTE.text }}>황혼의 대장간</div>
        <div className="text-[10px] mt-1" style={{ color: PALETTE.textDim }}>유물 2개를 희생하여 패시브를 단련한다</div>
        <button 
          onClick={() => setShowRecipes(true)} 
          className="mt-2 px-3 py-1 text-[10px] tracking-[0.2em]"
          style={{
            background: `${'#c46535'}20`,
            border: `1px solid ${'#c46535'}80`,
            color: '#c46535',
          }}
        >📖 발견한 조합식 ({discoveredRecipes.length}/{FORGE_RECIPES.length})</button>
      </div>
      
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {resultMsg ? (
          // 결과 화면
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-center px-4 py-8" style={{ background: `${PALETTE.bgDeep}`, border: `2px solid #c46535` }}>
              <div className="text-2xl mb-3" style={{ color: '#c46535' }}>🔨</div>
              <div className="text-sm leading-relaxed whitespace-pre-line" style={{ color: PALETTE.text, textShadow: '0 0 8px #c4653580' }}>
                {resultMsg}
              </div>
            </div>
            <button onClick={onLeave} className="mt-6 w-full max-w-xs py-2.5 text-xs tracking-[0.3em]" style={{
              background: `linear-gradient(180deg, #c4653540, #c4653520)`,
              border: `1px solid #c46535`, color: '#fff',
            }}>▸ 대장간을 떠난다</button>
          </div>
        ) : (
          <>
            {/* 보유 유물 목록 */}
            {availableRelics.length === 0 ? (
              <div className="text-center py-12" style={{ color: PALETTE.textDim }}>
                <div className="text-sm">희생할 유물이 없다</div>
              </div>
            ) : (
              <>
                <div className="text-[10px] mb-2" style={{ color: PALETTE.textDim }}>
                  희생할 유물 2개를 선택하라 ({selected.length}/2)
                </div>
                <div className="space-y-1.5 mb-4">
                  {availableRelics.map((rel, i) => {
                    const isSelected = selected.includes(i);
                    return (
                      <button key={i} onClick={() => toggleSelect(i)}
                        className="w-full px-3 py-2 text-left flex items-center justify-between"
                        style={{
                          background: isSelected ? `${rel.color || PALETTE.dawn}40` : `${rel.color || PALETTE.dawn}15`,
                          border: `1px solid ${isSelected ? '#c46535' : rel.color || PALETTE.dawn}`,
                          opacity: 1,
                        }}>
                        <div>
                          <div className="text-[11px] font-bold" style={{ color: '#fff' }}>{rel.name}</div>
                          <div className="text-[9px] mt-0.5" style={{ color: PALETTE.textDim }}>{rel.desc}</div>
                        </div>
                        {isSelected && <span className="text-sm" style={{ color: '#c46535' }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
                <button onClick={handleCombine} disabled={selected.length !== 2}
                  className="w-full py-2.5 text-xs tracking-[0.3em] font-bold" style={{
                    background: selected.length === 2 ? `linear-gradient(180deg, #c4653560, #c4653530)` : 'transparent',
                    border: `1px solid ${selected.length === 2 ? '#c46535' : PALETTE.panelBorder}`,
                    color: selected.length === 2 ? '#fff' : PALETTE.textDim,
                  }}>🔨 단련 실행</button>
                <button onClick={onLeave} className="w-full mt-2 py-2 text-[11px] tracking-[0.2em]" style={{
                  background: 'transparent',
                  border: `1px solid ${PALETTE.panelBorder}`,
                  color: PALETTE.textDim,
                }}>떠난다 (희생 X)</button>
              </>
            )}
          </>
        )}
      </div>
      
      {/* 발견한 조합식 모달 */}
      {showRecipes && (
        <div 
          className="absolute inset-0 flex items-center justify-center px-4 z-50" 
          style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={() => setShowRecipes(false)}
        >
          <div 
            className="w-full max-w-sm max-h-[85vh] flex flex-col" 
            style={{
              background: PALETTE.panel,
              border: `2px solid #c46535`,
              boxShadow: `0 0 30px #c4653560`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid #c4653540` }}>
              <div>
                <div className="text-[10px] tracking-[0.2em]" style={{ color: PALETTE.textDim }}>◆ 황혼의 대장간</div>
                <div className="text-base font-bold" style={{ color: '#c46535' }}>발견한 조합식</div>
                <div className="text-[10px] mt-0.5" style={{ color: PALETTE.textDim }}>
                  {discoveredRecipes.length}/{FORGE_RECIPES.length} 발견
                </div>
              </div>
              <button 
                onClick={() => setShowRecipes(false)} 
                className="text-lg px-2 py-0.5"
                style={{ color: PALETTE.textDim, background: 'transparent' }}
              >✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
              {FORGE_RECIPES.map((recipe, idx) => {
                const isDiscovered = discoveredRecipes.includes(recipe.result);
                const skillColor = PASSIVE_SKILLS[recipe.result]?.color || PALETTE.textDim;
                return (
                  <div key={idx} className="px-3 py-2" style={{
                    background: isDiscovered ? `${skillColor}15` : `${PALETTE.bgDeep}`,
                    border: `1px solid ${isDiscovered ? skillColor + '60' : PALETTE.panelBorder}`,
                    opacity: isDiscovered ? 1 : 0.5,
                  }}>
                    {isDiscovered ? (
                      <>
                        <div className="flex items-center gap-2 text-[11px]">
                          <span style={{ color: PALETTE.text }}>{recipe.ingredients[0]}</span>
                          <span style={{ color: PALETTE.textDim }}>+</span>
                          <span style={{ color: PALETTE.text }}>{recipe.ingredients[1]}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-[10px]">
                          <span style={{ color: PALETTE.textDim }}>→</span>
                          <span className="font-bold" style={{ color: skillColor }}>★ {recipe.result}</span>
                          <span style={{ color: PALETTE.textDim }}>+1Lv</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-[11px]" style={{ color: PALETTE.textDim }}>
                          ??? + ???
                        </div>
                        <div className="text-[10px] mt-1" style={{ color: PALETTE.textDim }}>
                          → ??? (미발견)
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="px-3 py-2" style={{ borderTop: `1px solid ${PALETTE.panelBorder}` }}>
              <button 
                onClick={() => setShowRecipes(false)} 
                className="w-full py-2 text-[11px] tracking-[0.2em]"
                style={{ 
                  background: 'transparent', 
                  border: `1px solid ${PALETTE.panelBorder}`,
                  color: PALETTE.textDim 
                }}
              >닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =========== 도감 (대장간 조합식) ===========
// 발견된 레시피만 공개, 미발견은 ??? + ??? = ??? 형식
