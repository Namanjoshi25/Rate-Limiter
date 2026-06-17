from typing import Any,Protocol


class KeyExtractor(Protocol):
    def extract(self,request:Any):
        pass
class IPKeyExtractor():
    def extract(self,request:Any):
        ip = request.client.host
        return f"rate-limit:ip:{ip}"
    

