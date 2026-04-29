// ─── 쎄선쎄후 클럽 빙고 메인 앱 ─────────────────────────────
// Vanilla JS SPA - 레퍼런스 이미지 디자인 적용

// ─── 상수 ────────────────────────────────────────────────────
const BINGO_SIZE = 5;
const DEFAULT_MISSIONS = [
  "선배와 셀카 찍기", "같이 노래 한 소절 부르기", "서로 칭찬 한마디 나누기",
  "함께 간식 나눠먹기", "팔씨름 대결하기", "같이 춤 한 동작 추기",
  "선배 이름 3번 외치기", "함께 점프 사진 찍기", "서로 악수하기",
  "같이 웃긴 표정 짓기", "선배에게 감사 편지 쓰기", "함께 스트레칭하기",
  "같이 수어로 '사랑해' 하기", "서로 어깨 주물러주기", "함께 응원 구호 외치기",
  "선배 생일 알아내기", "같이 하트 모양 만들기", "함께 단체 사진 찍기",
  "서로 별명 지어주기", "같이 소원 빌기", "선배 특기 배워보기",
  "함께 릴레이 이야기 만들기", "서로 좋아하는 것 공유하기",
  "같이 팀 구호 만들기", "선후배 하이파이브 5번"
];

const TEAM_NAMES = { 1:"1조", 2:"2조", 3:"3조", 4:"4조", 5:"5조" };

// 원본 ZIP에서 사용하던 CloudFront 이미지 URL 그대로 사용
const TICKET_MAIN_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663601973763/A593oQQ9RXgSp8xRSx9QYy/ticket-gen-main-Lo9fXjZT9sAddX6VW3Pofj.webp";
const TICKET_STUB_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663601973763/A593oQQ9RXgSp8xRSx9QYy/ticket-gen-stub-HYrRBCaoAR4jWyG74UNPgB.webp";
const BOARDING_PASS_LEFT  = "https://d2xsxph8kpxj0f.cloudfront.net/310519663601973763/A593oQQ9RXgSp8xRSx9QYy/boarding-pass-left-BTafKjxzw4aSWQXjcWc7ws.webp";
const BOARDING_PASS_RIGHT = "https://d2xsxph8kpxj0f.cloudfront.net/310519663601973763/A593oQQ9RXgSp8xRSx9QYy/boarding-pass-right-fkWcErj2SqmDxRvMJe4SgJ.webp";
const ENVELOPE_LEFT  = "https://d2xsxph8kpxj0f.cloudfront.net/310519663601973763/A593oQQ9RXgSp8xRSx9QYy/envelope-left-jLLbdS9tM9fBinBaFvbZpi.webp";
const ENVELOPE_RIGHT = "https://d2xsxph8kpxj0f.cloudfront.net/310519663601973763/A593oQQ9RXgSp8xRSx9QYy/envelope-right-hTVqmFFFmCrGdq7TCgZcCr.webp";

// ─── 앱 상태 ─────────────────────────────────────────────────
let currentPage = 'home';
let currentTeamId = null;
let bingoCells = [];
let completedLines = [];
let syncTimeout = null;

// ─── 라우터 ──────────────────────────────────────────────────
function getRoute() {
  const path = window.location.pathname;
  if (path === '/') return { page: 'home' };
  if (path === '/about') return { page: 'about' };
  if (path === '/memories') return { page: 'memories' };
  const m = path.match(/^\/team\/(\d+)$/);
  if (m) return { page: 'team-bingo', teamId: parseInt(m[1]) };
  return { page: '404' };
}

function navigate(path) {
  window.history.pushState({}, '', path);
  render();
}

window.addEventListener('popstate', () => render());

// ─── 토스트 ──────────────────────────────────────────────────
function showToast(msg, type = 'success', duration = 2500) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.3s';
    setTimeout(() => el.remove(), 300);
  }, duration);
}

// ─── 빙고 로직 ───────────────────────────────────────────────
function initBingoCells(missions) {
  return missions.slice(0, 25).map((mission, id) => ({ id, mission, photo: null, completed: false }));
}

function checkBingoLines(cells) {
  const lines = [];
  const hasPhoto = idx => cells[idx]?.photo !== null && cells[idx]?.photo !== undefined;
  for (let row = 0; row < BINGO_SIZE; row++) {
    const rowCells = Array.from({length: BINGO_SIZE}, (_, col) => row * BINGO_SIZE + col);
    if (rowCells.every(hasPhoto)) lines.push({ type: 'row', index: row, cells: rowCells });
  }
  for (let col = 0; col < BINGO_SIZE; col++) {
    const colCells = Array.from({length: BINGO_SIZE}, (_, row) => row * BINGO_SIZE + col);
    if (colCells.every(hasPhoto)) lines.push({ type: 'col', index: col, cells: colCells });
  }
  const diagMain = Array.from({length: BINGO_SIZE}, (_, i) => i * BINGO_SIZE + i);
  if (diagMain.every(hasPhoto)) lines.push({ type: 'diag', index: 0, cells: diagMain });
  const diagAnti = Array.from({length: BINGO_SIZE}, (_, i) => i * BINGO_SIZE + (BINGO_SIZE - 1 - i));
  if (diagAnti.every(hasPhoto)) lines.push({ type: 'diag', index: 1, cells: diagAnti });
  return lines;
}

function getCompletedCellIndices(lines) {
  const s = new Set();
  lines.forEach(l => l.cells.forEach(idx => s.add(idx)));
  return s;
}

// ─── API 호출 ─────────────────────────────────────────────────
async function fetchBoard(teamId) {
  try {
    const res = await fetch(`/api/bingo/${teamId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function saveBoard(teamId, cells) {
  try {
    const res = await fetch(`/api/bingo/${teamId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teamName: TEAM_NAMES[teamId] || `${teamId}조`,
        cells: cells.map(c => ({ id: c.id, mission: c.mission, photo: c.photo || null }))
      })
    });
    return res.ok;
  } catch { return false; }
}

function scheduleSave(teamId, cells) {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    const ok = await saveBoard(teamId, cells);
    if (!ok) showToast('저장 실패. 인터넷 연결을 확인해주세요.', 'error');
  }, 1000);
}

