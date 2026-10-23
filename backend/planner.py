import math
import re
from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple, Union
from config import (
    TIER_THRESHOLDS,
    COST_RATES,
    CHILD_FOOD_RATIO,
    TRANSPORT_PER_VEHICLE_PER_KM,
    COST_ESTIMATES,
    TRANSPORT_COST_PER_KM_PER_PERSON,
)

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
    lower = str(fee_str).lower().strip()
    if "free" in lower:
        return 0, False
    if "check locally" in lower:
        return 0, True
    
    # Try finding numerical fee value
    nums = re.findall(r"\d+", lower)
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
    travellers: Union[int, Dict[str, Any]] = 2,
    budget_basis: str = "group"
) -> Dict[str, Any]:
    """
    Builds a structured, rule-based Ramanathapuram itinerary according to the user's
    budget, duration (up to 14 days), travellers (adults, children, seniors), and
    selected destinations.
    """
    warnings: List[str] = []
    could_not_fit: List[Dict[str, Any]] = []

    # 1. Normalize Travellers Breakdown
    # Supports both legacy int and new dict: { adults: 2, children: 0, seniors: 0 }
    if isinstance(travellers, dict):
        adults_count = max(1, int(travellers.get("adults", 2) or 2))
        children_count = max(0, int(travellers.get("children", 0) or 0))
        seniors_count = max(0, int(travellers.get("seniors", 0) or 0))
    else:
        try:
            val = int(travellers or 2)
            adults_count = max(1, val)
        except (ValueError, TypeError):
            adults_count = 2
        children_count = 0
        seniors_count = 0

    group_type = (travelling_with or "family").lower().strip()
    if group_type == "solo":
        adults_count = 1
        children_count = 0
        seniors_count = 0

    total_people = adults_count + children_count

    # 2. Normalize Days (Up to 14 days)
    days_str = str(days_input).strip().lower()
    if days_str in ["half", "0.5"]:
        num_days = 0.5
        day_count = 1
        is_half_day = True
    else:
        try:
            num_days = float(days_input)
            num_days = max(1.0, min(14.0, num_days))
        except (ValueError, TypeError):
            num_days = 2.0
        day_count = int(num_days)
        is_half_day = False

    # 3. Pacing & Max Stops
    # Slower pacing applies if group is seniors/family OR if seniors > 0 OR children > 0
    has_seniors = (seniors_count > 0) or (group_type == "seniors")
    has_children = (children_count > 0) or (group_type == "family")
    is_relaxed_group = has_seniors or has_children

    if is_half_day:
        max_stops_per_day = 3
    elif has_seniors:
        max_stops_per_day = 3
    elif has_children:
        max_stops_per_day = 4
    else:
        max_stops_per_day = 5

    # 4. Filter & Select Places
    places_by_id = {p["id"]: p for p in all_places}

    selected_places: List[Dict[str, Any]] = []
    for pid in selected_place_ids:
        if pid in places_by_id and places_by_id[pid] not in selected_places:
            selected_places.append(places_by_id[pid])

    # Exempt physically demanding places for seniors
    if has_seniors:
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

    # Total place capacity for the trip
    total_capacity = max_stops_per_day if is_half_day else (max_stops_per_day * day_count)

    included_places: List[Dict[str, Any]] = []
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

    # Fill remaining capacity with interest-matched places
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
            # Skip physically demanding places if seniors present
            if has_seniors and "physically demanding" in [t.lower() for t in place.get("tags", [])]:
                score -= 100
            return score

        unselected.sort(key=compute_score, reverse=True)
        # Avoid including negative score items if seniors are present
        for candidate in unselected:
            if len(included_places) >= total_capacity:
                break
            if has_seniors and "physically demanding" in [t.lower() for t in candidate.get("tags", [])]:
                continue
            included_places.append(candidate)

    # 5. Group chosen places into Days by Zone
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

    day_allocations: List[List[Dict[str, Any]]] = []

    if is_half_day:
        best_zone = max(zone_groups.keys(), key=lambda z: len(zone_groups[z]))
        day_allocations.append(zone_groups[best_zone][:max_stops_per_day])
    elif day_count == 1:
        day1_places: List[Dict[str, Any]] = []
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
        d1 = zone_groups["rameswaram_town"][:max_stops_per_day]
        d2 = (zone_groups["dhanushkodi_side"] + zone_groups["pamban"] + zone_groups["mainland"])[:max_stops_per_day]
        day_allocations.extend([d1, d2])
    elif day_count == 3:
        d1 = zone_groups["rameswaram_town"][:max_stops_per_day]
        d2 = zone_groups["dhanushkodi_side"][:max_stops_per_day]
        d3 = (zone_groups["pamban"] + zone_groups["mainland"])[:max_stops_per_day]
        day_allocations.extend([d1, d2, d3])
    elif day_count == 4:
        d1 = zone_groups["rameswaram_town"][:max_stops_per_day]
        d2 = zone_groups["dhanushkodi_side"][:max_stops_per_day]
        d3 = zone_groups["pamban"][:max_stops_per_day]
        d4 = zone_groups["mainland"][:max_stops_per_day]
        day_allocations.extend([d1, d2, d3, d4])
    else:
        # 5 to 14 days: Distribute available zones across first days
        d1 = zone_groups["rameswaram_town"][:max_stops_per_day]
        d2 = zone_groups["dhanushkodi_side"][:max_stops_per_day]
        d3 = zone_groups["pamban"][:max_stops_per_day]
        d4 = zone_groups["mainland"][:max_stops_per_day]
        day_allocations.extend([d1, d2, d3, d4])
        # Remaining days start empty
        for _ in range(day_count - 4):
            day_allocations.append([])

    # Distribute any remaining unassigned places without repeating
    all_assigned = [p for day in day_allocations for p in day]
    remaining_unassigned = [p for p in included_places if p not in all_assigned]

    for day_idx in range(len(day_allocations)):
        while len(day_allocations[day_idx]) < max_stops_per_day and remaining_unassigned:
            day_allocations[day_idx].append(remaining_unassigned.pop(0))

    # Detect if any days ended up as Free Days
    has_free_days = any(len(day_stops) == 0 for day_stops in day_allocations)
    if has_free_days:
        warnings.append(
            "We have limited places for this many days. You can add more destinations or keep these as flexible days."
        )

    # 6. Build Daily Schedules with Haversine Sequencing & Time Windows
    days_output: List[Dict[str, Any]] = []
    total_trip_km = 0.0
    all_visited_places: List[Dict[str, Any]] = []

    for day_num, raw_stops in enumerate(day_allocations, start=1):
        if not raw_stops:
            # Free day / flexible time
            days_output.append({
                "day": day_num,
                "is_free_day": True,
                "title": f"Day {day_num}: Free Day / Flexible Exploration",
                "zone_summary": "Relax at your hotel, explore local bazaars and beachside cafes, or revisit your favorite temple.",
                "stops": [],
                "note": "Free day / flexible time: We have limited places for this many days. You can add more destinations or keep these as flexible days.",
                "lunch_note": "12:30 PM - 01:30 PM • Leisure lunch at your convenience" if not is_half_day else None
            })
            continue

        # Sort stops logically
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
            return 4

        sorted_stops = sorted(raw_stops, key=stop_sort_key)

        # Distance sequencing using nearest neighbor
        sequenced_stops: List[Dict[str, Any]] = []
        if sorted_stops:
            current = sorted_stops.pop(0)
            sequenced_stops.append(current)
            while sorted_stops:
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

        day_stops_formatted: List[Dict[str, Any]] = []
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
            elif fee_val > 0 and children_count > 0:
                # If place does not specify a separate child fee, note it
                if "child" not in str(place.get("entry_fee", "")).lower():
                    child_warn = f"Child fees not verified for {place['name_en']} (estimated at standard rate)."
                    if child_warn not in warnings:
                        warnings.append(child_warn)

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
                current_hour, current_minute = add_minutes_to_time(current_hour, current_minute, 60)
                lunch_added = True

            start_str = format_time_12h(current_hour, current_minute)

            # Duration calculation
            est_hours = place.get("estimated_visit_hours", 1.5)
            visit_mins = int(est_hours * 60)
            
            # Slower pacing breaks
            if is_relaxed_group and stop_idx > 0:
                visit_mins += 15

            current_hour, current_minute = add_minutes_to_time(current_hour, current_minute, visit_mins)

            # Stop notes & Dhanushkodi constraint
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
                "lat": place.get("lat"),
                "lng": place.get("lng"),
                "image": place.get("image", "/images/placeholder.jpg"),
                "start_time": start_str,
                "end_time": end_str,
                "travel_minutes_from_previous": travel_mins,
                "distance_km_from_previous": dist_km,
                "note": stop_note
            })

            prev_place = place

        # Dominant zone summary
        day_zones = [p.get("zone", "rameswaram_town") for p in sequenced_stops]
        dominant_zone = max(set(day_zones), key=day_zones.count) if day_zones else "rameswaram_town"
        zone_info = ZONE_METADATA.get(dominant_zone, ZONE_METADATA["rameswaram_town"])

        days_output.append({
            "day": day_num,
            "is_free_day": False,
            "title": f"Day {day_num}: {zone_info['title']}",
            "zone_summary": zone_info["desc"],
            "stops": day_stops_formatted,
            "lunch_note": "12:30 PM - 01:30 PM • Traditional South Indian lunch break" if not is_half_day else None
        })

    # =========================================================================
    # 7. COST CALCULATION (Exact breakdown using config rates)
    # =========================================================================
    # Handle Budget Basis: convert per-person budget to total group budget
    raw_budget = float(user_budget or 0)
    basis_clean = str(budget_basis).strip().lower()
    is_per_person = (basis_clean in ["per_person", "person"])

    if is_per_person:
        group_budget = raw_budget * total_people
    else:
        group_budget = raw_budget

    # Determine daily budget per person to pick the comfort tier
    daily_budget_per_person = group_budget / max(1, total_people * num_days)
    if daily_budget_per_person < TIER_THRESHOLDS["budget_max"]:
        cost_tier = "budget"
    elif daily_budget_per_person < TIER_THRESHOLDS["comfortable_max"]:
        cost_tier = "comfortable"
    else:
        cost_tier = "premium"

    tier_rates = COST_RATES[cost_tier]

    # Room calculation: 2 people per room (round up)
    rooms_needed = math.ceil(total_people / 2)
    # Nights: 0 for half-day or 1-day, otherwise day_count - 1
    nights = 0 if is_half_day else max(0, day_count - 1)
    stay_cost = rooms_needed * nights * tier_rates["stay_per_room_per_night"]

    # Food calculation: adults full rate, children at CHILD_FOOD_RATIO
    child_ratio = CHILD_FOOD_RATIO
    effective_food_units = adults_count + (children_count * child_ratio)
    food_cost = round(effective_food_units * num_days * tier_rates["food_per_adult_per_day"])

    # Local transport calculation: 4 people per vehicle (round up)
    vehicles_needed = math.ceil(total_people / 4)
    # Transport base per vehicle per day (half-day gets 0.5 factor)
    transit_days = 0.5 if is_half_day else float(day_count)
    base_transit_cost = round(vehicles_needed * transit_days * tier_rates["transport_per_vehicle_per_day"])
    distance_transit_cost = round(total_trip_km * TRANSPORT_PER_VEHICLE_PER_KM * vehicles_needed)
    transport_cost = base_transit_cost + distance_transit_cost

    # Entry fees calculation:
    # Adult: full fee. Children: check for child fee in string, else adult rate
    entry_fees_cost = 0
    for p in all_visited_places:
        adult_fee, _ = parse_entry_fee(p.get("entry_fee", ""))
        child_fee = adult_fee  # Default fallback if children fee not explicitly separated
        # Check if text has specific child fee pattern e.g., "Child: 10" or "Children ₹10"
        raw_fee_str = str(p.get("entry_fee", "")).lower()
        child_match = re.search(r"child(?:ren)?\s*[:\-₹]?\s*(\d+)", raw_fee_str)
        if child_match:
            try:
                child_fee = int(child_match.group(1))
            except (ValueError, TypeError):
                child_fee = adult_fee

        stop_entry_total = (adult_fee * adults_count) + (child_fee * children_count)
        entry_fees_cost += stop_entry_total

    total_cost = stay_cost + food_cost + transport_cost + entry_fees_cost
    cost_per_person = round(total_cost / total_people)

    # 8. Budget Status & Specific Suggestions
    diff = abs(round(group_budget - total_cost))
    if total_cost <= group_budget:
        budget_status = "within budget"
        budget_message = (
            f"Your estimated trip cost of ₹{total_cost:,} is within your budget of ₹{int(group_budget):,}. "
            f"You have an estimated saving of ₹{diff:,} for shopping, local prasadham, or leisure activities."
        )
    elif total_cost <= group_budget * 1.10:
        budget_status = "tight"
        budget_message = (
            f"Estimated trip cost of ₹{total_cost:,} is slightly tight (₹{diff:,} above your ₹{int(group_budget):,} budget). "
            f"Consider choosing local South Indian messes or auto-rickshaws to stay within your limit."
        )
    else:
        budget_status = "over budget"
        suggested_days = max(1, day_count - 1)
        budget_message = (
            f"Estimated trip cost of ₹{total_cost:,} exceeds your budget by ₹{diff:,}. "
            f"Consider shortening your trip to {suggested_days} day(s) or switching to budget dharamshalas and lodges."
        )

    # Formula inputs for transparent "How we estimated this" UI card
    formula_inputs = {
        "rooms": rooms_needed,
        "vehicles": vehicles_needed,
        "nights": nights,
        "days": num_days,
        "people": total_people,
        "adults": adults_count,
        "children": children_count,
        "seniors": seniors_count,
        "tier": cost_tier,
        "room_rate": tier_rates["stay_per_room_per_night"],
        "adult_food_rate": tier_rates["food_per_adult_per_day"],
        "child_food_rate": round(tier_rates["food_per_adult_per_day"] * child_ratio),
        "vehicle_daily_rate": tier_rates["transport_per_vehicle_per_day"],
        "budget_basis": "per person" if is_per_person else "whole group",
        "user_input_budget": int(raw_budget),
        "group_total_budget": int(group_budget),
        "shortfall_or_savings": diff
    }

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
            "cost_per_person": cost_per_person,
            "user_budget": int(group_budget),
            "original_user_budget": int(raw_budget),
            "budget_basis": "per person" if is_per_person else "whole group",
            "status": budget_status,
            "message": budget_message,
            "tier_used": cost_tier,
            "nights": nights,
            "travellers": total_people,
            "adults": adults_count,
            "children": children_count,
            "seniors": seniors_count,
            "formula_inputs": formula_inputs
        },
        "warnings": warnings,
        "could_not_fit": could_not_fit
    }
