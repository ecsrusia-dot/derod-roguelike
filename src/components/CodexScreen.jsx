// ============================================
// components/CodexScreen.jsx — 종합 도감 (적·사건·유물·패시브·레시피)
// ============================================
// 한 번이라도 만난 적, 진입한 사건, 획득한 유물, 배운 패시브를 영구 등록.
// 레시피는 대장간 사용 시 발견.
// 미발견 항목은 ???로 표시.
// ============================================

import React, { useState } from 'react';
import { Skull, BookOpen, Sword, Hammer, Star } from 'lucide-react';
import { PALETTE } from '../utils/helpers.js';
import { ENEMIES, EVENTS, RELICS, PASSIVE_SKILLS, FORGE_RECIPES } from '../data.js';
import CardInfoModal, { buildPassiveInfo, buildRelicInfo } from './CardInfoModal.jsx';

const TABS = [
  { id: 'enemies', label: '적',   icon: Skull,    color: '#c4453d' },
  { id: 'events',  label: '사건', icon: BookOpen, color: '#7ba3c4' },
  { id: 'relics',  label: '유물', icon: Star,     color: '#d4a574' },
  { id: 'passives', label: '패시브', icon: Sword,   color: '#9ad4a3' },
  { id: 'recipes', label: '레시피', icon: Hammer, color: '#c46535' },
];

// 카테고리별 전체 풀 빌더 — 각 항목은 { id, name, ...detail }
function getCategoryPool(catId) {
  if (catId === 'enemies') {
    return Object.entries(ENEMIES).map(([key, e]) => ({
      id: key,
      name: e.name,
      color: e.color,
      data: e,
    }));
  }
  if (catId === 'events') {
    // 튜토리얼 선물 이벤트는 도감 풀에서 제외
    return EVENTS.filter(e => !e.tutorialGift).map(e => ({
      id: e.id,
      name: e.title,
      color: '#7ba3c4',
      data: e,
    }));
  }
  if (catId === 'relics') {
    // 챔피언십 전용 유물은 별도 — 일반 풀만 표시 (championshipUnlock 없는 것)
    return RELICS.filter(r => !r.championshipUnlock).map(r => ({
      id: r.name,
      name: r.name,
      color: r.color,
      data: r,
    }));
  }
  if (catId === 'passives') {
    // 1.62.1~ 픽스 #4: classOnly 직업 전용 패시브는 도감에서 제외 (직업 정체성 강화)
    //   forge 결과 패시브('__forge_only__')는 노출 — 대장간으로 얻을 수 있어 사용자에게 정보 제공 필요
    const CLASS_IDS = ['wanderer', 'sage', 'demonblood', 'elf', 'priest'];
    return Object.entries(PASSIVE_SKILLS)
      .filter(([_, p]) => !p.classOnly || !CLASS_IDS.includes(p.classOnly))
      .map(([key, p]) => ({
        id: key,
        name: key,
        color: p.color,
        data: p,
      }));
  }
  if (catId === 'recipes') {
    return FORGE_RECIPES.map((r, idx) => ({
      id: `recipe_${idx}`,
      name: r.result,
      color: '#c46535',
      data: r,
    }));
  }
  return [];
}

// 카테고리별 발견 ID 배열
function getDiscoveredIds(meta, catId) {
  if (catId === 'recipes') return meta.discoveredRecipes || [];
  return (meta.codex && meta.codex[catId]) || [];
}

function isDiscovered(meta, catId, item) {
  const disc = getDiscoveredIds(meta, catId);
  if (catId === 'recipes') return disc.includes(item.data.result);
  return disc.includes(item.id);
}

// 적 상세 인포 빌더 (CardInfoModal 호환)
function buildEnemyInfo(enemy) {
  if (!enemy) return null;
  const stats = [];
  if (typeof enemy.hp === 'number') stats.push(['HP', String(enemy.hp)]);
  if (enemy.tier) stats.push(['등급', enemy.tier]);
  if (enemy.chapter) stats.push(['챕터', String(enemy.chapter)]);
  if (enemy.isBoss) stats.push(['보스', '○']);
  return {
    color: enemy.color,
    tag: '◆ 적',
    title: enemy.name,
    subtitle: enemy.desc || null,
    stats,
    lines: Array.isArray(enemy.patterns) && enemy.patterns.length > 0
      ? [enemy.patterns.map(p => {
          if (p.type === 'attack') {
            const heavy = p.heavy ? ' [강타]' : '';
            return `· ${p.name} — 데미지 ${p.dmg[0]}~${p.dmg[1]}${heavy}`;
          }
          if (p.type === 'defend') {
            return `· ${p.name} — 방어 +${p.defense || 0}`;
          }
          return `· ${p.name}`;
        }).join('\n')]
      : null,
  };
}

// 사건 상세 인포 빌더
function buildEventInfo(event) {
  if (!event) return null;
  return {
    color: '#7ba3c4',
    tag: '◆ 사건',
    title: event.title,
    subtitle: event.text || null,
    // 챕터 표기
    stats: event.chapter && Array.isArray(event.chapter)
      ? [['등장 챕터', event.chapter.join(', ')]]
      : null,
  };
}

