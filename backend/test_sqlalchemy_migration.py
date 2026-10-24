"""
Comprehensive Test Script for SQLAlchemy 2.0 Migration
Tests signup, login, places, planner, saved plans, admin dashboard, and chat audit logging
against the local SQLite database.
"""

import sys
from pathlib import Path
from datetime import datetime
import json
import uuid

# Ensure backend directory is in python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))
sys.stdout.reconfigure(encoding="utf-8")

from database import (
    engine,
    init_db,
    get_user_by_email,
    get_user_by_username,
    get_user_by_id,
    create_user,
    update_last_login,
    record_login_log,
    get_all_places_db,
    get_place_by_id_db,
    create_place_db,
    update_place_db,
    delete_place_db,
    log_chat_question,
    get_cached_plan_narration,
    save_plan_narration,
    count_user_saved_plans,
    save_user_plan,
    get_user_saved_plans,
    get_user_saved_plan_by_id,
    delete_user_saved_plan_by_id,
    get_admin_dashboard_stats,
    get_admin_users_list,
    get_admin_login_logs_list,
    get_admin_chat_logs_list,
    get_admin_all_users_for_export,
    get_admin_all_login_logs_for_export,
)
from main import app, create_access_token
from planner import generate_itinerary
import bcrypt

def run_tests():
    passed = []
    failed = []

    print("==================================================")
    print(f"RUNNING DATABASE TESTS ON ENGINE: {engine.dialect.name}")
    print("==================================================")

    # 1. Startup & Init DB
    try:
        init_db()
        passed.append("init_db() table creation & admin sync")
    except Exception as e:
        failed.append(f"init_db() failed: {e}")

    # 2. Signup / Create User
    test_uname = f"sqla_test_{uuid.uuid4().hex[:6]}"
    test_email = f"{test_uname}@solvane.test"
    test_pass = "TestPass123"
    salt = bcrypt.gensalt()
    pass_hash = bcrypt.hashpw(test_pass.encode("utf-8"), salt).decode("utf-8")

    new_user_id = None
    try:
        new_user_id = create_user(test_uname, test_email, pass_hash)
        if new_user_id and new_user_id > 0:
            passed.append(f"create_user() created user ID {new_user_id}")
        else:
            failed.append("create_user() did not return valid user ID")
    except Exception as e:
        failed.append(f"create_user() failed: {e}")

    # 3. Lookup user by username and email
    try:
        user_by_name = get_user_by_username(test_uname)
        user_by_em = get_user_by_email(test_email)
        user_by_i = get_user_by_id(new_user_id)

        if user_by_name and user_by_em and user_by_i:
            if user_by_name["user_id"] == new_user_id and user_by_em["email"] == test_email.lower():
                passed.append("get_user_by_username(), get_user_by_email(), get_user_by_id()")
            else:
                failed.append("User lookup returned mismatched data")
        else:
            failed.append("User lookup returned None")
    except Exception as e:
        failed.append(f"User lookups failed: {e}")

    # 4. Login flow & password check
    try:
        u = get_user_by_email(test_email)
        valid = bcrypt.checkpw(test_pass.encode("utf-8"), u["password_hash"].encode("utf-8"))
        if valid:
            update_last_login(new_user_id)
            record_login_log(test_email, True, new_user_id)
            passed.append("Login verification, update_last_login(), and record_login_log(success=True)")
        else:
            failed.append("Password verification failed")
    except Exception as e:
        failed.append(f"Login flow failed: {e}")

    # 5. Places API queries
    try:
        all_places = get_all_places_db()
        if len(all_places) >= 24:
            passed.append(f"get_all_places_db() returned {len(all_places)} places")
        else:
            failed.append(f"Expected at least 24 places, got {len(all_places)}")

        # Category filter
        temples = get_all_places_db(category="temple")
        if len(temples) > 0 and all(p["category"] == "temple" for p in temples):
            passed.append(f"get_all_places_db(category='temple') returned {len(temples)} temples")
        else:
            failed.append("Category filtering on places failed")

        # Single place lookup
        single = get_place_by_id_db("ramanathaswamy-temple")
        if single and "name_en" in single and single["id"] == "ramanathaswamy-temple":
            # Verify JSON parsed properly
            if isinstance(single["gallery"], list) and isinstance(single["tips"], list):
                passed.append("get_place_by_id_db() with verified JSON parsing")
            else:
                failed.append("Place JSON fields were not parsed into lists")
        else:
            failed.append("get_place_by_id_db() failed for ramanathaswamy-temple")
    except Exception as e:
        failed.append(f"Places queries failed: {e}")

    # 6. Plan generation
    try:
        plan = generate_itinerary(
            all_places=get_all_places_db(),
            user_budget=10000,
            days_input=2,
            travelling_with="family",
            interests=["temple", "beach"],
            selected_place_ids=[],
            travellers={"adults": 2, "children": 1, "seniors": 0}
        )
        if plan and "days" in plan and len(plan["days"]) == 2 and "budget" in plan:
            passed.append("generate_itinerary() generated 2-day family plan")
        else:
            failed.append("generate_itinerary() output structure invalid")
    except Exception as e:
        failed.append(f"generate_itinerary() failed: {e}")

    # 7. Saved plans (Create, List, Retrieve, Delete)
    test_plan_id = f"plan_{uuid.uuid4().hex[:8]}"
    try:
        # Check count before
        cnt_before = count_user_saved_plans(new_user_id)
        
        # Save plan
        trip_metadata = {"budget": 10000, "days": 2, "travellingWith": "family"}
        save_success = save_user_plan(
            plan_id=test_plan_id,
            user_id=new_user_id,
            title="2-day Family Trip, ₹10,000",
            trip=trip_metadata,
            plan=plan,
            narration={"overview": "Test narration overview"}
        )
        cnt_after = count_user_saved_plans(new_user_id)
        if save_success and cnt_after == cnt_before + 1:
            passed.append(f"save_user_plan() and count_user_saved_plans() ({cnt_after})")
        else:
            failed.append("save_user_plan() count mismatch")

        # Get list
        user_plans = get_user_saved_plans(new_user_id)
        if len(user_plans) >= 1 and user_plans[0]["plan_id"] == test_plan_id:
            passed.append("get_user_saved_plans() retrieved saved itinerary list")
        else:
            failed.append("get_user_saved_plans() failed")

        # Get single
        single_plan = get_user_saved_plan_by_id(test_plan_id, new_user_id)
        if single_plan and single_plan["title"] == "2-day Family Trip, ₹10,000":
            passed.append("get_user_saved_plan_by_id() retrieved single saved plan")
        else:
            failed.append("get_user_saved_plan_by_id() failed")

        # Other user cannot access it
        diff_user_access = get_user_saved_plan_by_id(test_plan_id, 999999)
        if diff_user_access is None:
            passed.append("Security: foreign user blocked from saved plan (isolation confirmed)")
        else:
            failed.append("Security breach: foreign user accessed saved plan")

        # Delete plan
        deleted = delete_user_saved_plan_by_id(test_plan_id, new_user_id)
        if deleted and count_user_saved_plans(new_user_id) == cnt_before:
            passed.append("delete_user_saved_plan_by_id() deleted test plan")
        else:
            failed.append("delete_user_saved_plan_by_id() failed")
    except Exception as e:
        failed.append(f"Saved plans tests failed: {e}")

    # 8. Plan Narration caching
    try:
        test_hash = "abc123hash"
        narration_data = {"overview": "Great trip to Rameswaram", "days": []}
        save_plan_narration(new_user_id, test_hash, narration_data)
        cached = get_cached_plan_narration(new_user_id, test_hash)
        if cached and cached.get("overview") == "Great trip to Rameswaram":
            passed.append("save_plan_narration() and get_cached_plan_narration()")
        else:
            failed.append("Plan narration cache retrieval failed")
    except Exception as e:
        failed.append(f"Plan narration cache test failed: {e}")

    # 9. Chat log question
    try:
        log_chat_question(new_user_id, "What are the timings for Agni Theertham?")
        chat_logs, c_total = get_admin_chat_logs_list(page=1, limit=5)
        if c_total > 0 and any(c["user_id"] == new_user_id for c in chat_logs):
            passed.append("log_chat_question() and get_admin_chat_logs_list()")
        else:
            failed.append("log_chat_question() failed to log or retrieve question")
    except Exception as e:
        failed.append(f"Chat logs test failed: {e}")

    # 10. Admin Dashboard stats & lists
    try:
        stats = get_admin_dashboard_stats()
        if (
            "total_users" in stats
            and "new_users_7d" in stats
            and "total_logins" in stats
            and "total_saved_plans" in stats
            and "total_chat_questions" in stats
        ):
            passed.append(f"get_admin_dashboard_stats(): {stats}")
        else:
            failed.append("get_admin_dashboard_stats() missing keys")

        # Admin users list
        users_list, u_total = get_admin_users_list(page=1, limit=10)
        if u_total >= 1 and len(users_list) >= 1:
            # Ensure password hash is NEVER leaked
            if not any("password_hash" in u for u in users_list):
                passed.append(f"get_admin_users_list() ({u_total} users) safely without password hashes")
            else:
                failed.append("Security leak: password_hash found in admin users list")
        else:
            failed.append("get_admin_users_list() failed")

        # Admin login logs list
        login_logs, l_total = get_admin_login_logs_list(page=1, limit=10)
        if l_total >= 1 and len(login_logs) >= 1:
            passed.append(f"get_admin_login_logs_list() ({l_total} logs)")
        else:
            failed.append("get_admin_login_logs_list() failed")

        # CSV export lists
        u_export = get_admin_all_users_for_export()
        l_export = get_admin_all_login_logs_for_export()
        if len(u_export) >= 1 and len(l_export) >= 1:
            passed.append(f"CSV exports: {len(u_export)} users, {len(l_export)} login logs")
        else:
            failed.append("CSV export lists returned empty")
    except Exception as e:
        failed.append(f"Admin queries failed: {e}")

    print("\n================ TEST RESULTS ================")
    print(f"PASSED: {len(passed)}")
    for p in passed:
        print(f"  ✓ {p}")

    print(f"\nFAILED: {len(failed)}")
    for f in failed:
        print(f"  ✗ {f}")
    print("==============================================")

    return len(failed) == 0

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
