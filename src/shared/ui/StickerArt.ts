import Phaser from 'phaser';
import { colors } from '../theme';
import { drawStar } from './textures';

type G = Phaser.GameObjects.Graphics;
const INK = colors.ink;

function eyes(g: G, x: number, y: number, gap: number, r = 6): void {
  g.fillStyle(0xffffff, 1).fillCircle(x - gap, y, r + 3).fillCircle(x + gap, y, r + 3);
  g.fillStyle(INK, 1).fillCircle(x - gap + 1, y, r).fillCircle(x + gap + 1, y, r);
}

function smile(g: G, x: number, y: number, r: number): void {
  g.lineStyle(4, INK, 1).beginPath().arc(x, y, r, 0.2 * Math.PI, 0.8 * Math.PI).strokePath();
}

/** Each sticker is drawn at about a 60px radius around (0, 0). */
const ART: Record<string, (g: G) => void> = {
  'croc-crown': (g) => {
    g.fillStyle(0x52b788, 1).fillRoundedRect(-44, -18, 88, 50, 20).lineStyle(4, INK, 1).strokeRoundedRect(-44, -18, 88, 50, 20);
    for (let i = 0; i < 5; i++) g.fillStyle(0xffffff, 1).fillTriangle(-36 + i * 16, 12, -26 + i * 16, 12, -31 + i * 16, 22);
    eyes(g, 0, -20, 18);
    g.fillStyle(colors.yellow, 1).fillPoints([[-30, -34], [-30, -60], [-15, -45], [0, -64], [15, -45], [30, -60], [30, -34]].map(([x, y]) => new Phaser.Math.Vector2(x, y)), true);
    g.lineStyle(3, INK, 1).strokePoints([[-30, -34], [-30, -60], [-15, -45], [0, -64], [15, -45], [30, -60], [30, -34]].map(([x, y]) => new Phaser.Math.Vector2(x, y)), true, true);
  },
  'penguin-glasses': (g) => {
    g.fillStyle(0x2b2d42, 1).fillEllipse(0, 4, 80, 100).fillStyle(0xffffff, 1).fillEllipse(0, 14, 54, 70);
    eyes(g, 0, -18, 13, 5);
    g.lineStyle(4, colors.yellow, 1).strokeCircle(-13, -18, 12).strokeCircle(13, -18, 12);
    g.fillStyle(colors.orange, 1).fillTriangle(-8, -6, 8, -6, 0, 4);
  },
  'frog-cape': (g) => {
    g.fillStyle(colors.red, 1).fillTriangle(-40, -10, 40, -10, 0, 56);
    g.fillStyle(0x70e000, 1).fillEllipse(0, 10, 76, 54).lineStyle(4, INK, 1).strokeEllipse(0, 10, 76, 54);
    g.fillStyle(0x70e000, 1).fillCircle(-16, -18, 14).fillCircle(16, -18, 14);
    eyes(g, 0, -18, 16, 5);
    smile(g, 0, 6, 14);
    g.fillStyle(colors.yellow, 1).fillCircle(0, 28, 9);
  },
  'pizza-number': (g) => {
    g.fillStyle(0xf4a261, 1).fillTriangle(-46, -40, 46, -40, 0, 56).fillStyle(0xffd166, 1).fillTriangle(-38, -32, 38, -32, 0, 44);
    g.fillStyle(0xe76f51, 1).fillRoundedRect(-50, -52, 100, 18, 9);
    g.fillStyle(colors.red, 1).fillCircle(-12, -12, 8).fillCircle(14, -6, 8).fillCircle(0, 20, 7);
    eyes(g, 0, -20, 12, 4);
  },
  rocket: (g) => {
    g.fillStyle(colors.orange, 1).fillTriangle(-14, 34, 14, 34, 0, 64);
    g.fillStyle(colors.red, 1).fillTriangle(-30, 34, -14, 6, -14, 34).fillTriangle(30, 34, 14, 6, 14, 34);
    g.fillStyle(0xffffff, 1).fillEllipse(0, 0, 40, 90).lineStyle(4, INK, 1).strokeEllipse(0, 0, 40, 90);
    g.fillStyle(colors.blue, 1).fillCircle(0, -10, 11).lineStyle(3, INK, 1).strokeCircle(0, -10, 11);
  },
  'taco-cat': (g) => {
    g.fillStyle(0xffb703, 1).slice(0, 10, 50, Math.PI, 0, false).fillPath();
    g.fillStyle(0x80ed99, 1).fillEllipse(0, 0, 80, 14);
    g.fillStyle(colors.orange, 1).fillCircle(0, -16, 24).fillTriangle(-22, -28, -12, -36, -20, -50).fillTriangle(22, -28, 12, -36, 20, -50);
    eyes(g, 0, -20, 9, 4);
    g.fillStyle(colors.pink, 1).fillTriangle(-4, -10, 4, -10, 0, -6);
  },
  'rainbow-star': (g) => {
    [colors.red, colors.orange, colors.yellow, colors.green, colors.blue].forEach((c, i) => g.lineStyle(8, c, 1).beginPath().arc(0, 30, 56 - i * 8, Math.PI, 0).strokePath());
    drawStar(g, 0, 0, 30, colors.yellow, INK, 4);
    eyes(g, 0, -2, 8, 3);
  },
  donut: (g) => {
    g.fillStyle(0xe9c46a, 1).fillCircle(0, 0, 52).fillStyle(colors.purple, 1).fillCircle(0, -3, 46);
    g.fillStyle(0xffffff, 1).fillCircle(0, -3, 16).lineStyle(4, INK, 1).strokeCircle(0, 0, 52).strokeCircle(0, -3, 16);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      g.fillStyle(colors.confetti[i % 6], 1).fillRect(Math.cos(a) * 32 - 3, Math.sin(a) * 32 - 6, 6, 12);
    }
  },
  robot: (g) => {
    g.lineStyle(4, INK, 1).lineBetween(0, -46, 0, -60).fillStyle(colors.red, 1).fillCircle(0, -62, 7);
    g.fillStyle(0xadb5bd, 1).fillRoundedRect(-40, -46, 80, 70, 14).lineStyle(4, INK, 1).strokeRoundedRect(-40, -46, 80, 70, 14);
    g.fillStyle(colors.blue, 1).fillCircle(-16, -16, 11).fillCircle(16, -16, 11);
    g.fillStyle(INK, 1).fillRect(-20, 6, 40, 8);
    g.fillStyle(0xadb5bd, 1).fillRoundedRect(-30, 28, 60, 30, 8);
  },
  cactus: (g) => {
    g.fillStyle(0xbc6c25, 1).fillRoundedRect(-30, 30, 60, 30, 6);
    g.fillStyle(0x2a9d8f, 1).fillRoundedRect(-18, -50, 36, 84, 18).fillRoundedRect(-46, -20, 22, 40, 11).fillRoundedRect(24, -30, 22, 40, 11);
    eyes(g, 0, -24, 8, 4);
    smile(g, 0, -12, 9);
    g.fillStyle(colors.pink, 1).fillCircle(0, -54, 9);
  },
  ghost: (g) => {
    g.fillStyle(0xffffff, 1).fillCircle(0, -14, 40).fillRect(-40, -14, 80, 50);
    for (let i = 0; i < 4; i++) g.fillCircle(-30 + i * 20, 36, 10);
    g.lineStyle(4, INK, 1).strokeCircle(0, -14, 40);
    g.fillStyle(INK, 1).fillEllipse(-14, -18, 12, 18).fillEllipse(14, -18, 12, 18).fillEllipse(0, 6, 18, 14);
  },
  banana: (g) => {
    g.lineStyle(26, colors.yellow, 1).beginPath().arc(0, -30, 56, 0.25 * Math.PI, 0.8 * Math.PI).strokePath();
    g.fillStyle(0x7f5539, 1).fillCircle(40, 10, 6);
    eyes(g, -4, 18, 10, 4);
    g.fillStyle(0xffffff, 0.8).fillCircle(-44, -40, 10).fillCircle(44, -46, 6).fillCircle(30, -60, 4);
  },
  octopus: (g) => {
    for (let i = 0; i < 6; i++) g.lineStyle(12, colors.pink, 1).lineBetween(-30 + i * 12, 10, -40 + i * 16, 50);
    g.fillStyle(colors.pink, 1).fillCircle(0, -12, 38).lineStyle(4, INK, 1).strokeCircle(0, -12, 38);
    eyes(g, 0, -16, 14, 5);
    smile(g, 0, -4, 10);
  },
  burger: (g) => {
    g.fillStyle(0xf4a261, 1).slice(0, -10, 50, Math.PI, 0, false).fillPath();
    g.fillStyle(0x80ed99, 1).fillRoundedRect(-54, -10, 108, 12, 6);
    g.fillStyle(0x7f5539, 1).fillRoundedRect(-50, 2, 100, 20, 10);
    g.fillStyle(colors.yellow, 1).fillTriangle(-50, 2, 50, 2, 30, 14);
    g.fillStyle(0xf4a261, 1).fillRoundedRect(-50, 22, 100, 22, 11);
    eyes(g, 0, -30, 14, 5);
  },
  dino: (g) => {
    g.fillStyle(0x06d6a0, 1).fillEllipse(-4, 16, 80, 56).fillRoundedRect(10, -50, 36, 70, 18).fillEllipse(34, -46, 50, 32);
    g.fillTriangle(-40, 16, -66, 32, -36, 34);
    for (let i = 0; i < 4; i++) g.fillStyle(colors.orange, 1).fillTriangle(-30 + i * 14, -10 + i * 2, -18 + i * 14, -10 + i * 2, -24 + i * 14, -24 + i * 2);
    g.fillStyle(INK, 1).fillCircle(40, -52, 5);
    g.fillStyle(INK, 1).fillRect(-26, -64, 30, 8).fillRect(-14, -72, 6, 10);
  },
  trophy: (g) => {
    g.fillStyle(colors.yellow, 1).fillRoundedRect(-30, -50, 60, 56, 16).fillRect(-8, 6, 16, 22).fillRoundedRect(-30, 28, 60, 16, 6);
    g.lineStyle(8, colors.yellow, 1).strokeCircle(-34, -30, 14).strokeCircle(34, -30, 14);
    g.lineStyle(4, INK, 1).strokeRoundedRect(-30, -50, 60, 56, 16);
    drawStar(g, 0, -24, 14, 0xffffff);
  },
};

/** Draw a sticker with a white die-cut border. Locked stickers draw as a blank gray disc (scenes add a "?"). */
export function drawSticker(g: G, id: string, locked = false): void {
  g.fillStyle(INK, 0.25).fillCircle(4, 6, 66);
  g.fillStyle(0xffffff, 1).fillCircle(0, 0, 66).lineStyle(4, INK, 1).strokeCircle(0, 0, 66);
  if (locked) {
    g.fillStyle(0xdee2e6, 1).fillCircle(0, 0, 58);
    return;
  }
  (ART[id] ?? ART.trophy)(g);
}
