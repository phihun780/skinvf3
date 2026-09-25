// Điều hướng tối giản. Web chỉ có 1 trang (trang chủ); menu chỉ cuộn mượt tới các mục (#tinh-nang, #mau, #phoi-xe…).
// Máy chủ vẫn trả index.html cho mọi đường dẫn (public/_redirects, vercel.json) để link cũ /phoi-xe còn mở được.
import type { AnchorHTMLAttributes, MouseEvent, Ref } from 'react';

export const ROUTES = { home: '/', configurator: '/phoi-xe' } as const;

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function navigate(to: string) {
  const url = new URL(to, location.href);
  if (url.pathname !== location.pathname) { location.assign(to); return; }
  history.replaceState(null, '', url.pathname + url.search + url.hash);
  const behavior: ScrollBehavior = reducedMotion() ? 'auto' : 'smooth';
  if (url.hash) document.querySelector(url.hash)?.scrollIntoView({ behavior });
  else scrollTo({ top: 0, behavior });
}

/** Thẻ <a> điều hướng trong app (giữ Ctrl/Cmd+click mở tab mới như link thường). */
export function Link({ to, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; ref?: Ref<HTMLAnchorElement> }) {
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault(); navigate(to);
  };
  return <a href={to} onClick={handle} {...rest} />;
}
