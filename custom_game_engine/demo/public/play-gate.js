/* ============================================
   MULTIVERSE STUDIOS — Play Gate
   Requires Matrix login before accessing game play pages.
   Does NOT gate Never Ever Land (/play/neverland/).
   ============================================ */

(function () {
  'use strict';

  // ── QA Bypass ─────────────────────────────────────────────
  // Automated playtesters pass ?bypass_auth=<token> to skip the gate.
  var QA_BYPASS_TOKEN = '2E9of-hSOdWxB2og5gmZ1MmMYUij0hMUqBKD5TqUrmc';
  var params = new URLSearchParams(window.location.search);
  if (params.get('bypass_auth') === QA_BYPASS_TOKEN) {
    return; // Skip gate entirely — QA automation
  }

  // ── Styles ──────────────────────────────────────────────────

  var style = document.createElement('style');
  style.textContent = [
    '#play-gate {',
    '  position: fixed;',
    '  inset: 0;',
    '  z-index: 99999;',
    '  background: rgba(5, 5, 8, 0.97);',
    '  backdrop-filter: blur(12px);',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  font-family: var(--font-mono, "JetBrains Mono", "Courier New", monospace);',
    '  color: var(--star-white, #e8e6f0);',
    '  transition: opacity 0.5s ease;',
    '}',
    '#play-gate.pg-removing {',
    '  opacity: 0;',
    '  pointer-events: none;',
    '}',
    '#play-gate-inner {',
    '  text-align: center;',
    '  max-width: 420px;',
    '  padding: 2rem;',
    '}',
    '#play-gate-logo {',
    '  font-size: 3rem;',
    '  color: var(--biolume, #00ffc8);',
    '  text-shadow: 0 0 32px rgba(0, 255, 200, 0.5);',
    '  margin-bottom: 1.25rem;',
    '  animation: pg-pulse 3s ease-in-out infinite;',
    '}',
    '@keyframes pg-pulse {',
    '  0%, 100% { opacity: 1; text-shadow: 0 0 32px rgba(0,255,200,0.5); }',
    '  50% { opacity: 0.7; text-shadow: 0 0 48px rgba(0,255,200,0.8); }',
    '}',
    '#play-gate-heading {',
    '  font-size: 1.15rem;',
    '  font-weight: 600;',
    '  letter-spacing: 0.06em;',
    '  text-transform: uppercase;',
    '  color: var(--star-white, #e8e6f0);',
    '  margin-bottom: 0.6rem;',
    '}',
    '#play-gate-desc {',
    '  font-size: 0.8rem;',
    '  color: var(--dust, #8a8694);',
    '  line-height: 1.6;',
    '  margin-bottom: 1.75rem;',
    '}',
    '#play-gate-btn {',
    '  display: inline-block;',
    '  padding: 0.75rem 2rem;',
    '  background: transparent;',
    '  border: 1px solid var(--biolume, #00ffc8);',
    '  border-radius: 6px;',
    '  color: var(--biolume, #00ffc8);',
    '  font-family: inherit;',
    '  font-size: 0.8rem;',
    '  letter-spacing: 0.05em;',
    '  cursor: pointer;',
    '  transition: background 0.15s, color 0.15s;',
    '}',
    '#play-gate-btn:hover {',
    '  background: var(--biolume, #00ffc8);',
    '  color: var(--void, #050508);',
    '}',
    '#play-gate-note {',
    '  margin-top: 1.5rem;',
    '  font-size: 0.7rem;',
    '  color: var(--dust, #8a8694);',
    '}',
    '#play-gate-note a {',
    '  color: var(--biolume, #00ffc8);',
    '  text-decoration: none;',
    '}',
    '#play-gate-note a:hover {',
    '  text-decoration: underline;',
    '}',
    '#play-gate-error {',
    '  margin-top: 1rem;',
    '  padding: 0.6rem 1rem;',
    '  background: rgba(255,107,53,0.1);',
    '  border: 1px solid rgba(255,107,53,0.3);',
    '  border-radius: 6px;',
    '  color: var(--ember, #ff6b35);',
    '  font-size: 0.7rem;',
    '  display: none;',
    '}',
  ].join('\n');
  document.head.appendChild(style);

  // ── Gate Element ────────────────────────────────────────────

  var gate = document.createElement('div');
  gate.id = 'play-gate';
  gate.setAttribute('role', 'dialog');
  gate.setAttribute('aria-modal', 'true');
  gate.setAttribute('aria-label', 'Sign in to play');
  gate.innerHTML =
    '<div id="play-gate-inner">' +
      '<div id="play-gate-logo">&#9670;</div>' +
      '<h2 id="play-gate-heading">Sign in to play</h2>' +
      '<p id="play-gate-desc">A free Multiverse Studios account is required to save progress.</p>' +
      '<div>' +
        '<button id="play-gate-btn" type="button">Sign In / Create Account</button>' +
      '</div>' +
      '<div id="play-gate-error"></div>' +
      '<p id="play-gate-note">' +
        'Never Ever Land is free &mdash; ' +
        '<a href="/play/neverland/">no account needed</a>.' +
      '</p>' +
    '</div>';

  // ── Attach to DOM ───────────────────────────────────────────

  function attachGate() {
    document.body.appendChild(gate);
    var btn = document.getElementById('play-gate-btn');
    if (btn) {
      btn.addEventListener('click', function () {
        if (window.matrixAuth && typeof window.matrixAuth.showLoginModal === 'function') {
          window.matrixAuth.showLoginModal();
          // Hide gate so auth modal receives pointer events
          gate.style.pointerEvents = 'none';
          gate.style.opacity = '0';
          // Restore gate if auth modal is closed without logging in
          var overlay = document.getElementById('mx-auth-overlay');
          if (overlay) {
            var observer = new MutationObserver(function (mutations) {
              for (var i = 0; i < mutations.length; i++) {
                if (mutations[i].attributeName === 'class' && !overlay.classList.contains('open')) {
                  observer.disconnect();
                  if (!window.matrixAuth || !window.matrixAuth.isLoggedIn || !window.matrixAuth.isLoggedIn()) {
                    gate.style.pointerEvents = '';
                    gate.style.opacity = '';
                  }
                }
              }
            });
            observer.observe(overlay, { attributes: true });
          }
        }
      });
    }
  }

  if (document.body) {
    attachGate();
  } else {
    document.addEventListener('DOMContentLoaded', attachGate);
  }

  // ── Remove Gate (with fade) ─────────────────────────────────

  function removeGate() {
    gate.classList.add('pg-removing');
    setTimeout(function () {
      if (gate.parentNode) gate.parentNode.removeChild(gate);
    }, 500);
  }

  // ── Auth Event Listeners ────────────────────────────────────

  var readyReceived = false;

  window.addEventListener('matrixAuthReady', function (e) {
    readyReceived = true;
    clearTimeout(fallbackTimer);
    if (e.detail && e.detail.loggedIn) {
      removeGate();
    }
    // else: gate stays — user must sign in
  });

  window.addEventListener('matrixAuthLogin', function () {
    removeGate();
  });

  // ── Auth Unavailable Listener ───────────────────────────────
  // If auth service is down (503), show error — do NOT fall through.
  window.addEventListener('matrixAuthUnavailable', function () {
    var errorEl = document.getElementById('play-gate-error');
    if (errorEl) {
      errorEl.textContent = 'Authentication service temporarily unavailable \u2014 please try again later.';
      errorEl.style.display = 'block';
    }
  });

  // ── Safety Valve ────────────────────────────────────────────
  // If matrixAuthReady never fires (e.g. script blocked), check
  // session state directly after a short delay.

  var fallbackTimer = setTimeout(function () {
    if (!readyReceived) {
      if (window.matrixAuth && window.matrixAuth.isLoggedIn()) {
        removeGate();
      }
    }
  }, 12000);

})();
