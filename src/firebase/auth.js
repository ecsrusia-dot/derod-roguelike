// ============================================
// firebase/auth.js — 익명/구글 인증
// ============================================
// Phase 1: 익명 + 구글 로그인 / 로그아웃
// Phase 2 (예정): 게스트 → 구글 계정 전환 (linkWithCredential)
// ============================================

import { 
  signInAnonymously, 
  signInWithPopup,
  signInWithRedirect,
  GoogleAuthProvider,
  signOut as fbSignOut,
  onAuthStateChanged,
  linkWithPopup,
} from 'firebase/auth';
import { auth } from './config.js';

// 게스트 로그인 (익명)
export async function signInGuest() {
  try {
    const result = await signInAnonymously(auth);
    return result.user;
  } catch (err) {
    console.error('[Auth] Guest sign-in failed:', err);
    throw err;
  }
}

// 구글 로그인
export async function signInGoogle() {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (err) {
    console.error('[Auth] Google sign-in failed:', err);
    // 모바일에서는 popup 차단 가능 → redirect 폴백
    if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user') {
      try {
        await signInWithRedirect(auth, provider);
        return null; // redirect 후 페이지 리로드
      } catch (e) {
        console.error('[Auth] Redirect also failed:', e);
        throw e;
      }
    }
    throw err;
  }
}

// 게스트 계정을 구글 계정으로 연동 (데이터 유지)
export async function linkGuestToGoogle() {
  if (!auth.currentUser) throw new Error('Not signed in');
  const provider = new GoogleAuthProvider();
  try {
    const result = await linkWithPopup(auth.currentUser, provider);
    return result.user;
  } catch (err) {
    console.error('[Auth] Link to Google failed:', err);
    throw err;
  }
}

// 로그아웃
export async function signOut() {
  try {
    await fbSignOut(auth);
  } catch (err) {
    console.error('[Auth] Sign-out failed:', err);
    throw err;
  }
}

// 현재 사용자 감지
export function watchAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}

// 현재 사용자 (즉시)
export function getCurrentUser() {
  return auth.currentUser;
}

// 사용자 정보 요약
export function getUserInfo(user) {
  if (!user) return null;
  return {
    uid: user.uid,
    isAnonymous: user.isAnonymous,
    displayName: user.displayName || (user.isAnonymous ? '게스트' : '플레이어'),
    email: user.email || null,
    photoURL: user.photoURL || null,
  };
}
