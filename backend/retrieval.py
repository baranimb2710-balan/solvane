"""
Retrieval Module for Solvane
Performs keyword-based retrieval across SQLite places, hotels.json, and food.json.
Always includes user's selectedPlaces if provided in the trip context.
"""

import os
import re
import json
from pathlib import Path
from database import get_all_places_db, get_all_hotels_db, get_all_food_db

BASE_DIR = Path(__file__).resolve().parent
HOTELS_FILE = BASE_DIR / "data" / "hotels.json"
FOOD_FILE = BASE_DIR / "data" / "food.json"

STOP_WORDS = {
    "the", "is", "at", "which", "on", "in", "to", "for", "a", "an", "and", "or",
    "of", "can", "i", "where", "what", "how", "best", "good", "near", "place",
    "places", "visit", "tell", "me", "about", "some", "any", "are", "there", "do",
    "you", "know", "please", "we", "my", "our", "want", "like", "with", "from",
    "have", "has", "had", "will", "would", "should", "could", "this", "that"
}

def load_json_file(file_path: Path):
    """Safely loads a JSON data file."""
    if not file_path.exists():
        return []
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading {file_path}: {e}")
        return []

def extract_tokens(text: str) -> list[str]:
    """Tokenizes text into lowercase alphanumeric words, filtering stop words."""
    if not text:
        return []
    words = re.findall(r"\w+", text.lower())
    return [w for w in words if len(w) > 1 and w not in STOP_WORDS]