// ─── 이미지 압축 ─────────────────────────────────────────────
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1200;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
          else { w = Math.round(w * MAX / h); h = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─────────────────────────────────────────────────────────────
// ─── Navbar 렌더링 (레퍼런스: 밝은 베이지 배경 + 빨간 로고) ──
// ─────────────────────────────────────────────────────────────
function renderNavbar() {
  const path = window.location.pathname;
  const isActive = href => {
    if (href === '/') return path === '/';
    if (href === '/memories' && path.startsWith('/team/')) return true;
    return path.startsWith(href);
  };

  return `
  <header id="navbar" style="
    position:fixed;top:0;left:0;right:0;z-index:50;
    background:#F5EEE8;
    border-bottom:1px solid rgba(180,140,110,0.2);
    transition:box-shadow 0.3s;
  ">
    <div style="max-width:80rem;margin:0 auto;padding:0 1.5rem;">
      <div style="display:flex;align-items:center;justify-content:space-between;height:64px;">

        <!-- 로고 -->
        <a href="/" onclick="navigate('/');return false;" style="display:flex;align-items:center;text-decoration:none;gap:0.4rem;">
          <img src="/static/title-logo.png" alt="쎄선쎄후" style="height:36px;width:auto;object-fit:contain;" />
        </a>

        <!-- 데스크탑 메뉴 -->
        <nav style="display:flex;gap:2.5rem;align-items:center;" id="desktop-nav">
          <a href="/" onclick="navigate('/');return false;"
            class="nav-link ${isActive('/') ? 'active' : ''}">HOME</a>
          <a href="/about" onclick="navigate('/about');return false;"
            class="nav-link ${isActive('/about') ? 'active' : ''}">쎄선쎄후란?</a>
          <a href="/memories" onclick="navigate('/memories');return false;"
            class="nav-link ${isActive('/memories') ? 'active' : ''}">우리의 추억</a>
        </nav>

        <!-- 모바일 햄버거 -->
        <button onclick="toggleMobileMenu()" style="display:none;padding:0.4rem;background:none;border:none;cursor:pointer;color:#D51E2A;" id="hamburger-btn">
          <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  </header>

  <!-- 모바일 오버레이 -->
  <div id="mobile-overlay" onclick="closeMobileMenu()" style="display:none;position:fixed;inset:0;z-index:40;background:rgba(47,43,40,0.3);backdrop-filter:blur(4px);"></div>
  <!-- 모바일 드로어 -->
  <div class="mobile-drawer" id="mobile-drawer">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:1rem 1.5rem;border-bottom:1px solid rgba(180,140,110,0.2);">
      <img src="/static/title-logo.png" alt="쎄선쎄후" style="height:30px;width:auto;object-fit:contain;" />
      <button onclick="closeMobileMenu()" style="background:none;border:none;cursor:pointer;color:#D51E2A;padding:0.4rem;">
        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    <nav style="display:flex;flex-direction:column;padding:1.5rem;gap:0.25rem;">
      <a href="/" onclick="navigate('/');closeMobileMenu();return false;"
        style="padding:0.75rem 1rem;border-radius:0.75rem;text-decoration:none;font-family:'HSHwalkongSerif','Noto Sans KR',sans-serif;font-weight:500;font-size:0.95rem;
        background:${isActive('/') ? 'rgba(213,30,42,0.08)' : 'transparent'};
        color:${isActive('/') ? '#D51E2A' : '#4a3f38'};">HOME</a>
      <a href="/about" onclick="navigate('/about');closeMobileMenu();return false;"
        style="padding:0.75rem 1rem;border-radius:0.75rem;text-decoration:none;font-family:'HSHwalkongSerif','Noto Sans KR',sans-serif;font-weight:500;font-size:0.95rem;
        background:${isActive('/about') ? 'rgba(213,30,42,0.08)' : 'transparent'};
        color:${isActive('/about') ? '#D51E2A' : '#4a3f38'};">쎄선쎄후란?</a>
      <a href="/memories" onclick="navigate('/memories');closeMobileMenu();return false;"
        style="padding:0.75rem 1rem;border-radius:0.75rem;text-decoration:none;font-family:'HSHwalkongSerif','Noto Sans KR',sans-serif;font-weight:500;font-size:0.95rem;
        background:${isActive('/memories') ? 'rgba(213,30,42,0.08)' : 'transparent'};
        color:${isActive('/memories') ? '#D51E2A' : '#4a3f38'};">우리의 추억</a>
      <div style="padding:0.75rem 1rem;">
        <a href="/memories" onclick="navigate('/memories');closeMobileMenu();return false;"
          style="display:block;text-align:center;padding:0.6rem 1rem;border-radius:6px;border:1.5px solid #D51E2A;background:white;color:#D51E2A;font-size:0.88rem;font-weight:600;text-decoration:none;font-family:'HSHwalkongSerif','Noto Sans KR',sans-serif;">
          빙고 입장
        </a>
      </div>
    </nav>
    <div style="position:absolute;bottom:2rem;left:0;right:0;text-align:center;">
      <div class="elegant-divider" style="margin-bottom:1rem;"></div>
      <p style="font-size:0.75rem;color:rgba(93,60,40,0.5);">쎄선쎄후 동아리 🌸</p>
    </div>
  </div>`;
}

function toggleMobileMenu() {
  const drawer = document.getElementById('mobile-drawer');
  const overlay = document.getElementById('mobile-overlay');
  drawer.classList.toggle('open');
  overlay.style.display = drawer.classList.contains('open') ? 'block' : 'none';
}
function closeMobileMenu() {
  document.getElementById('mobile-drawer')?.classList.remove('open');
  const overlay = document.getElementById('mobile-overlay');
  if (overlay) overlay.style.display = 'none';
}

// ─────────────────────────────────────────────────────────────
// ─── 홈 페이지 — 제공된 이미지를 배경으로 그대로 사용 ──────────
// ─────────────────────────────────────────────────────────────
function renderHome() {
  return `
  <section style="
    position:relative;
    width:100%;
    min-height:100vh;
    display:flex;
    flex-direction:column;
    align-items:center;
    justify-content:flex-end;
    overflow:hidden;
    background:#F5B7B3;
  ">
    <!-- 히어로 이미지 (전체 화면 꽉 채우기) -->
    <img
      src="/static/hero-bg-new.jpg"
      alt="쎄선쎄후 히어로 배경"
      style="
        position:absolute;
        inset:0;
        width:100%;
        height:100%;
        object-fit:cover;
        object-position:center center;
        z-index:1;
        pointer-events:none;
        user-select:none;
      "
    />

    <!-- 하단 그라디언트 오버레이 (버튼 가독성용) -->
    <div style="
      position:absolute;
      bottom:0; left:0; right:0;
      height:38%;
      background:linear-gradient(to top, rgba(30,10,10,0.45) 0%, transparent 100%);
      z-index:2;
      pointer-events:none;
    "></div>

    <!-- CTA 버튼 (이미지 위 하단 중앙) -->
    <div class="fade-in-up-d2" style="
      position:relative;
      z-index:10;
      display:flex;
      flex-wrap:wrap;
      gap:0.75rem;
      justify-content:center;
      padding-bottom:clamp(2.5rem,6vw,5rem);
      padding-top:1rem;
    ">
      <a href="/memories" onclick="navigate('/memories');return false;"
        style="
          display:inline-flex;align-items:center;justify-content:center;gap:0.4rem;
          padding:0.85rem 2.2rem;
          border-radius:30px;
          font-size:0.92rem;font-weight:700;
          text-decoration:none;
          background:rgba(213,30,42,0.35);
          color:white;
          border:1.5px solid rgba(255,255,255,0.55);
          box-shadow:0 4px 18px rgba(0,0,0,0.15);
          letter-spacing:0.07em;
          transition:all 0.22s;
          font-family:'HSHwalkongSerif','Noto Sans KR',sans-serif;
          backdrop-filter:blur(8px);
          -webkit-backdrop-filter:blur(8px);
        "
        onmouseover="this.style.background='rgba(213,30,42,0.6)';this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 24px rgba(0,0,0,0.22)';"
        onmouseout="this.style.background='rgba(213,30,42,0.35)';this.style.transform='translateY(0)';this.style.boxShadow='0 4px 18px rgba(0,0,0,0.15)';">
        우리의 추억 →
      </a>
      <a href="/about" onclick="navigate('/about');return false;"
        style="
          display:inline-flex;align-items:center;justify-content:center;gap:0.4rem;
          padding:0.85rem 2.2rem;
          border-radius:30px;
          font-size:0.92rem;font-weight:600;
          text-decoration:none;
          background:rgba(255,255,255,0.22);
          color:white;
          border:1.5px solid rgba(255,255,255,0.55);
          box-shadow:0 4px 18px rgba(0,0,0,0.12);
          letter-spacing:0.07em;
          transition:all 0.22s;
          font-family:'HSHwalkongSerif','Noto Sans KR',sans-serif;
          backdrop-filter:blur(8px);
          -webkit-backdrop-filter:blur(8px);
        "
        onmouseover="this.style.background='rgba(255,255,255,0.4)';this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 24px rgba(0,0,0,0.18)';"
        onmouseout="this.style.background='rgba(255,255,255,0.22)';this.style.transform='translateY(0)';this.style.boxShadow='0 4px 18px rgba(0,0,0,0.12)';">
        쎄선쎄후란?
      </a>
    </div>
  </section>`;
}

// ─────────────────────────────────────────────────────────────
// ─── About 페이지 ─────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
function renderAbout() {
  return `
  <div style="
    min-height:100vh;
    padding-top:64px;
    position:relative;
    /* 원본 세로형 이미지(563x1024)를 비율 그대로, 가로 100% 꽉 채워 반복없이 */
    background-image: url('/static/about-bg.webp');
    background-size: 100% auto;
    background-position: center top;
    background-repeat: no-repeat;
    background-color: #f5b7b3;
  ">

    <!-- 설명 카드 오버레이 (이미지 위에 자연스럽게) -->
    <div style="
      position:relative;
      z-index:10;
      max-width:46rem;
      margin:0 auto;
      padding: 52vw 1rem 4rem;
    ">
      <!-- 페이지 타이틀 -->
      <div style="margin-bottom:1.5rem;text-align:center;">
        <h1 style="
          font-family:'HSHwalkongSerif','Noto Sans KR',sans-serif;
          font-size:3.0rem;
          font-weight:900;
          color:#2F2B28;
          letter-spacing:0.04em;
          line-height:1.2;
        ">쎄선쎄후란?</h1>
      </div>

      <!-- 소개 카드들 -->
      <div style="display:flex;flex-direction:column;gap:1rem;">
        ${[
          { icon:"🌱", title:"활동 소개", content:"쎄선쎄후는 선배와 후배가 함께 성장하고 소통하는 기회를 만들고자 하는 활동입니다. 기존의 짝선짝후라는 이름에서 착안하여 쎄콤 선배, 쎄콤 후배라는 활동명을 만들게 되었습니다. 선배는 후배에게 경험과 지혜를, 후배는 선배에게 새로운 시각과 에너지를 나눕니다." },
          { icon:"🎯", title:"활동 방식", content:"미션 빙고를 중심으로 다양한 활동을 진행합니다. 함께 미션을 완수하며 자연스럽게 대화하고 추억을 쌓습니다. 각 조별로 빙고판을 채워나가며 팀워크와 유대감을 강화합니다." },
          { icon:"📸", title:"추억 기록", content:"함께한 모든 순간을 사진으로 기록합니다. 미션을 완수할 때마다 찍는 사진들은 우리만의 소중한 추억이 됩니다. 빙고판에 담긴 사진들이 모여 쎄선쎄후만의 특별한 이야기를 만들어갑니다." }
        ].map(item => `
          <div style="
            display:flex;gap:1.25rem;
            padding:1.5rem;border-radius:0.75rem;
            background:rgba(253,250,246,0.95);
            border:1px solid rgba(181,140,100,0.25);
            box-shadow:0 2px 12px rgba(139,94,42,0.10);
            transition:box-shadow 0.2s,transform 0.2s;
          "
            onmouseover="this.style.boxShadow='0 6px 20px rgba(139,94,42,0.15)';this.style.transform='translateY(-2px)';"
            onmouseout="this.style.boxShadow='0 2px 12px rgba(139,94,42,0.10)';this.style.transform='translateY(0)';">
            <div style="font-size:2rem;flex-shrink:0;margin-top:0.125rem;">${item.icon}</div>
            <div>
              <h3 style="font-size:1rem;font-weight:700;color:#D51E2A;margin-bottom:0.5rem;">${item.title}</h3>
              <p style="font-size:0.875rem;line-height:1.75;color:#5C4438;">${item.content}</p>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- 마무리 문구 -->
      <div style="margin-top:2rem;padding:2rem;text-align:center;border-radius:0.75rem;background:rgba(249,206,206,0.55);border:1px solid rgba(213,30,42,0.15);">
        <p style="font-size:1.1rem;font-weight:600;color:#D51E2A;line-height:1.9;font-family:'HSHwalkongSerif','Noto Serif KR',serif;">
          "선배와 후배가 함께라면,<br>어떤 미션도 즐거운 추억이 됩니다 🌸"
        </p>
      </div>
    </div>
  </div>`;
}

// ─────────────────────────────────────────────────────────────
// ─── Memories / TeamSelector 페이지 ───────────────────────────
// ─────────────────────────────────────────────────────────────
function renderMemories() {
  const teams = [1,2,3,4,5];
  // ticket-main: 752px, ticket-stub: 299px → 비율 752:299
  const mainRatio = 752;
  const stubRatio = 299;
  const totalRatio = mainRatio + stubRatio; // 1051

  return `
  <style>
    .ticket-card {
      cursor: pointer;
      display: flex;
      align-items: stretch;
      width: 100%;
      max-width: 420px;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 6px 24px rgba(40,20,20,0.22);
      transition: transform 0.18s ease, box-shadow 0.18s ease;
    }
    .ticket-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 36px rgba(40,20,20,0.30);
    }
    .ticket-main-wrap {
      position: relative;
      flex: ${mainRatio};
      min-width: 0;
    }
    .ticket-main-wrap img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
    }
    .ticket-team-label {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    }
    .ticket-team-label span {
      font-family: 'HSHwalkongSerif', 'Noto Serif KR', serif;
      font-size: clamp(2rem, 6vw, 3rem);
      font-weight: 900;
      color: #2F2B28;
      letter-spacing: 0.06em;
      text-shadow: 0 1px 8px rgba(255,255,255,0.85), 0 2px 16px rgba(255,255,255,0.5);
      line-height: 1;
    }
    .ticket-stub-wrap {
      flex: ${stubRatio};
      min-width: 0;
    }
    .ticket-stub-wrap img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
    }
  </style>

  <div style="
    min-height: 100vh;
    padding-top: 64px;
    position: relative;
    overflow: hidden;
    background-image: url('/static/about-bg.webp');
    background-size: 100% auto;
    background-position: center top;
    background-repeat: no-repeat;
    background-color: #f5b7b3;
  ">
    <!-- 반투명 오버레이 (카드 가독성 향상) -->
    <div style="position:absolute;inset:0;background:rgba(245,183,179,0.35);z-index:1;pointer-events:none;"></div>

    <div style="
      position: relative;
      z-index: 10;
      min-height: calc(100vh - 64px);
      padding: 3rem 1.2rem 5rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      gap: 1.4rem;
    ">
      <!-- 헤더 -->
      <div style="text-align:center;margin-bottom:0.8rem;">
        <p style="font-family:'HSHwalkongSerif','Noto Sans KR',sans-serif;font-size:1.6rem;font-weight:900;color:#5a2a2a;letter-spacing:0.06em;">탑승권을 선택해주세요 🎫</p>
      </div>

      ${teams.map(id => `
        <div class="ticket-card" onclick="navigate('/team/${id}')">
          <!-- 좌측: 메인 티켓 + 조 이름 -->
          <div class="ticket-main-wrap">
            <img src="/static/ticket-main.webp" alt="${TEAM_NAMES[id]} 탑승권" draggable="false"/>
            <div class="ticket-team-label">
              <span>${TEAM_NAMES[id]}</span>
            </div>
          </div>
          <!-- 우측: 스텁 -->
          <div class="ticket-stub-wrap">
            <img src="/static/ticket-stub.webp" alt="탑승권 스텁" draggable="false"/>
          </div>
        </div>
      `).join('')}

    </div>
  </div>`;
}

function selectTeam(teamId) {
  const ticket = document.getElementById(`ticket-${teamId}`);
  const stub = document.getElementById(`stub-${teamId}`);
  if (!ticket || !stub) return;
  ticket.classList.add('ticket-shake');
  setTimeout(() => {
    ticket.classList.remove('ticket-shake');
    stub.classList.add('ticket-stub-tear');
    setTimeout(() => navigate(`/team/${teamId}`), 600);
  }, 220);
}

// ─────────────────────────────────────────────────────────────
// ─── 팀 빙고 페이지 ───────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
async function renderTeamBingo(teamId) {
  document.getElementById('app-content').innerHTML = `
  <div style="min-height:100vh;padding-top:64px;display:flex;align-items:center;justify-content:center;background-image:url('/static/about-bg.webp');background-size:100% auto;background-position:center top;background-repeat:no-repeat;background-color:#f5b7b3;">
    <div style="text-align:center;background:rgba(255,255,255,0.75);padding:2rem 2.5rem;border-radius:14px;box-shadow:0 4px 20px rgba(0,0,0,0.12);">
      <div style="width:2.5rem;height:2.5rem;border:3px solid rgba(213,30,42,0.25);border-top-color:#D51E2A;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 1rem;"></div>
      <p style="color:#5a2a2a;font-size:0.95rem;font-family:'HSHwalkongSerif','Noto Sans KR',sans-serif;">데이터를 불러오는 중...</p>
    </div>
  </div>`;

  const data = await fetchBoard(teamId);

  if (data && data.cells && data.cells.length > 0) {
    bingoCells = data.cells.map(c => ({
      id: c.cell_id, mission: c.mission, photo: c.photo || null, completed: false
    }));
  } else {
    bingoCells = initBingoCells(DEFAULT_MISSIONS);
  }

  completedLines = checkBingoLines(bingoCells);
  renderBingoPage(teamId);
}

function renderBingoPage(teamId) {
  const teamName = TEAM_NAMES[teamId] || `${teamId}조`;
  const photoCount = bingoCells.filter(c => c.photo).length;
  const totalCells = BINGO_SIZE * BINGO_SIZE;
  const progressPct = Math.round((photoCount / totalCells) * 100);
  const completedCells = getCompletedCellIndices(completedLines);

  document.getElementById('app-content').innerHTML = `
  <div style="min-height:100vh;padding-top:64px;position:relative;overflow:hidden;background-image:url('/static/about-bg.webp');background-size:100% auto;background-position:center top;background-repeat:no-repeat;background-color:#f5b7b3;" id="bingo-page">
    <!-- 반투명 오버레이 (카드 가독성 향상) -->
    <div style="position:fixed;inset:0;background:rgba(245,183,179,0.25);z-index:0;pointer-events:none;"></div>
    <style>@keyframes spin{to{transform:rotate(360deg)}}</style>

    <!-- 빙고 완성 배너 -->
    <div id="bingo-banner" style="position:fixed;top:1.25rem;left:50%;transform:translateX(-50%);z-index:200;pointer-events:none;display:none;">
      <div style="display:flex;align-items:center;gap:0.75rem;padding:0.875rem 1.5rem;border-radius:0.875rem;background:linear-gradient(135deg,#D51E2A,#A8111C);box-shadow:0 8px 28px rgba(213,30,42,0.45);color:white;">
        <span style="font-size:1.4rem;">🏆</span>
        <div style="text-align:center;">
          <p style="font-weight:900;font-size:1.4rem;line-height:1.2;" id="bingo-banner-text">🎉 BINGO!</p>
          <p style="font-size:0.82rem;color:rgba(255,200,200,1);line-height:1.2;" id="bingo-banner-sub">빙고 완성!</p>
        </div>
        <span style="font-size:1.4rem;">⭐</span>
      </div>
    </div>

    <div style="position:relative;z-index:10;padding:1.5rem 0.875rem;max-width:34rem;margin:0 auto;">
      <!-- 뒤로가기 -->
      <button onclick="navigate('/memories')"
        style="display:inline-flex;align-items:center;gap:0.3rem;padding:0.45rem 0.9rem;border-radius:9999px;background:rgba(255,255,255,0.88);border:1px solid rgba(255,255,255,0.6);color:#5C3A1E;font-size:0.82rem;font-weight:500;cursor:pointer;margin-bottom:1rem;transition:all 0.15s;">
        ← 팀 선택으로
      </button>

      <!-- 헤더 -->
      <div style="text-align:center;margin-bottom:1rem;">
        <p style="font-size:0.65rem;letter-spacing:0.24em;color:rgba(255,255,255,0.82);margin-bottom:0.2rem;font-weight:600;text-transform:uppercase;">세움 오리지널</p>
        <h1 class="title-serif" style="font-size:clamp(2rem,7vw,3.2rem);color:#FFF8F0;line-height:1;margin-bottom:0.2rem;text-shadow:0 2px 12px rgba(0,0,0,0.25);">${teamName} 빙고</h1>
        <p style="font-size:0.92rem;color:rgba(255,255,255,0.88);">함께하는 추억 만들기 ✨</p>
      </div>

      <!-- 진행 현황 카드 -->
      <div style="background:rgba(248,243,237,0.94);border-radius:0.875rem;padding:0.75rem 1rem;margin-bottom:1rem;box-shadow:0 4px 16px rgba(0,0,0,0.12);">
        <div style="display:flex;align-items:center;gap:0.75rem;">
          <div style="display:flex;align-items:center;gap:0.5rem;flex-shrink:0;">
            <span style="font-size:1rem;">📸</span>
            <div>
              <p style="font-size:0.6rem;font-weight:700;color:#D51E2A;line-height:1;text-transform:uppercase;letter-spacing:0.05em;">미션 완료</p>
              <p style="font-size:1.2rem;font-weight:900;line-height:1.3;color:#2F2B28;" id="photo-count-display">${photoCount}<span style="font-size:0.82rem;color:#D51E2A;">/${totalCells}</span></p>
            </div>
          </div>
          <div style="flex:1;">
            <div style="height:0.625rem;border-radius:9999px;overflow:hidden;background:rgba(213,30,42,0.12);">
              <div class="progress-bar" style="height:100%;border-radius:9999px;background:linear-gradient(90deg,#E53935,#D51E2A);width:${progressPct}%;" id="progress-bar"></div>
            </div>
            <p style="text-align:right;font-size:0.6rem;margin-top:0.15rem;font-weight:600;color:#D51E2A;" id="progress-pct">${progressPct}%</p>
          </div>
          <div style="display:flex;align-items:center;gap:0.5rem;flex-shrink:0;">
            <div>
              <p style="font-size:0.6rem;font-weight:700;color:#D51E2A;text-align:right;line-height:1;text-transform:uppercase;letter-spacing:0.05em;">빙고</p>
              <p style="font-size:1.2rem;font-weight:900;text-align:right;line-height:1.3;color:#D51E2A;" id="bingo-count-display">${completedLines.length}<span style="font-size:0.82rem;color:rgba(213,30,42,0.6);">줄</span></p>
            </div>
            <span style="font-size:1.15rem;">🏆</span>
          </div>
        </div>
      </div>

      <!-- 빙고판 -->
      <div style="position:relative;background:rgba(248,243,237,0.96);border-radius:0.875rem;padding:0.5rem;box-shadow:0 8px 28px rgba(0,0,0,0.16),0 2px 6px rgba(0,0,0,0.06);border:1.5px solid rgba(255,255,255,0.8);margin-bottom:1rem;" id="bingo-board-container">
        <!-- 마스킹 테이프 장식 -->
        <div style="position:absolute;top:-0.65rem;left:18%;width:4.5rem;height:1.1rem;border-radius:2px;background:rgba(213,30,42,0.55);transform:rotate(-1.5deg);"></div>
        <div style="position:absolute;top:-0.65rem;right:20%;width:3.5rem;height:1.1rem;border-radius:2px;background:rgba(97,183,178,0.65);transform:rotate(2deg);"></div>
        <!-- 빙고 그리드 -->
        <div id="bingo-grid" style="display:grid;grid-template-columns:repeat(5,1fr);grid-template-rows:repeat(5,1fr);gap:4px;padding:10px;aspect-ratio:1/1;">
          ${bingoCells.map(cell => renderBingoCell(cell, completedCells.has(cell.id))).join('')}
        </div>
        <!-- 빙고 라인 SVG 오버레이 -->
        <svg id="bingo-lines-svg" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:5;" viewBox="0 0 1000 1000" preserveAspectRatio="none">
          ${completedLines.map(line => renderBingoLineSVG(line)).join('')}
        </svg>
      </div>

      <!-- 사용 방법 안내 -->
      <div style="background:rgba(248,243,237,0.92);border-radius:0.875rem;overflow:hidden;box-shadow:0 4px 14px rgba(0,0,0,0.10);margin-bottom:1rem;">
        <button onclick="toggleGuide()" style="width:100%;display:flex;align-items:center;justify-content:space-between;padding:0.7rem 1rem;background:none;border:none;cursor:pointer;color:#D51E2A;">
          <div style="display:flex;align-items:center;gap:0.45rem;">
            <span>ℹ️</span>
            <span style="font-size:0.84rem;font-weight:600;">사용 방법 안내</span>
          </div>
          <span id="guide-chevron" style="font-size:0.8rem;transition:transform 0.2s;">▼</span>
        </button>
        <div id="guide-content" style="display:none;padding:0 1rem 1rem;border-top:1px solid rgba(213,30,42,0.12);">
          <div style="padding-top:0.75rem;display:flex;flex-direction:column;gap:0.45rem;font-size:0.84rem;color:#5C4438;">
            ${[
              ['📸','사진 첨부','빙고 칸을 클릭하면 미션 사진을 첨부할 수 있어요. 드래그&드롭도 지원합니다.'],
              ['✏️','미션 수정','칸에 마우스를 올리면 우상단에 연필 버튼이 나타나요.'],
              ['🔄','사진 교체/삭제','이미 사진이 있는 칸을 클릭하면 사진을 바꾸거나 삭제할 수 있어요.'],
              ['🎯','빙고 완성','가로·세로·대각선 5칸이 모두 채워지면 빨간 선이 그어져요!'],
              ['💾','자동 저장','모든 변경사항은 자동으로 서버에 저장됩니다.']
            ].map(([icon, title, desc]) => `
              <div style="display:flex;align-items:flex-start;gap:0.45rem;">
                <span style="font-size:0.95rem;flex-shrink:0;">${icon}</span>
                <p><strong>${title}:</strong> ${desc}</p>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- 하단 버튼 -->
      <div style="display:flex;gap:0.6rem;justify-content:center;flex-wrap:wrap;margin-bottom:0.5rem;">
        <button onclick="resetPhotos(${teamId})"
          style="display:flex;align-items:center;gap:0.3rem;padding:0.45rem 0.9rem;border-radius:9999px;font-size:0.82rem;font-weight:500;background:rgba(248,243,237,0.9);color:#D51E2A;border:1.5px solid rgba(213,30,42,0.3);cursor:pointer;transition:all 0.15s;"
          onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'">
          📷 사진만 초기화
        </button>
        <button onclick="resetAll(${teamId})"
          style="display:flex;align-items:center;gap:0.3rem;padding:0.45rem 0.9rem;border-radius:9999px;font-size:0.82rem;font-weight:500;background:rgba(248,243,237,0.9);color:#A8111C;border:1.5px solid rgba(168,17,28,0.3);cursor:pointer;transition:all 0.15s;"
          onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'">
          🔄 전체 초기화
        </button>
      </div>

      <p style="text-align:center;padding:1rem 0;font-size:0.95rem;color:rgba(255,255,255,0.82);">소중한 추억을 함께 만들어요 🌸</p>
    </div>
  </div>`;

  checkNavbarResponsive();
}

function renderBingoCell(cell, isCompleted) {
  const hasPhoto = cell.photo !== null && cell.photo !== undefined;
  return `
  <div class="bingo-cell" id="cell-${cell.id}" onclick="openPhotoModal(${cell.id})"
    style="
      position:relative;border-radius:5px;overflow:hidden;aspect-ratio:1/1;min-height:0;min-width:0;
      background:${hasPhoto ? 'transparent' : '#FDFAF6'};
      box-shadow:${isCompleted ? 'inset 0 0 0 2px rgba(213,30,42,0.45),1px 1px 4px rgba(213,30,42,0.12)' : '1px 1px 3px rgba(139,94,42,0.08)'};
      border:${isCompleted ? '1.5px solid rgba(213,30,42,0.4)' : '1px solid rgba(181,140,100,0.3)'};
    ">

    ${hasPhoto ? `
    <div style="position:absolute;inset:0;">
      <img src="${cell.photo}" alt="${cell.mission}" class="photo-attach" style="width:100%;height:100%;object-fit:cover;"/>
      <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,0.7) 0%,rgba(0,0,0,0.12) 50%,transparent 100%);"></div>
      ${isCompleted ? '<div style="position:absolute;top:0.2rem;right:0.2rem;z-index:10;font-size:0.7rem;">✅</div>' : ''}
    </div>
    <div style="position:absolute;bottom:0;left:0;right:0;padding:0.1rem 0.2rem;z-index:10;">
      <p style="text-align:center;line-height:1.2;font-size:clamp(0.45rem,1.25vw,0.68rem);font-weight:700;color:white;text-shadow:0 1px 4px rgba(0,0,0,0.9);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${cell.mission}</p>
    </div>
    ` : `
    <div class="hover-overlay" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:0;transition:opacity 0.2s;z-index:10;border-radius:5px;background:rgba(249,206,206,0.85);">
      <span style="font-size:0.95rem;color:#D51E2A;">📷</span>
      <span style="font-size:0.52rem;font-weight:600;color:#D51E2A;">사진 추가</span>
    </div>
    <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:0.35rem;z-index:1;">
      <p style="text-align:center;line-height:1.3;font-size:clamp(0.48rem,1.4vw,0.74rem);color:#7A5C3E;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;font-family:'Noto Sans KR',sans-serif;">${cell.mission}</p>
    </div>
    <span style="position:absolute;top:0.1rem;left:0.2rem;font-size:0.48rem;color:#C4A882;font-family:monospace;z-index:0;line-height:1;">${cell.id + 1}</span>
    `}

    <button class="edit-btn" onclick="event.stopPropagation();openEditModal(${cell.id})"
      style="position:absolute;top:0.1rem;right:0.1rem;opacity:0;transition:opacity 0.2s;z-index:20;background:rgba(255,255,255,0.88);border-radius:9999px;padding:0.1rem;border:none;cursor:pointer;line-height:1;font-size:0.75rem;"
      title="미션 수정">✏️</button>

    ${isCompleted ? '<div style="position:absolute;inset:0;border-radius:5px;pointer-events:none;z-index:10;background:rgba(213,30,42,0.06);"></div>' : ''}
  </div>`;
}

