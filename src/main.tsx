import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/app.css';
import { useDesign } from './store/design';
import { LAYOUT } from './config/layout';
import { MODEL_URL } from './three/modelUrl';
import { loadContent } from './content/store';

const IS_CMS = /^\/cms\/?$/.test(location.pathname);

// nội dung web (CMS) — tải song song với code
if (!IS_CMS) loadContent();

// tải model ngay từ đầu, song song với code (không chờ tới lúc dựng xe ở hero)
document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'preload', as: 'fetch', href: MODEL_URL, crossOrigin: 'anonymous' }));

const css = document.documentElement.style;
css.setProperty('--frame', LAYOUT.frame + 'px');
css.setProperty('--gutter', LAYOUT.gutter + 'px');
css.setProperty('--panel-w', LAYOUT.panelWidth + 'px');
// bề rộng thanh cuộn của trình duyệt (0 với thanh cuộn nổi trên điện thoại / macOS) và bề rộng khung dùng chung
const probe = Object.assign(document.createElement('div'), { style: 'position:absolute;top:-999px;width:100px;height:100px;overflow:scroll' });
document.body.appendChild(probe);
const sbw = probe.offsetWidth - probe.clientWidth; probe.remove();
css.setProperty('--sbw', sbw + 'px');
const setVw = () => css.setProperty('--vw', innerWidth - sbw + 'px');
setVw(); addEventListener('resize', setVw);

// chỉ khi chạy dev: cho phép đọc/đổi trạng thái từ console để kiểm thử
if (import.meta.env.DEV) {
  Object.assign(window, { __design: useDesign });
  import('./three/snapshot').then(m => Object.assign(window, { __snap: m.snapshotter }));  // render ảnh trang chủ (PLAN.md)
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
