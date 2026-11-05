
from io import BytesIO, StringIO
import csv
import logging
import re
from datetime import date, datetime
from numbers import Number

import os
import uuid
from pathlib import Path

from dotenv import load_dotenv

# Load environment variables before importing modules that may read them.
BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BACKEND_DIR.parent

ENV_CANDIDATES = [
    BACKEND_DIR / ".env",
    PROJECT_DIR / ".env",
]

for env_path in ENV_CANDIDATES:
    if env_path.is_file():
        # Load missing variables from either location.
        # Existing process environment variables are not overwritten.
        load_dotenv(dotenv_path=env_path, override=False)

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.exc import IntegrityError

import pandas as pd
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, Query, Body
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware

from .database import get_database_url
from .config import TABLE_CONFIG


# =========================================================
# FASTAPI APP
# =========================================================

app = FastAPI(
    title="Payroll Data Import API",
    description="API untuk membaca dan memeriksa file payroll",
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# GENERAL HELPERS
# =========================================================

def is_empty(value):
    """Memeriksa apakah sebuah nilai kosong."""
    if value is None:
        return True

    try:
        if pd.isna(value):
            return True
    except (TypeError, ValueError):
        pass

    return isinstance(value, str) and not value.strip()


def normalize_text(value):
    """Normalisasi teks untuk membandingkan header."""
    if is_empty(value):
        return ""

    return re.sub(r"\s+", " ", str(value).strip()).casefold()


def is_date_or_number(value):
    """Mendeteksi nilai tanggal atau angka agar tidak dipilih sebagai header."""
    if is_empty(value):
        return False

    if isinstance(value, (Number, date, datetime, pd.Timestamp)):
        return True

    text = str(value).strip()

    # Angka, termasuk angka negatif dan desimal.
    if re.fullmatch(
        r"[-+]?\d[\d.,]*(?:\s*%)?",
        text,
    ):
        return True

    # Format tanggal umum.
    date_patterns = [
        r"\d{4}[-/]\d{1,2}[-/]\d{1,2}",
        r"\d{1,2}[-/]\d{1,2}[-/]\d{2,4}",
        r"\d{1,2}\s+[A-Za-z]{3,}\s+\d{2,4}",
    ]

    return any(re.fullmatch(pattern, text) for pattern in date_patterns)


def make_preview(df: pd.DataFrame, limit: int = 5) -> list:
    """Membuat preview dalam format JSON."""
    return (
        df.head(limit)
        .fillna("")
        .astype(str)
        .to_dict(orient="records")
    )


def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Membersihkan nama kolom dan baris kosong."""
    df = df.copy()

    df.columns = [
        str(column).strip()
        for column in df.columns
    ]

    return df.dropna(how="all")


# =========================================================
# READ EXCEL OR CSV
# =========================================================

def read_uploaded_file(filename: str, content: bytes) -> pd.DataFrame:
    if filename.endswith(".xlsx"):
        return pd.read_excel(
            BytesIO(content),
            dtype=str,
            engine="openpyxl",
        )

    if filename.endswith(".csv"):
        try:
            decoded = content.decode("utf-8-sig")
        except UnicodeDecodeError:
            decoded = content.decode("latin-1")

        first_line = next(
            (line for line in decoded.splitlines() if line.strip()),
            "",
        )

        if not first_line:
            raise ValueError("File CSV tidak memiliki header.")

        candidates = [",", ";", "\t", "|"]

        delimiter_counts = {}

        for delimiter in candidates:
            try:
                parsed = next(
                    csv.reader([first_line], delimiter=delimiter)
                )
                delimiter_counts[delimiter] = len(parsed)
            except csv.Error:
                delimiter_counts[delimiter] = 0

        delimiter = max(
            delimiter_counts,
            key=delimiter_counts.get,
        )

        if delimiter_counts[delimiter] <= 1:
            raise ValueError(
                "Delimiter CSV tidak berhasil dideteksi."
            )

        return pd.read_csv(
            StringIO(decoded),
            sep=delimiter,
            dtype=str,
            keep_default_na=False,
            skipinitialspace=True,
        )

    raise ValueError("Format file harus .xlsx atau .csv")


# =========================================================
# HEADER DETECTION
# =========================================================

def get_non_empty_positions(row):
    """Mengambil posisi sel yang memiliki nilai."""
    return [
        index
        for index, value in enumerate(row.tolist())
        if not is_empty(value)
    ]


def get_header_width(row):
    """
    Menentukan lebar header sampai sel terakhir yang memiliki nama.
    Sel kosong di sebelah kanan tidak dijadikan kolom kolom_N.
    """
    positions = get_non_empty_positions(row)

    if not positions:
        return 0

    return positions[-1] + 1


def get_header_values(row):
    """
    Membentuk nama kolom dari baris header.
    Sel kosong di antara header tetap diberi nama kolom_N.
    """
    width = get_header_width(row)
    headers = []

    for col_idx in range(width):
        value = row.iloc[col_idx]

        if is_empty(value):
            headers.append(f"kolom_{col_idx + 1}")
        else:
            headers.append(str(value).strip())

    # Pastikan tidak ada nama kolom duplikat.
    seen = {}
    unique_headers = []

    for header in headers:
        normalized = normalize_text(header)

        if normalized not in seen:
            seen[normalized] = 1
            unique_headers.append(header)
        else:
            seen[normalized] += 1
            unique_headers.append(
                f"{header}_{seen[normalized]}"
            )

    return unique_headers


def header_candidate_score(raw_df: pd.DataFrame, row_idx: int):
    """
    Menilai calon header berdasarkan:
    - jumlah nama kolom yang terisi;
    - keunikan nama kolom;
    - dominasi teks dibanding angka/tanggal;
    - konsistensi data setelah header;
    - posisi header yang lebih awal.

    Tidak menggunakan daftar nama kolom khusus.
    """
    row = raw_df.iloc[row_idx]
    positions = get_non_empty_positions(row)

    if len(positions) < 2:
        return None

    width = get_header_width(row)

    if width < 2:
        return None

    values = [
        row.iloc[col_idx]
        for col_idx in range(width)
        if not is_empty(row.iloc[col_idx])
    ]

    if len(values) < 2:
        return None

    normalized = [normalize_text(value) for value in values]

    unique_ratio = len(set(normalized)) / len(normalized)

    if unique_ratio < 0.8:
        return None

    # Header biasanya berupa label teks, bukan tanggal atau nominal.
    label_count = sum(
        not is_date_or_number(value)
        for value in values
    )

    label_ratio = label_count / len(values)

    if label_ratio < 0.6:
        return None

    # Header yang berisi banyak nilai angka/tanggal kurang meyakinkan.
    non_empty_rows_below = []
    consistency_scores = []

    for next_idx in range(
        row_idx + 1,
        min(row_idx + 7, len(raw_df)),
    ):
        next_row = raw_df.iloc[next_idx]

        positions_below = get_non_empty_positions(next_row)

        if not positions_below:
            continue

        non_empty_rows_below.append(next_idx)

        # Hitung kepadatan hanya pada rentang calon tabel.
        count_in_width = sum(
            not is_empty(next_row.iloc[col_idx])
            for col_idx in range(min(width, len(next_row)))
        )

        consistency_scores.append(
            min(count_in_width / width, 1.0)
        )

    if not consistency_scores:
        return None

    data_consistency = sum(consistency_scores) / len(
        consistency_scores
    )

    # Jika baris berikutnya sama persis dengan calon header,
    # kemungkinan sheet memiliki header berulang.
    repeated_penalty = 0

    for next_idx in non_empty_rows_below:
        next_row = raw_df.iloc[next_idx]

        current_values = [
            normalize_text(row.iloc[col_idx])
            for col_idx in range(width)
        ]

        next_values = [
            normalize_text(next_row.iloc[col_idx])
            for col_idx in range(width)
        ]

        if current_values == next_values:
            repeated_penalty = 1
            break

    # Skor mengutamakan label teks dan kepadatan data.
    score = (
        min(len(values), 12)
        * unique_ratio
        * label_ratio
        * data_consistency
    )

    if repeated_penalty:
        score *= 0.5

    # Sedikit mengutamakan header lebih awal ketika skornya setara.
    score -= row_idx * 0.01

    return score


def detect_header_row(raw_df: pd.DataFrame):
    """
    Mendeteksi header secara otomatis.
    Mengembalikan indeks baris berbasis 0 dari worksheet asli.
    """
    if raw_df.empty:
        return None

    best_row = None
    best_score = 0

    # Cari header pada 50 baris awal.
    for row_idx in range(min(50, len(raw_df))):
        score = header_candidate_score(raw_df, row_idx)

        if score is None:
            continue

        if score > best_score:
            best_score = score
            best_row = row_idx

    if best_row is None or best_score < 1.2:
        return None

    return best_row


# =========================================================
# REPEATED HEADER DETECTION
# =========================================================

def has_repeated_header(raw_df: pd.DataFrame, header_idx: int):
    """
    Memeriksa apakah baris header terulang pada bagian data.
    Membandingkan hanya kolom yang mempunyai nama header.
    """
    if raw_df.empty or header_idx >= len(raw_df):
        return False

    header_row = raw_df.iloc[header_idx]
    width = get_header_width(header_row)

    if width < 2:
        return False

    expected = [
        normalize_text(header_row.iloc[col_idx])
        for col_idx in range(width)
    ]

    # Periksa baris setelah header.
    for row_idx in range(header_idx + 1, len(raw_df)):
        current = raw_df.iloc[row_idx]

        current_values = [
            normalize_text(current.iloc[col_idx])
            for col_idx in range(width)
        ]

        non_empty = [
            value for value in current_values if value
        ]

        if len(non_empty) < 2:
            continue

        if current_values == expected:
            return True

    return False


# =========================================================
# HOME
# =========================================================

@app.get("/")
def home():
    return {
        "message": "Payroll Data Import API is running",
        "docs": "/docs",
    }


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/health")
def health_check():
    return {"status": "ok"}


# =========================================================
# DATABASE CONNECTION CHECK
# =========================================================


@app.get("/api/database/health")
def database_health_check():
    """Memeriksa koneksi PostgreSQL dengan menjalankan query sederhana."""
    engine = None

    try:
        engine = create_engine(
            get_database_url(),
            pool_pre_ping=True,
            pool_recycle=300,
        )

        # Query ini memastikan database benar-benar dapat diakses.
        with engine.connect() as connection:
            result = connection.execute(
                text("SELECT CURRENT_TIMESTAMP, current_database()")
            ).first()

        if result is None:
            raise RuntimeError("Database tidak mengembalikan hasil query.")

        database_time, database_name = result

        return {
            "status": "connected",
            "database_status": "connected",
            "message": "Database siap digunakan.",
            "database_name": database_name,
            "database_time": str(database_time),
        }

    except Exception as error:
        logging.exception("Database health check failed")
        raise HTTPException(
            status_code=503,
            detail=(
                "Koneksi database gagal. "
                "Silakan periksa konfigurasi atau coba lagi."
            ),
        ) from error

    finally:
        if engine is not None:
            engine.dispose()
            



# =========================================================
# ACTIVITY LOGS - RIWAYAT PEMBARUAN
# =========================================================

def ensure_activity_logs_table(connection):
    """Membuat tabel log jika belum tersedia."""
    connection.execute(text("""
        CREATE TABLE IF NOT EXISTS public.activity_logs (
            id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            activity_type VARCHAR(20) NOT NULL
                CHECK (activity_type IN ('IMPORT', 'CREATE', 'UPDATE', 'DELETE')),
            table_name VARCHAR(150) NOT NULL,
            description TEXT,
            file_name VARCHAR(255),
            total_rows INTEGER NOT NULL DEFAULT 0,
            success_rows INTEGER NOT NULL DEFAULT 0,
            failed_rows INTEGER NOT NULL DEFAULT 0,
            status VARCHAR(20) NOT NULL
                CHECK (status IN ('SUCCESS', 'FAILED', 'PARTIAL')),
            error_message TEXT,
            performed_by VARCHAR(150),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """))
    connection.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at
        ON public.activity_logs (created_at DESC)
    """))
    connection.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_activity_logs_table_name
        ON public.activity_logs (table_name)
    """))
    connection.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_activity_logs_activity_type
        ON public.activity_logs (activity_type)
    """))


