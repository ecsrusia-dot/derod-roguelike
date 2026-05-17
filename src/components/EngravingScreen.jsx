// ============================================
// components/EngravingScreen.jsx — 직업 각인 화면 (1.25.0~)
// ============================================
// 5직업 카드 + 각성도 강화 + 각인 슬롯 표시 + 가챠
// 데이터는 src/data.js의 ENGRAVING_AWAKENING_TABLE / ENGRAVINGS / ENGRAVING_TIERS
// 전투 효과 적용은 PR 3에서 별도 처리 (이 화면은 표시·갱신만)
// ============================================
import React, { useState } from 'react';
import { ArrowLeft, Lock, Sparkles } from 'lucide-react';
import {
  PALETTE,
  rollEngravingCard,
  getEngravingById,
  isAwakeningConditionMet,
  describeAwakeningCondition,
  describeAwakeningConditionProgress,
} from '../utils/helpers.js';
import { saveMeta, getAwakeningLv, getEngravingSlots, getUnlockedSlotCount, applyAwakening, applyEngravingSlot } from '../storage.js';
import {
  CLASSES,
  ENGRAVING_AWAKENING_TABLE,
  ENGRAVING_TIERS,
  ENGRAVING_GACHA_COST,
  ENGRAVINGS,
} from '../data.js';

const AWAKEN_MAX_LV = 10;

