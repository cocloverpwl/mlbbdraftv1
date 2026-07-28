const state = {
  data: null,
  heroes: [],
  heroById: new Map(),
  selectedId: null,
  role: "All",
  query: "",
  relationship: "counteredBy",
  visibleCount: 12,
  live: false
};

const relationshipText = {
  counteredBy: {
    label: "PRIMARY ANSWER",
    title: "Pick against this hero"
  },
  strongAgainst: {
    label: "MATCHUP ADVANTAGE",
    title: "This hero performs well against"
  },
  bestTeammates: {
    label: "TEAM COMPATIBILITY",
    title: "Pair this hero with"
  }
};

const elements = {
  grid: document.querySelector("#hero-grid"),
  count: document.querySelector("#hero-count"),
  empty: document.querySelector("#empty-state"),
  showMore: document.querySelector("#show-more"),
  search: document.querySelector("#hero-search"),
  roleControls: document.querySelector("#role-controls"),
  detail: document.querySelector("#hero-detail"),
  detailMount: document.querySelector("#detail-mount"),
  heroName: document.querySelector("#selected-hero-name"),
  heroImage: document.querySelector("#selected-hero-image"),
  heroReference: document.querySelector("#selected-hero-reference"),
  heroTags: document.querySelector("#selected-hero-tags"),
  heroStory: document.querySelector("#selected-hero-story"),
  heroSource: document.querySelector("#selected-hero-source"),
  winRate: document.querySelector("#win-rate"),
  pickRate: document.querySelector("#pick-rate"),
  banRate: document.querySelector("#ban-rate"),
  statsContext: document.querySelector("#stats-context"),
  relationshipTabs: document.querySelector("#relationship-tabs"),
  relationshipLabel: document.querySelector("#relationship-label"),
  relationshipTitle: document.querySelector("#relationship-title"),
  relationshipDescription: document.querySelector("#relationship-description"),
  relationshipGrid: document.querySelector("#relationship-grid"),
  syncStatus: document.querySelector("#sync-status"),
  patchName: document.querySelector("#patch-name"),
  patchDate: document.querySelector("#patch-date"),
  patchCover: document.querySelector("#patch-cover"),
  patchLink: document.querySelector("#patch-link"),
  themeToggle: document.querySelector("#theme-toggle"),
  installButton: document.querySelector("#install-button")
};

elements.detailMount.append(elements.detail);

function loadImage(image, sources) {
  const queue = [
    ...new Set([...sources, "/assets/logo-green.png"].filter(Boolean))
  ];
  let index = 0;

  image.classList.remove("image-fallback");
  image.onerror = () => {
    index += 1;
    if (index >= queue.length) return;
    image.src = queue[index];
    if (queue[index] === "/assets/logo-green.png") {
      image.classList.add("image-fallback");
    }
  };

  image.src = queue[0];
}

function localHeroThumbnail(hero) {
  return `/assets/hero-thumbnails/${Number(hero.id)}.webp?v=5`;
}

function formatRate(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  const percent = Math.abs(number) <= 1 ? number * 100 : number;
  return `${percent.toFixed(2)}%`;
}

function formatSignedRate(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  const percent = Math.abs(number) <= 1 ? number * 100 : number;
  return `${percent >= 0 ? "+" : ""}${percent.toFixed(2)}% WR lift`;
}

function formatDate(value) {
  if (!value) return "DATE UNAVAILABLE";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "DATE UNAVAILABLE";
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  })
    .format(date)
    .toUpperCase();
}

function filteredHeroes() {
  const query = state.query.trim().toLocaleLowerCase();
  return state.heroes.filter((hero) => {
    const matchesRole =
      state.role === "All" || hero.roles.includes(state.role);
    const matchesQuery =
      !query ||
      hero.name.toLocaleLowerCase().includes(query) ||
      hero.roles.some((role) => role.toLocaleLowerCase().includes(query)) ||
      hero.lanes.some((lane) => lane.toLocaleLowerCase().includes(query));
    return matchesRole && matchesQuery;
  });
}

