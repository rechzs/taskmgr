import * as Phaser from "phaser";
import type { NinjaState } from "@/components/game/game-state";

export type NinjaAnimation = NinjaState | "mission_complete" | "trophy_ceremony";

const ANIMATIONS: Array<{
  key: NinjaAnimation;
  texture: "ninja-actions-a" | "ninja-actions-b";
  start: number;
  end: number;
  frameRate: number;
  repeat: number;
}> = [
  { key: "idle", texture: "ninja-actions-a", start: 0, end: 3, frameRate: 3, repeat: -1 },
  { key: "idle_wind", texture: "ninja-actions-a", start: 4, end: 7, frameRate: 5, repeat: -1 },
  { key: "mission_complete", texture: "ninja-actions-a", start: 8, end: 11, frameRate: 7, repeat: 0 },
  { key: "victory", texture: "ninja-actions-a", start: 12, end: 15, frameRate: 5, repeat: 0 },
  { key: "failure", texture: "ninja-actions-b", start: 0, end: 3, frameRate: 4, repeat: 0 },
  { key: "meditation", texture: "ninja-actions-b", start: 4, end: 7, frameRate: 3, repeat: -1 },
  { key: "trophy_ceremony", texture: "ninja-actions-b", start: 8, end: 11, frameRate: 4, repeat: 0 },
];

export class FullBodyNinja extends Phaser.GameObjects.Sprite {
  private resting: NinjaState = "idle_wind";
  private reducedMotion: boolean;

  constructor(scene: Phaser.Scene, x: number, y: number, scale = 1) {
    super(scene, x, y, "ninja-actions-a", 0);
    scene.add.existing(this);
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.setOrigin(0.5, 0.94).setScale(scale).setDepth(35);
    this.ensureAnimations();
    this.play("idle_wind");
  }

  setResting(state: NinjaState) {
    this.resting = state;
    this.playState(state);
  }

  playState(state: NinjaAnimation, returnToRest = false) {
    this.stop();
    if (this.reducedMotion) {
      const definition = ANIMATIONS.find((animation) => animation.key === state)!;
      this.setTexture(definition.texture, definition.end);
      if (returnToRest) this.scene.time.delayedCall(240, () => this.playState(this.resting));
      return;
    }
    this.play(state, true);
    if (returnToRest) this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => this.playState(this.resting));
  }

  private ensureAnimations() {
    ANIMATIONS.forEach((definition) => {
      if (this.scene.anims.exists(definition.key)) return;
      this.scene.anims.create({
        key: definition.key,
        frames: this.scene.anims.generateFrameNumbers(definition.texture, { start: definition.start, end: definition.end }),
        frameRate: definition.frameRate,
        repeat: definition.repeat,
      });
    });
  }
}
