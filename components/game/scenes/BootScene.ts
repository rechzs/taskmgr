import * as Phaser from "phaser";
import { COLORS } from "@/components/game/scenes/scene-utils";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create() {
    this.makeTexture("particle-square", 4, (graphics) => {
      graphics.fillStyle(COLORS.jadeSoft, 1).fillRect(0, 0, 4, 4);
    });
    this.makeTexture("particle-ember", 8, (graphics) => {
      graphics.fillStyle(0xfff0b3, 1).fillCircle(4, 4, 2);
      graphics.fillStyle(COLORS.ember, 0.8).fillCircle(4, 5, 3);
    });
    this.makeTexture("particle-leaf", 8, (graphics) => {
      graphics.fillStyle(0x3f7f55, 1).fillTriangle(0, 4, 7, 0, 5, 8);
    });
    this.makeTexture("particle-rune", 10, (graphics) => {
      graphics.lineStyle(2, COLORS.violet, 1).strokePoints([
        new Phaser.Geom.Point(5, 1),
        new Phaser.Geom.Point(9, 5),
        new Phaser.Geom.Point(5, 9),
        new Phaser.Geom.Point(1, 5),
      ], true, true);
    });
    this.makeTexture("glow-orb", 32, (graphics) => {
      graphics.fillStyle(COLORS.jade, 0.06).fillCircle(16, 16, 16);
      graphics.fillStyle(COLORS.jade, 0.14).fillCircle(16, 16, 10);
      graphics.fillStyle(COLORS.jadeSoft, 0.75).fillCircle(16, 16, 3);
    });
    this.makeTexture("particle-smoke", 18, (graphics) => {
      graphics.fillStyle(0xb8b0a0, 0.12).fillCircle(9, 9, 9);
      graphics.fillStyle(0x756f66, 0.2).fillCircle(8, 10, 5);
    });
    this.makeTexture("particle-metal", 10, (graphics) => {
      graphics.fillStyle(0xf6d788, 1).fillTriangle(1, 8, 5, 1, 9, 7);
      graphics.lineStyle(1, 0xffffff, 0.8).lineBetween(5, 2, 8, 7);
    });
    this.makeTexture("particle-dust", 6, (graphics) => {
      graphics.fillStyle(0xc5ad81, 0.55).fillCircle(3, 3, 3);
    });
    this.scene.start("PreloadScene");
  }

  private makeTexture(key: string, size: number, draw: (graphics: Phaser.GameObjects.Graphics) => void) {
    if (this.textures.exists(key)) return;
    const graphics = this.add.graphics();
    draw(graphics);
    graphics.generateTexture(key, size, size);
    graphics.destroy();
  }
}
