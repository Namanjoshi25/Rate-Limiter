import { useState, useEffect, useRef } from 'react'

export default function TokenBucketViz({ capacity, tokens, status }) {
  const [flash, setFlash] = useState(null)   // 'success' | 'blocked'
  const [shake, setShake] = useState(false)
  const prevStatusRef = useRef(null)

  useEffect(() => {
    if (!status || status === prevStatusRef.current) return
    prevStatusRef.current = status
    if (status.error) return

    if (status.allowed === false) {
      setShake(true)
      setFlash('blocked')
      setTimeout(() => setShake(false), 450)
      setTimeout(() => setFlash(null), 750)
    } else if (status.allowed === true) {
      setFlash('success')
      setTimeout(() => setFlash(null), 400)
    }
  }, [status])

  const display = Math.min(capacity, 50)
  const filled = Math.round((tokens / capacity) * display)
  const cols = Math.min(10, display)

  return (
    <div className={`bucket-wrapper ${flash ? `flash-${flash}` : ''} ${shake ? 'shake' : ''}`}>
      <div className="bucket-label">
        <span className="bucket-icon">🪣</span>
        <span className="bucket-title">Token Bucket</span>
      </div>

      <div className="bucket-container">
        <div className="bucket-grid" style={{ '--cols': cols }}>
          {Array.from({ length: display }, (_, i) => (
            <div
              key={i}
              className={`token-cell ${i < filled ? 'filled' : 'empty'}`}
            />
          ))}
        </div>
      </div>

      <div className="bucket-stats">
        <div className="stat">
          <span className="stat-value">{Math.floor(tokens)}</span>
          <span className="stat-label">/ {capacity} tokens</span>
        </div>
        <div className="token-bar">
          <div
            className="token-bar-fill"
            style={{ width: `${Math.min(100, (tokens / capacity) * 100)}%` }}
          />
        </div>
      </div>
    </div>
  )
}
