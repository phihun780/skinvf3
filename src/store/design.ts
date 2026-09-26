// Trạng thái thiết kế: màu/chất từng vùng + decal + phụ kiện, hoàn tác/làm lại, chế độ (màu sơn / decal), vùng đang rê/chọn,
// tự lưu vào localStorage.
import { create } from 'zustand';
import { DEFAULT_CONFIG, type DesignConfig, type ZoneStyle } from '../config/zones';
import { normalizeFinish } from '../config/finishes';

// chất bề mặt cũ (metallic, satin…) → Bóng / Nhám
const normalize = (c: DesignConfig): DesignConfig =>
  Object.fromEntries(Object.entries(c).map(([k, v]) => [k, { ...v, finish: normalizeFinish(v.finish) }]));
import { MIRROR_X } from '../config/decals';
import { normalizeFitted, type Fitted } from '../config/accessories';

const STORAGE_KEY = 'vf3-design';
const HISTORY_LIMIT = 100;

type Vec3 = [number, number, number];
export interface Decal {
  id: string;
  label: string;
  src: string;        // URL thư viện (/decals/…) hoặc data URL (ảnh tải lên / chữ)
  aspect: number;     // rộng / cao của ảnh
  position: Vec3;     // điểm dán (toạ độ world)
  normal: Vec3;       // pháp tuyến bề mặt tại điểm dán
  size: number;       // bề ngang decal (m)
  rotation: number;   // độ, quanh pháp tuyến
  opacity: number;    // 0–1
  flip: boolean;      // lật ngang
}
/** Decal đang chờ dán (đã chọn trong panel, chưa bấm lên xe). */
export type DecalDraft = Pick<Decal, 'label' | 'src' | 'aspect'>;

interface Design { config: DesignConfig; decals: Decal[]; accessories: Fitted }
interface Saved extends Design { code: string }

const load = (): Saved | null => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; } };
let onPersistError: () => void = () => {};
export const setPersistErrorHandler = (fn: () => void) => { onPersistError = fn; };
const persist = (v: Saved) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(v)); }
  catch { onPersistError(); }  // đầy bộ nhớ (ảnh decal lớn) hoặc trình duyệt chặn lưu
};
const newCode = () => 'VF3-' + Math.random().toString(36).slice(2, 6).toUpperCase();
const newId = () => Math.random().toString(36).slice(2, 10);

export interface Selection { zone: string; x: number; y: number }  // toạ độ màn hình nơi bấm
export type Mode = 'paint' | 'decal' | 'accessory';

interface DesignState extends Design {
  code: string;
  past: Design[];
  future: Design[];
  mode: Mode;
  hovered: string | null;
  selected: Selection | null;        // vùng đang mở bảng màu (chế độ màu sơn)
  selectedDecal: string | null;      // decal đang chọn (chế độ decal)
  pending: DecalDraft | null;        // decal chờ dán
  // màu
  /** Đổi 1 hoặc nhiều vùng, ghi 1 bước hoàn tác. */
  apply: (changes: Record<string, Partial<ZoneStyle>>) => void;
  /** Xem trước khi đang kéo (bảng chọn màu, kéo decal…): đổi ngay nhưng chưa ghi bước hoàn tác; gọi commitPreview khi thả. */
  preview: (zone: string, style: Partial<ZoneStyle>) => void;
  commitPreview: () => void;
  replaceAll: (config: DesignConfig) => void;
  /** Về màu mặc định, xoá toàn bộ decal, tháo phụ kiện (1 bước hoàn tác). */
  resetAll: () => void;
  // decal
  addDecal: (draft: DecalDraft, at: { position: Vec3; normal: Vec3 }, size: number) => void;
  /** live = đang kéo/chỉnh liên tục: chưa ghi hoàn tác (commitPreview khi thả). */
  updateDecal: (id: string, patch: Partial<Decal>, live?: boolean) => void;
  removeDecal: (id: string) => void;
  mirrorDecal: (id: string) => void;
  moveLayer: (id: string, dir: 1 | -1) => void;
  // phụ kiện
  /** Lắp / tháo 1 phụ kiện (1 bước hoàn tác). */
  toggleAccessory: (id: string) => void;
  selectDecal: (id: string | null) => void;
  setPending: (draft: DecalDraft | null) => void;
  // chung
  undo: () => void;
  redo: () => void;
  save: () => void;
  setMode: (mode: Mode) => void;
  setHovered: (zone: string | null) => void;
  select: (sel: Selection | null) => void;
}

const saved = load();
let previewBase: Design | null = null;

