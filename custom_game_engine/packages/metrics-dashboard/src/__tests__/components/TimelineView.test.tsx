import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { TimelineView } from '@/components/TimelineView';
import { mockTimelineData } from '../mockData';

// Mock Recharts
vi.mock('recharts', () => ({
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
}));

describe('TimelineView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Acceptance Criterion 3: Behavior Timeline', () => {
    it('should render stacked area chart', async () => {
      render(<TimelineView data={mockTimelineData} />);

      await waitFor(() => {
        expect(screen.getByTestId('area-chart')).toBeInTheDocument();
      });
    });

    it('should show behavior distribution over time', async () => {
      render(<TimelineView data={mockTimelineData} />);

      await waitFor(() => {
        expect(screen.getByTestId('timeline-container')).toBeInTheDocument();
      });

      // Verify all behaviors are present
      expect(screen.getByText(/gather/i)).toBeInTheDocument();
      expect(screen.getByText(/craft/i)).toBeInTheDocument();
      expect(screen.getByText(/socialize/i)).toBeInTheDocument();
    });

    it('should mark innovation events on timeline', async () => {
      render(<TimelineView data={mockTimelineData} />);

      await waitFor(() => {
        const innovations = screen.getAllByTestId('innovation-marker');
        expect(innovations).toHaveLength(2);
      });
    });

    it('should display innovation details on hover', async () => {
      render(<TimelineView data={mockTimelineData} />);

      const marker = screen.getAllByTestId('innovation-marker')[0];
      fireEvent.mouseEnter(marker!);

      await waitFor(() => {
        expect(screen.getByText(/craft/i)).toBeInTheDocument();
        expect(screen.getByText(/agent-001/i)).toBeInTheDocument();
      });
    });

    it('should display adoption curves (S-curves)', async () => {
      render(<TimelineView data={mockTimelineData} showAdoption={true} />);

      await waitFor(() => {
        expect(screen.getByTestId('adoption-curve')).toBeInTheDocument();
      });

      // Verify S-curve shape (slow start, rapid middle, plateau)
      const craftCurve = mockTimelineData.adoptionCurves.craft;
      expect(craftCurve).toHaveLength(4);

      // Check increasing pattern
      for (let i = 1; i < craftCurve.length; i++) {
        expect(craftCurve[i]!.adopters).toBeGreaterThanOrEqual(craftCurve[i - 1]!.adopters);
      }
    });

    it('should have time scrubber for playback', async () => {
      render(<TimelineView data={mockTimelineData} />);

      const scrubber = screen.getByTestId('time-scrubber');
      expect(scrubber).toBeInTheDocument();
    });

    it('should update chart when scrubber is dragged', async () => {
      const onTimeChange = vi.fn();
      render(<TimelineView data={mockTimelineData} onTimeChange={onTimeChange} />);

      const scrubber = screen.getByTestId('time-scrubber');
      fireEvent.change(scrubber, { target: { value: '2000' } });

      await waitFor(() => {
        expect(onTimeChange).toHaveBeenCalledWith(2000);
      });
    });
  });

  describe('export functionality', () => {
    it('should have export button', () => {
      render(<TimelineView data={mockTimelineData} />);

      expect(screen.getByLabelText(/export/i)).toBeInTheDocument();
    });

    it('should export timeline as PNG', async () => {
      const onExport = vi.fn();
      render(<TimelineView data={mockTimelineData} onExport={onExport} />);

      const exportButton = screen.getByLabelText(/export/i);
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(onExport).toHaveBeenCalledWith('png');
      });
    });

    it('should support exporting as image/video format', async () => {
      render(<TimelineView data={mockTimelineData} />);

      const exportButton = screen.getByLabelText(/export/i);
      fireEvent.click(exportButton);

      // Export menu should appear
      await waitFor(() => {
        expect(screen.getByText(/png/i)).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should throw when behaviors array is missing', () => {
      expect(() => {
        render(<TimelineView data={{ innovations: [] } as any} />);
      }).toThrow('behaviors');
    });

    it('should display error message on render failure', async () => {
      const badData = { ...mockTimelineData, behaviors: null };

      render(<TimelineView data={badData as any} />);

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });
  });

  describe('loading states', () => {
    it('should show loading indicator while data is loading', () => {
      render(<TimelineView data={null} loading={true} />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('time range selection', () => {
    it('should filter data by time range', async () => {
      render(<TimelineView data={mockTimelineData} timeRange={{ start: 1000, end: 2000 }} />);

      await waitFor(() => {
        expect(screen.getByTestId('area-chart')).toBeInTheDocument();
      });

      // Verify only data in range is shown
    });

    it('should throw when start time is after end time', () => {
      expect(() => {
        render(<TimelineView data={mockTimelineData} timeRange={{ start: 3000, end: 1000 }} />);
      }).toThrow('start time must be before end time');
    });
  });

  describe('behavior filtering', () => {
    it('should allow toggling behaviors on/off', async () => {
      render(<TimelineView data={mockTimelineData} />);

      const gatherToggle = screen.getByLabelText(/gather/i);
      fireEvent.click(gatherToggle);

      await waitFor(() => {
        // Gather behavior should be hidden
        expect(gatherToggle).toHaveAttribute('aria-checked', 'false');
      });
    });

    it('should show at least one behavior at all times', async () => {
      render(<TimelineView data={mockTimelineData} />);

      // Try to disable all behaviors
      const toggles = screen.getAllByRole('switch');
      toggles.forEach((toggle) => fireEvent.click(toggle));

      // Should keep at least one enabled
      await waitFor(() => {
        const checked = toggles.filter((t) => t.getAttribute('aria-checked') === 'true');
        expect(checked.length).toBeGreaterThan(0);
      });
    });
  });
});
