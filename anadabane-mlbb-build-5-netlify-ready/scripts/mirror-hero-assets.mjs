import {
  access,
  mkdir,
  readdir,
  readFile,
  rename,
  unlink,
  writeFile
} from "node:fs/promises";
import { dirname } from "node:path";

const SNAPSHOT_PATH = "site/data/heroes.json";
const CONCURRENCY = 5;
const REQUEST_TIMEOUT_MS = 12_000;

const snapshot = JSON.parse(
  await readFile(SNAPSHOT_PATH, "utf8")
);

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function downloadThumbnail(hero) {
  const publicPath = hero.images.thumbnail;
  const destination = `site${publicPath}`;
  if (await exists(destination)) return { status: "existing" };

  const directory = dirname(destination);
  const legacyName = (await readdir(directory).catch(() => [])).find(
    (name) =>
      name.startsWith(`${hero.id}-`) &&
      name.endsWith(".webp")
  );
  if (legacyName) {
    await rename(`${directory}/${legacyName}`, destination);
    return { status: "migrated" };
  }

  const remote = hero.images.map || hero.images.avatar;
  if (!remote) return { status: "missing-source", hero };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const temporary = `${destination}.partial`;

  try {
    const response = await fetch(remote, {
      signal: controller.signal,
      headers: {
        Accept: "image/avif,image/webp,image/png,image/jpeg,*/*",
        "User-Agent": "anaDaBane-MLBB/1.1 (+official-image-mirror)"
      }
    });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      throw new Error(`Unexpected content type ${contentType || "unknown"}`);
    }

    const sharp = (await import("sharp")).default;
    const source = Buffer.from(await response.arrayBuffer());
    await mkdir(dirname(destination), { recursive: true });
    await sharp(source)
      .resize(240, 390, { fit: "cover" })
      .webp({ quality: 82, effort: 5 })
      .toFile(temporary);
    await rename(temporary, destination);
    return { status: "downloaded" };
  } catch (error) {
    await unlink(temporary).catch(() => {});
    return { status: "failed", hero, error };
  } finally {
    clearTimeout(timer);
  }
}

const queue = [...snapshot.heroes];
const results = [];

async function worker() {
  while (queue.length) {
    const hero = queue.shift();
    results.push(await downloadThumbnail(hero));
  }
}

await Promise.all(
  Array.from({ length: Math.min(CONCURRENCY, queue.length) }, () => worker())
);

const localCount = results.filter((result) =>
  ["existing", "migrated", "downloaded"].includes(result.status)
).length;
const migratedCount = results.filter(
  (result) => result.status === "migrated"
).length;
const downloadedCount = results.filter(
  (result) => result.status === "downloaded"
).length;
const failures = results.filter((result) => result.status === "failed");

snapshot.meta.localThumbnailCount = localCount;
await writeFile(SNAPSHOT_PATH, `${JSON.stringify(snapshot)}\n`, "utf8");

for (const failure of failures) {
  console.warn(
    `Thumbnail mirror deferred for ${failure.hero.name}: ${failure.error.message}`
  );
}

console.log(
  `Hero image mirror ready: ${localCount}/${snapshot.heroes.length} stable local thumbnails (${migratedCount} migrated, ${downloadedCount} newly downloaded).`
);