function createHeroCard(hero) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "hero-card";
  button.dataset.heroId = String(hero.id);
  button.setAttribute("aria-pressed", String(hero.id === state.selectedId));
  button.setAttribute("aria-label", `Select ${hero.name}, ${hero.roles.join(" and ")}`);

  const image = document.createElement("img");
  loadImage(image, [
    localHeroThumbnail(hero),
    hero.images.thumbnail,
    hero.images.map,
    hero.images.avatar
  ]);
  image.alt = "";
  image.loading = "lazy";
  image.decoding = "async";
  image.referrerPolicy = "no-referrer";

  const copy = document.createElement("span");
  copy.className = "hero-card-copy";
  const name = document.createElement("span");
  name.className = "hero-card-name";
  name.textContent = hero.name;
  const role = document.createElement("span");
  role.className = "hero-card-role";
  role.textContent = hero.roles.join(" / ");
  copy.append(name, role);
  button.append(image, copy);

  button.addEventListener("click", () => selectHero(hero.id, true));
  return button;
}

function renderHeroGrid() {
  const heroes = filteredHeroes();
  const visibleHeroes = heroes.slice(0, state.visibleCount);
  elements.grid.replaceChildren(...visibleHeroes.map(createHeroCard));
  elements.grid.setAttribute("aria-busy", "false");
  elements.count.textContent =
    visibleHeroes.length < heroes.length
      ? `${visibleHeroes.length} of ${heroes.length} heroes`
      : `${heroes.length} ${heroes.length === 1 ? "hero" : "heroes"}`;
  elements.empty.hidden = heroes.length !== 0;
  elements.grid.hidden = heroes.length === 0;
  elements.showMore.hidden =
    heroes.length === 0 || visibleHeroes.length >= heroes.length;
  elements.showMore.textContent = `Show ${Math.min(12, heroes.length - visibleHeroes.length)} more heroes`;
}

function createTag(text) {
  const tag = document.createElement("span");
  tag.className = "tag";
  tag.textContent = text;
  return tag;
}

function createRelationshipHero(hero, matchup = null) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "relationship-hero";
  const metricText = matchup ? formatSignedRate(matchup.winRateLift) : "";
  button.setAttribute(
    "aria-label",
    metricText ? `Open ${hero.name}, ${metricText}` : `Open ${hero.name}`
  );

  const image = document.createElement("img");
  loadImage(image, [
    localHeroThumbnail(hero),
    hero.images.thumbnail,
    hero.images.map,
    hero.images.avatar
  ]);
  image.alt = "";
  image.loading = "lazy";
  image.decoding = "async";
  image.referrerPolicy = "no-referrer";

  const copy = document.createElement("span");
  copy.className = "relationship-hero-copy";
  const label = document.createElement("span");
  label.className = "relationship-hero-name";
  label.textContent = hero.name;
  copy.append(label);
  if (metricText) {
    const metric = document.createElement("span");
    metric.className = "relationship-hero-metric";
    metric.textContent = metricText;
    copy.append(metric);
  }
  button.append(image, copy);
  button.addEventListener("click", () => selectHero(hero.id, true));
  return button;
}

function renderRelationships(hero) {
  const block = hero.relations[state.relationship];
  const copy = relationshipText[state.relationship];
  const matchupById = new Map(
    (hero.stats?.counterMatchups || []).map((matchup) => [
      Number(matchup.heroId),
      matchup
    ])
  );
  const related = block.heroIds
    .map((id) => state.heroById.get(Number(id)))
    .filter(Boolean);

  elements.relationshipLabel.textContent = copy.label;
  elements.relationshipTitle.textContent = copy.title;
  elements.relationshipDescription.textContent =
    state.relationship === "counteredBy" && matchupById.size
      ? `Official seven-day, all-ranks counter ranking. WR lift shows how much the counter hero's win rate rises in this matchup.${block.description ? ` Official hero note: ${block.description}` : ""}`
      : block.description ||
        "The official source has not published a written matchup note for this relationship.";
  elements.relationshipGrid.replaceChildren(
    ...related.map((relatedHero) =>
      createRelationshipHero(
        relatedHero,
        state.relationship === "counteredBy"
          ? matchupById.get(relatedHero.id)
          : null
      )
    )
  );

  elements.relationshipTabs.querySelectorAll("[role='tab']").forEach((tab) => {
    tab.setAttribute(
      "aria-selected",
      String(tab.dataset.relationship === state.relationship)
    );
    tab.tabIndex = tab.dataset.relationship === state.relationship ? 0 : -1;
  });
}

