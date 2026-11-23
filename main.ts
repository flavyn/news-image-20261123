// news-image-20261123 deterministic front-page renderer.
// Self-contained Node 22 program, standard library only, no network, deterministic.
// Draws one 1024x1024 PNG of the world news edition into MAKEFUN_OUTPUT_DIR.
// Story selection: prepared 2026-11-23 edition, 10 heroes and 20 briefs.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';


type RGB = readonly [number, number, number];

const W = 1024;
const H = 1024;
const pix = new Uint8Array(W * H * 3);
let clips = 0;
let overflows = 0;

const PAPER: RGB = [247, 244, 236];
const CARD: RGB = [255, 254, 250];
const INK: RGB = [18, 24, 32];
const MUTED: RGB = [92, 100, 110];
const RULE: RGB = [214, 208, 196];
const WHITE: RGB = [255, 255, 255];
const NAVY: RGB = [16, 23, 34];

function setPx(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) { clips++; return; }
  const i = (y * W + x) * 3;
  pix[i] = c[0]; pix[i + 1] = c[1]; pix[i + 2] = c[2];
}

function rect(x: number, y: number, w: number, h: number, c: RGB): void {
  if (x < 0 || y < 0 || x + w > W || y + h > H) clips++;
  const x0 = Math.max(0, Math.floor(x)), y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(W, Math.ceil(x + w)), y1 = Math.min(H, Math.ceil(y + h));
  for (let yy = y0; yy < y1; yy++) {
    const base = (yy * W + x0) * 3;
    for (let xx = x0; xx < x1; xx++) {
      pix[base + (xx - x0) * 3] = c[0];
      pix[base + (xx - x0) * 3 + 1] = c[1];
      pix[base + (xx - x0) * 3 + 2] = c[2];
    }
  }
}

function disc(cx: number, cy: number, r: number, c: RGB): void {
  const r2 = r * r;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy <= r2) setPx(x, y, c);
    }
  }
}

function ring(cx: number, cy: number, r: number, t: number, c: RGB): void {
  const ro = r * r, ri = (r - t) * (r - t);
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x - cx, dy = y - cy, d = dx * dx + dy * dy;
      if (d <= ro && d >= ri) setPx(x, y, c);
    }
  }
}

function seg(x0: number, y0: number, x1: number, y1: number, t: number, c: RGB): void {
  const dx = x1 - x0, dy = y1 - y0;
  const n = Math.max(Math.abs(dx), Math.abs(dy));
  if (n === 0) { rect(x0, y0, t, t, c); return; }
  for (let i = 0; i <= n; i++) {
    const x = Math.round(x0 + dx * i / n), y = Math.round(y0 + dy * i / n);
    rect(x - Math.floor(t / 2), y - Math.floor(t / 2), t, t, c);
  }
}

