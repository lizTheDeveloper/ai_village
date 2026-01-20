/**
 * Hoverable Alien Text Component
 *
 * React component for displaying alien language text with hover tooltips.
 * Shows English translation when user hovers over alien words.
 *
 * Usage:
 * - Speech bubbles
 * - In-game books/scrolls
 * - Poems and writing
 * - Research papers
 * - Newspaper articles
 */

import React, { useState } from 'react';
import type { RenderedAlienText, AlienWordToken } from '../AlienTextRenderer.js';

/**
 * Props for HoverableAlienText component
 */
export interface HoverableAlienTextProps {
  /**
   * Rendered alien text data
   */
  renderedText: RenderedAlienText;

  /**
   * CSS class name for container
   */
  className?: string;

  /**
   * Show full translation below text
   */
  showTranslation?: boolean;

  /**
   * Tooltip position
   * @default 'top'
   */
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';

  /**
   * Tooltip delay in ms
   * @default 300
   */
  tooltipDelay?: number;

  /**
   * Style preset
   * @default 'default'
   */
  style?: 'default' | 'speech-bubble' | 'book' | 'newspaper';
}

/**
 * Hoverable word with tooltip
 */
const HoverableWord: React.FC<{
  token: AlienWordToken;
  tooltipPosition: 'top' | 'bottom' | 'left' | 'right';
  tooltipDelay: number;
}> = ({ token, tooltipPosition, tooltipDelay }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [hoverTimer, setHoverTimer] = useState<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    const timer = setTimeout(() => {
      setShowTooltip(true);
    }, tooltipDelay);
    setHoverTimer(timer);
  };

  const handleMouseLeave = () => {
    if (hoverTimer) {
      clearTimeout(hoverTimer);
    }
    setShowTooltip(false);
    setHoverTimer(null);
  };

  return (
    <span
      className="alien-word"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'relative',
        cursor: 'help',
        borderBottom: '1px dotted currentColor',
        padding: '0 2px',
      }}
    >
      {token.alien}
      {showTooltip && (
        <span
          className={`alien-tooltip alien-tooltip-${tooltipPosition}`}
          style={{
            position: 'absolute',
            background: 'rgba(0, 0, 0, 0.9)',
            color: '#fff',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '0.85em',
            whiteSpace: 'nowrap',
            zIndex: 1000,
            pointerEvents: 'none',
            ...getTooltipPosition(tooltipPosition),
          }}
        >
          <strong>{token.english}</strong>
          {token.wordType && (
            <span style={{ opacity: 0.7, marginLeft: '6px', fontStyle: 'italic' }}>
              ({token.wordType})
            </span>
          )}
          {token.context && (
            <span style={{ opacity: 0.6, marginLeft: '6px', fontSize: '0.9em' }}>
              • {token.context}
            </span>
          )}
        </span>
      )}
    </span>
  );
};

/**
 * Get tooltip position styles
 */
function getTooltipPosition(position: 'top' | 'bottom' | 'left' | 'right'): React.CSSProperties {
  switch (position) {
    case 'top':
      return { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '4px' };
    case 'bottom':
      return { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '4px' };
    case 'left':
      return { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: '4px' };
    case 'right':
      return { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: '4px' };
  }
}

/**
 * Get style preset CSS
 */
function getStylePreset(style: string): React.CSSProperties {
  switch (style) {
    case 'speech-bubble':
      return {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        border: '2px solid #333',
        borderRadius: '12px',
        padding: '12px 16px',
        position: 'relative',
        maxWidth: '300px',
        fontFamily: 'serif',
        fontSize: '14px',
        lineHeight: '1.5',
      };
    case 'book':
      return {
        fontFamily: 'Georgia, serif',
        fontSize: '16px',
        lineHeight: '1.8',
        color: '#2c1810',
        padding: '20px',
        backgroundColor: '#f4e8d0',
        border: '1px solid #c9b896',
        borderRadius: '4px',
      };
    case 'newspaper':
      return {
        fontFamily: '"Times New Roman", serif',
        fontSize: '14px',
        lineHeight: '1.6',
        color: '#1a1a1a',
        columnCount: 2,
        columnGap: '20px',
        padding: '16px',
      };
    default:
      return {
        fontFamily: 'inherit',
        fontSize: 'inherit',
        lineHeight: '1.5',
      };
  }
}

/**
 * Hoverable Alien Text Component
 *
 * Displays alien text with hover-for-translation tooltips.
 *
 * @example
 * ```tsx
 * <HoverableAlienText
 *   renderedText={renderedAlienText}
 *   showTranslation={true}
 *   style="speech-bubble"
 *   tooltipPosition="top"
 * />
 * ```
 */
export const HoverableAlienText: React.FC<HoverableAlienTextProps> = ({
  renderedText,
  className = '',
  showTranslation = false,
  tooltipPosition = 'top',
  tooltipDelay = 300,
  style = 'default',
}) => {
  const presetStyle = getStylePreset(style);

  return (
    <div className={`alien-text-container ${className}`} style={presetStyle}>
      <div className="alien-text-content" style={{ marginBottom: showTranslation ? '8px' : 0 }}>
        {renderedText.tokens.map((token, index) => (
          <React.Fragment key={index}>
            {index > 0 && <span> </span>}
            <HoverableWord
              token={token}
              tooltipPosition={tooltipPosition}
              tooltipDelay={tooltipDelay}
            />
          </React.Fragment>
        ))}
      </div>

      {showTranslation && (
        <div
          className="alien-text-translation"
          style={{
            fontSize: '0.9em',
            opacity: 0.7,
            fontStyle: 'italic',
            borderTop: '1px solid rgba(0,0,0,0.1)',
            paddingTop: '8px',
            marginTop: '8px',
          }}
        >
          Translation: {renderedText.translation}
        </div>
      )}
    </div>
  );
};

/**
 * Multi-line alien text (for poems, articles, etc.)
 */
export interface MultiLineAlienTextProps {
  /**
   * Array of rendered lines
   */
  lines: RenderedAlienText[];

  /**
   * CSS class name for container
   */
  className?: string;

  /**
   * Show translations for each line
   */
  showTranslations?: boolean;

  /**
   * Tooltip position
   */
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';

  /**
   * Style preset
   */
  style?: 'default' | 'speech-bubble' | 'book' | 'newspaper';
}

/**
 * Multi-line Hoverable Alien Text
 *
 * For poems, paragraphs, articles, etc.
 *
 * @example
 * ```tsx
 * <MultiLineAlienText
 *   lines={poemLines}
 *   showTranslations={true}
 *   style="book"
 * />
 * ```
 */
export const MultiLineAlienText: React.FC<MultiLineAlienTextProps> = ({
  lines,
  className = '',
  showTranslations = false,
  tooltipPosition = 'top',
  style = 'default',
}) => {
  const presetStyle = getStylePreset(style);

  return (
    <div className={`alien-text-multiline ${className}`} style={presetStyle}>
      {lines.map((line, lineIndex) => (
        <div key={lineIndex} style={{ marginBottom: '12px' }}>
          <HoverableAlienText
            renderedText={line}
            showTranslation={showTranslations}
            tooltipPosition={tooltipPosition}
            style="default" // Don't double-apply preset
          />
        </div>
      ))}
    </div>
  );
};
