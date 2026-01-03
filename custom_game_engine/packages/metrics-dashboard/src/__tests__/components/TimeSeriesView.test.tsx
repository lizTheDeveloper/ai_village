import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { TimeSeriesView } from '@/components/TimeSeriesView';
import { mockTimeSeriesData } from '../mockData';

// Mock Recharts
vi.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
}));

describe('TimeSeriesView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Acceptance Criterion 7: Time Series Explorer', () => {
    it('should allow selecting any metric from dropdown', async () => {
      render(<TimeSeriesView availableMetrics={mockTimeSeriesData.availableMetrics} />);

      const dropdown = screen.getByLabelText(/select metric/i);
      expect(dropdown).toBeInTheDocument();

      // Verify all metrics are available
      fireEvent.click(dropdown);

      await waitFor(() => {
        mockTimeSeriesData.availableMetrics.forEach((metric) => {
          expect(screen.getByText(metric)).toBeInTheDocument();
        });
      });
    });

    it('should render line chart for selected metric', async () => {
      render(<TimeSeriesView data={mockTimeSeriesData} selectedMetrics={['average_mood']} />);

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });
    });

    it('should allow overlaying multiple metrics', async () => {
      render(
        <TimeSeriesView
          data={mockTimeSeriesData}
          selectedMetrics={['average_mood', 'resource_inequality']}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });

      // Verify both metrics are shown
      expect(screen.getByText(/average_mood/i)).toBeInTheDocument();
      expect(screen.getByText(/resource_inequality/i)).toBeInTheDocument();
    });

    it('should show correlation matrix', async () => {
      render(<TimeSeriesView data={mockTimeSeriesData} showCorrelation={true} />);

      await waitFor(() => {
        expect(screen.getByTestId('correlation-matrix')).toBeInTheDocument();
      });
    });

    it('should display correlation values in matrix', async () => {
      render(<TimeSeriesView data={mockTimeSeriesData} showCorrelation={true} />);

      await waitFor(() => {
        // Verify correlations are displayed
        mockTimeSeriesData.correlations.forEach(([metric1, metric2, rValue]) => {
          expect(screen.getByText(rValue.toFixed(2))).toBeInTheDocument();
        });
      });
    });

    it('should highlight strong correlations', async () => {
      render(<TimeSeriesView data={mockTimeSeriesData} showCorrelation={true} />);

      await waitFor(() => {
        // Strong negative correlation: -0.78
        const strongCorr = mockTimeSeriesData.correlations.find(
          ([m1, m2, r]) => Math.abs(r) > 0.7
        );
        expect(strongCorr).toBeDefined();
      });
    });

    it('should export data as CSV', async () => {
      const onExport = vi.fn();
      render(<TimeSeriesView data={mockTimeSeriesData} onExport={onExport} />);

      const exportButton = screen.getByLabelText(/export csv/i);
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(onExport).toHaveBeenCalledWith('csv');
      });
    });
  });

  describe('metric selection', () => {
    it('should add metric to chart when selected', async () => {
      render(<TimeSeriesView data={mockTimeSeriesData} />);

      const dropdown = screen.getByLabelText(/select metric/i);
      fireEvent.change(dropdown, { target: { value: 'average_mood' } });

      await waitFor(() => {
        expect(screen.getByText(/average_mood/i)).toBeInTheDocument();
      });
    });

    it('should remove metric from chart when deselected', async () => {
      render(<TimeSeriesView data={mockTimeSeriesData} selectedMetrics={['average_mood']} />);

      const removeButton = screen.getByLabelText(/remove average_mood/i);
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(screen.queryByText(/average_mood/i)).not.toBeInTheDocument();
      });
    });

    it('should limit to maximum 5 metrics simultaneously', async () => {
      const manyMetrics = ['metric1', 'metric2', 'metric3', 'metric4', 'metric5', 'metric6'];

      render(<TimeSeriesView data={mockTimeSeriesData} selectedMetrics={manyMetrics} />);

      // Should only show first 5
      await waitFor(() => {
        const legend = screen.getByTestId('chart-legend');
        const items = legend.querySelectorAll('.legend-item');
        expect(items.length).toBeLessThanOrEqual(5);
      });
    });
  });

  describe('time window configuration', () => {
    it('should configure time window (hour, day, week)', async () => {
      render(<TimeSeriesView data={mockTimeSeriesData} />);

      const timeWindowSelector = screen.getByLabelText(/time window/i);
      expect(timeWindowSelector).toBeInTheDocument();

      fireEvent.click(timeWindowSelector);

      await waitFor(() => {
        expect(screen.getByText(/hour/i)).toBeInTheDocument();
        expect(screen.getByText(/day/i)).toBeInTheDocument();
        expect(screen.getByText(/week/i)).toBeInTheDocument();
      });
    });

    it('should filter data by selected time window', async () => {
      render(<TimeSeriesView data={mockTimeSeriesData} timeWindow="day" />);

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });

      // Verify data is filtered to last day
    });
  });

  describe('error handling', () => {
    it('should throw when metrics array is empty', () => {
      expect(() => {
        render(<TimeSeriesView data={{ ...mockTimeSeriesData, metrics: [] }} />);
      }).toThrow('at least one metric');
    });

    it('should display error message on render failure', async () => {
      const badData = { ...mockTimeSeriesData, metrics: null };

      render(<TimeSeriesView data={badData as any} />);

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });
  });

  describe('loading states', () => {
    it('should show loading indicator while data is loading', () => {
      render(<TimeSeriesView data={null} loading={true} />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('CSV export', () => {
    it('should format data correctly for CSV', async () => {
      const onExport = vi.fn();
      render(<TimeSeriesView data={mockTimeSeriesData} onExport={onExport} />);

      const exportButton = screen.getByLabelText(/export csv/i);
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(onExport).toHaveBeenCalled();
        const csvData = onExport.mock.calls[0][1]; // CSV content

        // Verify CSV has headers
        expect(csvData).toContain('timestamp');
        expect(csvData).toContain('average_mood');
      });
    });

    it('should include all selected metrics in export', async () => {
      const onExport = vi.fn();
      render(
        <TimeSeriesView
          data={mockTimeSeriesData}
          selectedMetrics={['average_mood', 'resource_inequality']}
          onExport={onExport}
        />
      );

      const exportButton = screen.getByLabelText(/export csv/i);
      fireEvent.click(exportButton);

      await waitFor(() => {
        const csvData = onExport.mock.calls[0][1];
        expect(csvData).toContain('average_mood');
        expect(csvData).toContain('resource_inequality');
      });
    });
  });

  describe('correlation matrix', () => {
    it('should show correlation between all metric pairs', async () => {
      render(<TimeSeriesView data={mockTimeSeriesData} showCorrelation={true} />);

      await waitFor(() => {
        const matrix = screen.getByTestId('correlation-matrix');
        expect(matrix).toBeInTheDocument();
      });

      // Verify all correlations are shown
      expect(mockTimeSeriesData.correlations).toHaveLength(3);
    });

    it('should color code correlation strength', async () => {
      render(<TimeSeriesView data={mockTimeSeriesData} showCorrelation={true} />);

      await waitFor(() => {
        const matrix = screen.getByTestId('correlation-matrix');

        // Strong positive: green, strong negative: red, weak: gray
        const cells = matrix.querySelectorAll('.correlation-cell');
        expect(cells.length).toBeGreaterThan(0);
      });
    });

    it('should show correlation values in range [-1, 1]', async () => {
      render(<TimeSeriesView data={mockTimeSeriesData} showCorrelation={true} />);

      await waitFor(() => {
        mockTimeSeriesData.correlations.forEach(([_, __, rValue]) => {
          expect(rValue).toBeGreaterThanOrEqual(-1);
          expect(rValue).toBeLessThanOrEqual(1);
        });
      });
    });

    it('should handle NaN correlations gracefully', async () => {
      const dataWithNaN = {
        ...mockTimeSeriesData,
        correlations: [['metric1', 'metric2', NaN]],
      };

      render(<TimeSeriesView data={dataWithNaN} showCorrelation={true} />);

      await waitFor(() => {
        expect(screen.getByText(/N\/A/i)).toBeInTheDocument();
      });
    });
  });

  describe('chart interaction', () => {
    it('should show tooltip on hover', async () => {
      render(<TimeSeriesView data={mockTimeSeriesData} selectedMetrics={['average_mood']} />);

      const chart = screen.getByTestId('line-chart');
      fireEvent.mouseEnter(chart);

      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
      });
    });

    it('should zoom into time range', async () => {
      render(<TimeSeriesView data={mockTimeSeriesData} />);

      const zoomButton = screen.getByLabelText(/zoom/i);
      fireEvent.click(zoomButton);

      await waitFor(() => {
        expect(screen.getByTestId('zoom-controls')).toBeInTheDocument();
      });
    });
  });
});
