import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

type Lead = { name: string; company: string; role: string };
type Reply = { name: string; snippet: string };

const LEAD_POOL: Lead[] = [
  { name: "Anna Lindqvist", company: "Spotify", role: "VD" },
  { name: "Erik Johansson", company: "Klarna", role: "Grundare" },
  { name: "Sofia Bergman", company: "Tink", role: "CMO" },
  { name: "Johan Eklund", company: "Voi", role: "Sales" },
  { name: "Maja Holm", company: "Truecaller", role: "VD" },
  { name: "Oscar Nilsson", company: "Mentimeter", role: "Grundare" },
  { name: "Linnea Sjöberg", company: "Storytel", role: "CMO" },
  { name: "Henrik Wallin", company: "Northvolt", role: "Ops" },
  { name: "Elin Karlsson", company: "Einride", role: "VD" },
  { name: "Viktor Lund", company: "Budbee", role: "Sales" },
];

const REPLY_POOL: Reply[] = [
  { name: "Anna Lindqvist", snippet: "Ja, absolut — när passar det?" },
  { name: "Erik Johansson", snippet: "Intressant, kan du skicka mer info?" },
  { name: "Sofia Bergman", snippet: "Vi tar ett möte nästa vecka." },
  { name: "Johan Eklund", snippet: "Tack, hör av mig på fredag." },
  { name: "Maja Holm", snippet: "Låter spännande, vad kostar det?" },
  { name: "Oscar Nilsson", snippet: "Skicka gärna en kalenderinbjudan." },
];

const initials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const h = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return reduced;
}

function useCountUp(target: number, duration = 2000, decimals = 0) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  const fmt = new Intl.NumberFormat("sv-SE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return fmt.format(value);
}

let leadCounter = 0;
let replyCounter = 0;

