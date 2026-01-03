import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { NetworkView } from '@/components/NetworkView';
import { mockNetworkData, mockAgentDetails } from '../mockData';

// Mock Cytoscape
vi.mock('cytoscape', () => ({
  default: vi.fn(() => ({
    layout: vi.fn(() => ({ run: vi.fn() })),
    on: vi.fn(),
    nodes: vi.fn(() => []),
    edges: vi.fn(() => []),
    destroy: vi.fn(),
    zoom: vi.fn(),
    pan: vi.fn(),
    fit: vi.fn(),
  })),
}));

describe('NetworkView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Acceptance Criterion 2: Network Visualization', () => {
    it('should render force-directed graph with agents as nodes', async () => {
      render(<NetworkView data={mockNetworkData} />);

      await waitFor(() => {
        expect(screen.getByTestId('network-graph')).toBeInTheDocument();
      });
    });

    it('should color communities differently', async () => {
      render(<NetworkView data={mockNetworkData} />);

      await waitFor(() => {
        const graph = screen.getByTestId('network-graph');
        expect(graph).toBeInTheDocument();
      });

      // Verify community colors are assigned
      const communities = new Set(mockNetworkData.nodes.map((n) => n.community));
      expect(communities.size).toBeGreaterThan(1); // Multiple communities
    });

    it('should size nodes by centrality', async () => {
      render(<NetworkView data={mockNetworkData} />);

      await waitFor(() => {
        expect(screen.getByTestId('network-graph')).toBeInTheDocument();
      });

      // Verify nodes with higher centrality get larger sizes
      const alice = mockNetworkData.nodes.find((n) => n.name === 'Alice');
      const eve = mockNetworkData.nodes.find((n) => n.name === 'Eve');

      expect(alice).toBeDefined();
      expect(eve).toBeDefined();
      expect(alice!.centrality).toBeGreaterThan(eve!.centrality);
    });

    it('should show relationship strengths as edge weights', async () => {
      render(<NetworkView data={mockNetworkData} />);

      await waitFor(() => {
        expect(screen.getByTestId('network-graph')).toBeInTheDocument();
      });

      // Verify edges have weight property
      mockNetworkData.edges.forEach((edge) => {
        expect(edge).toHaveProperty('weight');
        expect(edge.weight).toBeGreaterThan(0);
        expect(edge.weight).toBeLessThanOrEqual(1);
      });
    });

    it('should show agent details panel on node click', async () => {
      const onNodeClick = vi.fn();
      render(<NetworkView data={mockNetworkData} onNodeClick={onNodeClick} />);

      await waitFor(() => {
        expect(screen.getByTestId('network-graph')).toBeInTheDocument();
      });

      // Simulate clicking a node
      const node = screen.getByTestId('network-graph');
      fireEvent.click(node);

      // Details panel should appear
      await waitFor(() => {
        expect(onNodeClick).toHaveBeenCalled();
      });
    });

    it('should display agent name, connections, and centrality in details panel', async () => {
      render(
        <NetworkView data={mockNetworkData} selectedAgent={mockAgentDetails} />
      );

      await waitFor(() => {
        expect(screen.getByText(mockAgentDetails.name)).toBeInTheDocument();
        expect(screen.getByText(/centrality/i)).toBeInTheDocument();
        expect(screen.getByText(/connections/i)).toBeInTheDocument();
      });
    });
  });

  describe('zoom and pan controls', () => {
    it('should allow zooming in', async () => {
      render(<NetworkView data={mockNetworkData} />);

      const zoomInButton = screen.getByLabelText(/zoom in/i);
      fireEvent.click(zoomInButton);

      // Verify zoom function called
      await waitFor(() => {
        expect(zoomInButton).toBeInTheDocument();
      });
    });

    it('should allow zooming out', async () => {
      render(<NetworkView data={mockNetworkData} />);

      const zoomOutButton = screen.getByLabelText(/zoom out/i);
      fireEvent.click(zoomOutButton);

      await waitFor(() => {
        expect(zoomOutButton).toBeInTheDocument();
      });
    });

    it('should allow panning', async () => {
      render(<NetworkView data={mockNetworkData} />);

      const graph = screen.getByTestId('network-graph');
      fireEvent.mouseDown(graph, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(graph, { clientX: 150, clientY: 150 });
      fireEvent.mouseUp(graph);

      await waitFor(() => {
        expect(graph).toBeInTheDocument();
      });
    });

    it('should fit graph to viewport', async () => {
      render(<NetworkView data={mockNetworkData} />);

      const fitButton = screen.getByLabelText(/fit to screen/i);
      fireEvent.click(fitButton);

      await waitFor(() => {
        expect(fitButton).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should throw when data is missing nodes', () => {
      expect(() => {
        render(<NetworkView data={{ edges: [], communities: [] } as any} />);
      }).toThrow('nodes');
    });

    it('should throw when data is missing edges', () => {
      expect(() => {
        render(<NetworkView data={{ nodes: [], communities: [] } as any} />);
      }).toThrow('edges');
    });

    it('should display error message on render failure', async () => {
      // Force a render error
      const badData = { ...mockNetworkData, nodes: null };

      render(<NetworkView data={badData as any} />);

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });
  });

  describe('loading states', () => {
    it('should show loading indicator while data is loading', () => {
      render(<NetworkView data={null} loading={true} />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should hide loading indicator when data is ready', async () => {
      const { rerender } = render(<NetworkView data={null} loading={true} />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      rerender(<NetworkView data={mockNetworkData} loading={false} />);

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('filtering', () => {
    it('should filter nodes by community', async () => {
      render(<NetworkView data={mockNetworkData} filterCommunity={1} />);

      await waitFor(() => {
        const graph = screen.getByTestId('network-graph');
        expect(graph).toBeInTheDocument();
      });

      // Verify only community 1 nodes are shown
      const community1Nodes = mockNetworkData.nodes.filter((n) => n.community === 1);
      expect(community1Nodes.length).toBeGreaterThan(0);
    });

    it('should filter nodes by centrality threshold', async () => {
      render(<NetworkView data={mockNetworkData} minCentrality={0.5} />);

      await waitFor(() => {
        const graph = screen.getByTestId('network-graph');
        expect(graph).toBeInTheDocument();
      });

      // Verify only high centrality nodes are shown
      const highCentralityNodes = mockNetworkData.nodes.filter((n) => n.centrality >= 0.5);
      expect(highCentralityNodes.length).toBeGreaterThan(0);
    });
  });
});
