# Client Gallery Design Direction

## Reference

Reference site: [wndws.space](https://wndws.space/)

The client experience should borrow the reference site's editorial, catalog-like feeling: a quiet visual index, restrained controls, strong image-led browsing, and minimal chrome. It should be adapted for private photography galleries rather than copied directly.

## Direction

- Image-first, warm, and calm
- Sparse navigation and very few competing controls
- Grid/list browsing that feels like a curated archive
- Large visual cards with quiet metadata
- Generous whitespace and strong typographic hierarchy
- Country/filter controls only when they support discovery
- Subtle interaction states and transitions
- Ads, when enabled for free galleries, confined to non-disruptive areas

## Client gallery layout

```text
Minimal header
  ├─ studio/event title
  ├─ client account
  └─ compact actions

Editorial gallery index
  ├─ cover image / event statement
  ├─ photo grid with varied but controlled rhythm
  ├─ lightweight selection/favorite affordances
  └─ optional free-tier ad at the end of the index

Focused photo viewer
  ├─ immersive image
  ├─ previous/next navigation
  ├─ favorite/select/download actions
  └─ no advertising over the image
```

## What to avoid

- Dashboard-heavy client UI
- Dense toolbars
- Aggressive popups
- Autoplay video or sound
- Ads between every few photos
- Exposing file names as the primary interface
- Excessive borders, badges, or app-like panels

## Visual system

Use `airy-host` as the current light foundation: warm white surfaces, soft gray borders, rounded cards, friendly coral actions, and generous breathing room. Keep the image-led restraint from the reference without making the product feel like a dark wedding portfolio.

## Product-specific adaptation

The reference site is a public visual archive. Divine Aperture galleries are private client-delivery spaces, so the app must retain:

- Google client login
- Collection privacy and access control
- Favorites and selections
- Approved downloads
- Print/framing requests
- Clear studio identity
