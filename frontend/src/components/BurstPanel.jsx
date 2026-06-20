import { useState } from 'react'

export default function BurstPanel({ status, isBursting, onFire, onBurst, onStop }) {
  const [burstCount, setBurstCount] = useState(30)

  return (
    <div className="burst-panel">
      <h3 className="panel-title">🚀 Controls</h3>

      <button className="btn-fire" onClick={onFire} disabled={isBursting}>
        ⚡ Fire Single Request
      </button>

      <div className="burst-config">
        <div className="slider-header">
          <label>Burst Count</label>
          <span className="slider-value">{burstCount} requests</span>
        </div>
        <input
          type="range" min="5" max="100" value={burstCount}
          onChange={e => setBurstCount(Number(e.target.value))}
          className="slider"
        />
      </div>

      {isBursting ? (
        <button className="btn-stop" onClick={onStop}>■ Stop Burst</button>
      ) : (
        <button className="btn-burst" onClick={() => onBurst(burstCount)}>
          🚀 Auto Burst ({burstCount} requests)
        </button>
      )}

      {status && (
        <div className={`status-card ${status.allowed === false ? 'blocked' : status.allowed ? 'allowed' : ''}`}>
          {status.error ? (
            <>
              <span className="status-icon">⚠️</span>
              <div>
                <div className="status-title">Connection Error</div>
                <div className="status-detail">{status.message}</div>
              </div>
            </>
          ) : status.allowed ? (
            <>
              <span className="status-icon">✅</span>
              <div>
                <div className="status-title">Request Allowed</div>
                <div className="status-detail">{status.remaining} tokens remaining</div>
              </div>
            </>
          ) : (
            <>
              <span className="status-icon">🚫</span>
              <div>
                <div className="status-title">Rate Limited (429)</div>
                <div className="status-detail">
                  Retry after {status.retryAfter?.toFixed(2)}s
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
