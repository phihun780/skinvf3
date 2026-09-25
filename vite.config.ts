import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cmsDevApi } from './server/dev-plugin';

// Cổng 5180: 5173 đang dùng cho server tĩnh của inspect/ và mockup/ (importmap CDN, không qua Vite).
// cmsDevApi: chạy API /api/* của CMS ngay trên localhost (trên web thật là Cloudflare Pages Functions).
export default defineConfig({
  plugins: [react(), cmsDevApi()],
  // không theo dõi mockup/ (ảnh chụp, công cụ cũ) và .cms-data/ (nội dung CMS lưu thử) → không tải lại trang vô cớ
  server: { port: 5180, watch: { ignored: ['**/mockup/**', '**/inspect/**', '**/.cms-data/**'] } },
});
