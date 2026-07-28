import { readFile, writeFile } from "node:fs/promises";
import { buildSnapshotFromPayloads, validateSnapshot } from "../netlify/functions/lib/mlbb-sync.mjs";

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

const [heroCatalog, heroSource, newsSource, statsSource] = await Promise.all([
  readJson("source-data/en_hero_list.json"),
  readJson("source-data/heroes-gms.json"),
  readJson("source-data/news.json"),
  readJson("source-data/rank-7d.json")
]);

const snapshot = validateSnapshot(
  buildSnapshotFromPayloads({
    heroCatalog,
    heroSource,
    newsSource,
    statsSource,
    syncedAt: new Date().toISOString()
  })
);

await writeFile(
  "site/data/heroes.json",
  `${JSON.stringify(snapshot)}\n`,
  "utf8"
);

console.log(
  `Prepared ${snapshot.meta.heroCount} heroes with ${snapshot.meta.relationshipCoverage} relationship records and ${snapshot.meta.draftProfileCoverage} draft profiles.`
);
