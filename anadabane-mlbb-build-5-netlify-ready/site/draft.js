const state = {
  data: null,
  heroes: [],
  heroById: new Map(),
  ally: [],
  enemy: [],
  target: "ally",
  query: "",
  role: "All",
  visibleCount: 18,
  live: false
};

const STANDARD_LANES = [
  "EXP Lane",
  "Jungle",
  "Mid Lane",
  "Gold Lane",
  "Roam"
];

const CAPABILITIES = [
  {
    key: "aoe",
    label: "AOE",
    tags: ["AOE"],
    specialties: []
  },
  {
    key: "burst",
    label: "Burst",
    tags: ["Burst"],
    specialties: ["Burst", "Finisher"]
  },
  {
    key: "mobility",
    label: "Mobility",
    tags: ["Mobility", "Speed Up", "Teleport", "Charge", "Attach"],
    specialties: ["Chase", "Charge"]
  },
  {
    key: "sustain",
    label: "Sustain",
    tags: ["Heal", "Shield", "Reduce DMG", "Death Immunity", "Invincible"],
    specialties: ["Regen", "Guard", "Support"]
  },
  {
    key: "poke",
    label: "Poke",
    tags: [],
    specialties: ["Poke"]
  },
  {
    key: "initiation",
    label: "Initiation",
    tags: ["CC", "Charge", "Slow"],
    specialties: ["Initiator", "Crowd Control", "Control", "Charge"]
  },
  {
    key: "cleanse",
    label: "Cleanse",
    tags: ["Remove CC", "CC Immune", "Invincible"],
    specialties: []
  }
];

const elements = {
  dataStatus: document.querySelector("#draft-data-status"),
  allyTeam: document.querySelector("#ally-team"),
  enemyTeam: document.querySelector("#enemy-team"),
  allySlots: document.querySelector("#ally-slots"),
  enemySlots: document.querySelector("#enemy-slots"),
  allyCount: document.querySelector("#ally-count"),
  enemyCount: document.querySelector("#enemy-count"),
  teamTargets: document.querySelectorAll("[data-target]"),
  activeTeamLabel: document.querySelector("#active-team-label"),
  search: document.querySelector("#draft-search"),
  roleControls: document.querySelector("#draft-role-controls"),
  heroGrid: document.querySelector("#draft-hero-grid"),
  heroCount: document.querySelector("#draft-hero-count"),
  empty: document.querySelector("#draft-empty-state"),
  showMore: document.querySelector("#draft-show-more"),
  reset: document.querySelector("#reset-draft"),
  progress: document.querySelector("#draft-progress"),
  verdict: document.querySelector("#draft-verdict"),
  verdictLabel: document.querySelector("#verdict-label"),
  verdictSummary: document.querySelector("#verdict-summary"),
  ratings: document.querySelector("#rating-comparisons"),
  capabilities: document.querySelector("#capability-comparisons"),
  damage: document.querySelector("#damage-comparison"),
  coverage: document.querySelector("#coverage-comparison"),
  matchupScore: document.querySelector("#matchup-score"),
  allyEdges: document.querySelector("#ally-matchup-edges"),
  enemyEdges: document.querySelector("#enemy-matchup-edges"),
  themeToggle: document.querySelector("#theme-toggle")
};

function localThumbnail(hero) {
  return `/assets/hero-thumbnails/${Number(hero.id)}.webp?v=5`;
}

function loadImage(image, hero) {
  const queue = [
    localThumbnail(hero),
    hero.images?.thumbnail,
    hero.images?.map,
    hero.images?.avatar,
    "/assets/logo-green.png"
  ].filter(Boolean);
  let index = 0;

  image.onerror = () => {
    index += 1;
    if (index < queue.length) image.src = queue[index];
  };
  image.src = queue[0];
}

function cleanCollection(values = []) {
  return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))];
}

function teamHeroes(side) {
  return state[side]
    .map((id) => state.heroById.get(Number(id)))
    .filter(Boolean);
}

function saveDraft() {
  localStorage.setItem(
    "adb-mlbb-draft-v1",
    JSON.stringify({ ally: state.ally, enemy: state.enemy })
  );
}

