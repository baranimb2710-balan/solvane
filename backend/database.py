"""
Solvane Database Module (SQLAlchemy 2.0)
Supports both SQLite (local development) and PostgreSQL (Supabase / Production).
Reads DATABASE_URL from environment; falls back safely to local solvane.db.
Never logs connection strings, passwords, or credentials.
"""

import os
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List, Tuple, Dict, Any

from sqlalchemy import (
    create_engine,
    event,
    Column,
    Integer,
    String,
    Text,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    func,
    Index,
    JSON,
    select,
    update,
    delete,
    desc,
    asc,
    or_,
    and_,
    text
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship, Session
from config import DATABASE_URL, DATABASE_PATH, ADMIN_EMAILS

# -------------------------------------------------------------
# ENGINE & SESSION SETUP
# -------------------------------------------------------------
is_sqlite = DATABASE_URL.startswith("sqlite")

engine_kwargs = {}
if is_sqlite:
    # check_same_thread: False allows FastAPI threads to access the SQLite connection
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    # Production PostgreSQL connection pooling settings
    engine_kwargs["pool_pre_ping"] = True
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20

engine = create_engine(DATABASE_URL, **engine_kwargs)

# For SQLite: Enable foreign key constraints enforcement via PRAGMA
if is_sqlite:
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# -------------------------------------------------------------
# DECLARATIVE ORM MODELS
# -------------------------------------------------------------

class User(Base):
    """Users table for authentication and admin privileges."""
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    last_login = Column(DateTime, nullable=True)
    is_admin = Column(Boolean, default=False, nullable=False)

    # Relationships
    login_logs = relationship("LoginLog", back_populates="user", cascade="all, delete-orphan")
    chat_logs = relationship("ChatLog", back_populates="user", cascade="all, delete-orphan")
    saved_plans = relationship("SavedPlan", back_populates="user", cascade="all, delete-orphan")


class LoginLog(Base):
    """Audit log for user login attempts (success and failure)."""
    __tablename__ = "login_logs"

    log_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=True, index=True)
    login_time = Column(DateTime, server_default=func.now())
    success = Column(Boolean, nullable=False)
    email_attempted = Column(String(120), nullable=False, index=True)

    user = relationship("User", back_populates="login_logs")


class ChatLog(Base):
    """Audit log for user questions submitted to the AI guide."""
    __tablename__ = "chat_logs"

    log_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=True, index=True)
    question = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="chat_logs")


class Place(Base):
    """Famous tourist places and attractions in Ramanathapuram district."""
    __tablename__ = "places"

    id = Column(String(100), primary_key=True)
    name_en = Column(String(200), nullable=False)
    name_ta = Column(String(200), nullable=True)
    category = Column(String(50), nullable=False, index=True)
    subtype = Column(String(50), nullable=True)
    short_description = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    timings = Column(String(150), nullable=True)
    entry_fee = Column(String(100), nullable=True)
    best_season = Column(String(100), nullable=True)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    image = Column(String(255), nullable=True)
    gallery = Column(JSON, nullable=True)
    tags = Column(JSON, nullable=True)
    estimated_visit_hours = Column(Float, default=1.5)
    zone = Column(String(50), default="rameswaram_town")
    dress_code = Column(String(255), nullable=True)
    photography_rules = Column(String(255), nullable=True)
    how_to_reach = Column(Text, nullable=True)
    tips = Column(JSON, nullable=True)
    nearby_places = Column(JSON, nullable=True)
    verified = Column(Boolean, default=True)
    created_by = Column(String(50), default="system")
    created_at = Column(DateTime, server_default=func.now())


class PlanNarration(Base):
    """Cache table for AI-generated trip narrations keyed by user and plan hash."""
    __tablename__ = "plan_narrations"

    user_id = Column(Integer, ForeignKey("users.user_id"), primary_key=True)
    plan_hash = Column(String(64), primary_key=True)
    narration_json = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())


class SavedPlan(Base):
    """User-saved trip itineraries and AI narrations."""
    __tablename__ = "saved_plans"

    plan_id = Column(String(100), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    trip_json = Column(Text, nullable=False)
    plan_json = Column(Text, nullable=False)
    narration_json = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), index=True)

    user = relationship("User", back_populates="saved_plans")


class Hotel(Base):
    """Verified accommodations and stays near Rameswaram and Ramanathapuram."""
    __tablename__ = "hotels"

    id = Column(String(100), primary_key=True)
    name = Column(String(200), nullable=False)
    name_ta = Column(String(200), nullable=True)
    destination_id = Column(String(50), default="ramanathapuram", nullable=True)
    area = Column(String(200), nullable=True)
    category = Column(String(50), nullable=True, index=True)
    price_range_per_night = Column(String(100), nullable=True)
    rating = Column(Float, nullable=True)
    amenities = Column(JSON, nullable=True)
    contact = Column(String(100), nullable=True)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    nearby_place_ids = Column(JSON, nullable=True)
    image = Column(String(255), nullable=True)
    map_link = Column(String(255), nullable=True)
    verified = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())


class Food(Base):
    """Eateries, restaurants, and local culinary establishments."""
    __tablename__ = "food"

    id = Column(String(100), primary_key=True)
    name = Column(String(200), nullable=False)
    name_ta = Column(String(200), nullable=True)
    destination_id = Column(String(50), default="ramanathapuram", nullable=True)
    area = Column(String(200), nullable=True)
    type = Column(String(50), nullable=True, index=True)
    famous_for = Column(JSON, nullable=True)
    price_range = Column(String(100), nullable=True)
    timings = Column(String(150), nullable=True)
    veg_or_nonveg = Column(String(20), nullable=True)
    rating = Column(Float, nullable=True)
    contact = Column(String(100), nullable=True)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    nearby_place_ids = Column(JSON, nullable=True)
    image = Column(String(255), nullable=True)
    map_link = Column(String(255), nullable=True)
    verified = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())