def retrieve_relevant_entries(query: str, selected_place_ids: list = None, max_results: int = 8):
    """
    Finds top matching entries from places (SQLite), hotels (JSON), and food (JSON).
    Guarantees inclusion of user's selectedPlaces from trip context.
    
    Returns:
        (context_block: str, sources: list[dict])
    """
    if selected_place_ids is None:
        selected_place_ids = []
    
    # Normalize selected IDs
    selected_ids_set = {str(pid).strip().lower() for pid in selected_place_ids if pid}
    
    # Freshly load places, hotels, and food from database to capture latest data
    db_places = get_all_places_db()
    hotels = get_all_hotels_db()
    if not hotels:
        hotels = load_json_file(HOTELS_FILE)
    food_list = get_all_food_db()
    if not food_list:
        food_list = load_json_file(FOOD_FILE)
    
    query_tokens = extract_tokens(query)
    query_lower = query.lower().strip()
    
    scored_items = []
    
    # 1. Score Places
    for p in db_places:
        pid = str(p.get("id", "")).strip().lower()
        name_en = p.get("name_en", "")
        name_ta = p.get("name_ta", "") or ""
        cat = p.get("category", "") or ""
        subtype = p.get("subtype", "") or ""
        desc = (p.get("short_description", "") or "") + " " + (p.get("description", "") or "")
        zone = p.get("zone", "") or ""
        tags = " ".join(p.get("tags", [])) if isinstance(p.get("tags"), list) else str(p.get("tags") or "")
        tips = " ".join(p.get("tips", [])) if isinstance(p.get("tips"), list) else str(p.get("tips") or "")
        
        # Priority boost if user already selected this place in their trip planner
        is_selected = pid in selected_ids_set
        
        score = 0
        if is_selected:
            score += 100  # Ensure user's planned itinerary places are prioritized
            
        # Scoring logic
        name_text = f"{name_en} {name_ta}".lower()
        if query_lower and query_lower in name_text:
            score += 40
            
        tag_cat_text = f"{cat} {subtype} {zone} {tags}".lower()
        desc_text = f"{desc} {tips}".lower()
        
        for token in query_tokens:
            if token in name_text:
                score += 15
            elif token in tag_cat_text:
                score += 8
            elif token in desc_text:
                score += 3
                
        scored_items.append({
            "type": "place",
            "id": p.get("id"),
            "name": name_en,
            "raw": p,
            "score": score,
            "is_selected": is_selected
        })

    # 2. Score Hotels
    for h in hotels:
        hid = str(h.get("id", "")).strip().lower()
        hname = h.get("name", "")
        area = h.get("area", "") or ""
        amenities = " ".join(h.get("amenities", [])) if isinstance(h.get("amenities"), list) else ""
        nearby = " ".join(h.get("nearby_place_ids", [])) if isinstance(h.get("nearby_place_ids"), list) else ""
        
        score = 0
        hname_lower = hname.lower()
        area_amenities = f"{area} {amenities} {nearby}".lower()
        
        # Check if hotel is near any of the selected places
        for sel_id in selected_ids_set:
            if sel_id in nearby.lower():
                score += 15
                
        if query_lower and ("hotel" in query_lower or "stay" in query_lower or "lodge" in query_lower or "room" in query_lower):
            score += 10
            
        for token in query_tokens:
            if token in hname_lower:
                score += 15
            elif token in area_amenities:
                score += 5
                
        scored_items.append({
            "type": "hotel",
            "id": h.get("id"),
            "name": hname,
            "raw": h,
            "score": score,
            "is_selected": False
        })

    # 3. Score Food
    for f in food_list:
        fid = str(f.get("id", "")).strip().lower()
        fname = f.get("name", "")
        area = f.get("area", "") or ""
        ftype = f.get("type", "") or ""
        veg_nonveg = f.get("veg_or_nonveg", "") or ""
        famous = " ".join(f.get("famous_for", [])) if isinstance(f.get("famous_for"), list) else ""
        nearby = " ".join(f.get("nearby_place_ids", [])) if isinstance(f.get("nearby_place_ids"), list) else ""
        
        score = 0
        fname_lower = fname.lower()
        food_details = f"{area} {ftype} {veg_nonveg} {famous} {nearby}".lower()
        
        # Check if restaurant is near any of the selected places
        for sel_id in selected_ids_set:
            if sel_id in nearby.lower():
                score += 15
                
        if query_lower and any(w in query_lower for w in ["food", "restaurant", "eat", "dining", "dish", "breakfast", "lunch", "dinner", "mess", "seafood", "veg"]):
            score += 10
            
        for token in query_tokens:
            if token in fname_lower:
                score += 15
            elif token in food_details:
                score += 6
                
        scored_items.append({
            "type": "food",
            "id": f.get("id"),
            "name": fname,
            "raw": f,
            "score": score,
            "is_selected": False
        })

    # Sort descending by score
    scored_items.sort(key=lambda item: item["score"], reverse=True)
    
    # Pick top entries: Ensure all selectedPlaces that were found are included, then top scoring items
    chosen_items = []
    seen_ids = set()
    
    # First: include selected places (up to 4 so we don't crowd out the response)
    for item in scored_items:
        if item["is_selected"] and item["id"] not in seen_ids:
            chosen_items.append(item)
            seen_ids.add(item["id"])
            if len(chosen_items) >= 4:
                break
                
    # Second: fill the rest with top scored items
    for item in scored_items:
        if item["id"] not in seen_ids:
            # If items have 0 score and we have no results yet, fallback to top items
            if item["score"] > 0 or len(chosen_items) < 4:
                chosen_items.append(item)
                seen_ids.add(item["id"])
                if len(chosen_items) >= max_results:
                    break
                    
    # Format chosen items into a clean, compact text block for system prompt
    context_lines = []
    sources = []
    
    for item in chosen_items:
        itype = item["type"]
        raw = item["raw"]
        iid = item["id"]
        name = item["name"]
        
        sources.append({
            "type": itype,
            "id": iid,
            "name": name
        })
        
        if itype == "place":
            verified_str = "Verified" if raw.get("verified", True) else "UNVERIFIED (details may not be checked)"
            name_ta_str = f" ({raw.get('name_ta')})" if raw.get("name_ta") else ""
            timings = raw.get("timings") or "Not specified"
            entry_fee = raw.get("entry_fee") or "Free / Standard"
            zone = raw.get("zone") or "Ramanathapuram"
            hrs = raw.get("estimated_visit_hours") or 1.5
            short_desc = raw.get("short_description") or ""
            rules = raw.get("photography_rules") or "Standard rules"
            dress = raw.get("dress_code") or "Modest attire"
            reach = raw.get("how_to_reach") or ""
            tips = ", ".join(raw.get("tips", [])) if isinstance(raw.get("tips"), list) else str(raw.get("tips") or "")
            
            line = (
                f"- [PLACE] ID: {iid} | Name: {name}{name_ta_str} | Status: {verified_str} | "
                f"Zone: {zone} | Timings: {timings} | Entry Fee: {entry_fee} | Est. Hours: {hrs}h | "
                f"Dress Code: {dress} | Photography: {rules} | Description: {short_desc} | "
                f"Tips: {tips} | How to Reach: {reach}"
            )
            context_lines.append(line)
            
        elif itype == "hotel":
            verified_str = "Verified" if raw.get("verified", False) else "UNVERIFIED (details may not be checked)"
            area = raw.get("area") or "Rameswaram"
            price = raw.get("price_range_per_night") or "Check on booking"
            amenities = ", ".join(raw.get("amenities", [])) if isinstance(raw.get("amenities"), list) else ""
            rating = raw.get("rating") or "N/A"
            
            line = (
                f"- [HOTEL] ID: {iid} | Name: {name} | Status: {verified_str} | "
                f"Area: {area} | Price/Night: {price} | Rating: {rating}★ | "
                f"Amenities: {amenities} | Contact: Check Google Maps"
            )
            context_lines.append(line)
            
        elif itype == "food":
            verified_str = "Verified" if raw.get("verified", False) else "UNVERIFIED (details may not be checked)"
            area = raw.get("area") or "Rameswaram"
            ftype = raw.get("type") or "Eatery"
            veg = raw.get("veg_or_nonveg") or ""
            famous = ", ".join(raw.get("famous_for", [])) if isinstance(raw.get("famous_for"), list) else ""
            price = raw.get("price_range") or ""
            timings = raw.get("timings") or "Standard hours"
            
            line = (
                f"- [FOOD] ID: {iid} | Name: {name} | Status: {verified_str} | "
                f"Area: {area} | Type: {ftype} ({veg}) | Famous For: {famous} | "
                f"Price: {price} | Timings: {timings}"
            )
            context_lines.append(line)
            
    context_block = "\n".join(context_lines)
    return context_block, sources
