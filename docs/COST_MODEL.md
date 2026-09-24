# Divine Aperture Studio — Cost and Deployment Model

Last reviewed: 2026-09-23

Prices are indicative and should be rechecked before launch. Provider pricing, taxes, regional payment fees, and exchange rates can change.

## Recommended economical deployment

| Component | Initial choice | Expected starting cost |
|---|---|---:|
| Frontend hosting | Cloudflare Pages | $0 for static assets |
| Database/auth | Supabase Free during development; Pro for production | $0 or from $25/month |
| Photo object storage | Cloudflare R2 Standard | $0 at low usage; then $0.015/GB-month after allowance |
| Edge/server functions | Cloudflare Workers | $0 initially; Paid plan from $5/month if needed |
| Transactional email | Resend | $0 up to its free allowance |
| Domain | Registrar of choice | Usually annual fee |
| Payments | Stripe/Razorpay | Per-transaction fee; geography-dependent |

## Current published reference points

- Supabase Free includes 500 MB database size, 1 GB file storage, 5 GB egress, and may pause inactive projects. Supabase Pro starts at $25/month and includes 100 GB file storage and 250 GB egress.
- Cloudflare R2 includes 10 GB-month Standard storage, 1 million Class A operations, 10 million Class B operations, and free egress per month. Standard storage is listed at $0.015/GB-month after the allowance.
- Cloudflare Workers Paid starts at $5/month and includes 10 million requests/month; static Pages assets are free and unlimited.
- Resend Free includes 3,000 emails/month with a 100-email daily limit.

Reference links:

- [Supabase pricing](https://supabase.com/pricing)
- [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/)
- [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [Cloudflare Pages Functions pricing](https://developers.cloudflare.com/pages/functions/pricing/)
- [Resend pricing](https://resend.com/pricing)

## Scenarios

### Development

Supabase Free + Cloudflare Pages Free + R2 Free tier + Resend Free.

Expected infrastructure cost: approximately $0/month, excluding domain and payment-provider setup.

### Small production launch

Supabase Pro + Cloudflare Pages + R2 usage + Resend Free + optional Workers Paid.

Expected base: approximately $25–35/month before storage overages, taxes, domain, and payment fees.

### Storage example

At 500 GB of Standard R2 storage, assuming the 10 GB allowance is available:

```text
(500 - 10) × $0.015 ≈ $7.35/month
```

This is storage only. Request-operation charges may apply, while Internet egress remains free under R2’s published pricing.

## Cost controls

- Keep original files in R2, not Supabase Storage.
- Serve thumbnails/display variants in galleries.
- Apply per-plan storage and photo-count limits before upload.
- Add usage alerts and hard spend caps.
- Expire abandoned uploads and incomplete processing records.
- Keep development, staging, and production in separate projects only when necessary.
- Do not add paid image transformations until usage justifies them.
- Record bandwidth, storage, and processing usage per studio for future billing.

## Costs not included

- Payment-processing fees and taxes
- Domain registration
- Print-lab fulfillment and shipping
- Backups beyond the provider plan
- SMS/WhatsApp notifications
- Customer support and operational labor

