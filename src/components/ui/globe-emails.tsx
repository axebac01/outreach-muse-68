import { useEffect, useRef, useCallback, useState } from "react";
import createGlobe from "cobe";
import { useTranslation } from "react-i18next";

interface CityMarker {
  id: string;
  location: [number, number];
  city: string;
}

interface EmailArc {
  id: string;
  from: [number, number];
  to: [number, number];
}

const cities: CityMarker[] = [
  { id: "nyc", location: [40.71, -74.0], city: "New York" },
  { id: "sfo", location: [37.77, -122.42], city: "San Francisco" },
  { id: "par", location: [48.85, 2.35], city: "Paris" },
  { id: "tyo", location: [35.68, 139.76], city: "Tokyo" },
  { id: "syd", location: [-33.86, 151.21], city: "Sydney" },
  { id: "sao", location: [-23.55, -46.63], city: "São Paulo" },
  { id: "sin", location: [1.35, 103.82], city: "Singapore" },
  { id: "sto", location: [59.33, 18.07], city: "Stockholm" },
  { id: "dub", location: [53.35, -6.26], city: "Dublin" },
  { id: "bom", location: [19.08, 72.88], city: "Mumbai" },
];

const arcs: EmailArc[] = [
  { id: "a1", from: [40.71, -74.0], to: [48.85, 2.35] },
  { id: "a2", from: [37.77, -122.42], to: [35.68, 139.76] },
  { id: "a3", from: [59.33, 18.07], to: [1.35, 103.82] },
  { id: "a4", from: [40.71, -74.0], to: [-23.55, -46.63] },
  { id: "a5", from: [35.68, 139.76], to: [-33.86, 151.21] },
  { id: "a6", from: [48.85, 2.35], to: [19.08, 72.88] },
];

interface GlobeEmailsProps {
  className?: string;
  speed?: number;
}

export function GlobeEmails({ className = "", speed = 0.003 }: GlobeEmailsProps) {
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
    arcs.map((a, i) => ({ id: a.id, value: [1240, 980, 760, 540, 420, 310][i] || 200 }))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTraffic((data) =>
        data.map((tr) => ({
          ...tr,
          value: Math.max(120, tr.value + Math.floor(Math.random() * 41) - 20),
        }))
      );
    }, 600);
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
          phi: (e.clientX - pointerInteracting.current.x) / 300,
          theta: (e.clientY - pointerInteracting.current.y) / 1000,
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

  // Pause when out of view
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
    let animationId = 0;
    let phi = 0;

    const init = () => {
      const width = canvas.offsetWidth;
      if (width === 0 || globe) return;

      globe = createGlobe(canvas, {
        devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        width: width * 2,
        height: width * 2,
        phi: 0,
        theta: 0.25,
        dark: 0,
        diffuse: 1.2,
        mapSamples: 16000,
        mapBrightness: 6,
        baseColor: [1, 1, 1],
        markerColor: [0.13, 0.45, 0.95],
        glowColor: [0.85, 0.9, 1],
        markers: cities.map((m) => ({ location: m.location, size: 0.05 })),
        // @ts-expect-error - cobe supports arcs in newer versions
        arcs: arcs.map((a) => ({ from: a.from, to: a.to })),
        // @ts-expect-error - cobe supports arcColor
        arcColor: [0.13, 0.45, 0.95],
        // @ts-expect-error - cobe supports arcWidth/Height
        arcWidth: 0.6,
        arcHeight: 0.3,
        opacity: 0.95,
        onRender: (state: any) => {
          if (!isPausedRef.current && isVisibleRef.current) phi += speed;
          state.phi = phi + phiOffsetRef.current + dragOffset.current.phi;
          state.theta = 0.25 + thetaOffsetRef.current + dragOffset.current.theta;
          state.width = width * 2;
          state.height = width * 2;
        },
      });

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
      if (animationId) cancelAnimationFrame(animationId);
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

        {/* Floating animated badges (decorative, not anchored to globe markers) */}
        <div className="pointer-events-none absolute inset-0">
          {traffic.slice(0, 4).map((tr, i) => {
            const positions = [
              "top-[12%] left-[8%]",
              "top-[22%] right-[6%]",
              "bottom-[28%] left-[4%]",
              "bottom-[14%] right-[10%]",
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