# -------------------------------------------------------------
# HELPER PARSERS & FORMATTERS
# -------------------------------------------------------------

def ensure_json_list(val: Any) -> list:
    """Ensures a field is returned as a native Python list."""
    if val is None:
        return []
    if isinstance(val, list):
        return val
    if isinstance(val, str):
        try:
            parsed = json.loads(val)
            return parsed if isinstance(parsed, list) else [parsed]
        except Exception:
            return []
    return []


def format_iso_datetime(dt: Any) -> Optional[str]:
    """Formats datetime object to standard ISO 8601 string or returns string as-is."""
    if dt is None:
        return None
    if isinstance(dt, datetime):
        return dt.isoformat()
    return str(dt)


def format_place_model(p: Place) -> Optional[dict]:
    """Transforms a Place ORM model into a cleanly typed dictionary."""
    if not p:
        return None
    return {
        "id": p.id,
        "name_en": p.name_en or "",
        "name_ta": p.name_ta or "",
        "category": p.category or "",
        "subtype": p.subtype or p.category or "",
        "short_description": p.short_description or "",
        "description": p.description or "",
        "timings": p.timings or "",
        "entry_fee": p.entry_fee or "",
        "best_season": p.best_season or "",
        "lat": float(p.lat) if p.lat is not None else 0.0,
        "lng": float(p.lng) if p.lng is not None else 0.0,
        "image": p.image or "",
        "gallery": ensure_json_list(p.gallery),
        "tags": ensure_json_list(p.tags),
        "estimated_visit_hours": float(p.estimated_visit_hours) if p.estimated_visit_hours is not None else 1.5,
        "zone": p.zone or "rameswaram_town",
        "dress_code": p.dress_code or "",
        "photography_rules": p.photography_rules or "",
        "how_to_reach": p.how_to_reach or "",
        "tips": ensure_json_list(p.tips),
        "nearby_places": ensure_json_list(p.nearby_places),
        "verified": bool(p.verified),
        "created_by": p.created_by or "system",
        "created_at": format_iso_datetime(p.created_at)
    }


def format_hotel_model(h: Hotel) -> Optional[dict]:
    """Transforms a Hotel ORM model into a cleanly typed dictionary."""
    if not h:
        return None
    return {
        "id": h.id,
        "name": h.name,
        "name_ta": h.name_ta or "",
        "destination_id": h.destination_id or "ramanathapuram",
        "area": h.area or "",
        "category": h.category or "",
        "price_range_per_night": h.price_range_per_night or "",
        "rating": float(h.rating) if h.rating is not None else 4.0,
        "amenities": ensure_json_list(h.amenities),
        "contact": h.contact or "",
        "lat": float(h.lat) if h.lat is not None else 0.0,
        "lng": float(h.lng) if h.lng is not None else 0.0,
        "nearby_place_ids": ensure_json_list(h.nearby_place_ids),
        "image": h.image or "",
        "map_link": h.map_link or "",
        "verified": bool(h.verified),
        "created_at": format_iso_datetime(h.created_at) if hasattr(h, "created_at") else None
    }


def format_food_model(f: Food) -> Optional[dict]:
    """Transforms a Food ORM model into a cleanly typed dictionary."""
    if not f:
        return None
    return {
        "id": f.id,
        "name": f.name,
        "name_ta": f.name_ta or "",
        "destination_id": f.destination_id or "ramanathapuram",
        "area": f.area or "",
        "type": f.type or "",
        "famous_for": ensure_json_list(f.famous_for),
        "price_range": f.price_range or "",
        "timings": f.timings or "",
        "veg_or_nonveg": f.veg_or_nonveg or "both",
        "rating": float(f.rating) if f.rating is not None else 4.0,
        "contact": f.contact or "",
        "lat": float(f.lat) if f.lat is not None else 0.0,
        "lng": float(f.lng) if f.lng is not None else 0.0,
        "nearby_place_ids": ensure_json_list(f.nearby_place_ids),
        "image": f.image or "",
        "map_link": f.map_link or "",
        "verified": bool(f.verified),
        "created_at": format_iso_datetime(f.created_at) if hasattr(f, "created_at") else None
    }


def format_user_model(u: User) -> Optional[dict]:
    """Transforms a User ORM model into a user dict."""
    if not u:
        return None
    return {
        "user_id": u.user_id,
        "username": u.username,
        "email": u.email,
        "password_hash": u.password_hash,
        "created_at": format_iso_datetime(u.created_at),
        "last_login": format_iso_datetime(u.last_login),
        "is_admin": bool(u.is_admin)
    }


# -------------------------------------------------------------
# STARTUP & SEEDING HELPERS
# -------------------------------------------------------------

def ensure_table_columns():
    """
    Ensures newly added columns exist in both PostgreSQL and SQLite.
    Safe, automatic, and idempotent.
    """
    try:
        with engine.connect() as conn:
            dialect = engine.dialect.name
            if dialect == "postgresql":
                queries = [
                    "ALTER TABLE hotels ADD COLUMN IF NOT EXISTS name_ta VARCHAR(200);",
                    "ALTER TABLE hotels ADD COLUMN IF NOT EXISTS destination_id VARCHAR(50) DEFAULT 'ramanathapuram';",
                    "ALTER TABLE hotels ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;",
                    "ALTER TABLE food ADD COLUMN IF NOT EXISTS name_ta VARCHAR(200);",
                    "ALTER TABLE food ADD COLUMN IF NOT EXISTS destination_id VARCHAR(50) DEFAULT 'ramanathapuram';",
                    "ALTER TABLE food ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;",
                ]
                for q in queries:
                    try:
                        conn.execute(text(q))
                        conn.commit()
                    except Exception as e:
                        print(f"Column check notice: {e}")
            elif dialect == "sqlite":
                for table, cols in [
                    ("hotels", [("name_ta", "TEXT"), ("destination_id", "TEXT DEFAULT 'ramanathapuram'"), ("created_at", "DATETIME DEFAULT CURRENT_TIMESTAMP")]),
                    ("food", [("name_ta", "TEXT"), ("destination_id", "TEXT DEFAULT 'ramanathapuram'"), ("created_at", "DATETIME DEFAULT CURRENT_TIMESTAMP")])
                ]:
                    try:
                        res = conn.execute(text(f"PRAGMA table_info({table})")).fetchall()
                        existing_cols = {r[1] for r in res}
                        for col_name, col_type in cols:
                            if col_name not in existing_cols:
                                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type}"))
                                conn.commit()
                    except Exception as e:
                        print(f"SQLite column check notice: {e}")
    except Exception as e:
        print(f"Schema check error: {e}")


