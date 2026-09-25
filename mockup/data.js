// Dữ liệu mockup — bản thật sẽ tách thành src/config/*.ts (xem PLAN.md).

export const BRAND = { name: 'VF3 Custom Studio', short: 'VF3 Studio' };

// Chất bề mặt → tham số MeshPhysicalMaterial
export const FINISHES = {
  gloss:    { name: 'Bóng',      roughness: 0.32, metalness: 0,    clearcoat: 1,    clearcoatRoughness: 0.03 },
  metallic: { name: 'Metallic',  roughness: 0.38, metalness: 0.65, clearcoat: 1,    clearcoatRoughness: 0.04 },
  pearl:    { name: 'Ngọc trai', roughness: 0.3,  metalness: 0.2,  clearcoat: 1,    clearcoatRoughness: 0.03, iridescence: 0.8, iridescenceIOR: 1.3 },
  satin:    { name: 'Satin',     roughness: 0.5,  metalness: 0.15, clearcoat: 0.35, clearcoatRoughness: 0.35 },
  matte:    { name: 'Nhám',      roughness: 0.85, metalness: 0,    clearcoat: 0,    clearcoatRoughness: 0 },
  chrome:   { name: 'Chrome',    roughness: 0.06, metalness: 1,    clearcoat: 0,    clearcoatRoughness: 0 },
  plastic:  { name: 'Nhựa',      roughness: 0.72, metalness: 0,    clearcoat: 0,    clearcoatRoughness: 0 },
};

export const PALETTE = [
  { name: 'Trắng ngà',     hex: '#e9e6df' },
  { name: 'Trắng tinh',    hex: '#f6f6f4' },
  { name: 'Bạc',           hex: '#c3c6cb' },
  { name: 'Xám xi măng',   hex: '#8e9196' },
  { name: 'Xám than',      hex: '#3a3c40' },
  { name: 'Xám graphite',  hex: '#2b2d30' },
  { name: 'Đen nhựa',      hex: '#1a1b1e' },
  { name: 'Đen',           hex: '#0e0f11' },
  { name: 'Đỏ',            hex: '#b3121c' },
  { name: 'Cam',           hex: '#e8641c' },
  { name: 'Vàng chanh',    hex: '#e7d21a' },
  { name: 'Vàng mù tạt',   hex: '#d9a21b' },
  { name: 'Be',            hex: '#d8cbb0' },
  { name: 'Nâu cát',       hex: '#b89a74' },
  { name: 'Xanh rêu',      hex: '#56633f' },
  { name: 'Xanh lá',       hex: '#2f7d4a' },
  { name: 'Xanh bạc hà',   hex: '#9fd8c8' },
  { name: 'Xanh ngọc',     hex: '#1aa39a' },
  { name: 'Xanh dương',    hex: '#1e56c8' },
  { name: 'Xanh navy',     hex: '#1b2a4a' },
  { name: 'Tím',           hex: '#6a3fa0' },
  { name: 'Hồng pastel',   hex: '#f0b7c4' },
  { name: 'Đồng',          hex: '#9a7b4f' },
  { name: 'Bạc chrome',    hex: '#d9dbde' },
  { name: 'Vàng champagne',hex: '#d8b775' },
];

export const GROUPS = { paint: 'Sơn', trim: 'Ốp nhựa ngoại thất', wheel: 'Bánh xe', detail: 'Chi tiết' };

// Vùng cho người dùng chỉnh (id theo shared/vf3-zones.js). Lốp, đĩa phanh, moay-ơ, kính, đèn giữ vật liệu gốc.
// Kính chưa cho chỉnh vì model không có nội thất (phim sáng sẽ nhìn xuyên thấy khoang trống).
export const EDITABLE = [
  'body', 'hood', 'roof',
  'mirror', 'mirrorBase', 'aPillar', 'bumperF', 'bumperR', 'skirt', 'grille', 'lowerF', 'lowerR',
  'rim', 'caliper', 'nuts',
  'chrome',
];

