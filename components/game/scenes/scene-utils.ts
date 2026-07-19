import * as Phaser from "phaser";

export const COLORS = {
  ink: 0x020606,
  deep: 0x07110f,
  jade: 0x34d399,
  jadeSoft: 0x6ee7b7,
  violet: 0xa78bfa,
  amber: 0xf5b942,
  ember: 0xff6b2c,
  bone: 0xf5ead2,
  danger: 0xf87171,
};

export const PIXEL_FONT = '"Press Start 2P"';

export function cover(image: Phaser.GameObjects.Image, width: number, height: number, overscan = 1) {
  const frame = image.frame;
  const scale = Math.max(width / frame.realWidth, height / frame.realHeight) * overscan;
  image.setScale(scale);
}

export function makePixelButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onPress: () => void,
  color = COLORS.jade,
) {
  const compact = scene.scale.width < 620;
  const width = compact ? 116 : 154;
  const height = compact ? 40 : 46;
  const plate = scene.add.graphics();
  plate.fillStyle(0x07120f, 0.94).lineStyle(2, color, 0.75);
  plate.fillPoints([
    new Phaser.Geom.Point(-width / 2 + 8, -height / 2),
    new Phaser.Geom.Point(width / 2 - 5, -height / 2),
    new Phaser.Geom.Point(width / 2, -height / 2 + 8),
    new Phaser.Geom.Point(width / 2 - 8, height / 2),
    new Phaser.Geom.Point(-width / 2 + 4, height / 2 - 3),
    new Phaser.Geom.Point(-width / 2, height / 2 - 11),
  ], true);
  plate.strokePath();
  const text = scene.add.text(0, 1, label, {
    fontFamily: PIXEL_FONT,
    fontSize: compact ? "8px" : "9px",
    color: "#f4ead8",
    align: "center",
  }).setOrigin(0.5);
  const button = scene.add.container(x, y, [plate, text]).setSize(width, height).setInteractive({ useHandCursor: true });
  button.on("pointerover", () => { button.setScale(1.035); plate.setAlpha(1); });
  button.on("pointerout", () => button.setScale(1));
  button.on("pointerdown", () => button.setScale(0.97));
  button.on("pointerup", () => { button.setScale(1.035); onPress(); });
  return button;
}

export function playRuneSound(scene: Phaser.Scene, bright = false) {
  if (!(scene.sound instanceof Phaser.Sound.WebAudioSoundManager)) return;
  const context = scene.sound.context;
  if (context.state === "suspended") void context.resume();
  const now = context.currentTime;
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(bright ? 0.16 : 0.09, now + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + (bright ? 0.8 : 0.42));
  gain.connect(context.destination);
  [bright ? 392 : 164, bright ? 587 : 246].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    oscillator.type = index ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.18, now + 0.35);
    oscillator.connect(gain);
    oscillator.start(now + index * 0.045);
    oscillator.stop(now + (bright ? 0.82 : 0.45));
  });
}