def init_db():
    """
    Initializes database tables and syncs admin privileges.
    Works for both SQLite and PostgreSQL without raw sqlite3 commands.
    Never prints connection strings or passwords in logs.
    """
    # Create all defined tables if they do not exist
    Base.metadata.create_all(bind=engine)
    # Ensure any new columns exist on already created tables
    ensure_table_columns()

    # Sync admin status for existing users matching ADMIN_EMAILS
    with SessionLocal() as session:
        for admin_email in ADMIN_EMAILS:
            session.execute(
                update(User)
                .where(func.lower(User.email) == admin_email.lower())
                .values(is_admin=True)
            )
        session.commit()

    # Seed places table from places.json if empty
    seed_places_from_json()
    # Seed hotels table from hotels.json if empty
    seed_hotels_from_json()
    # Seed food table from food.json if empty
    seed_food_from_json()

    dialect_name = engine.dialect.name
    print(f"Database initialized successfully ({dialect_name}): tables are ready.")


def seed_hotels_from_json():
    """
    If the 'hotels' table is currently empty, seeds it from backend/data/hotels.json.
    Safe, no duplicates, never overwrites existing rows.
    """
    with SessionLocal() as session:
        count = session.scalar(select(func.count(Hotel.id)))
        if count == 0:
            hotels_json_path = Path(__file__).parent / "data" / "hotels.json"
            if hotels_json_path.exists():
                with open(hotels_json_path, "r", encoding="utf-8") as f:
                    raw_hotels = json.load(f)

                for h in raw_hotels:
                    hotel_obj = Hotel(
                        id=h.get("id"),
                        name=h.get("name", ""),
                        name_ta=h.get("name_ta", ""),
                        destination_id=h.get("destination_id", "ramanathapuram"),
                        area=h.get("area", ""),
                        category=h.get("category", ""),
                        price_range_per_night=h.get("price_range_per_night", ""),
                        rating=float(h.get("rating", 4.0)),
                        amenities=h.get("amenities", []),
                        contact=h.get("contact", ""),
                        lat=float(h.get("lat", 0.0)),
                        lng=float(h.get("lng", 0.0)),
                        nearby_place_ids=h.get("nearby_place_ids", []),
                        image=h.get("image", ""),
                        map_link=h.get("map_link", ""),
                        verified=bool(h.get("verified", True))
                    )
                    session.add(hotel_obj)
                session.commit()
                print(f"Seeded {len(raw_hotels)} hotels from hotels.json into database.")
            else:
                print("hotels.json not found for initial seeding.")


def seed_food_from_json():
    """
    If the 'food' table is currently empty, seeds it from backend/data/food.json.
    Safe, no duplicates, never overwrites existing rows.
    """
    with SessionLocal() as session:
        count = session.scalar(select(func.count(Food.id)))
        if count == 0:
            food_json_path = Path(__file__).parent / "data" / "food.json"
            if food_json_path.exists():
                with open(food_json_path, "r", encoding="utf-8") as f:
                    raw_food = json.load(f)

                for f_item in raw_food:
                    food_obj = Food(
                        id=f_item.get("id"),
                        name=f_item.get("name", ""),
                        name_ta=f_item.get("name_ta", ""),
                        destination_id=f_item.get("destination_id", "ramanathapuram"),
                        area=f_item.get("area", ""),
                        type=f_item.get("type", ""),
                        famous_for=f_item.get("famous_for", []),
                        price_range=f_item.get("price_range", ""),
                        timings=f_item.get("timings", ""),
                        veg_or_nonveg=f_item.get("veg_or_nonveg", "both"),
                        rating=float(f_item.get("rating", 4.0)),
                        contact=f_item.get("contact", ""),
                        lat=float(f_item.get("lat", 0.0)),
                        lng=float(f_item.get("lng", 0.0)),
                        nearby_place_ids=f_item.get("nearby_place_ids", []),
                        image=f_item.get("image", ""),
                        map_link=f_item.get("map_link", ""),
                        verified=bool(f_item.get("verified", True))
                    )
                    session.add(food_obj)
                session.commit()
                print(f"Seeded {len(raw_food)} food establishments from food.json into database.")
            else:
                print("food.json not found for initial seeding.")


def seed_places_from_json():
    """
    If the 'places' table is currently empty, seeds it from backend/data/places.json.
    """
    with SessionLocal() as session:
        count = session.scalar(select(func.count(Place.id)))
        if count == 0:
            places_json_path = Path(__file__).parent / "data" / "places.json"
            if places_json_path.exists():
                with open(places_json_path, "r", encoding="utf-8") as f:
                    raw_places = json.load(f)

                for p in raw_places:
                    place_obj = Place(
                        id=p.get("id"),
                        name_en=p.get("name_en", ""),
                        name_ta=p.get("name_ta", ""),
                        category=p.get("category", ""),
                        subtype=p.get("subtype", p.get("category", "")),
                        short_description=p.get("short_description", ""),
                        description=p.get("description", ""),
                        timings=p.get("timings", ""),
                        entry_fee=p.get("entry_fee", ""),
                        best_season=p.get("best_season", ""),
                        lat=float(p.get("lat", 0.0)),
                        lng=float(p.get("lng", 0.0)),
                        image=p.get("image", ""),
                        gallery=p.get("gallery", []),
                        tags=p.get("tags", []),
                        estimated_visit_hours=float(p.get("estimated_visit_hours", 1.5)),
                        zone=p.get("zone", "rameswaram_town"),
                        dress_code=p.get("dress_code", ""),
                        photography_rules=p.get("photography_rules", ""),
                        how_to_reach=p.get("how_to_reach", ""),
                        tips=p.get("tips", []),
                        nearby_places=p.get("nearby_places", []),
                        verified=bool(p.get("verified", True)),
                        created_by="system"
                    )
                    session.add(place_obj)
                session.commit()
                print(f"Seeded {len(raw_places)} places from places.json into database.")
            else:
                print("places.json not found for initial seeding.")


