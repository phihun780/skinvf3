// Chuẩn bị ảnh decal: ảnh tải lên (PNG/JPG/WEBP), chữ, ảnh thư viện → { src, aspect }.
import type { DecalDraft } from '../store/design';
import { TEXT_STYLES, UPLOAD_MAX_MB, UPLOAD_MAX_PX, UPLOAD_TYPES } from '../config/decals';

const loadImage = (src: string) => new Promise<HTMLImageElement>((ok, fail) => {
  const img = new Image(); img.onload = () => ok(img); img.onerror = () => fail(new Error('Không đọc được ảnh')); img.src = src;
});

/** Tỉ lệ rộng/cao của ảnh (dùng cho decal thư viện). */
export async function imageAspect(src: string) {
  const img = await loadImage(src);
  return img.naturalWidth / img.naturalHeight;
}

/** Ảnh người dùng tải lên → thu nhỏ còn cạnh dài ≤ UPLOAD_MAX_PX, lưu WebP (giữ nền trong suốt của PNG/WebP). */
export async function prepareUpload(file: File): Promise<DecalDraft> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  const okType = UPLOAD_TYPES.includes(file.type) || ['png', 'jpg', 'jpeg', 'webp'].includes(ext ?? '');
  if (!okType) throw new Error('Chỉ nhận ảnh PNG, JPG hoặc WEBP');
  if (file.size > UPLOAD_MAX_MB * 1048576) throw new Error(`Ảnh lớn hơn ${UPLOAD_MAX_MB}MB`);

  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const k = Math.min(1, UPLOAD_MAX_PX / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * k)), h = Math.max(1, Math.round(img.naturalHeight * k));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d')!.drawImage(img, 0, 0, w, h);
    const webp = c.toDataURL('image/webp', 0.9);
    // trình duyệt không hỗ trợ xuất WebP thì trả về PNG
    const src = webp.startsWith('data:image/webp') ? webp : c.toDataURL('image/png');
    return { src, aspect: w / h, label: file.name.replace(/\.[^.]+$/, '') };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Chữ → ảnh PNG nền trong suốt, vẽ bằng phông của web. */
export async function renderText(text: string, color: string, styleId: string): Promise<DecalDraft> {
  const style = TEXT_STYLES.find(s => s.id === styleId) ?? TEXT_STYLES[0];
  const px = 200, font = style.font.replace('{px}', String(px));
  await document.fonts.load(font, text);
  const measure = document.createElement('canvas').getContext('2d')!;
  measure.font = font;
  const m = measure.measureText(text);
  const pad = px * 0.12;
  const w = Math.ceil(m.actualBoundingBoxLeft + m.actualBoundingBoxRight + pad * 2);
  const h = Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent + pad * 2);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d')!;
  g.font = font; g.fillStyle = color; g.textBaseline = 'alphabetic';
  g.fillText(text, pad + m.actualBoundingBoxLeft, pad + m.actualBoundingBoxAscent);
  return { src: c.toDataURL('image/png'), aspect: w / h, label: `Chữ “${text}”` };
}
