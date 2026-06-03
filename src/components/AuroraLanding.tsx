// ============================================================
// AuroraLanding.tsx — full "Aurora" landing page for MailLead.ai
// Theme-driven: light by default, dark under the `.dark` class that
// next-themes sets on <html> (your tailwind.config uses darkMode:"class").
// Drop in src/components/ and render it as your Landing route.
// Deps already in your project: react, lucide-react, next-themes.
// Requires the "Nordic Signal" fonts from index.css (see HANDOFF.md).
// ============================================================
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import {
  Check, ChevronDown, Sun, Moon, Upload, Sparkles,
  Send, Zap, Target, Inbox, Shield,
} from "lucide-react";
import { LANDING_FAQS } from "@/data/landingFaqs";
import { LEGAL } from "@/config/legal";

const TYPE_TEXT =
  "Hej Sara,\n\nsåg att Kavalan växer snabbt — grattis! Hur hanterar ni outbound i dag? Värt ett kort samtal nästa vecka?\n\n/ Alex";

const LEADS = [
  ["SL", "Sara Lind", "Kavalan · VD", "Svarade", "rep"],
  ["EH", "Erik Holm", "Northbeam", "Skickat", "snt"],
  ["ME", "Mona Ek", "Tellus AB", "Schemalagd", "sch"],
  ["JB", "Johan Berg", "Vellum · COO", "Skickat", "snt"],
];

const STEPS = [
  [<Upload size={24} key="u" />, "1", "Lägg till dina leads", "Klistra in eller ladda upp en CSV med företag, roll och kontext."],
  [<Sparkles size={24} key="s" />, "2", "Skapa personliga mejl", "AI:n skriver ett unikt kallt mejl + två uppföljningar per lead."],
  [<Send size={24} key="d" />, "3", "Kopiera, skicka, stäng", "Schemalägg från dina inkorgar och börja boka möten."],
];

const FEATURES = [
  [<Zap size={20} key="z" />, "Personligt på sekunder", "Unika mejl per lead baserat på företag, roll och bakgrund."],
  [<Target size={20} key="t" />, "3× fler svar", "Relevanta utskick blir öppnade, lästa och besvarade."],
  [<Inbox size={20} key="i" />, "Unibox", "Alla svar från alla inkorgar samlade på ett ställe."],
];

const FAQS: [string, string][] = LANDING_FAQS.map(({ q, a }) => [q, a]);

function useCountUp(to: number, dec = 0, run = false) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) return;
    let raf = 0; const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 1500);
      setV(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, run]);
  return dec ? v.toFixed(dec) : Math.round(v).toLocaleString("sv-SE");
}

