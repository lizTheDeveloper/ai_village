import { Outlet, NavLink } from 'react-router-dom';
import { useMetricsStore } from '../store/metricsStore';
import './Layout.css';

export default function Layout() {
  const isConnected = useMetricsStore((state) => state.isConnected);
  const isLoading = useMetricsStore((state) => state.isLoading);
  const error = useMetricsStore((state) => state.error);

  return (
    <div className="layout">
      <nav className="navbar">
        <div className="navbar-brand">
          <h1>Multiverse: The End of Eternity - Metrics</h1>
          <div className="connection-status">
            <span
              className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}
            />
            {isConnected ? 'Connected' : 'Reconnecting...'}
          </div>
        </div>
        <div className="nav-links">
          <NavLink to="/network" className={({ isActive }) => (isActive ? 'active' : '')}>
            Network
          </NavLink>
          <NavLink to="/timeline" className={({ isActive }) => (isActive ? 'active' : '')}>
            Timeline
          </NavLink>
          <NavLink to="/spatial" className={({ isActive }) => (isActive ? 'active' : '')}>
            Spatial
          </NavLink>
          <NavLink to="/inequality" className={({ isActive }) => (isActive ? 'active' : '')}>
            Inequality
          </NavLink>
          <NavLink to="/cultural" className={({ isActive }) => (isActive ? 'active' : '')}>
            Cultural
          </NavLink>
          <NavLink to="/timeseries" className={({ isActive }) => (isActive ? 'active' : '')}>
            Time Series
          </NavLink>
        </div>
      </nav>
      <main className="main-content">
        {error && (
          <div className="error-banner">
            <strong>Error:</strong> {error}
          </div>
        )}
        {isLoading && (
          <div className="loading-overlay">
            <div className="spinner" />
            Loading metrics...
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
