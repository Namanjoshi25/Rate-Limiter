import { useState } from 'react'
import TokenBucketViz from './components/TokenBucketViz'
import ConfigPanel from './components/ConfigPanel'
import BurstPanel from './components/BurstPanel'
import { useTokenBucket } from './hooks/useTokenBucket'

const LEARN_CARDS = [
  {
    icon: '🛡️',
    title: 'What is Rate Limiting?',
    body: 'Rate limiting controls how many requests a client can make over time. It protects APIs from abuse, prevents server overload, and ensures fair access for all users.',
  },
  {
    icon: '🪣',
    title: 'Token Bucket Algorithm',
    body: 'Imagine a bucket that holds tokens. Each request consumes one token. The bucket refills at a constant rate. When empty, new requests are rejected with a 429 response.',
  },
  {
    icon: '⚖️',
    title: 'Capacity vs Refill Rate',
    body: 'Capacity is the burst size — how many back-to-back requests are allowed. Refill rate is the sustained throughput — new tokens added per second while idle.',
  },
]

export default function App() {
  const [capacity, setCapacity] = useState(20)
  const [refillRate, setRefillRate] = useState(2.0)

  const { tokens, status, isBursting, fireOne, autoBurst, stopBurst } =
    useTokenBucket(capacity, refillRate)

  return (
    <div className="app">
      <header className="site-header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">⚡</span>
            <span className="logo-text">Rate Limiter Lab</span>
          </div>
          <span className="header-badge">Token Bucket · FastAPI · Redis</span>
        </div>
      </header>

      <main>
        {/* ── Learn ── */}
        <section className="learn-section">
          <div className="section-header">
            <h2>How it works</h2>
            <p className="section-sub">The token bucket algorithm in 3 ideas</p>
          </div>
          <div className="cards-grid">
            {LEARN_CARDS.map((c, i) => (
              <div key={i} className="learn-card">
                <div className="card-icon">{c.icon}</div>
                <h3>{c.title}</h3>
                <p>{c.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Flow ── */}
        <section className="flow-section">
          <div className="flow-diagram">
            <div className="flow-box request">📨 Request arrives</div>
            <div className="flow-arrow">→</div>
            <div className="flow-box check">🔍 Tokens available?</div>
            <div className="flow-arrow">→</div>
            <div className="flow-branch">
              <div className="flow-box success">✅ Yes → consume 1 token, return 200</div>
              <div className="flow-box error">🚫 No → return 429 Too Many Requests</div>
            </div>
          </div>
        </section>

        {/* ── Playground ── */}
        <section>
          <div className="section-header">
            <h2>🔬 Playground</h2>
            <p className="section-sub">
              Adjust config, fire requests, and watch the bucket drain in real time
            </p>
          </div>

          <div className="playground-grid">
            <div className="playground-left">
              <ConfigPanel
                capacity={capacity}
                refillRate={refillRate}
                onApply={(cap, rate) => { setCapacity(cap); setRefillRate(rate) }}
              />
              <TokenBucketViz capacity={capacity} tokens={tokens} status={status} />
            </div>

            <div className="playground-right">
              <BurstPanel
                status={status}
                isBursting={isBursting}
                onFire={fireOne}
                onBurst={autoBurst}
                onStop={stopBurst}
              />

              <div className="info-card">
                <h4>📊 Live Stats</h4>
                <div className="info-row">
                  <span>Capacity</span>
                  <code>{capacity} tokens</code>
                </div>
                <div className="info-row">
                  <span>Refill Rate</span>
                  <code>{refillRate}/s</code>
                </div>
                <div className="info-row">
                  <span>Fill time (0 → full)</span>
                  <code>{(capacity / refillRate).toFixed(1)}s</code>
                </div>
                <div className="info-row">
                  <span>Max sustained req/s</span>
                  <code>{refillRate}</code>
                </div>
                <div className="info-row">
                  <span>Tokens now</span>
                  <code>{Math.floor(tokens)}</code>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        Built with FastAPI · Redis · Token Bucket Algorithm
      </footer>
    </div>
  )
}