# -------------------------------------------------------------
# PLACES CRUD (SQLAlchemy 2.0)
# -------------------------------------------------------------

def get_all_places_db(category: str = None, subtype: str = None) -> List[dict]:
    """Retrieves all places with optional category and subtype filtering."""
    with SessionLocal() as session:
        stmt = select(Place)

        if category and category.strip().lower() != "all":
            stmt = stmt.where(func.lower(Place.category) == category.strip().lower())

        if subtype and subtype.strip().lower() != "all":
            sub_clean = subtype.strip().lower()
            if sub_clean in ("mosque_dargah", "morque_dargah"):
                stmt = stmt.where(
                    or_(
                        func.lower(Place.subtype) == "mosque_dargah",
                        func.lower(Place.subtype) == "morque_dargah"
                    )
                )
            else:
                stmt = stmt.where(func.lower(Place.subtype) == sub_clean)

        stmt = stmt.order_by(asc(Place.name_en))
        results = session.scalars(stmt).all()
        return [format_place_model(p) for p in results]


def get_place_by_id_db(place_id: str) -> Optional[dict]:
    """Retrieves a single place by its unique slug ID."""
    if not place_id:
        return None
    with SessionLocal() as session:
        stmt = select(Place).where(func.lower(Place.id) == place_id.strip().lower())
        place = session.scalars(stmt).first()
        return format_place_model(place) if place else None


def place_slug_exists(slug: str) -> bool:
    """Checks if a place with given slug already exists."""
    if not slug:
        return False
    with SessionLocal() as session:
        stmt = select(Place.id).where(func.lower(Place.id) == slug.strip().lower())
        return session.scalars(stmt).first() is not None


def create_place_db(place_data: dict) -> Optional[dict]:
    """Inserts a newly created place into the places table."""
    with SessionLocal() as session:
        place = Place(
            id=place_data["id"],
            name_en=place_data["name_en"],
            name_ta=place_data.get("name_ta", ""),
            category=place_data["category"],
            subtype=place_data.get("subtype", place_data["category"]),
            short_description=place_data.get("short_description", ""),
            description=place_data.get("description", ""),
            timings=place_data.get("timings", ""),
            entry_fee=place_data.get("entry_fee", "Free"),
            best_season=place_data.get("best_season", "All year"),
            lat=float(place_data["lat"]),
            lng=float(place_data["lng"]),
            image=place_data.get("image", ""),
            gallery=ensure_json_list(place_data.get("gallery", [])),
            tags=ensure_json_list(place_data.get("tags", [])),
            estimated_visit_hours=float(place_data.get("estimated_visit_hours", 1.5)),
            zone=place_data.get("zone", "rameswaram_town"),
            dress_code=place_data.get("dress_code", ""),
            photography_rules=place_data.get("photography_rules", ""),
            how_to_reach=place_data.get("how_to_reach", ""),
            tips=ensure_json_list(place_data.get("tips", [])),
            nearby_places=ensure_json_list(place_data.get("nearby_places", [])),
            verified=bool(place_data.get("verified", True)),
            created_by=place_data.get("created_by", "admin")
        )
        session.add(place)
        session.commit()
        session.refresh(place)
        return format_place_model(place)


def update_place_db(place_id: str, place_data: dict) -> Optional[dict]:
    """Updates an existing place in database."""
    with SessionLocal() as session:
        stmt = select(Place).where(func.lower(Place.id) == place_id.strip().lower())
        place = session.scalars(stmt).first()
        if not place:
            return None

        place.name_en = place_data["name_en"]
        place.name_ta = place_data.get("name_ta", "")
        place.category = place_data["category"]
        place.subtype = place_data.get("subtype", place_data["category"])
        place.short_description = place_data.get("short_description", "")
        place.description = place_data.get("description", "")
        place.timings = place_data.get("timings", "")
        place.entry_fee = place_data.get("entry_fee", "Free")
        place.best_season = place_data.get("best_season", "All year")
        place.lat = float(place_data["lat"])
        place.lng = float(place_data["lng"])
        place.image = place_data.get("image", "")
        place.gallery = ensure_json_list(place_data.get("gallery", []))
        place.tags = ensure_json_list(place_data.get("tags", []))
        place.estimated_visit_hours = float(place_data.get("estimated_visit_hours", 1.5))
        place.zone = place_data.get("zone", "rameswaram_town")
        place.dress_code = place_data.get("dress_code", "")
        place.photography_rules = place_data.get("photography_rules", "")
        place.how_to_reach = place_data.get("how_to_reach", "")
        place.tips = ensure_json_list(place_data.get("tips", []))
        place.nearby_places = ensure_json_list(place_data.get("nearby_places", []))
        place.verified = bool(place_data.get("verified", True))

        session.commit()
        session.refresh(place)
        return format_place_model(place)


def delete_place_db(place_id: str) -> bool:
    """Deletes a place from database by ID. Returns True if deleted, False if not found."""
    with SessionLocal() as session:
        stmt = delete(Place).where(func.lower(Place.id) == place_id.strip().lower())
        res = session.execute(stmt)
        session.commit()
        return res.rowcount > 0