// 5x7 bitmap font: rows of 5 bits, low bit = leftmost pixel.
const FONT: Record<string, number[]> = {
  A: [0x0e,0x11,0x11,0x1f,0x11,0x11,0x11], B: [0x1e,0x11,0x11,0x1e,0x11,0x11,0x1e],
  C: [0x0f,0x10,0x10,0x10,0x10,0x10,0x0f], D: [0x1e,0x11,0x11,0x11,0x11,0x11,0x1e],
  E: [0x1f,0x10,0x10,0x1e,0x10,0x10,0x1f], F: [0x1f,0x10,0x10,0x1e,0x10,0x10,0x10],
  G: [0x0f,0x10,0x10,0x17,0x11,0x11,0x0f], H: [0x11,0x11,0x11,0x1f,0x11,0x11,0x11],
  I: [0x1f,0x04,0x04,0x04,0x04,0x04,0x1f], J: [0x07,0x02,0x02,0x02,0x02,0x12,0x0c],
  K: [0x11,0x12,0x14,0x18,0x14,0x12,0x11], L: [0x10,0x10,0x10,0x10,0x10,0x10,0x1f],
  M: [0x11,0x1b,0x15,0x15,0x11,0x11,0x11], N: [0x11,0x19,0x15,0x13,0x11,0x11,0x11],
  O: [0x0e,0x11,0x11,0x11,0x11,0x11,0x0e], P: [0x1e,0x11,0x11,0x1e,0x10,0x10,0x10],
  Q: [0x0e,0x11,0x11,0x11,0x15,0x12,0x0d], R: [0x1e,0x11,0x11,0x1e,0x14,0x12,0x11],
  S: [0x0f,0x10,0x10,0x0e,0x01,0x01,0x1e], T: [0x1f,0x04,0x04,0x04,0x04,0x04,0x04],
  U: [0x11,0x11,0x11,0x11,0x11,0x11,0x0e], V: [0x11,0x11,0x11,0x11,0x11,0x0a,0x04],
  W: [0x11,0x11,0x11,0x15,0x15,0x1b,0x11], X: [0x11,0x11,0x0a,0x04,0x0a,0x11,0x11],
  Y: [0x11,0x11,0x0a,0x04,0x04,0x04,0x04], Z: [0x1f,0x01,0x02,0x04,0x08,0x10,0x1f],
  0: [0x0e,0x11,0x13,0x15,0x19,0x11,0x0e], 1: [0x04,0x0c,0x04,0x04,0x04,0x04,0x0e],
  2: [0x0e,0x11,0x01,0x02,0x04,0x08,0x1f], 3: [0x1e,0x01,0x01,0x0e,0x01,0x01,0x1e],
  4: [0x02,0x06,0x0a,0x12,0x1f,0x02,0x02], 5: [0x1f,0x10,0x10,0x1e,0x01,0x01,0x1e],
  6: [0x0e,0x10,0x10,0x1e,0x11,0x11,0x0e], 7: [0x1f,0x01,0x02,0x04,0x08,0x08,0x08],
  8: [0x0e,0x11,0x11,0x0e,0x11,0x11,0x0e], 9: [0x0e,0x11,0x11,0x0f,0x01,0x01,0x0e],
  ' ': [0,0,0,0,0,0,0], '.': [0,0,0,0,0,0x0c,0x0c], ',': [0,0,0,0,0x0c,0x0c,0x04],
  ':': [0,0x0c,0x0c,0,0x0c,0x0c,0], '-': [0,0,0,0x1f,0,0,0], '/': [0x01,0x02,0x02,0x04,0x08,0x08,0x10],
  "'": [0x0c,0x0c,0x08,0,0,0,0], '!': [0x04,0x04,0x04,0x04,0x04,0,0x04],
  '?': [0x0e,0x11,0x01,0x02,0x04,0,0x04], '&': [0x0c,0x12,0x14,0x08,0x15,0x12,0x0d],
  '+': [0,0x04,0x04,0x1f,0x04,0x04,0], '#': [0x0a,0x1f,0x0a,0x0a,0x1f,0x0a,0],
};

function glyph(ch: string): number[] {
  return FONT[ch] ?? FONT['?'];
}

function textWidth(s: string, scale: number): number {
  return s.length === 0 ? 0 : s.length * 6 * scale - scale;
}

function text(x: number, y: number, s: string, scale: number, c: RGB): void {
  textInBox(x, y, W - x, H - y, s, scale, c);
}

function textInBox(x: number, y: number, boxW: number, boxH: number, s: string, scale: number, c: RGB): void {
  const up = s.toUpperCase();
  if (x < 0 || y < 0 || textWidth(up, scale) > boxW || 7 * scale > boxH) overflows++;
  for (let i = 0; i < up.length; i++) {
    const rows = glyph(up[i]);
    for (let r = 0; r < 7; r++) {
      const bits = rows[r];
      for (let b = 0; b < 5; b++) {
        if (bits & (1 << b)) {
          rect(x + i * 6 * scale + (4 - b) * scale, y + r * scale, scale, scale, c);
        }
      }
    }
  }
}

// ---- icons: bold pictograms drawn from rectangles, discs and lines ----
const RED: RGB = [206, 62, 52];
const ORANGE: RGB = [226, 126, 38];
const GREEN: RGB = [42, 138, 98];
const BLUE: RGB = [42, 106, 178];
const PURPLE: RGB = [116, 78, 168];
const BROWN: RGB = [140, 96, 54];
const TEAL: RGB = [24, 142, 150];
const GOLD: RGB = [214, 158, 34];

type IconFn = (cx: number, cy: number, s: number, c: RGB) => void;

