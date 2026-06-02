import { getCurrentUser, signOut } from './auth.js';

const CSS = `
.um-wrap { position: relative; display: inline-block; }
.um-btn {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 6px 12px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 8px;
  color: rgba(255,255,255,0.5);
  font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
  font-size: 11px; font-weight: 600; letter-spacing: 0.08em;
  cursor: pointer; white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; max-width: 200px;
  transition: background 0.15s, color 0.15s;
  -webkit-tap-highlight-color: transparent;
}
.um-btn:hover { background: rgba(255,255,255,0.08); color: #FAFAFA; }
.um-dot { width: 6px; height: 6px; border-radius: 50%; background: #6ee7b7; flex-shrink: 0; }
.um-dropdown {
  position: absolute; top: calc(100% + 6px); right: 0;
  min-width: 210px;
  background: #131316;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px; padding: 8px;
  display: none; z-index: 200;
  box-shadow: 0 8px 32px rgba(0,0,0,0.55);
}
.um-dropdown.open { display: block; }
.um-email {
  display: block; padding: 7px 8px 10px;
  font-size: 11px; color: rgba(255,255,255,0.38);
  word-break: break-all; border-bottom: 1px solid rgba(255,255,255,0.07);
  margin-bottom: 6px;
}
.um-signout {
  display: block; width: 100%; padding: 8px 9px;
  background: none; border: none; border-radius: 6px;
  color: rgba(255,100,100,0.8);
  font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
  font-size: 12px; font-weight: 600; letter-spacing: 0.06em;
  text-align: left; cursor: pointer;
  transition: background 0.15s;
}
.um-signout:hover { background: rgba(239,68,68,0.1); }
`;

export async function initUserMenu() {
  const container = document.getElementById('user-menu');
  if (!container) return;

  const user = await getCurrentUser();
  if (!user) return;

  if (!document.getElementById('um-style')) {
    const style = document.createElement('style');
    style.id = 'um-style';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  const displayEmail = user.email.length > 24
    ? user.email.slice(0, 21) + '…'
    : user.email;

  container.innerHTML = `
    <div class="um-wrap">
      <button class="um-btn" id="um-toggle" type="button">
        <span class="um-dot"></span>${displayEmail}
      </button>
      <div class="um-dropdown" id="um-dropdown">
        <span class="um-email">${user.email}</span>
        <button class="um-signout" id="um-signout" type="button">Sign Out</button>
      </div>
    </div>
  `;

  const toggle   = document.getElementById('um-toggle');
  const dropdown = document.getElementById('um-dropdown');

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
  });
  document.addEventListener('click', () => dropdown.classList.remove('open'));
  document.getElementById('um-signout').addEventListener('click', signOut);
}
