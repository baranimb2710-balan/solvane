# Solvane Backend (FastAPI) 🚀

Backend API for **Solvane - AI Tourist Guide for Ramanathapuram District**.

---

## 🛠️ Requirements
- Python 3.10+ installed
- Dependencies listed in `requirements.txt`:
  - `fastapi`
  - `uvicorn`
  - `bcrypt`
  - `python-dotenv`
  - `email-validator`

---

## 🏃 Step-by-Step Run Instructions

### Step 1: Open Terminal and Navigate to `backend/`
```bash
cd backend
```

### Step 2: Create a Python Virtual Environment
```bash
python -m venv .venv
```

### Step 3: Activate the Virtual Environment
- **On Windows (PowerShell):**
  ```powershell
  .\.venv\Scripts\Activate.ps1
  ```
  *(If script execution is disabled in PowerShell, you can run: `.\.venv\Scripts\activate.bat` in CMD, or call `.\.venv\Scripts\python` directly).*

- **On macOS / Linux:**
  ```bash
  source .venv/bin/activate
  ```

### Step 4: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 5: Start the FastAPI Server
```bash
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

The server will start at:
👉 **`http://127.0.0.1:8000`**

---

## 🧪 How to Test Using FastAPI's Interactive `/docs` Page

FastAPI provides an automatic, interactive API testing UI powered by Swagger:

1. Open your browser and go to:
   👉 **`http://127.0.0.1:8000/docs`**

2. **Test Health Route:**
   - Click on `GET /api/health`
   - Click **"Try it out"** -> **"Execute"**
   - You should see HTTP 200 with `{"status": "healthy", ...}`

3. **Test Signup Route:**
   - Click on `POST /api/signup`
   - Click **"Try it out"**
   - Paste a sample JSON payload into the request body:
     ```json
     {
       "username": "ramesh_24",
       "email": "ramesh@example.com",
       "password": "Password@123",
       "confirm_password": "Password@123"
     }
     ```
   - Click **"Execute"**
   - **Expected Success:** HTTP 201 Created with:
     ```json
     {
       "message": "User registered successfully",
       "user_id": 1,
       "username": "ramesh_24",
       "email": "ramesh@example.com"
     }
     ```

4. **Test Validation & Duplicate Checks:**
   - Click **"Execute"** again with the same data:
     - Notice HTTP 400 Bad Request: `"Username is already taken. Please choose another username."`
   - Try a weak password (e.g., `test123`):
     - Notice HTTP 400 Bad Request explaining the missing uppercase or special character rules.
   - Try mismatched confirm password:
     - Notice HTTP 400 Bad Request: `"Password and confirm password do not match."`

---

## 🗄️ Database
- SQLite database file is created automatically at `backend/solvane.db` on first run.
- It contains the `users` table:
  - `user_id` (auto integer)
  - `username` (unique text)
  - `email` (unique text)
  - `password_hash` (bcrypt hash string)
  - `created_at` (timestamp)
  - `last_login` (nullable timestamp)
- The database file is ignored in `.gitignore` so your local credentials remain secure.
