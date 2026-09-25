// Màn hẹp: báo mép trên của tấm bảng dưới cùng (bảng màu / bảng decal) cho camera, để xe luôn nằm trong phần còn trống.
import { useEffect, type RefObject } from 'react';
import { useViewer } from '../store/viewer';

export function useSheetTop(ref: RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    const el = ref.current, set = useViewer.getState().setSheetTop;
    if (!active || !el) { set(null); return; }
    const measure = () => {
      const host = el.closest('.studio-embed') ?? document.body;
      set(el.getBoundingClientRect().top - host.getBoundingClientRect().top);
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    addEventListener('resize', measure);
    return () => { ro.disconnect(); removeEventListener('resize', measure); set(null); };
  }, [ref, active]);
}
