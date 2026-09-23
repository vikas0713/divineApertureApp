# Divine Aperture Studio

Editorial photography delivery app for Divine Aperture Studio.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

The app has a demo mode when Supabase variables are not configured. This keeps the visual/product work usable before external credentials are available.

## FastAPI backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

The backend exposes `/api/health`, `/api/waitlist`, and the authenticated `/api/admin/drive/import` boundary. The Drive importer and R2 worker will use this boundary once provider credentials are configured.

## Current slice

- Editorial client gallery shell inspired by `wndws.space`
- Single superadmin / creator workspace
- Google login integration point through Supabase Auth
- Client gallery login state
- Google Drive folder import UI and refresh state
- Creator waitlist form
- Free-tier ad placement flag
- Consent-aware GA4 integration point
- Supabase schema in `supabase/migrations/001_initial_schema.sql`

## External setup

Configure Google OAuth and redirect URLs in Supabase, then set the environment variables from `.env.example`. Keep secrets out of Git.
