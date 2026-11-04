# 10b — Milestone Project: Production Gateway & Cache Microservice

Full curriculum document: [10b-milestone-project.md](file:///E:/Coding/learning/redis/10b-milestone-project.md)

## Summary of the Milestone

This milestone integrates **Phases 1, 2, and 3** of the Redis course into this codebase:
1. **Rate Limiter (Phase 1):** Already running via Token Bucket in `src/scripts/token_bucket.lua`. ✅
2. **Stampede-Proof Cache (Phase 3):** `src/cache/mutex_cache.py` (Completed & Passed Concurrency Tests). ✅
3. **Async Job Queue (Phase 2):** `src/queue/` (Completed & Passed Tests). ✅

---

## Step 1: Stampede-Proof Mutex Cache — Completed ✅

- Tested with 50 concurrent requests: DB queried exactly once (all 50 received cached data).
- Negative caching defense verified: Non-existent keys queried exactly once.

---

## Step 2: Implement Decoupled Background Task Queue — Completed ✅

- Tested `JobDispatcher` & `JobWorker` via `src/tests/test_job_queue.py`.
- Sub-millisecond queue ingestion, Redis Hash lifecycle management (`queued` -> `processing` -> `completed` / `failed`).
- Exception isolation tested & passing.

---

## Run the Background Queue Test

```powershell
& "E:\Coding\rate-limiter\.venv\Scripts\python.exe" "E:\Coding\rate-limiter\src\tests\test_job_queue.py"
```

---

## Step 3: MutexCache Optimizations — Completed ✅

- [x] **Lock Lease Tuning:**
  - Added per-call `lock_timeout_ms` parameter with fallback to `self.lock_timeout_ms`, allowing caller to match lease to query profile.
- [x] **Soft Expiration / Stale-While-Revalidate (SWR):**
  - Wrapped payload into an envelope (`{"data": ..., "expires_at": ...}`) with hard Redis TTL (`jittered_ttl * 2`).
  - Stale reads immediately serve cached data (~2ms) while the leader triggers a non-blocking background refresh task via distributed mutex and safe Lua unlock. Eliminates the follower polling loop.

