// ============================================
// ui/UpdateButton.jsx — 최신 버전 업데이트 버튼 (1.179.1, 1.223.0 공용 컴포넌트로 분리)
// D&T 타이틀 · 황혼 연대기 타이틀에서 같이 쓴다. 진입 시 1회 자동 확인, 탭하면 재확인/업데이트.
// ============================================
import React from 'react';
import { PALETTE } from '../../utils/helpers.js';
import { GAME_VERSION } from '../../data/version.js';
import { checkLatestVersion, compareVersions, forceAppUpdate } from '../../utils/appUpdate.js';

export default function UpdateButton() {
  // status: checking | latest | available | updating | error
  const [status, setStatus] = React.useState('checking');
  const [latest, setLatest] = React.useState(null);
  const check = React.useCallback(async () => {
    setStatus('checking');
    const r = await checkLatestVersion();
    if (r.error) { setStatus('error'); return; }
    setLatest(r.latest);
    setStatus(compareVersions(r.latest, GAME_VERSION) > 0 ? 'available' : 'latest');
  }, []);
  React.useEffect(() => { check(); }, [check]);
  const onClick = () => {
    if (status === 'available') { setStatus('updating'); forceAppUpdate(); return; }
    if (status !== 'checking' && status !== 'updating') check();
  };
  const label = {
    checking: '⟳ 확인 중…',
    latest: '✓ 최신 버전',
    available: `⬆ v${latest} 업데이트`,
    updating: '⟳ 업데이트 중…',
    error: '⟳ 업데이트 확인',
  }[status];
  const hot = status === 'available';
  return (
    <button onClick={onClick} className={`ui-press${hot ? ' ui-sheen' : ''}`} aria-label="최신 버전 업데이트" style={{
      minHeight: 32, padding: '0 12px', borderRadius: 999, fontSize: 11, letterSpacing: '0.06em', fontWeight: hot ? 700 : 400,
      background: hot ? `${PALETTE.legendary}26` : 'transparent',
      border: `1px solid ${hot ? PALETTE.legendary : PALETTE.panelBorder}`,
      color: hot ? PALETTE.legendary : PALETTE.textDim,
    }}>{label}</button>
  );
}

