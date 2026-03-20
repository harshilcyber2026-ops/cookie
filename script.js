/* ═══════════════════════════════════════════════════
   FlagVault Corp — CTF Challenge Script
   Cookie-Tampering Challenge
   ═══════════════════════════════════════════════════

   HOW THE CHALLENGE WORKS (for CTF authors):
   ──────────────────────────────────────────
   1. Player logs in with ANY username/password.
   2. We set a cookie named "session" whose value is
      base64( JSON.stringify({ username, role:"user" }) )
   3. On the dashboard, the player must:
        a. Open DevTools → Application → Cookies
        b. Copy the "session" cookie value
        c. Decode it: atob(value)  → {"username":"…","role":"user"}
        d. Change "user" to "admin"
        e. Re-encode: btoa(JSON.stringify({…,"role":"admin"}))
        f. Replace the cookie value in DevTools
   4. When they click "Admin Panel", we read & decode the
      cookie again.  If role === "admin", show the flag.

   FLAG: FlagVault{sw33t_cook13s_4r3_4_s3cur1ty_r1sk}
   ═══════════════════════════════════════════════════ */

'use strict';

/* ── Cookie helpers ── */

function setCookie(name, value, days = 7) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function getCookie(name) {
  const match = document.cookie
    .split('; ')
    .find(row => row.startsWith(name + '='));
  return match ? decodeURIComponent(match.split('=')[1]) : null;
}

function deleteCookie(name) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

/* ── Session helpers ── */

/**
 * Build and set the session cookie.
 * Value = base64( JSON.stringify({ username, role }) )
 * No signing — intentionally insecure for the challenge.
 */
function createSession(username, role = 'user') {
  const payload = JSON.stringify({ username, role });
  const encoded = btoa(payload);          // standard base64 encode
  setCookie('session', encoded);
  return encoded;
}

/**
 * Read and decode the session cookie.
 * Returns the parsed object or null if missing / malformed.
 */
function readSession() {
  const raw = getCookie('session');
  if (!raw) return null;
  try {
    return JSON.parse(atob(raw));          // base64 decode + JSON parse
  } catch {
    return null;                           // tampered but invalid JSON → treat as no session
  }
}

/* ── Page navigation ── */

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + id);
  if (target) target.classList.add('active');
  window.scrollTo(0, 0);
}

/**
 * navigate(dest) — called from nav links.
 * Checks auth & role before showing protected pages.
 */
function navigate(dest) {
  const session = readSession();

  if (!session) {
    // Not logged in → redirect to login
    showPage('login');
    return;
  }

  if (dest === 'dashboard') {
    updateDashboard(session);
    showPage('dashboard');
    return;
  }

  if (dest === 'admin') {
    showAdminPage(session);
    showPage('admin');
    return;
  }
}

/* ── Dashboard updater ── */

function updateDashboard(session) {
  const welcomeMsg = document.getElementById('welcome-msg');
  const roleBadge  = document.getElementById('role-badge');

  if (welcomeMsg) {
    welcomeMsg.innerHTML = `Welcome, <span class="accent">${escapeHtml(session.username)}</span>.`;
  }
  if (roleBadge) {
    roleBadge.textContent = session.role;
    roleBadge.className = 'badge ' + (session.role === 'admin' ? 'badge-admin' : 'badge-user');
  }
}

/* ── Admin page logic ── */

function showAdminPage(session) {
  const denied  = document.getElementById('admin-denied');
  const granted = document.getElementById('admin-granted');
  const deniedRole = document.getElementById('denied-role');

  if (session.role === 'admin') {
    denied.classList.add('hidden');
    granted.classList.remove('hidden');
    // small confetti burst
    triggerConfetti();
  } else {
    granted.classList.add('hidden');
    denied.classList.remove('hidden');
    if (deniedRole) deniedRole.textContent = session.role;
  }
}

/* ── Login handler ── */

function doLogin() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const errorEl  = document.getElementById('login-error');

  // Accept ANY non-empty credentials
  if (!username || !password) {
    errorEl.textContent = 'Please enter a username and password.';
    errorEl.classList.remove('hidden');
    return;
  }

  errorEl.classList.add('hidden');

  // Set the vulnerable (unsigned) session cookie
  createSession(username, 'user');

  // Small loading effect then transition
  const btn = document.getElementById('btn-login');
  btn.disabled = true;
  btn.textContent = 'Signing in…';
  setTimeout(() => {
    btn.disabled = false;
    btn.textContent = 'Sign In';
    const session = readSession();
    updateDashboard(session);
    showPage('dashboard');
  }, 520);
}

/* ── Logout handler ── */

function doLogout() {
  deleteCookie('session');
  document.getElementById('username').value = '';
  document.getElementById('password').value = '';
  showPage('login');
}

/* ── Copy flag ── */

function copyFlag() {
  const flag = document.getElementById('flag-display').textContent;
  navigator.clipboard.writeText(flag).then(() => {
    const btn = document.querySelector('.copy-btn');
    btn.textContent = '✓ Copied!';
    setTimeout(() => btn.textContent = 'Copy', 1800);
  }).catch(() => {
    // Fallback for browsers without clipboard API
    const ta = document.createElement('textarea');
    ta.value = flag;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  });
}

/* ── Tiny confetti ── */

function triggerConfetti() {
  const colors = ['#f5a623','#3ddc84','#4da6ff','#e05252','#fff'];
  for (let i = 0; i < 80; i++) {
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed;
      top:-10px;
      left:${Math.random()*100}vw;
      width:${6+Math.random()*6}px;
      height:${6+Math.random()*6}px;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      border-radius:${Math.random()>0.5?'50%':'2px'};
      pointer-events:none;
      z-index:9999;
      opacity:${0.7+Math.random()*0.3};
      animation: confettiFall ${1.5+Math.random()*1.5}s ease-in forwards;
      animation-delay:${Math.random()*0.6}s;
    `;
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}

// Inject the confetti keyframes once
const confettiStyle = document.createElement('style');
confettiStyle.textContent = `
@keyframes confettiFall {
  to { transform: translateY(110vh) rotate(${Math.random()*720}deg); opacity:0; }
}`;
document.head.appendChild(confettiStyle);

/* ── Utility ── */

function escapeHtml(str) {
  return str
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}

/* ── Boot ── */

document.addEventListener('DOMContentLoaded', () => {

  // Wire up login button
  const btnLogin = document.getElementById('btn-login');
  if (btnLogin) {
    btnLogin.addEventListener('click', doLogin);
  }

  // Allow Enter key to submit login
  ['username','password'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  });

  // Check for existing session on load
  const session = readSession();
  if (session) {
    // Already logged in — figure out which page to show
    const hash = window.location.hash;
    if (hash === '#admin') {
      showAdminPage(session);
      showPage('admin');
    } else {
      updateDashboard(session);
      showPage('dashboard');
    }
  } else {
    showPage('login');
  }

  // ── Console hint for players ──
  console.log('%c🍪 FlagVault Corp — Cookie Challenge', 'font-size:16px;font-weight:bold;color:#f5a623;');
  console.log('%cHint: Check the "session" cookie in Application → Cookies.', 'color:#4da6ff;');
  console.log('%cDecode it with: atob(document.cookie.split("session=")[1])', 'color:#3ddc84;font-family:monospace;');
  console.log('%cChange "role":"user"  to  "role":"admin", re-encode, and set the cookie!', 'color:#d4dbe6;');
});
