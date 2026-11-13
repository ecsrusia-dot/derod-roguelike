// ============================================
// ErrorBoundary.jsx — 화면 오류 방어막 (1.277.3)
// ============================================
// 화면 한 곳에서 오류가 나도 흰 화면 대신 안내 창을 보여 준다.
// 저장(IndexedDB · localStorage · 클라우드)은 건드리지 않는다 — 다시 시도 / 게임 선택 / 새로 고침만 제공.
// ============================================
import React from 'react';

const BG = '#140b0f', TEXT = '#f0e6da', DIM = '#a8998c', GOLD = '#e3c27a', LINE = 'rgba(255,255,255,0.14)';

export default class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null, tries: 0 }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) {
    try { console.error('[ErrorBoundary]', this.props.name || '', error, info?.componentStack); } catch { /* 무시 */ }
  }
  render() {
    const { error, tries } = this.state;
    if (!error) return <React.Fragment key={tries}>{this.props.children}</React.Fragment>;
    const msg = String(error?.message || error || '알 수 없는 오류').slice(0, 200);
    const btn = (label, onClick, primary) => (
      <button onClick={onClick} style={{
        width: '100%', minHeight: 44, borderRadius: 13, fontSize: 14, fontWeight: 700, cursor: 'pointer',
        border: `1px solid ${primary ? GOLD : LINE}`, background: primary ? GOLD : 'rgba(255,255,255,0.05)', color: primary ? BG : TEXT,
      }}>{label}</button>
    );
    return (
      <div role="alert" style={{
        position: 'absolute', inset: 0, minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, background: BG, color: TEXT, fontFamily: '"Noto Serif KR", serif', zIndex: 100,
      }}>
        <div style={{ width: '100%', maxWidth: 340, textAlign: 'center' }}>
          <div style={{ fontSize: 11, letterSpacing: '0.4em', color: GOLD }}>ERROR</div>
          <div style={{ fontSize: 19, fontWeight: 700, marginTop: 6 }}>화면을 그리다 문제가 생겼습니다</div>
          <div style={{ fontSize: 13, color: DIM, marginTop: 10, lineHeight: 1.6 }}>
            저장은 그대로 남아 있습니다.<br />아래 버튼으로 다시 시도해 주세요.
          </div>
          <div style={{
            fontSize: 11, color: DIM, marginTop: 14, padding: '8px 10px', borderRadius: 10, border: `1px solid ${LINE}`,
            background: 'rgba(0,0,0,0.3)', wordBreak: 'break-all', textAlign: 'left',
          }}>
            {this.props.name ? `[${this.props.name}] ` : ''}{msg}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
            {btn('다시 시도', () => this.setState({ error: null, tries: tries + 1 }), true)}
            {this.props.onExit && btn('게임 선택으로', () => { this.setState({ error: null, tries: tries + 1 }); this.props.onExit(); })}
            {btn('새로 고침', () => { try { window.location.reload(); } catch { /* 무시 */ } })}
          </div>
        </div>
      </div>
    );
  }
}
