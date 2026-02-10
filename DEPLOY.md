# Deploy FORGE on Render

1. **Connect GitHub**  
   At [dashboard.render.com](https://dashboard.render.com), connect the repo `20125A0511/FORGE` (or your fork).

2. **Create from Blueprint**  
   - New → Blueprint.  
   - Connect the repo and use the `render.yaml` in the root.  
   - Render will create:
     - PostgreSQL database: `forge-db`
     - Web service: `forge-backend` (Python/FastAPI)
     - Web service: `forge-frontend` (Next.js)

3. **Backend env (forge-backend)**  
   In the backend service → Environment, add (Blueprint already sets `DATABASE_URL`, `DATABASE_URL_SYNC`, `SECRET_KEY`, `PYTHON_VERSION`):

   | Key | Value |
   |-----|--------|
   | `FRONTEND_BASE_URL` | Your frontend URL, e.g. `https://forge-frontend.onrender.com` |
   | `CORS_ORIGINS` | Same URL, e.g. `https://forge-frontend.onrender.com` (comma-separated if multiple) |
   | `ANTHROPIC_API_KEY` | Your Anthropic API key (for chat/tickets) |
   | `TWILIO_ACCOUNT_SID` | (optional) For SMS |
   | `TWILIO_AUTH_TOKEN` | (optional) For SMS |
   | `TWILIO_PHONE_NUMBER` | (optional) E.g. `+15551234567` |

4. **Frontend env (forge-frontend)**  
   In the frontend service → Environment, set:

   | Key | Value |
   |-----|--------|
   | `NEXT_PUBLIC_API_URL` | Backend API base URL including `/api`, e.g. `https://forge-backend.onrender.com/api` |

   Use your actual backend URL from the Render dashboard (e.g. `https://forge-backend-xxxx.onrender.com/api`).

5. **Database tables**  
   Tables are created automatically when the backend starts (via `init_db()`). To seed demo data, run once from your machine (with `DATABASE_URL` set to the Render Postgres URL from the dashboard):

   ```bash
   cd backend && pip install -r requirements.txt && python seed_data.py
   ```

   Or use a Render one-off job / shell with the same env and run `python seed_data.py` from the `backend` directory.

6. **Deploy**  
   Deploy backend first, then frontend. After both are live, open the frontend URL and (if you seeded) log in and test.

## Notes

- Backend converts Render’s `postgresql://` URLs to `postgresql+asyncpg` / `postgresql+psycopg2` automatically.
- Free tier services spin down after inactivity; first request may be slow.
- Keep `SECRET_KEY` and API keys secret; use Render’s environment (or secret files), not the repo.