# -------------------------------------------------------------
# HOTELS CRUD (SQLAlchemy 2.0)
# -------------------------------------------------------------

def get_all_hotels_db(category: Optional[str] = None) -> List[dict]:
    """Retrieves all hotels with optional category filtering."""
    with SessionLocal() as session:
        stmt = select(Hotel)
        if category and category.strip().lower() != "all":
            stmt = stmt.where(func.lower(Hotel.category) == category.strip().lower())
        stmt = stmt.order_by(asc(Hotel.name))
        results = session.scalars(stmt).all()
        return [format_hotel_model(h) for h in results]


def get_hotel_by_id_db(hotel_id: str) -> Optional[dict]:
    """Retrieves a single hotel by its unique slug ID."""
    if not hotel_id:
        return None
    with SessionLocal() as session:
        stmt = select(Hotel).where(func.lower(Hotel.id) == hotel_id.strip().lower())
        hotel = session.scalars(stmt).first()
        return format_hotel_model(hotel) if hotel else None


def hotel_slug_exists(slug: str) -> bool:
    """Checks if a hotel with given slug already exists."""
    if not slug:
        return False
    with SessionLocal() as session:
        stmt = select(Hotel.id).where(func.lower(Hotel.id) == slug.strip().lower())
        return session.scalars(stmt).first() is not None


def create_hotel_db(hotel_data: dict) -> Optional[dict]:
    """Inserts a newly created hotel into the hotels table."""
    with SessionLocal() as session:
        hotel = Hotel(
            id=hotel_data["id"],
            name=hotel_data["name"],
            name_ta=hotel_data.get("name_ta", ""),
            destination_id=hotel_data.get("destination_id", "ramanathapuram"),
            area=hotel_data.get("area", ""),
            category=hotel_data.get("category", "mid_range"),
            price_range_per_night=hotel_data.get("price_range_per_night", ""),
            rating=float(hotel_data.get("rating", 4.0)),
            amenities=ensure_json_list(hotel_data.get("amenities", [])),
            contact=hotel_data.get("contact", ""),
            lat=float(hotel_data["lat"]) if hotel_data.get("lat") is not None else 0.0,
            lng=float(hotel_data["lng"]) if hotel_data.get("lng") is not None else 0.0,
            nearby_place_ids=ensure_json_list(hotel_data.get("nearby_place_ids", [])),
            image=hotel_data.get("image", ""),
            map_link=hotel_data.get("map_link", ""),
            verified=bool(hotel_data.get("verified", True))
        )
        session.add(hotel)
        session.commit()
        session.refresh(hotel)
        return format_hotel_model(hotel)


def update_hotel_db(hotel_id: str, hotel_data: dict) -> Optional[dict]:
    """Updates an existing hotel in database."""
    with SessionLocal() as session:
        stmt = select(Hotel).where(func.lower(Hotel.id) == hotel_id.strip().lower())
        hotel = session.scalars(stmt).first()
        if not hotel:
            return None

        hotel.name = hotel_data["name"]
        if "name_ta" in hotel_data:
            hotel.name_ta = hotel_data.get("name_ta", "")
        if "destination_id" in hotel_data:
            hotel.destination_id = hotel_data.get("destination_id", "ramanathapuram")
        hotel.area = hotel_data.get("area", "")
        hotel.category = hotel_data.get("category", "mid_range")
        hotel.price_range_per_night = hotel_data.get("price_range_per_night", "")
        if hotel_data.get("rating") is not None:
            hotel.rating = float(hotel_data["rating"])
        if "amenities" in hotel_data:
            hotel.amenities = ensure_json_list(hotel_data["amenities"])
        hotel.contact = hotel_data.get("contact", "")
        if hotel_data.get("lat") is not None:
            hotel.lat = float(hotel_data["lat"])
        if hotel_data.get("lng") is not None:
            hotel.lng = float(hotel_data["lng"])
        if "nearby_place_ids" in hotel_data:
            hotel.nearby_place_ids = ensure_json_list(hotel_data["nearby_place_ids"])
        if "image" in hotel_data:
            hotel.image = hotel_data["image"]
        hotel.map_link = hotel_data.get("map_link", "")
        if "verified" in hotel_data:
            hotel.verified = bool(hotel_data["verified"])

        session.commit()
        session.refresh(hotel)
        return format_hotel_model(hotel)


def delete_hotel_db(hotel_id: str) -> bool:
    """Deletes a hotel from database by ID. Returns True if deleted, False if not found."""
    with SessionLocal() as session:
        stmt = delete(Hotel).where(func.lower(Hotel.id) == hotel_id.strip().lower())
        res = session.execute(stmt)
        session.commit()
        return res.rowcount > 0


# -------------------------------------------------------------
# FOOD CRUD (SQLAlchemy 2.0)
# -------------------------------------------------------------

def get_all_food_db(type: Optional[str] = None) -> List[dict]:
    """Retrieves all food spots with optional type filtering."""
    with SessionLocal() as session:
        stmt = select(Food)
        if type and type.strip().lower() != "all":
            stmt = stmt.where(func.lower(Food.type) == type.strip().lower())
        stmt = stmt.order_by(asc(Food.name))
        results = session.scalars(stmt).all()
        return [format_food_model(f) for f in results]


def get_food_by_id_db(food_id: str) -> Optional[dict]:
    """Retrieves a single food spot by its unique slug ID."""
    if not food_id:
        return None
    with SessionLocal() as session:
        stmt = select(Food).where(func.lower(Food.id) == food_id.strip().lower())
        food = session.scalars(stmt).first()
        return format_food_model(food) if food else None


def food_slug_exists(slug: str) -> bool:
    """Checks if a food spot with given slug already exists."""
    if not slug:
        return False
    with SessionLocal() as session:
        stmt = select(Food.id).where(func.lower(Food.id) == slug.strip().lower())
        return session.scalars(stmt).first() is not None


