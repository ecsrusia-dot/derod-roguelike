// 사용: SAVE=<백업 JSON> node scripts/sim-chronicle-season-roll.mjs
// 시즌 교체 점검 — 시작 예약 → 시즌 0 결산(승천·인장 환산) → 시즌 1 → (가짜로 한 주 뒤) 시즌 1 결산
import fs from 'fs';
import * as SE from '../src/chronicle/season.js';
import * as A from '../src/chronicle/account.js';
import * as RV from '../src/chronicle/rival.js';
import * as AR from '../src/chronicle/arena.js';
import * as ASC from '../src/chronicle/ascend.js';
import { kstWeekKey } from '../src/chronicle/tower.js';
const WEEK = 7 * 86400000; const now = Date.now();
const acc0 = JSON.parse(fs.readFileSync(process.env.SAVE, 'utf8')).acc;
const show = (r) => { console.log(`  승천: ${r.ascended.map(a => `${a.branch} 전승${a.rebirth} Lv.${a.lv} 전투력 ${a.power} [${a.result}]`).join(' · ') || '없음'}`); console.log(`  승천 불가: ${r.skipped.map(x => `${x.cid} Lv.${x.lv}`).join(' · ') || '없음'}`); console.log(`  순위: 성장 ${r.growth ? `${r.growth.rank}/${r.growth.total}위 +${r.growth.seal}` : '-'} · 투기장 ${r.arena ? `${r.arena.rank}/${r.arena.total}위 +${r.arena.seal}` : '-'}`); console.log(`  환산: ${r.conv.parts.map(p => `${p.label} ${p.n}`).join(' · ')} = ${r.conv.raw} → ${r.conv.seal} (상한 ${SE.SEASON.convertCap})`); console.log(`  인장 합계 +${r.seal}`); };
console.log('== 예약 전: due', SE.seasonDue(acc0, now));
let acc = SE.armSeason(acc0, now); console.log('== 예약:', acc.season.armed, '· 남은 시간', SE.fmtLeft(SE.seasonLeftMs(acc, now)), '· 지금 due', SE.seasonDue(acc, now));
console.log('== 미리 보기 (지금 끝난다면)'); show(SE.seasonSettlement(acc, now));
const t1 = now + WEEK; acc = SE.rollSeason(acc, t1);
console.log(`== 시즌 0 결산 → 시즌 ${acc.season.n} (${acc.season.key})`); show(acc.season.report);
console.log('  새 계정: 캐릭터', Object.keys(acc.chars).length, '· 골드', acc.gold, '· 사역마', Object.keys(acc.fams).length, '· 인장', acc.asc.seal, '· 보관', ASC.ascFilled(acc), '· 본 이야기', Object.keys(acc.asc.storySeen).length, '· 경쟁자 승천', Object.keys(acc.asc.rivals).length, '· 바이트', JSON.stringify(acc).length);
// 시즌 1 — 캐릭터 하나 만들고 조금 키운 것처럼
acc = A.createCharacter(acc, 'wanderer'); acc.chars.wanderer.stats.battles = 3000; acc.chars.wanderer.unit.lv = 100;
console.log('== 시즌 1 중: 이야기 미리 본 것', Object.keys(acc.chars.wanderer.story.seen).length, '· 뷰 seasonOn', A.toView(acc).seasonOn, '· ticks(주 초)', RV.rivalTicks(acc, t1 + 3600000), '· ticks(주 말)', RV.rivalTicks(acc, t1 + WEEK - 1));
const b = RV.rivalBoard(acc); console.log('  성장 순위 내 위치', b.find(x => x.me).rank, '/', b.length, '· 경쟁자 갈래 예:', RV.rivalDefs(acc).slice(0, 3).map(r => r.branch).join(','));
const t2 = t1 + WEEK + 5000; console.log('  due', SE.seasonDue(acc, t2));
acc = SE.rollSeason(acc, t2); console.log(`== 시즌 1 결산 → 시즌 ${acc.season.n}`); show(acc.season.report);
const rv = Object.values(acc.asc.rivals); const cnt = rv.map(x => Object.keys(x).length); console.log('  경쟁자 승천 칸 수 분포', cnt.reduce((m, n) => (m[n] = (m[n] || 0) + 1, m), {}), '· 인장', acc.asc.seal);
console.log('  시즌 2 경쟁자 갈래 예:', RV.rivalDefs(acc).slice(0, 3).map(r => `${r.name}:${r.branch}`).join(','));