function restoreDraft() {
  try {
    const saved = JSON.parse(localStorage.getItem("adb-mlbb-draft-v1"));
    const used = new Set();
    for (const side of ["ally", "enemy"]) {
      const ids = Array.isArray(saved?.[side]) ? saved[side] : [];
      state[side] = ids
        .map(Number)
        .filter((id) => {
          if (!state.heroById.has(id) || used.has(id)) return false;
          used.add(id);
          return true;
        })
        .slice(0, 5);
    }
  } catch {
    state.ally = [];
    state.enemy = [];
  }

  if (state.ally.length >= 5 && state.enemy.length < 5) state.target = "enemy";
}

function setTarget(side) {
  if (!["ally", "enemy"].includes(side)) return;
  state.target = side;
  state.visibleCount = 18;
  renderTeams();
  renderPicker();
}

function createSlot(hero, side, index) {
  if (!hero) {
    const empty = document.createElement("div");
    empty.className = "draft-slot is-empty";
    empty.textContent = String(index + 1).padStart(2, "0");
    return empty;
  }

  const button = document.createElement("button");
  button.type = "button";
  button.className = "draft-slot is-filled";
  button.setAttribute("aria-label", `Remove ${hero.name} from ${side} team`);

  const image = document.createElement("img");
  image.alt = "";
  image.loading = "lazy";
  image.decoding = "async";
  loadImage(image, hero);

  const copy = document.createElement("span");
  copy.className = "draft-slot-copy";
  const name = document.createElement("span");
  name.className = "draft-slot-name";
  name.textContent = hero.name;
  const role = document.createElement("span");
  role.className = "draft-slot-role";
  role.textContent = hero.roles.join(" / ");
  copy.append(name, role);
  button.append(image, copy);

  button.addEventListener("click", () => {
    state[side] = state[side].filter((id) => Number(id) !== Number(hero.id));
    state.target = side;
    saveDraft();
    renderAll();
  });
  return button;
}

function renderTeamSlots(side) {
  const heroes = teamHeroes(side);
  const slots = Array.from({ length: 5 }, (_, index) =>
    createSlot(heroes[index] || null, side, index)
  );
  elements[`${side}Slots`].replaceChildren(...slots);
  elements[`${side}Count`].textContent = `${heroes.length} / 5`;
}

function renderTeams() {
  renderTeamSlots("ally");
  renderTeamSlots("enemy");
  elements.allyTeam.classList.toggle("is-active", state.target === "ally");
  elements.enemyTeam.classList.toggle("is-active", state.target === "enemy");
  elements.teamTargets.forEach((button) => {
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.target === state.target)
    );
  });
  elements.activeTeamLabel.textContent =
    state.target === "ally"
      ? "Adding to your side"
      : "Adding to the enemy side";
}

function filteredHeroes() {
  const selected = new Set([...state.ally, ...state.enemy].map(Number));
  const query = state.query.trim().toLocaleLowerCase();
  return state.heroes.filter((hero) => {
    const roleMatch =
      state.role === "All" || hero.roles.includes(state.role);
    const queryMatch =
      !query ||
      hero.name.toLocaleLowerCase().includes(query) ||
      hero.roles.some((role) => role.toLocaleLowerCase().includes(query)) ||
      hero.lanes.some((lane) => lane.toLocaleLowerCase().includes(query));
    return !selected.has(Number(hero.id)) && roleMatch && queryMatch;
  });
}

function addHero(hero) {
  if (!hero || state[state.target].length >= 5) return;
  if ([...state.ally, ...state.enemy].includes(Number(hero.id))) return;

  state[state.target].push(Number(hero.id));
  if (state[state.target].length >= 5) {
    const other = state.target === "ally" ? "enemy" : "ally";
    if (state[other].length < 5) state.target = other;
  }
  saveDraft();
  renderAll();
}

function createPickerHero(hero) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "draft-hero";
  button.setAttribute(
    "aria-label",
    `Add ${hero.name} to ${state.target === "ally" ? "allied" : "enemy"} five`
  );

  const image = document.createElement("img");
  image.alt = "";
  image.loading = "lazy";
  image.decoding = "async";
  loadImage(image, hero);

  const copy = document.createElement("span");
  copy.className = "draft-hero-copy";
  const name = document.createElement("span");
  name.className = "draft-hero-name";
  name.textContent = hero.name;
  const meta = document.createElement("span");
  meta.className = "draft-hero-meta";
  meta.textContent = [...hero.roles, ...hero.lanes].join(" · ");
  copy.append(name, meta);
  button.append(image, copy);
  button.addEventListener("click", () => addHero(hero));
  return button;
}

