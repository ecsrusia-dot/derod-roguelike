// ===== 훈련장 (1.306.0) — 체력 무한 허수아비 설정 화면 =====
// 구성(1명·3명·보스) · 포지션 · 레벨 · 보스 · 공격 켬/끔 · 측정 라운드. 설정은 localStorage에 남는다 (저장·보상 영향 없음)
import React, { useState } from 'react';
import { PALETTE } from '../../utils/helpers.js';
import { CHRONICLE_FIELDS, BOSS_MECHS, chronicleEnemyArt } from '../data.js';
import { CENEMIES as ENEMIES } from '../enemies.js';
import * as E from '../engine.js';
import * as TR from '../training.js';
import { Header, MainSecHead, MainCell, MS } from './common.jsx';

const KEY = 'chronicleTraining';
export function readTrainingCfg(heroLv) {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { raw = null; }
  return TR.normTraining(raw, heroLv);
}
function writeTrainingCfg(c) { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* 저장 실패는 무시 */ } }

function Pick({ items, value, onPick, cols }) {
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols || items.length}, 1fr)` }}>
      {items.map(([id, label, sub, off]) => {
        const on = id === value;
        return (
          <button key={String(id)} disabled={off} onClick={() => onPick(id)} className="ui-press text-center" style={{ minHeight: 44, padding: '6px 4px', borderRadius: 12, border: `1px solid ${on ? MS.gold : MS.line}`, background: on ? 'rgba(232,176,74,0.14)' : MS.box, color: on ? MS.gold : PALETTE.text, opacity: off ? 0.35 : 1 }}>
            <div className="font-bold truncate" style={{ fontSize: 13 }}>{label}</div>
            {sub ? <div className="truncate" style={{ fontSize: 11, color: PALETTE.textDim }}>{sub}</div> : null}
          </button>
        );
      })}
    </div>
  );
}

export function TrainingView({ save, onBack, onStart }) {
  const hero = save.units[save.hero];
  const [cfg, setCfg0] = useState(() => readTrainingCfg(hero.lv));
  const setCfg = (patch) => setCfg0(c => { const n = TR.normTraining({ ...c, ...patch }, hero.lv); writeTrainingCfg(n); return n; });
  const gap = cfg.lv - hero.lv;
  const intim = E.intimidateLevel(hero.lv, cfg.lv);
  const bossF = CHRONICLE_FIELDS[cfg.fieldId - 1];
  const mech = cfg.form === 'boss' ? BOSS_MECHS[E.bossMechOf('field', cfg.fieldId)] : null;
  const art = cfg.form === 'boss' ? chronicleEnemyArt(bossF.boss) : null;
  const lvBtn = (d, label) => <button key={label} onClick={() => setCfg({ lv: cfg.lv + d })} className="ui-press" style={{ height: 40, borderRadius: 10, border: `1px solid ${MS.line}`, background: MS.box, color: PALETTE.text, fontSize: 12.5 }}>{label}</button>;
  return (
    <div className="flex flex-col h-full">
      <Header title="훈련장" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-2">
        <div className="flex-none" style={{ padding: '9px 11px', borderRadius: MS.r, border: `1px solid ${MS.line}`, background: MS.box, fontSize: 12.5, color: PALETTE.textDim, lineHeight: 1.55 }}>
          체력이 <b style={{ color: MS.gold }}>무한</b>인 허수아비를 정해진 라운드 동안 때려 <b style={{ color: PALETTE.text }}>피해량</b>을 잰다. 보상·경험치·기록은 없고 저장도 바뀌지 않는다.
        </div>

        <MainSecHead title="구 성" />
        <Pick items={TR.TRAIN_FORMS.map(f => [f.id, f.label, f.desc.split(' — ')[1]])} value={cfg.form} onPick={(form) => setCfg({ form })} />

        {cfg.form !== 'boss' ? <>
          <MainSecHead title="포 지 션" />
          <Pick items={TR.TRAIN_ROLES.map(r => [r.id, r.label, r.desc.split(' · ')[0], r.id === 'mix' && cfg.form !== 'pack'])} value={cfg.role} onPick={(role) => setCfg({ role })} />
          <div style={{ fontSize: 11.5, color: PALETTE.textDim }}>{TR.TRAIN_ROLES.find(r => r.id === cfg.role).desc}{cfg.attack ? '' : ' · 공격을 끄면 도발·치유도 하지 않는다 (방어 수치만 반영)'}</div>
        </> : <>
          <MainSecHead title="보 스" />
          <Pick cols={3} items={TR.trainBossFields().map(f => [f.id, ENEMIES[f.boss]?.name.split(' ').slice(-1)[0] || f.name, `${f.name}`])} value={cfg.fieldId} onPick={(fieldId) => setCfg({ fieldId, lv: CHRONICLE_FIELDS[fieldId - 1].bossLv })} />
          <div className="flex gap-2 items-center flex-none" style={{ padding: 8, borderRadius: MS.r, border: `1px solid ${MS.line}`, background: MS.box }}>
            {art ? <img src={art} alt="" className="flex-none object-cover" style={{ width: 64, height: 64, borderRadius: 10, objectPosition: '50% 25%' }} /> : null}
            <div className="min-w-0" style={{ fontSize: 12.5, color: PALETTE.text, lineHeight: 1.5 }}>
              <b style={{ color: MS.gold }}>{ENEMIES[bossF.boss]?.name}</b>
              {mech ? <div style={{ color: PALETTE.textDim }}>{mech.icon} <b style={{ color: PALETTE.text }}>{mech.name}</b> — {mech.desc}</div> : <div style={{ color: PALETTE.textDim }}>기믹 없음</div>}
              <div style={{ fontSize: 11.5, color: PALETTE.textDim }}>보스만 체력 무한 · 수행원은 원래 체력{cfg.attack ? '' : ' · 공격을 끄면 기믹도 멈춘다'}</div>
            </div>
          </div>
        </>}

        <MainSecHead title="레 벨" />
        <div className="grid gap-1.5 flex-none" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <MainCell label="허수아비" value={`Lv.${cfg.lv}`} hot />
          <MainCell label="내 레벨" value={`Lv.${hero.lv}`} />
          <MainCell label="차이" value={gap ? `${gap > 0 ? '+' : ''}${gap}` : '같음'} color={intim ? '#ff8a7e' : null} />
        </div>
        <input type="range" min={TR.TRAINING.lvMin} max={TR.TRAINING.lvMax} value={cfg.lv} onChange={(e) => setCfg({ lv: +e.target.value })} aria-label="허수아비 레벨" className="w-full flex-none" style={{ accentColor: MS.gold, height: 28 }} />
        <div className="grid gap-1.5 flex-none" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
          {lvBtn(-10, '−10')}{lvBtn(-1, '−1')}
          <button onClick={() => setCfg({ lv: hero.lv })} className="ui-press" style={{ height: 40, borderRadius: 10, border: `1px solid ${MS.gold}`, background: 'rgba(232,176,74,0.1)', color: MS.gold, fontSize: 12.5, fontWeight: 700 }}>내 레벨</button>
          {lvBtn(1, '+1')}{lvBtn(10, '+10')}
        </div>
        <div style={{ fontSize: 11.5, color: intim ? '#ff8a7e' : PALETTE.textDim }}>
          적 방어 = 레벨 × 1.2 (지금 {Math.round(cfg.lv * 1.2)}) — 레벨이 높을수록 내 피해가 줄어든다.{intim ? ` 레벨 차 +${gap} → 위압 ${intim}단계: 공격을 켜면 적 공격이 강해진다.` : ''}
        </div>

        <MainSecHead title="상 대 공 격" />
        <Pick items={[[false, '끔', '맞지 않고 때리기만'], [true, '켬', '실전처럼 공격·기믹']]} value={cfg.attack} onPick={(attack) => setCfg({ attack })} />
        <div style={{ fontSize: 11.5, color: PALETTE.textDim }}>반격·흡혈·잃은 체력 비례처럼 <b style={{ color: PALETTE.text }}>맞아야 발동하는 효과</b>는 공격을 켜야 잰다. 켠 채로 쓰러지면 그 라운드에서 측정이 끝난다.</div>

        <MainSecHead title="측 정 라 운 드" />
        <Pick items={TR.TRAINING.rounds.map(r => [r, `${r}R`, null])} value={cfg.rounds} onPick={(rounds) => setCfg({ rounds })} />
      </div>
      <div className="flex-none px-3 pb-3 pt-2" style={{ borderTop: `1px solid ${MS.line}` }}>
        <div className="truncate text-center mb-1.5" style={{ fontSize: 11.5, color: PALETTE.textDim }}>{TR.trainingLabel(cfg)} · {cfg.rounds}라운드</div>
        <button onClick={() => onStart(cfg)} className="ui-press chr-btn-pri w-full" style={{ height: 48, fontSize: 15, fontWeight: 800 }}>🎯 측정 시작</button>
      </div>
    </div>
  );
}
