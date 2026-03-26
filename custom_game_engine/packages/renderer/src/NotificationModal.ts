/**
 * NotificationModal - Generalized modal system for game events
 *
 * Based on SoulCeremonyModal but generalized for any event type.
 * Features:
 * - Dismissible with ESC or click
 * - Auto-dismiss after timeout (optional)
 * - Different visual styles for different event types
 * - Queue system for multiple notifications
 * - Customizable buttons and actions
 */

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'event' | 'discovery' | 'achievement';

export interface NotificationButton {
  text: string;
  style?: 'primary' | 'secondary' | 'danger';
  action: () => void;
}

export interface NotificationContent {
  type: NotificationType;
  title: string;
  subtitle?: string;
  icon?: string;
  sections?: NotificationSection[];
  image?: {
    src: string;
    alt: string;
    size?: 'small' | 'medium' | 'large';
  };
  buttons?: NotificationButton[];
  autoDismiss?: number; // Milliseconds before auto-dismiss (0 = no auto-dismiss)
  onDismiss?: () => void;
}

export interface NotificationSection {
  title?: string;
  content: string | string[] | Record<string, string>;
  style?: 'default' | 'highlighted' | 'warning' | 'success' | 'info';
  icon?: string;
}

const MODAL_COOLDOWN_MS = 7000;
const MAX_QUEUE = 5;

export class NotificationModal {
  private container: HTMLDivElement;
  private contentArea: HTMLDivElement;
  private queue: NotificationContent[] = [];
  private currentNotification: NotificationContent | null = null;
  private autoDismissTimeout: number | null = null;
  private isDismissing = false;
  private currentTheme: NotificationTheme | null = null;
  private progressBarEl: HTMLDivElement | null = null;
  private lastShownAt = 0;

