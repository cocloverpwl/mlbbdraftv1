import { access, readFile } from "node:fs/promises";

const requiredFiles = [
  "site/index.html",
  "site/draft.html",
  "site/styles.css",
  "site/draft.css",
  "site/app.js",
  "site/draft.js",
  "site/cache-reset.js",
  "site/sw.js",
  "site/manifest.webmanifest",
  "site/assets/logo-green.png",
  "site/assets/logo-ivory.png",
  "site/assets/icon-192.png",
  "site/assets/icon-512.png",
  "site/assets/og.png",
  "site/data/heroes.json",
  "netlify/functions/heroes.mjs",
  "netlify/functions/sync-mlbb.mjs",
  "netlify.toml"
];

await Promise.all(requiredFiles.map((file) => access(file)));

const snapshot = JSON.parse(await readFile("site/data/heroes.json", "utf8"));
if (snapshot.heroes.length < 120) {
  throw new Error(`Expected at least 120 heroes, found ${snapshot.heroes.length}`);
}
if (snapshot.meta.relationshipCoverage < 120) {
  throw new Error(
    `Expected at least 120 complete counter records, found ${snapshot.meta.relationshipCoverage}`
  );
}
if (snapshot.meta.statsCoverage < 120) {
  throw new Error(
    `Expected at least 120 official rate records, found ${snapshot.meta.statsCoverage}`
  );
}
if (snapshot.meta.localThumbnailCount < 120) {
  throw new Error(
    `Expected at least 120 local hero thumbnails, found ${snapshot.meta.localThumbnailCount}`
  );
}
if (snapshot.meta.rankedCounterCoverage < 120) {
  throw new Error(
    `Expected at least 120 ranked counter records, found ${snapshot.meta.rankedCounterCoverage}`
  );
}
if (snapshot.meta.draftProfileCoverage < 120) {
  throw new Error(
    `Expected at least 120 draft profiles, found ${snapshot.meta.draftProfileCoverage}`
  );
}
if (snapshot.meta.buildVersion !== "5.0") {
  throw new Error(`Unexpected build version ${snapshot.meta.buildVersion}`);
}

const ids = new Set();
for (const hero of snapshot.heroes) {
  if (ids.has(hero.id)) throw new Error(`Duplicate hero ID ${hero.id}`);
  ids.add(hero.id);
  if (!hero.name || !hero.roles.length || !hero.images.avatar) {
    throw new Error(`Incomplete hero record ${hero.id}`);
  }
  if (!hero.stats || !hero.images.thumbnail) {
    throw new Error(`Missing rates or local thumbnail for hero ${hero.id}`);
  }
  if (hero.stats.counterMatchups.length < 3) {
    throw new Error(`Missing ranked counters for hero ${hero.id}`);
  }
  for (const key of [
    "durability",
    "offense",
    "controlEffect",
    "difficulty"
  ]) {
    const value = Number(hero.draftProfile?.ratings?.[key]);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      throw new Error(`Invalid draft rating ${key} for hero ${hero.id}`);
    }
  }
  for (const key of ["pickRate", "winRate", "banRate"]) {
    const rate = Number(hero.stats[key]);
    if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
      throw new Error(`Invalid ${key} for hero ${hero.id}`);
    }
  }
  const thumbnail = await readFile(`site${hero.images.thumbnail}`);
  if (
    thumbnail.subarray(0, 4).toString("ascii") !== "RIFF" ||
    thumbnail.subarray(8, 12).toString("ascii") !== "WEBP"
  ) {
    throw new Error(`Invalid WebP thumbnail for hero ${hero.id}`);
  }
}

const html = await readFile("site/index.html", "utf8");
const draftHtml = await readFile("site/draft.html", "utf8");
const script = await readFile("site/app.js", "utf8");
const draftScript = await readFile("site/draft.js", "utf8");
const css = await readFile("site/styles.css", "utf8");

for (const marker of [
  'id="hero-grid"',
  'id="relationship-tabs"',
  'id="hero-detail"',
  'id="sync-status"',
  'id="stats-context"',
  'id="show-more"',
  'id="detail-mount"'
]) {
  if (!html.includes(marker)) throw new Error(`Missing interface marker ${marker}`);
}

if (!script.includes("/api/heroes")) {
  throw new Error("The live hero API is not wired into the client");
}
for (const marker of [
  'id="ally-slots"',
  'id="enemy-slots"',
  'id="draft-hero-grid"',
  'id="draft-verdict"',
  'id="rating-comparisons"',
  'id="capability-comparisons"'
]) {
  if (!draftHtml.includes(marker)) {
    throw new Error(`Missing draft interface marker ${marker}`);
  }
}
if (
  !draftScript.includes('data.meta?.buildVersion !== "5.0"') ||
  !draftScript.includes("matchupEdges") ||
  !draftScript.includes("CAPABILITIES")
) {
  throw new Error("The 5v5 draft analysis is incomplete");
}
if (!script.includes("/assets/hero-thumbnails/${Number(hero.id)}.webp")) {
  throw new Error("The stable local hero-thumbnail fallback is missing");
}
if (!css.includes("@media (max-width: 520px)")) {
  throw new Error("The canonical mobile breakpoint is missing");
}

console.log(
  `Validation passed: ${snapshot.heroes.length} heroes, ${snapshot.meta.relationshipCoverage} relationship records, ${snapshot.meta.rankedCounterCoverage} ranked counter records, ${snapshot.meta.statsCoverage} rate records, ${snapshot.meta.draftProfileCoverage} draft profiles, ${snapshot.meta.localThumbnailCount} local thumbnails.`
);