export const useDesign = create<DesignState>((set, get) => {
  const snapshot = (): Design => ({ config: get().config, decals: get().decals, accessories: get().accessories });
  const save = () => persist({ ...snapshot(), code: get().code });
  const commit = (next: Partial<Design>) => {
    const before = snapshot();
    set({ ...next, past: [...get().past, before].slice(-HISTORY_LIMIT), future: [] });
    save();
  };
  const livePreview = (next: Partial<Design>) => { previewBase ??= snapshot(); set(next); };
  const mapDecal = (id: string, fn: (d: Decal) => Decal) => get().decals.map(d => d.id === id ? fn(d) : d);

  return {
    // trộn với mặc định để thiết kế lưu từ bản cũ (thiếu vùng mới / chưa có decal) vẫn mở được
    config: normalize({ ...DEFAULT_CONFIG, ...saved?.config }),
    decals: saved?.decals ?? [],
    accessories: normalizeFitted(saved?.accessories),
    code: saved?.code ?? newCode(),
    past: [],
    future: [],
    mode: 'paint',
    hovered: null,
    selected: null,
    selectedDecal: null,
    pending: null,

    apply: changes => {
      const next = { ...get().config };
      for (const [zone, style] of Object.entries(changes)) next[zone] = { ...next[zone], ...style };
      commit({ config: next });
    },
    preview: (zone, style) => { const { config } = get(); livePreview({ config: { ...config, [zone]: { ...config[zone], ...style } } }); },
    commitPreview: () => {
      if (!previewBase) return;
      set({ past: [...get().past, previewBase].slice(-HISTORY_LIMIT), future: [] });
      previewBase = null;
      save();
    },
    replaceAll: config => commit({ config: normalize({ ...DEFAULT_CONFIG, ...config }) }),
    resetAll: () => {
      commit({ config: { ...DEFAULT_CONFIG }, decals: [], accessories: {} });
      set({ selected: null, selectedDecal: null, pending: null });
    },

    addDecal: (draft, at, size) => {
      const d: Decal = { ...draft, ...at, id: newId(), size, rotation: 0, opacity: 1, flip: false };
      commit({ decals: [...get().decals, d] });
      set({ selectedDecal: d.id, pending: null });
    },
    updateDecal: (id, patch, live = false) => {
      const decals = mapDecal(id, d => ({ ...d, ...patch }));
      if (live) livePreview({ decals }); else commit({ decals });
    },
    removeDecal: id => {
      commit({ decals: get().decals.filter(d => d.id !== id) });
      if (get().selectedDecal === id) set({ selectedDecal: null });
    },
    // Bản sao đối xứng qua mặt phẳng giữa xe (trái ↔ phải). Chiếu từ phía bên kia thì hình đã tự đúng chiều khi nhìn
    // từ ngoài vào (chữ đọc xuôi) → giữ nguyên `flip`; chỉ đảo góc nghiêng để 2 bên nghiêng đối xứng.
    // Hình có hướng (mũi tên…) muốn 2 bên cùng chỉ về đầu xe: người dùng bấm "Lật ngang" cho bản sao.
    mirrorDecal: id => {
      const src = get().decals.find(d => d.id === id); if (!src) return;
      const [px, py, pz] = src.position, [nx, ny, nz] = src.normal;
      const copy: Decal = { ...src, id: newId(), position: [2 * MIRROR_X - px, py, pz], normal: [-nx, ny, nz], rotation: -src.rotation };
      commit({ decals: [...get().decals, copy] });
      set({ selectedDecal: copy.id });
    },
    moveLayer: (id, dir) => {
      const list = [...get().decals], i = list.findIndex(d => d.id === id), j = i + dir;
      if (i < 0 || j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]];
      commit({ decals: list });
    },
    toggleAccessory: id => {
      const next = { ...get().accessories };
      if (next[id]) delete next[id]; else next[id] = true;
      commit({ accessories: next });
    },
    selectDecal: id => set({ selectedDecal: id }),
    setPending: draft => set({ pending: draft }),

    undo: () => {
      const { past, future } = get();
      if (!past.length) return;
      set({ ...past[past.length - 1], past: past.slice(0, -1), future: [snapshot(), ...future] });
      save();
    },
    redo: () => {
      const { past, future } = get();
      if (!future.length) return;
      set({ ...future[0], past: [...past, snapshot()], future: future.slice(1) });
      save();
    },
    save,
    setMode: mode => set({ mode, selected: null, selectedDecal: null, pending: null, hovered: null }),
    setHovered: zone => { if (get().hovered !== zone) set({ hovered: zone }); },
    select: sel => set({ selected: sel }),
  };
});
