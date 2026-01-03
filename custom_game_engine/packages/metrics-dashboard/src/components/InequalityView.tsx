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
}

export function InequalityView({ data: propData, loading: propLoading }: InequalityViewProps) {
  const storeData = useMetricsStore((state) => state.inequalityData);
  const storeLoading = useMetricsStore((state) => state.isLoading);

  const data = propData !== undefined ? propData : storeData;
  const loading = propLoading !== undefined ? propLoading : storeLoading;

  if (loading) {
    return <div className="view-container">Loading inequality data...</div>;
  }

  if (!data) {
    return <div className="view-container">No inequality data available</div>;
  }

  if (!data.lorenzCurve || !Array.isArray(data.lorenzCurve)) {
    throw new Error('InequalityView requires data with lorenzCurve array');
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
    const quartiles = ['Bottom 25%', 'Lower 50%', 'Upper 50%', 'Top 25%'];
    return {
      from: quartiles[fromIdx],
      'Bottom 25%': row[0],
      'Lower 50%': row[1],
      'Upper 50%': row[2],
      'Top 25%': row[3],
    };
  });

  return (
    <div className="view-container inequality-view">
      <div className="view-header">
        <h2>Economic Inequality</h2>
      </div>
      <div className="charts-grid">
        <div className="chart-card">
          <h3>Lorenz Curve</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={lorenzWithEquality}>
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
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Gini Coefficient Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.giniTrend}>
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
            <BarChart data={quartileData}>
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
          <div className="mobility-matrix">
            <table>
              <thead>
                <tr>
                  <th>From \ To</th>
                  <th>Bottom 25%</th>
                  <th>Lower 50%</th>
                  <th>Upper 50%</th>
                  <th>Top 25%</th>
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