def write_activity_log(
    activity_type: str,
    table_name: str,
    description: str,
    *,
    file_name: str = None,
    total_rows: int = 0,
    success_rows: int = 0,
    failed_rows: int = 0,
    status: str = "SUCCESS",
    error_message: str = None,
    performed_by: str = None,
):
    """Menyimpan satu catatan aktivitas tanpa mengubah tabel data payroll."""
    engine = None
    try:
        engine = get_data_management_engine()
        with engine.begin() as connection:
            ensure_activity_logs_table(connection)
            connection.execute(text("""
                INSERT INTO public.activity_logs (
                    activity_type, table_name, description, file_name,
                    total_rows, success_rows, failed_rows, status,
                    error_message, performed_by
                ) VALUES (
                    :activity_type, :table_name, :description, :file_name,
                    :total_rows, :success_rows, :failed_rows, :status,
                    :error_message, :performed_by
                )
            """), {
                "activity_type": activity_type,
                "table_name": table_name,
                "description": description,
                "file_name": file_name,
                "total_rows": max(0, int(total_rows or 0)),
                "success_rows": max(0, int(success_rows or 0)),
                "failed_rows": max(0, int(failed_rows or 0)),
                "status": status,
                "error_message": error_message,
                "performed_by": performed_by,
            })
    except Exception:
        # Kegagalan pencatatan log tidak boleh membatalkan operasi utama.
        logging.exception("Gagal menyimpan activity log")
    finally:
        if engine is not None:
            engine.dispose()


