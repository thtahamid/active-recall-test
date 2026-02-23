"use client";

import { useState, useEffect, useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Cell
} from "recharts";

const WORDS = [
  { word: "Apple",    lang: "EN", pos: 1  },
  { word: "Hund",     lang: "SV", pos: 2  },
  { word: "Memory",   lang: "EN", pos: 3  },
  { word: "Blå",      lang: "SV", pos: 4  },
  { word: "River",    lang: "EN", pos: 5  },
  { word: "Stjärna",  lang: "SV", pos: 6  },
  { word: "Garden",   lang: "EN", pos: 7  },
  { word: "Flicka",   lang: "SV", pos: 8  },
  { word: "Thunder",  lang: "EN", pos: 9  },
  { word: "Skog",     lang: "SV", pos: 10 },
  { word: "Candle",   lang: "EN", pos: 11 },
  { word: "Snö",      lang: "SV", pos: 12 },
  { word: "Journey",  lang: "EN", pos: 13 },
  { word: "Fågel",    lang: "SV", pos: 14 },
  { word: "Horizon",  lang: "EN", pos: 15 },
];

// False positives — plausible but not in the list
const FALSE_POSITIVES = [
  { word: "Forest",   lang: "EN" },
  { word: "Lampa",    lang: "SV" },
  { word: "Ocean",    lang: "EN" },
  { word: "Kärlekn",  lang: "SV" },
  { word: "Shadow",   lang: "EN" },
  { word: "Träd",     lang: "SV" },
  { word: "Flame",    lang: "EN" },
  { word: "Himmel",   lang: "SV" },
  { word: "Pebble",   lang: "EN" },
  { word: "Natt",     lang: "SV" },
];

const STUDY_TIME    = 30;
const DISTRACT_TIME = 300;

const EBBINGHAUS = [
  { label: "0 min",  retention: 100 },
  { label: "5 min",  retention: 58  },
  { label: "20 min", retention: 44  },
  { label: "1 hr",   retention: 36  },
  { label: "1 day",  retention: 28  },
  { label: "1 wk",   retention: 23  },
];

const c = {
  bg:      "#eeedf8",
  base:    "#f4f3fc",
  surface: "#ffffff",
  border:  "#dddaf0",
  text:    "#1a1730",
  muted:   "#7874a1",
  indigo:  "#5548f5",
  violet:  "#7c3aed",
  rose:    "#f43f5e",
  teal:    "#0d9488",
  green:   "#16a34a",
};

const shadows = {
  sm:    "0 1px 3px rgba(80,60,180,0.08), 0 0 0 1px rgba(80,60,180,0.06)",
  md:    "0 4px 12px rgba(80,60,180,0.10), 0 1px 3px rgba(80,60,180,0.06), 0 0 0 1px rgba(80,60,180,0.07)",
  lg:    "0 8px 28px rgba(80,60,180,0.13), 0 2px 6px rgba(80,60,180,0.07), 0 0 0 1px rgba(80,60,180,0.07)",
  xl:    "0 16px 48px rgba(80,60,180,0.15), 0 4px 12px rgba(80,60,180,0.08), 0 0 0 1px rgba(80,60,180,0.08)",
  inset: "inset 0 2px 6px rgba(80,60,180,0.07)",
};

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

/* ── Shared UI ── */
const Card = ({ children, style = {}, depth = "md" }: { children: React.ReactNode; style?: React.CSSProperties; depth?: string }) => (
  <div style={{ background: c.surface, borderRadius: 18, padding: "28px 30px", boxShadow: shadows[depth as keyof typeof shadows], ...style }}>
    {children}
  </div>
);

const InsetPanel = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: c.bg, borderRadius: 12, padding: "18px 20px", boxShadow: shadows.inset, border: `1px solid ${c.border}`, ...style }}>
    {children}
  </div>
);

const Badge = ({ lang }: { lang: string }) => (
  <span style={{
    fontSize: 10, fontWeight: 800, letterSpacing: 1, padding: "2px 7px", borderRadius: 99,
    background: lang === "EN" ? "#ede9fe" : "#fce7f3",
    color: lang === "EN" ? c.indigo : c.rose,
    border: `1px solid ${lang === "EN" ? "#c4b5fd" : "#fda4af"}`,
    boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
  }}>{lang}</span>
);

