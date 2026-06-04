// ============================================================
// ProductStory.tsx — Cinematic horizontal scrollytelling.
// Desktop: section is 500vh tall. Inner is sticky 100vh.
// A horizontal track of 4 panels translates in sync with scroll,
// with spring easing. Each panel scrubs its own micro-animation
// from the local progress (0..1). Mobile: stacked cards.
// ============================================================
import { useEffect, useRef, useState } from "react";
import {
  useScroll, useSpring, useTransform, useMotionValueEvent, useReducedMotion,
  motion,
} from "framer-motion";
import {
  Search, Filter, Check, Sparkles, Mail, TrendingUp,
  Building2, Briefcase, Users, MousePointer2, CalendarCheck,
} from "lucide-react";

// ---------------- content ----------------
const STEPS = [
  {
    n: "01",
    eyebrow: "Hitta exakt rätt leads",
    title: "Sök i 200M+ beslutsfattare med din ICP",
    body: "Filtrera på titel, bransch och företagsstorlek. Avslöja kontaktuppgifter med ett klick.",
    accent: "#E0512B",
  },
  {
    n: "02",
    eyebrow: "Importera till kampanj",
    title: "Välj leads, skicka in i sekvens",
    body: "Markera dina leads och importera direkt till en ny eller befintlig kampanj.",
    accent: "#D9920F",
  },
  {
    n: "03",
    eyebrow: "AI skriver kampanjen",
    title: "Beskriv ditt erbjudande — få en hel sekvens",
    body: "En mening om vad du säljer och till vem. AI:n skriver 3 personliga mejl i flera steg.",
    accent: "#1F8E66",
  },
  {
    n: "04",
    eyebrow: "Skicka & få svar",
    title: "Mejlen går ut — positiva svar lyfts fram",
    body: "Schemalagda utskick från dina inkorgar. AI klassar svar och visar pipeline live.",
    accent: "#E0512B",
  },
  {
    n: "05",
    eyebrow: "Resultat & pipeline",
    title: "Från kall lista till varm pipeline — automatiskt",
    body: "Se exakt vad kampanjen genererat. Värde per svar, kostnad per möte och tydlig ROI — utan kalkylark.",
    accent: "#D9920F",
  },
];

const HOT_REPLIES = [
  { initials: "SL", name: "Sara Lind", company: "Kavalan", quote: "Intressant, kan vi ta ett snack på torsdag?" },
  { initials: "ME", name: "Mona Ek", company: "Tellus AB", quote: "Vi letar faktiskt efter detta just nu." },
  { initials: "EH", name: "Erik Holm", company: "Northbeam", quote: "Skicka gärna mer info." },
];

// Graph data: pipeline value (kkr) per week
const CHART = [
  { w: "V1", v: 120 },
  { w: "V2", v: 380 },
  { w: "V3", v: 760 },
  { w: "V4", v: 1200 },
];

const LEADS = [
  { initials: "SL", name: "Sara Lind", role: "VD", company: "Kavalan" },
  { initials: "EH", name: "Erik Holm", role: "CTO", company: "Northbeam" },
  { initials: "ME", name: "Mona Ek", role: "Head of Ops", company: "Tellus AB" },
  { initials: "JB", name: "Johan Berg", role: "COO", company: "Vellum" },
];

const PROMPT_TEXT = "Jag vill sälja rekryteringstjänster till svenska IT-företag i tillväxt.";

const SEQ_STEPS = [
  { day: "Dag 1", subject: "Snabb fråga om Kavalans pipeline", body: "Hej Sara,\n\nsåg att Kavalan växer snabbt — grattis! Hur hanterar ni rekrytering av utvecklare just nu?" },
  { day: "Dag 3", subject: "Tre IT-bolag vi nyligen hjälpt", body: "Hej igen Sara, ville bara dela tre case från liknande bolag som halverat tiden att hyra senior-utvecklare…" },
  { day: "Dag 7", subject: "Sista pinget från min sida", body: "Hej Sara — vill inte spamma. Säg bara till om jag ska höra av mig om ett halvår istället." },
];

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

