# Deploy FORGE on Render — Step by Step

Use **Web Service** for both the backend and the frontend (not Static). Static is for plain HTML/CSS/JS; FORGE backend is a Python server and the frontend is a Next.js app that runs with `npm run start`.

---

## Part 1: Connect GitHub and create from Blueprint

1. Go to **[dashboard.render.com](https://dashboard.render.com)** and sign in (use “Sign in with GitHub” if needed).

2. **Connect the repo** (if not already):
   - **Account Settings** (or **Dashboard**) → **Connect account** / **GitHub**.
   - Authorize Render and choose the account/org that has the repo.
   - Make sure the repo **FORGE** (`20125A0511/FORGE`) is available to Render.

3. **Create a Blueprint**:
   - Click **New +** → **Blueprint**.
   - Connect the repository: select **GitHub** and choose **20125A0511/FORGE** (branch: **main**).
   - Render will detect `render.yaml` in the root and show a preview of what it will create:
     - 1 **PostgreSQL** database: `forge-db`
     - 2 **Web Services**: `forge-backend`, `forge-frontend`
   - Click **Apply** (or **Create resources**).

4. **Confirm deployment type** (Blueprint already sets this; you’re just verifying):
   - **forge-db**: PostgreSQL database (no type to choose).
   - **forge-backend**: **Web Service** (Python).
   - **forge-frontend**: **Web Service** (Node).
   - Do **not** choose “Static Site” for the frontend; Next.js here runs as a web service.

5. Wait for the first deploy. The **backend** may fail the first time if the database isn’t ready; you can **Manual Deploy** again after a minute.

---

## Part 2: Set environment variables

### Backend (forge-backend)

1. In the Render dashboard, open the **forge-backend** service.
2. Go to **Environment**.
3. The Blueprint already adds: `DATABASE_URL`, `DATABASE_URL_SYNC`, `SECRET_KEY`, `PYTHON_VERSION`.
4. **Add** these (use **Add Environment Variable**):

   | Key | Value |
   |-----|--------|
   | `FRONTEND_BASE_URL` | `https://forge-frontend.onrender.com` (or your real frontend URL from Render) |
   | `CORS_ORIGINS` | Same as above, e.g. `https://forge-frontend.onrender.com` |
   | `ANTHROPIC_API_KEY` | Your Anthropic API key |

   Optional (for SMS):

   | Key | Value |
   |-----|--------|
   | `TWILIO_ACCOUNT_SID` | Your Twilio SID |
   | `TWILIO_AUTH_TOKEN` | Your Twilio token |
   | `TWILIO_PHONE_NUMBER` | E.g. `+15551234567` |

5. **Save Changes**. Render will redeploy the backend.

### Frontend (forge-frontend)

1. Open the **forge-frontend** service.
2. Go to **Environment**.
3. **Add**:

   | Key | Value |
   |-----|--------|
   | `NEXT_PUBLIC_API_URL` | Backend URL **including `/api`**, e.g. `https://forge-backend.onrender.com/api` |

   Get the backend URL from the **forge-backend** service page (e.g. `https://forge-backend-xxxx.onrender.com`) and add `/api` at the end.

4. **Save Changes**. Render will redeploy the frontend.

---

## Part 3: Deploy order and checks

1. **Deploy backend first**: Open **forge-backend** → **Manual Deploy** → **Deploy latest commit** (or wait for auto deploy). Wait until status is **Live**.
2. **Deploy frontend**: Open **forge-frontend** → **Manual Deploy** if needed. Wait until **Live**.
3. **Test**: Open the frontend URL (e.g. `https://forge-frontend.onrender.com`). Tables are created automatically when the backend starts.

---

## Part 4: (Optional) Seed demo data

To load sample customers, workers, and tickets:

1. In Render, open **forge-db** and copy the **Internal Database URL** (or **External** if you run from your machine).
2. On your **local machine** (with Python and the repo):

   ```bash
   cd backend
   export DATABASE_URL="postgresql://..."   # paste the Render URL
   export DATABASE_URL_SYNC="$DATABASE_URL"
   pip install -r requirements.txt
   python seed_data.py
   ```

   Use the same URL for both variables. The app will convert them for async/sync drivers.

---

## Summary: What to select

| Resource | Type to use | Why |
|----------|-------------|-----|
| forge-db | PostgreSQL | Database only. |
| forge-backend | **Web Service** | FastAPI runs a long-lived server. |
| forge-frontend | **Web Service** | Next.js runs with `npm run start` (Node server). |

Do **not** choose **Static Site** for the frontend; that’s for static HTML/JS/CSS only.

---

## Notes

- Free tier services **spin down** after inactivity; the first request can take 30–60 seconds.
- Backend converts Render’s `postgresql://` to `postgresql+asyncpg` / `postgresql+psycopg2` automatically.
- Keep `SECRET_KEY` and API keys only in Render’s Environment; don’t commit them.