@app.get("/api/activity-logs")
def get_activity_logs(
    search: str = Query(default="", max_length=200),
    activity_type: str = Query(default="", max_length=20),
    status: str = Query(default="", max_length=20),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    """Mengambil riwayat aktivitas untuk menu Riwayat Pembaruan."""
    engine = None
    allowed_types = {"IMPORT", "CREATE", "UPDATE", "DELETE"}
    allowed_statuses = {"SUCCESS", "FAILED", "PARTIAL"}

    if activity_type and activity_type.upper() not in allowed_types:
        raise HTTPException(status_code=400, detail="Filter aktivitas tidak valid.")
    if status and status.upper() not in allowed_statuses:
        raise HTTPException(status_code=400, detail="Filter status tidak valid.")

    try:
        engine = get_data_management_engine()
        offset = (page - 1) * page_size

        with engine.begin() as connection:
            ensure_activity_logs_table(connection)

            conditions = []
            params = {}
            if search.strip():
                conditions.append(
                    "(table_name ILIKE :search OR description ILIKE :search "
                    "OR COALESCE(file_name, '') ILIKE :search)"
                )
                params["search"] = f"%{search.strip()}%"
            if activity_type:
                conditions.append("activity_type = :activity_type")
                params["activity_type"] = activity_type.upper()
            if status:
                conditions.append("status = :status")
                params["status"] = status.upper()

            where_clause = (" WHERE " + " AND ".join(conditions)) if conditions else ""
            total = connection.execute(
                text("SELECT COUNT(*) FROM public.activity_logs" + where_clause),
                params,
            ).scalar_one()

            rows = connection.execute(text("""
                SELECT id, activity_type, table_name, description, file_name,
                       total_rows, success_rows, failed_rows, status,
                       error_message, performed_by, created_at
                FROM public.activity_logs
            """ + where_clause + """
                ORDER BY created_at DESC, id DESC
                LIMIT :limit OFFSET :offset
            """), {**params, "limit": page_size, "offset": offset}).mappings().all()

        return jsonable_encoder({
            "logs": [dict(row) for row in rows],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size,
        })
    except HTTPException:
        raise
    except Exception as error:
        logging.exception("Gagal mengambil activity logs")
        raise HTTPException(status_code=500, detail="Gagal mengambil riwayat aktivitas.") from error
    finally:
        if engine is not None:
            engine.dispose()



# =========================================================
# DATA MANAGEMENT - READ TABLES
# =========================================================

def get_data_management_engine():
    """Membuat koneksi database untuk Data Management."""
    return create_engine(
        get_database_url(),
        pool_pre_ping=True,
        pool_recycle=300,
    )


def get_allowed_tables():
    """Hanya mengizinkan tabel yang terdaftar di TABLE_CONFIG."""
    return {
        config["table_name"]: config
        for config in TABLE_CONFIG.values()
        if config.get("table_name")
    }


def quote_identifier(identifier: str) -> str:
    """Mengamankan identifier SQL yang sudah divalidasi."""
    return '"' + identifier.replace('"', '""') + '"'


@app.get("/api/data-management/tables")
def get_data_management_tables():
    """Mengambil daftar tabel yang tersedia untuk Data Management."""
    engine = None

    try:
        engine = get_data_management_engine()
        allowed_tables = get_allowed_tables()
        tables = []

        with engine.connect() as connection:
            inspector = inspect(connection)

            for table_name, config in allowed_tables.items():
                if not inspector.has_table(table_name, schema="public"):
                    continue

                columns = inspector.get_columns(
                    table_name,
                    schema="public",
                )

                tables.append({
                    "table_name": table_name,
                    "label": config.get("sheet_name", table_name),
                    "columns": [
                        {
                            "name": column["name"],
                            "type": str(column["type"]),
                            "nullable": column.get("nullable", True),
                            "primary_key": column.get("primary_key", False),
                        }
                        for column in columns
                    ],
                })

        return {"tables": tables}

    except Exception as error:
        logging.exception("Gagal mengambil daftar tabel Data Management")
        raise HTTPException(
            status_code=503,
            detail="Gagal mengambil daftar tabel database.",
        ) from error

    finally:
        if engine is not None:
            engine.dispose()


@app.get("/api/data-management/{table_name}")
def get_data_management_rows(
    table_name: str,
    search: str = Query(default="", max_length=200),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
):
    """Mengambil data tabel dengan pencarian dan pagination."""
    allowed_tables = get_allowed_tables()

    if table_name not in allowed_tables:
        raise HTTPException(
            status_code=404,
            detail="Tabel tidak tersedia untuk Data Management.",
        )

    engine = None

    try:
        engine = get_data_management_engine()
        offset = (page - 1) * page_size

        with engine.connect() as connection:
            inspector = inspect(connection)

            if not inspector.has_table(table_name, schema="public"):
                raise HTTPException(
                    status_code=404,
                    detail="Tabel tidak ditemukan di database.",
                )

            columns = inspector.get_columns(
                table_name,
                schema="public",
            )

            column_names = [column["name"] for column in columns]

            if not column_names:
                return {
                    "table_name": table_name,
                    "columns": [],
                    "rows": [],
                    "total": 0,
                    "page": page,
                    "page_size": page_size,
                }

            quoted_table = quote_identifier(table_name)
            quoted_columns = ", ".join(
                quote_identifier(name) for name in column_names
            )

            where_clause = ""
            params = {}

            if search.strip():
                search_conditions = [
                    f"CAST({quote_identifier(name)} AS TEXT) "
                    f"ILIKE :search"
                    for name in column_names
                ]
                where_clause = (
                    " WHERE " + " OR ".join(search_conditions)
                )
                params["search"] = f"%{search.strip()}%"

            count_sql = text(
                f"SELECT COUNT(*) FROM public.{quoted_table}"
                f"{where_clause}"
            )

            total = connection.execute(
                count_sql,
                params,
            ).scalar_one()

            data_sql = text(
                f"SELECT {quoted_columns} "
                f"FROM public.{quoted_table}"
                f"{where_clause} "
                f"ORDER BY {quote_identifier('id')} "
                f"LIMIT :limit OFFSET :offset"
            )

            data_params = {
                **params,
                "limit": page_size,
                "offset": offset,
            }

            result = connection.execute(
                data_sql,
                data_params,
            )

            rows = [
                dict(row)
                for row in result.mappings().all()
            ]

            return jsonable_encoder({
                "table_name": table_name,
                "columns": [
                    {
                        "name": column["name"],
                        "type": str(column["type"]),
                        "nullable": column.get("nullable", True),
                        "primary_key": column.get("primary_key", False),
                    }
                    for column in columns
                ],
                "rows": rows,
                "total": total,
                "page": page,
                "page_size": page_size,
                "total_pages": (
                    (total + page_size - 1) // page_size
                ),
            })

    except HTTPException:
        raise

    except Exception as error:
        logging.exception(
            "Gagal mengambil data dari tabel %s",
            table_name,
        )
        raise HTTPException(
            status_code=500,
            detail="Gagal mengambil data tabel.",
        ) from error

    finally:
        if engine is not None:
            engine.dispose()


# =========================================================
# DATA MANAGEMENT - CRUD
# =========================================================

def get_editable_table(table_name: str):
    allowed_tables = get_allowed_tables()

    if table_name not in allowed_tables:
        raise HTTPException(
            status_code=404,
            detail="Tabel tidak tersedia untuk Data Management.",
        )

    engine = get_data_management_engine()
    try:
        inspector = inspect(engine)

        if not inspector.has_table(table_name, schema="public"):
            raise HTTPException(status_code=404, detail="Tabel tidak ditemukan.")

        columns = inspector.get_columns(table_name, schema="public")
        column_names = {column["name"] for column in columns}
        primary_keys = inspector.get_pk_constraint(
            table_name, schema="public"
        ).get("constrained_columns", [])

        if len(primary_keys) != 1:
            raise HTTPException(
                status_code=400,
                detail="Tabel harus memiliki satu primary key.",
            )

        return engine, column_names, primary_keys[0]
    except Exception:
        engine.dispose()
        raise


def validate_record_payload(payload: dict, column_names: set, primary_key: str):
    if not isinstance(payload, dict) or not payload:
        raise HTTPException(status_code=400, detail="Data tidak boleh kosong.")

    unknown_columns = set(payload) - column_names
    if unknown_columns:
        raise HTTPException(
            status_code=400,
            detail=f"Kolom tidak dikenal: {', '.join(sorted(unknown_columns))}",
        )

    if primary_key in payload:
        raise HTTPException(
            status_code=400,
            detail=f"Kolom {primary_key} dibuat otomatis dan tidak boleh diubah.",
        )

    return payload


@app.post("/api/data-management/{table_name}")
def create_data_management_row(
    table_name: str,
    payload: dict = Body(...),
):
    engine, columns, primary_key = get_editable_table(table_name)

    try:
        validate_record_payload(payload, columns, primary_key)

        column_sql = ", ".join(quote_identifier(name) for name in payload)
        value_sql = ", ".join(f":v{i}" for i in range(len(payload)))
        params = {f"v{i}": value for i, value in enumerate(payload.values())}

        query = text(
            f"INSERT INTO public.{quote_identifier(table_name)} "
            f"({column_sql}) VALUES ({value_sql}) "
            f"RETURNING {quote_identifier(primary_key)}"
        )

        with engine.begin() as connection:
            new_id = connection.execute(query, params).scalar_one()

        write_activity_log(
            "CREATE", table_name, f"Menambahkan data dengan ID {new_id}.",
            total_rows=1, success_rows=1,
        )
        return {
            "message": "Data berhasil ditambahkan.",
            "id": new_id,
        }

    except IntegrityError as error:
        write_activity_log(
            "CREATE", table_name, "Gagal menambahkan data.",
            status="FAILED", failed_rows=1,
            error_message="Data melanggar aturan database.",
        )
        raise HTTPException(
            status_code=409,
            detail="Data melanggar aturan database. Periksa kolom wajib atau nilai unik.",
        ) from error
    except HTTPException:
        raise
    except Exception as error:
        write_activity_log(
            "CREATE", table_name, "Gagal menambahkan data.",
            status="FAILED", failed_rows=1,
            error_message=str(error)[:1000],
        )
        logging.exception("Gagal menambahkan data")
        raise HTTPException(status_code=500, detail="Gagal menambahkan data.") from error
    finally:
        engine.dispose()


@app.put("/api/data-management/{table_name}/{record_id}")
def update_data_management_row(
    table_name: str,
    record_id: str,
    payload: dict = Body(...),
):
    engine, columns, primary_key = get_editable_table(table_name)

    try:
        validate_record_payload(payload, columns, primary_key)

        if not payload:
            raise HTTPException(
                status_code=400,
                detail="Tidak ada perubahan data untuk disimpan.",
            )

        assignments = ", ".join(
            f"{quote_identifier(name)} = :v{i}"
            for i, name in enumerate(payload)
        )
        params = {
            f"v{i}": value for i, value in enumerate(payload.values())
        }
        params["record_id"] = record_id

        query = text(
            f"UPDATE public.{quote_identifier(table_name)} "
            f"SET {assignments} "
            f"WHERE {quote_identifier(primary_key)} = :record_id "
            f"RETURNING {quote_identifier(primary_key)}"
        )

        with engine.begin() as connection:
            updated_id = connection.execute(query, params).scalar_one_or_none()

        if updated_id is None:
            raise HTTPException(status_code=404, detail="Record tidak ditemukan.")

        write_activity_log(
            "UPDATE", table_name, f"Memperbarui data dengan ID {updated_id}.",
            total_rows=1, success_rows=1,
        )
        return {"message": "Data berhasil diperbarui.", "id": updated_id}

    except IntegrityError as error:
        write_activity_log(
            "UPDATE", table_name, f"Gagal memperbarui data dengan ID {record_id}.",
            status="FAILED", failed_rows=1,
            error_message="Perubahan melanggar aturan database.",
        )
        raise HTTPException(
            status_code=409,
            detail="Perubahan melanggar aturan database. Periksa nilai yang dimasukkan.",
        ) from error
    except HTTPException:
        raise
    except Exception as error:
        write_activity_log(
            "UPDATE", table_name, f"Gagal memperbarui data dengan ID {record_id}.",
            status="FAILED", failed_rows=1,
            error_message=str(error)[:1000],
        )
        logging.exception("Gagal memperbarui data")
        raise HTTPException(status_code=500, detail="Gagal memperbarui data.") from error
    finally:
        engine.dispose()


def renumber_table_ids(
    connection,
    table_name: str,
    primary_key: str = "id",
):
    """
    Mengurutkan ulang ID menjadi 1, 2, 3, dan seterusnya.
    Sequence PostgreSQL disesuaikan setelah pengurutan.
    """

    quoted_table = quote_identifier(table_name)
    quoted_pk = quote_identifier(primary_key)

    # Pastikan perubahan tidak berjalan bersamaan dengan
    # operasi tulis lain pada tabel yang sama.
    connection.execute(
        text(
            f"LOCK TABLE public.{quoted_table} "
            "IN EXCLUSIVE MODE"
        )
    )

    # Tahap 1: pindahkan ID ke nilai negatif yang unik.
    connection.execute(
        text(
            f"""
            WITH numbered AS (
                SELECT
                    {quoted_pk} AS old_id,
                    ROW_NUMBER() OVER (
                        ORDER BY {quoted_pk}
                    ) AS new_id
                FROM public.{quoted_table}
            )
            UPDATE public.{quoted_table} AS target
            SET {quoted_pk} = -numbered.new_id
            FROM numbered
            WHERE target.{quoted_pk} = numbered.old_id
            """
        )
    )

    # Tahap 2: ubah kembali menjadi 1, 2, 3, dan seterusnya.
    connection.execute(
        text(
            f"UPDATE public.{quoted_table} "
            f"SET {quoted_pk} = -{quoted_pk}"
        )
    )

    # Tahap 3: sinkronkan sequence PostgreSQL.
    connection.execute(
        text(
            """
            SELECT setval(
                pg_get_serial_sequence(:qualified_table, :pk),
                COALESCE(MAX_id.max_id, 1),
                MAX_id.row_count > 0
            )
            FROM (
                SELECT
                    MAX(id) AS max_id,
                    COUNT(*) AS row_count
                FROM public.__placeholder__
            ) AS MAX_id
            """
            .replace(
                "public.__placeholder__",
                f"public.{quoted_table}",
            )
            .replace("MAX(id)", f"MAX({quoted_pk})")
        ),
        {
            "qualified_table": f"public.{table_name}",
            "pk": primary_key,
        },
    )


# =========================================================
# DATA MANAGEMENT - DELETE
# =========================================================

@app.delete("/api/data-management/{table_name}/{record_id}")

def delete_data_management_row(
    table_name: str,
    record_id: str,
):
    engine, _, primary_key = get_editable_table(table_name)

    try:
        with engine.begin() as connection:
            quoted_table = quote_identifier(table_name)
            quoted_pk = quote_identifier(primary_key)

            # Kunci tabel sebelum menghapus data.
            connection.execute(
                text(
                    f"LOCK TABLE public.{quoted_table} "
                    "IN EXCLUSIVE MODE"
                )
            )

            deleted_id = connection.execute(
                text(
                    f"DELETE FROM public.{quoted_table} "
                    f"WHERE {quoted_pk} = :record_id "
                    f"RETURNING {quoted_pk}"
                ),
                {"record_id": record_id},
            ).scalar_one_or_none()

            if deleted_id is None:
                raise HTTPException(
                    status_code=404,
                    detail="Record tidak ditemukan.",
                )

            # Susun ulang ID setelah data dihapus.
            renumber_table_ids(
                connection,
                table_name,
                primary_key,
            )

        write_activity_log(
            "DELETE", table_name, f"Menghapus data dengan ID {deleted_id}.",
            total_rows=1, success_rows=1,
        )
        return {
            "message": "Data berhasil dihapus dan ID diurutkan ulang.",
            "deleted_id": deleted_id,
        }

    except HTTPException:
        raise

    except Exception as error:
        write_activity_log(
            "DELETE", table_name, f"Gagal menghapus data dengan ID {record_id}.",
            status="FAILED", failed_rows=1,
            error_message=str(error)[:1000],
        )
        logging.exception("Gagal menghapus data")
        raise HTTPException(
            status_code=500,
            detail="Gagal menghapus data. Periksa log backend.",
        ) from error

    finally:
        engine.dispose()



# =========================================================
# INSPECT CSV OR SINGLE EXCEL SHEET
# =========================================================

@app.post("/api/import/inspect")
async def inspect_file(file: UploadFile = File(...)):
    filename = (file.filename or "").lower()

    if not filename.endswith((".xlsx", ".csv")):
        raise HTTPException(
            status_code=400,
            detail="Format file harus .xlsx atau .csv",
        )

    content = await file.read()

    if not content:
        raise HTTPException(
            status_code=400,
            detail="File kosong.",
        )

    try:
        df = read_uploaded_file(filename, content)
        df = clean_dataframe(df)

        return {
            "filename": file.filename,
            "total_rows": len(df),
            "total_columns": len(df.columns),
            "columns": list(df.columns),
            "preview": make_preview(df, limit=10),
        }

    except Exception as error:
        raise HTTPException(
            status_code=400,
            detail=f"Gagal membaca file: {str(error)}",
        ) from error

    finally:
        await file.close()


# =========================================================
# INSPECT ALL EXCEL SHEETS
# =========================================================

@app.post("/api/import/inspect-excel")
async def inspect_excel(file: UploadFile = File(...)):
    filename = (file.filename or "").lower()

    if not filename.endswith(".xlsx"):
        raise HTTPException(
            status_code=400,
            detail="Upload file Excel dengan format .xlsx",
        )

    content = await file.read()

    if not content:
        raise HTTPException(
            status_code=400,
            detail="File Excel kosong.",
        )

    try:
        excel = pd.ExcelFile(
            BytesIO(content),
            engine="openpyxl",
        )

        sheets = []

        for sheet_name in excel.sheet_names:
            # Jangan drop baris kosong sebelum mendeteksi header,
            # agar nomor baris sesuai posisi asli di Excel.
            raw_df = pd.read_excel(
                excel,
                sheet_name=sheet_name,
                header=None,
                dtype=object,
            )

            # Dashboard bukan tabel sumber.
            if sheet_name.strip().casefold() == "dashboard":
                sheets.append({
                    "sheet_name": sheet_name,
                    "is_table": False,
                    "header_row": None,
                    "total_rows": 0,
                    "total_columns": 0,
                    "columns": [],
                    "preview": [],
                    "warnings": [],
                    "message": (
                        "Sheet dashboard dilewati karena "
                        "bukan tabel data."
                    ),
                })
                continue

            # Header dideteksi dari worksheet asli.
            header_idx = detect_header_row(raw_df)

            if header_idx is None:
                sheets.append({
                    "sheet_name": sheet_name,
                    "is_table": False,
                    "header_row": None,
                    "total_rows": 0,
                    "total_columns": 0,
                    "columns": [],
                    "preview": [],
                    "warnings": [],
                    "message": "Header tabel tidak berhasil dideteksi.",
                })
                continue

            header_row = raw_df.iloc[header_idx]
            headers = get_header_values(header_row)
            width = len(headers)

            # Jika ada header berulang, jangan perlakukan sheet
            # sebagai satu tabel yang siap diimpor.
            if has_repeated_header(raw_df, header_idx):
                sheets.append({
                    "sheet_name": sheet_name,
                    "is_table": False,
                    "header_row": header_idx + 1,
                    "total_rows": 0,
                    "total_columns": 0,
                    "columns": [],
                    "preview": [],
                    "warnings": [],
                    "message": (
                        "Sheet dilewati karena memiliki "
                        "header tabel yang berulang."
                    ),
                })
                continue

            # Ambil hanya kolom yang memiliki header.
            data_df = raw_df.iloc[
                header_idx + 1:,
                :width,
            ].copy()

            data_df.columns = headers

            # Hapus baris yang kosong pada kolom tabel yang dikenali.
            data_df = data_df.dropna(how="all")

            # Buang juga baris yang isinya string kosong/spasi.
            non_empty_mask = data_df.apply(
                lambda row: any(
                    not is_empty(value)
                    for value in row.tolist()
                ),
                axis=1,
            )

            data_df = data_df.loc[non_empty_mask].reset_index(
                drop=True
            )


            # Deteksi nilai di luar lebar header yang dikenali.
            # Nilai ini tidak dimasukkan ke preview/kolom tabel.
            warnings = []

            extra_df = raw_df.iloc[
                header_idx + 1:,
                width:,
            ]

            extra_values_exist = (
                not extra_df.empty
                and extra_df.apply(
                    lambda col: col.map(
                        lambda value: not is_empty(value)
                    ).any()
                ).any()
            )

            if extra_values_exist:
                warnings.append(
                    "Terdapat nilai di luar kolom yang memiliki "
                    "header. Nilai tersebut tidak dimasukkan ke "
                    "hasil inspeksi; periksa kembali file sumber."
                )

            # Kolom hasil harus memiliki nama yang valid.
            is_valid_table = (
                len(headers) >= 2
                and len(data_df) > 0
            )

            sheets.append({
                "sheet_name": sheet_name,
                "is_table": is_valid_table,
                "header_row": header_idx + 1,
                "total_rows": len(data_df),
                "total_columns": len(headers),
                "columns": headers,
                "preview": make_preview(data_df, limit=5),
                "warnings": warnings,
                "message": (
                    "Tabel berhasil dideteksi."
                    if is_valid_table
                    else "Tabel tidak memiliki data yang cukup."
                ),
            })

        return {
            "filename": file.filename,
            "total_sheets": len(sheets),
            "sheets": sheets,
        }

    except Exception as error:
        raise HTTPException(
            status_code=400,
            detail=f"Gagal membaca Excel: {str(error)}",
        ) from error

    finally:
        await file.close()
        

# =========================================================
# SAFE EXCEL REPLACE IMPORT
# =========================================================

REPLACE_CONFIRMATION = "REPLACE PAYROLL DATA"


def get_import_engine():
    """Membuat engine import memakai konfigurasi yang sama dengan database.py."""
    return create_engine(
        get_database_url(),
        pool_pre_ping=True,
        pool_recycle=300,
    )


def normalize_column_name(value):
    value = str(value).replace("\u200b", "")
    value = value.replace("\u200c", "")
    value = value.replace("\u200d", "")
    value = value.replace("\ufeff", "")
    return re.sub(r"\s+", " ", value.strip()).casefold()



def prepare_import_data(file_bytes):
    """
    Membaca dan memvalidasi sheet berdasarkan TABLE_CONFIG.
    Tidak melakukan perubahan apa pun ke database.
    """
    excel = pd.ExcelFile(
        BytesIO(file_bytes),
        engine="openpyxl",
    )

    # Cocokkan nama sheet tanpa membedakan huruf besar/kecil.
    actual_sheet_names = {
        normalize_column_name(name): name
        for name in excel.sheet_names
    }

    prepared = {}
    summaries = []
    errors = []

    def excel_col_to_index(col_letters):
        """Mengubah nama kolom Excel, misalnya A atau AA, ke indeks 0-based."""
        result = 0
        for char in col_letters.upper():
            result = result * 26 + ord(char) - ord("A") + 1
        return result - 1

    for config_key, config in TABLE_CONFIG.items():
        expected_sheet = config["sheet_name"]
        table_name = config["table_name"]
        mapping = config["columns"]

        matched_sheet = actual_sheet_names.get(
            normalize_column_name(expected_sheet)
        )

        if matched_sheet is None:
            errors.append({
                "sheet": expected_sheet,
                "error": "Sheet wajib tidak ditemukan.",
            })
            continue

        # Baca sheet tanpa menganggap baris pertama sebagai header.
        raw_df = pd.read_excel(
            excel,
            sheet_name=matched_sheet,
            header=None,
            dtype=object,
        )

        # Gunakan start_range dari config.py.
        # Contoh A4:I berarti header di baris 4, kolom A sampai I.
        range_match = re.fullmatch(
            r"\$?([A-Z]+)\$?(\d+):\$?([A-Z]+)",
            config["start_range"].replace(" ", "").upper(),
        )

        if not range_match:
            errors.append({
                "sheet": expected_sheet,
                "error": (
                    f"Format start_range tidak valid: "
                    f"{config['start_range']}"
                ),
            })
            continue

        start_col_letters, start_row_str, end_col_letters = (
            range_match.groups()
        )

        start_col = excel_col_to_index(start_col_letters)
        end_col = excel_col_to_index(end_col_letters)
        header_idx = int(start_row_str) - 1

        if (
            header_idx < 0
            or header_idx >= len(raw_df)
            or end_col < start_col
        ):
            errors.append({
                "sheet": expected_sheet,
                "error": "Rentang header tidak valid atau berada di luar sheet.",
            })
            continue

        # Lebar kolom dibatasi sesuai konfigurasi.
        expected_width = end_col - start_col + 1

        if raw_df.shape[1] < end_col + 1:
            # Sheet boleh tidak memiliki kolom kosong di sebelah kanan.
            # Kolom yang belum ada dianggap kosong.
            raw_df = raw_df.reindex(
                columns=range(end_col + 1)
            )

        header_values = raw_df.iloc[
            header_idx,
            start_col:end_col + 1,
        ].tolist()

        headers = [
            "" if is_empty(value) else str(value).strip()
            for value in header_values
        ]

        # Hilangkan karakter tersembunyi untuk validasi header.
        actual_header_map = {}
        duplicate_headers = []

        for original_header in headers:
            normalized = normalize_column_name(original_header)

            if not normalized:
                continue

            if normalized in actual_header_map:
                duplicate_headers.append(original_header)
            else:
                actual_header_map[normalized] = original_header

        if duplicate_headers:
            errors.append({
                "sheet": expected_sheet,
                "error": "Terdapat nama kolom duplikat.",
                "duplicate_columns": duplicate_headers,
            })
            continue

        # Semua kolom yang didefinisikan di config wajib tersedia.
        expected_headers = list(mapping.keys())

        missing_columns = [
            expected
            for expected in expected_headers
            if normalize_column_name(expected) not in actual_header_map
        ]

        if missing_columns:
            errors.append({
                "sheet": expected_sheet,
                "error": "Kolom wajib tidak lengkap.",
                "missing_columns": missing_columns,
                "detected_columns": headers,
                "expected_columns": expected_headers,
            })
            continue

        # Periksa header berulang hanya di dalam rentang tabel.
        normalized_expected = [
            normalize_column_name(header)
            for header in headers
        ]

        repeated_header_found = False

        for row_idx in range(header_idx + 1, len(raw_df)):
            row_values = raw_df.iloc[
                row_idx,
                start_col:end_col + 1,
            ].tolist()

            normalized_row = [
                normalize_column_name(value)
                if not is_empty(value)
                else ""
                for value in row_values
            ]

            if (
                sum(bool(value) for value in normalized_row) >= 2
                and normalized_row == normalized_expected
            ):
                repeated_header_found = True
                break

        if repeated_header_found:
            errors.append({
                "sheet": expected_sheet,
                "error": "Ditemukan header berulang di dalam data.",
            })
            continue

        # Ambil data hanya dari rentang kolom yang dikonfigurasi.
        data_df = raw_df.iloc[
            header_idx + 1:,
            start_col:end_col + 1,
        ].copy()

        data_df.columns = headers

        # Hapus baris kosong.
        non_empty_mask = data_df.apply(
            lambda row: any(
                not is_empty(value)
                for value in row.tolist()
            ),
            axis=1,
        )

        data_df = data_df.loc[non_empty_mask].reset_index(drop=True)

        if data_df.empty:
            errors.append({
                "sheet": expected_sheet,
                "error": "Tidak ada baris data untuk diimpor.",
            })
            continue

        # Petakan header Excel menjadi nama kolom database.
        rename_map = {}

        for expected_header, db_column in mapping.items():
            normalized = normalize_column_name(expected_header)
            actual_header = actual_header_map[normalized]
            rename_map[actual_header] = db_column

        data_df = data_df.rename(columns=rename_map)

        # Pastikan seluruh kolom mapping tersedia setelah rename.
        expected_db_columns = list(mapping.values())

        if (
            len(data_df.columns) != expected_width
            or len(set(data_df.columns)) != len(data_df.columns)
            or set(data_df.columns) != set(expected_db_columns)
        ):
            errors.append({
                "sheet": expected_sheet,
                "error": (
                    "Kolom hasil mapping tidak sesuai dengan "
                    "konfigurasi database."
                ),
                "mapped_columns": list(data_df.columns),
                "expected_database_columns": expected_db_columns,
            })
            continue

        # Urutkan kolom sesuai konfigurasi agar konsisten.
        data_df = data_df[expected_db_columns]

        # MASTER DETAIL DIVISI:
        # Lewati baris template tanpa Bulan dan tanpa data transaksi.
        # Sel Divisi saja (misalnya "1" dari dropdown) bukan data transaksi.
        if config_key == "master_detail_divisi":
            month_col = "periode_bulan"
            division_col = "divisi"

            def is_blank_or_zero_detail(value):
                if is_empty(value):
                    return True
                if isinstance(value, Number):
                    return value == 0

                normalized = str(value).strip()
                if not normalized:
                    return True
                normalized = re.sub(r"(?i)\\b(rp|idr)\\b", "", normalized)
                normalized = normalized.replace(" ", "")
                if normalized in {"-", "—"}:
                    return False
                return bool(re.fullmatch(r"[-+]?0+(?:[.,]0+)?", normalized))

            month_missing = data_df[month_col].map(is_empty)
            meaningful_cols = [
                column for column in data_df.columns
                if column not in {month_col, division_col}
            ]

            if meaningful_cols:
                no_transaction_data = data_df[meaningful_cols].apply(
                    lambda row: all(
                        is_blank_or_zero_detail(value)
                        for value in row.tolist()
                    ),
                    axis=1,
                )
            else:
                no_transaction_data = pd.Series(True, index=data_df.index)

            # Hanya buang baris yang Bulan kosong dan kolom transaksi
            # lainnya kosong/nol. Baris yang punya data transaksi tetap
            # dipertahankan dan akan ditolak jika Bulan-nya kosong.
            template_rows = month_missing & no_transaction_data
            data_df = data_df.loc[~template_rows].copy()

            remaining_missing_month = data_df[month_col].map(is_empty)
            if remaining_missing_month.any():
                bad_rows = data_df.index[remaining_missing_month].tolist()
                errors.append({
                    "sheet": expected_sheet,
                    "error": (
                        "Master Detail Divisi memiliki baris dengan Bulan "
                        "kosong tetapi kolom transaksi berisi data. Lengkapi "
                        "Bulan atau periksa baris tersebut sebelum import."
                    ),
                    "rows": [int(row) + header_idx + 2 for row in bad_rows[:20]],
                })
                continue

        if data_df.empty:
            errors.append({
                "sheet": expected_sheet,
                "error": "Tidak ada baris data valid untuk diimpor setelah pembersihan.",
            })
            continue

        sensitive = config_key == "payroll_team"

        prepared[table_name] = {
            "data": data_df,
            "sensitive": sensitive,
            "sheet": matched_sheet,
        }

        summary = {
            "sheet": matched_sheet,
            "table": table_name,
            "rows": len(data_df),
            "columns": len(data_df.columns),
            "column_names": list(data_df.columns),
        }

        if sensitive:
            summary["preview"] = (
                "Disembunyikan karena berisi data karyawan."
            )
        else:
            summary["preview"] = make_preview(data_df, limit=3)

        summaries.append(summary)

    return prepared, summaries, errors




def replace_tables_transactionally(engine, prepared):
    """
    Mengganti isi seluruh tabel dalam satu transaksi.
    Kolom id dan timestamp yang memiliki default database
    tidak perlu diimpor dari Excel.
    """
    from sqlalchemy import inspect, text
    import uuid

    results = []

    with engine.begin() as connection:
        inspector = inspect(connection)

        for table_name, item in prepared.items():
            df = item["data"].copy()
            staging_table = f"stg_{table_name}_{uuid.uuid4().hex[:10]}"

            if not inspector.has_table(table_name, schema="public"):
                raise ValueError(
                    f"Tabel public.{table_name} tidak ditemukan."
                )

            existing_columns = inspector.get_columns(
                table_name,
                schema="public",
            )
            existing_by_name = {
                column["name"]: column
                for column in existing_columns
            }

            incoming_columns = list(df.columns)

            unknown_columns = [
                column
                for column in incoming_columns
                if column not in existing_by_name
            ]

            if unknown_columns:
                raise ValueError(
                    f"Tabel {table_name} tidak memiliki kolom "
                    f"{unknown_columns}."
                )

            missing_required = []

            for column in existing_columns:
                name = column["name"]

                if name in incoming_columns:
                    continue

                default = column.get("default")
                nullable = column.get("nullable", True)
                identity = column.get("identity")
                computed = column.get("computed")

                has_identity = bool(identity)
                has_computed = bool(computed)

                if (
                    not nullable
                    and default is None
                    and not has_identity
                    and not has_computed
                ):
                    missing_required.append(name)

            if missing_required:
                raise ValueError(
                    f"Tabel {table_name} memiliki kolom wajib "
                    f"tanpa default yang tidak tersedia di Excel: "
                    f"{missing_required}."
                )

            # Konversi tipe data sesuai skema tabel PostgreSQL.
            # Sel Excel kosong (NaN/None/string kosong) harus menjadi NULL,
            # bukan dianggap sebagai nilai numerik/tanggal yang tidak valid.
            import pandas as pd

            def is_empty_cell(value):
                if value is None:
                    return True
                if isinstance(value, str) and not value.strip():
                    return True
                try:
                    return bool(pd.isna(value))
                except (TypeError, ValueError):
                    return False

            for column in existing_columns:
                name = column["name"]
                if name not in df.columns:
                    continue

                data_type = column["type"].__class__.__name__.lower()
                original = df[name].copy()
                present = original.map(lambda value: not is_empty_cell(value))
                cleaned = original.map(
                    lambda value: None if is_empty_cell(value) else value
                )
                
                if data_type == "date":
                    # Data payroll kadang menyimpan periode sebagai "Agu-25".
                    # Pandas tidak selalu mengenali singkatan bulan Indonesia,
                    # jadi normalisasi bulan dilakukan sebelum parsing tanggal.
                    import re
                    from datetime import date, datetime

                    month_aliases = {
                        "jan": "Jan", "januari": "Jan",
                        "feb": "Feb", "februari": "Feb",
                        "mar": "Mar", "maret": "Mar",
                        "apr": "Apr", "april": "Apr",
                        "mei": "May", "may": "May",
                        "jun": "Jun", "juni": "Jun",
                        "jul": "Jul", "juli": "Jul",
                        "agu": "Aug", "ags": "Aug", "agt": "Aug",
                        "agustus": "Aug", "aug": "Aug", "august": "Aug",
                        "sep": "Sep", "sept": "Sep", "september": "Sep",
                        "okt": "Oct", "oct": "Oct", "oktober": "Oct",
                        "nov": "Nov", "november": "Nov",
                        "des": "Dec", "dec": "Dec", "desember": "Dec",
                    }

                    def parse_date_cell(value):
                        if is_empty_cell(value):
                            return pd.NaT
                        if isinstance(value, (pd.Timestamp, datetime)):
                            return pd.Timestamp(value).normalize()
                        if isinstance(value, date):
                            return pd.Timestamp(value)

                        text_value = str(value).strip()
                        # Normalisasi nama/ singkatan bulan Indonesia ke Inggris.
                        match = re.fullmatch(
                            r"([A-Za-zÀ-ÿ]+)[\s/-]+(\d{2,4})", text_value
                        )
                        if match:
                            month_text, year_text = match.groups()
                            month_en = month_aliases.get(month_text.casefold())
                            if month_en:
                                text_value = f"{month_en}-{year_text}"
                                for fmt in ("%b-%y", "%b-%Y"):
                                    try:
                                        return pd.Timestamp(datetime.strptime(text_value, fmt)).replace(day=1)
                                    except ValueError:
                                        pass

                        # Format umum dari Excel/CSV, termasuk YYYY-MM-DD dan DD/MM/YYYY.
                        for fmt in (
                            "%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y",
                            "%m/%d/%Y", "%d/%m/%y", "%d-%m-%y",
                            "%Y/%m/%d", "%b %Y", "%B %Y",
                        ):
                            try:
                                return pd.Timestamp(datetime.strptime(text_value, fmt))
                            except ValueError:
                                continue

                        # Fallback untuk timestamp/string tanggal yang dikenali pandas.
                        return pd.to_datetime(text_value, errors="coerce", dayfirst=True)

                    parsed = original.map(parse_date_cell)
                    invalid = present & parsed.isna()
                    if invalid.any():
                        bad_values = original[invalid].head(5).tolist()
                        raise ValueError(
                            f"Tabel {table_name}, kolom {name}: "
                            f"tanggal tidak valid. Contoh: {bad_values}"
                        )
                    df[name] = [
                        None if pd.isna(value) else pd.Timestamp(value).date()
                        for value in parsed
                    ]


                elif data_type in ("integer", "biginteger", "smallinteger"):
                    def parse_integer_cell(value):
                        """Membaca integer dengan pemisah ribuan Indonesia/US."""
                        if is_empty_cell(value):
                            return float("nan")
                        if isinstance(value, Number) and not isinstance(value, bool):
                            try:
                                return float(value)
                            except (TypeError, ValueError, OverflowError):
                                return float("nan")

                        text_value = str(value).strip().replace("\u00a0", "")
                        text_value = re.sub(r"\s+", "", text_value)
                        if not text_value:
                            return float("nan")

                        # Jika ada titik dan koma sekaligus, pemisah paling kanan
                        # dianggap desimal: 1.234,00 -> 1234.00; 1,234.00 -> 1234.00.
                        if "." in text_value and "," in text_value:
                            if text_value.rfind(",") > text_value.rfind("."):
                                text_value = text_value.replace(".", "").replace(",", ".")
                            else:
                                text_value = text_value.replace(",", "")
                        elif "," in text_value:
                            # 1,234 dianggap pemisah ribuan; 1,5 dianggap desimal.
                            if re.fullmatch(r"[+-]?\d{1,3}(,\d{3})+", text_value):
                                text_value = text_value.replace(",", "")
                            else:
                                text_value = text_value.replace(",", ".")
                        elif "." in text_value:
                            # Format Indonesia: 1.094 berarti seribu sembilan puluh empat.
                            if re.fullmatch(r"[+-]?\d{1,3}(\.\d{3})+", text_value):
                                text_value = text_value.replace(".", "")

                        try:
                            return float(text_value)
                        except (TypeError, ValueError, OverflowError):
                            return float("nan")

                    parsed = cleaned.map(parse_integer_cell)
                    invalid = present & parsed.isna()
                    non_integer = parsed.notna() & ((parsed % 1) != 0)
                    if invalid.any() or non_integer.any():
                        bad_mask = invalid | non_integer
                        bad_values = original[bad_mask].head(5).tolist()
                        raise ValueError(
                            f"Tabel {table_name}, kolom {name}: "
                            f"nilai integer tidak valid. Contoh: {bad_values}"
                        )
                    df[name] = [
                        None if pd.isna(value) else int(value)
                        for value in parsed
                    ]

                elif data_type in ("numeric", "decimal", "float", "real", "doubleprecision"):
                    def parse_numeric_cell(value):
                        """Membaca angka desimal dengan format Indonesia/US dan tanda persen."""
                        if is_empty_cell(value):
                            return float("nan")
                        if isinstance(value, Number) and not isinstance(value, bool):
                            try:
                                return float(value)
                            except (TypeError, ValueError, OverflowError):
                                return float("nan")

                        text_value = str(value).strip().replace("\u00a0", "")
                        text_value = re.sub(r"\s+", "", text_value)
                        if not text_value:
                            return float("nan")

                        # Persentase disimpan sebagai nilai persen (100,0% -> 100.0),
                        # bukan rasio (1.0), agar konsisten dengan angka di file sumber.
                        text_value = text_value.replace("%", "")
                        if not text_value:
                            return float("nan")

                        # Jika titik dan koma sama-sama ada, pemisah paling kanan
                        # dianggap desimal: 1.234,56 -> 1234.56; 1,234.56 -> 1234.56.
                        if "." in text_value and "," in text_value:
                            if text_value.rfind(",") > text_value.rfind("."):
                                text_value = text_value.replace(".", "").replace(",", ".")
                            else:
                                text_value = text_value.replace(",", "")
                        elif "," in text_value:
                            # Satu koma dengan tiga digit di belakang dapat berupa ribuan.
                            if re.fullmatch(r"[+-]?\d{1,3}(,\d{3})+", text_value):
                                text_value = text_value.replace(",", "")
                            else:
                                text_value = text_value.replace(",", ".")
                        elif "." in text_value:
                            # Titik berkelompok tiga digit dianggap pemisah ribuan.
                            if re.fullmatch(r"[+-]?\d{1,3}(\.\d{3})+", text_value):
                                text_value = text_value.replace(".", "")

                        try:
                            return float(text_value)
                        except (TypeError, ValueError, OverflowError):
                            return float("nan")

                    parsed = original.map(parse_numeric_cell)
                    invalid = present & parsed.isna()
                    if invalid.any():
                        bad_values = original[invalid].head(5).tolist()
                        raise ValueError(
                            f"Tabel {table_name}, kolom {name}: "
                            f"nilai numerik tidak valid. Contoh: {bad_values}"
                        )
                    df[name] = [
                        None if pd.isna(value) else float(value)
                        for value in parsed
                    ]

                else:
                    # Normalisasi sel kosong untuk kolom teks/tipe lainnya.
                    df[name] = cleaned

            # Simpan urutan asli baris file pada kolom bantu di staging.
            # PostgreSQL tidak menjamin urutan baris tabel jika SELECT tanpa ORDER BY.
            # Kolom bantu ini hanya ada di staging dan tidak masuk ke tabel tujuan.
            staging_df = df.copy()
            staging_order_column = "_import_row_order"
            while staging_order_column in staging_df.columns:
                staging_order_column = "_" + staging_order_column
            staging_df.insert(
                0,
                staging_order_column,
                range(1, len(staging_df) + 1),
            )

            staging_df.to_sql(
                name=staging_table,
                con=connection,
                schema="public",
                if_exists="fail",
                index=False,
                chunksize=1000,
            )

            quoted_columns = ", ".join(
                '"' + column.replace('"', '""') + '"'
                for column in incoming_columns
            )

            quoted_table = (
                '"' + table_name.replace('"', '""') + '"'
            )
            quoted_staging = (
                '"' + staging_table.replace('"', '""') + '"'
            )

            # Cast setiap kolom staging ke tipe kolom tujuan.
            # Pandas/to_sql dapat membuat kolom staging bertipe TEXT ketika
            # nilai numerik bercampur dengan None, meskipun data sudah dibersihkan.
            select_expressions = []
            for column_name in incoming_columns:
                target_column = existing_by_name[column_name]
                quoted_name = '"' + column_name.replace('"', '""') + '"'
                target_type = str(target_column["type"])
                select_expressions.append(
                    f"CAST({quoted_name} AS {target_type}) AS {quoted_name}"
                )
            select_columns = ", ".join(select_expressions)

            # Hapus data lama lalu masukkan data baru.
            connection.execute(
                text(f"DELETE FROM public.{quoted_table}")
            )

            connection.execute(
                text(
                    f"INSERT INTO public.{quoted_table} "
                    f"({quoted_columns}) "
                    f"SELECT {select_columns} "
                    f"FROM public.{quoted_staging} "
                    f"ORDER BY {quote_identifier(staging_order_column)} ASC"
                )
            )
            
            renumber_table_ids(
                connection,
                table_name,
                "id",
            )

            connection.execute(
                text(
                    f"DROP TABLE public.{quoted_staging}"
                )
            )

            results.append({
                "table": table_name,
                "rows_replaced": len(df),
                "columns_imported": incoming_columns,
            })

    return results



# =========================================================
# IMPORT SATU TABEL (CSV / EXCEL)
# =========================================================

def get_table_config_by_name(table_name: str):
    """Mengambil konfigurasi tabel berdasarkan nama tabel database."""
    for config_key, config in TABLE_CONFIG.items():
        if config.get("table_name") == table_name:
            return config_key, config
    raise HTTPException(
        status_code=404,
        detail="Tabel tujuan tidak tersedia untuk proses import.",
    )


def excel_column_index(column_letters: str) -> int:
    """Mengubah huruf kolom Excel (A, Z, AA) menjadi indeks 0-based."""
    result = 0
    for char in column_letters.upper():
        if not ("A" <= char <= "Z"):
            raise ValueError("Huruf kolom Excel tidak valid.")
        result = result * 26 + ord(char) - ord("A") + 1
    return result - 1


def prepare_single_table_import(filename: str, file_bytes: bytes, table_name: str):
    """
    Membaca dan memvalidasi file untuk SATU tabel tujuan.
    Excel memakai sheet/start_range dari TABLE_CONFIG.
    CSV memakai baris pertama sebagai header.
    Tidak mengubah database.
    """
    config_key, config = get_table_config_by_name(table_name)
    mapping = config.get("columns", {})
    if not mapping:
        raise ValueError(f"Mapping kolom untuk tabel {table_name} belum tersedia.")

    extension = Path(filename or "").suffix.lower()
    expected_headers = list(mapping.keys())
    expected_db_columns = list(mapping.values())

    if extension == ".csv":
        # CSV hasil export dari Excel/Google Sheets terkadang memiliki judul
        # laporan di baris pertama, sedangkan header tabel berada beberapa
        # baris di bawahnya. Baca tanpa mengasumsikan baris pertama adalah header.
        try:
            decoded = file_bytes.decode("utf-8-sig")
        except UnicodeDecodeError:
            decoded = file_bytes.decode("latin-1")

        first_line = next((line for line in decoded.splitlines() if line.strip()), "")
        if not first_line:
            raise ValueError("File CSV kosong atau tidak memiliki data.")

        delimiter_candidates = [",", ";", "\t", "|"]
        delimiter_counts = {}
        for delimiter in delimiter_candidates:
            try:
                delimiter_counts[delimiter] = len(next(csv.reader([first_line], delimiter=delimiter)))
            except csv.Error:
                delimiter_counts[delimiter] = 0
        delimiter = max(delimiter_counts, key=delimiter_counts.get)
        if delimiter_counts[delimiter] <= 1:
            raise ValueError("Delimiter CSV tidak berhasil dideteksi.")

        raw_csv = pd.read_csv(
            StringIO(decoded),
            sep=delimiter,
            header=None,
            dtype=str,
            keep_default_na=False,
            skipinitialspace=True,
            engine="python",
        ).fillna("")

        expected_normalized = [normalize_column_name(header) for header in expected_headers]
        header_row_index = None
        header_values = None
        # Cari satu baris yang memuat semua nama kolom wajib, bukan langsung
        # memakai baris judul laporan seperti "MASTER DATA — Detail Layanan...".
        for row_index in range(min(len(raw_csv), 50)):
            values = [str(value).strip() for value in raw_csv.iloc[row_index].tolist()]
            normalized_values = [normalize_column_name(value) for value in values]
            if all(header in normalized_values for header in expected_normalized):
                header_row_index = row_index
                header_values = values
                break

        if header_row_index is None:
            detected = [str(value).strip() for value in raw_csv.iloc[0].tolist()]
            raise ValueError(
                "Header CSV tidak ditemukan pada 50 baris pertama. Pastikan file CSV "
                "memuat baris kolom: " + ", ".join(expected_headers)
                + f". Baris pertama yang terdeteksi: {detected}"
            )

        normalized_to_index = {}
        for index, header in enumerate(header_values):
            normalized = normalize_column_name(header)
            if normalized and normalized not in normalized_to_index:
                normalized_to_index[normalized] = index

        missing = [header for header, normalized in zip(expected_headers, expected_normalized)
                   if normalized not in normalized_to_index]
        if missing:
            raise ValueError("Kolom wajib tidak ditemukan di CSV: " + ", ".join(missing))

        # Ambil hanya baris setelah header dan kolom yang dipetakan ke tabel tujuan.
        selected_indexes = [normalized_to_index[header] for header in expected_normalized]
        df = raw_csv.iloc[header_row_index + 1:, selected_indexes].copy()
        df.columns = expected_db_columns
        df = clean_dataframe(df)

    elif extension == ".xlsx":
        excel = pd.ExcelFile(BytesIO(file_bytes), engine="openpyxl")
        sheet_lookup = {
            normalize_column_name(sheet): sheet
            for sheet in excel.sheet_names
        }
        sheet_name = sheet_lookup.get(
            normalize_column_name(config.get("sheet_name", ""))
        )
        if not sheet_name:
            raise ValueError(
                f"Sheet '{config.get('sheet_name')}' tidak ditemukan di file Excel."
            )

        raw_df = pd.read_excel(
            excel,
            sheet_name=sheet_name,
            header=None,
            dtype=object,
        )

        range_value = str(config.get("start_range", "")).replace(" ", "").upper()
        range_match = re.fullmatch(
            r"\$?([A-Z]+)\$?(\d+):\$?([A-Z]+)",
            range_value,
        )
        if not range_match:
            raise ValueError(
                f"Format start_range tidak valid untuk tabel {table_name}: {range_value}"
            )

        start_letters, row_number, end_letters = range_match.groups()
        start_col = excel_column_index(start_letters)
        end_col = excel_column_index(end_letters)
        header_idx = int(row_number) - 1

        if header_idx < 0 or header_idx >= len(raw_df) or end_col < start_col:
            raise ValueError("Posisi header/rentang kolom di Excel tidak valid.")

        if raw_df.shape[1] < end_col + 1:
            raw_df = raw_df.reindex(columns=range(end_col + 1))

        header_values = raw_df.iloc[header_idx, start_col:end_col + 1].tolist()
        headers = ["" if is_empty(value) else str(value).strip() for value in header_values]

        normalized_to_actual = {}
        duplicates = []
        for header in headers:
            normalized = normalize_column_name(header)
            if not normalized:
                continue
            if normalized in normalized_to_actual:
                duplicates.append(header)
            else:
                normalized_to_actual[normalized] = header

        if duplicates:
            raise ValueError(f"Header Excel duplikat: {duplicates}")

        missing = [
            header for header in expected_headers
            if normalize_column_name(header) not in normalized_to_actual
        ]
        if missing:
            raise ValueError(
                "Kolom wajib tidak ditemukan di sheet Excel: "
                + ", ".join(missing)
                + f". Kolom yang terdeteksi: {headers}"
            )

        data = raw_df.iloc[header_idx + 1:, start_col:end_col + 1].copy()
        data.columns = headers

        non_empty_mask = data.apply(
            lambda row: any(not is_empty(value) for value in row.tolist()),
            axis=1,
        )
        data = data.loc[non_empty_mask].reset_index(drop=True)

        selected_actual = [
            normalized_to_actual[normalize_column_name(header)]
            for header in expected_headers
        ]
        df = data[selected_actual].copy()
        df.columns = expected_db_columns

    else:
        raise ValueError("Format file harus .xlsx atau .csv.")

    # Hapus baris kosong dan pastikan ada data yang bisa diimpor.
    non_empty_mask = df.apply(
        lambda row: any(not is_empty(value) for value in row.tolist()),
        axis=1,
    )
    df = df.loc[non_empty_mask].reset_index(drop=True)

    if df.empty:
        raise ValueError("File tidak memiliki baris data untuk diimpor.")

    if len(set(df.columns)) != len(df.columns):
        raise ValueError("Nama kolom hasil mapping duplikat.")

    # Pertahankan validasi khusus Master Detail Divisi dari import workbook lama.
    if config_key == "master_detail_divisi":
        month_col = "periode_bulan"
        division_col = "divisi"

        if month_col in df.columns:
            def blank_or_zero(value):
                if is_empty(value):
                    return True
                if isinstance(value, Number):
                    return value == 0
                normalized = str(value).strip()
                normalized = re.sub(r"(?i)\b(rp|idr)\b", "", normalized)
                normalized = normalized.replace(" ", "")
                if normalized in {"-", "—"}:
                    return False
                return bool(re.fullmatch(r"[-+]?0+(?:[.,]0+)?", normalized))

            meaningful_cols = [
                column for column in df.columns
                if column not in {month_col, division_col}
            ]
            if meaningful_cols:
                no_transaction_data = df[meaningful_cols].apply(
                    lambda row: all(blank_or_zero(value) for value in row.tolist()),
                    axis=1,
                )
            else:
                no_transaction_data = pd.Series(True, index=df.index)

            missing_month = df[month_col].map(is_empty)
            df = df.loc[~(missing_month & no_transaction_data)].copy()

            if df[month_col].map(is_empty).any():
                raise ValueError(
                    "Master Detail Divisi memiliki baris dengan Bulan kosong "
                    "tetapi kolom transaksi berisi data."
                )

    if df.empty:
        raise ValueError("Tidak ada baris data valid setelah pembersihan.")

    return {
        table_name: {
            "data": df[expected_db_columns],
            "sensitive": config_key == "payroll_team",
            "sheet": config.get("sheet_name", table_name),
        }
    }


def resolve_import_table_name(form_table_name: str, query_table_name: str) -> str:
    """Mendukung table_name dikirim melalui multipart form atau query string."""
    table_name = (form_table_name or query_table_name or "").strip()
    if not table_name:
        raise HTTPException(
            status_code=422,
            detail="Pilih tabel tujuan sebelum melakukan import.",
        )
    get_table_config_by_name(table_name)  # Validasi allowlist.
    return table_name


@app.post("/api/import/preview-table")
async def preview_single_table_import(
    file: UploadFile = File(...),
    table_name: str = Form(default=""),
    table_name_query: str = Query(default="", alias="table_name"),
):
    """Preview dan validasi file tanpa menulis atau menghapus data database."""
    filename = (file.filename or "").lower()
    if not filename.endswith((".xlsx", ".csv")):
        raise HTTPException(status_code=400, detail="Format file harus .xlsx atau .csv.")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="File kosong.")

    try:
        target_table = resolve_import_table_name(table_name, table_name_query)
        prepared = prepare_single_table_import(filename, content, target_table)
        item = prepared[target_table]
        df = item["data"]
        sensitive = item["sensitive"]

        return {
            "status": "valid",
            "filename": file.filename,
            "table": target_table,
            "table_name": target_table,
            "write_performed": False,
            "confirmation_required": True,
            "total_rows": len(df),
            "total_columns": len(df.columns),
            "columns": list(df.columns),
            "preview": (
                "Preview disembunyikan karena tabel berisi data karyawan."
                if sensitive else make_preview(df, limit=10)
            ),
            "message": f"Validasi berhasil. {len(df)} baris siap menggantikan data tabel {target_table}.",
        }
    except HTTPException:
        raise
    except Exception as error:
        logging.exception("Validasi import satu tabel gagal")
        raise HTTPException(
            status_code=422,
            detail=f"Validasi import gagal: {str(error)}",
        ) from error
    finally:
        await file.close()


