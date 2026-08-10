// ============================================
// components/GambleScreen.jsx — 황혼의 도박장 (1.85.0~, PM 확정)
// ============================================
// GambleLobbyScreen (default): 입장(일일 3회) / 결과 배너 / 천장 조각 / 전용 상점 / 규칙
// GambleChoiceScreen: 승리 후 [챙기기 vs 더블 업] 선택 (전멸 시 판돈 소멸)
// ============================================

import React from 'react';
import { PALETTE } from '../utils/helpers.js';
import { GAMBLE_CONFIG, GAMBLE_SHOP, TWILIGHT_COIN, FATE_SHARD, RAID_STONE, RAID_ESSENCE } from '../data.js';
import { getGambleUsed } from '../storage.js';
import { getKstDateKey } from '../utils/dailyChallenge.js';
import { ScreenHeader, GlassPanel, Chip, UIButton } from './ui/CommonUI.jsx';

const GOLD = '#e8b04a';

export default function GambleLobbyScreen({ meta, result = null, onEnter, onBuy, onRedeem, onBack }) {
  const coins = meta?.twilightCoins || 0;
  const shards = meta?.fateShards || 0;
  const used = getGambleUsed(meta, getKstDateKey());
  const remaining = Math.max(0, GAMBLE_CONFIG.dailyLimit - used);
  const canRedeem = shards >= GAMBLE_CONFIG.shardPity;

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
              return (
                <div key={item.id} className="flex items-center justify-between px-2.5 py-2" style={{
                  borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--ui-line)',
                }}>
                  <div className="min-w-0">
                    <div style={{ fontSize: 11.5, color: PALETTE.text }}>
                      {item.grant?.stones ? RAID_STONE.icon : item.grant?.essence ? RAID_ESSENCE.icon : '✦'} {item.name}
                    </div>
                    <div style={{ fontSize: 9.5, color: PALETTE.textDim }}>{item.desc}</div>
                  </div>
                  <button onClick={() => afford && onBuy(item)} disabled={!afford} className="ui-press flex-none ml-2 tabular-nums" style={{
                    fontSize: 10.5, fontWeight: 700, padding: '5px 10px', borderRadius: 999,
                    background: afford ? 'rgba(232,176,74,0.16)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${afford ? `${GOLD}88` : 'var(--ui-line)'}`,
                    color: afford ? GOLD : PALETTE.textDim, opacity: afford ? 1 : 0.6,
                  }}>{TWILIGHT_COIN.icon}{item.cost}</button>
                </div>
              );
            })}
          </div>
        </GlassPanel>
      </div>
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
