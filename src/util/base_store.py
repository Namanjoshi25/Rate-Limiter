from abc import ABC,abstractmethod
from ..core.algorithm import RateLimitResult

class BaseStore(ABC):
    @abstractmethod
    async def consume(
        self,
        key:         str,
        capacity:    int,
        refill_rate: float,
        cost:        int = 1,
    ) -> RateLimitResult:
        """
        Atomically check and deduct `cost` tokens for `key`.
        Returns RateLimitResult whether allowed or denied.
        Never raises — failure modes return allowed=False.
        """
        ...