@app.post("/api/import/confirm-table")
async def confirm_single_table_import(
    file: UploadFile = File(...),
    table_name: str = Form(default=""),
    table_name_query: str = Query(default="", alias="table_name"),
):
    """
    Mengganti isi SATU tabel terpilih setelah pengguna menekan konfirmasi.
    Tabel lain tidak disentuh. File divalidasi ulang sebelum transaksi.
    """
    filename = (file.filename or "").lower()
    if not filename.endswith((".xlsx", ".csv")):
        raise HTTPException(status_code=400, detail="Format file harus .xlsx atau .csv.")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="File kosong.")

    engine = None
    try:
        target_table = resolve_import_table_name(table_name, table_name_query)
        prepared = prepare_single_table_import(filename, content, target_table)

        engine = get_import_engine()
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        # prepared hanya berisi satu tabel; transaksi hanya menyentuh tabel itu.
        results = replace_tables_transactionally(engine, prepared)
        imported_rows = sum(int(item.get("rows_replaced", 0)) for item in results)
        write_activity_log(
            "IMPORT", target_table,
            f"Import berhasil dan mengganti isi tabel {target_table}.",
            file_name=file.filename,
            total_rows=imported_rows,
            success_rows=imported_rows,
        )
        return {
            "status": "success",
            "filename": file.filename,
            "table": target_table,
            "table_name": target_table,
            "write_performed": True,
            "strategy": "single_table_transactional_replace",
            "results": results,
            "message": f"Data tabel {target_table} berhasil diganti. Tabel lain tidak diubah.",
        }
    except HTTPException:
        raise
    except Exception as error:
        failed_table = locals().get("target_table", "unknown")
        write_activity_log(
            "IMPORT", failed_table, f"Import tabel {failed_table} gagal.",
            file_name=file.filename, status="FAILED",
            error_message=str(error)[:1000],
        )
        logging.exception("Import satu tabel gagal")
        raise HTTPException(
            status_code=500,
            detail=(
                "Import gagal. Tidak ada perubahan yang di-commit jika transaksi "
                "gagal. Periksa log backend untuk detail."
            ),
        ) from error
    finally:
        if engine is not None:
            engine.dispose()
        await file.close()



