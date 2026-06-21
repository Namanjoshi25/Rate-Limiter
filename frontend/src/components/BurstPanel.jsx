import { useState } from 'react'

export default function BurstPanel({ status, isBursting, onFire, onBurst, onStop, burstProgress }) {
  const [burstCount, setBurstCount] = useState(30)
  const pct = burstProgress.total > 0 ? (burstProgress.current / burstProgress.total) * 100 : 0

  return (
    <div className="panel luxe-glass">
      <div className="panel-head">
        <div className="panel-icon">RQ</div>
        <span className="panel-title">Controls</span>
      </div>

      <button
        className="btn btn-ghost"
        onClick={onFire}
        disabled={isBursting}
        style={{ marginBottom: 'var(--space-4)' }}
      >
        fire single request
      </button>

      <div className="slider-group" style={{ marginBottom: 'var(--space-3)' }}>
        <div className="slider-row">
          <span className="slider-lbl">Burst Count</span>
          <span className="slider-val">{burstCount}</span>
        </div>
        <input
          type="range" min="5" max="100" value={burstCount}
          onChange={e => setBurstCount(Number(e.target.value))}
          className="slider"
        />
      </div>

      {isBursting ? (
        <>
          <div className="burst-progress">
            <div className="burst-bar">
              <div className="burst-bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="burst-bar-labels">
              <span>{burstProgress.current} / {burstProgress.total}</span>
              <span>{Math.round(pct)}%</span>
            </div>
          </div>
          <button className="btn btn-stop" onClick={onStop}>stop burst</button>
        </>
      ) : (
        <button className="btn btn-burst" onClick={() => onBurst(burstCount)}>
          burst {burstCount} requests
        </button>
      )}

      {status && (
        <div className={`status-badge${status.allowed === false ? ' sb-limit' : status.allowed ? ' sb-ok' : ''}`}>
          <div className="status-dot" />
          <span className="status-code">
            {status.error ? 'ERR' : status.allowed ? '200' : '429'}
          </span>
          <span className="status-msg">
            {status.error
              ? 'Cannot reach backend'
              : status.allowed
                ? `${status.remaining} tokens remaining`
                : `Retry in ${status.retryAfter?.toFixed(2)}s`}
          </span>
        </div>
      )}
    </div>
  )
}
