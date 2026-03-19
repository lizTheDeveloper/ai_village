/**
 * OnboardingOverlay - First-run guidance for new players.
 *
 * Shows a welcome modal and sequential contextual hints on first visit.
 * All state is persisted to localStorage so returning players see nothing.
 */

const LS_KEY = 'mvee_onboarding_dismissed';

interface OnboardingHint {
  id: string;
  text: string;
  /** CSS position for the hint arrow/bubble */
  position: { top?: string; bottom?: string; left?: string; right?: string };
  /** Which direction the arrow points */
  arrow: 'up' | 'down' | 'left' | 'none';
}

const HINTS: OnboardingHint[] = [
  {
    id: 'menu-bar',
    text: 'Use the menu bar to open panels — Agent, Economy, Magic, and more.',
    position: { top: '38px', left: '40px' },
    arrow: 'up',
  },
  {
    id: 'divine-chat',
    text: 'Press G to open Divine Chat — your Angel is watching the village with you. Ask them anything about what\'s happening!',
    position: { top: '50%', left: '50%' },
    arrow: 'none',
  },
  {
    id: 'click-agent',
    text: 'Click on an agent in the world to see their thoughts, needs, and skills.',
    position: { top: '50%', left: '50%' },
    arrow: 'none',
  },
  {
    id: 'time-controls',
    text: 'Open File → Time Controls to pause, speed up, or slow down the simulation.',
    position: { top: '38px', left: '10px' },
    arrow: 'up',
  },
  {
    id: 'right-click',
    text: 'Right-click a grass tile and press T to till it for farming.',
    position: { bottom: '60px', right: '20px' },
    arrow: 'none',
  },
];

export class OnboardingOverlay {
  private backdrop: HTMLDivElement;
  private welcomeCard: HTMLDivElement;
  private hintEl: HTMLDivElement;
  private currentHintIndex = 0;
  private styleTag: HTMLStyleElement;

