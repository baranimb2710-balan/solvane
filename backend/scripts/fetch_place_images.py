"""
Fetch Place Images from Wikimedia Commons
Solvane - Ramanathapuram AI Tourist Guide

This script automatically searches Wikimedia Commons API for open-licensed images
(Public Domain, CC0, CC BY, CC BY-SA) for places that currently lack real photos.
Downloads, resizes to max 1600px, compresses, saves to backend/uploads/places/<place_id>/,
updates SQLite database places table, and generates backend/data/image_credits.json.

Usage:
    python backend/scripts/fetch_place_images.py
    python backend/scripts/fetch_place_images.py --force <place_id>
    python backend/scripts/fetch_place_images.py --force all
    python backend/scripts/fetch_place_images.py --dry-run
"""

import sys
import os
import argparse
import time
import json
import re
import sqlite3
import shutil
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from PIL import Image
import io
import httpx

# Ensure UTF-8 console output on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# Paths
BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_DIR = BACKEND_DIR.parent
DB_PATH = BACKEND_DIR / "solvane.db"
UPLOADS_DIR = BACKEND_DIR / "uploads" / "places"
CREDITS_PATH = BACKEND_DIR / "data" / "image_credits.json"
FRONTEND_PUBLIC_DIR = PROJECT_DIR / "frontend" / "public"

COMMONS_API_URL = "https://commons.wikimedia.org/w/api.php"
USER_AGENT = "SolvaneTouristApp/1.0 (https://github.com/solvane; contact: admin@solvane.local) python-httpx"

# Keywords that disqualify an image (maps, logos, flags, drawings, stamps, etc.)
IRRELEVANT_KEYWORDS = {
    "logo", "map", "flag", "coat of arms", "emblem", "icon", "drawing",
    "sketch", "diagram", "plan", "locator", "route", "stamp", "coin",
    "currency", "satellite", "elevation", "bathymetry", "chart", "symbol",
    "seal", "crest", "poster", "infographic"
}

# Curated queries for specific destinations to ensure accuracy
SPECIFIC_QUERIES: Dict[str, List[str]] = {
    "kalam-house": [
        "House of Kalam Rameswaram",
        "House of Abdul Kalam",
        "Abdul Kalam house Rameswaram",
    ],
    "kalam-memorial": [
        "APJ Abdul Kalam Memorial Rameswaram",
        "Abdul Kalam Memorial Rameswaram",
        "Kalam Memorial Rameswaram",
    ],
    "agni-theertham": [
        "Agni theerth Rameswaram",
        "Agni Theertham Rameswaram",
        "Agni Theertham",
    ],
    "five-faced-hanuman-temple": [
        "Panchamukhi Hanuman Temple Rameshwaram",
        "Panchamukhi Hanuman Rameswaram",
        "Five-faced Hanuman Rameswaram",
    ],
    "gandhamadhana-parvatham": [
        "Ramar padam at rameswaram",
        "Ramarpadam Rameswaram",
        "Ramar Padam Rameswaram",
        "Gandhamadhana Parvatham Rameswaram",
    ],
    "kothandaramaswamy-temple": [
        "Kothandaramar Temple Rameswaram",
        "Kothandaramaswamy Rameswaram",
    ],
    "ariyaman-beach": [
        "Ariyaman beach",
        "Ariyaman Beach Ramanathapuram",
        "Ariyaman",
    ],
    "erwadi-dargah": [
        "Erwadi Dargah",
        "Erwadi kodi",
        "Erwadi Ramanathapuram",
    ],
    "ramalinga-vilasam-palace": [
        "Ramalinga Vilasam Ramanathapuram",
        "Ramanathapuram Palace Outside",
        "Figures inside Ramanthapuram Palace",
    ],
    "thiruppullani-temple": [
        "Adi Jagannatha Perumal Temple",
        "Thiruppullani temple",
        "Thiruppullani",
    ],
    "uthirakosamangai-temple": [
        "Uthirakosamangai Temple",
        "Uthirakosamangai",
        "Mangalanatha Swamy temple",
    ],
    "devipattinam-navapashanam": [
        "Navapashanam",
        "Devipattinam Navapashanam",
        "Navapashanam temple",
        "Devipattinam",
    ],
    "oriyur-church": [
        "St. John De Britto",
        "St. John D' Britto",
    ],
    "villoondi-theertham": [
        "Villondi Theerttham",
        "Villoondi Theertham Rameswaram",
        "Villoondi Theertham",
    ],
    "kunthu-kal-beach": [
        "Kunthukal Beach",
        "Kunthukal Rameswaram",
        "Kundukal Rameswaram",
    ],
    "mandapam-marine-centre": [
        "Gulf of Mannar Marine National Park",
        "Mandapam Marine",
    ],
    "chitrangudi-bird-sanctuary": [
        "Chitrangudi Bird Sanctuary",
        "Chitrangudi",
        "Kanjirankulam Bird Sanctuary",
    ],
    "dhanushkodi-church-ruins": [
        "Dhanushkodi Ruined Church",
        "Dhanushkodi church",
        "Dhanushkodi ruins",
    ],
    "jada-theertham": [
        "Jada Theertham Rameswaram",
        "Jada Theertham",
    ],
    "lakshmana-theertham": [
        "Lakshmana Theertham Rameswaram",
        "Lakshmana Theertham",
    ],
    "periyapattinam-beach": [
        "Periyapattinam Ramanathapuram",
        "Airel view Periyapattinam",
    ],
    "ramanathaswamy-temple": [
        "Ramanathaswamy Temple Rameswaram",
        "Sri Ramanathaswamy Temple",
    ],
    "dhanushkodi": [
        "Dhanushkodi Beach",
        "Dhanushkodi",
    ],
    "pamban-bridge": [
        "Pamban Bridge",
        "Pamban rail bridge",
    ],
}

