// ============================================
// cloud/useGameCloudSync.js — 미니 게임 클라우드 자동 저장 훅 (1.237.2)
// ============================================
// 본편과 같은 Firebase 계정으로 users/{uid}/{slot}/save에 자동 저장 (gameSave.js)
//   ① 로그인이 확인되면 클라우드를 내려받아 비교 — 없으면 올리기 · 요약이 같으면 확인 완료 · 다르면 conflict
//   ② 확인(checkedUid)이 끝난 계정만 자동 업로드 — 빈 새 기기가 클라우드 진행을 덮어쓰지 않게
//   ③ 자동 업로드 = 바뀐 게 있을 때 everyMs마다 + 앱을 내릴 때(visibility hidden)
// 사용: const sync = useGameCloudSync({ slot, data, onLoad, summarize, compare, validate })
//   onLoad(obj) = 클라우드 내용으로 바꾸기 · compare(local, cloud) → { same, cloudAhead }
// 황혼 연대기는 1.237.1에 같은 규칙으로 ChronicleGame에 직접 구현돼 있다 (기능 동일)
// ============================================
import { useEffect, useRef, useState } from 'react';
import { watchAuthState, signInGoogle, getUserInfo } from './auth.js';
import { uploadGameSave, downloadGameSave } from './gameSave.js';

export function useGameCloudSync({ slot, data, onLoad, summarize, compare, validate = () => true, everyMs = 30000 }) {
  const [user, setUser] = useState(null);
  const [state, setState] = useState({ checkedUid: null, lastUp: null, busy: false, error: null });
  const [conflict, setConflict] = useState(null);
  const dataRef = useRef(data); dataRef.current = data;
  const dirtyRef = useRef(false);
  useEffect(() => { dirtyRef.current = true; }, [data]);
  useEffect(() => {
    let unsub = () => {};
    try { unsub = watchAuthState((u) => setUser(u ? getUserInfo(u) : null)); } catch { /* firebase 미초기화 */ }
    return unsub;
  }, []);

  const upload = async (uid = user?.uid) => {
    if (!uid) return { ok: false, error: '로그인이 필요합니다' };
    setState(s => ({ ...s, busy: true }));
    const d = dataRef.current;
    const r = await uploadGameSave(uid, slot, d, summarize(d));
    if (r.ok) dirtyRef.current = false;
    setState(s => ({ ...s, busy: false, lastUp: r.ok ? r.savedAt : s.lastUp, error: r.ok ? null : r.error, checkedUid: r.ok ? uid : s.checkedUid }));
    return r;
  };

  // ① 로그인 확인 → 비교
  useEffect(() => {
    const uid = user?.uid;
    if (!uid || state.checkedUid === uid) return;
    let alive = true;
    (async () => {
      setState(s => ({ ...s, busy: true, error: null }));
      const r = await downloadGameSave(uid, slot, validate);
      if (!alive) return;
      if (!r.ok) { setState(s => ({ ...s, busy: false, error: r.error })); return; }
      if (!r.exists) { setState(s => ({ ...s, busy: false })); await upload(uid); return; }
      const local = summarize(dataRef.current);
      const cloudSum = r.summary || summarize(r.obj);
      const cmp = compare(local, cloudSum);
      if (cmp.same) { setState(s => ({ ...s, busy: false, checkedUid: uid, lastUp: r.savedAt })); return; }
      setState(s => ({ ...s, busy: false }));
      setConflict({ uid, obj: r.obj, savedAt: r.savedAt, cloud: cloudSum, local, cloudAhead: cmp.cloudAhead });
    })();
    return () => { alive = false; };
  }, [user?.uid, state.checkedUid]); // eslint-disable-line react-hooks/exhaustive-deps

  // ③ 자동 업로드
  useEffect(() => {
    const uid = user?.uid;
    if (!uid || state.checkedUid !== uid) return;
    const tick = () => { if (dirtyRef.current) upload(uid); };
    const id = setInterval(tick, everyMs);
    const onHide = () => { if (document.visibilityState === 'hidden') tick(); };
    document.addEventListener('visibilitychange', onHide);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onHide); };
  }, [user?.uid, state.checkedUid]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    user, state, conflict,
    chooseCloud: () => { const cf = conflict; if (!cf) return; onLoad(cf.obj); dirtyRef.current = false; setConflict(null); setState(s => ({ ...s, checkedUid: cf.uid, lastUp: cf.savedAt })); },
    chooseLocal: async () => { const cf = conflict; if (!cf) return null; setConflict(null); return upload(cf.uid); },
    login: async () => { try { await signInGoogle(); } catch { setState(s => ({ ...s, error: '구글 로그인에 실패했습니다' })); } },
    upload: () => upload(),
    download: async () => {
      if (!user) return null;
      setState(s => ({ ...s, busy: true }));
      const r = await downloadGameSave(user.uid, slot, validate);
      setState(s => ({ ...s, busy: false, error: r.ok ? null : r.error }));
      return r;
    },
  };
}