function renderBingoLineSVG(line) {
  const size = BINGO_SIZE;
  const pad = 10;
  const totalSize = 1000;
  const cellSize = (totalSize - pad * 2) / size;
  const halfCell = cellSize / 2;
  let x1, y1, x2, y2;
  if (line.type === 'row') {
    const y = pad + line.index * cellSize + halfCell;
    x1 = pad + halfCell * 0.3; y1 = y; x2 = totalSize - pad - halfCell * 0.3; y2 = y;
  } else if (line.type === 'col') {
    const x = pad + line.index * cellSize + halfCell;
    x1 = x; y1 = pad + halfCell * 0.3; x2 = x; y2 = totalSize - pad - halfCell * 0.3;
  } else if (line.index === 0) {
    x1 = pad + halfCell * 0.3; y1 = pad + halfCell * 0.3;
    x2 = totalSize - pad - halfCell * 0.3; y2 = totalSize - pad - halfCell * 0.3;
  } else {
    x1 = totalSize - pad - halfCell * 0.3; y1 = pad + halfCell * 0.3;
    x2 = pad + halfCell * 0.3; y2 = totalSize - pad - halfCell * 0.3;
  }
  return `<line class="bingo-line" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#D51E2A" stroke-width="8" stroke-linecap="round" opacity="0.75"/>`;
}

