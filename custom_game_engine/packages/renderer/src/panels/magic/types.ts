/**
 * Type definitions for Magic Skill Tree UI components
 */

import type { MagicSkillNode } from '@ai-village/magic';
import type { NodeEvaluationResult } from '@ai-village/magic';

// ============================================================================
// Layout Types
// ============================================================================

/** Position of a node in the tree layout */
export interface NodePosition {
  /** Node ID */
  nodeId: string;
  /** X coordinate in tree space */
  x: number;
  /** Y coordinate in tree space */
  y: number;
  /** Width of node */
  width: number;
  /** Height of node */
  height: number;
}

/** Layout result for an entire tree */
export interface TreeLayout {
  /** Node positions keyed by node ID */
  nodes: Map<string, NodePosition>;
  /** Total bounds of the tree */
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  };
}

/** Layout configuration */
export interface LayoutConfig {
  /** Horizontal spacing between nodes */
  nodeSpacingX: number;
  /** Vertical spacing between nodes */
  nodeSpacingY: number;
  /** Default node width */
  nodeWidth: number;
  /** Default node height */
  nodeHeight: number;
  /** Category-specific Y offsets */
  categoryYOffsets: Record<string, number>;
}

// ============================================================================
// Rendering Types
// ============================================================================

/** Colors for different node states */
export interface NodeColors {
  unlocked: string;      // Green
  available: string;     // Yellow
  locked: string;        // Gray
  hidden: string;        // Dark gray
  forbidden: string;     // Red tint
  hoverBorder: string;   // Highlight color
}

/** Render options for a node */
export interface NodeRenderOptions {
  /** Is the node currently hovered? */
  isHovered: boolean;
  /** Is the node currently selected? */
  isSelected: boolean;
  /** Animation timestamp (for pulsing) */
  timestamp: number;
  /** Should show debug info? */
  showDebug: boolean;
}

/** Result of rendering a node */
export interface NodeRenderResult {
  /** Where to anchor tooltip (if hovered) */
  tooltipAnchor?: {
    x: number;
    y: number;
  };
  /** Click bounds for the node */
  clickBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// ============================================================================
// Interaction Types
// ============================================================================

/** Click result from a node */
export interface NodeClickResult {
  /** Was the click handled? */
  handled: boolean;
  /** Which node was clicked (if any) */
  nodeId?: string;
  /** What action occurred */
  action?: 'unlock' | 'select' | 'hover' | 'none';
}

/** Viewport state for panning/zooming */
export interface Viewport {
  /** X offset in tree space */
  offsetX: number;
  /** Y offset in tree space */
  offsetY: number;
  /** Zoom level (1.0 = 100%) */
  zoom: number;
  /** Min zoom */
  minZoom: number;
  /** Max zoom */
  maxZoom: number;
}

// ============================================================================
// Tooltip Types
// ============================================================================

/** Tooltip content for a node */
export interface TooltipContent {
  /** Node being displayed */
  node: MagicSkillNode;
  /** Evaluation result */
  evaluation: NodeEvaluationResult;
  /** Should show detailed info? */
  detailed: boolean;
}

// ============================================================================
// Tree State Types
// ============================================================================

/** UI state for the skill tree panel */
export interface SkillTreeUIState {
  /** Currently selected entity ID */
  selectedEntityId?: string;
  /** Currently active paradigm */
  activeParadigmId?: string;
  /** Viewport state */
  viewport: Viewport;
  /** Currently hovered node ID */
  hoveredNodeId?: string;
  /** Currently selected node ID */
  selectedNodeId?: string;
  /** Recently discovered node IDs (for highlight animation) */
  recentlyDiscoveredNodes: Set<string>;
  /** Timestamp of last discovery */
  lastDiscoveryTime: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Default colors for node states */
export const DEFAULT_NODE_COLORS: NodeColors = {
  unlocked: '#00ff00',       // Bright green
  available: '#ffff00',      // Bright yellow
  locked: '#888888',         // Gray
  hidden: '#444444',         // Dark gray
  forbidden: '#ff6666',      // Red tint
  hoverBorder: '#ffffff',    // White
};

/** Default layout configuration */
export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  nodeSpacingX: 120,
  nodeSpacingY: 100,
  nodeWidth: 80,
  nodeHeight: 60,
  categoryYOffsets: {
    foundation: 0,
    technique: 200,
    discovery: 200,
    relationship: 200,
    mastery: 400,
    forbidden: 600,
  },
};

/** Category shapes for rendering */
export const CATEGORY_SHAPES: Record<string, 'square' | 'circle' | 'hexagon' | 'diamond'> = {
  foundation: 'square',
  technique: 'circle',
  discovery: 'circle',
  relationship: 'circle',
  mastery: 'hexagon',
  forbidden: 'diamond',
};
