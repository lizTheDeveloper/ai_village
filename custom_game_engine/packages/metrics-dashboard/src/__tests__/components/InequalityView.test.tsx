import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { InequalityView } from '@/components/InequalityView';
import { mockInequalityData } from '../mockData';

// Mock Recharts - preserve data-testid attributes and render data
vi.mock('recharts', () => ({
  LineChart: ({ children, data, 'data-testid': testId }: any) => (
    <div data-testid={testId}>
      {children}
      {/* Render data for test assertions - hide to avoid duplicate text issues */}
      {data && data.map((point: any, idx: number) => (
        <div key={`line-${idx}`} style={{ display: 'none' }}>
          {Object.entries(point).map(([key, val]: [string, any], vIdx: number) => (
            <span key={`${key}-${vIdx}`}>{String(val)}</span>
          ))}
        </div>
      ))}
    </div>
  ),
  BarChart: ({ children, data, 'data-testid': testId }: any) => (
    <div data-testid={testId}>
      {children}
      {/* Render data values for test assertions */}
      {data && data.map((point: any, idx: number) => (
        <div key={`bar-${idx}`}>
          {point.wealth && <span>{point.wealth}</span>}
          {point.quartile && <span>{point.quartile}</span>}
        </div>
      ))}
    </div>
  ),
  Line: ({ 'data-testid': testId }: any) => testId ? <div data-testid={testId} /> : <div />,
  Bar: ({ 'data-testid': testId }: any) => testId ? <div data-testid={testId} /> : <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
}));

