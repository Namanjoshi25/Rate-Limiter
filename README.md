# Production Gateway & Redis Microservice Lab

A production-grade **API Gateway and Performance Microservice** built with **FastAPI** and backed by **Redis**, featuring:

1. ⚡ **Distributed Token-Bucket Rate Limiter:** Atomic check & deduct via Redis Lua script, sliding refills, and custom `X-RateLimit-*` headers with an interactive React playground.
2. 🛡️ **Stampede-Proof Mutex Cache:** Cache-aside client with distributed mutex locking (`SET NX PX`), random TTL jitter, negative caching, and Soft Expiration / Stale-While-Revalidate (SWR).
3. 📬 **Decoupled Asynchronous Job Queue:** High-throughput producer/consumer task queue using Redis Lists (`LPUSH`/`BRPOP`) and Hashes for state lifecycle tracking (`queued` → `processing` → `completed` / `failed`).

---

## Architecture & Core Systems

### 1. Distributed Token-Bucket Rate Limiter
Every request costs tokens. Each client (keyed by IP) has a bucket holding up to `capacity` tokens that refills at `refill_rate` tokens/sec.
- **Atomic Lua Script (`src/scripts/token_bucket.lua`):** Calculates elapsed time, adds earned tokens up to capacity, and deducts the cost in a single atomic Redis transaction.
- **Zero Race Conditions:** Prevents multiple workers or servers from desynchronizing limits.
- **Headers Exposed:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `Retry-After` on `429 Too Many Requests`.

```
Request ──► RateLimitMiddleware ──► RateLimiter ──► RedisStore ──► token_bucket.lua
                                        │                               │
                                   IP Extractor                   Atomic Refill +
                                (IP → bucket key)                 Deduct on Redis
                                                                        │
                    ┌───────────────────────────────────────────────────┘
                    ▼
        tokens ≥ cost ?  ── yes ──►  200 OK  (X-RateLimit-Limit / -Remaining)
                         ── no  ──►  429 Too Many Requests  (Retry-After)
```

---

### 2. Stampede-Proof Mutex Cache (`MutexCache`)
Protects backend databases from high-concurrency traffic anomalies:
- **Cache Stampede (Thundering Herd) Defense:** When a hot key expires, only the single leader request acquires a distributed lock (`SET lock:key token NX PX timeout`) to query the database.
- **Safe Lua Unlock:** Releases the lock only if the token matches the worker's unique ID, preventing accidental lock theft.
- **Negative Caching:** Non-existent keys store a sentinel (`__NULL_CACHE__`) to prevent Cache Penetration.
- **Cache Avalanche Defense:** Injects randomized jitter into TTLs to prevent synchronized expirations.
- **Soft TTL / Stale-While-Revalidate (SWR):** Cached values are stored in an envelope with a soft expiration timestamp. Readers immediately receive stale data (~2ms) while the leader refreshes the cache in the background.

```
Request ──► MutexCache.get_or_compute(key)
                 │
                 ├── Cache Hit? ────────► Return Cached Data (<2ms)
                 │
                 └── Cache Miss / Stale:
                          │
                   Acquire Lock?
                   ├── Leader (Won Lock) ──► Query DB ──► Update Cache ──► Safe Lua Release
                   └── Follower (Lost)   ──► Serve Stale (SWR) OR Poll until Leader completes
```

---

### 3. Asynchronous Job Queue (`JobDispatcher` & `JobWorker`)
Decouples heavy background tasks from the synchronous HTTP request-response cycle:
- **Producer (`JobDispatcher`):** Writes task metadata to a Redis Hash (`job:<job_id>`) and pushes the ID to a FIFO queue (`queue:tasks`) via `LPUSH` in <2ms.
- **Consumer (`JobWorker`):** Uses blocking pop (`BRPOP`) to sleep until jobs arrive (0% idle CPU waste), executes task handlers, and manages lifecycle status transitions:
  $$\text{[queued]} \longrightarrow \text{[processing]} \longrightarrow \text{[completed]} \text{ or } \text{[failed]}$$

---

## Project Structure

