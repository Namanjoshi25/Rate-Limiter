# Rate Limiter Lab

A distributed **token-bucket rate limiter** built as a FastAPI middleware backed by
Redis, with an interactive React playground for visualizing how the algorithm
behaves under load. Configure capacity and refill rate, fire requests, and watch the
bucket drain and refill in real time.

- **Backend:** FastAPI + Starlette middleware, Redis (atomic Lua script)
- **Frontend:** React 18 + Vite playground
- **Algorithm:** Token bucket with per-client (IP) buckets

---

## How it works

Every request costs one token. Each client (keyed by IP) gets its own bucket that
holds up to `capacity` tokens and refills at `refill_rate` tokens/second. When a
request arrives:

1. `RateLimitMiddleware` intercepts it and extracts a key (`rate-limit:ip:<ip>`).
2. `RateLimiter` asks the store to atomically `consume` one token.
3. `RedisStore` runs a **Lua script** on Redis — refill based on elapsed time, then
   deduct the cost if enough tokens remain. Being a single script, the check +
   deduct is atomic across concurrent requests and multiple app instances.
4. If tokens remain → `200 OK` with `X-RateLimit-*` headers.
   If not → `429 Too Many Requests` with a `Retry-After` header.

### Two key parameters

| Parameter     | Meaning                                                             |
|---------------|--------------------------------------------------------------------|
| `capacity`    | Burst headroom — how many back-to-back requests are allowed at once |
| `refill_rate` | Sustained ceiling — max requests/second a client can hold long-term |

---

## Request flow

```
Request ──► RateLimitMiddleware ──► RateLimiter ──► RedisStore ──► token_bucket.lua
                                        │                               │
                                     extractor                    atomic refill +
                                  (IP → bucket key)                deduct on Redis
                                                                        │
                    ┌───────────────────────────────────────────────────┘
                    ▼
        tokens ≥ cost ?  ── yes ──►  200 OK  (X-RateLimit-Limit / -Remaining)
                         ── no  ──►  429 Too Many Requests  (Retry-After)
```

---

## Project structure

```
rate-limiter/
├── src/                         # FastAPI backend
│   ├── main.py                  # App entrypoint: wires store + limiter + middleware,
│   │                            #   exposes GET/PATCH /config and GET /
│   ├── limiter.py               # RateLimiter: extract key → store.consume()
│   ├── middleware.py            # RateLimitMiddleware: 429 on deny, sets rate-limit headers
│   ├── core/
│   │   ├── algorithm.py         # TokenBucket + RateLimitResult (in-memory reference impl)
│   │   ├── extractor.py         # KeyExtractor protocol + IPKeyExtractor
│   │   ├── config.py            # Pydantic settings (env / .env driven)
│   │   ├── connection.py        # Redis async client + connection pool
│   │   └── bucket_store.py      # In-memory BucketStore (per-key TokenBucket)
│   ├── store/
│   │   └── redis.py             # RedisStore: runs the Lua script, returns RateLimitResult
│   ├── util/
│   │   └── base_store.py        # BaseStore ABC (consume() contract)
│   ├── models/
│   │   └── rate_limit.py        # RateLimitConfig dataclass (capacity, refill_rate)
│   └── scripts/
│       ├── token_bucket.lua     # Atomic refill + deduct executed on Redis
│       └── lua_test.py          # Scratch script to sanity-check the Lua loads
│
├── frontend/                    # React + Vite playground
│   ├── src/
│   │   ├── App.jsx              # Landing page + playground layout
│   │   ├── hooks/useTokenBucket.js  # Client-side bucket sim + calls /api
│   │   └── components/          # ConfigPanel, BurstPanel, TokenBucketViz, RequestLog
│   └── vite.config.js           # Dev proxy: /api → http://localhost:8000
│
├── requirements.txt             # Python deps
├── Dockerfile                   # Multi-stage build for the API
├── docker-compose.yml           # Redis + API services
└── .env                         # Runtime config (see below)
```

> Note: there are two "middleware" paths — the active one is `src/middleware.py`.
> `src/middleware/rate_limiter.py` is currently empty.

---

## Core components

| Component | File | Responsibility |
|-----------|------|----------------|
| `RateLimiter` | `src/limiter.py` | Orchestrates: extract key from request, call the store, return result |
| `RateLimitMiddleware` | `src/middleware.py` | Starlette middleware; short-circuits with `429` when denied, adds `X-RateLimit-*` headers. Skips `/config`, `/docs`, `/redoc`, `/openapi.json` |
| `IPKeyExtractor` | `src/core/extractor.py` | Derives a bucket key from client IP |
| `RedisStore` | `src/store/redis.py` | Registers and runs `token_bucket.lua`; the production store |
| `token_bucket.lua` | `src/scripts/token_bucket.lua` | Atomic refill + deduct on Redis; sets a TTL so idle keys expire |
| `BucketStore` / `TokenBucket` | `src/core/bucket_store.py`, `src/core/algorithm.py` | In-memory reference implementation (no Redis) |
| `AppConfig` | `src/core/config.py` | Loads settings from environment / `.env` |
| `RateLimitConfig` | `src/models/rate_limit.py` | Holds live `capacity` / `refill_rate` (mutable via `PATCH /config`) |

---

## Configuration

Settings load from environment variables or `.env` (see `src/core/config.py`):

| Variable                 | Default                  | Description                          |
|--------------------------|--------------------------|--------------------------------------|
| `REDIS_URL`              | `redis://localhost:6379` | Redis connection URL                 |
| `REDIS_MAX_CONNECTIONS`  | `20`                     | Max connections in the pool          |
| `RATE_LIMIT_CAPACITY`    | `20`                     | Bucket capacity (burst size)         |
| `RATE_LIMIT_REFILL_RATE` | `2.0`                    | Tokens added per second              |
| `ENVIRONMENT`            | `development`            | Environment name                     |
| `DEBUG`                  | `false`                  | Debug flag                           |

---

## API

| Method & path  | Description                                                        |
|----------------|-------------------------------------------------------------------|
| `GET /`        | Health check — returns `{"message": "ok"}` (rate limited)         |
| `GET /config`  | Returns current `{capacity, refill_rate}` (not rate limited)      |
| `PATCH /config`| Update `capacity` and/or `refill_rate` at runtime                 |

**Response headers** on a rate-limited endpoint:

- `X-RateLimit-Limit` — the bucket capacity
- `X-RateLimit-Remaining` — tokens left after this request
- `Retry-After` — seconds to wait (on `429` only)

---

## Running it

### With Docker Compose (recommended)

Brings up Redis and the API together:

```bash
docker compose up --build
```

API is then available at `http://localhost:8000`.

### Locally

Backend (needs a running Redis at `REDIS_URL`):

```bash
python -m venv .venv
.venv\Scripts\activate           # Windows
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8000
```

Frontend playground:

```bash
cd frontend
npm install
npm run dev                       # Vite dev server, proxies /api → :8000
```

Open the Vite URL (default `http://localhost:5173`) and use the playground to fire
requests against the live backend.

---

## Tech stack

- **FastAPI 0.137** / **Starlette** — web framework + middleware
- **Redis 8** (async) — shared bucket state, atomic Lua execution
- **Pydantic 2** / **pydantic-settings** — config and request models
- **Uvicorn** — ASGI server
- **React 18** + **Vite 6** — interactive playground
