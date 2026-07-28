const APP_ID = 2669606;
const ACT_ID = 2669607;
const SITE_ORIGIN = "https://www.mobilelegends.com";
const GMS_ORIGIN = "https://api.gms.moontontech.com";
const HERO_SOURCE_ID = 2756564;
const NEWS_SOURCE_ID = 2672947;
const RANK_SOURCE_ID = 2756569;
const HERO_OBJECT_ID = 2667538;
const NEWS_OBJECT_ID = 2667533;

const FALLBACK_HERO_LIST =
  "https://akmweb.youngjoygame.com/web/svnres/mlbb/homepage_2_1_41/latest/en_hero_list.json";
const FALLBACK_STATS =
  "https://share.bi.moonton.net/web/hero_predict/latest/hero_predict_7.json";

const apiHeaders = {
  Origin: SITE_ORIGIN,
  Referer: `${SITE_ORIGIN}/hero`,
  "X-AppId": String(APP_ID),
  "X-ActId": String(ACT_ID),
  "X-Lang": "en"
};

function cleanText(value = "") {
  return String(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\r/g, "")
    .trim();
}

function uniqueStrings(values = []) {
  return [...new Set(values.map(cleanText).filter(Boolean))];
}

async function fetchJson(url, options = {}, timeoutMs = 8_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "anaDaBane-MLBB/1.0 (+official-source-sync)",
        ...(options.headers || {})
      }
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText} from ${url}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function postSource(sourceId, payload, timeoutMs = 9_000) {
  const response = await fetchJson(
    `${GMS_ORIGIN}/api/gms/source/${APP_ID}/${sourceId}`,
    {
      method: "POST",
      headers: {
        ...apiHeaders,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    },
    timeoutMs
  );

  if (response.code !== 0 || !response.data) {
    throw new Error(response.message || `Invalid source ${sourceId} response`);
  }

  return response;
}

function findString(node, pattern) {
  if (typeof node === "string" && pattern.test(node)) return node;
  if (!node || typeof node !== "object") return null;

  for (const value of Object.values(node)) {
    const match = findString(value, pattern);
    if (match) return match;
  }

  return null;
}

async function discoverPublicSources() {
  const base = await fetchJson(
    `${GMS_ORIGIN}/api/act/basev4`,
    { headers: apiHeaders },
    7_000
  );

  const prefix = base?.data?.client?.cdnPrefix;
  if (!prefix) throw new Error("Official site configuration is missing");

  const config = await fetchJson(`${prefix}.json`, {}, 7_000);
  return {
    heroList:
      findString(config, /\/en_hero_list\.json(?:\?.*)?$/i) ||
      FALLBACK_HERO_LIST,
    stats:
      findString(config, /\/hero_predict_7\.json(?:\?.*)?$/i) ||
      FALLBACK_STATS
  };
}

function thumbnailPath(id) {
  return `/assets/hero-thumbnails/${id}.webp`;
}

function relationBlock(relation) {
  return {
    description: cleanText(relation?.desc || ""),
    heroIds: (relation?.target_hero_id || [])
      .map(Number)
      .filter((id) => Number.isFinite(id) && id > 0)
  };
}

function rating(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, number));
}

function buildDraftProfile(official = {}) {
  const ability = official.abilityshow || [];
  const skills = (official.heroskilllist || []).flatMap(
    (group) => group.skilllist || []
  );
  const tagCounts = new Map();
  const damageTypes = new Set();

  for (const skill of skills) {
    for (const tag of skill.skilltag || []) {
      const name = cleanText(tag.tagname);
      if (name) tagCounts.set(name, (tagCounts.get(name) || 0) + 1);
    }

    const description = cleanText(skill.skilldesc);
    if (/physical damage/i.test(description)) damageTypes.add("Physical");
    if (/magic damage/i.test(description)) damageTypes.add("Magic");
    if (/true damage/i.test(description)) damageTypes.add("True");
  }

  return {
    ratings: {
      durability: rating(ability[0]),
      offense: rating(ability[1]),
      controlEffect: rating(ability[2]),
      difficulty: rating(ability[3])
    },
    skillTags: [...tagCounts]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    damageTypes: [...damageTypes]
  };
}

function collectStatRows(node, rows = [], seen = new Set()) {
  if (!node || typeof node !== "object" || seen.has(node)) return rows;
  seen.add(node);

  if (Array.isArray(node)) {
    node.forEach((value) => collectStatRows(value, rows, seen));
    return rows;
  }

  const candidate = node.data && typeof node.data === "object" ? node.data : node;
  const id = Number(
    candidate.main_heroid ??
      candidate.hero_id ??
      candidate.heroid ??
      candidate.heroId
  );

  if (
    Number.isFinite(id) &&
    ("main_hero_win_rate" in candidate ||
      "win_rate" in candidate ||
      "main_hero_appearance_rate" in candidate)
  ) {
    rows.push(candidate);
  }

  Object.values(node).forEach((value) =>
    collectStatRows(value, rows, seen)
  );
  return rows;
}

