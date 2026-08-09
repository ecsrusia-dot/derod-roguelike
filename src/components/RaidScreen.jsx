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
} from '../data.js';
import { hasRaidWeeklyClaimed } from '../storage.js';
import { ScreenHeader, GlassPanel, Chip, UIButton } from './ui/CommonUI.jsx';

const ROLE_ICONS = { tank: Shield, dealer: Swords, healer: Heart };
const ROLE_COLORS = { tank: '#7ba3c4', dealer: '#c4453d', healer: '#9ad4a3' };

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

export default function RaidScreen({ meta, onEnterDungeon, onEquipItem, onAutoEquip, onDismantle = null, onDismantleJunk = null, onEnhance = null, onBack }) {
  const raid = meta?.raid || { inventory: [], equipped: {}, clears: {}, stones: 0 };
  const [gearClass, setGearClass] = useState(null); // 장비 관리 중인 직업 ID | null
  const partyPower = getRaidPartyPower(raid);
  const stones = raid.stones || 0;
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
              <Chip color={PALETTE.legendary} icon={<span>⚔</span>}><span className="tabular-nums">{partyPower}</span></Chip>
            </span>
          }
        />
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
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
                    <span className="flex items-center justify-center flex-none" style={{
                      width: 30, height: 30, borderRadius: 10, background: `${roleColor}1c`, border: `1px solid ${roleColor}55`, color: roleColor,
                    }}><RoleIcon size={14} /></span>
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
                      <div className="tabular-nums" style={{ fontSize: 10, color: PALETTE.textDim }}>
                        HP {stats.hp} · 공격 {stats.atk}{stats.heal ? ` · 치유 ${stats.heal}` : ''} · 장비 {equippedCount}/3
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
                      <span style={{ fontSize: 10, fontWeight: 700, color: PALETTE.legendary }}>★ {RAID_SKILLS[classId].name}</span>
                      <div style={{ fontSize: 10, color: PALETTE.textDim, marginTop: 2 }}>{RAID_SKILLS[classId].desc}</div>
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

        {/* ===== 던전 — 지역별 그룹 (던파 지역-던전 편성 참고) ===== */}
        {RAID_REGIONS.map(region => (
        <React.Fragment key={region.id}>
        <div className="mt-4 mb-2">
          <div className="flex items-center gap-2.5">
            <span className="tracking-[0.25em] flex-none" style={{ fontSize: 11, color: PALETTE.dawn }}>{region.name}</span>
            <span className="flex-1 h-px" style={{ background: 'var(--ui-line)' }} />
          </div>
          <div className="mt-1" style={{ fontSize: 10.5, color: PALETTE.textDim, opacity: 0.75 }}>{region.desc}</div>
        </div>
        <div className="ui-stagger flex flex-col gap-2">
          {RAID_DUNGEONS.filter(d => d.region === region.id).map(d => {
            const clears = raid.clears?.[d.id] || 0;
            const under = partyPower < d.recommendedPower;
            const finalRoom = d.rooms[d.rooms.length - 1];
            const totalDrops = d.rooms.reduce((s, room) => s + (room.drops || 0), 0);
            return (
              <GlassPanel key={d.id} style={{ borderRadius: 14, padding: '11px 13px', ...(d.kind === 'raid' ? { borderColor: `${d.color}55` } : {}) }}>
                <div className="tracking-[0.2em]" style={{ fontSize: 9.5, color: d.color }}>{d.sub}</div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="font-semibold" style={{ fontSize: 13.5, color: PALETTE.text }}>{d.name}</span>
                  {clears > 0 && <Chip color={PALETTE.green} style={{ height: 19 }}>클리어 ×{clears}</Chip>}
                </div>
                <div className="leading-relaxed mt-1" style={{ fontSize: 10.5, color: PALETTE.textDim }}>{d.desc}</div>
                {/* 방 진행 미리보기 */}
                <div className="flex items-center gap-1 mt-2 flex-wrap" style={{ fontSize: 9.5, color: PALETTE.textDim }}>
                  {d.rooms.map((room, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <span style={{ opacity: 0.5 }}>▸</span>}
                      <span style={{ color: room.kind === 'boss' ? d.color : room.kind === 'named' ? PALETTE.legendary : PALETTE.textDim }}>
                        {room.name}
                      </span>
                    </React.Fragment>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <Chip color={d.color} style={{ height: 19 }}>방 {d.rooms.length}개</Chip>
                  <Chip color={d.color} style={{ height: 19 }}>최종 보스 HP {finalRoom.hp}</Chip>
                  <Chip color={under ? PALETTE.accent : PALETTE.green} style={{ height: 19 }}>권장 전투력 {d.recommendedPower}</Chip>
                  <Chip color={PALETTE.legendary} style={{ height: 19 }}>{d.gearPrefix} 장비 ×{d.gearMult} · 최대 {totalDrops}개</Chip>
                  <Chip color={RAID_RARITIES.EP.color} style={{ height: 19 }}>에픽 {d.rarityWeights.EP}%</Chip>
                  {hasRaidWeeklyClaimed(meta, d.id, weekKey)
                    ? <Chip color={PALETTE.green} style={{ height: 19 }}>주간 보상 ✓</Chip>
                    : <Chip color={PALETTE.ice} style={{ height: 19 }}>주간 첫 클리어 {RAID_STONE.icon}{d.weeklyStones}{d.kind === 'raid' ? ' + 유니크↑ 확정' : ''}</Chip>}
                </div>
                <UIButton onClick={() => onEnterDungeon(d)} className="mt-2.5" style={{ height: 40, fontSize: 12, letterSpacing: '0.2em' }}>
                  ▸ 입장 {under ? '(전투력 부족 — 위험)' : ''}
                </UIButton>
              </GlassPanel>
            );
          })}
        </div>
        </React.Fragment>
        ))}

        <div className="mt-3 text-center" style={{ fontSize: 9.5, color: PALETTE.textDim, opacity: 0.7 }}>
          레이드 장비·스킬은 본편(원정)과 완전히 분리된 별도 성장입니다
        </div>
      </div>
    </div>
  );
}
