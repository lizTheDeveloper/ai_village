import { useRef, useEffect } from 'react';
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
}

export function CulturalDiffusionView({
  data: propData,
  loading: propLoading,
}: CulturalDiffusionViewProps) {
  const sankeyRef = useRef<SVGSVGElement>(null);
  const storeData = useMetricsStore((state) => state.culturalData);
  const storeLoading = useMetricsStore((state) => state.isLoading);

  const data = propData !== undefined ? propData : storeData;
  const loading = propLoading !== undefined ? propLoading : storeLoading;

  useEffect(() => {
    if (!data?.sankeyData || !sankeyRef.current) {
      return;
    }

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

    const graph = {
      nodes: data.sankeyData.nodes.map((n) => ({ ...n })),
      links: data.sankeyData.links.map((l) => ({
        source: nodeMap.get(l.source),
        target: nodeMap.get(l.target),
        value: l.value,
      })),
    };

    const { nodes, links } = sankeyGenerator(graph as any);

    const g = svg.append('g');

    g.append('g')
      .selectAll('rect')
      .data(nodes)
      .join('rect')
      .attr('x', (d: any) => d.x0)
      .attr('y', (d: any) => d.y0)
      .attr('height', (d: any) => d.y1 - d.y0)
      .attr('width', (d: any) => d.x1 - d.x0)
      .attr('fill', '#646cff')
      .attr('stroke', '#fff');

    g.append('g')
      .selectAll('text')
      .data(nodes)
      .join('text')
      .attr('x', (d: any) => (d.x0 + d.x1) / 2)
      .attr('y', (d: any) => (d.y0 + d.y1) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff')
      .attr('font-size', '10px')
      .text((d: any) => d.name);

    g.append('g')
      .attr('fill', 'none')
      .selectAll('path')
      .data(links)
      .join('path')
      .attr('d', sankeyLinkHorizontal())
      .attr('stroke', (d: any) => {
        const link = data.sankeyData.links.find(
          (l) => nodeMap.get(l.source) === d.source.index && nodeMap.get(l.target) === d.target.index
        );
        return link?.behavior === 'craft' ? '#ff9800' : '#646cff';
      })
      .attr('stroke-width', (d: any) => Math.max(1, d.width))
      .attr('opacity', 0.5);
  }, [data]);

  if (loading) {
    return <div className="view-container">Loading cultural diffusion data...</div>;
  }

  if (!data) {
    return <div className="view-container">No cultural diffusion data available</div>;
  }

  if (!data.sankeyData || !data.sankeyData.nodes) {
    throw new Error('CulturalDiffusionView requires data with sankeyData.nodes');
  }

  if (!data.sankeyData.links) {
    throw new Error('CulturalDiffusionView requires data with sankeyData.links');
  }

  const adoptionData = data.adoptionCurves.craft || [];

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

        {data.influencers && data.influencers.length > 0 && (
          <div className="chart-card">
            <h3>Top Influencers</h3>
            <div className="influencers-list">
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

        {data.transmissionRates && (
          <div className="chart-card">
            <h3>Transmission Rates</h3>
            <div className="transmission-rates">
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