def clean_html(text: str) -> str:
    """Strips HTML tags and extra whitespace."""
    if not text:
        return ""
    clean = re.sub(r"<[^>]+>", "", text)
    return " ".join(clean.split()).strip()

def is_open_license(license_str: str) -> bool:
    """
    Validates whether the license is acceptable under the project rules:
    Public Domain, CC0, CC BY, or CC BY-SA.
    Explicitly rejects Non-Commercial (NC) and No-Derivatives (ND).
    """
    if not license_str:
        return False
    l = license_str.strip().lower()
    
    # Reject non-commercial or no-derivatives
    if any(k in l for k in ["nc", "noncommercial", "non-commercial", "nd", "noderivs", "no-derivatives"]):
        return False

    # Allowed open licenses
    if any(k in l for k in ["public domain", "pd", "cc0", "cc-zero"]):
        return True
    if any(k in l for k in ["cc-by-sa", "cc by-sa", "cc_by_sa", "cc-by", "cc by", "cc_by"]):
        return True

    return False

def check_image_relevance(title: str, description: str) -> bool:
    """Checks if image title or description contains disqualifying keywords."""
    combined = (title + " " + description).lower()
    for kw in IRRELEVANT_KEYWORDS:
        # Check whole word match where possible
        if re.search(r"\b" + re.escape(kw) + r"\b", combined):
            return False
    return True

def search_wikimedia_commons(client: httpx.Client, query: str) -> List[Dict[str, Any]]:
    """
    Searches Wikimedia Commons API for images matching query with metadata.
    """
    params = {
        "action": "query",
        "generator": "search",
        "gsrsearch": query,
        "gsrnamespace": "6",  # File: namespace
        "gsrlimit": "15",
        "prop": "imageinfo",
        "iiprop": "url|size|mime|extmetadata",
        "format": "json"
    }
    
    try:
        response = client.get(COMMONS_API_URL, params=params, timeout=15.0)
        if response.status_code != 200:
            return []
        data = response.json()
        pages = data.get("query", {}).get("pages", {})
        return list(pages.values())
    except Exception as e:
        print(f"    [Error] Request failed for '{query}': {e}")
        return []

