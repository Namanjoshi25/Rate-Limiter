import { useState, useRef, useEffect } from 'react'
import TokenBucketViz from './components/TokenBucketViz'
import ConfigPanel    from './components/ConfigPanel'
import BurstPanel     from './components/BurstPanel'
import RequestLog     from './components/RequestLog'
import { useTokenBucket } from './hooks/useTokenBucket'

function useReveal(threshold = 0.1) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, visible]
}

const CONCEPTS = [
  {
    n: '01',
    title: 'Why rate limiting exists',
    body: 'Every API is a shared resource. Without limits, a single client can saturate the server — crashing the service for everyone else. Rate limiting makes access predictable and the system durable under any traffic pattern.',
  },
  {
    n: '02',
    title: 'The token bucket model',
    body: 'Picture a bucket that holds tokens. Each incoming request consumes one. The bucket refills at a steady drip — your sustained throughput. Hit the bucket empty and the next request receives a 429 Too Many Requests response.',
  },
  {
    n: '03',
    title: 'Capacity vs refill rate',
    body: 'Capacity is burst headroom — how many back-to-back requests are safe before limits kick in. Refill rate is the long-run ceiling — the maximum requests per second any client can sustain over time.',
  },
]

function FlowDiagram({ status }) {
  const [phase, setPhase] = useState(null)
  const prevRef = useRef(null)

  useEffect(() => {
    if (!status || status === prevRef.current) return
    prevRef.current = status
    if (status.error) return
    setPhase('travel')
    const t1 = setTimeout(() => setPhase(status.allowed ? 'ok' : 'limit'), 580)
    const t2 = setTimeout(() => setPhase(null), 1800)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [status])

  const checkActive  = phase === 'travel' || phase === 'ok' || phase === 'limit'
  const outcomeOk    = phase === 'ok'
  const outcomeLimit = phase === 'limit'

  return (
    <div className="flow-pipeline">
      {/* Node: Inbound */}
      <div className="flow-node">
        <div className={`flow-node-box${phase === 'travel' ? ' node-active' : ''}`}>
          <span className="flow-node-sub">inbound</span>
          <span className="flow-node-text">Request arrives</span>
        </div>
      </div>

      {/* Connector 1 */}
      <div className="flow-conn">
        <div className="flow-conn-line" />
        <div className={`flow-packet${phase === 'travel' ? ' go' : ''}`} />
      </div>

      {/* Node: Lua check */}
      <div className="flow-node">
        <div className={`flow-node-box${checkActive ? ' node-active' : ''}`}>
          <span className="flow-node-sub">lua script</span>
          <span className="flow-node-text">Tokens available?</span>
        </div>
      </div>

      {/* Connector 2 */}
      <div className="flow-conn">
        <div className="flow-conn-line" />
        <div className={`flow-packet${outcomeOk ? ' go-success' : outcomeLimit ? ' go' : ''}`} />
      </div>

      {/* Branch outcomes */}
      <div className="flow-branch">
        <div
          className={`flow-node-box node-success${outcomeLimit ? ' node-dim' : ''}`}
          style={{ opacity: outcomeLimit ? 0.3 : 1, transition: 'opacity 0.3s' }}
        >
          <span className="flow-node-sub" style={{ color: 'var(--success)' }}>yes</span>
          <span className="flow-node-text">200 OK — consume 1 token</span>
        </div>
        <div
          className={`flow-node-box node-error${outcomeOk ? ' node-dim' : ''}`}
          style={{ opacity: outcomeOk ? 0.3 : 1, transition: 'opacity 0.3s' }}
        >
          <span className="flow-node-sub" style={{ color: 'var(--error)' }}>no</span>
          <span className="flow-node-text">429 Too Many Requests</span>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [capacity,   setCapacity]   = useState(20)
  const [refillRate, setRefillRate] = useState(2.0)

  const {
    tokens, status, isBursting,
    fireOne, autoBurst, stopBurst,
    log, tokenHistory, burstProgress, clearLog,
  } = useTokenBucket(capacity, refillRate)

  const [conceptsRef, conceptsVisible] = useReveal()
  const [flowRef,     flowVisible]     = useReveal()
  const [playRef,     playVisible]     = useReveal()

  const allowedCount = log.filter(e => e.allowed === true).length
  const blockedCount = log.filter(e => e.allowed === false).length
  const fillTime     = (capacity / refillRate).toFixed(1)

  return (
    <>
      <div className="page-atm" aria-hidden="true">
        <div className="atm-halo" />
        <div className="atm-grid" />
      </div>

      {/* ── Nav ─────────────────────────────────────────────── */}
      <header className="site-nav">
        <div className="nav-inner">
          <div className="logo">
            <div className="logo-mark">RL</div>
            <span className="logo-name">Rate Limiter Lab</span>
          </div>
          <div className="nav-pills">
            <span className="nav-pill">FastAPI</span>
            <span className="nav-pill">Redis</span>
            <span className="nav-pill">Token Bucket</span>
          </div>
        </div>
      </header>

      <main>
        {/* ── Hero ──────────────────────────────────────────── */}
        <section className="hero-section">
          <div className="container">
            <div className="hero-inner">
              <div className="hero-eyebrow-row">
                <span className="hero-eyebrow-line" />
                <span className="eyebrow">Interactive Playground</span>
              </div>

              <h1 className="hero-headline">
                Every request<br />
                costs a <span className="hl-accent">token.</span>
              </h1>

              <p className="hero-sub">
                A live playground for the token bucket algorithm. Configure capacity and refill rate, fire requests, and watch the bucket drain — backed by FastAPI and Redis with an atomic Lua script.
              </p>

              <div className="hero-cta-row">
                <a href="#playground" className="btn btn-primary btn-inline">
                  open playground
                </a>
              </div>

              <div className="hero-live-stats">
                <div className="hero-stat">
                  <span className={`hero-stat-val is-accent`}>{Math.floor(tokens)}</span>
                  <span className="hero-stat-key">tokens now</span>
                </div>
                <div className="hero-divider" />
                <div className="hero-stat">
                  <span className="hero-stat-val">{capacity}</span>
                  <span className="hero-stat-key">capacity</span>
                </div>
                <div className="hero-divider" />
                <div className="hero-stat">
                  <span className="hero-stat-val">{refillRate.toFixed(1)}</span>
                  <span className="hero-stat-key">tokens/s</span>
                </div>
                <div className="hero-divider" />
                <div className="hero-stat">
                  <span className="hero-stat-val">{fillTime}s</span>
                  <span className="hero-stat-key">fill time</span>
                </div>
                {log.length > 0 && (
                  <>
                    <div className="hero-divider" />
                    <div className="hero-stat">
                      <span className={`hero-stat-val${blockedCount > 0 ? ' is-error' : ' is-success'}`}>
                        {blockedCount > 0 ? blockedCount : allowedCount}
                      </span>
                      <span className="hero-stat-key">{blockedCount > 0 ? 'rate limited' : 'allowed'}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Concepts ──────────────────────────────────────── */}
        <section className="page-section" ref={conceptsRef}>
          <div className="container">
            <div className="section-header">
              <div className="section-eyebrow">
                <span className="eyebrow">How it works</span>
              </div>
              <h2 className="section-headline">Three ideas behind<br />every rate limiter</h2>
              <p className="section-sub">
                The token bucket algorithm is simple to reason about and surprisingly powerful in production.
              </p>
            </div>

            <div className="concepts-grid">
              {CONCEPTS.map((c, i) => (
                <div
                  key={i}
                  className={`concept-card luxe-glass reveal reveal-d${i + 1}${conceptsVisible ? ' visible' : ''}`}
                >
                  <span className="concept-num">{c.n}</span>
                  <h3 className="concept-title">{c.title}</h3>
                  <p className="concept-body">{c.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Flow diagram ──────────────────────────────────── */}
        <section className="page-section flow-section" ref={flowRef}>
          <div className="container">
            <div className="section-header">
              <div className="section-eyebrow">
                <span className="eyebrow">Request path</span>
              </div>
              <h2 className="section-headline">What happens when<br />a request arrives</h2>
              <p className="section-sub">
                Fire a request from the playground below and watch the packet animate through this diagram in real time.
              </p>
            </div>

            <div className={`reveal${flowVisible ? ' visible' : ''}`}>
              <FlowDiagram status={status} />
            </div>
          </div>
        </section>

        {/* ── Playground ────────────────────────────────────── */}
        <section className="page-section" id="playground" ref={playRef}>
          <div className="container">
            <div className="section-header">
              <div className="section-eyebrow">
                <span className="eyebrow">Playground</span>
              </div>
              <h2 className="section-headline">Configure, fire,<br />and watch it happen</h2>
              <p className="section-sub">
                Config changes sync to the backend. Every request outcome appears in the live log as it happens.
              </p>
            </div>

            <div className={`reveal${playVisible ? ' visible' : ''}`}>
              {/* Full-width live stats bar */}
              <div className="pg-stats-bar luxe-glass">
                <div className="pg-stat">
                  <span className="pg-stat-val" style={{ color: 'var(--accent)' }}>{Math.floor(tokens)}</span>
                  <span className="pg-stat-lbl">Tokens now</span>
                </div>
                <div className="pg-stat-divider" />
                <div className="pg-stat">
                  <span className="pg-stat-val" style={{ color: 'var(--accent)' }}>{capacity}</span>
                  <span className="pg-stat-lbl">Capacity</span>
                </div>
                <div className="pg-stat-divider" />
                <div className="pg-stat">
                  <span className="pg-stat-val">{refillRate.toFixed(1)}/s</span>
                  <span className="pg-stat-lbl">Refill rate</span>
                </div>
                <div className="pg-stat-divider" />
                <div className="pg-stat">
                  <span className="pg-stat-val">{fillTime}s</span>
                  <span className="pg-stat-lbl">Fill time</span>
                </div>
                <div className="pg-stat-divider" />
                <div className="pg-stat">
                  <span className="pg-stat-val" style={{ color: allowedCount > 0 ? 'var(--success)' : undefined }}>
                    {allowedCount}
                  </span>
                  <span className="pg-stat-lbl">Allowed</span>
                </div>
                <div className="pg-stat-divider" />
                <div className="pg-stat">
                  <span className="pg-stat-val" style={{ color: blockedCount > 0 ? 'var(--error)' : undefined }}>
                    {blockedCount}
                  </span>
                  <span className="pg-stat-lbl">Rate limited</span>
                </div>
              </div>

              {/* 2×2 grid — row 1: sliders/controls, row 2: visuals/data */}
              <div className="pg-four-grid">
                <ConfigPanel
                  capacity={capacity}
                  refillRate={refillRate}
                  onApply={(cap, rate) => { setCapacity(cap); setRefillRate(rate) }}
                />
                <BurstPanel
                  status={status}
                  isBursting={isBursting}
                  onFire={fireOne}
                  onBurst={autoBurst}
                  onStop={stopBurst}
                  burstProgress={burstProgress}
                />
                <TokenBucketViz
                  capacity={capacity}
                  tokens={tokens}
                  status={status}
                  tokenHistory={tokenHistory}
                />
                <RequestLog log={log} onClear={clearLog} />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer className="site-footer">
        <div className="container">
          <div className="footer-inner">
            <span className="footer-txt">FastAPI · Redis · Token Bucket · React</span>
            <span className="footer-txt">Rate Limiter Lab</span>
          </div>
        </div>
      </footer>
    </>
  )
}