export function PipelineMockup() {
  const { t } = useTranslation();
  const reduced = useReducedMotion();

  // Leads
  const [leads, setLeads] = useState(() =>
    LEAD_POOL.slice(0, 5).map((l, i) => ({ ...l, key: `init-${i}` }))
  );
  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => {
      setLeads((prev) => {
        const next = LEAD_POOL[(leadCounter++ + 5) % LEAD_POOL.length];
        return [...prev.slice(1), { ...next, key: `l-${leadCounter}` }];
      });
    }, 2500);
    return () => clearInterval(id);
  }, [reduced]);

  // Replies
  const [replies, setReplies] = useState<
    { name: string; snippet: string; key: string; ageMin: number }[]
  >(() => [
    { ...REPLY_POOL[0], key: "r-init-0", ageMin: 0 },
    { ...REPLY_POOL[1], key: "r-init-1", ageMin: 2 },
    { ...REPLY_POOL[2], key: "r-init-2", ageMin: 5 },
  ]);
  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => {
      setReplies((prev) => {
        const next = REPLY_POOL[replyCounter++ % REPLY_POOL.length];
        const aged = prev.map((r) => ({ ...r, ageMin: r.ageMin + 2 }));
        return [{ ...next, key: `r-${replyCounter}`, ageMin: 0 }, ...aged].slice(0, 3);
      });
    }, 3500);
    return () => clearInterval(id);
  }, [reduced]);

  const sent = useCountUp(12847, 2000, 0);
  const open = useCountUp(71.2, 2000, 1);
  const reply = useCountUp(14.8, 2000, 1);

  const ageLabel = (n: number) => (n === 0 ? t("landing.pipeline.now") : `${n} min`);

  return (
    <div
      className="relative mx-auto w-full max-w-[880px] rounded-[16px] border bg-card text-card-foreground p-4 sm:p-6 shadow-sm"
      style={{
        opacity: 0,
        animation: `pm-card-in 500ms ${EASE} 400ms forwards`,
      }}
    >
      <style>{`
        @keyframes pm-card-in { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pm-row-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pm-row-down { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
        .pm-row-in { animation: pm-row-in 500ms ${EASE} both; }
        .pm-row-down { animation: pm-row-down 500ms ${EASE} both; }
        @keyframes pm-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.45; } }
      `}</style>

      <div className="relative grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
        {/* Particles overlay (desktop only) */}
        <svg
          className="pointer-events-none absolute inset-0 hidden h-full w-full md:block"
          viewBox="0 0 880 280"
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <filter id="pm-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <path id="pm-p1" d="M 280 70 C 320 70, 320 140, 360 140" fill="none" />
            <path id="pm-p2" d="M 555 140 C 595 140, 595 70, 635 70" fill="none" />
          </defs>
          {!reduced &&
            [0, 0.5, 1].map((begin, i) => (
              <circle key={`a${i}`} r="2.5" fill="hsl(var(--primary))" filter="url(#pm-glow)">
                <animateMotion dur="1.5s" repeatCount="indefinite" begin={`${begin}s`}>
                  <mpath href="#pm-p1" />
                </animateMotion>
              </circle>
            ))}
          {!reduced &&
            [0.25, 0.75, 1.25].map((begin, i) => (
              <circle key={`b${i}`} r="2.5" fill="hsl(var(--primary))" filter="url(#pm-glow)">
                <animateMotion dur="1.5s" repeatCount="indefinite" begin={`${begin}s`}>
                  <mpath href="#pm-p2" />
                </animateMotion>
              </circle>
            ))}
        </svg>

        {/* Column 1: Leads */}
        <div className="relative z-10">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#64748b]">
              {t("landing.pipeline.leads")}
            </span>
            <span className="rounded-full bg-[#2563eb]/10 px-2 py-0.5 text-[10px] font-semibold text-[#2563eb]">
              {LEAD_POOL.length}
            </span>
          </div>
          <ul className="space-y-2">
            {leads.map((lead, idx) => (
              <li
                key={lead.key}
                className={`pm-row-in flex items-center gap-2.5 rounded-[10px] border bg-white p-2 ${
                  idx === leads.length - 1 ? "border-l-2 border-l-[#2563eb]/50" : ""
                }`}
                style={{ borderColor: "rgba(0,0,0,0.06)" }}
              >
                <div className="grid h-7 w-7 place-items-center rounded-full bg-[#2563eb] text-[10px] font-semibold text-white">
                  {initials(lead.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold text-[#0f172a]">
                    {lead.name}
                  </div>
                  <div className="truncate text-[10px] text-[#64748b]">{lead.company}</div>
                </div>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-[#64748b]">
                  {lead.role}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 2: Sequence */}
        <div className="relative z-10">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#64748b]">
              {t("landing.pipeline.sequence")}
            </span>
          </div>
          <div className="space-y-2">
            {[
              { day: t("landing.pipeline.day1"), status: t("landing.pipeline.sent"), color: "#16a34a", pulse: false },
              { day: t("landing.pipeline.day3"), status: t("landing.pipeline.sent"), color: "#16a34a", pulse: false },
              { day: t("landing.pipeline.day7"), status: t("landing.pipeline.scheduled"), color: "#d97706", pulse: true },
            ].map((step, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 rounded-[10px] border bg-white p-2.5"
                style={{ borderColor: "rgba(0,0,0,0.06)" }}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{
                    backgroundColor: step.color,
                    animation: step.pulse ? "pm-pulse 1.6s ease-in-out infinite" : undefined,
                  }}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold text-[#0f172a]">{step.day}</div>
                  <div className="text-[10px] text-[#64748b]">{step.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 3: Replies */}
        <div className="relative z-10">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#64748b]">
              {t("landing.pipeline.replies")}
            </span>
          </div>
          <ul className="space-y-2">
            {replies.map((r) => (
              <li
                key={r.key}
                className="pm-row-down rounded-[10px] border border-l-2 bg-white p-2.5"
                style={{ borderColor: "rgba(0,0,0,0.06)", borderLeftColor: "rgba(22,163,74,0.5)" }}
              >
                <div className="flex items-center gap-2">
                  <div className="grid h-6 w-6 place-items-center rounded-full bg-[#16a34a]/10 text-[9px] font-semibold text-[#16a34a]">
                    {initials(r.name)}
                  </div>
                  <div className="min-w-0 flex-1 truncate text-xs font-semibold text-[#0f172a]">
                    {r.name}
                  </div>
                  <span className="text-[10px] text-[#64748b]">{ageLabel(r.ageMin)}</span>
                </div>
                <div className="mt-1 truncate text-[11px] text-[#64748b]">{r.snippet}</div>
                <div className="mt-1.5">
                  <span className="rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
                    {t("landing.pipeline.replied")} ↩
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Stats */}
      <div
        className="mt-6 grid grid-cols-3 gap-2 border-t pt-4"
        style={{ borderColor: "rgba(0,0,0,0.06)" }}
      >
        {[
          { value: sent, label: t("landing.pipeline.sentLabel") },
          { value: `${open}%`, label: t("landing.pipeline.openRate") },
          { value: `${reply}%`, label: t("landing.pipeline.replyRate") },
        ].map((s, i) => (
          <div key={i} className="text-center">
            <div className="text-xl font-bold tracking-tight text-[#0f172a] tabular-nums md:text-2xl">
              {s.value}
            </div>
            <div className="mt-0.5 text-[11px] text-[#64748b]">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