// 호버 효과
document.addEventListener('mouseover', e => {
  const cell = e.target.closest('.bingo-cell');
  if (cell) {
    const overlay = cell.querySelector('.hover-overlay');
    const editBtn = cell.querySelector('.edit-btn');
    if (overlay) overlay.style.opacity = '1';
    if (editBtn) editBtn.style.opacity = '1';
  }
});
document.addEventListener('mouseout', e => {
  const cell = e.target.closest('.bingo-cell');
  if (cell) {
    const overlay = cell.querySelector('.hover-overlay');
    const editBtn = cell.querySelector('.edit-btn');
    if (overlay) overlay.style.opacity = '0';
    if (editBtn) editBtn.style.opacity = '0';
  }
});

function toggleGuide() {
  const content = document.getElementById('guide-content');
  const chevron = document.getElementById('guide-chevron');
  if (!content) return;
  const isOpen = content.style.display !== 'none';
  content.style.display = isOpen ? 'none' : 'block';
  if (chevron) chevron.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
}

function resetPhotos(teamId) {
  if (!confirm('모든 사진을 삭제하시겠습니까?')) return;
  bingoCells = bingoCells.map(c => ({ ...c, photo: null }));
  completedLines = checkBingoLines(bingoCells);
  renderBingoPage(teamId);
  scheduleSave(teamId, bingoCells);
  showToast('모든 사진이 삭제되었습니다.', 'info');
}

