import sqlite3
import os
import sys

# Test script for Solvane Backend Signup
def test_backend_signup():
    from database import init_db, get_user_by_username, get_user_by_email, get_db_connection
    from fastapi.testclient import TestClient
    from main import app

    print("--- 1. Testing Database Initialization ---")
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users';")
    table = cursor.fetchone()
    assert table is not None, "Table 'users' was not created!"
    print("[PASS] 'users' table exists.")
    conn.close()

    client = TestClient(app)

    print("\n--- 2. Testing Health Check Endpoint ---")
    health_resp = client.get("/api/health")
    assert health_resp.status_code == 200, f"Health check failed: {health_resp.text}"
    print("[PASS] Health endpoint returned HTTP 200.")

    print("\n--- 3. Testing Valid User Signup ---")
    # Clean any previous test user
    conn = get_db_connection()
    conn.execute("DELETE FROM users WHERE username IN ('test_user', 'ramesh_24');")
    conn.commit()
    conn.close()

    signup_payload = {
        "username": "ramesh_24",
        "email": "ramesh@example.com",
        "password": "Password@123",
        "confirm_password": "Password@123"
    }
    signup_resp = client.post("/api/signup", json=signup_payload)
    assert signup_resp.status_code == 201, f"Signup failed: {signup_resp.text}"
    data = signup_resp.json()
    assert data["username"] == "ramesh_24"
    assert data["email"] == "ramesh@example.com"
    assert "password" not in data
    assert "password_hash" not in data
    print("[PASS] User signup succeeded with HTTP 201.")

    # Verify password hash in SQLite
    user = get_user_by_username("ramesh_24")
    assert user is not None
    assert user["password_hash"].startswith("$2b$"), "Password was not hashed with bcrypt!"
    assert user["password_hash"] != "Password@123", "Plain text password was stored!"
    print("[PASS] Password is securely hashed with bcrypt in the database.")

    print("\n--- 4. Testing Duplicate Username Check ---")
    dup_user_payload = {
        "username": "ramesh_24",
        "email": "another@example.com",
        "password": "Password@123",
        "confirm_password": "Password@123"
    }
    dup_resp = client.post("/api/signup", json=dup_user_payload)
    assert dup_resp.status_code == 400
    assert "already taken" in dup_resp.json()["detail"].lower()
    print("[PASS] Duplicate username correctly rejected with HTTP 400.")

    print("\n--- 5. Testing Duplicate Email Check ---")
    dup_email_payload = {
        "username": "new_user_99",
        "email": "ramesh@example.com",
        "password": "Password@123",
        "confirm_password": "Password@123"
    }
    dup_email_resp = client.post("/api/signup", json=dup_email_payload)
    assert dup_email_resp.status_code == 400
    assert "already registered" in dup_email_resp.json()["detail"].lower()
    print("[PASS] Duplicate email correctly rejected with HTTP 400.")

    print("\n--- 6. Testing Mismatched Passwords ---")
    mismatch_payload = {
        "username": "valid_user",
        "email": "valid@example.com",
        "password": "Password@123",
        "confirm_password": "WrongPassword@123"
    }
    mismatch_resp = client.post("/api/signup", json=mismatch_payload)
    assert mismatch_resp.status_code == 400
    assert "do not match" in mismatch_resp.json()["detail"].lower()
    print("[PASS] Mismatched passwords correctly rejected with HTTP 400.")

    print("\n--- 7. Testing Weak Password (missing special character) ---")
    weak_payload = {
        "username": "valid_user",
        "email": "valid@example.com",
        "password": "Password123",
        "confirm_password": "Password123"
    }
    weak_resp = client.post("/api/signup", json=weak_payload)
    assert weak_resp.status_code == 400
    assert "special character" in weak_resp.json()["detail"].lower()
    print("[PASS] Weak password correctly rejected with HTTP 400.")

    print("\n==============================================")
    print("ALL BACKEND SIGNUP TESTS PASSED WITH 100% SUCCESS!")
    print("==============================================")

if __name__ == "__main__":
    test_backend_signup()
