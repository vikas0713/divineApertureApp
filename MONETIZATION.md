# Client-Side Monetization

## Feasibility

The client-facing web gallery can technically display advertising, including Google AdSense or another ad provider.

## Product recommendation

Do not place intrusive third-party ads over or between the photographer's images. Divine Aperture is positioned as a premium photography experience, and ads can reduce trust, perceived quality, and photographer willingness to use the service.

Recommended model:

- No ads on paid plans.
- No ads on the main photo viewer.
- Optional small, non-intrusive ads on a free-tier gallery.
- Prefer contextual/non-personalized ads for private galleries.
- Consider direct sponsorships or photography/print-related offers before general ad-network inventory.

Potential placements:

- A small footer or end-of-gallery placement
- A separate download/print-request confirmation page
- The public marketing site
- Free-plan upgrade prompts owned by Divine Aperture

## Privacy and compliance considerations

Authenticated client galleries can contain private event context and personal photography. Advertising scripts may use cookies, device storage, identifiers, or third-party vendors. India is the initial market, but the product should still implement a basic privacy/consent path and avoid treating regional privacy requirements as irrelevant. The product therefore needs:

- Privacy policy and cookie disclosure
- Consent management for applicable regions
- Non-personalized/limited-ad fallback when consent is not available
- A clear way to opt out where required
- No sending photo names, gallery contents, favorites, selections, or client identity to ad partners

Google requires publishers to obtain disclosures and consent for cookies/local storage and personalized-ad data use in the EEA, UK, and Switzerland. Google also states that publishers remain responsible for content on pages showing ads, including user-generated content.

Reference: [Google AdSense EU consent requirements](https://support.google.com/adsense/answer/13554116) and [AdSense publisher policies](https://support.google.com/adsense/answer/23921).

## Technical approach if ads are enabled

Add application-level feature flags:

```text
ADS_ENABLED=false
ADS_ON_FREE_PLAN_ONLY=true
ADS_PERSONALIZATION=false
```

The gallery should load an ad component only when the studio/event plan allows ads and consent requirements are satisfied, or the provider supports non-personalized/limited ads.

The ad component must be isolated from the image viewer and must never receive private gallery metadata.

## Revenue expectation

Ad revenue depends on page views, visitor geography, ad format, and consent rate. Private galleries may have relatively few views per event, so subscriptions, storage upgrades, and print commissions are likely to be more predictable revenue sources.
