// ============================================
// components/AutoHuntOverlay.jsx — 자동 사냥 대기화면 (1.81.0~)
// ============================================
// PM 요청: 자동 사냥 중엔 화면이 휙휙 넘어가는 대신 차분한 상태창만 표시.
//   - 능력치 4종 / 활성 패시브(최대 5종) / 유물 / 재화·획득 현황 / 런 정산
//   - 컨트롤: 배속 ×1/×5/×10 · 던전 반복 · 관전(대기화면 숨김) · 자동 해제
// 오버레이는 화면 위에 덮일 뿐 — 실제 진행(전투·이벤트·보상)은 밑에서 계속 돈다.
// PhoneFrame persistent 레이어에서 렌더 (화면 전환 리마운트 제외).
// ============================================

import React, { useState } from 'react';
import { PALETTE, formatRunTime } from '../utils/helpers.js';
import { PASSIVE_SKILLS, ULTIMATE_SKILLS } from '../data.js';
import { GlassPanel, Chip } from './ui/CommonUI.jsx';
import CardInfoModal, { buildPassiveInfo, buildRelicInfo } from './CardInfoModal.jsx';

// 픽한 각성 스킬 id → { skillName(소속 패시브), ult } 조회
function findUltimate(ultId) {
  for (const skillName in ULTIMATE_SKILLS) {
    const ult = ULTIMATE_SKILLS[skillName].find(u => u.id === ultId);
    if (ult) return { skillName, ult };
  }
  return null;
}

// 각성 스킬 정보 모달 데이터 (CardInfoModal 공용 포맷)
function buildAwakeningInfo(skillName, ult) {
  return {
    kind: 'ultimate',
    color: ult.color,
    tag: '★ 각성 스킬',
    title: ult.name,
    badge: skillName,
    subtitle: ult.desc,
  };
}