function statsByHero(raw) {
  const result = new Map();
  for (const row of collectStatRows(raw)) {
    const id = Number(
      row.main_heroid ?? row.hero_id ?? row.heroid ?? row.heroId
    );
    const rate = (key, fallback) => {
      const value = Number(row[key] ?? row[fallback]);
      return Number.isFinite(value) ? value : null;
    };

    const counterMatchups = (row.sub_hero || row.data?.sub_hero || [])
      .map((counter) => {
        const lift = Number(
          counter.increase_win_rate ?? counter.win_rate_lift
        );
        return {
          heroId: Number(
            counter.heroid ??
              counter.hero_id ??
              counter.heroId
          ),
          winRateLift: Number.isFinite(lift) ? lift : null
        };
      })
      .filter(
        (counter) =>
          Number.isFinite(counter.heroId) &&
          Number.isFinite(counter.winRateLift)
      )
      .sort((a, b) => b.winRateLift - a.winRateLift)
      .slice(0, 5);

    result.set(id, {
      pickRate: rate("main_hero_appearance_rate", "appearance_rate"),
      winRate: rate("main_hero_win_rate", "win_rate"),
      banRate: rate("main_hero_ban_rate", "ban_rate"),
      counterMatchups
    });
  }
  return result;
}

function normalizePatches(newsSource) {
  return (newsSource?.data?.records || [])
    .map((record) => {
      const data = record.data || {};
      const channels = (data.channel || []).map((channel) => channel.title);
      return {
        id: Number(record.id),
        title: cleanText(data.title),
        cover: data.cover || "",
        publishedAt: data.start_time
          ? new Date(data.start_time).toISOString()
          : null,
        channels,
        url: `${SITE_ORIGIN}/news/articleldetail?newsid=${record.id}`
      };
    })
    .filter(
      (patch) =>
        patch.title &&
        (patch.channels.some((channel) => /patch/i.test(channel)) ||
          /patch/i.test(patch.title))
    )
    .sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)))
    .slice(0, 8);
}

export function buildSnapshotFromPayloads({
  heroCatalog,
  heroSource,
  newsSource,
  statsSource = null,
  previous = null,
  syncedAt = new Date().toISOString()
}) {
  const catalog = heroCatalog?.hero_list || [];
  const catalogById = new Map(catalog.map((hero) => [Number(hero.heroid), hero]));
  const sourceRecords = heroSource?.data?.records || [];
  const previousById = new Map(
    (previous?.heroes || []).map((hero) => [Number(hero.id), hero])
  );
  const statMap = statsByHero(statsSource);

  const heroes = sourceRecords
    .map((record) => {
      const wrapper = record.data || {};
      const id = Number(wrapper.hero_id ?? wrapper.hero?.data?.heroid);
      const official = wrapper.hero?.data || catalogById.get(id) || {};
      const catalogHero = catalogById.get(id) || {};
      const relation = wrapper.relation || {};
      const previousHero = previousById.get(id);
      const stats = statMap.get(id) || previousHero?.stats || null;
      const editorialCounters = relationBlock(relation.weak);
      const rankedCounterIds = (stats?.counterMatchups || []).map(
        (matchup) => matchup.heroId
      );
      const avatar =
        official.head ||
        wrapper.head ||
        catalogHero.head ||
        "";
      const map =
        official.smallmap ||
        catalogHero.smallmap ||
        wrapper.head ||
        "";
      const allSkills = (official.heroskilllist || [])
        .flatMap((group) => group.skilllist || []);
      const skills = allSkills
        .slice(0, 5)
        .map((skill) => ({
          id: Number(skill.skillid) || null,
          name: cleanText(skill.skillname),
          description: cleanText(skill.skilldesc),
          cooldown: cleanText(skill["skillcd&cost"]),
          icon: skill.skillicon || ""
        }));

      return {
        id,
        name: cleanText(official.name || catalogHero.name),
        story: cleanText(official.story || catalogHero.story),
        roles: uniqueStrings(official.sortlabel || catalogHero.sortlabel),
        lanes: uniqueStrings(
          official.roadsortlabel || catalogHero.roadsortlabel
        ),
        specialties: uniqueStrings(
          official.speciality || catalogHero.speciality
        ),
        difficulty: Number(official.difficulty) || null,
        images: {
          thumbnail: thumbnailPath(id),
          avatar,
          map,
          painting:
            official.painting ||
            wrapper.painting ||
            catalogHero.painting ||
            wrapper.head_big ||
            ""
        },
        skills,
        draftProfile: buildDraftProfile(official),
        relations: {
          strongAgainst: relationBlock(relation.strong),
          counteredBy: {
            ...editorialCounters,
            heroIds: [
              ...new Set([
                ...rankedCounterIds,
                ...editorialCounters.heroIds
              ])
            ],
            rankedHeroIds: rankedCounterIds,
            editorialHeroIds: editorialCounters.heroIds
          },
          bestTeammates: relationBlock(relation.assist)
        },
        stats,
        sourceUrl: `${SITE_ORIGIN}/hero/detail?heroid=${id}`
      };
    })
    .filter(
      (hero) =>
        Number.isFinite(hero.id) &&
        hero.name &&
        !/reserved string|test swordsman/i.test(hero.name)
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const patches = normalizePatches(newsSource);

  return {
    meta: {
      product: "anaDaBane MLBB",
      buildVersion: "5.0",
      syncedAt,
      heroCount: heroes.length,
      relationshipCoverage: heroes.filter(
        (hero) =>
          hero.relations.strongAgainst.heroIds.length &&
          hero.relations.counteredBy.heroIds.length &&
          hero.relations.bestTeammates.heroIds.length
      ).length,
      statsStatus: statMap.size
        ? "current"
        : previous?.meta?.statsStatus === "current"
          ? "preserved"
          : "temporarily unavailable",
      statsCoverage: heroes.filter((hero) => hero.stats).length,
      rankedCounterCoverage: heroes.filter(
        (hero) => hero.stats?.counterMatchups?.length >= 3
      ).length,
      draftProfileCoverage: heroes.filter(
        (hero) =>
          hero.draftProfile?.ratings?.offense >= 0 &&
          hero.draftProfile?.skillTags?.length
      ).length,
      statsPeriodDays: 7,
      statsRankScope: "All ranks",
      latestPatch: patches[0] || previous?.meta?.latestPatch || null,
      sources: {
        heroes: `${SITE_ORIGIN}/hero`,
        rankings: `${SITE_ORIGIN}/rank`,
        patches: `${SITE_ORIGIN}/en/news/ALL/list`
      },
      disclaimer:
        "Unofficial companion. Game data is attributed to Moonton and Mobile Legends: Bang Bang."
    },
    patches: patches.length ? patches : previous?.patches || [],
    heroes
  };
}

export function validateSnapshot(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.heroes)) {
    throw new Error("Snapshot is missing its hero collection");
  }
  if (snapshot.heroes.length < 120) {
    throw new Error(`Hero count is unexpectedly low: ${snapshot.heroes.length}`);
  }
  const relationshipCoverage = snapshot.heroes.filter(
    (hero) =>
      hero.relations?.strongAgainst?.heroIds?.length &&
      hero.relations?.counteredBy?.heroIds?.length &&
      hero.relations?.bestTeammates?.heroIds?.length
  ).length;
  if (relationshipCoverage < 120) {
    throw new Error(
      `Relationship coverage is unexpectedly low: ${relationshipCoverage}`
    );
  }
  const rankedCounterCoverage = snapshot.heroes.filter(
    (hero) => hero.stats?.counterMatchups?.length >= 3
  ).length;
  const statsCoverage = snapshot.heroes.filter((hero) => hero.stats).length;
  if (
    snapshot.meta?.buildVersion === "5.0" &&
    (statsCoverage < 120 || rankedCounterCoverage < 120)
  ) {
    throw new Error(
      `Rank data is unexpectedly low: ${statsCoverage} rates, ${rankedCounterCoverage} ranked counters`
    );
  }
  return snapshot;
}

