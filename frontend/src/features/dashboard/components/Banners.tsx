import { useDashboardContext } from '../context/useDashboardContext';

export const DashboardBanners = () => {
  const { error, loading } = useDashboardContext();

  return (
    <>
      {error ? <div className="banner error">{error}</div> : null}
      {loading ? <div className="banner">Loading robot state...</div> : null}
    </>
  );
};
