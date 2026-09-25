// Chạy API CMS ngay trong `npm run dev` / `npm run preview` (không cần Cloudflare):
// nội dung lưu vào .cms-data/ (giả lập R2), mật khẩu đọc từ .dev.vars (CMS_PASSWORD=...).
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
    async get(key) { const f = file(key); if (!fs.existsSync(f)) return null; const t = fs.readFileSync(f, 'utf8'); return { text: async () => t }; },
    async put(key, value) { const f = file(key); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, value); },
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
      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
      const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await readBody(req);
      const r = await handleApi(new Request('http://localhost' + req.url, { method: req.method, headers, body }),
        { CONTENT: bucket, CMS_PASSWORD: readVars(path.join(root, '.dev.vars')).CMS_PASSWORD });
      res.statusCode = r.status;
      r.headers.forEach((v, k) => res.setHeader(k, v));
      res.end(Buffer.from(await r.arrayBuffer()));
    });
  };
  return {
    name: 'cms-dev-api',
    configureServer(s) { mount(s.config.root, fn => s.middlewares.use(fn)); },
    configurePreviewServer(s) { mount(s.config.root, fn => s.middlewares.use(fn)); },
  };
}