const trims = (color, finish = 'plastic') => Object.fromEntries(
  ['mirror', 'mirrorBase', 'aPillar', 'bumperF', 'bumperR', 'skirt', 'grille', 'lowerF', 'lowerR'].map(id => [id, { color, finish }]));

export const DEFAULT_CONFIG = {
  body:    { color: '#e9e6df', finish: 'gloss' },
  hood:    { color: '#e9e6df', finish: 'gloss' },
  roof:    { color: '#0e0f11', finish: 'gloss' },
  ...trims('#1a1b1e'),
  rim:     { color: '#c3c6cb', finish: 'metallic' },
  caliper: { color: '#3a3c40', finish: 'satin' },
  nuts:    { color: '#c3c6cb', finish: 'chrome' },
  chrome:  { color: '#d9dbde', finish: 'chrome' },
};

// Thư viện mẫu
export const PRESETS = [
  { id: 'mint', name: 'Mint Classic', tag: 'Nhẹ nhàng', config: { ...DEFAULT_CONFIG,
    body: { color: '#9fd8c8', finish: 'gloss' }, hood: { color: '#9fd8c8', finish: 'gloss' }, roof: { color: '#f6f6f4', finish: 'gloss' },
    rim: { color: '#f6f6f4', finish: 'gloss' }, mirror: { color: '#f6f6f4', finish: 'gloss' } } },
  { id: 'midnight', name: 'Midnight Racer', tag: 'Thể thao', config: { ...DEFAULT_CONFIG,
    body: { color: '#1b2a4a', finish: 'metallic' }, hood: { color: '#1b2a4a', finish: 'metallic' }, roof: { color: '#0e0f11', finish: 'gloss' },
    rim: { color: '#9a7b4f', finish: 'metallic' }, caliper: { color: '#b3121c', finish: 'gloss' } } },
  { id: 'sunset', name: 'Sunset Orange', tag: 'Nổi bật', config: { ...DEFAULT_CONFIG,
    body: { color: '#e8641c', finish: 'gloss' }, hood: { color: '#e8641c', finish: 'gloss' }, roof: { color: '#0e0f11', finish: 'gloss' },
    mirror: { color: '#0e0f11', finish: 'gloss' }, rim: { color: '#0e0f11', finish: 'satin' }, caliper: { color: '#e8641c', finish: 'gloss' } } },
  { id: 'stealth', name: 'Stealth Matte', tag: 'Cá tính', config: { ...DEFAULT_CONFIG,
    body: { color: '#2b2d30', finish: 'matte' }, hood: { color: '#2b2d30', finish: 'matte' }, roof: { color: '#2b2d30', finish: 'matte' },
    ...trims('#0e0f11', 'matte'), chrome: { color: '#0e0f11', finish: 'gloss' },
    rim: { color: '#0e0f11', finish: 'matte' }, caliper: { color: '#e7d21a', finish: 'gloss' }, nuts: { color: '#0e0f11', finish: 'matte' } } },
  { id: 'sakura', name: 'Sakura Pastel', tag: 'Dễ thương', config: { ...DEFAULT_CONFIG,
    body: { color: '#f0b7c4', finish: 'satin' }, hood: { color: '#f0b7c4', finish: 'satin' }, roof: { color: '#f6f6f4', finish: 'gloss' },
    mirror: { color: '#f6f6f4', finish: 'gloss' }, rim: { color: '#f6f6f4', finish: 'gloss' }, caliper: { color: '#f6f6f4', finish: 'gloss' } } },
  { id: 'desert', name: 'Desert Sand', tag: 'Off-road', config: { ...DEFAULT_CONFIG,
    body: { color: '#b89a74', finish: 'matte' }, hood: { color: '#b89a74', finish: 'matte' }, roof: { color: '#0e0f11', finish: 'matte' },
    ...trims('#3a3c40'), rim: { color: '#0e0f11', finish: 'matte' }, caliper: { color: '#e8641c', finish: 'gloss' } } },
];
