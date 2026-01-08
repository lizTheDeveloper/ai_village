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
  onRegionSelect,
  onExport,
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
  const [zoom, setZoom] = useState(1);
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
      if (!data.density || !Array.isArray(data.density)) {
        throw new Error('SpatialView requires data with density array');
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
      setError(err instanceof Error ? err.message : 'Render error');
      throw err;
    }
  }, [data, showDensity, showTrails, showTerritories, showHotspots]);

  if (loading) {
    return <div className="view-container">Loading spatial data...</div>;
  }

  if (!data) {
    return <div className="view-container">No spatial data available</div>;
  }

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
            />
            Density
          </label>
          <label>
            <input
              type="checkbox"
              checked={showTrails}
              onChange={(e) => setShowTrails(e.target.checked)}
            />
            Trails
          </label>
          <label>
            <input
              type="checkbox"
              checked={showTerritories}
              onChange={(e) => setShowTerritories(e.target.checked)}
            />
            Territories
          </label>
        </div>
      </div>
      <div className="spatial-container">
        <canvas ref={canvasRef} data-testid="spatial-canvas" />
      </div>
    </div>
  );
}

export default SpatialView;
