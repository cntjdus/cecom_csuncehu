// ─── 쎄선쎄후 클럽 빙고 메인 앱 ─────────────────────────────
// Vanilla JS SPA (React 없이 순수 JS로 구현)

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

const HERO_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663601973763/A593oQQ9RXgSp8xRSx9QYy/boarding-pass-left-BTafKjxzw4aSWQXjcWc7ws.webp";
const TICKET_MAIN_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663601973763/A593oQQ9RXgSp8xRSx9QYy/ticket-gen-main-Lo9fXjZT9sAddX6VW3Pofj.webp";
const TICKET_STUB_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663601973763/A593oQQ9RXgSp8xRSx9QYy/ticket-gen-stub-HYrRBCaoAR4jWyG74UNPgB.webp";
const BOARDING_PASS_LEFT = "https://d2xsxph8kpxj0f.cloudfront.net/310519663601973763/A593oQQ9RXgSp8xRSx9QYy/boarding-pass-left-BTafKjxzw4aSWQXjcWc7ws.webp";
const BOARDING_PASS_RIGHT = "https://d2xsxph8kpxj0f.cloudfront.net/310519663601973763/A593oQQ9RXgSp8xRSx9QYy/boarding-pass-right-fkWcErj2SqmDxRvMJe4SgJ.webp";
const ENVELOPE_LEFT = "https://d2xsxph8kpxj0f.cloudfront.net/310519663601973763/A593oQQ9RXgSp8xRSx9QYy/envelope-left-jLLbdS9tM9fBinBaFvbZpi.webp";
const ENVELOPE_RIGHT = "https://d2xsxph8kpxj0f.cloudfront.net/310519663601973763/A593oQQ9RXgSp8xRSx9QYy/envelope-right-hTVqmFFFmCrGdq7TCgZcCr.webp";
const BINGO_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663601973763/A593oQQ9RXgSp8xRSx9QYy/bingo-bg-placeholder.webp";

// ─── 앱 상태 ─────────────────────────────────────────────────
let currentPage = 'home';
let currentTeamId = null;
let bingoCells = [];
let completedLines = [];
let syncTimeout = null;
let toastTimeout = null;

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
  return missions.slice(0, 25).map((mission, id) => ({
    id, mission, photo: null, completed: false
  }));
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

