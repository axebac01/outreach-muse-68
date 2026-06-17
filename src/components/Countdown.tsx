import { useEffect, useState } from "react";

interface CountdownProps {
  target: Date;
  compact?: boolean;
}

function diff(target: Date) {
  const ms = Math.max(0, target.getTime() - Date.now());
  const s = Math.floor(ms / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    done: ms === 0,
  };
}

const pad = (n: number) => n.toString().padStart(2, "0");

const Countdown = ({ target, compact }: CountdownProps) => {
  const [t, setT] = useState(() => diff(target));

  useEffect(() => {
    const id = window.setInterval(() => setT(diff(target)), 1000);
    return () => window.clearInterval(id);
  }, [target]);

  const items: [string, string][] = [
    [pad(t.days), "dagar"],
    [pad(t.hours), "timmar"],
    [pad(t.minutes), "minuter"],
    [pad(t.seconds), "sekunder"],
  ];

  return (
    <div
      className={`grid grid-cols-4 gap-2 sm:gap-4 ${compact ? "max-w-md" : "max-w-2xl"} mx-auto`}
      role="timer"
      aria-label={`Nedräkning: ${t.days} dagar, ${t.hours} timmar, ${t.minutes} minuter, ${t.seconds} sekunder kvar till lansering`}
    >
      {items.map(([v, label]) => (
        <div
          key={label}
          className="relative rounded-2xl border border-border/60 bg-card/40 backdrop-blur-xl px-2 py-4 sm:px-4 sm:py-6 text-center shadow-[0_8px_30px_-12px_hsl(var(--foreground)/0.18)] overflow-hidden"
        >
          <div
            className="absolute inset-x-0 top-0 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.6), transparent)",
            }}
          />
          <div
            className={`font-display font-extrabold tabular-nums tracking-tight bg-clip-text text-transparent ${
              compact ? "text-3xl sm:text-4xl" : "text-4xl sm:text-6xl"
            }`}
            style={{
              backgroundImage:
                "linear-gradient(135deg, #E0512B 0%, #F4801F 45%, #D9920F 100%)",
            }}
          >
            {v}
          </div>
          <div className="mt-1 text-[10px] sm:text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Countdown;
