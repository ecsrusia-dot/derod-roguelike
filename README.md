# 데로드앤데블랑 로그라이크

> 행복과 불행 사이 — 텍스트 기반 다크 판타지 모바일 PWA 게임

## 요구사항

- Node.js 20 이상
- npm 또는 yarn
- GitHub 계정 (배포용)

## 빠른 시작

### 1. 의존성 설치

```bash
npm install
```

### 2. 로컬 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:5173` 으로 접속.

### 3. 모바일에서 로컬 테스트

같은 Wi-Fi에 연결된 핸드폰으로 PC IP에 접속하면 즉시 테스트 가능:

```bash
npm run dev -- --host
```

출력에 나오는 `Network: http://192.168.x.x:5173` 같은 주소로 핸드폰에서 접속.

### 4. 프로덕션 빌드

```bash
npm run build
```

`dist/` 폴더에 정적 파일이 생성됩니다.

### 5. 빌드 결과 미리보기

```bash
npm run preview
```

---

## GitHub Pages 배포

### 1. GitHub 저장소 생성

GitHub에서 `derod-roguelike` 저장소를 생성합니다.
(저장소 이름이 다르다면 `vite.config.js`의 `REPO_NAME` 변수도 같이 수정)

### 2. 코드 푸시

```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/derod-roguelike.git
git push -u origin main
```

### 3. GitHub Pages 활성화

1. 저장소의 **Settings → Pages** 메뉴
2. **Source**: `GitHub Actions` 선택
3. 저장소에 push할 때마다 자동으로 배포됩니다 (`.github/workflows/deploy.yml`)

### 4. 배포된 URL 접속

배포 완료 후: `https://YOUR_USERNAME.github.io/derod-roguelike/`

---

## 핸드폰에 PWA 설치

### iOS (Safari)

1. Safari에서 게임 URL 접속
2. 하단 **공유 버튼** (네모 + 화살표)
3. **홈 화면에 추가**
4. 홈 화면의 아이콘 탭하면 풀스크린으로 실행

### Android (Chrome)

1. Chrome에서 게임 URL 접속
2. 우측 상단 **⋮ 메뉴**
3. **앱 설치** 또는 **홈 화면에 추가**
4. 홈 화면의 아이콘 탭하면 풀스크린으로 실행

### PWA 특징

- **풀스크린**: 브라우저 UI 없이 네이티브 앱처럼 동작
- **오프라인 플레이**: 한 번 접속 후엔 인터넷 없이도 실행 가능 (Service Worker 캐싱)
- **자동 업데이트**: 새 버전이 배포되면 다음 실행 시 자동 갱신

---

## 콘텐츠 추가 (코드 수정 없이)

모든 게임 콘텐츠는 `src/data.js` 한 파일에 있습니다.

### 새 적 추가

```javascript
// ENEMIES 객체에 추가
spiderLord: {
  name: '거미 군주', hp: 200, color: '#5c4a8c',
  desc: '죽은 자의 숲의 그늘에 거미줄을 친다',
  tier: 'elite', chapter: 2,
  patterns: [
    { name: '독니 베기', dmg: [16, 22], type: 'attack' },
    { name: '거미줄 결박', dmg: [10, 14], type: 'attack' },
    { name: '거미줄 결계', dmg: [0, 0], type: 'defend', defense: 30 },
  ],
  drop: { gold: [80, 110], gem: [2, 3] },
},
```

그 다음 `CHAPTERS[1].enemies.elite` 배열에 `'spiderLord'` 추가.

### 새 사건 추가

```javascript
// EVENTS 배열에 추가
{
  id: 'demonAltar',
  title: '마계의 제단',
  text: '검은 돌로 만들어진 제단...',
  chapter: [3, 4],  // 등장 챕터 지정
  choices: [
    { text: '제물을 바친다', penalty: { hp: -50 }, reward: { type: 'gem', value: 5 } },
    { text: '떠난다', result: '돌아선다.', reward: null },
  ],
},
```

### 밸런스 조정

`GAME_CONFIG` 객체에서 모든 수치를 한 곳에서 조정:

```javascript
GAME_CONFIG = {
  startHp: 300,           // 시작 체력
  startGold: 120,         // 시작 은화
  rerollCost: 3,          // 보상 리롤 비용
  shockGaugeBase: 30,     // 강타 충격 게이지
  // ...
}
```

---

## 프로젝트 구조

```
derod-roguelike/
├── src/
│   ├── App.jsx              # 메인 게임 로직
│   ├── data.js              # 게임 콘텐츠 (이 파일만 편집해서 콘텐츠 확장)
│   ├── main.jsx             # React 진입점
│   └── index.css            # 전역 스타일
├── public/
│   ├── icon-192.png         # 앱 아이콘
│   └── icon-512.png
├── index.html               # HTML 진입
├── vite.config.js           # Vite + PWA 설정
├── tailwind.config.js
└── .github/workflows/
    └── deploy.yml           # GitHub Pages 자동 배포
```

---

## 트러블슈팅

### 빌드 실패 시
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### PWA가 설치 옵션이 안 보일 때
- HTTPS 환경에서만 PWA 설치 가능 (GitHub Pages는 자동 HTTPS)
- 로컬 개발 시엔 PWA 기능이 제한될 수 있음 (브라우저에서 정상 동작은 OK)

### GitHub Pages 404 에러
- `vite.config.js`의 `REPO_NAME`이 실제 저장소 이름과 일치하는지 확인
- Settings → Pages의 Source가 `GitHub Actions`로 설정되어 있는지 확인

---

## 라이선스

개인 프로젝트.
