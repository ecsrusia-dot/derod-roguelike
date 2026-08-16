// ============================================
// components/buried/BuriedCommon.jsx — 무덤의 유산 공통 부품 (1.103.0)
// ============================================
// 세 화면(로비·던전·전투)이 공유하는 표시 부품. 로직은 data/buried.js에만 둔다.

import React from 'react';
import { PALETTE } from '../../utils/helpers.js';
import {
  BURIED_SKILLS, BURIED_STATUS, BURIED_SLOTS, BURIED_TIERS,
  getBuriedTier, buriedItemStats, buriedDustValue, buriedEnhanceMult,
  buriedSkillEffectLines, getBuriedUnique, getBuriedMod,
} from '../../data.js';

export const slotMeta = (slotId) => BURIED_SLOTS.find(s => s.id === slotId) || { name: slotId, icon: '◆' };

// ===== 스킬 공격 계열 (1.104.1) =====
// 공격 스킬은 skill.stat이 참조하는 능력치로 위력이 정해진다 — 물리(완력)/기교/마법(지혜).
// 비공격 스킬(방어·회복·버프)은 '보조'로 표기해 스탯 무관임을 명시한다.
// 색은 BURIED_STATS의 스탯 색과 동일 — 능력치 배분 화면과 1:1로 이어진다.
const SKILL_KIND = {
  str: { label: '물리', icon: '💪', color: '#c4453d', refs: '완력' },
  dex: { label: '기교', icon: '🎯', color: '#7a9a5e', refs: '기교' },
  int: { label: '마법', icon: '📖', color: '#5c4a8c', refs: '지혜' },
  // 1.118.1 — stat 미지정 공격(기본 공격): 물리·기교·마법 중 **최고 공격력**을 따른다 (1.117.0 로직 변경분 표시 반영)
  any:  { label: '자유', icon: '✦', color: '#c9a86a', refs: '최고 공격 스탯' },
  none: { label: '보조', icon: '◈', color: '#9b8975', refs: null },
};
export function skillKindMeta(skill) {
  if (!skill) return null;
  if (!skill.power) return SKILL_KIND.none;
  return skill.stat ? (SKILL_KIND[skill.stat] || SKILL_KIND.str) : SKILL_KIND.any;
}
export function SkillKindBadge({ skill }) {
  const k = skillKindMeta(skill);
  if (!k) return null;
  return (
    <span className="px-1 py-px text-[11px] font-bold align-middle inline-flex items-center gap-0.5 shrink-0"
      style={{ borderRadius: 'var(--r-chip, 8px)', background: `${k.color}22`, border: `1px solid ${k.color}66`, color: k.color, lineHeight: 1.3 }}>
      {k.icon}{k.label}
    </span>
  );
}

const STAT_LABEL = {
  atk: '공격력', mag: '마력', def: '방어력', hp: '최대 HP', sp: '최대 SP',
  crit: '치명 확률', critDmg: '치명 피해', dodge: '회피율', spRegen: 'SP 회복',
  str: '완력', dex: '기교', int: '지혜', vit: '체력',
  barrier: '🔷 보호막', chase: '추격 피해',
};
const PCT_KEYS = new Set(['crit', 'critDmg', 'dodge']);
export const statLabel = (k) => STAT_LABEL[k] || k;
export const statText = (k, v) => `${v > 0 ? '+' : ''}${v}${PCT_KEYS.has(k) ? '%' : ''}`;

// ===== 체력/SP 바 =====
export function BuriedBar({ value, max, color, label, height = 8, showText = true }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div>
      <div className="w-full overflow-hidden" style={{ height, borderRadius: 4, background: '#000', border: `1px solid ${PALETTE.panelBorder}` }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width 260ms ease' }} />
      </div>
      {showText && (
        <div className="flex justify-between mt-0.5">
          {label && <span className="text-[11px]" style={{ color: PALETTE.textDim }}>{label}</span>}
          <span className="text-[11px] tabular-nums ml-auto" style={{ color }}>{Math.max(0, Math.round(value))} / {Math.round(max)}</span>
        </div>
      )}
    </div>
  );
}

