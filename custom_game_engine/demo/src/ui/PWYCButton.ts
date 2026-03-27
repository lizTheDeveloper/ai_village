/**
 * PWYCButton — always-visible "Support This Game" floating heart button.
 *
 * A small, non-intrusive button that opens an in-game tier picker modal
 * before redirecting to Stripe checkout. Tiers: Free / $5 / $15 / $25 / Custom.
 *
 * Usage:
 *   const btn = new PWYCButton();
 *   // button is auto-mounted to document.body
 */

const CHECKOUT_API_URL = 'https://pay.multiversestudios.xyz/create-checkout-session';

interface Tier {
  id: string;
  amount: number | null;
  label: string;
  sublabel: string;
  desc: string;
  isDefault?: boolean;
  isCustom?: boolean;
  isFree?: boolean;
}

const TIERS: Tier[] = [
  { id: 'free',   amount: 0,    label: 'Free',   sublabel: '$0',        desc: 'Play free, no conditions.', isFree: true },
  { id: 'spark',  amount: 500,  label: 'Spark',  sublabel: '$5',        desc: 'A coffee for the dev team.', isDefault: true },
  { id: 'signal', amount: 1500, label: 'Signal', sublabel: '$15',       desc: 'Our suggested amount.' },
  { id: 'beacon', amount: 2500, label: 'Beacon', sublabel: '$25',       desc: 'You believe in this work.' },
  { id: 'custom', amount: null, label: 'Custom', sublabel: 'Your call', desc: 'Name your price.', isCustom: true },
];

const ACCENT = 'rgba(0, 220, 0,';
const ACCENT_SOLID = '#00dc00';

export class PWYCButton {
  private triggerEl: HTMLElement;
  private tooltipEl: HTMLElement;
  private overlayEl: HTMLElement | null = null;
  private selectedTierIdx = TIERS.findIndex(t => t.isDefault);
  private styleEl: HTMLStyleElement | null = null;
  private pulseStyleEl: HTMLStyleElement | null = null;

  constructor() {
    this._injectPulseAnimation();
    this.tooltipEl = this._buildTooltip();
    this.triggerEl = this._buildTrigger();
    document.body.appendChild(this.tooltipEl);
    document.body.appendChild(this.triggerEl);
  }

  destroy(): void {
    this.triggerEl.remove();
    this.tooltipEl.remove();
    this.overlayEl?.remove();
    this.styleEl?.remove();
    this.pulseStyleEl?.remove();
  }

  private _injectPulseAnimation(): void {
    this.pulseStyleEl = document.createElement('style');
    this.pulseStyleEl.textContent = `
      @keyframes pwyc-heartbeat {
        0%, 100% { transform: scale(1); }
        14% { transform: scale(1.15); }
        28% { transform: scale(1); }
        42% { transform: scale(1.1); }
        56% { transform: scale(1); }
      }
      #pwyc-trigger {
        animation: pwyc-heartbeat 3s ease-in-out infinite;
        animation-delay: 10s;
      }
      #pwyc-trigger:hover {
        animation-play-state: paused;
      }
    `;
    document.head.appendChild(this.pulseStyleEl);
  }

  private _buildTrigger(): HTMLElement {
    const btn = document.createElement('button');
    btn.id = 'pwyc-trigger';
    btn.title = 'Support this game — pay what you can';
    btn.textContent = '\u2661';
    btn.setAttribute('data-umami-event', 'pwyc-mvee-button-clicked');
    btn.setAttribute('data-pwyc-game', 'mvee');
    btn.style.cssText = `
      position: fixed;
      bottom: 62px;
      right: 12px;
      width: 44px;
      height: 44px;
      padding: 0;
      border-radius: 50%;
      border: 1px solid ${ACCENT} 0.28);
      background: rgba(0, 8, 0, 0.88);
      color: ${ACCENT} 0.6);
      font-size: 18px;
      cursor: pointer;
      z-index: 8999;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.5);
      transition: border-color 0.2s, color 0.2s;
      backdrop-filter: blur(4px);
      text-decoration: none;
      line-height: 1;
    `;

    btn.addEventListener('mouseenter', () => {
      btn.style.borderColor = `${ACCENT} 0.55)`;
      btn.style.color = `${ACCENT} 0.95)`;
      this.tooltipEl.style.opacity = '1';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.borderColor = `${ACCENT} 0.28)`;
      btn.style.color = `${ACCENT} 0.6)`;
      this.tooltipEl.style.opacity = '0';
    });
    btn.addEventListener('click', () => {
      this._trackClick();
      this._openModal();
    });

    return btn;
  }

