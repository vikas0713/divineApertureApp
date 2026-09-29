# Divine Aperture Studio

Creator-to-customer photo-sharing platform for Divine Aperture Studio.

## Repository layout

```text
backend/    FastAPI application — routes, schemas, Supabase clients, tests
frontend/   React + TypeScript + Vite application
supabase/   Postgres migrations, RLS policies, local CLI config
docs/       Product, architecture, cost, and decision records
```

`start-backend` and `start-frontend` at the root boot each side.

## Local setup

### Database

```bash
supabase start
supabase db reset
```

`db reset` applies every migration from the baseline. See
[supabase/README.md](supabase/README.md) for the one-time superadmin bootstrap —
the account is created by hand in the Supabase dashboard and its password is
never committed.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
cd .. && ./start-frontend
```

The app runs in demo mode when the Supabase variables are absent, which keeps
visual and product work usable before credentials exist.

### Backend

```bash
cp backend/.env.example backend/.env   # fill in from `supabase status`
./start-backend
```

`start-backend` creates the virtualenv and installs dependencies on first run.
The API exposes `/api/health`, `/api/waitlist`, and the authenticated
`/api/admin/*` boundary.

## Tests

```bash
cd frontend && npm run build     # tsc -b + vite build
cd backend  && .venv/bin/pytest
```

## Documentation

| Document | Covers |
|---|---|
| [docs/PRODUCT.md](docs/PRODUCT.md) | Product scope and photographer workflow |
| [docs/PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md) | Current state, assumptions, open decisions |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design and delivery phases |
| [docs/DECISIONS.md](docs/DECISIONS.md) | ADRs and unresolved questions |
| [docs/GOOGLE_DRIVE_IMPORT.md](docs/GOOGLE_DRIVE_IMPORT.md) | Drive import design |
| [docs/CSS_DESIGN.md](docs/CSS_DESIGN.md) | Visual system and theme tokens |
| [docs/COST_MODEL.md](docs/COST_MODEL.md) | Cost and deployment model |
| [docs/TEST_MODE.md](docs/TEST_MODE.md) | Single-account test mode |
| [docs/MONETIZATION.md](docs/MONETIZATION.md) | Monetization and advertising |
| [docs/ANALYTICS.md](docs/ANALYTICS.md) | GA4 and consent |
| [docs/WAITLIST.md](docs/WAITLIST.md) | Creator waitlist |
| [docs/CLIENT_DESIGN_DIRECTION.md](docs/CLIENT_DESIGN_DIRECTION.md) | Client gallery design direction |

## External setup

Configure Google OAuth and redirect URLs in Supabase, then set the environment
variables from `frontend/.env.example` and `backend/.env.example`. Keep secrets
out of Git.

## Deployment

The production frontend is hosted on Cloudflare Pages and the API is deployed
to FastAPI Cloud. The commands below assume you are authenticated to both
providers and are running from the repository root.

### Supabase migrations

Link the repository to the intended hosted project, then apply pending
migrations:

```bash
supabase link --project-ref <supabase-project-ref>
supabase db push
```

### FastAPI Cloud backend

Install the backend dependencies, configure environment variables in FastAPI
Cloud, and deploy from the `backend/` directory:

```bash
cd backend
python3 -m venv .venv
.venv/bin/python -m pip install -e '.[dev]'

.venv/bin/fastapi cloud env set SUPABASE_URL "https://<project-ref>.supabase.co"
.venv/bin/fastapi cloud env set SUPABASE_PUBLISHABLE_KEY "<publishable-key>"
.venv/bin/fastapi cloud env set --secret SUPABASE_SECRET_KEY "<server-only-key>"
.venv/bin/fastapi cloud env set --secret GOOGLE_SERVICE_ACCOUNT_B64 "<base64-service-account-json>"
.venv/bin/fastapi cloud env set SUPERADMIN_EMAIL "<superadmin-email>"
.venv/bin/fastapi cloud env set SUPERADMIN_STUDIO_ID "<studio-uuid>"
.venv/bin/fastapi cloud env set FRONTEND_ORIGINS "https://<pages-project>.pages.dev"
.venv/bin/fastapi cloud env set API_ENV "production"

.venv/bin/fastapi deploy
cd ..
```

### Cloudflare Pages frontend

Build the Vite app with the public Supabase settings and the deployed API URL,
then publish the `frontend/dist` directory:

```bash
cd frontend
npm install

export VITE_API_BASE_URL="https://<fastapi-app>.fastapicloud.dev/api"
export VITE_SUPABASE_URL="https://<project-ref>.supabase.co"
export VITE_SUPABASE_PUBLISHABLE_KEY="<publishable-key>"
export VITE_SUPERADMIN_EMAIL="<superadmin-email>"
export VITE_ADS_ENABLED="false"

npm run build
npx wrangler pages deploy dist \
  --project-name <pages-project> \
  --branch main
cd ..
```

Only `VITE_*` values belong in the frontend build. Never expose
`SUPABASE_SECRET_KEY` or any service-role key to the browser.
