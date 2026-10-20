import sqlite3
import os
import sys

def test_login_flow():
    from database import init_db, get_db_connection
    from fastapi.testclient import TestClient
    from main import app

    print("--- 1. Testing Database & login_logs table ---")
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='login_logs';")
    table = cursor.fetchone()
    assert table is not None, "'login_logs' table does not exist!"
    print("[PASS] 'login_logs' table exists.")

    client = TestClient(app)

    print("\n--- 2. Registering a test user for login testing ---")
    conn.execute("DELETE FROM users WHERE username = 'login_tester';")
    conn.execute("DELETE FROM login_logs;")
    conn.commit()

    signup_payload = {
        "username": "login_tester",
        "email": "tester@solvane.com",
        "password": "Password@2026",
        "confirm_password": "Password@2026"
    }
    client.post("/api/signup", json=signup_payload)
    print("[PASS] Test user 'login_tester' ready.")

    print("\n--- 3. Testing Login with Wrong Email ---")
    wrong_email_resp = client.post("/api/login", json={
        "email": "wrong@solvane.com",
        "password": "Password@2026"
    })
    assert wrong_email_resp.status_code == 401
    assert wrong_email_resp.json()["detail"] == "Invalid email or password"
    print("[PASS] Wrong email rejected with generic message.")

    print("\n--- 4. Testing Login with Wrong Password ---")
    wrong_pw_resp = client.post("/api/login", json={
        "email": "tester@solvane.com",
        "password": "WrongPassword@2026"
    })
    assert wrong_pw_resp.status_code == 401
    assert wrong_pw_resp.json()["detail"] == "Invalid email or password"
    print("[PASS] Wrong password rejected with generic message.")

    # Check that failed attempts were recorded in login_logs
    cursor.execute("SELECT * FROM login_logs WHERE success = 0;")
    failed_logs = cursor.fetchall()
    assert len(failed_logs) == 2, f"Expected 2 failed logs, found {len(failed_logs)}"
    print(f"[PASS] 2 failed attempts recorded in login_logs.")

    print("\n--- 5. Testing Successful Login ---")
    success_resp = client.post("/api/login", json={
        "email": "tester@solvane.com",
        "password": "Password@2026"
    })
    assert success_resp.status_code == 200
    data = success_resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["username"] == "login_tester"
    assert data["user"]["email"] == "tester@solvane.com"
    assert "password_hash" not in data
    token = data["access_token"]
    print("[PASS] Login successful, JWT token and user info received.")

    # Check success log and updated last_login
    cursor.execute("SELECT * FROM login_logs WHERE success = 1;")
    success_logs = cursor.fetchall()
    assert len(success_logs) == 1
    cursor.execute("SELECT last_login FROM users WHERE username = 'login_tester';")
    user_row = cursor.fetchone()
    assert user_row["last_login"] is not None
    print("[PASS] Successful login logged and users.last_login updated.")

    print("\n--- 6. Testing GET /api/me with Bearer Token ---")
    me_resp = client.get("/api/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["username"] == "login_tester"
    assert me_data["email"] == "tester@solvane.com"
    assert "password_hash" not in me_data
    print("[PASS] /api/me successfully returned authenticated profile.")

    print("\n--- 7. Testing GET /api/me with Invalid Token ---")
    bad_me_resp = client.get("/api/me", headers={"Authorization": "Bearer invalid_token_123"})
    assert bad_me_resp.status_code == 401
    print("[PASS] Invalid token rejected with HTTP 401.")

    conn.close()
    print("\n==============================================")
    print("ALL BACKEND LOGIN & JWT TESTS PASSED 100%!")
    print("==============================================")

if __name__ == "__main__":
    test_login_flow()
