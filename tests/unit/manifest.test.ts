import { readdirSync, readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { ASSETS, animFrames, type SheetAsset } from '../../src/assets/manifest';

const PUBLIC_DIR = `${process.cwd()}/public`;

/** Width and height from a PNG file's header. */
function pngSize(path: string): { width: number; height: number } {
  const bytes = readFileSync(path);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

describe('asset manifest', () => {
  it('has unique keys', () => {
    const keys = ASSETS.map((a) => a.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('lists every file in public/assets exactly once', () => {
    const onDisk = readdirSync(`${PUBLIC_DIR}/assets`, { recursive: true })
      .filter((f) => f.endsWith('.png'))
      .map((f) => `assets/${f}`)
      .sort();
    const listed = ASSETS.map((a) => a.path).sort();
    expect(listed).toEqual(onDisk);
  });

  it.each(ASSETS.filter((a) => a.kind === 'sheet'))(
    'sheet $key: image size equals frames × frame size',
    (a) => {
      expect(pngSize(`${PUBLIC_DIR}/${a.path}`)).toEqual({
        width: a.frames * a.frameWidth,
        height: a.frameHeight,
      });
      expect(a.frames).toBeGreaterThan(0);
      expect(a.frameRate).toBeGreaterThanOrEqual(0);
    },
  );

  it.each(ASSETS.filter((a) => a.kind === 'image'))('image $key: size matches', (a) => {
    expect(pngSize(`${PUBLIC_DIR}/${a.path}`)).toEqual({ width: a.width, height: a.height });
  });
});

/**
 * Decodes an 8-bit RGBA PNG (colour type 6, not interlaced) into its alpha
 * channel, or returns null for any other kind. Enough to look at sprite art.
 */
function pngAlpha(path: string): { width: number; height: number; alpha: Uint8Array } | null {
  const bytes = readFileSync(path);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  if (bytes[24] !== 8 || bytes[25] !== 6 || bytes[28] !== 0) return null;
  const chunks: Uint8Array[] = [];
  for (let pos = 8; pos < bytes.length;) {
    const len = view.getUint32(pos);
    const type = String.fromCharCode(...bytes.subarray(pos + 4, pos + 8));
    if (type === 'IDAT') chunks.push(bytes.subarray(pos + 8, pos + 8 + len));
    pos += 12 + len;
  }
  const joined = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  chunks.reduce((at, c) => (joined.set(c, at), at + c.length), 0);
  const raw = inflateSync(joined);
  const stride = width * 4;
  const out = new Uint8Array(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)] ?? 0;
    for (let x = 0; x < stride; x++) {
      const cur = raw[y * (stride + 1) + 1 + x] ?? 0;
      const a = x >= 4 ? (out[y * stride + x - 4] ?? 0) : 0;
      const b = y > 0 ? (out[(y - 1) * stride + x] ?? 0) : 0;
      const c = x >= 4 && y > 0 ? (out[(y - 1) * stride + x - 4] ?? 0) : 0;
      const p = a + b - c;
      const pa = Math.abs(p - a);
      const pb = Math.abs(p - b);
      const pc = Math.abs(p - c);
      const paeth = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      const pred = [0, a, b, (a + b) >> 1, paeth][filter] ?? 0;
      out[y * stride + x] = (cur + pred) & 0xff;
    }
  }
  const alpha = new Uint8Array(width * height);
  for (let i = 0; i < alpha.length; i++) alpha[i] = out[i * 4 + 3] ?? 0;
  return { width, height, alpha };
}

describe('sheet animations', () => {
  it('play every frame unless told to skip some, in order', () => {
    const sheet = ASSETS.find((a): a is SheetAsset => a.kind === 'sheet' && !a.skipFrames);
    if (!sheet) throw new Error('no plain sheet');
    expect(animFrames(sheet)).toEqual([...Array(sheet.frames).keys()]);
    expect(animFrames({ ...sheet, frames: 6, skipFrames: [1, 2, 4] })).toEqual([0, 3, 5]);
  });

  // An explosion or effect frame that is opaque edge to edge shows on screen as
  // a solid square (owner report 2026-10-18: the big blast's orange square).
  it.each(
    ASSETS.filter(
      (a): a is SheetAsset =>
        a.kind === 'sheet' && (a.group === 'explosions' || a.group === 'effects'),
    ).map((a) => [a.key, a] as const),
  )('%s never plays a frame that fills its whole box', (_key, sheet) => {
    const png = pngAlpha(`${PUBLIC_DIR}/${sheet.path}`);
    if (!png) return; // not 8-bit RGBA: no frame can be checked this way
    for (const frame of animFrames(sheet)) {
      let solid = true;
      for (let y = 0; y < sheet.frameHeight && solid; y++)
        for (let x = 0; x < sheet.frameWidth && solid; x++)
          if ((png.alpha[y * png.width + frame * sheet.frameWidth + x] ?? 0) < 255) solid = false;
      expect(solid, `frame ${frame}`).toBe(false);
    }
  });
});
