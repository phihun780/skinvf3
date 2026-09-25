// Gọi API CMS (server/cms-api.ts). Token đăng nhập nhớ trong trình duyệt (hạn 7 ngày).
import { normalizeContent, type SiteContent } from './schema';

const TOKEN_KEY = 'vf3-cms-token';
export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
export const setToken = (t: string | null) => { try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch { /* bỏ qua */ } };

/** Hết phiên đăng nhập (sai / hết hạn token) → quay về màn đăng nhập. */
export class AuthError extends Error {}

async function call<T>(path: string, init: RequestInit = {}, token?: string | null): Promise<T> {
  const headers = new Headers(init.headers);
  if (token) headers.set('authorization', 'Bearer ' + token);
  if (init.body) headers.set('content-type', 'application/json');
  let res: Response;
  try { res = await fetch(path, { ...init, headers, cache: 'no-store' }); } catch { throw new Error('Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.'); }
  const data = await res.json().catch(() => ({})) as T & { error?: string };
  if (res.status === 401 && token) throw new AuthError(data.error || 'Phiên đăng nhập đã hết hạn.');
  if (!res.ok) throw new Error(data.error || `Lỗi máy chủ (${res.status}).`);
  return data;
}

export const cmsApi = {
  login: (password: string) => call<{ token: string }>('/api/cms/login', { method: 'POST', body: JSON.stringify({ password }) }),
  me: (token: string) => call<{ ok: true }>('/api/cms/me', {}, token),
  load: async () => normalizeContent(await call<unknown>('/api/content')),
  save: (token: string, content: SiteContent) => {
    const { updatedAt: _drop, ...body } = content; void _drop;
    return call<{ updatedAt: string }>('/api/cms/content', { method: 'PUT', body: JSON.stringify(body) }, token);
  },
};
