// ============================================================
// ProductStory.tsx — Scroll-pinned 4-step product showcase.
// Desktop: one sticky 100vh row that morphs as user scrolls
// through the 3.6× tall section. Mobile: stacked cards.
// ============================================================
import { useEffect, useRef, useState } from "react";
import { useScroll, useTransform, useMotionValueEvent, useReducedMotion } from "framer-motion";
import {
  Search, Filter, Check, Sparkles, Mail, TrendingUp,
  Building2, Briefcase, Users, ArrowDown,
} from "lucide-react";

// ---------------- content ----------------
const STEPS = [
  {
    n: "01",
    eyebrow: "Hitta exakt rätt leads",
    title: "Sök i 200M+ beslutsfattare med din ICP",
    body: "Filtrera på titel, bransch och företagsstorlek. Avslöja kontaktuppgifter med ett klick.",
    bullets: ["Titel · Bransch · Storlek · Geografi", "Verifierade mejl, inga studsar"],
    accent: "#E0512B",
  },
  {
    n: "02",
    eyebrow: "Importera till kampanj",
    title: "Välj leads, skicka in i sekvens",
    body: "Markera de leads du vill bearbeta och importera direkt till en befintlig eller ny kampanj.",
    bullets: ["Bulk-import med dubblettkontroll", "Smart fältmappning från CSV"],
    accent: "#D9920F",
  },
  {
    n: "03",
    eyebrow: "AI skriver kampanjen",
    title: "Beskriv ditt erbjudande — få en hel sekvens",
    body: "Skriv en mening om vad du säljer och till vem. AI:n genererar 3 personliga mejl i flera steg.",
    bullets: ["Skräddarsytt per lead", "Du godkänner innan utskick"],
    accent: "#1F8E66",
  },
  {
    n: "04",
    eyebrow: "Skicka & få svar",
    title: "Mejlen går ut — svaren hamnar i unibox",
    body: "Schemalagda utskick från dina inkorgar. Positiva svar identifieras automatiskt av AI.",
    bullets: ["Spridd sändning skyddar din domän", "AI klassar svar som intresserade"],
    accent: "#E0512B",
  },
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
  const filtersIn = clamp01(p * 4);
  const resultsIn = clamp01((p - 0.25) * 4);
  const revealedCount = Math.floor(clamp01((p - 0.55) * 2.5) * LEADS.length);
  const filters = [
    { icon: <Briefcase size={12} />, label: "VD, CTO, COO" },
    { icon: <Building2 size={12} />, label: "IT & Tech" },
    { icon: <Users size={12} />, label: "10–200 anställda" },
  ];
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
      <div className="ps-resultlbl">{resultsIn > 0.5 ? "1 248 träffar" : "Söker…"}</div>
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
    </div>
  );
}

