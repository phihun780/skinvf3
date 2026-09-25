// Ghép poster dọc A4 (300dpi) bằng canvas 2D: header thương hiệu, ảnh lớn + 4 góc, bảng màu theo vùng, danh sách decal.
// Style giống web: nền mesh gradient xanh, ảnh xe (nền trong suốt từ snapshotter) đặt trong khung glass.
import { BRAND } from '../config/brand';
import { EDITABLE, GROUPS, zoneInfo, type DesignConfig, type ZoneGroup } from '../config/zones';
import { FINISHES } from '../config/finishes';
import { colorName } from '../config/palette';
import { POSTER } from '../config/poster';
import type { Decal } from '../store/design';
import type { ViewId } from '../store/viewer';
import { snapshotter } from '../three/snapshot';
import { MIRROR_X } from '../config/decals';
import { t } from '../config/i18n/vi';

const { W, H, M } = POSTER;
const C = POSTER.colors;
const FONT = '"Plus Jakarta Sans", system-ui, sans-serif';
const DISPLAY = FONT;
const font = (weight: number, px: number) => `${weight} ${px}px ${FONT}`;
const display = (weight: number, px: number) => `${weight} ${px}px ${DISPLAY}`;

const loadImage = (src: string) => new Promise<HTMLImageElement>((ok, fail) => {
  const img = new Image(); img.onload = () => ok(img); img.onerror = fail; img.src = src;
});

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath(); g.roundRect(x, y, w, h, r);
}

/** Nền mesh gradient (navy → xanh hoàng gia → cyan/aqua), giống nền web. */
function drawMesh(g: CanvasRenderingContext2D) {
  const lin = g.createLinearGradient(0, 0, W * 0.4, H);
  lin.addColorStop(0, '#020824'); lin.addColorStop(0.4, '#06216e'); lin.addColorStop(0.75, '#041448'); lin.addColorStop(1, '#020824');
  g.fillStyle = lin; g.fillRect(0, 0, W, H);
  // [cx, cy, rx, ry, màu tâm, màu giữa] (tỉ lệ theo khổ poster)
  const blobs: [number, number, number, number, string, string][] = [
    [0.5, 0.2, 0.75, 0.3, 'rgba(26,110,240,0.95)', 'rgba(14,64,205,0.55)'],
    [0.95, 0.42, 0.6, 0.28, 'rgba(50,215,245,0.8)', 'rgba(30,160,235,0.35)'],
    [1.02, 0.55, 0.45, 0.2, 'rgba(170,255,245,0.85)', 'rgba(80,230,240,0.45)'],
    [0.0, 0.05, 0.5, 0.2, 'rgba(2,6,30,0.95)', 'rgba(2,6,30,0.5)'],
    [0.3, 1.0, 0.8, 0.45, 'rgba(1,4,20,0.95)', 'rgba(1,4,20,0.6)'],
  ];
  for (const [cx, cy, rx, ry, c0, c1] of blobs) {
    g.save();
    g.translate(cx * W, cy * H); g.scale(rx * W, ry * H);  // elip: vẽ hình tròn bán kính 1 đã co giãn
    const grd = g.createRadialGradient(0, 0, 0, 0, 0, 1);
    grd.addColorStop(0, c0); grd.addColorStop(0.45, c1); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(-1, -1, 2, 2);
    g.restore();
  }
  // Không phủ hạt nhiễu như trên web: nhiễu ngẫu nhiên làm PNG khó nén (≈14MB so với ≈4MB).
}

/** Tấm glass: nền trắng trong mờ + viền sáng ở mép trên/trái. */
function glass(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.save();
  roundRect(g, x, y, w, h, r);
  const fill = g.createLinearGradient(x, y, x + w, y + h);
  fill.addColorStop(0, 'rgba(255,255,255,0.14)'); fill.addColorStop(0.55, 'rgba(255,255,255,0.05)'); fill.addColorStop(1, 'rgba(255,255,255,0.09)');
  g.fillStyle = fill; g.shadowColor = 'rgba(1,4,24,0.45)'; g.shadowBlur = 60; g.shadowOffsetY = 24; g.fill();
  g.shadowColor = 'transparent';
  const edge = g.createLinearGradient(x, y, x + w * 0.6, y + h);
  edge.addColorStop(0, 'rgba(255,255,255,0.6)'); edge.addColorStop(0.4, 'rgba(255,255,255,0.14)'); edge.addColorStop(1, 'rgba(138,240,255,0.35)');
  g.strokeStyle = edge; g.lineWidth = 2.5; g.stroke();
  g.restore();
}

/** Ảnh xe (nền trong suốt) trong khung glass, kèm nhãn góc nhìn. */
function drawShot(g: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, label: string, big = false) {
  const r = big ? 40 : 26;
  glass(g, x, y, w, h, r);
  g.save(); roundRect(g, x, y, w, h, r); g.clip(); g.drawImage(img, x, y, w, h); g.restore();
  g.font = display(600, big ? 28 : 22); g.fillStyle = C.muted; g.textBaseline = 'alphabetic';
  g.letterSpacing = big ? '6px' : '4px'; g.fillText(label.toUpperCase(), x + (big ? 40 : 26), y + h - (big ? 36 : 22)); g.letterSpacing = '0px';
}

