import * as Phaser from "phaser";
import { gameBus } from "@/components/game/event-bus";
import { FullBodyNinja } from "@/components/game/scenes/FullBodyNinja";
import { COLORS, makePixelButton, PIXEL_FONT } from "@/components/game/scenes/scene-utils";

type TrophyData = { trophyCount?: number; goal?: string };

export class TrophyScene extends Phaser.Scene {
  private trophyCount = 0;
  private goal = "UFPR";
  private emitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  private reducedMotion = false;

  constructor() {
    super("TrophyScene");
  }

  init(data: TrophyData) {
    this.trophyCount = data.trophyCount ?? 0;
    this.goal = data.goal ?? "UFPR";
  }

  create() {
    gameBus.emit("game:scene", { scene: "trophy" });
    const { width, height } = this.scale;
    const compact = width < 680;
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.cameras.main.setBackgroundColor(0x050403).fadeIn(this.reducedMotion ? 0 : 550, 0, 0, 0);

    const background = this.add.image(width / 2, height / 2, "kage-world-base").setTint(0x6e5532).setAlpha(0.32).setDepth(-20);
    const backgroundScale = Math.max(width / background.width, height / background.height) * 1.12;
    background.setScale(backgroundScale);
    this.add.rectangle(width / 2, height / 2, width, height, 0x090705, 0.48).setDepth(-10);

    const templeWidth = compact ? width * 0.88 : Math.min(width * 0.62, 720);
    const templeHeight = compact ? height * 0.52 : height * 0.64;
    const top = compact ? height * 0.16 : height * 0.13;
    const left = width / 2 - templeWidth / 2;
    this.drawTemple(left, top, templeWidth, templeHeight);

    const doorWidth = (templeWidth - 62) / 2;
    const doorHeight = templeHeight - 96;
    const doorY = top + 74 + doorHeight / 2;
    const leftDoor = this.makeDoor(width / 2 - doorWidth / 2, doorY, doorWidth, doorHeight, -1);
    const rightDoor = this.makeDoor(width / 2 + doorWidth / 2, doorY, doorWidth, doorHeight, 1);

    const floorY = top + templeHeight * 0.86;
    this.drawRunicPath(width / 2, floorY, height);
    const trophyLight = this.add.circle(width / 2, top + templeHeight * 0.52, compact ? 78 : 124, 0xffcb62, 0)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(15);
    const trophy = this.drawTrophy(width / 2, top + templeHeight * 0.53, compact ? 0.8 : 1.16).setAlpha(0);

    const ninjaScale = Phaser.Math.Clamp(Math.min(width / 760, height / 720), 0.54, 0.9);
    const ninja = new FullBodyNinja(this, width * (compact ? 0.19 : 0.25), height * 0.86, ninjaScale).setDepth(32);
    ninja.setResting("idle");

    this.add.text(width / 2, compact ? 38 : 44, "RITO DO CAPÍTULO", {
      fontFamily: PIXEL_FONT, fontSize: compact ? "9px" : "15px", color: "#f2deb0", stroke: "#342309", strokeThickness: 7,
    }).setOrigin(0.5).setDepth(50);
    const inscription = this.add.text(width / 2, height * 0.79, `TROFÉU ${String(this.trophyCount).padStart(2, "0")} · ${this.goal}`, {
      fontFamily: PIXEL_FONT, fontSize: compact ? "6px" : "9px", color: "#ffe8ae", stroke: "#171005", strokeThickness: 5,
      align: "center", wordWrap: { width: width * 0.7 },
    }).setOrigin(0.5).setAlpha(0).setDepth(50);

    this.createPhysicalEmitters(width, height, left, templeWidth, floorY);
    this.runCeremony(leftDoor, rightDoor, trophy, trophyLight, ninja, inscription, left, templeWidth);

    makePixelButton(this, width / 2, height - (compact ? 39 : 45), "PRÓXIMO CAPÍTULO", () => this.close(), COLORS.amber).setDepth(70);
    this.input.keyboard?.once("keydown-ESC", () => this.close());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.emitters.splice(0).forEach((emitter) => emitter.destroy());
      this.input.keyboard?.removeAllListeners();
    });
  }

  private drawTemple(left: number, top: number, width: number, height: number) {
    const temple = this.add.graphics().setDepth(4);
    temple.fillStyle(0x12100d, 1).lineStyle(4, 0x8e7042, 0.85);
    temple.fillPoints([
      new Phaser.Geom.Point(left, top + height), new Phaser.Geom.Point(left + 18, top + 56),
      new Phaser.Geom.Point(left + width / 2, top), new Phaser.Geom.Point(left + width - 18, top + 56),
      new Phaser.Geom.Point(left + width, top + height),
    ], true).strokePath();
    temple.fillStyle(0x070705, 1).fillRect(left + 24, top + 76, width - 48, height - 76);
    temple.lineStyle(3, 0x5f482a, 0.75).lineBetween(left + 12, top + 62, left + width - 12, top + 62);
  }

  private makeDoor(x: number, y: number, width: number, height: number, side: -1 | 1) {
    const door = this.add.rectangle(x, y, width, height, 0x18130d).setStrokeStyle(3, 0x74562f, 0.9).setDepth(20);
    for (let rune = 0; rune < 4; rune += 1) {
      this.add.text(x + side * width * 0.18, y - height * 0.3 + rune * height * 0.2, "◇", {
        fontFamily: PIXEL_FONT, fontSize: "9px", color: "#9c7136",
      }).setOrigin(0.5).setDepth(21);
    }
    return door;
  }

  private drawRunicPath(x: number, floorY: number, height: number) {
    for (let index = 0; index < 7; index += 1) {
      const rune = this.add.text(x, floorY + index * height * 0.035, "◇", {
        fontFamily: PIXEL_FONT, fontSize: `${8 + index}px`, color: "#d39b42",
      }).setOrigin(0.5).setAlpha(0.2).setDepth(12);
      this.time.delayedCall(this.reducedMotion ? 0 : 720 + index * 90, () => {
        rune.setAlpha(0.95);
        if (!this.reducedMotion) this.tweens.add({ targets: rune, alpha: 0.35, duration: 420, yoyo: true, repeat: -1 });
      });
    }
  }

  private drawTrophy(x: number, y: number, scale: number) {
    const graphics = this.add.graphics().setDepth(30);
    graphics.fillStyle(0xd7a842, 1).lineStyle(3, 0xffe7a1, 0.95);
    graphics.fillPoints([
      new Phaser.Geom.Point(x - 31 * scale, y - 35 * scale), new Phaser.Geom.Point(x + 31 * scale, y - 35 * scale),
      new Phaser.Geom.Point(x + 24 * scale, y + 5 * scale), new Phaser.Geom.Point(x + 9 * scale, y + 18 * scale),
      new Phaser.Geom.Point(x + 7 * scale, y + 38 * scale), new Phaser.Geom.Point(x + 23 * scale, y + 46 * scale),
      new Phaser.Geom.Point(x - 23 * scale, y + 46 * scale), new Phaser.Geom.Point(x - 7 * scale, y + 38 * scale),
      new Phaser.Geom.Point(x - 9 * scale, y + 18 * scale), new Phaser.Geom.Point(x - 24 * scale, y + 5 * scale),
    ], true).strokePath();
    graphics.lineStyle(5, 0xc48b2b, 1).strokeCircle(x - 29 * scale, y - 14 * scale, 17 * scale).strokeCircle(x + 29 * scale, y - 14 * scale, 17 * scale);
    graphics.fillStyle(0xffefb5, 0.72).fillTriangle(x - 11 * scale, y - 28 * scale, x + 4 * scale, y - 28 * scale, x - 4 * scale, y + 9 * scale);
    return graphics;
  }

  private createPhysicalEmitters(width: number, height: number, left: number, templeWidth: number, floorY: number) {
    const brazierY = floorY - 12;
    [left + 35, left + templeWidth - 35].forEach((x) => {
      this.add.rectangle(x, brazierY + 13, 22, 15, 0x3a2b1b).setStrokeStyle(2, 0x8e6b39).setDepth(24);
      this.emitters.push(this.add.particles(x, brazierY, "particle-ember", {
        lifespan: { min: 500, max: 1000 }, speedY: { min: -65, max: -28 }, speedX: { min: -14, max: 14 },
        scale: { start: 0.6, end: 0 }, alpha: { start: 0.95, end: 0 }, frequency: this.scale.width < 680 ? 120 : 80,
        maxParticles: this.scale.width < 680 ? 12 : 22, blendMode: Phaser.BlendModes.ADD, emitting: false,
      }).setDepth(25));
    });
    this.emitters.push(
      this.add.particles(width / 2, floorY, "particle-smoke", {
        lifespan: { min: 1400, max: 2600 }, speedY: { min: -30, max: -8 }, speedX: { min: -25, max: 25 },
        scale: { start: 0.8, end: 2.2 }, alpha: { start: 0.3, end: 0 }, frequency: 150,
        maxParticles: 24, emitting: false,
      }).setDepth(18),
      this.add.particles(width / 2, floorY + 24, "particle-dust", {
        lifespan: 900, speed: { min: 35, max: 85 }, angle: { min: 190, max: 350 },
        gravityY: 45, scale: { start: 0.7, end: 0 }, alpha: { start: 0.6, end: 0 }, maxParticles: 28, emitting: false,
      }).setDepth(31),
      this.add.particles(width / 2, floorY - height * 0.16, "particle-metal", {
        lifespan: 1100, speed: { min: 60, max: 125 }, angle: { min: 205, max: 335 }, gravityY: 130,
        rotate: { min: 0, max: 280 }, scale: { start: 0.7, end: 0.18 }, alpha: { start: 1, end: 0 }, maxParticles: 22,
        blendMode: Phaser.BlendModes.ADD, emitting: false,
      }).setDepth(35),
    );
  }

  private runCeremony(
    leftDoor: Phaser.GameObjects.Rectangle,
    rightDoor: Phaser.GameObjects.Rectangle,
    trophy: Phaser.GameObjects.Graphics,
    light: Phaser.GameObjects.Arc,
    ninja: FullBodyNinja,
    inscription: Phaser.GameObjects.Text,
    left: number,
    templeWidth: number,
  ) {
    const duration = this.reducedMotion ? 0 : 900;
    this.time.delayedCall(this.reducedMotion ? 0 : 380, () => {
      this.playBassImpact(false);
      this.emitters[0]?.start();
      this.emitters[1]?.start();
      this.tweens.add({ targets: leftDoor, x: left + 42, duration, ease: "Cubic.easeInOut" });
      this.tweens.add({ targets: rightDoor, x: left + templeWidth - 42, duration, ease: "Cubic.easeInOut" });
      this.cameras.main.zoomTo(1.07, duration, "Cubic.easeInOut");
    });
    this.time.delayedCall(this.reducedMotion ? 0 : 1260, () => {
      this.playBassImpact(true);
      this.emitters.slice(2).forEach((emitter) => emitter.explode(this.scale.width < 680 ? 10 : 18));
      this.cameras.main.flash(this.reducedMotion ? 0 : 260, 255, 206, 103, false);
      this.cameras.main.shake(this.reducedMotion ? 0 : 420, 0.006);
      this.tweens.add({ targets: light, alpha: 0.52, scale: 1.55, duration: this.reducedMotion ? 0 : 720, ease: "Sine.easeOut" });
      this.tweens.add({ targets: trophy, alpha: 1, y: "-=20", duration: this.reducedMotion ? 0 : 820, ease: "Back.easeOut" });
      this.tweens.add({ targets: ninja, x: this.scale.width * (this.scale.width < 680 ? 0.29 : 0.34), duration: this.reducedMotion ? 0 : 760, ease: "Cubic.easeOut" });
      ninja.playState("trophy_ceremony");
      this.tweens.add({ targets: inscription, alpha: 1, duration: this.reducedMotion ? 0 : 620, delay: this.reducedMotion ? 0 : 420 });
    });
  }

  private playBassImpact(final: boolean) {
    if (!(this.sound instanceof Phaser.Sound.WebAudioSoundManager)) return;
    const context = this.sound.context;
    if (context.state === "suspended") void context.resume();
    const now = context.currentTime;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(final ? 0.22 : 0.13, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (final ? 1.2 : 0.75));
    gain.connect(context.destination);
    const oscillator = context.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(final ? 92 : 72, now);
    oscillator.frequency.exponentialRampToValueAtTime(final ? 38 : 46, now + 0.58);
    oscillator.connect(gain);
    oscillator.start(now);
    oscillator.stop(now + (final ? 1.22 : 0.78));
  }

  private close() {
    gameBus.emit("game:scene", { scene: "world" });
    this.cameras.main.fadeOut(this.reducedMotion ? 0 : 260, 0, 0, 0);
    this.time.delayedCall(this.reducedMotion ? 0 : 260, () => {
      this.scene.resume("WorldScene");
      this.scene.stop();
    });
  }
}
