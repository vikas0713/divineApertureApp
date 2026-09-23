# Initial Single-Account Test Mode

## Scope

During the first testing phase, Divine Aperture Studio will use one application account only. This account is a superadmin with both administration and creator capabilities.

This account acts as:

- Studio owner
- Photographer/admin
- Superadmin
- Google Drive connection owner
- Event and gallery manager

Multi-user studios, creator invitations, roles, creator signup, and public signup are deferred.

## Recommended login behavior

- Use Supabase Auth.
- Allow one explicitly configured email address.
- Prefer Google OAuth for the test account, since Google Drive access will use the same Google identity.
- Disable public signup.
- Reject any authenticated email that is not the configured test email.
- Do not hardcode or share a password in source code.

Example configuration concept:

```text
TEST_ACCOUNT_EMAIL=the-test-account@example.com
ALLOW_PUBLIC_SIGNUP=false
SINGLE_ACCOUNT_MODE=true
```

The real email must be supplied through deployment secrets, not committed to Git.

## Client behavior

Clients can use Google OAuth to access galleries they are permitted to view. Client access does not create creator or admin permissions.

## Google Drive behavior

The test account connects its own Google Drive once. Events created by that account can import images from folders accessible to that Google identity.

The application should store the Drive connection securely and associate imported events with the single studio/account record.

## What remains in the data model

Keep `profiles`, `studios`, and `studio_members` in the schema, but seed only one profile and one studio. This avoids a migration-heavy rewrite when multi-user support is introduced.

## Exit criteria for multi-user mode

Move beyond single-account mode when testing requires any of:

- A second photographer
- Client accounts with persistent access
- Studio invitations
- Role-based permissions
- Multiple independent studios