function renderPicker() {
  const heroes = filteredHeroes();
  const visible = heroes.slice(0, state.visibleCount);
  elements.heroGrid.replaceChildren(...visible.map(createPickerHero));
  elements.heroGrid.setAttribute("aria-busy", "false");
  elements.heroGrid.hidden = heroes.length === 0;
  elements.empty.hidden = heroes.length !== 0;
  elements.heroCount.textContent =
    visible.length < heroes.length
      ? `${visible.length} of ${heroes.length} available`
      : `${heroes.length} available`;
  elements.showMore.hidden = heroes.length === 0 || visible.length >= heroes.length;
  elements.showMore.textContent = `Show ${Math.min(
    18,
    heroes.length - visible.length
  )} more heroes`;
}

function average(heroes, key) {
  if (!heroes.length) return 0;
  return (
    heroes.reduce(
      (sum, hero) => sum + Number(hero.draftProfile?.ratings?.[key] || 0),
      0
    ) / heroes.length
  );
}

function tagSet(hero) {
  return new Set(
    (hero.draftProfile?.skillTags || []).map((entry) => entry.name)
  );
}

function heroHasCapability(hero, definition) {
  const tags = tagSet(hero);
  const specialties = new Set(hero.specialties || []);
  return (
    definition.tags.some((tag) => tags.has(tag)) ||
    definition.specialties.some((specialty) => specialties.has(specialty))
  );
}

function countMap(values) {
  const result = new Map();
  for (const value of values) {
    if (!value) continue;
    result.set(value, (result.get(value) || 0) + 1);
  }
  return result;
}

function teamMetrics(heroes) {
  return {
    size: heroes.length,
    ratings: {
      offense: average(heroes, "offense"),
      durability: average(heroes, "durability"),
      controlEffect: average(heroes, "controlEffect"),
      difficulty: average(heroes, "difficulty")
    },
    capabilities: Object.fromEntries(
      CAPABILITIES.map((definition) => [
        definition.key,
        heroes.filter((hero) => heroHasCapability(hero, definition)).length
      ])
    ),
    damage: countMap(
      heroes.flatMap((hero) => hero.draftProfile?.damageTypes || [])
    ),
    roles: countMap(heroes.flatMap((hero) => hero.roles || [])),
    lanes: countMap(heroes.flatMap((hero) => hero.lanes || []))
  };
}

function categoryVerdict(difference, threshold) {
  if (difference >= threshold) {
    return { label: "Strong", className: "is-strong" };
  }
  if (difference <= -threshold) {
    return { label: "Weak", className: "is-weak" };
  }
  return { label: "Fair", className: "is-fair" };
}

function createComparisonRow({
  label,
  allyValue,
  enemyValue,
  allyBar,
  enemyBar,
  verdict
}) {
  const row = document.createElement("div");
  row.className = "comparison-row";

  const name = document.createElement("span");
  name.className = "comparison-label";
  name.textContent = label;

  const bars = document.createElement("div");
  bars.className = "comparison-bars";
  for (const [side, value, width] of [
    ["ally", allyValue, allyBar],
    ["enemy", enemyValue, enemyBar]
  ]) {
    const bar = document.createElement("div");
    bar.className = `comparison-bar ${side === "enemy" ? "enemy" : ""}`;
    const fill = document.createElement("span");
    fill.style.width = `${Math.max(0, Math.min(100, width))}%`;
    const text = document.createElement("strong");
    text.textContent = `${side === "ally" ? "YOU" : "EN"} ${value}`;
    bar.append(fill, text);
    bars.append(bar);
  }

  const result = document.createElement("span");
  result.className = `comparison-verdict ${verdict.className}`;
  result.textContent = verdict.label;
  row.append(name, bars, result);
  return row;
}

function renderRatingComparisons(ally, enemy) {
  const definitions = [
    ["Offense", "offense"],
    ["Durability", "durability"],
    ["Control", "controlEffect"]
  ];
  const rows = definitions.map(([label, key]) => {
    const allyValue = ally.ratings[key];
    const enemyValue = enemy.ratings[key];
    return createComparisonRow({
      label,
      allyValue: allyValue.toFixed(0),
      enemyValue: enemyValue.toFixed(0),
      allyBar: allyValue,
      enemyBar: enemyValue,
      verdict: categoryVerdict(allyValue - enemyValue, 8)
    });
  });

  const allyDifficulty = ally.ratings.difficulty;
  const enemyDifficulty = enemy.ratings.difficulty;
  const difficultyDifference = allyDifficulty - enemyDifficulty;
  const difficultyVerdict =
    difficultyDifference <= -8
      ? { label: "Easier", className: "is-strong" }
      : difficultyDifference >= 8
        ? { label: "Harder", className: "is-weak" }
        : { label: "Fair", className: "is-fair" };
  rows.push(
    createComparisonRow({
      label: "Difficulty",
      allyValue: allyDifficulty.toFixed(0),
      enemyValue: enemyDifficulty.toFixed(0),
      allyBar: allyDifficulty,
      enemyBar: enemyDifficulty,
      verdict: difficultyVerdict
    })
  );
  elements.ratings.replaceChildren(...rows);
}

