// ============================================================
// AuroraHero.tsx — "Aurora" landing hero for MailLead.ai
// Drop into src/components/ and render at the top of src/pages/Landing.tsx.
// Stack: React + TS + lucide-react (already in your deps). Tailwind optional —
// the custom visuals (aurora, glass, cursor glow) are scoped CSS below.
// ============================================================
import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";

const TYPE_TEXT =
  "Hej Sara,\n\nsåg att Kavalan växer snabbt — grattis! Hur hanterar ni outbound i dag? Värt ett kort samtal nästa vecka?\n\n/ Alex";

const LEADS = [
  { initials: "SL", name: "Sara Lind", meta: "Kavalan · VD", tag: "Svarade", cls: "rep" },
  { initials: "EH", name: "Erik Holm", meta: "Northbeam", tag: "Skickat", cls: "snt" },
  { initials: "ME", name: "Mona Ek", meta: "Tellus AB", tag: "Schemalagd", cls: "sch" },
  { initials: "JB", name: "Johan Berg", meta: "Vellum · COO", tag: "Skickat", cls: "snt" },
];

function useCountUp(to: number, dec = 0, start = true) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!start) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 1500);
      setV(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, start]);
  return dec ? v.toFixed(dec) : Math.round(v).toLocaleString("sv-SE");
}

export default function AuroraHero() {
  const glowRef = useRef<HTMLDivElement>(null);
  const glassRef = useRef<HTMLDivElement>(null);
  const [typed, setTyped] = useState("");

  const sent = useCountUp(2418);
  const open = useCountUp(61);
  const lift = useCountUp(3.2, 1);

  // typing effect
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTyped(TYPE_TEXT);
      return;
    }
    let i = 0;
    let timer: number;
    const step = () => {
      i++;
      setTyped(TYPE_TEXT.slice(0, i));
      if (i <= TYPE_TEXT.length) timer = window.setTimeout(step, i % 12 === 0 ? 60 : 26);
    };
    timer = window.setTimeout(step, 500);
    return () => clearTimeout(timer);
  }, []);

  // cursor glow + glass tilt
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (glowRef.current) {
        glowRef.current.style.left = e.clientX + "px";
        glowRef.current.style.top = e.clientY + "px";
      }
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

  return (
    <div id="ml-aurora">
      <style>{CSS}</style>
      <div className="aurora"><span className="blob b1" /><span className="blob b2" /><span className="blob b3" /></div>
      <div className="grain" />
      <div className="veil" />
      <div className="cursor-glow" ref={glowRef} />

      <section className="hero">
        <div className="hero-wrap">
          <span className="badge"><span className="ping" /> Ansluten till 3 inkorgar · skickar nu</span>
          <h1 className="hh">Outbound som känns <span className="em">skriven för hand</span></h1>
          <p className="hsub">MailLead.ai genererar personliga kalla mejl och uppföljningar för varje lead — och samlar svaren i en inkorg.</p>
          <div className="hcta">
            <a className="btn btn-pri" href="/signup">Skapa ditt första mejl – gratis <ArrowRight size={18} /></a>
            <a className="btn btn-glass" href="/pricing">Boka demo</a>
          </div>
          <p className="hnote">Inget kreditkort krävs · Gratis upp till 10 leads</p>

          <div className="stage">
            <div className="glass" ref={glassRef}>
              <div className="g-head">
                <span className="g-dots"><span /><span /><span /></span>
                <span className="g-title">MailLead · Kampanj</span>
                <span className="g-live"><span className="livedot" /> Live</span>
              </div>
              <div className="g-grid">
                <div className="g-panel">
                  <div className="g-lbl">Leads &amp; status</div>
                  {LEADS.map((l) => (
                    <div className="g-lead" key={l.initials}>
                      <span className="av">{l.initials}</span>
                      <span className="g-who"><b>{l.name}</b><em>{l.meta}</em></span>
                      <span className={`st st-${l.cls}`}>{l.tag}</span>
                    </div>
                  ))}
                </div>
                <div className="g-panel">
                  <div className="g-lbl">AI skriver · Dag 1</div>
                  <p className="g-sub">Snabb fråga om Kavalans pipeline</p>
                  <p className="g-body">{typed}<span className="caret" /></p>
                </div>
              </div>
            </div>
          </div>

          <div className="stats">
            <div className="schip"><div className="n">{sent}</div><div className="c">Mejl skickade</div></div>
            <div className="schip"><div className="n">{open}%</div><div className="c">Öppningsgrad</div></div>
            <div className="schip em"><div className="n">{lift}×</div><div className="c">Fler svar</div></div>
          </div>
        </div>
      </section>
    </div>
  );
}

