// ============================================
// components/RaidScreen.jsx — 레이드 로비 (1.74.0~, 던파 모티브)
// ============================================
// 본편과 분리된 별개 게임 축:
//   - 5직업 파티 카드 (역할·전투력·레이드 스킬)
//   - 직업 탭 → 장비 3부위 관리 (장착/일괄 장착)
//   - 던전 2종 입장 (파밍 던전 → 레이드 보스)
// ============================================

import React, { useState } from 'react';
import { Swords, Shield, Heart, ChevronRight } from 'lucide-react';
import { PALETTE } from '../utils/helpers.js';
import {
  RAID_CLASSES, RAID_SKILLS, RAID_SLOTS, RAID_SLOT_NAMES, RAID_RARITIES,
  RAID_DUNGEONS, RAID_REGIONS, getRaidMemberStats, getRaidPartyPower, CLASSES,
  RAID_STONE, RAID_ENHANCE, RAID_DISMANTLE_VALUES, getRaidItemEffective, getKstWeekKey,
  RAID_ESSENCE, RAID_CRAFT_RECIPES, RAID_GACHA, RAID_EPIC_UNIQUES, RAID_SECRET_SKILLS, getDungeonSecret, RAID_SET_BONUSES,
} from '../data.js';
import { hasRaidWeeklyClaimed } from '../storage.js';
import { ScreenHeader, GlassPanel, Chip, UIButton } from './ui/CommonUI.jsx';

const ROLE_ICONS = { tank: Shield, dealer: Swords, healer: Heart };
const ROLE_COLORS = { tank: '#7ba3c4', dealer: '#c4453d', healer: '#9ad4a3' };
const SLOT_GLYPHS = { weapon: '⚔', armor: '🛡', accessory: '◆' };
const ROOM_KIND_GLYPHS = { mobs: '☠', named: '♜', boss: '♛' };

// 세트 보너스 수치 → "공+12% · HP+12%" 표기
function setBonusText(b) {
  if (!b) return '';
  return [b.atkPct ? `공격 +${b.atkPct}%` : null, b.hpPct ? `HP +${b.hpPct}%` : null].filter(Boolean).join(' · ');
}

// 직업 일러 초상 — 이미지 실패 시 이니셜 폴백
function ClassPortrait({ cls, roleColor, size = 42 }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="relative flex-none overflow-hidden" style={{
      width: size, height: size, borderRadius: 13, display: 'block',
      border: `2px solid ${roleColor}88`,
      boxShadow: `0 0 10px ${roleColor}44`,
      background: `linear-gradient(160deg, ${roleColor}30, rgba(0,0,0,0.4))`,
    }}>
      {cls?.image && !failed ? (
        <img src={cls.image} alt={cls?.name} onError={() => setFailed(true)}
          className="w-full h-full object-cover" style={{ objectPosition: 'center 18%' }} />
      ) : (
        <span className="w-full h-full flex items-center justify-center font-bold" style={{ fontSize: 15, color: roleColor }}>
          {(cls?.name || '?')[0]}
        </span>
      )}
    </span>
  );
}