function capabilityRate(metrics, key) {
  return metrics.size ? metrics.capabilities[key] / metrics.size : 0;
}

function renderCapabilityComparisons(ally, enemy) {
  const rows = CAPABILITIES.map((definition) => {
    const allyRate = capabilityRate(ally, definition.key);
    const enemyRate = capabilityRate(enemy, definition.key);
    return createComparisonRow({
      label: definition.label,
      allyValue: `${ally.capabilities[definition.key]}/${ally.size || 0}`,
      enemyValue: `${enemy.capabilities[definition.key]}/${enemy.size || 0}`,
      allyBar: allyRate * 100,
      enemyBar: enemyRate * 100,
      verdict: categoryVerdict(allyRate - enemyRate, 0.2)
    });
  });
  elements.capabilities.replaceChildren(...rows);
}

function createChip(label) {
  const chip = document.createElement("span");
  chip.className = "fact-chip";
  chip.textContent = label;
  return chip;
}

function createTeamFact(label, chips, note) {
  const fact = document.createElement("div");
  fact.className = "team-fact";
  const heading = document.createElement("span");
  heading.textContent = label;
  const list = document.createElement("div");
  list.className = "fact-chips";
  list.replaceChildren(
    ...(chips.length ? chips.map(createChip) : [createChip("No data yet")])
  );
  const copy = document.createElement("p");
  copy.className = "fact-note";
  copy.textContent = note;
  fact.append(heading, list, copy);
  return fact;
}

function damageChips(metrics) {
  return ["Physical", "Magic", "True"]
    .filter((type) => metrics.damage.has(type))
    .map((type) => `${type} · ${metrics.damage.get(type)}`);
}

function missingDamageNote(metrics) {
  const missing = ["Physical", "Magic"].filter(
    (type) => !metrics.damage.has(type)
  );
  return missing.length
    ? `No declared ${missing.join(" or ").toLowerCase()} skill damage in this draft.`
    : "Physical and magic skill damage are both represented.";
}

function laneKey(value) {
  return String(value).toLocaleLowerCase().replace("exp", "EXP");
}

function missingLanes(metrics) {
  const present = new Set([...metrics.lanes.keys()].map(laneKey));
  return STANDARD_LANES.filter((lane) => !present.has(laneKey(lane)));
}

function compositionChips(metrics) {
  const lanes = [...metrics.lanes].map(([lane, count]) => `${lane} · ${count}`);
  const roles = [...metrics.roles].map(([role, count]) => `${role} · ${count}`);
  return [...lanes, ...roles];
}

function compositionNote(metrics) {
  const missing = missingLanes(metrics);
  if (!metrics.size) return "Add heroes to inspect role and lane coverage.";
  if (metrics.size < 5) {
    return `${metrics.size}/5 selected · ${missing.length} standard lanes still open.`;
  }
  return missing.length
    ? `Missing standard lane coverage: ${missing.join(", ")}.`
    : "All five standard lane assignments are represented.";
}

function renderFacts(ally, enemy) {
  elements.damage.replaceChildren(
    createTeamFact(
      "Your side",
      damageChips(ally),
      missingDamageNote(ally)
    ),
    createTeamFact(
      "Enemy side",
      damageChips(enemy),
      missingDamageNote(enemy)
    )
  );
  elements.coverage.replaceChildren(
    createTeamFact(
      "Your side",
      compositionChips(ally),
      compositionNote(ally)
    ),
    createTeamFact(
      "Enemy side",
      compositionChips(enemy),
      compositionNote(enemy)
    )
  );
}

