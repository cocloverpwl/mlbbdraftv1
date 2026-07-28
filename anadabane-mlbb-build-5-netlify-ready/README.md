# anaDaBane MLBB

A mobile-first counter and 5v5 draft field guide for Mobile Legends: Bang Bang.
The interface uses the anaDaBane website system while hero, relationship, and
patch data come from public sources used by the official MLBB website.

## Netlify deployment

Use a Git-connected Netlify project (recommended) or the Netlify CLI. A static
Netlify Drop is not sufficient because this project includes Functions, Blobs,
and a scheduled refresh.

If a Netlify log mentions `site-creator-vinext-starter`, `vinext build`,
`@netlify/plugin-nextjs`, or a missing `.next` directory, Netlify is building
the wrong repository directory or is retaining settings from a different
Next.js project. Follow [NETLIFY-DEPLOY.md](NETLIFY-DEPLOY.md) to correct it.

### Git-connected deploy

1. Push this folder to a Git repository.
2. In Netlify, choose **Add new project → Import an existing project** and
   select the repository.
3. Netlify reads `netlify.toml`, runs `npm run build`, publishes `site/`, and
   bundles `netlify/functions/`; no manual build settings are needed.
4. Open the deployed site once. Its first `/api/heroes` request seeds the live
   store if the scheduled function has not run yet.
5. The scheduled function refreshes the snapshot every day at 20:30 UTC
   (03:00 Myanmar time).
6. Confirm the status line ends in **BUILD 5.0**. If it does not, Netlify is
   still publishing an older repository, branch, or base directory.
7. Existing visitors trapped on the previous offline cache can open
   `https://YOUR-SITE.netlify.app/?updated=5` once. Build 5 also removes the
   old worker and cache automatically.

### CLI deploy

```bash
npx netlify-cli login
npx netlify-cli deploy --build --prod
```

Netlify Blobs is initialized automatically by the functions. No API keys,
database credentials, or user accounts are required.

## Local verification

```bash
npm install
npm run build
```

The static fallback works from any simple local web server. Run
`npx netlify-cli dev` only when testing Functions and Blobs locally.

## Data behavior

- New data is validated before replacing the last valid snapshot.
- If an official source is down, the app uses the saved Netlify Blob.
- If the live function is unavailable, the browser uses the bundled snapshot.
- Pick, win, and ban rates use the official seven-day, all-ranks feed shown on
  the MLBB ranking page. The last valid rates are preserved if that feed is
  temporarily unavailable.
- “Countered By” starts with the official seven-day matchup ranking and shows
  each counter hero's win-rate lift. Official editorial relationship notes are
  retained as supplementary counter guidance.
- All 133 current hero list and relationship thumbnails are stored under
  `site/assets/hero-thumbnails/` as optimized WebP files named only by stable
  hero ID, such as `80.webp`. The browser uses the
  remote official image only as a fallback for a newly released hero that has
  not yet been included in a deployment.
- `npm run mirror-images` downloads and optimizes any missing thumbnails before
  a new deployment.

## 5v5 Draft Lab

Open `/draft.html` or use the **Draft Lab** link in the main navigation.

- Select up to five allied heroes and five enemy heroes with no duplicates.
- Compare MLBB's original Durability, Offense, Control Effect, and Difficulty
  ratings as team averages.
- Compare AOE, Burst, Mobility, Sustain, Poke, Initiation, and Cleanse coverage
  from official skill tags and specialties.
- Review physical, magic, and true-damage mix plus role and standard-lane
  coverage.
- See direct ranked and editorial counter relationships among the ten selected
  heroes.
- Strong, Fair, and Weak judgments use visible category thresholds. The overall
  field verdict is a composition comparison, not a match-win prediction.

This is an unofficial companion and is not endorsed by Moonton.