// ─── Navbar 렌더링 ────────────────────────────────────────────
function renderNavbar() {
  const path = window.location.pathname;
  const isActive = href => {
    if (href === '/') return path === '/';
    if (href === '/memories' && path.startsWith('/team/')) return true;
    return path.startsWith(href);
  };

  return `
  <header id="navbar" style="position:fixed;top:0;left:0;right:0;z-index:50;background:rgba(255,255,255,0.97);border-bottom:1px solid rgba(220,160,160,0.25);transition:box-shadow 0.3s;">
    <div style="max-width:72rem;margin:0 auto;padding:0 1rem;">
      <div style="display:flex;align-items:center;justify-content:space-between;height:80px;">
        <!-- 로고 -->
        <a href="/" onclick="navigate('/');return false;" style="display:flex;align-items:center;text-decoration:none;gap:0.5rem;">
          <span style="font-size:1.8rem;font-weight:900;color:#c0392b;letter-spacing:-0.02em;font-family:'Noto Sans KR',sans-serif;">쎄선쎄후</span>
          <span style="font-size:0.75rem;color:rgba(192,57,43,0.6);font-weight:500;">✈</span>
        </a>
        <!-- 데스크탑 메뉴 -->
        <nav style="display:flex;gap:2.5rem;align-items:center;" id="desktop-nav">
          <a href="/" onclick="navigate('/');return false;" class="nav-link ${isActive('/') ? 'active' : ''}">HOME</a>
          <a href="/about" onclick="navigate('/about');return false;" class="nav-link ${isActive('/about') ? 'active' : ''}">쎄선쎄후란?</a>
          <a href="/memories" onclick="navigate('/memories');return false;" class="nav-link ${isActive('/memories') ? 'active' : ''}">우리의 추억</a>
        </nav>
        <!-- 모바일 햄버거 -->
        <button onclick="toggleMobileMenu()" style="display:none;padding:0.5rem;background:none;border:none;cursor:pointer;color:#c0392b;" id="hamburger-btn">
          <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  </header>
  <!-- 모바일 오버레이 -->
  <div id="mobile-overlay" onclick="closeMobileMenu()" style="display:none;position:fixed;inset:0;z-index:40;background:rgba(180,60,60,0.15);backdrop-filter:blur(4px);"></div>
  <!-- 모바일 드로어 -->
  <div class="mobile-drawer" id="mobile-drawer">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:1rem 1.5rem;border-bottom:1px solid rgba(220,160,160,0.3);">
      <span style="font-size:1.3rem;font-weight:900;color:#c0392b;">쎄선쎄후 ✈</span>
      <button onclick="closeMobileMenu()" style="background:none;border:none;cursor:pointer;color:#c0392b;padding:0.5rem;">
        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    <nav style="display:flex;flex-direction:column;padding:1.5rem;gap:0.25rem;">
      <a href="/" onclick="navigate('/');closeMobileMenu();return false;" style="padding:0.75rem 1rem;border-radius:0.75rem;text-decoration:none;font-family:'Noto Sans KR',sans-serif;font-weight:500;background:${isActive('/') ? 'rgba(192,57,43,0.08)' : 'transparent'};color:${isActive('/') ? '#c0392b' : 'oklch(0.28 0.04 15)'};">HOME</a>
      <a href="/about" onclick="navigate('/about');closeMobileMenu();return false;" style="padding:0.75rem 1rem;border-radius:0.75rem;text-decoration:none;font-family:'Noto Sans KR',sans-serif;font-weight:500;background:${isActive('/about') ? 'rgba(192,57,43,0.08)' : 'transparent'};color:${isActive('/about') ? '#c0392b' : 'oklch(0.28 0.04 15)'};">쎄선쎄후란?</a>
      <a href="/memories" onclick="navigate('/memories');closeMobileMenu();return false;" style="padding:0.75rem 1rem;border-radius:0.75rem;text-decoration:none;font-family:'Noto Sans KR',sans-serif;font-weight:500;background:${isActive('/memories') ? 'rgba(192,57,43,0.08)' : 'transparent'};color:${isActive('/memories') ? '#c0392b' : 'oklch(0.28 0.04 15)'};">우리의 추억</a>
    </nav>
    <div style="position:absolute;bottom:2rem;left:0;right:0;text-align:center;">
      <div class="elegant-divider" style="margin-bottom:1rem;"></div>
      <p style="font-size:0.75rem;color:rgba(192,57,43,0.5);">쎄선쎄후 동아리 🌸</p>
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

// ─── 홈 페이지 ───────────────────────────────────────────────
function renderHome() {
  return `
  <section style="position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden;min-height:100vh;">
    <!-- 배경: 분홍-코랄 그라디언트 (이미지 대체) -->
    <div style="position:absolute;inset:0;background:linear-gradient(145deg,#f4b8b8 0%,#e88888 35%,#d96060 65%,#c94040 100%);"></div>
    <!-- 패턴 -->
    <svg style="position:absolute;inset:0;width:100%;height:100%;opacity:0.08;pointer-events:none;" viewBox="0 0 800 800" preserveAspectRatio="xMidYMid slice">
      <path d="M 30 100 Q 150 300 80 500 Q 30 650 100 750" fill="none" stroke="#7b0000" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M 770 50 Q 650 200 720 400 Q 780 580 700 750" fill="none" stroke="#7b0000" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="30" cy="100" r="5" fill="#7b0000"/>
      <circle cx="770" cy="50" r="5" fill="#7b0000"/>
    </svg>
    <!-- 장식 이미지: 탑승권 왼쪽 상단 -->
    <img src="${BOARDING_PASS_LEFT}" alt="" aria-hidden="true"
      style="position:absolute;width:clamp(200px,18vw,280px);top:12%;left:2%;filter:drop-shadow(4px 6px 12px rgba(0,0,0,0.18));z-index:2;pointer-events:none;display:none;" class="lg-show"/>
    <!-- 장식 이미지: 탑승권 오른쪽 하단 -->
    <img src="${BOARDING_PASS_RIGHT}" alt="" aria-hidden="true"
      style="position:absolute;width:clamp(180px,16vw,260px);bottom:8%;right:2%;filter:drop-shadow(4px 6px 12px rgba(0,0,0,0.18));z-index:2;pointer-events:none;display:none;" class="lg-show"/>
    <!-- 편지봉투 왼쪽 하단 -->
    <img src="${ENVELOPE_LEFT}" alt="" aria-hidden="true"
      style="position:absolute;width:clamp(120px,11vw,170px);bottom:6%;left:3%;filter:drop-shadow(3px 5px 10px rgba(0,0,0,0.2));z-index:2;pointer-events:none;display:none;" class="lg-show"/>
    <!-- 편지봉투 오른쪽 상단 -->
    <img src="${ENVELOPE_RIGHT}" alt="" aria-hidden="true"
      style="position:absolute;width:clamp(100px,9vw,150px);top:8%;right:3%;filter:drop-shadow(3px 5px 10px rgba(0,0,0,0.2));z-index:2;pointer-events:none;opacity:0.9;display:none;" class="lg-show"/>

    <!-- 중앙 콘텐츠 -->
    <div style="position:relative;z-index:10;text-align:center;padding:0 1rem;max-width:42rem;margin:0 auto;display:flex;flex-direction:column;align-items:center;">
      <div class="fade-in-up-d1" style="margin-bottom:1.5rem;">
        <p style="font-size:0.75rem;letter-spacing:0.25em;color:rgba(255,255,255,0.85);margin-bottom:0.75rem;font-weight:500;">세콤 오리지널</p>
        <div style="background:rgba(255,255,255,0.15);backdrop-filter:blur(10px);border:2px solid rgba(255,255,255,0.4);border-radius:1.5rem;padding:2rem 3rem;box-shadow:0 8px 32px rgba(0,0,0,0.2);">
          <h1 style="font-size:clamp(3rem,10vw,6rem);font-weight:900;color:white;letter-spacing:-0.02em;line-height:1;text-shadow:0 4px 20px rgba(0,0,0,0.3);margin-bottom:0.5rem;">쎄선쎄후</h1>
          <p style="font-size:clamp(0.9rem,2.5vw,1.2rem);color:rgba(255,255,255,0.9);letter-spacing:0.15em;font-weight:500;">Another beginning ✈</p>
        </div>
      </div>
      <p class="fade-in-up-d2" style="font-size:clamp(1rem,3vw,1.4rem);color:rgba(255,255,255,0.9);margin-bottom:2.5rem;text-shadow:0 2px 8px rgba(0,0,0,0.2);">
        선배와 후배가 함께하는 특별한 시간 🌸
      </p>
      <!-- CTA 버튼 -->
      <div class="fade-in-up-d3" style="display:flex;flex-wrap:wrap;gap:0.75rem;justify-content:center;">
        <a href="/memories" onclick="navigate('/memories');return false;"
          style="display:inline-flex;align-items:center;justify-content:center;gap:0.5rem;padding:0.875rem 2rem;border-radius:9999px;font-size:0.95rem;font-weight:600;text-decoration:none;transition:all 0.2s;background:rgba(255,255,255,0.95);color:#c0392b;box-shadow:0 4px 16px rgba(180,60,60,0.25);letter-spacing:0.05em;"
          onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
          우리의 추억 →
        </a>
        <a href="/about" onclick="navigate('/about');return false;"
          style="display:inline-flex;align-items:center;justify-content:center;gap:0.5rem;padding:0.875rem 2rem;border-radius:9999px;font-size:0.95rem;font-weight:600;text-decoration:none;transition:all 0.2s;background:rgba(255,255,255,0.15);color:white;border:1.5px solid rgba(255,255,255,0.65);backdrop-filter:blur(4px);letter-spacing:0.05em;"
          onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
          쎄선쎄후란?
        </a>
      </div>
    </div>
  </section>`;
}

// ─── About 페이지 ─────────────────────────────────────────────
function renderAbout() {
  return `
  <div style="min-height:100vh;padding-top:80px;background:oklch(0.98 0.01 10);">
    <!-- 헤더 섹션 -->
    <section style="position:relative;padding:5rem 1rem;text-align:center;overflow:hidden;background:linear-gradient(135deg,#f4a0a0 0%,#e88080 50%,#d96060 100%);">
      <svg style="position:absolute;inset:0;width:100%;height:100%;opacity:0.3;pointer-events:none;" viewBox="0 0 800 300" preserveAspectRatio="xMidYMid slice">
        <path d="M 20 50 Q 100 150 50 250" fill="none" stroke="#c0392b" stroke-width="2" stroke-linecap="round"/>
        <path d="M 780 30 Q 700 120 750 250" fill="none" stroke="#c0392b" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <div style="position:relative;z-index:10;max-width:42rem;margin:0 auto;">
        <p style="font-size:0.85rem;letter-spacing:0.2em;color:rgba(255,255,255,0.85);margin-bottom:0.75rem;font-weight:500;">세콤 오리지널</p>
        <div style="font-size:3.5rem;font-weight:900;color:white;margin-bottom:0.5rem;text-shadow:0 4px 16px rgba(0,0,0,0.2);">쎄선쎄후</div>
        <h1 style="font-size:1.5rem;font-weight:700;color:rgba(255,255,255,0.95);margin-bottom:0.5rem;">쎄선쎄후란?</h1>
        <p style="font-size:1rem;color:rgba(255,255,255,0.88);letter-spacing:0.05em;">Another beginning ✈</p>
      </div>
    </section>

    <!-- 메인 콘텐츠 -->
    <section style="padding:3rem 1rem;">
      <div style="max-width:48rem;margin:0 auto;">
        <!-- 이름 카드 -->
        <div style="text-align:center;margin-bottom:3rem;padding:2rem;border-radius:1rem;position:relative;background:white;border:1.5px solid rgba(220,160,160,0.35);box-shadow:0 4px 24px rgba(192,57,43,0.10);">
          <div style="position:absolute;top:0.5rem;left:0.5rem;width:1rem;height:1rem;border-top:2px solid rgba(192,57,43,0.3);border-left:2px solid rgba(192,57,43,0.3);"></div>
          <div style="position:absolute;top:0.5rem;right:0.5rem;width:1rem;height:1rem;border-top:2px solid rgba(192,57,43,0.3);border-right:2px solid rgba(192,57,43,0.3);"></div>
          <div style="position:absolute;bottom:0.5rem;left:0.5rem;width:1rem;height:1rem;border-bottom:2px solid rgba(192,57,43,0.3);border-left:2px solid rgba(192,57,43,0.3);"></div>
          <div style="position:absolute;bottom:0.5rem;right:0.5rem;width:1rem;height:1rem;border-bottom:2px solid rgba(192,57,43,0.3);border-right:2px solid rgba(192,57,43,0.3);"></div>
          <p style="font-size:0.75rem;letter-spacing:0.2em;color:rgba(192,57,43,0.6);margin-bottom:1rem;font-weight:500;">ABOUT US</p>
          <div style="font-size:3rem;font-weight:900;color:#c0392b;margin-bottom:0.75rem;">쎄선쎄후 ✈</div>
          <p style="font-size:1rem;font-weight:600;margin-bottom:0.25rem;color:oklch(0.28 0.04 15);">
            <span style="color:#c0392b;">쎄콤</span> 선배, <span style="color:#c0392b;">쎄콤</span> 후배
          </p>
          <p style="font-size:0.875rem;color:oklch(0.55 0.06 15);">세상에서 가장 특별한 선배와 후배의 만남</p>
        </div>

        <!-- 소개 카드들 -->
        <div style="display:flex;flex-direction:column;gap:1rem;">
          ${[
            { icon:"🌱", title:"활동 소개", content:"쎄선쎄후는 선배와 후배가 함께 성장하고 소통하는 기회를 만들고자 하는 활동입니다. 기존의 짝선짝후라는 이름에서 착안하여 쎄콤 선배, 쎄콤 후배라는 활동명을 만들게 되었습니다. 선배는 후배에게 경험과 지혜를, 후배는 선배에게 새로운 시각과 에너지를 나눕니다." },
            { icon:"🎯", title:"활동 방식", content:"미션 빙고를 중심으로 다양한 활동을 진행합니다. 함께 미션을 완수하며 자연스럽게 대화하고 추억을 쌓습니다. 각 조별로 빙고판을 채워나가며 팀워크와 유대감을 강화합니다." },
            { icon:"📸", title:"추억 기록", content:"함께한 모든 순간을 사진으로 기록합니다. 미션을 완수할 때마다 찍는 사진들은 우리만의 소중한 추억이 됩니다. 빙고판에 담긴 사진들이 모여 쎄선쎄후만의 특별한 이야기를 만들어갑니다." }
          ].map(item => `
            <div style="display:flex;gap:1.25rem;padding:1.5rem;border-radius:1rem;background:white;border:1px solid rgba(220,160,160,0.25);box-shadow:0 2px 12px rgba(192,57,43,0.06);transition:box-shadow 0.2s;"
              onmouseover="this.style.boxShadow='0 6px 20px rgba(192,57,43,0.12)'" onmouseout="this.style.boxShadow='0 2px 12px rgba(192,57,43,0.06)'">
              <div style="font-size:2rem;flex-shrink:0;margin-top:0.125rem;">${item.icon}</div>
              <div>
                <h3 style="font-size:1rem;font-weight:700;color:#c0392b;margin-bottom:0.5rem;">${item.title}</h3>
                <p style="font-size:0.875rem;line-height:1.7;color:oklch(0.40 0.04 15);">${item.content}</p>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- 마무리 문구 -->
        <div style="margin-top:2.5rem;padding:2rem;text-align:center;border-radius:1rem;background:linear-gradient(135deg,rgba(244,160,160,0.15),rgba(232,128,128,0.10));border:1px solid rgba(220,160,160,0.3);">
          <p style="font-size:1.2rem;font-weight:600;color:#c0392b;line-height:1.8;">
            "선배와 후배가 함께라면,<br>어떤 미션도 즐거운 추억이 됩니다 🌸"
          </p>
        </div>
      </div>
    </section>
  </div>`;
}

// ─── Memories/TeamSelector 페이지 ────────────────────────────
function renderMemories() {
  const teams = [1,2,3,4,5];
  return `
  <div style="min-height:100vh;padding-top:80px;background:linear-gradient(145deg,#f4b8b8 0%,#e88888 35%,#d96060 65%,#c94040 100%);">
    <div style="min-height:calc(100vh - 80px);padding:4rem 1rem;display:flex;flex-direction:column;align-items:center;justify-content:center;">
      <div style="width:100%;max-width:42rem;display:flex;flex-direction:column;gap:1.5rem;">
        <!-- 헤더 -->
        <div style="text-align:center;">
          <p style="font-size:0.85rem;letter-spacing:0.2em;color:rgba(255,255,255,0.9);margin-bottom:0.5rem;font-weight:500;text-shadow:0 1px 4px rgba(0,0,0,0.2);">세콤 오리지널</p>
          <div style="font-size:3rem;font-weight:900;color:white;margin-bottom:0.5rem;text-shadow:0 4px 16px rgba(0,0,0,0.3);filter:drop-shadow(0 2px 8px rgba(180,120,0,0.3));">쎄선쎄후 ✈</div>
          <p style="font-size:1.05rem;color:rgba(255,255,255,0.92);text-shadow:0 1px 4px rgba(0,0,0,0.2);">탑승권을 선택해주세요! 🎫</p>
        </div>

        <!-- 탑승권 목록 -->
        <div style="display:flex;flex-direction:column;gap:1rem;" id="ticket-list">
          ${teams.map(id => `
            <div class="ticket-card" id="ticket-${id}" onclick="selectTeam(${id})"
              style="position:relative;cursor:pointer;user-select:none;filter:drop-shadow(0 4px 16px rgba(0,0,0,0.14));display:inline-flex;align-items:stretch;height:clamp(90px,16vw,160px);width:100%;border-radius:12px;overflow:hidden;transition:transform 0.15s;">
              <!-- 메인 티켓 -->
              <div style="flex:3 0 0;min-width:0;height:100%;position:relative;">
                <img src="${TICKET_MAIN_IMG}" alt="탑승권 메인" style="display:block;width:100%;height:100%;object-fit:fill;border-radius:12px 0 0 12px;" draggable="false"/>
                <!-- 조 이름 오버레이 -->
                <div style="position:absolute;inset:0;display:flex;align-items:center;padding-left:26%;padding-right:4%;">
                  <span style="font-weight:900;font-size:clamp(1.4rem,3.5vw,2.4rem);color:oklch(0.22 0.04 15);letter-spacing:-0.02em;">${TEAM_NAMES[id]}</span>
                </div>
              </div>
              <!-- 스텁 -->
              <div id="stub-${id}" style="flex:2 0 0;min-width:0;height:100%;">
                <img src="${TICKET_STUB_IMG}" alt="탑승권 스텁" style="display:block;width:100%;height:100%;object-fit:fill;border-radius:0 12px 12px 0;" draggable="false"/>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- 안내 -->
        <div style="border-radius:0.75rem;padding:1.5rem;text-align:center;background:rgba(255,252,245,0.90);box-shadow:0 4px 16px rgba(0,0,0,0.10);border-top:3px solid #5bbfb5;">
          <p style="color:oklch(0.35 0.06 15);font-size:0.9rem;line-height:1.7;">
            탑승권을 선택하면 해당 조의 빙고판으로 이동합니다.<br>
            조원들과 함께 미션을 완수하고 빙고를 완성해보세요! 🎉
          </p>
        </div>
      </div>
    </div>
  </div>`;
}

function selectTeam(teamId) {
  const ticket = document.getElementById(`ticket-${teamId}`);
  const stub = document.getElementById(`stub-${teamId}`);
  if (!ticket || !stub) return;

  // 흔들기 애니메이션
  ticket.classList.add('ticket-shake');
  setTimeout(() => {
    ticket.classList.remove('ticket-shake');
    stub.classList.add('ticket-stub-tear');
    setTimeout(() => navigate(`/team/${teamId}`), 600);
  }, 220);
}

// ─── 팀 빙고 페이지 ──────────────────────────────────────────
async function renderTeamBingo(teamId) {
  // 로딩 상태 표시
  document.getElementById('app-content').innerHTML = `
  <div style="min-height:100vh;padding-top:80px;display:flex;align-items:center;justify-content:center;background:linear-gradient(145deg,#f4b8b8 0%,#e88888 100%);">
    <div style="text-align:center;">
      <div style="width:3rem;height:3rem;border:3px solid rgba(192,57,43,0.3);border-top-color:#c0392b;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 1rem;"></div>
      <p style="color:rgba(255,255,255,0.9);font-size:1rem;">데이터를 불러오는 중...</p>
    </div>
  </div>`;

  // 서버에서 데이터 로드
  const data = await fetchBoard(teamId);

  if (data && data.cells && data.cells.length > 0) {
    bingoCells = data.cells.map(c => ({
      id: c.cell_id,
      mission: c.mission,
      photo: c.photo || null,
      completed: false
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
  <div style="min-height:100vh;padding-top:80px;background:linear-gradient(145deg,#e06060 0%,#c04040 50%,#a02020 100%);background-attachment:fixed;" id="bingo-page">
    <!-- 빨간 실 장식 -->
    <svg style="position:fixed;inset:0;width:100%;height:100%;pointer-events:none;opacity:0.2;z-index:0;" viewBox="0 0 800 800" preserveAspectRatio="xMidYMid slice">
      <path d="M 30 100 Q 150 300 80 500 Q 30 650 100 750" fill="none" stroke="#ff8080" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M 770 50 Q 650 200 720 400 Q 780 580 700 750" fill="none" stroke="#ff8080" stroke-width="2.5" stroke-linecap="round"/>
    </svg>

    <!-- 빙고 완성 배너 (숨김) -->
    <div id="bingo-banner" style="position:fixed;top:1.25rem;left:50%;transform:translateX(-50%);z-index:200;pointer-events:none;display:none;">
      <div style="display:flex;align-items:center;gap:0.75rem;padding:1rem 1.75rem;border-radius:1rem;background:linear-gradient(135deg,#E63946,#C1121F);box-shadow:0 8px 32px rgba(230,57,70,0.4),0 2px 8px rgba(0,0,0,0.2);color:white;">
        <span style="font-size:1.5rem;">🏆</span>
        <div style="text-align:center;">
          <p style="font-weight:900;font-size:1.5rem;line-height:1.2;" id="bingo-banner-text">🎉 BINGO!</p>
          <p style="font-size:0.875rem;color:rgba(255,200,200,1);line-height:1.2;" id="bingo-banner-sub">빙고 완성!</p>
        </div>
        <span style="font-size:1.5rem;">⭐</span>
      </div>
    </div>

    <!-- 스핀 CSS -->
    <style>@keyframes spin{to{transform:rotate(360deg)}}</style>

    <div style="position:relative;z-index:10;padding:1.5rem 0.75rem;max-width:36rem;margin:0 auto;">
      <!-- 뒤로가기 -->
      <button onclick="navigate('/memories')"
        style="display:inline-flex;align-items:center;gap:0.375rem;padding:0.5rem 1rem;border-radius:9999px;background:rgba(255,255,255,0.85);border:1px solid rgba(192,57,43,0.3);color:#c0392b;font-size:0.875rem;font-weight:500;cursor:pointer;margin-bottom:1rem;transition:all 0.15s;"
        onmouseover="this.style.background='white'" onmouseout="this.style.background='rgba(255,255,255,0.85)'">
        ← 팀 선택으로 돌아가기
      </button>

      <!-- 헤더 -->
      <div style="text-align:center;margin-bottom:1rem;">
        <p style="font-size:0.75rem;letter-spacing:0.2em;color:rgba(255,255,255,0.85);margin-bottom:0.25rem;font-weight:500;">세콤 오리지널</p>
        <h1 class="text-gold" style="font-size:clamp(2.2rem,8vw,3.5rem);font-weight:900;line-height:1;margin-bottom:0.25rem;">${teamName} 빙고</h1>
        <p style="font-size:1.05rem;color:rgba(255,255,255,0.9);">함께하는 추억 만들기 ✨</p>
      </div>

      <!-- 진행 현황 카드 -->
      <div style="background:rgba(255,255,255,0.90);border-radius:1rem;padding:0.75rem 1rem;margin-bottom:1rem;box-shadow:0 4px 16px rgba(192,57,43,0.12);">
        <div style="display:flex;align-items:center;gap:0.75rem;">
          <div style="display:flex;align-items:center;gap:0.5rem;flex-shrink:0;">
            <span style="font-size:1rem;">📸</span>
            <div>
              <p style="font-size:0.625rem;font-weight:600;color:#c0392b;line-height:1;">미션 완료</p>
              <p style="font-size:1.25rem;font-weight:900;line-height:1.2;color:oklch(0.22 0.04 15);" id="photo-count-display">${photoCount}<span style="font-size:0.875rem;color:#c0392b;">/${totalCells}</span></p>
            </div>
          </div>
          <div style="flex:1;">
            <div style="height:0.75rem;border-radius:9999px;overflow:hidden;background:rgba(192,57,43,0.12);">
              <div class="progress-bar" style="height:100%;border-radius:9999px;background:linear-gradient(90deg,#e74c3c,#c0392b);width:${progressPct}%;transition:width 0.7s ease-out;" id="progress-bar"></div>
            </div>
            <p style="text-align:right;font-size:0.625rem;margin-top:0.125rem;font-weight:500;color:#c0392b;" id="progress-pct">${progressPct}%</p>
          </div>
          <div style="display:flex;align-items:center;gap:0.5rem;flex-shrink:0;">
            <div>
              <p style="font-size:0.625rem;font-weight:600;color:#c0392b;text-align:right;line-height:1;">빙고</p>
              <p style="font-size:1.25rem;font-weight:900;text-align:right;line-height:1.2;color:#c0392b;" id="bingo-count-display">${completedLines.length}<span style="font-size:0.875rem;color:rgba(192,57,43,0.6);">줄</span></p>
            </div>
            <span style="font-size:1.25rem;">🏆</span>
          </div>
        </div>
      </div>

      <!-- 빙고판 -->
      <div style="position:relative;background:rgba(255,255,255,0.92);border-radius:1rem;padding:0.625rem;box-shadow:0 8px 32px rgba(192,57,43,0.18),0 2px 8px rgba(0,0,0,0.06);border:2px solid rgba(255,255,255,0.8);margin-bottom:1rem;" id="bingo-board-container">
        <!-- 마스킹 테이프 장식 -->
        <div style="position:absolute;top:-0.75rem;left:20%;width:5rem;height:1.25rem;border-radius:2px;background:rgba(231,76,60,0.6);transform:rotate(-1.5deg);opacity:0.85;"></div>
        <div style="position:absolute;top:-0.75rem;right:22%;width:4rem;height:1.25rem;border-radius:2px;background:rgba(91,191,181,0.7);transform:rotate(2deg);opacity:0.85;"></div>
        <div style="position:absolute;top:-0.75rem;left:50%;transform:translateX(-50%) rotate(-0.5deg);width:3rem;height:1.25rem;border-radius:2px;background:rgba(231,76,60,0.45);opacity:0.8;"></div>

        <!-- 빙고 그리드 -->
        <div id="bingo-grid" style="display:grid;grid-template-columns:repeat(5,1fr);grid-template-rows:repeat(5,1fr);gap:4px;padding:10px;aspect-ratio:1/1;">
          ${bingoCells.map(cell => renderBingoCell(cell, completedCells.has(cell.id))).join('')}
        </div>

        <!-- 빙고 라인 SVG 오버레이 -->
        <svg id="bingo-lines-svg" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:5;" viewBox="0 0 1000 1000" preserveAspectRatio="none">
          ${completedLines.map(line => renderBingoLineSVG(line)).join('')}
        </svg>
      </div>

      <!-- 사용 방법 안내 (접기/펼치기) -->
      <div style="background:rgba(255,255,255,0.88);border-radius:1rem;overflow:hidden;border:1px solid rgba(255,255,255,0.7);box-shadow:0 4px 16px rgba(192,57,43,0.10);margin-bottom:1rem;">
        <button onclick="toggleGuide()" style="width:100%;display:flex;align-items:center;justify-content:space-between;padding:0.75rem 1rem;background:none;border:none;cursor:pointer;color:#c0392b;">
          <div style="display:flex;align-items:center;gap:0.5rem;">
            <span>ℹ️</span>
            <span style="font-size:0.875rem;font-weight:500;">사용 방법 안내</span>
          </div>
          <span id="guide-chevron" style="font-size:0.875rem;transition:transform 0.2s;">▼</span>
        </button>
        <div id="guide-content" style="display:none;padding:0 1rem 1rem;border-top:1px solid rgba(192,57,43,0.15);">
          <div style="padding-top:0.75rem;display:flex;flex-direction:column;gap:0.5rem;font-size:0.875rem;color:oklch(0.35 0.06 15);">
            ${[
              ['📸','사진 첨부','빙고 칸을 클릭하면 미션 사진을 첨부할 수 있어요. 드래그&드롭도 지원합니다.'],
              ['✏️','미션 수정','칸에 마우스를 올리면 우상단에 연필 버튼이 나타나요.'],
              ['🔄','사진 교체/삭제','이미 사진이 있는 칸을 클릭하면 사진을 바꾸거나 삭제할 수 있어요.'],
              ['🎯','빙고 완성','가로·세로·대각선 5칸이 모두 채워지면 빨간 선이 그어져요!'],
              ['💾','자동 저장','모든 변경사항은 자동으로 서버에 저장됩니다.']
            ].map(([icon, title, desc]) => `
              <div style="display:flex;align-items:flex-start;gap:0.5rem;">
                <span style="font-size:1rem;flex-shrink:0;">${icon}</span>
                <p><strong>${title}:</strong> ${desc}</p>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- 하단 버튼 -->
      <div style="display:flex;gap:0.75rem;justify-content:center;flex-wrap:wrap;margin-bottom:0.5rem;">
        <button onclick="resetPhotos(${teamId})"
          style="display:flex;align-items:center;gap:0.375rem;padding:0.5rem 1rem;border-radius:9999px;font-size:0.875rem;font-weight:500;background:rgba(255,255,255,0.85);color:#c0392b;border:1.5px solid rgba(192,57,43,0.3);cursor:pointer;transition:all 0.15s;"
          onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
          📷 사진만 초기화
        </button>
        <button onclick="resetAll(${teamId})"
          style="display:flex;align-items:center;gap:0.375rem;padding:0.5rem 1rem;border-radius:9999px;font-size:0.875rem;font-weight:500;background:rgba(255,255,255,0.85);color:#922b21;border:1.5px solid rgba(146,43,33,0.3);cursor:pointer;transition:all 0.15s;"
          onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
          🔄 전체 초기화
        </button>
      </div>

      <!-- 푸터 -->
      <p style="text-align:center;padding:1rem 0;font-size:1.05rem;color:rgba(255,255,255,0.85);">소중한 추억을 함께 만들어요 🌟</p>
    </div>
  </div>`;

  // 반응형 처리 (모바일에서 햄버거 표시)
  checkNavbarResponsive();
}

function renderBingoCell(cell, isCompleted) {
  const hasPhoto = cell.photo !== null && cell.photo !== undefined;
  return `
  <div class="bingo-cell" id="cell-${cell.id}" onclick="openPhotoModal(${cell.id})"
    style="position:relative;border-radius:6px;overflow:hidden;aspect-ratio:1/1;min-height:0;min-width:0;
    background:${hasPhoto ? 'transparent' : 'rgba(255,255,255,0.88)'};
    box-shadow:${isCompleted ? 'inset 0 0 0 2px rgba(192,57,43,0.5),1px 1px 4px rgba(192,57,43,0.15)' : '1px 1px 3px rgba(192,57,43,0.08)'};
    border:${isCompleted ? '1.5px solid rgba(192,57,43,0.45)' : '1px solid rgba(220,160,160,0.35)'};">

    ${hasPhoto ? `
    <div style="position:absolute;inset:0;">
      <img src="${cell.photo}" alt="${cell.mission}" class="photo-attach" style="width:100%;height:100%;object-fit:cover;"/>
      <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,0.7) 0%,rgba(0,0,0,0.15) 50%,transparent 100%);"></div>
      ${isCompleted ? '<div style="position:absolute;top:0.25rem;right:0.25rem;z-index:10;font-size:0.75rem;">✅</div>' : ''}
    </div>
    <!-- 사진 있을 때 미션 문구 하단 -->
    <div style="position:absolute;bottom:0;left:0;right:0;padding:0.125rem 0.25rem;z-index:10;">
      <p style="text-align:center;line-height:1.2;font-size:clamp(0.48rem,1.3vw,0.7rem);font-weight:700;color:white;text-shadow:0 1px 4px rgba(0,0,0,0.9);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${cell.mission}</p>
    </div>
    ` : `
    <!-- 카메라 호버 오버레이 -->
    <div class="hover-overlay" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:0;transition:opacity 0.2s;z-index:10;border-radius:6px;background:rgba(244,160,160,0.85);">
      <span style="font-size:1rem;color:#c0392b;">📷</span>
      <span style="font-size:0.5625rem;font-weight:600;color:#c0392b;">사진 추가</span>
    </div>
    <!-- 미션 문구 중앙 -->
    <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:0.375rem;z-index:1;">
      <p style="text-align:center;line-height:1.3;font-size:clamp(0.5rem,1.5vw,0.78rem);color:#7b2d2d;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;">${cell.mission}</p>
    </div>
    <!-- 번호 -->
    <span style="position:absolute;top:0.125rem;left:0.25rem;font-size:0.5rem;color:#d4b8b8;font-family:monospace;z-index:0;line-height:1;">${cell.id + 1}</span>
    `}

    <!-- 미션 편집 버튼 -->
    <button class="edit-btn" onclick="event.stopPropagation();openEditModal(${cell.id})"
      style="position:absolute;top:0.125rem;right:0.125rem;opacity:0;transition:opacity 0.2s;z-index:20;background:rgba(255,255,255,0.85);border-radius:9999px;padding:0.125rem;border:none;cursor:pointer;line-height:1;"
      title="미션 수정">✏️</button>

    ${isCompleted ? '<div style="position:absolute;inset:0;border-radius:6px;pointer-events:none;z-index:10;background:rgba(255,100,100,0.08);"></div>' : ''}
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

  return `<line class="bingo-line" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#c0392b" stroke-width="8" stroke-linecap="round" opacity="0.75"/>`;
}

// 호버 효과 (CSS만으로 처리 어려운 부분 JS로)
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
  if (el1) el1.innerHTML = `${photoCount}<span style="font-size:0.875rem;color:#c0392b;">/${totalCells}</span>`;
  if (el2) el2.style.width = `${progressPct}%`;
  if (el3) el3.textContent = `${progressPct}%`;
  if (el4) el4.innerHTML = `${completedLines.length}<span style="font-size:0.875rem;color:rgba(192,57,43,0.6);">줄</span>`;
}

function updateBingoGrid(teamId) {
  const completedCells = getCompletedCellIndices(completedLines);
  const grid = document.getElementById('bingo-grid');
  if (grid) {
    grid.innerHTML = bingoCells.map(cell => renderBingoCell(cell, completedCells.has(cell.id))).join('');
  }
  const svg = document.getElementById('bingo-lines-svg');
  if (svg) {
    svg.innerHTML = completedLines.map(line => renderBingoLineSVG(line)).join('');
  }
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
      <div style="position:relative;background:#fef3c7;border-bottom:1px solid #fde68a;padding:1.5rem 1.25rem 1rem;">
        <div style="position:absolute;top:-0.5rem;left:50%;transform:translateX(-50%) rotate(-1deg);width:6rem;height:1.5rem;background:rgba(255,220,80,0.75);border-radius:2px;z-index:1;"></div>
        <h2 style="text-align:center;color:#92400e;font-size:1.25rem;font-weight:700;margin-top:0.25rem;">📸 미션 사진 첨부</h2>
        <div style="margin-top:0.5rem;text-align:center;">
          <span style="display:inline-block;background:#fef3c7;border:1px solid #fde68a;border-radius:0.5rem;padding:0.375rem 0.75rem;font-size:0.875rem;font-weight:500;color:#92400e;max-width:100%;">${cell?.mission || ''}</span>
        </div>
      </div>

      <!-- 본문 -->
      <div style="background:#fafaf9;padding:1.25rem;min-height:10rem;" id="modal-body">
        ${currentPreview && !isDeleted ? `
        <div style="display:flex;flex-direction:column;align-items:center;gap:0.75rem;">
          <div style="background:white;padding:0.5rem;padding-bottom:1.75rem;box-shadow:3px 3px 10px rgba(0,0,0,0.15);transform:rotate(1deg);max-width:13rem;position:relative;">
            <img src="${currentPreview}" alt="미션 사진" class="photo-attach" style="width:100%;aspect-ratio:1/1;object-fit:cover;"/>
            <p style="position:absolute;bottom:0.375rem;left:0;right:0;text-align:center;font-size:0.75rem;color:#a8a29e;">미션 완료! ✓</p>
          </div>
          <div style="display:flex;gap:0.5rem;justify-content:center;">
            <button onclick="document.getElementById('file-input').click()"
              style="display:inline-flex;align-items:center;gap:0.25rem;padding:0.375rem 0.875rem;border-radius:0.5rem;border:1px solid #fde68a;background:white;color:#92400e;font-size:0.75rem;cursor:pointer;">
              📷 사진 변경
            </button>
            <button onclick="deletePhoto()"
              style="display:inline-flex;align-items:center;gap:0.25rem;padding:0.375rem 0.875rem;border-radius:0.5rem;border:1px solid #fecaca;background:white;color:#dc2626;font-size:0.75rem;cursor:pointer;">
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
        <!-- 업로드 영역 -->
        <div id="drop-zone" onclick="document.getElementById('file-input').click()"
          style="border:2px dashed #fde68a;border-radius:0.75rem;padding:1.75rem;text-align:center;cursor:pointer;transition:all 0.2s;background:rgba(254,243,199,0.5);"
          ondragover="event.preventDefault();this.style.borderColor='#c0392b';this.style.background='rgba(192,57,43,0.06)';this.style.transform='scale(1.02)'"
          ondragleave="this.style.borderColor='#fde68a';this.style.background='rgba(254,243,199,0.5)';this.style.transform='scale(1)'"
          ondrop="handleDrop(event)">
          <div style="display:flex;flex-direction:column;align-items:center;gap:0.625rem;">
            <div style="width:3.5rem;height:3.5rem;border-radius:50%;background:#fef3c7;display:flex;align-items:center;justify-content:center;font-size:1.75rem;">📷</div>
            <div>
              <p style="font-weight:600;color:#92400e;font-size:0.875rem;">사진을 드래그하거나</p>
              <p style="color:#b45309;font-size:0.75rem;margin-top:0.125rem;">클릭해서 파일 선택</p>
            </div>
            <p style="font-size:0.75rem;color:#d97706;">JPG, PNG, GIF 지원 (자동 압축)</p>
          </div>
        </div>
        `}
        <input type="file" id="file-input" accept="image/*" style="display:none;" onchange="handleFileInput(event)"/>
      </div>

      <!-- 하단 버튼 -->
      <div style="background:#fef3c7;border-top:1px solid #fde68a;padding:0.875rem 1.25rem;display:flex;gap:0.625rem;justify-content:flex-end;">
        <button onclick="closeModal()"
          style="display:inline-flex;align-items:center;gap:0.25rem;padding:0.5rem 1rem;border-radius:0.5rem;border:1px solid #d1d5db;background:white;color:#6b7280;font-size:0.875rem;cursor:pointer;">
          취소
        </button>
        <button onclick="savePhoto()" id="save-btn"
          style="display:inline-flex;align-items:center;gap:0.25rem;padding:0.5rem 1rem;border-radius:0.5rem;border:none;font-size:0.875rem;cursor:pointer;font-weight:500;${isDeleted ? 'background:#dc2626;color:white;' : currentPreview ? 'background:#92400e;color:white;' : 'background:#d1d5db;color:#9ca3af;cursor:not-allowed;'}">
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
  currentCellId = null;
  currentPreview = null;
  isDeleted = false;
}

function deletePhoto() {
  currentPreview = null;
  isDeleted = true;
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
  if (!validTypes.includes(file.type)) {
    showToast('JPG, PNG, WebP, GIF 형식만 지원합니다.', 'error');
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    showToast('10MB 이하의 파일을 선택해주세요.', 'error');
    return;
  }

  // 로딩 표시
  const body = document.getElementById('modal-body');
  if (body) body.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem;gap:0.75rem;">
      <div style="width:2rem;height:2rem;border:3px solid rgba(146,64,14,0.3);border-top-color:#92400e;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
      <p style="font-size:0.875rem;font-weight:500;color:#92400e;">이미지 압축 중...</p>
    </div>`;

  try {
    const compressed = await compressImage(file);
    currentPreview = compressed;
    isDeleted = false;
    const cell = bingoCells[currentCellId];
    renderPhotoModal(cell);
    showToast('이미지 압축 완료!', 'success', 2000);
  } catch (err) {
    showToast('이미지 처리 중 오류가 발생했습니다.', 'error');
  }
}

async function savePhoto() {
  if (currentCellId === null) return;

  if (isDeleted) {
    bingoCells[currentCellId].photo = null;
  } else if (currentPreview) {
    bingoCells[currentCellId].photo = currentPreview;
  } else {
    closeModal();
    return;
  }

  const prevLines = completedLines.length;
  completedLines = checkBingoLines(bingoCells);

  // 현재 팀 ID 가져오기
  const teamIdMatch = window.location.pathname.match(/\/team\/(\d+)/);
  const teamId = teamIdMatch ? parseInt(teamIdMatch[1]) : null;

  closeModal();

  if (teamId) {
    updateBingoGrid(teamId);
    updateBingoStats();
    scheduleSave(teamId, bingoCells);

    if (completedLines.length > prevLines) {
      prevBingoCount = prevLines;
      setTimeout(() => showBingoBanner(completedLines.length), 300);
      showToast(`🎉 빙고 ${completedLines.length}줄 완성!`, 'success', 3000);
    }

    if (isDeleted) {
      showToast('사진이 삭제되었습니다.', 'info');
    } else {
      showToast('사진이 저장되었습니다!', 'success');
    }
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
      <div style="background:#fef3c7;border-bottom:1px solid #fde68a;padding:1.25rem;">
        <h2 style="text-align:center;color:#92400e;font-size:1.1rem;font-weight:700;">✏️ 미션 문구 수정</h2>
      </div>
      <div style="background:#fafaf9;padding:1.25rem;">
        <p style="font-size:0.8rem;color:#78716c;margin-bottom:0.5rem;">현재 미션:</p>
        <p style="font-size:0.875rem;color:#92400e;background:#fef3c7;padding:0.5rem 0.75rem;border-radius:0.5rem;margin-bottom:1rem;">${cell.mission}</p>
        <p style="font-size:0.8rem;color:#78716c;margin-bottom:0.5rem;">새로운 미션:</p>
        <textarea id="mission-input" rows="3" style="width:100%;padding:0.625rem 0.75rem;border:1px solid #fde68a;border-radius:0.5rem;font-size:0.875rem;background:white;resize:none;outline:none;font-family:'Noto Sans KR',sans-serif;" placeholder="새로운 미션을 입력하세요...">${cell.mission}</textarea>
      </div>
      <div style="background:#fef3c7;border-top:1px solid #fde68a;padding:0.875rem 1.25rem;display:flex;gap:0.625rem;justify-content:flex-end;">
        <button onclick="closeModal()" style="padding:0.5rem 1rem;border-radius:0.5rem;border:1px solid #d1d5db;background:white;color:#6b7280;font-size:0.875rem;cursor:pointer;">취소</button>
        <button onclick="saveMission(${cellId})" style="padding:0.5rem 1rem;border-radius:0.5rem;border:none;background:#92400e;color:white;font-size:0.875rem;font-weight:500;cursor:pointer;">✓ 저장</button>
      </div>
    </div>
  </div>`;
  modal.style.display = 'block';

  // 포커스 & 내용 선택
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
    updateBingoGrid(teamId);
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
    navbar.style.boxShadow = window.scrollY > 10 ? '0 2px 12px rgba(0,0,0,0.08)' : 'none';
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
    <div style="min-height:100vh;padding-top:80px;display:flex;align-items:center;justify-content:center;background:oklch(0.98 0.01 10);">
      <div style="text-align:center;">
        <div style="font-size:5rem;margin-bottom:1rem;">🔍</div>
        <h1 style="font-size:2rem;font-weight:700;color:#c0392b;margin-bottom:0.5rem;">404</h1>
        <p style="color:oklch(0.55 0.06 15);margin-bottom:1.5rem;">페이지를 찾을 수 없습니다.</p>
        <button onclick="navigate('/')" style="padding:0.75rem 2rem;border-radius:9999px;background:#c0392b;color:white;border:none;cursor:pointer;font-size:0.9rem;font-weight:500;">홈으로 돌아가기</button>
      </div>
    </div>`;
  }

  checkNavbarResponsive();
}

// ─── 앱 초기화 ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // 기본 HTML 구조 주입
  document.getElementById('root').innerHTML = `
  <div id="navbar-container"></div>
  <main id="app-content" style="position:relative;"></main>
  <div id="modal-container" style="display:none;position:fixed;inset:0;z-index:100;"></div>
  <div id="toast-container" class="toast-container"></div>`;

  render();
});

// 전역 함수 노출 (HTML onclick에서 사용)
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
