import { useEffect, useRef, useCallback, useState } from "react";
import createGlobe from "cobe";
import { useTranslation } from "react-i18next";

interface BarMarker {
  id: string;
  location: [number, number]; // [lat, lon] in degrees
  value: number;
  label: string;
}

interface GlobeEmailsProps {
  markers?: BarMarker[];
  className?: string;
  speed?: number;
}

const defaultMarkers: BarMarker[] = [
  { id: "nyc", location: [40.71, -74.01], value: 87, label: "New York" },
  { id: "lon", location: [51.51, -0.13], value: 64, label: "London" },
  { id: "tyo", location: [35.68, 139.65], value: 92, label: "Tokyo" },
  { id: "sin", location: [1.35, 103.82], value: 78, label: "Singapore" },
  { id: "sto", location: [59.33, 18.07], value: 71, label: "Stockholm" },
  { id: "sfo", location: [37.77, -122.42], value: 83, label: "San Francisco" },
];

interface ProjectedMarker {
  id: string;
  x: number;
  y: number;
  visible: boolean;
}

export function GlobeEmails({
  markers = defaultMarkers,
  className = "",
  speed = 0.004,
}: GlobeEmailsProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pointerInteracting = useRef<{ x: number; y: number } | null>(null);
  const dragOffset = useRef({ phi: 0, theta: 0 });
  const phiOffsetRef = useRef(0);
  const thetaOffsetRef = useRef(0);
  const isPausedRef = useRef(false);

  const [projected, setProjected] = useState<ProjectedMarker[]>(
    markers.map((m) => ({ id: m.id, x: 0.5, y: 0.5, visible: false }))
  );

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
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    let globe: ReturnType<typeof createGlobe> | null = null;
    let animationId = 0;
    let phi = 0;
    const baseTheta = 0.25;
    let frame = 0;

    const init = () => {
      const width = canvas.offsetWidth;
      if (width === 0 || globe) return;

      globe = createGlobe(canvas, {
        devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        width: width * 2,
        height: width * 2,
        phi: 0,
        theta: baseTheta,
        dark: 0,
        diffuse: 1.2,
        mapSamples: 16000,
        mapBrightness: 4,
        baseColor: [0.95, 0.97, 1],
        markerColor: [0.13, 0.45, 0.95],
        glowColor: [0.75, 0.85, 1],
        markers: markers.map((m) => ({ location: m.location, size: 0.05 })),
      });

      const project = (currentPhi: number, currentTheta: number) => {
        // Visual sphere radius as fraction of container (cobe leaves margin/glow).
        const radius = 0.38;
        const cx = 0.5;
        const cy = 0.5;

        return markers.map((m) => {
          const lat = (m.location[0] * Math.PI) / 180;
          const lon = (m.location[1] * Math.PI) / 180;

          // cobe spins so that increasing phi rotates east-to-west.
          // Offset by -π/2 so phi=0 puts lon=0 facing the camera.
          const adjLon = lon - currentPhi - Math.PI / 2;

          // Point on unit sphere
          const x3 = Math.cos(lat) * Math.cos(adjLon);
          const y3 = Math.sin(lat);
          const z3 = Math.cos(lat) * Math.sin(adjLon);

          // Apply theta tilt around X axis
          const cosT = Math.cos(currentTheta);
          const sinT = Math.sin(currentTheta);
          const y3t = y3 * cosT - z3 * sinT;
          const z3t = y3 * sinT + z3 * cosT;

          // Front-facing when z3t > small threshold
          const visible = z3t > 0.05;

          const x = cx + x3 * radius;
          const y = cy - y3t * radius;

          return { id: m.id, x, y, visible };
        });
      };

      const animate = () => {
        if (!isPausedRef.current) {
          phi += speed;
        }
        const renderPhi = phi + phiOffsetRef.current + dragOffset.current.phi;
        const renderTheta =
          baseTheta + thetaOffsetRef.current + dragOffset.current.theta;
        if (globe) {
          globe.update({ phi: renderPhi, theta: renderTheta });
        }

        frame++;
        if (frame % 2 === 0) {
          setProjected(project(renderPhi, renderTheta));
        }

        animationId = requestAnimationFrame(animate);
      };
      animate();
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
  }, [markers, speed]);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <style>{`
        @keyframes bar-fill-anim {
          from { width: 0%; }
          to { width: var(--bar-value, 0%); }
        }
      `}</style>

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

        <div className="pointer-events-none absolute inset-0">
          {markers.map((m, i) => {
            const p = projected[i];
            if (!p) return null;
            return (
              <div
                key={m.id}
                className="absolute"
                style={{
                  left: `${p.x * 100}%`,
                  top: `${p.y * 100}%`,
                  transform: "translate(-50%, calc(-100% - 14px))",
                  opacity: p.visible ? 1 : 0,
                  transition: "opacity 0.35s ease",
                  willChange: "left, top, opacity",
                }}
              >
                <div className="flex min-w-[110px] flex-col gap-1 rounded-md border bg-background/95 px-2.5 py-1.5 shadow-sm backdrop-blur">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {m.label}
                    </span>
                    <span className="text-[11px] font-semibold tabular-nums text-foreground">
                      {m.value}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${m.value}%`,
                        animation: `bar-fill-anim 1.2s ease-out forwards`,
                        ["--bar-value" as string]: `${m.value}%`,
                      }}
                    />
                  </div>
                </div>
                <div
                  className="absolute left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]"
                  style={{ top: "calc(100% + 6px)" }}
                />
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
