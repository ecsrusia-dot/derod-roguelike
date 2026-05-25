import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages에 배포할 때 저장소 이름을 base에 적어야 합니다.
// 예: 저장소가 https://github.com/jongphil/derod-roguelike 면 base는 '/derod-roguelike/'
//     Vercel 또는 커스텀 도메인을 쓴다면 '/'로 둡니다.
const REPO_NAME = 'derod-roguelike';

// Vercel은 빌드 시 VERCEL=1 환경변수를 자동으로 주입함
const isVercel = !!process.env.VERCEL;
const BASE = isVercel ? '/' : (process.env.NODE_ENV === 'production' ? `/${REPO_NAME}/` : '/');
const SCOPE = isVercel ? '/' : `/${REPO_NAME}/`;

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Dawn and Twilight',
        short_name: 'D&T',
        description: '행복과 불행 사이 - 텍스트 기반 다크 판타지 로그라이크',
        theme_color: '#0a0608',
        background_color: '#050304',
        display: 'fullscreen',
        orientation: 'portrait',
        scope: SCOPE,
        start_url: SCOPE,
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        skipWaiting: true,        // 새 SW 즉시 활성화
        clientsClaim: true,        // 페이지가 즉시 새 SW 사용
        cleanupOutdatedCaches: true,  // 옛 캐시 자동 삭제
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  build: {
    target: 'es2020',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'icons': ['lucide-react'],
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
        },
      },
    },
  },
});