// ===== 상태이상 칩 줄 =====
// 1.117.0 — onPick(key, stacks) 전달 시 칩이 탭 가능해진다 (전투 화면: 팝업 설명 모달)
export function BuriedStatusRow({ statuses, align = 'left', onPick = null }) {
  const list = Object.entries(statuses || {}).filter(([, n]) => n > 0);
  if (list.length === 0) return <div style={{ height: 20 }} />;
  return (
    <div className="flex flex-wrap gap-1" style={{ justifyContent: align === 'right' ? 'flex-end' : 'flex-start', minHeight: 20 }}>
      {list.map(([key, n]) => {
        const def = BURIED_STATUS[key];
        if (!def) return null;
        const Tag = onPick ? 'button' : 'span';
        return (
          <Tag key={key} onClick={onPick ? () => onPick(key, n) : undefined}
            className={`px-1.5 py-0.5 text-[11px] tabular-nums flex items-center gap-0.5${onPick ? ' ui-press' : ''}`}
            style={{ borderRadius: 'var(--r-chip, 8px)', background: `${def.color}22`, border: `1px solid ${def.color}66`, color: def.color }}
            title={`${def.name} — ${def.desc}`}>
            <span>{def.icon}</span>{n}
          </Tag>
        );
      })}
    </div>
  );
}

// ===== 상태·효과 설명 팝업 (1.117.0) — 전투 화면 공용 바텀 시트 =====
// info: { icon, title, color, lines: [{ text, color? }] }
export function BuriedInfoModal({ info, onClose }) {
  if (!info) return null;
  return (
    <div className="absolute inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div className="w-full px-4 pb-4 pt-3" onClick={(e) => e.stopPropagation()}
        style={{ background: PALETTE.bgDeep, borderTop: `1px solid ${info.color || PALETTE.panelBorder}88`, borderRadius: '18px 18px 0 0' }}>
        <div className="text-[14px] font-bold flex items-center gap-1.5 mb-1.5" style={{ color: info.color || PALETTE.text }}>
          <span>{info.icon}</span> {info.title}
        </div>
        <div className="space-y-1">
          {(info.lines || []).map((l, i) => (
            <div key={i} className="text-[12px] leading-relaxed" style={{ color: l.color || PALETTE.textDim }}>{l.text}</div>
          ))}
        </div>
        <button onClick={onClose} className="ui-press w-full mt-2.5 py-2 text-[12px]" style={{ color: PALETTE.textDim }}>닫기</button>
      </div>
    </div>
  );
}

// ===== 장비 카드 =====
// mode: 'row'(목록) | 'slot'(장착 슬롯)
export function BuriedItemCard({ item, slotId, onClick, right, dim = false, showSlot = false }) {
  const meta = slotMeta(slotId || item?.slot);
  if (!item) {
    return (
      <button onClick={onClick} disabled={!onClick}
        className="ui-press w-full flex items-center gap-2.5 px-3 py-2.5 text-left"
        style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panel, border: `1px dashed ${PALETTE.panelBorder}`, opacity: 0.75 }}>
        <span className="text-[15px] w-5 text-center" style={{ color: PALETTE.textDim }}>{meta.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-[12px]" style={{ color: PALETTE.textDim }}>{meta.name} — 비어 있음</div>
          <div className="text-[11px]" style={{ color: PALETTE.textDim, opacity: 0.7 }}>장비가 없으면 그 스킬도 쓸 수 없다</div>
        </div>
      </button>
    );
  }
  const tier = getBuriedTier(item.tier);
  const skill = BURIED_SKILLS[item.skillId];
  const st = buriedItemStats(item);
  return (
    <button onClick={onClick} disabled={!onClick}
      className="ui-press w-full flex items-center gap-2.5 px-3 py-2.5 text-left"
      style={{
        borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panel,
        border: `1px solid ${tier.color}55`, opacity: dim ? 0.55 : 1,
      }}>
      <span className="text-[15px] w-5 text-center" style={{ color: tier.color }}>{meta.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-bold truncate" style={{ color: tier.color }}>
          <span className="tabular-nums font-normal" style={{ color: PALETTE.textDim }}>Lv.{item.floor || 1} </span>
          {item.name}{item.plus > 0 && <span style={{ color: PALETTE.legendary }}> +{item.plus}</span>}
        </div>
        <div className="text-[11px] truncate flex items-center gap-1" style={{ color: PALETTE.dawn }}>
          {skill && <SkillKindBadge skill={skill} />}
          <span className="truncate">◆ {skill ? skill.name : '스킬 없음'}{skill && <span style={{ color: PALETTE.textDim }}> · SP {skill.sp}{skill.cd > 0 ? ` · CD ${skill.cd}` : ''}</span>}</span>
        </div>
        <div className="text-[11px] truncate" style={{ color: PALETTE.textDim }}>
          {showSlot && <span>{meta.name} · </span>}
          {Object.entries(st).map(([k, v]) => `${statLabel(k)} ${statText(k, v)}`).join(' · ') || '옵션 없음'}
        </div>
        {/* 전설의 무구 (1.106.0) — 고유 효과 한 줄 */}
        {item.unique && getBuriedUnique(item.unique) && (
          <div className="text-[11px] truncate" style={{ color: tier.color }}>
            ✦ {getBuriedUnique(item.unique).desc}
          </div>
        )}
        {/* 스킬 변화 접두어 (1.107.0) */}
        {item.mod && getBuriedMod(item.mod) && (
          <div className="text-[11px] truncate" style={{ color: PALETTE.twilight }}>
            ◈ {getBuriedMod(item.mod).name} — {getBuriedMod(item.mod).desc}
          </div>
        )}
      </div>
      {right}
    </button>
  );
}