// 장비 1개 카드 — 강화 단계·실효 스탯 표시 + 장착/분해 버튼
function GearChip({ item, onEquip, onDismantle }) {
  if (!item) return null;
  const rar = RAID_RARITIES[item.rarity];
  const eff = getRaidItemEffective(item);
  const enh = item.enh || 0;
  return (
    <div className="flex items-center justify-between px-2.5 py-2" style={{
      borderRadius: 10, background: `${rar.color}12`, border: `1px solid ${rar.color}66`,
    }}>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span style={{ fontSize: 9, fontWeight: 700, color: rar.color }}>[{rar.name}]</span>
          <span className="truncate" style={{ fontSize: 11.5, color: PALETTE.text }}>
            {item.name}{enh > 0 && <span style={{ color: PALETTE.legendary, fontWeight: 700 }}> +{enh}</span>}
          </span>
        </div>
        <div className="tabular-nums" style={{ fontSize: 9.5, color: PALETTE.textDim }}>
          {eff.atk > 0 && `공격 +${eff.atk}`}{eff.atk > 0 && eff.hp > 0 && ' · '}{eff.hp > 0 && `HP +${eff.hp}`}
          {' · '}전투력 {eff.power}
        </div>
        {item.series && RAID_SET_BONUSES[item.series] && (
          <div style={{ fontSize: 9, color: PALETTE.textDim, marginTop: 1 }}>
            ◈ {item.series} 세트 (3부위 장착 시): {setBonusText(RAID_SET_BONUSES[item.series])}
          </div>
        )}
        {item.rarity === 'EP' && RAID_EPIC_UNIQUES[item.classId] && (
          <div style={{ fontSize: 9, color: rar.color, marginTop: 1 }}>
            ◆ 고유: {RAID_EPIC_UNIQUES[item.classId].name} — {RAID_EPIC_UNIQUES[item.classId].desc}
          </div>
        )}
      </div>
      <div className="flex flex-none gap-1 ml-2">
        {onDismantle && (
          <button onClick={onDismantle} className="ui-press" style={{
            fontSize: 10, padding: '4px 8px', borderRadius: 999,
            background: 'rgba(255,255,255,0.05)', border: '1px solid var(--ui-line)', color: PALETTE.textDim,
          }}>분해 {RAID_STONE.icon}{RAID_DISMANTLE_VALUES[item.rarity]}</button>
        )}
        {onEquip && (
          <button onClick={onEquip} className="ui-press" style={{
            fontSize: 10, padding: '4px 10px', borderRadius: 999,
            background: 'rgba(232,176,74,0.16)', border: `1px solid ${PALETTE.legendary}88`, color: PALETTE.legendary,
          }}>장착</button>
        )}
      </div>
    </div>
  );
}

