// Bảng màu gợi ý (tên hiển thị + mã HEX). Thêm/bớt màu ở đây.
export interface PaletteColor { name: string; hex: string }

export const PALETTE: PaletteColor[] = [
  { name: 'Trắng ngà',      hex: '#e9e6df' },
  { name: 'Trắng tinh',     hex: '#f6f6f4' },
  { name: 'Bạc',            hex: '#c3c6cb' },
  { name: 'Xám xi măng',    hex: '#8e9196' },
  { name: 'Xám than',       hex: '#3a3c40' },
  { name: 'Xám graphite',   hex: '#2b2d30' },
  { name: 'Đen nhựa',       hex: '#1a1b1e' },
  { name: 'Đen',            hex: '#0e0f11' },
  { name: 'Đỏ',             hex: '#b3121c' },
  { name: 'Cam',            hex: '#e8641c' },
  { name: 'Vàng chanh',     hex: '#e7d21a' },
  { name: 'Vàng mù tạt',    hex: '#d9a21b' },
  { name: 'Be',             hex: '#d8cbb0' },
  { name: 'Nâu cát',        hex: '#b89a74' },
  { name: 'Xanh rêu',       hex: '#56633f' },
  { name: 'Xanh lá',        hex: '#2f7d4a' },
  { name: 'Xanh bạc hà',    hex: '#9fd8c8' },
  { name: 'Xanh ngọc',      hex: '#1aa39a' },
  { name: 'Xanh dương',     hex: '#1e56c8' },
  { name: 'Xanh navy',      hex: '#1b2a4a' },
  { name: 'Tím',            hex: '#6a3fa0' },
  { name: 'Hồng pastel',    hex: '#f0b7c4' },
  { name: 'Đồng',           hex: '#9a7b4f' },
  { name: 'Bạc chrome',     hex: '#d9dbde' },
  { name: 'Vàng champagne', hex: '#d8b775' },
];

export const colorName = (hex: string) =>
  PALETTE.find(p => p.hex.toLowerCase() === hex.toLowerCase())?.name ?? 'Màu tuỳ chọn';
