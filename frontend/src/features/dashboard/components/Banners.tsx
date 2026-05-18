import { useDashboardContext } from '../context/useDashboardContext';

export const DashboardBanners = () => {
  const { error, loading } = useDashboardContext();

  return (
    <>
      {error ? <div className="banner error">{error}</div> : null}
      {loading ? (
        <div className="dashboard-loading-overlay" role="status" aria-live="polite" aria-label="Loading robot state">
          <div className="dashboard-loading-modal">
            <span className="dashboard-loading-spinner" aria-hidden="true" />
            <div>
              <p className="eyebrow">Mission control</p>
              <strong>Loading robot state</strong>
              <p className="panel-subcopy">Syncing environment data, telemetry, and operator controls.</p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};
