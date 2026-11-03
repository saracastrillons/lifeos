from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    db_host: str = ""          # vacío = usa SQLite
    db_port: int = 3306
    db_user: str = ""
    db_password: str = ""
    db_name: str = "lifeos"
    sqlite_path: str = "lifeos.db"


settings = Settings()
