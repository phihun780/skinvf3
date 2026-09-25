// Bản phối mẫu (trang chủ + Thư viện mẫu). Mỗi mẫu chỉ ghi vùng khác mặc định; phần còn lại lấy DEFAULT_CONFIG.
// Ảnh thẻ mẫu: public/presets/<id>.webp — tạo lại khi đổi mẫu (xem PLAN.md, mục "Ảnh render sẵn").
import { DEFAULT_CONFIG, type DesignConfig, type ZoneStyle } from './zones';
import type { FinishId } from './finishes';

export interface Preset { id: string; name: string; tag: string; config: DesignConfig }

const TRIM_ZONES = ['mirror', 'mirrorBase', 'aPillar', 'bumperF', 'bumperR', 'skirt', 'grille', 'lowerF', 'lowerR'];
const s = (color: string, finish: FinishId = 'gloss'): ZoneStyle => ({ color, finish });
const paint = (color: string, finish: FinishId = 'gloss') => ({ body: s(color, finish), hood: s(color, finish) });
const trims = (color: string, finish: FinishId = 'matte') => Object.fromEntries(TRIM_ZONES.map(id => [id, s(color, finish)]));
const preset = (id: string, name: string, tag: string, over: DesignConfig): Preset => ({ id, name, tag, config: { ...DEFAULT_CONFIG, ...over } });

export const PRESETS: Preset[] = [
  preset('mint', 'Mint Classic', 'Nhẹ nhàng', { ...paint('#9fd8c8'), roof: s('#f6f6f4'), rim: s('#f6f6f4'), mirror: s('#f6f6f4') }),
  preset('midnight', 'Midnight Racer', 'Thể thao', { ...paint('#1b2a4a'), roof: s('#0e0f11'), rim: s('#9a7b4f'), caliper: s('#b3121c') }),
  preset('sunset', 'Sunset Orange', 'Nổi bật', { ...paint('#e8641c'), roof: s('#0e0f11'), mirror: s('#0e0f11'), rim: s('#0e0f11', 'matte'), caliper: s('#e8641c') }),
  preset('stealth', 'Stealth Matte', 'Cá tính', { ...paint('#2b2d30', 'matte'), roof: s('#2b2d30', 'matte'), ...trims('#0e0f11', 'matte'),
    chrome: s('#0e0f11'), rim: s('#0e0f11', 'matte'), caliper: s('#e7d21a'), nuts: s('#0e0f11', 'matte') }),
  preset('sakura', 'Sakura Pastel', 'Dễ thương', { ...paint('#f0b7c4', 'matte'), roof: s('#f6f6f4'), mirror: s('#f6f6f4'), rim: s('#f6f6f4'), caliper: s('#f6f6f4') }),
  preset('desert', 'Desert Sand', 'Off-road', { ...paint('#b89a74', 'matte'), roof: s('#0e0f11', 'matte'), ...trims('#3a3c40'), rim: s('#0e0f11', 'matte'), caliper: s('#e8641c') }),
];

export const presetById = (id: string | null) => PRESETS.find(p => p.id === id);
