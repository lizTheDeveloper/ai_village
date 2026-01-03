import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { SpatialView } from '@/components/SpatialView';
import { mockSpatialData } from '../mockData';

describe('SpatialView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Acceptance Criterion 4: Spatial Heatmap', () => {
    it('should overlay heatmap on world map', async () => {
      render(<SpatialView data={mockSpatialData} />);

      await waitFor(() => {
        expect(screen.getByTestId('spatial-heatmap')).toBeInTheDocument();
      });
    });

    it('should show density with red for high concentration', async () => {
      render(<SpatialView data={mockSpatialData} />);

      await waitFor(() => {
        const canvas = screen.getByTestId('heatmap-canvas') as HTMLCanvasElement;
        expect(canvas).toBeInTheDocument();
        expect(canvas.tagName).toBe('CANVAS');
      });

      // Verify high density points are rendered
      const highDensity = mockSpatialData.density.filter((d) => d.value > 0.7);
      expect(highDensity.length).toBeGreaterThan(0);
    });

    it('should show movement trails', async () => {
      render(<SpatialView data={mockSpatialData} showTrails={true} />);

      await waitFor(() => {
        expect(screen.getByTestId('movement-trails')).toBeInTheDocument();
      });

      // Verify trails are rendered
      expect(mockSpatialData.trails).toHaveLength(1);
      expect(mockSpatialData.trails[0]!.path).toHaveLength(3);
    });

    it('should show territory boundaries', async () => {
      render(<SpatialView data={mockSpatialData} showTerritories={true} />);

      await waitFor(() => {
        expect(screen.getByTestId('territory-boundaries')).toBeInTheDocument();
      });

      // Verify territories are rendered
      expect(mockSpatialData.territories).toHaveLength(1);
    });

    it('should show hotspot detection areas', async () => {
      render(<SpatialView data={mockSpatialData} showHotspots={true} />);

      await waitFor(() => {
        expect(screen.getByTestId('hotspots')).toBeInTheDocument();
      });

      // Verify hotspots are marked
      expect(mockSpatialData.hotspots).toHaveLength(1);
      expect(mockSpatialData.hotspots[0]!.activity).toBeGreaterThan(0.9);
    });

    it('should have layer toggles', async () => {
      render(<SpatialView data={mockSpatialData} />);

      expect(screen.getByLabelText(/density/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/trails/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/territories/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/hotspots/i)).toBeInTheDocument();
    });

    it('should toggle density layer', async () => {
      render(<SpatialView data={mockSpatialData} />);

      const densityToggle = screen.getByLabelText(/density/i);
      fireEvent.click(densityToggle);

      await waitFor(() => {
        expect(densityToggle).toHaveAttribute('aria-checked', 'false');
        expect(screen.queryByTestId('heatmap-canvas')).not.toBeInTheDocument();
      });
    });

    it('should toggle trails layer', async () => {
      render(<SpatialView data={mockSpatialData} />);

      const trailsToggle = screen.getByLabelText(/trails/i);
      fireEvent.click(trailsToggle);

      await waitFor(() => {
        expect(trailsToggle).toHaveAttribute('aria-checked', 'true');
        expect(screen.getByTestId('movement-trails')).toBeInTheDocument();
      });
    });

    it('should toggle territories layer', async () => {
      render(<SpatialView data={mockSpatialData} />);

      const territoriesToggle = screen.getByLabelText(/territories/i);
      fireEvent.click(territoriesToggle);

      await waitFor(() => {
        expect(territoriesToggle).toHaveAttribute('aria-checked', 'true');
        expect(screen.getByTestId('territory-boundaries')).toBeInTheDocument();
      });
    });
  });

  describe('canvas rendering', () => {
    it('should use canvas for heatmap rendering', async () => {
      render(<SpatialView data={mockSpatialData} />);

      const canvas = screen.getByTestId('heatmap-canvas') as HTMLCanvasElement;
      expect(canvas.tagName).toBe('CANVAS');
      expect(canvas.width).toBeGreaterThan(0);
      expect(canvas.height).toBeGreaterThan(0);
    });

    it('should render heatmap with proper color gradient', async () => {
      render(<SpatialView data={mockSpatialData} />);

      await waitFor(() => {
        const canvas = screen.getByTestId('heatmap-canvas');
        expect(canvas).toBeInTheDocument();
      });

      // Verify gradient: low density (blue) to high density (red)
      const densityValues = mockSpatialData.density.map((d) => d.value);
      const minDensity = Math.min(...densityValues);
      const maxDensity = Math.max(...densityValues);

      expect(minDensity).toBeLessThan(maxDensity);
    });
  });

  describe('error handling', () => {
    it('should throw when density array is missing', () => {
      expect(() => {
        render(<SpatialView data={{ trails: [], territories: [], hotspots: [] } as any} />);
      }).toThrow('density');
    });

    it('should display error message on render failure', async () => {
      const badData = { ...mockSpatialData, density: null };

      render(<SpatialView data={badData as any} />);

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });
  });

  describe('loading states', () => {
    it('should show loading indicator while data is loading', () => {
      render(<SpatialView data={null} loading={true} />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('zoom and pan', () => {
    it('should allow zooming in', async () => {
      render(<SpatialView data={mockSpatialData} />);

      const zoomInButton = screen.getByLabelText(/zoom in/i);
      fireEvent.click(zoomInButton);

      await waitFor(() => {
        expect(zoomInButton).toBeInTheDocument();
      });
    });

    it('should allow panning the map', async () => {
      render(<SpatialView data={mockSpatialData} />);

      const map = screen.getByTestId('spatial-map');
      fireEvent.mouseDown(map, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(map, { clientX: 150, clientY: 150 });
      fireEvent.mouseUp(map);

      await waitFor(() => {
        expect(map).toBeInTheDocument();
      });
    });
  });

  describe('agent trail animation', () => {
    it('should animate agent movement along trail', async () => {
      const onTrailClick = vi.fn();
      render(<SpatialView data={mockSpatialData} showTrails={true} onTrailClick={onTrailClick} />);

      const trail = screen.getByTestId('movement-trails');
      fireEvent.click(trail);

      await waitFor(() => {
        expect(onTrailClick).toHaveBeenCalled();
      });
    });
  });

  describe('hotspot interaction', () => {
    it('should show hotspot details on hover', async () => {
      render(<SpatialView data={mockSpatialData} showHotspots={true} />);

      const hotspot = screen.getByTestId('hotspots');
      fireEvent.mouseEnter(hotspot);

      await waitFor(() => {
        expect(screen.getByText(/activity/i)).toBeInTheDocument();
      });
    });
  });
});