function selectHero(id, shouldScroll = false) {
  const hero = state.heroById.get(Number(id));
  if (!hero) return;

  state.selectedId = hero.id;
  localStorage.setItem("adb-mlbb-last-hero", String(hero.id));
  renderHeroGrid();

  elements.heroName.textContent = hero.name;
  loadImage(elements.heroImage, [
    hero.images.painting,
    localHeroThumbnail(hero),
    hero.images.map,
    hero.images.avatar
  ]);
  elements.heroImage.alt = `${hero.name} official hero artwork`;
  elements.heroImage.referrerPolicy = "no-referrer";
  elements.heroReference.textContent = `HERO / ${String(hero.id).padStart(3, "0")}`;
  elements.heroStory.textContent =
    hero.story || "Official hero field record.";
  elements.heroSource.href = hero.sourceUrl;
  elements.heroTags.replaceChildren(
    ...[
      ...hero.roles,
      ...hero.lanes,
      ...hero.specialties.slice(0, 2)
    ].map(createTag)
  );

  elements.winRate.textContent = formatRate(hero.stats?.winRate);
  elements.pickRate.textContent = formatRate(hero.stats?.pickRate);
  elements.banRate.textContent = formatRate(hero.stats?.banRate);
  const freshness =
    state.data.meta.statsStatus === "preserved" ? " · saved snapshot" : "";
  elements.statsContext.textContent = hero.stats
    ? `Official ranked matches · past ${state.data.meta.statsPeriodDays || 7} days · ${state.data.meta.statsRankScope || "All ranks"}${freshness}`
    : "Official ranked rates are temporarily unavailable";
  renderRelationships(hero);
  elements.detail.hidden = false;

  if (shouldScroll) {
    elements.detail.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function renderPatch() {
  const patch = state.data?.patches?.[0] || state.data?.meta?.latestPatch;
  if (!patch) return;
  elements.patchName.textContent = patch.title;
  elements.patchDate.textContent = formatDate(patch.publishedAt);
  elements.patchLink.href = patch.url;
  if (patch.cover) {
    loadImage(elements.patchCover, [patch.cover]);
    elements.patchCover.alt = `${patch.title} official cover`;
    elements.patchCover.referrerPolicy = "no-referrer";
  }
}

function updateStatus() {
  const meta = state.data?.meta;
  const sourceLabel = state.live ? "LIVE FIELD DATA" : "SAVED FIELD DATA";
  const date = meta?.syncedAt ? formatDate(meta.syncedAt) : "UNKNOWN DATE";
  const stats =
    meta?.statsStatus === "current"
      ? `${meta?.statsCoverage || 0} rates current`
      : meta?.statsStatus === "preserved"
        ? `${meta?.statsCoverage || 0} saved rates`
        : "rates awaiting official host";

  elements.syncStatus.classList.toggle("is-offline", !state.live);
  elements.syncStatus.querySelector("span:last-child").textContent =
    `${sourceLabel} · ${meta?.heroCount || state.heroes.length} HEROES · ${date} · ${stats} · BUILD ${meta?.buildVersion || "5.0"}`;
}

async function loadData() {
  let data;
  try {
    const response = await fetch("/api/heroes", {
      headers: { Accept: "application/json" }
    });
    if (!response.ok) throw new Error("Live source unavailable");
    data = await response.json();
    if (
      data.meta?.buildVersion !== "5.0" ||
      Number(data.meta?.statsCoverage) < 120
    ) {
      throw new Error("Live source is still using an older data schema");
    }
    state.live = true;
  } catch {
    const fallback = await fetch("/data/heroes.json", {
      headers: { Accept: "application/json" }
    });
    if (!fallback.ok) throw new Error("Saved field data unavailable");
    data = await fallback.json();
    state.live = false;
  }

  state.data = data;
  state.heroes = data.heroes || [];
  state.heroById = new Map(state.heroes.map((hero) => [Number(hero.id), hero]));

  renderHeroGrid();
  renderPatch();
  updateStatus();

  const savedId = Number(localStorage.getItem("adb-mlbb-last-hero"));
  const initialId =
    (state.heroById.has(savedId) && savedId) ||
    (state.heroById.has(80) && 80) ||
    state.heroes[0]?.id;
  if (initialId) selectHero(initialId, false);
}

elements.search.addEventListener("input", (event) => {
  state.query = event.currentTarget.value;
  state.visibleCount = 12;
  renderHeroGrid();
});

elements.roleControls.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-role]");
  if (!button) return;
  state.role = button.dataset.role;
  state.visibleCount = 12;
  elements.roleControls.querySelectorAll("button").forEach((control) => {
    control.setAttribute("aria-pressed", String(control === button));
  });
  renderHeroGrid();
});

