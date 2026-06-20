import { useState } from 'react'

export default function ConfigPanel({ capacity, refillRate, onApply }) {
  const [localCap, setLocalCap] = useState(capacity)
  const [localRate, setLocalRate] = useState(refillRate)
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)

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
      // backend unreachable — still update local simulation
      onApply(localCap, localRate)
    }
    setApplying(false)
  }

  return (
    <div className="config-panel">
      <h3 className="panel-title">⚙️ Configuration</h3>

      <div className="slider-group">
        <div className="slider-header">
          <label>Capacity</label>
          <span className="slider-value">{localCap}</span>
        </div>
        <input
          type="range" min="1" max="50" value={localCap}
          onChange={e => setLocalCap(Number(e.target.value))}
          className="slider"
        />
        <p className="slider-hint">Max tokens in the bucket — controls burst size</p>
      </div>

      <div className="slider-group">
        <div className="slider-header">
          <label>Refill Rate</label>
          <span className="slider-value">{localRate.toFixed(1)} /s</span>
        </div>
        <input
          type="range" min="0.1" max="10" step="0.1" value={localRate}
          onChange={e => setLocalRate(Number(e.target.value))}
          className="slider"
        />
        <p className="slider-hint">Tokens added per second — controls sustained throughput</p>
      </div>

      <button
        className={`btn-apply ${applied ? 'applied' : ''}`}
        onClick={handleApply}
        disabled={applying}
      >
        {applied ? '✓ Applied to backend' : applying ? 'Applying…' : 'Apply to Backend'}
      </button>
    </div>
  )
}
