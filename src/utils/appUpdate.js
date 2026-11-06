// ============================================
// utils/appUpdate.js — 최신 버전 확인 + 강제 업데이트 (1.179.1)
// ============================================
// 설치형 PWA는 서비스워커 캐시 때문에 새 배포가 바로 반영되지 않을 수 있다.
// checkLatestVersion: 배포된 version.json(캐시 우회)과 현재 실행 중인 GAME_VERSION 비교
// forceAppUpdate: 서비스워커 갱신 → 앱 캐시 삭제(일러 캐시는 유지) → 새로고침
// 저장 데이터는 IndexedDB·클라우드에 있어 캐시 삭제와 무관 (진행 상황 보존)

const KEEP_CACHES = ['game-illustrations-cache', 'google-fonts-cache']; // 재다운로드 비용 큰 이미지·폰트는 유지

export function compareVersions(a = '0.0.0', b = '0.0.0') {
  const pa = String(a).split('.').map(n => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d > 0 ? 1 : -1;
  }
  return 0;
}

// 반환: { latest: '1.x.y' } 또는 { error: 'offline' | 'unavailable' }
export async function checkLatestVersion() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { error: 'offline' };
  try {
    const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return { error: 'unavailable' };
    const data = await res.json();
    return data?.version ? { latest: data.version } : { error: 'unavailable' };
  } catch {
    return { error: 'unavailable' };
  }
}

export async function forceAppUpdate() {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.update().catch(() => {})));
      await Promise.all(regs.map(r => r.unregister().catch(() => {})));
    }
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => !KEEP_CACHES.includes(k)).map(k => caches.delete(k)));
    }
  } catch { /* 실패해도 새로고침으로 진행 */ }
  const url = new URL(window.location.href);
  url.searchParams.set('v', String(Date.now()));
  window.location.replace(url.toString());
}
