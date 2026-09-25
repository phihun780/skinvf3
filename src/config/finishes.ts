// Chất bề mặt người dùng chọn: chỉ Bóng và Nhám (như phim wrap / nhựa thật). Tham số MeshPhysicalMaterial.
export type FinishId = 'gloss' | 'matte';

export interface Finish {
  name: string;
  roughness: number;
  metalness: number;
  clearcoat: number;
  clearcoatRoughness: number;
}

export const FINISHES: Record<FinishId, Finish> = {
  gloss: { name: 'Bóng', roughness: 0.32, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03 },
  matte: { name: 'Nhám', roughness: 0.8,  metalness: 0, clearcoat: 0, clearcoatRoughness: 0 },
};

/** Vùng kim loại (nẹp chrome, ốc, mâm): "Bóng" hiển thị như kim loại bóng thay vì sơn bóng. */
export const METAL_ZONES: Record<string, Partial<Finish>> = {
  chrome: { roughness: 0.08, metalness: 1, clearcoat: 0 },
  nuts:   { roughness: 0.15, metalness: 1, clearcoat: 0 },
  rim:    { roughness: 0.3,  metalness: 0.7 },
};

/** Thiết kế lưu từ bản cũ (metallic, satin, chrome…) → Bóng / Nhám. */
export const normalizeFinish = (f: string): FinishId =>
  f === 'gloss' || f === 'matte' ? f : ['satin', 'plastic'].includes(f) ? 'matte' : 'gloss';
