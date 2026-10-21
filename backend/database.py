import sqlite3
import os
import json
from datetime import datetime
from pathlib import Path
from config import DATABASE_PATH, ADMIN_EMAILS

def get_db_connection():
    """
    Establishes a connection to the SQLite database.
    Uses sqlite3.Row so we can access columns by name like a dictionary.
    """
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """
    Initializes the database on startup.
    Creates the 'users', 'login_logs', and 'places' tables if they do not exist.
    Migrates 'is_admin' column into 'users' table if missing.
    Seeds 'places' table once from places.json if empty.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Users table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP NULL,
        is_admin BOOLEAN DEFAULT 0
    );
    """)

    # Check if 'is_admin' exists (in case table was previously created without it)
    cursor.execute("PRAGMA table_info(users);")
    user_columns = [col[1] for col in cursor.fetchall()]
    if "is_admin" not in user_columns:
        cursor.execute("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0;")

    # Sync existing users with ADMIN_EMAILS list
    for admin_email in ADMIN_EMAILS:
        cursor.execute("UPDATE users SET is_admin = 1 WHERE LOWER(email) = LOWER(?)", (admin_email,))

    # 2. Login logs table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS login_logs (
        log_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NULL,
        login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        success BOOLEAN NOT NULL,
        email_attempted TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(user_id)
    );
    """)

    # 3. Places table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS places (
        id TEXT PRIMARY KEY,
        name_en TEXT NOT NULL,
        name_ta TEXT,
        category TEXT NOT NULL,
        subtype TEXT,
        short_description TEXT,
        description TEXT,
        timings TEXT,
        entry_fee TEXT,
        best_season TEXT,
        lat REAL,
        lng REAL,
        image TEXT,
        gallery TEXT,
        tags TEXT,
        estimated_visit_hours REAL,
        zone TEXT,
        dress_code TEXT,
        photography_rules TEXT,
        how_to_reach TEXT,
        tips TEXT,
        nearby_places TEXT,
        verified BOOLEAN DEFAULT 1,
        created_by TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 4. Chat logs table (for admin auditing of user questions)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chat_logs (
        log_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        question TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id)
    );
    """)

    # 5. Plan narrations cache table (caches AI generated tips per user & plan hash)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS plan_narrations (
        user_id INTEGER,
        plan_hash TEXT NOT NULL,
        narration_json TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, plan_hash),
        FOREIGN KEY (user_id) REFERENCES users(user_id)
    );
    """)

    conn.commit()
    conn.close()

    # Seed places table from places.json if empty
    seed_places_from_json()
    print("Database initialized successfully: users, login_logs, & places tables are ready.")

def seed_places_from_json():
    """
    If the 'places' table is currently empty, seeds it from backend/data/places.json.
    After this, SQLite database is the single source of truth.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM places;")
    count = cursor.fetchone()[0]

    if count == 0:
        places_json_path = Path(__file__).parent / "data" / "places.json"
        if places_json_path.exists():
            with open(places_json_path, "r", encoding="utf-8") as f:
                raw_places = json.load(f)

            now_iso = datetime.utcnow().isoformat()
            for p in raw_places:
                cursor.execute("""
                    INSERT INTO places (
                        id, name_en, name_ta, category, subtype, short_description,
                        description, timings, entry_fee, best_season, lat, lng,
                        image, gallery, tags, estimated_visit_hours, zone,
                        dress_code, photography_rules, how_to_reach, tips,
                        nearby_places, verified, created_by, created_at
                    ) VALUES (
                        ?, ?, ?, ?, ?, ?,
                        ?, ?, ?, ?, ?, ?,
                        ?, ?, ?, ?, ?,
                        ?, ?, ?, ?,
                        ?, ?, ?, ?
                    )
                """, (
                    p.get("id"),
                    p.get("name_en", ""),
                    p.get("name_ta", ""),
                    p.get("category", ""),
                    p.get("subtype", p.get("category", "")),
                    p.get("short_description", ""),
                    p.get("description", ""),
                    p.get("timings", ""),
                    p.get("entry_fee", ""),
                    p.get("best_season", ""),
                    float(p.get("lat", 0.0)),
                    float(p.get("lng", 0.0)),
                    p.get("image", ""),
                    json.dumps(p.get("gallery", [])),
                    json.dumps(p.get("tags", [])),
                    float(p.get("estimated_visit_hours", 1.5)),
                    p.get("zone", "rameswaram_town"),
                    p.get("dress_code", ""),
                    p.get("photography_rules", ""),
                    p.get("how_to_reach", ""),
                    json.dumps(p.get("tips", [])),
                    json.dumps(p.get("nearby_places", [])),
                    1 if p.get("verified", True) else 0,
                    "system",
                    now_iso
                ))
            conn.commit()
            print(f"Seeded {len(raw_places)} places from places.json into SQLite.")
        else:
            print("places.json not found for initial seeding.")
    conn.close()

