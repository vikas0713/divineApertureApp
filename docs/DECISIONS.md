# Divine Aperture Studio — Decisions

## Status legend

- Proposed: recommended but not yet accepted
- Accepted: agreed project direction
- Open: requires product/business input

## ADR-001 — Separate application data from media storage

Status: Proposed

Use Supabase Postgres for structured metadata and Cloudflare R2 for photo bytes. This keeps database backups and queries small while avoiding expensive image egress from the database platform.

## ADR-002 — Static-first web deployment

Status: Proposed

Deploy the React/Vite frontend to Cloudflare Pages. Add Workers only for privileged or server-side operations. This keeps the fixed deployment cost low and avoids paying for a full application server before there is meaningful usage.

## ADR-013 — FastAPI application backend with Supabase

Status: Proposed

Use FastAPI as the application API while retaining Supabase for hosted Postgres, Auth, and RLS. FastAPI validates Supabase sessions, owns privileged workflows, and keeps the Supabase service-role key server-side. Long-running Drive/image jobs can move to a worker later.

## ADR-003 — Upload variants, not just originals

Status: Proposed

Each image should have original, display, and thumbnail variants. Gallery views use display/thumbnail assets; originals are reserved for approved downloads.

## ADR-004 — Payment provider remains open

Status: Open

Stripe and Razorpay should not be selected until launch geography, supported currencies, subscription requirements, tax handling, and print-order payment flow are confirmed.

## ADR-005 — v1 print orders may be request-based

Status: Proposed

Start with a print/framing request workflow rather than full fulfillment integration. This reduces initial complexity and lets the studio validate demand before integrating labs, shipping, refunds, and regional tax rules.

## ADR-006 — Google Drive is the photographer upload source

Status: Proposed

Photographers upload images to Google Drive and provide a folder ID when creating an event. The application imports the files into private R2 storage and serves galleries from R2. This removes the need to build a large in-app uploader while keeping gallery performance and access control under application control.

The MVP uses manual import/refresh. Automatic Drive change notifications are a later enhancement.

## ADR-007 — Start with one superadmin account

Status: Proposed

The first test release will expose one allowlisted superadmin account only. This account can perform both admin and creator workflows. Clients may have Google-authenticated gallery access, but cannot receive admin or creator permissions. Public creator signup, invitations, and role management are deferred. No credentials are committed to the repository.

## ADR-008 — Ads are free-tier only by default

Status: Proposed

Support advertising as an optional monetization path for free galleries, but keep paid galleries and the main photo viewer ad-free. If enabled, begin with non-personalized/contextual ads and implement consent/privacy controls before serving third-party ad tags.

## ADR-009 — Clients use Google OAuth

Status: Proposed

Clients must sign in with Google before accessing a private event gallery. Supabase Auth will manage the session. The studio/admin test account remains separately allowlisted during the initial test phase.

## ADR-010 — Use consent-aware Google Analytics 4

Status: Proposed

Use GA4 for aggregate product and marketing measurement. Analytics is disabled locally, must be consent-aware in production, and must not receive private gallery metadata, client identity, Drive folder IDs, filenames, or photo content.

## ADR-011 — Editorial client gallery inspired by wndws.space

Status: Proposed

Use the referenced site as visual inspiration for the client experience: image-first browsing, quiet metadata, catalog-like grids, restrained controls, and generous whitespace. Do not copy its branding or assets. Preserve the application's authentication, privacy, favorites, selections, downloads, and print-request workflows.

## ADR-012 — Creator access begins with a waitlist

Status: Proposed

Creator self-signup is disabled for the initial release. The public site exposes a waitlist form, but waitlisted creators do not receive application access yet. The superadmin is the only creator. Waitlist submissions do not create an authenticated user or active studio automatically.

## ADR-014 — Superadmin signs in with email and password

Status: Proposed

The superadmin test account authenticates with a Supabase email/password
credential rather than Google OAuth.

This diverges from `TEST_MODE.md`, which prefers Google on the grounds that the
same Google identity will later own the Drive connection. That reasoning still
holds, so **the Google sign-in button is retained alongside the password form**
— connecting Drive later does not require undoing this decision.

The credential is created by hand in the Supabase dashboard. No password is
committed to the repository, placed in a migration, or stored in `.env`.
Public email signup must remain disabled so the `SUPERADMIN_EMAIL` allowlist
stays the only way in (ADR-007).

## ADR-015 — Event storage source is modelled generically

Status: Proposed

Events carry `storage_type` (`google_drive`, `dropbox`, `divine_aperture`) and
`storage_url` rather than Drive-specific columns, so Dropbox and managed
storage need no second migration. The Drive folder ID is *derived* from
`storage_url` into the existing `drive_folder_id` column, keeping it ready for
the importer.

Only `google_drive` is accepted by the API today; the other two are rejected
with 422 so an unusable event cannot be created. The dropdown shows all three
with the unsupported options disabled.

## Open questions

- Launch geography and business entity
- Subscription pricing and included storage
- Client download policy
- Retention/deletion policy
- Print fulfillment partner
- Default visual theme