const ICONS: Record<string, IconFn> = {
  missile(cx, cy, s, c) {
    rect(cx - s * 0.10, cy - s * 0.42, s * 0.20, s * 0.62, c);
    rect(cx - s * 0.06, cy - s * 0.50, s * 0.12, s * 0.10, c);
    rect(cx - s * 0.24, cy + s * 0.10, s * 0.14, s * 0.16, c);
    rect(cx + s * 0.10, cy + s * 0.10, s * 0.14, s * 0.16, c);
    disc(cx, cy - s * 0.18, s * 0.055, WHITE);
    rect(cx - s * 0.07, cy + s * 0.22, s * 0.14, s * 0.18, ORANGE);
  },
  ship(cx, cy, s, c) {
    rect(cx - s * 0.40, cy + s * 0.10, s * 0.80, s * 0.14, c);
    rect(cx - s * 0.28, cy + s * 0.24, s * 0.56, s * 0.10, c);
    rect(cx - s * 0.04, cy - s * 0.34, s * 0.08, s * 0.44, c);
    rect(cx, cy - s * 0.30, s * 0.28, s * 0.26, c);
    seg(cx - s * 0.44, cy + s * 0.40, cx + s * 0.44, cy + s * 0.40, s * 0.05, BLUE);
  },
  climate(cx, cy, s, c) {
    disc(cx, cy, s * 0.40, c);
    disc(cx - s * 0.14, cy - s * 0.08, s * 0.13, GREEN);
    disc(cx + s * 0.12, cy + s * 0.10, s * 0.16, GREEN);
    disc(cx + s * 0.06, cy - s * 0.20, s * 0.10, GREEN);
    seg(cx - s * 0.30, cy, cx + s * 0.30, cy, s * 0.03, WHITE);
  },
  flag(cx, cy, s, c) {
    rect(cx - s * 0.32, cy - s * 0.42, s * 0.08, s * 0.84, INK);
    rect(cx - s * 0.24, cy - s * 0.38, s * 0.52, s * 0.34, c);
    rect(cx - s * 0.24, cy + s * 0.04, s * 0.52, s * 0.20, WHITE);
    disc(cx + s * 0.02, cy - s * 0.21, s * 0.08, RED);
  },
  gavel(cx, cy, s, c) {
    rect(cx - s * 0.34, cy - s * 0.36, s * 0.68, s * 0.20, c);
    rect(cx - s * 0.05, cy - s * 0.18, s * 0.10, s * 0.44, BROWN);
    rect(cx - s * 0.30, cy + s * 0.28, s * 0.60, s * 0.10, INK);
  },
  chip(cx, cy, s, c) {
    rect(cx - s * 0.32, cy - s * 0.32, s * 0.64, s * 0.64, c);
    rect(cx - s * 0.18, cy - s * 0.18, s * 0.36, s * 0.36, NAVY);
    for (let k = -2; k <= 2; k++) {
      rect(cx + k * s * 0.14 - s * 0.02, cy - s * 0.44, s * 0.04, s * 0.12, c);
      rect(cx + k * s * 0.14 - s * 0.02, cy + s * 0.32, s * 0.04, s * 0.12, c);
      rect(cx - s * 0.44, cy + k * s * 0.14 - s * 0.02, s * 0.12, s * 0.04, c);
      rect(cx + s * 0.32, cy + k * s * 0.14 - s * 0.02, s * 0.12, s * 0.04, c);
    }
  },
  coin(cx, cy, s, c) {
    disc(cx, cy, s * 0.40, c);
    disc(cx, cy, s * 0.31, GOLD);
    rect(cx - s * 0.18, cy - s * 0.05, s * 0.36, s * 0.10, c);
    rect(cx - s * 0.18, cy + s * 0.06, s * 0.36, s * 0.10, c);
  },
  waves(cx, cy, s, c) {
    for (let k = -1; k <= 1; k++) {
      const yy = cy + k * s * 0.22;
      seg(cx - s * 0.42, yy, cx - s * 0.14, yy - s * 0.10, s * 0.06, c);
      seg(cx - s * 0.14, yy - s * 0.10, cx + s * 0.14, yy + s * 0.10, s * 0.06, c);
      seg(cx + s * 0.14, yy + s * 0.10, cx + s * 0.42, yy, s * 0.06, c);
    }
  },
  flame(cx, cy, s, c) {
    seg(cx, cy + s * 0.42, cx - s * 0.30, cy - s * 0.06, s * 0.10, c);
    seg(cx, cy + s * 0.42, cx + s * 0.30, cy - s * 0.06, s * 0.10, c);
    rect(cx - s * 0.30, cy - s * 0.10, s * 0.60, s * 0.52, c);
    seg(cx, cy + s * 0.40, cx - s * 0.14, cy + s * 0.04, s * 0.08, ORANGE);
    seg(cx, cy + s * 0.40, cx + s * 0.14, cy + s * 0.04, s * 0.08, ORANGE);
  },
  virus(cx, cy, s, c) {
    disc(cx, cy, s * 0.30, c);
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4;
      const px = cx + Math.cos(a) * s * 0.38, py = cy + Math.sin(a) * s * 0.38;
      disc(px, py, s * 0.07, c);
      seg(cx + Math.cos(a) * s * 0.28, cy + Math.sin(a) * s * 0.28, px, py, s * 0.05, c);
    }
    rect(cx - s * 0.05, cy - s * 0.16, s * 0.10, s * 0.32, WHITE);
    rect(cx - s * 0.16, cy - s * 0.05, s * 0.32, s * 0.10, WHITE);
  },
  trophy(cx, cy, s, c) {
    rect(cx - s * 0.26, cy - s * 0.36, s * 0.52, s * 0.34, c);
    ring(cx - s * 0.30, cy - s * 0.18, s * 0.12, s * 0.05, c);
    ring(cx + s * 0.30, cy - s * 0.18, s * 0.12, s * 0.05, c);
    rect(cx - s * 0.06, cy - s * 0.02, s * 0.12, s * 0.28, c);
    rect(cx - s * 0.24, cy + s * 0.26, s * 0.48, s * 0.10, c);
  },
  drone(cx, cy, s, c) {
    rect(cx - s * 0.20, cy - s * 0.12, s * 0.40, s * 0.24, c);
    seg(cx - s * 0.16, cy - s * 0.08, cx - s * 0.38, cy - s * 0.34, s * 0.05, c);
    seg(cx + s * 0.16, cy - s * 0.08, cx + s * 0.38, cy - s * 0.34, s * 0.05, c);
    seg(cx - s * 0.16, cy + s * 0.08, cx - s * 0.38, cy + s * 0.34, s * 0.05, c);
    seg(cx + s * 0.16, cy + s * 0.08, cx + s * 0.38, cy + s * 0.34, s * 0.05, c);
    ring(cx - s * 0.40, cy - s * 0.36, s * 0.11, s * 0.04, c);
    ring(cx + s * 0.40, cy - s * 0.36, s * 0.11, s * 0.04, c);
    ring(cx - s * 0.40, cy + s * 0.36, s * 0.11, s * 0.04, c);
    ring(cx + s * 0.40, cy + s * 0.36, s * 0.11, s * 0.04, c);
  },
  scales(cx, cy, s, c) {
    rect(cx - s * 0.05, cy - s * 0.38, s * 0.10, s * 0.72, c);
    rect(cx - s * 0.40, cy - s * 0.30, s * 0.80, s * 0.08, c);
    seg(cx - s * 0.38, cy - s * 0.24, cx - s * 0.38, cy + s * 0.04, s * 0.04, c);
    seg(cx + s * 0.38, cy - s * 0.24, cx + s * 0.38, cy + s * 0.04, s * 0.04, c);
    rect(cx - s * 0.50, cy + s * 0.04, s * 0.24, s * 0.06, c);
    rect(cx + s * 0.26, cy + s * 0.04, s * 0.24, s * 0.06, c);
    rect(cx - s * 0.30, cy + s * 0.34, s * 0.60, s * 0.08, c);
  },
  space(cx, cy, s, c) {
    rect(cx - s * 0.14, cy - s * 0.34, s * 0.28, s * 0.54, c);
    seg(cx, cy - s * 0.46, cx - s * 0.14, cy - s * 0.32, s * 0.09, c);
    seg(cx, cy - s * 0.46, cx + s * 0.14, cy - s * 0.32, s * 0.09, c);
    disc(cx, cy - s * 0.12, s * 0.07, WHITE);
    rect(cx - s * 0.24, cy + s * 0.20, s * 0.12, s * 0.18, c);
    rect(cx + s * 0.12, cy + s * 0.20, s * 0.12, s * 0.18, c);
    rect(cx - s * 0.10, cy + s * 0.22, s * 0.20, s * 0.24, ORANGE);
  },
  ballot(cx, cy, s, c) {
    rect(cx - s * 0.36, cy - s * 0.04, s * 0.72, s * 0.42, c);
    rect(cx - s * 0.22, cy - s * 0.36, s * 0.44, s * 0.34, WHITE);
    rect(cx - s * 0.16, cy - s * 0.24, s * 0.32, s * 0.06, c);
    seg(cx - s * 0.16, cy + s * 0.16, cx - s * 0.02, cy + s * 0.30, s * 0.06, WHITE);
    seg(cx - s * 0.02, cy + s * 0.30, cx + s * 0.20, cy, s * 0.06, WHITE);
  },
  people(cx, cy, s, c) {
    disc(cx, cy - s * 0.22, s * 0.13, c);
    rect(cx - s * 0.20, cy - s * 0.04, s * 0.40, s * 0.30, c);
    disc(cx - s * 0.30, cy - s * 0.12, s * 0.10, c);
    rect(cx - s * 0.44, cy + s * 0.02, s * 0.26, s * 0.22, c);
    disc(cx + s * 0.30, cy - s * 0.12, s * 0.10, c);
    rect(cx + s * 0.18, cy + s * 0.02, s * 0.26, s * 0.22, c);
  },
  bolt(cx, cy, s, c) {
    seg(cx + s * 0.16, cy - s * 0.42, cx - s * 0.16, cy + s * 0.04, s * 0.10, c);
    seg(cx - s * 0.16, cy + s * 0.04, cx + s * 0.06, cy + s * 0.04, s * 0.10, c);
    seg(cx + s * 0.06, cy + s * 0.04, cx - s * 0.12, cy + s * 0.42, s * 0.10, c);
  },
  wheat(cx, cy, s, c) {
    seg(cx, cy + s * 0.42, cx, cy - s * 0.38, s * 0.05, c);
    for (let k = 0; k < 4; k++) {
      const yy = cy - s * 0.30 + k * s * 0.20;
      disc(cx - s * 0.11, yy, s * 0.08, c);
      disc(cx + s * 0.11, yy, s * 0.08, c);
    }
  },
};

