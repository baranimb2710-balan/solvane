# Solvane 🧭
> **College Hackathon Project:** AI Tourist Guide for Ramanathapuram District, Tamil Nadu (Rameswaram, Dhanushkodi, Pamban Bridge, etc.)

---

## 🏗️ Architecture & Features Overview

- **Frontend:** React + Vite + Tailwind CSS (`frontend/`) on port `5173`.
- **Backend:** Python FastAPI (`backend/`) on port `8000`.
- **Database:** SQLite (`backend/solvane.db`) with tables:
  - `users`: `user_id`, `username`, `email`, `password_hash`, `created_at`, `last_login`
  - `login_logs`: `log_id`, `user_id`, `login_time`, `success`, `email_attempted`
- **Security:**
  - Password hashing with **bcrypt**.
  - 24-hour **JWT access tokens**.
  - Route Guards: `ProtectedRoute` & `PublicOnlyRoute`.
- **Trip State Management:**
  - `TripContext` (React Context) synced with `localStorage` (`Solvane_trip`).
  - Structure: `{ budget, days, travellingWith, interests }`.

---

## 🗺️ Current Routes

| Route | Type | Description |
| :--- | :--- | :--- |
| **`/`** | Public | Welcome page with full-screen background slideshow and "Get Started" button. |
| **`/login`** | Public Only | Email & Password login with Show/Hide toggle, backend verification, and redirect to `/budget`. (Redirects to `/budget` if already logged in). |
| **`/signup`** | Public Only | Account creation with live password checklist. (Redirects to `/budget` if already logged in). |
| **`/budget`** | **Protected** | **Real Budget Page**: Formatted amount display in Indian rupees (`₹5,000`), dynamic category pill (Budget / Comfortable / Premium), range slider (₹1k–₹50k, step ₹500), quick-select chips, exact amount input (validation: ₹1k–₹1,00,000), pre-fills previous selection, and "Continue" button navigating to `/time`. |
| **`/time`** | **Protected** | Placeholder travel duration page showing saved budget and a back button to `/budget`. |

---

## 🚀 How to Run Frontend & Backend Together

Run backend and frontend in **two separate terminal windows**:

### Terminal 1: Backend (FastAPI)
```bash
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```
*(Runs at `http://127.0.0.1:8000` — interactive docs at `http://127.0.0.1:8000/docs`)*

### Terminal 2: Frontend (React + Vite)
```bash
cd frontend
npm run dev
```
*(Runs at `http://localhost:5173`)*

---

## 🧪 How to Test the Budget Page in Your Browser

1. **Log in:**
   - Go to `http://localhost:5173/login`.
   - Log in with your registered account (e.g. `tester@solvane.com` / `Password@2026` or `karthik@example.com` / `Ramanathapuram@2026`).
   - You will be automatically redirected to **`/budget`**.

2. **Verify Greeting & Header:**
   - Notice the greeting: **`Vanakkam, <username>!`**
   - Subtitle: **`Tell us your total trip budget and we will plan accordingly.`**
   - Top bar: Shows the **SOLVANE** logo and a visible **Logout** button.

3. **Test Large Indian Comma Formatting:**
   - Check the large amount: e.g. **`₹5,000`** with Indian number formatting.

4. **Test Dynamic Category Labels:**
   - Select or type an amount under ₹3,000 (e.g., ₹2,000) → Badge shows: **`✨ Budget trip`**.
   - Select or type an amount between ₹3,000 and ₹10,000 (e.g., ₹5,000) → Badge shows: **`✨ Comfortable trip`**.
   - Select or type an amount above ₹10,000 (e.g., ₹20,000) → Badge shows: **`✨ Premium trip`**.

5. **Test Quick-Select Chips:**
   - Click any chip: **`₹2,000`**, **`₹5,000`**, **`₹10,000`**, **`₹20,000`**, or **`₹50,000`**.
   - Notice the slider, display, and text input update immediately.

6. **Test Range Slider:**
   - Drag the slider between ₹1,000 and ₹50,000 (moves in steps of ₹500).
   - The large display and text input stay perfectly in sync.

7. **Test Exact Amount Input & Validation:**
   - Type letters (e.g., `abc`) → shows error: **`⚠️ Please enter numbers only.`**
   - Type `< 1000` (e.g., `500`) → shows error: **`⚠️ Minimum trip budget is ₹1,000.`**
   - Type `> 100000` (e.g., `150000`) → shows error: **`⚠️ Maximum trip budget is ₹1,00,000.`**
   - While an error is present, the **Continue** button is automatically disabled.

8. **Test State Persistence & Navigation:**
   - Choose a budget (e.g., `₹12,500`).
   - Click **"Continue to Travel Duration →"**:
     - Navigates to **`/time`** (`"Time page is coming soon"`).
     - Confirms your saved budget is `₹12,500`.
   - Refresh the page (or click "Back to Budget Page"):
     - Notice your chosen budget `₹12,500` is **pre-filled** and restored from `localStorage` (`Solvane_trip`)!
