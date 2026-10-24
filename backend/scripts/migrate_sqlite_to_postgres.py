#!/usr/bin/env python3
"""
Solvane: One-time, safe, re-runnable SQLite to PostgreSQL migration script.
Copies all data from local SQLite file (opened strictly read-only) into PostgreSQL (DATABASE_URL).

Usage:
    python scripts/migrate_sqlite_to_postgres.py --dry-run
    python scripts/migrate_sqlite_to_postgres.py
    python scripts/migrate_sqlite_to_postgres.py --sqlite-path /path/to/solvane.db

Safety:
- Opens SQLite strictly read-only with 'mode=ro'. Never modifies or deletes SQLite data.
- Never prints, logs, or displays passwords or connection strings.
- Upserts seeded tables (places, hotels, food): SQLite data wins. Extra rows in Postgres are preserved.
- Skips existing rows for other tables: safe to re-run multiple times without duplicate errors.
- Resets Postgres ID sequences (users, login_logs, chat_logs) after copying.
"""

import sys
import os
import argparse
import sqlite3
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Set, Tuple

# Add backend directory to sys.path so we can import models and config
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))
sys.stdout.reconfigure(encoding="utf-8")

from dotenv import load_dotenv
load_dotenv(dotenv_path=backend_dir / ".env")

from sqlalchemy import create_engine, select, text, func
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import OperationalError, SQLAlchemyError

# Import ORM models from database module
from database import (
    Base,
    User,
    LoginLog,
    ChatLog,
    Place,
    PlanNarration,
    SavedPlan,
    Hotel,
    Food,
)


def mask_connection_info(url: str) -> str:
    """Returns a safe label like 'PostgreSQL (Supabase)' without exposing credentials or hosts."""
    if not url:
        return "None"
    dialect = url.split(":")[0]
    return f"{dialect} database"


def parse_datetime(val: Any) -> Any:
    """Parses SQLite timestamp strings into Python datetime objects."""
    if not val:
        return None
    if isinstance(val, datetime):
        return val
    try:
        clean = str(val).strip().replace(" ", "T")
        return datetime.fromisoformat(clean)
    except Exception:
        return None


def parse_json_value(val: Any) -> Any:
    """Ensures JSON columns are parsed into Python lists or dicts."""
    if val is None:
        return []
    if isinstance(val, (list, dict)):
        return val
    if isinstance(val, str):
        try:
            return json.loads(val)
        except Exception:
            return [val] if val.strip() else []
    return []


def open_sqlite_readonly(sqlite_path: Path) -> sqlite3.Connection:
    """Opens local SQLite database strictly in read-only mode."""
    if not sqlite_path.exists():
        raise FileNotFoundError(f"SQLite file not found at: {sqlite_path}")

    # Use URI mode=ro so SQLite driver strictly rejects any write/delete operations
    norm_path = str(sqlite_path.resolve()).replace("\\", "/")
    uri = f"file:{norm_path}?mode=ro"
    conn = sqlite3.connect(uri, uri=True)
    conn.row_factory = sqlite3.Row
    return conn


def get_sqlite_table_names(conn: sqlite3.Connection) -> List[str]:
    """Retrieves all non-system table names in SQLite."""
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    return [r[0] for r in cur.fetchall()]


def read_sqlite_rows(conn: sqlite3.Connection, table_name: str) -> List[Dict[str, Any]]:
    """Reads all rows from an SQLite table as a list of dictionaries."""
    cur = conn.cursor()
    cur.execute(f"SELECT * FROM {table_name}")
    rows = cur.fetchall()
    return [dict(r) for r in rows]