  constructor() {
    this.container = document.createElement('div');
    this.setupStyles();
    this.contentArea = this.createContentArea();
    this.container.appendChild(this.contentArea);
    document.body.appendChild(this.container);

    // Add ESC key listener to dismiss modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.currentNotification && !this.isDismissing) {
        this.dismiss();
      }
    });

    // Click outside to dismiss
    this.container.addEventListener('click', (e) => {
      if (e.target === this.container && !this.isDismissing) {
        this.dismiss();
      }
    });
  }

  private setupStyles(): void {
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.7);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 10002;
      font-family: 'Georgia', serif;
      backdrop-filter: blur(4px);
    `;
  }

  private createContentArea(): HTMLDivElement {
    const content = document.createElement('div');
    content.style.cssText = `
      position: relative;
      width: 90%;
      max-width: 800px;
      max-height: 85vh;
      overflow-y: auto;
      padding: 30px 40px;
      background: rgba(20, 20, 30, 0.95);
      border: 2px solid #ffd700;
      border-radius: 12px;
      box-shadow: 0 0 40px rgba(255, 215, 0, 0.4);
      animation: notifSlideIn 0.3s ease-out;
    `;

    // Add animations
    const style = document.createElement('style');
    style.textContent = `
      @keyframes notifSlideIn {
        from { opacity: 0; transform: translateY(-20px) scale(0.97); }
        to   { opacity: 1; transform: translateY(0)    scale(1);    }
      }
      @keyframes notifSlideOut {
        from { opacity: 1; transform: translateY(0)    scale(1);    }
        to   { opacity: 0; transform: translateY(-12px) scale(0.97); }
      }
      @keyframes pulse {
        0%, 100% { opacity: 0.6; }
        50%       { opacity: 1;   }
      }
      @keyframes notifShimmer {
        0%   { background-position: -200% center; }
        100% { background-position:  200% center; }
      }
      .notif-shimmer-title {
        background: linear-gradient(90deg, #FFD700 25%, #FFF8DC 50%, #FFD700 75%);
        background-size: 200% auto;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        animation: notifShimmer 2.5s linear infinite;
      }
    `;
    document.head.appendChild(style);

    return content;
  }

  /**
   * Show a notification
   */
  show(notification: NotificationContent): void {
    const now = performance.now();

    // If already showing a notification, queue this one (with cap)
    if (this.currentNotification || this.isDismissing) {
      if (this.queue.length < MAX_QUEUE) {
        this.queue.push(notification);
      }
      return;
    }

    // Global cooldown between modals
    if (now - this.lastShownAt < MODAL_COOLDOWN_MS) {
      if (this.queue.length < MAX_QUEUE) {
        this.queue.push(notification);
      }
      return;
    }

    this.currentNotification = notification;
    this.lastShownAt = now;
    this.container.style.display = 'flex';
    this.container.style.opacity = '1';

    // Force animation re-trigger for subsequent shows
    this.contentArea.style.animation = 'none';
    void this.contentArea.offsetWidth; // trigger reflow
    this.contentArea.style.animation = 'notifSlideIn 0.3s ease-out';

    this.render();
    this.renderProgressBar(notification);

    // Setup auto-dismiss if specified
    if (notification.autoDismiss && notification.autoDismiss > 0) {
      this.autoDismissTimeout = window.setTimeout(() => {
        this.dismiss();
      }, notification.autoDismiss);
    }
  }

  /**
   * Dismiss the current notification
   */
  dismiss(): void {
    if (this.isDismissing || !this.currentNotification) return;
    this.isDismissing = true;

    if (this.autoDismissTimeout) {
      clearTimeout(this.autoDismissTimeout);
      this.autoDismissTimeout = null;
    }

    const onDismiss = this.currentNotification.onDismiss;
    this.currentNotification = null;

    // Animate out: slide content up, fade overlay
    this.contentArea.style.animation = 'notifSlideOut 0.22s ease-in forwards';
    this.container.style.transition = 'opacity 0.22s ease-in';
    this.container.style.opacity = '0';

    window.setTimeout(() => {
      this.isDismissing = false;
      this.container.style.display = 'none';
      this.container.style.transition = '';
      this.container.style.opacity = '1';
      this.progressBarEl = null;

      if (onDismiss) onDismiss();

      // Show next notification in queue
      if (this.queue.length > 0) {
        const next = this.queue.shift()!;
        window.setTimeout(() => this.show(next), 100);
      }
    }, 230);
  }

  /**
   * Clear all queued notifications
   */
  clearQueue(): void {
    this.queue = [];
  }

  /**
   * Render an auto-dismiss countdown bar at the bottom of the content area.
   * Animates from full width to zero over the autoDismiss duration.
   */
  private renderProgressBar(notification: NotificationContent): void {
    // Remove any previous bar
    this.progressBarEl?.remove();
    this.progressBarEl = null;

    if (!notification.autoDismiss || notification.autoDismiss <= 0) return;

    const theme = this.currentTheme;
    const barColor = theme?.borderColor ?? '#ffd700';
    const duration = notification.autoDismiss;

    const bar = document.createElement('div');
    bar.style.cssText = `
      position: absolute;
      bottom: 0;
      left: 0;
      height: 3px;
      width: 100%;
      background: ${barColor};
      border-radius: 0 0 10px 10px;
      opacity: 0.75;
      transition: width ${duration}ms linear;
    `;
    this.contentArea.appendChild(bar);
    this.progressBarEl = bar;

    // Start the shrink in the next two frames (ensures transition fires)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        bar.style.width = '0%';
      });
    });
  }

  /**
   * Render the notification content
   */
  private render(): void {
    if (!this.currentNotification) return;

    const notif = this.currentNotification;
    const theme = this.getTheme(notif.type);
    this.currentTheme = theme;

    const isAchievement = notif.type === 'achievement';
    const titleClass = isAchievement ? 'class="notif-shimmer-title"' : '';
    const titleStyle = isAchievement
      ? `font-size: 26px; margin: 0; letter-spacing: 0.03em;`
      : `color: ${theme.titleColor}; font-size: 24px; margin: 0; text-shadow: 0 0 10px ${theme.glowColor};`;

    let html = `
      <div style="text-align: center; margin-bottom: 25px;">
        <h1 ${titleClass} style="${titleStyle}">
          ${notif.icon || theme.icon} ${this.escapeHtml(notif.title)} ${notif.icon || theme.icon}
        </h1>
        ${notif.subtitle ? `
          <p style="color: ${theme.subtitleColor}; font-size: 14px; margin-top: 10px;">
            ${this.escapeHtml(notif.subtitle)}
          </p>
        ` : ''}
      </div>
    `;

    // Add image if provided
    if (notif.image) {
      const imageSize = notif.image.size === 'small' ? '64px' : notif.image.size === 'large' ? '128px' : '96px';
      html += `
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="${notif.image.src}"
               alt="${notif.image.alt}"
               style="
                 width: ${imageSize};
                 height: ${imageSize};
                 image-rendering: pixelated;
                 image-rendering: crisp-edges;
                 border: 2px solid ${theme.borderColor};
                 border-radius: 8px;
                 background: rgba(0, 0, 0, 0.3);
                 padding: 8px;
               "
               onerror="this.style.display='none';">
        </div>
      `;
    }

    // Add sections
    if (notif.sections && notif.sections.length > 0) {
      for (const section of notif.sections) {
        html += this.renderSection(section, theme);
      }
    }

    // Add buttons
    if (notif.buttons && notif.buttons.length > 0) {
      html += `
        <div style="text-align: center; margin-top: 30px; display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
      `;

      notif.buttons.forEach((btn, idx) => {
        const btnStyle = this.getButtonStyle(btn.style || 'secondary', theme);
        html += `
          <button id="notif-btn-${idx}" style="${btnStyle}">
            ${this.escapeHtml(btn.text)}
          </button>
        `;
      });

      html += `</div>`;
    }

    // Add dismiss hint if no buttons
    if (!notif.buttons || notif.buttons.length === 0) {
      html += `
        <div style="text-align: center; margin-top: 25px; color: #888; font-size: 12px;">
          Press ESC or click outside to dismiss
        </div>
      `;
    }

    this.contentArea.innerHTML = html;

    // Attach button click handlers
    if (notif.buttons) {
      notif.buttons.forEach((btn, idx) => {
        const btnElement = document.getElementById(`notif-btn-${idx}`);
        if (btnElement) {
          this.attachButtonHandlers(btnElement, btn);
        }
      });
    }
  }

  /**
   * Render a content section
   */
  private renderSection(section: NotificationSection, theme: NotificationTheme): string {
    const sectionTheme = this.getSectionTheme(section.style || 'default', theme);

    let contentHtml = '';

    // Handle different content types
    if (typeof section.content === 'string') {
      contentHtml = `
        <div style="color: #e0e0e0; font-size: 13px; line-height: 1.6;">
          ${this.escapeHtml(section.content)}
        </div>
      `;
    } else if (Array.isArray(section.content)) {
      contentHtml = `
        <div style="color: #e0e0e0; font-size: 13px; line-height: 1.5;">
          ${section.content.map(item => `<div style="margin: 4px 0;">• ${this.escapeHtml(item)}</div>`).join('')}
        </div>
      `;
    } else {
      // Object/record - display as key-value pairs
      contentHtml = `
        <div style="color: #e0e0e0; font-size: 13px;">
          ${Object.entries(section.content).map(([key, value]) => `
            <div style="margin: 6px 0;">
              <span style="color: ${sectionTheme.labelColor}; font-weight: bold;">${this.escapeHtml(key)}:</span>
              <span style="margin-left: 8px;">${this.escapeHtml(value)}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    return `
      <div style="margin-bottom: 18px; padding: 16px; background: ${sectionTheme.bg}; border-radius: 8px; border-left: 4px solid ${sectionTheme.borderColor};">
        ${section.title ? `
          <div style="color: ${sectionTheme.titleColor}; font-size: 14px; font-weight: bold; margin-bottom: 10px;">
            ${section.icon || ''} ${this.escapeHtml(section.title)}
          </div>
        ` : ''}
        ${contentHtml}
      </div>
    `;
  }

  /**
   * Attach button event handlers
   */
  private attachButtonHandlers(element: HTMLElement, button: NotificationButton): void {
    element.addEventListener('click', () => {
      button.action();
      this.dismiss();
    });

    // Hover effects
    const originalBg = element.style.background;
    const originalTransform = element.style.transform;

    element.addEventListener('mouseenter', () => {
      element.style.opacity = '0.9';
      element.style.transform = 'translateY(-2px)';
    });

    element.addEventListener('mouseleave', () => {
      element.style.opacity = '1';
      element.style.transform = originalTransform;
    });
  }

  /**
   * Get theme colors for notification type
   */
  private getTheme(type: NotificationType): NotificationTheme {
    const themes: Record<NotificationType, NotificationTheme> = {
      info: {
        icon: 'ℹ️',
        titleColor: '#87CEEB',
        subtitleColor: '#6AACCD',
        borderColor: '#4A90B0',
        glowColor: 'rgba(135, 206, 235, 0.3)',
        primaryBtnBg: '#87CEEB',
        primaryBtnColor: '#1a1a2e',
      },
      success: {
        icon: '✅',
        titleColor: '#90EE90',
        subtitleColor: '#76D376',
        borderColor: '#5CB85C',
        glowColor: 'rgba(144, 238, 144, 0.3)',
        primaryBtnBg: '#5CB85C',
        primaryBtnColor: '#fff',
      },
      warning: {
        icon: '⚠️',
        titleColor: '#FFD700',
        subtitleColor: '#E6C200',
        borderColor: '#CCA300',
        glowColor: 'rgba(255, 215, 0, 0.3)',
        primaryBtnBg: '#FFD700',
        primaryBtnColor: '#1a1a2e',
      },
      error: {
        icon: '❌',
        titleColor: '#FF6B6B',
        subtitleColor: '#E65555',
        borderColor: '#CC4444',
        glowColor: 'rgba(255, 107, 107, 0.3)',
        primaryBtnBg: '#DC143C',
        primaryBtnColor: '#fff',
      },
      event: {
        icon: '✨',
        titleColor: '#DDA0DD',
        subtitleColor: '#C78FC7',
        borderColor: '#A66FA6',
        glowColor: 'rgba(221, 160, 221, 0.3)',
        primaryBtnBg: '#DDA0DD',
        primaryBtnColor: '#1a1a2e',
      },
      discovery: {
        icon: '🔍',
        titleColor: '#FFB84D',
        subtitleColor: '#E6A43D',
        borderColor: '#CC8F2D',
        glowColor: 'rgba(255, 184, 77, 0.3)',
        primaryBtnBg: '#FFB84D',
        primaryBtnColor: '#1a1a2e',
      },
      achievement: {
        icon: '🏆',
        titleColor: '#FFD700',
        subtitleColor: '#E6C200',
        borderColor: '#CCA300',
        glowColor: 'rgba(255, 215, 0, 0.4)',
        primaryBtnBg: '#FFD700',
        primaryBtnColor: '#1a1a2e',
      },
    };

    return themes[type] || themes.info;
  }

  /**
   * Get section styling
   */
  private getSectionTheme(style: string, baseTheme: NotificationTheme): SectionTheme {
    const themes: Record<string, SectionTheme> = {
      default: {
        bg: 'rgba(0, 0, 0, 0.3)',
        borderColor: baseTheme.borderColor,
        titleColor: baseTheme.titleColor,
        labelColor: '#ddd',
      },
      highlighted: {
        bg: 'rgba(255, 215, 0, 0.15)',
        borderColor: '#FFD700',
        titleColor: '#FFD700',
        labelColor: '#FFD700',
      },
      warning: {
        bg: 'rgba(255, 107, 107, 0.15)',
        borderColor: '#FF6B6B',
        titleColor: '#FF6B6B',
        labelColor: '#FF6B6B',
      },
      success: {
        bg: 'rgba(144, 238, 144, 0.15)',
        borderColor: '#90EE90',
        titleColor: '#90EE90',
        labelColor: '#90EE90',
      },
      info: {
        bg: 'rgba(135, 206, 235, 0.15)',
        borderColor: '#87CEEB',
        titleColor: '#87CEEB',
        labelColor: '#87CEEB',
      },
    };

    return (themes[style] || themes.default) as SectionTheme;
  }

  /**
   * Get button styling
   */
  private getButtonStyle(style: 'primary' | 'secondary' | 'danger', theme: NotificationTheme): string {
    const baseStyle = `
      padding: 12px 24px;
      font-size: 14px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: bold;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
      transition: all 0.2s;
    `;

    switch (style) {
      case 'primary':
        return baseStyle + `
          background: ${theme.primaryBtnBg};
          color: ${theme.primaryBtnColor};
        `;
      case 'danger':
        return baseStyle + `
          background: #DC143C;
          color: #fff;
        `;
      case 'secondary':
      default:
        return baseStyle + `
          background: rgba(255, 255, 255, 0.1);
          color: #ddd;
          border: 2px solid #666;
        `;
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

interface NotificationTheme {
  icon: string;
  titleColor: string;
  subtitleColor: string;
  borderColor: string;
  glowColor: string;
  primaryBtnBg: string;
  primaryBtnColor: string;
}

interface SectionTheme {
  bg: string;
  borderColor: string;
  titleColor: string;
  labelColor: string;
}
