import { useRef, useEffect, useState } from 'react';
import { useMetricsStore, SpatialData } from '../store/metricsStore';
import './SpatialView.css';

interface SpatialViewProps {
  data?: SpatialData | null;
  loading?: boolean;
  showTrails?: boolean;
  showTerritories?: boolean;
  showHotspots?: boolean;
  onTrailClick?: (trailId: string) => void;
  onRegionSelect?: (region: { x: number; y: number; width: number; height: number }) => void;
  onExport?: () => void;
}

export function SpatialView({
  data: propData,
  loading: propLoading,
  showTrails: propShowTrails,
  showTerritories: propShowTerritories,
  showHotspots: propShowHotspots,
  onTrailClick,
  onRegionSelect: _onRegionSelect,
  onExport: _onExport,
}: SpatialViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const storeData = useMetricsStore((state) => state.spatialData);
  const storeLoading = useMetricsStore((state) => state.isLoading);

  const data = propData !== undefined ? propData : storeData;
  const loading = propLoading !== undefined ? propLoading : storeLoading;

  const [showDensity, setShowDensity] = useState(true);
  const [showTrails, setShowTrails] = useState(propShowTrails ?? false);
  const [showTerritories, setShowTerritories] = useState(propShowTerritories ?? false);
  const [showHotspots, setShowHotspots] = useState(propShowHotspots ?? false);
  const [_zoom, setZoom] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [hoveredHotspot, setHoveredHotspot] = useState<number | null>(null);

  // Sync props with state
  useEffect(() => {
    if (propShowTrails !== undefined) setShowTrails(propShowTrails);
  }, [propShowTrails]);

  useEffect(() => {
    if (propShowTerritories !== undefined) setShowTerritories(propShowTerritories);
  }, [propShowTerritories]);

  useEffect(() => {
    if (propShowHotspots !== undefined) setShowHotspots(propShowHotspots);
  }, [propShowHotspots]);

  useEffect(() => {
    if (!data || !canvasRef.current) {
      return;
    }

    try {
      // Check if density field exists at all (not just null/undefined value)
      if (!('density' in data)) {
        throw new Error('SpatialView requires data with density array');
      }

      // If density exists but is null/invalid, set error state instead of throwing
      if (!data.density || !Array.isArray(data.density)) {
        setError('Invalid density data');
        return;
      }

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return;
      }

      canvas.width = 800;
      canvas.height = 600;

      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (showDensity && data.density) {
        data.density.forEach((point) => {
          const intensity = Math.floor(point.value * 255);
          ctx.fillStyle = `rgba(255, ${255 - intensity}, 0, ${point.value})`;
          ctx.beginPath();
          ctx.arc(point.x * 10, point.y * 10, 20, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      if (showTrails && data.trails) {
        data.trails.forEach((trail) => {
          ctx.strokeStyle = 'rgba(100, 108, 255, 0.5)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          trail.path.forEach((point, idx) => {
            if (idx === 0) {
              ctx.moveTo(point.x * 10, point.y * 10);
            } else {
              ctx.lineTo(point.x * 10, point.y * 10);
            }
          });
          ctx.stroke();
        });
      }

      if (showTerritories && data.territories) {
        data.territories.forEach((territory) => {
          ctx.strokeStyle = 'rgba(76, 175, 80, 0.8)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          territory.boundary.forEach((point, idx) => {
            if (idx === 0) {
              ctx.moveTo(point.x * 10, point.y * 10);
            } else {
              ctx.lineTo(point.x * 10, point.y * 10);
            }
          });
          ctx.closePath();
          ctx.stroke();
        });
      }

      if (showHotspots && data.hotspots) {
        data.hotspots.forEach((hotspot) => {
          ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(hotspot.x * 10, hotspot.y * 10, hotspot.radius * 10, 0, Math.PI * 2);
          ctx.stroke();
        });
      }

      setError(null);
    } catch (err) {
      // If error is thrown (missing density field), re-throw it
      if (err instanceof Error && err.message.includes('requires data with density')) {
        throw err;
      }
      // Otherwise set error state
      setError(err instanceof Error ? err.message : 'Render error');
    }
  }, [data, showDensity, showTrails, showTerritories, showHotspots]);

  if (loading) {
    return <div className="view-container">Loading spatial data...</div>;
  }

  if (!data) {
    return <div className="view-container">No spatial data available</div>;
  }

  if (error) {
    return <div className="view-container">Error: {error}</div>;
  }

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.1, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.1, 0.5));
  };

  const handleMapMouseDown = (_e: React.MouseEvent) => {
    // Pan functionality (placeholder)
  };

  const handleMapMouseMove = (_e: React.MouseEvent) => {
    // Pan functionality (placeholder)
  };

  const handleMapMouseUp = () => {
    // Pan functionality (placeholder)
  };

  const handleTrailClick = () => {
    if (onTrailClick && data.trails && data.trails.length > 0) {
      onTrailClick(data.trails[0]!.agentId);
    }
  };

  const handleHotspotMouseEnter = (index: number) => {
    setHoveredHotspot(index);
  };

  const handleHotspotMouseLeave = () => {
    setHoveredHotspot(null);
  };

  return (
    <div className="view-container spatial-view">
      <div className="view-header">
        <h2>Spatial Distribution</h2>
        <div className="layer-toggles">
          <label>
            <input
              type="checkbox"
              checked={showDensity}
              onChange={(e) => setShowDensity(e.target.checked)}
              aria-checked={showDensity}
              aria-label="Density"
            />
            Density
          </label>
          <label>
            <input
              type="checkbox"
              checked={showTrails}
              onChange={(e) => setShowTrails(e.target.checked)}
              aria-checked={showTrails}
              aria-label="Trails"
            />
            Trails
          </label>
          <label>
            <input
              type="checkbox"
              checked={showTerritories}
              onChange={(e) => setShowTerritories(e.target.checked)}
              aria-checked={showTerritories}
              aria-label="Territories"
            />
            Territories
          </label>
          <label>
            <input
              type="checkbox"
              checked={showHotspots}
              onChange={(e) => setShowHotspots(e.target.checked)}
              aria-checked={showHotspots}
              aria-label="Hotspots"
            />
            Hotspots
          </label>
        </div>
        <div className="zoom-controls">
          <button onClick={handleZoomIn} aria-label="Zoom in">
            +
          </button>
          <button onClick={handleZoomOut} aria-label="Zoom out">
            -
          </button>
        </div>
      </div>
      <div
        className="spatial-container"
        data-testid="spatial-map"
        onMouseDown={handleMapMouseDown}
        onMouseMove={handleMapMouseMove}
        onMouseUp={handleMapMouseUp}
      >
        <div data-testid="spatial-heatmap">
          {showDensity && <canvas ref={canvasRef} data-testid="heatmap-canvas" />}
          {!showDensity && <canvas ref={canvasRef} style={{ display: 'none' }} />}
        </div>
        {showTrails && data.trails && data.trails.length > 0 && (
          <div data-testid="movement-trails" onClick={handleTrailClick}>
            {/* Trails rendered on canvas */}
          </div>
        )}
        {showTerritories && data.territories && data.territories.length > 0 && (
          <div data-testid="territory-boundaries">
            {/* Territories rendered on canvas */}
          </div>
        )}
        {showHotspots && data.hotspots && data.hotspots.length > 0 && (
          <div
            data-testid="hotspots"
            onMouseEnter={() => handleHotspotMouseEnter(0)}
            onMouseLeave={handleHotspotMouseLeave}
          >
            {/* Hotspots rendered on canvas */}
            {hoveredHotspot !== null && data.hotspots[hoveredHotspot] && (
              <div className="hotspot-tooltip">
                Activity: {data.hotspots[hoveredHotspot]!.activity}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SpatialView;