elements.showMore.addEventListener("click", () => {
  state.visibleCount += 12;
  renderHeroGrid();
});

elements.relationshipTabs.addEventListener("click", (event) => {
  const tab = event.target.closest("button[data-relationship]");
  if (!tab) return;
  state.relationship = tab.dataset.relationship;
  const hero = state.heroById.get(state.selectedId);
  if (hero) renderRelationships(hero);
});

elements.relationshipTabs.addEventListener("keydown", (event) => {
  if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
  const tabs = [...elements.relationshipTabs.querySelectorAll("[role='tab']")];
  const current = tabs.indexOf(document.activeElement);
  if (current < 0) return;
  event.preventDefault();
  const offset = event.key === "ArrowRight" ? 1 : -1;
  const next = tabs[(current + offset + tabs.length) % tabs.length];
  next.focus();
  next.click();
});

function applyTheme(theme) {
  const resolved = theme === "ink" ? "ink" : "ivory";
  document.body.dataset.theme = resolved;
  elements.themeToggle.querySelector("span").textContent =
    resolved === "ink" ? "Ink" : "Ivory";
  elements.themeToggle.setAttribute(
    "aria-label",
    `Switch to ${resolved === "ink" ? "Ivory" : "Ink"} theme`
  );
  document
    .querySelector('meta[name="theme-color"]')
    .setAttribute("content", resolved === "ink" ? "#0E0C09" : "#E4DECF");
  localStorage.setItem("adb-mlbb-theme", resolved);
}

elements.themeToggle.addEventListener("click", () => {
  applyTheme(document.body.dataset.theme === "ink" ? "ivory" : "ink");
});

applyTheme(localStorage.getItem("adb-mlbb-theme") || "ivory");

let installPrompt = null;
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  elements.installButton.hidden = false;
});

elements.installButton.addEventListener("click", async () => {
  if (!installPrompt) return;
  await installPrompt.prompt();
  installPrompt = null;
  elements.installButton.hidden = true;
});

window.addEventListener("appinstalled", () => {
  elements.installButton.hidden = true;
  installPrompt = null;
});

loadData().catch(() => {
  elements.grid.setAttribute("aria-busy", "false");
  elements.grid.hidden = true;
  elements.empty.hidden = false;
  elements.empty.textContent =
    "Field data could not be prepared. Check your connection and reload.";
  elements.syncStatus.classList.add("is-offline");
  elements.syncStatus.querySelector("span:last-child").textContent =
    "DATA UNAVAILABLE · RETRY WHEN ONLINE";
});