def reset_postgres_sequences(session) -> None:
    """
    Resets auto-increment sequences in PostgreSQL for tables with integer primary keys.
    Prevents duplicate key errors on future inserts.
    """
    seq_configs = [
        ("users", "user_id"),
        ("login_logs", "log_id"),
        ("chat_logs", "log_id"),
    ]
    print("\n[Sequence Reset] Synchronizing PostgreSQL auto-increment sequences...")
    for table, col in seq_configs:
        try:
            seq_name = session.execute(
                text(f"SELECT pg_get_serial_sequence('{table}', '{col}')")
            ).scalar()

            if seq_name:
                max_val = session.execute(
                    text(f"SELECT COALESCE(MAX({col}), 0) FROM {table}")
                ).scalar() or 0
                next_val = max(max_val, 1)
                is_called = max_val > 0
                session.execute(
                    text(f"SELECT setval('{seq_name}', :next_val, :is_called)"),
                    {"next_val": next_val, "is_called": is_called}
                )
                print(f"  ✓ {table}.{col} -> sequence '{seq_name}' updated to {next_val} (is_called={is_called})")
            else:
                print(f"  - {table}.{col} has no sequence (managed externally)")
        except Exception as e:
            print(f"  ⚠ Could not reset sequence for {table}.{col}: {e}")


