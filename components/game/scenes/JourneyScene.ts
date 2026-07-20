import * as Phaser from "phaser";
import { gameBus } from "@/components/game/event-bus";
import { addDays, daysBetween, JOURNEY_END, JOURNEY_START, journeyDayState } from "@/components/game/game-math";
import { COLORS, makePixelButton, PIXEL_FONT, playRuneSound } from "@/components/game/scenes/scene-utils";

const LANDMARKS = ["CASA", "PONTE", "PORTAL", "FORJA", "TEMPLO", "TORRE", "SANTUÁRIO"];

export class JourneyScene extends Phaser.Scene {
  private dragging = false;
  private dragStartY = 0;
  private cameraStartY = 0;

  constructor() {
    super("JourneyScene");
  }

  create() {
    gameBus.emit("game:scene", { scene: "journey" });
    const snapshot = gameBus.getSnapshot();
    const { width, height } = this.scale;
    const compact = width < 680;
    const totalDays = daysBetween(JOURNEY_START, JOURNEY_END) + 1;
    const weekCount = Math.ceil(totalDays / 7);
    const rowHeight = compact ? 104 : 126;
    const top = compact ? 142 : 168;
    const contentHeight = Math.max(height, top + weekCount * rowHeight + 150);

    this.cameras.main.setBackgroundColor(0x050a0e).setBounds(0, 0, width, contentHeight);
    const background = this.add.image(width / 2, contentHeight / 2, "kage-world-base").setDisplaySize(width * 1.8, contentHeight).setTint(0x243449).setAlpha(0.15).setDepth(-20);
    void background;
    this.add.rectangle(width / 2, contentHeight / 2, width, contentHeight, 0x020708, 0.72).setDepth(-10);

    this.add.text(compact ? 14 : width / 2, 34, "CAMINHO ATÉ 01·11·2026", {
      fontFamily: PIXEL_FONT, fontSize: compact ? "8px" : "15px", color: "#e9e2cf", stroke: "#111814", strokeThickness: 7,
    }).setOrigin(compact ? 0 : 0.5, 0.5).setScrollFactor(0).setDepth(100);
    this.add.text(width / 2, compact ? 68 : 72, "15 CAPÍTULOS · SEGUNDA → DOMINGO", {
      fontFamily: PIXEL_FONT, fontSize: compact ? "5px" : "7px", color: "#a8a28f",
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

    const left = compact ? 34 : Math.max(82, width * 0.11);
    const right = width - left;
    const step = (right - left) / 6;
    const points: Phaser.Geom.Point[] = [];

    for (let dayIndex = 0; dayIndex < totalDays; dayIndex += 1) {
      const week = Math.floor(dayIndex / 7);
      const within = dayIndex % 7;
      const forward = week % 2 === 0;
      const x = forward ? left + within * step : right - within * step;
      const y = top + week * rowHeight;
      points.push(new Phaser.Geom.Point(x, y));
    }

    points.forEach((point, index) => {
      const date = addDays(JOURNEY_START, index);
      const state = snapshot ? journeyDayState(date, snapshot.today, snapshot.state.pillars, snapshot.state.checkins) : "future";
      this.drawPhysicalSegment(point, index, state, compact);

      if (index % 7 === 6 || index === totalDays - 1) {
        const week = Math.floor(index / 7);
        this.drawLandmark(point.x, point.y - (compact ? 39 : 48), week, state, compact);
      }

      if (index > 0 && index % 7 === 0) {
        const previous = points[index - 1];
        this.drawWeekTurn(previous, point, state, compact);
      }
    });

    const final = points.at(-1)!;
    this.drawTrophy(final.x, final.y - (compact ? 72 : 88), compact);
    this.add.text(final.x, final.y + (compact ? 31 : 39), snapshot?.state.settings.finalGoal ?? "UFPR", {
      fontFamily: PIXEL_FONT, fontSize: compact ? "6px" : "8px", color: "#ffe4a3", stroke: "#241702", strokeThickness: 5,
    }).setOrigin(0.5).setDepth(30);

    makePixelButton(this, width - (compact ? 68 : 92), 42, "VOLTAR", () => this.close(), COLORS.amber).setScrollFactor(0).setDepth(120);
    this.bindCamera(contentHeight, height);

    if (snapshot) {
      const currentIndex = Phaser.Math.Clamp(daysBetween(JOURNEY_START, snapshot.today), 0, totalDays - 1);
      this.cameras.main.scrollY = Phaser.Math.Clamp(points[currentIndex].y - height * 0.48, 0, Math.max(0, contentHeight - height));
    }
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.removeAllListeners();
      this.input.keyboard?.removeAllListeners();
    });
  }

