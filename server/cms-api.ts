// API nội dung + CMS. Dùng chung cho:
//  - Cloudflare Pages Functions (functions/api/[[path]].ts): lưu vào R2 (binding CONTENT), mật khẩu ở secret CMS_PASSWORD
//  - localhost (server/dev-plugin.ts): lưu vào thư mục .cms-data/, mật khẩu ở file .dev.vars
//
//   GET  /api/content       nội dung web (ai cũng đọc được)
//   POST /api/cms/login     { password } → { token }  (token hạn 7 ngày)
//   GET  /api/cms/me        kiểm tra token còn hạn
//   PUT  /api/cms/content   lưu nội dung (cần token) — ghi bản chính + 1 bản sao lưu theo giờ lưu
//
// Token = "<hạn>.<chữ ký HMAC-SHA256 bằng mật khẩu>": đổi mật khẩu là mọi phiên đăng nhập cũ hết hiệu lực.

export interface StoredObject { text(): Promise<string> }
export interface Bucket {
  get(key: string): Promise<StoredObject | null>;
  put(key: string, value: string, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
}
export interface CmsEnv { CONTENT?: Bucket; CMS_PASSWORD?: string }

const CONTENT_KEY = 'content/site.json';
const historyKey = (iso: string) => `content/history/${iso.replace(/[:.]/g, '-')}.json`;
const TOKEN_TTL = 7 * 24 * 3600 * 1000;
const MAX_BYTES = 300_000;

const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });
const fail = (status: number, error: string) => json({ error }, status);

const enc = new TextEncoder();
const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');

async function hmac(key: string, msg: string) {
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', k, enc.encode(msg)));
}
/** So sánh không lộ thời gian (băm cả 2 rồi so từng byte). */
async function safeEqual(a: string, b: string) {
  const [x, y] = await Promise.all([a, b].map(s => crypto.subtle.digest('SHA-256', enc.encode(s))));
  const u = new Uint8Array(x), v = new Uint8Array(y);
  let d = 0; for (let i = 0; i < u.length; i++) d |= u[i] ^ v[i];
  return d === 0;
}

const makeToken = async (password: string) => {
  const exp = Date.now() + TOKEN_TTL;
  return `${exp}.${await hmac(password, 'cms:' + exp)}`;
};
async function authorized(req: Request, env: CmsEnv) {
  const pw = env.CMS_PASSWORD, m = /^Bearer (\d+)\.([0-9a-f]{64})$/.exec(req.headers.get('authorization') ?? '');
  if (!pw || !m || +m[1] < Date.now()) return false;
  return safeEqual(m[2], await hmac(pw, 'cms:' + m[1]));
}

export async function handleApi(req: Request, env: CmsEnv): Promise<Response> {
  const path = new URL(req.url).pathname.replace(/\/+$/, '');
  const method = req.method.toUpperCase();

  if (path === '/api/content' && (method === 'GET' || method === 'HEAD')) {
    if (!env.CONTENT) return fail(503, 'Chưa gắn kho lưu trữ R2 (binding CONTENT).');
    const obj = await env.CONTENT.get(CONTENT_KEY);
    // no-cache: trình duyệt luôn hỏi lại → lưu trong CMS là người xem thấy ngay
    return new Response(obj ? await obj.text() : '{}', { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-cache' } });
  }

  if (path === '/api/cms/login' && method === 'POST') {
    if (!env.CMS_PASSWORD) return fail(503, 'Chưa đặt mật khẩu CMS (biến CMS_PASSWORD).');
    const body = await req.json().catch(() => null) as { password?: unknown } | null;
    const password = typeof body?.password === 'string' ? body.password : '';
    if (!(await safeEqual(password, env.CMS_PASSWORD))) {
      await new Promise(r => setTimeout(r, 800));   // làm chậm dò mật khẩu
      return fail(401, 'Sai mật khẩu.');
    }
    return json({ token: await makeToken(env.CMS_PASSWORD) });
  }

  if (path === '/api/cms/me' && method === 'GET') {
    return (await authorized(req, env)) ? json({ ok: true }) : fail(401, 'Phiên đăng nhập đã hết hạn.');
  }

  if (path === '/api/cms/content' && method === 'PUT') {
    if (!(await authorized(req, env))) return fail(401, 'Phiên đăng nhập đã hết hạn.');
    if (!env.CONTENT) return fail(503, 'Chưa gắn kho lưu trữ R2 (binding CONTENT).');
    const text = await req.text();
    if (text.length > MAX_BYTES) return fail(413, 'Nội dung quá lớn.');
    let data: unknown;
    try { data = JSON.parse(text); } catch { return fail(400, 'Nội dung không hợp lệ.'); }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return fail(400, 'Nội dung không hợp lệ.');
    const updatedAt = new Date().toISOString();
    const out = JSON.stringify({ ...(data as object), updatedAt });
    const meta = { httpMetadata: { contentType: 'application/json' } };
    await Promise.all([env.CONTENT.put(CONTENT_KEY, out, meta), env.CONTENT.put(historyKey(updatedAt), out, meta)]);
    return json({ updatedAt });
  }

  return fail(404, 'Không tìm thấy.');
}
