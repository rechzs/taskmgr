"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type GameFxCanvasProps = {
  variant: "world" | "hero";
  className?: string;
};

type Mote = {
  view: import("pixi.js").Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  drift: number;
  maxAlpha: number;
};

export function GameFxCanvas({ variant, className }: GameFxCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    let application: import("pixi.js").Application | null = null;

    void (async () => {
      const { Application, Graphics } = await import("pixi.js");
      const app = new Application();
      application = app;
      await app.init({
        resizeTo: host,
        backgroundAlpha: 0,
        antialias: false,
        autoDensity: true,
        resolution: Math.min(window.devicePixelRatio || 1, 1.5),
        preference: "webgl",
      });

      if (cancelled) {
        app.destroy({ removeView: true }, { children: true });
        return;
      }

      app.canvas.setAttribute("aria-hidden", "true");
      app.canvas.style.width = "100%";
      app.canvas.style.height = "100%";
      app.canvas.style.display = "block";
      host.appendChild(app.canvas);

      const motes: Mote[] = [];
      const moteCount = variant === "world" ? (window.innerWidth < 700 ? 32 : 68) : 34;
      const colors = variant === "world" ? [0x34d399, 0xa78bfa, 0xf59e0b, 0x9ca3af] : [0x6ee7b7, 0x34d399, 0xa78bfa];

      for (let index = 0; index < moteCount; index += 1) {
        const size = index % 9 === 0 ? 3 : index % 4 === 0 ? 2 : 1;
        const view = new Graphics().rect(-size / 2, -size / 2, size, size).fill(colors[index % colors.length]);
        const mote: Mote = {
          view,
          x: Math.random() * Math.max(app.screen.width, 1),
          y: Math.random() * Math.max(app.screen.height, 1),
          vx: (Math.random() - 0.35) * (variant === "world" ? 8 : 18),
          vy: -(8 + Math.random() * (variant === "world" ? 18 : 30)),
          phase: Math.random() * Math.PI * 2,
          drift: 6 + Math.random() * 15,
          maxAlpha: 0.2 + Math.random() * 0.55,
        };
        view.alpha = 0;
        app.stage.addChild(view);
        motes.push(mote);
      }

      const mistLayers = variant === "world"
        ? Array.from({ length: 4 }, (_, index) => {
            const mist = new Graphics();
            mist.alpha = 0.06 + index * 0.015;
            app.stage.addChild(mist);
            return mist;
          })
        : [];

      let elapsed = 0;
      app.ticker.add((ticker) => {
        const delta = Math.min(ticker.deltaMS / 1000, 0.05);
        elapsed += delta;
        const width = app.screen.width;
        const height = app.screen.height;

        for (const mote of motes) {
          mote.y += mote.vy * delta;
          mote.x += (mote.vx + Math.sin(elapsed * 1.4 + mote.phase) * mote.drift) * delta;
          if (mote.y < -8 || mote.x > width + 12 || mote.x < -12) {
            mote.x = Math.random() * width;
            mote.y = height + Math.random() * 40;
          }
          mote.view.position.set(Math.round(mote.x), Math.round(mote.y));
          mote.view.alpha = mote.maxAlpha * (0.35 + Math.sin(elapsed * 2.2 + mote.phase) * 0.3);
        }

        mistLayers.forEach((mist, index) => {
          const offset = Math.sin(elapsed * (0.08 + index * 0.018) + index) * width * 0.08;
          const y = height * (0.28 + index * 0.18);
          mist.clear()
            .moveTo(-width * 0.2 + offset, y)
            .bezierCurveTo(width * 0.15, y - 34, width * 0.44, y + 26, width * 0.72, y - 12)
            .bezierCurveTo(width * 0.88, y - 26, width * 1.08, y + 22, width * 1.2, y)
            .stroke({ color: index % 2 ? 0x8b5cf6 : 0x6ee7b7, width: 24 + index * 7, alpha: 0.09 });
        });

      });

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        app.ticker.update();
        app.ticker.stop();
      }
    })();

    return () => {
      cancelled = true;
      if (application) application.destroy({ removeView: true }, { children: true });
    };
  }, [variant]);

  return <div ref={hostRef} className={cn("game-fx-canvas pointer-events-none", className)} aria-hidden="true" />;
}