function resetAll(teamId) {
  if (!confirm('빙고판을 초기화하시겠습니까?\n모든 사진과 미션이 기본값으로 돌아갑니다.')) return;
  bingoCells = initBingoCells(DEFAULT_MISSIONS);
  completedLines = checkBingoLines(bingoCells);
  renderBingoPage(teamId);
  scheduleSave(teamId, bingoCells);
  showToast('빙고판이 초기화되었습니다.', 'info');
}

function updateBingoStats() {
  const photoCount = bingoCells.filter(c => c.photo).length;
  const totalCells = BINGO_SIZE * BINGO_SIZE;
  const progressPct = Math.round((photoCount / totalCells) * 100);
  const el1 = document.getElementById('photo-count-display');
  const el2 = document.getElementById('progress-bar');
  const el3 = document.getElementById('progress-pct');
  const el4 = document.getElementById('bingo-count-display');
  if (el1) el1.innerHTML = `${photoCount}<span style="font-size:0.82rem;color:#D51E2A;">/${totalCells}</span>`;
  if (el2) el2.style.width = `${progressPct}%`;
  if (el3) el3.textContent = `${progressPct}%`;
  if (el4) el4.innerHTML = `${completedLines.length}<span style="font-size:0.82rem;color:rgba(213,30,42,0.6);">줄</span>`;
}