  private _buildTooltip(): HTMLElement {
    const tip = document.createElement('div');
    tip.id = 'pwyc-tooltip';
    tip.textContent = 'Pay what you can';
    tip.style.cssText = `
      position: fixed;
      bottom: 104px;
      right: 12px;
      z-index: 8999;
      background: rgba(0, 8, 0, 0.94);
      border: 1px solid ${ACCENT} 0.18);
      border-radius: 3px;
      padding: 4px 8px;
      font-family: 'Courier New', Courier, monospace;
      font-size: 9px;
      letter-spacing: 0.06em;
      color: rgba(134, 239, 172, 0.7);
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.15s;
    `;
    return tip;
  }

  // ── Tier picker modal ───────────────────────────────────────────────────

  private _injectStyles(): void {
    if (this.styleEl) return;
    this.styleEl = document.createElement('style');
    this.styleEl.textContent = `
      #pwyc-overlay {
        position: fixed; inset: 0; z-index: 99998;
        background: rgba(0,4,0,0.82);
        backdrop-filter: blur(12px);
        display: flex; align-items: center; justify-content: center;
        padding: 1rem;
        opacity: 0; transition: opacity 0.2s ease;
        pointer-events: none;
      }
      #pwyc-overlay.pwyc-open { opacity: 1; pointer-events: all; }
      #pwyc-modal {
        background: rgba(0,8,0,0.96);
        border: 1px solid ${ACCENT} 0.15);
        border-radius: 8px;
        max-width: 440px; width: 100%;
        padding: 1.5rem;
        position: relative;
        transform: translateY(12px); transition: transform 0.2s ease;
      }
      #pwyc-overlay.pwyc-open #pwyc-modal { transform: translateY(0); }
      #pwyc-modal-close {
        position: absolute; top: 0.75rem; right: 0.75rem;
        background: transparent; border: none; cursor: pointer;
        color: rgba(134,239,172,0.4); font-size: 1.2rem; line-height: 1;
        padding: 0.25rem 0.4rem; border-radius: 3px;
        min-width: 44px; min-height: 44px;
        display: flex; align-items: center; justify-content: center;
        transition: color 0.15s;
      }
      #pwyc-modal-close:hover { color: rgba(134,239,172,0.8); }
      #pwyc-modal-heading {
        font-family: 'Courier New', Courier, monospace;
        font-size: 0.85rem; font-weight: 600;
        color: rgba(134,239,172,0.9);
        margin-bottom: 0.25rem;
      }
      #pwyc-modal-sub {
        font-family: 'Courier New', Courier, monospace;
        font-size: 0.65rem; color: rgba(134,239,172,0.4);
        margin-bottom: 1.25rem;
      }
      .pwyc-tiers {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 0.4rem; margin-bottom: 1rem;
      }
      @media (max-width: 480px) { .pwyc-tiers { grid-template-columns: repeat(3, 1fr); } }
      .pwyc-tier {
        background: rgba(0,220,0,0.02);
        border: 1px solid rgba(0,220,0,0.06);
        border-radius: 6px;
        padding: 0.65rem 0.35rem;
        cursor: pointer; text-align: center;
        transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
        user-select: none;
      }
      .pwyc-tier:hover {
        border-color: rgba(0,220,0,0.15);
        background: rgba(0,220,0,0.04);
      }
      .pwyc-tier.pwyc-selected {
        border-color: ${ACCENT_SOLID};
        background: rgba(0,220,0,0.08);
        box-shadow: 0 0 10px ${ACCENT} 0.2);
      }
      .pwyc-tier-price {
        font-family: 'Courier New', Courier, monospace;
        font-size: 0.85rem; font-weight: 500;
        color: rgba(134,239,172,0.85); margin-bottom: 0.15rem;
      }
      .pwyc-tier-name {
        font-family: 'Courier New', Courier, monospace;
        font-size: 0.5rem; font-weight: 600;
        letter-spacing: 0.08em; text-transform: uppercase;
        color: rgba(134,239,172,0.35); margin-bottom: 0.25rem;
      }
      .pwyc-tier-desc {
        font-family: 'Courier New', Courier, monospace;
        font-size: 0.5rem; color: rgba(134,239,172,0.2);
        line-height: 1.3;
      }
      .pwyc-tier.pwyc-selected .pwyc-tier-name { color: ${ACCENT} 0.6); }
      .pwyc-tier.pwyc-selected .pwyc-tier-desc { color: rgba(134,239,172,0.35); }
      #pwyc-custom-row {
        display: none; margin-bottom: 0.75rem;
        align-items: center; gap: 0.5rem;
      }
      #pwyc-custom-row.pwyc-visible { display: flex; }
      #pwyc-custom-label {
        font-family: 'Courier New', Courier, monospace;
        font-size: 0.75rem; color: rgba(134,239,172,0.5);
      }
      #pwyc-custom-input {
        flex: 1; background: rgba(0,220,0,0.03);
        border: 1px solid rgba(0,220,0,0.1);
        border-radius: 4px; padding: 0.45rem 0.6rem;
        color: rgba(134,239,172,0.9);
        font-family: 'Courier New', Courier, monospace;
        font-size: 0.8rem; outline: none;
        transition: border-color 0.15s;
      }
      #pwyc-custom-input:focus { border-color: ${ACCENT} 0.4); }
      #pwyc-cta {
        display: block; width: 100%;
        padding: 0.65rem 1rem;
        font-family: 'Courier New', Courier, monospace;
        font-size: 0.7rem; font-weight: 500;
        letter-spacing: 0.08em; text-transform: uppercase;
        border: none; border-radius: 5px;
        cursor: pointer; transition: opacity 0.15s;
        text-align: center;
      }
      #pwyc-cta:hover { opacity: 0.85; }
      #pwyc-cta:disabled { opacity: 0.5; cursor: default; }
      #pwyc-note {
        margin-top: 0.75rem;
        font-family: 'Courier New', Courier, monospace;
        font-size: 0.55rem; color: rgba(134,239,172,0.2);
        text-align: center; line-height: 1.5;
      }
    `;
    document.head.appendChild(this.styleEl);
  }