function matchupEdges(counters, targets) {
  const counterById = new Map(counters.map((hero) => [Number(hero.id), hero]));
  const edges = [];
  const seen = new Set();

  for (const target of targets) {
    for (const matchup of target.stats?.counterMatchups || []) {
      const counter = counterById.get(Number(matchup.heroId));
      if (!counter) continue;
      const key = `${counter.id}:${target.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({
        counter,
        target,
        lift: Number(matchup.winRateLift) || 0,
        ranked: true
      });
    }

    const editorialIds =
      target.relations?.counteredBy?.editorialHeroIds ||
      target.relations?.counteredBy?.heroIds ||
      [];
    for (const counterId of editorialIds) {
      const counter = counterById.get(Number(counterId));
      if (!counter) continue;
      const key = `${counter.id}:${target.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({
        counter,
        target,
        lift: 0,
        ranked: false
      });
    }
  }

  return edges.sort((a, b) => b.lift - a.lift);
}

function edgePressure(edges) {
  return edges.reduce(
    (sum, edge) => sum + (edge.ranked ? edge.lift * 100 : 0.75),
    0
  );
}

function renderEdgeList(element, edges) {
  if (!edges.length) {
    const empty = document.createElement("li");
    empty.className = "is-empty";
    empty.textContent = "No published direct counter relationship in the current picks.";
    element.replaceChildren(empty);
    return;
  }

  element.replaceChildren(
    ...edges.slice(0, 10).map((edge) => {
      const item = document.createElement("li");
      item.textContent = edge.ranked
        ? `${edge.counter.name} counters ${edge.target.name} · +${(
            edge.lift * 100
          ).toFixed(2)}% ranked WR lift`
        : `${edge.counter.name} counters ${edge.target.name} · official hero note`;
      return item;
    })
  );
}

function renderMatchups(allies, enemies) {
  const allyEdges = matchupEdges(allies, enemies);
  const enemyEdges = matchupEdges(enemies, allies);
  const allyPressure = edgePressure(allyEdges);
  const enemyPressure = edgePressure(enemyEdges);
  const difference = allyPressure - enemyPressure;

  renderEdgeList(elements.allyEdges, allyEdges);
  renderEdgeList(elements.enemyEdges, enemyEdges);
  elements.matchupScore.textContent =
    Math.abs(difference) < 0.5
      ? "Direct counter pressure is fair"
      : difference > 0
        ? `Your side +${difference.toFixed(2)} pressure`
        : `Enemy side +${Math.abs(difference).toFixed(2)} pressure`;

  return { allyEdges, enemyEdges, difference };
}

function laneCoverageRate(metrics) {
  if (!metrics.size) return 0;
  return (STANDARD_LANES.length - missingLanes(metrics).length) / metrics.size;
}

function leadingLabels(ally, enemy) {
  const leads = [];
  const enemyLeads = [];
  for (const [label, key] of [
    ["offense", "offense"],
    ["durability", "durability"],
    ["control", "controlEffect"]
  ]) {
    const verdict = categoryVerdict(
      ally.ratings[key] - enemy.ratings[key],
      8
    ).label;
    if (verdict === "Strong") leads.push(label);
    if (verdict === "Weak") enemyLeads.push(label);
  }
  for (const definition of CAPABILITIES) {
    const verdict = categoryVerdict(
      capabilityRate(ally, definition.key) -
        capabilityRate(enemy, definition.key),
      0.2
    ).label;
    if (verdict === "Strong") leads.push(definition.label);
    if (verdict === "Weak") enemyLeads.push(definition.label);
  }
  return { leads, enemyLeads };
}

function renderVerdict(allies, enemies, ally, enemy, matchup) {
  const hasBoth = allies.length && enemies.length;
  const isFull = allies.length === 5 && enemies.length === 5;
  elements.progress.textContent = hasBoth
    ? `Allies ${allies.length}/5 · Enemies ${enemies.length}/5 · ${
        isFull ? "Full draft" : "Provisional"
      }`
    : "Pick at least one hero on each side";

  if (!hasBoth) {
    elements.verdict.dataset.verdict = "waiting";
    elements.verdictLabel.textContent = "Waiting for both sides";
    elements.verdictSummary.textContent =
      "The comparison begins as soon as both teams have at least one hero.";
    return;
  }

  const ratingDifference =
    ((ally.ratings.offense - enemy.ratings.offense) +
      (ally.ratings.durability - enemy.ratings.durability) +
      (ally.ratings.controlEffect - enemy.ratings.controlEffect)) /
    3;
  const capabilityDifference =
    (CAPABILITIES.reduce(
      (sum, definition) =>
        sum +
        capabilityRate(ally, definition.key) -
        capabilityRate(enemy, definition.key),
      0
    ) /
      CAPABILITIES.length) *
    100;
  const laneDifference =
    (laneCoverageRate(ally) - laneCoverageRate(enemy)) * 10;
  const score =
    ratingDifference * 0.5 +
    capabilityDifference * 0.28 +
    laneDifference * 0.1 +
    matchup.difference * 0.12;
  const verdict = categoryVerdict(score, 5);
  const label =
    verdict.label === "Strong"
      ? "Strong composition edge"
      : verdict.label === "Weak"
        ? "Weak composition edge"
        : "Fair composition field";
  elements.verdict.dataset.verdict = verdict.label.toLocaleLowerCase();
  elements.verdictLabel.textContent = label;

  const { leads, enemyLeads } = leadingLabels(ally, enemy);
  const parts = [];
  if (!isFull) parts.push("This is a provisional read");
  if (leads.length) {
    parts.push(`your side leads in ${leads.slice(0, 3).join(", ")}`);
  }
  if (enemyLeads.length) {
    parts.push(`the enemy leads in ${enemyLeads.slice(0, 3).join(", ")}`);
  }
  if (matchup.allyEdges.length || matchup.enemyEdges.length) {
    parts.push(
      `the selected heroes create ${matchup.allyEdges.length} counter edge${
        matchup.allyEdges.length === 1 ? "" : "s"
      } for you and ${matchup.enemyEdges.length} for the enemy`
    );
  }
  elements.verdictSummary.textContent = `${parts.join("; ")}.`;
}

function renderAnalysis() {
  const allies = teamHeroes("ally");
  const enemies = teamHeroes("enemy");
  const ally = teamMetrics(allies);
  const enemy = teamMetrics(enemies);
  renderRatingComparisons(ally, enemy);
  renderCapabilityComparisons(ally, enemy);
  renderFacts(ally, enemy);
  const matchup = renderMatchups(allies, enemies);
  renderVerdict(allies, enemies, ally, enemy, matchup);
}

function renderAll() {
  renderTeams();
  renderPicker();
  renderAnalysis();
}

function updateDataStatus() {
  const meta = state.data?.meta;
  const source = state.live ? "LIVE DRAFT DATA" : "SAVED DRAFT DATA";
  elements.dataStatus.classList.toggle("is-offline", !state.live);
  elements.dataStatus.querySelector("span:last-child").textContent =
    `${source} · ${meta?.draftProfileCoverage || state.heroes.length} HERO PROFILES · BUILD ${meta?.buildVersion || "5.0"}`;
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
      Number(data.meta?.draftProfileCoverage) < 120
    ) {
      throw new Error("Live draft schema is outdated");
    }
    state.live = true;
  } catch {
    const response = await fetch("/data/heroes.json", {
      headers: { Accept: "application/json" }
    });
    if (!response.ok) throw new Error("Saved draft data unavailable");
    data = await response.json();
    state.live = false;
  }

  state.data = data;
  state.heroes = data.heroes || [];
  state.heroById = new Map(state.heroes.map((hero) => [Number(hero.id), hero]));
  restoreDraft();
  updateDataStatus();
  renderAll();
}

