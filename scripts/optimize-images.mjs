// Prepares brand assets and responsive photos from the untouched originals in images/.
// Run with: node scripts/optimize-images.mjs            (everything)
//           node scripts/optimize-images.mjs --icons    (favicon and app icons only)
// Outputs: Public/brand/* (logos and icons), images/logo-master.png (clean transparent logo),
// Public/images/site/* (WebP + JPG per width) and src/data/sdlImages.ts (the manifest <ResponsiveImage> reads).
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'images');
const BRAND_OUT = path.join(ROOT, 'Public', 'brand');
const PHOTO_OUT = path.join(ROOT, 'Public', 'images', 'site');
const MANIFEST_OUT = path.join(ROOT, 'src', 'data', 'sdlImages.ts');

const STEP_WIDTHS = [640, 1024, 1600, 2400];
// Every card/tile photo is cropped to this exact square so rows line up at the same height.
// 340 px keeps the smallest sources (the industry photos) from being upscaled.
const CARD_SIZE = 340;
// Larger square variants for retina screens, emitted only when the source is big enough.
const CARD_STEP_SIZES = [640, 1024, 1400];

fs.mkdirSync(BRAND_OUT, { recursive: true });
fs.mkdirSync(PHOTO_OUT, { recursive: true });

// ---------------------------------------------------------------------------------------------
// Logo: the supplied PNG has no real alpha. A grey/white checkerboard (~236 and ~254) is painted
// behind the artwork, and the globe's "ocean" and the keylines around the globe and parcel are
// the same light neutrals. The artwork itself is only red and black ink, so every light neutral
// pixel is background. Alpha comes from each pixel's "whiteness" (its lowest channel): red and
// black ink sit far below LOGO_INK, the checkerboard sits at or above LOGO_PAPER. Edge pixels in
// between are un-blended from white so anti-aliased edges keep their true colour (no grey fringe).
// ---------------------------------------------------------------------------------------------
const LOGO_SRC = path.join(SRC, 'World Vexa Logistics Logo.png');
const LOGO_INK = 96; // at or below this whiteness a pixel is fully opaque
const LOGO_PAPER = 222; // at or above this it is background (the darker checker squares are ~233)
const SPECK_MAX = 24; // isolated faint blobs up to this many pixels are leftover noise

async function cleanLogo(input) {
  const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const out = Buffer.alloc(width * height * 4);
  for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const whiteness = Math.min(r, g, b);
    const a = whiteness <= LOGO_INK ? 1 : whiteness >= LOGO_PAPER ? 0 : (LOGO_PAPER - whiteness) / (LOGO_PAPER - LOGO_INK);
    if (a > 0) {
      // Un-blend from white so edge pixels keep their true colour.
      out[j] = Math.max(0, Math.min(255, Math.round((r - 255 * (1 - a)) / a)));
      out[j + 1] = Math.max(0, Math.min(255, Math.round((g - 255 * (1 - a)) / a)));
      out[j + 2] = Math.max(0, Math.min(255, Math.round((b - 255 * (1 - a)) / a)));
    }
    out[j + 3] = Math.round(a * 255);
  }
  despeckle(out, width, height);
  return sharp(out, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

// Clears small connected blobs of non-zero alpha that are not part of the artwork.
function despeckle(rgba, width, height) {
  const seen = new Uint8Array(width * height);
  const stack = [];
  for (let start = 0; start < width * height; start++) {
    if (seen[start] || rgba[start * 4 + 3] === 0) continue;
    const blob = [];
    stack.push(start);
    seen[start] = 1;
    while (stack.length) {
      const p = stack.pop();
      blob.push(p);
      const x = p % width, y = (p - x) / width;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const q = ny * width + nx;
        if (!seen[q] && rgba[q * 4 + 3] > 0) { seen[q] = 1; stack.push(q); }
      }
    }
    if (blob.length <= SPECK_MAX) for (const p of blob) rgba[p * 4 + 3] = 0;
  }
}

// How strongly a pixel reads as the logo's red (0 = neutral grey/black/white).
const redness = (r, g, b) => r - Math.max(g, b);
const RED_MIN = 60;

