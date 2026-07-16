"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type MemoryItem = {
  id: string;
  prompt: string;
  answer: string;
  subject: string;
  source: string;
  dueAt: number;
  interval: number;
  reviews: number;
};

type ReviewGrade = "again" | "hard" | "good" | "easy";

const STORAGE_KEY = "anadabane-memory-field-v2";
const SESSION_KEY = "anadabane-memory-session-v2";

const seedItems: MemoryItem[] = [
  {
    id: "cell-membrane",
    prompt: "Why can phospholipids form a stable membrane in water?",
    answer:
      "Their hydrophilic heads face the surrounding water while hydrophobic tails turn inward, forming a self-sealing bilayer.",
    subject: "Cell biology",
    source: "Lecture 04 · Membranes",
    dueAt: 0,
    interval: 0,
    reviews: 0,
  },
  {
    id: "elasticity",
    prompt: "What does a price elasticity of demand greater than 1 mean?",
    answer:
      "Demand is elastic: the percentage change in quantity demanded is larger than the percentage change in price.",
    subject: "Economics",
    source: "Week 02 · Markets",
    dueAt: 0,
    interval: 1,
    reviews: 1,
  },
  {
    id: "working-memory",
    prompt: "Why is retrieval more useful than simply rereading a familiar page?",
    answer:
      "Retrieval requires reconstructing knowledge from memory. That effort strengthens later access and exposes what is not yet known.",
    subject: "Learning science",
    source: "Roediger & Karpicke · 2006",
    dueAt: 0,
    interval: 3,
    reviews: 2,
  },
  {
    id: "newton-second",
    prompt: "State Newton’s second law and explain what it predicts.",
    answer:
      "F = ma. An object’s acceleration is proportional to the net force and inversely proportional to its mass, in the force’s direction.",
    subject: "Physics",
    source: "Mechanics · Unit 01",
    dueAt: 0,
    interval: 7,
    reviews: 3,
  },
];

const evidence = [
  {
    id: "01",
    title: "Retrieve",
    level: "High utility",
    description:
      "Close the notes and reconstruct the answer. Testing is a learning event, not only a measurement.",
    action: "Use free recall before revealing the answer.",
    href: "https://pubmed.ncbi.nlm.nih.gov/16507066/",
    source: "Roediger & Karpicke · 2006",
  },
  {
    id: "02",
    title: "Space",
    level: "High utility",
    description:
      "Return after some forgetting. Distributed study consistently outperforms massed repetition for later recall.",
    action: "Let each rating set a future review date.",
    href: "https://digitalcommons.usf.edu/psy_facpub/1771/",
    source: "Cepeda et al. · 2006",
  },
  {
    id: "03",
    title: "Mix",
    level: "Moderate utility",
    description:
      "Interleave related problem types so you must choose the right method instead of repeating one routine.",
    action: "Keep subjects mixed in the daily route.",
    href: "https://eric.ed.gov/?id=EJ786797",
    source: "Rohrer & Taylor · 2007",
  },
  {
    id: "04",
    title: "Explain",
    level: "Moderate utility",
    description:
      "Explain why an answer works and connect each step to a principle you already understand.",
    action: "Write one plain-language explanation after recall.",
    href: "https://doi.org/10.1207/s15516709cog1302_1",
    source: "Chi et al. · 1989",
  },
];

function dayStamp() {
  return new Date().toISOString().slice(0, 10);
}

function dueLabel(dueAt: number) {
  if (!dueAt || dueAt <= Date.now()) return "DUE NOW";
  const days = Math.ceil((dueAt - Date.now()) / 86_400_000);
  if (days <= 1) return "TOMORROW";
  return `IN ${days} DAYS`;
}

function nextInterval(item: MemoryItem, grade: ReviewGrade) {
  const current = Math.max(item.interval, 1);
  if (grade === "again") return 0;
  if (grade === "hard") return Math.max(1, Math.round(current * 1.2));
  if (grade === "good") return item.reviews === 0 ? 1 : Math.max(2, Math.round(current * 2.2));
  return item.reviews === 0 ? 4 : Math.max(4, Math.round(current * 3.5));
}

