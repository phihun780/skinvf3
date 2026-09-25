// Cầu nối chụp ảnh khung 3D từ ngoài Canvas (poster). Studio đăng ký hàm khi xe đã tải xong.
import type { ViewId } from '../store/viewer';

export const snapshotter: {
  /** Chụp các góc `views`, mỗi ảnh w×h px, nền trong suốt → data URL PNG. null khi xe chưa tải xong. */
  take: ((views: ViewId[], w: number, h: number) => string[]) | null;
} = { take: null };
