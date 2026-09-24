# Google Analytics 4

## Decision

Use Google Analytics 4 (GA4) for product and marketing analytics.

## Initial goals

- Measure landing-page traffic and acquisition sources
- Track sign-in success/failure at an aggregate level
- Measure event creation and Google Drive import completion
- Measure gallery views and engagement
- Measure favorites, selections, downloads, and print-request conversions
- Compare free-tier and paid-tier conversion
- Monitor upload/import failures and performance at an aggregate level

## Privacy rules

Do not send the following to Google Analytics:

- Photograph names or image URLs
- Google Drive folder IDs
- Client email addresses or names
- Gallery tokens or private event identifiers
- Photo content or thumbnails
- Full filenames or order details containing personal information

Use anonymous internal event IDs or coarse categories instead of personal data.

Analytics must be consent-aware, especially because the product will also support advertising. Before production launch, add a privacy/consent mechanism that controls Analytics storage and ad personalization according to the visitor's region and choice.

## Suggested events

```text
landing_page_view
admin_google_login
client_google_login
event_created
drive_import_started
drive_import_completed
drive_import_failed
gallery_viewed
favorite_added
photo_selected
download_started
print_request_submitted
subscription_started
ad_impression
```

Event parameters should be limited to non-sensitive values such as:

```text
plan_type: free | paid
photo_count_bucket: 1_10 | 11_100 | 101_500 | 500_plus
import_status: started | completed | failed
gallery_type: private | public
```

## Configuration

Keep the GA4 Measurement ID in deployment configuration:

```text
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
ANALYTICS_ENABLED=false
```

Analytics should be disabled in local development by default and enabled only after the consent flow is available.