const CSS = `
#ml-aurora{position:relative;background:#141109;color:#F6F1E8;overflow:hidden;font-family:'Schibsted Grotesk',system-ui,sans-serif;}
#ml-aurora .aurora{position:absolute;inset:-20% -10%;z-index:0;filter:blur(70px);opacity:.85;pointer-events:none;}
#ml-aurora .blob{position:absolute;border-radius:50%;mix-blend-mode:screen;}
#ml-aurora .b1{width:620px;height:620px;background:radial-gradient(circle,#E0512B,transparent 60%);left:-4%;top:-12%;animation:mlA1 19s ease-in-out infinite;}
#ml-aurora .b2{width:560px;height:560px;background:radial-gradient(circle,#1F8E66,transparent 60%);right:-6%;top:2%;animation:mlA2 23s ease-in-out infinite;}
#ml-aurora .b3{width:520px;height:520px;background:radial-gradient(circle,#E0A019,transparent 62%);left:32%;top:34%;animation:mlA3 27s ease-in-out infinite;}
@keyframes mlA1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(120px,80px) scale(1.15)}}
@keyframes mlA2{0%,100%{transform:translate(0,0) scale(1.05)}50%{transform:translate(-100px,120px) scale(.92)}}
@keyframes mlA3{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(60px,-90px) scale(1.1)}}
#ml-aurora .grain{position:absolute;inset:0;z-index:1;pointer-events:none;opacity:.05;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");}
#ml-aurora .veil{position:absolute;inset:0;z-index:1;pointer-events:none;background:radial-gradient(120% 80% at 50% 0%,transparent 40%,rgba(15,12,7,.55) 100%);}
#ml-aurora .cursor-glow{position:fixed;width:480px;height:480px;border-radius:50%;z-index:2;pointer-events:none;transform:translate(-50%,-50%);background:radial-gradient(circle,rgba(224,81,43,.16),transparent 60%);}
#ml-aurora .hero{position:relative;z-index:3;padding:88px 24px 80px;}
#ml-aurora .hero-wrap{max-width:960px;margin:0 auto;text-align:center;}
#ml-aurora .badge{display:inline-flex;align-items:center;gap:9px;font-size:14px;color:#D8D1C4;background:rgba(246,241,232,.06);border:1px solid rgba(246,241,232,.13);border-radius:999px;padding:7px 16px;}
#ml-aurora .ping{width:7px;height:7px;border-radius:50%;background:#4FAE89;position:relative;}
#ml-aurora .ping::after{content:"";position:absolute;inset:0;border-radius:50%;background:#4FAE89;animation:mlPing 1.8s ease infinite;}
@keyframes mlPing{0%{transform:scale(1);opacity:.7}80%,100%{transform:scale(3.4);opacity:0}}
#ml-aurora .hh{font-weight:800;font-size:clamp(3rem,6.4vw,5.2rem);line-height:1;letter-spacing:-.035em;margin:26px auto 0;max-width:15ch;color:#FBF7F0;}
#ml-aurora .hh .em{background:linear-gradient(100deg,#F47C54,#E0A019);-webkit-background-clip:text;background-clip:text;color:transparent;}
#ml-aurora .hsub{font-size:20px;line-height:1.5;color:#C4BCAD;max-width:40ch;margin:22px auto 0;}
#ml-aurora .hcta{display:flex;gap:13px;justify-content:center;margin-top:32px;flex-wrap:wrap;}
#ml-aurora .btn{font-weight:600;font-size:16px;border-radius:10px;padding:14px 26px;cursor:pointer;display:inline-flex;align-items:center;gap:8px;text-decoration:none;border:1px solid transparent;transition:all .2s;}
#ml-aurora .btn-pri{background:#E0512B;color:#fff;box-shadow:0 8px 30px rgba(224,81,43,.4);}
#ml-aurora .btn-pri:hover{background:#E76A45;}
#ml-aurora .btn-glass{background:rgba(246,241,232,.07);color:#F6F1E8;border-color:rgba(246,241,232,.16);}
#ml-aurora .btn-glass:hover{background:rgba(246,241,232,.12);}
#ml-aurora .hnote{font-size:13px;color:#9C9484;margin-top:15px;}
#ml-aurora .stage{margin:60px auto 0;max-width:900px;}
#ml-aurora .glass{position:relative;z-index:5;background:linear-gradient(160deg,#2A2418,#1B1710);border:1px solid rgba(246,241,232,.14);border-radius:22px;padding:22px;box-shadow:0 40px 90px rgba(0,0,0,.5),inset 0 1px 0 rgba(246,241,232,.07);transition:transform .15s cubic-bezier(.16,1,.3,1);}
#ml-aurora .g-head{display:flex;align-items:center;gap:10px;padding:2px 4px 16px;}
#ml-aurora .g-dots{display:flex;gap:6px;}#ml-aurora .g-dots span{width:11px;height:11px;border-radius:50%;background:rgba(246,241,232,.18);}
#ml-aurora .g-title{font-family:'JetBrains Mono',monospace;font-size:12px;color:#9C9484;}
#ml-aurora .g-live{margin-left:auto;display:inline-flex;align-items:center;gap:6px;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600;color:#4FAE89;background:rgba(79,174,137,.14);padding:4px 10px;border-radius:999px;}
#ml-aurora .livedot{width:6px;height:6px;border-radius:50%;background:#4FAE89;}
#ml-aurora .g-grid{display:grid;grid-template-columns:1.1fr 1fr;gap:14px;}
#ml-aurora .g-panel{background:rgba(15,12,7,.5);border:1px solid rgba(246,241,232,.09);border-radius:14px;padding:16px;text-align:left;}
#ml-aurora .g-lbl{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#9C9484;margin-bottom:10px;}
#ml-aurora .g-lead{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid rgba(246,241,232,.06);}
#ml-aurora .g-lead:last-child{border-bottom:0;}
#ml-aurora .av{width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#E0512B,#E0A019);color:#fff;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;}
#ml-aurora .g-who b{font-size:13px;font-weight:600;color:#F6F1E8;display:block;line-height:1.2;}
#ml-aurora .g-who em{font-style:normal;font-size:11px;color:#9C9484;}
#ml-aurora .st{margin-left:auto;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:600;padding:3px 8px;border-radius:999px;}
#ml-aurora .st-rep{background:rgba(79,174,137,.16);color:#6FC9A3;}
#ml-aurora .st-snt{background:rgba(138,151,168,.16);color:#A9B4C2;}
#ml-aurora .st-sch{background:rgba(236,178,63,.16);color:#ECC06A;}
#ml-aurora .g-sub{font-size:14px;font-weight:600;color:#F6F1E8;margin:0 0 8px;}
#ml-aurora .g-body{font-family:'JetBrains Mono',monospace;font-size:12px;line-height:1.65;color:#C4BCAD;margin:0;white-space:pre-wrap;}
#ml-aurora .caret{display:inline-block;width:7px;color:#F47C54;}
#ml-aurora .caret::after{content:"▌";animation:mlBlink 1s step-end infinite;}
@keyframes mlBlink{50%{opacity:0}}
#ml-aurora .stats{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin:34px auto 0;}
#ml-aurora .schip{background:rgba(246,241,232,.05);border:1px solid rgba(246,241,232,.11);border-radius:14px;padding:16px 26px;text-align:center;min-width:150px;}
#ml-aurora .schip .n{font-weight:800;font-size:34px;letter-spacing:-.02em;color:#FBF7F0;}
#ml-aurora .schip.em .n{color:#F47C54;}
#ml-aurora .schip .c{font-size:12px;color:#9C9484;margin-top:2px;}
@media(max-width:820px){#ml-aurora .g-grid{grid-template-columns:1fr;}#ml-aurora .cursor-glow{display:none;}}
@media(prefers-reduced-motion:reduce){#ml-aurora .blob,#ml-aurora .ping::after,#ml-aurora .caret::after{animation:none;}}
`;
