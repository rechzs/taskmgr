import * as Phaser from "phaser";
import { gameBus, type GameSnapshot } from "@/components/game/event-bus";
import { NinjaRig } from "@/components/game/scenes/NinjaRig";
import { COLORS, cover, PIXEL_FONT, playRuneSound } from "@/components/game/scenes/scene-utils";

export class WorldScene extends Phaser.Scene {
  private snapshot: GameSnapshot | null = null;
  private ninja?: NinjaRig;
  private altar?: Phaser.GameObjects.Container;
  private forgeGlow?: Phaser.GameObjects.Arc;
  private localizedEmitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  private unsubs: Array<() => void> = [];
  private reducedMotion = false;
  private readonly openJourneyKey = () => this.openJourney();
  private readonly openTrophyKey = () => this.openTrophy();

  constructor() {
    super("WorldScene");
  }

  create() {
    this.snapshot = gameBus.getSnapshot();
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.buildWorld();
    this.bindEvents();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.input.keyboard?.on("keydown-J", this.openJourneyKey);
    this.input.keyboard?.on("keydown-T", this.openTrophyKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
    gameBus.emit("game:scene", { scene: "world" });
    gameBus.emit("game:ready", { scene: "WorldScene" });
  }

  update(time: number, delta: number) {
    this.ninja?.update(time, delta);
  }

  private buildWorld() {
    const { width, height } = this.scale;
    const worldWidth = Math.max(width * 1.18, width + 180);
    const worldHeight = Math.max(height * 1.08, height + 60);
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight).setBackgroundColor(COLORS.ink);

    const far = this.add.image(worldWidth / 2, worldHeight / 2, "dojo-world").setTint(0x40504a).setAlpha(0.42).setScrollFactor(0.12).setDepth(-30);
    cover(far, worldWidth, worldHeight, 1.18);
    const background = this.add.image(worldWidth / 2, worldHeight / 2, "dojo-world").setTint(0xb8d0c5).setScrollFactor(0.52).setDepth(-20);
    cover(background, worldWidth, worldHeight, 1.08);

    const veil = this.add.graphics().setDepth(-10).setScrollFactor(0);
    veil.fillGradientStyle(0x010303, 0x010303, 0x071713, 0x071713, 0.3, 0.34, 0.46, 0.72).fillRect(0, 0, width, height);
    veil.fillStyle(0x020706, 0.36).fillRect(0, height * 0.76, width, height * 0.24);

    this.createGround(worldWidth, worldHeight);
    this.createLandmarks(worldWidth, worldHeight);
    this.createAltar(worldWidth, worldHeight);
    this.createLocalizedEffects(worldWidth, worldHeight);

    const ninjaScale = Phaser.Math.Clamp(Math.min(width / 760, height / 600), 0.92, 1.34);
    this.ninja = new NinjaRig(this, worldWidth * (width < 700 ? 0.51 : 0.49), worldHeight * (width < 700 ? 0.73 : 0.72), ninjaScale);

    this.add.text(worldWidth * 0.5, worldHeight * 0.14, "O CAMINHO RESPONDE À DISCIPLINA", {
      fontFamily: PIXEL_FONT,
      fontSize: width < 600 ? "8px" : "11px",
      color: "#9eb1a7",
      stroke: "#030706",
      strokeThickness: 5,
      align: "center",
    }).setOrigin(0.5).setDepth(20).setAlpha(0.76);

    this.cameras.main.centerOn(worldWidth / 2, worldHeight / 2);
  }

  private createGround(worldWidth: number, worldHeight: number) {
    const ground = this.add.graphics().setDepth(4);
    const y = worldHeight * 0.84;
    ground.fillStyle(0x07110d, 0.82).fillEllipse(worldWidth / 2, y + 25, Math.min(worldWidth * 0.72, 970), 130);
    ground.lineStyle(4, 0x1f392d, 0.7);
    ground.beginPath().moveTo(worldWidth * 0.18, y + 32);
    for (let index = 0; index <= 12; index += 1) {
      ground.lineTo(worldWidth * (0.18 + index * 0.054), y + 32 + Math.sin(index * 1.5) * 10);
    }
    ground.strokePath();
    for (let index = 0; index < 38; index += 1) {
      const x = worldWidth * 0.17 + (index / 37) * worldWidth * 0.66;
      const stoneY = y + 22 + Math.sin(index * 1.31) * 23;
      ground.fillStyle(index % 5 === 0 ? COLORS.jade : 0x183027, index % 5 === 0 ? 0.72 : 0.62);
      ground.fillRect(x, stoneY, index % 3 === 0 ? 11 : 7, index % 2 === 0 ? 6 : 4);
    }
  }

