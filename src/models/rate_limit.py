from dataclasses import dataclass

@dataclass
class RateLimitConfig:
    capacity:    int
    refill_rate: float