function Mark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" fill="none" role="img" aria-label="MailLead">
      <defs>
        <linearGradient id="ml-tile-h" x1="6" y1="4" x2="66" y2="68" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2C281F" />
          <stop offset="1" stopColor="#1B1813" />
        </linearGradient>
        <linearGradient id="ml-ember-h" x1="50" y1="11" x2="60" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#F4801F" />
          <stop offset="1" stopColor="#E0512B" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="68" height="68" rx="19" fill="url(#ml-tile-h)" />
      <path d="M15 54 L15 28 L36 45 L57 28" fill="none" stroke="#F6F1E8" strokeWidth="6.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M57 54 L57 28" fill="none" stroke="#F6F1E8" strokeWidth="6.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M57 26 L57 13" stroke="url(#ml-ember-h)" strokeWidth="6.2" strokeLinecap="round" />
      <path d="M51.5 18.5 L57 12.5 L62.5 18.5" fill="none" stroke="url(#ml-ember-h)" strokeWidth="6.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function AuroraLanding() {
  const { resolvedTheme, setTheme } = useTheme();
  const { i18n } = useTranslation();
  const isSwedish = (i18n.language || "").toLowerCase().startsWith("sv");
  const growthPrice = isSwedish ? "990 kr" : "€99";
  const growthPeriod = isSwedish ? "/månad" : "/month";
  const [mounted, setMounted] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [statsRun, setStatsRun] = useState(false);
  const [typed, setTyped] = useState("");
  const glowRef = useRef<HTMLDivElement>(null);
  const glassRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const sent = useCountUp(2418, 0, statsRun);
  const open = useCountUp(61, 0, statsRun);
  const lift = useCountUp(3.2, 1, statsRun);

  useEffect(() => setMounted(true), []);

  // typing effect
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setTyped(TYPE_TEXT); return; }
    let i = 0, timer = 0;
    const step = () => { i++; setTyped(TYPE_TEXT.slice(0, i)); if (i <= TYPE_TEXT.length) timer = window.setTimeout(step, i % 12 === 0 ? 60 : 26); };
    timer = window.setTimeout(step, 600);
    return () => clearTimeout(timer);
  }, []);

  // cursor glow + glass tilt
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (glowRef.current) { glowRef.current.style.left = e.clientX + "px"; glowRef.current.style.top = e.clientY + "px"; }
      const g = glassRef.current;
      if (g) {
        const r = g.getBoundingClientRect();
        const rx = Math.max(-5, Math.min(5, -(e.clientY - (r.top + r.height / 2)) / 45));
        const ry = Math.max(-6, Math.min(6, (e.clientX - (r.left + r.width / 2)) / 55));
        g.style.transform = `perspective(1300px) rotateX(${rx}deg) rotateY(${ry}deg)`;
      }
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // reveals + stats trigger
  useEffect(() => {
    const els = rootRef.current?.querySelectorAll(".reveal") ?? [];
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.15 });
    els.forEach((el) => io.observe(el));
    let sio: IntersectionObserver | null = null;
    if (statsRef.current) {
      sio = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { setStatsRun(true); sio?.disconnect(); } }), { threshold: 0.4 });
      sio.observe(statsRef.current);
    }
    return () => { io.disconnect(); sio?.disconnect(); };
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <div id="ml-aurora" ref={rootRef}>
      <style>{CSS}</style>
      <div className="aurora"><span className="blob b1" /><span className="blob b2" /><span className="blob b3" /></div>
      <div className="grain" /><div className="veil" /><div className="cursor-glow" ref={glowRef} />

      <div className="page">
        <nav className="nav"><div className="nav-in">
          <span className="lock"><Mark /><span className="wm">Mail<span className="l">Lead</span><span className="t">.ai</span></span></span>
          <div className="nav-links"><a href="#">Funktioner</a><a href="#">Priser</a><a href="#">Kunder</a></div>
          <div className="nav-r">
            <button className="theme-btn" aria-label="Byt tema" onClick={() => setTheme(isDark ? "light" : "dark")}>
              {mounted ? (isDark ? <Sun size={18} /> : <Moon size={18} />) : null}
            </button>
            <button className="btn btn-ghost">Logga in</button>
            <button className="btn btn-glass">Prova gratis</button>
          </div>
        </div></nav>

        {/* HERO */}
        <section className="hero"><div className="wrap">
          <span className="badge"><span className="ping" /> Ansluten till 3 inkorgar · skickar nu</span>
          <h1 className="hh">Outbound som känns <span className="em">skriven för hand</span></h1>
          <p className="hsub">MailLead.ai genererar personliga kalla mejl och uppföljningar för varje lead — och samlar svaren i en inkorg.</p>
          <div className="hcta">
            <button className="btn btn-pri btn-lg magnet">Skapa ditt första mejl – gratis</button>
            <button className="btn btn-glass btn-lg">Boka demo</button>
          </div>
          <p className="hnote">Inget kreditkort krävs · Gratis upp till 10 leads</p>

          <div className="stage reveal"><div className="glass" ref={glassRef}>
            <div className="g-head">
              <span className="g-dots"><span /><span /><span /></span>
              <span className="g-title">MailLead · Kampanj</span>
              <span className="g-live"><span className="livedot" /> Live</span>
            </div>
            <div className="g-grid">
              <div className="g-panel">
                <div className="g-lbl">▣ Leads &amp; status</div>
                {LEADS.map((l) => (
                  <div className="g-lead" key={l[0]}>
                    <span className="av">{l[0]}</span>
                    <span className="g-who"><b>{l[1]}</b><em>{l[2]}</em></span>
                    <span className={`st st-${l[4]}`}>{l[3]}</span>
                  </div>
                ))}
              </div>
              <div className="g-panel">
                <div className="g-lbl">✶ AI skriver · Dag 1</div>
                <p className="g-sub">Snabb fråga om Kavalans pipeline</p>
                <p className="g-body">{typed}<span className="caret" /></p>
              </div>
            </div>
          </div></div>

          <div className="stats" ref={statsRef}>
            <div className="schip"><div className="n">{sent}</div><div className="c">Mejl skickade</div></div>
            <div className="schip"><div className="n">{open}%</div><div className="c">Öppningsgrad</div></div>
            <div className="schip em"><div className="n">{lift}×</div><div className="c">Fler svar</div></div>
          </div>
        </div></section>

        {/* HOW IT WORKS */}
        <section className="section"><div className="wrap">
          <p className="eyebrow reveal">Så funkar det</p>
          <h2 className="sec-h reveal">Från leadlista till bokat möte i 3 steg</h2>
          <p className="sec-sub reveal">Ingen krånglig setup. Ingen inlärningskurva. Bara resultat.</p>
          <div className="steps">
            {STEPS.map((s) => (
              <div className="step reveal" key={s[1] as string}>
                <div className="step-ic">{s[0]}</div><div className="step-n">{s[1]}</div>
                <h3>{s[2]}</h3><p>{s[3]}</p>
              </div>
            ))}
          </div>
        </div></section>

        {/* FEATURES */}
        <section className="section"><div className="wrap">
          <p className="eyebrow reveal">Funktioner</p>
          <h2 className="sec-h reveal">Hela outbound-flödet på ett ställe</h2>
          <p className="sec-sub reveal">Från leadimport till svar — utan att lämna MailLead.</p>
          <div className="fgrid">
            {FEATURES.map((f) => (
              <div className="fcard reveal" key={f[1] as string}>
                <div className="fic">{f[0]}</div><h3>{f[1]}</h3><p>{f[2]}</p>
              </div>
            ))}
          </div>
        </div></section>

        {/* QUOTE */}
        <section className="section"><div className="quoteband reveal">
          <p className="q">"Vårt team bokade 40 % fler möten första månaden. Personifieringen är så bra att prospekten tror att vi lagt timmar på varje mejl."</p>
          <p className="who"><b>Marcus Rivera</b> · Grundare, CloseFast</p>
        </div></section>

        {/* PRICING */}
        <section className="section"><div className="wrap">
          <p className="eyebrow reveal">Priser</p>
          <h2 className="sec-h reveal">Enkel och transparent prissättning</h2>
          <p className="sec-sub reveal">Börja gratis. Uppgradera när du är redo att skala.</p>
          <div className="pgrid">
            <div className="pcard reveal">
              <h3 className="pname">Starter</h3>
              <p className="pdesc">Prova gratis – inget kreditkort krävs</p>
              <div className="pamt"><span className="pbig">Gratis</span></div>
              <ul className="pfeats">
                {["1 kampanj", "10 leads per kampanj", "10 utskick / månad", "AI-mejlgenerering", "Kompletta sekvenser"].map((f) => (
                  <li key={f}><Check size={16} strokeWidth={2.5} /> {f}</li>
                ))}
              </ul>
              <button className="btn btn-glass">Kom igång – det är gratis</button>
            </div>
            <div className="pcard pop reveal">
              <span className="pbadge">Populärast</span>
              <h3 className="pname">Growth</h3>
              <p className="pdesc">För team som menar allvar med pipeline</p>
              <div className="pamt"><span className="pbig">{growthPrice}</span><span className="pper">{growthPeriod}</span></div>
              <ul className="pfeats">
                {["Obegränsade kampanjer", "Obegränsade leads", "Obegränsade genereringar", "Prioriterad support", "Teamsamarbete"].map((f) => (
                  <li key={f}><Check size={16} strokeWidth={2.5} /> {f}</li>
                ))}
              </ul>
              <button className="btn btn-pri">Lås upp obegränsade utskick</button>
            </div>
          </div>
          <div className="guarantee reveal"><Shield size={15} /> 30 dagars pengarna-tillbaka-garanti · Inga frågor</div>
        </div></section>

        {/* FAQ */}
        <section className="section"><div className="wrap">
          <p className="eyebrow reveal">Vanliga frågor</p>
          <h2 className="sec-h reveal">Allt du undrar — kort och gott</h2>
          <div className="faq">
            {FAQS.map(([q, a], i) => (
              <div className={"faq-item reveal" + (openFaq === i ? " open" : "")} key={q}>
                <button className="faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>{q}<ChevronDown size={18} /></button>
                <div className="faq-a"><p>{a}</p></div>
              </div>
            ))}
          </div>
        </div></section>

        {/* CTA */}
        <section className="cta">
          <h2>Redo att fylla pipelinen?</h2>
          <p>Gå med i hundratals team som bokar fler möten med MailLead.ai.</p>
          <button className="btn btn-pri btn-lg magnet">Prova gratis – inget kreditkort</button>
        </section>

        {/* FOOTER */}
        <footer className="footer"><div className="footer-in">
          <span className="lock"><Mark size={32} /><span className="wm" style={{ fontSize: 18 }}>Mail<span className="l">Lead</span><span className="t">.ai</span></span></span>
          <div className="footer-links"><a href="#">Integritet</a><a href="#">Villkor</a><a href="#">Cookies</a></div>
          <p className="footer-copy">© 2026 MailLead.ai · CRMdata i Sverige AB</p>
        </div></footer>
      </div>
    </div>
  );
}

