// Vùng custom. Tên + nhóm lấy từ src/generated/zones.json (do `npm run bake` sinh ra từ shared/vf3-zones.js).
import type { FinishId } from './finishes';
import ZONE_LIST from '../generated/zones.json';

export type ZoneGroup = 'paint' | 'trim' | 'wheel' | 'detail';
export interface ZoneInfo { id: string; name: string; group: ZoneGroup | null }
export interface ZoneStyle { color: string; finish: FinishId }
export type DesignConfig = Record<string, ZoneStyle>;

export const ZONES = ZONE_LIST as ZoneInfo[];
export const zoneInfo = (id: string) => ZONES.find(z => z.id === id);

export const GROUPS: Record<ZoneGroup, string> = { paint: 'Sơn', trim: 'Ốp nhựa ngoại thất', wheel: 'Bánh xe', detail: 'Chi tiết' };

// Vùng người dùng được chỉnh. Lốp, đĩa phanh, moay-ơ, kính, đèn giữ vật liệu gốc của model.
// Kính chưa cho chỉnh: model không có nội thất, phim sáng sẽ nhìn xuyên thấy khoang trống.
export const EDITABLE = [
  'body', 'hood', 'roof',
  'mirror', 'mirrorBase', 'aPillar', 'bumperF', 'bumperR', 'skirt', 'grille', 'lowerF', 'lowerR',
  'rim', 'caliper', 'nuts',
  'chrome',
] as const;
/** Tên ngắn cho dải chọn vùng trên điện thoại (tên đầy đủ ở zones.json). */
export const SHORT_NAMES: Record<string, string> = {
  body: 'Thân xe', hood: 'Capo', roof: 'Nóc', mirror: 'Vỏ gương', mirrorBase: 'Chân gương', aPillar: 'Trụ A',
  bumperF: 'Cản trước', bumperR: 'Cản sau', skirt: 'Ốp sườn', grille: 'Ca-lăng', lowerF: 'Ốp dưới trước', lowerR: 'Ốp dưới sau',
  rim: 'Mâm', caliper: 'Cùm phanh', nuts: 'Ốc bánh', chrome: 'Nẹp chrome',
};
export const isEditable = (id: unknown): id is string => typeof id === 'string' && (EDITABLE as readonly string[]).includes(id);

const trims = (color: string, finish: FinishId = 'matte'): DesignConfig => Object.fromEntries(
  ['mirror', 'mirrorBase', 'aPillar', 'bumperF', 'bumperR', 'skirt', 'grille', 'lowerF', 'lowerR'].map(id => [id, { color, finish }]));

// Mặc định: thân + nóc trắng ngà, ốp nhựa đen, mâm bạc.
export const DEFAULT_CONFIG: DesignConfig = {
  body: { color: '#e9e6df', finish: 'gloss' },
  hood: { color: '#e9e6df', finish: 'gloss' },
  roof: { color: '#e9e6df', finish: 'gloss' },
  ...trims('#1a1b1e'),
  rim: { color: '#c3c6cb', finish: 'gloss' },
  caliper: { color: '#3a3c40', finish: 'matte' },
  nuts: { color: '#c3c6cb', finish: 'gloss' },
  chrome: { color: '#d9dbde', finish: 'gloss' },
};