export async function syncSnapshot(previous = null) {
  const sources = await discoverPublicSources().catch(() => ({
    heroList: FALLBACK_HERO_LIST,
    stats: FALLBACK_STATS
  }));
  const [heroCatalog, heroSource, newsSource] = await Promise.all([
    fetchJson(sources.heroList, {}, 4_000).catch(() => ({ hero_list: [] })),
    postSource(HERO_SOURCE_ID, {
      pageSize: 200,
      pageIndex: 1,
      filters: [],
      sorts: [],
      object: [HERO_OBJECT_ID]
    }),
    postSource(NEWS_SOURCE_ID, {
      pageSize: 30,
      pageIndex: 1,
      fields: [
        "kind",
        "channel",
        "id",
        "dynamic.views",
        "cover",
        "title",
        "tag",
        "start_time"
      ],
      filters: [{ field: "title.(i18n)", operator: "notEmpty" }],
      sorts: [
        { data: { field: "sort", order: "desc" }, type: "sequence" },
        {
          data: { field: "start_time", order: "desc" },
          type: "sequence"
        }
      ],
      object: [NEWS_OBJECT_ID]
    })
  ]);

  const statsSource = await postSource(
    RANK_SOURCE_ID,
    {
      pageSize: 200,
      pageIndex: 1,
      fields: [
        "main_hero",
        "main_hero_appearance_rate",
        "main_hero_ban_rate",
        "main_hero_channel",
        "main_hero_win_rate",
        "main_heroid",
        "data.sub_hero.hero",
        "data.sub_hero.hero_channel",
        "data.sub_hero.increase_win_rate",
        "data.sub_hero.heroid"
      ],
      filters: [
        { field: "bigrank", operator: "eq", value: "101" },
        { field: "match_type", operator: "eq", value: 0 }
      ],
      sorts: [
        {
          data: { field: "main_hero_win_rate", order: "desc" },
          type: "sequence"
        },
        {
          data: { field: "main_heroid", order: "desc" },
          type: "sequence"
        }
      ]
    },
    12_000
  ).catch(() => fetchJson(sources.stats, {}, 6_000).catch(() => null));

  return validateSnapshot(
    buildSnapshotFromPayloads({
      heroCatalog,
      heroSource,
      newsSource,
      statsSource,
      previous
    })
  );
}
