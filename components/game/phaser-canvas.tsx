"use client";

import { useEffect, useRef } from "react";

export function PhaserCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let destroy: (() => void) | undefined;
    void import("@/components/game/create-game").then(({ createGame }) => {
      if (!disposed) destroy = createGame(host);
    });
    return () => {
      disposed = true;
      destroy?.();
    };
  }, []);

  return <div ref={hostRef} id="phaser-world" className="absolute inset-0" aria-label="Mundo KAGE" />;
}