// 1.83.0~ 자동 사냥 종료 요약 모달 — 세션(자동 ON~OFF) 동안 모든 런 합산
export function AutoHuntSummaryModal({ summary, onClose }) {
  if (!summary) return null;
  const topSources = Object.entries(summary.bySource || {}).sort((a, b) => b[1] - a[1]).slice(0, 5);
  return (
    <div className="absolute inset-0 flex items-center justify-center px-4" style={{ zIndex: 85, background: 'rgba(0,0,0,0.85)' }} onClick={onClose}>
      <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()} style={{
        background: PALETTE.panel, borderRadius: 16,
        border: `2px solid ${PALETTE.legendary}`, boxShadow: `0 0 30px ${PALETTE.legendary}50`,
      }}>
        <div className="px-4 py-3 text-center" style={{ borderBottom: `1px solid ${PALETTE.legendary}40` }}>
          <div className="tracking-[0.3em]" style={{ fontSize: 10, color: PALETTE.textDim }}>━ 자동 사냥 결과 ━</div>
          <div className="font-bold mt-1" style={{ fontSize: 16, color: PALETTE.legendary, fontFamily: '"Cinzel", serif' }}>
            총 {summary.runCount}런
          </div>
          <div className="tabular-nums mt-0.5" style={{ fontSize: 10.5, color: PALETTE.textDim }}>
            클리어 <span style={{ color: PALETTE.green }}>{summary.clears}</span> · 전멸 <span style={{ color: '#e05248' }}>{summary.defeats}</span> · 전투 {summary.battles}회
          </div>
        </div>
        <div className="px-4 py-3">
          <div className="flex justify-between items-baseline mb-1.5">
            <span style={{ fontSize: 10, color: PALETTE.textDim }}>총 데미지</span>
            <span className="tabular-nums font-bold" style={{ fontSize: 13, color: PALETTE.legendary }}>{summary.totalDmg}</span>
          </div>
          {topSources.map(([src, dmg]) => (
            <div key={src} className="flex items-center gap-2" style={{ marginTop: 3 }}>
              <span className="flex-none truncate" style={{ width: 80, fontSize: 10, color: PALETTE.text }}>{src}</span>
              <div className="flex-1" style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.max(4, (dmg / Math.max(1, summary.totalDmg)) * 100)}%`, borderRadius: 999, background: `linear-gradient(90deg, ${PALETTE.legendary}77, ${PALETTE.legendary})` }} />
              </div>
              <span className="flex-none tabular-nums text-right" style={{ width: 44, fontSize: 9.5, color: PALETTE.textDim }}>{Math.round((dmg / Math.max(1, summary.totalDmg)) * 100)}%</span>
            </div>
          ))}
          <div className="flex justify-center gap-4 mt-3 pt-2.5 tabular-nums" style={{ fontSize: 11.5, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <span style={{ color: PALETTE.dawn }}>● 은화 +{summary.gold}</span>
            <span style={{ color: PALETTE.twilight }}>◆ 보석 +{summary.gem}</span>
            <span style={{ color: PALETTE.legendary }}>✦ 영혼 +{summary.souls}</span>
          </div>
        </div>
        <div className="px-4 pb-4">
          <button onClick={onClose} className="ui-press ui-sheen w-full" style={{
            height: 42, borderRadius: 'var(--r-btn)', fontSize: 12, fontWeight: 700, letterSpacing: '0.2em',
            background: 'linear-gradient(160deg, rgba(232,176,74,0.4), rgba(232,176,74,0.16))',
            border: '1px solid rgba(232,176,74,0.6)', color: '#ffe9d2',
          }}>▸ 확인</button>
        </div>
      </div>
    </div>
  );
}

const SCREEN_LABELS = {
  map: '노드 이동 중', combat: '전투 중', victory: '전투 승리', reward: '보상 선택 중',
  event: '사건 진행 중', shop: '상점 이용 중', rest: '정비 중', forge: '대장간',
  prep: '전투 준비 중', reselect: '전투 준비 중', chapterClear: '챕터 클리어',
  expeditionClear: '원정 클리어 — 곧 재출정', bossIntro: '보스 조우',
};

const STAT_KEYS = ['근력', '민첩', '지능', '매력'];
const STAT_COLORS = { 근력: '#c4453d', 민첩: '#7a9a5e', 지능: '#7ba3c4', 매력: '#c46ba3' };

export default function AutoHuntOverlay({
  classData, hp, maxHp, stats = {}, skills = {}, activeSkills = null,
  relics = [], activeRelicNames = null, ultimates = [], gold = 0, gem = 0, runSouls = 0,
  expedition, chapter, screen, runStats = null, autoRunCount = 0, runTimeMs = null, combatLive = null,
  autoSpeed = 1, onCycleSpeed, runRepeat = false, onToggleRepeat = null,
  onWatch, onStop,
}) {
  // 1.82.0~ 스킬·유물·각성 탭 시 정보 모달 (PM 요청)
  const [modalInfo, setModalInfo] = useState(null);
  const pickedUltimates = (ultimates || []).map(findUltimate).filter(Boolean);
  const hpRatio = maxHp > 0 ? hp / maxHp : 0;
  // 활성 패시브 — prep 미확정(null)이면 보유 전체 표시
  const owned = Object.entries(skills).filter(([n, lv]) => lv > 0 && PASSIVE_SKILLS[n]).map(([n]) => n);
  const shownPassives = (activeSkills && activeSkills.length > 0 ? activeSkills : owned).slice(0, 8);
  const isRelicActive = (name) => (activeRelicNames ? activeRelicNames.includes(name) : true);
  const topSources = runStats ? Object.entries(runStats.bySource).sort((a, b) => b[1] - a[1]).slice(0, 3) : [];

  return (
    <div className="absolute inset-0 flex flex-col" style={{ zIndex: 70, background: `radial-gradient(120% 50% at 50% -10%, rgba(232,176,74,0.12), transparent), ${PALETTE.bgDeep}` }}>
      {/* 헤더 */}
      <div className="px-4 pt-4 pb-2 flex-none text-center">
        <div className="tracking-[0.35em] font-bold" style={{ fontSize: 11, color: PALETTE.legendary }}>
          ⚙ 자동 사냥 진행 중{autoRunCount > 0 && <span className="tabular-nums" style={{ letterSpacing: '0.05em' }}> — {autoRunCount}번째 런</span>}
        </div>
        <div className="mt-1" style={{ fontSize: 10.5, color: PALETTE.textDim }}>
          {expedition?.name}{chapter ? ` · ${chapter.name}` : ''} — <span style={{ color: PALETTE.dawn }}>{SCREEN_LABELS[screen] || '진행 중'}</span>
          <span style={{ marginLeft: 4, color: PALETTE.legendary }}>●</span>
        </div>
        {/* 1.88.0~ Wake Lock 안내 — 화면 꺼짐 방지 (지원 브라우저에서만) */}
        <div className="mt-1" style={{ fontSize: 9, color: PALETTE.textDim, opacity: 0.8 }}>
          {('wakeLock' in navigator)
            ? '🔆 화면 꺼짐 방지 활성 — 앱을 켜둔 채 두면 계속 진행됩니다'
            : '⚠ 이 브라우저는 화면 유지 미지원 — 화면이 꺼지면 진행이 멈춥니다'}
          {' '}(다른 앱으로 나가면 OS 정책상 일시 정지)
        </div>
      </div>

      {/* 본문 (스크롤) */}
      <div className="flex-1 overflow-y-auto px-4 pb-2 flex flex-col gap-2" style={{ minHeight: 0 }}>
        {/* 캐릭터 + HP + 재화 */}
        <GlassPanel style={{ borderRadius: 13, padding: '10px 12px' }}>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-semibold" style={{ fontSize: 12.5, color: PALETTE.text }}>{classData?.name}</span>
            <span className="ml-auto tabular-nums" style={{ fontSize: 10.5, color: PALETTE.textDim }}>HP {hp}/{maxHp}</span>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
            <div className="transition-all" style={{
              height: '100%', width: `${hpRatio * 100}%`, borderRadius: 999,
              background: hpRatio > 0.35 ? 'linear-gradient(90deg, #6a8a4e, #9ad4a3)' : 'linear-gradient(90deg, #8f2c24, #e05248)',
            }} />
          </div>
          <div className="flex gap-1.5 mt-2 flex-wrap">
            <Chip color={PALETTE.dawn} style={{ height: 20 }}>● <span className="tabular-nums">{gold}</span></Chip>
            <Chip color={PALETTE.ice} style={{ height: 20 }}>◆ <span className="tabular-nums">{gem}</span></Chip>
            <Chip color={PALETTE.legendary} style={{ height: 20 }}>✦ 이번 런 <span className="tabular-nums">+{runSouls}</span></Chip>
          </div>
        </GlassPanel>

        {/* 1.100.0~ 전투 현황 (PM 지시: 능력치 대신 전투 스테이터스 — 기여도는 종료 요약에서만) */}
        <GlassPanel style={{ borderRadius: 13, padding: '9px 12px' }}>
          <div className="flex justify-between items-baseline" style={{ marginBottom: 5 }}>
            <span style={{ fontSize: 9.5, color: PALETTE.textDim }}>전투 현황</span>
            {runTimeMs != null && (
              <span className="tabular-nums" style={{ fontSize: 10, color: PALETTE.dawn }}>⏱ {formatRunTime(runTimeMs)} <span style={{ color: PALETTE.textDim }}>(×1 기준)</span></span>
            )}
          </div>
          <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
            <span style={{ fontSize: 9.5, color: PALETTE.textDim, width: 18 }}>HP</span>
            <div className="flex-1" style={{ height: 7, borderRadius: 999, background: 'rgba(0,0,0,0.55)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${maxHp > 0 ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 0}%`, borderRadius: 999,
                background: hp / Math.max(1, maxHp) > 0.5 ? 'linear-gradient(90deg, #7a9a5e88, #9ad4a3)' : hp / Math.max(1, maxHp) > 0.25 ? 'linear-gradient(90deg, #d4a57488, #e8b04a)' : 'linear-gradient(90deg, #8b1f1f88, #c4453d)',
                transition: 'width 0.3s',
              }} />
            </div>
            <span className="tabular-nums" style={{ fontSize: 10.5, color: PALETTE.text }}>{hp}/{maxHp}</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 text-center">
            {[
              ['전투', `${runStats?.battles || 0}회`, PALETTE.accent],
              ['은화', `+${runStats?.gold || 0}`, PALETTE.dawn],
              ['보석', `+${runStats?.gem || 0}`, PALETTE.ice],
              ['영혼', `+${runStats?.souls || 0}`, PALETTE.legendary],
            ].map(([label, val, color]) => (
              <div key={label} style={{ borderRadius: 9, padding: '5px 0', background: `${color}12`, border: `1px solid ${color}44` }}>
                <div style={{ fontSize: 9, color }}>{label}</div>
                <div className="tabular-nums font-bold" style={{ fontSize: 12, color: PALETTE.text }}>{val}</div>
              </div>
            ))}
          </div>
        </GlassPanel>

        {/* 1.100.1~ 전투 스테이터스 (PM 지시 — ≡ 스테이터스 모달과 동일 항목·산식, 전투 중 실시간) */}
        {combatLive && (() => {
          const L = combatLive;
          const Row = ({ label, val, color }) => (
            <div className="flex justify-between" style={{ color: PALETTE.textDim, fontSize: 11 }}>
              <span>{label}</span><span className="font-bold tabular-nums" style={{ color }}>{val}</span>
            </div>
          );
          return (
            <GlassPanel style={{ borderRadius: 13, padding: '9px 12px' }}>
              <div className="flex justify-between items-baseline" style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 9.5, color: L.classColor || PALETTE.dawn, fontWeight: 700, letterSpacing: '0.2em' }}>━ 전투 스테이터스 ━</span>
                {L.enemyName && L.enemyHp && (
                  <span className="tabular-nums" style={{ fontSize: 9.5, color: PALETTE.accent }}>vs {L.enemyName} {L.enemyHp[0]}/{L.enemyHp[1]}</span>
                )}
              </div>
              {/* 체력 / 에테르 / 방어 (+소울) */}
              <div className="grid grid-cols-3 gap-1.5 mb-2">
                {[
                  ['체력', `${L.hp}/${L.maxHp}`, '#8b1f1f'],
                  ['에테르', `${L.ether}/${L.maxEther}`, '#5c4a8c'],
                  ['방어', `${L.defense}${L.soulGauge != null ? ` · 소울 ${L.soulGauge}` : ''}`, '#7ba3c4'],
                ].map(([label, val, color]) => (
                  <div key={label} className="px-2 py-1" style={{ borderRadius: 9, background: `${color}20`, border: `1px solid ${color}60` }}>
                    <div style={{ fontSize: 8.5, color: PALETTE.textDim }}>{label}</div>
                    <div className="font-bold tabular-nums" style={{ fontSize: 11.5, color: PALETTE.text }}>{val}</div>
                  </div>
                ))}
              </div>
              {/* 활성 상태 */}
              {L.chips.length > 0 && (
                <div className="flex gap-1 flex-wrap mb-2">
                  {L.chips.map((c, i) => (
                    <span key={i} className="text-[9.5px] px-1.5 py-0.5" style={{ borderRadius: 999, background: `${c.c}30`, color: '#fff', border: `1px solid ${c.c}` }}>{c.t}</span>
                  ))}
                </div>
              )}
              {/* 전투 수치 */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mb-1.5">
                <Row label="치명타 발동율" val={`${L.combat.critRate}%`} color={PALETTE.legendary} />
                <Row label="치명타 데미지" val={`+${L.combat.critDmg}%`} color={PALETTE.legendary} />
                <Row label="회피 발동율" val={`${L.combat.dodgeRate}%`} color={PALETTE.green} />
                {L.combat.counterRate > 0 && <Row label="반격 발동율" val={`${L.combat.counterRate}%`} color={PALETTE.accent} />}
                {L.combat.igniteRate > 0 && <Row label="화염 각인 발동율" val={`${L.combat.igniteRate}%`} color="#d97706" />}
              </div>
              {/* 데미지 보정 */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mb-1.5">
                {L.dmg.physBonus > 0 && <Row label="물리 데미지" val={`+${L.dmg.physBonus}`} color={PALETTE.accent} />}
                {L.dmg.magicBonus > 0 && <Row label="마법 데미지" val={`+${L.dmg.magicBonus}%`} color={PALETTE.twilight} />}
                {L.dmg.bleedBonus > 0 && <Row label="출혈 데미지" val={`+${L.dmg.bleedBonus}%`} color={PALETTE.bleed} />}
                {L.dmg.counterDmgBonus > 0 && <Row label="반격 데미지" val={`+${L.dmg.counterDmgBonus}%`} color={PALETTE.accent} />}
                {L.dmg.allDmgBonus > 0 && <Row label="모든 데미지" val={`+${L.dmg.allDmgBonus}%`} color={PALETTE.legendary} />}
                {L.dmg.rage > 0 && <Row label="분노 버프" val={`+${L.dmg.rage}%`} color={PALETTE.accent} />}
                {L.dmg.dmgTakenReduce > 0 && <Row label="받는 데미지" val={`-${L.dmg.dmgTakenReduce}%`} color={PALETTE.green} />}
                {L.dmg.dmgDealtCurse > 0 && <Row label="저주: 가하는 데미지" val={`-${L.dmg.dmgDealtCurse}%`} color={PALETTE.twilight} />}
                {L.dmg.dmgTakenCurse > 0 && <Row label="저주: 받는 피해" val={`+${L.dmg.dmgTakenCurse}%`} color={PALETTE.twilight} />}
              </div>
              {/* 기타 효과 */}
              {(L.misc.regenLv > 0 || L.misc.lifesteal > 0 || L.misc.reflect > 0 || L.misc.heal > 0 || L.misc.charismaHeal > 0 || L.misc.cdReduce > 0 || L.misc.magicEcho > 0) && (
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                  {L.misc.regenLv > 0 && <Row label="HP 자동 회복" val={`+${L.misc.regenLv}/턴`} color={PALETTE.green} />}
                  {L.misc.lifesteal > 0 && <Row label="흡혈" val={`+${L.misc.lifesteal}`} color={PALETTE.accent} />}
                  {L.misc.reflect > 0 && <Row label="데미지 반사" val={`${L.misc.reflect}%`} color={PALETTE.accent} />}
                  {L.misc.heal > 0 && <Row label="회복량 보너스" val={`+${L.misc.heal}%`} color={PALETTE.green} />}
                  {L.misc.charismaHeal > 0 && <Row label="매력 시그: 회복" val={`+${L.misc.charismaHeal}%`} color={PALETTE.dawn} />}
                  {L.misc.cdReduce > 0 && <Row label="쿨다운 감소" val={`-${L.misc.cdReduce}턴`} color={PALETTE.twilight} />}
                  {L.misc.magicEcho > 0 && <Row label="마법 재시전 확률" val={`${L.misc.magicEcho}%`} color={PALETTE.legendary} />}
                </div>
              )}
            </GlassPanel>
          );
        })()}

        {/* 활성 패시브 */}
        <GlassPanel style={{ borderRadius: 13, padding: '9px 12px' }}>
          <div style={{ fontSize: 9.5, color: PALETTE.textDim, marginBottom: 5 }}>
            패시브 {activeSkills && activeSkills.length > 0 ? `(활성 ${shownPassives.length}종)` : '(보유 — 준비 노드에서 확정)'}
          </div>
          {shownPassives.length === 0 ? (
            <div style={{ fontSize: 10.5, color: PALETTE.textDim }}>보유 패시브 없음</div>
          ) : (
            <div className="flex gap-1.5 flex-wrap">
              {shownPassives.map(name => (
                <button key={name} onClick={() => setModalInfo(buildPassiveInfo(name, skills[name] || 0))} className="ui-press" style={{ background: 'transparent', border: 'none', padding: 0 }}>
                  <Chip color={PASSIVE_SKILLS[name]?.color || PALETTE.dawn} style={{ height: 21 }}>
                    {name} <span className="tabular-nums">Lv.{skills[name] || 0}</span> ◇
                  </Chip>
                </button>
              ))}
            </div>
          )}
        </GlassPanel>

        {/* 1.82.0~ 각성 스킬 (픽한 ULTIMATE_SKILLS) — 탭 시 정보 모달 */}
        {pickedUltimates.length > 0 && (
          <GlassPanel style={{ borderRadius: 13, padding: '9px 12px' }}>
            <div style={{ fontSize: 9.5, color: PALETTE.textDim, marginBottom: 5 }}>★ 각성 스킬 ({pickedUltimates.length})</div>
            <div className="flex gap-1.5 flex-wrap">
              {pickedUltimates.map(({ skillName, ult }) => (
                <button key={ult.id} onClick={() => setModalInfo(buildAwakeningInfo(skillName, ult))} className="ui-press" style={{ background: 'transparent', border: 'none', padding: 0 }}>
                  <Chip color={ult.color || PALETTE.legendary} style={{ height: 21 }}>
                    ★ {ult.name} ◇
                  </Chip>
                </button>
              ))}
            </div>
          </GlassPanel>
        )}

        {/* 유물 */}
        <GlassPanel style={{ borderRadius: 13, padding: '9px 12px' }}>
          <div style={{ fontSize: 9.5, color: PALETTE.textDim, marginBottom: 5 }}>유물 ({relics.length})</div>
          {relics.length === 0 ? (
            <div style={{ fontSize: 10.5, color: PALETTE.textDim }}>보유 유물 없음</div>
          ) : (
            <div className="flex gap-1.5 flex-wrap">
              {relics.map((r, i) => (
                <button key={`${r.name}-${i}`} onClick={() => setModalInfo(buildRelicInfo(r))} className="ui-press" style={{ background: 'transparent', border: 'none', padding: 0 }}>
                  <Chip color={r.color || PALETTE.dawn} style={{ height: 21, opacity: isRelicActive(r.name) ? 1 : 0.45 }}>
                    {r.name}{!isRelicActive(r.name) && ' (비활성)'} ◇
                  </Chip>
                </button>
              ))}
            </div>
          )}
        </GlassPanel>

        {/* 런 정산 (누적) */}
        {runStats && runStats.battles > 0 && (
          <GlassPanel style={{ borderRadius: 13, padding: '9px 12px' }}>
            <div className="flex justify-between items-baseline" style={{ marginBottom: 5 }}>
              <span style={{ fontSize: 9.5, color: PALETTE.textDim }}>이번 런 정산</span>
              <span className="tabular-nums" style={{ fontSize: 10, color: PALETTE.text }}>
                전투 {runStats.battles}회 · 총 <b style={{ color: PALETTE.legendary }}>{runStats.totalDmg}</b> 데미지
              </span>
            </div>
            {topSources.map(([src, dmg]) => (
              <div key={src} className="flex items-center gap-2" style={{ marginTop: 3 }}>
                <span className="flex-none truncate" style={{ width: 76, fontSize: 9.5, color: PALETTE.text }}>{src}</span>
                <div className="flex-1" style={{ height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.max(4, (dmg / Math.max(1, runStats.totalDmg)) * 100)}%`, borderRadius: 999, background: `linear-gradient(90deg, ${PALETTE.legendary}77, ${PALETTE.legendary})` }} />
                </div>
                <span className="flex-none tabular-nums text-right" style={{ width: 40, fontSize: 9, color: PALETTE.textDim }}>{Math.round((dmg / Math.max(1, runStats.totalDmg)) * 100)}%</span>
              </div>
            ))}
            <div className="flex gap-3 mt-2 pt-1.5 tabular-nums" style={{ fontSize: 9.5, color: PALETTE.textDim, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ color: PALETTE.dawn }}>● +{runStats.gold}</span>
              <span style={{ color: PALETTE.twilight }}>◆ +{runStats.gem}</span>
              <span style={{ color: PALETTE.legendary }}>✦ +{runStats.souls}</span>
            </div>
          </GlassPanel>
        )}
      </div>

      {/* 하단 컨트롤 */}
      <div className="p-3 flex-none flex gap-2" style={{ borderTop: '1px solid var(--ui-line)', background: PALETTE.bgDeep }}>
        <button onClick={onCycleSpeed} className="ui-press flex-1 tabular-nums" style={{
          height: 42, borderRadius: 'var(--r-btn)', fontSize: 11.5, fontWeight: 700,
          background: autoSpeed > 1 ? 'rgba(123,163,196,0.18)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${autoSpeed > 1 ? `${PALETTE.ice}aa` : 'var(--ui-line)'}`,
          color: autoSpeed > 1 ? PALETTE.ice : PALETTE.textDim,
        }}>⚡ ×{autoSpeed}</button>
        {onToggleRepeat && (
          <button onClick={onToggleRepeat} className="ui-press flex-1" style={{
            height: 42, borderRadius: 'var(--r-btn)', fontSize: 11.5, fontWeight: 700,
            background: runRepeat ? 'rgba(154,212,163,0.16)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${runRepeat ? PALETTE.green : 'var(--ui-line)'}`,
            color: runRepeat ? PALETTE.green : PALETTE.textDim,
          }}>⟳ 반복 {runRepeat ? 'ON' : 'OFF'}</button>
        )}
        <button onClick={onWatch} className="ui-press flex-1" style={{
          height: 42, borderRadius: 'var(--r-btn)', fontSize: 11.5,
          background: 'rgba(255,255,255,0.04)', border: '1px solid var(--ui-line)', color: PALETTE.textDim,
        }}>👁 관전</button>
        <button onClick={onStop} className="ui-press flex-1" style={{
          height: 42, borderRadius: 'var(--r-btn)', fontSize: 11.5, fontWeight: 700,
          background: 'rgba(232,176,74,0.14)', border: `1px solid ${PALETTE.legendary}88`, color: PALETTE.legendary,
        }}>⏸ 자동 해제</button>
      </div>

      {/* 스킬·유물·각성 정보 모달 */}
      {modalInfo && <CardInfoModal info={modalInfo} onClose={() => setModalInfo(null)} />}
    </div>
  );
}