// ---------------- step mockups ----------------
function Step1({ p }: { p: number }) {
  // Cursor moves down filter row → hits "Avslöja"
  const filtersIn = clamp01(p * 3.5);
  const resultsIn = clamp01((p - 0.28) * 3.6);
  const revealedCount = Math.floor(clamp01((p - 0.6) * 2.8) * LEADS.length);
  const filters = [
    { icon: <Briefcase size={12} />, label: "VD, CTO, COO" },
    { icon: <Building2 size={12} />, label: "IT & Tech" },
    { icon: <Users size={12} />, label: "10–200 anställda" },
  ];

  // Cursor path keypoints (in % of the screen container)
  const cursor = (() => {
    if (p < 0.28) {
      const t = clamp01(p / 0.28);
      return { x: 12 + t * 30, y: 22 + t * 8, click: t > 0.85 };
    }
    if (p < 0.6) {
      const t = clamp01((p - 0.28) / 0.32);
      return { x: 42 - t * 8, y: 30 + t * 22, click: false };
    }
    const t = clamp01((p - 0.6) / 0.4);
    const idx = Math.min(LEADS.length - 1, Math.floor(t * LEADS.length));
    return { x: 78, y: 55 + idx * 9, click: (t * LEADS.length) % 1 > 0.7 };
  })();

  return (
    <div className="ps-screen">
      <div className="ps-toolbar">
        <Search size={14} style={{ opacity: 0.6 }} />
        <span className="ps-tbtxt">Sök i 200M+ kontakter…</span>
        <span className="ps-pill"><Filter size={11} /> Filter</span>
      </div>
      <div className="ps-filterrow">
        {filters.map((f, i) => (
          <span key={i} className="ps-chip"
            style={{ opacity: clamp01(filtersIn * 3 - i),
              transform: `translateY(${(1 - clamp01(filtersIn * 3 - i)) * 8}px)` }}>
            {f.icon} {f.label}
          </span>
        ))}
      </div>
      <div className="ps-resultlbl">{resultsIn > 0.4 ? "1 248 träffar" : "Söker…"}</div>
      <div className="ps-list">
        {LEADS.map((l, i) => {
          const op = clamp01(resultsIn * 3 - i * 0.4);
          const isRevealed = i < revealedCount;
          return (
            <div key={l.initials} className="ps-leadrow"
              style={{ opacity: op, transform: `translateY(${(1 - op) * 10}px)` }}>
              <span className="ps-av">{l.initials}</span>
              <span className="ps-leadinfo">
                <b>{l.name}</b><em>{l.role} · {l.company}</em>
              </span>
              <span className={"ps-revealbtn" + (isRevealed ? " done" : "")}>
                {isRevealed ? <><Check size={11} /> Avslöjad</> : "Avslöja"}
              </span>
            </div>
          );
        })}
      </div>
      <div className="ps-cursor" style={{ left: `${cursor.x}%`, top: `${cursor.y}%` }}>
        <MousePointer2 size={16} />
        {cursor.click && <span className="ps-cursorring" />}
      </div>
    </div>
  );
}

function Step2({ p }: { p: number }) {
  const checkedCount = Math.floor(clamp01(p * 1.6) * LEADS.length);
  const footerIn = clamp01((p - 0.5) * 2.5);
  const flyOut = clamp01((p - 0.78) * 4);
  return (
    <div className="ps-screen">
      <div className="ps-toolbar">
        <span className="ps-tbtitle">Mina avslöjade leads</span>
        <span className="ps-pill" style={{ marginLeft: "auto" }}>{LEADS.length} totalt</span>
      </div>
      <div className="ps-list">
        {LEADS.map((l, i) => {
          const checked = i < checkedCount;
          return (
            <div key={l.initials} className={"ps-leadrow" + (checked ? " checked" : "")}
              style={{ opacity: 1 - flyOut * 0.85, transform: `translateX(${flyOut * 60}px) scale(${1 - flyOut * 0.08})` }}>
              <span className={"ps-check" + (checked ? " on" : "")}>
                {checked && <Check size={10} strokeWidth={3} />}
              </span>
              <span className="ps-av">{l.initials}</span>
              <span className="ps-leadinfo">
                <b>{l.name}</b><em>{l.role} · {l.company}</em>
              </span>
            </div>
          );
        })}
      </div>
      <div className="ps-importbar"
        style={{ transform: `translateY(${(1 - footerIn) * 120}%)`, opacity: footerIn }}>
        <span><b>{checkedCount}</b> valda</span>
        <span className="ps-importbtn">Importera till kampanj →</span>
      </div>
    </div>
  );
}

