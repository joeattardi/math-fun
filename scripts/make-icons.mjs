// Renders the code-drawn app icon (an SVG built here) to PNGs for the PWA and iOS.
// Run with `npm run icons`; the PNGs are committed so builds don't need sharp.
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const svg = (pad = 0) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${pad ? 0 : 110}" fill="#2ec4f1"/>
  <g transform="translate(256 256) scale(${pad ? 0.78 : 1}) translate(-256 -256)">
    <circle cx="256" cy="420" r="230" fill="#06d6a0"/>
    <g transform="rotate(-12 160 220)">
      <rect x="70" y="110" width="180" height="210" rx="34" fill="#22223b"/>
      <rect x="62" y="100" width="180" height="210" rx="34" fill="#ff9f1c" stroke="#22223b" stroke-width="12"/>
      <text x="152" y="258" font-family="Arial Rounded MT Bold, Arial, sans-serif" font-weight="bold" font-size="140" text-anchor="middle" fill="#fff" stroke="#22223b" stroke-width="10" paint-order="stroke">2</text>
    </g>
    <g transform="rotate(10 350 220)">
      <rect x="278" y="100" width="180" height="210" rx="34" fill="#22223b"/>
      <rect x="270" y="90" width="180" height="210" rx="34" fill="#9b5de5" stroke="#22223b" stroke-width="12"/>
      <text x="360" y="248" font-family="Arial Rounded MT Bold, Arial, sans-serif" font-weight="bold" font-size="140" text-anchor="middle" fill="#ffd60a" stroke="#22223b" stroke-width="10" paint-order="stroke">5</text>
    </g>
    <path d="M150 470 L256 340 L362 470 Z" fill="#52b788" stroke="#22223b" stroke-width="12" stroke-linejoin="round"/>
    <path d="M200 470 l18 -36 l18 36 M276 470 l18 -36 l18 36" fill="#fff"/>
    <circle cx="230" cy="380" r="16" fill="#fff" stroke="#22223b" stroke-width="6"/>
    <circle cx="282" cy="380" r="16" fill="#fff" stroke="#22223b" stroke-width="6"/>
    <circle cx="234" cy="382" r="7" fill="#22223b"/>
    <circle cx="286" cy="382" r="7" fill="#22223b"/>
  </g>
</svg>`;

mkdirSync('public/icons', { recursive: true });
const jobs = [
  ['icon-192.png', 192, 0],
  ['icon-512.png', 512, 0],
  ['maskable-512.png', 512, 1],
  ['apple-touch-icon-180.png', 180, 1],
  ['favicon-64.png', 64, 0],
];
for (const [name, size, pad] of jobs) {
  await sharp(Buffer.from(svg(pad))).resize(size, size).png().toFile(`public/icons/${name}`);
  console.log('wrote', name);
}
