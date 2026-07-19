import * as Phaser from "phaser";
import { gameBus } from "@/components/game/event-bus";
import { addDays, daysBetween, JOURNEY_END, JOURNEY_START, journeyDayState } from "@/components/game/game-math";
import { COLORS, makePixelButton, PIXEL_FONT, playRuneSound } from "@/components/game/scenes/scene-utils";

const LANDMARK_NAMES = ["CASA", "PONTE", "PORTAL", "FORJA", "TEMPLO", "TORRE", "SANTUÁRIO"];

export class JourneyScene extends Phaser.Scene {
  private dragging = false;
  private dragStartY = 0;
  private cameraStartY = 0;

  constructor() {
    super("JourneyScene");
  }

  create() {
    const snapshot = gameBus.getSnapshot();
    const { width, height } = this.scale;
    const compact = width < 680;
    const totalDays = daysBetween(JOURNEY_START, JOURNEY_END) + 1;
    const weekCount = Math.ceil(totalDays / 7);
    const rowHeight = compact ? 70 : 92;
    const top = compact ? 132 : 150;
    const contentHeight = top + weekCount * rowHeight + 110;

    this.cameras.main.setBackgroundColor(0x020706).setBounds(0, 0, width, Math.max(contentHeight, height));
    const background = this.add.tileSprite(0, 0, width, contentHeight, "dojo-world")
      .setOrigin(0).setTint(0x1c3730).setAlpha(0.22).setScrollFactor(0.2);
    background.tileScaleX = compact ? 0.75 : 1;
    background.tileScaleY = compact ? 0.75 : 1;

    const veil = this.add.graphics().fillStyle(0x020605, 0.76).fillRect(0, 0, width, contentHeight).setDepth(-1);
    void veil;
    this.add.text(width / 2, 30, "CAMINHO ATÉ O DESTINO", {
      fontFamily: PIXEL_FONT, fontSize: compact ? "12px" : "17px", color: "#d7ffe9",
      stroke: "#063d30", strokeThickness: 7, align: "center",
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);
    this.add.text(width / 2, compact ? 58 : 64, `CAPÍTULOS · ${JOURNEY_START.split("-").reverse().join("/")} → 01/11/2026`, {
      fontFamily: PIXEL_FONT, fontSize: compact ? "6px" : "8px", color: "#9d8670",
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

    const left = compact ? 42 : Math.max(88, width * 0.12);
    const right = width - left;
    const step = (right - left) / 6;
    const path = this.add.graphics().setDepth(4);
    const points: Phaser.Geom.Point[] = [];
    for (let dayIndex = 0; dayIndex < totalDays; dayIndex += 1) {
      const week = Math.floor(dayIndex / 7);
      const withinWeek = dayIndex % 7;
      const direction = week % 2 === 0 ? 1 : -1;
      const x = direction === 1 ? left + withinWeek * step : right - withinWeek * step;
      const y = top + week * rowHeight;
      points.push(new Phaser.Geom.Point(x, y));
    }
    path.lineStyle(compact ? 5 : 7, 0x10241d, 1).strokePoints(points, false, false);
    path.lineStyle(2, 0x376c55, 0.5).strokePoints(points, false, false);

    points.forEach((point, dayIndex) => {
      const date = addDays(JOURNEY_START, dayIndex);
      const state = snapshot ? journeyDayState(date, snapshot.today, snapshot.state.pillars, snapshot.state.checkins) : "future";
      const color = state === "perfect" ? COLORS.jade : state === "missed" ? COLORS.danger : state === "current" ? COLORS.amber : state === "rest" ? 0x718077 : 0x27342f;
      const radius = state === "current" ? (compact ? 7 : 9) : compact ? 4 : 5;
      const node = this.add.circle(point.x, point.y, radius, color, state === "future" ? 0.38 : 0.95).setDepth(8);
      if (state === "perfect") node.setStrokeStyle(2, 0xb9ffe5, 0.75);
      if (state === "current") {
        node.setStrokeStyle(3, 0xffe4a6, 0.95);
        if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          this.tweens.add({ targets: node, scale: 1.55, alpha: 0.55, duration: 760, yoyo: true, repeat: -1 });
        }
      }
      if (dayIndex % 7 === 6 || dayIndex === totalDays - 1) {
        const week = Math.floor(dayIndex / 7);
        const propFrame = `landmark-${week % 7}`;
        const landmark = this.add.image(point.x, point.y - (compact ? 24 : 31), "world-props", propFrame)
          .setScale(compact ? 0.075 : 0.105)
          .setDepth(6)
          .setTint(state === "future" ? 0x4a5651 : state === "missed" ? 0x8d5b5b : 0xb8ead3)
          .setAlpha(state === "future" ? 0.45 : 0.9);
        this.add.text(point.x, point.y + (compact ? 13 : 17), `${week + 1} · ${LANDMARK_NAMES[week % LANDMARK_NAMES.length]}`, {
          fontFamily: PIXEL_FONT, fontSize: compact ? "4px" : "6px", color: state === "future" ? "#52615a" : "#a7bdb2",
        }).setOrigin(0.5, 0).setDepth(9);
        landmark.setInteractive({ useHandCursor: true }).on("pointerup", () => {
          playRuneSound(this);
          this.cameras.main.pan(point.x, point.y, 280, "Cubic.easeOut");
        });
      }
      if (dayIndex % 28 === 0) {
        const chapter = Math.floor(dayIndex / 28) + 1;
        this.add.text(width / 2, point.y - rowHeight * 0.48, `CAPÍTULO ${String(chapter).padStart(2, "0")}`, {
          fontFamily: PIXEL_FONT, fontSize: compact ? "6px" : "8px", color: "#8f7ac4",
        }).setOrigin(0.5).setDepth(7);
      }
    });

    const endPoint = points.at(-1)!;
    this.add.image(endPoint.x, endPoint.y - (compact ? 42 : 55), "relics", "relic-5")
      .setScale(compact ? 0.12 : 0.17).setTint(0xffe091).setDepth(18);
    this.add.text(endPoint.x, endPoint.y + 27, snapshot?.state.settings.finalGoal ?? "UFPR", {
      fontFamily: PIXEL_FONT, fontSize: compact ? "7px" : "9px", color: "#ffe7a8", stroke: "#3d2206", strokeThickness: 5,
    }).setOrigin(0.5).setDepth(20);

    makePixelButton(this, width - (compact ? 70 : 96), 38, "VOLTAR", () => this.close(), COLORS.amber)
      .setScrollFactor(0).setDepth(120);
    this.input.keyboard?.once("keydown-ESC", () => this.close());

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.dragging = true;
      this.dragStartY = pointer.y;
      this.cameraStartY = this.cameras.main.scrollY;
    });
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!this.dragging) return;
      this.cameras.main.scrollY = Phaser.Math.Clamp(this.cameraStartY + this.dragStartY - pointer.y, 0, Math.max(0, contentHeight - height));
    });
    this.input.on("pointerup", () => { this.dragging = false; });
    this.input.on("wheel", (_pointer: Phaser.Input.Pointer, _objects: unknown, _dx: number, dy: number) => {
      this.cameras.main.scrollY = Phaser.Math.Clamp(this.cameras.main.scrollY + dy * 0.45, 0, Math.max(0, contentHeight - height));
    });

    if (snapshot) {
      const currentIndex = Phaser.Math.Clamp(daysBetween(JOURNEY_START, snapshot.today), 0, totalDays - 1);
      const currentPoint = points[currentIndex];
      this.cameras.main.scrollY = Phaser.Math.Clamp(currentPoint.y - height * 0.48, 0, Math.max(0, contentHeight - height));
    }
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.removeAllListeners();
      this.input.keyboard?.removeAllListeners();
    });
  }

  private close() {
    playRuneSound(this);
    this.scene.resume("WorldScene");
    this.scene.stop();
  }
}
