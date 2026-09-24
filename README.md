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
