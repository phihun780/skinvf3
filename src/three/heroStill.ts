// Ảnh chụp khung đầu tiên của xe ở hero, lưu trong trình duyệt. F5 lại → hiện ngay ảnh này (đúng khung hình, đúng góc)
// trong lúc model 3D đang dựng, rồi xe 3D thật hiện đè lên → không còn màn chờ.
// Khoá theo cỡ khung + màu xe đầu tiên + phiên bản model: đổi cỡ cửa sổ / đổi màu trong CMS / đổi model thì chụp lại.
import MODEL from '../generated/model-version.json';

const STORAGE_KEY = 'vf3-hero-still';

export const stillKey = (w: number, h: number, lookKey: string) => `${MODEL.version}|${lookKey}|${Math.round(w)}x${Math.round(h)}`;

export function readStill(key: string): string | null {
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return v?.key === key ? v.url : null;
  } catch { return null; }
}

export function writeStill(key: string, url: string) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ key, url })); } catch { /* hết chỗ: bỏ qua */ }
}
