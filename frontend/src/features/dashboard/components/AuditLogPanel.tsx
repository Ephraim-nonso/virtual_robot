import { formatDateTime, parseJsonText, prettyNumber } from '../lib/formatters';
import { useDashboardContext } from '../context/useDashboardContext';

const renderPayloadPreview = (value: string | null) => {
  const parsed = parseJsonText(value);

  if (parsed === null) {
    return 'No payload';
  }

  return typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
};

export const AuditLogPanel = () => {
  const { commandAuditItems, statusAuditItems, auditLoading, auditError, loadAuditHistory } = useDashboardContext();
  const latestCommand = commandAuditItems[0];
  const latestStatus = statusAuditItems[0];

  return (
    <article className="panel audit-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Mission History</p>
          <h2>Audit logs</h2>
          <p className="panel-subcopy">
            Review recent command attempts and captured robot status snapshots from the backend audit store.
          </p>
        </div>
        <button className="ghost-button" onClick={() => void loadAuditHistory()} disabled={auditLoading}>
          {auditLoading ? 'Refreshing...' : 'Refresh history'}
        </button>
      </div>

      {auditError ? <div className="banner error audit-banner">{auditError}</div> : null}

      <div className="audit-summary-grid">
        <div className="audit-summary-card">
          <span>Command history</span>
          <strong>{commandAuditItems.length} items</strong>
          <p>{latestCommand ? `${latestCommand.commandType} by ${latestCommand.actor}` : 'No command audit entries yet.'}</p>
        </div>
        <div className="audit-summary-card">
          <span>Status snapshots</span>
          <strong>{statusAuditItems.length} items</strong>
          <p>{latestStatus ? `${latestStatus.robotStatus} at (${latestStatus.positionX}, ${latestStatus.positionY})` : 'No status snapshot entries yet.'}</p>
        </div>
      </div>

      <details className="panel-disclosure audit-disclosure">
        <summary>{auditLoading ? 'Refreshing mission history...' : 'Show full mission history'}</summary>
        <div className="audit-section">
          <div className="audit-section-header">
            <strong>Command history</strong>
            <span className="caption">{commandAuditItems.length} recent items</span>
          </div>
          {commandAuditItems.length > 0 ? (
            <div className="audit-list">
              {commandAuditItems.map((item) => (
                <article key={item.id} className={`audit-card ${item.resultStatus === 'FAILED' ? 'failed' : 'succeeded'}`}>
                  <div className="audit-card-header">
                    <strong>{item.commandType}</strong>
                    <span className="caption">{item.resultStatus}</span>
                  </div>
                  <p className="audit-meta">
                    {formatDateTime(item.createdAt)} by {item.actor}
                  </p>
                  <p className="audit-body">
                    Request: <code>{renderPayloadPreview(item.requestPayload)}</code>
                  </p>
                  {item.responsePayload ? (
                    <p className="audit-body">
                      Response: <code>{renderPayloadPreview(item.responsePayload)}</code>
                    </p>
                  ) : null}
                  {item.errorMessage ? <p className="audit-body error-copy">Error: {item.errorMessage}</p> : null}
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-state">No command audit entries yet.</p>
          )}
        </div>

        <div className="audit-section">
          <div className="audit-section-header">
            <strong>Status snapshots</strong>
            <span className="caption">{statusAuditItems.length} recent items</span>
          </div>
          {statusAuditItems.length > 0 ? (
            <div className="audit-list">
              {statusAuditItems.map((item) => (
                <article key={item.id} className="audit-card status">
                  <div className="audit-card-header">
                    <strong>{item.robotStatus}</strong>
                    <span className="caption">{item.source}</span>
                  </div>
                  <p className="audit-meta">
                    {formatDateTime(item.createdAt)} | Robot {item.robotId}
                  </p>
                  <p className="audit-body">
                    Position ({item.positionX}, {item.positionY}) with battery {prettyNumber(item.battery)}%
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-state">No status snapshot entries yet.</p>
          )}
        </div>
      </details>
    </article>
  );
};
