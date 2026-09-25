// Biểu tượng nét mảnh cho các thẻ "Sử dụng đơn giản" (chọn trong CMS). Thêm biểu tượng: thêm 1 dòng vào STEP_ICONS.
import type { ReactNode } from 'react';

export const STEP_ICONS: Record<string, { label: string; svg: ReactNode }> = {
  cursor: { label: 'Con trỏ', svg: <path d="M5 3l6 16 2.5-6.5L20 10 5 3z" /> },
  palette: { label: 'Bảng màu', svg: <><circle cx="12" cy="12" r="9" /><circle cx="8" cy="10" r="1.3" /><circle cx="12" cy="7.5" r="1.3" /><circle cx="16" cy="10" r="1.3" /><path d="M12 21a2.5 2.5 0 0 1 0-5h1.5a2.5 2.5 0 0 0 0-5" /></> },
  poster: { label: 'Hình ảnh', svg: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 14l3-3 2 2 3-3" /><path d="M8 18h8" /></> },
  decal: { label: 'Decal', svg: <><path d="M4 4h11l5 5v11H4z" /><path d="M15 4v5h5" /><path d="M8 15l2.5-3 2 2.2L14 12l2 3" /></> },
  download: { label: 'Tải về', svg: <><path d="M12 4v11" /><path d="M7 10l5 5 5-5" /><path d="M5 20h14" /></> },
  car: { label: 'Xe', svg: <><path d="M4 15l1.6-5A2 2 0 0 1 7.5 8.6h9a2 2 0 0 1 1.9 1.4L20 15" /><rect x="3" y="15" width="18" height="4" rx="1.5" /><circle cx="7.5" cy="19" r="1.5" /><circle cx="16.5" cy="19" r="1.5" /></> },
  sparkle: { label: 'Lấp lánh', svg: <><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /><path d="M19 16l.7 1.9 1.8.6-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.6z" /></> },
  shop: { label: 'Tiệm', svg: <><path d="M4 9l1.5-5h13L20 9" /><path d="M4 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0A2.7 2.7 0 0 0 20 9" /><path d="M5.5 11.5V20h13v-8.5" /><path d="M10 20v-5h4v5" /></> },
};
export type StepIconId = keyof typeof STEP_ICONS;

export const Icon = ({ name }: { name: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{(STEP_ICONS[name] ?? STEP_ICONS.cursor).svg}</svg>
);
