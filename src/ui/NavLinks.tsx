// Menu chính (trang chủ là trang duy nhất): Trang chủ · Tính năng · Mẫu tham khảo · Tự phối màu.
// Bấm = cuộn mượt tới mục. Mục đang xem có 1 nền sáng trượt mượt sang mục khác khi cuộn.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, ROUTES } from '../router';
import { t } from '../config/i18n/vi';

export const LINKS = [
  { id: '', label: t.nav.home },
  { id: 'tinh-nang', label: t.nav.features },
  { id: 'mau', label: t.nav.gallery },
  { id: 'phoi-xe', label: t.nav.configurator },
];
const SECTIONS = ['tinh-nang', 'mau', 'phoi-xe'];

/** Mục đang xem: mục cuối cùng có mép trên đã qua 40% chiều cao màn hình ('' = đầu trang). */
export function useCurrentSection() {
  const [current, setCurrent] = useState('');
  useEffect(() => {
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        let cur = '';
        for (const id of SECTIONS) {
          const el = document.getElementById(id);
          if (el && el.getBoundingClientRect().top < innerHeight * 0.4) cur = id;
        }
        // đã cuộn qua khỏi khung phối màu (xuống hỏi đáp) → không làm sáng mục nào
        const cfg = document.getElementById('phoi-xe');
        if (cur === 'phoi-xe' && cfg && cfg.getBoundingClientRect().bottom < innerHeight * 0.4) cur = '-';
        setCurrent(cur);
      });
    };
    on(); addEventListener('scroll', on, { passive: true }); addEventListener('resize', on);
    return () => { cancelAnimationFrame(raf); removeEventListener('scroll', on); removeEventListener('resize', on); };
  }, []);
  return current;
}

export function NavLinks() {
  const current = useCurrentSection();
  const refs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);

  // vị trí nền sáng = mục đang xem
  useLayoutEffect(() => {
    const place = () => {
      const el = refs.current[current];
      setPill(el ? { left: el.offsetLeft, width: el.offsetWidth } : null);
    };
    place(); addEventListener('resize', place); return () => removeEventListener('resize', place);
  }, [current]);

  return (
    <nav className="nav">
      <span className={'nav-pill' + (pill ? '' : ' hidden')} style={pill ? { transform: `translateX(${pill.left}px)`, width: pill.width } : undefined} aria-hidden />
      {LINKS.map(({ id, label }) => (
        <Link key={id} to={ROUTES.home + (id ? '#' + id : '')} ref={el => { refs.current[id] = el; }}
          className={current === id ? 'active' : undefined} aria-current={current === id ? 'true' : undefined}>{label}</Link>
      ))}
    </nav>
  );
}
