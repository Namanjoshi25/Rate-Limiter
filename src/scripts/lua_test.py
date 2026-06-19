# in a scratch script or test
from pathlib import Path
script = (Path("src/scripts/token_bucket.lua")).read_text()
print(script[:50])  # should print first line of your Luas