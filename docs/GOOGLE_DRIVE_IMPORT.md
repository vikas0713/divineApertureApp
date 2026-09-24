# Google Drive Folder Import

## Feasibility

Yes. A photographer can upload images to Google Drive, paste a folder ID while creating an event, and let the application discover and import the images automatically.

The Google Drive API supports:

- Listing files whose parent is a specific folder
- Downloading image binaries with `files.get(..., alt=media)`
- Watching Drive resources for changes through HTTPS webhooks

Official references:

- [Search and list Drive files](https://developers.google.com/workspace/drive/api/guides/search-files)
- [Download Drive files](https://developers.google.com/workspace/drive/api/guides/manage-downloads)
- [Drive change notifications](https://developers.google.com/workspace/drive/api/guides/push)
- [Drive OAuth scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)

## Recommended user experience

```text
Connect Google Drive once
        ↓
Create event
        ↓
Paste Google Drive folder ID
        ↓
Click Import photos
        ↓
Application verifies folder access
        ↓
Application lists image files
        ↓
Application copies images to private R2 storage
        ↓
Application creates thumbnails/display variants
        ↓
Gallery is published
```

The photographer never manually uploads images to the application. They only upload to Drive and provide the folder ID.

## Why copy images to R2 instead of serving Drive directly?

The application could fetch image files from Drive on every gallery request, but that creates avoidable problems:

- Google OAuth tokens must remain valid for background requests.
- Every client view depends on Google Drive availability and API quotas.
- Original files may be unnecessarily downloaded many times.
- Gallery performance and caching become harder to control.
- Client downloads would expose a Drive-dependent path.

The recommended model is to use Drive as the photographer's ingestion source and R2 as the application's delivery store. This preserves the simple upload experience while providing fast, private, CDN-friendly galleries.

## Authentication options

### Recommended: photographer OAuth connection

The photographer clicks `Connect Google Drive` and authorizes the application. The backend stores encrypted refresh-token material and uses it to read the selected folder later.

The folder ID alone is not an authorization credential. It works only when the application has access through OAuth, a shared folder, or public access.

### Alternative: shared folder with an application service account

The photographer shares the folder with a service-account email and pastes the ID. This can work for controlled studio setups, but it is less friendly for a multi-tenant SaaS product and may be awkward with ordinary personal Drive accounts.

### Public folder

Public/shared-link folders can sometimes be listed without user OAuth, but this is not recommended for private client photography. A public folder link can expose the entire source gallery and weakens the privacy model.

## MVP synchronization model

Start with a manual import button and periodic refresh:

1. Validate the folder ID and permissions.
2. List direct child files using a query equivalent to:

   ```text
   '<folder-id>' in parents
   and trashed = false
   ```

3. Keep only supported image MIME types.
4. Compare Drive file ID, modified time, size, and checksum with local metadata.
5. Download only new or changed files.
6. Upload to R2 and create variants.
7. Mark missing/trashed Drive files as archived rather than immediately deleting gallery records.

This is simpler and more predictable than building real-time sync first.

## Later automatic sync

Google Drive supports push notifications to an HTTPS webhook. The notification indicates that changes are available; the application then reads the Drive change feed and reconciles the event.

Recommended later behavior:

- Watch changes for the connected Drive account.
- Queue a sync job when a notification arrives.
- Re-list/reconcile the event folder rather than trusting the notification payload as the complete file record.
- Renew expiring notification channels.
- Keep a scheduled safety reconciliation for missed notifications.

## Important limitations

- A folder ID does not prove that the caller can read the folder.
- OAuth consent and Google Cloud project configuration are required.
- Broad Drive read scopes may require additional Google verification before public launch.
- Very large folders need pagination, retries, rate-limit handling, and resumable downloads.
- Google Drive should not be the only copy of valuable originals unless the photographer accepts that risk.
- Google Workspace files such as Docs or Sheets are not ordinary image binaries and should be ignored for this feature.

## Revised product architecture

```text
Photographer uploads to Google Drive
              ↓
Google Drive API + OAuth
              ↓
Import/sync worker
              ↓
Private Cloudflare R2
              ├─ original image
              ├─ display image
              └─ thumbnail
              ↓
Supabase metadata and permissions
              ↓
Client gallery
```

## Recommendation

Adopt Google Drive folder import as the v1 upload experience. Implement manual import/refresh first. Add automatic Drive webhook synchronization after the basic gallery workflow is stable.

