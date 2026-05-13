'use strict';

/* MD3 Ripple effect */
document.querySelectorAll('.md-ripple').forEach(el => {
  el.addEventListener('click', e => {
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top  - size / 2;
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px`;
    el.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  });
});

/* Sticky App Bar shadow */
const appBar = document.querySelector('.app-bar');
window.addEventListener('scroll', () => {
  appBar.style.boxShadow = window.scrollY > 4
    ? '0 2px 8px rgba(0,0,0,0.5)'
    : '0 2px 4px rgba(0,0,0,0.4)';
}, { passive: true });

/* Hall of Fame rankings */
async function loadHallOfFame() {
  const container = document.getElementById('hof-list');
  if (!container) return;
  try {
    const rankings = await getTopScores();
    if (!rankings.length) {
      container.innerHTML = '<div class="hof-empty">아직 기록이 없습니다. 첫 번째 도전자가 되세요!</div>';
      return;
    }
    const medals = ['🥇', '🥈', '🥉'];
    container.innerHTML = rankings.map(r => `
      <div class="hof-card">
        <div class="hof-medal">${medals[r.rank - 1] || r.rank}</div>
        <div class="hof-name">${escHtml(r.username)}</div>
        <div class="hof-score">${r.score.toLocaleString()}<span>점</span></div>
      </div>`).join('');
  } catch {
    container.innerHTML = '<div class="hof-empty">랭킹을 불러올 수 없습니다.</div>';
  }
}

/* Landing auth button */
async function initLanding() {
  const authBtn = document.getElementById('landing-auth-btn');
  if (!authBtn) return;

  if (getToken()) {
    try {
      const user = await getMe();
      authBtn.textContent = user.username;
      authBtn.title = '클릭하여 로그아웃';
      authBtn.addEventListener('click', () => { logout(); location.reload(); });
      return;
    } catch { clearToken(); }
  }

  authBtn.textContent = '로그인';
  authBtn.addEventListener('click', () => { location.href = 'game.html'; });
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

window.addEventListener('DOMContentLoaded', () => {
  initLanding();
  loadHallOfFame();
});