def create_food_db(food_data: dict) -> Optional[dict]:
    """Inserts a newly created food spot into the food table."""
    with SessionLocal() as session:
        food = Food(
            id=food_data["id"],
            name=food_data["name"],
            name_ta=food_data.get("name_ta", ""),
            destination_id=food_data.get("destination_id", "ramanathapuram"),
            area=food_data.get("area", ""),
            type=food_data.get("type", "tiffin"),
            famous_for=ensure_json_list(food_data.get("famous_for", [])),
            price_range=food_data.get("price_range", ""),
            timings=food_data.get("timings", ""),
            veg_or_nonveg=food_data.get("veg_or_nonveg", "both"),
            rating=float(food_data.get("rating", 4.0)),
            contact=food_data.get("contact", ""),
            lat=float(food_data["lat"]) if food_data.get("lat") is not None else 0.0,
            lng=float(food_data["lng"]) if food_data.get("lng") is not None else 0.0,
            nearby_place_ids=ensure_json_list(food_data.get("nearby_place_ids", [])),
            image=food_data.get("image", ""),
            map_link=food_data.get("map_link", ""),
            verified=bool(food_data.get("verified", True))
        )
        session.add(food)
        session.commit()
        session.refresh(food)
        return format_food_model(food)


def update_food_db(food_id: str, food_data: dict) -> Optional[dict]:
    """Updates an existing food spot in database."""
    with SessionLocal() as session:
        stmt = select(Food).where(func.lower(Food.id) == food_id.strip().lower())
        food = session.scalars(stmt).first()
        if not food:
            return None

        food.name = food_data["name"]
        if "name_ta" in food_data:
            food.name_ta = food_data.get("name_ta", "")
        if "destination_id" in food_data:
            food.destination_id = food_data.get("destination_id", "ramanathapuram")
        food.area = food_data.get("area", "")
        food.type = food_data.get("type", "tiffin")
        if "famous_for" in food_data:
            food.famous_for = ensure_json_list(food_data["famous_for"])
        food.price_range = food_data.get("price_range", "")
        food.timings = food_data.get("timings", "")
        food.veg_or_nonveg = food_data.get("veg_or_nonveg", "both")
        if food_data.get("rating") is not None:
            food.rating = float(food_data["rating"])
        food.contact = food_data.get("contact", "")
        if food_data.get("lat") is not None:
            food.lat = float(food_data["lat"])
        if food_data.get("lng") is not None:
            food.lng = float(food_data["lng"])
        if "nearby_place_ids" in food_data:
            food.nearby_place_ids = ensure_json_list(food_data["nearby_place_ids"])
        if "image" in food_data:
            food.image = food_data["image"]
        food.map_link = food_data.get("map_link", "")
        if "verified" in food_data:
            food.verified = bool(food_data["verified"])

        session.commit()
        session.refresh(food)
        return format_food_model(food)


def delete_food_db(food_id: str) -> bool:
    """Deletes a food spot from database by ID. Returns True if deleted, False if not found."""
    with SessionLocal() as session:
        stmt = delete(Food).where(func.lower(Food.id) == food_id.strip().lower())
        res = session.execute(stmt)
        session.commit()
        return res.rowcount > 0


# -------------------------------------------------------------
# USER AUTHENTICATION & PROFILE HELPERS
# -------------------------------------------------------------

def get_user_by_username(username: str) -> Optional[dict]:
    """Check if a user exists with the given username (case-insensitive)."""
    if not username:
        return None
    with SessionLocal() as session:
        stmt = select(User).where(func.lower(User.username) == username.strip().lower())
        user = session.scalars(stmt).first()
        return format_user_model(user)


def get_user_by_email(email: str) -> Optional[dict]:
    """Check if a user exists with the given email (case-insensitive)."""
    if not email:
        return None
    with SessionLocal() as session:
        stmt = select(User).where(func.lower(User.email) == email.strip().lower())
        user = session.scalars(stmt).first()
        return format_user_model(user)


def get_user_by_id(user_id: int) -> Optional[dict]:
    """Retrieve user details by user_id."""
    if not user_id:
        return None
    with SessionLocal() as session:
        stmt = select(User).where(User.user_id == int(user_id))
        user = session.scalars(stmt).first()
        return format_user_model(user)


def create_user(username: str, email: str, password_hash: str) -> int:
    """Insert a new user record. Assigns admin privilege if email is in ADMIN_EMAILS."""
    clean_email = email.strip().lower()
    is_admin = clean_email in ADMIN_EMAILS

    with SessionLocal() as session:
        new_user = User(
            username=username.strip(),
            email=clean_email,
            password_hash=password_hash,
            is_admin=is_admin
        )
        session.add(new_user)
        session.commit()
        session.refresh(new_user)
        return new_user.user_id


def update_last_login(user_id: int):
    """Updates the last_login timestamp for a user, syncing is_admin if needed."""
    with SessionLocal() as session:
        stmt = select(User).where(User.user_id == int(user_id))
        user = session.scalars(stmt).first()
        if user:
            user.last_login = datetime.utcnow()
            if user.email.lower() in ADMIN_EMAILS:
                user.is_admin = True
            session.commit()


def record_login_log(email_attempted: str, success: bool, user_id: int = None):
    """Records an entry in login_logs table for auditing and security monitoring."""
    with SessionLocal() as session:
        log = LoginLog(
            user_id=user_id,
            success=bool(success),
            email_attempted=(email_attempted or "").strip().lower()
        )
        session.add(log)
        session.commit()


def log_chat_question(user_id: int, question: str):
    """Records a user's question in chat_logs table for auditing."""
    try:
        with SessionLocal() as session:
            chat_log = ChatLog(
                user_id=user_id,
                question=question.strip()
            )
            session.add(chat_log)
            session.commit()
    except Exception as e:
        print(f"Error logging chat question: {e}")


# -------------------------------------------------------------
# PLAN NARRATION CACHE HELPERS
# -------------------------------------------------------------