def run_migration(sqlite_path: Path, dry_run: bool = False) -> bool:
    """
    Core migration routine.
    Copies and upserts SQLite data into PostgreSQL.
    """
    # 1. Check DATABASE_URL
    raw_db_url = os.getenv("DATABASE_URL", "").strip()
    if not raw_db_url:
        print("\n❌ Error: DATABASE_URL is not set.")
        print("Please configure your Supabase / PostgreSQL connection string in backend/.env:")
        print("DATABASE_URL=postgresql+psycopg2://postgres:[PASSWORD]@[HOST]:5432/postgres\n")
        return False

    # Normalize postgres:// to postgresql+psycopg2://
    if raw_db_url.startswith("postgres://"):
        raw_db_url = raw_db_url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif raw_db_url.startswith("postgresql://") and not raw_db_url.startswith("postgresql+"):
        raw_db_url = raw_db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

    print("==================================================================")
    print("      SOLVANE: SQLITE TO POSTGRESQL DATA MIGRATION")
    print("==================================================================")
    print(f"Mode: {'🔍 DRY-RUN PREVIEW (No changes will be written)' if dry_run else '🚀 LIVE MIGRATION (Applying changes)'}")
    print(f"SQLite Source (Read-Only): {sqlite_path}")
    print(f"Target Database: {mask_connection_info(raw_db_url)}")
    print("==================================================================\n")

    # 2. Open SQLite read-only
    try:
        sqlite_conn = open_sqlite_readonly(sqlite_path)
    except FileNotFoundError as e:
        print(f"❌ Error: {e}")
        return False
    except Exception as e:
        print(f"❌ Error opening SQLite database: {e}")
        return False

    # 3. Connect to PostgreSQL
    try:
        pg_engine = create_engine(
            raw_db_url,
            connect_args={"connect_timeout": 8},
            pool_pre_ping=True
        )
        # Verify connection
        with pg_engine.connect() as test_conn:
            test_conn.execute(text("SELECT 1"))
    except OperationalError as e:
        err_msg = str(e).lower()
        print("\n❌ Error: Failed to connect to PostgreSQL database.")
        if "password authentication failed" in err_msg:
            print("  Reason: Incorrect database password in DATABASE_URL. Please verify your Supabase credentials.")
        elif "could not translate host name" in err_msg or "name or service not known" in err_msg:
            print("  Reason: Host name could not be resolved. Please check your internet connection and DNS settings.")
        elif "connection refused" in err_msg or "timeout" in err_msg:
            print("  Reason: Connection timed out or port 5432/6543 blocked. Ensure your Supabase project is active.")
        else:
            print("  Reason: Connection could not be established. Please check your DATABASE_URL.")
        sqlite_conn.close()
        return False
    except Exception as e:
        print(f"\n❌ Unexpected error connecting to PostgreSQL: {e}")
        sqlite_conn.close()
        return False

    # 4. Ensure all tables exist in PostgreSQL
    if not dry_run:
        try:
            Base.metadata.create_all(bind=pg_engine)
        except Exception as e:
            print(f"⚠ Note during table verification: {e}")

    PgSession = sessionmaker(bind=pg_engine, autocommit=False, autoflush=False)
    pg_session = PgSession()

    sqlite_tables = set(get_sqlite_table_names(sqlite_conn))

    # Migration plan order (respecting foreign key relationships)
    table_order = [
        "users",
        "places",
        "hotels",
        "food",
        "login_logs",
        "chat_logs",
        "saved_plans",
        "plan_narrations",
    ]

    # Tables where SQLite data upserts/updates existing auto-seeded rows
    upsert_tables = {"places", "hotels", "food"}

    summary_stats = {}

    try:
        for table in table_order:
            if table not in sqlite_tables:
                print(f"[Table: {table}] Not present in SQLite file. Skipping.")
                continue

            sqlite_rows = read_sqlite_rows(sqlite_conn, table)
            sql_count = len(sqlite_rows)

            # Query Postgres count before
            try:
                pg_count_before = pg_session.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar() or 0
            except Exception:
                pg_count_before = 0

            inserted_count = 0
            updated_count = 0
            skipped_count = 0
            extra_in_pg: List[str] = []

            # -------------------------------------------------------------
            # TABLE 1: USERS
            # -------------------------------------------------------------
            if table == "users":
                pg_user_ids = set(pg_session.scalars(select(User.user_id)).all())
                pg_emails = set(pg_session.scalars(select(func.lower(User.email))).all())

                for r in sqlite_rows:
                    uid = r["user_id"]
                    uemail = str(r["email"]).strip().lower()

                    if uid in pg_user_ids or uemail in pg_emails:
                        skipped_count += 1
                    else:
                        inserted_count += 1
                        if not dry_run:
                            new_u = User(
                                user_id=uid,
                                username=r["username"],
                                email=uemail,
                                password_hash=r["password_hash"],
                                created_at=parse_datetime(r.get("created_at")),
                                last_login=parse_datetime(r.get("last_login")),
                                is_admin=bool(r.get("is_admin", False))
                            )
                            pg_session.add(new_u)

            # -------------------------------------------------------------
            # TABLE 2: PLACES (Upsert SQLite over auto-seeded data)
            # -------------------------------------------------------------
            elif table == "places":
                pg_places = {p.id: p for p in pg_session.scalars(select(Place)).all()}
                sqlite_ids = set(r["id"] for r in sqlite_rows)

                for r in sqlite_rows:
                    pid = r["id"]
                    if pid in pg_places:
                        # Update with SQLite version (SQLite wins)
                        updated_count += 1
                        if not dry_run:
                            p = pg_places[pid]
                            p.name_en = r["name_en"]
                            p.name_ta = r.get("name_ta", "")
                            p.category = r["category"]
                            p.subtype = r.get("subtype", r["category"])
                            p.short_description = r.get("short_description", "")
                            p.description = r.get("description", "")
                            p.timings = r.get("timings", "")
                            p.entry_fee = r.get("entry_fee", "Free")
                            p.best_season = r.get("best_season", "All year")
                            p.lat = float(r["lat"]) if r.get("lat") is not None else 0.0
                            p.lng = float(r["lng"]) if r.get("lng") is not None else 0.0
                            p.image = r.get("image", "")
                            p.gallery = parse_json_value(r.get("gallery"))
                            p.tags = parse_json_value(r.get("tags"))
                            p.estimated_visit_hours = float(r.get("estimated_visit_hours", 1.5))
                            p.zone = r.get("zone", "rameswaram_town")
                            p.dress_code = r.get("dress_code", "")
                            p.photography_rules = r.get("photography_rules", "")
                            p.how_to_reach = r.get("how_to_reach", "")
                            p.tips = parse_json_value(r.get("tips"))
                            p.nearby_places = parse_json_value(r.get("nearby_places"))
                            p.verified = bool(r.get("verified", True))
                    else:
                        # Insert missing place
                        inserted_count += 1
                        if not dry_run:
                            new_p = Place(
                                id=pid,
                                name_en=r["name_en"],
                                name_ta=r.get("name_ta", ""),
                                category=r["category"],
                                subtype=r.get("subtype", r["category"]),
                                short_description=r.get("short_description", ""),
                                description=r.get("description", ""),
                                timings=r.get("timings", ""),
                                entry_fee=r.get("entry_fee", "Free"),
                                best_season=r.get("best_season", "All year"),
                                lat=float(r["lat"]) if r.get("lat") is not None else 0.0,
                                lng=float(r["lng"]) if r.get("lng") is not None else 0.0,
                                image=r.get("image", ""),
                                gallery=parse_json_value(r.get("gallery")),
                                tags=parse_json_value(r.get("tags")),
                                estimated_visit_hours=float(r.get("estimated_visit_hours", 1.5)),
                                zone=r.get("zone", "rameswaram_town"),
                                dress_code=r.get("dress_code", ""),
                                photography_rules=r.get("photography_rules", ""),
                                how_to_reach=r.get("how_to_reach", ""),
                                tips=parse_json_value(r.get("tips")),
                                nearby_places=parse_json_value(r.get("nearby_places")),
                                verified=bool(r.get("verified", True)),
                                created_by=r.get("created_by", "system")
                            )
                            pg_session.add(new_p)

                # Check if Postgres has extra places not in SQLite (keep them)
                extra_in_pg = [pid for pid in pg_places.keys() if pid not in sqlite_ids]

            # -------------------------------------------------------------
            # TABLE 3: HOTELS (Upsert if in database)
            # -------------------------------------------------------------
            elif table == "hotels":
                pg_hotels = {h.id: h for h in pg_session.scalars(select(Hotel)).all()}
                sqlite_ids = set(r["id"] for r in sqlite_rows)

                for r in sqlite_rows:
                    hid = r["id"]
                    if hid in pg_hotels:
                        updated_count += 1
                        if not dry_run:
                            h = pg_hotels[hid]
                            h.name = r["name"]
                            h.name_ta = r.get("name_ta", "")
                            h.destination_id = r.get("destination_id", "ramanathapuram")
                            h.area = r.get("area", "")
                            h.category = r.get("category", "")
                            h.price_range_per_night = r.get("price_range_per_night", "")
                            h.rating = float(r.get("rating", 4.0))
                            h.amenities = parse_json_value(r.get("amenities"))
                            h.contact = r.get("contact", "")
                            h.lat = float(r.get("lat", 0.0))
                            h.lng = float(r.get("lng", 0.0))
                            h.nearby_place_ids = parse_json_value(r.get("nearby_place_ids"))
                            h.image = r.get("image", "")
                            h.map_link = r.get("map_link", "")
                            h.verified = bool(r.get("verified", True))
                    else:
                        inserted_count += 1
                        if not dry_run:
                            new_h = Hotel(
                                id=hid,
                                name=r["name"],
                                name_ta=r.get("name_ta", ""),
                                destination_id=r.get("destination_id", "ramanathapuram"),
                                area=r.get("area", ""),
                                category=r.get("category", ""),
                                price_range_per_night=r.get("price_range_per_night", ""),
                                rating=float(r.get("rating", 4.0)),
                                amenities=parse_json_value(r.get("amenities")),
                                contact=r.get("contact", ""),
                                lat=float(r.get("lat", 0.0)),
                                lng=float(r.get("lng", 0.0)),
                                nearby_place_ids=parse_json_value(r.get("nearby_place_ids")),
                                image=r.get("image", ""),
                                map_link=r.get("map_link", ""),
                                verified=bool(r.get("verified", True))
                            )
                            pg_session.add(new_h)
                extra_in_pg = [hid for hid in pg_hotels.keys() if hid not in sqlite_ids]

            # -------------------------------------------------------------
            # TABLE 4: FOOD (Upsert if in database)
            # -------------------------------------------------------------
            elif table == "food":
                pg_food = {f.id: f for f in pg_session.scalars(select(Food)).all()}
                sqlite_ids = set(r["id"] for r in sqlite_rows)

                for r in sqlite_rows:
                    fid = r["id"]
                    if fid in pg_food:
                        updated_count += 1
                        if not dry_run:
                            f = pg_food[fid]
                            f.name = r["name"]
                            f.name_ta = r.get("name_ta", "")
                            f.destination_id = r.get("destination_id", "ramanathapuram")
                            f.area = r.get("area", "")
                            f.type = r.get("type", "")
                            f.famous_for = parse_json_value(r.get("famous_for"))
                            f.price_range = r.get("price_range", "")
                            f.timings = r.get("timings", "")
                            f.veg_or_nonveg = r.get("veg_or_nonveg", "")
                            f.rating = float(r.get("rating", 4.0))
                            f.contact = r.get("contact", "")
                            f.lat = float(r.get("lat", 0.0))
                            f.lng = float(r.get("lng", 0.0))
                            f.nearby_place_ids = parse_json_value(r.get("nearby_place_ids"))
                            f.image = r.get("image", "")
                            f.map_link = r.get("map_link", "")
                            f.verified = bool(r.get("verified", True))
                    else:
                        inserted_count += 1
                        if not dry_run:
                            new_f = Food(
                                id=fid,
                                name=r["name"],
                                name_ta=r.get("name_ta", ""),
                                destination_id=r.get("destination_id", "ramanathapuram"),
                                area=r.get("area", ""),
                                type=r.get("type", ""),
                                famous_for=parse_json_value(r.get("famous_for")),
                                price_range=r.get("price_range", ""),
                                timings=r.get("timings", ""),
                                veg_or_nonveg=r.get("veg_or_nonveg", ""),
                                rating=float(r.get("rating", 4.0)),
                                contact=r.get("contact", ""),
                                lat=float(r.get("lat", 0.0)),
                                lng=float(r.get("lng", 0.0)),
                                nearby_place_ids=parse_json_value(r.get("nearby_place_ids")),
                                image=r.get("image", ""),
                                map_link=r.get("map_link", ""),
                                verified=bool(r.get("verified", True))
                            )
                            pg_session.add(new_f)
                extra_in_pg = [fid for fid in pg_food.keys() if fid not in sqlite_ids]

            # -------------------------------------------------------------
            # TABLE 5: LOGIN_LOGS
            # -------------------------------------------------------------
            elif table == "login_logs":
                pg_log_ids = set(pg_session.scalars(select(LoginLog.log_id)).all())
                for r in sqlite_rows:
                    lid = r["log_id"]
                    if lid in pg_log_ids:
                        skipped_count += 1
                    else:
                        inserted_count += 1
                        if not dry_run:
                            new_log = LoginLog(
                                log_id=lid,
                                user_id=r.get("user_id"),
                                login_time=parse_datetime(r.get("login_time")),
                                success=bool(r.get("success", False)),
                                email_attempted=r.get("email_attempted", "")
                            )
                            pg_session.add(new_log)

            # -------------------------------------------------------------
            # TABLE 6: CHAT_LOGS
            # -------------------------------------------------------------
            elif table == "chat_logs":
                pg_chat_ids = set(pg_session.scalars(select(ChatLog.log_id)).all())
                for r in sqlite_rows:
                    cid = r["log_id"]
                    if cid in pg_chat_ids:
                        skipped_count += 1
                    else:
                        inserted_count += 1
                        if not dry_run:
                            new_chat = ChatLog(
                                log_id=cid,
                                user_id=r.get("user_id"),
                                question=r.get("question", ""),
                                created_at=parse_datetime(r.get("created_at"))
                            )
                            pg_session.add(new_chat)

            # -------------------------------------------------------------
            # TABLE 7: SAVED_PLANS
            # -------------------------------------------------------------
            elif table == "saved_plans":
                pg_plan_ids = set(pg_session.scalars(select(SavedPlan.plan_id)).all())
                for r in sqlite_rows:
                    pid = r["plan_id"]
                    if pid in pg_plan_ids:
                        skipped_count += 1
                    else:
                        inserted_count += 1
                        if not dry_run:
                            new_sp = SavedPlan(
                                plan_id=pid,
                                user_id=r["user_id"],
                                title=r.get("title", "Trip Itinerary"),
                                trip_json=str(r.get("trip_json", "{}")),
                                plan_json=str(r.get("plan_json", "{}")),
                                narration_json=r.get("narration_json"),
                                created_at=parse_datetime(r.get("created_at"))
                            )
                            pg_session.add(new_sp)

            # -------------------------------------------------------------
            # TABLE 8: PLAN_NARRATIONS
            # -------------------------------------------------------------
            elif table == "plan_narrations":
                pg_narrations = set(
                    pg_session.execute(
                        select(PlanNarration.user_id, PlanNarration.plan_hash)
                    ).all()
                )
                for r in sqlite_rows:
                    key = (r["user_id"], r["plan_hash"])
                    if key in pg_narrations:
                        skipped_count += 1
                    else:
                        inserted_count += 1
                        if not dry_run:
                            new_pn = PlanNarration(
                                user_id=r["user_id"],
                                plan_hash=r["plan_hash"],
                                narration_json=str(r.get("narration_json", "{}")),
                                created_at=parse_datetime(r.get("created_at"))
                            )
                            pg_session.add(new_pn)

            # Flush changes table by table if live migration
            if not dry_run:
                pg_session.commit()
                pg_count_after = pg_session.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar() or 0
            else:
                pg_count_after = pg_count_before + inserted_count

            summary_stats[table] = {
                "sqlite_count": sql_count,
                "pg_before": pg_count_before,
                "inserted": inserted_count,
                "updated": updated_count,
                "skipped": skipped_count,
                "pg_after": pg_count_after,
                "extra_in_pg": extra_in_pg,
            }

        # Reset sequences after live migration
        if not dry_run:
            reset_postgres_sequences(pg_session)
            pg_session.commit()
        else:
            pg_session.rollback()

    except Exception as e:
        pg_session.rollback()
        print(f"\n❌ Error during migration execution: {e}")
        return False
    finally:
        pg_session.close()
        sqlite_conn.close()

    # 5. Print Detailed Summary Table
    print("\n" + "=" * 80)
    print("                     MIGRATION SUMMARY TABLE")
    print("=" * 80)
    print(f"{'Table':<18} | {'SQLite':<7} | {'PG Before':<9} | {'Insert':<7} | {'Update':<7} | {'Skip':<6} | {'PG After':<8}")
    print("-" * 80)

    for table, s in summary_stats.items():
        print(
            f"{table:<18} | {s['sqlite_count']:<7} | {s['pg_before']:<9} | "
            f"{s['inserted']:<7} | {s['updated']:<7} | {s['skipped']:<6} | {s['pg_after']:<8}"
        )
        if s["extra_in_pg"]:
            print(f"   ↳ [Notice] {len(s['extra_in_pg'])} row(s) exist in Postgres only and were preserved: {s['extra_in_pg']}")

    print("=" * 80)

    if dry_run:
        print("\n🔍 DRY-RUN COMPLETE: No changes were written to PostgreSQL.")
        print("To apply these changes, run the script without --dry-run.")
    else:
        print("\n✅ MIGRATION COMPLETED SUCCESSFULLY!")
        print("All SQLite records have been safely migrated into PostgreSQL.")

    return True


def main():
    default_db = backend_dir / "solvane.db"

    parser = argparse.ArgumentParser(
        description="Safely migrates local SQLite data into PostgreSQL (DATABASE_URL)."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simulates the migration and prints planned inserts/updates without modifying PostgreSQL."
    )
    parser.add_argument(
        "--sqlite-path",
        type=Path,
        default=default_db,
        help="Path to the local SQLite database file (defaults to backend/solvane.db)."
    )

    args = parser.parse_args()

    success = run_migration(sqlite_path=args.sqlite_path, dry_run=args.dry_run)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
