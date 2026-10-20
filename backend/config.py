import os
from pathlib import Path
from dotenv import load_dotenv

# Load variables from .env file located in backend directory
_backend_dir = Path(__file__).resolve().parent
load_dotenv(dotenv_path=_backend_dir / ".env")
load_dotenv()  # Fallback to CWD if present

# Database path (defaults to solvane.db in backend folder)
DATABASE_PATH = os.getenv("DATABASE_PATH", "solvane.db")

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
# COST ESTIMATION CONFIGURATION (Rough estimates - must be verified by user)
# These represent baseline per-person-per-day costs in INR across three travel tiers.
# Local transport includes fixed daily local auto/bus plus distance-based rates.
# =============================================================================
COST_ESTIMATES = {
    # 1. Budget Tier: Dharamshalas, budget lodges, local messes, town buses / shared autos
    "budget": {
        "stay_per_person_per_night": 450,       # shared double / dharamshala room
        "food_per_person_per_day": 350,         # local South Indian vegetarian meals
        "transport_base_per_person_per_day": 120, # municipal bus & shared auto baseline
    },
    # 2. Comfortable Tier: Standard AC hotels, popular family restaurants, private autorickshaws / partial cabs
    "comfortable": {
        "stay_per_person_per_night": 1100,      # standard 2-3 star hotel room split
        "food_per_person_per_day": 650,         # AC dining, variety meals & snacks
        "transport_base_per_person_per_day": 280, # dedicated autos & town transit
    },
    # 3. Premium Tier: Seafront resorts, star hotels, seafood/fine dining, dedicated private cab
    "premium": {
        "stay_per_person_per_night": 2400,      # resort / luxury hotel room split
        "food_per_person_per_day": 1200,        # multi-cuisine & coastal seafood dining
        "transport_base_per_person_per_day": 550, # private AC car daily hire base
    }
}

# Distance-based local transit rate per km per person (for inter-zone cab/auto transit across Ramanathapuram)
TRANSPORT_COST_PER_KM_PER_PERSON = 7.5  # Approx ₹7.50 / km / person (e.g. ₹15/km for 2 travellers)

# AI Chat Guide Configuration
AI_PROVIDER = os.getenv("AI_PROVIDER", "gemini").lower()
AI_API_KEY = os.getenv("AI_API_KEY", "")
AI_MODEL = os.getenv("AI_MODEL", "gemini-3.6-flash" if AI_PROVIDER == "gemini" else "claude-3-5-haiku-20241022")

