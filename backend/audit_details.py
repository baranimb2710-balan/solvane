import json
import sqlite3
from pathlib import Path

backend_dir = Path(__file__).parent
places = json.load(open(backend_dir / "data" / "places.json", encoding="utf-8"))
hotels = json.load(open(backend_dir / "data" / "hotels.json", encoding="utf-8"))
food = json.load(open(backend_dir / "data" / "food.json", encoding="utf-8"))

print(f"Loaded {len(places)} places, {len(hotels)} hotels, {len(food)} food places.")

# Verify places
unverified_places = []
for p in places:
    pid = p["id"]
    is_ver = p.get("verified", False)
    if not is_ver:
        unverified_places.append(pid)
    
print("Unverified places:", unverified_places)

# Verify contacts & websites
missing_contact_hotels = [h["id"] for h in hotels if h.get("contact") in ["Check on Google Maps", None, ""]]
print("Hotels with placeholder contact:", missing_contact_hotels)

missing_timings_food = [f["id"] for f in food if not f.get("timings")]
print("Food missing timings:", missing_timings_food)

# Coordinates precision & check distance from Rameswaram
for p in places:
    lat, lng = p["lat"], p["lng"]
    # Check if lat/lng are rounded or exact
    print(f"Place {p['id']}: ({lat}, {lng}) - {p['name_en']}")