const CSS = `
#ml-aurora{
  --pg:#FBF7F0;--tx:#221F1A;--tx2:#6B655C;--tx3:#756E62;
  --blob1:#F7C8B2;--blob2:#C4E3D2;--blob3:#F8E6B6;--blob-blend:multiply;--aurora-op:.5;
  --grain-op:.035;--glow:rgba(255,255,255,.55);--glow-blend:soft-light;
  --veil:radial-gradient(120% 75% at 50% 0%,rgba(255,255,255,.5),transparent 55%);
  --nav-bg:rgba(251,247,240,.72);--line:#E7DFD2;--lead:#E0512B;--tld:#756E62;--navlink:#756E62;--navlink-h:#221F1A;
  --badge-bg:rgba(255,255,255,.8);--badge-bd:#F9DCCF;--badge-tx:#4A453D;--ping:#1F6B53;
  --hh:#221F1A;--em-g:linear-gradient(100deg,#E0512B,#D9920F);
  --glass-bg:rgba(255,255,255,.92);--glass-bd:rgba(255,255,255,.95);--glass-sh:0 30px 70px rgba(80,55,30,.16),inset 0 1px 0 rgba(255,255,255,.7);
  --panel-bg:rgba(251,248,243,.7);--panel-bd:#E7DFD2;--dots:#D8CEBC;--mono:#756E62;
  --live-tx:#1F6B53;--live-bg:#E7F1EB;--lead-bd:#E7DFD2;
  --rep-bg:#E7F1EB;--rep-tx:#185742;--snt-bg:#ECEEF1;--snt-tx:#45505F;--sch-bg:#FBF1D9;--sch-tx:#BB8210;
  --gbody:#4A453D;--schip-bg:rgba(255,255,255,.8);--schip-bd:#E7DFD2;
  --fcard-bg:#FFFFFF;--fcard-bd:#E7DFD2;--fcard-bdh:rgba(224,81,43,.3);--fcard-sh:0 1px 2px rgba(60,45,30,.05),0 2px 6px rgba(60,45,30,.05);
  --fic-bg:#FCEEE8;--fic-tx:#E0512B;
  --bg-glass:rgba(255,255,255,.65);--bg-glass-bd:#D8CEBC;--bg-glass-tx:#221F1A;--bg-glass-h:rgba(255,255,255,.9);
  --eyebrow:#E0512B;--pri-sh:0 8px 26px rgba(224,81,43,.28);--pri-h:#C53F1D;
  --ease:cubic-bezier(.22,.61,.36,1);--ease-out:cubic-bezier(.16,1,.3,1);
  position:relative;min-height:100vh;overflow:hidden;background:var(--pg);color:var(--tx);
  font-family:'Schibsted Grotesk',system-ui,sans-serif;transition:background .4s var(--ease),color .4s var(--ease);
}
.dark #ml-aurora{
  --pg:#141109;--tx:#F6F1E8;--tx2:#C4BCAD;--tx3:#9C9484;
  --blob1:#E0512B;--blob2:#1F8E66;--blob3:#E0A019;--blob-blend:screen;--aurora-op:.85;
  --grain-op:.05;--glow:rgba(224,81,43,.16);--glow-blend:normal;
  --veil:radial-gradient(120% 80% at 50% 0%,transparent 40%,rgba(15,12,7,.55) 100%);
  --nav-bg:rgba(20,17,9,.55);--line:rgba(246,241,232,.08);--lead:#F47C54;--tld:#B6AE9F;--navlink:#B6AE9F;--navlink-h:#F6F1E8;
  --badge-bg:rgba(246,241,232,.06);--badge-bd:rgba(246,241,232,.13);--badge-tx:#D8D1C4;--ping:#4FAE89;
  --hh:#FBF7F0;--em-g:linear-gradient(100deg,#F47C54,#E0A019);
  --glass-bg:linear-gradient(160deg,#2A2418,#1B1710);--glass-bd:rgba(246,241,232,.14);--glass-sh:0 40px 90px rgba(0,0,0,.5),inset 0 1px 0 rgba(246,241,232,.07);
  --panel-bg:rgba(15,12,7,.5);--panel-bd:rgba(246,241,232,.09);--dots:rgba(246,241,232,.18);--mono:#9C9484;
  --live-tx:#4FAE89;--live-bg:rgba(79,174,137,.14);--lead-bd:rgba(246,241,232,.06);
  --rep-bg:rgba(79,174,137,.16);--rep-tx:#6FC9A3;--snt-bg:rgba(138,151,168,.16);--snt-tx:#A9B4C2;--sch-bg:rgba(236,178,63,.16);--sch-tx:#ECC06A;
  --gbody:#C4BCAD;--schip-bg:rgba(246,241,232,.05);--schip-bd:rgba(246,241,232,.11);
  --fcard-bg:rgba(246,241,232,.04);--fcard-bd:rgba(246,241,232,.10);--fcard-bdh:rgba(244,124,84,.4);--fcard-sh:none;
  --fic-bg:rgba(224,81,43,.16);--fic-tx:#F47C54;
  --bg-glass:rgba(246,241,232,.07);--bg-glass-bd:rgba(246,241,232,.16);--bg-glass-tx:#F6F1E8;--bg-glass-h:rgba(246,241,232,.12);
  --eyebrow:#F47C54;--pri-sh:0 8px 30px rgba(224,81,43,.4);--pri-h:#E76A45;
}
#ml-aurora *{box-sizing:border-box;}
#ml-aurora a{text-decoration:none;color:inherit;} #ml-aurora svg{display:block;}
#ml-aurora .wrap{max-width:1160px;margin:0 auto;padding:0 32px;}
#ml-aurora .aurora{position:absolute;inset:-20% -10%;z-index:0;filter:blur(72px);pointer-events:none;opacity:var(--aurora-op);}
#ml-aurora .blob{position:absolute;border-radius:50%;mix-blend-mode:var(--blob-blend);}
#ml-aurora .b1{width:640px;height:640px;background:radial-gradient(circle,var(--blob1),transparent 62%);left:-5%;top:-14%;animation:mlD1 19s ease-in-out infinite;}
#ml-aurora .b2{width:560px;height:560px;background:radial-gradient(circle,var(--blob2),transparent 62%);right:-7%;top:0;animation:mlD2 23s ease-in-out infinite;}
#ml-aurora .b3{width:540px;height:540px;background:radial-gradient(circle,var(--blob3),transparent 64%);left:34%;top:30%;animation:mlD3 27s ease-in-out infinite;}
@keyframes mlD1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(120px,80px) scale(1.15)}}
@keyframes mlD2{0%,100%{transform:translate(0,0) scale(1.05)}50%{transform:translate(-100px,120px) scale(.92)}}
@keyframes mlD3{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(60px,-90px) scale(1.1)}}
#ml-aurora .grain{position:absolute;inset:0;z-index:1;pointer-events:none;opacity:var(--grain-op);background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");}
#ml-aurora .veil{position:absolute;inset:0;z-index:1;pointer-events:none;background:var(--veil);}
#ml-aurora .cursor-glow{position:fixed;width:520px;height:520px;border-radius:50%;z-index:2;pointer-events:none;left:0;top:0;transform:translate(-50%,-50%);background:radial-gradient(circle,var(--glow),transparent 60%);mix-blend-mode:var(--glow-blend);}
#ml-aurora .page{position:relative;z-index:3;}
#ml-aurora .nav{position:sticky;top:0;z-index:40;backdrop-filter:blur(14px);background:var(--nav-bg);border-bottom:1px solid var(--line);}
#ml-aurora .nav-in{max-width:1160px;margin:0 auto;height:74px;padding:0 32px;display:flex;align-items:center;gap:30px;}
#ml-aurora .lock{display:inline-flex;align-items:center;gap:11px;}
#ml-aurora .wm{font-weight:800;font-size:22px;letter-spacing:-.03em;color:var(--tx);}
#ml-aurora .wm .l{color:var(--lead);}#ml-aurora .wm .t{font-weight:500;color:var(--tld);}
#ml-aurora .nav-links{display:flex;gap:26px;margin-left:6px;}
#ml-aurora .nav-links a{font-size:15px;color:var(--navlink);}#ml-aurora .nav-links a:hover{color:var(--navlink-h);}
#ml-aurora .nav-r{margin-left:auto;display:flex;align-items:center;gap:12px;}
#ml-aurora .theme-btn{width:38px;height:38px;border-radius:999px;border:1px solid var(--bg-glass-bd);background:var(--bg-glass);color:var(--tx);display:inline-flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s var(--ease);}
#ml-aurora .theme-btn:hover{background:var(--bg-glass-h);}
#ml-aurora .btn{font-family:inherit;font-weight:600;font-size:15px;letter-spacing:-.01em;border-radius:10px;padding:11px 19px;border:1px solid transparent;cursor:pointer;display:inline-flex;align-items:center;gap:8px;transition:all .2s var(--ease);white-space:nowrap;}
#ml-aurora .btn-lg{font-size:16px;padding:15px 26px;}
#ml-aurora .btn-pri{background:#E0512B;color:#fff;box-shadow:var(--pri-sh);}
#ml-aurora .btn-pri:hover{background:var(--pri-h);}
#ml-aurora .btn-ghost{background:transparent;color:var(--tx2);}#ml-aurora .btn-ghost:hover{color:var(--tx);}
#ml-aurora .btn-glass{background:var(--bg-glass);color:var(--bg-glass-tx);border-color:var(--bg-glass-bd);backdrop-filter:blur(8px);}
#ml-aurora .btn-glass:hover{background:var(--bg-glass-h);}
#ml-aurora .hero{padding:84px 0 60px;text-align:center;}
#ml-aurora .badge{display:inline-flex;align-items:center;gap:9px;font-size:14px;color:var(--badge-tx);background:var(--badge-bg);border:1px solid var(--badge-bd);border-radius:999px;padding:7px 16px;backdrop-filter:blur(8px);}
#ml-aurora .badge .ping{width:7px;height:7px;border-radius:50%;background:var(--ping);position:relative;}
#ml-aurora .badge .ping::after{content:"";position:absolute;inset:0;border-radius:50%;background:var(--ping);animation:mlPing 1.8s var(--ease) infinite;}
@keyframes mlPing{0%{transform:scale(1);opacity:.7}80%,100%{transform:scale(3.4);opacity:0}}
#ml-aurora .hh{font-weight:800;font-size:clamp(3rem,6.4vw,5.2rem);line-height:1;letter-spacing:-.035em;margin:26px auto 0;max-width:15ch;text-wrap:balance;color:var(--hh);}
#ml-aurora .hh .em{background:var(--em-g);-webkit-background-clip:text;background-clip:text;color:transparent;}
#ml-aurora .hsub{font-size:20px;line-height:1.5;color:var(--tx2);max-width:40ch;margin:22px auto 0;}
#ml-aurora .hcta{display:flex;gap:13px;justify-content:center;margin-top:32px;flex-wrap:wrap;}
#ml-aurora .magnet{will-change:transform;} #ml-aurora .hnote{font-size:13px;color:var(--tx3);margin-top:15px;}
#ml-aurora .stage{margin:60px auto 0;max-width:900px;}
#ml-aurora .glass{position:relative;z-index:5;background:var(--glass-bg);border:1px solid var(--glass-bd);border-radius:22px;padding:22px;box-shadow:var(--glass-sh);transition:transform .15s var(--ease-out),background .4s var(--ease);}
#ml-aurora .g-head{display:flex;align-items:center;gap:10px;padding:2px 4px 16px;}
#ml-aurora .g-dots{display:flex;gap:6px;}#ml-aurora .g-dots span{width:11px;height:11px;border-radius:50%;background:var(--dots);}
#ml-aurora .g-title{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--mono);}
#ml-aurora .g-live{margin-left:auto;display:inline-flex;align-items:center;gap:6px;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600;color:var(--live-tx);background:var(--live-bg);padding:4px 10px;border-radius:999px;}
#ml-aurora .livedot{width:6px;height:6px;border-radius:50%;background:var(--live-tx);}
#ml-aurora .g-grid{display:grid;grid-template-columns:1.1fr 1fr;gap:14px;}
#ml-aurora .g-panel{background:var(--panel-bg);border:1px solid var(--panel-bd);border-radius:14px;padding:16px;text-align:left;}
#ml-aurora .g-lbl{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--mono);margin-bottom:10px;}
#ml-aurora .g-lead{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--lead-bd);}
#ml-aurora .g-lead:last-child{border-bottom:0;}
#ml-aurora .av{width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#E0512B,#E0A019);color:#fff;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;}
#ml-aurora .g-who b{font-size:13px;font-weight:600;color:var(--tx);display:block;line-height:1.2;}
#ml-aurora .g-who em{font-style:normal;font-size:11px;color:var(--mono);}
#ml-aurora .st{margin-left:auto;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:600;padding:3px 8px;border-radius:999px;}
#ml-aurora .st-rep{background:var(--rep-bg);color:var(--rep-tx);}#ml-aurora .st-snt{background:var(--snt-bg);color:var(--snt-tx);}#ml-aurora .st-sch{background:var(--sch-bg);color:var(--sch-tx);}
#ml-aurora .g-sub{font-size:14px;font-weight:600;color:var(--tx);margin:0 0 8px;}
#ml-aurora .g-body{font-family:'JetBrains Mono',monospace;font-size:12px;line-height:1.65;color:var(--gbody);margin:0;white-space:pre-wrap;}
#ml-aurora .caret::after{content:"▌";color:#E0512B;animation:mlBlink 1s step-end infinite;}
@keyframes mlBlink{50%{opacity:0}}
#ml-aurora .stats{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin:34px auto 0;}
#ml-aurora .schip{background:var(--schip-bg);border:1px solid var(--schip-bd);border-radius:14px;padding:16px 26px;text-align:center;backdrop-filter:blur(8px);min-width:150px;}
#ml-aurora .schip .n{font-weight:800;font-size:34px;letter-spacing:-.02em;color:var(--hh);}
#ml-aurora .schip.em .n{color:#E0512B;}#ml-aurora .schip .c{font-size:12px;color:var(--tx3);margin-top:2px;}
#ml-aurora .section{padding:96px 0;position:relative;z-index:3;}
#ml-aurora .reveal{opacity:0;transform:translateY(24px);transition:opacity .7s var(--ease-out),transform .7s var(--ease-out);}
#ml-aurora .reveal.in{opacity:1;transform:none;}
#ml-aurora .eyebrow{font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--eyebrow);text-align:center;margin:0 0 14px;}
#ml-aurora .sec-h{font-weight:800;font-size:clamp(2rem,3.6vw,2.7rem);letter-spacing:-.02em;text-align:center;margin:0 auto;max-width:18ch;color:var(--hh);text-wrap:balance;}
#ml-aurora .sec-sub{text-align:center;color:var(--tx3);font-size:18px;margin:14px auto 0;max-width:46ch;}
#ml-aurora .steps{display:grid;grid-template-columns:repeat(3,1fr);gap:30px;max-width:900px;margin:54px auto 0;}
#ml-aurora .step{text-align:center;display:flex;flex-direction:column;align-items:center;gap:12px;}
#ml-aurora .step-ic{width:58px;height:58px;border-radius:16px;background:var(--fic-bg);color:var(--fic-tx);display:flex;align-items:center;justify-content:center;}
#ml-aurora .step-n{width:24px;height:24px;border-radius:50%;background:#E0512B;color:#fff;font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;}
#ml-aurora .step h3{font-size:17px;margin:2px 0 0;color:var(--tx);}#ml-aurora .step p{font-size:14px;color:var(--tx3);margin:0;line-height:1.55;max-width:26ch;}
#ml-aurora .fgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:54px;}
#ml-aurora .fcard{background:var(--fcard-bg);border:1px solid var(--fcard-bd);border-radius:16px;padding:26px;box-shadow:var(--fcard-sh);transition:all .25s var(--ease);}
#ml-aurora .fcard:hover{transform:translateY(-4px);border-color:var(--fcard-bdh);}
#ml-aurora .fic{width:44px;height:44px;border-radius:12px;background:var(--fic-bg);color:var(--fic-tx);display:flex;align-items:center;justify-content:center;margin-bottom:16px;}
#ml-aurora .fcard h3{font-size:17px;margin:0 0 7px;color:var(--tx);}#ml-aurora .fcard p{font-size:14px;color:var(--tx3);margin:0;line-height:1.55;}
#ml-aurora .quoteband{max-width:860px;margin:0 auto;text-align:center;padding:0 32px;}
#ml-aurora .quoteband .q{font-family:'Newsreader',Georgia,serif;font-style:italic;font-size:clamp(1.55rem,2.9vw,2.25rem);line-height:1.34;letter-spacing:-.01em;color:var(--hh);text-wrap:balance;margin:0;}
#ml-aurora .quoteband .who{margin-top:22px;font-family:'JetBrains Mono',monospace;font-size:13px;color:var(--tx3);}#ml-aurora .quoteband .who b{color:var(--lead);font-weight:600;}
#ml-aurora .pgrid{display:grid;grid-template-columns:repeat(2,1fr);gap:20px;max-width:760px;margin:54px auto 0;}
#ml-aurora .pcard{position:relative;background:var(--fcard-bg);border:1px solid var(--fcard-bd);border-radius:18px;padding:30px;box-shadow:var(--fcard-sh);}
#ml-aurora .pcard.pop{border-color:#E0512B;}
#ml-aurora .pbadge{position:absolute;top:-13px;left:30px;background:#E0512B;color:#fff;font-size:12px;font-weight:600;padding:4px 13px;border-radius:999px;}
#ml-aurora .pname{font-size:19px;font-weight:700;color:var(--tx);margin:0;}#ml-aurora .pdesc{font-size:14px;color:var(--tx3);margin:6px 0 20px;}
#ml-aurora .pamt{display:flex;align-items:baseline;gap:4px;margin-bottom:22px;}
#ml-aurora .pbig{font-weight:800;font-size:44px;letter-spacing:-.03em;color:var(--hh);}#ml-aurora .pper{color:var(--tx3);font-size:15px;}
#ml-aurora .pfeats{list-style:none;padding:0;margin:0 0 24px;display:flex;flex-direction:column;gap:11px;}
#ml-aurora .pfeats li{display:flex;align-items:center;gap:10px;font-size:14px;color:var(--tx2);}#ml-aurora .pfeats svg{color:var(--lead);flex-shrink:0;}
#ml-aurora .pcard .btn{width:100%;justify-content:center;}
#ml-aurora .guarantee{display:flex;align-items:center;justify-content:center;gap:8px;font-size:13.5px;color:var(--tx3);margin-top:24px;}
#ml-aurora .faq{max-width:720px;margin:54px auto 0;display:flex;flex-direction:column;gap:10px;}
#ml-aurora .faq-item{background:var(--fcard-bg);border:1px solid var(--fcard-bd);border-radius:12px;overflow:hidden;}
#ml-aurora .faq-q{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;text-align:left;background:transparent;border:0;cursor:pointer;padding:17px 20px;font-family:inherit;font-size:15px;font-weight:600;color:var(--tx);}
#ml-aurora .faq-q svg{color:var(--tx3);transition:transform .25s var(--ease);flex-shrink:0;}
#ml-aurora .faq-item.open .faq-q svg{transform:rotate(180deg);}
#ml-aurora .faq-a{max-height:0;overflow:hidden;transition:max-height .3s var(--ease);}
#ml-aurora .faq-item.open .faq-a{max-height:220px;}
#ml-aurora .faq-a p{margin:0;padding:0 20px 18px;font-size:14px;line-height:1.6;color:var(--tx3);}
#ml-aurora .cta{text-align:center;padding:60px 32px 110px;position:relative;z-index:3;}
#ml-aurora .cta h2{font-weight:800;font-size:clamp(2.1rem,3.8vw,2.9rem);color:var(--hh);margin:0 0 14px;letter-spacing:-.025em;}
#ml-aurora .cta p{color:var(--tx3);font-size:18px;margin:0 auto 28px;max-width:42ch;}
#ml-aurora .footer{border-top:1px solid var(--line);margin-top:30px;position:relative;z-index:3;}
#ml-aurora .footer-in{max-width:1160px;margin:0 auto;padding:32px;display:flex;align-items:center;gap:24px;flex-wrap:wrap;}
#ml-aurora .footer-links{display:flex;gap:22px;}#ml-aurora .footer-links a{font-size:14px;color:var(--tx3);}#ml-aurora .footer-links a:hover{color:var(--tx);}
#ml-aurora .footer-copy{margin-left:auto;font-size:13px;color:var(--tx3);}
@media(max-width:820px){#ml-aurora .fgrid,#ml-aurora .steps,#ml-aurora .pgrid{grid-template-columns:1fr;}#ml-aurora .nav-links{display:none;}#ml-aurora .g-grid{grid-template-columns:1fr;}#ml-aurora .cursor-glow{display:none;}}
@media(prefers-reduced-motion:reduce){#ml-aurora .blob,#ml-aurora .badge .ping::after,#ml-aurora .caret::after{animation:none;}}
`;

