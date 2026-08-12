// ============================================
// components/ExpeditionClearScreen.jsx — 원정 완전 클리어 화면
// ============================================
import React from 'react';
import { PALETTE, formatRunTime } from '../utils/helpers.js';
import { RELICS, TITLE_TIERS } from '../data.js';

export default function ExpeditionClearScreen({ expedition, soulsGained, firstClear, runStats = null, titleDrop = null, retreat = false, runTime = null, onContinue }) {
  // 신규 해금 유물 정보 찾기
  const newRelic = firstClear?.newRelic ? RELICS.find(r => r.name === firstClear.newRelic) : null;
  const isTutorial = expedition.isTutorial === true;
  // 1.93.0~ 무한모드 중간 포기 — 클리어가 아니라 자발 종료 정산
  const clearLabel = retreat ? 'EXPEDITION END' : isTutorial ? 'TUTORIAL CLEAR' : 'EXPEDITION CLEAR';
  const flavor = retreat
    ? '"여기까지의 전리품을 챙겨\n황혼을 벗어난다."'
    : isTutorial
    ? '"한 걸음의 끝.\n다음 시련이 기다린다."'
    : '"원정의 끝.\n영혼이 깃든다."';

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-6 py-8" style={{
      background: `radial-gradient(ellipse at center, ${expedition.color}40, ${PALETTE.bgDeep} 70%)`,
    }}>
      <div className="text-center mb-6">
        <div className="text-xs tracking-[0.4em] mb-3" style={{ color: PALETTE.legendary }}>━━ {clearLabel} ━━</div>
        <h2 className="text-3xl font-bold mb-2" style={{
          color: PALETTE.legendary, fontFamily: '"Cinzel", serif',
          textShadow: `0 0 30px ${PALETTE.legendary}80`,
        }}>{expedition.name}</h2>
        <p className="text-xs italic mt-2" style={{ color: PALETTE.textDim }}>{expedition.sub}</p>
      </div>
      <p className="text-sm text-center leading-relaxed mb-6 italic whitespace-pre-line" style={{ color: PALETTE.text }}>
        {flavor}
      </p>
      
      {/* 영혼 획득 카운터 */}
      <div className="mb-6 px-8 py-4 flex flex-col items-center" style={{
        background: `${PALETTE.twilight}30`,
        border: `1px solid ${PALETTE.twilight}`,
        boxShadow: `0 0 30px ${PALETTE.twilight}40`,
      }}>
        <div className="text-[10px] tracking-[0.3em] mb-2" style={{ color: PALETTE.twilight }}>SOULS GAINED</div>
        <div className="flex items-center gap-3">
          <span style={{ color: PALETTE.twilight, fontSize: '32px' }}>✦</span>
          <span className="text-4xl font-bold" style={{ 
            color: PALETTE.text, 
            fontFamily: '"Cinzel", serif',
            textShadow: `0 0 20px ${PALETTE.twilight}`,
          }}>+{soulsGained}</span>
        </div>
      </div>
      
      {/* 1.89.0~ 마스터즈 칭호 드랍 배너 */}
      {titleDrop && (
        <div className="mb-6 px-6 py-4 w-full max-w-sm text-center" style={{
          background: 'rgba(232,176,74,0.12)', borderRadius: 12,
          border: `2px solid ${TITLE_TIERS[titleDrop.tier]?.color || PALETTE.legendary}`,
          boxShadow: `0 0 30px ${TITLE_TIERS[titleDrop.tier]?.color || PALETTE.legendary}60`,
        }}>
          <div className="text-[10px] tracking-[0.3em] mb-1" style={{ color: TITLE_TIERS[titleDrop.tier]?.color }}>
            ◆ [{TITLE_TIERS[titleDrop.tier]?.name}] 칭호 {titleDrop.dup ? '중복' : '획득'} ◆
          </div>
          <div className="text-lg font-bold" style={{
            color: TITLE_TIERS[titleDrop.tier]?.color, fontFamily: '"Cinzel", serif',
            textShadow: `0 0 14px ${TITLE_TIERS[titleDrop.tier]?.color}88`,
          }}>「{titleDrop.title.name}」</div>
          <div className="text-[10.5px] mt-1.5" style={{ color: PALETTE.text }}>
            {titleDrop.dup
              ? `이미 보유 — 영혼 +${titleDrop.souls} 대체 지급`
              : `${titleDrop.title.desc} · 원정 선택 → 마스터즈 탭에서 장착`}
          </div>
        </div>
      )}

      {/* 1.100.0~ 런타임 (×1 배속 기준) + 베스트 갱신 표시 */}
      {runTime && (
        <div className="mb-4 px-5 py-2 flex items-center gap-2" style={{
          borderRadius: 999, background: runTime.best ? 'rgba(232,176,74,0.14)' : 'rgba(0,0,0,0.45)',
          border: `1px solid ${runTime.best ? PALETTE.legendary : 'rgba(255,255,255,0.15)'}`,
        }}>
          <span style={{ fontSize: 12, color: PALETTE.dawn }}>⏱</span>
          <span className="tabular-nums font-bold" style={{ fontSize: 14, color: runTime.best ? PALETTE.legendary : PALETTE.text }}>
            {formatRunTime(runTime.ms)}
          </span>
          <span style={{ fontSize: 9.5, color: PALETTE.textDim }}>×1 기준</span>
          {runTime.best && <span className="font-bold" style={{ fontSize: 10.5, color: PALETTE.legendary }}>★ 베스트 갱신!</span>}
        </div>
      )}

      {/* 1.81.0~ 런 정산 — 전투 수·총 데미지·스킬 기여도·획득 자원 */}
      {runStats && runStats.battles > 0 && (
        <div className="mb-6 px-4 py-3 w-full max-w-sm" style={{
          background: 'rgba(0,0,0,0.45)', borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.14)',
        }}>
          <div className="text-[9px] tracking-[0.3em] text-center mb-2" style={{ color: PALETTE.dawn }}>━ 원정 정산 ━</div>
          <div className="flex justify-center gap-4 mb-2 tabular-nums" style={{ fontSize: 11, color: PALETTE.text }}>
            <span>전투 <b>{runStats.battles}</b>회</span>
            <span>총 데미지 <b style={{ color: PALETTE.legendary }}>{runStats.totalDmg}</b></span>
          </div>
          {Object.entries(runStats.bySource).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([src, dmg]) => (
            <div key={src} className="flex items-center gap-2" style={{ marginTop: 3 }}>
              <span className="flex-none truncate" style={{ width: 80, fontSize: 10, color: PALETTE.text }}>{src}</span>
              <div className="flex-1" style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.max(4, (dmg / Math.max(1, runStats.totalDmg)) * 100)}%`, borderRadius: 999, background: `linear-gradient(90deg, ${PALETTE.legendary}77, ${PALETTE.legendary})` }} />
              </div>
              <span className="flex-none tabular-nums text-right" style={{ width: 58, fontSize: 9.5, color: PALETTE.textDim }}>{Math.round((dmg / Math.max(1, runStats.totalDmg)) * 100)}%</span>
            </div>
          ))}
          <div className="flex justify-center gap-3 mt-2 pt-2 tabular-nums" style={{ fontSize: 10.5, color: PALETTE.textDim, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <span style={{ color: PALETTE.dawn }}>● 은화 +{runStats.gold}</span>
            <span style={{ color: PALETTE.twilight }}>◆ 보석 +{runStats.gem}</span>
            <span style={{ color: PALETTE.legendary }}>✦ 영혼 +{runStats.souls}</span>
          </div>
        </div>
      )}

      {/* 첫 클리어 시 신규 유물 안내 */}
      {newRelic && (
        <div className="mb-6 px-6 py-4 w-full max-w-sm" style={{
          background: `${PALETTE.legendary}15`,
          border: `2px solid ${PALETTE.legendary}`,
          boxShadow: `0 0 30px ${PALETTE.legendary}60`,
        }}>
          <div className="text-[10px] tracking-[0.3em] text-center mb-2" style={{ color: PALETTE.legendary }}>
            ◆ 첫 클리어 — 신규 유물 해금 ◆
          </div>
          <div className="text-base font-bold text-center mb-2" style={{ 
            color: newRelic.color || PALETTE.legendary,
            textShadow: `0 0 12px ${newRelic.color || PALETTE.legendary}80`,
          }}>
            {newRelic.name}
          </div>
          <div className="text-[11px] leading-relaxed text-center" style={{ color: PALETTE.text }}>
            {newRelic.desc}
          </div>
          <div className="mt-3 pt-3 text-[10px] text-center italic" style={{ 
            color: PALETTE.textDim,
            borderTop: `1px solid ${PALETTE.legendary}40`,
          }}>
            이후 시작 유물 / 보상 / 사건에서 낮은 확률로 등장
          </div>
        </div>
      )}
      
      <button onClick={onContinue} className="px-12 py-3" style={{
        background: `linear-gradient(180deg, ${PALETTE.legendary}40, ${PALETTE.legendary}20)`,
        border: `1px solid ${PALETTE.legendary}`,
        color: PALETTE.text, letterSpacing: '0.3em', fontSize: '14px',
      }}>▸ 메인 메뉴</button>
    </div>
  );
}

// =========== 사망 화면 ===========