// Reversed logo for dark surfaces: every non-red pixel becomes white; red stays red.
async function toWhiteVersion(pngBuffer) {
  const { data, info } = await sharp(pngBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    if (redness(data[i], data[i + 1], data[i + 2]) < RED_MIN) {
      data[i] = 255; data[i + 1] = 255; data[i + 2] = 255;
    }
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

// Keeps only the red parts of an image (the globe, orbit arrow and parcel of the mark).
async function redOnly(pngBuffer) {
  const { data, info } = await sharp(pngBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const red = redness(data[i], data[i + 1], data[i + 2]);
    if (red < RED_MIN) data[i + 3] = 0;
    else if (red < RED_MIN + 40) data[i + 3] = Math.round(data[i + 3] * (red - RED_MIN) / 40); // soft edge
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

// Centres an image on a transparent square canvas.
async function toSquare(pngBuffer) {
  const meta = await sharp(pngBuffer).metadata();
  const side = Math.max(meta.width, meta.height);
  return sharp(pngBuffer)
    .extend({
      top: Math.floor((side - meta.height) / 2), bottom: Math.ceil((side - meta.height) / 2),
      left: Math.floor((side - meta.width) / 2), right: Math.ceil((side - meta.width) / 2),
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png().toBuffer();
}

// The "WV" + globe/parcel symbol: the top band of the logo, without the speed lines on the left
// and the wordmark below. Measured on the 2024x777 source: empty columns 392-396 separate the
// speed lines from the W, empty rows 415-436 separate the symbol from "WORLD".
const MARK_BOX = { left: 394, top: 0, width: 2024 - 394, height: 426 };
async function buildMark(source) {
  const clean = await cleanLogo(source);
  return sharp(await sharp(clean).extract(MARK_BOX).png().toBuffer()).trim({ threshold: 1 }).png().toBuffer();
}

// The globe, orbit arrow and parcel alone (the red parts of the mark), squared. The full "WV"
// mark is about 4:1, so in a square tab icon it would be ~4 px tall at 16 px; tiny icons use this.
async function buildGlobe(mark) {
  return toSquare(await sharp(await redOnly(mark)).trim({ threshold: 1 }).png().toBuffer());
}

// Browser, home-screen and PWA icons, all rendered from the mark at their exact size (never
// resized from another icon). `inset` is the share of the canvas width the artwork may fill;
// `art` picks the full "WV" mark or its globe/parcel. The mark has black letterforms that vanish
// on dark launchers and tabs, so every icon sits on white (a rounded tile where the OS doesn't
// mask the icon itself).
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };
const ICONS = [
  { file: 'favicon-16.png', size: 16, inset: 1, art: 'globe', tile: true },     // browser tab (standard DPI)
  { file: 'favicon-32.png', size: 32, inset: 0.94, art: 'globe', tile: true },  // browser tab (retina), taskbar
  { file: 'icon-192.png', size: 192, inset: 0.86, art: 'mark', tile: true },    // Android home screen, manifest
  { file: 'favicon.png', size: 512, inset: 0.86, art: 'mark', tile: true },     // manifest, install splash
  { file: 'icon-maskable-512.png', size: 512, inset: 0.76, art: 'mark' },       // Android adaptive: fits the 80% safe circle
  { file: 'apple-touch-icon.png', size: 180, inset: 0.84, art: 'mark' },        // iOS fills transparency with black, so white
];

async function buildIcons(mark) {
  const sources = { mark: await toSquare(mark), globe: await buildGlobe(mark) };
  for (const { file, size, inset, art, tile } of ICONS) {
    const inner = Math.round(size * inset);
    const edge = size - inner;
    const artwork = await sharp(sources[art])
      .resize(inner, inner, { fit: 'contain', background: CLEAR, kernel: 'lanczos3' })
      .extend({ top: Math.floor(edge / 2), bottom: Math.ceil(edge / 2), left: Math.floor(edge / 2), right: Math.ceil(edge / 2), background: CLEAR })
      .png().toBuffer();
    const r = tile ? Math.round(size * 0.22) : 0;
    const card = Buffer.from(`<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${r}" fill="#ffffff"/></svg>`);
    const icon = sharp(card).composite([{ input: artwork }]);
    // Full-colour PNG for the tiny sizes: palette quantising visibly bands 16/32 px edges.
    const png = size <= 32 ? { compressionLevel: 9 } : { palette: true, quality: 95, effort: 10, compressionLevel: 9 };
    await icon.png(png).toFile(path.join(BRAND_OUT, file));
  }
}

const LOGO_PNG = { palette: true, quality: 90, effort: 10, compressionLevel: 9 };
// Web copies are capped at this width: the largest slot (print header, 88 px tall) still gets 3x.
const LOGO_WEB_WIDTH = 1200;
const webLogo = buf => sharp(buf).resize({ width: LOGO_WEB_WIDTH, withoutEnlargement: true, kernel: 'lanczos3' });

async function buildBrand() {
  // Clean transparent master, kept next to the source for designers and later steps.
  const master = await sharp(await cleanLogo(LOGO_SRC)).trim({ threshold: 1 }).png().toBuffer();
  await sharp(master).png({ compressionLevel: 9 }).toFile(path.join(SRC, 'logo-master.png'));

  await webLogo(master).png(LOGO_PNG).toFile(path.join(BRAND_OUT, 'logo.png'));
  await webLogo(await toWhiteVersion(master)).png(LOGO_PNG).toFile(path.join(BRAND_OUT, 'logo-white.png'));

  const mark = await buildMark(LOGO_SRC);
  await webLogo(mark).png(LOGO_PNG).toFile(path.join(BRAND_OUT, 'mark.png'));
  await buildIcons(mark);
  await buildOgImage(master);
}

// Social preview (1200x630): the home hero photo with the full-colour logo in the clear sky, top right.
const OG_W = 1200, OG_H = 630, OG_LOGO_W = 440, OG_PAD = 56;
async function buildOgImage(master) {
  const logo = await sharp(master).resize({ width: OG_LOGO_W, kernel: 'lanczos3' }).png().toBuffer();
  await sharp(path.join(SRC, HERO_SRC)).resize(OG_W, OG_H, { fit: 'cover', position: 'centre' })
    .composite([{ input: logo, left: OG_W - OG_PAD - OG_LOGO_W, top: OG_PAD }])
    .jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(BRAND_OUT, 'og-image.jpg'));
}

// ---------------------------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------------------------
// kind 'card' = fixed CARD_SIZE square (plus 640 when the source allows it).
// kind 'hero' = keeps the given aspect ratio, widths from STEP_WIDTHS up to the source width.
// Stock photos in free-hd/: sources and licences in images/free-hd/SOURCES.md.
const HERO_SRC = 'free-hd/hero-home.jpg';
const PHOTOS = [
  { name: 'hero-home', src: HERO_SRC, kind: 'hero', aspect: 16 / 9 },
  // Portrait cut of the same photo, framed on the ship.
  { name: 'hero-home-mobile', src: HERO_SRC, kind: 'hero', aspect: 9 / 16, crop: { left: 830, top: 0, width: 1602, height: 2848 } },
  { name: 'track-hero', src: 'free-hd/track-hero.jpg', kind: 'hero', aspect: 2 / 1 },
  { name: 'locations-hero', src: 'free-cc0/locations-hero.webp', kind: 'hero', aspect: 2 / 1 },
  // Wide strip behind the Home callback banner and the About compliance banner.
  { name: 'callback-banner', src: 'free-hd/callback-banner.jpg', kind: 'hero', aspect: 3 / 1 },
  { name: 'services-hero', src: 'free-hd/services-hero.jpg', kind: 'hero', aspect: 12 / 5 },
  // Band around the ship and the sun.
  { name: 'about-hero', src: 'free-hd/about-hero.jpg', kind: 'hero', aspect: 12 / 5, crop: { left: 0, top: 560, width: 2738, height: 1141 } },
  { name: 'service-priority-express', src: 'free-hd/service-priority-express.jpg', kind: 'card' },
  { name: 'service-freight-linehaul', src: 'free-hd/service-freight-linehaul.jpg', kind: 'card' },
  { name: 'service-vehicle-transport', src: 'free-cc0/service-vehicle-transport.webp', kind: 'card' },
  { name: 'service-secure-vault', src: 'free-cc0/service-secure-vault.webp', kind: 'card' },
  { name: 'industry-healthcare', src: 'site/healthcare-pharma.jpg', kind: 'card' },
  { name: 'industry-technology', src: 'free-cc0/industry-technology.webp', kind: 'card' },
  { name: 'industry-automotive', src: 'site/automotive-parts.jpg', kind: 'card' },
  { name: 'industry-ecommerce', src: 'site/ecommerce-retail.jpg', kind: 'card' },
  // Shown as a 72 px thumbnail: crop tight on the truck.
  { name: 'track-result-vehicle', src: 'free-hd/track-result-vehicle.jpg', kind: 'card', crop: { left: 700, top: 1350, width: 2300, height: 2300 } },
  { name: 'about-operations', src: 'free-pexels/about-operations.jpg', kind: 'card' },
  // Shown as a 72 px thumbnail: crop tight on the face.
  { name: 'about-team', src: 'free-pexels/about-team.jpg', kind: 'card', crop: { left: 950, top: 80, width: 900, height: 900 } },
];

// `position` picks which part of the source a cover crop keeps (sharp: 'centre', 'top', 'bottom', ...).
async function writeVariants(pipelineFactory, name, width, height, position = 'centre') {
  const base = path.join(PHOTO_OUT, `${name}-${width}`);
  await pipelineFactory().resize(width, height, { fit: 'cover', position }).webp({ quality: 78 }).toFile(`${base}.webp`);
  await pipelineFactory().resize(width, height, { fit: 'cover', position }).flatten({ background: '#ffffff' })
    .jpeg({ quality: 80, mozjpeg: true, progressive: true }).toFile(`${base}.jpg`);
}

async function buildPhotos() {
  const manifest = {};
  for (const p of PHOTOS) {
    const srcPath = path.join(SRC, p.src);
    const factory = () => (p.crop ? sharp(srcPath).extract(p.crop) : sharp(srcPath));
    const meta = await factory().metadata();
    const srcW = p.crop ? p.crop.width : meta.width;
    const srcH = p.crop ? p.crop.height : meta.height;
    const variants = [];

    if (p.kind === 'card') {
      const maxSquare = Math.min(srcW, srcH);
      // Never upscale: a source smaller than CARD_SIZE is output at its own size. Every card is
      // still a 1:1 square, so CSS renders them all at the same height.
      const base = Math.min(CARD_SIZE, maxSquare);
      const sizes = [base, ...CARD_STEP_SIZES.filter(s => s <= maxSquare)];
      for (const s of sizes) {
        await writeVariants(factory, p.name, s, s);
        variants.push(s);
      }
      manifest[p.name] = { width: base, height: base, widths: variants };
    } else {
      // Largest crop of the requested aspect that fits the source, then the step widths below it.
      const cropW = Math.min(srcW, Math.floor(srcH * p.aspect));
      // Served widths never exceed the largest step, however big the original is.
      const maxW = Math.min(cropW, STEP_WIDTHS[STEP_WIDTHS.length - 1]);
      const widths = STEP_WIDTHS.filter(w => w <= maxW);
      if (!widths.includes(maxW) && (widths.length === 0 || maxW - widths[widths.length - 1] > 200)) widths.push(maxW);
      for (const w of widths) {
        await writeVariants(factory, p.name, w, Math.round(w / p.aspect), p.position);
        variants.push(w);
      }
      manifest[p.name] = { width: maxW, height: Math.round(maxW / p.aspect), widths: variants };
    }
  }
  return manifest;
}

function writeManifest(manifest) {
  const body = Object.entries(manifest)
    .map(([k, v]) => `  '${k}': { width: ${v.width}, height: ${v.height}, widths: [${v.widths.join(', ')}] },`)
    .join('\n');
  const ts = `// Generated by scripts/optimize-images.mjs. Do not edit by hand; re-run the script instead.
// Each entry lists the widths available as /images/site/<name>-<width>.webp and .jpg.
export interface SdlImageInfo {
  width: number;
  height: number;
  widths: number[];
}

export const SDL_IMAGES = {
${body}
} satisfies Record<string, SdlImageInfo>;

export type SdlImageName = keyof typeof SDL_IMAGES;
`;
  fs.writeFileSync(MANIFEST_OUT, ts);
}

// --icons rebuilds only the icon set, leaving the logos, OG image and photos untouched.
if (process.argv.includes('--icons')) {
  await buildIcons(await buildMark(LOGO_SRC));
  console.log('Icons done.');
} else {
  await buildBrand();
  const manifest = await buildPhotos();
  writeManifest(manifest);
  console.log('Done.');
}
