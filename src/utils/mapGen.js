// ============================================
// utils/mapGen.js — 노드 그래프 생성
// ============================================
// 보장 사항:
// 1. 시작 노드(layer 0)에서 모든 중간 노드까지 도달 가능
// 2. 모든 노드는 보스로 가는 경로가 존재
// 3. 모든 중간 레이어 노드는 최소 1개의 들어오는 엣지를 가짐
// 모든 챕터의 첫 노드 = 'prep' (전투 준비), 보스 직전 = 'rest' (정비)
// ============================================

import { GAME_CONFIG } from '../data.js';

export function generateChapterMap(chapter, chapterIdx = 0) {
  // 더 큰 노드 수에 맞춰 layers 확대
  // 시작(1) + 중간(여러 layer) + 보스직전(1) + 보스(1)
  const layers = Math.max(5, Math.ceil(chapter.nodeCount / 2.8));
  const nodes = [];
  let id = 0;

  // Layer 0: 모든 챕터 첫 노드 = 'prep' (전투 준비)
  nodes.push({ id: id++, type: 'prep', layer: 0, x: 50, y: 95, completed: false, current: true, locked: false });

  // 중간 레이어 노드 타입 (rest 완전 제거, shop은 강제 배치로 별도 처리)
  const types = ['battle', 'event', 'unknown', 'elite'];
  const weights = [55, 26, 14, 9];

  // 중간 레이어 (1 ~ layers-3) — 보스 직전 layer는 별도 처리
  for (let l = 1; l < layers - 2; l++) {
    const yPos = 95 - (l / (layers - 1)) * 85;
    // layer당 2~4개 노드 (기존 2~3 → 2~4)
    const r = Math.random();
    const nodeCount = r < 0.3 ? 2 : r < 0.75 ? 3 : 4;
    for (let i = 0; i < nodeCount; i++) {
      const xPos = (i + 1) * (100 / (nodeCount + 1)) + (Math.random() - 0.5) * 5;
      let rt = Math.random() * 100;
      let type = 'battle';
      for (let t = 0; t < types.length; t++) {
        rt -= weights[t];
        if (rt <= 0) { type = types[t]; break; }
      }
      nodes.push({ id: id++, type, layer: l, x: xPos, y: yPos, completed: false, current: false, locked: false });
    }
  }

  // === 상점/대장간 강제 배치 ===
  // 상점: 모든 챕터 1개, layer 3 ~ layers-3 (정비/보스 제외) 중 랜덤
  // 대장간: 챕터 3 이상 (chapterIdx >= 2)에서 1개, layer 1 ~ layers-3 중 랜덤
  
  // 강제 배치 가능 layer 풀 (일반 노드 중에서 변환)
  const pickRandomNode = (minLayer, maxLayer, excludeIds = []) => {
    const candidates = nodes.filter(n => 
      n.layer >= minLayer && 
      n.layer <= maxLayer && 
      n.type !== 'prep' && n.type !== 'boss' && n.type !== 'rest' &&
      !excludeIds.includes(n.id)
    );
    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  };
  
  // 상점 강제 배치 (layer 3 ~ layers-3)
  const shopNode = pickRandomNode(3, layers - 3);
  if (shopNode) {
    shopNode.type = 'shop';
  }
  
  // 대장간 강제 배치 (chapterIdx >= 2 = 챕터 3+, layer 1 ~ layers-3)
  if (chapterIdx >= 2) {
    const forgeNode = pickRandomNode(1, layers - 3, shopNode ? [shopNode.id] : []);
    if (forgeNode) {
      forgeNode.type = 'forge';
    }
  }

  // 보스 직전 레이어 (layers-2): 정비 노드 1개 (모든 경로가 여기로 모임)
  const preBossY = 95 - ((layers - 2) / (layers - 1)) * 85;
  nodes.push({ id: id++, type: 'rest', layer: layers - 2, x: 50, y: preBossY, completed: false, current: false, locked: false });

  // 마지막 레이어: 보스 - 1개
  nodes.push({ id: id++, type: 'boss', layer: layers - 1, x: 50, y: 8, completed: false, current: false, locked: false });

  // 엣지 생성 (개선된 알고리즘)
  const edges = [];
  const edgeSet = new Set(); // 중복 방지
  const addEdge = (a, b) => {
    const key = `${a}-${b}`;
    if (!edgeSet.has(key)) {
      edges.push([a, b]);
      edgeSet.add(key);
    }
  };

  for (let l = 0; l < layers - 1; l++) {
    const cur = nodes.filter(n => n.layer === l);
    const next = nodes.filter(n => n.layer === l + 1);
    if (cur.length === 0 || next.length === 0) continue;

    // Phase 1: 각 cur 노드는 가장 가까운 next 노드와 연결 보장
    cur.forEach(c => {
      const sorted = [...next].sort((a, b) => Math.abs(a.x - c.x) - Math.abs(b.x - c.x));
      addEdge(c.id, sorted[0].id);
      // 분기 가능성 (40%): 두 번째로 가까운 노드도 연결
      if (Math.random() < GAME_CONFIG.branchProbability && sorted.length > 1) {
        addEdge(c.id, sorted[1].id);
      }
    });

    // Phase 2: 모든 next 노드가 최소 1개의 들어오는 엣지를 갖도록 보장
    next.forEach(n => {
      const hasIncoming = edges.some(([_, b]) => b === n.id);
      if (!hasIncoming) {
        // 가장 가까운 cur 노드와 연결
        const sorted = [...cur].sort((a, b) => Math.abs(a.x - n.x) - Math.abs(b.x - n.x));
        addEdge(sorted[0].id, n.id);
      }
    });
  }

  return { nodes, edges };
}
