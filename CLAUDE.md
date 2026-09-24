# Divine Aperture Studio

Creator-to-customer photo-sharing platform. Two-sided application: FastAPI
backend, React/Vite frontend, Supabase Postgres.

## Layout

```text
backend/    FastAPI — app/routes/, app/schemas.py, app/dependencies.py, tests/
frontend/   React + TypeScript + Vite — src/components/, src/lib/, src/types.ts
supabase/   Migrations and RLS. Run the Supabase CLI from the repo root.
docs/       Product, architecture, cost, and decision records
```

## Commands

```bash
./start-backend                  # venv + deps on first run, uvicorn on :8000
./start-frontend                 # vite dev server on :5173
cd frontend && npm run build     # tsc -b + vite build
cd backend  && .venv/bin/pytest
supabase db reset                # reapply all migrations (local only, destructive)
supabase migration new <name>    # never edit an applied migration
```

## Standards

Project standards live in a **separate repository** and are referenced by
absolute path, so these links resolve only on this machine. Source of truth:
`/Users/vikasverma/Projects/agent-os/standards/divineApertureApp/`.

@/Users/vikasverma/Projects/agent-os/standards/divineApertureApp/backend/superadmin-allowlist.md
@/Users/vikasverma/Projects/agent-os/standards/divineApertureApp/backend/supabase-clients.md
@/Users/vikasverma/Projects/agent-os/standards/divineApertureApp/api/server-owned-fields.md
@/Users/vikasverma/Projects/agent-os/standards/divineApertureApp/api/request-schemas.md
@/Users/vikasverma/Projects/agent-os/standards/divineApertureApp/api/router-structure.md
@/Users/vikasverma/Projects/agent-os/standards/divineApertureApp/api/error-responses.md
@/Users/vikasverma/Projects/agent-os/standards/divineApertureApp/api/stub-endpoints.md

In short:

- **superadmin-allowlist** — role is derived server-side from `SUPERADMIN_EMAIL`, never from the token or body.
- **supabase-clients** — publishable-key client validates tokens only; secret-key client does all table access and bypasses RLS.
- **server-owned-fields** — `studio_id`, `gallery_slug`, `status`, `plan` are set server-side and never accepted from the client.
- **request-schemas** — schemas live in `schemas.py`; `extra="forbid"` inbound, `max_length` on every string, `response_model` on every route.
- **router-structure** — routers own their sub-prefix and tags; `main.py` adds `/api`.
- **error-responses** — 502 for Supabase failures, empty `result.data` is an error, never leak upstream messages.
- **stub-endpoints** — unwired endpoints keep real auth and validation with a canned response.

## Gotchas

**Two sources of truth for `superadmin`.** The API derives the role from the
`SUPERADMIN_EMAIL` env var; the database's `is_superadmin()` reads
`profiles.role`. **The env var is authoritative**, but `profiles.role` must be
kept in sync — change one without the other and access breaks silently:

- Change `SUPERADMIN_EMAIL` only → API allows, RLS denies.
- Change `profiles.role` only → API returns 403 before RLS is reached.

`public.promote_to_superadmin(email)` sets the database side; see
`supabase/README.md`.

**`POST /api/admin/drive/import` is a stub.** It enforces auth and validates
its payload, but no worker exists: no Drive OAuth, no R2 write, no photo rows.
It returns a canned `queued`. Do not treat it as implemented.

**Gallery photos are demo data.** `frontend/src/data/demo.ts` holds Unsplash
URLs. Favorites, selections, and print requests exist in the schema and the UI
but are never persisted.

**The frontend degrades to demo mode** whenever the Supabase env vars are
absent (`isSupabaseConfigured` in `frontend/src/lib/supabase.ts`). Preserve
that in new code — every call site guards on it.
