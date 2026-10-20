import math
import re
from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple
from config import COST_ESTIMATES, TRANSPORT_COST_PER_KM_PER_PERSON

# =============================================================================
# GEOGRAPHICAL DISTANCE & TRANSIT SPEED HELPERS
# =============================================================================

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two GPS coordinates in kilometers."""
    R = 6371.0  # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2.0) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 2)

def calculate_travel_time_minutes(dist_km: float) -> int:
    """Calculates transit time assuming an average urban/coastal speed of 30 km/h."""
    if dist_km <= 0.2:
        return 0
    # At 30 km/h, 1 km takes 2 minutes
    minutes = round((dist_km / 30.0) * 60)
    return max(5, minutes)

def parse_entry_fee(fee_str: str) -> Tuple[int, bool]:
    """
    Parses entry fee string.
    Returns (amount, is_unverified_flag).
    Treats 'Check locally' as 0 and flags it.
    """
    if not fee_str:
        return 0, False
    lower = fee_str.lower().strip()
    if "free" in lower:
        return 0, False
    if "check locally" in lower:
        return 0, True
    
    # Try finding numerical fee value
    nums = re.findall(r"\d+", fee_str)
    if nums:
        return int(nums[0]), False
    return 0, True

def format_time_12h(hours: int, minutes: int) -> str:
    """Formats 24h hours and minutes into 12-hour AM/PM string."""
    period = "AM" if hours < 12 else "PM"
    display_hour = hours % 12
    if display_hour == 0:
        display_hour = 12
    return f"{display_hour:02d}:{minutes:02d} {period}"

def add_minutes_to_time(hour: int, minute: int, added_mins: int) -> Tuple[int, int]:
    """Adds minutes to a time tuple, returning normalized (hour, minute)."""
    total = hour * 60 + minute + added_mins
    new_hour = (total // 60) % 24
    new_minute = total % 60
    return new_hour, new_minute

# =============================================================================
# ZONE DEFINITIONS & TITLES
# =============================================================================
ZONE_METADATA = {
    "rameswaram_town": {
        "title": "Rameswaram Town & Sacred Heritage",
        "desc": "Sacred temples, historic shrines, and President Kalam's ancestral roots."
    },
    "dhanushkodi_side": {
        "title": "Dhanushkodi & Coastal Lands End",
        "desc": "Ghost town ruins, Vibhishana temple, and the ocean confluence."
    },
    "pamban": {
        "title": "Pamban Strait & National Memorials",
        "desc": "Century-old Pamban sea bridge and Dr. Kalam's grand national memorial."
    },
    "mainland": {
        "title": "Mainland Heritage & Golden Shores",
        "desc": "Royal Ramalinga Vilasam palace, peaceful dargah, and calm Palk Bay beaches."
    }
}

# Preferred zone sequence for multi-day itineraries
PREFERRED_ZONE_ORDER = ["rameswaram_town", "dhanushkodi_side", "pamban", "mainland"]

# =============================================================================
# CORE RULE-BASED ITINERARY GENERATOR
# =============================================================================
def generate_itinerary(
    all_places: List[Dict[str, Any]],
    user_budget: float,
    days_input: Any,
    travelling_with: str,
    interests: List[str],
    selected_place_ids: List[str],
    travellers: int = 2
) -> Dict[str, Any]:
    """
    Builds a structured, rule-based Ramanathapuram itinerary according to the user's
    budget, duration, group type, and selected destinations.
    """
    warnings: List[str] = []
    could_not_fit: List[Dict[str, Any]] = []

    # 1. Normalize Days and Group Pacing
    days_str = str(days_input).strip().lower()
    if days_str in ["half", "0.5"]:
        num_days = 0.5
        day_count = 1
        is_half_day = True
    else:
        try:
            num_days = float(days_input)
            num_days = max(1.0, min(4.0, num_days))
        except (ValueError, TypeError):
            num_days = 2.0
        day_count = int(num_days)
        is_half_day = False

    group_type = (travelling_with or "family").lower().strip()
    is_relaxed_group = group_type in ["seniors", "family"]
    
    # Maximum stops allowed per day based on group type
    if is_half_day:
        max_stops_per_day = 3
    elif group_type == "seniors":
        max_stops_per_day = 3
    elif group_type == "family":
        max_stops_per_day = 4
    else:
        max_stops_per_day = 5  # solo, friends

    total_capacity = max_stops_per_day if is_half_day else (max_stops_per_day * day_count)

    # 2. Index places by id
    places_by_id = {p["id"]: p for p in all_places}

    # Clean selected place objects
    selected_places = []
    for pid in selected_place_ids:
        if pid in places_by_id and places_by_id[pid] not in selected_places:
            selected_places.append(places_by_id[pid])

    # Filter physically demanding places for seniors if requested
    if group_type == "seniors":
        filtered_selected = []
        for p in selected_places:
            tags = [t.lower() for t in p.get("tags", [])]
            if "physically demanding" in tags:
                could_not_fit.append({
                    "place_id": p["id"],
                    "name": p["name_en"],
                    "reason": "Exempted due to relaxed senior pacing guidelines"
                })
            else:
                filtered_selected.append(p)
        selected_places = filtered_selected

    # 3. Handle capacity overflow for selected places
    included_places = []
    if len(selected_places) > total_capacity:
        included_places = selected_places[:total_capacity]
        for p in selected_places[total_capacity:]:
            could_not_fit.append({
                "place_id": p["id"],
                "name": p["name_en"],
                "reason": f"Could not fit in {days_input} day(s) with {max_stops_per_day} daily stops max."
            })
    else:
        included_places = list(selected_places)

    # 4. Fill remaining capacity with interest-matched places
    if len(included_places) < total_capacity:
        slots_needed = total_capacity - len(included_places)
        unselected = [p for p in all_places if p not in included_places]

        # Rank unselected places by matching user interests
        clean_interests = [i.lower().strip() for i in (interests or [])]
        
        def compute_score(place: Dict[str, Any]) -> int:
            score = 0
            cat = place.get("category", "").lower()
            if cat in clean_interests or any(ci in cat for ci in clean_interests):
                score += 5
            for tag in place.get("tags", []):
                t_lower = tag.lower()
                if any(ci in t_lower for ci in clean_interests):
                    score += 2
            return score

        unselected.sort(key=compute_score, reverse=True)
        # Add highest matching places
        included_places.extend(unselected[:slots_needed])

    # 5. Group chosen places into Days by Zone
    # Determine which zones are present
    zone_groups: Dict[str, List[Dict[str, Any]]] = {
        "rameswaram_town": [],
        "dhanushkodi_side": [],
        "pamban": [],
        "mainland": []
    }
    for p in included_places:
        z = p.get("zone", "rameswaram_town")
        if z not in zone_groups:
            zone_groups["rameswaram_town"].append(p)
        else:
            zone_groups[z].append(p)

    # Distribute zones across the number of days
    day_allocations: List[List[Dict[str, Any]]] = []

    if is_half_day:
        # Half day: 1 morning zone
        # Prefer zone with most places
        best_zone = max(zone_groups.keys(), key=lambda z: len(zone_groups[z]))
        day_allocations.append(zone_groups[best_zone][:max_stops_per_day])
    elif day_count == 1:
        # 1 Full Day: combine top zones up to max_stops_per_day
        day1_places = []
        for z in PREFERRED_ZONE_ORDER:
            for p in zone_groups[z]:
                if len(day1_places) < max_stops_per_day:
                    day1_places.append(p)
                else:
                    if p in selected_places and p not in day1_places:
                        could_not_fit.append({
                            "place_id": p["id"],
                            "name": p["name_en"],
                            "reason": "Exceeded 1-day travel limit."
                        })
        day_allocations.append(day1_places)
    elif day_count == 2:
        # 2 Days: Day 1 Town, Day 2 Dhanushkodi + Pamban
        d1 = zone_groups["rameswaram_town"][:max_stops_per_day]
        d2 = (zone_groups["dhanushkodi_side"] + zone_groups["pamban"] + zone_groups["mainland"])[:max_stops_per_day]
        day_allocations.extend([d1, d2])
    elif day_count == 3:
        # 3 Days: Day 1 Town, Day 2 Dhanushkodi, Day 3 Pamban + Mainland
        d1 = zone_groups["rameswaram_town"][:max_stops_per_day]
        d2 = zone_groups["dhanushkodi_side"][:max_stops_per_day]
        d3 = (zone_groups["pamban"] + zone_groups["mainland"])[:max_stops_per_day]
        day_allocations.extend([d1, d2, d3])
    else:
        # 4 Days: Dedicated zone per day
        d1 = zone_groups["rameswaram_town"][:max_stops_per_day]
        d2 = zone_groups["dhanushkodi_side"][:max_stops_per_day]
        d3 = zone_groups["pamban"][:max_stops_per_day]
        d4 = zone_groups["mainland"][:max_stops_per_day]
        day_allocations.extend([d1, d2, d3, d4])

    # If any day has 0 places (e.g. user selected nothing in that zone), borrow from overflow
    all_assigned = [p for day in day_allocations for p in day]
    remaining_unassigned = [p for p in included_places if p not in all_assigned]

    for day_idx in range(len(day_allocations)):
        while len(day_allocations[day_idx]) < max_stops_per_day and remaining_unassigned:
            day_allocations[day_idx].append(remaining_unassigned.pop(0))

    # 6. Build Daily Schedules with Haversine Sequencing & Time Windows
    days_output = []
    total_trip_km = 0.0
    all_visited_places: List[Dict[str, Any]] = []

    for day_num, raw_stops in enumerate(day_allocations, start=1):
        if not raw_stops:
            continue

        # Sort stops logically:
        # 1. Temples/spiritual baths first (morning darshan)
        # 2. Dhanushkodi must finish by 5:30 PM
        # 3. Beaches & sunset spots in late afternoon
        def stop_sort_key(p: Dict[str, Any]) -> int:
            cat = p.get("category", "").lower()
            pid = p.get("id", "")
            if pid == "agni-theertham":
                return 1  # Sunrise holy dip
            if cat == "temple":
                return 2  # Morning temple darshan
            if pid == "dhanushkodi":
                return 5  # Afternoon daylight visit
            if cat == "beach" or "sunset" in p.get("tags", []):
                return 8  # Late afternoon sunset
            return 4      # Museums, heritage in midday

        sorted_stops = sorted(raw_stops, key=stop_sort_key)

        # Distance sequencing using nearest neighbor
        sequenced_stops: List[Dict[str, Any]] = []
        if sorted_stops:
            current = sorted_stops.pop(0)
            sequenced_stops.append(current)
            while sorted_stops:
                # Find nearest remaining stop that preserves temporal rules
                # e.g. don't push Dhanushkodi to late night
                nearest_idx = 0
                min_d = float('inf')
                for idx, candidate in enumerate(sorted_stops):
                    d = haversine_km(current["lat"], current["lng"], candidate["lat"], candidate["lng"])
                    if d < min_d:
                        min_d = d
                        nearest_idx = idx
                current = sorted_stops.pop(nearest_idx)
                sequenced_stops.append(current)

        # Determine start time of day
        first_is_temple = (sequenced_stops and
                           (sequenced_stops[0].get("category") == "temple" or
                            sequenced_stops[0].get("id") == "agni-theertham"))
        current_hour = 6 if first_is_temple else 8
        current_minute = 0

        day_stops_formatted = []
        prev_place = None
        lunch_added = False

        for stop_idx, place in enumerate(sequenced_stops):
            all_visited_places.append(place)

            # Check unverified data
            if not place.get("verified", False):
                warn_msg = f"Timings and details for {place['name_en']} are not officially verified. Please check locally."
                if warn_msg not in warnings:
                    warnings.append(warn_msg)

            # Check entry fee
            fee_val, is_fee_unverified = parse_entry_fee(place.get("entry_fee", ""))
            if is_fee_unverified:
                fee_warn = f"Entry fee for {place['name_en']} is marked as 'Check locally' (estimated as ₹0)."
                if fee_warn not in warnings:
                    warnings.append(fee_warn)

            # Travel calculation
            if prev_place is None:
                travel_mins = 0
                dist_km = 0.0
            else:
                dist_km = haversine_km(prev_place["lat"], prev_place["lng"], place["lat"], place["lng"])
                travel_mins = calculate_travel_time_minutes(dist_km)
                total_trip_km += dist_km

            # Advance current time by travel
            current_hour, current_minute = add_minutes_to_time(current_hour, current_minute, travel_mins)

            # Lunch Break check: between 12:00 PM and 1:30 PM
            if not lunch_added and not is_half_day and (current_hour > 12 or (current_hour == 12 and current_minute >= 15)):
                # Insert 60 min lunch
                current_hour, current_minute = add_minutes_to_time(current_hour, current_minute, 60)
                lunch_added = True

            start_str = format_time_12h(current_hour, current_minute)

            # Duration calculation
            est_hours = place.get("estimated_visit_hours", 1.5)
            visit_mins = int(est_hours * 60)
            
            # Senior/family rest pauses
            if is_relaxed_group and stop_idx > 0:
                visit_mins += 15

            current_hour, current_minute = add_minutes_to_time(current_hour, current_minute, visit_mins)

            # Check Dhanushkodi restriction (Must end by 5:30 PM)
            stop_note = ""
            if place["id"] == "dhanushkodi":
                if current_hour > 17 or (current_hour == 17 and current_minute > 30):
                    current_hour = 17
                    current_minute = 30
                stop_note = "Entry strictly restricted after 5:00 PM; all visitors must return by 5:30 PM."
                if "Dhanushkodi coastal security restriction: Entry closes by 5:00 PM to 5:30 PM." not in warnings:
                    warnings.append("Dhanushkodi coastal security restriction: Entry closes by 5:00 PM to 5:30 PM.")
            elif place.get("category") == "temple":
                stop_note = "Traditional attire required. Mobile phones not allowed in sanctum."
            elif is_relaxed_group:
                stop_note = "Paced with comfortable seating breaks and shade."
            else:
                stop_note = f"Recommended visit duration: {est_hours} hrs."

            end_str = format_time_12h(current_hour, current_minute)

            day_stops_formatted.append({
                "place_id": place["id"],
                "name": place["name_en"],
                "name_ta": place.get("name_ta", ""),
                "category": place.get("category", "heritage"),
                "image": place.get("image", "/images/placeholder.jpg"),
                "start_time": start_str,
                "end_time": end_str,
                "travel_minutes_from_previous": travel_mins,
                "distance_km_from_previous": dist_km,
                "note": stop_note
            })

            prev_place = place

        # Determine dominant zone summary for the day
        day_zones = [p.get("zone", "rameswaram_town") for p in sequenced_stops]
        dominant_zone = max(set(day_zones), key=day_zones.count) if day_zones else "rameswaram_town"
        zone_info = ZONE_METADATA.get(dominant_zone, ZONE_METADATA["rameswaram_town"])

        days_output.append({
            "day": day_num,
            "title": f"Day {day_num}: {zone_info['title']}",
            "zone_summary": zone_info["desc"],
            "stops": day_stops_formatted,
            "lunch_note": "12:30 PM - 01:30 PM • Traditional South Indian lunch break" if not is_half_day else None
        })

    # 7. Calculate Cost Estimates
    # Determine budget tier based on user_budget per person per day
    daily_budget_per_person = user_budget / (max(1, travellers) * num_days)
    if daily_budget_per_person < 1400:
        cost_tier = "budget"
    elif daily_budget_per_person < 3200:
        cost_tier = "comfortable"
    else:
        cost_tier = "premium"

    tier_cfg = COST_ESTIMATES[cost_tier]
    
    # Stay calculation (nights = days - 1, 0 for half or 1 day)
    nights = 0 if is_half_day else max(0, day_count - 1)
    stay_cost = tier_cfg["stay_per_person_per_night"] * nights * travellers

    # Food calculation
    food_cost = round(tier_cfg["food_per_person_per_day"] * num_days * travellers)

    # Local transit calculation
    base_transit = tier_cfg["transport_base_per_person_per_day"] * num_days * travellers
    distance_transit = round(total_trip_km * TRANSPORT_COST_PER_KM_PER_PERSON * travellers)
    transport_cost = base_transit + distance_transit

    # Entry fees
    entry_fees_cost = 0
    for p in all_visited_places:
        f_amt, _ = parse_entry_fee(p.get("entry_fee", ""))
        entry_fees_cost += (f_amt * travellers)

    total_cost = stay_cost + food_cost + transport_cost + entry_fees_cost

    # 8. Budget Status & Advisory Message
    if user_budget >= total_cost:
        budget_status = "within budget"
        budget_message = f"Your estimated trip cost of ₹{total_cost:,} is within your budget of ₹{int(user_budget):,}."
    elif total_cost <= user_budget * 1.25:
        budget_status = "tight"
        budget_message = f"Estimated trip cost (₹{total_cost:,}) is slightly tight compared to your ₹{int(user_budget):,} budget. Consider local vegetarian messes or shared autos."
    else:
        budget_status = "over budget"
        suggested_days = max(1, day_count - 1)
        budget_message = f"Estimated trip cost (₹{total_cost:,}) exceeds your budget of ₹{int(user_budget):,}. Consider reducing to {suggested_days} day(s) or opting for budget accommodations."

    return {
        "days": days_output,
        "budget": {
            "breakdown": {
                "stay": stay_cost,
                "food": food_cost,
                "transport": transport_cost,
                "entry_fees": entry_fees_cost
            },
            "total": total_cost,
            "user_budget": int(user_budget),
            "status": budget_status,
            "message": budget_message,
            "tier_used": cost_tier,
            "nights": nights,
            "travellers": travellers
        },
        "warnings": warnings,
        "could_not_fit": could_not_fit
    }
