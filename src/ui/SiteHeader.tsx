// Thanh trên: logo · menu. Cuộn xuống thì thanh có nền kính mờ.
// Màn hẹp (điện thoại): menu gọn trong nút ☰ → bảng kính thả xuống, đủ 4 mục, chạm là cuộn tới mục rồi tự đóng.
import { useEffect, useState } from 'react';
import { Link, ROUTES } from '../router';
import { BRAND } from '../config/brand';
import { LINKS, NavLinks, useCurrentSection } from './NavLinks';

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const current = useCurrentSection();
  useEffect(() => {
    const on = () => setScrolled(scrollY > 24);
    on(); addEventListener('scroll', on, { passive: true }); return () => removeEventListener('scroll', on);
  }, []);
  // đóng menu khi người dùng thật sự cuộn (> 12px), xoay / đổi bề ngang màn hình, bấm Esc.
  // (điện thoại: thanh địa chỉ co giãn cũng phát scroll/resize nhỏ → không tính)
  useEffect(() => {
    if (!open) return;
    const y0 = scrollY, w0 = innerWidth;
    const close = () => setOpen(false);
    const onScroll = () => { if (Math.abs(scrollY - y0) > 12) close(); };
    const onResize = () => { if (innerWidth !== w0) close(); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onResize); addEventListener('keydown', key);
    return () => { removeEventListener('scroll', onScroll); removeEventListener('resize', onResize); removeEventListener('keydown', key); };
  }, [open]);
  return (
    <header className={'topbar' + (scrolled || open ? ' scrolled' : '') + (open ? ' menu-open' : '')}>
      <Link className="logo" to={ROUTES.home}><span className="logo-mark">{BRAND.mark}</span><span>{BRAND.name}<small>{BRAND.tagline}</small></span></Link>
      <NavLinks />
      <button className="menu-btn" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(o => !o)}><i /><i /><i /></button>
      <nav className={'mnav' + (open ? ' open' : '')} aria-hidden={!open}>
        {LINKS.map(({ id, label }) => (
          <Link key={id} to={ROUTES.home + (id ? '#' + id : '')} className={current === id ? 'active' : undefined} tabIndex={open ? 0 : -1}
            onClick={() => setOpen(false)}>{label}</Link>
        ))}
      </nav>
    </header>
  );
}
