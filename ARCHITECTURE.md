# Divine Aperture Studio — Initial Architecture

## Guiding principles

1. Keep the first deployment simple and inexpensive.
2. Separate photo bytes from application metadata.
3. Never expose private originals through permanent public URLs.
4. Optimize for mobile galleries and intermittent network quality.
5. Make later migration possible without coupling the product to one provider.

## Proposed system

```text
Browser
  ├─ Cloudflare Pages: React/Vite application
  ├─ Supabase Auth: Google and studio-user sessions
  ├─ Supabase Postgres: users, studios, events, photos, orders, plans
  ├─ Storage connectors: Google Drive, Dropbox, and managed storage
  ├─ R2 signed download URLs: imported photo bytes
  ├─ FastAPI: authenticated API, waitlist, event workflows, storage orchestration
  └─ R2/worker layer: private image bytes and future processing jobs
```

## Backend

FastAPI is the application backend. It validates Supabase access tokens, enforces the superadmin allowlist for privileged routes, uses the Supabase secret-key client only on the server, and exposes the public/admin API boundary.

Initial endpoints:

```text
GET  /api/health
POST /api/waitlist
POST /api/admin/drive/import
```

The secret key must never be shipped to the browser.

## Frontend

- React + TypeScript + Vite
- Tailwind CSS or a small token-based CSS layer derived from `CSS_DESIGN.md`
- Responsive gallery-first layouts
- Client-side upload queue with progress, retry, and resumable/multipart support where needed

Cloudflare Pages is preferred for the initial static frontend because static asset requests are free and unlimited. Dynamic Pages Functions are billed as Workers usage.

## Database and authorization

Supabase Postgres should contain relational metadata only. Row Level Security should enforce studio and event ownership.

Initial entities:

```text
profiles
studios
studio_members
events
photos
photo_variants
gallery_access
favorites
selections
download_events
print_orders
print_order_items
subscriptions
plans
```

Recommended photo fields include:

```text
id, event_id, r2_original_key, r2_display_key, r2_thumbnail_key,
filename, mime_type, byte_size, width, height, checksum,
sort_order, status, created_at
```

## Media pipeline

For each imported Drive image:

1. Photographer connects Google Drive through OAuth.
2. Photographer provides a Drive folder ID while creating an event.
3. Backend lists direct child files in that folder and filters image MIME types.
4. An import job downloads new/changed images from Drive to private R2 storage.
5. Original, display, and thumbnail variants are retained under private R2 keys.
6. Metadata and processing status are written to Postgres.
7. Gallery requests receive short-lived signed URLs for display/thumbnail variants.

The first implementation can generate variants in the browser before upload to minimize backend compute. A later implementation can move processing to a Worker, queue, or dedicated image service.

For Google Drive import, the first implementation should use an explicit `Import/Refresh` action. Drive webhooks and scheduled reconciliation can be added after the MVP.

## Security requirements

- Private R2 bucket; no public original-object URLs
- Short expiration for signed URLs
- Server-side authorization for every event/photo/order mutation
- RLS policies for studio, member, event, and client access
- Rate limits on authentication, gallery access, downloads, and signed URL creation
- Audit records for downloads and order-state changes
- Never trust client-supplied storage keys, prices, or studio IDs

## Suggested delivery phases

### Phase 1 — Gallery MVP

Authentication, studio, event, upload, private gallery, thumbnails, favorites, and approved downloads.

### Phase 2 — Commercial workflow

Plans, usage limits, subscriptions, print requests, order dashboard, email notifications, and audit history.

### Phase 3 — Scale and polish

Background image processing, resumable uploads, bulk downloads, advanced analytics, custom domains, and retention/archive policies.