@app.post("/api/import/preview-replace")
async def preview_replace_import(file: UploadFile = File(...)):
    """
    Validasi dan preview saja.
    Endpoint ini TIDAK menulis atau menghapus data database.
    """
    if not (file.filename or "").lower().endswith(".xlsx"):
        raise HTTPException(
            status_code=400,
            detail="Upload file .xlsx.",
        )

    content = await file.read()

    if not content:
        raise HTTPException(
            status_code=400,
            detail="File kosong.",
        )

    try:
        _, summaries, errors = prepare_import_data(content)

        return {
            "status": "valid" if not errors else "invalid",
            "filename": file.filename,
            "write_performed": False,
            "replacement_strategy": "transactional_replace",
            "confirmation_required": True,
            "required_confirmation": REPLACE_CONFIRMATION,
            "sheets": summaries,
            "errors": errors,
            "message": (
                "Validasi berhasil. Unggah file yang sama ke endpoint "
                "konfirmasi untuk memulai replace."
                if not errors
                else "Import diblokir. Perbaiki seluruh error terlebih dahulu."
            ),
        }

    except Exception as error:
        raise HTTPException(
            status_code=400,
            detail=f"Gagal memvalidasi file: {str(error)}",
        ) from error

    finally:
        await file.close()


@app.post("/api/import/confirm-replace")
async def confirm_replace_import(
    file: UploadFile = File(...),
    confirmation: str = "",
):
    """
    Mengganti data hanya setelah konfirmasi eksplisit.
    File harus diunggah kembali setelah preview.
    """
    if confirmation != REPLACE_CONFIRMATION:
        raise HTTPException(
            status_code=400,
            detail=(
                "Import dibatalkan. Kirim confirmation="
                f"{REPLACE_CONFIRMATION!r} untuk menyetujui replace."
            ),
        )

    if not (file.filename or "").lower().endswith(".xlsx"):
        raise HTTPException(
            status_code=400,
            detail="Upload file .xlsx.",
        )

    content = await file.read()

    if not content:
        raise HTTPException(
            status_code=400,
            detail="File kosong.",
        )

    engine = None

    try:
        prepared, summaries, errors = prepare_import_data(content)

        if errors:
            raise HTTPException(
                status_code=422,
                detail={
                    "message": (
                        "Tidak ada data yang diubah. "
                        "Validasi sheet gagal."
                    ),
                    "errors": errors,
                },
            )

        if len(prepared) != len(TABLE_CONFIG):
            raise HTTPException(
                status_code=422,
                detail="Tidak semua sheet yang diwajibkan siap diimpor.",
            )

        engine = get_import_engine()

        # Periksa koneksi terlebih dahulu.
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        # Tidak dipanggil oleh preview. Hanya berjalan pada endpoint ini
        # setelah confirmation cocok dan seluruh validasi berhasil.
        results = replace_tables_transactionally(
            engine,
            prepared,
        )

        for item in results:
            imported_rows = int(item.get("rows_replaced", 0))
            table_name = item.get("table", "unknown")
            write_activity_log(
                "IMPORT", table_name,
                f"Import berhasil dan mengganti isi tabel {table_name}.",
                file_name=file.filename,
                total_rows=imported_rows,
                success_rows=imported_rows,
            )

        return {
            "status": "success",
            "filename": file.filename,
            "write_performed": True,
            "strategy": "transactional_replace",
            "results": results,
            "message": (
                "Semua tabel berhasil diganti dalam satu transaksi."
            ),
        }

    except HTTPException:
        raise

    except Exception as error:
        # Catat kegagalan transaksi import, tanpa menyimpan isi data payroll.
        write_activity_log(
            "IMPORT", "multiple_tables",
            "Import seluruh tabel Payroll Operations gagal.",
            file_name=file.filename, status="FAILED",
            error_message=str(error)[:1000],
        )
        # Detail lengkap masuk ke terminal backend, bukan dikirim ke client.
        import logging
        logging.exception("Gagal saat import payroll ke database")
        raise HTTPException(
            status_code=500,
            detail=(
                "Import gagal. Cek traceback di terminal backend untuk "
                "mengetahui penyebabnya. Transaksi dibatalkan jika belum commit."
            ),
        ) from error

    finally:
        if engine is not None:
            engine.dispose()
        await file.close()

