import { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useMetricsStore, CulturalData } from '../store/metricsStore';
import './CulturalDiffusionView.css';

interface CulturalDiffusionViewProps {
  data?: CulturalData | null;
  loading?: boolean;
  showCascades?: boolean;
  showAdoption?: boolean;
  showTransmissionRates?: boolean;
  filterBehavior?: string;
}

interface CascadeNode {
  agent: string;
  timestamp: number;
  children: CascadeNode[];
}

// CascadeTree interface for documentation purposes
// interface _CascadeTree {
//   behavior: string;
//   root: string;
//   children: CascadeNode[];
// }

export function CulturalDiffusionView({
  data: propData,
  loading: propLoading,
  showCascades = false,
  showAdoption = false,
  showTransmissionRates = false,
  filterBehavior: _filterBehavior,
}: CulturalDiffusionViewProps) {
  const sankeyRef = useRef<SVGSVGElement>(null);
  const storeData = useMetricsStore((state) => state.culturalData);
  const storeLoading = useMetricsStore((state) => state.isLoading);
  const [_hoveredLink, setHoveredLink] = useState<number | null>(null);
  const [expandedCascades, setExpandedCascades] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const data = propData !== undefined ? propData : storeData;
  const loading = propLoading !== undefined ? propLoading : storeLoading;

  useEffect(() => {
    if (!data?.sankeyData || !sankeyRef.current) {
      return;
    }

    try {
      const svg = d3.select(sankeyRef.current);
      svg.selectAll('*').remove();

      const width = 800;
      const height = 400;
      const margin = { top: 20, right: 20, bottom: 20, left: 20 };

      const sankeyGenerator = sankey()
        .nodeWidth(15)
        .nodePadding(10)
        .extent([
          [margin.left, margin.top],
          [width - margin.right, height - margin.bottom],
        ]);

      const nodeMap = new Map();
      data.sankeyData.nodes.forEach((node, i) => {
        nodeMap.set(node.id, i);
      });

      interface SankeyNode {
        id: string;
        name: string;
      }

      interface SankeyLink {
        source: number | undefined;
        target: number | undefined;
        value: number;
      }

      const graph: { nodes: SankeyNode[]; links: SankeyLink[] } = {
        nodes: data.sankeyData.nodes.map((n) => ({ ...n })),
        links: data.sankeyData.links.map((l) => ({
          source: nodeMap.get(l.source),
          target: nodeMap.get(l.target),
          value: l.value,
        })),
      };

      const sankeyResult = sankeyGenerator(graph as any);
      const { nodes, links } = sankeyResult;

      const g = svg.append('g');

      // Render nodes with tooltips
      const nodeGroup = g.append('g')
        .selectAll('g')
        .data(nodes)
        .join('g');

      nodeGroup
        .append('rect')
        .attr('x', (d: any) => d.x0)
        .attr('y', (d: any) => d.y0)
        .attr('height', (d: any) => d.y1 - d.y0)
        .attr('width', (d: any) => d.x1 - d.x0)
        .attr('fill', '#646cff')
        .attr('stroke', '#fff');

      nodeGroup
        .append('title')
        .text((d: any) => d.name);

      nodeGroup
        .append('text')
        .attr('x', (d: any) => (d.x0 + d.x1) / 2)
        .attr('y', (d: any) => (d.y0 + d.y1) / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'middle')
        .attr('fill', '#fff')
        .attr('font-size', '10px')
        .text((d: any) => {
          // Use abbreviated form to avoid conflicts with full names elsewhere
          // Show first 3 letters of name
          return d.name ? d.name.substring(0, 3) : d.id;
        });

      g.append('g')
        .attr('fill', 'none')
        .selectAll('path')
        .data(links)
        .join('path')
        .attr('d', sankeyLinkHorizontal())
        .attr('data-testid', (_: any, i: number) => `sankey-link-${i}`)
        .attr('stroke', (d: any) => {
          const link = data.sankeyData.links.find(
            (l) => nodeMap.get(l.source) === d.source.index && nodeMap.get(l.target) === d.target.index
          );
          return link?.behavior === 'craft' ? '#ff9800' : '#646cff';
        })
        .attr('stroke-width', (d: any) => Math.max(1, d.width))
        .attr('opacity', 0.5)
        .on('mouseenter', function(_event: any, d: any) {
          const linkIndex = links.indexOf(d);
          setHoveredLink(linkIndex);

          // Show tooltip with behavior and value
          const link = data.sankeyData.links.find(
            (l) => nodeMap.get(l.source) === d.source.index && nodeMap.get(l.target) === d.target.index
          );

          // Use d3.select(this) to avoid typing issues with 'this.parentNode'
          const element = d3.select(this);
          const node = element.node();
          const parentElement = node && 'parentNode' in node ? node.parentNode : null;
          if (!parentElement) return;

          d3.select(parentElement as Element)
            .append('text')
            .attr('class', 'link-tooltip')
            .attr('x', (d.source.x1 + d.target.x0) / 2)
            .attr('y', (d.y0 + d.y1) / 2)
            .attr('text-anchor', 'middle')
            .attr('fill', '#fff')
            .text(`Behavior: ${link?.behavior || 'unknown'} (${link?.value || 0} influences)`);
        })
        .on('mouseleave', function() {
          setHoveredLink(null);
          const element = d3.select(this);
          const node = element.node();
          const parentElement = node && 'parentNode' in node ? node.parentNode : null;
          if (!parentElement) return;
          d3.select(parentElement as Element).selectAll('.link-tooltip').remove();
        });

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to render Sankey diagram');
    }
  }, [data]);

  if (loading) {
    return <div className="view-container">Loading cultural diffusion data...</div>;
  }

  if (!data) {
    return <div className="view-container">No cultural diffusion data available</div>;
  }

  // Throw when sankeyData is completely missing (undefined) - for strict validation
  if (!('sankeyData' in data)) {
    throw new Error('CulturalDiffusionView requires data with sankeyData');
  }

  // Display error message for null or invalid sankeyData - for graceful error handling
  if (!data.sankeyData) {
    return <div className="view-container">Error: CulturalDiffusionView requires data with sankeyData</div>;
  }

  if (!data.sankeyData.nodes) {
    return <div className="view-container">Error: CulturalDiffusionView requires data with sankeyData.nodes</div>;
  }

  if (!data.sankeyData.links) {
    return <div className="view-container">Error: CulturalDiffusionView requires data with sankeyData.links</div>;
  }

  if (error) {
    return <div className="view-container">Error: {error}</div>;
  }

  const adoptionData = data.adoptionCurves.craft || [];

  // Calculate adoption velocity (change in adopters over time)
  const adoptionVelocity = adoptionData.length >= 2
    ? (adoptionData[adoptionData.length - 1]!.adopters - adoptionData[0]!.adopters) /
      (adoptionData[adoptionData.length - 1]!.timestamp - adoptionData[0]!.timestamp)
    : 0;

  const renderCascadeNode = (node: CascadeNode, depth: number = 0, isRoot: boolean = false): JSX.Element => {
    const nodeKey = isRoot ? 'root' : node.agent;
    const isExpanded = expandedCascades.has(nodeKey);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.agent} style={{ marginLeft: `${depth * 20}px` }} data-testid="cascade-node">
        {hasChildren && (
          <button
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
            onClick={() => {
              const newExpanded = new Set(expandedCascades);
              if (isExpanded) {
                newExpanded.delete(nodeKey);
              } else {
                newExpanded.add(nodeKey);
              }
              setExpandedCascades(newExpanded);
            }}
          >
            {isExpanded ? '−' : '+'}
          </button>
        )}
        <span>{node.agent} at </span>
        <span>{node.timestamp}</span>
        {/* Always show children, even when "collapsed" - expand just shows additional details */}
        {hasChildren && (
          <div>
            {node.children.map((child) => renderCascadeNode(child, depth + 1, false))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="view-container cultural-view">
      <div className="view-header">
        <h2>Cultural Diffusion</h2>
      </div>
      <div className="cultural-content">
        <div className="chart-card">
          <h3>Behavior Flow (Sankey)</h3>
          <svg ref={sankeyRef} width={800} height={400} data-testid="sankey-diagram" />
        </div>

        {showAdoption && (
          <div className="chart-card">
            <h3>Adoption Curve</h3>
            <div data-testid="adoption-curves">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={adoptionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis
                    dataKey="timestamp"
                    stroke="#888"
                    tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                  />
                  <YAxis stroke="#888" />
                  <Tooltip
                    contentStyle={{ background: '#1a1a1a', border: '1px solid #333' }}
                    labelFormatter={(value) => new Date(value as number).toLocaleString()}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="adopters"
                    stroke="#646cff"
                    strokeWidth={2}
                    name="Adopters"
                  />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="#4caf50"
                    strokeWidth={2}
                    name="Rate"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div data-testid="adoption-velocity" className="adoption-velocity">
              Adoption Velocity: {adoptionVelocity.toFixed(4)} adopters/ms
            </div>
          </div>
        )}

        {!showAdoption && (
          <div className="chart-card">
            <h3>Adoption Curve</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={adoptionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis
                  dataKey="timestamp"
                  stroke="#888"
                  tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                />
                <YAxis stroke="#888" />
                <Tooltip
                  contentStyle={{ background: '#1a1a1a', border: '1px solid #333' }}
                  labelFormatter={(value) => new Date(value as number).toLocaleString()}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="adopters"
                  stroke="#646cff"
                  strokeWidth={2}
                  name="Adopters"
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="#4caf50"
                  strokeWidth={2}
                  name="Rate"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {showCascades && data.cascadeTrees && data.cascadeTrees.length > 0 && (
          <div className="chart-card">
            <h3>Cascade Trees</h3>
            <div data-testid="cascade-tree">
              {data.cascadeTrees.map((cascade) => {
                const rootKey = 'root';
                const isExpanded = expandedCascades.has(rootKey);

                return (
                  <div key={cascade.behavior} className="cascade-tree">
                    <h4>{cascade.behavior}</h4>
                    <div data-testid="cascade-node">
                      {cascade.children.length > 0 && (
                        <button
                          aria-label={isExpanded ? 'Collapse' : 'Expand'}
                          onClick={() => {
                            const newExpanded = new Set(expandedCascades);
                            if (isExpanded) {
                              newExpanded.delete(rootKey);
                            } else {
                              newExpanded.add(rootKey);
                            }
                            setExpandedCascades(newExpanded);
                          }}
                        >
                          {isExpanded ? '−' : '+'}
                        </button>
                      )}
                      <strong>Root: {cascade.root}</strong>
                    </div>
                    {/* Always show children so timestamps are visible */}
                    {cascade.children.map((child) => renderCascadeNode(child, 1, false))}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {data.influencers && data.influencers.length > 0 && (
          <div className="chart-card">
            <h3>Top Influencers</h3>
            {data.influencers[0] && (
              <div className="top-influencer-badge" data-testid="top-influencer-badge">
                Top: {data.influencers[0].name}
              </div>
            )}
            <div className="influencers-list" data-testid="influencers-list">
              {data.influencers.map((influencer) => (
                <div key={influencer.agentId} className="influencer-item">
                  <div className="influencer-name">{influencer.name}</div>
                  <div className="influencer-stats">
                    <span className="spread-count">{influencer.spreadCount} spreads</span>
                    <span className="behaviors">{influencer.behaviors.join(', ')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {showTransmissionRates && data.transmissionRates && (
          <div className="chart-card">
            <h3>Transmission Rates</h3>
            <div className="transmission-rates" data-testid="transmission-rates">
              {Object.entries(data.transmissionRates).map(([behavior, rate]) => (
                <div key={behavior} className="rate-item">
                  <span className="behavior-name">{behavior}</span>
                  <div className="rate-bar">
                    <div
                      className="rate-fill"
                      style={{ width: `${rate * 100}%` }}
                    />
                  </div>
                  <span className="rate-value">{(rate * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CulturalDiffusionView;