const StatPill = ({ label, value, color }: { label: string; value: string | number; color: string }) => (
  <div style={{ background: c.surface, borderRadius: 14, padding: "18px 16px", textAlign: "center", boxShadow: shadows.md, borderTop: `3px solid ${color}` }}>
    <div style={{ fontSize: 26, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: 11, color: c.muted, marginTop: 5, fontWeight: 600, letterSpacing: 0.4 }}>{label}</div>
  </div>
);

const Btn = ({ children, onClick, color = c.indigo, style = {}, disabled = false }: { children: React.ReactNode; onClick?: () => void; color?: string; style?: React.CSSProperties; disabled?: boolean }) => (
  <button onClick={onClick} disabled={disabled} style={{
    background: disabled ? "#ccc" : color, color: "#fff", border: "none",
    borderRadius: 12, padding: "13px 30px", fontSize: 14, fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer", letterSpacing: 0.3,
    boxShadow: disabled ? "none" : `0 4px 14px ${color}55`,
    transition: "transform 0.1s", ...style,
  }}>{children}</button>
);

const TimerBadge = ({ time, color }: { time: number; color: string }) => (
  <div style={{
    display: "inline-block", background: c.surface, border: `2px solid ${color}`,
    color, fontSize: 30, fontWeight: 900, borderRadius: 16, padding: "8px 28px",
    letterSpacing: 3, marginBottom: 18, boxShadow: `0 4px 20px ${color}33, ${shadows.sm}`,
  }}>{fmt(time)}</div>
);

const H1 = ({ children }: { children: React.ReactNode }) => <h1 style={{ fontSize: 32, fontWeight: 900, margin: "10px 0 6px", color: c.text, letterSpacing: -0.5 }}>{children}</h1>;
const H2 = ({ children }: { children: React.ReactNode }) => <h2 style={{ fontSize: 22, fontWeight: 800, margin: "8px 0 6px", color: c.text }}>{children}</h2>;
const H3 = ({ children }: { children: React.ReactNode }) => <h3 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 4px", color: c.text }}>{children}</h3>;
const Sub = ({ children }: { children: React.ReactNode }) => <p style={{ color: c.muted, fontSize: 14, lineHeight: 1.65, margin: "0 0 4px" }}>{children}</p>;
const ChartSub = ({ children }: { children: React.ReactNode }) => <p style={{ color: c.muted, fontSize: 13, lineHeight: 1.6, margin: "0 0 20px" }}>{children}</p>;

const page: React.CSSProperties = {
  minHeight: "100vh",
  background: `radial-gradient(ellipse at 60% 0%, #ddd9ff 0%, ${c.bg} 55%)`,
  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
  paddingTop: 48, paddingBottom: 48, paddingLeft: 20, paddingRight: 20,
  fontFamily: "'Inter', system-ui, sans-serif", color: c.text,
};

/* ── Word Choice Tile ── */
type TileState = "idle" | "selected" | "correct" | "miss" | "false-pos";