export default function EngravingScreen({ meta, onMetaUpdate, onBack }) {
  const [selectedClassIdx, setSelectedClassIdx] = useState(0);
  // 가챠 모달: { classId, slotIdx, cost, currentCardId, newCardId }
  const [gachaResult, setGachaResult] = useState(null);

  const selectedClass = CLASSES[selectedClassIdx];
  const classId = selectedClass.id;
  const lv = getAwakeningLv(meta, classId);
  const slots = getEngravingSlots(meta, classId);
  const unlockedSlotCount = getUnlockedSlotCount(lv);
  const hasPool = (ENGRAVINGS[classId] || []).length > 0;

  // 다음 단계 정보
  const table = ENGRAVING_AWAKENING_TABLE[classId] || [];
  const nextStep = table.find(s => s.lv === lv + 1);  // 현재 lv 다음 단계
  const isMaxed = lv >= AWAKEN_MAX_LV;
  // 1.26.0~ 조건 시스템: 영혼 + 조건 둘 다 충족해야 강화 가능
  const conditionMet = !nextStep ? true : isAwakeningConditionMet(meta, classId, nextStep.lv);
  const canAfford = !!nextStep && (meta?.souls || 0) >= (nextStep?.cost || 0);
  const canAwaken = !!nextStep && !isMaxed && hasPool && canAfford && conditionMet;

  // 각성도 강화 핸들러
  const handleAwaken = () => {
    if (!canAwaken || !nextStep) return;
    let newMeta = meta;
    // 슬롯 개방이면 자동 가챠 → 슬롯에 부여
    if (nextStep.reward.type === 'slotUnlock') {
      const slotIdx = nextStep.reward.slot - 1;
      const card = rollEngravingCard(classId);
      newMeta = applyAwakening(meta, classId, nextStep.cost, slotIdx, card?.id || null);
    } else {
      newMeta = applyAwakening(meta, classId, nextStep.cost);
    }
    onMetaUpdate(newMeta);
    saveMeta(newMeta);
  };

  // 가챠 (변경) 핸들러
  const handleGacha = (slotIdx) => {
    if ((meta?.souls || 0) < ENGRAVING_GACHA_COST) return;
    const currentCardId = slots[slotIdx];
    const newCard = rollEngravingCard(classId);
    if (!newCard) return;
    setGachaResult({ classId, slotIdx, cost: ENGRAVING_GACHA_COST, currentCardId, newCardId: newCard.id });
  };

  // 가챠 결과 — 유지
  const handleKeepCurrent = () => {
    if (!gachaResult) return;
    // 영혼만 차감 (카드 변경 X)
    const newMeta = { ...meta, souls: (meta.souls || 0) - gachaResult.cost };
    onMetaUpdate(newMeta);
    saveMeta(newMeta);
    setGachaResult(null);
  };

  // 가챠 결과 — 덮어쓰기
  const handleOverwrite = () => {
    if (!gachaResult) return;
    const newMeta = applyEngravingSlot(meta, gachaResult.classId, gachaResult.slotIdx, gachaResult.newCardId, 0);
    onMetaUpdate(newMeta);
    saveMeta(newMeta);
    setGachaResult(null);
  };

  return (
    <div className="absolute inset-0 overflow-y-auto" style={{
      background: `radial-gradient(ellipse at top, ${PALETTE.panel} 0%, ${PALETTE.bgDeep} 70%)`,
    }}>
      {/* 헤더 */}
      <div className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between" style={{
        background: `linear-gradient(180deg, ${PALETTE.bgDeep}, ${PALETTE.bgDeep}ee)`,
        borderBottom: `1px solid ${PALETTE.panelBorder}`,
      }}>
        <button onClick={onBack} className="flex items-center gap-1 px-2 py-1" style={{
          background: 'transparent', color: PALETTE.textDim, fontSize: '11px',
        }}>
          <ArrowLeft size={14} />
          <span>타이틀</span>
        </button>
        <div className="text-xs tracking-[0.3em]" style={{ color: PALETTE.dawn, fontFamily: '"Cinzel", serif' }}>
          ENGRAVING
        </div>
        <div className="flex items-center gap-1" style={{ minWidth: '60px', justifyContent: 'flex-end' }}>
          <span style={{ color: PALETTE.twilight, fontSize: '13px' }}>✦</span>
          <span className="text-xs font-bold" style={{ color: PALETTE.text }}>{meta?.souls || 0}</span>
        </div>
      </div>

      {/* 제목 */}
      <div className="px-4 pt-3 pb-2">
        <div className="text-[10px] tracking-[0.3em]" style={{ color: PALETTE.textDim }}>JOB AWAKENING</div>
        <h2 className="text-lg font-bold mt-1" style={{ color: PALETTE.text }}>직업 각인</h2>
        <div className="text-[10px] mt-1" style={{ color: PALETTE.textDim, lineHeight: 1.5 }}>
          영혼으로 직업의 각성도를 올려 능력치·시작 패시브를 강화하고, 슬롯 개방 시 랜덤 각인을 부여받습니다.
          가챠로 각인을 변경할 수 있습니다.
        </div>
      </div>

      {/* 직업 탭 — 가로 스크롤 */}
      <div className="px-4 py-3 flex gap-2 overflow-x-auto" style={{
        scrollbarWidth: 'none',
      }}>
        {CLASSES.map((c, idx) => {
          const cLv = getAwakeningLv(meta, c.id);
          const isActive = idx === selectedClassIdx;
          const cHasPool = (ENGRAVINGS[c.id] || []).length > 0;
          return (
            <button key={c.id} onClick={() => setSelectedClassIdx(idx)} className="flex-shrink-0 px-3 py-2 transition-all" style={{
              background: isActive ? `linear-gradient(180deg, ${c.color}40, ${c.color}10)` : `${PALETTE.panel}80`,
              border: isActive ? `1.5px solid ${c.color}` : `1px solid ${PALETTE.panelBorder}`,
              minWidth: '80px',
            }}>
              <div className="text-[10px] font-bold tracking-wide" style={{ color: isActive ? c.color : PALETTE.text }}>
                {c.name}
              </div>
              <div className="text-[9px] mt-0.5" style={{ color: PALETTE.textDim }}>
                Lv.{cLv}{cHasPool ? '' : ' (준비 중)'}
              </div>
            </button>
          );
        })}
      </div>

      {/* 선택된 직업 상세 */}
      <div className="px-4 pb-6 space-y-3">
        {/* 각성도 카드 */}
        <div className="p-3" style={{
          background: `linear-gradient(180deg, ${selectedClass.color}25, ${selectedClass.color}08)`,
          border: `1px solid ${selectedClass.color}80`,
        }}>
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="text-[10px] tracking-[0.2em]" style={{ color: selectedClass.color }}>
                각성도
              </div>
              <div className="text-base font-bold mt-0.5" style={{ color: PALETTE.text, fontFamily: '"Cinzel", serif' }}>
                {selectedClass.name} · Lv.{lv} / {AWAKEN_MAX_LV}
              </div>
            </div>
            <div className="text-[9px]" style={{ color: PALETTE.textDim, textAlign: 'right' }}>
              슬롯 개방<br/>
              <span style={{ color: selectedClass.color }}>{unlockedSlotCount}</span> / 3
            </div>
          </div>
          {/* 진행 바 */}
          <div className="w-full h-1.5" style={{ background: `${PALETTE.bgDeep}` }}>
            <div style={{
              width: `${(lv / AWAKEN_MAX_LV) * 100}%`,
              height: '100%',
              background: `linear-gradient(90deg, ${selectedClass.color}, ${PALETTE.dawn})`,
            }} />
          </div>
        </div>

        {/* 풀 미작성 안내 (방랑검사 외 4직업) */}
        {!hasPool && (
          <div className="p-4 text-center" style={{
            background: `${PALETTE.panel}80`,
            border: `1px dashed ${PALETTE.panelBorder}`,
          }}>
            <div className="text-[11px] mb-1" style={{ color: PALETTE.textDim }}>
              각인 풀 작성 중
            </div>
            <div className="text-[10px]" style={{ color: PALETTE.textDim, lineHeight: 1.5 }}>
              {selectedClass.name}의 각인 카드는 후속 업데이트에서 공개됩니다.
              현재는 방랑검사만 24장 풀이 활성화되어 있습니다.
            </div>
          </div>
        )}

        {/* 다음 단계 카드 (각성도 강화) */}
        {hasPool && !isMaxed && nextStep && (
          <div className="p-3" style={{
            background: `${PALETTE.panel}90`,
            border: `1px solid ${PALETTE.panelBorder}`,
          }}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] tracking-[0.2em]" style={{ color: PALETTE.dawn }}>
                ▶ 다음 단계
              </div>
              <div className="flex items-center gap-1">
                <span style={{ color: PALETTE.twilight, fontSize: '11px' }}>✦</span>
                <span className="text-xs font-bold" style={{
                  color: canAwaken ? PALETTE.text : PALETTE.accent,
                }}>{nextStep.cost.toLocaleString()}</span>
              </div>
            </div>
            <div className="text-sm font-bold mb-1" style={{ color: PALETTE.text }}>
              Lv.{nextStep.lv}: {describeReward(nextStep.reward, classId)}
            </div>
            {/* 활성화 조건 표시 (1.26.0~) */}
            {nextStep.condition && (
              <div className="mt-2 px-2 py-1.5" style={{
                background: conditionMet ? `${PALETTE.green}15` : `${PALETTE.accent}15`,
                border: `1px solid ${conditionMet ? PALETTE.green : PALETTE.accent}80`,
              }}>
                <div className="text-[9px] tracking-[0.2em] mb-0.5" style={{
                  color: conditionMet ? PALETTE.green : PALETTE.accent,
                }}>
                  {conditionMet ? '◆ 활성화 조건 충족' : '◆ 활성화 조건 미달'}
                </div>
                <div className="text-[11px]" style={{ color: PALETTE.text, lineHeight: 1.4 }}>
                  {describeAwakeningCondition(nextStep.condition, classId)}
                  {' '}
                  <span style={{ color: PALETTE.textDim }}>
                    {describeAwakeningConditionProgress(meta, nextStep.condition, classId) || ''}
                  </span>
                </div>
              </div>
            )}
            <button
              onClick={handleAwaken}
              disabled={!canAwaken}
              className="w-full mt-2 py-2 transition-all"
              style={{
                background: canAwaken ? `linear-gradient(180deg, ${selectedClass.color}, ${selectedClass.color}80)` : `${PALETTE.panel}`,
                color: canAwaken ? PALETTE.text : PALETTE.textDim,
                border: `1px solid ${canAwaken ? selectedClass.color : PALETTE.panelBorder}`,
                fontSize: '12px',
                fontFamily: '"Cinzel", serif',
                letterSpacing: '0.25em',
                opacity: canAwaken ? 1 : 0.6,
                cursor: canAwaken ? 'pointer' : 'not-allowed',
              }}
            >
              {!conditionMet ? '조건 미달' : !canAfford ? '영혼 부족' : '각성도 강화'}
            </button>
          </div>
        )}

        {/* 만렙 표시 */}
        {hasPool && isMaxed && (
          <div className="p-3 text-center" style={{
            background: `linear-gradient(180deg, ${PALETTE.legendary}25, ${PALETTE.legendary}08)`,
            border: `1px solid ${PALETTE.legendary}`,
          }}>
            <div className="text-xs font-bold" style={{ color: PALETTE.legendary, fontFamily: '"Cinzel", serif', letterSpacing: '0.2em' }}>
              ★ MAX AWAKENING ★
            </div>
          </div>
        )}

        {/* 각인 슬롯 3개 */}
        {hasPool && (
          <div>
            <div className="text-[10px] tracking-[0.2em] mb-2" style={{ color: PALETTE.dawn }}>
              ◆ 각인 슬롯
            </div>
            <div className="space-y-2">
              {[0, 1, 2].map(slotIdx => {
                const isUnlocked = slotIdx < unlockedSlotCount;
                const unlockLv = slotIdx === 0 ? 2 : slotIdx === 1 ? 5 : 9;
                const cardId = slots[slotIdx];
                const card = getEngravingById(classId, cardId);
                const tierInfo = card ? ENGRAVING_TIERS[card.tier] : null;
                return (
                  <SlotCard
                    key={slotIdx}
                    slotIdx={slotIdx}
                    isUnlocked={isUnlocked}
                    unlockLv={unlockLv}
                    card={card}
                    tierInfo={tierInfo}
                    canAfford={(meta?.souls || 0) >= ENGRAVING_GACHA_COST}
                    onGacha={() => handleGacha(slotIdx)}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 가챠 결과 모달 */}
      {gachaResult && (
        <GachaResultModal
          classId={gachaResult.classId}
          currentCardId={gachaResult.currentCardId}
          newCardId={gachaResult.newCardId}
          onKeep={handleKeepCurrent}
          onOverwrite={handleOverwrite}
        />
      )}
    </div>
  );
}

// === 슬롯 카드 ===
function SlotCard({ slotIdx, isUnlocked, unlockLv, card, tierInfo, canAfford, onGacha }) {
  if (!isUnlocked) {
    return (
      <div className="p-3 flex items-center gap-3" style={{
        background: `${PALETTE.bgDeep}80`,
        border: `1px dashed ${PALETTE.panelBorder}`,
      }}>
        <Lock size={20} style={{ color: PALETTE.textDim }} />
        <div className="flex-1">
          <div className="text-[10px]" style={{ color: PALETTE.textDim }}>
            슬롯 {slotIdx + 1} (잠금)
          </div>
          <div className="text-[10px] mt-0.5" style={{ color: PALETTE.textDim }}>
            각성도 Lv.{unlockLv} 도달 시 개방
          </div>
        </div>
      </div>
    );
  }
  if (!card || !tierInfo) {
    return (
      <div className="p-3" style={{
        background: `${PALETTE.panel}80`,
        border: `1px solid ${PALETTE.panelBorder}`,
      }}>
        <div className="text-[10px]" style={{ color: PALETTE.textDim }}>
          슬롯 {slotIdx + 1} (비어 있음)
        </div>
        <div className="text-[10px] mt-0.5" style={{ color: PALETTE.textDim }}>
          (각인 데이터 없음 — 다시 강화 시 자동 부여)
        </div>
      </div>
    );
  }
  return (
    <div className="p-3" style={{
      background: `linear-gradient(180deg, ${tierInfo.color}20, ${tierInfo.color}05)`,
      border: `1px solid ${tierInfo.color}`,
      boxShadow: tierInfo.glow ? `0 0 12px ${tierInfo.color}40` : 'none',
    }}>
      <div className="flex items-start justify-between mb-1">
        <div className="flex-1">
          <div className="text-[9px] tracking-[0.2em]" style={{ color: tierInfo.color }}>
            슬롯 {slotIdx + 1} · {tierInfo.label}
          </div>
          <div className="text-sm font-bold mt-0.5" style={{ color: PALETTE.text }}>
            {card.name}
          </div>
        </div>
      </div>
      <div className="text-[10px] mt-1 mb-2" style={{ color: PALETTE.textDim, lineHeight: 1.5 }}>
        {card.desc}
      </div>
      <button
        onClick={onGacha}
        disabled={!canAfford}
        className="w-full py-1.5 transition-all"
        style={{
          background: canAfford ? `${PALETTE.twilight}40` : `${PALETTE.panel}`,
          color: canAfford ? PALETTE.text : PALETTE.textDim,
          border: `1px solid ${canAfford ? PALETTE.twilight : PALETTE.panelBorder}`,
          fontSize: '10px',
          letterSpacing: '0.2em',
          opacity: canAfford ? 1 : 0.6,
          cursor: canAfford ? 'pointer' : 'not-allowed',
        }}
      >
        <Sparkles size={11} className="inline mr-1" style={{ verticalAlign: '-2px' }} />
        변경 · ✦ {ENGRAVING_GACHA_COST}
      </button>
    </div>
  );
}

// === 가챠 결과 모달 ===
function GachaResultModal({ classId, currentCardId, newCardId, onKeep, onOverwrite }) {
  const current = getEngravingById(classId, currentCardId);
  const newCard = getEngravingById(classId, newCardId);
  const newTier = newCard ? ENGRAVING_TIERS[newCard.tier] : null;
  const curTier = current ? ENGRAVING_TIERS[current.tier] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{
      background: 'rgba(0, 0, 0, 0.85)',
    }}>
      <div className="w-full max-w-md" style={{
        background: PALETTE.bgDeep,
        border: `1.5px solid ${newTier?.color || PALETTE.dawn}`,
        boxShadow: newTier?.glow ? `0 0 30px ${newTier.color}60` : 'none',
      }}>
        <div className="px-4 py-3 text-center" style={{
          background: `linear-gradient(180deg, ${newTier?.color || PALETTE.dawn}30, ${newTier?.color || PALETTE.dawn}10)`,
          borderBottom: `1px solid ${PALETTE.panelBorder}`,
        }}>
          <div className="text-[10px] tracking-[0.3em]" style={{ color: PALETTE.dawn }}>
            각인 변경 결과
          </div>
          <div className="text-base font-bold mt-1" style={{ color: newTier?.color || PALETTE.text }}>
            {newTier?.label || ''} · {newCard?.name || '(없음)'}
          </div>
        </div>

        {/* 좌우 비교 */}
        <div className="grid grid-cols-2 gap-2 p-3">
          {/* 현재 */}
          <div className="p-2" style={{
            background: curTier ? `${curTier.color}15` : `${PALETTE.panel}`,
            border: `1px solid ${curTier?.color || PALETTE.panelBorder}`,
            minHeight: '110px',
          }}>
            <div className="text-[9px]" style={{ color: PALETTE.textDim }}>현재</div>
            {current ? (
              <>
                <div className="text-[9px] tracking-[0.15em] mt-1" style={{ color: curTier.color }}>
                  {curTier.label}
                </div>
                <div className="text-xs font-bold mt-0.5" style={{ color: PALETTE.text }}>
                  {current.name}
                </div>
                <div className="text-[10px] mt-1" style={{ color: PALETTE.textDim, lineHeight: 1.4 }}>
                  {current.desc}
                </div>
              </>
            ) : (
              <div className="text-[10px] mt-2" style={{ color: PALETTE.textDim }}>
                (비어 있음)
              </div>
            )}
          </div>
          {/* 신규 */}
          <div className="p-2" style={{
            background: newTier ? `${newTier.color}25` : `${PALETTE.panel}`,
            border: `1.5px solid ${newTier?.color || PALETTE.panelBorder}`,
            minHeight: '110px',
            boxShadow: newTier?.glow ? `0 0 10px ${newTier.color}50` : 'none',
          }}>
            <div className="text-[9px]" style={{ color: PALETTE.dawn }}>▶ 신규</div>
            {newCard ? (
              <>
                <div className="text-[9px] tracking-[0.15em] mt-1" style={{ color: newTier.color }}>
                  {newTier.label}
                </div>
                <div className="text-xs font-bold mt-0.5" style={{ color: PALETTE.text }}>
                  {newCard.name}
                </div>
                <div className="text-[10px] mt-1" style={{ color: PALETTE.textDim, lineHeight: 1.4 }}>
                  {newCard.desc}
                </div>
              </>
            ) : (
              <div className="text-[10px] mt-2" style={{ color: PALETTE.textDim }}>
                (롤 실패)
              </div>
            )}
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="grid grid-cols-2 gap-0">
          <button
            onClick={onKeep}
            autoFocus
            className="py-3 transition-all"
            style={{
              background: `${PALETTE.panel}`,
              color: PALETTE.text,
              border: `1px solid ${PALETTE.panelBorder}`,
              fontSize: '12px',
              fontFamily: '"Cinzel", serif',
              letterSpacing: '0.2em',
            }}
          >
            현재 유지
          </button>
          <button
            onClick={onOverwrite}
            className="py-3 transition-all"
            style={{
              background: `linear-gradient(180deg, ${newTier?.color || PALETTE.dawn}, ${newTier?.color || PALETTE.dawn}80)`,
              color: PALETTE.text,
              border: `1px solid ${newTier?.color || PALETTE.dawn}`,
              fontSize: '12px',
              fontFamily: '"Cinzel", serif',
              letterSpacing: '0.2em',
            }}
          >
            덮어쓰기
          </button>
        </div>
      </div>
    </div>
  );
}

// === 1.25.0 마이그레이션 안내 모달 ===
// meta_startSkillLv (단련된 영혼) → 직업 각인 시스템 이관 안내
// storage.js의 loadMeta에서 환불 처리 후 engravingMigrationNotice 세팅 → 이 모달 표시
export function EngravingMigrationModal({ notice, onClose }) {
  if (!notice) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4" style={{
      background: 'rgba(0, 0, 0, 0.85)',
    }}>
      <div className="w-full max-w-md" style={{
        background: PALETTE.bgDeep,
        border: `1.5px solid ${PALETTE.dawn}`,
        boxShadow: `0 0 30px ${PALETTE.dawn}50`,
      }}>
        <div className="px-4 py-3 text-center" style={{
          background: `linear-gradient(180deg, ${PALETTE.dawn}30, ${PALETTE.dawn}10)`,
          borderBottom: `1px solid ${PALETTE.panelBorder}`,
        }}>
          <div className="text-[10px] tracking-[0.3em]" style={{ color: PALETTE.dawn }}>
            1.25.0 시스템 변경 안내
          </div>
          <div className="text-base font-bold mt-1" style={{ color: PALETTE.text }}>
            직업 각인 시스템 신설
          </div>
        </div>
        <div className="px-4 py-4 space-y-3" style={{ color: PALETTE.text }}>
          <div className="text-[12px]" style={{ lineHeight: 1.6 }}>
            영혼의 제단의 <strong style={{ color: PALETTE.accent }}>「단련된 영혼」</strong> 강화가
            새로운 <strong style={{ color: PALETTE.dawn }}>「직업 각인」</strong> 시스템으로 이관되었습니다.
          </div>
          <div className="p-2" style={{
            background: `${PALETTE.twilight}20`,
            border: `1px solid ${PALETTE.twilight}80`,
          }}>
            <div className="text-[10px] mb-1" style={{ color: PALETTE.textDim }}>환불 영혼</div>
            <div className="flex items-center gap-2">
              <span style={{ color: PALETTE.twilight, fontSize: '20px' }}>✦</span>
              <span className="text-2xl font-bold" style={{ color: PALETTE.text, fontFamily: '"Cinzel", serif' }}>
                +{notice.refundedSouls.toLocaleString()}
              </span>
            </div>
            <div className="text-[10px] mt-1" style={{ color: PALETTE.textDim }}>
              기존 단계 {notice.refundedStack}Lv의 구매가가 100% 반환되었습니다.
            </div>
          </div>
          <div className="text-[11px]" style={{ color: PALETTE.textDim, lineHeight: 1.5 }}>
            ◆ 시작 패시브 +1Lv 효과는 각성도 <strong style={{ color: PALETTE.dawn }}>Lv.4·Lv.7</strong> 강화로 직업별 개별 적용됩니다.<br/>
            ◆ 타이틀의 <strong style={{ color: PALETTE.dawn }}>「직업 각인」</strong> 메뉴에서 강화·각인 가챠를 진행할 수 있습니다.
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-full py-3 transition-all"
          style={{
            background: `linear-gradient(180deg, ${PALETTE.dawn}, ${PALETTE.dawn}80)`,
            color: PALETTE.text,
            border: `1px solid ${PALETTE.dawn}`,
            fontSize: '12px',
            fontFamily: '"Cinzel", serif',
            letterSpacing: '0.3em',
          }}
        >
          확인
        </button>
      </div>
    </div>
  );
}

