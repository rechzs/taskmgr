import * as Phaser from "phaser";
import { gameBus, type GameSnapshot } from "@/components/game/event-bus";
import { deriveWorldState, roleForPillar, type PillarRole, type WorldProjection } from "@/components/game/game-state";
import { FullBodyNinja } from "@/components/game/scenes/FullBodyNinja";
import { cover, PIXEL_FONT, playRuneSound } from "@/components/game/scenes/scene-utils";

const ROLE_COLOR: Record<PillarRole, number> = {
  training: 0xff7a32,
  diet: 0x6ee79a,
  study: 0x9b8cff,
};

const ROLE_LABEL: Record<PillarRole, string> = {
  training: "FERRO",
  diet: "VIDA",
  study: "SABER",
};

export class WorldScene extends Phaser.Scene {
  private snapshot: GameSnapshot | null = null;
  private projection: WorldProjection | null = null;
  private ninja?: FullBodyNinja;
  private atmosphere?: Phaser.GameObjects.Rectangle;
  private path?: Phaser.GameObjects.Graphics;
  private altars = new Map<PillarRole, Phaser.GameObjects.Container>();
  private buildingLights = new Map<PillarRole, Phaser.GameObjects.Arc>();
  private unsubs: Array<() => void> = [];
  private reducedMotion = false;
  private interactionsLocked = false;

  constructor() {
    super("WorldScene");
  }

  create() {
    this.snapshot = gameBus.getSnapshot();
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.buildWorld();
    this.bindEvents();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.rebuild, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
    gameBus.emit("game:scene", { scene: "world" });
    gameBus.emit("game:ready", { scene: "WorldScene" });
  }

  private buildWorld() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(0x071019).setScroll(0, 0).setZoom(1);

    const background = this.add.image(width / 2, height / 2, "kage-world-base").setDepth(-20);
    cover(background, width, height);

    const depthVeil = this.add.graphics().setDepth(-10);
    depthVeil.fillGradientStyle(0x07101b, 0x07101b, 0x08100f, 0x08100f, 0.18, 0.18, 0.02, 0.28).fillRect(0, 0, width, height);
    depthVeil.fillStyle(0x010403, 0.2).fillRect(0, height * 0.78, width, height * 0.22);

    this.createBuildingLights(width, height);
    this.createPhysicalPath(width, height);
    this.createAltars(width, height);

    const ninjaScale = Phaser.Math.Clamp(Math.min(width / 760, height / 720), 0.62, 1.04);
    this.ninja = new FullBodyNinja(this, width / 2, height * (width < 680 ? 0.84 : 0.82), ninjaScale);
    this.add.ellipse(this.ninja.x, this.ninja.y - 4, 130 * ninjaScale, 24 * ninjaScale, 0x010403, 0.5).setDepth(30);
    this.ninja.setDepth(35);

