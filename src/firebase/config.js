// ============================================
// firebase/config.js — Firebase 초기화
// ============================================
// 종필님 Firebase 프로젝트: derod-f2548
// ============================================

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBMTY3loXzXab3Eq45jesXsZ3_YH3tcuyQ",
  authDomain: "derod-f2548.firebaseapp.com",
  projectId: "derod-f2548",
  storageBucket: "derod-f2548.firebasestorage.app",
  messagingSenderId: "719621295371",
  appId: "1:719621295371:web:14d243e563d0781def660e"
};

// Firebase 초기화
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
