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
  // 튜토리얼 챕터 처리
  const isTutorial = chapter.isTutorial === true;

  // === 일직선 시퀀스 챕터 (tutorial_basic, tutorial_market) ===
  // chapter.linearSequence가 배열이면 그 순서대로 1열 배치
  // 항목은 문자열('battle') 또는 객체({ type: 'event', forceEventId: '...' }) 가능
  if (Array.isArray(chapter.linearSequence) && chapter.linearSequence.length > 0) {
    const seq = chapter.linearSequence;
    const linearNodes = [];
    const linearEdges = [];
    const count = seq.length;
    for (let i = 0; i < count; i++) {
      const item = seq[i];
      const type = typeof item === 'string' ? item : item.type;
      const yPos = count === 1 ? 50 : 95 - (i / (count - 1)) * 87;
      linearNodes.push({
        id: i,
        type,
        layer: i,
        x: 50,
        y: yPos,
        completed: false,
        current: i === 0,
        locked: false,
      });
      if (i > 0) linearEdges.push([i - 1, i]);
    }
    return { nodes: linearNodes, edges: linearEdges };
  }

  const layers = Math.max(5, Math.ceil(chapter.nodeCount / 2.8));
  const nodes = [];
  let id = 0;

  // Layer 0: 모든 챕터 첫 노드 = 'prep' (전투 준비)
  nodes.push({ id: id++, type: 'prep', layer: 0, x: 50, y: 95, completed: false, current: true, locked: false });

  // 중간 레이어 노드 타입 (rest 완전 제거, shop은 강제 배치로 별도 처리)
  let types, weights;
  if (isTutorial && chapter.nodeWeights) {
    // 튜토리얼: 명시된 비율 사용 (shop, forge 제외 — 강제 배치로 처리)
    types = ['battle', 'event', 'unknown', 'elite'];
    weights = [
      (chapter.nodeWeights.battle || 0) * 100,
      (chapter.nodeWeights.event || 0) * 100,
      (chapter.nodeWeights.unknown || 0) * 100,
      (chapter.nodeWeights.elite || 0) * 100,
    ];
    // 합이 0이면 기본 배율
    if (weights.reduce((a, b) => a + b, 0) === 0) {
      weights = [55, 26, 14, 9];
    }
  } else {
    types = ['battle', 'event', 'unknown', 'elite'];
    weights = [55, 26, 14, 9];
  }

  // 중간 레이어
  for (let l = 1; l < layers - 2; l++) {
    const yPos = 95 - (l / (layers - 1)) * 85;
    const r = Math.random();
    const nodeCount = r < 0.3 ? 2 : r < 0.75 ? 3 : 4;
    for (let i = 0; i < nodeCount; i++) {
      const xPos = (i + 1) * (100 / (nodeCount + 1)) + (Math.random() - 0.5) * 5;
      let rt = Math.random() * weights.reduce((a, b) => a + b, 0);
      let type = 'battle';
      for (let t = 0; t < types.length; t++) {
        rt -= weights[t];
        if (rt <= 0) { type = types[t]; break; }
      }
      nodes.push({ id: id++, type, layer: l, x: xPos, y: yPos, completed: false, current: false, locked: false });
    }
  }

  // === 상점/대장간 강제 배치 ===
  // 일반 챕터: 상점 1개 (chapter 3+ 대장간 1개)
  // 튜토리얼 basic: 상점/대장간 둘 다 X
  // 튜토리얼 market: 상점 + 대장간 보장
  
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
  
  if (isTutorial && chapter.id === 'tutorial_basic') {
    // 튜토리얼 1: 상점/대장간 없음 (skip)
  } else if (isTutorial && chapter.id === 'tutorial_market') {
    // 튜토리얼 2: 상점 + 대장간 강제 (사전 전투 보장)
    // 상점은 layer 3 이후 (앞쪽 전투에서 골드 확보)
    const minShopLayer = Math.max(3, Math.ceil(layers / 3));
    const shopNode = pickRandomNode(minShopLayer, layers - 3);
    if (shopNode) shopNode.type = 'shop';
    
    // 대장간은 layer 2 이후 (전투 2~3회로 유물 확보)
    const minForgeLayer = 2;
    const forgeNode = pickRandomNode(minForgeLayer, layers - 3, shopNode ? [shopNode.id] : []);
    if (forgeNode) forgeNode.type = 'forge';
  } else {
    // 일반 챕터: 기존 로직
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
