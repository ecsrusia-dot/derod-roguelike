// ============================================
// components/EventScreen.jsx — 사건 화면 (능력 검정 + 선택지)
// ============================================

import React, { useState, useEffect } from 'react';
import { PALETTE } from '../utils/helpers.js';
import { ENEMIES, GAME_CONFIG } from '../data.js';

export default function EventScreen({ event, classData, stats, skills = {}, gold = 0, gem = 0, autoPlay = false, onResolve }) {
  const [stage, setStage] = useState('intro'); // intro | result
  const [resultData, setResultData] = useState(null);

  const handleChoice = (choice) => {
    let result = { text: '', reward: null, penalty: null };
    if (choice.cost) {
      result.text = choice.result || `${choice.text} 선택...`;
      result.reward = choice.reward;
      // 1.70.0 픽스 — cost가 실제로 차감되지 않던 버그: penalty로 변환해 정산
      const costPenalty = {};
      if (choice.cost.gold) costPenalty.gold = -choice.cost.gold;
      if (choice.cost.gem) costPenalty.gem = -choice.cost.gem;
      if (choice.cost.hp) costPenalty.hp = -choice.cost.hp;
      if (Object.keys(costPenalty).length > 0) result.penalty = costPenalty;
      result.chain = choice.chain || null;
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
        result.chain = choice.success.chain || null;
      } else {
        result.text = `${rollText} ... 실패\n${choice.fail.text}`;
        result.penalty = choice.fail.penalty;
        result.combat = choice.fail.combat;
        result.chain = choice.fail.chain || null;
      }
    } else {
      result.text = choice.result || choice.text;
      result.reward = choice.reward;
      result.penalty = choice.penalty || null;
      result.chain = choice.chain || null;
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

  // 1.72.0~ 자동 사냥 — 안전 선택지 자동 선택 + 결과 자동 확인
  // 안전 우선순위: 검정·전투·페널티·비용 없음 > 검정·전투 없음 > 첫 번째 (잔액 부족 선택지는 제외)
  useEffect(() => {
    if (!autoPlay) return;
    if (stage === 'intro') {
      const t = setTimeout(() => {
        const affordable = event.choices.filter(c => !(c.cost && (((c.cost.gold || 0) > gold) || ((c.cost.gem || 0) > gem))));
        const pool = affordable.length > 0 ? affordable : event.choices;
        const safe =
          pool.find(c => !c.stat && !c.combat && !c.penalty && !c.cost) ||
          pool.find(c => !c.stat && !c.combat) ||
          pool[0];
        if (safe) handleChoice(safe);
      }, 900);
      return () => clearTimeout(t);
    }
    if (stage === 'result' && resultData) {
      const t = setTimeout(() => onResolve(resultData), 1100);
      return () => clearTimeout(t);
    }
  }, [autoPlay, stage]);

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
            {/* 1.70.0 연쇄 이벤트 예고 */}
            {resultData.chain && (
              <div className="mt-4 p-3" style={{ borderRadius: 12, border: `1px solid ${PALETTE.twilight}80`, background: `${PALETTE.twilight}12` }}>
                <div className="text-[10px] tracking-[0.3em] mb-1" style={{ color: '#8a76c9' }}>◆ 인연</div>
                <div className="text-xs italic" style={{ color: PALETTE.text }}>이 선택은 언젠가 그대에게 되돌아온다...</div>
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
            {event.choices.map((c, i) => {
              // 1.70.0 — 비용 선택지: 잔액 부족 시 비활성 (cost 실차감 픽스와 세트)
              const unaffordable = !!(c.cost && (((c.cost.gold || 0) > gold) || ((c.cost.gem || 0) > gem)));
              return (
                <button key={i} onClick={() => handleChoice(c)} disabled={unaffordable}
                  className="w-full text-left px-3 py-2 text-xs transition-all hover:translate-x-1"
                  style={{
                    background: c.stat ? `${PALETTE.ice}10` : c.cost ? `${PALETTE.dawn}10` : 'transparent',
                    border: `1px solid ${c.stat ? PALETTE.ice : c.cost ? PALETTE.dawn : PALETTE.panelBorder}40`,
                    color: PALETTE.text,
                    opacity: unaffordable ? 0.45 : 1,
                  }}>
                  <div className="flex items-center justify-between">
                    <span>▸ {c.text}</span>
                    {c.stat && <span className="text-[10px]" style={{ color: PALETTE.ice }}>[{c.stat} DC{c.dc}]</span>}
                    {c.cost?.gold > 0 && <span className="text-[10px] tabular-nums" style={{ color: unaffordable ? PALETTE.accent : PALETTE.dawn }}>◉ {c.cost.gold}</span>}
                    {c.cost?.gem > 0 && <span className="text-[10px] tabular-nums" style={{ color: unaffordable ? PALETTE.accent : PALETTE.ice }}>◆ {c.cost.gem}</span>}
                  </div>
                </button>
              );
            })}
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
