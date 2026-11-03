from sqlalchemy import create_engine
from sqlalchemy.engine import URL
from sqlalchemy.orm import sessionmaker, declarative_base
from .config import settings

if settings.db_host:
    url = URL.create(
        "mysql+pymysql",
        username=settings.db_user, password=settings.db_password,
        host=settings.db_host, port=settings.db_port,
        database=settings.db_name, query={"charset": "utf8mb4"},
    )
    engine = create_engine(url, pool_pre_ping=True, pool_recycle=3600)
else:
    engine = create_engine(f"sqlite:///{settings.sqlite_path}", connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(bind=engine, autoflush=False)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()