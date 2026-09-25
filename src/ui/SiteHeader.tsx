// Thanh trên: logo · menu. Cuộn xuống thì thanh có nền kính mờ.
import { useEffect, useState } from 'react';
import { Link, ROUTES } from '../router';
import { BRAND } from '../config/brand';
import { NavLinks } from './NavLinks';

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(scrollY > 24);
    on(); addEventListener('scroll', on, { passive: true }); return () => removeEventListener('scroll', on);
  }, []);
  return (
    <header className={'topbar' + (scrolled ? ' scrolled' : '')}>
      <Link className="logo" to={ROUTES.home}><span className="logo-mark">{BRAND.mark}</span><span>{BRAND.name}<small>{BRAND.tagline}</small></span></Link>
      <NavLinks />
    </header>
  );
}
