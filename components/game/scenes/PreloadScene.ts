import * as Phaser from "phaser";
import { COLORS, PIXEL_FONT } from "@/components/game/scenes/scene-utils";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("PreloadScene");
  }

  preload() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(COLORS.ink);
    const title = this.add.text(width / 2, height / 2 - 34, "KAGE", {
      fontFamily: PIXEL_FONT,
      fontSize: width < 600 ? "24px" : "34px",
      color: "#b9ffe5",
      stroke: "#063d30",
      strokeThickness: 6,
    }).setOrigin(0.5);
    const status = this.add.text(width / 2, height / 2 + 26, "INVOCANDO O MUNDO", {
      fontFamily: PIXEL_FONT,
      fontSize: "8px",
      color: "#8f9f97",
    }).setOrigin(0.5);
    const bar = this.add.graphics();
    this.load.on("progress", (progress: number) => {
      bar.clear().fillStyle(0x10251d, 1).fillRect(width / 2 - 100, height / 2 + 51, 200, 5);
      bar.fillStyle(COLORS.jade, 1).fillRect(width / 2 - 100, height / 2 + 51, 200 * progress, 5);
    });
    this.load.once("complete", () => {
      title.destroy();
      status.destroy();
      bar.destroy();
    });

    this.load.image("kage-world-base", "/kage-world-base.png");
    this.load.spritesheet("ninja-actions-a", "/ninja-actions-a.png", { frameWidth: 313, frameHeight: 313 });
    this.load.spritesheet("ninja-actions-b", "/ninja-actions-b.png", { frameWidth: 313, frameHeight: 418 });
  }

  create() {
    this.scene.start("WorldScene");
  }
}
