// ============================================
// components/GambleScreen.jsx — 황혼의 도박장 (1.85.0~, PM 확정)
// ============================================
// GambleLobbyScreen (default): 입장(일일 3회) / 결과 배너 / 천장 조각 / 전용 상점 / 규칙
// GambleChoiceScreen: 승리 후 [챙기기 vs 더블 업] 선택 (전멸 시 판돈 소멸)
// ============================================

import React, { useState } from 'react';
import { PALETTE } from '../utils/helpers.js';
import { GAMBLE_CONFIG, GAMBLE_SHOP, TWILIGHT_COIN, FATE_SHARD, RAID_STONE, RAID_ESSENCE, CLASSES, ENGRAVINGS } from '../data.js';
import { getGambleUsed, getUnlockedSlotCount } from '../storage.js';
import { getKstDateKey } from '../utils/dailyChallenge.js';
import { ScreenHeader, GlassPanel, Chip, UIButton } from './ui/CommonUI.jsx';

// 각인 카드 id → 카드 객체
function findEngravingCard(classId, cardId) {
  return (ENGRAVINGS[classId] || []).find(c => c.id === cardId) || null;
}

const GOLD = '#e8b04a';

export default function GambleLobbyScreen({ meta, result = null, onEnter, onBuy, onBuyLegendary = null, onRedeem, onBack }) {
  const coins = meta?.twilightCoins || 0;
  const shards = meta?.fateShards || 0;
  const used = getGambleUsed(meta, getKstDateKey());
  const remaining = Math.max(0, GAMBLE_CONFIG.dailyLimit - used);
  const canRedeem = shards >= GAMBLE_CONFIG.shardPity;
  // 1.86.0~ 레전더리 각인 확정권 피커 — { item, step: 'class' } → { item, step: 'slot', classId }
  const [legendaryPick, setLegendaryPick] = useState(null);
  const [legendaryResult, setLegendaryResult] = useState(null); // { className, cardName }

  const handleLegendaryConfirm = (classId, slotIdx) => {
    const pool = (ENGRAVINGS[classId] || []).filter(c => c.tier === 'L');
    if (pool.length === 0 || !legendaryPick) return;
    const card = pool[Math.floor(Math.random() * pool.length)];
    onBuyLegendary?.(legendaryPick.item, classId, slotIdx, card.id);
    setLegendaryResult({ className: CLASSES.find(c => c.id === classId)?.name || classId, cardName: card.name });
    setLegendaryPick(null);
  };

  return (
    <div className="absolute inset-0 flex flex-col" style={{
      background: `radial-gradient(120% 42% at 50% -10%, rgba(232,176,74,0.16), transparent), ${PALETTE.bg}`,
    }}>
      <ScreenHeader title="황혼의 도박장" onBack={onBack} right={
        <div className="flex gap-1.5">
          <Chip color={GOLD} style={{ height: 22 }}>{TWILIGHT_COIN.icon} <span className="tabular-nums">{coins}</span></Chip>
          <Chip color={PALETTE.ice} style={{ height: 22 }}>{FATE_SHARD.icon} <span className="tabular-nums">{shards}</span></Chip>
        </div>
      } />
      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-2.5" style={{ minHeight: 0 }}>

        {/* 직전 런 결과 배너 */}
        {result && (
          <div className="text-center px-3 py-2.5" style={{
            borderRadius: 12,
            background: result.kind === 'defeat' ? 'rgba(196,69,61,0.12)' : 'rgba(232,176,74,0.14)',
            border: `1.5px solid ${result.kind === 'defeat' ? '#c4453d' : GOLD}`,
          }}>
            <div className="font-bold" style={{ fontSize: 12, color: result.kind === 'defeat' ? '#e08a84' : GOLD }}>
              {result.kind === 'defeat' ? '☠ 전멸 — 판돈 소멸' : result.kind === 'clear' ? '👑 3연전 완주!' : '💰 챙기고 나왔다'}
            </div>
            <div className="tabular-nums mt-1" style={{ fontSize: 11, color: PALETTE.text }}>
              {result.coins > 0 && <>획득 {TWILIGHT_COIN.icon} <b style={{ color: GOLD }}>+{result.coins}</b></>}
              {result.jackpot && <span style={{ color: GOLD, fontWeight: 700 }}> · ✦ 잭팟 +{GAMBLE_CONFIG.jackpotCoins}!</span>}
              {result.shard && <span style={{ color: PALETTE.ice }}> · {FATE_SHARD.icon} 조각 +1</span>}
            </div>
          </div>
        )}

        {/* 입장 */}
        <GlassPanel style={{ borderRadius: 14, padding: '12px 14px' }}>
          <div className="flex items-baseline justify-between mb-1">
            <span className="font-bold" style={{ fontSize: 13, color: PALETTE.text }}>🎲 3연전 승부</span>
            <span className="tabular-nums" style={{ fontSize: 10.5, color: remaining > 0 ? PALETTE.green : '#e08a84' }}>
              오늘 남은 입장 {remaining}/{GAMBLE_CONFIG.dailyLimit}
            </span>
          </div>
          <div style={{ fontSize: 10.5, color: PALETTE.textDim, lineHeight: 1.6 }}>
            일반 → 강적 → 보스 3연전 (기존 적 랜덤). 승리마다 판돈 ×2 ({TWILIGHT_COIN.icon}{GAMBLE_CONFIG.potBase} → {GAMBLE_CONFIG.potBase * 2} → {GAMBLE_CONFIG.potBase * 4}).{'\n'}
            매 승리 후 <b style={{ color: GOLD }}>[챙기기]</b> 또는 <b style={{ color: GOLD }}>[더블 업]</b> — <b style={{ color: '#e08a84' }}>패배하면 판돈 전부 소멸</b>.{'\n'}
            승리마다 <b style={{ color: GOLD }}>{GAMBLE_CONFIG.jackpotChance * 100}%</b> 확률로 황혼의 균열 — 잭팟 {TWILIGHT_COIN.icon}<b style={{ color: GOLD }}>{GAMBLE_CONFIG.jackpotCoins}</b> 즉시 확정.
          </div>
          <UIButton variant="gold" onClick={onEnter} disabled={remaining <= 0} style={{ width: '100%', marginTop: 10 }}>
            {remaining > 0 ? '▸ 입장 — 직업 선택' : '오늘 입장 소진 (자정 KST 리셋)'}
          </UIButton>
        </GlassPanel>

        {/* 천장 — 운명의 조각 */}
        <GlassPanel style={{ borderRadius: 14, padding: '12px 14px' }}>
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="font-bold" style={{ fontSize: 12, color: PALETTE.ice }}>{FATE_SHARD.icon} 운명의 조각 (천장)</span>
            <span className="tabular-nums" style={{ fontSize: 11, color: PALETTE.text }}>{shards} / {GAMBLE_CONFIG.shardPity}</span>
          </div>
          <div style={{ height: 7, borderRadius: 999, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(100, (shards / GAMBLE_CONFIG.shardPity) * 100)}%`, borderRadius: 999, background: `linear-gradient(90deg, ${PALETTE.ice}88, ${PALETTE.ice})` }} />
          </div>
          <div style={{ fontSize: 9.5, color: PALETTE.textDim, marginTop: 5 }}>
            잭팟 없이 런이 끝나면 +1. {GAMBLE_CONFIG.shardPity}개 = {TWILIGHT_COIN.icon}{GAMBLE_CONFIG.shardPityCoins} 확정 교환
          </div>
          {canRedeem && (
            <UIButton variant="primary" onClick={onRedeem} style={{ width: '100%', marginTop: 8 }}>
              {FATE_SHARD.icon}{GAMBLE_CONFIG.shardPity} → {TWILIGHT_COIN.icon}{GAMBLE_CONFIG.shardPityCoins} 교환
            </UIButton>
          )}
        </GlassPanel>

        {/* 전용 상점 */}
        <GlassPanel style={{ borderRadius: 14, padding: '12px 14px' }}>
          <div className="font-bold mb-2" style={{ fontSize: 12, color: GOLD }}>❂ 황혼 상점</div>
          <div className="flex flex-col gap-1.5">
            {GAMBLE_SHOP.map(item => {
              const afford = coins >= item.cost;
              const isLegendary = !!item.grant?.legendaryEngraving;
              const handleTap = () => {
                if (!afford) return;
                if (isLegendary) setLegendaryPick({ item, step: 'class' });
                else onBuy(item);
              };
              return (
                <div key={item.id} className="flex items-center justify-between px-2.5 py-2" style={{
                  borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: `1px solid ${isLegendary ? `${GOLD}55` : 'var(--ui-line)'}`,
                }}>
                  <div className="min-w-0">
                    <div style={{ fontSize: 11.5, color: isLegendary ? GOLD : PALETTE.text }}>
                      {item.grant?.secretReset ? '✦' : isLegendary ? '◈' : '✦'} {item.name}
                    </div>
                    <div style={{ fontSize: 9.5, color: PALETTE.textDim }}>{item.desc}</div>
                  </div>
                  <button onClick={handleTap} disabled={!afford} className="ui-press flex-none ml-2 tabular-nums" style={{
                    fontSize: 10.5, fontWeight: 700, padding: '5px 10px', borderRadius: 999,
                    background: afford ? 'rgba(232,176,74,0.16)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${afford ? `${GOLD}88` : 'var(--ui-line)'}`,
                    color: afford ? GOLD : PALETTE.textDim, opacity: afford ? 1 : 0.6,
                  }}>{TWILIGHT_COIN.icon}{item.cost}</button>
                </div>
              );
            })}
          </div>
          {legendaryResult && (
            <div className="mt-2 px-3 py-2 text-center" style={{
              borderRadius: 10, background: 'rgba(232,176,74,0.14)', border: `1.5px solid ${GOLD}`,
            }}>
              <span style={{ fontSize: 10.5, color: GOLD, fontWeight: 700 }}>
                ◈ [{legendaryResult.className}] 전설 각인 「{legendaryResult.cardName}」 장착 완료!
              </span>
            </div>
          )}
        </GlassPanel>
      </div>

      {/* 레전더리 확정권 — 직업 → 슬롯 2단 피커 */}
      {legendaryPick && (
        <div className="absolute inset-0 flex items-center justify-center px-5" style={{ zIndex: 60, background: 'rgba(0,0,0,0.85)' }} onClick={() => setLegendaryPick(null)}>
          <div className="w-full max-w-sm px-4 py-4" onClick={(e) => e.stopPropagation()} style={{
            background: PALETTE.panel, borderRadius: 16, border: `2px solid ${GOLD}`, boxShadow: `0 0 30px ${GOLD}50`,
          }}>
            <div className="text-center font-bold mb-1" style={{ fontSize: 13, color: GOLD }}>◈ 레전더리 각인 확정권</div>
            {legendaryPick.step === 'class' ? (
              <>
                <div className="text-center mb-2.5" style={{ fontSize: 10, color: PALETTE.textDim }}>어느 직업의 각인에 사용할까요?</div>
                <div className="flex flex-col gap-1.5">
                  {CLASSES.map(cls => {
                    const legendCount = (ENGRAVINGS[cls.id] || []).filter(c => c.tier === 'L').length;
                    const slotsOpen = getUnlockedSlotCount(meta?.engravings?.[cls.id]?.lv || 1);
                    const usable = legendCount > 0 && slotsOpen > 0;
                    return (
                      <button key={cls.id} disabled={!usable} onClick={() => setLegendaryPick({ ...legendaryPick, step: 'slot', classId: cls.id })}
                        className="ui-press flex items-center justify-between px-3 py-2.5" style={{
                          borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--ui-line)',
                          color: PALETTE.text, opacity: usable ? 1 : 0.4, fontSize: 12,
                        }}>
                        <span>{cls.name}</span>
                        <span style={{ fontSize: 9.5, color: PALETTE.textDim }}>
                          {slotsOpen === 0 ? '슬롯 잠김 (각성도 Lv.2 필요)' : `전설 풀 ${legendCount}종 · 슬롯 ${slotsOpen}칸`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <div className="text-center mb-2.5" style={{ fontSize: 10, color: PALETTE.textDim }}>
                  {CLASSES.find(c => c.id === legendaryPick.classId)?.name} — 어느 슬롯에 장착할까요? (기존 카드는 덮어씀)
                </div>
                <div className="flex flex-col gap-1.5">
                  {[0, 1, 2].map(slotIdx => {
                    const slotsOpen = getUnlockedSlotCount(meta?.engravings?.[legendaryPick.classId]?.lv || 1);
                    const locked = slotIdx >= slotsOpen;
                    const curId = meta?.engravings?.[legendaryPick.classId]?.slots?.[slotIdx] || null;
                    const cur = curId ? findEngravingCard(legendaryPick.classId, curId) : null;
                    return (
                      <button key={slotIdx} disabled={locked} onClick={() => handleLegendaryConfirm(legendaryPick.classId, slotIdx)}
                        className="ui-press flex items-center justify-between px-3 py-2.5" style={{
                          borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--ui-line)',
                          color: PALETTE.text, opacity: locked ? 0.4 : 1, fontSize: 12,
                        }}>
                        <span>슬롯 {slotIdx + 1}</span>
                        <span style={{ fontSize: 9.5, color: locked ? PALETTE.textDim : cur ? PALETTE.legendary : PALETTE.green }}>
                          {locked ? '🔒 각성도 잠김' : cur ? `현재: ${cur.name} (덮어씀)` : '빈 슬롯'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            <button onClick={() => setLegendaryPick(null)} className="ui-press w-full mt-3" style={{
              height: 38, borderRadius: 'var(--r-btn)', fontSize: 11,
              background: 'rgba(255,255,255,0.05)', border: '1px solid var(--ui-line)', color: PALETTE.textDim,
            }}>취소</button>
          </div>
        </div>
      )}
    </div>
  );
}

// 승리 후 선택 — 챙기기 vs 더블 업
export function GambleChoiceScreen({ pot, jackpot = false, onContinue, onBank }) {
  const wins = pot > 0 ? Math.round(Math.log2(pot / GAMBLE_CONFIG.potBase)) + 1 : 0;
  const nextPot = pot * 2;
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-6" style={{
      background: `radial-gradient(100% 60% at 50% 0%, rgba(232,176,74,0.18), transparent), ${PALETTE.bgDeep}`,
    }}>
      <div className="tracking-[0.35em] mb-2" style={{ fontSize: 10, color: PALETTE.textDim }}>━ TWILIGHT GAMBLE ━</div>
      <div className="font-bold" style={{ fontSize: 22, color: GOLD, fontFamily: '"Cinzel", serif', textShadow: `0 0 24px ${GOLD}80` }}>
        {wins}연승
      </div>
      <div className="tabular-nums mt-2 mb-1" style={{ fontSize: 14, color: PALETTE.text }}>
        현재 판돈 <b style={{ color: GOLD }}>{TWILIGHT_COIN.icon}{pot}</b>
      </div>
      {jackpot && (
        <div className="mt-1 px-3 py-1.5" style={{
          borderRadius: 999, fontSize: 11, fontWeight: 700, color: GOLD,
          background: 'rgba(232,176,74,0.16)', border: `1.5px solid ${GOLD}`,
          boxShadow: `0 0 18px ${GOLD}66`,
        }}>✦ 잭팟! {TWILIGHT_COIN.icon}{GAMBLE_CONFIG.jackpotCoins} 이미 확정 지급</div>
      )}
      <div className="text-center mt-4 mb-5" style={{ fontSize: 10.5, color: PALETTE.textDim, lineHeight: 1.7 }}>
        더블 업하면 다음 승리 시 판돈 <b style={{ color: GOLD }}>{TWILIGHT_COIN.icon}{nextPot}</b>{'\n'}
        <b style={{ color: '#e08a84' }}>패배하면 판돈 전부 소멸</b>
      </div>
      <div className="flex flex-col gap-2 w-full max-w-xs">
        <button onClick={onContinue} className="ui-press ui-sheen w-full" style={{
          height: 46, borderRadius: 'var(--r-btn)', fontSize: 13, fontWeight: 700, letterSpacing: '0.15em',
          background: 'linear-gradient(160deg, rgba(232,176,74,0.4), rgba(232,176,74,0.16))',
          border: `1px solid ${GOLD}`, color: '#ffe9d2',
          boxShadow: `0 4px 20px -6px ${GOLD}99`,
        }}>🎲 더블 업 — 다음 상대</button>
        <button onClick={onBank} className="ui-press w-full" style={{
          height: 42, borderRadius: 'var(--r-btn)', fontSize: 12,
          background: 'rgba(255,255,255,0.05)', border: '1px solid var(--ui-line)', color: PALETTE.text,
        }}>💰 {TWILIGHT_COIN.icon}{pot} 챙기고 나가기</button>
      </div>
    </div>
  );
}
