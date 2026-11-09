// 황혼 연대기 원정대 레이드 밸런스 (1.231.0)
// 1) node scripts/sim-chronicle-raid-snap.mjs 1 && node scripts/sim-chronicle-raid-snap.mjs 2  → OS 임시 폴더 raidsnap{1,2}.json (5직업 × Lv.20/40/60/80/100 봇 저장)
// 2) node scripts/sim-chronicle-raid.mjs  → 단계별 균형 파티 / 전원+20 / 1명 -20(하드캐리 시도) 승률. 환경변수 T=단계id,.. SA=봉인반향 BA/BH=보스 배율 SAM={"r60":1.2,..}
import fs from 'fs';
const E = await import('../src/chronicle/engine.js');
const R = await import('../src/chronicle/raid.js');
const D = await import('../src/chronicle/data.js');
const SP = (await import('os')).tmpdir() + '/';
const snaps = [1, 2].map(s => JSON.parse(fs.readFileSync(SP + `raidsnap${s}.json`, 'utf8')));
const CLS = D.CHRONICLE_CLASSES.map(c => c.id);
const near = (L) => [20, 40, 60, 80, 100].reduce((a, b) => (Math.abs(b - L) < Math.abs(a - L) ? b : a));
function member(set, cid, L, reborn) {
  const v = structuredClone(snaps[set][cid][near(L)]);
  v.roster = Object.fromEntries(CLS.map(c => [c, { lv: L, peak: reborn ? 100 : L, rebirth: reborn ? 1 : 0 }]));
  if (reborn) v.units[cid].rebirth = { branch: D.rebirthBranches(cid)[0].id, count: 1 };
  const d = E.deriveUnit(v, cid);
  return { ...d, hp: d.maxHp };
}
function party(set, lvMap, reborn) { return CLS.map(cid => member(set, cid, lvMap[cid], reborn)); }
let seed = 99; const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
function trial(tier, lvMap, reborn, N = 40) {
  let w = 0, rounds = 0, fail = { sealDead: 0, timeout: 0, wipe: 0 };
  for (let i = 0; i < N; i++) {
    const p = party(i % 2, lvMap, reborn);
    const b = E.simulateChronicleBattle(p, R.buildRaidEnemies(tier), rng);
    rounds += b.rounds; if (b.result === 'win') w++;
  }
  return `${Math.round(w / N * 100)}%(${Math.round(rounds / N)}R)`;
}
const SAM = process.env.SAM ? JSON.parse(process.env.SAM) : {};
for (const t of R.RAID_TIERS) { if (SAM[t.id]) t.sealAtk = SAM[t.id]; if (process.env.SA) t.sealAtk = +process.env.SA; if (process.env.BA) t.atk = +process.env.BA; if (process.env.BH) t.hp = +process.env.BH; }
const only = process.env.T ? process.env.T.split(',') : R.RAID_TIERS.map(t => t.id);
for (const tier of R.RAID_TIERS.filter(t => only.includes(t.id))) {
  const L = tier.lv, reborn = !!tier.req.rebirth;
  const all = (x) => Object.fromEntries(CLS.map(c => [c, x]));
  const bal = trial(tier, all(L), reborn, 60);
  const over = trial(tier, all(Math.min(100, L + 20)), reborn);
  const carry = CLS.map(weak => trial(tier, { ...all(Math.min(100, L + 20)), [weak]: Math.max(20, L - 20) }, reborn, 30)).join(' ');
  console.log(tier.id, '균형', bal, '| 전원+20', over, '| 1명 -20 (검/술/마/정/사):', carry);
}