// === 1.26.0 각성도 조건 신설 안내 모달 ===
// 활성화 조건 추가 + 직업별 추적 데이터 소급 적용 불가 안내
export function AwakeningConditionNoticeModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4" style={{
      background: 'rgba(0, 0, 0, 0.85)',
    }}>
      <div className="w-full max-w-md" style={{
        background: PALETTE.bgDeep,
        border: `1.5px solid ${PALETTE.dawn}`,
        boxShadow: `0 0 30px ${PALETTE.dawn}50`,
      }}>
        <div className="px-4 py-3 text-center" style={{
          background: `linear-gradient(180deg, ${PALETTE.dawn}30, ${PALETTE.dawn}10)`,
          borderBottom: `1px solid ${PALETTE.panelBorder}`,
        }}>
          <div className="text-[10px] tracking-[0.3em]" style={{ color: PALETTE.dawn }}>
            1.26.0 시스템 추가 안내
          </div>
          <div className="text-base font-bold mt-1" style={{ color: PALETTE.text }}>
            각성도 활성화 조건 신설
          </div>
        </div>
        <div className="px-4 py-4 space-y-3" style={{ color: PALETTE.text }}>
          <div className="text-[12px]" style={{ lineHeight: 1.6 }}>
            직업 각성도 강화에 <strong style={{ color: PALETTE.dawn }}>활성화 조건</strong>이 추가되었습니다.
            영혼이 충분해도 조건을 만족하지 못하면 강화할 수 없습니다.
          </div>
          <div className="p-2 text-[11px]" style={{
            background: `${PALETTE.panel}80`,
            border: `1px solid ${PALETTE.panelBorder}`,
            lineHeight: 1.6,
          }}>
            <div style={{ color: PALETTE.dawn, marginBottom: '4px' }}>주요 조건 예시</div>
            <div style={{ color: PALETTE.textDim }}>
              ◆ Lv.2 = 해당 직업 수련의 길 클리어<br/>
              ◆ Lv.3 = 해당 직업으로 궁극 보상 1개 픽<br/>
              ◆ Lv.4·6·8 = 해당 직업 챔피언십 일반·하드·지옥 5컨셉 올 클리어<br/>
              ◆ Lv.5 = 해당 직업 시작 패시브 1개의 3궁극 모두 픽<br/>
              ◆ Lv.7·9·10 = 다른 직업들도 일정 각성도 이상 달성
            </div>
          </div>
          <div className="p-2 text-[10px]" style={{
            background: `${PALETTE.accent}15`,
            border: `1px solid ${PALETTE.accent}80`,
            color: PALETTE.text,
            lineHeight: 1.5,
          }}>
            <strong style={{ color: PALETTE.accent }}>⚠ 기존 진행도 소급 적용 불가</strong>
            <br/>이번 업데이트부터 직업별 챔피언십 클리어·궁극 픽이 추적됩니다.
            과거 클리어 기록은 직업 정보가 없어 자동 매핑이 불가능합니다.
            <br/>(수련의 길 클리어만 자동 인식)
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-full py-3 transition-all"
          style={{
            background: `linear-gradient(180deg, ${PALETTE.dawn}, ${PALETTE.dawn}80)`,
            color: PALETTE.text,
            border: `1px solid ${PALETTE.dawn}`,
            fontSize: '12px',
            fontFamily: '"Cinzel", serif',
            letterSpacing: '0.3em',
          }}
        >
          확인
        </button>
      </div>
    </div>
  );
}

// === 보상 설명 텍스트 ===
function describeReward(reward, classId) {
  if (!reward) return '';
  switch (reward.type) {
    case 'slotUnlock':
      return `각인 슬롯 ${reward.slot} 개방 (랜덤 각인 1장 부여)`;
    case 'statBonus':
      if (reward.stat === 'statTotal') return `능력치 합 +${reward.value} (자동 분배)`;
      return `${reward.stat} +${reward.value}`;
    case 'passiveBonus':
      return `시작 패시브 ${reward.skill} +${reward.delta}Lv`;
    case 'statPctBonus': {
      const labels = {
        counterRate: '반격율',
        magDmg: '마법 데미지',
        physDmg: '물리 데미지',
        dodge: '회피율',
        heal: '회복량',
      };
      return `${labels[reward.key] || reward.key} +${reward.pct}%`;
    }
    default:
      return JSON.stringify(reward);
  }
}