export default function RaidScreen({ meta, onEnterDungeon, onEquipItem, onAutoEquip, onDismantle = null, onDismantleJunk = null, onEnhance = null, onCraft = null, onGacha = null, onBack }) {
  const raid = meta?.raid || { inventory: [], equipped: {}, clears: {}, stones: 0, essence: 0 };
  const [gearClass, setGearClass] = useState(null); // 장비 관리 중인 직업 ID | null
  // 1.76.0~ 제작·가챠 결과 배너
  const [lastResult, setLastResult] = useState(null); // { source: '제작'|'가챠', item }
  const partyPower = getRaidPartyPower(raid);
  const stones = raid.stones || 0;
  const essence = raid.essence || 0;
  const weekKey = getKstWeekKey();

  const classMeta = (classId) => CLASSES.find(c => c.id === classId);

  return (
    <div className="absolute inset-0 flex flex-col" style={{
      background: `radial-gradient(120% 42% at 50% -10%, #8b1f1f2e, transparent), ${PALETTE.bg}`,
    }}>
      <div className="pt-2">
        <ScreenHeader
          title="레이드"
          onBack={onBack}
          right={
            <span className="flex gap-1.5">
              <Chip color={PALETTE.ice} icon={<span>{RAID_STONE.icon}</span>}><span className="tabular-nums">{stones}</span></Chip>
              <Chip color={PALETTE.legendary} icon={<span>{RAID_ESSENCE.icon}</span>}><span className="tabular-nums">{essence}</span></Chip>
              <Chip color={PALETTE.legendary} icon={<span>⚔</span>}><span className="tabular-nums">{partyPower}</span></Chip>
            </span>
          }
        />
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {/* ===== 활성 비전 (기연) — 1개만 유지 가능 ===== */}
        {(() => {
          const activeSk = RAID_SECRET_SKILLS[raid.secretSkill] || null;
          return (
            <div className="mt-1 px-3 py-2 flex items-center gap-2" style={{
              borderRadius: 12,
              background: activeSk ? 'rgba(232,176,74,0.1)' : 'rgba(255,255,255,0.025)',
              border: `1px solid ${activeSk ? 'rgba(232,176,74,0.5)' : 'var(--ui-line)'}`,
            }}>
              <span style={{ fontSize: 14 }}>✦</span>
              {activeSk ? (
                <span style={{ fontSize: 10.5, color: PALETTE.text }}>
                  <span style={{ fontWeight: 700, color: PALETTE.legendary }}>활성 비전 — {activeSk.name}</span>
                  <span style={{ color: PALETTE.textDim }}> · {activeSk.desc}</span>
                </span>
              ) : (
                <span style={{ fontSize: 10.5, color: PALETTE.textDim }}>활성 비전 없음 — 던전마다 다른 기연(奇緣)이 0.5% 확률로 기다립니다 (1개만 유지 가능)</span>
              )}
            </div>
          );
        })()}

        {/* ===== 파티 (5직업 고정) ===== */}
        <div className="mt-1 mb-2 flex items-center gap-2.5">
          <span className="tracking-[0.25em] flex-none" style={{ fontSize: 11, color: PALETTE.dawn }}>원정대 — 5인 파티</span>
          <span className="flex-1 h-px" style={{ background: 'var(--ui-line)' }} />
          <span style={{ fontSize: 10.5, color: PALETTE.textDim }}>전투력 <span className="tabular-nums" style={{ color: PALETTE.legendary }}>{partyPower}</span></span>
        </div>
        <div className="ui-stagger flex flex-col gap-1.5">
          {Object.keys(RAID_CLASSES).map(classId => {
            const stats = getRaidMemberStats(classId, raid.equipped?.[classId]);
            const cls = classMeta(classId);
            const RoleIcon = ROLE_ICONS[stats.role];
            const roleColor = ROLE_COLORS[stats.role];
            const open = gearClass === classId;
            const equippedCount = RAID_SLOTS.filter(s => raid.equipped?.[classId]?.[s]).length;
            const invForClass = raid.inventory.filter(i => i.classId === classId);
            return (
              <GlassPanel key={classId} style={{ borderRadius: 13, padding: '9px 12px' }}>
                <button onClick={() => setGearClass(open ? null : classId)} className="ui-press w-full text-left" style={{ background: 'transparent', border: 'none', padding: 0 }}>
                  <div className="flex items-center gap-2.5">
                    <ClassPortrait cls={cls} roleColor={roleColor} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold" style={{ fontSize: 12.5, color: PALETTE.text }}>{cls?.name || classId}</span>
                        <Chip color={roleColor} style={{ height: 17 }}>{stats.roleName}</Chip>
                        {stats.setBonus && (
                          <Chip color={PALETTE.legendary} style={{ height: 17 }}>
                            ◈ {stats.setBonus.name}{stats.setBonus.atkPct ? ` 공+${stats.setBonus.atkPct}%` : ''}{stats.setBonus.hpPct ? ` HP+${stats.setBonus.hpPct}%` : ''}
                          </Chip>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="tabular-nums" style={{ fontSize: 10, color: PALETTE.textDim }}>
                          HP {stats.hp} · 공격 {stats.atk}{stats.heal ? ` · 치유 ${stats.heal}` : ''}
                        </span>
                        {/* 장비 슬롯 한눈 타일 — 등급색 + 강화 표시 */}
                        <span className="flex gap-1 ml-1">
                          {RAID_SLOTS.map(slot => {
                            const it = raid.equipped?.[classId]?.[slot];
                            const rc = it ? RAID_RARITIES[it.rarity]?.color : null;
                            return (
                              <span key={slot} className="flex items-center justify-center" style={{
                                width: 17, height: 17, borderRadius: 5, fontSize: 9,
                                background: rc ? `${rc}28` : 'rgba(255,255,255,0.04)',
                                border: `1px solid ${rc ? `${rc}aa` : 'var(--ui-line)'}`,
                                color: rc || PALETTE.textDim,
                                boxShadow: rc && (it.enh || 0) >= 5 ? `0 0 6px ${rc}88` : 'none',
                                opacity: rc ? 1 : 0.5,
                              }}>{SLOT_GLYPHS[slot]}</span>
                            );
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-none">
                      <div className="tabular-nums font-bold" style={{ fontSize: 13, color: PALETTE.legendary }}>{stats.power}</div>
                      <div style={{ fontSize: 8.5, color: PALETTE.textDim, letterSpacing: '0.1em' }}>POWER</div>
                    </div>
                    <ChevronRight size={14} className="flex-none" style={{ color: PALETTE.textDim, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                  </div>
                </button>

                {/* 펼침 — 레이드 스킬 + 장비 3부위 + 이 직업 인벤토리 */}
                {open && (
                  <div className="mt-2.5 pt-2.5" style={{ borderTop: '1px solid var(--ui-line)' }}>
                    <div className="px-2.5 py-2 mb-2" style={{ borderRadius: 10, background: 'rgba(232,176,74,0.07)', border: '1px solid rgba(232,176,74,0.3)' }}>
                      {(RAID_SKILLS[classId] || []).map((sk, i) => (
                        <div key={sk.name} style={{ marginTop: i > 0 ? 5 : 0 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: PALETTE.legendary }}>★ {sk.name}</span>
                          <div style={{ fontSize: 9.5, color: PALETTE.textDim, marginTop: 1 }}>{sk.desc}</div>
                        </div>
                      ))}
                      {/* 에픽 고유 옵션 — 에픽 장비 1개 이상 장착 시 발동 */}
                      {(() => {
                        const uniq = RAID_EPIC_UNIQUES[classId];
                        const active = RAID_SLOTS.some(slot => raid.equipped?.[classId]?.[slot]?.rarity === 'EP');
                        if (!uniq) return null;
                        return (
                          <div className="mt-1.5 pt-1.5" style={{ borderTop: '1px dashed rgba(232,176,74,0.25)', opacity: active ? 1 : 0.45 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: RAID_RARITIES.EP.color }}>◆ {uniq.name} {active ? '(발동 중)' : '(에픽 장착 시)'}</span>
                            <div style={{ fontSize: 9.5, color: PALETTE.textDim, marginTop: 1 }}>{uniq.desc}</div>
                          </div>
                        );
                      })()}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {RAID_SLOTS.map(slot => {
                        const item = raid.equipped?.[classId]?.[slot];
                        const enh = item?.enh || 0;
                        const maxed = enh >= RAID_ENHANCE.max;
                        const cost = maxed ? 0 : RAID_ENHANCE.costFor(enh);
                        const canEnhance = !maxed && stones >= cost;
                        return (
                          <div key={slot}>
                            <div style={{ fontSize: 9.5, color: PALETTE.textDim, marginBottom: 3 }}>{RAID_SLOT_NAMES[slot]}</div>
                            {item ? (
                              <div>
                                <GearChip item={item} />
                                {onEnhance && (
                                  <button onClick={() => onEnhance(classId, slot)} disabled={!canEnhance}
                                    className="ui-press w-full mt-1 text-center" style={{
                                      padding: '4px 0', borderRadius: 8, fontSize: 9.5, fontWeight: 700,
                                      background: canEnhance ? 'rgba(123,163,196,0.14)' : 'rgba(255,255,255,0.03)',
                                      border: `1px solid ${canEnhance ? `${PALETTE.ice}77` : 'var(--ui-line)'}`,
                                      color: maxed ? PALETTE.green : canEnhance ? PALETTE.ice : PALETTE.textDim,
                                      opacity: maxed ? 0.8 : 1,
                                    }}>
                                    {maxed ? '강화 MAX (+10)' : `강화 +${enh} → +${enh + 1} (성능 +8%) — ${RAID_STONE.icon}${cost}`}
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="px-2.5 py-2" style={{ borderRadius: 10, border: '1px dashed var(--ui-line)', fontSize: 10.5, color: PALETTE.textDim }}>미장착 — 던전에서 파밍</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {/* 1.78.1~ 세트 효과 현황 — PM 피드백: 세트 설명 부재 */}
                    {(() => {
                      const eq = raid.equipped?.[classId] || {};
                      const counts = {};
                      RAID_SLOTS.forEach(slot => {
                        const it = eq[slot];
                        if (it?.series) counts[it.series] = (counts[it.series] || 0) + 1;
                      });
                      const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
                      return (
                        <div className="mt-2 px-2.5 py-2" style={{ borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--ui-line)' }}>
                          <div style={{ fontSize: 9.5, fontWeight: 700, color: PALETTE.dawn }}>◈ 세트 효과 — 같은 시리즈(접두어) 3부위 장착 시 발동</div>
                          {entries.length === 0 ? (
                            <div style={{ fontSize: 9.5, color: PALETTE.textDim, marginTop: 2 }}>장착 장비 없음 — 던전 시리즈 장비를 모아보세요</div>
                          ) : entries.map(([series, n]) => {
                            const b = RAID_SET_BONUSES[series];
                            if (!b) return null;
                            const done = n >= 3;
                            return (
                              <div key={series} className="tabular-nums" style={{ fontSize: 9.5, marginTop: 2, color: done ? PALETTE.green : PALETTE.textDim }}>
                                {done ? '✓' : '·'} {series} {n}/3 — {done ? '발동 중: ' : '완성 시: '}{setBonusText(b)}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                    {invForClass.length > 0 && (
                      <div className="mt-2.5">
                        <div style={{ fontSize: 9.5, color: PALETTE.textDim, marginBottom: 3 }}>보유 장비 ({invForClass.length})</div>
                        <div className="flex flex-col gap-1.5">
                          {[...invForClass].sort((a, b) => (b.power || 0) - (a.power || 0)).map(item => (
                            <GearChip key={item.id} item={item}
                              onEquip={() => onEquipItem(item.id)}
                              onDismantle={onDismantle ? () => onDismantle(item.id, item.rarity) : null} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </GlassPanel>
            );
          })}
        </div>

        {/* 일괄 장착 + 하위 장비 일괄 분해 */}
        {raid.inventory.length > 0 && (
          <div className="flex gap-2 mt-2">
            <button onClick={onAutoEquip} className="ui-press flex-1" style={{
              height: 40, borderRadius: 'var(--r-btn)', fontSize: 11, fontWeight: 700,
              background: 'rgba(232,176,74,0.1)', border: '1px solid rgba(232,176,74,0.45)', color: PALETTE.legendary,
            }}>⚡ 일괄 장착</button>
            {onDismantleJunk && (
              <button onClick={onDismantleJunk} className="ui-press flex-1" style={{
                height: 40, borderRadius: 'var(--r-btn)', fontSize: 11, fontWeight: 700,
                background: 'rgba(123,163,196,0.1)', border: `1px solid ${PALETTE.ice}66`, color: PALETTE.ice,
              }}>{RAID_STONE.icon} 하위 장비 일괄 분해</button>
            )}
          </div>
        )}

        {/* ===== 제작소 (1.76.0~) — 정수 제작 + 심연석 가챠 ===== */}
        <div className="mt-4 mb-2 flex items-center gap-2.5">
          <span className="tracking-[0.25em] flex-none" style={{ fontSize: 11, color: PALETTE.dawn }}>심연 제작소</span>
          <span className="flex-1 h-px" style={{ background: 'var(--ui-line)' }} />
          <span style={{ fontSize: 10, color: PALETTE.textDim }}>{RAID_ESSENCE.icon} 정수는 첨탑·심연 막보 전용 드랍</span>
        </div>
        {/* 제작·가챠 결과 배너 */}
        {lastResult && (() => {
          const rar = RAID_RARITIES[lastResult.item.rarity];
          const cls = classMeta(lastResult.item.classId);
          return (
            <div className="flex items-center justify-between px-3 py-2.5 mb-2" style={{
              borderRadius: 12, background: `${rar.color}18`, border: `1.5px solid ${rar.color}`,
              boxShadow: `0 0 14px ${rar.color}55`,
            }}>
              <span style={{ fontSize: 11.5 }}>
                <span style={{ color: PALETTE.textDim, fontSize: 10 }}>[{lastResult.source} 결과]</span>{' '}
                <span style={{ color: rar.color, fontWeight: 700 }}>[{rar.name}]</span>{' '}
                <span style={{ color: PALETTE.text }}>{lastResult.item.name}</span>{' '}
                <span style={{ fontSize: 9.5, color: PALETTE.textDim }}>({cls?.name})</span>
              </span>
              <button onClick={() => setLastResult(null)} className="ui-press" style={{ fontSize: 11, color: PALETTE.textDim, background: 'transparent', border: 'none' }}>✕</button>
            </div>
          );
        })()}
        <div className="flex flex-col gap-1.5">
          {onCraft && RAID_CRAFT_RECIPES.map(recipe => {
            const rar = RAID_RARITIES[recipe.rarity];
            const affordable = stones >= recipe.stones && essence >= recipe.essence;
            return (
              <div key={recipe.id} className="flex items-center justify-between px-3 py-2.5" style={{
                borderRadius: 12, background: `${rar.color}10`, border: `1px solid ${rar.color}55`,
              }}>
                <div className="min-w-0">
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: rar.color }}>{recipe.name} — {rar.name} 확정</div>
                  <div style={{ fontSize: 9.5, color: PALETTE.textDim }}>부위·직업 랜덤 · 심연의 시리즈 성능</div>
                </div>
                <button onClick={() => { const item = onCraft(recipe.id); if (item) setLastResult({ source: '제작', item }); }}
                  disabled={!affordable}
                  className="ui-press flex-none ml-2 tabular-nums" style={{
                    fontSize: 10.5, fontWeight: 700, padding: '7px 11px', borderRadius: 10,
                    background: affordable ? `${rar.color}22` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${affordable ? rar.color : 'var(--ui-line)'}`,
                    color: affordable ? rar.color : PALETTE.textDim,
                  }}>
                  {RAID_ESSENCE.icon}{recipe.essence} + {RAID_STONE.icon}{recipe.stones}
                </button>
              </div>
            );
          })}
          {onGacha && (
            <div className="flex items-center justify-between px-3 py-2.5" style={{
              borderRadius: 12, background: 'rgba(123,163,196,0.08)', border: `1px solid ${PALETTE.ice}55`,
            }}>
              <div className="min-w-0">
                <div style={{ fontSize: 11.5, fontWeight: 700, color: PALETTE.ice }}>심연석 가챠 — 랜덤 장비 1개</div>
                <div style={{ fontSize: 9.5, color: PALETTE.textDim }}>전 시리즈 랜덤 · 에픽 {RAID_GACHA.weights.EP}% (등급 높을수록 확률 급감)</div>
              </div>
              <button onClick={() => { const item = onGacha(); if (item) setLastResult({ source: '가챠', item }); }}
                disabled={stones < RAID_GACHA.cost}
                className="ui-press flex-none ml-2 tabular-nums" style={{
                  fontSize: 10.5, fontWeight: 700, padding: '7px 11px', borderRadius: 10,
                  background: stones >= RAID_GACHA.cost ? 'rgba(123,163,196,0.18)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${stones >= RAID_GACHA.cost ? PALETTE.ice : 'var(--ui-line)'}`,
                  color: stones >= RAID_GACHA.cost ? PALETTE.ice : PALETTE.textDim,
                }}>
                {RAID_STONE.icon}{RAID_GACHA.cost}
              </button>
            </div>
          )}
        </div>

        {/* ===== 던전 — 지역별 그룹 (던파 지역-던전 편성 참고) ===== */}
        {RAID_REGIONS.map((region, regionIdx) => {
          const regionColor = RAID_DUNGEONS.find(d => d.region === region.id)?.color || PALETTE.dawn;
          return (
        <React.Fragment key={region.id}>
        {/* 지역 배너 — 던전 색 그라디언트 스트립 */}
        <div className="mt-4 mb-2 px-3 py-2 relative overflow-hidden" style={{
          borderRadius: 12,
          background: `linear-gradient(105deg, ${regionColor}2e, transparent 65%), rgba(255,255,255,0.025)`,
          border: `1px solid ${regionColor}44`,
        }}>
          <span className="absolute left-0 top-0 bottom-0" style={{ width: 3, background: `linear-gradient(180deg, ${regionColor}, transparent)` }} />
          <div className="flex items-baseline gap-2">
            <span style={{ fontSize: 9, letterSpacing: '0.3em', color: regionColor, fontFamily: '"Cinzel", serif' }}>REGION {regionIdx + 1}</span>
            <span className="tracking-[0.2em] font-bold" style={{ fontSize: 12, color: PALETTE.text }}>{region.name}</span>
          </div>
          <div className="mt-0.5" style={{ fontSize: 10, color: PALETTE.textDim, opacity: 0.85 }}>{region.desc}</div>
        </div>
        <div className="ui-stagger flex flex-col gap-2">
          {RAID_DUNGEONS.filter(d => d.region === region.id).map(d => {
            const clears = raid.clears?.[d.id] || 0;
            const under = partyPower < d.recommendedPower;
            const finalRoom = d.rooms[d.rooms.length - 1];
            const totalDrops = d.rooms.reduce((s, room) => s + (room.drops || 0), 0);
            const totalStones = d.rooms.reduce((s, room) => s + (room.stones || 0), 0);
            return (
              <GlassPanel key={d.id} className="relative overflow-hidden" style={{ borderRadius: 14, padding: '11px 13px 11px 16px', ...(d.kind === 'raid' ? { borderColor: `${d.color}66`, boxShadow: `0 0 18px -8px ${d.color}88` } : {}) }}>
                {/* 좌측 컬러 밴드 + 우측 보스 문장 워터마크 */}
                <span className="absolute left-0 top-0 bottom-0" style={{ width: 3.5, background: `linear-gradient(180deg, ${d.color}, ${d.color}33)` }} />
                <span className="absolute pointer-events-none" style={{
                  right: -6, top: -10, fontSize: 74, color: d.color, opacity: 0.09, transform: 'rotate(12deg)',
                }}>{ROOM_KIND_GLYPHS.boss}</span>
                <div className="tracking-[0.2em]" style={{ fontSize: 9.5, color: d.color }}>{d.sub}</div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="font-semibold" style={{ fontSize: 13.5, color: PALETTE.text }}>{d.name}</span>
                  {clears > 0 && <Chip color={PALETTE.green} style={{ height: 19 }}>클리어 ×{clears}</Chip>}
                </div>
                <div className="leading-relaxed mt-1" style={{ fontSize: 10.5, color: PALETTE.textDim }}>{d.desc}</div>
                {/* 방 경로 — 아이콘 메달리온 체인 (☠쫄 → ♜네임드 → ♛보스) */}
                <div className="flex items-center gap-1 mt-2 flex-wrap">
                  {d.rooms.map((room, i) => {
                    const kindColor = room.kind === 'boss' ? d.color : room.kind === 'named' ? PALETTE.legendary : PALETTE.textDim;
                    return (
                      <React.Fragment key={i}>
                        {i > 0 && <span style={{ fontSize: 8, color: PALETTE.textDim, opacity: 0.5 }}>─</span>}
                        <span className="flex items-center justify-center flex-none" style={{
                          width: room.kind === 'boss' ? 24 : 20, height: room.kind === 'boss' ? 24 : 20,
                          borderRadius: '50%', fontSize: room.kind === 'boss' ? 12 : 10,
                          background: `${kindColor}1e`, border: `1px solid ${kindColor}77`, color: kindColor,
                          boxShadow: room.kind === 'boss' ? `0 0 8px ${d.color}66` : 'none',
                        }}>{ROOM_KIND_GLYPHS[room.kind]}</span>
                      </React.Fragment>
                    );
                  })}
                  <span className="ml-1 truncate" style={{ fontSize: 9.5, color: d.color }}>{finalRoom.name}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <Chip color={d.color} style={{ height: 19 }}>방 {d.rooms.length}개</Chip>
                  <Chip color={d.color} style={{ height: 19 }}>최종 보스 HP {finalRoom.hp}</Chip>
                  <Chip color={under ? PALETTE.accent : PALETTE.green} style={{ height: 19 }}>권장 전투력 {d.recommendedPower}</Chip>
                  <Chip color={PALETTE.legendary} style={{ height: 19 }}>{d.gearPrefix} 장비 ×{d.gearMult} · 막보 {totalDrops}개</Chip>
                  <Chip color={RAID_RARITIES.EP.color} style={{ height: 19 }}>에픽 {d.rarityWeights.EP}%</Chip>
                  {totalStones > 0 && <Chip color={PALETTE.ice} style={{ height: 19 }}>네임드 {RAID_STONE.icon}{totalStones}</Chip>}
                  {(d.essenceDrop || 0) > 0 && <Chip color={PALETTE.legendary} style={{ height: 19 }}>막보 {RAID_ESSENCE.icon}{d.essenceDrop} 확정</Chip>}
                  {hasRaidWeeklyClaimed(meta, d.id, weekKey)
                    ? <Chip color={PALETTE.green} style={{ height: 19 }}>주간 보상 ✓</Chip>
                    : <Chip color={PALETTE.ice} style={{ height: 19 }}>주간 첫 클리어 {RAID_STONE.icon}{d.weeklyStones}{d.kind === 'raid' ? ' + 유니크↑ 확정' : ''}</Chip>}
                  {(() => {
                    const sid = getDungeonSecret(d.id);
                    if (!sid) return null;
                    const sk = RAID_SECRET_SKILLS[sid];
                    const met = (raid.secretHistory || []).includes(sid);
                    return met
                      ? <Chip color={PALETTE.textDim} style={{ height: 19 }}>기연 조우 완료</Chip>
                      : <Chip color={PALETTE.legendary} style={{ height: 19 }}>✦ 기연: {sk.name}</Chip>;
                  })()}
                </div>
                <UIButton onClick={() => onEnterDungeon(d)} className="mt-2.5" style={{ height: 40, fontSize: 12, letterSpacing: '0.2em' }}>
                  ▸ 입장 {under ? '(전투력 부족 — 위험)' : ''}
                </UIButton>
              </GlassPanel>
            );
          })}
        </div>
        </React.Fragment>
          );
        })}

        <div className="mt-3 text-center" style={{ fontSize: 9.5, color: PALETTE.textDim, opacity: 0.7 }}>
          레이드 장비·스킬은 본편(원정)과 완전히 분리된 별도 성장입니다
        </div>
      </div>
    </div>
  );
}
