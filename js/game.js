'use strict';

const COLS  = 10;
const ROWS  = 20;
const BLOCK = 30;

const COLORS = [
  null,
  '#00f5ff', '#ffd700', '#bf5fff', '#39ff14',
  '#ff4040', '#ff8c00', '#1e90ff',
];

const SHAPES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
  [[2,2],[2,2]],
  [[0,3,0],[3,3,3],[0,0,0]],
  [[0,4,4],[4,4,0],[0,0,0]],
  [[5,5,0],[0,5,5],[0,0,0]],
  [[6,0,0],[6,6,6],[0,0,0]],
  [[0,0,7],[7,7,7],[0,0,0]],
];

const canvas       = document.getElementById('board');
const ctx          = canvas.getContext('2d');
const nCanvas      = document.getElementById('next-canvas');
const nCtx         = nCanvas.getContext('2d');
const scoreEl      = document.getElementById('score-display');
const levelEl      = document.getElementById('level-display');
const linesEl      = document.getElementById('lines-display');
const overlay      = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlaySub   = document.getElementById('overlay-sub');
const btnStart     = document.getElementById('btn-start');
const userNameEl   = document.getElementById('user-status');
const btnAuth      = document.getElementById('btn-auth');
const rankingList  = document.getElementById('ranking-list');

let board, piece, nextPiece;
let score, level, lines;
let running, paused, gameOver;
let lastTime, dropCounter, dropInterval;
let animId;
let currentUser = null;

/* ── Board / Piece ─────────────────────────── */
function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece() {
  const id = Math.floor(Math.random() * 7) + 1;
  const shape = SHAPES[id].map(r => [...r]);
  return { id, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function rotate(shape) {
  const n = shape.length, m = shape[0].length;
  const res = Array.from({ length: m }, () => new Array(n).fill(0));
  for (let r = 0; r < n; r++)
    for (let c = 0; c < m; c++)
      res[c][n - 1 - r] = shape[r][c];
  return res;
}

function collides(p, b) {
  for (let r = 0; r < p.shape.length; r++)
    for (let c = 0; c < p.shape[r].length; c++)
      if (p.shape[r][c] &&
          (p.y + r >= ROWS || p.x + c < 0 || p.x + c >= COLS ||
           (p.y + r >= 0 && b[p.y + r][p.x + c])))
        return true;
  return false;
}

function merge(p, b) {
  p.shape.forEach((row, r) =>
    row.forEach((val, c) => { if (val) b[p.y + r][p.x + c] = val; })
  );
}

/* ── Game Logic ────────────────────────────── */
function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    lines        += cleared;
    score        += cleared * 100 * cleared;
    level         = Math.floor(lines / 10) + 1;
    dropInterval  = Math.max(100, 800 - (level - 1) * 70);
    scoreEl.textContent = score;
    levelEl.textContent = level;
    linesEl.textContent = lines;
  }
}

function lockPiece() {
  merge(piece, board);
  clearLines();
  piece     = nextPiece;
  nextPiece = randomPiece();
  drawNext();

  if (collides(piece, board)) {
    running  = false;
    gameOver = true;
    overlayTitle.textContent = 'GAME OVER';
    btnStart.textContent = '다시 시작';
    overlay.classList.remove('hidden');

    if (currentUser) {
      overlaySub.textContent = `점수: ${score} · 저장 중…`;
      saveScore(score, level, lines)
        .then(() => {
          overlaySub.textContent = `점수: ${score} · 저장됨!`;
          refreshRankings();
        })
        .catch(() => {
          overlaySub.textContent = `점수: ${score}`;
        });
    } else {
      overlaySub.textContent = `점수: ${score} · 로그인하면 기록이 저장됩니다`;
    }
  }
}

function moveDown() {
  piece.y++;
  if (collides(piece, board)) { piece.y--; lockPiece(); }
}

function hardDrop() {
  while (!collides({ ...piece, y: piece.y + 1 }, board)) piece.y++;
  lockPiece();
}

/* ── Drawing ───────────────────────────────── */
function drawBlock(context, x, y, colorId, size = BLOCK) {
  context.fillStyle = COLORS[colorId];
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  context.fillStyle = 'rgba(255,255,255,0.15)';
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  context.fillStyle = 'rgba(0,0,0,0.25)';
  context.fillRect(x * size + 1, y * size + size - 5, size - 2, 4);
}

