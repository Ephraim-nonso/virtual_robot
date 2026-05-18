import { useDashboardContext } from '../context/useDashboardContext';

export const MapPanel = () => {
  const { map, status } = useDashboardContext();

  return (
    <article className="panel map-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Environment</p>
          <h2>Environment grid</h2>
          {status ? (
            <p className="panel-subcopy">
              Robot currently at ({status.position.x}, {status.position.y})
            </p>
          ) : null}
        </div>
        <span className="caption">{map ? `${map.width} x ${map.height}` : 'Waiting for simulator'}</span>
      </div>

      {map && status ? (
        <>
          <div className="map-legend" aria-label="Map legend">
            <span className="map-legend-item">
              <span className="map-cell map-cell-preview" />
              Empty
            </span>
            <span className="map-legend-item">
              <span className="map-cell obstacle map-cell-preview" />
              Obstacle
            </span>
            <span className="map-legend-item">
              <span className="map-cell robot map-cell-preview" />
              Robot
            </span>
          </div>

          <div className="map-grid" style={{ gridTemplateColumns: `repeat(${map.width}, minmax(0, 1fr))` }}>
            {map.grid.flatMap((row, y) =>
              row.map((cell, x) => {
                const isRobot = status.position.x === x && status.position.y === y;
                const className = isRobot ? 'map-cell robot' : cell === 1 ? 'map-cell obstacle' : 'map-cell';
                const label = isRobot
                  ? `Robot at ${x}, ${y}`
                  : cell === 1
                    ? `Obstacle at ${x}, ${y}`
                    : `Empty cell at ${x}, ${y}`;

                return <span key={`${x}-${y}`} className={className} title={label} aria-label={label} />;
              }),
            )}
          </div>
        </>
      ) : (
        <p className="empty-state">Map data will appear here once the backend reaches the simulator.</p>
      )}
    </article>
  );
};
