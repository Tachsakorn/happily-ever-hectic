# Happily Ever Hectic

A private, touch-first wedding time-management game for iPad Safari.
You are the wedding planner: seat guests with the right people, serve dinner,
carry gifts, nail the toast and the cake cutting, and fix disasters before
they ruin the couple's day.

## Run it

```bash
pnpm install
pnpm dev          # dev server on your network (open the printed URL on the iPad)
pnpm check        # typecheck + lint + all tests
pnpm build        # production build in dist/ (deployed to GitHub Pages)
pnpm build:single # one self-contained HTML file in dist-single/
```

Deployment: pushing to `main` runs `.github/workflows/deploy.yml`, which checks,
builds and publishes to GitHub Pages (enable Pages → "GitHub Actions" in the repo settings once).

On the iPad: open the URL in Safari → Share → **Add to Home Screen**. Playing from the
home-screen icon gives full screen and protects the save from Safari's storage clean-up.

## Make it personal

Edit **one file**: `src/data/packs/personal/profile.ts` (names, outfits, favourite decor,
intro and ending lines). Guest names for the final wedding are in
`src/data/packs/personal/index.ts`.

## Docs

- [Architecture](docs/ARCHITECTURE.md) — layers, data flow, game states, save, input, performance
- [Adding content](docs/ADDING-CONTENT.md) — new guests, disasters, weddings, levels