  constructor() {
    this.styleTag = document.createElement('style');
    this.styleTag.textContent = `
      @keyframes onb-fadeIn {
        from { opacity: 0; transform: translateY(-12px) scale(0.97); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes onb-fadeOut {
        from { opacity: 1; }
        to   { opacity: 0; }
      }
    `;
    document.head.appendChild(this.styleTag);

    // --- backdrop ---
    this.backdrop = document.createElement('div');
    this.backdrop.style.cssText = `
      position: fixed; top: 0; left: 0;
      width: 100vw; height: 100vh;
      background: rgba(0,0,0,0.72);
      display: none;
      justify-content: center; align-items: center;
      z-index: 10003;
      font-family: 'Georgia', serif;
      backdrop-filter: blur(4px);
    `;

    // --- welcome card ---
    this.welcomeCard = document.createElement('div');
    this.welcomeCard.style.cssText = `
      position: relative;
      width: 90%; max-width: 520px;
      padding: 32px 36px;
      background: rgba(18,18,28,0.96);
      border: 2px solid #ffd700;
      border-radius: 14px;
      box-shadow: 0 0 50px rgba(255,215,0,0.3);
      color: #e8e8e8;
      text-align: center;
      animation: onb-fadeIn 0.35s ease-out;
    `;
    this.welcomeCard.innerHTML = `
      <h2 style="margin:0 0 14px; font-size:22px; color:#ffd700; letter-spacing:1px;">
        Welcome to the Multiverse
      </h2>
      <p style="margin:0 0 10px; font-size:15px; line-height:1.55; color:#ccc;">
        You are watching a living world unfold. Agents think, talk, craft, and
        form societies on their own — your role is to observe, guide, and shape
        their destiny.
      </p>
      <p style="margin:0 0 22px; font-size:14px; line-height:1.5; color:#aaa;">
        Click agents to learn about them. Use the menu bar to open panels.
        Right-click tiles to interact with the world.
      </p>
      <button id="onb-start-btn" style="
        padding: 10px 28px;
        background: #ffd700;
        color: #1a1a2e;
        border: none;
        border-radius: 8px;
        font-size: 15px;
        font-weight: bold;
        cursor: pointer;
        font-family: inherit;
        transition: background 0.15s;
      ">Got it — show me around</button>
      <div style="margin-top:14px;">
        <button id="onb-skip-btn" style="
          background: none; border: none;
          color: #888; font-size: 13px;
          cursor: pointer; font-family: inherit;
          text-decoration: underline;
        ">Skip tutorial</button>
      </div>
    `;
    this.backdrop.appendChild(this.welcomeCard);

    // --- hint element (used for sequential tips) ---
    this.hintEl = document.createElement('div');
    this.hintEl.style.cssText = `
      position: fixed;
      display: none;
      z-index: 10004;
      max-width: 340px;
      padding: 14px 18px;
      background: rgba(18,18,28,0.95);
      border: 1.5px solid #ffd700;
      border-radius: 10px;
      box-shadow: 0 0 20px rgba(255,215,0,0.25);
      color: #e0e0e0;
      font-family: 'Georgia', serif;
      font-size: 14px;
      line-height: 1.5;
      animation: onb-fadeIn 0.3s ease-out;
    `;
    // hint dismiss button (rendered dynamically)
    document.body.appendChild(this.hintEl);
    document.body.appendChild(this.backdrop);

    // wire up buttons
    this.backdrop.querySelector('#onb-start-btn')!.addEventListener('click', () => {
      this.dismissWelcome();
      this.showNextHint();
    });
    this.backdrop.querySelector('#onb-skip-btn')!.addEventListener('click', () => {
      this.dismissAll();
    });

    // ESC dismisses everything
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.dismissAll();
    });
  }

  /** Returns true if onboarding was already completed. */
  static wasCompleted(): boolean {
    try {
      return localStorage.getItem(LS_KEY) === '1';
    } catch {
      return false;
    }
  }

  /** Show the welcome modal if this is the player's first session. */
  show(): void {
    if (OnboardingOverlay.wasCompleted()) return;
    this.backdrop.style.display = 'flex';
  }

  private dismissWelcome(): void {
    this.backdrop.style.display = 'none';
  }

  private showNextHint(): void {
    if (this.currentHintIndex >= HINTS.length) {
      this.dismissAll();
      return;
    }

    const hint = HINTS[this.currentHintIndex]!;
    const isLast = this.currentHintIndex === HINTS.length - 1;

    // build arrow
    let arrowHtml = '';
    if (hint.arrow === 'up') {
      arrowHtml = `<div style="
        position:absolute; top:-8px; left:20px;
        width:0; height:0;
        border-left:8px solid transparent;
        border-right:8px solid transparent;
        border-bottom:8px solid #ffd700;
      "></div>`;
    } else if (hint.arrow === 'down') {
      arrowHtml = `<div style="
        position:absolute; bottom:-8px; left:20px;
        width:0; height:0;
        border-left:8px solid transparent;
        border-right:8px solid transparent;
        border-top:8px solid #ffd700;
      "></div>`;
    }

    this.hintEl.innerHTML = `
      ${arrowHtml}
      <div style="margin-bottom:10px;">${hint.text}</div>
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="color:#888; font-size:12px;">${this.currentHintIndex + 1} / ${HINTS.length}</span>
        <button class="onb-hint-btn" style="
          padding:6px 18px;
          background:#ffd700; color:#1a1a2e;
          border:none; border-radius:6px;
          font-size:13px; font-weight:bold;
          cursor:pointer; font-family:inherit;
        ">${isLast ? 'Done' : 'Next'}</button>
      </div>
    `;

    // position
    this.hintEl.style.top = hint.position.top || 'auto';
    this.hintEl.style.bottom = hint.position.bottom || 'auto';
    this.hintEl.style.left = hint.position.left || 'auto';
    this.hintEl.style.right = hint.position.right || 'auto';
    // center-screen hints
    if (hint.position.top === '50%' && hint.position.left === '50%') {
      this.hintEl.style.transform = 'translate(-50%, -50%)';
    } else {
      this.hintEl.style.transform = 'none';
    }

    this.hintEl.style.display = 'block';
    // re-trigger animation
    this.hintEl.style.animation = 'none';
    void this.hintEl.offsetWidth;
    this.hintEl.style.animation = 'onb-fadeIn 0.3s ease-out';

    this.hintEl.querySelector('.onb-hint-btn')!.addEventListener('click', () => {
      this.currentHintIndex++;
      this.showNextHint();
    });
  }

  private dismissAll(): void {
    this.backdrop.style.display = 'none';
    this.hintEl.style.display = 'none';
    try {
      localStorage.setItem(LS_KEY, '1');
    } catch {
      // storage full or disabled — hints will re-appear next session, acceptable
    }
  }
}
