import { useState, useEffect, useRef } from 'react'

export default function TokenBucketViz({ capacity, tokens, status, tokenHistory }) {
  const [flash, setFlash] = useState(null)
  const [shake, setShake] = useState(false)
  const prevRef = useRef(null)

  useEffect(() => {
    if (!status || status === prevRef.current) return
    prevRef.current = status
    if (status.error) return
    if (status.allowed === false) {
      setShake(true)
      setFlash('limit')
      setTimeout(() => setShake(false), 420)
      setTimeout(() => setFlash(null), 700)
    } else if (status.allowed === true) {
      setFlash('ok')
      setTimeout(() => setFlash(null), 380)
    }
  }, [status])

  const display = Math.min(capacity, 50)
  const filled  = Math.round((tokens / capacity) * display)
  const cols    = Math.min(10, display)
  const pct     = Math.min(100, (tokens / capacity) * 100)

  const sparkPath = (() => {
    if (tokenHistory.length < 2) return null
    const W = 300, H = 46, n = tokenHistory.length
    const pts = tokenHistory.map((t, i) => {
      const x = (i / (n - 1)) * W
      const y = H - Math.max(0, (t / capacity)) * H * 0.88 - 2
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    return `M ${pts.join(' L ')}`
  })()

  return (
    <div className={`bucket-panel luxe-glass${flash ? ` flash-${flash}` : ''}${shake ? ' shake' : ''}`}>
      <div className="panel-head">
        <div className="panel-icon">TB</div>
        <span className="panel-title">Token Bucket</span>
      </div>

      <div className="token-grid-wrap">
        <div className="token-grid" style={{ '--cols': cols }}>
          {Array.from({ length: display }, (_, i) => (
            <div key={i} className={`token-cell ${i < filled ? 'full' : 'empty'}`} />
          ))}
        </div>
      </div>

      <div className="bucket-foot">
        <div>
          <div className="bucket-count">{Math.floor(tokens)}</div>
          <div className="bucket-denom">/ {capacity} tokens</div>
        </div>
        <div className="token-bar">
          <div className="token-bar-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {tokenHistory.length > 10 && (
        <div className="spark-wrap">
          <div className="spark-label">Token history · last 6s</div>
          <svg className="spark-svg" viewBox="0 0 300 46" preserveAspectRatio="none">
            <defs>
              <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="var(--accent)" stopOpacity="0.22" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {sparkPath && (
              <>
                <path d={`${sparkPath} V 46 H 0 Z`} fill="url(#sg)" />
                <path
                  d={sparkPath}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            )}
          </svg>
        </div>
      )}
    </div>
  )
}
