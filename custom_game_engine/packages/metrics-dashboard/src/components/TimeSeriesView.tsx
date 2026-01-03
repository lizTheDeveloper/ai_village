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
}

const METRIC_COLORS = [
  '#646cff',
  '#4caf50',
  '#ff9800',
  '#e91e63',
  '#9c27b0',
  '#00bcd4',
];

export function TimeSeriesView({ data: propData, loading: propLoading }: TimeSeriesViewProps) {
  const storeData = useMetricsStore((state) => state.timeSeriesData);
  const storeLoading = useMetricsStore((state) => state.isLoading);

  const data = propData !== undefined ? propData : storeData;
  const loading = propLoading !== undefined ? propLoading : storeLoading;

  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['average_mood']);

  if (loading) {
    return <div className="view-container">Loading time series data...</div>;
  }

  if (!data) {
    return <div className="view-container">No time series data available</div>;
  }

  if (!data.metrics || !Array.isArray(data.metrics)) {
    throw new Error('TimeSeriesView requires data with metrics array');
  }

  if (!data.availableMetrics || !Array.isArray(data.availableMetrics)) {
    throw new Error('TimeSeriesView requires data with availableMetrics array');
  }

  const timestamps = new Set<number>();
  selectedMetrics.forEach((metricName) => {
    const metric = data.metrics.find((m) => m.name === metricName);
    if (metric) {
      metric.data.forEach((point) => timestamps.add(point.timestamp));
    }
  });

  const sortedTimestamps = Array.from(timestamps).sort((a, b) => a - b);

  const chartData = sortedTimestamps.map((timestamp) => {
    const point: any = { timestamp };
    selectedMetrics.forEach((metricName) => {
      const metric = data.metrics.find((m) => m.name === metricName);
      if (metric) {
        const dataPoint = metric.data.find((d) => d.timestamp === timestamp);
        point[metricName] = dataPoint?.value ?? null;
      }
    });
    return point;
  });

  const handleMetricToggle = (metricName: string) => {
    setSelectedMetrics((prev) => {
      if (prev.includes(metricName)) {
        return prev.filter((m) => m !== metricName);
      }
      return [...prev, metricName];
    });
  };

  const handleExportCSV = () => {
    const csv = Papa.unparse(chartData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'timeseries-data.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedCorrelations = data.correlations.filter(
    ([metric1, metric2]) =>
      selectedMetrics.includes(metric1) && selectedMetrics.includes(metric2)
  );

  return (
    <div className="view-container timeseries-view">
      <div className="view-header">
        <h2>Time Series Explorer</h2>
        <button onClick={handleExportCSV}>Export CSV</button>
      </div>
      <div className="timeseries-content">
        <div className="metric-selector">
          <h3>Select Metrics</h3>
          <div className="metric-checkboxes">
            {data.availableMetrics.map((metricName) => (
              <label key={metricName}>
                <input
                  type="checkbox"
                  checked={selectedMetrics.includes(metricName)}
                  onChange={() => handleMetricToggle(metricName)}
                />
                {metricName.replace(/_/g, ' ')}
              </label>
            ))}
          </div>
        </div>

        <div className="chart-card">
          <h3>Metric Trends</h3>
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
              {selectedMetrics.map((metricName, idx) => (
                <Line
                  key={metricName}
                  type="monotone"
                  dataKey={metricName}
                  stroke={METRIC_COLORS[idx % METRIC_COLORS.length]}
                  strokeWidth={2}
                  name={metricName.replace(/_/g, ' ')}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {selectedCorrelations.length > 0 && (
          <div className="chart-card">
            <h3>Metric Correlations</h3>
            <div className="correlation-matrix">
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
                      <td className={getCorrelationClass(correlation)}>
                        {correlation.toFixed(2)}
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
