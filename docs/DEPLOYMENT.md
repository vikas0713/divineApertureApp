# Deployment

Backend on **FastAPI Cloud**, frontend on **Cloudflare Pages**, database on
hosted **Supabase**.

## Why Cloudflare Pages

- Already the project's decision (ADR-002) and costed at $0 in `COST_MODEL.md`.
- **Its free tier permits commercial use.** Vercel's Hobby plan is explicitly
  non-commercial, which rules it out for a studio product.
- Unlimited bandwidth; `frontend/public/_redirects` is already Cloudflare's
  native SPA-fallback format, which `/admin` and `/g/:slug` need.

## Free-tier limits that shape the design

FastAPI Cloud Hobby: **0.1 vCPU / 512 MB**, scale-to-zero, 3 apps, 1 custom
domain. Two consequences are already handled in code, and must not be undone:

- The image cache is budgeted in **bytes** (`CACHE_MAX_BYTES`, 64 MB) with a
  per-entry cap, not in entries. An entry-count cache holding full-resolution
  downloads would reach ~2 GB and OOM the container.
- Downloads are **streamed**, never buffered. A full-resolution image is ~8.4 MB;
  streaming holds ~2.7 MB instead.
- The client gallery paginates at 24. Rendering all 546 at once meant 546 proxy
  requests against 0.1 vCPU.

## Backend environment (FastAPI Cloud secrets)

| Variable | Value | Notes |
|---|---|---|
| `API_ENV` | `production` | **Critical.** While this is `development`, `cors_origin_regex` allows *any* localhost origin. |
| `FRONTEND_ORIGINS` | the Pages URL | The only allowlisted origin once the regex is off |
| `SUPABASE_URL` | `https://<ref>.supabase.co` | |
| `SUPABASE_PUBLISHABLE_KEY` | hosted publishable key | |
| `SUPABASE_SECRET_KEY` | hosted secret key | Server-only. Also signs image tokens. |
| `SUPERADMIN_EMAIL` | the real studio account | Must match `profiles.role` in the database |
| `SUPERADMIN_STUDIO_ID` | `00000000-0000-0000-0000-000000000001` | Seeded by migration |
| `GOOGLE_SERVICE_ACCOUNT_B64` | base64 of the key JSON | No file to mount, hence base64 |

### The service account key specifically

The key is a multi-line JSON file with a private key inside it. Three facts
decide how it travels:

1. **`fastapi deploy` respects `.gitignore`**, and `backend/service-account.json`
   is gitignored — so the file is *never uploaded*. A deployed app cannot read
   it, by design.
2. Literal `\n` sequences in the private key get mangled by most secret UIs and
   `.env` parsers, which is the commonest way this credential silently fails.
3. FastAPI Cloud encrypts variables marked `--secret`, and they become
   invisible in the dashboard afterwards.

So: **base64, set as a secret.**

```bash
# from backend/ — the value is already generated at backend/service-account.b64
fastapi cloud env set --secret GOOGLE_SERVICE_ACCOUNT_B64 "$(cat service-account.b64)"

# regenerate it any time from the key file:
base64 -i service-account.json | tr -d '\n'
```

Base64 is one unbroken ASCII line, so nothing can reinterpret the newlines.

**Leave `GOOGLE_SERVICE_ACCOUNT_FILE` empty in production.** Credentials load in
the order B64 → JSON → FILE, so a stale FILE value is harmless *if* B64 is set —
but if B64 is ever missing, FILE pointing at a file that was never uploaded used
to raise a bare `FileNotFoundError`. It now reports which variable to set
instead. `.env.example` no longer defaults it for the same reason.

Setting a variable does **not** redeploy; it applies on the next deployment.

## Frontend build variables (Cloudflare Pages)

Root directory **`frontend`**, build `npm run build`, output `dist`.

```
VITE_API_BASE_URL=https://<fastapi-cloud-host>/api
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable key>
VITE_SUPERADMIN_EMAIL=<studio account>
```

These are baked in at build time, so changing one requires a rebuild.

## Order of operations

1. `supabase link --project-ref <ref>` then `supabase db push` — all four
   migrations have only ever run locally.
2. Bootstrap the superadmin per `supabase/README.md`.
3. In the Supabase dashboard: disable email signup (ADR-007) and add Google
   with the callback `https://<ref>.supabase.co/auth/v1/callback`.
4. Deploy the backend; note its URL.
5. Deploy the frontend with `VITE_API_BASE_URL` pointing at it.
6. Set `FRONTEND_ORIGINS` to the Pages URL and redeploy the backend.
7. Add the Pages URL to Supabase's redirect allowlist and the Google OAuth
   client's authorised origins.

## Known limits

- **Scale-to-zero cold starts.** The first request after idle is slow on
  0.1 vCPU.
- **Free Supabase pauses inactive projects.** A link opened a week later may
  hit a paused database.
- **Image bandwidth flows through the API.** A client saving all 546 photos at
  ~8 MB each pulls several GB. R2 (ADR-001/003) removes this; its egress is
  free.
- **Galleries are gated, not secret.** The login gate protects the page. Until
  R2 lands, treat the slug as the real secret.