def get_cached_plan_narration(user_id: int, plan_hash: str) -> Optional[dict]:
    """Retrieves cached AI plan narration if it exists for this user and plan hash."""
    with SessionLocal() as session:
        stmt = select(PlanNarration.narration_json).where(
            PlanNarration.user_id == int(user_id),
            PlanNarration.plan_hash == plan_hash.strip()
        )
        raw_json = session.scalars(stmt).first()
        if raw_json:
            try:
                return json.loads(raw_json)
            except Exception:
                return None
        return None


def save_plan_narration(user_id: int, plan_hash: str, narration_data: dict):
    """Saves or updates AI plan narration in cache."""
    try:
        narration_text = json.dumps(narration_data)
        with SessionLocal() as session:
            stmt = select(PlanNarration).where(
                PlanNarration.user_id == int(user_id),
                PlanNarration.plan_hash == plan_hash.strip()
            )
            existing = session.scalars(stmt).first()
            if existing:
                existing.narration_json = narration_text
                existing.created_at = datetime.utcnow()
            else:
                new_narration = PlanNarration(
                    user_id=int(user_id),
                    plan_hash=plan_hash.strip(),
                    narration_json=narration_text
                )
                session.add(new_narration)
            session.commit()
    except Exception as e:
        print(f"Error caching plan narration: {e}")


# -------------------------------------------------------------
# SAVED PLANS HELPERS
# -------------------------------------------------------------

def count_user_saved_plans(user_id: int) -> int:
    """Returns the total number of plans saved by a specific user."""
    with SessionLocal() as session:
        stmt = select(func.count(SavedPlan.plan_id)).where(SavedPlan.user_id == int(user_id))
        return session.scalar(stmt) or 0


def save_user_plan(plan_id: str, user_id: int, title: str, trip: dict, plan: dict, narration: Optional[dict] = None) -> bool:
    """Inserts a new saved plan record for the user."""
    with SessionLocal() as session:
        saved = SavedPlan(
            plan_id=plan_id,
            user_id=int(user_id),
            title=title.strip(),
            trip_json=json.dumps(trip or {}),
            plan_json=json.dumps(plan or {}),
            narration_json=json.dumps(narration) if narration else None
        )
        session.add(saved)
        session.commit()
        return True


def get_user_saved_plans(user_id: int) -> list:
    """Returns all plans saved by the user, sorted newest first."""
    with SessionLocal() as session:
        stmt = (
            select(SavedPlan)
            .where(SavedPlan.user_id == int(user_id))
            .order_by(desc(SavedPlan.created_at))
        )
        records = session.scalars(stmt).all()

        results = []
        for r in records:
            trip = {}
            plan = {}
            narration = None
            try:
                trip = json.loads(r.trip_json)
            except Exception:
                pass
            try:
                plan = json.loads(r.plan_json)
            except Exception:
                pass
            if r.narration_json:
                try:
                    narration = json.loads(r.narration_json)
                except Exception:
                    pass

            days_list = plan.get("days", []) if isinstance(plan, dict) else []
            days_count = len(days_list) if len(days_list) > 0 else (trip.get("days") or 1)
            stops_count = sum(len(d.get("stops", [])) for d in days_list if isinstance(d, dict))
            budget_info = plan.get("budget", {}) if isinstance(plan, dict) else {}
            budget_total = budget_info.get("total") or trip.get("budget") or 0

            results.append({
                "plan_id": r.plan_id,
                "user_id": r.user_id,
                "title": r.title,
                "created_at": format_iso_datetime(r.created_at),
                "days_count": days_count,
                "stops_count": stops_count,
                "budget": budget_total,
                "trip": trip,
                "plan": plan,
                "narration": narration
            })
        return results


def get_user_saved_plan_by_id(plan_id: str, user_id: int) -> Optional[dict]:
    """Retrieves a single saved plan if it belongs to the user; otherwise returns None."""
    with SessionLocal() as session:
        stmt = select(SavedPlan).where(
            SavedPlan.plan_id == plan_id.strip(),
            SavedPlan.user_id == int(user_id)
        )
        r = session.scalars(stmt).first()
        if not r:
            return None

        trip = {}
        plan = {}
        narration = None
        try:
            trip = json.loads(r.trip_json)
        except Exception:
            pass
        try:
            plan = json.loads(r.plan_json)
        except Exception:
            pass
        if r.narration_json:
            try:
                narration = json.loads(r.narration_json)
            except Exception:
                pass

        return {
            "plan_id": r.plan_id,
            "user_id": r.user_id,
            "title": r.title,
            "created_at": format_iso_datetime(r.created_at),
            "trip": trip,
            "plan": plan,
            "narration": narration
        }


def delete_user_saved_plan_by_id(plan_id: str, user_id: int) -> bool:
    """Deletes a saved plan owned by the user. Returns True if deleted, False if not found."""
    with SessionLocal() as session:
        stmt = delete(SavedPlan).where(
            SavedPlan.plan_id == plan_id.strip(),
            SavedPlan.user_id == int(user_id)
        )
        res = session.execute(stmt)
        session.commit()
        return res.rowcount > 0


# -------------------------------------------------------------
# ADMIN DASHBOARD & AUDIT HELPERS
# -------------------------------------------------------------