elements.teamTargets.forEach((button) => {
  button.addEventListener("click", () => setTarget(button.dataset.target));
});

elements.search.addEventListener("input", (event) => {
  state.query = event.currentTarget.value;
  state.visibleCount = 18;
  renderPicker();
});

elements.roleControls.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-role]");
  if (!button) return;
  state.role = button.dataset.role;
  state.visibleCount = 18;
  elements.roleControls.querySelectorAll("button").forEach((control) => {
    control.setAttribute("aria-pressed", String(control === button));
  });
  renderPicker();
});

elements.showMore.addEventListener("click", () => {
  state.visibleCount += 18;
  renderPicker();
});

elements.reset.addEventListener("click", () => {
  state.ally = [];
  state.enemy = [];
  state.target = "ally";
  state.query = "";
  state.role = "All";
  state.visibleCount = 18;
  elements.search.value = "";
  elements.roleControls.querySelectorAll("button").forEach((button) => {
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.role === "All")
    );
  });
  saveDraft();
  renderAll();
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

loadData().catch(() => {
  elements.heroGrid.setAttribute("aria-busy", "false");
  elements.heroGrid.hidden = true;
  elements.empty.hidden = false;
  elements.empty.textContent =
    "Draft profiles could not be prepared. Check your connection and reload.";
  elements.dataStatus.classList.add("is-offline");
  elements.dataStatus.querySelector("span:last-child").textContent =
    "DRAFT DATA UNAVAILABLE";
});
