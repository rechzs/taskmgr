import * as Phaser from "phaser";
import { NinjaRig } from "@/components/game/scenes/NinjaRig";
import { COLORS, makePixelButton, PIXEL_FONT, playRuneSound } from "@/components/game/scenes/scene-utils";

type TrophyData = { trophyCount?: number; goal?: string };

export class TrophyScene extends Phaser.Scene {
  private trophyCount = 0;
  private goal = "UFPR";
  private emitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];

  constructor() {
    super("TrophyScene");
  }

  init(data: TrophyData) {
    this.trophyCount = data.trophyCount ?? 0;
    this.goal = data.goal ?? "UFPR";
  }

  create() {
    const { width, height } = this.scale;
    const compact = width < 680;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.cameras.main.setBackgroundColor(0x010302).fadeIn(reduced ? 0 : 500, 0, 0, 0);
    const background = this.add.image(width / 2, height / 2, "dojo-world").setTint(0x3d2f25).setAlpha(0.36);
    background.setScale(Math.max(width / background.width, height / background.height) * 1.12);
    this.add.rectangle(width / 2, height / 2, width, height, 0x030403, 0.55);

    const temple = this.add.graphics().setDepth(5);
    const templeWidth = compact ? width * 0.9 : Math.min(width * 0.68, 760);
    const templeHeight = compact ? height * 0.62 : height * 0.7;
    const left = width / 2 - templeWidth / 2;
    const top = height * 0.17;
    temple.fillStyle(0x11140f, 1).lineStyle(5, 0x80613a, 0.9);
    temple.fillPoints([
      new Phaser.Geom.Point(left, top + templeHeight), new Phaser.Geom.Point(left + 26, top + 80),
      new Phaser.Geom.Point(width / 2, top), new Phaser.Geom.Point(left + templeWidth - 26, top + 80),
      new Phaser.Geom.Point(left + templeWidth, top + templeHeight),
    ], true).strokePath();
    temple.fillStyle(0x070907, 1).fillRect(left + 34, top + 105, templeWidth - 68, templeHeight - 105);

    const doorWidth = (templeWidth - 94) / 2;
    const doorHeight = templeHeight - 145;
    const leftDoor = this.add.rectangle(width / 2 - doorWidth / 2, top + 125 + doorHeight / 2, doorWidth, doorHeight, 0x17120c)
      .setStrokeStyle(4, 0x7f5b2f).setDepth(12).setOrigin(0.5);
    const rightDoor = this.add.rectangle(width / 2 + doorWidth / 2, top + 125 + doorHeight / 2, doorWidth, doorHeight, 0x17120c)
      .setStrokeStyle(4, 0x7f5b2f).setDepth(12).setOrigin(0.5);
    [leftDoor, rightDoor].forEach((door, index) => {
      for (let rune = 0; rune < 5; rune += 1) {
        this.add.text(door.x + (index ? 1 : -1) * doorWidth * 0.18, top + 160 + rune * (doorHeight / 6), "◇", {
          fontFamily: PIXEL_FONT, fontSize: compact ? "10px" : "14px", color: "#a97636",
        }).setOrigin(0.5).setDepth(13);
      }
    });

    const light = this.add.circle(width / 2, top + templeHeight * 0.53, compact ? 105 : 165, COLORS.amber, 0)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(9);
    const trophy = this.add.image(width / 2, top + templeHeight * 0.49, "relics", "relic-5")
      .setScale(compact ? 0.34 : 0.46).setTint(0xffe8a5).setAlpha(0).setDepth(20);
    const ninja = new NinjaRig(this, width * (compact ? 0.18 : 0.25), height * 0.86, compact ? 0.52 : 0.67).setAlpha(0).setDepth(22);

    this.add.text(width / 2, compact ? 34 : 42, "CERIMÔNIA DO TROFÉU", {
      fontFamily: PIXEL_FONT, fontSize: compact ? "11px" : "17px", color: "#ffe9ae", stroke: "#4d2d07", strokeThickness: 7,
    }).setOrigin(0.5).setDepth(40);
    const subtitle = this.add.text(width / 2, height * 0.78, `TROFÉU ${String(this.trophyCount).padStart(2, "0")} · CAMINHO ${this.goal}`, {
      fontFamily: PIXEL_FONT, fontSize: compact ? "7px" : "10px", color: "#fff0c3", stroke: "#090705", strokeThickness: 5,
      align: "center", wordWrap: { width: width * 0.72 },
    }).setOrigin(0.5).setAlpha(0).setDepth(40);

    this.emitters = [
      this.add.particles(width / 2, top + templeHeight * 0.62, "particle-ember", {
        lifespan: { min: 900, max: 1800 }, speedY: { min: -150, max: -70 }, speedX: { min: -90, max: 90 },
        scale: { start: 1, end: 0 }, alpha: { start: 1, end: 0 }, frequency: compact ? 110 : 65,
        maxParticles: compact ? 36 : 68, blendMode: Phaser.BlendModes.ADD, emitting: false,
      }).setDepth(30),
      this.add.particles(width / 2, top + templeHeight * 0.45, "particle-rune", {
        lifespan: 2200, speed: { min: 28, max: 85 }, angle: { min: 200, max: 340 },
        scale: { start: 0.9, end: 0.15 }, alpha: { start: 0.9, end: 0 }, frequency: compact ? 180 : 105,
        maxParticles: compact ? 22 : 42, blendMode: Phaser.BlendModes.ADD, emitting: false,
      }).setDepth(31),
    ];

    const duration = reduced ? 0 : 900;
    this.time.delayedCall(reduced ? 0 : 420, () => {
      playRuneSound(this, true);
      this.tweens.add({ targets: leftDoor, x: left + 50, angle: -2, duration, ease: "Cubic.easeInOut" });
      this.tweens.add({ targets: rightDoor, x: left + templeWidth - 50, angle: 2, duration, ease: "Cubic.easeInOut" });
      this.cameras.main.zoomTo(1.09, duration, "Cubic.easeInOut");
    });
    this.time.delayedCall(reduced ? 0 : 1180, () => {
      this.emitters.forEach((emitter) => emitter.start());
      this.cameras.main.flash(reduced ? 0 : 380, 255, 210, 110, false);
      this.cameras.main.shake(reduced ? 0 : 420, 0.005);
      this.tweens.add({ targets: light, alpha: 0.48, scale: 1.45, duration: reduced ? 0 : 750, ease: "Sine.easeOut" });
      this.tweens.add({ targets: trophy, alpha: 1, y: trophy.y - 24, scale: trophy.scale * 1.12, duration: reduced ? 0 : 850, ease: "Back.easeOut" });
      this.tweens.add({ targets: ninja, alpha: 1, x: width * (compact ? 0.25 : 0.31), duration: reduced ? 0 : 650, ease: "Cubic.easeOut" });
      this.tweens.add({ targets: subtitle, alpha: 1, duration: reduced ? 0 : 650, delay: reduced ? 0 : 400 });
      ninja.celebrate();
    });

    makePixelButton(this, width / 2, height - (compact ? 42 : 48), "PRÓXIMO CAPÍTULO", () => this.close(), COLORS.amber).setDepth(60);
    this.input.keyboard?.once("keydown-ESC", () => this.close());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.emitters.splice(0).forEach((emitter) => emitter.destroy());
      this.input.keyboard?.removeAllListeners();
    });
  }

  private close() {
    playRuneSound(this, true);
    this.cameras.main.fadeOut(260, 0, 0, 0);
    this.time.delayedCall(260, () => {
      this.scene.resume("WorldScene");
      this.scene.stop();
    });
  }
}