def format_place_row(row):
    """
    Transforms an SQLite Row object for a place into a cleanly typed dictionary
    matching the existing places.json schema.
    """
    if not row:
        return None
    d = dict(row)
    
    # Parse JSON fields safely
    for json_col in ["gallery", "tags", "tips", "nearby_places"]:
        val = d.get(json_col)
        if isinstance(val, str):
            try:
                d[json_col] = json.loads(val)
            except Exception:
                d[json_col] = []
        elif val is None:
            d[json_col] = []

    # Ensure correct data types
    d["lat"] = float(d["lat"]) if d.get("lat") is not None else 0.0
    d["lng"] = float(d["lng"]) if d.get("lng") is not None else 0.0
    d["estimated_visit_hours"] = float(d["estimated_visit_hours"]) if d.get("estimated_visit_hours") is not None else 1.5
    d["verified"] = bool(d.get("verified", False))
    return d

def get_all_places_db(category: str = None, subtype: str = None):
    """
    Retrieves all places from SQLite with optional filtering.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    query = "SELECT * FROM places"
    params = []
    conditions = []

    if category and category.strip().lower() != "all":
        conditions.append("LOWER(category) = LOWER(?)")
        params.append(category.strip())

    if subtype and subtype.strip().lower() != "all":
        sub_clean = subtype.strip().lower()
        if sub_clean in ("mosque_dargah", "morque_dargah"):
            conditions.append("(LOWER(subtype) = 'mosque_dargah' OR LOWER(subtype) = 'morque_dargah')")
        else:
            conditions.append("LOWER(subtype) = LOWER(?)")
            params.append(sub_clean)

    if conditions:
        query += " WHERE " + " AND ".join(conditions)

    query += " ORDER BY name_en ASC"
    cursor.execute(query, tuple(params))
    rows = cursor.fetchall()
    conn.close()
    return [format_place_row(r) for r in rows]

def get_place_by_id_db(place_id: str):
    """
    Retrieves a single place by its unique slug ID.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM places WHERE LOWER(id) = LOWER(?)", (place_id.strip(),))
    row = cursor.fetchone()
    conn.close()
    return format_place_row(row) if row else None

def place_slug_exists(slug: str) -> bool:
    """Checks if a place with given slug already exists."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT 1 FROM places WHERE LOWER(id) = LOWER(?)", (slug.strip(),))
    exists = cursor.fetchone() is not None
    conn.close()
    return exists

def create_place_db(place_data: dict):
    """
    Inserts a newly created place into the places table.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO places (
            id, name_en, name_ta, category, subtype, short_description,
            description, timings, entry_fee, best_season, lat, lng,
            image, gallery, tags, estimated_visit_hours, zone,
            dress_code, photography_rules, how_to_reach, tips,
            nearby_places, verified, created_by, created_at
        ) VALUES (
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?
        )
    """, (
        place_data["id"],
        place_data["name_en"],
        place_data.get("name_ta", ""),
        place_data["category"],
        place_data.get("subtype", place_data["category"]),
        place_data.get("short_description", ""),
        place_data.get("description", ""),
        place_data.get("timings", ""),
        place_data.get("entry_fee", "Free"),
        place_data.get("best_season", "All year"),
        place_data["lat"],
        place_data["lng"],
        place_data.get("image", ""),
        json.dumps(place_data.get("gallery", [])),
        json.dumps(place_data.get("tags", [])),
        place_data.get("estimated_visit_hours", 1.5),
        place_data.get("zone", "rameswaram_town"),
        place_data.get("dress_code", ""),
        place_data.get("photography_rules", ""),
        place_data.get("how_to_reach", ""),
        json.dumps(place_data.get("tips", [])),
        json.dumps(place_data.get("nearby_places", [])),
        1 if place_data.get("verified", True) else 0,
        place_data.get("created_by", "admin"),
        place_data.get("created_at", datetime.utcnow().isoformat())
    ))
    conn.commit()
    conn.close()
    return get_place_by_id_db(place_data["id"])

def update_place_db(place_id: str, place_data: dict):
    """
    Updates an existing place in SQLite.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE places SET
            name_en = ?,
            name_ta = ?,
            category = ?,
            subtype = ?,
            short_description = ?,
            description = ?,
            timings = ?,
            entry_fee = ?,
            best_season = ?,
            lat = ?,
            lng = ?,
            image = ?,
            gallery = ?,
            tags = ?,
            estimated_visit_hours = ?,
            zone = ?,
            dress_code = ?,
            photography_rules = ?,
            how_to_reach = ?,
            tips = ?,
            nearby_places = ?,
            verified = ?
        WHERE LOWER(id) = LOWER(?)
    """, (
        place_data["name_en"],
        place_data.get("name_ta", ""),
        place_data["category"],
        place_data.get("subtype", place_data["category"]),
        place_data.get("short_description", ""),
        place_data.get("description", ""),
        place_data.get("timings", ""),
        place_data.get("entry_fee", "Free"),
        place_data.get("best_season", "All year"),
        place_data["lat"],
        place_data["lng"],
        place_data.get("image", ""),
        json.dumps(place_data.get("gallery", [])),
        json.dumps(place_data.get("tags", [])),
        place_data.get("estimated_visit_hours", 1.5),
        place_data.get("zone", "rameswaram_town"),
        place_data.get("dress_code", ""),
        place_data.get("photography_rules", ""),
        place_data.get("how_to_reach", ""),
        json.dumps(place_data.get("tips", [])),
        json.dumps(place_data.get("nearby_places", [])),
        1 if place_data.get("verified", True) else 0,
        place_id.strip()
    ))
    conn.commit()
    conn.close()
    return get_place_by_id_db(place_id)

def delete_place_db(place_id: str) -> bool:
    """
    Deletes a place from SQLite by ID. Returns True if deleted, False if not found.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM places WHERE LOWER(id) = LOWER(?)", (place_id.strip(),))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted

