/**
 * supportPrompt — non-intrusive in-game support CTA for MVEE.
 *
 * Shows a dismissible banner after 10 minutes of active play.
 * Respects a 7-day dismissal window via localStorage.
 * Fires Umami analytics events on show and click.
 *
 * Usage:
 *   initSupportPrompt();
 */

const STORAGE_KEY = 'mvee.supportPrompt.dismissedAt';
const SESSION_KEY = 'mvee.supportPrompt.shown';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const TRIGGER_PLAYTIME_MS = 10 * 60 * 1000;
const CHECKOUT_API_URL = 'https://pay.multiversestudios.xyz/create-checkout-session';

let _shown = false;
let _activeMs = 0;
let _lastActiveTime: number | null = null;
let _tickInterval: ReturnType<typeof setInterval> | null = null;
let _el: HTMLElement | null = null;

function _shouldSkip(): boolean {
  if (sessionStorage.getItem(SESSION_KEY)) return true;
  const dismissed = localStorage.getItem(STORAGE_KEY);
  if (dismissed) {
    const elapsed = Date.now() - parseInt(dismissed, 10);
    if (elapsed < SEVEN_DAYS_MS) return true;
  }
  return false;
}

function _stopTimer(): void {
  if (_tickInterval !== null) {
    clearInterval(_tickInterval);
    _tickInterval = null;
  }
}

function _onVisibility(): void {
  if (document.hidden) {
    if (_lastActiveTime !== null) {
      _activeMs += Date.now() - _lastActiveTime;
      _lastActiveTime = null;
    }
  } else {
    _lastActiveTime = Date.now();
  }
}

function _dismiss(): void {
  localStorage.setItem(STORAGE_KEY, String(Date.now()));
  if (_el) {
    _el.style.opacity = '0';
    _el.style.transform = 'translateX(-50%) translateY(16px)';
    const el = _el;
    setTimeout(() => el.remove(), 400);
    _el = null;
  }
}

function _trackShown(): void {
  try {
    (window as { umami?: { track: (e: string) => void } }).umami?.track('ingame-support-prompt-shown');
  } catch { /* no umami */ }
}

function _render(): void {
  const banner = document.createElement('div');
  banner.id = 'support-prompt';
  banner.style.cssText = `
    position: fixed;
    bottom: 56px;
    left: 50%;
    transform: translateX(-50%) translateY(16px);
    z-index: 8500;
    background: rgba(0, 8, 0, 0.92);
    border: 1px solid rgba(0, 220, 0, 0.25);
    border-radius: 4px;
    padding: 10px 14px;
    display: flex;
    align-items: center;
    gap: 12px;
    font-family: 'Courier New', Courier, monospace;
    font-size: 11px;
    color: #86efac;
    letter-spacing: 0.03em;
    box-shadow: 0 4px 24px rgba(0,0,0,0.8);
    backdrop-filter: blur(8px);
    max-width: min(500px, 90vw);
    opacity: 0;
    transition: opacity 0.4s ease, transform 0.4s ease;
  `;
  banner.innerHTML = `
    <span style="flex: 1; line-height: 1.6;">
      Enjoying MVEE? Support the team &mdash;
      <a id="support-cta"
         rel="noopener noreferrer"
         style="color: #4ade80; text-decoration: none; cursor: pointer;"
         data-umami-event="ingame-support-prompt-clicked">pay what you can</a>.
    </span>
    <button id="support-dismiss"
      title="Dismiss"
      style="
        background: transparent;
        border: none;
        color: rgba(134,239,172,0.35);
        cursor: pointer;
        font-size: 14px;
        padding: 0 2px;
        line-height: 1;
        flex-shrink: 0;
        transition: color 0.2s;
      ">✕</button>
  `;

  document.body.appendChild(banner);
  _el = banner;

  const ctaLink = banner.querySelector<HTMLAnchorElement>('#support-cta')!;
  ctaLink.addEventListener('click', () => {
    ctaLink.textContent = 'Connecting...';
    fetch(CHECKOUT_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game: 'mvee', amount: 1500 }),
    })
      .then((res): Promise<{ url: string }> => {
        if (!res.ok) {
          return res.text().then((response) => {
            console.error('PWYC: checkout session failed', { status: res.status, response, game: 'mvee' });
            return Promise.reject(new Error(`HTTP ${res.status}`));
          });
        }
        return res.json() as Promise<{ url: string }>;
      })
      .then((data) => {
        window.open(data.url, '_blank');
        ctaLink.textContent = 'pay what you can';
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'unknown error';
        ctaLink.textContent = `Error: ${message}`;
      });
  });

  const dismissBtn = banner.querySelector<HTMLButtonElement>('#support-dismiss')!;
  dismissBtn.addEventListener('mouseenter', () => { dismissBtn.style.color = 'rgba(134,239,172,0.7)'; });
  dismissBtn.addEventListener('mouseleave', () => { dismissBtn.style.color = 'rgba(134,239,172,0.35)'; });
  dismissBtn.addEventListener('click', _dismiss);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      banner.style.opacity = '1';
      banner.style.transform = 'translateX(-50%) translateY(0)';
    });
  });
}

function _maybeShow(): void {
  if (_shown || _shouldSkip()) return;
  _shown = true;
  sessionStorage.setItem(SESSION_KEY, '1');
  _stopTimer();
  document.removeEventListener('visibilitychange', _onVisibility);
  _render();
  _trackShown();
}

/** Initialize the support prompt timer. Call once after the game is ready to play. */
export function initSupportPrompt(): void {
  if (_shouldSkip()) return;
  _lastActiveTime = document.hidden ? null : Date.now();
  _tickInterval = setInterval(() => {
    if (document.hidden || _lastActiveTime === null) return;
    _activeMs += Date.now() - _lastActiveTime;
    _lastActiveTime = Date.now();
    if (_activeMs >= TRIGGER_PLAYTIME_MS) _maybeShow();
  }, 5000);
  document.addEventListener('visibilitychange', _onVisibility);
}