function Step2({ p }: { p: number }) {
  const checkedCount = Math.floor(clamp01(p * 1.6) * LEADS.length);
  const footerIn = clamp01((p - 0.55) * 2.5);
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
            <div key={l.initials} className={"ps-leadrow" + (checked ? " checked" : "")}>
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
  const promptLen = Math.floor(clamp01(p * 2.8) * PROMPT_TEXT.length);
  const promptDone = promptLen >= PROMPT_TEXT.length;
  const generatePulse = p > 0.36 && p < 0.5;
  const seqProgress = clamp01((p - 0.45) * 2.2) * SEQ_STEPS.length;
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
  const sendPhase = clamp01(p * 2);
  const replyPhase = clamp01((p - 0.5) * 2);
  const replyCount = Math.min(3, Math.floor(replyPhase * 3.3));
  const ratePct = Math.round(clamp01((p - 0.7) * 3.3) * 23);
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
          const t = sendPhase - i * 0.12;
          const visible = t > 0 && t < 0.55;
          return (
            <Mail key={i} size={16} className="ps-envelope"
              style={{ opacity: visible ? 1 - t : 0,
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
        style={{ opacity: replyPhase > 0.35 ? 1 : 0,
          transform: `translateY(${replyPhase > 0.35 ? 0 : 12}px)` }}>
        <div className="ps-stat">
          <div className="ps-statn">{replyCount}</div>
          <div className="ps-statl">Positiva svar</div>
        </div>
        <div className="ps-stat em">
          <div className="ps-statn"><TrendingUp size={14} /> {ratePct}%</div>
          <div className="ps-statl">Svarsfrekvens</div>
        </div>
      </div>
    </div>
  );
}

const STEP_COMPS = [Step1, Step2, Step3, Step4];

// ---------------- stage with crossfade ----------------
function Stage({ progress, accent }: { progress: number; accent: string }) {
  // progress 0..4
  const idx = Math.min(3, Math.floor(progress));
  const local = progress - idx;
  const fadeOut = local > 0.85 ? (local - 0.85) / 0.15 : 0;
  const Cur = STEP_COMPS[idx];
  const Next = idx < 3 ? STEP_COMPS[idx + 1] : null;
  return (
    <div className="ps-stage" style={{ boxShadow: `0 30px 80px -20px ${accent}33, var(--glass-sh)` }}>
      <div className="ps-glow" style={{ background: `radial-gradient(60% 80% at 50% 0%, ${accent}22, transparent 70%)` }} />
      <div className="ps-glasshead">
        <span className="ps-dots"><span /><span /><span /></span>
        <span className="ps-gtitle">MailLead · Steg {String(idx + 1).padStart(2, "0")} / 04</span>
      </div>
      <div className="ps-glassbody">
        <div className="ps-frame" style={{ opacity: 1 - fadeOut }}>
          <Cur p={local} />
        </div>
        {Next && fadeOut > 0 && (
          <div className="ps-frame" style={{ opacity: fadeOut }}>
            <Next p={0} />
          </div>
        )}
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
  const stepProgress = useTransform(scrollYProgress, [0, 1], [0, 4]);
  const [progress, setProgress] = useState(0);
  useMotionValueEvent(stepProgress, "change", (v) => setProgress(v));

  const activeStep = Math.min(3, Math.floor(progress));
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
              <div className="ps-mcard" key={i}>
                <div className="ps-mstage"><StepComp p={1} /></div>
                <div className="ps-mtext">
                  <span className="ps-mnum">STEG {s.n} · {s.eyebrow.toUpperCase()}</span>
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

  const effectiveProgress = reduced ? activeStep : progress;
  const scrollHint = clamp01(1 - progress * 4);

  return (
    <section className="ps-section" ref={sectionRef}>
      <style>{CSS}</style>
      <div className="ps-pinrow">
        <div className="ps-wrap ps-pingrid">
          {/* LEFT: text */}
          <div className="ps-left">
            <p className="ps-eyebrow">Hela flödet</p>
            <h2 className="ps-sech">
              Från ICP till svar<br />
              <span style={{ color: activeAccent, transition: "color .5s var(--ease)" }}>på en eftermiddag.</span>
            </h2>

            <div className="ps-textbox">
              {STEPS.map((s, i) => {
                const isActive = activeStep === i;
                return (
                  <div key={i} className={"ps-textcard" + (isActive ? " active" : "")}>
                    <span className="ps-stepnum" style={{ color: s.accent }}>
                      STEG {s.n} · {s.eyebrow.toUpperCase()}
                    </span>
                    <h3>{s.title}</h3>
                    <p>{s.body}</p>
                    <ul>
                      {s.bullets.map((b) => (
                        <li key={b}><Check size={13} style={{ color: s.accent }} /> {b}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            <div className="ps-rail">
              {STEPS.map((s, i) => (
                <div key={i} className={"ps-railitem" + (activeStep >= i ? " on" : "")}>
                  <span className="ps-railtick" style={{ background: activeStep >= i ? s.accent : undefined }} />
                  <span className="ps-railnum">{s.n}</span>
                </div>
              ))}
            </div>

            <div className="ps-scrollhint" style={{ opacity: scrollHint }}>
              <ArrowDown size={14} /> Scrolla för att se hela flödet
            </div>
          </div>

          {/* RIGHT: sticky-pinned stage */}
          <div className="ps-right">
            <Stage progress={effectiveProgress} accent={activeAccent} />
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------- styles ----------------
const CSS = `
.ps-section{position:relative;padding:60px 0 80px;}
.ps-section:not(.ps-mobile){height:calc(100vh * 3.6);}
.ps-section:not(.ps-mobile)::before{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 0%,rgba(255,255,255,.04) 20%,rgba(255,255,255,.04) 80%,transparent 100%);pointer-events:none;}
.dark .ps-section:not(.ps-mobile)::before{background:linear-gradient(180deg,transparent 0%,rgba(0,0,0,.18) 20%,rgba(0,0,0,.18) 80%,transparent 100%);}
.ps-pinrow{position:sticky;top:0;height:100vh;display:flex;align-items:center;}
.ps-wrap{max-width:1240px;margin:0 auto;padding:0 32px;width:100%;}
.ps-pingrid{display:grid;grid-template-columns:1fr 1.05fr;gap:60px;align-items:center;height:100%;padding-top:90px;padding-bottom:40px;}

/* LEFT */
.ps-left{display:flex;flex-direction:column;gap:18px;max-width:520px;}
.ps-eyebrow{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--eyebrow);margin:0;}
.ps-sech{font-size:clamp(30px,3.6vw,46px);font-weight:700;letter-spacing:-.025em;color:var(--hh);margin:0;line-height:1.05;}
.ps-textbox{position:relative;min-height:240px;margin-top:8px;}
.ps-textcard{position:absolute;inset:0;opacity:0;transform:translateY(14px);transition:opacity .55s var(--ease),transform .55s var(--ease);pointer-events:none;display:flex;flex-direction:column;gap:12px;}
.ps-textcard.active{opacity:1;transform:none;pointer-events:auto;}
.ps-stepnum{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;letter-spacing:.14em;font-weight:600;}
.ps-textcard h3{font-size:22px;font-weight:600;color:var(--hh);margin:0;letter-spacing:-.01em;line-height:1.25;}
.ps-textcard p{color:var(--tx2);font-size:15px;line-height:1.55;margin:0;}
.ps-textcard ul{list-style:none;padding:0;margin:6px 0 0;display:flex;flex-direction:column;gap:7px;}
.ps-textcard ul li{display:flex;align-items:center;gap:8px;color:var(--tx2);font-size:13.5px;}
.ps-textcard ul li svg{flex-shrink:0;}

.ps-rail{display:flex;gap:14px;margin-top:8px;}
.ps-railitem{display:flex;align-items:center;gap:6px;opacity:.4;transition:opacity .4s var(--ease);}
.ps-railitem.on{opacity:1;}
.ps-railtick{width:32px;height:3px;border-radius:3px;background:var(--line);transition:background .4s var(--ease);}
.ps-railnum{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10px;color:var(--tx3);letter-spacing:.1em;}

.ps-scrollhint{margin-top:6px;display:inline-flex;align-items:center;gap:6px;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;color:var(--tx3);letter-spacing:.08em;transition:opacity .4s var(--ease);}
.ps-scrollhint svg{animation:psbounce 1.6s ease-in-out infinite;}
@keyframes psbounce{0%,100%{transform:translateY(0)}50%{transform:translateY(4px)}}

/* RIGHT stage */
.ps-right{display:flex;justify-content:center;align-items:center;height:100%;}
.ps-stage{position:relative;width:100%;max-width:560px;height:min(640px,72vh);border-radius:20px;background:var(--glass-bg);border:1px solid var(--glass-bd);backdrop-filter:blur(12px);display:flex;flex-direction:column;overflow:hidden;transition:box-shadow .6s var(--ease);}
.ps-glow{position:absolute;inset:0;pointer-events:none;transition:background .6s var(--ease);}
.ps-glasshead{position:relative;display:flex;align-items:center;gap:12px;padding:13px 18px;border-bottom:1px solid var(--panel-bd);background:var(--panel-bg);}
.ps-dots{display:flex;gap:5px;}
.ps-dots span{width:9px;height:9px;border-radius:50%;background:var(--dots);}
.ps-gtitle{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;letter-spacing:.1em;color:var(--mono);}
.ps-glassbody{position:relative;flex:1;overflow:hidden;}
.ps-frame{position:absolute;inset:0;padding:18px;transition:opacity .3s var(--ease);}

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
.ps-leadrow{display:flex;align-items:center;gap:10px;padding:9px 11px;background:var(--panel-bg);border:1px solid var(--lead-bd);border-radius:10px;transition:background .3s var(--ease),border-color .3s var(--ease);}
.ps-leadrow.checked{border-color:var(--lead);background:rgba(224,81,43,.05);}
.ps-av{width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#E0512B,#D9920F);color:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;font-family:'JetBrains Mono',ui-monospace,monospace;}
.ps-leadinfo{flex:1;display:flex;flex-direction:column;line-height:1.2;min-width:0;}
.ps-leadinfo b{font-size:12.5px;font-weight:600;color:var(--tx);}
.ps-leadinfo em{font-style:normal;font-size:10.5px;color:var(--tx3);margin-top:1px;}
.ps-revealbtn{font-size:10.5px;padding:4px 10px;border-radius:99px;background:var(--lead);color:#fff;font-weight:500;display:inline-flex;align-items:center;gap:4px;transition:all .25s var(--ease);}
.ps-revealbtn.done{background:var(--rep-bg);color:var(--rep-tx);}
.ps-check{width:16px;height:16px;border-radius:4px;border:1.5px solid var(--line);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#fff;transition:all .25s var(--ease);}
.ps-check.on{background:var(--lead);border-color:var(--lead);}

.ps-importbar{position:absolute;left:18px;right:18px;bottom:18px;background:var(--hh);color:var(--pg);padding:12px 16px;border-radius:12px;display:flex;align-items:center;justify-content:space-between;font-size:13px;box-shadow:0 12px 30px rgba(0,0,0,.18);transition:transform .5s var(--ease),opacity .5s var(--ease);}
.ps-importbtn{background:var(--lead);color:#fff;padding:6px 12px;border-radius:8px;font-size:12px;font-weight:500;}

.ps-prompt{display:flex;flex-direction:column;gap:8px;padding:14px;background:var(--panel-bg);border:1px solid var(--panel-bd);border-radius:12px;}
.ps-promptlbl{display:inline-flex;align-items:center;gap:5px;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10px;letter-spacing:.1em;color:var(--eyebrow);text-transform:uppercase;}
.ps-promptbox{min-height:46px;padding:9px 11px;background:var(--pg);border:1px solid var(--line);border-radius:8px;font-size:13px;color:var(--tx);line-height:1.45;}
.ps-genbtn{align-self:flex-start;display:inline-flex;align-items:center;gap:5px;padding:7px 13px;border-radius:8px;background:var(--lead);color:#fff;font-size:11.5px;font-weight:500;border:0;cursor:pointer;}
.ps-genbtn.pulse{animation:pspulse 1.1s ease-out infinite;}
@keyframes pspulse{0%,100%{box-shadow:0 0 0 0 rgba(224,81,43,.5);}50%{box-shadow:0 0 0 10px rgba(224,81,43,0);}}
.ps-caret{display:inline-block;width:2px;height:1em;background:var(--lead);vertical-align:middle;margin-left:2px;animation:pscaret .9s steps(2) infinite;}
@keyframes pscaret{50%{opacity:0;}}

.ps-seq{display:flex;flex-direction:column;gap:7px;}
.ps-seqcard{padding:10px 13px;background:var(--panel-bg);border:1px solid var(--panel-bd);border-radius:10px;animation:psfadeup .45s var(--ease) both;}
@keyframes psfadeup{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}
.ps-seqhead{display:flex;align-items:center;gap:8px;margin-bottom:5px;}
.ps-seqday{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:9.5px;letter-spacing:.1em;color:var(--eyebrow);text-transform:uppercase;}
.ps-seqsub{font-size:12px;font-weight:600;color:var(--tx);}
.ps-seqbody{font-size:11.5px;color:var(--gbody);line-height:1.5;white-space:pre-wrap;}

.ps-flystage{position:relative;height:26px;}
.ps-envelope{position:absolute;left:10px;top:5px;color:var(--lead);transition:transform .15s linear,opacity .25s var(--ease);}
.ps-livedot{display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--live-tx);font-weight:500;margin-left:auto;}
.ps-livedot span{width:6px;height:6px;border-radius:50%;background:var(--live-tx);animation:pspulse2 1.2s ease-in-out infinite;}
@keyframes pspulse2{0%,100%{opacity:1;}50%{opacity:.4;}}
.ps-status{font-size:10.5px;padding:3px 9px;border-radius:99px;font-weight:500;transition:background .4s var(--ease),color .4s var(--ease);}
.ps-st-queued{background:var(--sch-bg);color:var(--sch-tx);}
.ps-st-sent{background:var(--snt-bg);color:var(--snt-tx);}
.ps-st-replied{background:var(--rep-bg);color:var(--rep-tx);}

.ps-analytics{display:grid;grid-template-columns:1fr 1fr;gap:8px;transition:opacity .5s var(--ease),transform .5s var(--ease);}
.ps-stat{padding:11px 13px;background:var(--schip-bg);border:1px solid var(--schip-bd);border-radius:10px;}
.ps-stat.em{background:var(--fic-bg);border-color:var(--fic-tx);}
.ps-statn{font-size:20px;font-weight:700;color:var(--hh);display:inline-flex;align-items:center;gap:6px;line-height:1;letter-spacing:-.02em;}
.ps-stat.em .ps-statn{color:var(--fic-tx);}
.ps-statl{font-size:10px;color:var(--tx3);margin-top:4px;font-family:'JetBrains Mono',ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;}

/* mobile */
.ps-section.ps-mobile{padding:60px 0 20px;}
.ps-section.ps-mobile .ps-sech{font-size:28px;margin-bottom:8px;}
.ps-mcard{margin-top:28px;border-radius:18px;border:1px solid var(--glass-bd);background:var(--glass-bg);box-shadow:var(--glass-sh);overflow:hidden;}
.ps-mstage{height:360px;padding:16px;border-bottom:1px solid var(--panel-bd);}
.ps-mtext{padding:20px;}
.ps-mnum{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;letter-spacing:.14em;color:var(--eyebrow);}
.ps-mtext h3{font-size:22px;font-weight:600;color:var(--hh);margin:10px 0 8px;letter-spacing:-.01em;}
.ps-mtext p{color:var(--tx2);font-size:14.5px;line-height:1.5;margin:0;}

@media (max-width:1023px){
  .ps-section:not(.ps-mobile){display:none;}
}
`;
