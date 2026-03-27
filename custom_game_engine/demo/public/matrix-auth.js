/* ============================================
   MULTIVERSE STUDIOS — Matrix Authentication
   Matrix homeserver: matrix.multiversestudios.xyz
   ============================================ */

(function initMatrixAuth() {
  'use strict';

  const HOMESERVER = 'https://matrix.multiversestudios.xyz';

  // ── Utilities ──────────────────────────────────────────────

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function storageGet(key) {
    try { return localStorage.getItem(key); } catch (_) { return null; }
  }

  function storageSet(key, value) {
    try { localStorage.setItem(key, value); } catch (_) { /* noop */ }
  }

  function storageRemove(key) {
    try { localStorage.removeItem(key); } catch (_) { /* noop */ }
  }

  // Access token is kept in sessionStorage (cleared on tab/browser close) to
  // reduce the XSS exfiltration window. It is still readable by JavaScript on
  // this origin — the preferred long-term fix is HttpOnly session cookies
  // backed by a server-side auth proxy. Non-sensitive fields (userId, deviceId,
  // homeserver) remain in localStorage for UX continuity across sessions.
  function sessionGet(key) {
    try { return sessionStorage.getItem(key); } catch (_) { return null; }
  }

  function sessionSet(key, value) {
    try { sessionStorage.setItem(key, value); } catch (_) { /* noop */ }
  }

  function sessionRemove(key) {
    try { sessionStorage.removeItem(key); } catch (_) { /* noop */ }
  }

  // ── Session State ──────────────────────────────────────────

  let session = {
    accessToken: sessionGet('mx_access_token'),
    userId: storageGet('mx_user_id'),
    deviceId: storageGet('mx_device_id'),
    homeserver: storageGet('mx_homeserver') || HOMESERVER,
    displayName: null,
  };

  function saveSession(data) {
    session.accessToken = data.access_token;
    session.userId = data.user_id;
    session.deviceId = data.device_id;
    session.homeserver = HOMESERVER;
    sessionSet('mx_access_token', data.access_token);
    storageSet('mx_user_id', data.user_id);
    storageSet('mx_device_id', data.device_id);
    storageSet('mx_homeserver', HOMESERVER);
  }

  function clearSession() {
    session.accessToken = null;
    session.userId = null;
    session.deviceId = null;
    session.displayName = null;
    sessionRemove('mx_access_token');
    storageRemove('mx_user_id');
    storageRemove('mx_device_id');
    storageRemove('mx_homeserver');
  }

  // ── Matrix API ─────────────────────────────────────────────

  async function matrixFetch(method, path, body, auth) {
    const opts = { method, headers: {} };
    if (body) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    if (auth && session.accessToken) {
      opts.headers['Authorization'] = 'Bearer ' + session.accessToken;
    }
    const res = await fetch(HOMESERVER + path, opts);
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || json.errcode || ('HTTP ' + res.status));
    }
    return json;
  }

  async function apiLogin(username, password) {
    return matrixFetch('POST', '/_matrix/client/v3/login', {
      type: 'm.login.password',
      identifier: { type: 'm.id.user', user: username },
      password: password,
    });
  }

  async function apiRegister(username, password, token) {
    // Synapse UIA is multi-stage. We try m.login.dummy first (matching the
    // website proxy behavior) and only fall back to m.login.registration_token
    // if the server requires it.

    // Stage 1: Initial request to get session and required flows
    var res1 = await fetch(HOMESERVER + '/_matrix/client/v3/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username, password: password }),
    });
    var json1 = await res1.json();
    if (res1.ok) return json1; // Completed without UIA

    if (!json1.session) {
      throw new Error(json1.error || 'Registration failed');
    }

    var uiaSession = json1.session;

    // Check if the server requires a registration token by inspecting flows
    var requiresToken = false;
    if (json1.flows) {
      // If every flow includes m.login.registration_token, a token is required
      requiresToken = json1.flows.every(function(flow) {
        return flow.stages && flow.stages.indexOf('m.login.registration_token') !== -1;
      });
    }

    if (requiresToken) {
      // Server requires invite token — use the token-based flow
      if (!token) {
        throw new Error('INVITE_TOKEN_REQUIRED');
      }

      // Stage 2a: Complete registration_token stage
      var resToken = await fetch(HOMESERVER + '/_matrix/client/v3/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username,
          password: password,
          auth: { type: 'm.login.registration_token', token: token, session: uiaSession },
        }),
      });
      var jsonToken = await resToken.json();
      if (resToken.ok) return jsonToken;

      // Stage 2b: Complete dummy stage after token
      if (jsonToken.completed && jsonToken.completed.indexOf('m.login.registration_token') !== -1) {
        var resDummy2 = await fetch(HOMESERVER + '/_matrix/client/v3/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: username,
            password: password,
            auth: { type: 'm.login.dummy', session: uiaSession },
          }),
        });
        var jsonDummy2 = await resDummy2.json();
        if (resDummy2.ok) return jsonDummy2;
        throw new Error(jsonDummy2.error || 'Registration failed at final stage');
      }

      throw new Error(jsonToken.error || 'Invalid invite token');
    }

    // Stage 2: Try m.login.dummy (no token needed — matches website proxy)
    var resDummy = await fetch(HOMESERVER + '/_matrix/client/v3/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username,
        password: password,
        auth: { type: 'm.login.dummy', session: uiaSession },
      }),
    });
    var jsonDummy = await resDummy.json();
    if (resDummy.ok) return jsonDummy;
    throw new Error(jsonDummy.error || 'Registration failed');
  }

  async function apiWhoami() {
    return matrixFetch('GET', '/_matrix/client/v3/account/whoami', null, true);
  }

  async function apiGetProfile(userId) {
    return matrixFetch('GET', '/_matrix/client/v3/profile/' + encodeURIComponent(userId));
  }

  async function apiLogout() {
    return matrixFetch('POST', '/_matrix/client/v3/logout', {}, true);
  }

  async function apiRequestOpenIdToken(userId) {
    return matrixFetch('POST',
      '/_matrix/client/v3/user/' + encodeURIComponent(userId) + '/openid/request_token',
      {}, true);
  }

  // ── High-Level Auth Functions ──────────────────────────────

  async function login(username, password) {
    const data = await apiLogin(username, password);
    saveSession(data);
    await fetchDisplayName();
    updateNavUI();
    window.dispatchEvent(new CustomEvent('matrixAuthLogin', { detail: { userId: session.userId } }));
    return data;
  }

  async function register(username, password, token) {
    const data = await apiRegister(username, password, token);
    saveSession(data);
    await fetchDisplayName();
    updateNavUI();
    window.dispatchEvent(new CustomEvent('matrixAuthLogin', { detail: { userId: session.userId } }));
    return data;
  }

  async function logout() {
    try { await apiLogout(); } catch (_) { /* best-effort */ }
    clearSession();
    updateNavUI();
  }

  async function fetchDisplayName() {
    if (!session.userId) return;
    try {
      const profile = await apiGetProfile(session.userId);
      session.displayName = profile.displayname || null;
    } catch (_) {
      session.displayName = null;
    }
  }

  async function validateSession() {
    if (!session.accessToken || !session.userId) {
      clearSession();
      return false;
    }
    try {
      await apiWhoami();
      await fetchDisplayName();
      return true;
    } catch (_) {
      clearSession();
      return false;
    }
  }

  async function getOpenIdToken() {
    if (!session.userId || !session.accessToken) {
      throw new Error('Not logged in');
    }
    return apiRequestOpenIdToken(session.userId);
  }

  // ── Inject Styles ─────────────────────────────────────────

  const CSS = `
/* Auth Modal Overlay */
#mx-auth-overlay {
  position: fixed;
  inset: 0;
  z-index: 100000;
  background: rgba(5,5,8,0.85);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.25s ease;
}
#mx-auth-overlay.open {
  opacity: 1;
  pointer-events: auto;
}

/* Modal */
#mx-auth-modal {
  background: var(--void-elevated, #111118);
  border: 1px solid var(--void-border, #1a1a24);
  border-radius: 10px;
  width: 380px;
  max-width: 92vw;
  box-shadow: 0 0 60px rgba(0,0,0,0.8), 0 0 30px rgba(0,255,200,0.06);
  font-family: var(--font-mono, monospace);
  color: var(--star-white, #e8e6f0);
  overflow: hidden;
  transform: translateY(16px) scale(0.97);
  transition: transform 0.25s ease;
}
#mx-auth-overlay.open #mx-auth-modal {
  transform: translateY(0) scale(1);
}

/* Header */
#mx-auth-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 0;
}
#mx-auth-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--biolume, #00ffc8);
}
#mx-auth-close {
  background: none;
  border: none;
  color: var(--dust, #8a8694);
  font-size: 20px;
  cursor: pointer;
  padding: 0 4px;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  transition: color 0.15s;
}
#mx-auth-close:hover { color: var(--star-white, #e8e6f0); }

/* Tabs */
#mx-auth-tabs {
  display: flex;
  border-bottom: 1px solid var(--void-border, #1a1a24);
  margin: 12px 20px 0;
}
.mx-auth-tab {
  flex: 1;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--dust, #8a8694);
  font-family: var(--font-mono, monospace);
  font-size: 12px;
  letter-spacing: 0.05em;
  padding: 14px 0;
  min-height: 44px;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  text-transform: uppercase;
}
.mx-auth-tab:hover { color: var(--star-white, #e8e6f0); }
.mx-auth-tab.active {
  color: var(--biolume, #00ffc8);
  border-bottom-color: var(--biolume, #00ffc8);
}

/* Form */
#mx-auth-body { padding: 20px; }
.mx-auth-field {
  margin-bottom: 14px;
}
.mx-auth-field label {
  display: block;
  font-size: 11px;
  color: var(--dust, #8a8694);
  margin-bottom: 5px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.mx-auth-field input {
  width: 100%;
  padding: 10px 12px;
  background: rgba(5,5,8,0.6);
  border: 1px solid var(--void-border, #1a1a24);
  border-radius: 6px;
  color: var(--star-white, #e8e6f0);
  font-family: var(--font-mono, monospace);
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
}
.mx-auth-field input:focus {
  border-color: var(--biolume, #00ffc8);
}

/* Error */
#mx-auth-error {
  background: rgba(255,107,53,0.1);
  border: 1px solid rgba(255,107,53,0.3);
  border-radius: 6px;
  color: var(--ember, #ff6b35);
  font-size: 12px;
  padding: 8px 12px;
  margin-bottom: 14px;
  display: none;
  word-break: break-word;
}
#mx-auth-error.visible { display: block; }

/* Submit */
#mx-auth-submit {
  width: 100%;
  padding: 11px;
  background: transparent;
  border: 1px solid var(--biolume, #00ffc8);
  border-radius: 6px;
  color: var(--biolume, #00ffc8);
  font-family: var(--font-mono, monospace);
  font-size: 13px;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
#mx-auth-submit:hover {
  background: var(--biolume, #00ffc8);
  color: var(--void, #050508);
}
#mx-auth-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Nav auth elements */
#mx-auth-nav-signin {
  cursor: pointer;
  color: var(--biolume, #00ffc8);
  transition: opacity 0.15s;
}
#mx-auth-nav-signin:hover { opacity: 0.8; }

#mx-auth-nav-user {
  position: relative;
  cursor: pointer;
  color: var(--biolume, #00ffc8);
  user-select: none;
}
#mx-auth-nav-user-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}
#mx-auth-nav-user-label::after {
  content: '';
  display: inline-block;
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 5px solid currentColor;
  transition: transform 0.15s;
}
#mx-auth-nav-user.open #mx-auth-nav-user-label::after {
  transform: rotate(180deg);
}

/* Dropdown */
#mx-auth-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 180px;
  background: var(--void-elevated, #111118);
  border: 1px solid var(--void-border, #1a1a24);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.7);
  padding: 6px 0;
  opacity: 0;
  pointer-events: none;
  transform: translateY(-4px);
  transition: opacity 0.15s, transform 0.15s;
  z-index: 100001;
}
#mx-auth-nav-user.open #mx-auth-dropdown {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}
.mx-auth-dropdown-item {
  display: block;
  width: 100%;
  padding: 8px 16px;
  background: none;
  border: none;
  color: var(--star-white, #e8e6f0);
  font-family: var(--font-mono, monospace);
  font-size: 12px;
  text-align: left;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}
.mx-auth-dropdown-item:hover {
  background: rgba(0,255,200,0.07);
  color: var(--biolume, #00ffc8);
}
.mx-auth-dropdown-divider {
  height: 1px;
  background: var(--void-border, #1a1a24);
  margin: 4px 0;
}

/* Toast notification */
#mx-auth-toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%) translateY(20px);
  background: var(--void-elevated, #111118);
  border: 1px solid var(--biolume, #00ffc8);
  border-radius: 6px;
  color: var(--biolume, #00ffc8);
  font-family: var(--font-mono, monospace);
  font-size: 12px;
  padding: 8px 16px;
  z-index: 100002;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s, transform 0.2s;
}
#mx-auth-toast.visible {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
`;

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);

  // ── Build Modal DOM ────────────────────────────────────────

  const overlay = document.createElement('div');
  overlay.id = 'mx-auth-overlay';
  overlay.innerHTML = `
    <div id="mx-auth-modal">
      <div id="mx-auth-header">
        <h3>Matrix Authentication</h3>
        <button id="mx-auth-close" aria-label="Close">&times;</button>
      </div>
      <div id="mx-auth-tabs">
        <button class="mx-auth-tab active" data-tab="login">Sign In</button>
        <button class="mx-auth-tab" data-tab="register">Create Account</button>
      </div>
      <div id="mx-auth-body">
        <div id="mx-auth-error"></div>
        <div class="mx-auth-field">
          <label for="mx-auth-username">Username</label>
          <input type="text" id="mx-auth-username" autocomplete="username" placeholder="@user:matrix.multiversestudios.xyz">
        </div>
        <div class="mx-auth-field">
          <label for="mx-auth-password">Password</label>
          <input type="password" id="mx-auth-password" autocomplete="current-password">
        </div>
        <div class="mx-auth-field" id="mx-auth-confirm-field" style="display:none;">
          <label for="mx-auth-confirm">Confirm Password</label>
          <input type="password" id="mx-auth-confirm" autocomplete="new-password">
        </div>
        <div class="mx-auth-field" id="mx-auth-token-field" style="display:none;">
          <label for="mx-auth-token">Invite Token</label>
          <input type="text" id="mx-auth-token" placeholder="Beta access token" autocomplete="off">
        </div>
        <button id="mx-auth-submit">Sign In</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Toast element
  const toast = document.createElement('div');
  toast.id = 'mx-auth-toast';
  document.body.appendChild(toast);

  // ── Modal Logic ────────────────────────────────────────────

  const elClose = document.getElementById('mx-auth-close');
  const elError = document.getElementById('mx-auth-error');
  const elUsername = document.getElementById('mx-auth-username');
  const elPassword = document.getElementById('mx-auth-password');
  const elConfirm = document.getElementById('mx-auth-confirm');
  const elConfirmField = document.getElementById('mx-auth-confirm-field');
  const elToken = document.getElementById('mx-auth-token');
  const elTokenField = document.getElementById('mx-auth-token-field');
  const elSubmit = document.getElementById('mx-auth-submit');
  const tabs = overlay.querySelectorAll('.mx-auth-tab');

  let activeTab = 'login';

  function showModal() {
    overlay.classList.add('open');
    elError.classList.remove('visible');
    elUsername.value = '';
    elPassword.value = '';
    elConfirm.value = '';
    elToken.value = '';
    elUsername.focus();
  }

  function hideModal() {
    overlay.classList.remove('open');
  }

  function showError(msg) {
    elError.textContent = msg;
    elError.classList.add('visible');
  }

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('visible');
    setTimeout(function() { toast.classList.remove('visible'); }, 2500);
  }

  function switchTab(tab) {
    activeTab = tab;
    tabs.forEach(function(t) {
      t.classList.toggle('active', t.dataset.tab === tab);
    });
    elConfirmField.style.display = tab === 'register' ? '' : 'none';
    // Token field is hidden by default — shown only if server requires it
    elTokenField.style.display = 'none';
    elSubmit.textContent = tab === 'login' ? 'Sign In' : 'Create Account';
    elPassword.autocomplete = tab === 'login' ? 'current-password' : 'new-password';
    elError.classList.remove('visible');
  }

  tabs.forEach(function(t) {
    t.addEventListener('click', function() { switchTab(t.dataset.tab); });
  });

  elClose.addEventListener('click', hideModal);
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) hideModal();
  });

  // Submit handler
  async function handleSubmit() {
    elError.classList.remove('visible');
    var username = elUsername.value.trim();
    var password = elPassword.value;

    if (!username || !password) {
      showError('Username and password are required.');
      return;
    }

    // Strip leading @ and domain if full Matrix ID entered
    if (username.startsWith('@')) {
      username = username.split(':')[0].substring(1);
    }

    if (activeTab === 'register') {
      if (password !== elConfirm.value) {
        showError('Passwords do not match.');
        return;
      }
      if (password.length < 8) {
        showError('Password must be at least 8 characters.');
        return;
      }
      var token = elToken.value.trim() || undefined;
    }

    elSubmit.disabled = true;
    elSubmit.textContent = activeTab === 'login' ? 'Signing in...' : 'Creating account...';

    try {
      if (activeTab === 'login') {
        await login(username, password);
      } else {
        await register(username, password, token);
      }
      hideModal();
      showToast('Signed in as ' + escapeHtml(session.displayName || session.userId));
    } catch (err) {
      if (err.message === 'INVITE_TOKEN_REQUIRED') {
        // Server requires an invite token — show the field and ask user
        elTokenField.style.display = '';
        showError('This server requires an invite token to create an account.');
        elToken.focus();
      } else {
        showError(err.message || 'Authentication failed.');
      }
    } finally {
      elSubmit.disabled = false;
      elSubmit.textContent = activeTab === 'login' ? 'Sign In' : 'Create Account';
    }
  }

  elSubmit.addEventListener('click', handleSubmit);
  elPassword.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && activeTab === 'login') handleSubmit();
  });
  elConfirm.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') handleSubmit();
  });

  // ── Nav Bar Integration ────────────────────────────────────

  let navLi = null;       // <li> we inject
  let dropdownOpen = false;

  function updateNavUI() {
    // Remove previous nav element if present
    if (navLi && navLi.parentNode) {
      navLi.parentNode.removeChild(navLi);
    }

    var navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;

    // Find the "Beta Access" item to insert before it
    var betaItem = null;
    var items = navLinks.querySelectorAll('li');
    for (var i = 0; i < items.length; i++) {
      var link = items[i].querySelector('a');
      if (link && (link.textContent.trim() === 'Beta Access' ||
                   (link.getAttribute('href') || '').indexOf('#buy') !== -1)) {
        betaItem = items[i];
        break;
      }
    }

    navLi = document.createElement('li');

    if (session.accessToken && session.userId) {
      // Logged in state
      var displayLabel = escapeHtml(session.displayName || session.userId);
      navLi.innerHTML =
        '<div id="mx-auth-nav-user">' +
          '<span id="mx-auth-nav-user-label">' + displayLabel + '</span>' +
          '<div id="mx-auth-dropdown">' +
            '<button class="mx-auth-dropdown-item" data-action="profile">My Profile</button>' +
            '<button class="mx-auth-dropdown-item" data-action="openid">OpenID Token</button>' +
            '<div class="mx-auth-dropdown-divider"></div>' +
            '<button class="mx-auth-dropdown-item" data-action="signout">Sign Out</button>' +
          '</div>' +
        '</div>';

      if (betaItem) {
        navLinks.insertBefore(navLi, betaItem);
      } else {
        navLinks.appendChild(navLi);
      }

      // Dropdown toggle
      var userEl = document.getElementById('mx-auth-nav-user');
      var labelEl = document.getElementById('mx-auth-nav-user-label');
      labelEl.addEventListener('click', function(e) {
        e.stopPropagation();
        dropdownOpen = !dropdownOpen;
        userEl.classList.toggle('open', dropdownOpen);
      });

      // Dropdown actions
      var dropdownItems = navLi.querySelectorAll('.mx-auth-dropdown-item');
      dropdownItems.forEach(function(item) {
        item.addEventListener('click', function(e) {
          e.stopPropagation();
          dropdownOpen = false;
          userEl.classList.remove('open');
          var action = item.dataset.action;
          if (action === 'signout') {
            logout();
          } else if (action === 'openid') {
            handleCopyOpenId();
          } else if (action === 'profile') {
            showToast('User: ' + escapeHtml(session.userId));
          }
        });
      });

      // Close dropdown on outside click
      document.addEventListener('click', function closeDropdown() {
        if (dropdownOpen) {
          dropdownOpen = false;
          var el = document.getElementById('mx-auth-nav-user');
          if (el) el.classList.remove('open');
        }
      });

    } else {
      // Logged out state
      navLi.innerHTML = '<a id="mx-auth-nav-signin" href="javascript:void(0)">Sign In</a>';

      if (betaItem) {
        navLinks.insertBefore(navLi, betaItem);
      } else {
        navLinks.appendChild(navLi);
      }

      document.getElementById('mx-auth-nav-signin').addEventListener('click', showModal);
    }
  }

  async function handleCopyOpenId() {
    try {
      var tokenData = await getOpenIdToken();
      var tokenStr = JSON.stringify(tokenData);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(tokenStr);
        showToast('OpenID token copied to clipboard');
      } else {
        // Fallback for older browsers
        var ta = document.createElement('textarea');
        ta.value = tokenStr;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('OpenID token copied to clipboard');
      }
    } catch (err) {
      showToast('Failed to get OpenID token: ' + err.message);
    }
  }

  // ── Initialize ─────────────────────────────────────────────

  async function init() {
    if (session.accessToken) {
      var valid = await validateSession();
      if (!valid) {
        clearSession();
      }
    }
    updateNavUI();
    window.dispatchEvent(new CustomEvent('matrixAuthReady', { detail: { loggedIn: !!(session.accessToken && session.userId) } }));
  }

  // Run init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ── Public API ─────────────────────────────────────────────

  // NOTE: getAccessToken() is intentionally absent from the public API.
  // Exposing the raw Matrix token to any script on the page widens the XSS
  // exfiltration surface. Use getOpenIdToken() for delegated auth instead.
  // If you need authenticated Matrix API calls from game code, add a dedicated
  // method here that proxies the specific call without leaking the token.
  window.matrixAuth = {
    isLoggedIn: function() { return !!(session.accessToken && session.userId); },
    getUserId: function() { return session.userId; },
    getOpenIdToken: function() { return getOpenIdToken(); },
    login: function(user, pass) { return login(user, pass); },
    logout: function() { return logout(); },
    showLoginModal: function() { showModal(); },
  };

})();
