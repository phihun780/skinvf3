import { lazy, Suspense, useEffect } from 'react';
import { ROUTES } from './router';
import { Home } from './pages/Home';
import { setPersistErrorHandler, useDesign } from './store/design';
import { toast } from './ui/Chrome';
import { presetById } from './config/presets';
import { t } from './config/i18n/vi';

const Cms = lazy(() => import('./pages/Cms').then(m => ({ default: m.Cms })));
const IS_CMS = /^\/cms\/?$/.test(location.pathname);

setPersistErrorHandler(() => toast(t.storageFull));

// Web 1 trang. Đường dẫn cũ /phoi-xe[?preset=<id>] (link đã chia sẻ) → áp mẫu nếu có rồi chuyển về /#phoi-xe.
if (location.pathname === ROUTES.configurator) {
  const preset = presetById(new URLSearchParams(location.search).get('preset'));
  if (preset) useDesign.getState().replaceAll(preset.config);
  history.replaceState(null, '', ROUTES.home + '#phoi-xe');
}

export function App() {
  useEffect(() => { if (!IS_CMS) document.title = 'SkinVF3 · Phối màu VinFast VF3 trước khi ra tiệm'; }, []);
  // /cms: trang quản lý nội dung (tải riêng, người xem web không phải tải phần này)
  if (IS_CMS) return <Suspense fallback={null}><Cms /></Suspense>;
  return <Home />;
}