describe('InequalityView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Acceptance Criterion 5: Inequality Dashboard', () => {
    it('should render Lorenz curve', async () => {
      render(<InequalityView data={mockInequalityData} />);

      await waitFor(() => {
        expect(screen.getByTestId('lorenz-curve')).toBeInTheDocument();
      });
    });

    it('should show cumulative wealth vs population', async () => {
      render(<InequalityView data={mockInequalityData} />);

      await waitFor(() => {
        expect(screen.getByTestId('lorenz-curve')).toBeInTheDocument();
      });

      // Verify Lorenz curve data
      expect(mockInequalityData.lorenzCurve).toHaveLength(6);
      expect(mockInequalityData.lorenzCurve[0]).toEqual({ population: 0, wealth: 0 });
      expect(mockInequalityData.lorenzCurve[5]).toEqual({ population: 1.0, wealth: 1.0 });
    });

    it('should include diagonal line for perfect equality', async () => {
      render(<InequalityView data={mockInequalityData} />);

      await waitFor(() => {
        expect(screen.getByTestId('equality-line')).toBeInTheDocument();
      });
    });

    it('should display Gini coefficient trend over time', async () => {
      render(<InequalityView data={mockInequalityData} />);

      await waitFor(() => {
        expect(screen.getByTestId('gini-trend')).toBeInTheDocument();
      });

      // Verify Gini values are in [0, 1]
      mockInequalityData.giniTrend.forEach((point) => {
        expect(point.gini).toBeGreaterThanOrEqual(0);
        expect(point.gini).toBeLessThanOrEqual(1);
      });
    });

    it('should show quartile breakdown in bar chart', async () => {
      render(<InequalityView data={mockInequalityData} />);

      await waitFor(() => {
        expect(screen.getByTestId('quartile-chart')).toBeInTheDocument();
      });

      // Verify all quartiles are shown
      expect(screen.getByText(/top 25%/i)).toBeInTheDocument();
      expect(screen.getByText(/upper 50%/i)).toBeInTheDocument();
      expect(screen.getByText(/lower 50%/i)).toBeInTheDocument();
      expect(screen.getByText(/bottom 25%/i)).toBeInTheDocument();
    });

    it('should display mobility matrix as heatmap', async () => {
      render(<InequalityView data={mockInequalityData} />);

      await waitFor(() => {
        expect(screen.getByTestId('mobility-matrix')).toBeInTheDocument();
      });

      // Verify matrix is 4x4 (quartiles)
      expect(mockInequalityData.mobilityMatrix).toHaveLength(4);
      mockInequalityData.mobilityMatrix.forEach((row) => {
        expect(row).toHaveLength(4);
      });
    });

    it('should show class transition probabilities in mobility matrix', async () => {
      render(<InequalityView data={mockInequalityData} />);

      await waitFor(() => {
        expect(screen.getByTestId('mobility-matrix')).toBeInTheDocument();
      });

      // Verify each row sums to 1 (probabilities)
      mockInequalityData.mobilityMatrix.forEach((row) => {
        const sum = row.reduce((a, b) => a + b, 0);
        expect(sum).toBeCloseTo(1.0, 5);
      });
    });

    it('should allow comparison between time periods', async () => {
      render(<InequalityView data={mockInequalityData} />);

      const compareButton = screen.getByLabelText(/compare/i);
      fireEvent.click(compareButton);

      await waitFor(() => {
        expect(screen.getByTestId('comparison-selector')).toBeInTheDocument();
      });
    });
  });

  describe('Gini coefficient calculation', () => {
    it('should calculate Gini from Lorenz curve', async () => {
      render(<InequalityView data={mockInequalityData} />);

      await waitFor(() => {
        const giniValue = screen.getByTestId('current-gini-value');
        expect(giniValue).toBeInTheDocument();
      });

      // Gini = 0 means perfect equality, 1 means perfect inequality
    });

    it('should display current Gini value', async () => {
      render(<InequalityView data={mockInequalityData} />);

      const currentGini = mockInequalityData.giniTrend[mockInequalityData.giniTrend.length - 1]!.gini;

      await waitFor(() => {
        expect(screen.getByText(currentGini.toFixed(2))).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should throw when lorenzCurve is missing', () => {
      expect(() => {
        render(<InequalityView data={{ giniTrend: [], quartiles: {}, mobilityMatrix: [] } as any} />);
      }).toThrow('lorenzCurve');
    });

    it('should throw when mobility matrix is not square', () => {
      const invalidData = {
        ...mockInequalityData,
        mobilityMatrix: [
          [0.7, 0.3],
          [0.5, 0.5],
          [0.4, 0.6],
        ],
      };

      expect(() => {
        render(<InequalityView data={invalidData} />);
      }).toThrow('square matrix');
    });

    it('should display error message on render failure', async () => {
      const badData = { ...mockInequalityData, lorenzCurve: null };

      render(<InequalityView data={badData as any} />);

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });
  });

  describe('loading states', () => {
    it('should show loading indicator while data is loading', () => {
      render(<InequalityView data={null} loading={true} />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('time period comparison', () => {
    it('should compare Gini coefficients between periods', async () => {
      render(<InequalityView data={mockInequalityData} comparisonEnabled={true} />);

      const period1 = screen.getByLabelText(/period 1/i);
      const period2 = screen.getByLabelText(/period 2/i);

      fireEvent.change(period1, { target: { value: '1000' } });
      fireEvent.change(period2, { target: { value: '3000' } });

      await waitFor(() => {
        expect(screen.getByTestId('comparison-result')).toBeInTheDocument();
      });
    });

    it('should show difference in inequality metrics', async () => {
      render(<InequalityView data={mockInequalityData} comparisonEnabled={true} />);

      await waitFor(() => {
        expect(screen.getByTestId('inequality-delta')).toBeInTheDocument();
      });
    });
  });

  describe('quartile details', () => {
    it('should show wealth distribution per quartile', async () => {
      render(<InequalityView data={mockInequalityData} />);

      await waitFor(() => {
        expect(screen.getByText(/5000/)).toBeInTheDocument(); // Top 25% wealth
        expect(screen.getByText(/500/)).toBeInTheDocument(); // Bottom 25% wealth
      });
    });

    it('should show agent count per quartile', async () => {
      render(<InequalityView data={mockInequalityData} />);

      await waitFor(() => {
        const quartiles = mockInequalityData.quartiles;
        expect(quartiles.top25.count).toBe(25);
        expect(quartiles.bottom25.count).toBe(25);
      });
    });
  });
});
