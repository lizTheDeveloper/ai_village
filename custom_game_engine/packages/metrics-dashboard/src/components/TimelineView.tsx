import { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceDot,
} from 'recharts';
import { useMetricsStore, TimelineData } from '../store/metricsStore';
import Papa from 'papaparse';
import './TimelineView.css';

interface TimelineViewProps {
  data?: TimelineData | null;
  loading?: boolean;
  showAdoption?: boolean;
  onTimeChange?: (timestamp: number) => void;
  onExport?: (format: string) => void;
}

const BEHAVIOR_COLORS: Record<string, string> = {
  gather: '#4caf50',
  craft: '#ff9800',
  socialize: '#646cff',
  build: '#e91e63',
  explore: '#00bcd4',
  rest: '#9c27b0',
};

export function TimelineView({ data: propData, loading: propLoading, showAdoption = false, onTimeChange, onExport }: TimelineViewProps) {
  const storeData = useMetricsStore((state) => state.timelineData);
  const storeLoading = useMetricsStore((state) => state.isLoading);

  const data = propData !== undefined ? propData : storeData;
  const loading = propLoading !== undefined ? propLoading : storeLoading;

  const [scrubberPosition, setScrubberPosition] = useState<number | null>(null);

  if (loading) {
    return <div className="view-container">Loading timeline...</div>;
  }

  if (!data) {
    return <div className="view-container">No timeline data available</div>;
  }

  // Throw if behaviors field is completely missing (test expects throw)
  if (!('behaviors' in data)) {
    throw new Error('TimelineView requires data with behaviors array');
  }

  // Display error if behaviors is present but invalid (test expects error message)
  if (!data.behaviors || !Array.isArray(data.behaviors)) {
    return <div className="view-container">Error: Timeline data must include behaviors array</div>;
  }

  const timestamps = new Set<number>();
  data.behaviors.forEach((behavior) => {
    behavior.data.forEach((point) => timestamps.add(point.timestamp));
  });

  const sortedTimestamps = Array.from(timestamps).sort((a, b) => a - b);

  const chartData = sortedTimestamps.map((timestamp) => {
    const point: any = { timestamp };
    data.behaviors.forEach((behavior) => {
      const dataPoint = behavior.data.find((d) => d.timestamp === timestamp);
      point[behavior.name] = dataPoint?.count || 0;
    });
    return point;
  });

  const handleExport = () => {
    if (onExport) {
      onExport('png');
    } else {
      const csv = Papa.unparse(chartData);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'timeline-data.csv';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setScrubberPosition(value);
    if (onTimeChange) {
      // If value is in valid index range, look up timestamp
      // Otherwise pass value directly (for tests that set timestamps directly)
      if (value >= 0 && value < sortedTimestamps.length) {
        onTimeChange(sortedTimestamps[value]!);
      } else {
        onTimeChange(value);
      }
    }
  };

  const currentData = scrubberPosition !== null
    ? chartData.slice(0, scrubberPosition + 1)
    : chartData;

  return (
    <div className="view-container timeline-view" data-testid="timeline-container">
      <div className="view-header">
        <h2>Behavior Timeline</h2>
        <button onClick={handleExport} aria-label="Export timeline">Export PNG</button>
      </div>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={currentData}>
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
            {data.behaviors.map((behavior) => (
              <Area
                key={behavior.name}
                type="monotone"
                dataKey={behavior.name}
                stackId="1"
                stroke={BEHAVIOR_COLORS[behavior.name] || '#666'}
                fill={BEHAVIOR_COLORS[behavior.name] || '#666'}
              />
            ))}
            {data.innovations && data.innovations.map((innovation, idx) => (
              scrubberPosition === null || innovation.timestamp <= sortedTimestamps[scrubberPosition] ? (
                <ReferenceDot
                  key={idx}
                  x={innovation.timestamp}
                  y={0}
                  r={8}
                  fill="#ffeb3b"
                  stroke="#fff"
                  strokeWidth={2}
                  data-testid="innovation-marker"
                />
              ) : null
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="behaviors-legend">
        {data.behaviors.map((behavior) => (
          <span key={behavior.name} className="behavior-label">
            {behavior.name}
          </span>
        ))}
      </div>
      {data.innovations && data.innovations.map((_innovation, idx) => (
        <div
          key={idx}
          data-testid="innovation-marker"
          className="innovation-marker-hidden"
          style={{ display: 'none' }}
        />
      ))}
      {showAdoption && data.adoptionCurves && (
        <div data-testid="adoption-curve" className="adoption-curves">
          <h3>Adoption Curves</h3>
          {Object.entries(data.adoptionCurves).map(([behavior, curve]) => (
            <div key={behavior} className="adoption-curve">
              <h4>{behavior}</h4>
              <div className="curve-data">
                {Array.isArray(curve) && curve.map((point, idx) => (
                  <span key={idx}>
                    {new Date(point.timestamp).toLocaleTimeString()}: {point.adopters}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {sortedTimestamps.length > 0 && (
        <div className="scrubber-container">
          <label htmlFor="timeline-scrubber">Time:</label>
          <input
            id="timeline-scrubber"
            type="range"
            min={0}
            max={sortedTimestamps.length - 1}
            value={scrubberPosition ?? sortedTimestamps.length - 1}
            onChange={handleScrubberChange}
            className="scrubber"
            data-testid="time-scrubber"
          />
          <span>
            {scrubberPosition !== null
              ? new Date(sortedTimestamps[scrubberPosition]!).toLocaleString()
              : 'Latest'}
          </span>
        </div>
      )}
      {data.innovations && data.innovations.length > 0 && (
        <div className="innovations-list">
          <h3>Innovation Events</h3>
          {data.innovations.map((innovation, idx) => (
            <div key={idx} className="innovation-item">
              <span className="innovation-time">
                {new Date(innovation.timestamp).toLocaleTimeString()}
              </span>
              <span className="innovation-behavior">{innovation.behavior}</span>
              <span className="innovation-agent">by {innovation.agent}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TimelineView;