  private _buildModal(): HTMLElement {
    this._injectStyles();

    const overlay = document.createElement('div');
    overlay.id = 'pwyc-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Support this game — pay what you can');

    const tiersHtml = TIERS.map((tier, i) => `
      <button class="pwyc-tier${i === this.selectedTierIdx ? ' pwyc-selected' : ''}"
        data-tier-idx="${i}" role="radio" aria-checked="${i === this.selectedTierIdx}"
        aria-label="${tier.label} — ${tier.sublabel}">
        <div class="pwyc-tier-price">${tier.sublabel}</div>
        <div class="pwyc-tier-name">${tier.label}</div>
        <div class="pwyc-tier-desc">${tier.desc}</div>
      </button>
    `).join('');

    overlay.innerHTML = `
      <div id="pwyc-modal">
        <button id="pwyc-modal-close" aria-label="Close">&times;</button>
        <div id="pwyc-modal-heading">Support this game</div>
        <div id="pwyc-modal-sub">MVEE is free to play. Pay what you can if it means something to you.</div>
        <div class="pwyc-tiers" role="radiogroup" aria-label="Choose your contribution">
          ${tiersHtml}
        </div>
        <div id="pwyc-custom-row">
          <span id="pwyc-custom-label">$</span>
          <input id="pwyc-custom-input" type="number" min="1" max="9999"
            placeholder="Enter amount" aria-label="Custom amount in dollars">
        </div>
        <div id="pwyc-trust-msg" style="display:none; opacity:0; text-align:center; padding:0.6rem 0.75rem; margin-bottom:0.75rem; background:rgba(0,220,0,0.04); border:1px solid rgba(0,220,0,0.1); border-radius:5px; font-family:'Courier New',Courier,monospace; font-size:0.6rem; color:rgba(134,239,172,0.65); line-height:1.5; transition:opacity 0.3s ease;">
          You are supporting an indie game built by artists.<br>100% of your payment funds development.
          <div style="margin-top:0.35rem; opacity:0.5; font-size:0.5rem;">Secure checkout via Stripe</div>
        </div>
        <button id="pwyc-cta">Continue — $5 →</button>
        <div id="pwyc-note">All games are free. Payments support development and keep the servers running.</div>
      </div>
    `;

