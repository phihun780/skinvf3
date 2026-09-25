// Ghép Hình ảnh SkinVF3 dọc A4 (300dpi) bằng canvas 2D: header thương hiệu, ảnh lớn + 4 góc, các ô màu có trong thiết kế (kèm mã HEX).
// Style giống web: nền mesh gradient xanh, ảnh xe (nền trong suốt từ snapshotter) đặt trong khung glass.
import { BRAND } from '../config/brand';
import { EDITABLE, type DesignConfig } from '../config/zones';
import { POSTER } from '../config/poster';
import type { ViewId } from '../store/viewer';
import { snapshotter } from '../three/snapshot';
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

/** Các màu có trong thiết kế (không trùng), theo thứ tự vùng: thân xe trước. */
function usedColors(config: DesignConfig) {
  const seen = new Set<string>();
  for (const id of EDITABLE) { const c = config[id]?.color?.toLowerCase(); if (c) seen.add(c); }
  return [...seen];
}

/** Ô màu: khối màu bo góc (có ánh sáng nhẹ như mẫu màu thật) + mã HEX bên dưới. */
function drawSwatch(g: CanvasRenderingContext2D, hex: string, x: number, y: number, w: number, h: number, r: number, labelPx: number) {
  g.save();
  roundRect(g, x, y, w, h, r);
  g.shadowColor = 'rgba(1,4,24,0.5)'; g.shadowBlur = 40; g.shadowOffsetY = 16;
  g.fillStyle = hex; g.fill();
  g.shadowColor = 'transparent';
  const shine = g.createLinearGradient(x, y, x, y + h);
  shine.addColorStop(0, 'rgba(255,255,255,0.22)'); shine.addColorStop(0.45, 'rgba(255,255,255,0)'); shine.addColorStop(1, 'rgba(0,0,0,0.12)');
  g.fillStyle = shine; g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 2.5; g.stroke();
  g.restore();
  g.font = font(700, labelPx); g.fillStyle = C.text; g.textAlign = 'center'; g.letterSpacing = '3px';
  g.fillText(hex.toUpperCase(), x + w / 2, y + h + labelPx + 22);
  g.letterSpacing = '0px'; g.textAlign = 'left';
}

export interface PosterInput { config: DesignConfig; code: string; date?: Date }

export async function renderPoster({ config, code, date = new Date() }: PosterInput): Promise<HTMLCanvasElement> {
  if (!snapshotter.take) throw new Error('Xe chưa tải xong');
  await Promise.all([300, 400, 500, 600, 700, 800].flatMap(w => [document.fonts.load(font(w, 40), 'Đ'), document.fonts.load(display(w, 40), 'Đ')]));

  // ---- chụp ảnh các góc
  const HERO = { x: M, y: 390, w: W - 2 * M, h: 1400 };
  const GAP = 40, SMALL_W = (W - 2 * M - 3 * GAP) / 4, SMALL = { y: HERO.y + HERO.h + GAP, h: 520 };
  const smallViews: ViewId[] = ['front', 'side', 'rear', 'rear34'];
  const [heroUrl] = snapshotter.take(['front34'], HERO.w, HERO.h);
  const smallUrls = snapshotter.take(smallViews, Math.round(SMALL_W * 2), SMALL.h * 2);  // chụp 2x rồi thu nhỏ: nét hơn
  const [heroImg, ...smallImgs] = await Promise.all([heroUrl, ...smallUrls].map(loadImage));

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

  // ---- màu sử dụng: 1 tấm glass tới sát chân trang, các ô màu căn giữa (ít màu → ô to, nhiều màu → ô nhỏ)
  const FY = H - 150, PAD = 56;
  const PY = SMALL.y + SMALL.h + 60;
  const P = { x: M, y: PY, w: W - 2 * M, h: FY - 50 - PY };
  glass(g, P.x, P.y, P.w, P.h, 32);
  const colors = usedColors(config);
  eyebrow(g, t.poster.colors(colors.length), P.x + PAD, P.y + PAD + 26);
  const n = colors.length;
  const cols = n <= 4 ? 4 : n <= 6 ? 6 : 8;
  const SG = cols === 8 ? 30 : 40;                                     // khoảng cách giữa các ô
  const SW = (P.w - 2 * PAD - (cols - 1) * SG) / cols;                 // bề ngang 1 ô
  const SH = cols === 4 ? 300 : cols === 6 ? 230 : 160, LBL = cols === 8 ? 30 : 36;
  const TILE_H = SH + LBL + 40, ROW_GAP = 34;
  const rows = Math.ceil(n / cols);
  const areaTop = P.y + PAD + 70, areaH = P.y + P.h - PAD - areaTop;
  const gridH = rows * TILE_H + (rows - 1) * ROW_GAP;
  let gy = areaTop + Math.max(0, (areaH - gridH) / 2);
  for (let r = 0; r < rows; r++) {
    const row = colors.slice(r * cols, (r + 1) * cols);
    const rowW = row.length * SW + (row.length - 1) * SG;
    let gx = P.x + (P.w - rowW) / 2;                                   // căn giữa từng hàng
    for (const hex of row) { drawSwatch(g, hex, gx, gy, SW, SH, 26, LBL); gx += SW + SG; }
    gy += TILE_H + ROW_GAP;
  }

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