type Story = { lines: [string, string]; icon: string; color: RGB };

const HERO: Story[] = [
  { lines: ['TANKERS', 'ABLAZE'], icon: 'ship', color: RED },
  { lines: ['UKRAINE', 'STRIKES'], icon: 'missile', color: RED },
  { lines: ['HOUSE', 'SWEEP'], icon: 'ballot', color: BLUE },
  { lines: ['COP31', 'NO DEAL'], icon: 'climate', color: GREEN },
  { lines: ['SHIP', 'SUNK'], icon: 'drone', color: NAVY },
  { lines: ['WEST', 'BANK'], icon: 'flag', color: BROWN },
  { lines: ['FACTORY', 'FIRE'], icon: 'flame', color: ORANGE },
  { lines: ['AI EXAM', 'SCANDAL'], icon: 'chip', color: PURPLE },
  { lines: ['MERCURY', 'VISIT'], icon: 'space', color: TEAL },
  { lines: ['MOTOGP', 'TITLE 8'], icon: 'trophy', color: GOLD },
];

const STRIP: Story[] = [
  { lines: ['IOWA', 'BLAST'], icon: 'gavel', color: NAVY },
  { lines: ['GULF', 'ATTACK'], icon: 'ship', color: RED },
  { lines: ['SUDAN', 'DRONES'], icon: 'drone', color: RED },
  { lines: ['MILEY', 'WEDS'], icon: 'people', color: PURPLE },
  { lines: ['MEME', 'DINNER'], icon: 'people', color: BLUE },
  { lines: ['MELDRUM', 'DIES'], icon: 'people', color: NAVY },
  { lines: ['BYD', 'EU BAN'], icon: 'coin', color: TEAL },
  { lines: ['UK', 'HAVENS'], icon: 'coin', color: BROWN },
  { lines: ['BILLS', 'SOAR'], icon: 'bolt', color: GOLD },
  { lines: ['MEASLES', 'DEATH'], icon: 'virus', color: RED },
  { lines: ['MATH', 'PROOF'], icon: 'chip', color: TEAL },
  { lines: ['FBI', 'HACK'], icon: 'chip', color: PURPLE },
  { lines: ['CARTEL', 'BOSS'], icon: 'gavel', color: NAVY },
  { lines: ['MYANMAR', 'EXILE'], icon: 'people', color: BROWN },
  { lines: ['CRICKET', 'QATAR'], icon: 'trophy', color: GREEN },
  { lines: ['FIRE', 'ISLAND'], icon: 'flame', color: ORANGE },
  { lines: ['LFC', '4-0'], icon: 'trophy', color: RED },
  { lines: ['ALCARAZ', 'TITLE'], icon: 'trophy', color: GOLD },
  { lines: ['F1', 'VEGAS'], icon: 'trophy', color: BLUE },
  { lines: ['METS', '450M'], icon: 'coin', color: TEAL },
];