function updateBingoGrid() {
  const completedCells = getCompletedCellIndices(completedLines);
  const grid = document.getElementById('bingo-grid');
  if (grid) grid.innerHTML = bingoCells.map(cell => renderBingoCell(cell, completedCells.has(cell.id))).join('');
  const svg = document.getElementById('bingo-lines-svg');
  if (svg) svg.innerHTML = completedLines.map(line => renderBingoLineSVG(line)).join('');
}

// ─── 빙고 완성 배너 ──────────────────────────────────────────
const bingoMessages = [
  '첫 빙고 완성! 🎉','두 줄 완성! 대단해요! 🎊','세 줄 완성! 최고예요! 🏆',
  '네 줄 완성! 거의 다 왔어요! ⭐','다섯 줄 완성! 완벽해요! 🌟','여섯 줄 완성! 믿을 수 없어요! 🎯'
];
let prevBingoCount = 0;

function showBingoBanner(count) {
  const banner = document.getElementById('bingo-banner');
  const text = document.getElementById('bingo-banner-text');
  const sub = document.getElementById('bingo-banner-sub');
  if (!banner) return;
  const msg = bingoMessages[Math.min(count - 1, bingoMessages.length - 1)] || `${count}줄 완성!`;
  if (text) text.textContent = '🎉 BINGO!';
  if (sub) sub.textContent = msg;
  banner.style.display = 'block';
  banner.classList.remove('bingo-banner-out');
  banner.classList.add('bingo-banner-in');
  setTimeout(() => {
    banner.classList.remove('bingo-banner-in');
    banner.classList.add('bingo-banner-out');
    setTimeout(() => { banner.style.display = 'none'; banner.classList.remove('bingo-banner-out'); }, 300);
  }, 2800);
}

// ─── 사진 모달 ───────────────────────────────────────────────
let currentCellId = null;
let currentPreview = null;
let isDeleted = false;

function openPhotoModal(cellId) {
  currentCellId = cellId;
  isDeleted = false;
  const cell = bingoCells[cellId];
  currentPreview = cell?.photo || null;
  renderPhotoModal(cell);
}

