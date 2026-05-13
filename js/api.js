'use strict';

const TOKEN_KEY = 'tetris_token';

function getToken()      { return localStorage.getItem(TOKEN_KEY); }
function setToken(t)     { localStorage.setItem(TOKEN_KEY, t); }
function clearToken()    { localStorage.removeItem(TOKEN_KEY); }
function logout()        { clearToken(); }

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(path, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: '요청에 실패했습니다' }));
    throw new Error(err.detail || '요청에 실패했습니다');
  }
  return res.json();
}

async function register(email, username, password) {
  return apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, username, password }),
  });
}

async function login(email, password) {
  const data = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setToken(data.access_token);
  return data;
}

async function getMe() {
  return apiFetch('/api/auth/me');
}

async function saveScore(score, level, lines) {
  if (!getToken()) return null;
  return apiFetch('/api/scores', {
    method: 'POST',
    body: JSON.stringify({ score, level, lines }),
  });
}

async function getTopScores() {
  return apiFetch('/api/scores/top');
}
