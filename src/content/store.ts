// Nội dung web đang hiển thị. Nạp từ /api/content (R2) lúc mở trang; lần mở sau hiện ngay bản đã nhớ trong trình duyệt
// rồi cập nhật nếu CMS vừa đổi. Trang xem trước trong CMS (/?cms-preview) nhận nội dung nháp qua postMessage.
import { create } from 'zustand';
import { DEFAULT_CONTENT, normalizeContent, type SiteContent } from './schema';

const CACHE_KEY = 'vf3-content';
export const IS_PREVIEW = new URLSearchParams(location.search).has('cms-preview');

interface ContentState {
  content: SiteContent;
  loaded: boolean;              // đã có nội dung (bản nhớ hoặc bản mới) → hiện chữ hero
  focusLook: number | null;     // CMS đang sửa màu xe thứ mấy → hero hiện đúng màu đó
}

function cached(): SiteContent | null {
  try { const raw = localStorage.getItem(CACHE_KEY); return raw ? normalizeContent(JSON.parse(raw)) : null; } catch { return null; }
}

const initial = IS_PREVIEW ? null : cached();
export const useContent = create<ContentState>(() => ({ content: initial ?? DEFAULT_CONTENT, loaded: !!initial, focusLook: null }));

/** Gọi 1 lần lúc mở trang (main.tsx). */
export function loadContent() {
  if (IS_PREVIEW) return listenPreview();
  // chờ tối đa 1,5s: mạng chậm thì hiện nội dung mặc định, có bản mới sẽ tự thay
  const timer = setTimeout(() => useContent.setState({ loaded: true }), 1500);
  fetch('/api/content', { cache: 'no-cache' })
    .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
    .then(data => {
      const content = normalizeContent(data);
      useContent.setState({ content, loaded: true });
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(content)); } catch { /* hết chỗ: bỏ qua */ }
    })
    .catch(() => useContent.setState({ loaded: true }))
    .finally(() => clearTimeout(timer));
}

export interface PreviewMessage { type: 'cms-preview'; content: SiteContent; focusLook: number | null }

function listenPreview() {
  addEventListener('message', (e: MessageEvent<PreviewMessage>) => {
    if (e.origin !== location.origin || e.data?.type !== 'cms-preview') return;
    useContent.setState({ content: normalizeContent(e.data.content), loaded: true, focusLook: e.data.focusLook });
  });
  parent.postMessage({ type: 'cms-preview-ready' }, location.origin);
}