// ===== 장비 상세 시트 (장착·분해·비교) =====
export function BuriedItemSheet({ item, compare, onEquip, onUnequip, onDismantle, onClose, extra }) {
  if (!item) return null;
  const tier = getBuriedTier(item.tier);
  const skill = BURIED_SKILLS[item.skillId];
  const st = buriedItemStats(item);
  const cmp = compare ? buriedItemStats(compare) : null;
  const keys = [...new Set([...Object.keys(st), ...Object.keys(cmp || {})])];

  return (
    <div className="absolute inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.72)' }} onClick={onClose}>
      <div className="w-full px-3 pb-4 pt-3" onClick={(e) => e.stopPropagation()}
        style={{ background: PALETTE.bgDeep, borderTop: `1px solid ${tier.color}66`, borderRadius: '18px 18px 0 0', maxHeight: '86%', overflowY: 'auto' }}>
        <div className="flex items-start gap-2 mb-2">
          <div className="flex-1">
            <div className="text-[14px] font-bold" style={{ color: tier.color }}>
              {item.name}{item.plus > 0 && <span style={{ color: PALETTE.legendary }}> +{item.plus}</span>}
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: PALETTE.textDim }}>
              {slotMeta(item.slot).name} · {tier.name} 등급 · <b style={{ color: PALETTE.text }}>장비 Lv.{item.floor || 1}</b>
              {item.plus > 0 && ` · 강화 배율 ×${buriedEnhanceMult(item.plus).toFixed(2)}`}
            </div>
          </div>
          <button onClick={onClose} className="ui-press text-[12px] px-2 py-1" style={{ color: PALETTE.textDim }}>닫기</button>
        </div>

        {/* 1.105.0 — 실물 비교: 장착 중 장비를 위에, 지금 보는 장비를 아래에 나란히 */}
        {compare && (
          <div className="mb-2 space-y-1">
            <div className="text-[11px] tracking-[0.2em]" style={{ color: PALETTE.textDim }}>지금 장착 중</div>
            <BuriedItemCard item={compare} dim />
            <div className="text-center text-[13px] leading-none" style={{ color: PALETTE.dawn }}>▼ 교체 후보</div>
            <BuriedItemCard item={item} />
          </div>
        )}

        {/* 전설의 무구 고유 효과 (1.106.0) */}
        {item.unique && getBuriedUnique(item.unique) && (
          <div className="px-3 py-2.5 mb-2" style={{ borderRadius: 'var(--r-panel, 18px)', background: `${tier.color}14`, border: `1px solid ${tier.color}66` }}>
            <div className="text-[11px] tracking-[0.2em] mb-1" style={{ color: tier.color }}>✦ 전설의 무구 — 고유 효과</div>
            <div className="text-[12px] leading-relaxed" style={{ color: PALETTE.text }}>{getBuriedUnique(item.unique).desc}</div>
            <div className="text-[11px] mt-1" style={{ color: PALETTE.textDim }}>장착 중일 때만 발동한다. 보스만 떨어뜨리는 장비.</div>
          </div>
        )}

        {/* 내장 스킬 — 원작의 핵심: 이 장비를 껴야만 이 스킬을 쓴다 */}
        {skill && (
          <div className="px-3 py-2.5 mb-2" style={{ borderRadius: 'var(--r-panel, 18px)', background: PALETTE.panelLight, border: `1px solid ${PALETTE.dawn}44` }}>
            <div className="text-[11px] tracking-[0.2em] mb-1" style={{ color: PALETTE.dawn }}>내장 스킬</div>
            <div className="text-[13px] font-bold flex items-center gap-1.5" style={{ color: PALETTE.text }}>
              {skill.name} <SkillKindBadge skill={skill} />
            </div>
            <div className="text-[11px] mt-0.5 tabular-nums" style={{ color: PALETTE.ice }}>
              SP {skill.sp}{skill.cd > 0 ? ` · 쿨다운 ${skill.cd}턴` : ' · 쿨다운 없음'}
              {skill.power ? ` · 위력 ${skill.power}%${skill.hits ? ` ×${skill.hits}` : ''} (${skill.stat ? `${skillKindMeta(skill).refs} 기반 ${skillKindMeta(skill).label} 공격력 참조` : '물리·기교·마법 중 최고 공격력 참조'})` : ' · 스탯 무관 (보조 스킬)'}
              {skill.pierce ? ' · 방어 무시' : ''}
            </div>
            <div className="text-[12px] mt-1 leading-relaxed" style={{ color: PALETTE.textDim }}>{skill.desc}</div>
            {/* 1.105.0 — 효과 풀이: "[파쇄] 2"가 정확히 무엇인지 그 자리에서 설명 */}
            {buriedSkillEffectLines(skill).length > 0 && (
              <div className="mt-1.5 pt-1.5 space-y-1" style={{ borderTop: `1px solid ${PALETTE.panelBorder}` }}>
                {buriedSkillEffectLines(skill).map((l, i) => (
                  <div key={i} className="text-[11px] leading-relaxed" style={{ color: l.color || PALETTE.textDim }}>· {l.text}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 스탯 (비교 있으면 증감 표시) */}
        <div className="px-3 py-2.5 mb-2" style={{ borderRadius: 'var(--r-panel, 18px)', background: PALETTE.panel, border: `1px solid ${PALETTE.panelBorder}` }}>
          <div className="text-[11px] tracking-[0.2em] mb-1.5" style={{ color: PALETTE.dawn }}>
            능력치{cmp ? ' (장착 중과 비교)' : ''}
          </div>
          {keys.length === 0 && <div className="text-[12px]" style={{ color: PALETTE.textDim }}>부여된 능력치 없음</div>}
          {keys.map(k => {
            const a = st[k] || 0, b = cmp ? (cmp[k] || 0) : null;
            const diff = b === null ? null : a - b;
            return (
              <div key={k} className="flex justify-between items-center text-[12px] py-0.5">
                <span style={{ color: PALETTE.textDim }}>{statLabel(k)}</span>
                <span className="tabular-nums" style={{ color: PALETTE.text }}>
                  {statText(k, a)}
                  {diff !== null && diff !== 0 && (
                    <span className="ml-1.5" style={{ color: diff > 0 ? PALETTE.green : PALETTE.accent }}>
                      ({diff > 0 ? '+' : ''}{diff})
                    </span>
                  )}
                </span>
              </div>
            );
          })}
          {(item.options || []).length > 0 && (
            <div className="mt-1.5 pt-1.5 text-[11px]" style={{ borderTop: `1px solid ${PALETTE.panelBorder}`, color: PALETTE.textDim }}>
              랜덤 옵션 {item.options.length}개 · 분해 시 {BURIED_DUST_ICON} {buriedDustValue(item)}
            </div>
          )}
        </div>

        {extra}

        <div className="flex gap-2 mt-1">
          {onEquip && <button onClick={onEquip} className="ui-press flex-1 py-2.5 text-[12px] font-bold"
            style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.accent, color: '#fff' }}>장착</button>}
          {onUnequip && <button onClick={onUnequip} className="ui-press flex-1 py-2.5 text-[12px]"
            style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panelLight, color: PALETTE.text, border: `1px solid ${PALETTE.panelBorder}` }}>해제</button>}
          {onDismantle && <button onClick={onDismantle} className="ui-press px-4 py-2.5 text-[12px]"
            style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panelLight, color: PALETTE.textDim, border: `1px solid ${PALETTE.panelBorder}` }}>
            분해 {BURIED_DUST_ICON}{buriedDustValue(item)}
          </button>}
        </div>
      </div>
    </div>
  );
}

