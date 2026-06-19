from pydantic_settings import BaseSettings
from pydantic import Field



class AppConfig(BaseSettings):
    redis_url:        str   = Field("redis://localhost:6379", env="REDIS_URL")
    redis_max_conns:  int   = Field(20,                      env="REDIS_MAX_CONNECTIONS")

    # Rate limit defaults
    capacity:         int   = Field(100,                     env="RATE_LIMIT_CAPACITY")
    refill_rate:      float = Field(10.0,                    env="RATE_LIMIT_REFILL_RATE")

    # App
    environment:      str   = Field("development",           env="ENVIRONMENT")
    debug:            bool  = Field(False,                   env="DEBUG")

    class Config:
        env_file         = ".env"
        env_file_encoding = "utf-8"
        case_sensitive   = False


settings = AppConfig()