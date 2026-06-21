import { useState, useEffect, useRef, useCallback } from 'react'

export function useTokenBucket(capacity, refillRate) {
  const [tokens, setTokens] = useState(capacity)
  const [status, setStatus] = useState(null)
  const [isBursting, setIsBursting] = useState(false)
  const [log, setLog] = useState([])
  const [tokenHistory, setTokenHistory] = useState([])
  const [burstProgress, setBurstProgress] = useState({ current: 0, total: 0 })

  const tokensRef = useRef(capacity)
  const lastTickRef = useRef(Date.now())
  const burstAbortRef = useRef(false)
  const logIdRef = useRef(0)

  useEffect(() => {
    tokensRef.current = capacity
    setTokens(capacity)
    lastTickRef.current = Date.now()
  }, [capacity])

  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now()
      const elapsed = (now - lastTickRef.current) / 1000
      lastTickRef.current = now
      tokensRef.current = Math.min(capacity, tokensRef.current + elapsed * refillRate)
      const val = tokensRef.current
      setTokens(val)
      setTokenHistory(h => {
        const next = [...h, val]
        return next.length > 120 ? next.slice(-120) : next
      })
    }, 50)
    return () => clearInterval(id)
  }, [capacity, refillRate])

  const pushLog = useCallback((entry) => {
    const id = ++logIdRef.current
    const d = new Date()
    const time =
      d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
      '.' + String(d.getMilliseconds()).padStart(3, '0')
    setLog(prev => {
      const next = [{ id, time, ...entry }, ...prev]
      return next.length > 60 ? next.slice(0, 60) : next
    })
  }, [])

  const fireOne = useCallback(async () => {
    try {
      const res = await fetch('/api/')
      const allowed = res.status !== 429
      const remaining = parseInt(res.headers.get('x-ratelimit-remaining') ?? '0', 10)
      const retryAfter = parseFloat(res.headers.get('retry-after') ?? '0')

      if (allowed) {
        tokensRef.current = remaining
        setTokens(remaining)
        lastTickRef.current = Date.now()
      }

      const s = { allowed, remaining: allowed ? remaining : null, retryAfter: allowed ? null : retryAfter }
      setStatus(s)
      pushLog({ allowed, status: allowed ? 200 : 429, remaining: allowed ? remaining : null, retryAfter: allowed ? null : retryAfter })
      return allowed
    } catch {
      const err = { error: true, message: 'Cannot reach backend' }
      setStatus(err)
      pushLog({ allowed: null, status: 'ERR', error: true })
      return false
    }
  }, [pushLog])

  const autoBurst = useCallback(async (count) => {
    burstAbortRef.current = false
    setIsBursting(true)
    setBurstProgress({ current: 0, total: count })
    for (let i = 0; i < count; i++) {
      if (burstAbortRef.current) break
      await fireOne()
      setBurstProgress({ current: i + 1, total: count })
      await new Promise(r => setTimeout(r, 80))
    }
    setIsBursting(false)
    setBurstProgress({ current: 0, total: 0 })
  }, [fireOne])

  const stopBurst = useCallback(() => { burstAbortRef.current = true }, [])
  const clearLog  = useCallback(() => setLog([]), [])

  return { tokens, status, isBursting, fireOne, autoBurst, stopBurst, log, tokenHistory, burstProgress, clearLog }
}