  private drawPhysicalSegment(point: Phaser.Geom.Point, index: number, state: ReturnType<typeof journeyDayState>, compact: boolean) {
    const graphics = this.add.graphics().setDepth(10);
    const width = compact ? 25 : 36;
    const height = compact ? 11 : 15;
    const colors = {
      perfect: [0x8a826d, 0xe0d29e], missed: [0x45383b, 0x76545a], current: [0x8a6a32, 0xffd47c],
      rest: [0x4d6258, 0x81968b], future: [0x252e2c, 0x3e4b47],
    } as const;
    const [fill, edge] = colors[state];

    if (index % 7 === 2 || index % 7 === 5) {
      for (let plank = -1; plank <= 1; plank += 1) {
        graphics.fillStyle(fill, state === "future" ? 0.48 : 0.98).lineStyle(1, edge, 0.8)
          .fillRect(point.x - width / 2, point.y + plank * (height / 3) - 2, width, 4).strokeRect(point.x - width / 2, point.y + plank * (height / 3) - 2, width, 4);
      }
    } else {
      const skew = index % 2 ? 3 : -3;
      graphics.fillStyle(fill, state === "future" ? 0.45 : 0.98).lineStyle(2, edge, 0.75);
      graphics.fillPoints([
        new Phaser.Geom.Point(point.x - width / 2 + skew, point.y - height / 2),
        new Phaser.Geom.Point(point.x + width / 2, point.y - height / 2 + 2),
        new Phaser.Geom.Point(point.x + width / 2 - skew, point.y + height / 2),
        new Phaser.Geom.Point(point.x - width / 2, point.y + height / 2 - 2),
      ], true).strokePath();
    }

    if (state === "perfect") {
      graphics.lineStyle(1, 0xf0d98d, 0.75).beginPath().moveTo(point.x - 4, point.y).lineTo(point.x, point.y - 3).lineTo(point.x + 4, point.y).lineTo(point.x, point.y + 3).strokePath();
    } else if (state === "missed") {
      graphics.lineStyle(1, 0x1b1418, 0.9).beginPath().moveTo(point.x - 5, point.y - 4).lineTo(point.x + 1, point.y).lineTo(point.x - 2, point.y + 5).strokePath();
    }

    const hit = this.add.zone(point.x, point.y, width + 10, height + 18).setInteractive({ useHandCursor: true }).setDepth(20);
    hit.on("pointerover", () => graphics.setScale(1.12));
    hit.on("pointerout", () => graphics.setScale(1));
  }

  private drawWeekTurn(previous: Phaser.Geom.Point, next: Phaser.Geom.Point, state: ReturnType<typeof journeyDayState>, compact: boolean) {
    const graphics = this.add.graphics().setDepth(8);
    const steps = compact ? 5 : 6;
    for (let step = 1; step <= steps; step += 1) {
      const y = Phaser.Math.Linear(previous.y, next.y, step / (steps + 1));
      const width = (compact ? 22 : 30) - step * 1.2;
      graphics.fillStyle(state === "future" ? 0x25302d : 0x625f52, state === "future" ? 0.42 : 0.9)
        .lineStyle(1, state === "future" ? 0x3b4944 : 0x9d9580, 0.65)
        .fillRect(previous.x - width / 2, y - 3, width, 6).strokeRect(previous.x - width / 2, y - 3, width, 6);
    }
  }

  private drawLandmark(x: number, y: number, week: number, state: ReturnType<typeof journeyDayState>, compact: boolean) {
    const complete = state === "perfect";
    const color = complete ? 0xc7aa62 : state === "missed" ? 0x78565c : 0x4c5b56;
    const building = this.add.graphics().setDepth(15);
    const scale = compact ? 0.75 : 1;
    building.fillStyle(0x111716, 1).lineStyle(2, color, complete ? 0.95 : 0.58);
    building.fillTriangle(x - 19 * scale, y - 4 * scale, x, y - 20 * scale, x + 19 * scale, y - 4 * scale);
    building.fillRect(x - 15 * scale, y - 4 * scale, 30 * scale, 22 * scale).strokeRect(x - 15 * scale, y - 4 * scale, 30 * scale, 22 * scale);
    building.fillStyle(color, complete ? 0.9 : 0.3).fillRect(x - 4 * scale, y + 4 * scale, 8 * scale, 14 * scale);
    this.add.text(x, y + (compact ? 24 : 29), `${String(week + 1).padStart(2, "0")} · ${LANDMARKS[week % LANDMARKS.length]}`, {
      fontFamily: PIXEL_FONT, fontSize: compact ? "4px" : "5px", color: complete ? "#d9c58e" : "#77847e",
    }).setOrigin(0.5).setDepth(18);
  }

  private drawTrophy(x: number, y: number, compact: boolean) {
    const scale = compact ? 0.72 : 1;
    const trophy = this.add.graphics().setDepth(25);
    trophy.fillStyle(0xe0b550, 1).lineStyle(2, 0xffe5a1, 0.9);
    trophy.fillPoints([
      new Phaser.Geom.Point(x - 12 * scale, y - 14 * scale), new Phaser.Geom.Point(x + 12 * scale, y - 14 * scale),
      new Phaser.Geom.Point(x + 8 * scale, y + 3 * scale), new Phaser.Geom.Point(x + 3 * scale, y + 8 * scale),
      new Phaser.Geom.Point(x + 3 * scale, y + 16 * scale), new Phaser.Geom.Point(x + 10 * scale, y + 19 * scale),
      new Phaser.Geom.Point(x - 10 * scale, y + 19 * scale), new Phaser.Geom.Point(x - 3 * scale, y + 16 * scale),
      new Phaser.Geom.Point(x - 3 * scale, y + 8 * scale), new Phaser.Geom.Point(x - 8 * scale, y + 3 * scale),
    ], true).strokePath();
  }

  private bindCamera(contentHeight: number, viewportHeight: number) {
    this.input.keyboard?.once("keydown-ESC", () => this.close());
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.dragging = true;
      this.dragStartY = pointer.y;
      this.cameraStartY = this.cameras.main.scrollY;
    });
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!this.dragging) return;
      this.cameras.main.scrollY = Phaser.Math.Clamp(this.cameraStartY + this.dragStartY - pointer.y, 0, Math.max(0, contentHeight - viewportHeight));
    });
    this.input.on("pointerup", () => { this.dragging = false; });
    this.input.on("wheel", (_pointer: Phaser.Input.Pointer, _objects: unknown, _dx: number, dy: number) => {
      this.cameras.main.scrollY = Phaser.Math.Clamp(this.cameras.main.scrollY + dy * 0.45, 0, Math.max(0, contentHeight - viewportHeight));
    });
  }

  private close() {
    playRuneSound(this);
    gameBus.emit("game:scene", { scene: "world" });
    this.scene.resume("WorldScene");
    this.scene.stop();
  }
}
