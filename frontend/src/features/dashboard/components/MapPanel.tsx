import { useDashboardContext } from '../context/useDashboardContext';

export const MapPanel = () => {
  const { map, status } = useDashboardContext();

  return (
    <article className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Environment</p>
          <h2>Map</h2>
        </div>
        <span className="caption">{map ? `${map.width} x ${map.height}` : 'Waiting for simulator'}</span>
      </div>

      {map && status ? (
        <div className="map-grid" style={{ gridTemplateColumns: `repeat(${map.width}, minmax(0, 1fr))` }}>
          {map.grid.flatMap((row, y) =>
            row.map((cell, x) => {
              const isRobot = status.position.x === x && status.position.y === y;
              const className = isRobot ? 'map-cell robot' : cell === 1 ? 'map-cell obstacle' : 'map-cell';

              return <span key={`${x}-${y}`} className={className} title={`(${x}, ${y})`} />;
            }),
          )}
        </div>
      ) : (
        <p className="empty-state">Map data will appear here once the backend reaches the simulator.</p>
      )}
    </article>
  );
};
