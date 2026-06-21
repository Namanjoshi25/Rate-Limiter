export default function RequestLog({ log, onClear }) {
  const allowed = log.filter(e => e.allowed === true).length
  const blocked = log.filter(e => e.allowed === false).length

  return (
    <div className="log-panel luxe-glass">
      <div className="log-head">
        <div className="log-head-left">
          <div className="panel-icon">LG</div>
          <span className="panel-title">Live Request Log</span>
        </div>

        <div className="log-counters">
          {log.length > 0 && (
            <>
              <div className="log-counter">
                <div className="log-dot ok" />
                <span className="log-count-num">{allowed}</span>
              </div>
              <div className="log-counter">
                <div className="log-dot limit" />
                <span className="log-count-num">{blocked}</span>
              </div>
              <button className="log-clear-btn" onClick={onClear}>clear</button>
            </>
          )}
        </div>
      </div>

      <div className="log-list">
        {log.length === 0 ? (
          <div className="log-empty">
            <div className="log-empty-ring" />
            <span className="log-empty-txt">No requests yet</span>
          </div>
        ) : (
          log.map(entry => (
            <div
              key={entry.id}
              className={`log-entry${entry.allowed === true ? ' le-ok' : entry.allowed === false ? ' le-limit' : ''}`}
            >
              <span className="le-status">
                {entry.allowed === true ? 'ok' : entry.allowed === false ? 'limit' : 'err'}
              </span>
              <span className="le-code">{entry.status}</span>
              <span className="le-info">
                {entry.allowed === true
                  ? `${entry.remaining} left`
                  : entry.allowed === false
                    ? `retry ${entry.retryAfter?.toFixed(2)}s`
                    : 'network error'}
              </span>
              <span className="le-time">{entry.time}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