function renderPhotoModal(cell) {
  const modal = document.getElementById('modal-container');
  if (!modal) return;

  modal.innerHTML = `
  <div class="modal-overlay" onclick="closeModalIfOutside(event)">
    <div class="modal-box">
      <!-- 헤더 -->
      <div style="position:relative;background:#F8F3ED;border-bottom:1px solid rgba(181,140,100,0.25);padding:1.4rem 1.25rem 1rem;">
        <!-- 마스킹 테이프 장식 -->
        <div style="position:absolute;top:-0.45rem;left:50%;transform:translateX(-50%) rotate(-1deg);width:5.5rem;height:1.3rem;background:rgba(213,30,42,0.5);border-radius:2px;z-index:1;"></div>
        <h2 style="text-align:center;color:#5C3A1E;font-size:1.1rem;font-weight:700;margin-top:0.2rem;font-family:'Noto Sans KR',sans-serif;">📸 미션 사진 첨부</h2>
        <div style="margin-top:0.5rem;text-align:center;">
          <span style="display:inline-block;background:#FDFAF6;border:1px solid rgba(181,140,100,0.3);border-radius:0.5rem;padding:0.35rem 0.7rem;font-size:0.84rem;font-weight:500;color:#5C3A1E;max-width:100%;">${cell?.mission || ''}</span>
        </div>
      </div>
      <!-- 본문 -->
      <div style="background:#FAF7F3;padding:1.25rem;min-height:9rem;" id="modal-body">
        ${currentPreview && !isDeleted ? `
        <div style="display:flex;flex-direction:column;align-items:center;gap:0.75rem;">
          <div style="background:white;padding:0.45rem;padding-bottom:1.6rem;box-shadow:3px 3px 10px rgba(0,0,0,0.14);transform:rotate(1deg);max-width:12rem;position:relative;">
            <img src="${currentPreview}" alt="미션 사진" class="photo-attach" style="width:100%;aspect-ratio:1/1;object-fit:cover;"/>
            <p style="position:absolute;bottom:0.35rem;left:0;right:0;text-align:center;font-size:0.7rem;color:#9B7355;">미션 완료! ✓</p>
          </div>
          <div style="display:flex;gap:0.45rem;justify-content:center;">
            <button onclick="document.getElementById('file-input').click()"
              style="display:inline-flex;align-items:center;gap:0.2rem;padding:0.35rem 0.8rem;border-radius:0.5rem;border:1px solid rgba(181,140,100,0.35);background:white;color:#5C3A1E;font-size:0.75rem;cursor:pointer;">
              📷 사진 변경
            </button>
            <button onclick="deletePhoto()"
              style="display:inline-flex;align-items:center;gap:0.2rem;padding:0.35rem 0.8rem;border-radius:0.5rem;border:1px solid #fecaca;background:white;color:#dc2626;font-size:0.75rem;cursor:pointer;">
              🗑️ 삭제
            </button>
          </div>
        </div>
        ` : isDeleted ? `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem;gap:0.75rem;">
          <div style="width:3.5rem;height:3.5rem;border-radius:50%;background:#fee2e2;display:flex;align-items:center;justify-content:center;font-size:1.5rem;">🗑️</div>
          <p style="font-size:0.875rem;font-weight:500;color:#dc2626;">사진이 삭제되었습니다</p>
          <p style="font-size:0.75rem;color:#fca5a5;">아래 버튼을 눌러 확인하세요</p>
        </div>
        ` : `
        <div id="drop-zone" onclick="document.getElementById('file-input').click()"
          style="border:2px dashed rgba(181,140,100,0.45);border-radius:0.75rem;padding:1.75rem;text-align:center;cursor:pointer;transition:all 0.2s;background:rgba(248,243,237,0.6);"
          ondragover="event.preventDefault();this.style.borderColor='#D51E2A';this.style.background='rgba(213,30,42,0.05)';"
          ondragleave="this.style.borderColor='rgba(181,140,100,0.45)';this.style.background='rgba(248,243,237,0.6)';"
          ondrop="handleDrop(event)">
          <div style="display:flex;flex-direction:column;align-items:center;gap:0.6rem;">
            <div style="width:3.2rem;height:3.2rem;border-radius:50%;background:#F5EEE8;display:flex;align-items:center;justify-content:center;font-size:1.6rem;">📷</div>
            <div>
              <p style="font-weight:600;color:#5C3A1E;font-size:0.875rem;">사진을 드래그하거나</p>
              <p style="color:#9B7355;font-size:0.75rem;margin-top:0.1rem;">클릭해서 파일 선택</p>
            </div>
            <p style="font-size:0.72rem;color:#C4A882;">JPG, PNG, GIF 지원 (자동 압축)</p>
          </div>
        </div>
        `}
        <input type="file" id="file-input" accept="image/*" style="display:none;" onchange="handleFileInput(event)"/>
      </div>
      <!-- 하단 버튼 -->
      <div style="background:#F8F3ED;border-top:1px solid rgba(181,140,100,0.2);padding:0.875rem 1.25rem;display:flex;gap:0.5rem;justify-content:flex-end;">
        <button onclick="closeModal()"
          style="display:inline-flex;align-items:center;gap:0.2rem;padding:0.45rem 0.9rem;border-radius:0.5rem;border:1px solid rgba(181,140,100,0.3);background:white;color:#7A5C3E;font-size:0.84rem;cursor:pointer;">
          취소
        </button>
        <button onclick="savePhoto()" id="save-btn"
          style="display:inline-flex;align-items:center;gap:0.2rem;padding:0.45rem 0.9rem;border-radius:0.5rem;border:none;font-size:0.84rem;cursor:pointer;font-weight:600;${isDeleted ? 'background:#dc2626;color:white;' : currentPreview ? 'background:#D51E2A;color:white;' : 'background:#D4C5B0;color:#9c8b7a;cursor:not-allowed;'}">
          ✓ ${isDeleted ? '삭제 완료' : currentPreview ? '저장하기' : '취소'}
        </button>
      </div>
    </div>
  </div>`;
  modal.style.display = 'block';
}

function closeModalIfOutside(e) {
  if (e.target === e.currentTarget) closeModal();
}
function closeModal() {
  const modal = document.getElementById('modal-container');
  if (modal) modal.style.display = 'none';
  currentCellId = null; currentPreview = null; isDeleted = false;
}
function deletePhoto() {
  currentPreview = null; isDeleted = true;
  const cell = bingoCells[currentCellId];
  renderPhotoModal(cell);
}

