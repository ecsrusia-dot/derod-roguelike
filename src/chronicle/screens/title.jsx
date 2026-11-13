// ============================================
// chronicle/screens/title.jsx — 황혼 연대기 · 타이틀 · 출정 · 백업 · 이야기 장면 · 오프라인 보상
// ============================================
// 1.280.2 뒤 화면 파일 분할 — ChronicleGame.jsx에서 그대로 옮긴 코드 (동작 변화 없음).
// ============================================
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PALETTE, withArtRev } from '../../utils/helpers.js';
import { GlassPanel, UIButton, BottomSheet } from '../../components/ui/CommonUI.jsx';
import UpdateButton from '../../components/ui/UpdateButton.jsx';
import { GAME_VERSION } from '../../data/version.js';
import { CHRONICLE_TITLE, CHRONICLE_SUB, CHRONICLE_TUNING, CHRONICLE_CLASSES, CHRONICLE_FIELDS, SLOTS, UNIQUE_ITEMS, chronicleClass, classSkills, describeSkill, chronicleEnemyArt , unitTitle } from '../data.js';
import * as A from '../account.js';
import * as F from '../familiar.js';
import * as O from '../offline.js';
import * as BK from '../backup.js';
import { NPCS } from '../story.js';
import { CENEMIES as ENEMIES } from '../enemies.js';
import { FONT_TITLE, iga, Header, CountUp, Portrait, MainKvRows, MS, MainSecHead, MainModal } from './common.jsx';

// 1.266.0 — 캐릭터 선택 후 게임 진입 연출 (PM 결정: 크로니클 선택 → 캐릭터 선택 → 출정 일러 → 마을)
export function DepartView({ save, onDone }) {
  const hero = save.hero;
  const cls = chronicleClass(hero);
  const u = save.units[hero];
  const fk = save.famTeam?.main;
  const fam = fk && save.fams?.[fk];
  const art = cls.startImage || cls.image;
  useEffect(() => { const t = setTimeout(onDone, 2200); return () => clearTimeout(t); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: PALETTE.bgDeep, cursor: 'pointer', zIndex: 20 }} onClick={onDone}>
      <img src={art} onError={(e) => { if (cls.image && !e.currentTarget.src.endsWith(cls.image.slice(1))) e.currentTarget.src = cls.image; }} alt="" className="chr-result-in absolute inset-0 w-full h-full object-cover" style={{ objectPosition: '50% 20%' }} draggable={false} />
      <div className="absolute left-0 right-0 top-0" style={{ height: 70, background: 'linear-gradient(#000a, transparent)' }} />
      <div className="absolute left-0 right-0 bottom-0" style={{ height: '50%', background: `linear-gradient(transparent, ${PALETTE.bgDeep}e6 70%, ${PALETTE.bgDeep})` }} />
      <div className="absolute left-0 right-0 text-center px-4" style={{ bottom: 58 }}>
        <div className="chr-result-sub" style={{ fontSize: 11, letterSpacing: '0.5em', color: MS.gold }}>━━ D E P A R T ━━</div>
        <div className="chr-result-title font-bold" style={{ fontSize: 42, color: PALETTE.text, fontFamily: FONT_TITLE, textShadow: `0 0 22px ${MS.gold}88, 0 2px 8px #000` }}>출정</div>
        <div className="mx-auto" style={{ height: 2, width: 200, margin: '6px auto 8px', background: `linear-gradient(90deg, transparent, ${MS.gold}, transparent)` }} />
        {cls.quote && <div className="chr-result-sub italic" style={{ fontSize: 13, color: PALETTE.text, textShadow: '0 1px 4px #000', animationDelay: '.5s' }}>「{cls.quote}」</div>}
        <div className="chr-result-sub flex flex-wrap justify-center gap-1.5 mt-2" style={{ animationDelay: '.7s' }}>
          <span className="chr-chip" style={{ color: MS.gold, background: '#000a' }}>Lv.{u?.lv || 1} {unitTitle(u, hero)}{u?.rebirth?.count ? ` · ✦전승 ${u.rebirth.count}` : ''}</span>
          {fam ? <span className="chr-chip" style={{ color: '#d07ae8', background: '#000a' }}>🐾 {F.famName(fk)} Lv.{fam.lv || 1}</span> : null}
        </div>
      </div>
      <div className="absolute left-0 right-0 text-center" style={{ bottom: 20, fontSize: 11.5, color: PALETTE.textDim, opacity: 0.8 }}>누르면 바로 시작</div>
    </div>
  );
}

