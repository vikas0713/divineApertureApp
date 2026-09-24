# Creator Waitlist

## Purpose

Creators cannot self-register during the initial launch. Instead, they can request access through a lightweight waitlist form.

## Creator flow

```text
Landing page
   ↓
Join creator waitlist
   ↓
Submit contact and photography details
   ↓
Confirmation message
   ↓
Superadmin reviews request for future onboarding
```

## Suggested fields

- Name
- Email
- Studio/business name
- City and country
- Photography type
- Approximate events or photos per month
- Optional website or social profile
- Optional message
- Consent to receive product updates

Do not collect a password or create a Supabase Auth user when the form is submitted.

## Data model

Create a `creator_waitlist` table with:

```text
id
name
email
studio_name
country
city
photography_type
monthly_volume
website_url
message
marketing_consent
status: pending | contacted | approved | declined
created_at
reviewed_at
```

The email should be normalized and protected against duplicate submissions. Access to waitlist records is admin-only.

## Abuse prevention

- Rate-limit submissions by IP and email
- Add a honeypot or CAPTCHA only if abuse appears
- Validate URLs and email format
- Do not expose the waitlist list publicly
- Do not automatically subscribe people to marketing without consent

## Current behavior

The waitlist is only a lead-collection and onboarding queue during the initial release. The superadmin is the only creator who can use the application. Waitlisted creators do not receive access or invitations yet.

## Future approval flow

Later, the superadmin can approve a request and send an invite link. The creator can then complete Google OAuth and receive a studio record.
