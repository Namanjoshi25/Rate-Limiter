import asyncio
from typing import Any, Dict, Optional


class MockDatabase:
    """
    Simulates a slow backend relational database (e.g. PostgreSQL)
    with artificial query delay and an exact query counter.
    """

    def __init__(self, query_delay_seconds: float = 0.3):
        self.query_delay = query_delay_seconds
        self.query_count = 0
        self._data: Dict[str, Dict[str, Any]] = {
            "item_1": {"id": "item_1", "name": "Mechanical Keyboard", "price": 129.99},
            "item_2": {"id": "item_2", "name": "4K Gaming Monitor", "price": 399.00},
            "item_3": {"id": "item_3", "name": "Ergonomic Chair", "price": 249.50},
        }

    async def get_item(self, item_id: str) -> Optional[Dict[str, Any]]:
        """Simulates an expensive indexed SQL query."""
        self.query_count += 1
        await asyncio.sleep(self.query_delay)
        return self._data.get(item_id)

    def reset_counter(self):
        self.query_count = 0


# Global shared instance for the gateway
db = MockDatabase()
