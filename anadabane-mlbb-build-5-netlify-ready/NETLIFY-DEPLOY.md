# Netlify deployment recovery — Build 5

This package is **not a Next.js or vinext project**. Its repository root must
contain:

- `package.json` with the package name `anadabane-mlbb`
- `netlify.toml`
- `site/`
- `netlify/functions/`

## What the failed log means

If the log contains all or any of the following, Netlify has selected the wrong
project directory or retained configuration from a different project:

- `site-creator-vinext-starter`
- `vinext build`
- `No config file was defined`
- `@netlify/plugin-nextjs`
- publish directory `.next`

The correct anaDaBane build never creates `.next`. It publishes `site/`.

## Recommended clean deployment

1. Extract this archive.
2. Create a new Git repository from the **contents** of the extracted folder.
   `package.json` and `netlify.toml` must be visible at the repository root.
3. Import that repository as a new Netlify project.
4. Let Netlify read `netlify.toml`; do not select a Next.js framework preset or
   add the Next.js runtime plugin.
5. Deploy.

## Repair an existing Netlify project

In **Project configuration → Build & deploy**:

1. Set **Base directory** to blank when this package is the repository root.
   If it is stored in a subfolder, set Base directory to that exact subfolder.
2. Set **Build command** to `npm run build`.
3. Set **Publish directory** to `site`.
4. Set **Functions directory** to `netlify/functions`.
5. Disable or remove `@netlify/plugin-nextjs` from Build plugins or the Runtime
   field.
6. Save, then retry the deploy with the build cache cleared.

If possible, clear the UI values for build, publish, and functions instead of
duplicating them. The checked-in `netlify.toml` is the source of truth.

## Expected successful log

The next log should show:

- a detected `netlify.toml`
- package `anadabane-mlbb@5.0.0`
- command `npm run build`
- publish directory ending in `/site`
- no `@netlify/plugin-nextjs`
- `Validation passed`

After deployment, open:

`https://YOUR-SITE.netlify.app/?updated=5`

Confirm that the status line reports **BUILD 5.0** and that **Draft Lab** opens.
