// =============================================================
// iOS-native bottom navigation + design system injection.
// Drop on any page with: <script src="js/bottom-nav.js" defer>
// Replaces topbar.js. Injects: fixed page header, fixed bottom
// tab bar, iOS CSS design system, haptic helper, theme toggle.
// =============================================================
(function () {
  'use strict';

  // ─── Page map ────────────────────────────────────────────────
  const PAGE_MAP = {
    'index.html':   { name: 'Goals',   active: 'goals'   },
    '':             { name: 'Goals',   active: 'goals'   },
    'health.html':  { name: 'Intake',  active: 'intake'  },
    'gym.html':     { name: 'Gym',     active: 'gym'     },
    'finance.html': { name: 'Finance', active: 'finance' },
    'library.html': { name: 'Library', active: 'library' },
  };

  const filename   = location.pathname.split('/').pop() || 'index.html';
  const page       = PAGE_MAP[filename] || { name: 'All In', active: '' };
  const isAuthPage = filename === 'auth.html' || filename === 'po-water.html';

  // ─── CSS ─────────────────────────────────────────────────────
  const css = `
/* ═══════════════════════════════════════════════
   iOS Design System — color tokens
   These override the per-page :root declarations
   because this style is appended last.
═══════════════════════════════════════════════ */
:root, [data-theme="dark"] {
  --bg: #000000;
  --bg-primary: #000000;
  --bg-secondary: #1c1c1e;
  --bg-tertiary: #2c2c2e;
  --bg-card: #1c1c1e;
  --bg-input: #2c2c2e;
  --bg-modal: #1c1c1e;

  --border: rgba(84,84,88,0.65);
  --border-strong: rgba(84,84,88,0.85);
  --border-soft: rgba(84,84,88,0.4);
  --separator: rgba(84,84,88,0.65);

  --overlay-soft: rgba(255,255,255,0.04);
  --overlay-hover: rgba(255,255,255,0.07);
  --overlay-active: rgba(255,255,255,0.13);

  --text-primary: #ffffff;
  --text-secondary: #8e8e93;
  --text-tertiary: #636366;
  --text-faint: rgba(255,255,255,0.18);

  --accent-gold: #d4a853;
  --accent-gold-glow: rgba(212,168,83,0.35);
  --accent-green: #30d158;
  --accent-red: #ff453a;
  --accent-blue: #0a84ff;
  --accent-orange: #ff9f0a;

  --success: #30d158;
  --warning: #ff9f0a;
  --danger: #ff453a;

  --card-shadow: 0 2px 12px rgba(0,0,0,0.4);
  --font: 'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  --btn-primary: linear-gradient(180deg,#fff 0%,#E8E5DD 100%);
  --btn-primary-color: #0a0a0b;
  --btn-primary-shadow: 0 2px 8px rgba(0,0,0,0.35);

  --bnav-bg: rgba(0,0,0,0.82);
  --bnav-border: rgba(84,84,88,0.5);
}

[data-theme="light"] {
  --bg: #f2f2f7;
  --bg-primary: #f2f2f7;
  --bg-secondary: #ffffff;
  --bg-tertiary: #e5e5ea;
  --bg-card: #ffffff;
  --bg-input: #e5e5ea;
  --bg-modal: #ffffff;

  --border: rgba(60,60,67,0.29);
  --border-strong: rgba(60,60,67,0.45);
  --border-soft: rgba(60,60,67,0.18);
  --separator: rgba(60,60,67,0.29);

  --overlay-soft: rgba(0,0,0,0.03);
  --overlay-hover: rgba(0,0,0,0.05);
  --overlay-active: rgba(0,0,0,0.09);

  --text-primary: #000000;
  --text-secondary: #8e8e93;
  --text-tertiary: #aeaeb2;
  --text-faint: rgba(0,0,0,0.18);

  --accent-gold: #b8943f;
  --accent-gold-glow: rgba(184,148,63,0.25);
  --accent-green: #34c759;
  --accent-red: #ff3b30;
  --accent-blue: #007aff;
  --accent-orange: #ff9500;

  --success: #34c759;
  --warning: #ff9500;
  --danger: #ff3b30;

  --card-shadow: 0 1px 6px rgba(0,0,0,0.1);
  --btn-primary: #000000;
  --btn-primary-color: #ffffff;
  --btn-primary-shadow: 0 2px 8px rgba(0,0,0,0.2);

  --bnav-bg: rgba(242,242,247,0.88);
  --bnav-border: rgba(60,60,67,0.29);
}

/* ═══════════════════════════════════════════════
   Global base
═══════════════════════════════════════════════ */
html {
  scroll-behavior: smooth;
  -webkit-text-size-adjust: 100%;
}
body {
  font-family: var(--font);
  background: var(--bg);
  color: var(--text-primary);
  -webkit-font-smoothing: antialiased;
  line-height: 1.4;
  /* Space for fixed header + bottom nav */
  padding-top: calc(82px + env(safe-area-inset-top));
  padding-bottom: calc(62px + env(safe-area-inset-bottom));
}
* { -webkit-overflow-scrolling: touch; }

@media (max-width: 768px) {
  html { touch-action: pan-y; }
  ::-webkit-scrollbar { width: 0; height: 0; display: none; }
  html, body { scrollbar-width: none; -ms-overflow-style: none; }
}

/* Scroll lock when a modal/sheet is open */
body.topbar-modal-open,
body.ios-scroll-lock {
  overflow: hidden;
  touch-action: none;
}

/* Keep modals from chaining scroll to page */
.modal-bg, .modal, .po-modal-bg, .po-modal,
.wt-overlay, .wt-viewer, .wt-cam,
.bottom-sheet, .bottom-sheet-backdrop {
  overscroll-behavior: contain;
}

/* Full-screen modals on small phones */
@media (max-width: 480px) {
  .modal-bg, .po-modal-bg {
    padding: 0 !important;
    align-items: stretch !important;
    justify-content: stretch !important;
  }
  .modal, .po-modal {
    width: 100% !important; max-width: 100% !important;
    max-height: 100vh !important; height: 100vh !important;
    border-radius: 0 !important;
    padding-top: max(20px, env(safe-area-inset-top)) !important;
    padding-bottom: max(28px, env(safe-area-inset-bottom)) !important;
    overflow-y: auto !important;
  }
}

/* Hide old inline page header areas */
.ios-old-page-header { display: none !important; }

/* ═══════════════════════════════════════════════
   Typography scale
═══════════════════════════════════════════════ */
.title-large  { font-size: 34px; font-weight: 700; letter-spacing: -0.5px; }
.title-medium { font-size: 22px; font-weight: 700; letter-spacing: -0.3px; }
.title-small  { font-size: 17px; font-weight: 600; }
.body-text    { font-size: 15px; font-weight: 400; }
.caption      { font-size: 13px; font-weight: 500; color: var(--text-secondary); }
.stat-number  { font-size: 28px; font-weight: 700; font-variant-numeric: tabular-nums; }

/* ═══════════════════════════════════════════════
   Card
═══════════════════════════════════════════════ */
.card {
  background: var(--bg-card);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 12px;
  box-shadow: var(--card-shadow);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.card:active { transform: scale(0.98); }
.card-sm { padding: 14px 16px; border-radius: 12px; }

/* ═══════════════════════════════════════════════
   Segmented control (iOS-style tab bar)
═══════════════════════════════════════════════ */
.segmented-control {
  display: flex;
  background: var(--bg-tertiary);
  border-radius: 10px;
  padding: 3px;
  margin: 0 0 16px;
}
.segmented-control button {
  flex: 1;
  padding: 8px 4px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
  font-family: var(--font);
  white-space: nowrap;
}
.segmented-control button.active {
  background: var(--bg-card);
  color: var(--text-primary);
  box-shadow: 0 1px 4px rgba(0,0,0,0.18);
}
[data-theme="light"] .segmented-control button.active {
  box-shadow: 0 1px 3px rgba(0,0,0,0.12);
}

/* ═══════════════════════════════════════════════
   Bottom sheet
═══════════════════════════════════════════════ */
.bottom-sheet-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 9999;
  pointer-events: none;
}
.bottom-sheet-backdrop.open {
  opacity: 1;
  pointer-events: auto;
}
.bottom-sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--bg-secondary);
  border-radius: 20px 20px 0 0;
  padding: 8px 20px 20px;
  padding-bottom: calc(20px + env(safe-area-inset-bottom));
  transform: translateY(100%);
  transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1);
  z-index: 10000;
  max-height: 85vh;
  overflow-y: auto;
}
.bottom-sheet.open { transform: translateY(0); }
@media (min-width: 500px) {
  .bottom-sheet {
    left: 50%; right: auto;
    width: 500px;
    transform: translateX(-50%) translateY(100%);
    border-radius: 20px 20px 0 0;
  }
  .bottom-sheet.open { transform: translateX(-50%) translateY(0); }
}
.bottom-sheet-handle {
  width: 36px; height: 5px;
  background: var(--text-tertiary);
  border-radius: 3px;
  margin: 0 auto 16px;
}

/* ═══════════════════════════════════════════════
   Skeleton shimmer
═══════════════════════════════════════════════ */
.skeleton {
  background: linear-gradient(
    90deg,
    var(--bg-tertiary) 25%,
    var(--bg-secondary) 50%,
    var(--bg-tertiary) 75%
  );
  background-size: 200% 100%;
  animation: ios-shimmer 1.5s infinite;
  border-radius: 8px;
  color: transparent !important;
  pointer-events: none;
  user-select: none;
}
@keyframes ios-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ═══════════════════════════════════════════════
   Tab content transitions
═══════════════════════════════════════════════ */
.tab-slide-in { animation: ios-slide-in 0.25s ease both; }
@keyframes ios-slide-in {
  from { opacity: 0; transform: translateX(20px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes ios-slide-up {
  from { opacity: 0; transform: translateY(40px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes ios-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* ═══════════════════════════════════════════════
   iOS Page Header (fixed at top)
═══════════════════════════════════════════════ */
.ios-page-header {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 900;
  background: var(--bnav-bg);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border-bottom: 0.5px solid var(--bnav-border);
  padding-top: env(safe-area-inset-top);
}
.ios-header-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px 6px;
}
.ios-header-logo {
  display: flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; flex-shrink: 0;
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;
}
.ios-header-logo svg { display: block; width: 26px; height: 26px; }
.ios-header-title {
  flex: 1;
  font-size: 17px; font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.2px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.ios-header-actions {
  display: flex; align-items: center; gap: 4px; flex-shrink: 0;
}
.ios-header-btn {
  width: 34px; height: 34px; min-width: 34px;
  display: flex; align-items: center; justify-content: center;
  background: var(--overlay-hover);
  border: none; border-radius: 50%;
  cursor: pointer; font-size: 16px; line-height: 1;
  color: var(--text-secondary);
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s;
}
.ios-header-btn:active { background: var(--overlay-active); }
.ios-header-greeting {
  padding: 0 16px 10px;
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 400;
}

/* Style the injected user-menu inside the header */
.ios-header-actions .um-wrap { position: relative; }
.ios-header-actions .um-btn {
  padding: 4px 10px !important;
  font-size: 10px !important;
  max-width: 120px !important;
  background: var(--overlay-hover) !important;
  border-color: transparent !important;
  color: var(--text-secondary) !important;
  border-radius: 20px !important;
  min-height: 28px !important;
}
.ios-header-actions .um-dropdown {
  right: 0;
  top: calc(100% + 6px);
  z-index: 1000;
}

/* ═══════════════════════════════════════════════
   Per-page container resets
   The old sticky topbar took up ~52px of natural-flow space;
   each page's container had padding-top sized for that.
   Now body handles the clearance, so we reset container tops.
═══════════════════════════════════════════════ */
main     { padding-top: 8px; }
.po-shell { padding-top: 12px; }
.shell   { padding-top: 12px; }

/* ═══════════════════════════════════════════════
   iOS Bottom Nav
═══════════════════════════════════════════════ */
.ios-bottom-nav {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  z-index: 9000;
  background: var(--bnav-bg);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border-top: 0.5px solid var(--bnav-border);
  display: flex;
  align-items: flex-start;
  padding-bottom: env(safe-area-inset-bottom);
  height: calc(56px + env(safe-area-inset-bottom));
}
.ios-nav-item {
  flex: 1;
  display: flex; flex-direction: column; align-items: center;
  justify-content: flex-start;
  padding: 8px 4px 2px;
  text-decoration: none;
  color: var(--text-tertiary);
  -webkit-tap-highlight-color: transparent;
  transition: color 0.15s;
  cursor: pointer;
  background: none; border: none;
}
.ios-nav-item.active { color: var(--accent-gold); }
.ios-nav-icon {
  font-size: 22px; line-height: 1;
  margin-bottom: 3px;
  transition: transform 0.12s cubic-bezier(0.34,1.56,0.64,1);
  display: block;
}
.ios-nav-item.active .ios-nav-icon {
  transform: scale(1.08);
}
.ios-nav-label {
  font-size: 10px; font-weight: 600;
  letter-spacing: 0.01em; line-height: 1;
}
`;

  // ─── Greeting ────────────────────────────────────────────────
  function greeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  function todayStr() {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric'
    });
  }

  // ─── Header HTML ─────────────────────────────────────────────
  function buildHeader() {
    return `
<header class="ios-page-header" id="ios-page-header">
  <div class="ios-header-row">
    <a href="index.html" class="ios-header-logo" aria-label="All In home">
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" fill="none" stroke="#d4a853" stroke-width="2.8" stroke-linecap="round"/>
      </svg>
    </a>
    <span class="ios-header-title">${page.name}</span>
    <div class="ios-header-actions">
      <div id="user-menu"></div>
      <button class="ios-header-btn" id="ios-theme-btn" aria-label="Toggle theme">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      </button>
    </div>
  </div>
  <div class="ios-header-greeting" id="ios-header-greeting">${greeting()} · ${todayStr()}</div>
</header>`.trim();
  }

  // ─── Bottom nav HTML ─────────────────────────────────────────
  function buildBottomNav() {
    const tabs = [
      { href: 'index.html',   key: 'goals',   label: 'Goals',   icon: '🎯' },
      { href: 'health.html',  key: 'intake',  label: 'Intake',  icon: '🥗' },
      { href: 'gym.html',     key: 'gym',     label: 'Gym',     icon: '🏋️' },
      { href: 'finance.html', key: 'finance', label: 'Finance', icon: '💰' },
      { href: 'library.html', key: 'library', label: 'Library', icon: '📚' },
    ];
    const items = tabs.map(t => `
  <a href="${t.href}" class="ios-nav-item${page.active === t.key ? ' active' : ''}" aria-label="${t.label}" aria-current="${page.active === t.key ? 'page' : 'false'}">
    <span class="ios-nav-icon" aria-hidden="true">${t.icon}</span>
    <span class="ios-nav-label">${t.label}</span>
  </a>`).join('');
    return `<nav class="ios-bottom-nav" id="ios-bottom-nav" role="navigation" aria-label="Main navigation">${items}\n</nav>`;
  }

  // ─── Inject ───────────────────────────────────────────────────
  function inject() {
    if (document.getElementById('ios-nav-style')) return;

    // 1. Style sheet
    const style = document.createElement('style');
    style.id = 'ios-nav-style';
    style.textContent = css;
    document.head.appendChild(style);

    if (isAuthPage) return; // auth/fallback pages: just CSS, no nav chrome

    // 2. Page header
    const headerWrap = document.createElement('div');
    headerWrap.innerHTML = buildHeader();
    document.body.insertBefore(headerWrap.firstChild, document.body.firstChild);

    // 3. Consolidate #user-menu: keep only the one inside the header
    //    (page's static #user-menu is a duplicate; remove it so initUserMenu
    //    renders into the header slot instead)
    document.querySelectorAll('#user-menu').forEach(el => {
      if (!el.closest('#ios-page-header')) el.remove();
    });

    // 4. Bottom nav
    const navWrap = document.createElement('div');
    navWrap.innerHTML = buildBottomNav();
    document.body.appendChild(navWrap.firstChild);
  }

  // ─── Haptic (exposed globally) ───────────────────────────────
  window.haptic = function (style) {
    if (!navigator.vibrate) return;
    const patterns = { light: 10, medium: 20, heavy: 30, success: [10, 50, 10] };
    navigator.vibrate(patterns[style] || 10);
  };

  // ─── Theme ───────────────────────────────────────────────────
  function getTheme() {
    return localStorage.getItem('theme:preference') || 'dark';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme:preference', theme);

    const btn = document.getElementById('ios-theme-btn');
    if (btn) {
      btn.innerHTML = theme === 'dark'
        ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'
        : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
      btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    }

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.content = theme === 'dark' ? '#000000' : '#f2f2f7';
  }

  function setupTheme() {
    applyTheme(getTheme());
    document.addEventListener('click', function (e) {
      if (e.target.closest('#ios-theme-btn')) {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        applyTheme(current === 'dark' ? 'light' : 'dark');
        window.haptic('light');
      }
    });
  }

  // ─── Modal scroll lock ────────────────────────────────────────
  function startModalLock() {
    const SELECTORS = [
      '.modal-bg', '.po-modal-bg', '.wt-overlay', '.wt-viewer',
      '.wt-cam', '.bottom-sheet-backdrop', '.ob-overlay', '.stch-modal-overlay'
    ];

    function anyOpen() {
      for (const sel of SELECTORS) {
        for (const el of document.querySelectorAll(sel)) {
          const c = el.classList;
          if (c.contains('show') || c.contains('is-open') || c.contains('open')) {
            if (!el.classList.contains('ob-hidden')) return true;
          }
        }
      }
      return false;
    }

    function sync() {
      const locked = anyOpen();
      document.body.classList.toggle('ios-scroll-lock',    locked);
      document.body.classList.toggle('topbar-modal-open', locked); // backward compat
    }

    new MutationObserver(sync).observe(document.body, {
      attributes: true, attributeFilter: ['class'], subtree: true
    });
    sync();
  }

  // ─── Gesture lock (prevent pinch-zoom & double-tap zoom) ─────
  function lockGestures() {
    function block(e) { e.preventDefault(); }
    document.addEventListener('gesturestart',  block, { passive: false });
    document.addEventListener('gesturechange', block, { passive: false });
    document.addEventListener('gestureend',    block, { passive: false });

    let lastTouch = 0;
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTouch <= 300) e.preventDefault();
      lastTouch = now;
    }, { passive: false });
  }

  // ─── Nav tap animation ────────────────────────────────────────
  function setupNavInteractions() {
    document.querySelectorAll('.ios-nav-item').forEach(item => {
      item.addEventListener('click', () => window.haptic('light'));
      item.addEventListener('touchstart', () => {
        const icon = item.querySelector('.ios-nav-icon');
        if (icon) icon.style.transform = 'scale(0.85)';
      }, { passive: true });
      item.addEventListener('touchend', () => {
        const icon = item.querySelector('.ios-nav-icon');
        if (icon) setTimeout(() => { icon.style.transform = ''; }, 150);
      }, { passive: true });
    });
  }

  // ─── rowprogress backward compat ─────────────────────────────
  window.addEventListener('rowprogress', function () {
    // Bottom nav doesn't display counts, but the event contract is preserved
    // so page module scripts continue to fire it without errors.
  });

  // ─── Boot ────────────────────────────────────────────────────
  function boot() {
    inject();
    setupTheme();
    lockGestures();
    startModalLock();
    if (!isAuthPage) setupNavInteractions();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
