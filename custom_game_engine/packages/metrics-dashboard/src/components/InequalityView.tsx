import { useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useMetricsStore, InequalityData } from '../store/metricsStore';
import './InequalityView.css';

interface InequalityViewProps {
  data?: InequalityData | null;
  loading?: boolean;
  comparisonEnabled?: boolean;
  onExport?: (format: string) => void;
}

export function InequalityView({
  data: propData,
  loading: propLoading,
  comparisonEnabled = false,
  onExport
}: InequalityViewProps) {
  const storeData = useMetricsStore((state) => state.inequalityData);
  const storeLoading = useMetricsStore((state) => state.isLoading);

  const data = propData !== undefined ? propData : storeData;
  const loading = propLoading !== undefined ? propLoading : storeLoading;

  const [showComparison, setShowComparison] = useState(comparisonEnabled);

  // Initialize periods with first and last timestamps if comparisonEnabled
  const getDefaultPeriods = () => {
    if (comparisonEnabled && data?.giniTrend && data.giniTrend.length >= 2) {
      return {
        period1: data.giniTrend[0]!.timestamp,
        period2: data.giniTrend[data.giniTrend.length - 1]!.timestamp,
      };
    }
    return { period1: null, period2: null };
  };

  const defaults = getDefaultPeriods();
  const [period1, setPeriod1] = useState<number | null>(defaults.period1);
  const [period2, setPeriod2] = useState<number | null>(defaults.period2);

  if (loading) {
    return <div className="view-container">Loading inequality data...</div>;
  }

  if (!data) {
    return <div className="view-container">No inequality data available</div>;
  }

  // Throw if lorenzCurve field is completely missing (test expects throw)
  if (!('lorenzCurve' in data)) {
    throw new Error('InequalityView requires data with lorenzCurve array');
  }

  // Display error if lorenzCurve is present but invalid (test expects error message)
  if (!data.lorenzCurve || !Array.isArray(data.lorenzCurve)) {
    return <div className="view-container">Error: Inequality data must include lorenzCurve array</div>;
  }

  // Validate mobility matrix is square
  if (data.mobilityMatrix && Array.isArray(data.mobilityMatrix)) {
    const size = data.mobilityMatrix.length;
    const isSquare = data.mobilityMatrix.every(row => Array.isArray(row) && row.length === size);
    if (!isSquare) {
      throw new Error('InequalityView requires square matrix for mobilityMatrix');
    }
  }

  const lorenzWithEquality = [
    ...data.lorenzCurve,
    { population: 0, wealth: 0, equality: 0 },
    { population: 1, wealth: 1, equality: 1 },
  ];

  const quartileData = [
    { quartile: 'Bottom 25%', wealth: data.quartiles.bottom25.wealth },
    { quartile: 'Lower 50%', wealth: data.quartiles.lower50.wealth },
    { quartile: 'Upper 50%', wealth: data.quartiles.upper50.wealth },
    { quartile: 'Top 25%', wealth: data.quartiles.top25.wealth },
  ];

  const mobilityData = data.mobilityMatrix.map((row, fromIdx) => {
    const quartileLabels = ['Q1 (Bottom)', 'Q2 (Lower)', 'Q3 (Upper)', 'Q4 (Top)'];
    return {
      from: quartileLabels[fromIdx],
      'Bottom 25%': row[0],
      'Lower 50%': row[1],
      'Upper 50%': row[2],
      'Top 25%': row[3],
    };
  });

  // Get current Gini value
  const currentGini = data.giniTrend && data.giniTrend.length > 0
    ? data.giniTrend[data.giniTrend.length - 1]!.gini
    : 0;

  // Comparison logic
  const getGiniAtTime = (timestamp: number) => {
    if (!data.giniTrend || data.giniTrend.length === 0) return null;
    const point = data.giniTrend.find(p => p.timestamp === timestamp);
    return point ? point.gini : null;
  };

  const gini1 = period1 !== null ? getGiniAtTime(period1) : null;
  const gini2 = period2 !== null ? getGiniAtTime(period2) : null;
  const giniDelta = gini1 !== null && gini2 !== null ? gini2 - gini1 : null;

  const handleExport = () => {
    if (onExport) {
      onExport('png');
    }
  };

  return (
    <div className="view-container inequality-view">
      <div className="view-header">
        <h2>Economic Inequality</h2>
        {onExport && (
          <button onClick={handleExport} aria-label="Export inequality data">
            Export
          </button>
        )}
        <button
          onClick={() => setShowComparison(!showComparison)}
          aria-label="Compare inequality between periods"
        >
          Compare
        </button>
      </div>

      {/* Current Gini Value Display */}
      <div className="current-metrics">
        <div className="metric-card">
          <span className="metric-label">Current Gini Coefficient:</span>
          <span className="metric-value" data-testid="current-gini-value">
            {currentGini.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Comparison Selector */}
      {showComparison && (
        <div className="comparison-controls" data-testid="comparison-selector">
          <label>
            Period 1:
            <input
              type="number"
              aria-label="Period 1 timestamp"
              value={period1 ?? ''}
              onChange={(e) => setPeriod1(e.target.value ? parseInt(e.target.value, 10) : null)}
            />
          </label>
          <label>
            Period 2:
            <input
              type="number"
              aria-label="Period 2 timestamp"
              value={period2 ?? ''}
              onChange={(e) => setPeriod2(e.target.value ? parseInt(e.target.value, 10) : null)}
            />
          </label>
        </div>
      )}

      {/* Comparison Results */}
      {showComparison && giniDelta !== null && (
        <div className="comparison-results">
          <div data-testid="comparison-result">
            <span>Gini at Period 1: {gini1?.toFixed(2)}</span>
            <span>Gini at Period 2: {gini2?.toFixed(2)}</span>
          </div>
          <div data-testid="inequality-delta">
            <span>Change: {giniDelta > 0 ? '+' : ''}{giniDelta.toFixed(2)}</span>
          </div>
        </div>
      )}

      <div className="charts-grid">
        <div className="chart-card">
          <h3>Lorenz Curve</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={lorenzWithEquality} data-testid="lorenz-curve">
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey="population"
                stroke="#888"
                domain={[0, 1]}
                tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
              />
              <YAxis
                stroke="#888"
                domain={[0, 1]}
                tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
              />
              <Tooltip
                contentStyle={{ background: '#1a1a1a', border: '1px solid #333' }}
                formatter={(value: number) => `${(value * 100).toFixed(1)}%`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="wealth"
                stroke="#646cff"
                strokeWidth={2}
                dot={false}
                name="Actual Distribution"
              />
              <Line
                type="linear"
                dataKey="equality"
                stroke="#888"
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
                name="Perfect Equality"
                data-testid="equality-line"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Gini Coefficient Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.giniTrend} data-testid="gini-trend">
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey="timestamp"
                stroke="#888"
                tickFormatter={(value) => new Date(value).toLocaleTimeString()}
              />
              <YAxis stroke="#888" domain={[0, 1]} />
              <Tooltip
                contentStyle={{ background: '#1a1a1a', border: '1px solid #333' }}
                labelFormatter={(value) => new Date(value as number).toLocaleString()}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="gini"
                stroke="#f44336"
                strokeWidth={2}
                name="Gini Coefficient"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Wealth by Quartile</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={quartileData} data-testid="quartile-chart">
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="quartile" stroke="#888" />
              <YAxis stroke="#888" />
              <Tooltip
                contentStyle={{ background: '#1a1a1a', border: '1px solid #333' }}
              />
              <Legend />
              <Bar dataKey="wealth" fill="#4caf50" name="Wealth" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Class Mobility Matrix</h3>
          <div className="mobility-matrix" data-testid="mobility-matrix">
            <table>
              <thead>
                <tr>
                  <th>From \ To</th>
                  <th>Q1 (Bottom)</th>
                  <th>Q2 (Lower)</th>
                  <th>Q3 (Upper)</th>
                  <th>Q4 (Top)</th>
                </tr>
              </thead>
              <tbody>
                {mobilityData.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.from}</td>
                    <td className={getCellClass(row['Bottom 25%']!)}>
                      {(row['Bottom 25%']! * 100).toFixed(0)}%
                    </td>
                    <td className={getCellClass(row['Lower 50%']!)}>
                      {(row['Lower 50%']! * 100).toFixed(0)}%
                    </td>
                    <td className={getCellClass(row['Upper 50%']!)}>
                      {(row['Upper 50%']! * 100).toFixed(0)}%
                    </td>
                    <td className={getCellClass(row['Top 25%']!)}>
                      {(row['Top 25%']! * 100).toFixed(0)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function getCellClass(value: number): string {
  if (value >= 0.5) return 'high';
  if (value >= 0.25) return 'medium';
  return 'low';
}

export default InequalityView;