export const BURIED_DUST_ICON = '🕯';

// ===== 획득 판단 모달 (1.113.0) — 인벤토리 폐지: 획득 즉시 [교체] or [버리기] =====
// 어느 쪽이든 밀려난/버려진 장비는 자동 분해 → 먼지. onResolve(replace: boolean)
export function BuriedLootModal({ char, onResolve }) {
  const item = char?.pendingLoot?.[0];
  if (!item) return null;
  const tier = getBuriedTier(item.tier);
  const cur = char.equipped?.[item.slot] || null;
  const st = buriedItemStats(item);
  const cmp = cur ? buriedItemStats(cur) : {};
  const keys = [...new Set([...Object.keys(st), ...Object.keys(cmp)])];
  const queueLeft = (char.pendingLoot || []).length - 1;
  return (
    <div className="absolute inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.78)' }}>
      <div className="w-full px-3 pb-4 pt-3"
        style={{ background: PALETTE.bgDeep, borderTop: `1px solid ${tier.color}66`, borderRadius: '18px 18px 0 0', maxHeight: '88%', overflowY: 'auto' }}>
        <div className="text-[11px] tracking-[0.25em] mb-1.5" style={{ color: PALETTE.dawn }}>
          ⚖ 장비 획득 — 즉시 판단{queueLeft > 0 ? ` (대기 ${queueLeft}개)` : ''}
        </div>
        <div className="space-y-1 mb-2">
          {cur ? (
            <>
              <div className="text-[11px]" style={{ color: PALETTE.textDim }}>지금 장착 중</div>
              <BuriedItemCard item={cur} dim />
              <div className="text-center text-[13px] leading-none" style={{ color: PALETTE.dawn }}>▼ 새 장비</div>
            </>
          ) : (
            <div className="text-[11px]" style={{ color: PALETTE.textDim }}>{slotMeta(item.slot).name} 슬롯 — 비어 있음</div>
          )}
          <BuriedItemCard item={item} />
        </div>
        {/* 스탯 증감 비교 */}
        {cur && keys.length > 0 && (
          <div className="px-3 py-2 mb-2" style={{ borderRadius: 'var(--r-panel, 18px)', background: PALETTE.panel, border: `1px solid ${PALETTE.panelBorder}` }}>
            {keys.map(k => {
              const a = st[k] || 0, b = cmp[k] || 0, diff = a - b;
              return (
                <div key={k} className="flex justify-between items-center text-[12px] py-0.5">
                  <span style={{ color: PALETTE.textDim }}>{statLabel(k)}</span>
                  <span className="tabular-nums" style={{ color: PALETTE.text }}>
                    {statText(k, a)}
                    {diff !== 0 && <span className="ml-1.5" style={{ color: diff > 0 ? PALETTE.green : PALETTE.accent }}>({diff > 0 ? '+' : ''}{diff})</span>}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={() => onResolve(true)} className="ui-press flex-1 py-2.5 text-[12px] font-bold"
            style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.accent, color: '#fff' }}>
            교체{cur ? ` (기존 분해 ${BURIED_DUST_ICON}${buriedDustValue(cur)})` : ''}
          </button>
          <button onClick={() => onResolve(false)} className="ui-press flex-1 py-2.5 text-[12px]"
            style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panelLight, color: PALETTE.text, border: `1px solid ${PALETTE.panelBorder}` }}>
            버리기 ({BURIED_DUST_ICON}{buriedDustValue(item)})
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== 등급 범례 =====
export function BuriedTierLegend() {
  return (
    <div className="flex flex-wrap gap-1.5">
      {BURIED_TIERS.map(t => (
        <span key={t.id} className="px-1.5 py-0.5 text-[11px]"
          style={{ borderRadius: 'var(--r-chip, 8px)', color: t.color, border: `1px solid ${t.color}55` }}>
          {t.name}
        </span>
      ))}
    </div>
  );
}