// 레시피 상세 인포 빌더
function buildRecipeInfo(recipe) {
  if (!recipe) return null;
  return {
    color: '#c46535',
    tag: '◆ 대장간 레시피',
    title: recipe.result,
    subtitle: `${recipe.ingredients[0]} + ${recipe.ingredients[1]}\n→ 패시브 ${recipe.result} Lv +1`,
  };
}

function buildInfoFor(catId, item, meta) {
  if (catId === 'enemies') return buildEnemyInfo(item.data);
  if (catId === 'events') return buildEventInfo(item.data);
  if (catId === 'relics') return buildRelicInfo(item.data);
  if (catId === 'passives') {
    // 현재 lv를 알 수 없으므로 0 (마일스톤 모두 미해금 색으로 표시)
    return buildPassiveInfo(item.id, 0);
  }
  if (catId === 'recipes') return buildRecipeInfo(item.data);
  return null;
}

export default function CodexScreen({ meta, onBack }) {
  const [tab, setTab] = useState('enemies');
  const [modalInfo, setModalInfo] = useState(null);

  const pool = getCategoryPool(tab);
  const discoveredCount = pool.filter(item => isDiscovered(meta, tab, item)).length;
  const tabConfig = TABS.find(t => t.id === tab);

  // 발견된 것 먼저, 미발견 뒤로
  const sorted = [...pool].sort((a, b) => {
    const aD = isDiscovered(meta, tab, a);
    const bD = isDiscovered(meta, tab, b);
    if (aD && !bD) return -1;
    if (!aD && bD) return 1;
    return 0;
  });

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: PALETTE.bgDeep }}>
      {/* 헤더 */}
      <div className="px-4 py-3 border-b flex items-center gap-3" style={{ borderColor: PALETTE.panelBorder }}>
        <button onClick={onBack} className="text-base font-bold" style={{ color: PALETTE.textDim }}>◂</button>
        <div className="flex-1 text-center">
          <div className="text-[10px] tracking-[0.3em]" style={{ color: '#c46535' }}>━━ C O D E X ━━</div>
          <div className="text-sm font-bold tracking-[0.2em] mt-0.5" style={{ color: PALETTE.text }}>황혼의 도감</div>
        </div>
        <div style={{ width: '20px' }} />
      </div>

      {/* 탭 바 */}
      <div className="grid grid-cols-5 border-b" style={{ borderColor: PALETTE.panelBorder, background: PALETTE.panel }}>
        {TABS.map(t => {
          const Icon = t.icon;
          const active = t.id === tab;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex flex-col items-center py-2 transition-all"
              style={{
                background: active ? `${t.color}20` : 'transparent',
                borderBottom: active ? `2px solid ${t.color}` : '2px solid transparent',
                color: active ? t.color : PALETTE.textDim,
              }}>
              <Icon size={14} />
              <span className="text-[10px] mt-0.5">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* 진행도 */}
      <div className="px-4 py-2 flex justify-between items-center" style={{ borderBottom: `1px solid ${PALETTE.panelBorder}` }}>
        <span className="text-[10px]" style={{ color: PALETTE.textDim }}>
          {tabConfig.label} 발견
        </span>
        <span className="text-[12px] font-bold tabular-nums" style={{ color: tabConfig.color }}>
          {discoveredCount} / {pool.length} ({pool.length > 0 ? Math.floor((discoveredCount / pool.length) * 100) : 0}%)
        </span>
      </div>

      {/* 항목 그리드 */}
      <div className="flex-1 overflow-y-auto px-3 py-3 grid grid-cols-2 gap-1.5">
        {sorted.map(item => {
          const found = isDiscovered(meta, tab, item);
          return (
            <button key={item.id}
              onClick={() => {
                if (!found) return;
                setModalInfo(buildInfoFor(tab, item, meta));
              }}
              disabled={!found}
              className="text-left px-2.5 py-2 transition-all"
              style={{
                background: found ? `${item.color}10` : 'rgba(255,255,255,0.02)',
                border: `1px solid ${found ? item.color : PALETTE.panelBorder}`,
                opacity: found ? 1 : 0.5,
                cursor: found ? 'pointer' : 'default',
              }}>
              <div className="text-[12px] font-bold" style={{ color: found ? PALETTE.text : PALETTE.textDim }}>
                {found ? item.name : '???'}
              </div>
              {found && tab === 'enemies' && item.data.tier && (
                <div className="text-[9px] mt-0.5" style={{ color: PALETTE.textDim }}>{item.data.tier}</div>
              )}
              {found && tab === 'events' && item.data.chapter && (
                <div className="text-[9px] mt-0.5" style={{ color: PALETTE.textDim }}>Ch.{Array.isArray(item.data.chapter) ? item.data.chapter.join(',') : item.data.chapter}</div>
              )}
              {found && tab === 'recipes' && (
                <div className="text-[9px] mt-0.5 truncate" style={{ color: PALETTE.textDim }}>
                  {item.data.ingredients[0]} + {item.data.ingredients[1]}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {modalInfo && (
        <CardInfoModal info={modalInfo} onClose={() => setModalInfo(null)} />
      )}
    </div>
  );
}