def get_user_by_username(username: str):
    """Check if a user exists with the given username (case-insensitive)."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE LOWER(username) = LOWER(?)", (username,))
    user = cursor.fetchone()
    conn.close()
    return user

def get_user_by_email(email: str):
    """Check if a user exists with the given email (case-insensitive)."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", (email,))
    user = cursor.fetchone()
    conn.close()
    return user

def get_user_by_id(user_id: int):
    """Retrieve user details by user_id."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT user_id, username, email, created_at, last_login, is_admin FROM users WHERE user_id = ?", (user_id,))
    user = cursor.fetchone()
    conn.close()
    return user

def create_user(username: str, email: str, password_hash: str):
    """Insert a new user record into the users table. Assigns admin privilege if email is in ADMIN_EMAILS."""
    is_admin = 1 if email.lower() in ADMIN_EMAILS else 0
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO users (username, email, password_hash, is_admin)
        VALUES (?, ?, ?, ?)
    """, (username, email.lower(), password_hash, is_admin))
    user_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return user_id

def update_last_login(user_id: int):
    """Updates the last_login timestamp for a user, syncing is_admin if needed."""
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("SELECT email FROM users WHERE user_id = ?", (user_id,))
    row = cursor.fetchone()
    if row and row["email"].lower() in ADMIN_EMAILS:
        cursor.execute("UPDATE users SET last_login = ?, is_admin = 1 WHERE user_id = ?", (now_str, user_id))
    else:
        cursor.execute("UPDATE users SET last_login = ? WHERE user_id = ?", (now_str, user_id))
    conn.commit()
    conn.close()

def record_login_log(email_attempted: str, success: bool, user_id: int = None):
    """
    Records an entry in login_logs table for auditing and security monitoring.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO login_logs (user_id, success, email_attempted)
        VALUES (?, ?, ?)
    """, (user_id, 1 if success else 0, email_attempted.lower()))
    conn.commit()
    conn.close()

def log_chat_question(user_id: int, question: str):
    """
    Records a user's question in chat_logs table for admin analysis and auditing.
    Does not store AI replies. Never logs sensitive keys.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO chat_logs (user_id, question)
            VALUES (?, ?)
        """, (user_id, question))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Error logging chat question: {e}")

def get_cached_plan_narration(user_id: int, plan_hash: str):
    """
    Retrieves cached AI plan narration if it exists for this user and plan hash.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT narration_json FROM plan_narrations WHERE user_id = ? AND plan_hash = ?",
        (user_id, plan_hash)
    )
    row = cursor.fetchone()
    conn.close()
    if row:
        try:
            return json.loads(row["narration_json"])
        except Exception:
            return None
    return None

def save_plan_narration(user_id: int, plan_hash: str, narration_data: dict):
    """
    Saves or updates AI plan narration in SQLite cache.
    """
    try:
        narration_json = json.dumps(narration_data)
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO plan_narrations (user_id, plan_hash, narration_json)
            VALUES (?, ?, ?)
            ON CONFLICT(user_id, plan_hash) DO UPDATE SET
                narration_json = excluded.narration_json,
                created_at = CURRENT_TIMESTAMP
        """, (user_id, plan_hash, narration_json))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Error caching plan narration: {e}")


