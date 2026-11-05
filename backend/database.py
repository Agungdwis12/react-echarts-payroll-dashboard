
import os

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL

load_dotenv()


def get_database_url():
    required_vars = [
        "DB_HOST",
        "DB_PORT",
        "DB_NAME",
        "DB_USER",
        "DB_PASSWORD",
    ]

    missing = [
        name for name in required_vars
        if not os.getenv(name)
    ]

    if missing:
        raise RuntimeError(
            f"Variabel database belum lengkap: {', '.join(missing)}"
        )

    return URL.create(
        drivername="postgresql+psycopg",
        username=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        host=os.getenv("DB_HOST"),
        port=int(os.getenv("DB_PORT")),
        database=os.getenv("DB_NAME"),
        query={"sslmode": "require"},
    )


engine = create_engine(
    get_database_url(),
    pool_pre_ping=True,
    pool_recycle=300,
)


def test_connection():
    with engine.connect() as connection:
        return connection.execute(
            text("SELECT NOW()")
        ).scalar()


def get_table_columns(table_name):
    query = text("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = :table_name
        ORDER BY ordinal_position
    """)

    with engine.connect() as connection:
        rows = connection.execute(
            query,
            {"table_name": table_name},
        ).mappings().all()

    return [dict(row) for row in rows]