async function handleFileInput(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  await processImageFile(file);
  e.target.value = '';
}
async function handleDrop(e) {
  e.preventDefault();
  const file = e.dataTransfer.files?.[0];
  if (file) await processImageFile(file);
}
async function processImageFile(file) {
  const validTypes = ['image/jpeg','image/png','image/gif','image/webp'];
  if (!validTypes.includes(file.type)) { showToast('JPG, PNG, WebP, GIF 형식만 지원합니다.', 'error'); return; }
  if (file.size > 10 * 1024 * 1024) { showToast('10MB 이하의 파일을 선택해주세요.', 'error'); return; }
  const body = document.getElementById('modal-body');
  if (body) body.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem;gap:0.75rem;">
      <div style="width:2rem;height:2rem;border:3px solid rgba(92,58,30,0.2);border-top-color:#D51E2A;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
      <p style="font-size:0.875rem;font-weight:500;color:#5C3A1E;">이미지 압축 중...</p>
    </div>`;
  try {
    const compressed = await compressImage(file);
    currentPreview = compressed; isDeleted = false;
    const cell = bingoCells[currentCellId];
    renderPhotoModal(cell);
    showToast('이미지 압축 완료!', 'success', 2000);
  } catch {
    showToast('이미지 처리 중 오류가 발생했습니다.', 'error');
  }
}

async function savePhoto() {
  if (currentCellId === null) return;
  if (isDeleted) { bingoCells[currentCellId].photo = null; }
  else if (currentPreview) { bingoCells[currentCellId].photo = currentPreview; }
  else { closeModal(); return; }

  const prevLines = completedLines.length;
  completedLines = checkBingoLines(bingoCells);
  const teamIdMatch = window.location.pathname.match(/\/team\/(\d+)/);
  const teamId = teamIdMatch ? parseInt(teamIdMatch[1]) : null;
  closeModal();
  if (teamId) {
    updateBingoGrid();
    updateBingoStats();
    scheduleSave(teamId, bingoCells);
    if (completedLines.length > prevLines) {
      prevBingoCount = prevLines;
      setTimeout(() => showBingoBanner(completedLines.length), 300);
      showToast(`🎉 빙고 ${completedLines.length}줄 완성!`, 'success', 3000);
    }
    showToast(isDeleted ? '사진이 삭제되었습니다.' : '사진이 저장되었습니다!', isDeleted ? 'info' : 'success');
  }
}

// ─── 미션 편집 모달 ───────────────────────────────────────────
function openEditModal(cellId) {
  const cell = bingoCells[cellId];
  if (!cell) return;
  const modal = document.getElementById('modal-container');
  if (!modal) return;
  modal.innerHTML = `
  <div class="modal-overlay" onclick="closeModalIfOutside(event)">
    <div class="modal-box">
      <div style="background:#F8F3ED;border-bottom:1px solid rgba(181,140,100,0.25);padding:1.25rem;">
        <h2 style="text-align:center;color:#5C3A1E;font-size:1.05rem;font-weight:700;font-family:'Noto Sans KR',sans-serif;">✏️ 미션 문구 수정</h2>
      </div>
      <div style="background:#FAF7F3;padding:1.25rem;">
        <p style="font-size:0.78rem;color:#9B7355;margin-bottom:0.4rem;">현재 미션:</p>
        <p style="font-size:0.875rem;color:#5C3A1E;background:#F5EEE8;padding:0.5rem 0.75rem;border-radius:0.5rem;margin-bottom:1rem;border:1px solid rgba(181,140,100,0.2);">${cell.mission}</p>
        <p style="font-size:0.78rem;color:#9B7355;margin-bottom:0.4rem;">새로운 미션:</p>
        <textarea id="mission-input" rows="3" style="width:100%;padding:0.6rem 0.75rem;border:1px solid rgba(181,140,100,0.35);border-radius:0.5rem;font-size:0.875rem;background:white;resize:none;outline:none;font-family:'Noto Sans KR',sans-serif;color:#2F2B28;" placeholder="새로운 미션을 입력하세요...">${cell.mission}</textarea>
      </div>
      <div style="background:#F8F3ED;border-top:1px solid rgba(181,140,100,0.2);padding:0.875rem 1.25rem;display:flex;gap:0.5rem;justify-content:flex-end;">
        <button onclick="closeModal()" style="padding:0.45rem 0.9rem;border-radius:0.5rem;border:1px solid rgba(181,140,100,0.3);background:white;color:#7A5C3E;font-size:0.84rem;cursor:pointer;">취소</button>
        <button onclick="saveMission(${cellId})" style="padding:0.45rem 0.9rem;border-radius:0.5rem;border:none;background:#D51E2A;color:white;font-size:0.84rem;font-weight:600;cursor:pointer;">✓ 저장</button>
      </div>
    </div>
  </div>`;
  modal.style.display = 'block';
  setTimeout(() => {
    const input = document.getElementById('mission-input');
    if (input) { input.focus(); input.select(); }
  }, 50);
}

function saveMission(cellId) {
  const input = document.getElementById('mission-input');
  if (!input) return;
  const newMission = input.value.trim();
  if (!newMission) { showToast('미션 문구를 입력해주세요.', 'error'); return; }
  bingoCells[cellId].mission = newMission;
  const teamIdMatch = window.location.pathname.match(/\/team\/(\d+)/);
  const teamId = teamIdMatch ? parseInt(teamIdMatch[1]) : null;
  closeModal();
  if (teamId) {
    updateBingoGrid();
    scheduleSave(teamId, bingoCells);
    showToast('미션이 수정되었습니다!', 'success');
  }
}

// ─── 네비게이션 반응형 ───────────────────────────────────────
function checkNavbarResponsive() {
  const hamburger = document.getElementById('hamburger-btn');
  const desktopNav = document.getElementById('desktop-nav');
  if (!hamburger || !desktopNav) return;
  const isMobile = window.innerWidth < 768;
  hamburger.style.display = isMobile ? 'block' : 'none';
  desktopNav.style.display = isMobile ? 'none' : 'flex';
}
window.addEventListener('resize', checkNavbarResponsive);

// 스크롤 시 navbar 그림자
window.addEventListener('scroll', () => {
  const navbar = document.getElementById('navbar');
  if (navbar) {
    navbar.style.boxShadow = window.scrollY > 10
      ? '0 2px 16px rgba(139,94,42,0.12)'
      : 'none';
  }
});

// ─── 메인 렌더 함수 ──────────────────────────────────────────
async function render() {
  closeMobileMenu();
  const route = getRoute();
  const navbarEl = document.getElementById('navbar-container');
  if (navbarEl) navbarEl.innerHTML = renderNavbar();

  const content = document.getElementById('app-content');
  if (!content) return;

  if (route.page === 'home') {
    content.innerHTML = renderHome();
    // 데스크탑에서 장식 이미지 표시
    document.querySelectorAll('.lg-show').forEach(el => {
      el.style.display = window.innerWidth >= 1024 ? 'block' : 'none';
    });
    document.querySelectorAll('.md-show').forEach(el => {
      el.style.display = window.innerWidth >= 768 ? 'block' : 'none';
    });
  } else if (route.page === 'about') {
    content.innerHTML = renderAbout();
  } else if (route.page === 'memories') {
    content.innerHTML = renderMemories();
  } else if (route.page === 'team-bingo') {
    currentTeamId = route.teamId;
    prevBingoCount = 0;
    await renderTeamBingo(route.teamId);
  } else {
    content.innerHTML = `
    <div style="min-height:100vh;padding-top:64px;display:flex;align-items:center;justify-content:center;background:#F5EEE8;">
      <div style="text-align:center;">
        <div style="font-size:4rem;margin-bottom:1rem;">🔍</div>
        <h1 style="font-size:1.8rem;font-weight:700;color:#D51E2A;margin-bottom:0.5rem;">404</h1>
        <p style="color:#7A5C3E;margin-bottom:1.5rem;">페이지를 찾을 수 없습니다.</p>
        <button onclick="navigate('/')" style="padding:0.7rem 1.8rem;border-radius:6px;background:#D51E2A;color:white;border:none;cursor:pointer;font-size:0.88rem;font-weight:600;font-family:'Noto Sans KR',sans-serif;">홈으로 돌아가기</button>
      </div>
    </div>`;
  }
  checkNavbarResponsive();
}

// ─── 앱 초기화 ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('root').innerHTML = `
  <div id="navbar-container"></div>
  <main id="app-content" style="position:relative;"></main>
  <div id="modal-container" style="display:none;position:fixed;inset:0;z-index:100;"></div>
  <div id="toast-container" class="toast-container"></div>`;
  render();
});

// 전역 함수 노출
window.navigate = navigate;
window.toggleMobileMenu = toggleMobileMenu;
window.closeMobileMenu = closeMobileMenu;
window.selectTeam = selectTeam;
window.openPhotoModal = openPhotoModal;
window.openEditModal = openEditModal;
window.closeModal = closeModal;
window.closeModalIfOutside = closeModalIfOutside;
window.deletePhoto = deletePhoto;
window.handleFileInput = handleFileInput;
window.handleDrop = handleDrop;
window.savePhoto = savePhoto;
window.saveMission = saveMission;
window.toggleGuide = toggleGuide;
window.resetPhotos = resetPhotos;
window.resetAll = resetAll;
