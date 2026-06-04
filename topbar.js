// =============================================================
// Persistent dashboard top bar.
// Drop this on any page with:
//     <script src="topbar.js" defer></script>
// Reads progress from window.__rowProgress (set by each page's
// module script). Listens for 'rowprogress' CustomEvent to
// re-render when any page updates its counts.
// Water "+1" uses window.__supabase (set by supabase.js module).
// =============================================================
(function () {
  'use strict';

  // -------- CSS --------
  const css = `
/* ── Topbar theme vars ── */
:root {
  --tb-bg: #0a0a0b;
  --tb-border: rgba(255,255,255,0.06);
  --tb-pill-bg: rgba(255,255,255,0.04);
  --tb-pill-border: rgba(255,255,255,0.06);
  --tb-pill-hover: rgba(255,255,255,0.07);
  --tb-pill-hover-border: rgba(255,255,255,0.10);
  --tb-text: #FAFAFA;
  --tb-label: rgba(255,255,255,0.5);
}
[data-theme="light"] {
  --tb-bg: #ffffff;
  --tb-border: rgba(0,0,0,0.10);
  --tb-pill-bg: rgba(0,0,0,0.04);
  --tb-pill-border: rgba(0,0,0,0.08);
  --tb-pill-hover: rgba(0,0,0,0.07);
  --tb-pill-hover-border: rgba(0,0,0,0.14);
  --tb-text: #1a1a1a;
  --tb-label: rgba(0,0,0,0.45);
}
.topbar {
  position: sticky; top: 0; z-index: 40;
  display: flex; align-items: center; gap: 6px;
  padding: max(10px, env(safe-area-inset-top)) 14px 10px;
  background: var(--tb-bg);
  border-bottom: 1px solid var(--tb-border);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  transition: background 0.2s, border-color 0.2s;
}
.topbar-logo {
  display: flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; flex-shrink: 0;
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;
  opacity: 0.85;
  transition: opacity 0.15s;
}
.topbar-logo:hover { opacity: 1; }
.topbar-logo svg { display: block; width: 20px; height: 20px; }
.topbar-pill {
  flex: 1 1 0; min-width: 0;
  display: inline-flex; align-items: center; gap: 8px;
  padding: 8px 12px;
  background: var(--tb-pill-bg);
  border: 1px solid var(--tb-pill-border);
  border-radius: 11px;
  text-decoration: none;
  color: var(--tb-text);
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s, border-color 0.15s;
}
.topbar-pill:hover { background: var(--tb-pill-hover); border-color: var(--tb-pill-hover-border); }
.topbar-pill-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #6ee7b7; flex-shrink: 0;
}
.topbar-pill.warn .topbar-pill-dot { background: #fbbf24; }
.topbar-pill.miss .topbar-pill-dot {
  background: #ff8a8a;
  animation: topbar-miss-pulse 1.6s ease-in-out infinite;
}
@keyframes topbar-miss-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5); }
  50%      { box-shadow: 0 0 0 5px rgba(239, 68, 68, 0); }
}
.topbar-pill-label {
  font-size: 10px; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--tb-label);
  flex-shrink: 0;
}
.topbar-pill-count {
  margin-left: auto;
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: 12px; font-weight: 700;
  color: var(--tb-text);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
/* ── Theme toggle button ── */
.topbar-theme-btn {
  flex-shrink: 0;
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  background: var(--tb-pill-bg);
  border: 1px solid var(--tb-pill-border);
  border-radius: 9px;
  cursor: pointer;
  font-size: 15px; line-height: 1;
  transition: background 0.15s, border-color 0.15s;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}
.topbar-theme-btn:hover { background: var(--tb-pill-hover); border-color: var(--tb-pill-hover-border); }
@media (max-width: 480px) {
  .topbar { padding-left: 10px; padding-right: 10px; gap: 4px; }
  .topbar-pill { padding: 7px 9px; gap: 5px; }
  .topbar-pill-label { font-size: 9px; letter-spacing: 0.10em; }
  .topbar-pill-count { font-size: 11px; }
}
@media (max-width: 380px) {
  .topbar-pill-label { display: none; }
}

/* === Global mobile lockdown ===
   1) Hide the right-side scrollbar on phones (iOS uses overlay scrollbars anyway).
   2) Stop iOS auto-text-size-adjust.
   3) touch-action: pan-y prevents pinch-zoom while still allowing vertical scroll.
   4) overscroll-behavior on every common modal class stops scroll chaining —
      scrolling inside a settings popup won't drag the page behind it.
   5) When body has .topbar-modal-open, the page can't scroll at all (locked).
*/
html, body {
  -webkit-text-size-adjust: 100%;
}
@media (max-width: 768px) {
  html { touch-action: pan-y; }
  ::-webkit-scrollbar { width: 0; height: 0; display: none; }
  html, body { scrollbar-width: none; -ms-overflow-style: none; }
}
.modal-bg, .modal, .po-modal-bg, .po-modal, .wt-overlay, .wt-viewer {
  overscroll-behavior: contain;
}
body.topbar-modal-open {
  overflow: hidden;
  touch-action: none;
}
/* On phones, blow the modals up to full screen and let them be the only
   scrolling element. Way less "is this scrolling the page or the modal?"
   confusion. */
@media (max-width: 480px) {
  .modal-bg, .po-modal-bg {
    padding: 0 !important;
    align-items: stretch !important;
    justify-content: stretch !important;
  }
  .modal, .po-modal {
    width: 100% !important;
    max-width: 100% !important;
    max-height: 100vh !important;
    height: 100vh !important;
    border-radius: 0 !important;
    padding-top: max(20px, env(safe-area-inset-top)) !important;
    padding-bottom: max(28px, env(safe-area-inset-bottom)) !important;
    overflow-y: auto !important;
    overscroll-behavior: contain;
  }
}
`;

  // -------- HTML --------
  const html = `
<header class="topbar" id="topbar" role="navigation" aria-label="Quick stats">
  <a href="index.html" class="topbar-logo" aria-label="All In">
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" fill="none" stroke="#d4a853" stroke-width="3" stroke-linecap="round"/>
    </svg>
  </a>
  <a href="index.html" class="topbar-pill" id="topbarGoals">
    <span class="topbar-pill-dot"></span>
    <span class="topbar-pill-label">GOALS</span>
    <span class="topbar-pill-count" id="topbarGoalsCount">—/—</span>
  </a>
  <a href="health.html" class="topbar-pill" id="topbarStack">
    <span class="topbar-pill-dot"></span>
    <span class="topbar-pill-label">INTAKE</span>
    <span class="topbar-pill-count" id="topbarStackCount">—/—</span>
  </a>
  <a href="gym.html" class="topbar-pill" id="topbarGym">
    <span class="topbar-pill-dot"></span>
    <span class="topbar-pill-label">GYM</span>
  </a>
  <a href="finance.html" class="topbar-pill" id="topbarFinance">
    <span class="topbar-pill-dot"></span>
    <span class="topbar-pill-label">FINANCE</span>
  </a>
  <button class="topbar-theme-btn" id="topbarThemeBtn" aria-label="Toggle theme" title="Toggle dark/light mode">🌙</button>
</header>
`;

  function injectStyleAndHTML() {
    if (document.getElementById('topbar')) return; // already injected
    const style = document.createElement('style');
    style.id = 'topbar-style';
    style.textContent = css;
    document.head.appendChild(style);

    const wrap = document.createElement('div');
    wrap.innerHTML = html.trim();
    document.body.insertBefore(wrap.firstChild, document.body.firstChild);
  }

  // -------- Active-date helpers (match the goals page 6 AM rollover) --------
  function activeDateKey() {
    const now = new Date();
    const d = new Date(now);
    if (now.getHours() < 6) d.setDate(d.getDate() - 1);
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }
  // -------- Read progress from window.__rowProgress (set by each page's module) --------
  function getGoalsProgress() {
    return (window.__rowProgress && window.__rowProgress.goals) || { done: 0, total: 0 };
  }
  function getStackProgress() {
    return (window.__rowProgress && window.__rowProgress.stack) || { done: 0, total: 0 };
  }

  function classifyStatus(done, total) {
    if (total === 0) return 'idle';
    if (done >= total) return 'good';
    if (done >= total * 0.5) return 'warn';
    // Past 6pm and still under half → flag as missed
    const h = new Date().getHours();
    if (h >= 18 && done < total * 0.5) return 'miss';
    return 'warn';
  }

  function setPillStatus(pillEl, status) {
    pillEl.classList.remove('good', 'warn', 'miss');
    if (status === 'warn' || status === 'miss') pillEl.classList.add(status);
  }

  function render() {
    const goalsEl = document.getElementById('topbarGoals');
    const stackEl = document.getElementById('topbarStack');
    if (!goalsEl) return; // not injected yet

    const g = getGoalsProgress();
    const s = getStackProgress();

    document.getElementById('topbarGoalsCount').textContent =
      (window.__rowProgress && window.__rowProgress.goals) ? (g.done + '/' + g.total) : '—/—';
    document.getElementById('topbarStackCount').textContent =
      (window.__rowProgress && window.__rowProgress.stack) ? (s.done + '/' + s.total) : '—/—';

    setPillStatus(goalsEl, classifyStatus(g.done, g.total));
    setPillStatus(stackEl, classifyStatus(s.done, s.total));
  }

  // -------- Mobile lockdown helpers --------
  // Belt-and-suspenders zoom prevention — iOS Safari sometimes ignores
  // user-scalable=no, so we also kill the gesture events directly.
  function blockGesture(e) { e.preventDefault(); }
  function lockGestures() {
    document.addEventListener('gesturestart', blockGesture, { passive: false });
    document.addEventListener('gesturechange', blockGesture, { passive: false });
    document.addEventListener('gestureend', blockGesture, { passive: false });
    // Also kill the iOS double-tap-to-zoom on any tap.
    let lastTouch = 0;
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTouch <= 300) e.preventDefault();
      lastTouch = now;
    }, { passive: false });
  }

  // Watch every known modal-bg / overlay class — when any one of them
  // gets `.show` or `.is-open`, lock the body scroll. When the last
  // one closes, unlock.
  function startModalLock() {
    const MODAL_SELECTORS = [
      '.modal-bg', '.po-modal-bg', '.wt-overlay', '.wt-viewer', '.wt-cam'
    ];
    function anyOpen() {
      for (const sel of MODAL_SELECTORS) {
        const els = document.querySelectorAll(sel);
        for (const el of els) {
          if (el.classList.contains('show') || el.classList.contains('is-open')) {
            return true;
          }
        }
      }
      return false;
    }
    function sync() {
      document.body.classList.toggle('topbar-modal-open', anyOpen());
    }
    const observer = new MutationObserver(sync);
    // Observe class changes anywhere in body — modal toggles are rare so
    // a global subtree observer is cheap.
    observer.observe(document.body, {
      attributes: true, attributeFilter: ['class'], subtree: true
    });
    sync();
  }

  // -------- Theme toggle --------
  function getTheme() {
    return localStorage.getItem('theme:preference') || 'dark';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme:preference', theme);
    var btn = document.getElementById('topbarThemeBtn');
    if (btn) btn.textContent = theme === 'dark' ? '🌙' : '☀️';
    // Update theme-color meta for PWA status bar
    var metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.content = theme === 'dark' ? '#0a0a0b' : '#f5f5f5';
  }

  function setupThemeToggle() {
    applyTheme(getTheme());
    document.addEventListener('click', function(e) {
      if (e.target.id === 'topbarThemeBtn' || e.target.closest('#topbarThemeBtn')) {
        var current = document.documentElement.getAttribute('data-theme') || 'dark';
        applyTheme(current === 'dark' ? 'light' : 'dark');
      }
    });
  }

  // -------- Boot --------
  function boot() {
    injectStyleAndHTML();
    setupThemeToggle();
    render();
    lockGestures();
    startModalLock();

    // Re-render when the page's module script updates progress data.
    window.addEventListener('rowprogress', render);
    window.addEventListener('focus', render);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });

    // Periodic refresh so counts stay current after midnight rollover etc.
    setInterval(render, 30 * 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
