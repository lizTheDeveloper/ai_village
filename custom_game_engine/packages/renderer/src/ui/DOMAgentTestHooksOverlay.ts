/**
 * DOMAgentTestHooksOverlay - DOM markers for automated test interaction with agents
 *
 * Agents are rendered on a WebGL/Canvas2D canvas with no DOM hooks, making automated
 * testing impossible. This overlay creates invisible DOM elements positioned over each
 * visible agent, allowing test frameworks to query agents by name/ID and verify their
 * screen positions.
 *
 * Tests can also listen for custom events dispatched via dispatchAgentSelectedEvent()
 * and dispatchAgentInfoPanelEvent() to verify selection and panel state without
 * relying on canvas pixel inspection.
 *
 * Usage:
 *   const overlay = new DOMAgentTestHooksOverlay(canvasParentElement);
 *   // Each frame:
 *   overlay.updateAgents(agentDataArray);
 *
 * Custom events fired on document:
 *   'mvee:agent-selected'         { agentId, agentName }
 *   'mvee:agent-deselected'       {}
 *   'mvee:agent-info-panel-shown' { agentId }
 *   'mvee:agent-info-panel-hidden' {}
 */

export interface AgentHookData {
  id: string;
  name: string;
  screenX: number;
  screenY: number;
  selected: boolean;
}

export class DOMAgentTestHooksOverlay {
  private container: HTMLDivElement;
  private elements: Map<string, HTMLDivElement> = new Map();

  constructor(parentElement: HTMLElement) {
    this.container = document.createElement('div');
    this.container.className = 'agent-test-hooks-overlay';
    this.container.setAttribute('data-testid', 'agent-test-hooks-overlay');
    this.container.style.position = 'absolute';
    this.container.style.top = '0';
    this.container.style.left = '0';
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.container.style.pointerEvents = 'none';
    this.container.style.zIndex = '5';
    this.container.style.overflow = 'hidden';
    parentElement.appendChild(this.container);
  }

  /**
   * Update DOM marker positions to match current agent screen coordinates.
   * Call from the render loop (throttled is fine — every 3 frames is sufficient).
   * Agents that are no longer visible are removed.
   */
  updateAgents(agents: AgentHookData[]): void {
    const seen = new Set<string>();

    for (const agent of agents) {
      seen.add(agent.id);
      let el = this.elements.get(agent.id);

      if (!el) {
        el = document.createElement('div');
        el.setAttribute('data-testid', `agent-${agent.id}`);
        el.setAttribute('data-agent-id', agent.id);
        el.style.position = 'absolute';
        el.style.width = '24px';
        el.style.height = '24px';
        el.style.pointerEvents = 'none';
        // Centre element on agent sprite
        el.style.transform = 'translate(-50%, -50%)';
        this.container.appendChild(el);
        this.elements.set(agent.id, el);
      }

      el.setAttribute('data-agent-name', agent.name);
      el.setAttribute('data-selected', String(agent.selected));
      el.style.left = `${agent.screenX}px`;
      el.style.top = `${agent.screenY}px`;
    }

    // Remove markers for agents that are off-screen or gone
    for (const [id, el] of this.elements) {
      if (!seen.has(id)) {
        el.remove();
        this.elements.delete(id);
      }
    }
  }

  destroy(): void {
    this.elements.clear();
    this.container.remove();
  }
}

/**
 * Dispatch a custom event when an agent is selected.
 * Listen on document: document.addEventListener('mvee:agent-selected', ...)
 */
export function dispatchAgentSelectedEvent(agentId: string, agentName: string): void {
  document.dispatchEvent(new CustomEvent('mvee:agent-selected', {
    bubbles: false,
    detail: { agentId, agentName },
  }));
}

/**
 * Dispatch a custom event when agent selection is cleared.
 */
export function dispatchAgentDeselectedEvent(): void {
  document.dispatchEvent(new CustomEvent('mvee:agent-deselected', {
    bubbles: false,
    detail: {},
  }));
}

/**
 * Dispatch a custom event when the agent info panel becomes visible.
 */
export function dispatchAgentInfoPanelShownEvent(agentId: string): void {
  document.dispatchEvent(new CustomEvent('mvee:agent-info-panel-shown', {
    bubbles: false,
    detail: { agentId },
  }));
}

/**
 * Dispatch a custom event when the agent info panel is hidden.
 */
export function dispatchAgentInfoPanelHiddenEvent(): void {
  document.dispatchEvent(new CustomEvent('mvee:agent-info-panel-hidden', {
    bubbles: false,
    detail: {},
  }));
}
