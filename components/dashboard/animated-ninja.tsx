"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function AnimatedNinja({ className, wounded = false }: { className?: string; wounded?: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    let application: import("pixi.js").Application | null = null;

    void (async () => {
      const [{ Application, Assets, MeshPlane }, { AdvancedBloomFilter, GlowFilter }] = await Promise.all([
        import("pixi.js"),
        import("pixi-filters"),
      ]);
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

      const texture = await Assets.load("/ninja.png");
      const verticesX = 11;
      const verticesY = 13;
      const plane = new MeshPlane({ texture, verticesX, verticesY });
      const scale = Math.min(app.screen.width / texture.width, app.screen.height / texture.height) * 1.04;
      plane.scale.set(scale);
      plane.position.set((app.screen.width - texture.width * scale) / 2, app.screen.height - texture.height * scale);
      plane.filters = [
        new GlowFilter({ distance: 12, outerStrength: wounded ? 1.2 : 0.8, innerStrength: 0.15, color: wounded ? 0xef4444 : 0x10b981, quality: 0.18 }),
        new AdvancedBloomFilter({ threshold: 0.72, bloomScale: wounded ? 0.55 : 0.72, brightness: 1.02, blur: 3, quality: 2 }),
      ];
      app.stage.addChild(plane);

      const positionAttribute = plane.geometry.getAttribute("aPosition");
      const vertexBuffer = positionAttribute.buffer;
      const positions = vertexBuffer.data as Float32Array;
      const basePositions = new Float32Array(positions);
      let elapsed = 0;

      app.ticker.add((ticker) => {
        elapsed += Math.min(ticker.deltaMS / 1000, 0.05);
        for (let index = 0; index < positions.length; index += 2) {
          const vertex = index / 2;
          const column = vertex % verticesX;
          const row = Math.floor(vertex / verticesX);
          const nx = column / (verticesX - 1);
          const ny = row / (verticesY - 1);
          let dx = Math.sin(elapsed * 1.35 + ny * 2.1) * 0.75 * ny;
          let dy = Math.sin(elapsed * 1.8 + nx * 2.4) * 0.45;

          const headTies = ny < 0.27 && nx < 0.52;
          const waistCloth = ny > 0.4 && ny < 0.68 && nx < 0.58;
          const lowerFabric = ny > 0.55 && nx > 0.22 && nx < 0.78;

          if (headTies) {
            const freedom = (0.52 - nx) / 0.52;
            dx += Math.sin(elapsed * 2.6 + ny * 5.2) * 14 * freedom;
            dy += Math.cos(elapsed * 2.1 + nx * 6.4) * 6 * freedom;
          }
          if (waistCloth) {
            const freedom = (0.58 - nx) / 0.58;
            dx += Math.sin(elapsed * 2.15 + ny * 7.2) * 12 * freedom;
            dy += Math.cos(elapsed * 2.45 + nx * 4.8) * 7 * freedom;
          }
          if (lowerFabric) {
            dy += Math.sin(elapsed * 1.55 + nx * 5.4 + ny) * 2.8 * ny;
            dx += Math.cos(elapsed * 1.2 + ny * 5) * 1.7;
          }

          positions[index] = basePositions[index] + dx;
          positions[index + 1] = basePositions[index + 1] + dy;
        }
        vertexBuffer.update();
        plane.y = app.screen.height - texture.height * scale + Math.sin(elapsed * 1.45) * 2.5;
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
  }, [wounded]);

  return <div ref={hostRef} className={cn("animated-ninja pointer-events-none", className)} aria-label="Ninja guardião animado pelo vento" />;
}