    this.atmosphere = this.add.rectangle(width / 2, height / 2, width, height, 0x16344a, 0).setDepth(22).setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.createWorldInteractions(width, height);
    this.applySnapshot(this.snapshot);
  }

  private createBuildingLights(width: number, height: number) {
    const compact = width < 680;
    const positions: Record<PillarRole, [number, number, number]> = {
      training: [compact ? 0.1 : 0.13, compact ? 0.59 : 0.61, compact ? 42 : 74],
      diet: [compact ? 0.9 : 0.87, compact ? 0.6 : 0.61, compact ? 42 : 74],
      study: [0.5, compact ? 0.38 : 0.4, compact ? 48 : 88],
    };
    (Object.keys(positions) as PillarRole[]).forEach((role) => {
      const [x, y, radius] = positions[role];
      const light = this.add.circle(width * x, height * y, radius, ROLE_COLOR[role], 0.08)
        .setDepth(4)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.buildingLights.set(role, light);
      if (!this.reducedMotion) this.tweens.add({ targets: light, scale: 1.12, alpha: 0.14, duration: 1500 + x * 700, yoyo: true, repeat: -1 });
    });
  }

  private createPhysicalPath(width: number, height: number) {
    this.path = this.add.graphics().setDepth(18);
    this.redrawPath(width, height, false);
    const zone = this.add.zone(width / 2, height * 0.89, Math.min(width * 0.7, 560), height * 0.2)
      .setInteractive({ useHandCursor: true }).setDepth(25);
    zone.on("pointerover", () => this.path?.setAlpha(1));
    zone.on("pointerout", () => this.path?.setAlpha(0.9));
    zone.on("pointerup", () => { if (!this.interactionsLocked) this.openJourney(); });
  }

  private redrawPath(width: number, height: number, impact: boolean) {
    if (!this.path) return;
    const transforms = this.projection?.pathTransforms ?? 0;
    const built = transforms % 21;
    const failed = this.projection?.atmosphere === "cold";
    const compact = width < 680;
    const tileCount = compact ? 8 : 12;
    const stoneWidth = compact ? 34 : 54;
    const stoneHeight = compact ? 13 : 17;
    this.path.clear().setAlpha(0.9);
    for (let index = 0; index < tileCount; index += 1) {
      const progress = index / Math.max(1, tileCount - 1);
      const y = height * (0.98 - progress * 0.28);
      const curve = Math.sin(progress * Math.PI * 2) * width * (compact ? 0.08 : 0.11);
      const x = width / 2 + curve;
      const isBuilt = index < Math.max(1, Math.ceil((built / 21) * tileCount));
      const fill = isBuilt ? (failed && index === Math.max(0, Math.ceil((built / 21) * tileCount) - 1) ? 0x45383a : 0x756f61) : 0x28302d;
      const edge = isBuilt ? 0xb0a891 : 0x3d4942;
      const skew = index % 2 ? 3 : -3;
      this.path.fillStyle(fill, isBuilt ? 0.96 : 0.66).lineStyle(2, edge, isBuilt ? 0.76 : 0.42);
      this.path.fillPoints([
        new Phaser.Geom.Point(x - stoneWidth / 2 + skew, y - stoneHeight / 2),
        new Phaser.Geom.Point(x + stoneWidth / 2, y - stoneHeight / 2 + 2),
        new Phaser.Geom.Point(x + stoneWidth / 2 - skew, y + stoneHeight / 2),
        new Phaser.Geom.Point(x - stoneWidth / 2, y + stoneHeight / 2 - 2),
      ], true).strokePath();
      if (isBuilt && index % 3 === 1) {
        this.path.lineStyle(1, failed ? 0x251d21 : 0xd5c48e, 0.7)
          .beginPath().moveTo(x - 5, y - 3).lineTo(x + 1, y + 1).lineTo(x - 2, y + 5).strokePath();
      }
    }
    if (impact && !this.reducedMotion) {
      this.tweens.add({ targets: this.path, alpha: 0.3, duration: 90, yoyo: true, repeat: 2 });
    }
  }

  private createAltars(width: number, height: number) {
    const compact = width < 680;
    const layout: Array<[PillarRole, number, number]> = compact
      ? [["training", 0.2, 0.75], ["study", 0.5, 0.79], ["diet", 0.8, 0.75]]
      : [["training", 0.34, 0.75], ["study", 0.5, 0.79], ["diet", 0.66, 0.75]];
    layout.forEach(([role, px, py]) => {
      const pedestal = this.add.graphics();
      pedestal.fillStyle(0x191d1b, 0.98).lineStyle(2, 0x746d5e, 0.9);
      pedestal.fillPoints([
        new Phaser.Geom.Point(-38, 14), new Phaser.Geom.Point(-31, -12), new Phaser.Geom.Point(-20, -23),
        new Phaser.Geom.Point(20, -23), new Phaser.Geom.Point(31, -12), new Phaser.Geom.Point(38, 14),
      ], true).strokePath();
      pedestal.fillStyle(0x090c0b, 1).fillRect(-25, -14, 50, 18);
      const rune = this.add.text(0, -5, role === "training" ? "火" : role === "diet" ? "生" : "智", {
        fontFamily: "serif", fontSize: compact ? "18px" : "21px", color: Phaser.Display.Color.IntegerToColor(ROLE_COLOR[role]).rgba,
      }).setOrigin(0.5);
      const label = this.add.text(0, 28, ROLE_LABEL[role], {
        fontFamily: PIXEL_FONT, fontSize: compact ? "5px" : "6px", color: "#c8d0c9", stroke: "#040706", strokeThickness: 4,
      }).setOrigin(0.5);
      const altar = this.add.container(width * px, height * py, [pedestal, rune, label])
        .setSize(82, 78).setDepth(38).setInteractive({ useHandCursor: true });
      altar.setData({ role, rune, pedestal, label });
      altar.on("pointerover", () => {
        altar.setScale(1.06);
        this.cameras.main.pan(altar.x, altar.y, this.reducedMotion ? 0 : 160, "Sine.easeOut");
      });
      altar.on("pointerout", () => altar.setScale(1));
      altar.on("pointerup", () => { if (!this.interactionsLocked) this.focusMissionAltar(altar); });
      this.altars.set(role, altar);
    });
  }

  private createWorldInteractions(width: number, height: number) {
    const temple = this.add.zone(width / 2, height * 0.15, Math.min(width * 0.28, 280), Math.max(70, height * 0.2))
      .setInteractive({ useHandCursor: true }).setDepth(24);
    temple.on("pointerup", () => {
      if (this.interactionsLocked) return;
      const trophies = this.snapshot?.state.stats.trophies ?? 0;
      if (trophies > 0) this.openTrophy();
      else this.openJourney();
    });
  }

  private focusMissionAltar(altar: Phaser.GameObjects.Container) {
    playRuneSound(this);
    this.cameras.main.pan(altar.x, altar.y + 35, this.reducedMotion ? 0 : 260, "Cubic.easeInOut");
    this.cameras.main.zoomTo(1.12, this.reducedMotion ? 0 : 260, "Cubic.easeInOut");
    this.time.delayedCall(this.reducedMotion ? 0 : 270, () => gameBus.emit("game:missions", { source: "altar" }));
  }

  private applySnapshot(snapshot: GameSnapshot | null) {
    if (!snapshot) return;
    this.snapshot = snapshot;
    this.projection = deriveWorldState(snapshot.today, snapshot.state.pillars, snapshot.state.checkins);
    this.ninja?.setResting(this.projection.ninja);
    this.applyAtmosphere();
    this.applyBuildings();
    this.redrawPath(this.scale.width, this.scale.height, false);
  }

  private applyAtmosphere() {
    if (!this.atmosphere || !this.projection) return;
    if (this.projection.atmosphere === "cold") this.atmosphere.setFillStyle(0x24405a, 0.16);
    else if (this.projection.atmosphere === "warm") this.atmosphere.setFillStyle(0x5b3217, 0.08);
    else if (this.projection.atmosphere === "calm") this.atmosphere.setFillStyle(0x163a34, 0.1);
    else this.atmosphere.setFillStyle(0x13283a, 0.06);
  }

  private applyBuildings() {
    if (!this.projection) return;
    (Object.keys(this.projection.buildings) as PillarRole[]).forEach((role) => {
      const state = this.projection!.buildings[role];
      const light = this.buildingLights.get(role);
      const altar = this.altars.get(role);
      const rune = altar?.getData("rune") as Phaser.GameObjects.Text | undefined;
      const label = altar?.getData("label") as Phaser.GameObjects.Text | undefined;
      const pillar = this.snapshot?.state.pillars.find((candidate) => roleForPillar(candidate) === role);
      if (light) light.setAlpha(state === "complete" ? 0.36 : state === "active" ? 0.17 : state === "rest" ? 0.08 : 0.025);
      if (rune) rune.setAlpha(state === "off" ? 0.28 : state === "rest" ? 0.55 : 1);
      if (label && pillar) label.setText(pillar.name.toLocaleUpperCase("pt-BR").slice(0, 12));
      altar?.setAlpha(state === "off" ? 0.68 : 1);
    });
  }

  private reactToMission(completedPillarIds: number[], allComplete: boolean, trophyAwarded: boolean) {
    if (!this.snapshot) return;
    const completedRoles = this.snapshot.state.pillars
      .filter((pillar) => completedPillarIds.includes(pillar.id))
      .map(roleForPillar);

    if (!completedRoles.length) {
      this.ninja?.playState("failure");
      this.cameras.main.shake(this.reducedMotion ? 0 : 280, 0.004);
      this.applySnapshot(this.snapshot);
      return;
    }

    this.ninja?.playState("mission_complete", true);
    completedRoles.forEach((role, index) => this.time.delayedCall(index * 160, () => this.activateBuilding(role)));
    this.redrawPath(this.scale.width, this.scale.height, true);
    this.cameras.main.shake(this.reducedMotion ? 0 : 240, 0.0035);
    if (allComplete) this.time.delayedCall(this.reducedMotion ? 0 : 900, () => this.ninja?.playState("victory", true));
    if (trophyAwarded) this.time.delayedCall(this.reducedMotion ? 50 : 1500, () => this.openTrophy());
  }

  private activateBuilding(role: PillarRole) {
    const light = this.buildingLights.get(role);
    if (!light) return;
    playRuneSound(this, role === "study");
    const texture = role === "training" ? "particle-ember" : role === "diet" ? "particle-leaf" : "particle-rune";
    const emitter = this.add.particles(light.x, light.y, texture, {
      lifespan: { min: 420, max: 900 },
      speed: role === "diet" ? { min: 18, max: 42 } : { min: 30, max: 80 },
      angle: role === "training" ? { min: 230, max: 310 } : { min: 190, max: 350 },
      gravityY: role === "training" ? 65 : role === "diet" ? 18 : -12,
      scale: { start: 0.7, end: 0 }, alpha: { start: 0.9, end: 0 },
      emitting: false, maxParticles: this.scale.width < 680 ? 12 : 20,
      blendMode: role === "diet" ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.ADD,
    }).setDepth(16);
    emitter.explode(this.scale.width < 680 ? 8 : 14);
    this.time.delayedCall(1200, () => emitter.destroy());
    if (!this.reducedMotion) this.tweens.add({ targets: light, alpha: 0.55, scale: 1.45, duration: 260, yoyo: true });
  }

  private bindEvents() {
    this.unsubs = [
      gameBus.on("react:state", (snapshot) => this.applySnapshot(snapshot)),
      gameBus.on("react:mission-saved", (result) => this.reactToMission(result.completedPillarIds, result.allComplete, result.trophyAwarded)),
      gameBus.on("react:open-journey", () => this.openJourney()),
      gameBus.on("react:open-trophy", (data) => this.openTrophy(data)),
      gameBus.on("react:pause", ({ paused }) => {
        if (paused) {
          this.interactionsLocked = true;
          return;
        }
        this.interactionsLocked = true;
        this.time.delayedCall(380, () => { this.interactionsLocked = false; });
      }),
      gameBus.on("react:resume-world", () => {
        this.cameras.main.pan(this.scale.width / 2, this.scale.height / 2, this.reducedMotion ? 0 : 250, "Cubic.easeOut");
        this.cameras.main.zoomTo(1, this.reducedMotion ? 0 : 250, "Cubic.easeOut");
      }),
    ];
    this.input.keyboard?.on("keydown-J", this.openJourney, this);
    this.input.keyboard?.on("keydown-T", () => this.openTrophy());
  }

  private openJourney() {
    playRuneSound(this);
    this.scene.pause();
    this.scene.launch("JourneyScene");
  }

  private openTrophy(data?: { trophyCount?: number; goal?: string }) {
    playRuneSound(this, true);
    this.scene.pause();
    this.scene.launch("TrophyScene", {
      trophyCount: data?.trophyCount ?? this.snapshot?.state.stats.trophies ?? 0,
      goal: data?.goal ?? this.snapshot?.state.settings.finalGoal ?? "UFPR",
    });
  }

  private rebuild() {
    this.scene.restart();
  }

  private cleanup() {
    this.unsubs.splice(0).forEach((unsubscribe) => unsubscribe());
    this.scale.off(Phaser.Scale.Events.RESIZE, this.rebuild, this);
    this.input.keyboard?.off("keydown-J", this.openJourney, this);
    this.input.removeAllListeners();
  }
}
