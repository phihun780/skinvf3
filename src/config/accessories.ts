// Phụ kiện lắp lên xe (tab "Phụ kiện"). Thêm phụ kiện mới: thêm 1 mục ở đây + khối 3D tương ứng trong src/three/.
export interface Accessory { id: string; name: string; desc: string; thumb: string }

export const ACCESSORIES: Accessory[] = [
  { id: 'wheelCover', name: 'Ốp lazang tua-bin', desc: 'Ốp che mâm 5 cánh, trắng – đen, logo V', thumb: '/accessories/wheel-cover.webp' },
];

/** Phụ kiện đang lắp: { id: true }. */
export type Fitted = Record<string, boolean>;
export const normalizeFitted = (v: unknown): Fitted =>
  Object.fromEntries(ACCESSORIES.filter(a => (v as Fitted | null)?.[a.id] === true).map(a => [a.id, true]));
