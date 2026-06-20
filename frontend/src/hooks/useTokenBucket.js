import { useState, useEffect, useRef, useCallback } from 'react'

export function useTokenBucket(capacity, refillRate) {
  const [tokens, setTokens] = useState(capacity)
  const [status, setStatus] = useState(null)
  const [isBursting, setIsBursting] = useState(false)

  const tokensRef = useRef(capacity)
  const lastTickRef = useRef(Date.now())
  const burstAbortRef = useRef(false)

  // Reset simulation when config changes
  useEffect(() => {
    tokensRef.current = capacity
    setTokens(capacity)
    lastTickRef.current = Date.now()
  }, [capacity])

  // Continuous refill tick (50ms resolution for smooth animation)
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now()
      const elapsed = (now - lastTickRef.current) / 1000
      lastTickRef.current = now
      tokensRef.current = Math.min(capacity, tokensRef.current + elapsed * refillRate)
      setTokens(tokensRef.current)
    }, 50)
    return () => clearInterval(id)
  }, [capacity, refillRate])

  const fireOne = useCallback(async () => {
    try {
      const res = await fetch('/api/')
      const allowed = res.status !== 429
      const remaining = parseInt(res.headers.get('x-ratelimit-remaining') ?? '0', 10)
      const retryAfter = parseFloat(res.headers.get('retry-after') ?? '0')

      if (allowed) {
        // Sync simulation with server reality
        tokensRef.current = remaining
        setTokens(remaining)
        lastTickRef.current = Date.now()
      }

      setStatus({
        allowed,
        remaining: allowed ? remaining : null,
        retryAfter: allowed ? null : retryAfter,
      })
      return allowed
    } catch {
      setStatus({ error: true, message: 'Cannot reach backend — is it running?' })
      return false
    }
  }, [])

  const autoBurst = useCallback(async (count) => {
    burstAbortRef.current = false
    setIsBursting(true)
    for (let i = 0; i < count; i++) {
      if (burstAbortRef.current) break
      await fireOne()
      // Small delay so animation is visible
      await new Promise(r => setTimeout(r, 80))
    }
    setIsBursting(false)
  }, [fireOne])

  const stopBurst = useCallback(() => {
    burstAbortRef.current = true
  }, [])

  return { tokens, status, isBursting, fireOne, autoBurst, stopBurst }
}