// ===== 시작 · 캐릭터 슬롯 =====
// 직업당 캐릭터 1명 (최대 5). 재화·열쇠·공용 창고는 모든 캐릭터가 공유한다.
// ===== 저장 백업 (1.236.1) — 내보내기·가져오기·자동 백업 복원 =====
export function fmtWhen(ms) {
  if (!ms) return '알 수 없음';
  const d = new Date(ms); const p = (n) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function SummaryLine({ sm }) {
  return <span>캐릭터 {sm.chars}명 · 최고 Lv.{sm.maxLv} · 🪙{sm.gold.toLocaleString()} · 사역마 {sm.fams} · 창고 {sm.stash}</span>;
}

// 1.255.0 — 본편 카드 창 (시안 ㉟)
const bkBtn = (extra = {}) => ({ height: 42, width: '100%', fontSize: 13, fontWeight: 800, border: `1px solid ${MS.line}`, background: MS.box, color: PALETTE.text, ...extra });

const bkHot = () => ({ border: `1px solid ${MS.red}`, background: 'rgba(224,87,76,0.2)', color: '#ff8a7e' });

function BkSec({ title, right }) {
  return (
    <div className="flex items-center justify-between" style={{ margin: '14px 0 6px' }}>
      <span className="chr-head">{title}</span>
      {right && <span style={{ fontSize: 11.5, color: PALETTE.textDim }}>{right}</span>}
    </div>
  );
}

const summaryRows = (sm) => [
  { l: '캐릭터', v: `${sm.chars}명` }, { l: '최고 레벨', v: `Lv.${sm.maxLv}`, c: MS.gold },
  { l: '골드', v: `🪙 ${sm.gold.toLocaleString()}` }, { l: '사역마 · 창고', v: `${sm.fams} · ${sm.stash}` },
];

function CloudPanel({ api, onPick, setMsg }) {
  const { user, state } = api;
  return (
    <>
      <BkSec title="클라우드 저장" right="다른 기기에서 이어하기" />
      {!user ? (
        <>
          <div style={{ fontSize: 11.5, color: PALETTE.textDim, marginBottom: 6 }}>본편과 같은 구글 계정 · 로그인하면 30초마다 자동 저장</div>
          <button onClick={api.login} className="ui-press" style={bkBtn(bkHot())}>구글 로그인</button>
        </>
      ) : (
        <>
          <MainKvRows rows={[
            { l: '계정', wide: true, v: user.isAnonymous ? '게스트 (이 기기 전용)' : `${user.displayName || ''}${user.email ? ` · ${user.email}` : ''}` },
            { l: '상태', wide: true, v: state.busy ? '동기화 중…' : state.lastUp ? `마지막 저장 ${fmtWhen(state.lastUp)} · 30초마다 자동` : state.checkedUid ? '자동 저장 켜짐' : '클라우드 확인 전 — 자동 저장 대기', c: state.lastUp || state.checkedUid ? '#8fd08a' : PALETTE.textDim },
          ]} />
          {user.isAnonymous && <div style={{ fontSize: 11, color: PALETTE.textDim }}>기기를 바꾸려면 본편에서 구글 계정을 연동하세요</div>}
          <div className="grid gap-1.5 mt-1.5" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <button onClick={async () => { const r = await api.upload(); if (r) setMsg(r.ok ? '클라우드에 저장했습니다' : r.error); }} className="ui-press" style={bkBtn(bkHot())}>⬆ 지금 올리기</button>
            <button onClick={async () => { const r = await api.download(); if (!r) return; if (!r.ok) setMsg(r.error); else if (!r.exists) setMsg('클라우드에 저장된 진행이 없습니다'); else onPick(r); }} className="ui-press" style={bkBtn()}>⬇ 불러오기</button>
          </div>
        </>
      )}
      {state.error ? <div className="mt-1.5" style={{ fontSize: 12, color: '#e06a5f' }}>⚠ {state.error}</div> : null}
    </>
  );
}

function BackupSheet({ acc, onClose, onImport, cloudApi }) {
  const [msg, setMsg] = useState(null);
  const [paste, setPaste] = useState('');
  const [pending, setPending] = useState(null); // 가져올 계정 (확인 대기)
  const fileRef = useRef(null);
  const auto = useMemo(() => BK.backupInfo(), []);
  const download = () => {
    try {
      const blob = new Blob([BK.exportText(acc)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = BK.exportFileName(); document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setMsg('백업 파일을 저장했습니다 (다운로드 폴더 확인)');
    } catch { setMsg('파일 저장에 실패했습니다 — 「텍스트 복사」를 써 주세요'); }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(BK.exportText(acc)); setMsg('백업 텍스트를 복사했습니다 — 메모장 등에 붙여 넣어 보관하세요'); }
    catch { setMsg('복사에 실패했습니다 — 「파일로 저장」을 써 주세요'); }
  };
  const tryImport = (text) => {
    const r = BK.parseImport(text);
    if (r.error) { setMsg(r.error); return; }
    setPending(r);
  };
  const onFile = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const rd = new FileReader(); rd.onload = () => tryImport(rd.result); rd.readAsText(f);
    e.target.value = '';
  };
  const cur = BK.accountSummary(acc);
  if (pending) {
    const sm = BK.accountSummary(pending.acc);
    return (
      <MainModal kicker="IMPORT" title="가져오기 확인" color="#e06a5f" sub="지금 진행이 백업 내용으로 바뀝니다 — 되돌릴 수 없음" onClose={() => setPending(null)}
        footer={<button onClick={() => onImport(pending.acc)} className="ui-press" style={bkBtn(bkHot())}>백업으로 바꾸기</button>}>
        <BkSec title="지금" />
        <MainKvRows rows={summaryRows(cur)} />
        <BkSec title="백업" right={pending.at ? fmtWhen(pending.at) : null} />
        <MainKvRows rows={summaryRows(sm)} />
        <div className="mt-2" style={{ fontSize: 11.5, color: PALETTE.textDim }}>필요하면 먼저 지금 진행을 「파일로 저장」해 두세요.</div>
      </MainModal>
    );
  }
  return (
    <MainModal kicker="SAVE" title="저장 백업" badge={cloudApi?.user ? '☁ 로그인됨' : '☁ 로그인 안 함'} color={MS.red} sub="기본 저장 = 이 기기의 브라우저" onClose={onClose}>
      {cloudApi && <CloudPanel api={cloudApi} onPick={(r) => setPending({ acc: r.acc, at: r.savedAt })} setMsg={setMsg} />}
      <BkSec title="지금 저장" right="내보내기" />
      <MainKvRows rows={summaryRows(cur)} />
      <div className="grid gap-1.5 mt-1.5" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <button onClick={download} className="ui-press" style={bkBtn()}>📥 파일로 저장</button>
        <button onClick={copy} className="ui-press" style={bkBtn()}>📋 텍스트 복사</button>
      </div>
      <BkSec title="가져오기" right="지금 저장을 바꾼다" />
      <input ref={fileRef} type="file" accept=".json,application/json,text/plain" onChange={onFile} style={{ display: 'none' }} />
      <button onClick={() => fileRef.current?.click()} className="ui-press" style={bkBtn()}>📂 백업 파일 선택</button>
      <textarea value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="또는 백업 텍스트를 여기에 붙여 넣기" rows={2} className="w-full mt-1.5" style={{ fontSize: 11.5, padding: 8, background: MS.box, borderRadius: MS.r, color: PALETTE.text, border: `1px solid ${MS.line}`, resize: 'vertical' }} />
      {paste.trim() ? <button onClick={() => tryImport(paste)} className="ui-press mt-1" style={bkBtn()}>붙여 넣은 텍스트로 가져오기</button> : null}
      <BkSec title="자동 백업" right="10분마다" />
      {auto ? (
        <>
          <MainKvRows rows={[{ l: '저장 시각', v: fmtWhen(auto.at) }, { l: '내용', v: `Lv.${auto.summary.maxLv} · 🪙${auto.summary.gold.toLocaleString()}` }]} />
          <button onClick={() => setPending({ acc: auto.acc, at: auto.at })} className="ui-press mt-1.5" style={bkBtn()}>↺ 자동 백업으로 되돌리기</button>
        </>
      ) : <div style={{ fontSize: 12, color: PALETTE.textDim }}>아직 자동 백업이 없습니다 (10분 이상 플레이하면 생깁니다)</div>}
      {msg ? <div className="mt-2" style={{ fontSize: 12, color: PALETTE.dawn }}>{msg}</div> : null}
    </MainModal>
  );
}

export function TitleView({ acc, onSelect, onCreate, onExit, onReset, onImport, cloudApi }) {
  const [picking, setPicking] = useState(null); // 새로 만들 직업 id
  const [backupOpen, setBackupOpen] = useState(false);
  const [resetStep, setResetStep] = useState(0); // 0 닫힘 · 1 안내 · 2 최종 확인
  const chars = acc.chars || {};
  const owned = CHRONICLE_CLASSES.filter(c => chars[c.id]);
  const last = acc.active && chars[acc.active] ? acc.active : null;
  if (picking) {
    const cls = chronicleClass(picking);
    return (
      <div className="absolute inset-0 flex flex-col">
        <Header title="새 캐릭터" onBack={() => setPicking(null)} />
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
          <div className="flex gap-2">
            {CHRONICLE_CLASSES.map(c => (
              <button key={c.id} disabled={!!chars[c.id]} onClick={() => setPicking(c.id)} className="ui-press flex-1" style={{ borderRadius: 14, padding: 2, border: `2px solid ${picking === c.id ? c.color : 'transparent'}`, opacity: chars[c.id] ? 0.25 : picking === c.id ? 1 : 0.55, background: 'transparent' }}>
                <img src={c.image} alt={c.name} className="w-full object-cover" style={{ aspectRatio: '1', borderRadius: 11 }} />
              </button>
            ))}
          </div>
          <div className="relative overflow-hidden" style={{ borderRadius: 16, aspectRatio: '16 / 10', border: `1px solid ${cls.color}88` }}>
            <img src={cls.image} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: "50% 20%" }} />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 45%, #0a0608)' }} />
            <div className="absolute bottom-2 left-3">
              <div className="font-bold" style={{ fontSize: 19, color: PALETTE.text }}>{cls.name} <span style={{ fontSize: 12.5, color: cls.color }}>{cls.role}</span></div>
              <div style={{ fontSize: 12, color: PALETTE.textDim }}>「{cls.quote}」</div>
            </div>
          </div>
          <GlassPanel className="p-3" style={{ fontSize: 12.5, color: PALETTE.text }}>
            <div className="font-semibold mb-1">스킬</div>
            {classSkills(picking).map(s => <div key={s.id} style={{ color: PALETTE.textDim, lineHeight: 1.55 }}><b style={{ color: PALETTE.text }}>{s.name}</b> (Lv.{s.reqLv}) — {describeSkill(s, 1)}</div>)}
          </GlassPanel>
          <GlassPanel className="p-3" style={{ fontSize: 12, color: PALETTE.textDim, lineHeight: 1.6 }}>
            <div className="font-semibold mb-1" style={{ color: PALETTE.text }}>전용 장비</div>
            무기 · 보조({SLOTS[1].label}) · 갑옷은 {cls.name} 전용, 장신구는 공용. 유니크 {Object.values(UNIQUE_ITEMS).filter(u => u.cls === picking && !u.disabled && !u.branch).length}종 (+ 전승 갈래 유니크).
          </GlassPanel>
        </div>
        <div className="p-4 flex-none"><UIButton onClick={() => onCreate(picking)}>{cls.name}{'(으)로 시작'}</UIButton></div>
      </div>
    );
  }
  return (
    <div className="absolute inset-0 flex flex-col">
      <img src="./enemies/classic/chapter_1/iceMage_intro.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.5 }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #0a0608cc 0%, #0a060844 30%, #0a0608 70%)' }} />
      <div className="relative flex-1 flex flex-col px-5 pt-12 pb-5 min-h-0">
        <div className="text-center flex-none">
          <div style={{ fontSize: 11, letterSpacing: '0.45em', color: '#9cc4e4' }}>{CHRONICLE_SUB.toUpperCase()}</div>
          <div className="font-bold mt-1" style={{ fontSize: 32, color: PALETTE.text, fontFamily: FONT_TITLE, textShadow: '0 4px 20px #000' }}>{CHRONICLE_TITLE}</div>
          <div className="mt-2" style={{ fontSize: 12.5, color: PALETTE.textDim }}>홀로 걷는 정통 RPG — 레벨 {CHRONICLE_TUNING.maxLevel} · 직업 장비 · 유니크 · 공용 창고</div>
        </div>
        <div className="mt-auto flex flex-col gap-2 ui-stagger overflow-y-auto">
          <div style={{ fontSize: 11.5, color: PALETTE.textDim }}>캐릭터 ({owned.length}/{CHRONICLE_CLASSES.length}) · 🪙{acc.gold} · 🗝{acc.keys?.count || 0} · 창고 {(acc.stash || []).length}</div>
          {CHRONICLE_CLASSES.map(c => {
            const ch = chars[c.id];
            return (
              <button key={c.id} onClick={() => (ch ? onSelect(c.id) : setPicking(c.id))} className="ui-press flex items-center gap-3 text-left" style={{ padding: 8, borderRadius: 14, background: last === c.id ? `${c.color}22` : 'rgba(10,6,8,0.7)', border: `1px solid ${ch ? c.color + '88' : 'var(--ui-line)'}` }}>
                <Portrait cid={c.id} size={42} dim={!ch} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold" style={{ fontSize: 14, color: ch ? PALETTE.text : PALETTE.textDim }}>{c.name} <span style={{ fontSize: 11, color: c.color }}>{c.role}</span></div>
                  <div style={{ fontSize: 11.5, color: ch ? PALETTE.legendary : PALETTE.textDim }}>
                    {ch ? `Lv.${ch.unit.lv} · 보스 ${Object.keys(ch.progress.bossCleared || {}).length}/${CHRONICLE_FIELDS.length} 처치` : '비어 있음 — 눌러서 만들기'}
                  </div>
                </div>
                <span style={{ fontSize: 12, color: ch ? PALETTE.dawn : PALETTE.textDim }}>{ch ? (last === c.id ? '이어하기 ▸' : '선택 ▸') : '＋'}</span>
              </button>
            );
          })}
          <button onClick={onExit} className="ui-press" style={{ background: 'transparent', border: 'none', color: PALETTE.dawn, padding: 10, fontSize: 12.5 }}>⇄ 게임 선택</button>
          <div className="flex items-center justify-center gap-2 flex-wrap pb-1">
            <span style={{ fontSize: 11, color: PALETTE.textDim }}>v{GAME_VERSION}</span>
            <UpdateButton />
            <button onClick={() => setBackupOpen(true)} className="ui-press" style={{ minHeight: 32, padding: '0 12px', borderRadius: 999, fontSize: 11, background: 'transparent', border: '1px solid #9cc4e466', color: '#9cc4e4' }}>💾 백업</button>
            <button onClick={() => setResetStep(1)} className="ui-press" style={{ minHeight: 32, padding: '0 12px', borderRadius: 999, fontSize: 11, background: 'transparent', border: '1px solid #e06a5f66', color: '#e06a5f' }}>↺ 처음부터 다시</button>
          </div>
        </div>
      </div>
      {backupOpen && <BackupSheet acc={acc} cloudApi={cloudApi} onClose={() => setBackupOpen(false)} onImport={(a) => { setBackupOpen(false); onImport(a); }} />}
      {resetStep > 0 && (
        <BottomSheet title="↺ 황혼 연대기 초기화" onClose={() => setResetStep(0)} maxHeight="70%">
          <div style={{ fontSize: 12.5, color: PALETTE.text, lineHeight: 1.7 }}>
            황혼 연대기의 <b style={{ color: '#e06a5f' }}>모든 진행이 삭제</b>되고 서장부터 다시 시작합니다.
          </div>
          <GlassPanel className="p-3 mt-2" style={{ fontSize: 12, color: PALETTE.textDim, lineHeight: 1.7 }}>
            삭제: 캐릭터 {owned.length}명(레벨·전승·장비·스킬) · 골드 {acc.gold.toLocaleString()} · 재료 · 열쇠 · 공용 창고 {(acc.stash || []).length}개 · 사역마 {Object.keys(acc.fams || {}).length}마리 · 이야기·의뢰·첨탑 기록<br />
            유지: 던앤트와일라잇 본편 · 트와일라잇 아르카나 · 무덤의 유산 등 <b style={{ color: PALETTE.text }}>다른 게임은 그대로</b>
          </GlassPanel>
          <div className="flex flex-col gap-2 mt-3">
            {resetStep === 1
              ? <UIButton variant="ghost" style={{ height: 42, color: '#e06a5f', borderColor: '#e06a5f88' }} onClick={() => setResetStep(2)}>초기화 진행</UIButton>
              : <UIButton style={{ height: 42, background: '#8b1f1f' }} onClick={() => { setResetStep(0); onReset(); }}>정말 전부 지우고 처음부터 시작</UIButton>}
            <UIButton variant="ghost" style={{ height: 40 }} onClick={() => setResetStep(0)}>취소</UIButton>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

// 2.0 첫 진입 안내 (1.x 플레이어 — 초기화 + 시작 보상)
export function GiftNotice({ acc, onClose }) {
  const g = A.V1_GIFT;
  return (
    <BottomSheet title="황혼 연대기 2.0" onClose={onClose} maxHeight="70%">
      <div style={{ fontSize: 12.5, color: PALETTE.text, lineHeight: 1.7 }}>
        파티제 → <b style={{ color: PALETTE.legendary }}>솔로 RPG</b>로 다시 태어났습니다. 직업 전용 장비 · 유니크 등급 · 공용 창고 · 레벨 {CHRONICLE_TUNING.maxLevel}.
        <div className="mt-2" style={{ color: PALETTE.textDim }}>이전 버전(1.x) 진행은 새 구조와 맞지 않아 초기화되었습니다. 미안한 마음을 담아 시작 보상을 드립니다.</div>
        <GlassPanel className="p-3 mt-3">
          <div>🪙 골드 {g.gold.toLocaleString()}</div>
          <div>🗝 던전 열쇠 +{g.keys}</div>
          <div>📜 계약서 조각 {g.famShard ?? (g.sealPlus || 0) * 10}개 (사역마 소환 {Math.floor((g.famShard ?? (g.sealPlus || 0) * 10) / F.FAM_TUNING.shardsPerSummon)}회분)</div>
          <div>🎁 첫 캐릭터 직업 희귀 장비 {g.rareBoxes}개</div>
        </GlassPanel>
        <div className="mt-2" style={{ fontSize: 11.5, color: PALETTE.textDim }}>{Object.keys(acc.chars || {}).length ? '보상은 지급되었습니다.' : '첫 캐릭터를 만들면 지급됩니다.'}</div>
      </div>
      <div className="mt-4"><UIButton onClick={onClose}>확인</UIButton></div>
    </BottomSheet>
  );
}

// ===== 이야기 장면 =====
function speakerOf(save, sp) {
  if (sp === 'narr') return { name: '', img: null, color: PALETTE.textDim };
  if (sp === 'hero') { const c = chronicleClass(save.hero); return { name: unitTitle(save.units[save.hero], save.hero), img: c.image, color: c.color }; }
  if (NPCS[sp]) return { name: NPCS[sp].name, icon: NPCS[sp].icon, color: NPCS[sp].color };
  if (CHRONICLE_CLASSES.some(c => c.id === sp)) { const c = chronicleClass(sp); return { name: c.name, img: c.image, color: c.color }; }
  if (ENEMIES[sp]) return { name: ENEMIES[sp].name, img: chronicleEnemyArt(sp), color: '#e06a5f' };
  return { name: sp, color: PALETTE.text };
}

export function SceneView({ save, scene, onEnd }) {
  const [i, setI] = useState(0);
  const line = scene.lines[i];
  const who = speakerOf(save, line.sp);
  const bg = scene.id === 'ending' && save.hero !== 'priest' ? withArtRev(`./classes/${save.hero}win.jpg`) : withArtRev(scene.bg);
  const next = () => (i + 1 < scene.lines.length ? setI(i + 1) : onEnd());
  return (
    <div className="absolute inset-0 z-40 flex flex-col" style={{ background: '#050304' }} onClick={next}>
      {bg && <img src={bg} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.55 }} draggable={false} />}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #050304aa 0%, transparent 30%, #050304ee 72%)' }} />
      <div className="relative flex items-center px-4 pt-4">
        <div className="flex-1" style={{ fontSize: 11, letterSpacing: '0.3em', color: PALETTE.dawn }}>{scene.title}</div>
        <button onClick={(e) => { e.stopPropagation(); onEnd(); }} className="ui-press" style={{ fontSize: 12, padding: '6px 12px', borderRadius: 999, border: '1px solid var(--ui-line-strong)', color: PALETTE.textDim, background: '#0008' }}>건너뛰기 ⏭</button>
      </div>
      <div className="flex-1" />
      <div className="relative px-4 pb-6">
        <div key={i} className="ui-screen-enter" style={{ padding: '14px 16px', borderRadius: 18, background: 'rgba(12,7,9,0.88)', border: `1px solid ${line.sp === 'narr' ? 'var(--ui-line)' : who.color + '88'}`, minHeight: 130 }}>
          {line.sp !== 'narr' && (
            <div className="flex items-center gap-2 mb-2">
              {who.img ? <img src={who.img} alt="" className="object-cover" style={{ width: 40, height: 40, borderRadius: 12, border: `1px solid ${who.color}` }} /> : <span style={{ fontSize: 26 }}>{who.icon}</span>}
              <span className="font-semibold" style={{ fontSize: 14, color: who.color }}>{who.name}</span>
            </div>
          )}
          <div style={{ fontSize: 14.5, lineHeight: 1.7, color: line.sp === 'narr' ? '#cbbba6' : PALETTE.text, fontStyle: line.sp === 'narr' ? 'italic' : 'normal' }}>{line.t}</div>
          <div className="text-right mt-2" style={{ fontSize: 11, color: PALETTE.textDim }}>{i + 1}/{scene.lines.length} · 눌러서 계속 ▸</div>
        </div>
      </div>
    </div>
  );
}

// ===== 오프라인 보상 (1.233.0) =====
export function OfflineSheet({ pd, onClaim }) {
  // 1.256.0 — 본편 카드 창 (시안 ㊲)
  const cls = chronicleClass(pd.hero);
  const cell = (l, v, c) => (
    <div className="text-center" style={{ padding: '5px 0', border: `1px solid ${MS.line}`, background: MS.box, borderRadius: MS.r }}>
      <div style={{ fontSize: 11, color: PALETTE.textDim }}>{l}</div><b style={{ fontSize: 12.5, color: c || PALETTE.text }}>{v}</b>
    </div>
  );
  return (
    <MainModal img={cls.image} kicker="OFFLINE" title="자리를 비운 사이" sub={`${iga(cls.name)} ${pd.place}에서 사냥했다`} onClose={onClaim}
      footer={<button onClick={onClaim} className="ui-press" style={{ height: 44, fontSize: 14, fontWeight: 800, border: `1px solid ${MS.red}`, background: 'rgba(224,87,76,0.2)', color: '#ff8a7e' }}>받기</button>}>
      <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {cell('비운 시간', O.fmtAway(pd.ms), MS.gold)}{cell('효율', `×1의 ${Math.round(O.OFFLINE.eff * 100)}%`)}{cell('승률', `${Math.round(pd.winRate * 100)}%`)}{cell('최대', `${O.OFFLINE.maxMs / 3600000}시간`)}
      </div>
      <MainSecHead title="획 득" />
      <MainKvRows rows={[
        { l: '골드', v: <>🪙 +<CountUp v={pd.gold} /></>, c: MS.gold }, { l: '정수', v: `✦ +${pd.essence}` },
        { l: '경험치', v: '없음', c: PALETTE.textDim }, { l: '장비', v: '없음', c: PALETTE.textDim },
      ]} />
      <div className="mt-1" style={{ fontSize: 11, color: PALETTE.textDim }}>오프라인 보상은 골드·정수만 — 경험치·장비는 접속 중 사냥으로</div>
    </MainModal>
  );
}