def filter_and_rank_images(pages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Filters images according to size, format, license, relevance, and ranks landscape first.
    """
    candidates = []

    for page in pages:
        imageinfo = page.get("imageinfo", [])
        if not imageinfo:
            continue
        info = imageinfo[0]

        # 1. Format check: JPG, PNG, WEBP
        mime = (info.get("mime") or "").lower()
        if mime not in ["image/jpeg", "image/png", "image/webp"]:
            continue

        # 2. Minimum width 1000 px
        width = info.get("width") or 0
        height = info.get("height") or 0
        if width < 1000:
            continue

        title = page.get("title", "")
        extmetadata = info.get("extmetadata", {})
        license_name = extmetadata.get("LicenseShortName", {}).get("value", "") or extmetadata.get("License", {}).get("value", "")
        description = clean_html(extmetadata.get("ImageDescription", {}).get("value", ""))

        # 3. License verification
        if not is_open_license(license_name):
            continue

        # 4. Relevance check
        if not check_image_relevance(title, description):
            continue

        # Author and license URL
        author_raw = extmetadata.get("Artist", {}).get("value", "") or extmetadata.get("Credit", {}).get("value", "")
        author = clean_html(author_raw) or "Wikimedia Commons contributor"
        license_url = extmetadata.get("LicenseUrl", {}).get("value", "")

        commons_url = info.get("descriptionurl") or f"https://commons.wikimedia.org/wiki/{title.replace(' ', '_')}"
        download_url = info.get("url")
        if not download_url:
            continue

        # Landscape preference score (width >= height)
        is_landscape = width >= height
        aspect_ratio = width / height if height > 0 else 1.0

        candidates.append({
            "title": title.replace("File:", "").strip(),
            "commons_url": commons_url,
            "download_url": download_url,
            "width": width,
            "height": height,
            "is_landscape": is_landscape,
            "aspect_ratio": aspect_ratio,
            "license": license_name,
            "license_url": license_url,
            "author": author,
            "description": description[:120] if description else "",
        })

    # Sort landscape images first, then by higher resolution
    candidates.sort(key=lambda x: (x["is_landscape"], x["width"]), reverse=True)
    return candidates

def download_and_process_image(client: httpx.Client, url: str, output_path: Path) -> bool:
    """
    Downloads an image, resizes longest side to 1600px with LANCZOS, compresses, and saves as JPEG.
    """
    try:
        resp = client.get(url, timeout=30.0)
        if resp.status_code != 200 or not resp.content:
            return False

        image = Image.open(io.BytesIO(resp.content))
        image.load()

        # Resize longest side to max 1600 px preserving aspect ratio
        max_dim = 1600
        if image.width > max_dim or image.height > max_dim:
            image.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)

        # Convert RGBA/P to RGB for clean JPEG saving
        if image.mode in ("RGBA", "P"):
            image = image.convert("RGB")
        elif image.mode != "RGB":
            image = image.convert("RGB")

        output_path.parent.mkdir(parents=True, exist_ok=True)
        image.save(output_path, format="JPEG", quality=85, optimize=True)
        return True
    except Exception as e:
        print(f"      [Error] Processing image from {url}: {e}")
        return False

def check_place_has_real_image(place: Dict[str, Any]) -> bool:
    """
    Checks whether a place already has a real image file on disk.
    Returns True if a real file exists on disk, False otherwise.
    """
    img_path = (place.get("image") or "").strip()
    if not img_path:
        return False

    # Check in backend uploads
    if img_path.startswith("/uploads/"):
        rel_sub = img_path.replace("/uploads/", "")
        local_upload = BACKEND_DIR / "uploads" / rel_sub
        if local_upload.exists() and local_upload.is_file():
            return True

    # Check in frontend public
    if img_path.startswith("/images/"):
        rel_sub = img_path.replace("/images/", "")
        local_pub = FRONTEND_PUBLIC_DIR / "images" / rel_sub
        if local_pub.exists() and local_pub.is_file():
            return True

    return False

def get_queries_for_place(place: Dict[str, Any]) -> List[str]:
    """Generates a list of search queries for a place."""
    place_id = place["id"]
    if place_id in SPECIFIC_QUERIES:
        return SPECIFIC_QUERIES[place_id]

    name = place.get("name_en", "")
    # Strip text inside parentheses
    cleaned_name = re.sub(r"\([^)]*\)", "", name).strip()

    queries = [
        f"{name} Rameswaram",
        f"{name} Ramanathapuram",
        f"{cleaned_name} Ramanathapuram",
        f"{cleaned_name} Tamil Nadu",
        cleaned_name
    ]
    # Remove duplicate strings while preserving order
    seen = set()
    result = []
    for q in queries:
        if q not in seen:
            seen.add(q)
            result.append(q)
    return result

def main():
    parser = argparse.ArgumentParser(description="Fetch place images from Wikimedia Commons")
    parser.add_argument("--force", type=str, default="", help="Specific place id to redo, or 'all' to redo all places")
    parser.add_argument("--dry-run", action="store_true", help="Search and report without downloading or saving")
    parser.add_argument("--delay", type=float, default=0.5, help="Delay between API requests in seconds (default 0.5s)")
    args = parser.parse_args()

    print("=" * 75)
    print("  SOLVANE - WIKIMEDIA COMMONS IMAGE FETCHER")
    print("=" * 75)
    print(f"Database: {DB_PATH}")
    print(f"Target Uploads Directory: {UPLOADS_DIR}")
    print(f"Credits File: {CREDITS_PATH}")
    if args.force:
        print(f"Force Mode: Redoing '{args.force}'")
    if args.dry_run:
        print("Dry Run: YES (no changes will be written)")
    print("-" * 75)

    if not DB_PATH.exists():
        print(f"Error: Database file not found at {DB_PATH}")
        sys.exit(1)

    # Connect to SQLite
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM places ORDER BY name_en ASC")
    places = [dict(row) for row in cursor.fetchall()]
    print(f"Loaded {len(places)} total places from SQLite database.")

    # Load existing credits
    existing_credits: Dict[str, List[Dict[str, Any]]] = {}
    if CREDITS_PATH.exists():
        try:
            with open(CREDITS_PATH, "r", encoding="utf-8") as f:
                existing_credits = json.load(f)
        except Exception:
            existing_credits = {}

    headers = {"User-Agent": USER_AGENT}
    client = httpx.Client(headers=headers, follow_redirects=True)

    report_successful: List[Dict[str, Any]] = []
    report_unfound: List[str] = []
    report_skipped: List[str] = []

    for idx, place in enumerate(places, 1):
        place_id = place["id"]
        place_name = place.get("name_en", place_id)

        # Check if place already has real images on disk
        has_real_image = check_place_has_real_image(place)
        is_force = (args.force == "all") or (args.force.lower() == place_id.lower())

        if has_real_image and not is_force:
            report_skipped.append(place_name)
            continue

        print(f"\n[{idx}/{len(places)}] Searching for '{place_name}' ({place_id})...")
        queries = get_queries_for_place(place)

        selected_candidates: List[Dict[str, Any]] = []
        seen_titles = set()

        for q in queries:
            time.sleep(args.delay)
            raw_pages = search_wikimedia_commons(client, q)
            ranked = filter_and_rank_images(raw_pages)

            for cand in ranked:
                if cand["title"] not in seen_titles:
                    seen_titles.add(cand["title"])
                    selected_candidates.append(cand)
                    if len(selected_candidates) >= 4:
                        break

            if len(selected_candidates) >= 4:
                break

        if not selected_candidates:
            print(f"  [-] No open-licensed photos found on Commons across {len(queries)} query variations.")
            report_unfound.append(place_name)
            continue

        print(f"  [+] Found {len(selected_candidates)} qualifying open-licensed photo(s):")
        for i, c in enumerate(selected_candidates, 1):
            landscape_tag = "Landscape" if c["is_landscape"] else "Portrait"
            print(f"    {i}. {c['title']} ({c['width']}x{c['height']}, {landscape_tag}) - [{c['license']}]")

        if args.dry_run:
            report_successful.append({
                "place_id": place_id,
                "name": place_name,
                "count": len(selected_candidates),
                "images": selected_candidates
            })
            continue

        # Download, resize, and save photos
        target_place_dir = UPLOADS_DIR / place_id
        target_place_dir.mkdir(parents=True, exist_ok=True)

        downloaded_files: List[str] = []
        place_credits: List[Dict[str, Any]] = []

        for c_idx, candidate in enumerate(selected_candidates, 1):
            file_name = f"{c_idx}.jpg"
            out_file = target_place_dir / file_name

            print(f"    -> Downloading #{c_idx}: {candidate['title'][:50]}...")
            success = download_and_process_image(client, candidate["download_url"], out_file)
            if success:
                rel_url = f"/uploads/places/{place_id}/{file_name}"
                downloaded_files.append(rel_url)
                place_credits.append({
                    "file_name": file_name,
                    "image_url": rel_url,
                    "title": candidate["title"],
                    "commons_url": candidate["commons_url"],
                    "author": candidate["author"],
                    "license": candidate["license"],
                    "license_url": candidate["license_url"]
                })
            time.sleep(args.delay)

        if not downloaded_files:
            print("  [-] Failed to download/process images.")
            report_unfound.append(place_name)
            continue

        main_img = downloaded_files[0]
        gallery_imgs = downloaded_files[1:]

        # Update SQLite database
        cursor.execute("""
            UPDATE places
            SET image = ?, gallery = ?
            WHERE id = ?
        """, (main_img, json.dumps(gallery_imgs), place_id))
        conn.commit()

        # Update credits map
        existing_credits[place_id] = place_credits

        report_successful.append({
            "place_id": place_id,
            "name": place_name,
            "count": len(downloaded_files),
            "images": place_credits
        })
        print(f"  [+] Updated database for '{place_name}': main + {len(gallery_imgs)} gallery photo(s).")

    # Save image_credits.json
    if not args.dry_run and report_successful:
        CREDITS_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(CREDITS_PATH, "w", encoding="utf-8") as f:
            json.dump(existing_credits, f, indent=2, ensure_ascii=False)
        print(f"\nAttribution metadata saved to {CREDITS_PATH}")

    conn.close()
    client.close()

    # =========================================================================
    # FINAL REPORT
    # =========================================================================
    print("\n" + "=" * 75)
    print("  FINAL EXECUTION REPORT")
    print("=" * 75)
    print(f"Places with existing images kept: {len(report_skipped)}")
    print(f"Places successfully enriched:    {len(report_successful)}")
    print(f"Places with no images found:     {len(report_unfound)}")
    print("-" * 75)

    if report_successful:
        print("\nSUCCESSFULLY ATTACHED IMAGES:")
        for item in report_successful:
            print(f"\n  * {item['name']} ({item['place_id']}) -- {item['count']} photo(s):")
            for c in item["images"]:
                print(f"      - {c['title']}")
                print(f"        Commons Page: {c['commons_url']}")
                print(f"        License:      {c['license']} | Author: {c['author']}")

    if report_unfound:
        print("\nNO COMMONS IMAGES FOUND (Left empty as requested):")
        for name in report_unfound:
            print(f"  * {name}")

    if report_skipped:
        print("\nSKIPPED (Already have real images on disk):")
        for name in report_skipped:
            print(f"  * {name}")

    print("\n" + "=" * 75)
    print("Execution complete.")

if __name__ == "__main__":
    main()
