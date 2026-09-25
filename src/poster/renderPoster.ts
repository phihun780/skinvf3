// Ghép Hình ảnh SkinVF3 dọc A4 (300dpi) bằng canvas 2D: header thương hiệu + ngày tạo, ảnh 3/4 lớn + lưới 2×2 bốn góc nhìn,
// chân trang ghi địa chỉ web (mờ).
// Style giống web: nền mesh gradient xanh, ảnh xe (nền trong suốt từ snapshotter) đặt trong khung glass.
import { BRAND } from '../config/brand';
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

export const SITE_URL = 'skinvf3.pages.dev';

export async function renderPoster(date = new Date()): Promise<HTMLCanvasElement> {
  if (!snapshotter.take) throw new Error('Xe chưa tải xong');
  await Promise.all([300, 400, 500, 600, 700, 800].flatMap(w => [document.fonts.load(font(w, 40), 'Đ'), document.fonts.load(display(w, 40), 'Đ')]));

  // ---- chụp ảnh các góc
  // ảnh 3/4 trước lớn + lưới 2×2 (trước · bên · sau · 3/4 sau)
  const HERO = { x: M, y: 390, w: W - 2 * M, h: 1500 };
  const GAP = 40, CELL = { w: (W - 2 * M - GAP) / 2, h: 660 }, GRID_Y = HERO.y + HERO.h + GAP;
  const smallViews: ViewId[] = ['front', 'side', 'rear', 'rear34'];
  const [heroUrl] = snapshotter.take(['front34'], HERO.w, HERO.h);
  const smallUrls = snapshotter.take(smallViews, Math.round(CELL.w * 1.5), Math.round(CELL.h * 1.5));  // chụp lớn hơn rồi thu nhỏ: nét hơn
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

  // góc phải: chỉ ngày tạo
  const pad = (n: number) => String(n).padStart(2, '0');
  g.textAlign = 'right';
  g.letterSpacing = '5px'; g.fillStyle = C.muted; g.font = font(600, 25); g.fillText(t.poster.dateLabel.toUpperCase(), W - M, my + 36); g.letterSpacing = '0px';
  g.fillStyle = C.text; g.font = font(800, 56); g.fillText(`${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`, W - M, my + 102);
  g.textAlign = 'left';
  g.fillStyle = C.line; g.fillRect(M, 340, W - 2 * M, 2);

  // ---- ảnh
  drawShot(g, heroImg, HERO.x, HERO.y, HERO.w, HERO.h, t.views.front34, true);
  smallImgs.forEach((img, i) => drawShot(g, img, M + (i % 2) * (CELL.w + GAP), GRID_Y + Math.floor(i / 2) * (CELL.h + GAP), CELL.w, CELL.h, t.views[smallViews[i]]));

  // ---- chân trang: địa chỉ web (mờ) + ghi công mô hình 3D (nhỏ, mờ hơn — giấy phép CC BY yêu cầu ghi tên tác giả)
  const FY = GRID_Y + 2 * CELL.h + GAP + 50;
  g.fillStyle = C.lineSoft; g.fillRect(M, FY, W - 2 * M, 2);
  g.textAlign = 'center';
  g.font = font(600, 34); g.fillStyle = C.faint; g.letterSpacing = '8px';
  g.fillText(SITE_URL, W / 2, FY + 78); g.letterSpacing = '0px';
  g.font = font(400, 19); g.fillStyle = 'rgba(200,220,255,0.3)';
  g.fillText(`Mô hình 3D: ${BRAND.modelCredit}`, W / 2, FY + 122);
  g.textAlign = 'left';
  return cv;
}

export const posterFileName = (date = new Date()) =>
  `SkinVF3_${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}.png`;
