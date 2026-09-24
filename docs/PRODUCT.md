# Divine Aperture Studio
## Complete Product Specification & Implementation Plan for AI Coding Agent

> Build a production-ready, mobile-first photo-sharing platform for creators and their customers, with subscriptions and optional print ordering for **Divine Aperture Studio**.

---

# 1. PRODUCT VISION

Divine Aperture Studio is a photo-sharing platform that allows photographers, studios, and visual creators to:

1. Create collections or customer deliveries.
2. Upload high-resolution photographs.
3. Select a collection cover.
4. Generate a private shareable gallery link.
5. Share the gallery with clients.
6. Require clients to authenticate using Google before accessing photographs.
7. Allow clients to browse, favorite, select, and download photographs.
8. Allow clients to request physical prints.
9. Allow clients to request framed photographs.
10. Manage print/frame orders.
11. Manage multiple creators under one studio/workspace.
12. Choose between connected storage and Divine Aperture-managed storage.
13. Subscribe to plans based on storage, photo allowance, and creator/team limits.

The most important product principle is:

> Photos are the product. The interface should disappear around them.

The application should NOT feel like enterprise file-management software.

It should feel like a premium, welcoming front door between a creator and their customer.

---

# 2. PRIMARY USER JOURNEYS

There are two primary experiences.

## Photographer / Creator

The core photographer workflow must remain extremely simple:

```text
Sign In
   ↓
Dashboard
   ↓
Create Collection
   ↓
Add Collection Cover
   ↓
Upload HD Photos
   ↓
Generate Shareable Link
   ↓
Share With Client
