import { useState } from 'react'

export default function ConfigPanel({ capacity, refillRate, onApply }) {
  const [localCap,  setLocalCap]  = useState(capacity)
  const [localRate, setLocalRate] = useState(refillRate)
  const [applying,  setApplying]  = useState(false)
  const [applied,   setApplied]   = useState(false)

  const handleApply = async () => {
    setApplying(true)
    try {
      await fetch('/api/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capacity: localCap, refill_rate: localRate }),
      })
      onApply(localCap, localRate)
      setApplied(true)
      setTimeout(() => setApplied(false), 1500)
    } catch {
      onApply(localCap, localRate)
    }
    setApplying(false)
  }

  return (
    <div className="panel luxe-glass">
      <div className="panel-head">
        <div className="panel-icon">CF</div>
        <span className="panel-title">Configuration</span>
      </div>

      <div className="slider-group">
        <div className="slider-row">
          <span className="slider-lbl">Capacity</span>
          <span className="slider-val">{localCap}</span>
        </div>
        <input
          type="range" min="1" max="50" value={localCap}
          onChange={e => setLocalCap(Number(e.target.value))}
          className="slider"
        />
        <p className="slider-hint">Burst headroom — max back-to-back requests before any refill needed</p>
      </div>

      <div className="slider-group">
        <div className="slider-row">
          <span className="slider-lbl">Refill Rate</span>
          <span className="slider-val">{localRate.toFixed(1)}/s</span>
        </div>
        <input
          type="range" min="0.1" max="10" step="0.1" value={localRate}
          onChange={e => setLocalRate(Number(e.target.value))}
          className="slider"
        />
        <p className="slider-hint">Sustained throughput — tokens added per second at rest</p>
      </div>

      <button
        className={`btn btn-primary${applied ? ' applied' : ''}`}
        onClick={handleApply}
        disabled={applying}
      >
        {applied ? '✓ applied to backend' : applying ? 'applying…' : 'apply to backend'}
      </button>
    </div>
  )
}
