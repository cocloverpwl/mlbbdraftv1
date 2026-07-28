import { getStore } from "@netlify/blobs";
import { syncSnapshot } from "./lib/mlbb-sync.mjs";

export default async function syncMlbb() {
  const store = getStore("mlbb-data");
  const previous = await store
    .get("snapshot", { type: "json", consistency: "strong" })
    .catch(() => null);

  const snapshot = await syncSnapshot(previous);
  await store.setJSON("snapshot", snapshot, {
    metadata: {
      syncedAt: snapshot.meta.syncedAt,
      heroCount: snapshot.meta.heroCount,
      latestPatchId: snapshot.meta.latestPatch?.id || null
    }
  });

  console.log(
    `MLBB sync complete: ${snapshot.meta.heroCount} heroes at ${snapshot.meta.syncedAt}`
  );
}

