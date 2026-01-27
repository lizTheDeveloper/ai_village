import { useEffect, useRef, useState } from 'react';
import cytoscape, { Core, NodeSingular } from 'cytoscape';
// @ts-ignore - no types available
import coseBilkent from 'cytoscape-cose-bilkent';
import { useMetricsStore, NetworkData, AgentDetails } from '../store/metricsStore';
import './NetworkView.css';

cytoscape.use(coseBilkent);

const COMMUNITY_COLORS = [
  '#646cff',
  '#4caf50',
  '#ff9800',
  '#e91e63',
  '#9c27b0',
  '#00bcd4',
  '#ffeb3b',
  '#795548',
];

interface NetworkViewProps {
  data?: NetworkData | null;
  loading?: boolean;
  onNodeClick?: (agentId: string) => void;
  selectedAgent?: AgentDetails | null;
  filterCommunity?: number;
  minCentrality?: number;
}

export function NetworkView({
  data: propData,
  loading: propLoading,
  onNodeClick: propOnNodeClick,
  selectedAgent: propSelectedAgent,
  filterCommunity,
  minCentrality,
}: NetworkViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [detailsPanel, setDetailsPanel] = useState<AgentDetails | null>(null);

  const storeData = useMetricsStore((state) => state.networkData);
  const storeLoading = useMetricsStore((state) => state.isLoading);
  const selectedAgent = useMetricsStore((state) => state.selectedAgent);

  const data = propData !== undefined ? propData : storeData;
  const loading = propLoading !== undefined ? propLoading : storeLoading;
  const onNodeClick = propOnNodeClick || ((_agentId: string) => {
    // Fetch agent details and set in store
    setDetailsPanel(selectedAgent);
  });
  const agentDetails = propSelectedAgent !== undefined ? propSelectedAgent : selectedAgent;

  useEffect(() => {
    if (!data) {
      return;
    }

    if (!data.nodes || !Array.isArray(data.nodes)) {
      throw new Error('NetworkView requires data with nodes array');
    }

    if (!data.edges || !Array.isArray(data.edges)) {
      throw new Error('NetworkView requires data with edges array');
    }

    if (!containerRef.current) {
      return;
    }

    let filteredNodes = data.nodes;
    if (filterCommunity !== undefined) {
      filteredNodes = filteredNodes.filter((n) => n.community === filterCommunity);
    }
    if (minCentrality !== undefined) {
      filteredNodes = filteredNodes.filter((n) => n.centrality >= minCentrality);
    }

    const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = data.edges.filter(
      (e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target)
    );

    const elements = {
      nodes: filteredNodes.map((node) => ({
        data: {
          id: node.id,
          label: node.name,
          centrality: node.centrality,
          community: node.community,
        },
      })),
      edges: filteredEdges.map((edge) => ({
        data: {
          source: edge.source,
          target: edge.target,
          weight: edge.weight,
        },
      })),
    };

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': (ele: NodeSingular) => {
              const community = ele.data('community') as number;
              return COMMUNITY_COLORS[community % COMMUNITY_COLORS.length] || '#666';
            },
            'label': 'data(label)',
            'width': (ele: NodeSingular) => {
              const centrality = ele.data('centrality') as number;
              return 20 + centrality * 40;
            },
            'height': (ele: NodeSingular) => {
              const centrality = ele.data('centrality') as number;
              return 20 + centrality * 40;
            },
            'font-size': '10px',
            'color': '#fff',
            'text-outline-width': 2,
            'text-outline-color': '#000',
          },
        },
        {
          selector: 'edge',
          style: {
            'width': (ele: any) => {
              const weight = ele.data('weight') as number;
              return 1 + weight * 5;
            },
            'line-color': '#666',
            'target-arrow-color': '#666',
            'curve-style': 'bezier',
            'opacity': 0.6,
          },
        },
      ],
      layout: {
        name: 'cose-bilkent',
        animate: true,
        animationDuration: 1000,
        nodeRepulsion: 4500,
        idealEdgeLength: 100,
        edgeElasticity: 0.45,
        nestingFactor: 0.1,
        gravity: 0.25,
        numIter: 2500,
        tile: true,
      } satisfies { name: string; [key: string]: unknown },
    });

    cy.on('tap', 'node', (event) => {
      const node = event.target;
      const agentId = node.data('id') as string;
      onNodeClick(agentId);
      setDetailsPanel({
        id: agentId,
        name: node.data('label') as string,
        centrality: node.data('centrality') as number,
        community: node.data('community') as number,
        connections: [],
        behaviors: [],
        wealth: 0,
        position: { x: 0, y: 0 },
        innovationCount: 0,
      });
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
    };
  }, [data, filterCommunity, minCentrality, onNodeClick]);

  const handleZoomIn = () => {
    cyRef.current?.zoom({
      level: cyRef.current.zoom() * 1.2,
      renderedPosition: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    });
  };

  const handleZoomOut = () => {
    cyRef.current?.zoom({
      level: cyRef.current.zoom() * 0.8,
      renderedPosition: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    });
  };

  const handleFit = () => {
    cyRef.current?.fit();
  };

  if (loading) {
    return <div className="view-container">Loading network graph...</div>;
  }

  if (!data) {
    return (
      <div className="view-container">
        <div className="error">No network data available</div>
      </div>
    );
  }

  if (data.nodes === null) {
    return (
      <div className="view-container">
        <div className="error">Error loading network data</div>
      </div>
    );
  }

  return (
    <div className="view-container network-view">
      <div className="view-header">
        <h2>Social Network</h2>
        <div className="controls">
          <button onClick={handleZoomIn} aria-label="zoom in">
            Zoom In
          </button>
          <button onClick={handleZoomOut} aria-label="zoom out">
            Zoom Out
          </button>
          <button onClick={handleFit} aria-label="fit to screen">
            Fit
          </button>
        </div>
      </div>
      <div className="network-content">
        <div ref={containerRef} data-testid="network-graph" className="graph-container" />
        {(detailsPanel || agentDetails) && (
          <div className="details-panel">
            <h3>{(detailsPanel || agentDetails)!.name}</h3>
            <div className="detail-row">
              <span>Centrality:</span>
              <span>{(detailsPanel || agentDetails)!.centrality.toFixed(2)}</span>
            </div>
            <div className="detail-row">
              <span>Community:</span>
              <span>{(detailsPanel || agentDetails)!.community}</span>
            </div>
            <div className="detail-row">
              <span>Connections:</span>
              <span>{(detailsPanel || agentDetails)!.connections?.length || 0}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default NetworkView;