const WordTile = ({ word, lang, state, onClick }: { word: string; lang: string; state: TileState; onClick: () => void }) => {
  const styles: Record<TileState, { bg: string; border: string; text: string; shadow: string }> = {
    idle:        { bg: c.surface,   border: c.border,  text: c.text,   shadow: shadows.sm },
    selected:    { bg: "#ede9fe",   border: c.indigo,  text: c.indigo, shadow: `0 0 0 2px ${c.indigo}55, ${shadows.md}` },
    correct:     { bg: "#dcfce7",   border: "#86efac",  text: c.green,  shadow: `0 0 0 2px #86efac88, ${shadows.sm}` },
    miss:        { bg: "#fff7ed",   border: "#fdba74",  text: "#c2410c",shadow: shadows.sm },
    "false-pos": { bg: "#fee2e2",   border: "#fca5a5",  text: c.rose,   shadow: `0 0 0 2px #fca5a588, ${shadows.sm}` },
  };
  const s = styles[state] || styles.idle;

  const icons: Record<TileState, string | null> = { idle: null, selected: "●", correct: "✓", miss: "○", "false-pos": "✗" };

  return (
    <button onClick={onClick} style={{
      background: s.bg, border: `1.5px solid ${s.border}`, borderRadius: 12,
      padding: "12px 10px", cursor: state === "idle" || state === "selected" ? "pointer" : "default",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
      boxShadow: s.shadow, transition: "all 0.15s", outline: "none",
      transform: state === "selected" ? "translateY(-2px)" : "none",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
        {icons[state] && <span style={{ fontSize: 12, color: s.text, fontWeight: 900 }}>{icons[state]}</span>}
        <span style={{ flex: 1, textAlign: icons[state] ? "right" : "center" }}><Badge lang={lang} /></span>
      </div>
      <span style={{ fontWeight: 700, fontSize: 14, color: s.text }}>{word}</span>
    </button>
  );
};

type Phase = "intro" | "study" | "distract" | "recall" | "results";

interface WordItem {
  word: string;
  lang: string;
  pos?: number;
  isTarget: boolean;
}

interface MatchedWord {
  word: string;
  lang: string;
  pos: number;
  recalled: boolean;
}

interface Scores {
  matched: MatchedWord[];
  enRate: number;
  svRate: number;
  total: number;
  forgetting: { label: string; retention: number; audience: number | null }[];
  audienceRet: number;
  falsePosCount: number;
}

/* ── Main App ── */
export default function ActiveRecallApp() {
  const [phase, setPhase]         = useState<Phase>("intro");
  const [timer, setTimer]         = useState(0);
  const [selected, setSelected]   = useState(new Set<string>());
  const [submitted, setSubmitted] = useState(false);
  const [scores, setScores]       = useState<Scores | null>(null);

  // Build shuffled grid once
  const grid = useMemo<WordItem[]>(() => shuffle([
    ...WORDS.map(w => ({ ...w, isTarget: true })),
    ...FALSE_POSITIVES.map(w => ({ ...w, isTarget: false })),
  ]), []);

  useEffect(() => {
    if (phase === "study")    setTimer(STUDY_TIME);
    if (phase === "distract") setTimer(DISTRACT_TIME);
  }, [phase]);

  useEffect(() => {
    if ((phase !== "study" && phase !== "distract") || timer <= 0) return;
    const id = setTimeout(() => {
      if (timer === 1) setPhase(phase === "study" ? "distract" : "recall");
      else setTimer(t => t - 1);
    }, 1000);
    return () => clearTimeout(id);
  }, [phase, timer]);

  const goHome = () => { setPhase("intro"); setSelected(new Set()); setSubmitted(false); setScores(null); };

  const toggleWord = (word: string) => {
    if (submitted) return;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(word)) { next.delete(word); return next; }
      if (next.size >= WORDS.length) return prev; // cap at word list size
      next.add(word);
      return next;
    });
  };

  const submit = () => {
    const targets = WORDS.map(w => w.word);
    const matched: MatchedWord[] = WORDS.map(w => ({ ...w, recalled: selected.has(w.word) }));
    const falsePosCount = [...selected].filter(w => !targets.includes(w)).length;

    const en = matched.filter(w => w.lang === "EN");
    const sv = matched.filter(w => w.lang === "SV");
    const enRate = Math.round(en.filter(w => w.recalled).length / en.length * 100);
    const svRate = Math.round(sv.filter(w => w.recalled).length / sv.length * 100);
    const total  = matched.filter(w => w.recalled).length;
    const audienceRet = Math.round(total / WORDS.length * 100);
    const forgetting = EBBINGHAUS.map((pt, i) => ({ ...pt, audience: i === 1 ? audienceRet : null }));

    setScores({ matched, enRate, svRate, total, forgetting, audienceRet, falsePosCount });
    setSubmitted(true);
    setPhase("results");
  };

  const getTileState = (item: WordItem): TileState => {
    if (!submitted) return selected.has(item.word) ? "selected" : "idle";
    if (item.isTarget && selected.has(item.word))  return "correct";
    if (item.isTarget && !selected.has(item.word)) return "miss";
    if (!item.isTarget && selected.has(item.word)) return "false-pos";
    return "idle";
  };

  /* INTRO */
  if (phase === "intro") return (
    <div style={page}>
      <div style={{ maxWidth: 520, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 56, marginBottom: 4 }}>🧠</div>
        <H1>Free Recall Dashboard</H1>
        <Sub>A live memory experiment for your lecture. Study a word list, wait 5 minutes, then identify the words from a mixed grid — including decoys!</Sub>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, margin: "32px 0" }}>
          {[["📖","Study","30 sec"],["⏳","Wait","5 min"],["🎯","Identify","Pick from grid"]].map(([e,t,d]) => (
            <Card key={t} depth="lg" style={{ textAlign: "center", padding: "22px 12px" }}>
              <div style={{ fontSize: 30 }}>{e}</div>
              <div style={{ fontWeight: 800, color: c.text, marginTop: 8, fontSize: 14 }}>{t}</div>
              <div style={{ fontSize: 12, color: c.muted, marginTop: 2 }}>{d}</div>
            </Card>
          ))}
        </div>
        <Btn onClick={() => setPhase("study")} style={{ width: "100%", padding: "15px 0", fontSize: 15 }}>Begin Experiment →</Btn>
      </div>
    </div>
  );

  /* STUDY */
  if (phase === "study") return (
    <div style={{ ...page, justifyContent: "flex-start", paddingTop: 48 }}>
      <div style={{ maxWidth: 700, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 4 }}>
            <TimerBadge time={timer} color={timer < 8 ? c.rose : c.indigo} />
            <Btn onClick={() => setPhase("distract")} color={c.muted} style={{ padding: "10px 18px", fontSize: 12, opacity: 0.85 }}>Skip →</Btn>
          </div>
          <H2>Memorise these words</H2>
          <Sub>Read carefully — you&apos;ll need to pick them out from a grid including decoys.</Sub>
        </div>
        <Card depth="xl" style={{ padding: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {WORDS.map((w, i) => (
              <InsetPanel key={w.word} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: c.muted, fontSize: 11, fontWeight: 700, width: 16 }}>{i + 1}</span>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{w.word}</span>
                </div>
                <Badge lang={w.lang} />
              </InsetPanel>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );

  /* DISTRACT */
  if (phase === "distract") return (
    <div style={page}>
      <div style={{ maxWidth: 460, width: "100%", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 4 }}>
          <TimerBadge time={timer} color={c.teal} />
          <Btn onClick={() => setPhase("recall")} color={c.muted} style={{ padding: "10px 18px", fontSize: 12, opacity: 0.85 }}>Skip →</Btn>
        </div>
        <H2>Distraction Phase</H2>
        <Sub>Look away. The recall test begins automatically — you&apos;ll pick words from a shuffled grid including decoys.</Sub>
        <Card depth="lg" style={{ marginTop: 24, textAlign: "left" }}>
          <InsetPanel>
            <p style={{ color: c.muted, margin: 0, fontSize: 13, lineHeight: 1.7 }}>
              💡 <strong style={{ color: c.text }}>Cognitive note:</strong> This delay simulates real-world memory decay as described by Ebbinghaus. Without rehearsal, retention drops sharply within minutes.
            </p>
          </InsetPanel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
            {["Primacy Effect","Recency Effect","Shallow Processing","Storage Decay"].map(t => (
              <div key={t} style={{ background: "#ede9fe", borderRadius: 10, padding: "11px 14px", color: c.indigo, fontWeight: 700, fontSize: 12, border: `1px solid #c4b5fd`, boxShadow: "0 1px 4px rgba(100,80,200,0.10)" }}>{t}</div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );

  /* RECALL */
  if (phase === "recall") return (
    <div style={{ ...page, justifyContent: "flex-start", paddingTop: 48 }}>
      <div style={{ maxWidth: 960, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 44, marginBottom: 4 }}>🎯</div>
          <H2>Free Recall Test</H2>
          <Sub>Select every word you remember seeing. Watch out — decoys are mixed in!</Sub>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 16, justifyContent: "center", marginBottom: 20, flexWrap: "wrap" }}>
          {[["Unselected", c.border, c.muted], ["Selected", c.indigo, c.indigo]].map(([l, border, col]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{ width: 14, height: 14, borderRadius: 4, border: `2px solid ${border}`, background: l === "Selected" ? "#ede9fe" : c.surface }} />
              <span style={{ fontSize: 12, color: c.muted, fontWeight: 600 }}>{l}</span>
            </div>
          ))}
        </div>

        <Card depth="xl" style={{ padding: 24 }}>
          <InsetPanel style={{ padding: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
              {grid.map(item => (
                <WordTile key={item.word} word={item.word} lang={item.lang} state={getTileState(item)} onClick={() => toggleWord(item.word)} />
              ))}
            </div>
          </InsetPanel>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20, flexWrap: "wrap", gap: 12 }}>
            <div style={{ fontSize: 13, color: c.muted }}>
              <strong style={{ color: selected.size >= WORDS.length ? c.rose : c.indigo }}>{selected.size}</strong>
              <span> / {WORDS.length} selected</span>
              {selected.size >= WORDS.length && <span style={{ color: c.rose, fontWeight: 700, marginLeft: 8 }}>Max reached</span>}
            </div>
            <Btn onClick={submit} disabled={selected.size === 0} style={{ padding: "13px 32px" }}>
              Submit & See Analytics →
            </Btn>
          </div>
        </Card>
      </div>
    </div>
  );

  /* RESULTS */
  if (phase === "results" && scores) {
    const { matched, enRate, svRate, total, forgetting, audienceRet, falsePosCount } = scores;

    const serialData = matched.map(d => ({ name: `${d.pos}`, word: d.word, recalled: d.recalled ? 100 : 0 }));
    const encodingData = [
      { name: "English", rate: enRate },
      { name: "Swedish", rate: svRate },
    ];

    return (
      <div style={{ ...page, justifyContent: "flex-start", paddingTop: 48 }}>
        <div style={{ maxWidth: 880, width: "100%" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
            <button onClick={goHome} style={{ background: "none", border: `1.5px solid ${c.border}`, borderRadius: 10, padding: "8px 16px", fontSize: 13, color: c.muted, cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>← Home</button>
            <div style={{ textAlign: "center", flex: 1 }}>
              <div style={{ fontSize: 48, marginBottom: 4 }}>📊</div>
              <H1>Your Results</H1>
              <Sub>Here&apos;s what cognitive science says about your memory performance.</Sub>
            </div>
            <div style={{ width: 88 }} />{/* spacer to balance the home button */}
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 24 }}>
            <StatPill label="WORDS RECALLED"    value={`${total}/${WORDS.length}`}  color={c.indigo} />
            <StatPill label="RETENTION"         value={`${audienceRet}%`}           color={c.violet} />
            <StatPill label="ENGLISH RECALL"    value={`${enRate}%`}                color={c.indigo} />
            <StatPill label="SWEDISH RECALL"    value={`${svRate}%`}                color={c.rose}   />
            <StatPill label="FALSE POSITIVES"   value={falsePosCount}               color={falsePosCount > 0 ? c.rose : c.teal} />
          </div>

          {/* Grid review */}
          <Card depth="lg" style={{ marginBottom: 22 }}>
            <H3>Selection Review</H3>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", margin: "10px 0 16px" }}>
              {[["✓ Correct", "#dcfce7", "#86efac", c.green],["○ Missed", "#fff7ed", "#fdba74","#c2410c"],["✗ False Positive","#fee2e2","#fca5a5",c.rose],["Correct Rejection",c.surface,c.border,c.muted]].map(([l,bg,border,col]) => (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: bg, border: `1.5px solid ${border}` }} />
                  <span style={{ fontSize: 12, color: c.muted, fontWeight: 600 }}>{l}</span>
                </div>
              ))}
            </div>
            <InsetPanel style={{ padding: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
                {grid.map(item => (
                  <WordTile key={item.word} word={item.word} lang={item.lang} state={getTileState(item)} onClick={() => {}} />
                ))}
              </div>
            </InsetPanel>
          </Card>

          {/* Chart 1 */}
          <Card depth="lg" style={{ marginBottom: 22 }}>
            <H3>1 — Serial Position Curve</H3>
            <ChartSub>Recall by word position. Notice the <strong>Primacy effect</strong> (start) and <strong>Recency effect</strong> (end).</ChartSub>
            <InsetPanel style={{ padding: "20px 8px 8px" }}>
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={serialData} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gI" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={c.indigo} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={c.indigo} stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={c.border} />
                  <XAxis dataKey="name" label={{ value: "Word Position", position: "insideBottom", offset: -2, fontSize: 11, fill: c.muted }} tick={{ fontSize: 11, fill: c.muted }} />
                  <YAxis domain={[0, 110]} tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 11, fill: c.muted }} />
                  <Tooltip formatter={((v: number | undefined, _: string | undefined, pl: unknown) => [`${v ?? 0}%`, (pl as { payload?: { word?: string } })?.payload?.word ?? ""]) as never} labelFormatter={(l: unknown) => `Position ${l}`} contentStyle={{ borderRadius: 10, border: `1px solid ${c.border}`, boxShadow: shadows.md }} />
                  <ReferenceLine x="3"  stroke={c.violet} strokeDasharray="4 3" label={{ value: "Primacy", fontSize: 10, fill: c.violet, position: "top" }} />
                  <ReferenceLine x="13" stroke={c.teal}   strokeDasharray="4 3" label={{ value: "Recency", fontSize: 10, fill: c.teal,   position: "top" }} />
                  <Area type="monotone" dataKey="recalled" stroke={c.indigo} strokeWidth={2.5} fill="url(#gI)" dot={{ r: 5, fill: c.indigo, stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 7 }} />
                </AreaChart>
              </ResponsiveContainer>
            </InsetPanel>
          </Card>

          {/* Chart 2 */}
          <Card depth="lg" style={{ marginBottom: 22 }}>
            <H3>2 — Encoding Depth Chart</H3>
            <ChartSub><strong>Deep processing</strong> (English) vs <strong>shallow processing</strong> (Swedish). Deeper encoding = better recall.</ChartSub>
            <InsetPanel style={{ padding: "20px 8px 8px" }}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={encodingData} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={c.border} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 13, fill: c.muted, fontWeight: 700 }} />
                  <YAxis domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 11, fill: c.muted }} />
                  <Tooltip formatter={(v: number | undefined) => [`${v ?? 0}%`, "Recall Rate"]} contentStyle={{ borderRadius: 10, border: `1px solid ${c.border}`, boxShadow: shadows.md }} />
                  <Bar dataKey="rate" radius={[10, 10, 0, 0]} maxBarSize={80}>
                    <Cell fill={c.indigo} />
                    <Cell fill={c.rose} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </InsetPanel>
            <div style={{ display: "flex", gap: 20, marginTop: 12 }}>
              {[["English (Deep)", c.indigo], ["Swedish (Shallow)", c.rose]].map(([l, col]) => (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: col, boxShadow: `0 0 0 2px ${col}44` }} />
                  <span style={{ fontSize: 12, color: c.muted, fontWeight: 600 }}>{l}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Chart 3 */}
          <Card depth="lg" style={{ marginBottom: 40 }}>
            <H3>3 — The Forgetting Curve</H3>
            <ChartSub>Your 5-minute recall vs the <strong>Ebbinghaus retention curve</strong>. Without review, memory decays rapidly.</ChartSub>
            <InsetPanel style={{ padding: "20px 8px 8px" }}>
              <ResponsiveContainer width="100%" height={230}>
                <LineChart data={forgetting} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={c.border} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: c.muted }} />
                  <YAxis domain={[0, 110]} tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 11, fill: c.muted }} />
                  <Tooltip formatter={(v: number | undefined, n: string | undefined) => [`${v ?? 0}%`, n === "retention" ? "Ebbinghaus" : "Your Score"]} contentStyle={{ borderRadius: 10, border: `1px solid ${c.border}`, boxShadow: shadows.md }} />
                  <Legend formatter={(v: unknown) => v === "retention" ? "Ebbinghaus Curve" : "Your Score"} wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="retention" stroke={c.muted}   strokeWidth={2} strokeDasharray="6 3" dot={{ r: 4, fill: c.muted, stroke: "#fff", strokeWidth: 2 }} />
                  <Line type="monotone" dataKey="audience"  stroke={c.violet}  strokeWidth={3} dot={{ r: 8, fill: c.violet, stroke: "#fff", strokeWidth: 3 }} connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
            </InsetPanel>
          </Card>

          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <Btn color={c.teal} onClick={goHome} style={{ padding: "14px 36px", fontSize: 15 }}>↺ Run Again</Btn>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