function eyebrow(g: CanvasRenderingContext2D, text: string, x: number, y: number) {
  g.font = display(600, 26); g.fillStyle = C.muted;
  g.letterSpacing = '6px'; g.fillText(text.toUpperCase(), x, y); g.letterSpacing = '0px';
}

/** Cắt chữ cho vừa bề ngang (thêm “…”). */
function fit(g: CanvasRenderingContext2D, text: string, maxW: number) {
  if (g.measureText(text).width <= maxW) return text;
  while (text.length > 1 && g.measureText(text + '…').width > maxW) text = text.slice(0, -1);
  return text + '…';
}

/** Vị trí dán theo hướng bề mặt (trục world: +X = bên trái xe, +Y = lên, +Z = đầu xe). */
function placeOf(d: Decal) {
  const [nx, ny, nz] = d.normal.map(Math.abs);
  if (ny >= nx && ny >= nz) return d.position[2] > 0.9 ? 'nắp capo' : 'nóc';
  if (nx >= nz) return d.position[0] > MIRROR_X ? 'bên trái' : 'bên phải';
  return d.normal[2] > 0 ? 'đầu xe' : 'đuôi xe';
}

export interface PosterInput { config: DesignConfig; decals: Decal[]; code: string; date?: Date }

export async function renderPoster({ config, decals, code, date = new Date() }: PosterInput): Promise<HTMLCanvasElement> {
  if (!snapshotter.take) throw new Error('Xe chưa tải xong');
  await Promise.all([300, 400, 500, 600, 700, 800].flatMap(w => [document.fonts.load(font(w, 40), 'Đ'), document.fonts.load(display(w, 40), 'Đ')]));

  // ---- chụp ảnh các góc
  const HERO = { x: M, y: 390, w: W - 2 * M, h: 1100 };
  const GAP = 40, SMALL_W = (W - 2 * M - 3 * GAP) / 4, SMALL = { y: HERO.y + HERO.h + GAP, h: 400 };
  const smallViews: ViewId[] = ['front', 'side', 'rear', 'rear34'];
  const [heroUrl] = snapshotter.take(['front34'], HERO.w, HERO.h);
  const smallUrls = snapshotter.take(smallViews, Math.round(SMALL_W * 2), SMALL.h * 2);  // chụp 2x rồi thu nhỏ: nét hơn
  const [heroImg, ...smallImgs] = await Promise.all([heroUrl, ...smallUrls].map(loadImage));
  const decalImgs = await Promise.all(decals.map(d => loadImage(d.src).catch(() => null)));

  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d')!;
  drawMesh(g);

  // ---- header
  const mark = 116, my = 170;
  const lg = g.createLinearGradient(M, my, M + mark, my + mark);
  lg.addColorStop(0, 'rgba(140,240,255,0.6)'); lg.addColorStop(1, 'rgba(29,91,255,0.5)');
  g.save(); g.shadowColor = 'rgba(60,200,255,0.6)'; g.shadowBlur = 50;
  g.fillStyle = lg; roundRect(g, M, my, mark, mark, 34); g.fill(); g.restore();
  g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 2.5; roundRect(g, M, my, mark, mark, 34); g.stroke();
  g.fillStyle = '#fff'; g.font = display(700, 46); g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(BRAND.mark, M + mark / 2, my + mark / 2 + 2);
  g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.fillStyle = C.text; g.font = display(800, 64); g.fillText(BRAND.name, M + mark + 36, my + 58);
  g.letterSpacing = '6px'; g.fillStyle = C.muted; g.font = display(600, 25);
  g.fillText(t.poster.subtitle.toUpperCase(), M + mark + 38, my + 106); g.letterSpacing = '0px';

  const pad = (n: number) => String(n).padStart(2, '0');
  const when = `${pad(date.getHours())}:${pad(date.getMinutes())} · ${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
  g.textAlign = 'right';
  g.letterSpacing = '4px'; g.fillStyle = C.muted; g.font = font(600, 26); g.fillText(t.poster.codeLabel.toUpperCase(), W - M, my + 22); g.letterSpacing = '0px';
  g.fillStyle = C.text; g.font = font(800, 58); g.fillText(code, W - M, my + 84);
  g.fillStyle = C.muted; g.font = font(400, 30); g.fillText(when, W - M, my + 128);
  g.textAlign = 'left';
  g.fillStyle = C.line; g.fillRect(M, 340, W - 2 * M, 2);

  // ---- ảnh
  drawShot(g, heroImg, HERO.x, HERO.y, HERO.w, HERO.h, t.views.front34, true);
  smallImgs.forEach((img, i) => drawShot(g, img, M + i * (SMALL_W + GAP), SMALL.y, SMALL_W, SMALL.h, t.views[smallViews[i]]));

  // ---- bảng màu (cột trái)
  // 2 tấm glass: bảng màu (trái) + decal (phải), cao tới sát chân trang
  const TOP = SMALL.y + SMALL.h + 150, FY = H - 150, PAD = 50;
  const LP = { x: M, y: TOP - 90, w: 1360 }, RP = { x: M + 1400, y: TOP - 90, w: W - 2 * M - 1400 };
  const PH = FY - 50 - LP.y;
  glass(g, LP.x, LP.y, LP.w, PH, 32); glass(g, RP.x, RP.y, RP.w, PH, 32);
  const X0 = LP.x + PAD, COL_L = LP.w - 2 * PAD, ROW = 58;
  eyebrow(g, t.poster.colors, X0, TOP);
  let y = TOP + 40;
  for (const group of Object.keys(GROUPS) as ZoneGroup[]) {
    const ids = EDITABLE.filter(id => zoneInfo(id)?.group === group);
    if (!ids.length) continue;
    y += 34;
    g.font = display(700, 22); g.fillStyle = C.accent2; g.letterSpacing = '5px'; g.fillText(GROUPS[group].toUpperCase(), X0, y); g.letterSpacing = '0px';
    y += 14;
    for (const id of ids) {
      const s = config[id]; if (!s) continue;
      const cy = y + ROW / 2;
      g.beginPath(); g.arc(X0 + 20, cy, 19, 0, Math.PI * 2); g.fillStyle = s.color; g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 2; g.stroke();
      g.textBaseline = 'middle';
      g.font = font(600, 31); g.fillStyle = C.text; g.fillText(fit(g, zoneInfo(id)!.name, 560), X0 + 60, cy);
      g.textAlign = 'right'; g.font = font(400, 27); g.fillStyle = C.muted;
      g.fillText(`${colorName(s.color)} · ${s.color.toUpperCase()} · ${FINISHES[s.finish]?.name ?? s.finish}`, X0 + COL_L, cy);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = C.lineSoft; g.fillRect(X0 + 60, y + ROW, COL_L - 60, 1);
      y += ROW;
    }
  }

  // ---- decal (cột phải)
  const DX = RP.x + PAD, DW = RP.w - 2 * PAD, DROW = 124, TH = { w: 150, h: 100 };
  eyebrow(g, t.poster.decals(decals.length), DX, TOP);
  let dy = TOP + 48;
  if (!decals.length) { g.font = font(400, 28); g.fillStyle = C.faint; g.fillText(t.poster.noDecals, DX, dy + 40); }
  const maxRows = Math.floor((RP.y + PH - PAD - dy) / DROW);
  const shown = decals.length > maxRows ? maxRows - 1 : decals.length;
  decals.slice(0, shown).forEach((d, i) => {
    const img = decalImgs[i];
    // ô ảnh nền ô cờ để thấy phần trong suốt
    g.save(); roundRect(g, DX, dy, TH.w, TH.h, 12); g.clip();
    for (let cx = 0; cx < TH.w; cx += 16) for (let cy2 = 0; cy2 < TH.h; cy2 += 16) {
      g.fillStyle = ((cx + cy2) / 16) % 2 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.14)'; g.fillRect(DX + cx, dy + cy2, 16, 16);
    }
    if (img) {
      const k = Math.min((TH.w - 16) / img.naturalWidth, (TH.h - 16) / img.naturalHeight);
      const iw = img.naturalWidth * k, ih = img.naturalHeight * k;
      g.save();
      g.translate(DX + TH.w / 2, dy + TH.h / 2); if (d.flip) g.scale(-1, 1);
      g.globalAlpha = d.opacity; g.drawImage(img, -iw / 2, -ih / 2, iw, ih);
      g.restore();
    }
    g.restore();
    g.font = font(700, 30); g.fillStyle = C.text; g.fillText(fit(g, d.label, DW - TH.w - 30), DX + TH.w + 28, dy + 42);
    const heightCm = Math.round(d.size / d.aspect * 100);
    const info = [placeOf(d), `${Math.round(d.size * 100)} × ${heightCm} cm`, d.rotation ? `xoay ${Math.round(d.rotation)}°` : '', d.flip ? 'lật' : '', d.opacity < 1 ? `${Math.round(d.opacity * 100)}%` : '']
      .filter(Boolean).join(' · ');
    g.font = font(400, 25); g.fillStyle = C.muted; g.fillText(info, DX + TH.w + 28, dy + 82);
    dy += DROW;
  });
  if (shown < decals.length) { g.font = font(500, 28); g.fillStyle = C.muted; g.fillText(t.poster.moreDecals(decals.length - shown), DX, dy + 40); }

  // ---- chân trang
  g.fillStyle = C.line; g.fillRect(M, FY, W - 2 * M, 2);
  g.font = font(400, 25); g.fillStyle = C.faint;
  g.fillText(t.poster.disclaimer, M, FY + 60);
  g.fillText(`${BRAND.name} · ${BRAND.disclaimer}`, M, FY + 100);
  g.textAlign = 'right'; g.fillText(`Mô hình 3D: ${BRAND.modelCredit}`, W - M, FY + 100); g.textAlign = 'left';
  return cv;
}

export const posterFileName = (code: string, date = new Date()) =>
  `${code}_SkinVF3_${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}.png`;
