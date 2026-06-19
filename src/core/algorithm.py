from dataclasses import dataclass
import time
import threading

@dataclass
class RateLimitResult:
    allowed:  bool
    remaining: int
    retry_after:  float
    limit:  int


class TokenBucket:
    def __init__(self,capacity,refill_rate):
        self.capacity = capacity
        self.refill_rate= refill_rate
        self._tokens = float(capacity)
        self._last_refill = time.monotonic()
        self._lock= threading.Lock()

    def _refill(self)->None:
        now = time.monotonic()
        elasped_time  = now - self._last_refill  
        self._tokens = min(
            self.capacity,
            self._tokens + elasped_time * self.refill_rate
        )
        self._last_refill = now 

    def check(self , cost:int=1)->RateLimitResult:
        with self._lock:
            self._refill()
            allowed = self._tokens >= cost
            remaining = max(0,int(self._tokens)-(cost if allowed else 0))
            retry = (cost - self._tokens)/self.refill_rate if not allowed else 0.0
            return RateLimitResult(allowed,remaining,round(retry,3),self.capacity)      

    async def consume(self,cost:int =1)->RateLimitResult:
        with self._lock:
            self._refill()
            if self._tokens >= cost:
                self._tokens -=cost
                remaining = int(self._tokens)
                return RateLimitResult(True,remaining,0.0,self.capacity)     
            else:
                retry = round((cost- self._tokens)/self.refill_rate,3)
                return RateLimitResult(False, max(0, int(self._tokens)), retry, self.capacity)  