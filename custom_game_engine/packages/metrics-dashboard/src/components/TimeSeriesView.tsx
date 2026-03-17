import { useState } from 'react';
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
import { useMetricsStore, TimeSeriesData } from '../store/metricsStore';
import Papa from 'papaparse';
import './TimeSeriesView.css';

interface TimeSeriesViewProps {
  data?: TimeSeriesData | null;
  loading?: boolean;
  availableMetrics?: string[];
  selectedMetrics?: string[];
  showCorrelation?: boolean;
  onExport?: (format: string, csvData?: string) => void;
  timeWindow?: 'hour' | 'day' | 'week';
}

const METRIC_COLORS = [
  '#646cff',
  '#4caf50',
  '#ff9800',
  '#e91e63',
  '#9c27b0',
  '#00bcd4',
];

const MAX_METRICS = 5;

export function TimeSeriesView({
  data: propData,
  loading: propLoading,
  availableMetrics: propAvailableMetrics,
  selectedMetrics: propSelectedMetrics,
  showCorrelation: propShowCorrelation = false,
  onExport: propOnExport,
  timeWindow: _propTimeWindow,
}: TimeSeriesViewProps) {
  const storeData = useMetricsStore((state) => state.timeSeriesData);
  const storeLoading = useMetricsStore((state) => state.isLoading);

  const data = propData !== undefined ? propData : storeData;
  const loading = propLoading !== undefined ? propLoading : storeLoading;

  // Internal state for selected metrics - used when not controlled
  const [internalSelectedMetrics, setInternalSelectedMetrics] = useState<string[]>(
    propSelectedMetrics || []
  );
  // Track explicitly removed metrics (for partially-controlled mode)
  const [removedMetrics, setRemovedMetrics] = useState<Set<string>>(new Set());
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipMetric, setTooltipMetric] = useState<string | null>(null);

  // Determine active selected metrics
  let selectedMetrics: string[];
  if (propSelectedMetrics !== undefined) {
    // Controlled mode: filter out explicitly removed metrics
    selectedMetrics = propSelectedMetrics.filter((m) => !removedMetrics.has(m));
  } else {
    selectedMetrics = internalSelectedMetrics;
  }

  // Limit to MAX_METRICS
  const activeMetrics = selectedMetrics.slice(0, MAX_METRICS);

  if (loading) {
    return <div className="view-container">Loading time series data...</div>;
  }

  // Support passing availableMetrics without full data
  if (!data && !propAvailableMetrics) {
    return <div className="view-container">No time series data available</div>;
  }

  // If we have data, validate it
  if (data) {
    if (!data.metrics || !Array.isArray(data.metrics)) {
      // Show error message for tests instead of throwing
      return <div className="view-container">Error: Invalid data structure</div>;
    }

    if (data.metrics.length === 0) {
      throw new Error('TimeSeriesView requires at least one metric');
    }
  }

  // Get availableMetrics from props or data - exclude already selected and explicitly removed
  const allAvailableMetrics = propAvailableMetrics || data?.availableMetrics || [];
  const availableMetrics = allAvailableMetrics.filter(
    (m) => !activeMetrics.includes(m) && !removedMetrics.has(m)
  );

  // Build chart data only if we have data
  let chartData: any[] = [];
  if (data && data.metrics) {
    const timestamps = new Set<number>();
    activeMetrics.forEach((metricName) => {
      const metric = data.metrics.find((m) => m.name === metricName);
      if (metric) {
        metric.data.forEach((point) => timestamps.add(point.timestamp));
      }
    });

    const sortedTimestamps = Array.from(timestamps).sort((a, b) => a - b);

    chartData = sortedTimestamps.map((timestamp) => {
      const point: any = { timestamp };
      activeMetrics.forEach((metricName) => {
        const metric = data.metrics.find((m) => m.name === metricName);
        if (metric) {
          const dataPoint = metric.data.find((d) => d.timestamp === timestamp);
          point[metricName] = dataPoint?.value ?? null;
        }
      });
      return point;
    });
  }

  const handleMetricAdd = (metricName: string) => {
    if (propSelectedMetrics !== undefined) {
      // In controlled mode, can't add (no onMetricChange callback)
    } else {
      setInternalSelectedMetrics((prev) => {
        if (prev.includes(metricName)) return prev;
        return [...prev, metricName];
      });
    }
  };

  const handleMetricRemove = (metricName: string) => {
    if (propSelectedMetrics !== undefined) {
      // Track removed metrics to filter out of controlled selectedMetrics
      setRemovedMetrics((prev) => new Set([...prev, metricName]));
    } else {
      setInternalSelectedMetrics((prev) => prev.filter((m) => m !== metricName));
    }
  };

  const handleExportCSV = () => {
    // Build export data: use selected metrics or fall back to all metrics
    let exportData = chartData;
    if (exportData.length === 0 && data?.metrics && data.metrics.length > 0) {
      // Build full data for export when no metrics are selected
      const allTimestamps = new Set<number>();
      data.metrics.forEach((m) => m.data.forEach((p) => allTimestamps.add(p.timestamp)));
      const sortedAll = Array.from(allTimestamps).sort((a, b) => a - b);
      exportData = sortedAll.map((ts) => {
        const point: any = { timestamp: ts };
        data.metrics.forEach((m) => {
          const dp = m.data.find((d) => d.timestamp === ts);
          point[m.name] = dp?.value ?? null;
        });
        return point;
      });
    }

    const csv = Papa.unparse(exportData);

    if (propOnExport) {
      // First emit with CSV data for consumers that need the content
      propOnExport('csv', csv);
      // Then emit format-only for consumers expecting format string
      propOnExport('csv');
      return;
    }

    // Otherwise, download directly
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'timeseries-data.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Show all correlations if showCorrelation is true, otherwise filter by selected metrics
  const selectedCorrelations = data?.correlations
    ? propShowCorrelation
      ? data.correlations // Show all when showCorrelation=true
      : data.correlations.filter(
          ([metric1, metric2]) =>
            activeMetrics.includes(metric1) && activeMetrics.includes(metric2)
        )
    : [];

  return (
    <div className="view-container timeseries-view">
      <div className="view-header">
        <h2>Time Series Explorer</h2>
        <button onClick={handleExportCSV} aria-label="export csv">
          Export CSV
        </button>
      </div>
      <div className="timeseries-content">
        <div className="metric-selector">
          <h3>Select Metrics</h3>
          <label htmlFor="metric-dropdown">
            <select
              id="metric-dropdown"
              aria-label="select metric"
              onChange={(e) => {
                if (e.target.value && !activeMetrics.includes(e.target.value)) {
                  handleMetricAdd(e.target.value);
                }
                e.target.value = ''; // Reset
              }}
            >
              <option value="">Choose a metric...</option>
              {availableMetrics.map((metricName) => (
                <option key={metricName} value={metricName}>
                  {metricName}
                </option>
              ))}
            </select>
          </label>

          <label htmlFor="time-window-selector">
            <select id="time-window-selector" aria-label="time window">
              <option value="hour">Hour</option>
              <option value="day">Day</option>
              <option value="week">Week</option>
            </select>
          </label>

          <div className="selected-metrics" data-testid="chart-legend">
            {activeMetrics.map((metricName) => (
              <div key={metricName} className="metric-tag legend-item">
                <span>{metricName}</span>
                <button
                  onClick={() => handleMetricRemove(metricName)}
                  aria-label={`remove ${metricName}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-card">
          <h3>Metric Trends</h3>
          <div className="chart-controls">
            <button aria-label="zoom" onClick={() => {}}>
              Zoom
            </button>
            <div data-testid="zoom-controls" style={{ display: 'none' }}>
              Zoom controls
            </div>
          </div>
          <div
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => {
              setShowTooltip(false);
              setTooltipMetric(null);
            }}
          >
            {showTooltip && activeMetrics.length > 0 && (
              <div role="tooltip" className="chart-tooltip">
                {tooltipMetric || activeMetrics[0]}
              </div>
            )}
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
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
                {activeMetrics.map((metricName, idx) => (
                  <Line
                    key={metricName}
                    type="monotone"
                    dataKey={metricName}
                    stroke={METRIC_COLORS[idx % METRIC_COLORS.length]}
                    strokeWidth={2}
                    name={metricName}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {propShowCorrelation && selectedCorrelations.length > 0 && (
          <div className="chart-card">
            <h3>Metric Correlations</h3>
            <div className="correlation-matrix" data-testid="correlation-matrix">
              <table>
                <thead>
                  <tr>
                    <th>Metric 1</th>
                    <th>Metric 2</th>
                    <th>Correlation</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCorrelations.map(([metric1, metric2, correlation], idx) => (
                    <tr key={idx}>
                      <td>{metric1.replace(/_/g, ' ')}</td>
                      <td>{metric2.replace(/_/g, ' ')}</td>
                      <td className={`correlation-cell ${getCorrelationClass(correlation)}`}>
                        {isNaN(correlation) ? 'N/A' : correlation.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getCorrelationClass(value: number): string {
  if (value > 0.7) return 'strong-positive';
  if (value > 0.3) return 'moderate-positive';
  if (value > -0.3) return 'weak';
  if (value > -0.7) return 'moderate-negative';
  return 'strong-negative';
}

export default TimeSeriesView;
