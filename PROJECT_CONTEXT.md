# Divine Aperture Studio — Project Context

Last updated: 2026-09-23

## Product

Divine Aperture Studio is a premium, mobile-first photo-sharing platform for creators and their customers. Photos are the product; the interface should stay quiet and gallery-oriented rather than feeling like enterprise file management.

## Core capabilities

- Photographer/studio authentication
- Studio/workspace management
- Multiple photographers per studio
- Collection creation and cover selection
- High-resolution photo uploads
- Private shareable galleries
- Google authentication for clients
- Gallery browsing, favorites, selections, and downloads
- Print and framed-photo requests
- Print/order management
- Subscription plans based on storage/photo allowance and creator/team limits

## Current repository state

This repository currently contains product and visual design documentation only:

- `PRODUCT.md` — initial product vision and photographer workflow
- `CSS_DESIGN.md` — five proposed visual themes/design token sets

There is currently no application code, database schema, deployment configuration, payment integration, email integration, or image-processing pipeline.

## Recommended initial direction

Use a cost-conscious, storage-aware architecture:

- React + TypeScript + Vite
- Cloudflare Pages for static web deployment
- Supabase Auth and Postgres for identity, relational data, and authorization policies
- FastAPI for the application API and privileged server-side workflows
- Cloudflare R2 for original photographs and generated image variants
- Cloudflare Workers only where server-side logic is needed
- Resend for transactional email
- Stripe Checkout or Razorpay for subscriptions/orders, selected after confirming launch geography

Creators should be able to use the storage they already have—Google Drive, Dropbox, or Divine Aperture-managed storage. The first integration is Google Drive; Dropbox and managed storage follow behind the same source abstraction.

For initial testing, use one allowlisted superadmin account only. The superadmin can use the application as both admin and creator. Public signup, creator invitations, and multi-user roles are deferred.

## Persistent assumptions

- Original files must remain private and should be accessed through short-lived signed URLs.
- Google Drive folder ID is a source reference, not an authorization credential; access must be established through OAuth or an explicitly shared folder.
- The first Drive integration should use manual import/refresh. Real-time webhook synchronization can follow later.
- The initial test account should use Supabase Auth, preferably Google OAuth, with the email configured as a deployment secret.
- Clients should also authenticate with Google OAuth before accessing a private gallery.
- Creator self-signup is disabled initially; unauthenticated creators can join a reviewable waitlist.
- Clients may sign in with Google, but client permissions must never grant admin or creator access.
- Ads are allowed as a future free-tier option, but paid galleries should remain ad-free by default.
- GA4 should be used for aggregate product and marketing analytics, with consent-aware tracking and no private photo/client data.
- The client-facing gallery should use `wndws.space` as a visual reference: editorial, image-first, sparse, and catalog-like.
- Gallery pages should use optimized display images and thumbnails, not original files.
- Supabase stores photo metadata and permissions; R2 stores photo bytes. Use publishable keys in browser code and secret keys only on the backend.
- Storage and bandwidth are the dominant infrastructure concerns.
- The first release should avoid unnecessary microservices and paid infrastructure.

## Open decisions

1. Initial launch geography: India, international, or both?
2. Subscription provider: Stripe, Razorpay, or another regional provider?
3. Do clients download originals or only photographer-approved exports?
4. Are print orders paid online in v1 or submitted as requests/quotes?
5. Storage limits and retention policy for each subscription plan?
6. Which visual theme is the default? Current direction: `airy-host`, a warm light creator-platform theme.

7. Should imported Drive files be archived when removed from Drive, or removed from the gallery immediately?

## Source-of-truth documents

- Product scope: `PRODUCT.md`
- Visual system: `CSS_DESIGN.md`
- Architecture: `ARCHITECTURE.md`
- Cost/deployment model: `COST_MODEL.md`
- Decisions and unresolved questions: `DECISIONS.md`
- Google Drive import design: `GOOGLE_DRIVE_IMPORT.md`
- Monetization and advertising: `MONETIZATION.md`
- Analytics: `ANALYTICS.md`
- Client design direction: `CLIENT_DESIGN_DIRECTION.md`
- Creator waitlist: `WAITLIST.md`
- Initial login/test mode: `TEST_MODE.md`
