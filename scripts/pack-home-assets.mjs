// PNG render (nền trong suốt) → WebP cho trang chủ.  node scripts/pack-home-assets.mjs <thư mục PNG> [poster.png]
import sharp from 'sharp';
import { mkdirSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const [src, poster] = process.argv.slice(2);
mkdirSync('public/presets', { recursive: true }); mkdirSync('public/home', { recursive: true });
const kb = f => Math.round(statSync(f).size / 1024) + 'KB';

for (const f of readdirSync(src).filter(f => f.endsWith('.png'))) {
  const out = f.startsWith('preset-') ? join('public/presets', f.slice(7).replace('.png', '.webp')) : join('public/home', f.replace('.png', '.webp'));
  // cắt bớt nền trong suốt thừa quanh xe rồi chừa lề đều
  await sharp(join(src, f)).trim({ threshold: 1 }).extend({ top: 24, bottom: 24, left: 24, right: 24, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 86, alphaQuality: 90 }).toFile(out);
  console.log(out, kb(out));
}
if (poster) {
  await sharp(poster).resize({ width: 720 }).webp({ quality: 84 }).toFile('public/home/poster.webp');
  console.log('public/home/poster.webp', kb('public/home/poster.webp'));
}
