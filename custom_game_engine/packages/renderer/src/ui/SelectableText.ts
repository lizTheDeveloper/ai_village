/**
 * SelectableText - HTML textarea overlay for copyable text on canvas
 *
 * Creates and manages an HTML textarea that overlays the canvas,
 * allowing users to select and copy text that would otherwise be
 * rendered as canvas graphics.
 */
export class SelectableText {
  private textarea: HTMLTextAreaElement | null = null;
  private readonly id: string;
  private lastContent: string = '';

  constructor(id: string) {
    this.id = id;
  }

  /**
   * Get or create the textarea element.
   */
  private getTextarea(): HTMLTextAreaElement {
    if (!this.textarea) {
      this.textarea = document.createElement('textarea');
      this.textarea.id = this.id;
      this.textarea.style.cssText = `
        position: fixed;
        background: rgba(20, 20, 30, 0.95);
        color: #CCCCCC;
        border: 1px solid rgba(100, 100, 120, 0.8);
        font-family: monospace;
        font-size: 10px;
        line-height: 1.4;
        padding: 8px;
        resize: none;
        overflow-y: auto;
        white-space: pre-wrap;
        word-wrap: break-word;
        box-sizing: border-box;
        z-index: 10000;
        pointer-events: auto;
      `;
      this.textarea.readOnly = true;
      document.body.appendChild(this.textarea);
    }
    return this.textarea;
  }

  /**
   * Show the textarea at the specified position with content.
   *
   * @param canvasRect - The canvas bounding rect (from getBoundingClientRect)
   * @param screenX - X position of the window on the canvas
   * @param screenY - Y position of the window on the canvas (content area, after title bar)
   * @param offsetX - X offset within the window content area
   * @param offsetY - Y offset within the window content area
   * @param width - Width of the textarea
   * @param height - Height of the textarea
   * @param content - Text content to display
   */
  show(
    canvasRect: DOMRect,
    screenX: number,
    screenY: number,
    offsetX: number,
    offsetY: number,
    width: number,
    height: number,
    content: string
  ): void {
    const textarea = this.getTextarea();

    // Calculate absolute position
    const finalLeft = canvasRect.left + screenX + offsetX;
    const finalTop = canvasRect.top + screenY + offsetY;
    const finalWidth = Math.max(200, width);
    const finalHeight = Math.max(100, height);

    textarea.style.display = 'block';
    textarea.style.left = `${finalLeft}px`;
    textarea.style.top = `${finalTop}px`;
    textarea.style.width = `${finalWidth}px`;
    textarea.style.height = `${finalHeight}px`;
    textarea.style.visibility = 'visible';
    textarea.style.opacity = '1';

    // Only update content if it changed (avoids cursor reset)
    if (content !== this.lastContent) {
      textarea.value = content;
      this.lastContent = content;
    }
  }

  /**
   * Hide the textarea.
   */
  hide(): void {
    if (this.textarea) {
      this.textarea.style.display = 'none';
    }
  }

  /**
   * Check if the textarea is currently visible.
   */
  isVisible(): boolean {
    return this.textarea?.style.display === 'block';
  }

  /**
   * Get the current content.
   */
  getContent(): string {
    return this.lastContent;
  }

  /**
   * Clean up the textarea element.
   */
  destroy(): void {
    if (this.textarea && this.textarea.parentNode) {
      this.textarea.parentNode.removeChild(this.textarea);
    }
    this.textarea = null;
    this.lastContent = '';
  }

  /**
   * Apply custom styles to the textarea.
   */
  setStyles(styles: Partial<CSSStyleDeclaration>): void {
    const textarea = this.getTextarea();
    Object.assign(textarea.style, styles);
  }
}