function Step3({ p }: { p: number }) {
  const promptLen = Math.floor(clamp01(p * 2.4) * PROMPT_TEXT.length);
  const promptDone = promptLen >= PROMPT_TEXT.length;
  const generatePulse = p > 0.4 && p < 0.55;
  const seqProgress = clamp01((p - 0.5) * 2.1) * SEQ_STEPS.length;
  const stepsVisible = Math.ceil(seqProgress);
  const lastIdx = Math.max(0, stepsVisible - 1);
  const lastProgress = clamp01(seqProgress - lastIdx);
  return (
    <div className="ps-screen">
      <div className="ps-prompt">
        <span className="ps-promptlbl"><Sparkles size={12} /> Beskriv din kampanj</span>
        <div className="ps-promptbox">
          {PROMPT_TEXT.slice(0, promptLen)}
          {!promptDone && <span className="ps-caret" />}
        </div>
        <button className={"ps-genbtn" + (generatePulse ? " pulse" : "")}>
          <Sparkles size={12} /> Generera sekvens
        </button>
      </div>
      <div className="ps-seq">
        {SEQ_STEPS.map((s, i) => {
          if (i >= stepsVisible) return null;
          const isLast = i === lastIdx && lastProgress < 1;
          const body = isLast ? s.body.slice(0, Math.floor(lastProgress * s.body.length)) : s.body;
          return (
            <div key={i} className="ps-seqcard">
              <div className="ps-seqhead">
                <span className="ps-seqday">{s.day}</span>
                <span className="ps-seqsub">{s.subject}</span>
              </div>
              <div className="ps-seqbody">{body}{isLast && <span className="ps-caret" />}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Step4({ p }: { p: number }) {
  const sendPhase = clamp01(p * 1.8);
  const replyPhase = clamp01((p - 0.45) * 2);
  const replyCount = Math.min(3, Math.floor(replyPhase * 3.3));
  const ratePct = Math.round(clamp01((p - 0.6) * 2.8) * 23);
  const meetings = Math.floor(clamp01((p - 0.75) * 4) * 4);
  const payoff = clamp01((p - 0.78) * 4.5);
  const statusFor = (i: number) => {
    if (replyPhase > 0.55 && i === 2) return "replied";
    if (replyPhase > 0.25 && i === 0) return "replied";
    if (sendPhase > i * 0.12 + 0.05) return "sent";
    return "queued";
  };
  return (
    <div className="ps-screen">
      <div className="ps-toolbar">
        <span className="ps-tbtitle">Kampanj · Live</span>
        <span className="ps-livedot"><span /> Skickar</span>
      </div>
      <div className="ps-flystage">
        {LEADS.map((_, i) => {
          const t = sendPhase - i * 0.1;
          const visible = t > 0 && t < 0.6;
          return (
            <Mail key={i} size={16} className="ps-envelope"
              style={{ opacity: visible ? 1 - t * 1.2 : 0,
                transform: `translate(${Math.max(0, t) * 320}px, ${-Math.max(0, t) * 38}px) rotate(${-10 - t * 15}deg)` }} />
          );
        })}
      </div>
      <div className="ps-list">
        {LEADS.map((l, i) => {
          const st = statusFor(i);
          return (
            <div key={l.initials} className="ps-leadrow">
              <span className="ps-av">{l.initials}</span>
              <span className="ps-leadinfo">
                <b>{l.name}</b><em>{l.company}</em>
              </span>
              <span className={`ps-status ps-st-${st}`}>
                {st === "queued" && "I kö"}
                {st === "sent" && "Skickat"}
                {st === "replied" && "✓ Svarade"}
              </span>
            </div>
          );
        })}
      </div>
      <div className="ps-analytics"
        style={{ opacity: replyPhase > 0.3 ? 1 : 0,
          transform: `translateY(${replyPhase > 0.3 ? 0 : 12}px)` }}>
        <div className="ps-stat">
          <div className="ps-statn">{replyCount}</div>
          <div className="ps-statl">Positiva svar</div>
        </div>
        <div className="ps-stat em">
          <div className="ps-statn"><TrendingUp size={14} /> {ratePct}%</div>
          <div className="ps-statl">Svarsfrekvens</div>
        </div>
      </div>

      {/* PAYOFF overlay */}
      <div className="ps-payoff" style={{ opacity: payoff, transform: `scale(${0.96 + payoff * 0.04})` }}>
        <div className="ps-payoffinner">
          <span className="ps-payoffeye">RESULTAT · 7 DAGAR</span>
          <div className="ps-payoffgrid">
            <div><div className="ps-bignum">{replyCount}</div><div className="ps-biglbl">positiva svar</div></div>
            <div><div className="ps-bignum">{ratePct}%</div><div className="ps-biglbl">svarsfrekvens</div></div>
            <div><div className="ps-bignum"><CalendarCheck size={20} /> {meetings}</div><div className="ps-biglbl">möten bokade</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Step5({ p }: { p: number }) {
  // Chart geometry
  const W = 460, H = 150, PAD_L = 28, PAD_R = 14, PAD_T = 12, PAD_B = 26;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const maxV = 1300;
  const pts = CHART.map((d, i) => ({
    x: PAD_L + (i / (CHART.length - 1)) * innerW,
    y: PAD_T + innerH - (d.v / maxV) * innerH,
    w: d.w, v: d.v,
  }));
  // Smooth-ish path
  const linePath = pts.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    const prev = pts[i - 1];
    const cx = (prev.x + pt.x) / 2;
    return `${acc} C ${cx} ${prev.y}, ${cx} ${pt.y}, ${pt.x} ${pt.y}`;
  }, "");
  const areaPath = `${linePath} L ${pts[pts.length - 1].x} ${PAD_T + innerH} L ${pts[0].x} ${PAD_T + innerH} Z`;

  // Phases
  const headerIn = clamp01(p / 0.15);
  const lineDraw = clamp01((p - 0.15) / 0.4);     // 0.15 → 0.55
  const areaIn = clamp01((p - 0.5) / 0.2);
  const roiIn = clamp01((p - 0.6) / 0.15);
  const statsIn = clamp01((p - 0.7) / 0.12);
  const hotPhase = clamp01((p - 0.78) / 0.22);

  // Animated counters
  const pipelineK = Math.round(clamp01(lineDraw) * 1200);
  const pipelineLabel = pipelineK >= 1000
    ? `${(pipelineK / 1000).toFixed(1).replace(".", ",")} MSEK`
    : `${pipelineK} kkr`;
  const meetings = Math.floor(statsIn * 7);
  const cpm = statsIn > 0.1 ? `${Math.round(3200)} kr` : "—";
  const roiPct = Math.round(roiIn * 312);

  // Path length approx for dasharray scrub
  const PATH_LEN = 700;

  return (
    <div className="ps-screen">
      <div className="ps-toolbar" style={{ opacity: headerIn }}>
        <span className="ps-tbtitle">Kampanj · Analys</span>
        <span className="ps-pill" style={{ marginLeft: "auto" }}>Senaste 4 veckorna</span>
      </div>

      <div className="ps-bigval" style={{ opacity: headerIn }}>
        <span className="ps-bigvallbl">PIPELINE-VÄRDE</span>
        <div className="ps-bigvalnum">{pipelineLabel}</div>
      </div>

      <div className="ps-chartwrap" style={{ opacity: headerIn }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="ps-chart" preserveAspectRatio="none">
          {/* Grid */}
          {[0.25, 0.5, 0.75, 1].map((t, i) => (
            <line key={i} x1={PAD_L} x2={W - PAD_R}
              y1={PAD_T + innerH * (1 - t)} y2={PAD_T + innerH * (1 - t)}
              stroke="var(--line)" strokeWidth="1" strokeDasharray="2 4" opacity="0.5" />
          ))}
          {/* Area */}
          <defs>
            <linearGradient id="ps-area-grad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--scene)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--scene)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#ps-area-grad)" opacity={areaIn} />
          {/* Line */}
          <path d={linePath} fill="none" stroke="var(--scene)" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
            style={{
              strokeDasharray: PATH_LEN,
              strokeDashoffset: PATH_LEN * (1 - lineDraw),
            }} />
          {/* Points */}
          {pts.map((pt, i) => {
            const tIn = clamp01(lineDraw * CHART.length - i);
            return (
              <g key={i} opacity={tIn}>
                <circle cx={pt.x} cy={pt.y} r="4" fill="var(--pg)" stroke="var(--scene)" strokeWidth="2" />
                <text x={pt.x} y={H - 8} textAnchor="middle" fontSize="9"
                  fontFamily="JetBrains Mono, ui-monospace, monospace"
                  fill="var(--tx3)" letterSpacing="0.05em">{pt.w}</text>
              </g>
            );
          })}
        </svg>
        <div className="ps-roi" style={{ opacity: roiIn, transform: `translateY(${(1 - roiIn) * 6}px)` }}>
          <TrendingUp size={14} /> +{roiPct}% ROI
        </div>
      </div>

      <div className="ps-ministats" style={{ opacity: statsIn, transform: `translateY(${(1 - statsIn) * 8}px)` }}>
        <div className="ps-mstat"><b>{meetings}</b><span>möten bokade</span></div>
        <div className="ps-mstat"><b>{cpm}</b><span>kostnad / möte</span></div>
        <div className="ps-mstat em"><b>+{roiPct}%</b><span>ROI</span></div>
      </div>

      <div className="ps-hot">
        {HOT_REPLIES.map((r, i) => {
          const op = clamp01(hotPhase * 3 - i);
          return (
            <div key={r.initials} className="ps-hotcard"
              style={{ opacity: op, transform: `translateY(${(1 - op) * 8}px)` }}>
              <span className="ps-av">{r.initials}</span>
              <span className="ps-hotinfo">
                <b>{r.name} · <em>{r.company}</em></b>
                <span className="ps-hotquote">"{r.quote}"</span>
              </span>
              <span className="ps-status ps-st-replied">Intresserad</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const STEP_COMPS = [Step1, Step2, Step3, Step4, Step5];

// ---------------- panel ----------------
function Panel({ idx, p }: { idx: number; p: number }) {
  const s = STEPS[idx];
  const Comp = STEP_COMPS[idx];
  return (
    <div className="ps-panel" style={{ ["--scene" as any]: s.accent }}>
      <div className="ps-paneltext">
        <span className="ps-eyebrow">STEG {s.n} · {s.eyebrow.toUpperCase()}</span>
        <h3 className="ps-paneltitle">{s.title}</h3>
        <p className="ps-panelbody">{s.body}</p>
      </div>
      <div className="ps-panelstage">
        <div className="ps-stage">
          <div className="ps-glow" />
          <div className="ps-glasshead">
            <span className="ps-dots"><span /><span /><span /></span>
            <span className="ps-gtitle">MailLead · Steg {s.n} / 04</span>
          </div>
          <div className="ps-glassbody">
            <div className="ps-frame"><Comp p={p} /></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------- main ----------------
export default function ProductStory() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const m = window.matchMedia("(max-width: 1023px)");
    const update = () => setIsMobile(m.matches);
    update();
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, []);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  // Spring-eased global progress for buttery scrub
  const smooth = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.4 });
  // 4 panels → 0..4
  const stepProgress = useTransform(smooth, [0, 1], [0, 5]);
  // Horizontal translate: 0vw → -400vw (5 paneler)
  const trackX = useTransform(smooth, [0, 1], ["0vw", "-400vw"]);

  const [progress, setProgress] = useState(0);
  useMotionValueEvent(stepProgress, "change", (v) => setProgress(v));

  const activeStep = Math.min(4, Math.floor(progress));
  const localP = progress - activeStep;
  const activeAccent = STEPS[activeStep].accent;

  if (isMobile) {
    return (
      <section className="ps-section ps-mobile">
        <style>{CSS}</style>
        <div className="ps-wrap">
          <p className="ps-eyebrow">Hela flödet</p>
          <h2 className="ps-sech">Från ICP till svar — på en eftermiddag</h2>
          {STEPS.map((s, i) => {
            const StepComp = STEP_COMPS[i];
            return (
              <div className="ps-mcard" key={i} style={{ ["--scene" as any]: s.accent }}>
                <div className="ps-mstage"><StepComp p={1} /></div>
                <div className="ps-mtext">
                  <span className="ps-eyebrow">STEG {s.n} · {s.eyebrow.toUpperCase()}</span>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section className="ps-section" ref={sectionRef} style={{ ["--scene" as any]: activeAccent }}>
      <style>{CSS}</style>
      <div className="ps-pin">
        {/* Intro header — diegetic, lives above the track */}
        <div className="ps-introhead">
          <p className="ps-eyebrow">HELA FLÖDET</p>
          <h2 className="ps-sech">
            Från ICP till svar — <span className="ps-accentword">på en eftermiddag.</span>
          </h2>
        </div>

        {/* Horizontal track */}
        <div className="ps-trackmask">
          <motion.div className="ps-track" style={{ x: trackX }}>
            {STEPS.map((_, i) => (
              <Panel
                key={i}
                idx={i}
                p={reduced ? 1 : (i === activeStep ? localP : i < activeStep ? 1 : 0)}
              />
            ))}
          </motion.div>
        </div>

        {/* Bottom progress rail */}
        <div className="ps-railwrap">
          <div className="ps-railline">
            <div className="ps-railfill" style={{ width: `${(progress / 5) * 100}%`, background: activeAccent }} />
          </div>
          <div className="ps-railsteps">
            {STEPS.map((s, i) => (
              <div key={i} className={"ps-railstep" + (activeStep >= i ? " on" : "")}>
                <span className="ps-rnum">{s.n}</span>
                <span className="ps-rlbl">{s.eyebrow}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------- styles ----------------
const CSS = `
.ps-section{position:relative;}
.ps-section:not(.ps-mobile){height:600vh;}
.ps-pin{position:sticky;top:0;height:100vh;display:flex;flex-direction:column;overflow:hidden;}

.ps-introhead{position:absolute;top:0;left:0;right:0;padding:90px 32px 0;text-align:center;z-index:3;pointer-events:none;}
.ps-eyebrow{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--eyebrow);margin:0 0 10px;}
.ps-sech{font-size:clamp(28px,3.4vw,42px);font-weight:700;letter-spacing:-.025em;color:var(--hh);margin:0;line-height:1.08;}
.ps-accentword{color:var(--scene);transition:color .6s cubic-bezier(.22,.61,.36,1);}

.ps-trackmask{flex:1;overflow:hidden;position:relative;margin-top:140px;}
.ps-trackmask::before,.ps-trackmask::after{content:"";position:absolute;top:0;bottom:0;width:80px;z-index:2;pointer-events:none;}
.ps-trackmask::before{left:0;background:linear-gradient(90deg,var(--pg),transparent);}
.ps-trackmask::after{right:0;background:linear-gradient(-90deg,var(--pg),transparent);}

.ps-track{display:flex;height:100%;will-change:transform;}
.ps-panel{flex:0 0 100vw;height:100%;display:grid;grid-template-columns:1fr 1.05fr;gap:48px;align-items:center;padding:0 max(48px,8vw) 80px;box-sizing:border-box;}

.ps-paneltext{display:flex;flex-direction:column;gap:14px;max-width:440px;}
.ps-paneltitle{font-size:clamp(24px,2.4vw,32px);font-weight:600;color:var(--hh);margin:0;letter-spacing:-.015em;line-height:1.18;}
.ps-panelbody{color:var(--tx2);font-size:15.5px;line-height:1.55;margin:0;}

.ps-panelstage{display:flex;justify-content:center;align-items:center;height:100%;}
.ps-stage{position:relative;width:100%;max-width:540px;height:min(620px,68vh);border-radius:22px;background:var(--glass-bg);border:1px solid var(--glass-bd);backdrop-filter:blur(14px);display:flex;flex-direction:column;overflow:hidden;box-shadow:0 40px 90px -28px color-mix(in srgb, var(--scene) 35%, transparent), var(--glass-sh);transition:box-shadow .8s cubic-bezier(.22,.61,.36,1);}
.ps-glow{position:absolute;inset:0;pointer-events:none;background:radial-gradient(70% 90% at 50% 0%, color-mix(in srgb, var(--scene) 22%, transparent), transparent 70%);transition:background .8s cubic-bezier(.22,.61,.36,1);}
.ps-glasshead{position:relative;display:flex;align-items:center;gap:12px;padding:13px 18px;border-bottom:1px solid var(--panel-bd);background:var(--panel-bg);}
.ps-dots{display:flex;gap:5px;}
.ps-dots span{width:9px;height:9px;border-radius:50%;background:var(--dots);}
.ps-gtitle{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;letter-spacing:.1em;color:var(--mono);}
.ps-glassbody{position:relative;flex:1;overflow:hidden;}
.ps-frame{position:absolute;inset:0;padding:18px;}

/* shared mock */
.ps-screen{height:100%;display:flex;flex-direction:column;gap:10px;font-size:13px;position:relative;}
.ps-toolbar{display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--panel-bg);border:1px solid var(--panel-bd);border-radius:10px;}
.ps-tbtxt{flex:1;font-size:13px;color:var(--tx3);}
.ps-tbtitle{font-weight:600;font-size:13px;color:var(--tx);}
.ps-pill{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:99px;background:var(--badge-bg);border:1px solid var(--badge-bd);font-size:11px;color:var(--badge-tx);}
.ps-filterrow{display:flex;gap:6px;flex-wrap:wrap;min-height:24px;}
.ps-chip{display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border-radius:99px;background:var(--fic-bg);color:var(--fic-tx);font-size:11px;font-weight:500;}
.ps-resultlbl{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10px;letter-spacing:.1em;color:var(--mono);text-transform:uppercase;padding:0 4px;}
.ps-list{flex:1;display:flex;flex-direction:column;gap:6px;overflow:hidden;}
.ps-leadrow{display:flex;align-items:center;gap:10px;padding:9px 11px;background:var(--panel-bg);border:1px solid var(--lead-bd);border-radius:10px;transition:background .3s,border-color .3s,opacity .4s,transform .4s;}
.ps-leadrow.checked{border-color:var(--scene);background:color-mix(in srgb, var(--scene) 6%, transparent);}
.ps-av{width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#E0512B,#D9920F);color:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;font-family:'JetBrains Mono',ui-monospace,monospace;}
.ps-leadinfo{flex:1;display:flex;flex-direction:column;line-height:1.2;min-width:0;}
.ps-leadinfo b{font-size:12.5px;font-weight:600;color:var(--tx);}
.ps-leadinfo em{font-style:normal;font-size:10.5px;color:var(--tx3);margin-top:1px;}
.ps-revealbtn{font-size:10.5px;padding:4px 10px;border-radius:99px;background:var(--scene);color:#fff;font-weight:500;display:inline-flex;align-items:center;gap:4px;transition:all .25s;}
.ps-revealbtn.done{background:var(--rep-bg);color:var(--rep-tx);}
.ps-check{width:16px;height:16px;border-radius:4px;border:1.5px solid var(--line);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#fff;transition:all .25s;}
.ps-check.on{background:var(--scene);border-color:var(--scene);}

.ps-cursor{position:absolute;pointer-events:none;color:var(--hh);filter:drop-shadow(0 2px 4px rgba(0,0,0,.25));transition:left .35s cubic-bezier(.22,.61,.36,1),top .35s cubic-bezier(.22,.61,.36,1);z-index:5;}
.ps-cursorring{position:absolute;left:-6px;top:-6px;width:28px;height:28px;border-radius:50%;border:2px solid var(--scene);animation:psring .5s ease-out;}
@keyframes psring{0%{transform:scale(.4);opacity:1}100%{transform:scale(1.3);opacity:0}}

.ps-importbar{position:absolute;left:18px;right:18px;bottom:18px;background:var(--hh);color:var(--pg);padding:12px 16px;border-radius:12px;display:flex;align-items:center;justify-content:space-between;font-size:13px;box-shadow:0 12px 30px rgba(0,0,0,.18);transition:transform .5s,opacity .5s;}
.ps-importbtn{background:var(--scene);color:#fff;padding:6px 12px;border-radius:8px;font-size:12px;font-weight:500;}

.ps-prompt{display:flex;flex-direction:column;gap:8px;padding:14px;background:var(--panel-bg);border:1px solid var(--panel-bd);border-radius:12px;}
.ps-promptlbl{display:inline-flex;align-items:center;gap:5px;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10px;letter-spacing:.1em;color:var(--eyebrow);text-transform:uppercase;}
.ps-promptbox{min-height:46px;padding:9px 11px;background:var(--pg);border:1px solid var(--line);border-radius:8px;font-size:13px;color:var(--tx);line-height:1.45;}
.ps-genbtn{align-self:flex-start;display:inline-flex;align-items:center;gap:5px;padding:7px 13px;border-radius:8px;background:var(--scene);color:#fff;font-size:11.5px;font-weight:500;border:0;cursor:pointer;}
.ps-genbtn.pulse{animation:pspulse 1.1s ease-out infinite;}
@keyframes pspulse{0%,100%{box-shadow:0 0 0 0 color-mix(in srgb,var(--scene) 50%, transparent);}50%{box-shadow:0 0 0 10px color-mix(in srgb,var(--scene) 0%, transparent);}}
.ps-caret{display:inline-block;width:2px;height:1em;background:var(--scene);vertical-align:middle;margin-left:2px;animation:pscaret .9s steps(2) infinite;}
@keyframes pscaret{50%{opacity:0;}}

.ps-seq{display:flex;flex-direction:column;gap:7px;}
.ps-seqcard{padding:10px 13px;background:var(--panel-bg);border:1px solid var(--panel-bd);border-radius:10px;animation:psfadeup .45s ease both;}
@keyframes psfadeup{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}
.ps-seqhead{display:flex;align-items:center;gap:8px;margin-bottom:5px;}
.ps-seqday{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:9.5px;letter-spacing:.1em;color:var(--eyebrow);text-transform:uppercase;}
.ps-seqsub{font-size:12px;font-weight:600;color:var(--tx);}
.ps-seqbody{font-size:11.5px;color:var(--gbody);line-height:1.5;white-space:pre-wrap;}

.ps-flystage{position:relative;height:26px;}
.ps-envelope{position:absolute;left:10px;top:5px;color:var(--scene);transition:transform .15s linear,opacity .25s;}
.ps-livedot{display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--live-tx);font-weight:500;margin-left:auto;}
.ps-livedot span{width:6px;height:6px;border-radius:50%;background:var(--live-tx);animation:pspulse2 1.2s ease-in-out infinite;}
@keyframes pspulse2{0%,100%{opacity:1;}50%{opacity:.4;}}
.ps-status{font-size:10.5px;padding:3px 9px;border-radius:99px;font-weight:500;transition:background .4s,color .4s;}
.ps-st-queued{background:var(--sch-bg);color:var(--sch-tx);}
.ps-st-sent{background:var(--snt-bg);color:var(--snt-tx);}
.ps-st-replied{background:var(--rep-bg);color:var(--rep-tx);}

.ps-analytics{display:grid;grid-template-columns:1fr 1fr;gap:8px;transition:opacity .5s,transform .5s;}
.ps-stat{padding:11px 13px;background:var(--schip-bg);border:1px solid var(--schip-bd);border-radius:10px;}
.ps-stat.em{background:var(--fic-bg);border-color:var(--scene);}
.ps-statn{font-size:20px;font-weight:700;color:var(--hh);display:inline-flex;align-items:center;gap:6px;line-height:1;letter-spacing:-.02em;}
.ps-stat.em .ps-statn{color:var(--scene);}
.ps-statl{font-size:10px;color:var(--tx3);margin-top:4px;font-family:'JetBrains Mono',ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;}

/* PAYOFF */
.ps-payoff{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb, var(--pg) 90%, transparent);backdrop-filter:blur(6px);transition:opacity .55s cubic-bezier(.22,.61,.36,1),transform .55s cubic-bezier(.22,.61,.36,1);pointer-events:none;}
.ps-payoffinner{text-align:center;padding:20px;}
.ps-payoffeye{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10px;letter-spacing:.18em;color:var(--scene);display:block;margin-bottom:18px;}
.ps-payoffgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;}
.ps-bignum{font-size:34px;font-weight:700;color:var(--hh);letter-spacing:-.03em;display:inline-flex;align-items:center;gap:6px;line-height:1;}
.ps-biglbl{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:9.5px;letter-spacing:.12em;color:var(--tx3);text-transform:uppercase;margin-top:8px;}

/* RAIL */
.ps-railwrap{position:absolute;left:0;right:0;bottom:32px;padding:0 max(48px,8vw);z-index:3;}
.ps-railline{height:2px;background:var(--line);border-radius:2px;overflow:hidden;}
.ps-railfill{height:100%;border-radius:2px;transition:width .15s linear,background .8s cubic-bezier(.22,.61,.36,1);}
.ps-railsteps{display:grid;grid-template-columns:repeat(5,1fr);margin-top:12px;}
.ps-railstep{display:flex;flex-direction:column;gap:3px;opacity:.4;transition:opacity .4s;}
.ps-railstep.on{opacity:1;}
.ps-rnum{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10px;color:var(--scene);letter-spacing:.1em;}
.ps-rlbl{font-size:12px;color:var(--tx2);font-weight:500;}

/* mobile */
.ps-section.ps-mobile{padding:60px 0 20px;}
.ps-section.ps-mobile .ps-wrap{max-width:680px;margin:0 auto;padding:0 24px;}
.ps-section.ps-mobile .ps-sech{font-size:28px;margin:8px 0 0;}
.ps-mcard{margin-top:28px;border-radius:18px;border:1px solid var(--glass-bd);background:var(--glass-bg);box-shadow:var(--glass-sh);overflow:hidden;}
.ps-mstage{height:360px;padding:16px;border-bottom:1px solid var(--panel-bd);}
.ps-mtext{padding:20px;}
.ps-mtext h3{font-size:22px;font-weight:600;color:var(--hh);margin:10px 0 8px;letter-spacing:-.01em;}
.ps-mtext p{color:var(--tx2);font-size:14.5px;line-height:1.5;margin:0;}

@media (max-width:1023px){
  .ps-section:not(.ps-mobile){display:none;}
}
`;
