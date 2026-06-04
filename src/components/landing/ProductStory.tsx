// ============================================================
// ProductStory.tsx — Scroll-pinned 4-step product showcase
// Sits under the hero on the landing page. Desktop: sticky right
// stage morphs through 4 steps as the user scrolls. Mobile:
// stacked cards with simple reveal animations.
// ============================================================
import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, useMotionValueEvent, useReducedMotion } from "framer-motion";
import { Search, Filter, Check, Sparkles, Send, Mail, TrendingUp, Building2, Briefcase, Users } from "lucide-react";

// ---------- shared content ----------
const STEPS = [
  {
    n: "01",
    eyebrow: "Hitta exakt rätt leads",
    title: "Sök i 200M+ beslutsfattare med din ICP",
    body: "Filtrera på titel, bransch och företagsstorlek. Avslöja kontaktuppgifter med ett klick.",
    bullets: ["Titel · Bransch · Storlek · Geografi", "Verifierade mejl, inga studsar"],
  },
  {
    n: "02",
    eyebrow: "Importera till kampanj",
    title: "Välj leads, skicka in i sekvens",
    body: "Markera de leads du vill bearbeta och importera direkt till en kampanj — befintlig eller ny.",
    bullets: ["Bulk-import med dubblettkontroll", "Smart fältmappning från CSV"],
  },
  {
    n: "03",
    eyebrow: "AI skriver kampanjen",
    title: "Beskriv ditt erbjudande — få en hel sekvens",
    body: "Skriv en mening om vad du säljer och till vem. AI:n genererar 3 personliga mejl i flera steg.",
    bullets: ["Skräddarsytt per lead", "Du godkänner innan utskick"],
  },
  {
    n: "04",
    eyebrow: "Skicka & få svar",
    title: "Mejlen går ut — svaren hamnar i unibox",
    body: "Schemalagda utskick från dina inkorgar. Positiva svar identifieras automatiskt.",
    bullets: ["Spridd sändning skyddar din domän", "AI klassar svar som intresserade"],
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

// ---------- desktop step mockups ----------
function clamp01(v: number) { return Math.max(0, Math.min(1, v)); }

// ----- Step 1: ICP search -----
function Step1({ p }: { p: number }) {
  // p 0..1 within this step
  const filtersIn = clamp01(p * 4);           // 0-0.25 filters appear
  const resultsIn = clamp01((p - 0.25) * 4);  // 0.25-0.5 results appear
  const revealedCount = Math.floor(clamp01((p - 0.5) * 2) * LEADS.length);

  const filters = [
    { icon: <Briefcase size={12} />, label: "VD, CTO, COO" },
    { icon: <Building2 size={12} />, label: "IT & Tech" },
    { icon: <Users size={12} />, label: "10–200 anställda" },
  ];

  return (
    <div className="ps-screen">
      <div className="ps-toolbar">
        <Search size={14} style={{ opacity: 0.6 }} />
        <span style={{ flex: 1, fontSize: 13, color: "var(--tx3)" }}>Sök i 200M+ kontakter…</span>
        <span className="ps-pill"><Filter size={11} /> Filter</span>
      </div>
      <div className="ps-filterrow">
        {filters.map((f, i) => (
          <span
            key={i}
            className="ps-chip"
            style={{
              opacity: clamp01(filtersIn * 3 - i),
              transform: `translateY(${(1 - clamp01(filtersIn * 3 - i)) * 6}px)`,
            }}
          >
            {f.icon} {f.label}
          </span>
        ))}
      </div>
      <div className="ps-resultlbl">{resultsIn > 0.5 ? "1 248 träffar" : "Söker…"}</div>
      <div className="ps-list">
        {LEADS.map((l, i) => {
          const op = clamp01(resultsIn * 4 - i * 0.5);
          const isRevealed = i < revealedCount;
          return (
            <div key={l.initials} className="ps-leadrow" style={{ opacity: op, transform: `translateY(${(1 - op) * 8}px)` }}>
              <span className="ps-av">{l.initials}</span>
              <span className="ps-leadinfo">
                <b>{l.name}</b>
                <em>{l.role} · {l.company}</em>
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

// ----- Step 2: import to campaign -----
function Step2({ p }: { p: number }) {
  const checkedCount = Math.floor(clamp01(p * 1.8) * LEADS.length);
  const footerIn = clamp01((p - 0.5) * 2);

  return (
    <div className="ps-screen">
      <div className="ps-toolbar">
        <span style={{ fontWeight: 600, fontSize: 13 }}>Mina avslöjade leads</span>
        <span className="ps-pill" style={{ marginLeft: "auto" }}>{LEADS.length} totalt</span>
      </div>
      <div className="ps-list">
        {LEADS.map((l, i) => {
          const checked = i < checkedCount;
          return (
            <div key={l.initials} className={"ps-leadrow" + (checked ? " checked" : "")}>
              <span className={"ps-check" + (checked ? " on" : "")}>{checked && <Check size={10} strokeWidth={3} />}</span>
              <span className="ps-av">{l.initials}</span>
              <span className="ps-leadinfo">
                <b>{l.name}</b>
                <em>{l.role} · {l.company}</em>
              </span>
            </div>
          );
        })}
      </div>
      <div className="ps-importbar" style={{ transform: `translateY(${(1 - footerIn) * 100}%)`, opacity: footerIn }}>
        <span><b>{checkedCount}</b> valda</span>
        <span className="ps-importbtn">Importera till kampanj →</span>
      </div>
    </div>
  );
}

// ----- Step 3: AI writes -----
function Step3({ p }: { p: number }) {
  const promptLen = Math.floor(clamp01(p * 3) * PROMPT_TEXT.length);
  const generatePulse = p > 0.33 && p < 0.5;
  const stepsVisible = Math.floor(clamp01((p - 0.45) * 2.5) * SEQ_STEPS.length);
  const lastStepIdx = Math.max(0, stepsVisible - 1);
  const lastStepProgress = clamp01((p - 0.45) * 2.5 * SEQ_STEPS.length - lastStepIdx);

  return (
    <div className="ps-screen">
      <div className="ps-prompt">
        <span className="ps-promptlbl"><Sparkles size={12} /> Beskriv din kampanj</span>
        <div className="ps-promptbox">
          {PROMPT_TEXT.slice(0, promptLen)}
          <span className="ps-caret" />
        </div>
        <button className={"ps-genbtn" + (generatePulse ? " pulse" : "")}>
          <Sparkles size={12} /> Generera sekvens
        </button>
      </div>
      <div className="ps-seq">
        {SEQ_STEPS.map((s, i) => {
          if (i >= stepsVisible) return null;
          const isLast = i === lastStepIdx;
          const body = isLast ? s.body.slice(0, Math.floor(lastStepProgress * s.body.length)) : s.body;
          return (
            <div key={i} className="ps-seqcard">
              <div className="ps-seqhead">
                <span className="ps-seqday">{s.day}</span>
                <span className="ps-seqsub">{s.subject}</span>
              </div>
              <div className="ps-seqbody">{body}{isLast && lastStepProgress < 1 && <span className="ps-caret" />}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ----- Step 4: send & replies -----
function Step4({ p }: { p: number }) {
  const sendPhase = clamp01(p * 2);          // 0-0.5 envelopes fly
  const replyPhase = clamp01((p - 0.5) * 2); // 0.5-1 replies arrive
  const replyCount = Math.floor(replyPhase * 3);
  const ratePct = Math.round(clamp01((p - 0.7) * 3.3) * 23);

  const statusFor = (i: number) => {
    if (replyPhase > 0.3 && i === 0) return "replied";
    if (replyPhase > 0.6 && i === 2) return "replied";
    if (sendPhase > 0.3) return "sent";
    return "queued";
  };

  return (
    <div className="ps-screen">
      <div className="ps-toolbar">
        <span style={{ fontWeight: 600, fontSize: 13 }}>Kampanj · Live</span>
        <span className="ps-livedot"><span /> Skickar</span>
      </div>

      <div className="ps-flystage">
        {LEADS.map((_, i) => {
          const op = sendPhase > i * 0.15 && sendPhase < i * 0.15 + 0.5 ? 1 : 0;
          const x = (sendPhase - i * 0.15) * 220;
          return (
            <Mail
              key={i}
              size={14}
              className="ps-envelope"
              style={{
                opacity: op,
                transform: `translate(${x}px, ${-x * 0.15}px) rotate(-8deg)`,
              }}
            />
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
                <b>{l.name}</b>
                <em>{l.company}</em>
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

      <div className="ps-analytics" style={{ opacity: replyPhase > 0.4 ? 1 : 0, transform: `translateY(${replyPhase > 0.4 ? 0 : 10}px)` }}>
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

function Stage({ progress }: { progress: number }) {
  // progress 0..4 (0..1 step1, 1..2 step2, ...)
  const idx = Math.min(3, Math.floor(progress));
  const local = progress - idx;
  // crossfade in last 15% of each step
  const fadeOut = local > 0.85 ? (local - 0.85) / 0.15 : 0;
  const showNext = fadeOut > 0 && idx < 3;
  const StepComp = [Step1, Step2, Step3, Step4][idx];
  const NextComp = idx < 3 ? [Step1, Step2, Step3, Step4][idx + 1] : null;

  return (
    <div className="ps-stage">
      <div className="ps-glasshead">
        <span className="ps-dots"><span /><span /><span /></span>
        <span className="ps-gtitle">MailLead · Steg {String(idx + 1).padStart(2, "0")}</span>
      </div>
      <div className="ps-glassbody">
        <div style={{ opacity: 1 - fadeOut, position: "absolute", inset: 0, padding: 18 }}>
          <StepComp p={local} />
        </div>
        {showNext && NextComp && (
          <div style={{ opacity: fadeOut, position: "absolute", inset: 0, padding: 18 }}>
            <NextComp p={0} />
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- main ----------
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

  // 0..1 over whole section → 0..4 step progress
  const stepProgress = useTransform(scrollYProgress, [0, 1], [0, 4]);
  const [progress, setProgress] = useState(0);
  useMotionValueEvent(stepProgress, "change", (v) => setProgress(v));

  const activeStep = Math.min(3, Math.floor(progress));

  if (isMobile) {
    return (
      <section className="ps-section ps-mobile">
        <style>{CSS}</style>
        <div className="ps-wrap">
          <p className="ps-eyebrow">Så funkar MailLead</p>
          <h2 className="ps-sech">Från ICP till svar — på en eftermiddag</h2>
          {STEPS.map((s, i) => {
            const StepComp = [Step1, Step2, Step3, Step4][i];
            return (
              <div className="ps-mcard" key={i}>
                <div className="ps-mstage">
                  <StepComp p={1} />
                </div>
                <div className="ps-mtext">
                  <span className="ps-mnum">STEG {s.n}</span>
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

  return (
    <section className="ps-section" ref={sectionRef}>
      <style>{CSS}</style>
      <div className="ps-wrap">
        <div className="ps-intro">
          <p className="ps-eyebrow">Så funkar MailLead</p>
          <h2 className="ps-sech">Från ICP till svar — på en eftermiddag</h2>
          <p className="ps-secsub">Scrolla för att se hela flödet i fyra steg.</p>
        </div>

        <div className="ps-split">
          {/* Left: sticky text */}
          <div className="ps-left">
            <div className="ps-sticky">
              {STEPS.map((s, i) => {
                const isActive = activeStep === i;
                return (
                  <div key={i} className={"ps-textcard" + (isActive ? " active" : "")}>
                    <span className="ps-stepnum">STEG {s.n} · {s.eyebrow.toUpperCase()}</span>
                    <h3>{s.title}</h3>
                    <p>{s.body}</p>
                    <ul>
                      {s.bullets.map((b) => <li key={b}><Check size={13} /> {b}</li>)}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: sticky animated stage + progress rail */}
          <div className="ps-right">
            <div className="ps-stickyR">
              <div className="ps-rail">
                {STEPS.map((_, i) => (
                  <span
                    key={i}
                    className={"ps-railtick" + (activeStep >= i ? " on" : "")}
                  />
                ))}
              </div>
              <Stage progress={effectiveProgress} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// suppress unused-import warning
void motion;

// ---------- styles ----------
const CSS = `
.ps-section{position:relative;padding:80px 0 0;}
.ps-section:not(.ps-mobile){height:calc(100vh * 4.2);}
.ps-wrap{max-width:1180px;margin:0 auto;padding:0 24px;position:relative;}
.ps-intro{text-align:center;margin-bottom:48px;}
.ps-eyebrow{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--eyebrow);margin:0 0 12px;}
.ps-sech{font-size:clamp(28px,4vw,46px);font-weight:600;letter-spacing:-.02em;color:var(--hh);margin:0 0 12px;line-height:1.1;}
.ps-secsub{color:var(--tx2);font-size:16px;margin:0;}

.ps-split{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:start;}
.ps-left,.ps-right{position:relative;}
.ps-sticky,.ps-stickyR{position:sticky;top:14vh;}
.ps-stickyR{display:flex;gap:18px;align-items:flex-start;height:72vh;}

.ps-textcard{position:absolute;top:0;left:0;right:0;opacity:0;transform:translateY(16px);transition:opacity .5s var(--ease),transform .5s var(--ease);pointer-events:none;}
.ps-textcard.active{opacity:1;transform:translateY(0);pointer-events:auto;}
.ps-stepnum{display:inline-block;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;letter-spacing:.14em;color:var(--eyebrow);margin-bottom:14px;}
.ps-textcard h3{font-size:clamp(26px,3vw,38px);font-weight:600;letter-spacing:-.02em;color:var(--hh);margin:0 0 14px;line-height:1.15;}
.ps-textcard p{color:var(--tx2);font-size:17px;line-height:1.55;margin:0 0 20px;}
.ps-textcard ul{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px;}
.ps-textcard ul li{display:flex;align-items:center;gap:8px;color:var(--tx);font-size:14px;}
.ps-textcard ul li svg{color:var(--lead);flex-shrink:0;}

/* progress rail */
.ps-rail{display:flex;flex-direction:column;gap:10px;padding-top:14px;flex-shrink:0;}
.ps-railtick{width:3px;height:48px;border-radius:3px;background:var(--line);transition:background .4s var(--ease);}
.ps-railtick.on{background:var(--lead);}

/* stage */
.ps-stage{flex:1;height:100%;border-radius:18px;background:var(--glass-bg);border:1px solid var(--glass-bd);box-shadow:var(--glass-sh);display:flex;flex-direction:column;overflow:hidden;backdrop-filter:blur(10px);}
.ps-glasshead{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--panel-bd);background:var(--panel-bg);}
.ps-dots{display:flex;gap:5px;}
.ps-dots span{width:9px;height:9px;border-radius:50%;background:var(--dots);}
.ps-gtitle{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;letter-spacing:.1em;color:var(--mono);}
.ps-glassbody{flex:1;position:relative;}

/* shared screen */
.ps-screen{height:100%;display:flex;flex-direction:column;gap:10px;font-size:13px;}
.ps-toolbar{display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--panel-bg);border:1px solid var(--panel-bd);border-radius:10px;}
.ps-pill{display:inline-flex;align-items:center;gap:5px;padding:3px 8px;border-radius:99px;background:var(--badge-bg);border:1px solid var(--badge-bd);font-size:11px;color:var(--badge-tx);}
.ps-filterrow{display:flex;gap:6px;flex-wrap:wrap;}
.ps-chip{display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border-radius:99px;background:var(--fic-bg);color:var(--fic-tx);font-size:11px;font-weight:500;transition:opacity .3s var(--ease),transform .3s var(--ease);}
.ps-resultlbl{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10px;letter-spacing:.1em;color:var(--mono);text-transform:uppercase;padding:0 4px;}
.ps-list{flex:1;display:flex;flex-direction:column;gap:6px;overflow:hidden;}
.ps-leadrow{display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--panel-bg);border:1px solid var(--lead-bd);border-radius:9px;transition:background .3s var(--ease),border-color .3s var(--ease);}
.ps-leadrow.checked{border-color:var(--lead);background:rgba(224,81,43,.05);}
.ps-av{width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,var(--lead),#D9920F);color:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;flex-shrink:0;}
.ps-leadinfo{flex:1;display:flex;flex-direction:column;line-height:1.2;min-width:0;}
.ps-leadinfo b{font-size:12px;font-weight:600;color:var(--tx);}
.ps-leadinfo em{font-style:normal;font-size:10px;color:var(--tx3);}
.ps-revealbtn{font-size:10px;padding:4px 10px;border-radius:99px;background:var(--lead);color:#fff;font-weight:500;display:inline-flex;align-items:center;gap:4px;}
.ps-revealbtn.done{background:var(--rep-bg);color:var(--rep-tx);}
.ps-check{width:16px;height:16px;border-radius:4px;border:1.5px solid var(--line);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s var(--ease);}
.ps-check.on{background:var(--lead);border-color:var(--lead);color:#fff;}

.ps-importbar{position:absolute;left:18px;right:18px;bottom:18px;background:var(--hh);color:var(--pg);padding:12px 16px;border-radius:12px;display:flex;align-items:center;justify-content:space-between;font-size:13px;box-shadow:0 10px 30px rgba(0,0,0,.15);transition:transform .4s var(--ease),opacity .4s var(--ease);}
.ps-importbtn{background:var(--lead);color:#fff;padding:6px 12px;border-radius:8px;font-size:12px;font-weight:500;}

.ps-prompt{display:flex;flex-direction:column;gap:8px;padding:12px;background:var(--panel-bg);border:1px solid var(--panel-bd);border-radius:12px;}
.ps-promptlbl{display:inline-flex;align-items:center;gap:5px;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10px;letter-spacing:.1em;color:var(--eyebrow);text-transform:uppercase;}
.ps-promptbox{min-height:42px;padding:8px 10px;background:var(--pg);border:1px solid var(--line);border-radius:8px;font-size:12px;color:var(--tx);line-height:1.4;}
.ps-genbtn{align-self:flex-start;display:inline-flex;align-items:center;gap:5px;padding:6px 12px;border-radius:8px;background:var(--lead);color:#fff;font-size:11px;font-weight:500;border:0;cursor:pointer;}
.ps-genbtn.pulse{animation:pspulse 1s var(--ease) infinite;}
@keyframes pspulse{0%,100%{box-shadow:0 0 0 0 rgba(224,81,43,.5);}50%{box-shadow:0 0 0 8px rgba(224,81,43,0);}}
.ps-caret{display:inline-block;width:2px;height:11px;background:var(--lead);vertical-align:middle;margin-left:1px;animation:pscaret 1s steps(2) infinite;}
@keyframes pscaret{50%{opacity:0;}}

.ps-seq{display:flex;flex-direction:column;gap:6px;}
.ps-seqcard{padding:10px 12px;background:var(--panel-bg);border:1px solid var(--panel-bd);border-radius:9px;animation:psfadeup .4s var(--ease) both;}
@keyframes psfadeup{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}
.ps-seqhead{display:flex;align-items:center;gap:8px;margin-bottom:5px;}
.ps-seqday{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:9px;letter-spacing:.1em;color:var(--eyebrow);text-transform:uppercase;}
.ps-seqsub{font-size:12px;font-weight:600;color:var(--tx);}
.ps-seqbody{font-size:11px;color:var(--gbody);line-height:1.45;white-space:pre-wrap;}

.ps-flystage{position:relative;height:24px;}
.ps-envelope{position:absolute;left:8px;top:4px;color:var(--lead);transition:transform .8s var(--ease),opacity .4s var(--ease);}
.ps-livedot{display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--live-tx);font-weight:500;margin-left:auto;}
.ps-livedot span{width:6px;height:6px;border-radius:50%;background:var(--live-tx);animation:pspulse2 1.2s ease-in-out infinite;}
@keyframes pspulse2{0%,100%{opacity:1;}50%{opacity:.4;}}
.ps-status{font-size:10px;padding:3px 8px;border-radius:99px;font-weight:500;}
.ps-st-queued{background:var(--sch-bg);color:var(--sch-tx);}
.ps-st-sent{background:var(--snt-bg);color:var(--snt-tx);}
.ps-st-replied{background:var(--rep-bg);color:var(--rep-tx);}

.ps-analytics{display:grid;grid-template-columns:1fr 1fr;gap:8px;transition:opacity .5s var(--ease),transform .5s var(--ease);}
.ps-stat{padding:10px 12px;background:var(--schip-bg);border:1px solid var(--schip-bd);border-radius:10px;}
.ps-stat.em{background:var(--fic-bg);border-color:var(--fic-tx);}
.ps-statn{font-size:18px;font-weight:600;color:var(--hh);display:inline-flex;align-items:center;gap:5px;line-height:1;}
.ps-stat.em .ps-statn{color:var(--fic-tx);}
.ps-statl{font-size:10px;color:var(--tx3);margin-top:3px;font-family:'JetBrains Mono',ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;}

/* mobile */
.ps-section.ps-mobile{padding:60px 0 20px;}
.ps-mcard{margin-top:32px;border-radius:18px;border:1px solid var(--glass-bd);background:var(--glass-bg);box-shadow:var(--glass-sh);overflow:hidden;}
.ps-mstage{height:340px;padding:14px;border-bottom:1px solid var(--panel-bd);}
.ps-mtext{padding:18px;}
.ps-mnum{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;letter-spacing:.14em;color:var(--eyebrow);}
.ps-mtext h3{font-size:22px;font-weight:600;color:var(--hh);margin:8px 0 8px;letter-spacing:-.01em;}
.ps-mtext p{color:var(--tx2);font-size:14px;line-height:1.5;margin:0;}

@media (max-width:1023px){
  .ps-split{display:none;}
}
`;
