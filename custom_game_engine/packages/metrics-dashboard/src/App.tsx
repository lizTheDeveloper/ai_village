import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import Layout from './components/Layout';
import NetworkView from './components/NetworkView';
import TimelineView from './components/TimelineView';
import SpatialView from './components/SpatialView';
import InequalityView from './components/InequalityView';
import CulturalDiffusionView from './components/CulturalDiffusionView';
import TimeSeriesView from './components/TimeSeriesView';
import {
  useMetricsStore,
  type NetworkData,
  type TimelineData,
  type SpatialData,
  type InequalityData,
  type CulturalData,
  type TimeSeriesData,
} from './store/metricsStore';
import { getWebSocket } from './utils/websocket';
import { apiClient } from './utils/apiClient';

function App() {
  const setConnected = useMetricsStore((state) => state.setConnected);
  const setNetworkData = useMetricsStore((state) => state.setNetworkData);
  const setTimelineData = useMetricsStore((state) => state.setTimelineData);
  const setSpatialData = useMetricsStore((state) => state.setSpatialData);
  const setInequalityData = useMetricsStore((state) => state.setInequalityData);
  const setCulturalData = useMetricsStore((state) => state.setCulturalData);
  const setTimeSeriesData = useMetricsStore((state) => state.setTimeSeriesData);
  const setError = useMetricsStore((state) => state.setError);
  const setLoading = useMetricsStore((state) => state.setLoading);

  useEffect(() => {
    const ws = getWebSocket((connected) => setConnected(connected));

    const unsubscribe = ws.subscribe((data) => {
      if (data.type === 'metrics_update') {
        // Handle real-time updates
        if (data.data.network) {
          setNetworkData(data.data.network);
        }
        if (data.data.timeline) {
          setTimelineData(data.data.timeline);
        }
        if (data.data.spatial) {
          setSpatialData(data.data.spatial);
        }
        if (data.data.inequality) {
          setInequalityData(data.data.inequality);
        }
        if (data.data.cultural) {
          setCulturalData(data.data.cultural);
        }
        if (data.data.timeseries) {
          setTimeSeriesData(data.data.timeseries);
        }
      }
    });

    ws.connect();

    return () => {
      unsubscribe();
      ws.disconnect();
    };
  }, [
    setConnected,
    setNetworkData,
    setTimelineData,
    setSpatialData,
    setInequalityData,
    setCulturalData,
    setTimeSeriesData,
  ]);

  useEffect(() => {
    async function loadInitialData() {
      setLoading(true);
      setError(null);

      try {
        const [network, timeline, spatial, inequality, cultural, timeseries] =
          await Promise.all([
            apiClient.getNetworkMetrics(),
            apiClient.getTimelineMetrics(),
            apiClient.getSpatialMetrics(),
            apiClient.getInequalityMetrics(),
            apiClient.getCulturalMetrics(),
            apiClient.getTimeSeriesMetrics(),
          ]);

        setNetworkData(network as NetworkData | null);
        setTimelineData(timeline as TimelineData | null);
        setSpatialData(spatial as SpatialData | null);
        setInequalityData(inequality as InequalityData | null);
        setCulturalData(cultural as CulturalData | null);
        setTimeSeriesData(timeseries as TimeSeriesData | null);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    loadInitialData();
  }, [
    setLoading,
    setError,
    setNetworkData,
    setTimelineData,
    setSpatialData,
    setInequalityData,
    setCulturalData,
    setTimeSeriesData,
  ]);

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/network" replace />} />
        <Route path="network" element={<NetworkView />} />
        <Route path="timeline" element={<TimelineView />} />
        <Route path="spatial" element={<SpatialView />} />
        <Route path="inequality" element={<InequalityView />} />
        <Route path="cultural" element={<CulturalDiffusionView />} />
        <Route path="timeseries" element={<TimeSeriesView />} />
      </Route>
    </Routes>
  );
}

export default App;
