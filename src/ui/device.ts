// Nhận biết thiết bị: màn cảm ứng (ngón tay) / màn hẹp. Dùng để đổi cách tương tác trên điện thoại.
import { useEffect, useState } from 'react';

export const TOUCH_QUERY = '(pointer: coarse)';
export const NARROW_QUERY = '(max-width: 760px)';
/** Đang dùng ngón tay (điện thoại, máy tính bảng) — đọc 1 lần, không theo dõi thay đổi. */
export const isTouch = () => matchMedia(TOUCH_QUERY).matches;

/** Theo dõi 1 media query (vd. xoay ngang màn hình, kéo cửa sổ). */
export function useMedia(query: string) {
  const [on, setOn] = useState(() => matchMedia(query).matches);
  useEffect(() => {
    const m = matchMedia(query), f = () => setOn(m.matches);
    f(); m.addEventListener('change', f); return () => m.removeEventListener('change', f);
  }, [query]);
  return on;
}
