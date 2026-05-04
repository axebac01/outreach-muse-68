import { useEffect, useRef, useCallback, useState } from "react";
import createGlobe from "cobe";
import { useTranslation } from "react-i18next";

const cities = [
  { id: "nyc", location: [40.71, -74.0] as [number, number], city: "New York" },
  { id: "sfo", location: [37.77, -122.42] as [number, number], city: "San Francisco" },
  { id: "par", location: [48.85, 2.35] as [number, number], city: "Paris" },
  { id: "tyo", location: [35.68, 139.76] as [number, number], city: "Tokyo" },
  { id: "syd", location: [-33.86, 151.21] as [number, number], city: "Sydney" },
  { id: "sao", location: [-23.55, -46.63] as [number, number], city: "São Paulo" },
  { id: "sin", location: [1.35, 103.82] as [number, number], city: "Singapore" },
  { id: "sto", location: [59.33, 18.07] as [number, number], city: "Stockholm" },
  { id: "dub", location: [53.35, -6.26] as [number, number], city: "Dublin" },
  { id: "bom", location: [19.08, 72.88] as [number, number], city: "Mumbai" },
];

// Decorative SVG arcs in viewBox coordinates (0..100)
const decorativeArcs = [
  { d: "M 18,32 Q 50,5 82,28", delay: "0s" },
  { d: "M 22,68 Q 50,95 78,72", delay: "1.2s" },
  { d: "M 28,22 Q 55,55 80,78", delay: "0.6s" },
  { d: "M 20,52 Q 50,40 80,55", delay: "1.8s" },
  { d: "M 35,18 Q 60,50 30,82", delay: "2.4s" },
];

interface GlobeEmailsProps {
  className?: string;
  speed?: number;
}

export function GlobeEmails({ className = "", speed = 0.004 }: GlobeEmailsProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pointerInteracting = useRef<{ x: number; y: number } | null>(null);
  const dragOffset = useRef({ phi: 0, theta: 0 });
  const phiOffsetRef = useRef(0);
  const thetaOffsetRef = useRef(0);
  const isPausedRef = useRef(false);
  const isVisibleRef = useRef(true);

  const [traffic, setTraffic] = useState(() =>
    [1240, 980, 760, 540].map((value, i) => ({ id: `t${i}`, value }))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTraffic((data) =>
        data.map((tr) => ({
          ...tr,
          value: Math.max(120, tr.value + Math.floor(Math.random() * 41) - 20),
        }))
      );
    }, 800);
    return () => clearInterval(interval);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    pointerInteracting.current = { x: e.clientX, y: e.clientY };
    if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
    isPausedRef.current = true;
  }, []);

  const handlePointerUp = useCallback(() => {
    if (pointerInteracting.current !== null) {
      phiOffsetRef.current += dragOffset.current.phi;
      thetaOffsetRef.current += dragOffset.current.theta;
      dragOffset.current = { phi: 0, theta: 0 };
    }
    pointerInteracting.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = "grab";
    isPausedRef.current = false;
  }, []);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (pointerInteracting.current !== null) {
        dragOffset.current = {
          phi: (e.clientX - pointerInteracting.current.x) / 200,
          theta: (e.clientY - pointerInteracting.current.y) / 600,
        };
      }
    };
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerup", handlePointerUp, { passive: true });
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [handlePointerUp]);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        isVisibleRef.current = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.05 }
    );
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    let globe: ReturnType<typeof createGlobe> | null = null;
    let phi = 0;

    const init = () => {
      const width = canvas.offsetWidth;
      if (width === 0 || globe) return;

      const opts = {
        devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        width: width * 2,
        height: width * 2,
        phi: 0,
        theta: 0.3,
        dark: 0,
        diffuse: 1.2,
        mapSamples: 16000,
        mapBrightness: 4,
        baseColor: [0.95, 0.97, 1] as [number, number, number],
        markerColor: [0.13, 0.45, 0.95] as [number, number, number],
        glowColor: [0.75, 0.85, 1] as [number, number, number],
        markers: cities.map((m) => ({ location: m.location, size: 0.06 })),
        onRender: (state: Record<string, number>) => {
          if (!isPausedRef.current && isVisibleRef.current) {
            phi += speed;
          }
          state.phi = phi + phiOffsetRef.current + dragOffset.current.phi;
          state.theta = 0.3 + thetaOffsetRef.current + dragOffset.current.theta;
          state.width = width * 2;
          state.height = width * 2;
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      globe = createGlobe(canvas, opts as any);

      setTimeout(() => {
        if (canvas) canvas.style.opacity = "1";
      }, 50);
    };

    if (canvas.offsetWidth > 0) {
      init();
    } else {
      const ro = new ResizeObserver((entries) => {
        if ((entries[0]?.contentRect.width ?? 0) > 0) {
          ro.disconnect();
          init();
        }
      });
      ro.observe(canvas);
    }

    return () => {
      if (globe) globe.destroy();
    };
  }, [speed]);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative aspect-square w-full">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          style={{
            width: "100%",
            height: "100%",
            cursor: "grab",
            opacity: 0,
            transition: "opacity 0.8s ease",
            contain: "layout paint size",
          }}
        />

        {/* Decorative animated arcs overlay */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="arc-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0" />
              <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.9" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            </linearGradient>
          </defs>
          {decorativeArcs.map((arc, i) => (
            <g key={i}>
              <path
                d={arc.d}
                fill="none"
                stroke="url(#arc-gradient)"
                strokeWidth="0.4"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                style={{
                  animation: `arc-pulse 3s ease-in-out ${arc.delay} infinite`,
                }}
              />
            </g>
          ))}
          <style>{`
            @keyframes arc-pulse {
              0%, 100% { opacity: 0.15; }
              50% { opacity: 0.85; }
            }
          `}</style>
        </svg>

        {/* Floating animated badges */}
        <div className="pointer-events-none absolute inset-0">
          {traffic.map((tr, i) => {
            const positions = [
              "top-[10%] left-[6%]",
              "top-[20%] right-[4%]",
              "bottom-[26%] left-[2%]",
              "bottom-[12%] right-[8%]",
            ];
            return (
              <div
                key={tr.id}
                className={`absolute ${positions[i]} animate-fade-in`}
                style={{ animationDelay: `${i * 150}ms` }}
              >
                <div className="flex items-center gap-1.5 rounded-full border bg-background/90 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="tabular-nums">{tr.value.toLocaleString()}</span>
                  <span className="text-muted-foreground">{t("landing.emailsPerMin")}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        {t("landing.globeCaption")}
      </p>
    </div>
  );
}
