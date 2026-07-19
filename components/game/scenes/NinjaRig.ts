import * as Phaser from "phaser";

type MeshBase = { x: number; y: number; z: number };

export class NinjaRig extends Phaser.GameObjects.Container {
  private readonly torso: Phaser.GameObjects.Image;
  private readonly head: Phaser.GameObjects.Image;
  private readonly leftArm: Phaser.GameObjects.Image;
  private readonly rightArm: Phaser.GameObjects.Image;
  private readonly leftLeg: Phaser.GameObjects.Image;
  private readonly rightLeg: Phaser.GameObjects.Image;
  private readonly sword: Phaser.GameObjects.Image;
  private readonly eyes: Phaser.GameObjects.Image;
  private readonly bands: Phaser.GameObjects.Plane;
  private readonly waistCloth: Phaser.GameObjects.Plane;
  private readonly shoulderCloth: Phaser.GameObjects.Plane;
  private readonly meshBases = new Map<Phaser.GameObjects.Plane, MeshBase[]>();
  private elapsed = 0;
  private reducedMotion = false;

  constructor(scene: Phaser.Scene, x: number, y: number, scale = 1) {
    super(scene, x, y);
    scene.add.existing(this);
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const part = (frame: number, px: number, py: number, size = 174) => scene.add.image(px, py, "ninja-parts", frame)
      .setDisplaySize(size, size)
      .setOrigin(0.5);

    const shadow = part(11, 0, 112, 188).setAlpha(0.58).setTint(0x07100d);
    this.leftLeg = part(4, -31, 55, 176).setAngle(-3);
    this.rightLeg = part(5, 32, 55, 176).setAngle(3);
    this.torso = part(0, 0, -33, 184);
    this.leftArm = part(2, -54, -42, 174).setAngle(-12);
    this.rightArm = part(3, 55, -42, 174).setAngle(10);
    this.sword = part(6, 58, -22, 186).setAngle(13);
    this.head = part(1, 0, -116, 170);
    this.eyes = part(10, 0, -114, 166).setAlpha(0.75).setBlendMode(Phaser.BlendModes.ADD);

    this.bands = this.makeClothPlane(scene, 7, -67, -126, 162);
    this.waistCloth = this.makeClothPlane(scene, 8, -4, 20, 184);
    this.shoulderCloth = this.makeClothPlane(scene, 9, -8, -70, 174);

    this.add([
      shadow,
      this.bands,
      this.leftLeg,
      this.rightLeg,
      this.waistCloth,
      this.torso,
      this.sword,
      this.leftArm,
      this.rightArm,
      this.shoulderCloth,
      this.head,
      this.eyes,
    ]);
    this.setScale(scale).setDepth(40);

    if (!this.reducedMotion) {
      scene.tweens.add({ targets: this, y: y - 3, duration: 1800, ease: "Sine.inOut", yoyo: true, repeat: -1 });
      scene.tweens.add({ targets: this.eyes, alpha: { from: 0.38, to: 1 }, duration: 1150, yoyo: true, repeat: -1 });
      scene.tweens.add({ targets: this.leftArm, angle: -7, duration: 2100, ease: "Sine.inOut", yoyo: true, repeat: -1 });
      scene.tweens.add({ targets: this.rightArm, angle: 6, duration: 2300, ease: "Sine.inOut", yoyo: true, repeat: -1 });
    }
  }

  update(_time: number, delta: number) {
    if (this.reducedMotion) return;
    this.elapsed += Math.min(delta, 34) / 1000;
    this.deform(this.bands, 0.028, 3.8, 1.1);
    this.deform(this.waistCloth, 0.014, 2.4, 2.6);
    this.deform(this.shoulderCloth, 0.01, 2, 4.1);
  }

  celebrate() {
    const scene = this.scene;
    scene.tweens.killTweensOf([this.sword, this, this.rightArm]);
    scene.tweens.chain({
      targets: this.sword,
      tweens: [
        { angle: -42, x: 28, duration: 150, ease: "Cubic.out" },
        { angle: 13, x: 58, duration: 460, ease: "Back.out" },
      ],
    });
    scene.tweens.chain({
      targets: this,
      tweens: [
        { scaleX: this.scaleX * 1.04, scaleY: this.scaleY * 0.96, duration: 110 },
        { scaleX: this.scaleX, scaleY: this.scaleY, duration: 380, ease: "Back.out" },
      ],
    });
  }

  private makeClothPlane(scene: Phaser.Scene, frame: number, x: number, y: number, height: number) {
    const plane = scene.add.plane(x, y, "ninja-parts", frame, 4, 3, false);
    plane.setViewHeight(height);
    plane.setDepth(1);
    this.meshBases.set(plane, plane.vertices.map((vertex) => ({ x: vertex.x, y: vertex.y, z: vertex.z })));
    return plane;
  }

  private deform(plane: Phaser.GameObjects.Plane, strength: number, speed: number, phase: number) {
    const base = this.meshBases.get(plane);
    if (!base) return;
    plane.vertices.forEach((vertex, index) => {
      const origin = base[index];
      vertex.x = origin.x + Math.sin(this.elapsed * speed + index * 0.72 + phase) * strength;
      vertex.y = origin.y + Math.cos(this.elapsed * speed * 0.72 + index * 0.44 + phase) * strength * 0.7;
    });
  }
}