export default function Home() {
  const [items, setItems] = useState<MemoryItem[]>(seedItems);
  const [reviewedToday, setReviewedToday] = useState(0);
  const [theme, setTheme] = useState<"ivory" | "ink">("ivory");
  const [revealed, setRevealed] = useState(false);
  const [attempt, setAttempt] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [practiceOverride, setPracticeOverride] = useState<string | null>(null);
  const reviewRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }

    const session = window.localStorage.getItem(SESSION_KEY);
    if (session) {
      try {
        const parsed = JSON.parse(session);
        if (parsed.date === dayStamp()) setReviewedToday(parsed.count ?? 0);
      } catch {
        window.localStorage.removeItem(SESSION_KEY);
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.dueAt - b.dueAt),
    [items],
  );

  const dueItems = sortedItems.filter((item) => !item.dueAt || item.dueAt <= Date.now());
  const current = practiceOverride
    ? items.find((item) => item.id === practiceOverride)
    : dueItems[0];
  const futureItems = sortedItems.filter((item) => item.dueAt > Date.now());
  const mastery = items.length
    ? Math.round(
        (items.reduce((total, item) => total + Math.min(item.interval, 30), 0) /
          (items.length * 30)) *
          100,
      )
    : 0;

  const filteredItems = sortedItems.filter((item) => {
    const haystack = `${item.prompt} ${item.answer} ${item.subject}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  function startReview() {
    setPracticeOverride(null);
    reviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function gradeReview(grade: ReviewGrade) {
    if (!current) return;
    const days = nextInterval(current, grade);
    const dueAt = grade === "again" ? Date.now() + 10 * 60_000 : Date.now() + days * 86_400_000;

    setItems((existing) =>
      existing.map((item) =>
        item.id === current.id
          ? {
              ...item,
              dueAt,
              interval: days,
              reviews: item.reviews + 1,
            }
          : item,
      ),
    );

    const nextCount = reviewedToday + 1;
    setReviewedToday(nextCount);
    window.localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ date: dayStamp(), count: nextCount }),
    );
    setRevealed(false);
    setAttempt("");
    setPracticeOverride(null);
    setNotice(
      grade === "again"
        ? "RETURNING IN 10 MIN"
        : `NEXT REVIEW · ${days === 1 ? "TOMORROW" : `IN ${days} DAYS`}`,
    );
    window.setTimeout(() => setNotice(""), 2600);
  }

  function addMemory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const prompt = String(data.get("prompt") ?? "").trim();
    const answer = String(data.get("answer") ?? "").trim();
    const subject = String(data.get("subject") ?? "General").trim() || "General";
    const source = String(data.get("source") ?? "Personal note").trim() || "Personal note";
    if (!prompt || !answer) return;

    const item: MemoryItem = {
      id: `${Date.now()}`,
      prompt,
      answer,
      subject,
      source,
      dueAt: Date.now(),
      interval: 0,
      reviews: 0,
    };
    setItems((existing) => [item, ...existing]);
    event.currentTarget.reset();
    setFormOpen(false);
    setNotice("MEMORY ADDED · DUE NOW");
    window.setTimeout(() => setNotice(""), 2600);
  }

  function practiceItem(id: string) {
    setPracticeOverride(id);
    setRevealed(false);
    setAttempt("");
    reviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="site-shell" data-theme={theme}>
      <nav className="site-nav" aria-label="Primary navigation">
        <a className="brand-lockup" href="#top" aria-label="anaDaBane Memory Field home">
          <img src={theme === "ivory" ? "/logo-green.png" : "/logo-ivory.png"} alt="" />
          <span>anaDaBane</span>
        </a>
        <span className="nav-title">Memory Field · 01°N</span>
        <div className="nav-actions">
          <span className="local-note">LOCAL / PRIVATE</span>
          <button
            className="theme-switch"
            type="button"
            onClick={() => setTheme(theme === "ivory" ? "ink" : "ivory")}
            aria-label={`Switch to ${theme === "ivory" ? "Ink" : "Ivory"} theme`}
          >
            {theme === "ivory" ? "INK" : "IVORY"}
          </button>
        </div>
      </nav>

      <main id="top">
        <header className="hero-section">
          <div className="hero-copy">
            <div className="micro-label">A STUDY INSTRUMENT FOR DURABLE MEMORY</div>
            <h1>Recall,<br />then refine.</h1>
            <p className="editorial-line">
              “The route to knowing is the route back from memory.”
            </p>
            <p className="hero-description">
              Practice retrieval, reveal precise feedback, and let each answer set the next review. Your work stays on this device.
            </p>
            <div className="hero-actions">
              <button className="primary-button" type="button" onClick={startReview}>
                START TODAY’S RECALL <span aria-hidden="true">→</span>
              </button>
              <button className="quiet-button" type="button" onClick={() => setFormOpen(true)}>
                + ADD A MEMORY
              </button>
            </div>
          </div>

          <aside className="route-plate" aria-label="Today's study route">
            <span className="reg tl" /><span className="reg tr" />
            <span className="reg bl" /><span className="reg br" />
            <div className="route-head">
              <span>TODAY’S ROUTE</span>
              <span className="mono">{dayStamp()}</span>
            </div>
            <div className="route-primary">
              <span className="route-number">{String(dueItems.length).padStart(2, "0")}</span>
              <span className="route-unit">ITEMS<br />DUE NOW</span>
            </div>
            <div className="route-grid">
              <div><span>RECALLED</span><strong>{String(reviewedToday).padStart(2, "0")}</strong></div>
              <div><span>LIBRARY</span><strong>{String(items.length).padStart(2, "0")}</strong></div>
              <div><span>STABILITY</span><strong>{mastery}%</strong></div>
            </div>
            <div className="route-foot">
              <span>TRUE NORTH</span>
              <span className="compass-mini" aria-hidden="true">N</span>
            </div>
          </aside>
        </header>

        <div className="section-rule" />

        <section className="workspace" ref={reviewRef} aria-labelledby="recall-heading">
          <div className="section-heading">
            <div>
              <span className="micro-label">01 / RETRIEVAL FIELD</span>
              <h2 id="recall-heading">Today’s recall</h2>
            </div>
            <p>Answer before you look. Difficulty is information, not failure.</p>
          </div>

          <div className="workspace-grid">
            <article className="recall-card" aria-live="polite">
              <span className="reg tl" /><span className="reg tr" />
              <span className="reg bl" /><span className="reg br" />
              {current ? (
                <>
                  <div className="card-meta">
                    <span>{current.subject.toUpperCase()}</span>
                    <span className="mono">REVIEW {String(current.reviews + 1).padStart(2, "0")}</span>
                  </div>
                  <h3>{current.prompt}</h3>
                  <label className="attempt-label" htmlFor="attempt">
                    RETRIEVE FROM MEMORY
                  </label>
                  <textarea
                    id="attempt"
                    value={attempt}
                    onChange={(event) => setAttempt(event.target.value)}
                    placeholder="Write what you remember. Use your own words; incomplete is useful."
                    disabled={revealed}
                  />

                  {!revealed ? (
                    <div className="recall-actions">
                      <button className="primary-button" type="button" onClick={() => setRevealed(true)}>
                        REVEAL & COMPARE
                      </button>
                      <span className="source-note">SOURCE · {current.source}</span>
                    </div>
                  ) : (
                    <div className="feedback-panel">
                      <div className="feedback-label">
                        <span>REFERENCE ANSWER</span>
                        <span className="mono">FEEDBACK 01</span>
                      </div>
                      <p>{current.answer}</p>
                      <div className="confidence-row" aria-label="Rate your recall">
                        <button type="button" onClick={() => gradeReview("again")}><b>AGAIN</b><span>10 min</span></button>
                        <button type="button" onClick={() => gradeReview("hard")}><b>HARD</b><span>1+ day</span></button>
                        <button type="button" onClick={() => gradeReview("good")}><b>GOOD</b><span>spaced</span></button>
                        <button type="button" onClick={() => gradeReview("easy")}><b>EASY</b><span>longer</span></button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="complete-state">
                  <span className="micro-label">ROUTE COMPLETE</span>
                  <h3>Nothing else is due.</h3>
                  <p>You have completed today’s scheduled retrieval. Return when the next item becomes due, or practice one early from the library.</p>
                  {futureItems[0] && (
                    <button className="quiet-button" type="button" onClick={() => practiceItem(futureItems[0].id)}>
                      PRACTICE NEXT ITEM EARLY
                    </button>
                  )}
                </div>
              )}
              {notice && <div className="notice" role="status">{notice}</div>}
            </article>

            <aside className="queue-panel" aria-labelledby="queue-heading">
              <div className="queue-head">
                <div>
                  <span className="micro-label">QUEUE / {String(items.length).padStart(2, "0")}</span>
                  <h3 id="queue-heading">Review route</h3>
                </div>
                <button type="button" onClick={() => setFormOpen(true)} aria-label="Add a memory">+</button>
              </div>
              <div className="queue-list">
                {sortedItems.slice(0, 5).map((item, index) => (
                  <button
                    className={`queue-item ${current?.id === item.id ? "active" : ""}`}
                    type="button"
                    key={item.id}
                    onClick={() => practiceItem(item.id)}
                  >
                    <span className="queue-index">{String(index + 1).padStart(2, "0")}</span>
                    <span className="queue-copy">
                      <b>{item.subject}</b>
                      <small>{item.prompt}</small>
                    </span>
                    <span className="queue-due">{dueLabel(item.dueAt)}</span>
                  </button>
                ))}
              </div>
              <div className="queue-foot">
                <span>Mixed subjects are intentional.</span>
                <span className="mono">INTERLEAVE · ON</span>
              </div>
            </aside>
          </div>
        </section>

        <section className="library-section" aria-labelledby="library-heading">
          <div className="section-heading">
            <div>
              <span className="micro-label">02 / MEMORY LIBRARY</span>
              <h2 id="library-heading">Your field notes</h2>
            </div>
            <div className="search-field">
              <label htmlFor="search">FILTER LIBRARY</label>
              <input
                id="search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Subject or prompt"
              />
            </div>
          </div>
          <div className="library-table" role="list">
            {filteredItems.map((item) => (
              <button type="button" role="listitem" className="library-row" key={item.id} onClick={() => practiceItem(item.id)}>
                <span className="library-subject">{item.subject}</span>
                <span className="library-prompt">{item.prompt}</span>
                <span className="library-interval mono">{item.interval ? `${item.interval}D` : "NEW"}</span>
                <span className="library-due">{dueLabel(item.dueAt)} <i aria-hidden="true">→</i></span>
              </button>
            ))}
          </div>
        </section>

        <section className="evidence-section" aria-labelledby="evidence-heading">
          <div className="section-heading evidence-heading">
            <div>
              <span className="micro-label">03 / METHOD NOTES</span>
              <h2 id="evidence-heading">Built from learning science</h2>
            </div>
            <p>Practice testing and distributed practice have the strongest broad evidence. Other methods are used where they fit.</p>
          </div>
          <div className="evidence-grid">
            {evidence.map((method) => (
              <article className="evidence-card" key={method.id}>
                <div className="evidence-top">
                  <span className="mono">{method.id} / 04</span>
                  <span>{method.level}</span>
                </div>
                <h3>{method.title}</h3>
                <p>{method.description}</p>
                <div className="method-action">FIELD USE · {method.action}</div>
                <a href={method.href} target="_blank" rel="noreferrer">
                  {method.source} <span aria-hidden="true">↗</span>
                </a>
              </article>
            ))}
          </div>
          <p className="evidence-note">
            Method ratings follow the broad review by Dunlosky, Rawson, Marsh, Nathan, and Willingham. This tool supports study; it does not replace course instruction or expert feedback.
            {" "}<a href="https://journals.sagepub.com/doi/10.1177/1529100612453266" target="_blank" rel="noreferrer">Read the review ↗</a>
          </p>
        </section>
      </main>

      <footer className="site-footer">
        <span className="editorial-line">Wisdom is navigation.</span>
        <img src={theme === "ivory" ? "/logo-green.png" : "/logo-ivory.png"} alt="" />
        <span>anaDaBane · Memory Field</span>
        <span className="footer-right">DATA STAYS IN THIS BROWSER</span>
      </footer>

      {formOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setFormOpen(false);
        }}>
          <section className="capture-panel" role="dialog" aria-modal="true" aria-labelledby="capture-heading">
            <div className="capture-head">
              <div>
                <span className="micro-label">NEW FIELD NOTE</span>
                <h2 id="capture-heading">Add one useful memory</h2>
              </div>
              <button type="button" onClick={() => setFormOpen(false)} aria-label="Close">×</button>
            </div>
            <p className="capture-help">Write a prompt that forces reconstruction. Keep the reference answer precise enough to compare.</p>
            <form onSubmit={addMemory}>
              <div className="form-grid">
                <label className="wide">PROMPT / QUESTION
                  <textarea name="prompt" required placeholder="What should future-you be able to explain?" />
                </label>
                <label className="wide">REFERENCE ANSWER
                  <textarea name="answer" required placeholder="A concise, correct answer in your own words." />
                </label>
                <label>SUBJECT
                  <input name="subject" placeholder="e.g. Organic chemistry" />
                </label>
                <label>SOURCE
                  <input name="source" placeholder="e.g. Lecture 06" />
                </label>
              </div>
              <div className="capture-actions">
                <button className="primary-button" type="submit">ADD TO TODAY’S ROUTE</button>
                <button className="quiet-button" type="button" onClick={() => setFormOpen(false)}>CANCEL</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
