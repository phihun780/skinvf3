// Trạng thái khung nhìn 3D: yêu cầu chuyển góc camera, tự xoay, trình phối toàn màn hình (điện thoại).
import { create } from 'zustand';

export const VIEWS = {
  front34: [0.9, 0.3, 1],
  front: [0, 0.12, 1],
  side: [1, 0.1, 0],
  rear: [0, 0.14, -1],
  rear34: [-0.9, 0.3, -1],
  top: [0.001, 1, 0.3],
} as const satisfies Record<string, readonly [number, number, number]>;
export type ViewId = keyof typeof VIEWS;

interface ViewerState {
  view: ViewId | null;      // null = người dùng đã tự xoay
  request: number;          // tăng mỗi lần bấm chuyển góc (bấm lại cùng góc vẫn chạy)
  autoRotate: boolean;
  goTo: (view: ViewId) => void;
  clearView: () => void;
  toggleAutoRotate: () => void;
  full: boolean;            // điện thoại: trình phối đang mở toàn màn hình
  setFull: (full: boolean) => void;
  sheetMin: boolean;        // màn hẹp: bảng decal đang thu gọn → camera không cần dời xe lên
  setSheetMin: (v: boolean) => void;
}

export const useViewer = create<ViewerState>(set => ({
  view: 'front34',
  request: 0,
  autoRotate: false,
  goTo: view => set(s => ({ view, request: s.request + 1 })),
  clearView: () => set({ view: null }),
  toggleAutoRotate: () => set(s => ({ autoRotate: !s.autoRotate })),
  full: false,
  setFull: full => set({ full }),
  sheetMin: false,
  setSheetMin: sheetMin => set({ sheetMin }),
}));
