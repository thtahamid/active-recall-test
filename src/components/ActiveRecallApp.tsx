"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";

/* ── Breakpoint hook ── */
type Breakpoint = "mobile" | "tablet" | "laptop" | "desktop";

function getBreakpoint(w: number): Breakpoint {
  if (w <= 480) return "mobile";
  if (w <= 768) return "tablet";
  if (w <= 1280) return "laptop";
  return "desktop";
}

function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>(() =>
    typeof window !== "undefined"
      ? getBreakpoint(window.innerWidth)
      : "desktop",
  );

  useEffect(() => {
    const handleResize = () => setBp(getBreakpoint(window.innerWidth));
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return bp;
}

/* Convenience picker: pass {mobile, tablet, laptop, desktop} or fewer keys,
   falls back from mobile up to the nearest defined key. */
function pick<T>(
  bp: Breakpoint,
  map: Partial<Record<Breakpoint, T>> & { desktop: T },
): T {
  if (bp === "mobile" && map.mobile !== undefined) return map.mobile;
  if (bp === "tablet" && map.tablet !== undefined) return map.tablet;
  if (bp === "laptop" && map.laptop !== undefined) return map.laptop;
  return map.desktop;
}

/* ── Data ── */
const WORDS = [
  { word: "Apple", lang: "EN", pos: 1 },
  { word: "Hund", lang: "SV", pos: 2 },
  { word: "Memory", lang: "EN", pos: 3 },
  { word: "Blå", lang: "SV", pos: 4 },
  { word: "River", lang: "EN", pos: 5 },
  { word: "Stjärna", lang: "SV", pos: 6 },
  { word: "Garden", lang: "EN", pos: 7 },
  { word: "Flicka", lang: "SV", pos: 8 },
  { word: "Thunder", lang: "EN", pos: 9 },
  { word: "Skog", lang: "SV", pos: 10 },
  { word: "Candle", lang: "EN", pos: 11 },
  { word: "Snö", lang: "SV", pos: 12 },
  { word: "Journey", lang: "EN", pos: 13 },
  { word: "Fågel", lang: "SV", pos: 14 },
  { word: "Horizon", lang: "EN", pos: 15 },
];

const FALSE_POSITIVES = [
  { word: "Forest", lang: "EN" },
  { word: "Lampa", lang: "SV" },
  { word: "Ocean", lang: "EN" },
  { word: "Kärlekn", lang: "SV" },
  { word: "Shadow", lang: "EN" },
  { word: "Träd", lang: "SV" },
  { word: "Flame", lang: "EN" },
  { word: "Himmel", lang: "SV" },
  { word: "Pebble", lang: "EN" },
  { word: "Natt", lang: "SV" },
];

const STUDY_TIME = 40;
const DISTRACT_TIME = 300;

const EBBINGHAUS = [
  { label: "0 min", retention: 100 },
  { label: "5 min", retention: 58 },
  { label: "20 min", retention: 44 },
  { label: "1 hr", retention: 36 },
  { label: "1 day", retention: 28 },
  { label: "1 wk", retention: 23 },
];

/* ── Design tokens ── */
const c = {
  bg: "#eeedf8",
  base: "#f4f3fc",
  surface: "#ffffff",
  border: "#dddaf0",
  text: "#1a1730",
  muted: "#7874a1",
  indigo: "#5548f5",
  violet: "#7c3aed",
  rose: "#f43f5e",
  teal: "#0d9488",
  green: "#16a34a",
};

const shadows = {
  sm: "0 1px 3px rgba(80,60,180,0.08), 0 0 0 1px rgba(80,60,180,0.06)",
  md: "0 4px 12px rgba(80,60,180,0.10), 0 1px 3px rgba(80,60,180,0.06), 0 0 0 1px rgba(80,60,180,0.07)",
  lg: "0 8px 28px rgba(80,60,180,0.13), 0 2px 6px rgba(80,60,180,0.07), 0 0 0 1px rgba(80,60,180,0.07)",
  xl: "0 16px 48px rgba(80,60,180,0.15), 0 4px 12px rgba(80,60,180,0.08), 0 0 0 1px rgba(80,60,180,0.08)",
  inset: "inset 0 2px 6px rgba(80,60,180,0.07)",
};

const fmt = (s: number) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

/* ── Shared UI ── */
const Card = ({
  children,
  style = {},
  depth = "md",
  bp,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  depth?: string;
  bp: Breakpoint;
}) => (
  <div
    style={{
      background: c.surface,
      borderRadius: pick(bp, { mobile: 14, tablet: 16, desktop: 18 }),
      padding: pick(bp, {
        mobile: "14px 16px",
        tablet: "18px 20px",
        laptop: "22px 24px",
        desktop: "28px 30px",
      }),
      boxShadow: shadows[depth as keyof typeof shadows],
      ...style,
    }}
  >
    {children}
  </div>
);

const InsetPanel = ({
  children,
  style = {},
  bp,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  bp: Breakpoint;
}) => (
  <div
    style={{
      background: c.bg,
      borderRadius: pick(bp, { mobile: 10, tablet: 11, desktop: 12 }),
      padding: pick(bp, {
        mobile: "12px 14px",
        tablet: "14px 16px",
        desktop: "18px 20px",
      }),
      boxShadow: shadows.inset,
      border: `1px solid ${c.border}`,
      ...style,
    }}
  >
    {children}
  </div>
);

const Badge = ({ lang }: { lang: string }) => (
  <span
    style={{
      fontSize: 10,
      fontWeight: 800,
      letterSpacing: 1,
      padding: "2px 7px",
      borderRadius: 99,
      background: lang === "EN" ? "#ede9fe" : "#fce7f3",
      color: lang === "EN" ? c.indigo : c.rose,
      border: `1px solid ${lang === "EN" ? "#c4b5fd" : "#fda4af"}`,
      boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
      whiteSpace: "nowrap",
    }}
  >
    {lang}
  </span>
);

const StatPill = ({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) => (
  <div
    style={{
      background: c.surface,
      borderRadius: 14,
      padding: "14px 10px",
      textAlign: "center",
      boxShadow: shadows.md,
      borderTop: `3px solid ${color}`,
    }}
  >
    <div style={{ fontSize: 22, fontWeight: 900, color, lineHeight: 1 }}>
      {value}
    </div>
    <div
      style={{
        fontSize: 10,
        color: c.muted,
        marginTop: 5,
        fontWeight: 600,
        letterSpacing: 0.4,
      }}
    >
      {label}
    </div>
  </div>
);

const Btn = ({
  children,
  onClick,
  color = c.indigo,
  style = {},
  disabled = false,
  bp,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  color?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  bp: Breakpoint;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      background: disabled ? "#ccc" : color,
      color: "#fff",
      border: "none",
      borderRadius: 12,
      padding: pick(bp, {
        mobile: "12px 18px",
        tablet: "12px 22px",
        laptop: "13px 26px",
        desktop: "13px 30px",
      }),
      fontSize: pick(bp, { mobile: 13, tablet: 13, desktop: 14 }),
      fontWeight: 700,
      cursor: disabled ? "not-allowed" : "pointer",
      letterSpacing: 0.3,
      boxShadow: disabled ? "none" : `0 4px 14px ${color}55`,
      transition: "transform 0.1s",
      minHeight: bp === "mobile" || bp === "tablet" ? 44 : undefined,
      ...style,
    }}
  >
    {children}
  </button>
);

const TimerBadge = ({
  time,
  color,
  bp,
}: {
  time: number;
  color: string;
  bp: Breakpoint;
}) => (
  <div
    style={{
      display: "inline-block",
      background: c.surface,
      border: `2px solid ${color}`,
      color,
      fontSize: pick(bp, { mobile: 22, tablet: 24, laptop: 28, desktop: 30 }),
      fontWeight: 900,
      borderRadius: 16,
      padding: pick(bp, {
        mobile: "6px 18px",
        tablet: "7px 22px",
        desktop: "8px 28px",
      }),
      letterSpacing: 3,
      marginBottom: pick(bp, { mobile: 12, desktop: 18 }),
      boxShadow: `0 4px 20px ${color}33, ${shadows.sm}`,
    }}
  >
    {fmt(time)}
  </div>
);

const H1 = ({
  children,
  bp,
}: {
  children: React.ReactNode;
  bp: Breakpoint;
}) => (
  <h1
    style={{
      fontSize: pick(bp, { mobile: 20, tablet: 24, laptop: 28, desktop: 32 }),
      fontWeight: 900,
      margin: "10px 0 6px",
      color: c.text,
      letterSpacing: -0.5,
      lineHeight: 1.2,
    }}
  >
    {children}
  </h1>
);

const H2 = ({
  children,
  bp,
}: {
  children: React.ReactNode;
  bp: Breakpoint;
}) => (
  <h2
    style={{
      fontSize: pick(bp, { mobile: 16, tablet: 18, laptop: 20, desktop: 22 }),
      fontWeight: 800,
      margin: "8px 0 6px",
      color: c.text,
      lineHeight: 1.2,
    }}
  >
    {children}
  </h2>
);

const H3 = ({ children }: { children: React.ReactNode }) => (
  <h3
    style={{ fontSize: 16, fontWeight: 800, margin: "0 0 4px", color: c.text }}
  >
    {children}
  </h3>
);

const Sub = ({ children }: { children: React.ReactNode }) => (
  <p
    style={{
      color: c.muted,
      fontSize: 14,
      lineHeight: 1.65,
      margin: "0 0 4px",
    }}
  >
    {children}
  </p>
);

const ChartSub = ({ children }: { children: React.ReactNode }) => (
  <p
    style={{
      color: c.muted,
      fontSize: 13,
      lineHeight: 1.6,
      margin: "0 0 20px",
    }}
  >
    {children}
  </p>
);

/* ── Word Choice Tile ── */
type TileState = "idle" | "selected" | "correct" | "miss" | "false-pos";

const WordTile = ({
  word,
  lang,
  state,
  onClick,
  bp,
}: {
  word: string;
  lang: string;
  state: TileState;
  onClick: () => void;
  bp: Breakpoint;
}) => {
  const styles: Record<
    TileState,
    { bg: string; border: string; text: string; shadow: string }
  > = {
    idle: { bg: c.surface, border: c.border, text: c.text, shadow: shadows.sm },
    selected: {
      bg: "#ede9fe",
      border: c.indigo,
      text: c.indigo,
      shadow: `0 0 0 2px ${c.indigo}55, ${shadows.md}`,
    },
    correct: {
      bg: "#dcfce7",
      border: "#86efac",
      text: c.green,
      shadow: `0 0 0 2px #86efac88, ${shadows.sm}`,
    },
    miss: {
      bg: "#fff7ed",
      border: "#fdba74",
      text: "#c2410c",
      shadow: shadows.sm,
    },
    "false-pos": {
      bg: "#fee2e2",
      border: "#fca5a5",
      text: c.rose,
      shadow: `0 0 0 2px #fca5a588, ${shadows.sm}`,
    },
  };
  const s = styles[state] || styles.idle;

  const icons: Record<TileState, string | null> = {
    idle: null,
    selected: "●",
    correct: "✓",
    miss: "○",
    "false-pos": "✗",
  };

  const isMobile = bp === "mobile";

  return (
    <button
      onClick={onClick}
      style={{
        background: s.bg,
        border: `1.5px solid ${s.border}`,
        borderRadius: 12,
        padding: isMobile ? "10px 6px" : "12px 10px",
        minHeight: bp === "mobile" || bp === "tablet" ? 54 : undefined,
        cursor:
          state === "idle" || state === "selected" ? "pointer" : "default",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: isMobile ? 4 : 6,
        boxShadow: s.shadow,
        transition: "all 0.15s",
        outline: "none",
        transform: state === "selected" ? "translateY(-2px)" : "none",
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        {icons[state] && (
          <span style={{ fontSize: 12, color: s.text, fontWeight: 900 }}>
            {icons[state]}
          </span>
        )}
        <span style={{ flex: 1, textAlign: icons[state] ? "right" : "center" }}>
          <Badge lang={lang} />
        </span>
      </div>
      <span
        style={{ fontWeight: 700, fontSize: isMobile ? 12 : 14, color: s.text }}
      >
        {word}
      </span>
    </button>
  );
};

/* ── Types ── */
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isSmall = bp === "mobile" || bp === "tablet";

  const [phase, setPhase] = useState<Phase>("intro");
  const [timer, setTimer] = useState(0);
  const [selected, setSelected] = useState(new Set<string>());
  const [submitted, setSubmitted] = useState(false);
  const [scores, setScores] = useState<Scores | null>(null);

  const grid = useMemo<WordItem[]>(
    () =>
      shuffle([
        ...WORDS.map((w) => ({ ...w, isTarget: true })),
        ...FALSE_POSITIVES.map((w) => ({ ...w, isTarget: false })),
      ]),
    [],
  );

  useEffect(() => {
    if (phase === "study") setTimer(STUDY_TIME);
    if (phase === "distract") setTimer(DISTRACT_TIME);
  }, [phase]);

  useEffect(() => {
    if ((phase !== "study" && phase !== "distract") || timer <= 0) return;
    const id = setTimeout(() => {
      if (timer === 1) setPhase(phase === "study" ? "distract" : "recall");
      else setTimer((t) => t - 1);
    }, 1000);
    return () => clearTimeout(id);
  }, [phase, timer]);

  const goHome = useCallback(() => {
    setPhase("intro");
    setSelected(new Set());
    setSubmitted(false);
    setScores(null);
  }, []);

  const toggleWord = (word: string) => {
    if (submitted) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(word)) {
        next.delete(word);
        return next;
      }
      if (next.size >= WORDS.length) return prev;
      next.add(word);
      return next;
    });
  };

  const submit = () => {
    const targets = WORDS.map((w) => w.word);
    const matched: MatchedWord[] = WORDS.map((w) => ({
      ...w,
      recalled: selected.has(w.word),
    }));
    const falsePosCount = [...selected].filter(
      (w) => !targets.includes(w),
    ).length;

    const en = matched.filter((w) => w.lang === "EN");
    const sv = matched.filter((w) => w.lang === "SV");
    const enRate = Math.round(
      (en.filter((w) => w.recalled).length / en.length) * 100,
    );
    const svRate = Math.round(
      (sv.filter((w) => w.recalled).length / sv.length) * 100,
    );
    const total = matched.filter((w) => w.recalled).length;
    const audienceRet = Math.round((total / WORDS.length) * 100);
    const forgetting = EBBINGHAUS.map((pt, i) => ({
      ...pt,
      audience: i === 1 ? audienceRet : null,
    }));

    setScores({
      matched,
      enRate,
      svRate,
      total,
      forgetting,
      audienceRet,
      falsePosCount,
    });
    setSubmitted(true);
    setPhase("results");
  };

  const getTileState = (item: WordItem): TileState => {
    if (!submitted) return selected.has(item.word) ? "selected" : "idle";
    if (item.isTarget && selected.has(item.word)) return "correct";
    if (item.isTarget && !selected.has(item.word)) return "miss";
    if (!item.isTarget && selected.has(item.word)) return "false-pos";
    return "idle";
  };

  if (!mounted) return null;

  /* Shared page wrapper style */
  const page: React.CSSProperties = {
    minHeight: "100vh",
    background: `radial-gradient(ellipse at 60% 0%, #ddd9ff 0%, ${c.bg} 55%)`,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: pick(bp, { mobile: 32, tablet: 40, desktop: 48 }),
    paddingBottom: pick(bp, { mobile: 32, tablet: 40, desktop: 48 }),
    paddingLeft: pick(bp, { mobile: 14, tablet: 16, desktop: 20 }),
    paddingRight: pick(bp, { mobile: 14, tablet: 16, desktop: 20 }),
    fontFamily: "'Inter', system-ui, sans-serif",
    color: c.text,
    boxSizing: "border-box",
    width: "100%",
  };

  /* Recall/Study grid columns */
  const recallCols = pick(bp, { mobile: 3, tablet: 4, laptop: 5, desktop: 6 });
  const studyCols = pick(bp, { mobile: 2, tablet: 2, laptop: 3, desktop: 3 });
  const statsCols = pick(bp, { mobile: 2, tablet: 3, laptop: 5, desktop: 5 });
  const introCols = pick(bp, { mobile: 1, tablet: 3, desktop: 3 });

  /* ── INTRO ── */
  if (phase === "intro")
    return (
      <div style={page}>
        <div
          style={{
            maxWidth: pick(bp, {
              mobile: "100%",
              tablet: "520px",
              desktop: "520px",
            }),
            width: "100%",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: pick(bp, { mobile: 44, desktop: 56 }),
              marginBottom: 4,
            }}
          >
            🧠
          </div>
          <H1 bp={bp}>Active Recall Test</H1>
          <Sub>
            A live memory experiment for your lecture. Study a word list, wait 5
            minutes, then identify the words from a mixed grid — including
            decoys!
          </Sub>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${introCols}, 1fr)`,
              gap: pick(bp, { mobile: 10, desktop: 14 }),
              margin: pick(bp, { mobile: "24px 0", desktop: "32px 0" }),
            }}
          >
            {[
              ["📖", "Study", "30 sec"],
              ["⏳", "Wait", "5 min"],
              ["🎯", "Identify", "Pick from grid"],
            ].map(([e, t, d]) => (
              <Card
                key={t}
                bp={bp}
                depth="lg"
                style={{
                  textAlign: "center",
                  padding: pick(bp, {
                    mobile: "16px 10px",
                    desktop: "22px 12px",
                  }),
                }}
              >
                <div
                  style={{ fontSize: pick(bp, { mobile: 26, desktop: 30 }) }}
                >
                  {e}
                </div>
                <div
                  style={{
                    fontWeight: 800,
                    color: c.text,
                    marginTop: 8,
                    fontSize: 14,
                  }}
                >
                  {t}
                </div>
                <div style={{ fontSize: 12, color: c.muted, marginTop: 2 }}>
                  {d}
                </div>
              </Card>
            ))}
          </div>
          <Btn
            bp={bp}
            onClick={() => setPhase("study")}
            style={{ width: "100%", padding: "15px 0", fontSize: 15 }}
          >
            Begin Experiment →
          </Btn>
        </div>
      </div>
    );

  /* ── STUDY ── */
  if (phase === "study")
    return (
      <div style={{ ...page, justifyContent: "flex-start" }}>
        <div
          style={{
            maxWidth: pick(bp, {
              mobile: "100%",
              tablet: "100%",
              laptop: "700px",
              desktop: "700px",
            }),
            width: "100%",
          }}
        >
          <div
            style={{
              textAlign: "center",
              marginBottom: pick(bp, { mobile: 20, desktop: 28 }),
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: pick(bp, { mobile: 10, desktop: 14 }),
                marginBottom: 4,
                flexWrap: "wrap",
              }}
            >
              <TimerBadge
                bp={bp}
                time={timer}
                color={timer < 8 ? c.rose : c.indigo}
              />
            </div>
            <H2 bp={bp}>Memorise these words</H2>
            <Sub>
              Read carefully — you&apos;ll need to pick them out from a grid
              including decoys.
            </Sub>
          </div>
          <Card
            bp={bp}
            depth="xl"
            style={{
              padding: pick(bp, { mobile: 14, tablet: 18, desktop: 24 }),
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${studyCols}, 1fr)`,
                gap: 10,
              }}
            >
              {WORDS.map((w, i) => (
                <InsetPanel
                  key={w.word}
                  bp={bp}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "11px 14px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        color: c.muted,
                        fontSize: 11,
                        fontWeight: 700,
                        width: 16,
                        flexShrink: 0,
                      }}
                    >
                      {i + 1}
                    </span>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: isMobile ? 13 : 14,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {w.word}
                    </span>
                  </div>
                  <Badge lang={w.lang} />
                </InsetPanel>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );

  /* ── DISTRACT ── */
  if (phase === "distract")
    return (
      <div style={page}>
        <div
          style={{
            maxWidth: pick(bp, {
              mobile: "100%",
              tablet: "460px",
              desktop: "460px",
            }),
            width: "100%",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: pick(bp, { mobile: 10, desktop: 14 }),
              marginBottom: 4,
              flexWrap: "wrap",
            }}
          >
            <TimerBadge bp={bp} time={timer} color={c.teal} />
          </div>
          <H2 bp={bp}>Distraction Phase</H2>
          <Sub>
            Look away. The recall test begins automatically — you&apos;ll pick
            words from a shuffled grid including decoys.
          </Sub>
          <Card bp={bp} depth="lg" style={{ marginTop: 24, textAlign: "left" }}>
            <InsetPanel bp={bp}>
              <p
                style={{
                  color: c.muted,
                  margin: 0,
                  fontSize: 13,
                  lineHeight: 1.7,
                }}
              >
                💡 <strong style={{ color: c.text }}>Cognitive note:</strong>{" "}
                This delay simulates real-world memory decay as described by
                Ebbinghaus. Without rehearsal, retention drops sharply within
                minutes.
              </p>
            </InsetPanel>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: pick(bp, {
                  mobile: "1fr",
                  tablet: "1fr 1fr",
                  desktop: "1fr 1fr",
                }),
                gap: 10,
                marginTop: 14,
              }}
            >
              {[
                "Primacy Effect",
                "Recency Effect",
                "Shallow Processing",
                "Storage Decay",
              ].map((t) => (
                <div
                  key={t}
                  style={{
                    background: "#ede9fe",
                    borderRadius: 10,
                    padding: "11px 14px",
                    color: c.indigo,
                    fontWeight: 700,
                    fontSize: 12,
                    border: `1px solid #c4b5fd`,
                    boxShadow: "0 1px 4px rgba(100,80,200,0.10)",
                    minHeight: 44,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {t}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );

  /* ── RECALL ── */
  if (phase === "recall")
    return (
      <div style={{ ...page, justifyContent: "flex-start" }}>
        <div
          style={{
            maxWidth: pick(bp, {
              mobile: "100%",
              tablet: "100%",
              laptop: "960px",
              desktop: "960px",
            }),
            width: "100%",
          }}
        >
          <div
            style={{
              textAlign: "center",
              marginBottom: pick(bp, { mobile: 20, desktop: 28 }),
            }}
          >
            <div
              style={{
                fontSize: pick(bp, { mobile: 36, desktop: 44 }),
                marginBottom: 4,
              }}
            >
              🎯
            </div>
            <H2 bp={bp}>Free Recall Test</H2>
            <Sub>
              Select every word you remember seeing. Watch out — decoys are
              mixed in!
            </Sub>
          </div>

          {/* Legend */}
          <div
            style={{
              display: "flex",
              gap: 16,
              justifyContent: "center",
              marginBottom: 20,
              flexWrap: "wrap",
            }}
          >
            {[
              ["Unselected", c.border, c.muted],
              ["Selected", c.indigo, c.indigo],
            ].map(([l, border, col]) => (
              <div
                key={l}
                style={{ display: "flex", alignItems: "center", gap: 7 }}
              >
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 4,
                    border: `2px solid ${border}`,
                    background: l === "Selected" ? "#ede9fe" : c.surface,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 12, color: c.muted, fontWeight: 600 }}>
                  {l}
                </span>
              </div>
            ))}
          </div>

          <Card
            bp={bp}
            depth="xl"
            style={{
              padding: pick(bp, { mobile: 12, tablet: 16, desktop: 24 }),
            }}
          >
            <InsetPanel
              bp={bp}
              style={{
                padding: pick(bp, { mobile: 10, tablet: 12, desktop: 16 }),
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${recallCols}, 1fr)`,
                  gap: pick(bp, { mobile: 6, tablet: 8, desktop: 10 }),
                }}
              >
                {grid.map((item) => (
                  <WordTile
                    key={item.word}
                    word={item.word}
                    lang={item.lang}
                    state={getTileState(item)}
                    onClick={() => toggleWord(item.word)}
                    bp={bp}
                  />
                ))}
              </div>
            </InsetPanel>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 20,
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div style={{ fontSize: 13, color: c.muted }}>
                <strong
                  style={{
                    color: selected.size >= WORDS.length ? c.rose : c.indigo,
                  }}
                >
                  {selected.size}
                </strong>
                <span> / {WORDS.length} selected</span>
                {selected.size >= WORDS.length && (
                  <span
                    style={{ color: c.rose, fontWeight: 700, marginLeft: 8 }}
                  >
                    Max reached
                  </span>
                )}
              </div>
              <Btn
                bp={bp}
                onClick={submit}
                disabled={selected.size === 0}
                style={
                  isSmall
                    ? { width: "100%", padding: "14px 0" }
                    : { padding: "13px 32px" }
                }
              >
                Submit &amp; See Analytics →
              </Btn>
            </div>
          </Card>
        </div>
      </div>
    );

  /* ── RESULTS ── */
  if (phase === "results" && scores) {
    const {
      matched,
      enRate,
      svRate,
      total,
      forgetting,
      audienceRet,
      falsePosCount,
    } = scores;

    const serialData = matched.map((d) => ({
      name: `${d.pos}`,
      word: d.word,
      recalled: d.recalled ? 100 : 0,
    }));
    const encodingData = [
      { name: "English", rate: enRate },
      { name: "Swedish", rate: svRate },
    ];

    return (
      <div style={{ ...page, justifyContent: "flex-start" }}>
        <div
          style={{
            maxWidth: pick(bp, {
              mobile: "100%",
              tablet: "100%",
              laptop: "880px",
              desktop: "880px",
            }),
            width: "100%",
          }}
        >
          {/* Header row */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: pick(bp, { mobile: 20, desktop: 28 }),
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <button
              onClick={goHome}
              style={{
                background: "none",
                border: `1.5px solid ${c.border}`,
                borderRadius: 10,
                padding: "8px 16px",
                fontSize: 13,
                color: c.muted,
                cursor: "pointer",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontFamily: "inherit",
                minHeight: 44,
              }}
            >
              ← Home
            </button>
            <div style={{ textAlign: "center", flex: 1, minWidth: "60%" }}>
              <div
                style={{
                  fontSize: pick(bp, { mobile: 36, desktop: 48 }),
                  marginBottom: 4,
                }}
              >
                📊
              </div>
              <H1 bp={bp}>Your Results</H1>
              <Sub>
                Here&apos;s what cognitive science says about your memory
                performance.
              </Sub>
            </div>
            {!isSmall && <div style={{ width: 88 }} />}
          </div>

          {/* Stats pills */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${statsCols}, 1fr)`,
              gap: pick(bp, { mobile: 10, tablet: 12, desktop: 14 }),
              marginBottom: 24,
            }}
          >
            <StatPill
              label="WORDS RECALLED"
              value={`${total}/${WORDS.length}`}
              color={c.indigo}
            />
            <StatPill
              label="RETENTION"
              value={`${audienceRet}%`}
              color={c.violet}
            />
            <StatPill
              label="ENGLISH RECALL"
              value={`${enRate}%`}
              color={c.indigo}
            />
            <StatPill
              label="SWEDISH RECALL"
              value={`${svRate}%`}
              color={c.rose}
            />
            <StatPill
              label="FALSE POSITIVES"
              value={falsePosCount}
              color={falsePosCount > 0 ? c.rose : c.teal}
            />
          </div>

          {/* Selection review */}
          <Card bp={bp} depth="lg" style={{ marginBottom: 22 }}>
            <H3>Selection Review</H3>
            <div
              style={{
                display: "flex",
                gap: 16,
                flexWrap: "wrap",
                margin: "10px 0 16px",
              }}
            >
              {[
                ["✓ Correct", "#dcfce7", "#86efac", c.green],
                ["○ Missed", "#fff7ed", "#fdba74", "#c2410c"],
                ["✗ False Positive", "#fee2e2", "#fca5a5", c.rose],
                ["Correct Rejection", c.surface, c.border, c.muted],
              ].map(([l, bg, border, col]) => (
                <div
                  key={l}
                  style={{ display: "flex", alignItems: "center", gap: 7 }}
                >
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 3,
                      background: bg,
                      border: `1.5px solid ${border}`,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{ fontSize: 12, color: c.muted, fontWeight: 600 }}
                  >
                    {l}
                  </span>
                </div>
              ))}
            </div>
            <InsetPanel
              bp={bp}
              style={{
                padding: pick(bp, { mobile: 10, tablet: 12, desktop: 16 }),
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${recallCols}, 1fr)`,
                  gap: pick(bp, { mobile: 6, tablet: 8, desktop: 10 }),
                }}
              >
                {grid.map((item) => (
                  <WordTile
                    key={item.word}
                    word={item.word}
                    lang={item.lang}
                    state={getTileState(item)}
                    onClick={() => {}}
                    bp={bp}
                  />
                ))}
              </div>
            </InsetPanel>
          </Card>

          {/* Chart 1 — Serial Position */}
          <Card bp={bp} depth="lg" style={{ marginBottom: 22 }}>
            <H3>1 — Serial Position Curve</H3>
            <ChartSub>
              Recall by word position. Notice the{" "}
              <strong>Primacy effect</strong> (start) and{" "}
              <strong>Recency effect</strong> (end).
            </ChartSub>
            <InsetPanel bp={bp} style={{ padding: "20px 8px 8px" }}>
              <ResponsiveContainer
                width="100%"
                height={pick(bp, { mobile: 180, tablet: 200, desktop: 230 })}
              >
                <AreaChart
                  data={serialData}
                  margin={{ top: 8, right: 8, left: -14, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="gI" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={c.indigo}
                        stopOpacity={0.2}
                      />
                      <stop
                        offset="95%"
                        stopColor={c.indigo}
                        stopOpacity={0.01}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={c.border} />
                  <XAxis
                    dataKey="name"
                    label={{
                      value: "Word Position",
                      position: "insideBottom",
                      offset: -2,
                      fontSize: 11,
                      fill: c.muted,
                    }}
                    tick={{ fontSize: 10, fill: c.muted }}
                  />
                  <YAxis
                    domain={[0, 110]}
                    tickFormatter={(v: number) => `${v}%`}
                    tick={{ fontSize: 10, fill: c.muted }}
                    width={36}
                  />
                  <Tooltip
                    formatter={
                      ((
                        v: number | undefined,
                        _: string | undefined,
                        pl: unknown,
                      ) => [
                        `${v ?? 0}%`,
                        (pl as { payload?: { word?: string } })?.payload
                          ?.word ?? "",
                      ]) as never
                    }
                    labelFormatter={(l: unknown) => `Position ${l}`}
                    contentStyle={{
                      borderRadius: 10,
                      border: `1px solid ${c.border}`,
                      boxShadow: shadows.md,
                    }}
                  />
                  <ReferenceLine
                    x="3"
                    stroke={c.violet}
                    strokeDasharray="4 3"
                    label={{
                      value: "Primacy",
                      fontSize: 9,
                      fill: c.violet,
                      position: "top",
                    }}
                  />
                  <ReferenceLine
                    x="13"
                    stroke={c.teal}
                    strokeDasharray="4 3"
                    label={{
                      value: "Recency",
                      fontSize: 9,
                      fill: c.teal,
                      position: "top",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="recalled"
                    stroke={c.indigo}
                    strokeWidth={2.5}
                    fill="url(#gI)"
                    dot={{
                      r: 4,
                      fill: c.indigo,
                      stroke: "#fff",
                      strokeWidth: 2,
                    }}
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </InsetPanel>
          </Card>

          {/* Chart 2 — Encoding Depth */}
          <Card bp={bp} depth="lg" style={{ marginBottom: 22 }}>
            <H3>2 — Encoding Depth Chart</H3>
            <ChartSub>
              <strong>Deep processing</strong> (English) vs{" "}
              <strong>shallow processing</strong> (Swedish). Deeper encoding =
              better recall.
            </ChartSub>
            <InsetPanel bp={bp} style={{ padding: "20px 8px 8px" }}>
              <ResponsiveContainer
                width="100%"
                height={pick(bp, { mobile: 160, tablet: 180, desktop: 200 })}
              >
                <BarChart
                  data={encodingData}
                  margin={{ top: 8, right: 8, left: -14, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={c.border}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: c.muted, fontWeight: 700 }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(v: number) => `${v}%`}
                    tick={{ fontSize: 10, fill: c.muted }}
                    width={36}
                  />
                  <Tooltip
                    formatter={(v: number | undefined) => [
                      `${v ?? 0}%`,
                      "Recall Rate",
                    ]}
                    contentStyle={{
                      borderRadius: 10,
                      border: `1px solid ${c.border}`,
                      boxShadow: shadows.md,
                    }}
                  />
                  <Bar dataKey="rate" radius={[10, 10, 0, 0]} maxBarSize={80}>
                    <Cell fill={c.indigo} />
                    <Cell fill={c.rose} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </InsetPanel>
            <div
              style={{
                display: "flex",
                gap: 20,
                marginTop: 12,
                flexWrap: "wrap",
              }}
            >
              {[
                ["English (Deep)", c.indigo],
                ["Swedish (Shallow)", c.rose],
              ].map(([l, col]) => (
                <div
                  key={l}
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 3,
                      background: col,
                      boxShadow: `0 0 0 2px ${col}44`,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{ fontSize: 12, color: c.muted, fontWeight: 600 }}
                  >
                    {l}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Chart 3 — Forgetting Curve */}
          <Card bp={bp} depth="lg" style={{ marginBottom: 40 }}>
            <H3>3 — The Forgetting Curve</H3>
            <ChartSub>
              Your 5-minute recall vs the{" "}
              <strong>Ebbinghaus retention curve</strong>. Without review,
              memory decays rapidly.
            </ChartSub>
            <InsetPanel bp={bp} style={{ padding: "20px 8px 8px" }}>
              <ResponsiveContainer
                width="100%"
                height={pick(bp, { mobile: 180, tablet: 200, desktop: 230 })}
              >
                <LineChart
                  data={forgetting}
                  margin={{ top: 8, right: 8, left: -14, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={c.border} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: isMobile ? 9 : 11, fill: c.muted }}
                  />
                  <YAxis
                    domain={[0, 110]}
                    tickFormatter={(v: number) => `${v}%`}
                    tick={{ fontSize: 10, fill: c.muted }}
                    width={36}
                  />
                  <Tooltip
                    formatter={(
                      v: number | undefined,
                      n: string | undefined,
                    ) => [
                      `${v ?? 0}%`,
                      n === "retention" ? "Ebbinghaus" : "Your Score",
                    ]}
                    contentStyle={{
                      borderRadius: 10,
                      border: `1px solid ${c.border}`,
                      boxShadow: shadows.md,
                    }}
                  />
                  <Legend
                    formatter={(v: unknown) =>
                      v === "retention" ? "Ebbinghaus Curve" : "Your Score"
                    }
                    wrapperStyle={{ fontSize: 12 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="retention"
                    stroke={c.muted}
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    dot={{
                      r: 4,
                      fill: c.muted,
                      stroke: "#fff",
                      strokeWidth: 2,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="audience"
                    stroke={c.violet}
                    strokeWidth={3}
                    dot={{
                      r: 7,
                      fill: c.violet,
                      stroke: "#fff",
                      strokeWidth: 3,
                    }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </InsetPanel>
          </Card>

          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <Btn
              bp={bp}
              color={c.teal}
              onClick={goHome}
              style={{ padding: "14px 36px", fontSize: 15 }}
            >
              ↺ Run Again
            </Btn>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