const SOURCES = ['BBC WORLD', 'BBC BUSINESS', 'BBC ASIA', 'BBC AFRICA', 'BBC SCIENCE', 'AL JAZEERA', 'THE GUARDIAN', 'BBC TECH'];

function draw(): void {
  rect(0, 0, W, H, PAPER);

  // masthead
  rect(0, 0, W, 90, NAVY);
  text(20, 10, 'THE WORLD / MONDAY EDITION', 2, [190, 198, 210]);
  text(20, 40, 'MONDAY 23 NOVEMBER 2026', 4, WHITE);
  text(792, 12, 'NO. 23', 3, GOLD);
  text(792, 52, 'WORLD NEWS', 2, [190, 198, 210]);
  rect(0, 88, W, 3, RED);

  // hero grid: 2 rows x 5 cards
  const heroX = 18, heroY = 104, cardW = 187, cardH = 220, gapX = 13, gapY = 12;
  HERO.forEach((s, i) => {
    const col = i % 5, row = Math.floor(i / 5);
    const x = heroX + col * (cardW + gapX);
    const y = heroY + row * (cardH + gapY);
    rect(x, y, cardW, cardH, CARD);
    rect(x, y, cardW, 2, s.color);
    rect(x, y + cardH - 2, cardW, 2, RULE);
    rect(x + cardW - 2, y, 2, cardH, RULE);
    rect(x, y, 2, cardH, RULE);
    const cx = x + cardW / 2, cy = y + 76;
    const fn = ICONS[s.icon] ?? ICONS.chip;
    fn(cx, cy, 140, s.color);
    textInBox(x + 8, y + 152, cardW - 16, 28, s.lines[0], 4, INK);
    textInBox(x + 8, y + 182, cardW - 16, 28, s.lines[1], 4, INK);
  });

  // strip: 2 rows x 10 stories
  const stripY = 566, cellW = 92, cellH = 124, sGap = 8;
  STRIP.forEach((s, i) => {
    const col = i % 10, row = Math.floor(i / 10);
    const x = 16 + col * (cellW + sGap);
    const y = stripY + row * (cellH + 8);
    rect(x, y, cellW, cellH, CARD);
    rect(x, y, cellW, 2, s.color);
    const fn = ICONS[s.icon] ?? ICONS.chip;
    fn(x + cellW / 2, y + 42, 70, s.color);
    textInBox(x + 4, y + 84, cellW - 8, 14, s.lines[0], 2, INK);
    textInBox(x + 4, y + 102, cellW - 8, 14, s.lines[1], 2, INK);
  });

  // footer
  rect(0, 834, W, 2, RULE);
  text(16, 846, 'SOURCES / 8 NEWS DESKS', 2, MUTED);
  SOURCES.forEach((src, i) => {
    const col = i % 4, row = Math.floor(i / 4);
    text(16 + col * 248, 876 + row * 36, src, 3, INK);
    rect(16 + col * 248, 902 + row * 36, 220, 1, RULE);
  });
  rect(0, 960, W, 2, NAVY);
  text(16, 976, '30 STORIES / WORLD EDITION / 23 NOV 2026', 2, MUTED);
}

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (const b of buf) {
    crc ^= b;
    for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(): Buffer {
  const raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) {
    const rowStart = y * (W * 3 + 1);
    raw[rowStart] = 0;
    for (let x = 0; x < W; x++) {
      const src = (y * W + x) * 3, dst = rowStart + 1 + x * 3;
      raw[dst] = pix[src]; raw[dst + 1] = pix[src + 1]; raw[dst + 2] = pix[src + 2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function selfHash(buf: Buffer): string {
  let h = 0x811c9dc5;
  for (const b of buf) { h ^= b; h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

try {
  draw();
  const png = encodePng();
  if (png.length > 1048576) throw new Error('PNG exceeds 1048576 bytes: ' + png.length);
  if (clips !== 0 || overflows !== 0) {
    throw new Error('layout assertion failed: clips=' + clips + ' overflows=' + overflows);
  }
  const dir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  mkdirSync(dir, { recursive: true });
  writeFileSync(dir.replace(/[\\\/]+$/, '') + '/entry.png', png);
  console.log('OK bytes=' + png.length + ' clips=' + clips + ' overflows=' + overflows +
    ' stories=' + (HERO.length + STRIP.length) + ' hash=' + selfHash(png));
} catch (e) {
  console.error('FAIL ' + (e instanceof Error ? e.message : String(e)));
  process.exitCode = 1;
}
