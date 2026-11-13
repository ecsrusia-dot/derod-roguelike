// 황혼 연대기 데이터 정합성 점검 (1.277.3) — node scripts/audit-chronicle.mjs  (또는 npm run audit:chronicle)
// 콘텐츠를 추가·수정한 뒤 실행한다. 문제가 있으면 목록을 찍고 종료 코드 1.
//   ① 사냥터·던전의 적 키가 실제로 있는가  ② 전투·보스 등장 일러 파일이 있는가
//   ③ 의뢰의 처치 대상·중복 id            ④ 특성의 스킬 강화(sb_) 대상
//   ⑤ 유니크·에픽 옵션·갈래·특성 효과 키가 엔진에 연결돼 있는가  ⑥ 유니크 직업별 분배
import fs from 'fs';
import * as D from '../src/chronicle/data.js';
import * as T from '../src/chronicle/talents.js';
import * as F from '../src/chronicle/familiar.js';
import { QUESTS, SCENES } from '../src/chronicle/story.js';
import { CENEMIES as EN } from '../src/chronicle/enemies.js';
import { getEnemyImageSrc } from '../src/utils/helpers.js';

const eng = fs.readFileSync(new URL('../src/chronicle/engine.js', import.meta.url), 'utf8');
const pub = new URL('../public/', import.meta.url);
const exists = (src) => !!src && fs.existsSync(new URL(src.replace(/^\.\//, '').split('?')[0], pub));
const problems = [];
const check = (label, list) => { console.log(`${list.length ? '✗' : '✓'} ${label}${list.length ? ' — ' + list.join(', ') : ''}`); if (list.length) problems.push(label); };

// ①② 적·일러
const mobs = new Set(), bosses = new Set();
for (const f of D.CHRONICLE_FIELDS) { [...f.normals, ...f.elites].forEach(k => mobs.add(k)); bosses.add(f.boss); }
for (const d of D.CHRONICLE_DUNGEONS) for (const fl of d.floors || []) (fl.enemies || []).forEach(k => (fl.boss ? bosses : mobs).add(k));
const all = [...new Set([...mobs, ...bosses])];
check(`적 키 (일반 ${mobs.size} · 보스 ${bosses.size})`, all.filter(k => !EN[k]));
check('전투 일러 파일', all.filter(k => EN[k] && !exists(getEnemyImageSrc(k, EN[k], 'combat'))));
check('보스 등장 일러 파일', [...bosses].filter(k => EN[k] && !exists(getEnemyImageSrc(k, EN[k], 'intro'))));

// ③ 의뢰
const ids = QUESTS.map(q => q.id);
check(`의뢰 id 중복 (${QUESTS.length}개 · 장면 ${SCENES.length}개)`, ids.filter((id, i) => ids.indexOf(id) !== i));
check('의뢰 처치 대상', QUESTS.filter(q => q.goal?.type === 'killKey' && !EN[q.goal.key]).map(q => q.id));
check('의뢰 던전 대상', QUESTS.filter(q => q.goal?.type === 'dungeonTier' && (!D.CHRONICLE_DUNGEONS.some(d => d.id === q.goal.id) || !D.DUNGEON_TIERS[q.goal.tier])).map(q => q.id));

// ④⑤ 효과 키
const fx = new Set(), badSb = [];
const addFx = (o) => Object.keys(o || {}).forEach(k => fx.add(k));
for (const u of Object.values(D.UNIQUE_ITEMS)) { addFx(u.fx); addFx(u.opts); }
for (const o of Object.values(D.EPIC_OPTIONS)) addFx(o.fx);
for (const b of Object.values(D.REBIRTH_BRANCHES)) addFx(b.fx);
for (const trees of Object.values(T.TALENT_TREES)) for (const tr of trees) for (const n of (tr.tiers || []).flat()) addFx(n.fx);
for (const k of fx) if (k.startsWith('sb_') && !D.CHRONICLE_SKILLS[k.slice(3)]) badSb.push(k);
check('특성 스킬 강화 대상', badSb);
check(`효과 키 엔진 연결 (${fx.size}종)`, [...fx].filter(k => !k.startsWith('sb_') && !k.startsWith('fam_') && !new RegExp('\\b' + k + '\\b').test(eng)));

// ⑥ 유니크 분배
const dist = {};
for (const u of Object.values(D.UNIQUE_ITEMS)) { if (u.branch) continue; dist[u.cls] = (dist[u.cls] || 0) + 1; }
const per = D.CHRONICLE_CLASSES.map(c => dist[c.id] || 0);
check(`유니크 직업별 균등 (${JSON.stringify(dist)})`, Math.min(...per) === Math.max(...per) ? [] : ['직업별 개수가 다르다']);

console.log(`\n콘텐츠: 스킬 ${Object.keys(D.CHRONICLE_SKILLS).length} · 사냥터 ${D.CHRONICLE_FIELDS.length} · 던전 ${D.CHRONICLE_DUNGEONS.length} · 유니크 ${Object.keys(D.UNIQUE_ITEMS).length} · 인연 ${F.FAM_BONDS.length} · 고유 스킬 ${Object.keys(F.FAM_SIGS).length}`);
if (problems.length) { console.error(`\n문제 ${problems.length}건`); process.exit(1); }
console.log('\n문제 없음');
