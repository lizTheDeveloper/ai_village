/**
 * SpeechBubbleOverlay - React-based HTML overlay for speech bubbles with alien text tooltips
 *
 * This component renders speech bubbles as HTML elements positioned over the canvas,
 * allowing use of React components like HoverableAlienText for hover tooltips.
 */

import React, { useEffect, useState } from 'react';
import { HoverableAlienText } from '@ai-village/language';
import type { AlienWordToken } from '@ai-village/language';

interface SpeechBubble {
  agentId: string;
  agentName: string;
  text: string;
  alienTokens?: AlienWordToken[]; // Alien text with translations
  x: number; // Screen position in pixels
  y: number;
  timestamp: number;
  duration: number; // How long to display (ms)
}

interface SpeechBubbleOverlayProps {
  bubbles: SpeechBubble[];
  onBubbleExpire: (agentId: string) => void;
}

/**
 * Individual speech bubble component with alien text support
 */
const SpeechBubbleElement: React.FC<{
  bubble: SpeechBubble;
  onExpire: () => void;
}> = ({ bubble, onExpire }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onExpire();
    }, bubble.duration);

    return () => clearTimeout(timer);
  }, [bubble.timestamp, bubble.duration, onExpire]);

  const hasAlienText = bubble.alienTokens && bubble.alienTokens.length > 0;

  return (
    <div
      className="speech-bubble"
      style={{
        position: 'absolute',
        left: `${bubble.x}px`,
        top: `${bubble.y}px`,
        transform: 'translate(-50%, -100%)',
        pointerEvents: hasAlienText ? 'auto' : 'none', // Allow hover only for alien text
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          color: '#ffffff',
          padding: '8px 12px',
          borderRadius: '8px',
          fontSize: '14px',
          fontFamily: 'monospace',
          maxWidth: '200px',
          wordWrap: 'break-word',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        }}
      >
        {/* Agent name */}
        <div
          style={{
            fontSize: '11px',
            color: '#888',
            marginBottom: '4px',
            fontWeight: 'bold',
          }}
        >
          {bubble.agentName}
        </div>

        {/* Speech text - with alien text if available */}
        {hasAlienText ? (
          <HoverableAlienText
            renderedText={{
              fullText: bubble.alienTokens!.map(t => t.alien).join(' '),
              tokens: bubble.alienTokens!,
              translation: bubble.text,
              languageId: 'unknown',
            }}
            style="speech-bubble"
            tooltipDelay={200}
          />
        ) : (
          <div>{bubble.text}</div>
        )}

        {/* Speech bubble pointer */}
        <div
          style={{
            position: 'absolute',
            bottom: '-6px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid rgba(0, 0, 0, 0.85)',
          }}
        />
      </div>
    </div>
  );
};

/**
 * Main overlay component that manages all active speech bubbles
 */
export const SpeechBubbleOverlay: React.FC<SpeechBubbleOverlayProps> = ({
  bubbles,
  onBubbleExpire,
}) => {
  return (
    <div
      className="speech-bubble-overlay"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none', // Don't block canvas interactions
        zIndex: 999,
      }}
    >
      {bubbles.map((bubble) => (
        <SpeechBubbleElement
          key={bubble.agentId}
          bubble={bubble}
          onExpire={() => onBubbleExpire(bubble.agentId)}
        />
      ))}
    </div>
  );
};

/**
 * Hook for managing speech bubbles in parent component
 */
export function useSpeechBubbles() {
  const [bubbles, setBubbles] = useState<SpeechBubble[]>([]);

  const registerSpeech = (
    agentId: string,
    agentName: string,
    text: string,
    x: number,
    y: number,
    alienTokens?: AlienWordToken[],
    duration: number = 5000
  ) => {
    const newBubble: SpeechBubble = {
      agentId,
      agentName,
      text,
      alienTokens,
      x,
      y,
      timestamp: Date.now(),
      duration,
    };

    setBubbles((prev) => {
      // Remove existing bubble for this agent
      const filtered = prev.filter((b) => b.agentId !== agentId);
      return [...filtered, newBubble];
    });
  };

  const removeBubble = (agentId: string) => {
    setBubbles((prev) => prev.filter((b) => b.agentId !== agentId));
  };

  const clearAll = () => {
    setBubbles([]);
  };

  return {
    bubbles,
    registerSpeech,
    removeBubble,
    clearAll,
  };
}
