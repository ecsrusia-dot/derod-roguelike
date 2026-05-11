// ============================================
// components/EventScreen.jsx — 사건 화면 (능력 검정 + 선택지)
// ============================================

import React, { useState } from 'react';
import { PALETTE } from '../utils/helpers.js';
import { ENEMIES, GAME_CONFIG } from '../data.js';

export default function EventScreen({ event, classData, stats, skills = {}, onResolve }) {
  const [stage, setStage] = useState('intro'); // intro | result
  const [resultData, setResultData] = useState(null);

  const handleChoice = (choice) => {
    let result = { text: '', reward: null, penalty: null };
    if (choice.cost) {
      result.text = `${choice.text} 선택...`;
      result.reward = choice.reward;
    } else if (choice.stat) {
      const statValue = stats[choice.stat] || 10;
      const diceMin = GAME_CONFIG.diceRoll.min;
      const diceMax = GAME_CONFIG.diceRoll.max;
      const dice = diceMin + Math.floor(Math.random() * (diceMax - diceMin + 1));
      const total = statValue + dice;
      const success = total >= choice.dc;
      const rollText = `[${choice.stat} 검정] ${statValue} + ${dice}(주사위) = ${total} vs DC ${choice.dc}`;
      if (success) {
        result.text = `${rollText} ... 성공!\n${choice.success.text}`;
        result.reward = choice.success.reward;
      } else {
        result.text = `${rollText} ... 실패\n${choice.fail.text}`;
        result.penalty = choice.fail.penalty;
        result.combat = choice.fail.combat;
      }
    } else {
      result.text = choice.result || choice.text;
      result.reward = choice.reward;
    }
    
    // === skill_random_lv: 어느 패시브가 오를지 미리 결정 (표시용) ===
    if (result.reward?.type === 'skill_random_lv') {
      const ownedSkills = Object.entries(skills).filter(([_, lv]) => lv > 0 && lv < 7);
      if (ownedSkills.length > 0) {
        const [name, curLv] = ownedSkills[Math.floor(Math.random() * ownedSkills.length)];
        result.reward = { ...result.reward, _resolvedSkill: name, _resolvedFrom: curLv, _resolvedTo: curLv + 1 };
      }
    }
    
    setResultData(result);
    setStage('result');
  };

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: PALETTE.bgDeep }}>
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{
        borderColor: PALETTE.panelBorder, background: PALETTE.panel,
      }}>
        <span className="text-[10px] tracking-[0.3em] style={{ color: PALETTE.ice }}">◆ 사건 ◆</span>
        <span className="text-xs font-bold" style={{ color: PALETTE.text }}>{event.title}</span>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4" style={{
        background: `linear-gradient(180deg, ${PALETTE.bgDeep}, #060306)`,
      }}>
        {stage === 'intro' && (
          <div>
            <p className="text-sm leading-relaxed mb-6 italic" style={{ color: PALETTE.text }}>
              {event.text.split('\n').map((line, i) => <span key={i}>{line}<br/></span>)}
            </p>
          </div>
        )}
        {stage === 'result' && resultData && (
          <div>
            <p className="text-sm leading-relaxed mb-6" style={{ color: PALETTE.text }}>
              {resultData.text.split('\n').map((line, i) => <span key={i}>{line}<br/></span>)}
            </p>
            {resultData.reward && (
              <div className="mt-4 p-3" style={{ border: `1px solid ${PALETTE.dawn}60`, background: `${PALETTE.dawn}10` }}>
                <div className="text-[10px] tracking-[0.3em] mb-1" style={{ color: PALETTE.dawn }}>◆ 보상</div>
                <div className="text-xs" style={{ color: PALETTE.text }}>
                  {resultData.reward.type === 'gold' && `◎ 은화 +${resultData.reward.value}`}
                  {resultData.reward.type === 'gem' && `◆ 보석 +${resultData.reward.value}`}
                  {resultData.reward.type === 'heal' && `❤ 체력 ${resultData.reward.value} 회복`}
                  {resultData.reward.type === 'heal_full' && `❤ 체력 완전 회복`}
                  {resultData.reward.type === 'maxhp' && `❤ 최대 체력 +${resultData.reward.value}`}
                  {resultData.reward.type === 'stat' && (
                    <span style={{ color: PALETTE.legendary }}>
                      ★ 능력치 [{resultData.reward.name}] +{resultData.reward.value}
                    </span>
                  )}
                  {resultData.reward.type === 'random_relic' && <span style={{ color: PALETTE.legendary }}>◈ 무작위 유물 1개 획득</span>}
                  {resultData.reward.type === 'skill_random_lv' && (
                    resultData.reward._resolvedSkill ? (
                      <span style={{ color: PALETTE.ice }}>
                        ★ [{resultData.reward._resolvedSkill}] Lv.{resultData.reward._resolvedFrom} → Lv.{resultData.reward._resolvedTo}
                      </span>
                    ) : (
                      <span style={{ color: PALETTE.textDim }}>강화 가능한 패시브 없음 (모두 Lv.7)</span>
                    )
                  )}
                </div>
              </div>
            )}
            {resultData.penalty && (
              <div className="mt-4 p-3" style={{ border: `1px solid ${PALETTE.accent}60`, background: `${PALETTE.accent}10` }}>
                <div className="text-[10px] tracking-[0.3em] mb-1" style={{ color: PALETTE.accent }}>◆ 페널티</div>
                <div className="text-xs space-y-0.5" style={{ color: PALETTE.text }}>
                  {resultData.penalty.hp && <div>❤ 체력 {resultData.penalty.hp > 0 ? '+' : ''}{resultData.penalty.hp}</div>}
                  {resultData.penalty.gold && <div>◎ 은화 {resultData.penalty.gold > 0 ? '+' : ''}{resultData.penalty.gold}</div>}
                  {resultData.penalty.gem && <div>◆ 보석 {resultData.penalty.gem > 0 ? '+' : ''}{resultData.penalty.gem}</div>}
                  {resultData.combat && <div>⚔ 전투 발생</div>}
                </div>
              </div>
            )}
            {/* ★ 이 부분이 문제였을 확률이 높습니다: 괄호 닫기 확인 */}
            {resultData.combat && (
              <div className="mt-4 p-3" style={{ border: `1px solid ${PALETTE.accent}`, background: `${PALETTE.accent}20` }}>
                <div className="text-[10px] tracking-[0.3em] mb-1" style={{ color: PALETTE.accent }}>◆ 전투 발생</div>
                <div className="text-xs" style={{ color: PALETTE.text }}>
                  {ENEMIES[resultData.combat]?.name || '적'}이(가) 나타난다!
                </div>
              </div>
            )} 
          </div>
        )}
      </div>
      <div className="border-t p-3" style={{
        borderColor: PALETTE.panelBorder, background: `linear-gradient(180deg, ${PALETTE.panel}, ${PALETTE.bgDeep})`,
      }}>
        {stage === 'intro' && (
          <div className="space-y-1.5">
            {event.choices.map((c, i) => (
              <button key={i} onClick={() => handleChoice(c)}
                className="w-full text-left px-3 py-2 text-xs transition-all hover:translate-x-1"
                style={{
                  background: c.stat ? `${PALETTE.ice}10` : c.cost ? `${PALETTE.dawn}10` : 'transparent',
                  border: `1px solid ${c.stat ? PALETTE.ice : c.cost ? PALETTE.dawn : PALETTE.panelBorder}40`,
                  color: PALETTE.text,
                }}>
                <div className="flex items-center justify-between">
                  <span>▸ {c.text}</span>
                  {c.stat && <span className="text-[10px]" style={{ color: PALETTE.ice }}>[{c.stat} DC{c.dc}]</span>}
                </div>
              </button>
            ))}
          </div>
        )}
        {stage === 'result' && (
          <button onClick={() => onResolve(resultData)} className="w-full py-2.5 text-xs tracking-[0.3em]" style={{
            background: `linear-gradient(180deg, ${PALETTE.dawn}40, ${PALETTE.dawn}20)`,
            border: `1px solid ${PALETTE.dawn}`, color: PALETTE.text,
          }}>▸ 여정을 계속한다</button>
        )}
      </div>
    </div>
  );
}

// =========== 야영 화면 ===========