```
rate-limiter/
├── src/                         # FastAPI backend microservice
│   ├── main.py                  # App entrypoint: wires stores, cache, queue, middleware & endpoints
│   ├── limiter.py               # RateLimiter orchestrator
│   ├── middleware.py            # RateLimitMiddleware: 429 short-circuit + response headers
│   │
│   ├── cache/                   # Stampede-Proof Cache module
│   │   └── mutex_cache.py       # MutexCache with SWR, TTL jitter, and safe Lua lock release
│   │
│   ├── queue/                   # Background Task Queue module
│   │   ├── job_dispatcher.py    # Producer: sub-2ms job enqueueing via Redis Hashes & Lists
│   │   └── worker.py            # Consumer: event-driven worker using BRPOP and lifecycle tracking
│   │
│   ├── core/                    # Core configuration & utilities
│   │   ├── algorithm.py         # TokenBucket & RateLimitResult dataclass
│   │   ├── bucket_store.py      # In-memory BucketStore (local reference implementation)
│   │   ├── config.py            # Pydantic settings loaded from .env
│   │   ├── connection.py        # Redis connection pool management
│   │   └── extractor.py         # KeyExtractor protocol + IPKeyExtractor
│   │
│   ├── store/                   # Storage backends
│   │   └── redis.py             # RedisStore: executes token_bucket.lua
│   │
│   ├── scripts/                 # Lua scripts executed inside Redis
│   │   ├── token_bucket.lua     # Atomic token refill + deduction logic
│   │   └── lua_test.py          # Sanity check script for Lua execution
│   │
│   ├── services/                # Mock downstream services
│   │   └── mock_db.py           # Simulated slow relational database with query counter
│   │
│   ├── models/                  # Pydantic & dataclass schemas
│   │   └── rate_limit.py        # RateLimitConfig schema
│   │
│   ├── util/                    # Shared interfaces
│   │   └── base_store.py        # BaseStore ABC (consume contract)
│   │
│   └── tests/                   # Automated concurrency & functional tests
│       ├── test_mutex_cache.py  # Concurrency tests verifying single DB query under load
│       └── test_job_queue.py    # End-to-end dispatcher & worker lifecycle tests
│
├── frontend/                    # React 18 + Vite playground
│   ├── src/
│   │   ├── App.jsx              # Interactive control panel & bucket visualizer
│   │   ├── hooks/useTokenBucket.js
│   │   └── components/          # ConfigPanel, BurstPanel, TokenBucketViz, RequestLog
│   └── vite.config.js           # Dev proxy: /api → http://localhost:8000
│
├── requirements.txt             # Python dependencies
├── Dockerfile                   # Multi-stage production container build
├── docker-compose.yml           # Redis (port 6380) + API service
└── .env                         # Runtime configuration
```

---

## Core Components

| Component | Path | Responsibility |
|---|---|---|
| `RateLimiter` | `src/limiter.py` | Orchestrates request extraction and store consumption |
| `RedisStore` | `src/store/redis.py` | Runs `token_bucket.lua` atomically on Redis |
| `MutexCache` | `src/cache/mutex_cache.py` | Prevents cache stampedes, avalanches, and penetration |
| `JobDispatcher` | `src/queue/job_dispatcher.py` | Fast background task enqueuer |
| `JobWorker` | `src/queue/worker.py` | Blocking consumer and state machine manager |
| `MockDatabase` | `src/services/mock_db.py` | Simulates slow DB with query tracking |
| `RateLimitMiddleware` | `src/middleware.py` | Starlette middleware applying rate limiting to endpoints |

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Health check endpoint (Rate-Limited) |
| `GET` | `/config` | Returns active `{capacity, refill_rate}` |
| `PATCH` | `/config` | Dynamically updates capacity or refill rate at runtime |
| `GET` | `/api/items/{item_id}` | Cached database query using `MutexCache` |

---

## Running the Project

### 1. Start Redis & API via Docker Compose

```bash
docker compose up --build
```
- API will be accessible at: `http://localhost:8000`
- Redis will be accessible on: `localhost:6380`

### 2. Run Tests Locally

Make sure Redis is running, then execute:

```powershell
# Run Cache Stampede Concurrency Tests
& ".\.venv\Scripts\python.exe" "src/tests/test_mutex_cache.py"

# Run Async Background Queue Lifecycle Tests
& ".\.venv\Scripts\python.exe" "src/tests/test_job_queue.py"
```

### 3. Run Frontend Playground

```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` to test burst requests and watch the bucket drain and refill live.