  private createLandmarks(worldWidth: number, worldHeight: number) {
    const compact = this.scale.width < 680;
    const viewportLeft = (worldWidth - this.scale.width) / 2;
    const viewportRight = viewportLeft + this.scale.width;
    const landmarks = [
      { frame: "landmark-0", x: compact ? viewportLeft + 48 : worldWidth * 0.13, y: 0.62, scale: 0.31, name: "MISSÕES" },
      { frame: "landmark-3", x: compact ? viewportRight - 50 : worldWidth * 0.82, y: 0.62, scale: 0.3, name: "JORNADA" },
      { frame: "landmark-7", x: compact ? viewportRight - 42 : worldWidth * 0.9, y: 0.34, scale: 0.26, name: "TROFÉUS" },
      { frame: "landmark-4", x: compact ? viewportLeft + 42 : worldWidth * 0.12, y: 0.3, scale: 0.23, name: "FORJA" },
    ];
    landmarks.forEach((landmark, index) => {
      const image = this.add.image(landmark.x, worldHeight * landmark.y, "world-props", landmark.frame)
        .setScale(landmark.scale)
        .setDepth(8)
        .setTint(index === 3 ? 0xffc881 : 0xc6ded2);
      if (index === 1 || index === 2) {
        image.setInteractive({ useHandCursor: true });
        image.on("pointerover", () => image.setTint(0xffffff));
        image.on("pointerout", () => image.setTint(index === 2 ? 0xf8ddb0 : 0xc6ded2));
        image.on("pointerup", () => {
          playRuneSound(this, index === 2);
          if (index === 1) this.openJourney();
          else this.openTrophy();
        });
      }
      this.add.text(image.x, image.y + image.displayHeight * 0.36, landmark.name, {
        fontFamily: PIXEL_FONT,
        fontSize: "7px",
        color: index === 2 ? "#ffd77a" : "#b7d9c8",
        stroke: "#020504",
        strokeThickness: 4,
      }).setOrigin(0.5).setDepth(12);
    });

    this.forgeGlow = this.add.circle(worldWidth * 0.12, worldHeight * 0.52, 28, COLORS.ember, 0.16).setBlendMode(Phaser.BlendModes.ADD).setDepth(7);
    if (!this.reducedMotion) this.tweens.add({ targets: this.forgeGlow, alpha: 0.42, scale: 1.32, duration: 600, yoyo: true, repeat: -1 });
  }

  private createAltar(worldWidth: number, worldHeight: number) {
    const viewportLeft = (worldWidth - this.scale.width) / 2;
    const x = this.scale.width < 680 ? viewportLeft + 88 : worldWidth * 0.2;
    const y = worldHeight * 0.71;
    const stone = this.add.graphics();
    stone.fillStyle(0x16231d, 1).lineStyle(3, 0x6b5940, 0.9);
    stone.fillPoints([
      new Phaser.Geom.Point(-72, 22), new Phaser.Geom.Point(-57, -20), new Phaser.Geom.Point(-39, -37),
      new Phaser.Geom.Point(41, -34), new Phaser.Geom.Point(64, -15), new Phaser.Geom.Point(75, 22),
    ], true).strokePath();
    stone.fillStyle(0x0a120f, 1).fillRect(-52, -22, 104, 31);
    const rune = this.add.text(0, -8, "◆  MISSÕES  ◆", { fontFamily: PIXEL_FONT, fontSize: "8px", color: "#7fffc5" }).setOrigin(0.5);
    this.altar = this.add.container(x, y, [stone, rune]).setSize(154, 82).setDepth(25).setInteractive({ useHandCursor: true });
    this.altar.on("pointerover", () => { this.altar?.setScale(1.04); rune.setColor("#ffffff"); });
    this.altar.on("pointerout", () => { this.altar?.setScale(1); rune.setColor("#7fffc5"); });
    this.altar.on("pointerup", () => this.openMissions("altar"));
  }

  private createLocalizedEffects(worldWidth: number, worldHeight: number) {
    const lowPower = this.renderer.type !== Phaser.WEBGL || window.innerWidth < 680;
    const multiplier = this.reducedMotion ? 0 : lowPower ? 0.55 : 1;
    if (!multiplier) return;
    const emitters = [
      this.add.particles(worldWidth * 0.12, worldHeight * 0.53, "particle-ember", {
        lifespan: { min: 420, max: 920 }, speedY: { min: -68, max: -28 }, speedX: { min: -18, max: 18 },
        scale: { start: 0.75, end: 0 }, alpha: { start: 0.9, end: 0 }, frequency: 95 / multiplier,
        quantity: 1, maxParticles: Math.round(22 * multiplier), blendMode: Phaser.BlendModes.ADD,
      }),
      this.add.particles(worldWidth * 0.2, worldHeight * 0.68, "particle-rune", {
        lifespan: 1600, speed: { min: 4, max: 18 }, angle: { min: 210, max: 330 },
        scale: { start: 0.55, end: 0.1 }, alpha: { start: 0.66, end: 0 }, frequency: 260 / multiplier,
        maxParticles: Math.round(14 * multiplier), blendMode: Phaser.BlendModes.ADD,
      }),
      this.add.particles(worldWidth * 0.75, worldHeight * 0.7, "particle-leaf", {
        lifespan: 2400, speedX: { min: -18, max: 30 }, speedY: { min: -12, max: 16 },
        rotate: { min: -120, max: 120 }, alpha: { start: 0.52, end: 0 }, frequency: 340 / multiplier,
        x: { min: -45, max: 45 }, y: { min: -15, max: 15 }, maxParticles: Math.round(12 * multiplier),
      }),
    ];
    emitters.forEach((emitter) => emitter.setDepth(32));
    this.localizedEmitters.push(...emitters);
  }