function drawBoard() {
  ctx.fillStyle = '#0d0d1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 0.5;
  for (let r = 0; r < ROWS; r++) {
    ctx.beginPath(); ctx.moveTo(0, r * BLOCK); ctx.lineTo(canvas.width, r * BLOCK); ctx.stroke();
  }
  for (let c = 0; c < COLS; c++) {
    ctx.beginPath(); ctx.moveTo(c * BLOCK, 0); ctx.lineTo(c * BLOCK, canvas.height); ctx.stroke();
  }
  board.forEach((row, r) => row.forEach((val, c) => { if (val) drawBlock(ctx, c, r, val); }));
}

function drawGhost() {
  const ghost = { ...piece, shape: piece.shape.map(r => [...r]) };
  while (!collides({ ...ghost, y: ghost.y + 1 }, board)) ghost.y++;
  ghost.shape.forEach((row, r) =>
    row.forEach((val, c) => {
      if (val) {
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect((ghost.x + c) * BLOCK + 1, (ghost.y + r) * BLOCK + 1, BLOCK - 2, BLOCK - 2);
      }
    })
  );
}

function drawPiece() {
  piece.shape.forEach((row, r) =>
    row.forEach((val, c) => { if (val) drawBlock(ctx, piece.x + c, piece.y + r, val); })
  );
}

function drawNext() {
  nCtx.fillStyle = '#2B2930';
  nCtx.fillRect(0, 0, nCanvas.width, nCanvas.height);
  const size = 20;
  const s = nextPiece.shape;
  const offX = Math.floor((nCanvas.width  / size - s[0].length) / 2);
  const offY = Math.floor((nCanvas.height / size - s.length)    / 2);
  s.forEach((row, r) =>
    row.forEach((val, c) => {
      if (val) {
        nCtx.fillStyle = COLORS[val];
        nCtx.fillRect((offX + c) * size + 1, (offY + r) * size + 1, size - 2, size - 2);
      }
    })
  );
}

/* ── Game Loop ─────────────────────────────── */
function gameLoop(timestamp) {
  if (!running) return;
  const delta = timestamp - lastTime;
  lastTime = timestamp;
  if (!paused) {
    dropCounter += delta;
    if (dropCounter >= dropInterval) { moveDown(); dropCounter = 0; }
    drawBoard(); drawGhost(); drawPiece();
  }
  animId = requestAnimationFrame(gameLoop);
}

function startGame() {
  if (animId) cancelAnimationFrame(animId);
  board        = createBoard();
  score        = 0; level = 1; lines = 0;
  dropInterval = 800; dropCounter = 0; lastTime = 0;
  running = true; paused = false; gameOver = false;
  nextPiece = randomPiece();
  piece     = randomPiece();
  drawNext();
  scoreEl.textContent = 0;
  levelEl.textContent = 1;
  linesEl.textContent = 0;
  overlay.classList.add('hidden');
  btnStart.textContent = '재시작';
  refreshRankings();
  animId = requestAnimationFrame(ts => { lastTime = ts; gameLoop(ts); });
}

btnStart.addEventListener('click', startGame);

document.addEventListener('keydown', e => {
  if (!running || gameOver) return;
  if (e.code === 'KeyP') {
    paused = !paused;
    if (paused) {
      overlayTitle.textContent = 'PAUSED';
      overlaySub.textContent   = 'P 키를 눌러 재개';
      overlay.classList.remove('hidden');
    } else {
      overlay.classList.add('hidden');
      if (animId) cancelAnimationFrame(animId);
      animId = requestAnimationFrame(ts => { lastTime = ts; gameLoop(ts); });
    }
    return;
  }
  if (paused) return;
  switch (e.code) {
    case 'ArrowLeft':  piece.x--; if (collides(piece, board)) piece.x++; break;
    case 'ArrowRight': piece.x++; if (collides(piece, board)) piece.x--; break;
    case 'ArrowDown':  moveDown(); dropCounter = 0; break;
    case 'ArrowUp': {
      const rotated = rotate(piece.shape);
      const prev = piece.shape;
      piece.shape = rotated;
      if (collides(piece, board)) {
        piece.x--;
        if (collides(piece, board)) {
          piece.x += 2;
          if (collides(piece, board)) { piece.x--; piece.shape = prev; }
        }
      }
      break;
    }
    case 'Space': e.preventDefault(); hardDrop(); break;
  }
});