def get_admin_dashboard_stats() -> dict:
    """Returns platform-wide summary metrics for administrator dashboard."""
    with SessionLocal() as session:
        now = datetime.utcnow()
        seven_days_ago = now - timedelta(days=7)
        twenty_four_hours_ago = now - timedelta(hours=24)

        total_users = session.scalar(select(func.count(User.user_id))) or 0
        new_users_7d = session.scalar(
            select(func.count(User.user_id)).where(User.created_at >= seven_days_ago)
        ) or 0
        total_logins = session.scalar(
            select(func.count(LoginLog.log_id)).where(LoginLog.success == True)
        ) or 0
        failed_logins_24h = session.scalar(
            select(func.count(LoginLog.log_id)).where(
                LoginLog.success == False,
                LoginLog.login_time >= twenty_four_hours_ago
            )
        ) or 0
        total_saved_plans = session.scalar(select(func.count(SavedPlan.plan_id))) or 0
        total_chat_questions = session.scalar(select(func.count(ChatLog.log_id))) or 0
        total_places = session.scalar(select(func.count(Place.id))) or 0
        total_hotels = session.scalar(select(func.count(Hotel.id))) or 0
        total_food = session.scalar(select(func.count(Food.id))) or 0

        return {
            "total_users": total_users,
            "new_users_7d": new_users_7d,
            "total_logins": total_logins,
            "failed_logins_24h": failed_logins_24h,
            "total_saved_plans": total_saved_plans,
            "total_chat_questions": total_chat_questions,
            "total_places": total_places,
            "total_hotels": total_hotels,
            "total_food": total_food
        }


def get_admin_users_list(page: int = 1, limit: int = 15, search: Optional[str] = None) -> tuple:
    """Returns paginated user list with total count and successful login count."""
    with SessionLocal() as session:
        offset = max(0, (page - 1) * limit)
        stmt = select(User)

        if search and search.strip():
            term = f"%{search.strip().lower()}%"
            stmt = stmt.where(
                or_(
                    func.lower(User.username).like(term),
                    func.lower(User.email).like(term)
                )
            )

        # Count total
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_count = session.scalar(count_stmt) or 0

        # Paginated fetch
        data_stmt = stmt.order_by(desc(User.created_at)).limit(limit).offset(offset)
        user_records = session.scalars(data_stmt).all()

        users = []
        for u in user_records:
            # Count successful logins for each user
            login_cnt = session.scalar(
                select(func.count(LoginLog.log_id)).where(
                    LoginLog.user_id == u.user_id,
                    LoginLog.success == True
                )
            ) or 0

            users.append({
                "user_id": u.user_id,
                "username": u.username,
                "email": u.email,
                "created_at": format_iso_datetime(u.created_at),
                "last_login": format_iso_datetime(u.last_login),
                "is_admin": bool(u.is_admin),
                "login_count": login_cnt
            })

        return users, total_count


def get_admin_login_logs_list(
    page: int = 1,
    limit: int = 20,
    success: Optional[bool] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> tuple:
    """Returns paginated login audit logs, newest first, with optional status and date filters."""
    with SessionLocal() as session:
        offset = max(0, (page - 1) * limit)
        stmt = select(LoginLog, User.username).outerjoin(User, LoginLog.user_id == User.user_id)

        if success is not None:
            stmt = stmt.where(LoginLog.success == bool(success))

        if start_date:
            try:
                start_dt = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
                stmt = stmt.where(LoginLog.login_time >= start_dt)
            except Exception:
                pass

        if end_date:
            try:
                end_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
                stmt = stmt.where(LoginLog.login_time <= end_dt)
            except Exception:
                pass

        # Total count
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_count = session.scalar(count_stmt) or 0

        # Paginated results
        data_stmt = stmt.order_by(desc(LoginLog.log_id)).limit(limit).offset(offset)
        rows = session.execute(data_stmt).all()

        logs = [
            {
                "log_id": log.log_id,
                "user_id": log.user_id,
                "username": uname or "Unregistered / Unknown",
                "email_attempted": log.email_attempted,
                "time": format_iso_datetime(log.login_time),
                "success": bool(log.success)
            }
            for log, uname in rows
        ]

        return logs, total_count


def get_admin_chat_logs_list(page: int = 1, limit: int = 20) -> tuple:
    """Returns paginated chat questions asked to Solvane guide."""
    with SessionLocal() as session:
        offset = max(0, (page - 1) * limit)

        total_count = session.scalar(select(func.count(ChatLog.log_id))) or 0

        stmt = (
            select(ChatLog, User.username, User.email)
            .outerjoin(User, ChatLog.user_id == User.user_id)
            .order_by(desc(ChatLog.log_id))
            .limit(limit)
            .offset(offset)
        )
        rows = session.execute(stmt).all()

        questions = [
            {
                "log_id": chat.log_id,
                "user_id": chat.user_id,
                "username": uname or f"User #{chat.user_id}",
                "email": uemail or "",
                "question": chat.question,
                "time": format_iso_datetime(chat.created_at)
            }
            for chat, uname, uemail in rows
        ]

        return questions, total_count


def get_admin_all_users_for_export() -> list:
    """Returns all users for CSV export. Never includes password hashes."""
    with SessionLocal() as session:
        stmt = select(User).order_by(asc(User.created_at))
        records = session.scalars(stmt).all()

        results = []
        for u in records:
            login_cnt = session.scalar(
                select(func.count(LoginLog.log_id)).where(
                    LoginLog.user_id == u.user_id,
                    LoginLog.success == True
                )
            ) or 0

            results.append({
                "user_id": u.user_id,
                "username": u.username,
                "email": u.email,
                "created_at": format_iso_datetime(u.created_at),
                "last_login": format_iso_datetime(u.last_login) or "",
                "is_admin": "Yes" if u.is_admin else "No",
                "login_count": login_cnt
            })
        return results


def get_admin_all_login_logs_for_export() -> list:
    """Returns login audit logs for CSV export."""
    with SessionLocal() as session:
        stmt = (
            select(LoginLog, User.username)
            .outerjoin(User, LoginLog.user_id == User.user_id)
            .order_by(desc(LoginLog.log_id))
            .limit(5000)
        )
        rows = session.execute(stmt).all()

        return [
            {
                "log_id": log.log_id,
                "user_id": log.user_id or "",
                "username": uname or "",
                "email_attempted": log.email_attempted,
                "success": "Success" if log.success else "Failed",
                "login_time": format_iso_datetime(log.login_time)
            }
            for log, uname in rows
        ]
