import * as Phaser from "phaser";
import { gameBus } from "@/components/game/event-bus";
import { BootScene } from "@/components/game/scenes/BootScene";
import { JourneyScene } from "@/components/game/scenes/JourneyScene";
import { PreloadScene } from "@/components/game/scenes/PreloadScene";
import { TrophyScene } from "@/components/game/scenes/TrophyScene";
import { WorldScene } from "@/components/game/scenes/WorldScene";

export function createGame(parent: HTMLElement) {
  const weakDevice = window.innerWidth < 700 || (navigator.hardwareConcurrency ?? 4) <= 4;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const game = new Phaser.Game({
    type: Phaser.WEBGL,
    parent,
    width: parent.clientWidth,
    height: parent.clientHeight,
    backgroundColor: "#020606",
    transparent: false,
    pixelArt: true,
    antialias: false,
    roundPixels: true,
    disableContextMenu: true,
    render: {
      antialias: false,
      pixelArt: true,
      roundPixels: true,
      powerPreference: weakDevice ? "low-power" : "high-performance",
      batchSize: weakDevice ? 1024 : 2048,
      maxLights: weakDevice ? 4 : 8,
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: "100%",
      height: "100%",
    },
    fps: {
      target: reducedMotion ? 30 : 60,
      min: 24,
      smoothStep: true,
    },
    scene: [BootScene, PreloadScene, WorldScene, JourneyScene, TrophyScene],
  });
  game.canvas.draggable = false;
  game.canvas.setAttribute("draggable", "false");
  game.canvas.setAttribute("aria-hidden", "true");

  const onVisibility = () => {
    if (document.hidden) game.loop.sleep();
    else game.loop.wake();
  };
  document.addEventListener("visibilitychange", onVisibility);
  const unsubscribe = gameBus.on("react:pause", ({ paused }) => {
    if (paused) game.loop.sleep();
    else if (!document.hidden) game.loop.wake();
  });

  return () => {
    unsubscribe();
    document.removeEventListener("visibilitychange", onVisibility);
    game.destroy(true, false);
  };
}
