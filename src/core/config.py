from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, AliasChoices


class AppConfig(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        populate_by_name=True,
    )

    redis_url:       str   = Field("redis://localhost:6379")
    redis_max_conns: int   = Field(20,    validation_alias=AliasChoices("redis_max_conns", "REDIS_MAX_CONNECTIONS"))
    capacity:        int   = Field(10,   validation_alias=AliasChoices("capacity", "RATE_LIMIT_CAPACITY"))
    refill_rate:     float = Field(0.33,  validation_alias=AliasChoices("refill_rate", "RATE_LIMIT_REFILL_RATE"))
    environment:     str   = Field("development")
    debug:           bool  = Field(False)


settings = AppConfig()