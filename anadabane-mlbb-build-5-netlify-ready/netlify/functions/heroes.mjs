import { getStore } from "@netlify/blobs";
import { syncSnapshot } from "./lib/mlbb-sync.mjs";

const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*"
};

export default async function handler() {
  const store = getStore("mlbb-data");

  try {
    let snapshot = await store.get("snapshot", {
      type: "json",
      consistency: "strong"
    });

    if (!snapshot || snapshot.meta?.buildVersion !== "5.0") {
      snapshot = await syncSnapshot(snapshot);
      await store.setJSON("snapshot", snapshot, {
        metadata: {
          syncedAt: snapshot.meta.syncedAt,
          buildVersion: snapshot.meta.buildVersion
        }
      });
    }

    return new Response(JSON.stringify(snapshot), {
      status: 200,
      headers: jsonHeaders
    });
  } catch (error) {
    console.error("MLBB data request failed", error);
    return new Response(
      JSON.stringify({
        error: "The live data service is temporarily unavailable.",
        fallback: "/data/heroes.json"
      }),
      { status: 503, headers: jsonHeaders }
    );
  }
}
