import os
from pathlib import Path
from dotenv import load_dotenv

# Load variables from .env file located in backend directory
_backend_dir = Path(__file__).resolve().parent
load_dotenv(dotenv_path=_backend_dir / ".env")
load_dotenv()  # Fallback to CWD if present

# Database path: always absolute based on backend directory so solvane.db is consistent regardless of CWD
_db_env = os.getenv("DATABASE_PATH", "solvane.db")
DATABASE_PATH = str(Path(_db_env) if os.path.isabs(_db_env) else (_backend_dir / _db_env).resolve())

# Database URL for SQLAlchemy (supports SQLite locally and PostgreSQL / Supabase in production)
_raw_db_url = os.getenv("DATABASE_URL", "").strip()
if _raw_db_url:
    # Normalize legacy postgres:// to postgresql+psycopg2:// for SQLAlchemy
    if _raw_db_url.startswith("postgres://"):
        _raw_db_url = _raw_db_url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif _raw_db_url.startswith("postgresql://") and not _raw_db_url.startswith("postgresql+"):
        _raw_db_url = _raw_db_url.replace("postgresql://", "postgresql+psycopg2://", 1)
    DATABASE_URL = _raw_db_url
else:
    # Fallback to local SQLite file with absolute path using forward slashes
    _sqlite_path = DATABASE_PATH.replace("\\", "/")
    DATABASE_URL = f"sqlite:///{_sqlite_path}"

# Allowed frontend origin for CORS (defaults to Vite dev server)
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

# Server host and port
HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", 8000))

# JWT Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "solvane_ramanathapuram_secret_key_2026_hackathon")
JWT_EXPIRATION_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", 24))
JWT_ALGORITHM = "HS256"

# Admin Configuration (comma-separated list of emails with administrator privileges)
ADMIN_EMAILS = [
    email.strip().lower()
    for email in os.getenv("ADMIN_EMAILS", "admin@solvane.local,barani123@gmmail.com,tester@solvane.com,ramesh@example.com").split(",")
    if email.strip()
]

# =============================================================================
# COST ESTIMATION CONFIGURATION (Rough local estimates - please verify with local vendors)
# All monetary figures are in Indian Rupees (INR).
# =============================================================================

# Comfort Level Selection Thresholds (Daily budget per person in INR):
# Used to determine whether itinerary planning should assume budget, comfortable, or premium tier.
TIER_THRESHOLDS = {
    "budget_max": 1400,        # Under ₹1,400 per person/day -> Budget Tier
    "comfortable_max": 3200,   # ₹1,400 to ₹3,200 per person/day -> Comfortable Tier
    # Above ₹3,200 per person/day -> Premium Tier
}

# Per-tier room, meal, and vehicle rates:
COST_RATES = {
    # 1. Budget Tier: Dharamshalas / basic lodges, South Indian messes, local autos
    "budget": {
        "stay_per_room_per_night": 900,         # Basic double room / dharamshala rate per night
        "food_per_adult_per_day": 350,          # Local mess & South Indian meals per adult/day
        "transport_per_vehicle_per_day": 1200,  # Standard local auto-rickshaw hire per vehicle/day
    },
    # 2. Comfortable Tier: Standard 2-3 star AC hotels, AC family restaurants, dedicated sedan cab
    "comfortable": {
        "stay_per_room_per_night": 2200,        # Standard AC hotel double room rate per night
        "food_per_adult_per_day": 650,          # AC dining, multi-cuisine meals & snacks per adult/day
        "transport_per_vehicle_per_day": 2400,  # Dedicated sedan cab daily hire per vehicle/day
    },
    # 3. Premium Tier: Seafront resorts, star hotels, fine seafood dining, private SUV cab
    "premium": {
        "stay_per_room_per_night": 4800,        # Seafront resort / luxury hotel AC room rate per night
        "food_per_adult_per_day": 1200,         # Premium multi-cuisine & coastal seafood dining per adult/day
        "transport_per_vehicle_per_day": 3800,  # Private SUV (Innova / Ertiga) daily hire per vehicle/day
    }
}

# Child rate multiplier for meals (children under 12 consume ~60% of adult food cost)
CHILD_FOOD_RATIO = 0.60

# Distance-based travel allowance rate per vehicle per km (for longer inter-zone travel across Ramanathapuram)
TRANSPORT_PER_VEHICLE_PER_KM = 14.0  # Approx ₹14/km for sedan/cab

# Backward compatibility aliases
COST_ESTIMATES = COST_RATES
TRANSPORT_COST_PER_KM_PER_PERSON = 7.5

# AI Chat Guide Configuration
AI_PROVIDER = os.getenv("AI_PROVIDER", "gemini").lower()
AI_API_KEY = os.getenv("AI_API_KEY", "")
AI_MODEL = os.getenv("AI_MODEL", "gemini-3.6-flash" if AI_PROVIDER == "gemini" else "claude-3-5-haiku-20241022")