  private bindEvents() {
    this.unsubs.push(
      gameBus.on("react:state", (snapshot) => { this.snapshot = snapshot; }),
      gameBus.on("react:mission-saved", (result) => this.reactToMission(result)),
      gameBus.on("react:open-journey", () => this.openJourney()),
      gameBus.on("react:open-trophy", (data) => this.openTrophy(data)),
      gameBus.on("react:resume-world", () => {
        this.cameras.main.zoomTo(1, this.reducedMotion ? 0 : 260, "Cubic.easeOut");
        const bounds = this.cameras.main.getBounds();
        this.cameras.main.pan(bounds.centerX, bounds.centerY, this.reducedMotion ? 0 : 260, "Cubic.easeOut");
      }),
    );
  }

  private openMissions(source: "altar" | "hud") {
    if (!this.altar) return;
    playRuneSound(this);
    this.input.enabled = false;
    this.cameras.main.pan(this.altar.x, this.altar.y, this.reducedMotion ? 0 : 430, "Cubic.easeInOut");
    this.cameras.main.zoomTo(1.16, this.reducedMotion ? 0 : 430, "Cubic.easeInOut");
    this.time.delayedCall(this.reducedMotion ? 0 : 360, () => {
      gameBus.emit("game:missions", { source });
      this.time.delayedCall(220, () => { this.input.enabled = true; });
    });
  }

  private reactToMission(result: { completedPillarIds: number[]; allComplete: boolean; trophyAwarded: boolean }) {
    const { width, height } = this.scale;
    this.cameras.main.zoomTo(1, this.reducedMotion ? 0 : 320, "Cubic.easeOut");
    this.cameras.main.centerOn(width * 0.59, height * 0.54);
    if (!result.completedPillarIds.length) {
      this.cameras.main.flash(320, 90, 15, 20, false);
      this.cameras.main.shake(260, 0.006);
      playRuneSound(this);
      return;
    }
    this.ninja?.celebrate();
    this.forgeGlow?.setFillStyle(result.allComplete ? COLORS.jade : COLORS.amber, 0.5);
    this.cameras.main.shake(this.reducedMotion ? 0 : 180, 0.0035);
    this.cameras.main.flash(this.reducedMotion ? 0 : 180, 40, 180, 115, false);
    playRuneSound(this, result.allComplete);
    const x = this.ninja?.x ?? width / 2;
    const y = (this.ninja?.y ?? height / 2) - 110;
    const burst = this.add.particles(x, y, "particle-square", {
      lifespan: 650, speed: { min: 50, max: 145 }, angle: { min: 190, max: 350 },
      scale: { start: 1.2, end: 0 }, alpha: { start: 1, end: 0 }, quantity: lowQuantity(),
      emitting: false, maxParticles: 28, blendMode: Phaser.BlendModes.ADD,
    }).setDepth(80);
    burst.explode(lowQuantity());
    this.time.delayedCall(800, () => burst.destroy());
    if (result.trophyAwarded) this.time.delayedCall(900, () => {
      this.scene.launch("TrophyScene", { trophyCount: (this.snapshot?.state.stats.trophies ?? 0) + 1, goal: this.snapshot?.state.settings.finalGoal ?? "UFPR" });
      this.scene.pause();
    });
    function lowQuantity() { return window.innerWidth < 680 ? 12 : 24; }
  }

  private handleResize() {
    this.scene.restart();
  }

  private openJourney() {
    if (this.scene.isActive("JourneyScene")) return;
    playRuneSound(this);
    this.scene.launch("JourneyScene");
    this.scene.pause();
  }

  private openTrophy(data?: { trophyCount: number; goal: string }) {
    if (this.scene.isActive("TrophyScene")) return;
    playRuneSound(this, true);
    this.scene.launch("TrophyScene", data ?? {
      trophyCount: this.snapshot?.state.stats.trophies ?? 0,
      goal: this.snapshot?.state.settings.finalGoal ?? "UFPR",
    });
    this.scene.pause();
  }

  private cleanup() {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.input.keyboard?.off("keydown-J", this.openJourneyKey);
    this.input.keyboard?.off("keydown-T", this.openTrophyKey);
    this.unsubs.splice(0).forEach((unsubscribe) => unsubscribe());
    this.localizedEmitters.splice(0).forEach((emitter) => emitter.destroy());
  }
}
