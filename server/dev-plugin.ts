// API CMS khi chạy `npm run dev` / `npm run preview`. Cấu hình trong file .dev.vars:
//  - CMS_REMOTE=https://skinvf3.pages.dev → chuyển mọi yêu cầu /api/* sang web thật: đăng nhập bằng CMS_PASSWORD thật
//    (đặt trên Cloudflare), bấm Lưu ở localhost là sửa thẳng nội dung web thật (R2 thật). Mặc định đang dùng cách này.
//  - bỏ CMS_REMOTE → chạy thử riêng trên máy: nội dung lưu vào .cms-data/ (giả lập R2), mật khẩu = CMS_PASSWORD trong .dev.vars.
import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { handleApi, type Bucket } from './cms-api';

function readVars(file: string): Record<string, string> {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(fs.readFileSync(file, 'utf8').split(/\r?\n/)
    .map(l => /^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/.exec(l)).filter(m => m).map(m => [m![1], m![2]]));
}

function fileBucket(dir: string): Bucket {
  const file = (key: string) => path.join(dir, ...key.split('/'));
  return {
    async get(key) {
      const f = file(key); if (!fs.existsSync(f)) return null;
      const b = fs.readFileSync(f);
      return { text: async () => b.toString('utf8'), arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer };
    },
    async put(key, value) { const f = file(key); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, typeof value === 'string' ? value : Buffer.from(value)); },
  };
}

const readBody = (req: IncomingMessage) => new Promise<Buffer>((ok, err) => {
  const parts: Buffer[] = []; req.on('data', c => parts.push(c)); req.on('end', () => ok(Buffer.concat(parts))); req.on('error', err);
});

export function cmsDevApi(): Plugin {
  const mount = (root: string, use: (fn: (req: IncomingMessage, res: ServerResponse, next: () => void) => void) => void) => {
    const bucket = fileBucket(path.join(root, '.cms-data'));
    use(async (req, res, next) => {
      if (!req.url?.startsWith('/api/')) return next();
      const vars = readVars(path.join(root, '.dev.vars'));   // đọc lại mỗi lần: sửa .dev.vars không cần khởi động lại
      const remote = vars.CMS_REMOTE?.replace(/\/+$/, '');
      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string' && !(remote && /^(host|origin|referer|connection|accept-encoding)$/i.test(k))) headers.set(k, v);
      const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await readBody(req);
      let r: Response;
      try {
        r = remote
          ? await fetch(remote + req.url, { method: req.method, headers, body, redirect: 'manual' })
          : await handleApi(new Request('http://localhost' + req.url, { method: req.method, headers, body }), { CONTENT: bucket, CMS_PASSWORD: vars.CMS_PASSWORD });
      } catch {
        r = new Response(JSON.stringify({ error: `Không kết nối được ${remote}. Kiểm tra mạng.` }), { status: 502, headers: { 'content-type': 'application/json; charset=utf-8' } });
      }
      res.statusCode = r.status;
      // fetch đã tự giải nén → bỏ các header nén / độ dài cũ
      r.headers.forEach((v, k) => { if (!/^(content-encoding|content-length|transfer-encoding|connection)$/i.test(k)) res.setHeader(k, v); });
      res.end(Buffer.from(await r.arrayBuffer()));
    });
  };
  return {
    name: 'cms-dev-api',
    configureServer(s) { mount(s.config.root, fn => s.middlewares.use(fn)); },
    configurePreviewServer(s) { mount(s.config.root, fn => s.middlewares.use(fn)); },
  };
}
