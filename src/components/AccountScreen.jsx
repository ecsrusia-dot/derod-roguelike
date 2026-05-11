// ============================================
// components/AccountScreen.jsx — 계정 관리
// ============================================
// 현재 로그인 상태 표시
// 로그아웃 (계정 유지하고 LoginScreen으로)
// 게스트 → 구글 연동 (데이터 유지)
// ============================================

import React, { useState } from 'react';
import { PALETTE } from '../utils/helpers.js';

export default function AccountScreen({ 
  authMode,         // 'local' | 'guest' | 'google'
  firebaseUser,     // Firebase user object (null if local)
  meta,             // 현재 메타 (souls 등 정보 표시용)
  onLogout,         // 로그아웃 핸들러
  onLinkGoogle,     // 게스트 → 구글 연동 핸들러
  onClose,
}) {
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  
  const userInfo = firebaseUser ? {
    name: firebaseUser.displayName || (firebaseUser.isAnonymous ? '게스트' : '플레이어'),
    email: firebaseUser.email,
    isAnonymous: firebaseUser.isAnonymous,
  } : null;
  
  const modeInfo = {
    local: { label: '로컬 모드', desc: '이 기기에만 저장됨', color: PALETTE.textDim },
    guest: { label: '게스트', desc: '익명 클라우드 (UID 기반)', color: PALETTE.twilight },
    google: { label: 'Google 계정', desc: '멀티 디바이스 동기화', color: PALETTE.legendary },
  }[authMode] || { label: '알 수 없음', desc: '', color: PALETTE.textDim };
  
  const handleLink = async () => {
    setLoading('link');
    setError(null);
    try {
      await onLinkGoogle();
    } catch (err) {
      setError(err.message || '구글 연동 실패');
    } finally {
      setLoading(null);
    }
  };
  
  const handleLogoutClick = async () => {
    if (!confirmLogout) {
      setConfirmLogout(true);
      return;
    }
    setLoading('logout');
    setError(null);
    try {
      await onLogout();
    } catch (err) {
      setError(err.message || '로그아웃 실패');
      setLoading(null);
    }
  };
  
  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: PALETTE.bgDeep }}>
      {/* 헤더 */}
      <div className="px-4 py-3" style={{ borderBottom: `1px solid ${PALETTE.panelBorder}` }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] tracking-[0.3em]" style={{ color: PALETTE.textDim }}>━━ 계정 ━━</div>
            <div className="text-base font-bold mt-0.5" style={{ 
              color: PALETTE.text,
              fontFamily: '"Cinzel", serif',
            }}>
              계정 관리
            </div>
          </div>
          <button onClick={onClose} className="text-xl px-2" style={{ color: PALETTE.textDim }}>✕</button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* 현재 상태 */}
        <div className="p-4" style={{ 
          background: `${modeInfo.color}15`,
          border: `1px solid ${modeInfo.color}60`,
        }}>
          <div className="text-[10px] tracking-[0.2em] mb-1" style={{ color: PALETTE.textDim }}>
            ◇ 현재 모드
          </div>
          <div className="text-base font-bold mb-1" style={{ color: modeInfo.color }}>
            {modeInfo.label}
          </div>
          <div className="text-[11px]" style={{ color: PALETTE.textDim }}>
            {modeInfo.desc}
          </div>
          
          {/* 구글 사용자 정보 */}
          {userInfo && !userInfo.isAnonymous && (
            <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${modeInfo.color}30` }}>
              <div className="text-[11px]" style={{ color: PALETTE.text }}>
                {userInfo.name}
              </div>
              {userInfo.email && (
                <div className="text-[10px] mt-0.5" style={{ color: PALETTE.textDim }}>
                  {userInfo.email}
                </div>
              )}
            </div>
          )}
          
          {/* 게스트 UID (참고용) */}
          {userInfo && userInfo.isAnonymous && firebaseUser && (
            <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${modeInfo.color}30` }}>
              <div className="text-[9px]" style={{ color: PALETTE.textDim }}>
                UID: {firebaseUser.uid.slice(0, 12)}...
              </div>
            </div>
          )}
        </div>
        
        {/* 메타 통계 */}
        <div className="p-3" style={{ 
          background: PALETTE.panel,
          border: `1px solid ${PALETTE.panelBorder}`,
        }}>
          <div className="text-[10px] tracking-[0.2em] mb-2" style={{ color: PALETTE.textDim }}>
            ◇ 진행 정보
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="flex justify-between" style={{ color: PALETTE.text }}>
              <span style={{ color: PALETTE.textDim }}>영혼</span>
              <span style={{ color: PALETTE.twilight }}>✦ {meta?.souls || 0}</span>
            </div>
            <div className="flex justify-between" style={{ color: PALETTE.text }}>
              <span style={{ color: PALETTE.textDim }}>총 처치</span>
              <span>{meta?.totalKills || 0}</span>
            </div>
            <div className="flex justify-between" style={{ color: PALETTE.text }}>
              <span style={{ color: PALETTE.textDim }}>총 도전</span>
              <span>{meta?.totalRuns || 0}</span>
            </div>
            <div className="flex justify-between" style={{ color: PALETTE.text }}>
              <span style={{ color: PALETTE.textDim }}>해금</span>
              <span>{(meta?.unlocks || []).length}</span>
            </div>
          </div>
        </div>
        
        {/* 게스트 → 구글 연동 (게스트일 때만) */}
        {authMode === 'guest' && (
          <div className="p-4" style={{ 
            background: `${PALETTE.legendary}10`,
            border: `1px dashed ${PALETTE.legendary}`,
          }}>
            <div className="text-[10px] tracking-[0.2em] mb-1" style={{ color: PALETTE.legendary }}>
              ◇ 추천
            </div>
            <div className="text-[12px] mb-2" style={{ color: PALETTE.text }}>
              Google 계정으로 연동하여 안전하게 보호하세요
            </div>
            <div className="text-[10px] mb-3" style={{ color: PALETTE.textDim }}>
              현재 진행 데이터는 그대로 유지됩니다
            </div>
            <button 
              onClick={handleLink}
              disabled={loading !== null}
              className="w-full py-2.5 transition-all"
              style={{
                background: `linear-gradient(180deg, ${PALETTE.legendary}40, ${PALETTE.legendary}20)`,
                color: PALETTE.text,
                border: `1px solid ${PALETTE.legendary}`,
                letterSpacing: '0.15em',
                fontSize: '12px',
              }}
            >
              {loading === 'link' ? '연동 중...' : 'G  Google 계정 연동'}
            </button>
          </div>
        )}
        
        {/* 모드 정보 — 로컬일 때 경고 */}
        {authMode === 'local' && (
          <div className="p-3" style={{ 
            background: `${PALETTE.accent}10`,
            border: `1px solid ${PALETTE.accent}40`,
          }}>
            <div className="text-[11px] mb-1" style={{ color: PALETTE.accent }}>
              ⚠ 로컬 모드 주의
            </div>
            <div className="text-[10px]" style={{ color: PALETTE.textDim }}>
              브라우저 데이터 삭제 시 진행이 사라집니다.<br/>
              iOS Safari는 7일 미사용 시 자동 삭제될 수 있습니다.
            </div>
          </div>
        )}
        
        {/* 로그아웃 */}
        <div className="pt-4" style={{ borderTop: `1px solid ${PALETTE.panelBorder}` }}>
          {!confirmLogout ? (
            <button 
              onClick={handleLogoutClick}
              disabled={loading !== null}
              className="w-full py-2.5 transition-all"
              style={{
                background: 'transparent',
                color: PALETTE.textDim,
                border: `1px solid ${PALETTE.panelBorder}`,
                letterSpacing: '0.15em',
                fontSize: '11px',
              }}
            >
              {authMode === 'local' ? '모드 변경' : '로그아웃'}
            </button>
          ) : (
            <div className="space-y-2">
              <div className="text-[11px] text-center mb-2" style={{ color: PALETTE.accent }}>
                ⚠ 정말 {authMode === 'local' ? '모드를 변경' : '로그아웃'}하시겠습니까?
              </div>
              {authMode === 'guest' && (
                <div className="text-[10px] text-center mb-2" style={{ color: PALETTE.textDim }}>
                  게스트 데이터는 Google 연동하지 않으면 다시 접근 불가
                </div>
              )}
              <button 
                onClick={handleLogoutClick}
                disabled={loading !== null}
                className="w-full py-2.5"
                style={{
                  background: `${PALETTE.accent}30`,
                  color: PALETTE.text,
                  border: `1px solid ${PALETTE.accent}`,
                  letterSpacing: '0.15em',
                  fontSize: '12px',
                }}
              >
                {loading === 'logout' ? '처리 중...' : '확인'}
              </button>
              <button 
                onClick={() => setConfirmLogout(false)}
                disabled={loading !== null}
                className="w-full py-2"
                style={{
                  background: 'transparent',
                  color: PALETTE.textDim,
                  border: `1px solid ${PALETTE.panelBorder}`,
                  fontSize: '11px',
                }}
              >
                취소
              </button>
            </div>
          )}
        </div>
        
        {/* 에러 */}
        {error && (
          <div className="text-[11px] text-center py-2" style={{ 
            color: PALETTE.accent, 
            background: `${PALETTE.accent}10`,
            border: `1px solid ${PALETTE.accent}40`,
          }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
