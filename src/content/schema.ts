// Nội dung web chỉnh được trong CMS (/cms). Lưu trên R2 dạng JSON; mọi thứ đọc vào đều qua normalize() →
// thiếu / sai trường nào thì lấy giá trị mặc định ở đây (thêm trường mới không làm hỏng nội dung đã lưu).
// Hiện có: hero. Các mục khác của trang chủ sẽ chuyển dần vào đây.
import { DEFAULT_CONFIG, EDITABLE, type DesignConfig } from '../config/zones';
import { normalizeFinish } from '../config/finishes';
import { PRESETS } from '../config/presets';

/** 1 màu xe cho mockup ở hero (các chấm màu bên dưới xe, tự đổi lần lượt). */
export interface HeroLook { id: string; name: string; config: DesignConfig }

export interface HeroContent {
  line1: string;          // tiêu đề dòng 1 (chữ to)
  line2: string;          // tiêu đề dòng 2
  points: string[];       // chữ nhỏ góc dưới trái (tối đa 4 dòng)
  side: string;           // câu góc dưới phải
  cta: string;            // chữ trên nút
  looks: HeroLook[];      // màu xe mockup (ít nhất 1)
  interval: number;       // số giây tự đổi màu
}

export interface SiteContent { hero: HeroContent; updatedAt?: string }

export const LIMITS = { points: 4, looks: 8, line1: 40, line2: 60, point: 40, side: 80, cta: 24, lookName: 30, interval: [2, 30] as const };

export const DEFAULT_CONTENT: SiteContent = {
  hero: {
    line1: 'Xe của bạn',
    line2: 'Phong cách của bạn',
    points: ['Thoả sức sáng tạo', 'Tuỳ chỉnh dễ dàng'],
    side: 'Bạn đã sẵn sàng sáng tạo?',
    cta: 'Bắt đầu',
    looks: PRESETS.map(p => ({ id: p.id, name: p.name, config: p.config })),
    interval: 5,
  },
};

const HEX = /^#[0-9a-f]{6}$/i;
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {});
const str = (v: unknown, def: string, max: number) => (typeof v === 'string' ? v.slice(0, max) : def);

export function normalizeConfig(v: unknown): DesignConfig {
  const src = obj(v);
  return Object.fromEntries(EDITABLE.map(id => {
    const z = obj(src[id]), def = DEFAULT_CONFIG[id];
    return [id, { color: typeof z.color === 'string' && HEX.test(z.color) ? z.color.toLowerCase() : def.color, finish: normalizeFinish(typeof z.finish === 'string' ? z.finish : def.finish) }];
  }));
}

function normalizeHero(v: unknown): HeroContent {
  const h = obj(v), d = DEFAULT_CONTENT.hero;
  const points = Array.isArray(h.points) ? h.points.filter((p): p is string => typeof p === 'string').slice(0, LIMITS.points).map(p => p.slice(0, LIMITS.point)) : d.points;
  const looks = Array.isArray(h.looks)
    ? h.looks.slice(0, LIMITS.looks).map((l, k) => { const o = obj(l); return { id: str(o.id, 'look' + k, 40) || 'look' + k, name: str(o.name, '', LIMITS.lookName), config: normalizeConfig(o.config) }; })
    : d.looks;
  const iv = typeof h.interval === 'number' && isFinite(h.interval) ? h.interval : d.interval;
  return {
    line1: str(h.line1, d.line1, LIMITS.line1),
    line2: str(h.line2, d.line2, LIMITS.line2),
    points,
    side: str(h.side, d.side, LIMITS.side),
    cta: str(h.cta, d.cta, LIMITS.cta),
    looks: looks.length ? looks : d.looks,
    interval: Math.min(LIMITS.interval[1], Math.max(LIMITS.interval[0], Math.round(iv))),
  };
}

export function normalizeContent(v: unknown): SiteContent {
  const c = obj(v);
  return { hero: normalizeHero(c.hero), ...(typeof c.updatedAt === 'string' ? { updatedAt: c.updatedAt } : {}) };
}

/** Mã băm ngắn (ổn định) của 1 giá trị — dùng làm khoá ảnh chờ hero theo màu xe. */
export function hashOf(v: unknown) {
  const s = JSON.stringify(v); let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33 ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}