    overlay.querySelector('#pwyc-modal-close')!.addEventListener('click', () => this._closeModal());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) this._closeModal(); });

    const tierEls = Array.from(overlay.querySelectorAll('.pwyc-tier')) as HTMLElement[];
    tierEls.forEach((el, i) => {
      el.addEventListener('click', () => this._selectTier(i));
    });

    overlay.querySelector('#pwyc-cta')!.addEventListener('click', () => this._handleCTA());

    document.body.appendChild(overlay);
    return overlay;
  }

  private _openModal(): void {
    if (!this.overlayEl) {
      this.overlayEl = this._buildModal();
    }
    this.selectedTierIdx = TIERS.findIndex(t => t.isDefault);
    this._selectTier(this.selectedTierIdx);
    this._hideTrustMsg();
    requestAnimationFrame(() => {
      this.overlayEl!.classList.add('pwyc-open');
    });
  }

  private _closeModal(): void {
    if (!this.overlayEl) return;
    this.overlayEl.classList.remove('pwyc-open');
  }

  private _selectTier(idx: number): void {
    this.selectedTierIdx = idx;
    if (!this.overlayEl) return;

    const tierEls = this.overlayEl.querySelectorAll('.pwyc-tier');
    tierEls.forEach((el, i) => {
      const isSelected = i === idx;
      el.classList.toggle('pwyc-selected', isSelected);
      el.setAttribute('aria-checked', isSelected ? 'true' : 'false');
    });

    const customRow = this.overlayEl.querySelector('#pwyc-custom-row') as HTMLElement;
    const tier = TIERS[idx];
    if (tier.isCustom) {
      customRow.classList.add('pwyc-visible');
      (this.overlayEl.querySelector('#pwyc-custom-input') as HTMLInputElement).focus();
    } else {
      customRow.classList.remove('pwyc-visible');
    }

    this._updateCTA();
  }

  private _updateCTA(): void {
    if (!this.overlayEl) return;
    const cta = this.overlayEl.querySelector('#pwyc-cta') as HTMLButtonElement;
    const tier = TIERS[this.selectedTierIdx];

    if (tier.isFree) {
      cta.textContent = 'Play Free →';
      cta.style.background = 'rgba(134,239,172,0.1)';
      cta.style.color = 'rgba(134,239,172,0.7)';
    } else if (tier.isCustom) {
      cta.textContent = 'Continue with Custom Amount →';
      cta.style.background = ACCENT_SOLID;
      cta.style.color = 'rgba(0,8,0,0.95)';
    } else {
      cta.textContent = `Continue — ${tier.sublabel} →`;
      cta.style.background = ACCENT_SOLID;
      cta.style.color = 'rgba(0,8,0,0.95)';
    }
  }

  private async _handleCTA(): Promise<void> {
    const tier = TIERS[this.selectedTierIdx];

    if (tier.isFree) {
      this._closeModal();
      return;
    }

    let cents: number;
    if (tier.isCustom) {
      const input = this.overlayEl!.querySelector('#pwyc-custom-input') as HTMLInputElement;
      const dollars = parseFloat(input.value);
      if (!dollars || dollars < 1) {
        input.focus();
        input.style.borderColor = 'rgba(252,100,100,0.6)';
        setTimeout(() => { input.style.borderColor = ''; }, 1500);
        return;
      }
      cents = Math.round(dollars * 100);
    } else {
      cents = tier.amount!;
    }

    const cta = this.overlayEl!.querySelector('#pwyc-cta') as HTMLButtonElement;
    const originalText = cta.textContent ?? '';
    cta.disabled = true;

    // Show trust signal before redirect
    const trustMsg = this.overlayEl!.querySelector('#pwyc-trust-msg') as HTMLElement | null;
    if (trustMsg) {
      trustMsg.style.display = 'block';
      trustMsg.style.opacity = '1';
    }
    cta.textContent = 'Connecting to Stripe…';
    cta.style.opacity = '0.5';

    // Brief pause so the trust message is visible
    await new Promise(r => setTimeout(r, 1200));

    try {
      const response = await fetch(CHECKOUT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: 'mvee', amount: cents }),
      });

      if (!response.ok) {
        const body = await response.text();
        console.error('[PWYCButton] Checkout API error', { status: response.status, body });
        cta.textContent = 'Something went wrong — try again';
        cta.style.background = 'rgba(252,61,61,0.8)';
        cta.style.color = '#fff';
        setTimeout(() => {
          cta.disabled = false;
          cta.style.opacity = '';
          cta.textContent = originalText;
          this._updateCTA();
          this._hideTrustMsg();
        }, 2000);
        return;
      }

      const data = (await response.json()) as { url: string };
      window.location.href = data.url;
      cta.disabled = false;
      cta.style.opacity = '';
      cta.textContent = originalText;
      this._updateCTA();
      this._closeModal();
    } catch (err) {
      console.error('[PWYCButton] Failed to reach checkout API', err);
      cta.textContent = 'Connection failed — try again';
      cta.style.background = 'rgba(252,61,61,0.8)';
      cta.style.color = '#fff';
      setTimeout(() => {
        cta.disabled = false;
        cta.style.opacity = '';
        cta.textContent = originalText;
        this._updateCTA();
        this._hideTrustMsg();
      }, 2000);
    }
  }

  private _hideTrustMsg(): void {
    const msg = this.overlayEl?.querySelector('#pwyc-trust-msg') as HTMLElement | null;
    if (msg) { msg.style.display = 'none'; msg.style.opacity = '0'; }
  }

  private _trackClick(): void {
    try {
      (window as { umami?: { track: (e: string) => void } }).umami?.track('pwyc-mvee-button-clicked');
    } catch { /* no umami */ }
  }
}