/* ── Auth & Rankings ───────────────────────── */
function updateUserStatus() {
  if (currentUser) {
    userNameEl.textContent  = currentUser.username;
    btnAuth.textContent     = '로그아웃';
    btnAuth.classList.add('logout');
  } else {
    userNameEl.textContent  = '게스트';
    btnAuth.textContent     = '로그인 / 회원가입';
    btnAuth.classList.remove('logout');
  }
}

btnAuth.addEventListener('click', () => {
  if (currentUser) {
    logout();
    currentUser = null;
    updateUserStatus();
  } else {
    openAuthModal('login');
  }
});

async function refreshRankings() {
  try {
    const rankings = await getTopScores();
    rankingList.innerHTML = Array.isArray(rankings) && rankings.length
      ? rankings.map(r => `
          <div class="rank-item">
            <span class="rank-num">${r.rank}</span>
            <span class="rank-name">${escHtml(r.username)}</span>
            <span class="rank-score">${r.score.toLocaleString()}</span>
          </div>`).join('')
      : '<div class="rank-empty">기록 없음</div>';
  } catch {
    rankingList.innerHTML = '<div class="rank-empty">-</div>';
  }
}

document.addEventListener('keydown', e => {
  if (e.code === 'Escape') closeAuthModal();
});

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ── Auth Modal ────────────────────────────── */
const authModal   = document.getElementById('auth-modal');
const tabLoginBtn = document.getElementById('tab-login');
const tabRegBtn   = document.getElementById('tab-register');
const formLogin   = document.getElementById('form-login');
const formReg     = document.getElementById('form-register');
const loginMsg    = document.getElementById('login-msg');
const regMsg      = document.getElementById('reg-msg');

function openAuthModal(tab = 'login') {
  authModal.classList.add('open');
  switchTab(tab);
}

function closeAuthModal() {
  authModal.classList.remove('open');
  loginMsg.textContent = '';
  regMsg.textContent   = '';
}

function switchTab(tab) {
  const isLogin = tab === 'login';
  tabLoginBtn.classList.toggle('active', isLogin);
  tabRegBtn.classList.toggle('active', !isLogin);
  formLogin.style.display = isLogin ? '' : 'none';
  formReg.style.display   = isLogin ? 'none' : '';
}

document.getElementById('modal-close').addEventListener('click', closeAuthModal);
authModal.addEventListener('click', e => { if (e.target === authModal) closeAuthModal(); });
tabLoginBtn.addEventListener('click', () => switchTab('login'));
tabRegBtn.addEventListener('click',   () => switchTab('register'));

document.getElementById('btn-login').addEventListener('click', async () => {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  loginMsg.className = 'form-msg';
  loginMsg.textContent = '';
  try {
    await login(email, password);
    currentUser = await getMe();
    updateUserStatus();
    closeAuthModal();
    refreshRankings();
  } catch (e) {
    loginMsg.className = 'form-msg error';
    loginMsg.textContent = e.message;
  }
});

document.getElementById('btn-register').addEventListener('click', async () => {
  const email    = document.getElementById('reg-email').value.trim();
  const username = document.getElementById('reg-username').value.trim();
  const password = document.getElementById('reg-password').value;
  regMsg.className = 'form-msg';
  regMsg.textContent = '';
  try {
    await register(email, username, password);
    await login(email, password);
    currentUser = await getMe();
    updateUserStatus();
    closeAuthModal();
    refreshRankings();
  } catch (e) {
    regMsg.className = 'form-msg error';
    regMsg.textContent = e.message;
  }
});

/* ── Init ──────────────────────────────────── */
async function initPage() {
  if (getToken()) {
    try {
      currentUser = await getMe();
    } catch {
      clearToken();
    }
  }
  updateUserStatus();
  refreshRankings();
}

window.addEventListener('DOMContentLoaded', initPage);
