// ============================================
// components/buried/BuriedScreen.jsx — 무덤의 유산 로비 (1.103.0)
// ============================================
// 캐릭터 생성 / 탐험 계속 / 유산 보관함 / 기록.
// 원작 감성: 캐릭터는 죽어 없어지고, 남는 것은 유산뿐이다.

import React, { useState } from 'react';
import { ChevronLeft, Skull, Package, BarChart3 } from 'lucide-react';
import { PALETTE } from '../../utils/helpers.js';
import {
  BURIED_CLASSES, BURIED_DUNGEON, BURIED_LEGACY_MAX, BURIED_LEGACY_GOLD_PCT,
  buriedDerived, buriedExpToNext, getBuriedClass, buildBuriedLegacy,
} from '../../data.js';
import { BuriedItemCard, BuriedBar, BURIED_DUST_ICON, BuriedTierLegend } from './BuriedCommon.jsx';
import BuriedManage from './BuriedManage.jsx';

export default function BuriedScreen({ meta, onStartChar, onContinue, onUpdateChar, onRetire, onBack }) {
  const b = meta?.buried || {};
  const char = b.char || null;
  const legacy = Array.isArray(b.legacy) ? b.legacy : [];
  const [pickClass, setPickClass] = useState(BURIED_CLASSES[0].id);
  const [manage, setManage] = useState(false);
  const [confirmRetire, setConfirmRetire] = useState(false);

  const cls = char ? getBuriedClass(char.classId) : null;
  const d = char ? buriedDerived(char) : null;

  return (
    <div className="absolute inset-0 flex flex-col ui-screen-enter" style={{ background: PALETTE.bgDeep }}>
      {/* 헤더 */}
      <div className="px-3 pt-5 pb-3 flex items-center justify-between border-b" style={{ borderColor: PALETTE.panelBorder }}>
        <button onClick={onBack} className="ui-press p-1.5" style={{ color: PALETTE.textDim }}><ChevronLeft size={20} /></button>
        <div className="text-center">
          <div className="text-[12px] tracking-[0.35em] font-bold" style={{ color: PALETTE.legendary }}>⚰ 무덤의 유산 ⚰</div>
          <div className="text-[11px] mt-0.5" style={{ color: PALETTE.textDim }}>남기는 것은 장비뿐이다</div>
        </div>
        <div className="text-[11px] tabular-nums font-bold" style={{ color: PALETTE.dawn }}>{BURIED_DUST_ICON} {b.dust || 0}</div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {/* ===== 진행 중 캐릭터 ===== */}
        {char ? (
          <div className="ui-stagger">
            <div className="text-[11px] tracking-[0.25em] mb-1.5" style={{ color: PALETTE.dawn }}>탐험 중</div>
            <div className="px-3 py-3" style={{ borderRadius: 'var(--r-panel, 18px)', background: PALETTE.panel, border: `1px solid ${cls?.color || PALETTE.panelBorder}66` }}>
              <div className="flex gap-3">
                <div className="w-16 h-16 shrink-0 overflow-hidden" style={{ borderRadius: 'var(--r-chip, 8px)', border: `1px solid ${cls?.color}55` }}>
                  <img src={cls?.image} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-bold" style={{ color: cls?.color }}>
                    {cls?.name} <span style={{ color: PALETTE.text }}>Lv.{char.lv}</span>
                  </div>
                  <div className="text-[11px] tabular-nums mb-1.5" style={{ color: PALETTE.textDim }}>
                    {BURIED_DUNGEON.name} {char.floor}층 · 🪙 {char.gold} · 처치 {char.kills || 0}
                  </div>
                  <BuriedBar value={char.hp} max={d.maxHp} color={PALETTE.accent} label="HP" />
                </div>
              </div>
              <div className="mt-2">
                <BuriedBar value={char.exp} max={buriedExpToNext(char.lv)} color={PALETTE.twilight} label="EXP" height={5} />
              </div>
              {char.statPoints > 0 && (
                <div className="mt-2 px-2.5 py-1.5 text-[11px]" style={{ borderRadius: 'var(--r-chip, 8px)', background: `${PALETTE.legendary}1a`, border: `1px solid ${PALETTE.legendary}55`, color: PALETTE.legendary }}>
                  능력치 포인트 {char.statPoints}점이 남아 있다 — 배분하지 않으면 그대로 사라진다.
                </div>
              )}
              <div className="flex gap-2 mt-2.5">
                <button onClick={onContinue} className="ui-press ui-sheen flex-1 py-2.5 text-[12px] font-bold"
                  style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.accent, color: '#fff' }}>
                  {char.floor}층으로 내려간다
                </button>
                <button onClick={() => setManage(true)} className="ui-press px-4 py-2.5 text-[12px]"
                  style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panelLight, color: PALETTE.text, border: `1px solid ${PALETTE.panelBorder}` }}>
                  장비
                </button>
              </div>
              <button onClick={() => setConfirmRetire(true)} className="ui-press w-full mt-1.5 py-2 text-[11px]"
                style={{ color: PALETTE.textDim }}>
                은퇴 — 유산만 남기고 이 캐릭터를 묻는다
              </button>
            </div>
          </div>
        ) : (
          /* ===== 새 캐릭터 ===== */
          <div className="ui-stagger">
            <div className="text-[11px] tracking-[0.25em] mb-1.5" style={{ color: PALETTE.dawn }}>새 캐릭터 — 직업 선택</div>
            <div className="space-y-1.5">
              {BURIED_CLASSES.map(c => {
                const on = pickClass === c.id;
                return (
                  <button key={c.id} onClick={() => setPickClass(c.id)} className="ui-press w-full flex gap-2.5 px-2.5 py-2.5 text-left"
                    style={{
                      borderRadius: 'var(--r-btn, 13px)',
                      background: on ? PALETTE.panelLight : PALETTE.panel,
                      border: `1px solid ${on ? c.color : PALETTE.panelBorder}`,
                    }}>
                    <div className="w-12 h-12 shrink-0 overflow-hidden" style={{ borderRadius: 'var(--r-chip, 8px)' }}>
                      <img src={c.image} alt="" className="w-full h-full object-cover" style={{ filter: on ? 'none' : 'grayscale(60%)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-bold" style={{ color: c.color }}>{c.name}</div>
                      <div className="text-[11px] truncate" style={{ color: PALETTE.textDim }}>{c.desc}</div>
                      <div className="text-[11px] mt-0.5" style={{ color: PALETTE.dawn }}>
                        ◆ {c.trait.name} · 무기 계열 {c.lines.weapon} / {c.lines.offhand}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            {(() => {
              const c = getBuriedClass(pickClass);
              return c?.trait ? (
                <div className="mt-2 px-3 py-2.5 text-[12px] leading-relaxed"
                  style={{ borderRadius: 'var(--r-panel, 18px)', background: PALETTE.panelLight, border: `1px solid ${c.color}44`, color: PALETTE.textDim }}>
                  <span className="font-bold" style={{ color: c.color }}>{c.trait.name}</span> — {c.trait.desc}
                </div>
              ) : null;
            })()}
            <button onClick={() => onStartChar(pickClass)} className="ui-press ui-sheen w-full mt-2.5 py-3 text-[13px] font-bold"
              style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.accent, color: '#fff' }}>
              무덤으로 내려간다{legacy.length > 0 ? ` — 유산 ${legacy.length}개 계승` : ''}
            </button>
          </div>
        )}

        {/* ===== 유산 보관함 ===== */}
        <div>
          <div className="text-[11px] tracking-[0.25em] mb-1.5 flex items-center gap-1.5" style={{ color: PALETTE.dawn }}>
            <Package size={12} /> 유산 보관함 — {legacy.length} / {BURIED_LEGACY_MAX}
          </div>
          <div className="px-3 py-2 mb-1.5 text-[11px] leading-relaxed"
            style={{ borderRadius: 'var(--r-chip, 8px)', background: PALETTE.panel, border: `1px solid ${PALETTE.panelBorder}`, color: PALETTE.textDim }}>
            캐릭터가 죽으면 장착 중이던 장비 <b style={{ color: PALETTE.text }}>1~3개</b>(깊이에 비례)와 골드의{' '}
            <b style={{ color: PALETTE.text }}>{BURIED_LEGACY_GOLD_PCT}%</b>가 여기 남는다. 다음 캐릭터가 시작할 때 자동으로 물려받는다.
            {(b.legacyGold || 0) > 0 && <> 현재 계승 대기 골드 <b style={{ color: PALETTE.legendary }}>🪙 {b.legacyGold}</b>.</>}
          </div>
          {legacy.length === 0
            ? <div className="text-[12px] px-3 py-3" style={{ color: PALETTE.textDim, background: PALETTE.panel, borderRadius: 'var(--r-btn, 13px)' }}>
                아직 아무도 묻히지 않았다.
              </div>
            : <div className="space-y-1.5">
                {legacy.map(i => <BuriedItemCard key={i.id} item={i} showSlot />)}
              </div>}
        </div>

        {/* ===== 기록 ===== */}
        <div>
          <div className="text-[11px] tracking-[0.25em] mb-1.5 flex items-center gap-1.5" style={{ color: PALETTE.dawn }}>
            <BarChart3 size={12} /> 기록
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { l: '최고 층', v: b.deepest || 0, c: PALETTE.legendary },
              { l: '클리어', v: b.clears || 0, c: PALETTE.green },
              { l: '사망', v: b.deaths || 0, c: PALETTE.accent },
              { l: '캐릭터', v: b.runs || 0, c: PALETTE.ice },
            ].map(x => (
              <div key={x.l} className="px-2 py-2 text-center" style={{ borderRadius: 'var(--r-chip, 8px)', background: PALETTE.panel, border: `1px solid ${PALETTE.panelBorder}` }}>
                <div className="text-[11px]" style={{ color: PALETTE.textDim }}>{x.l}</div>
                <div className="text-[14px] font-bold tabular-nums" style={{ color: x.c }}>{x.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ===== 안내 ===== */}
        <div className="px-3 py-2.5 space-y-1.5" style={{ borderRadius: 'var(--r-panel, 18px)', background: PALETTE.panel, border: `1px solid ${PALETTE.panelBorder}` }}>
          <div className="text-[11px] tracking-[0.2em]" style={{ color: PALETTE.dawn }}>{BURIED_DUNGEON.name} — {BURIED_DUNGEON.floors}층</div>
          <div className="text-[12px] leading-relaxed" style={{ color: PALETTE.textDim }}>
            {BURIED_DUNGEON.desc}<br />
            <b style={{ color: PALETTE.text }}>장비 6칸이 곧 스킬 6개다.</b> 장비를 바꾸지 않으면 새로운 수를 쓸 수 없다.
            SP는 턴마다 회복하며, 기본 공격은 SP를 되돌려준다.
          </div>
          <BuriedTierLegend />
        </div>
      </div>

      {/* 장비 관리 */}
      {manage && char && (
        <BuriedManage char={char} dust={b.dust || 0}
          onUpdate={(next, dustGain) => onUpdateChar(next, dustGain)}
          onClose={() => setManage(false)} />
      )}

      {/* 은퇴 확인 */}
      {confirmRetire && char && (
        <div className="absolute inset-0 z-50 flex items-center justify-center px-6" style={{ background: 'rgba(0,0,0,0.78)' }}>
          <div className="w-full px-4 py-4" style={{ borderRadius: 'var(--r-panel, 18px)', background: PALETTE.bgDeep, border: `1px solid ${PALETTE.accent}66` }}>
            <div className="text-[13px] font-bold flex items-center gap-1.5 mb-1.5" style={{ color: PALETTE.accent }}>
              <Skull size={14} /> 이 캐릭터를 묻는다
            </div>
            <div className="text-[12px] leading-relaxed mb-3" style={{ color: PALETTE.textDim }}>
              {cls?.name} Lv.{char.lv}는 사라진다. 사망과 동일하게 장착 장비 일부와 골드 {BURIED_LEGACY_GOLD_PCT}%만 유산으로 남는다.
              <b style={{ color: PALETTE.text }}> 되돌릴 수 없다.</b>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setConfirmRetire(false); onRetire(buildBuriedLegacy(char)); }}
                className="ui-press flex-1 py-2.5 text-[12px] font-bold"
                style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.accent, color: '#fff' }}>묻는다</button>
              <button onClick={() => setConfirmRetire(false)} className="ui-press flex-1 py-2.5 text-[12px]"
                style={{ borderRadius: 'var(--r-btn, 13px)', background: PALETTE.panelLight, color: PALETTE.text, border: `1px solid ${PALETTE.panelBorder}` }}>취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
