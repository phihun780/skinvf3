// Nội dung web chỉnh được trong CMS (/cms). Lưu trên R2 dạng JSON; mọi thứ đọc vào đều qua normalize() →
// thiếu / sai trường nào thì lấy giá trị mặc định ở đây (thêm trường mới không làm hỏng nội dung đã lưu).
// Thêm 1 mục mới: khai báo kiểu + mặc định + hàm normalize ở đây → form trong src/pages/Cms.tsx → hiển thị ở Home.tsx.
import { DEFAULT_CONFIG, EDITABLE, type DesignConfig } from '../config/zones';
import { normalizeFinish } from '../config/finishes';
import { PRESETS } from '../config/presets';
import { STEP_ICONS } from '../ui/icons';
import { DECAL_SIZE } from '../config/decals';
import { normalizeFitted, type Fitted } from '../config/accessories';

/** Decal trên xe mockup (cùng dạng decal của trình phối; ảnh là đường dẫn trong web: /decals/… hoặc /api/media/…). */
export interface LookDecal {
  label: string; src: string; aspect: number;
  position: [number, number, number]; normal: [number, number, number];
  size: number; rotation: number; opacity: number; flip: boolean;
}
/** 1 màu xe cho mockup ở hero (các chấm màu bên dưới xe, tự đổi lần lượt) + decal + phụ kiện. */
export interface HeroLook { id: string; name: string; config: DesignConfig; decals: LookDecal[]; accessories: Fitted }

export interface HeroContent {
  line1: string;          // tiêu đề dòng 1 (chữ to)
  line2: string;          // tiêu đề dòng 2
  points: string[];       // chữ nhỏ góc dưới trái (tối đa 4 dòng)
  side: string;           // câu góc dưới phải
  cta: string;            // chữ trên nút
  looks: HeroLook[];      // màu xe mockup (ít nhất 1)
  interval: number;       // số giây tự đổi màu
}

export interface FeatureCard { tag: string; title: string; text: string; image: string }
export interface FeaturesContent {
  title: string;
  zones: FeatureCard;                          // thẻ lớn: chia vùng (có ảnh)
  finishes: { tag: string; title: string };    // thẻ 2 quả cầu Bóng / Nhám
  decal: FeatureCard;                          // thẻ decal (có ảnh)
}

export interface StepItem { icon: string; title: string; text: string }
export interface StepsContent { title: string; items: StepItem[] }

/** 1 thẻ ở "Mẫu tham khảo". imageFor = mã màu lúc tạo ảnh tự động → biết ảnh đã cũ khi đổi màu. */
export interface GalleryItem { id: string; name: string; tag: string; config: DesignConfig; image: string; imageFor?: string }
export interface GalleryContent { title: string; use: string; items: GalleryItem[] }

export interface FaqLink { label: string; href: string }
export interface FaqItem { q: string; a: string; links: FaqLink[] }
export interface FaqContent { title: string; items: FaqItem[] }

export interface SiteContent {
  hero: HeroContent;
  features: FeaturesContent;
  steps: StepsContent;
  gallery: GalleryContent;
  configurator: { title: string };
  faq: FaqContent;
  footer: { text: string };
  updatedAt?: string;
}

export const LIMITS = {
  points: 4, looks: 8, lookDecals: 16, line1: 40, line2: 60, point: 40, side: 80, cta: 24, lookName: 30, interval: [2, 30] as const,
  title: 60, tag: 30, cardTitle: 80, cardText: 300,
  steps: [1, 6] as const, gallery: [1, 12] as const, galleryName: 30,
  faq: 20, question: 160, answer: 1500, links: 4, linkLabel: 60, href: 500, footer: 80,
};

export const DEFAULT_CONTENT: SiteContent = {
  hero: {
    line1: 'Xe của bạn',
    line2: 'Phong cách của bạn',
    points: ['Thoả sức sáng tạo', 'Tuỳ chỉnh dễ dàng'],
    side: 'Bạn đã sẵn sàng sáng tạo?',
    cta: 'Bắt đầu',
    looks: PRESETS.map(p => ({ id: p.id, name: p.name, config: p.config, decals: [], accessories: {} })),
    interval: 5,
  },
  features: {
    title: 'Tính năng cơ bản',
    zones: { tag: `${EDITABLE.length} vùng`, title: 'Chia đúng theo khớp nối xe thật', text: 'Thân, nóc, capo, cản, ốp vòm, ca-lăng, gương, mâm, cùm phanh… mỗi mảng một màu riêng, đường chia bám theo khe nối thật của VF3.', image: '/home/zones.webp' },
    finishes: { tag: '2 chất bề mặt', title: 'Bóng hoặc nhám cho từng vùng' },
    decal: { tag: 'Decal', title: 'Dán ôm theo thân xe', text: 'Decal chiếu thẳng lên bề mặt 3D: kéo để di chuyển, xoay, co giãn, chép đối xứng sang bên kia.', image: '/home/decal.webp' },
  },
  steps: {
    title: 'Sử dụng đơn giản',
    items: [
      { icon: 'cursor', title: 'Chọn vùng trên xe', text: 'Rê chuột lên xe, vùng nào sáng lên là vùng đó: thân, nóc, capo, cản, ốp vòm, gương, mâm, cùm phanh…' },
      { icon: 'palette', title: 'Phối màu & dán decal', text: 'Chọn màu và chất bề mặt, dán decal có sẵn, ảnh PNG/JPG/WEBP của bạn hoặc chữ tuỳ ý.' },
      { icon: 'poster', title: 'Tải hình ảnh SkinVF3 mang ra tiệm', text: 'Hình ảnh SkinVF3 khổ A4 gồm 5 góc nhìn và các ô màu có trong thiết kế kèm mã HEX.' },
    ],
  },
  gallery: {
    title: 'Mẫu tham khảo',
    use: 'Dùng mẫu',
    items: PRESETS.map(p => ({ id: p.id, name: p.name, tag: p.tag, config: p.config, image: `/presets/${p.id}.webp` })),
  },
  configurator: { title: 'Tự phối màu' },
  faq: {
    title: 'Câu hỏi thường gặp',
    items: [
      { q: 'Màu trên màn hình có giống màu thật không?', a: 'Gần đúng, nhưng màn hình và ánh sáng khác nhau sẽ làm màu lệch. Hãy dùng mã màu trên hình ảnh SkinVF3 để đối chiếu với bảng màu decal thật tại tiệm.', links: [] },
      { q: 'Hình ảnh SkinVF3 dùng để làm gì?', a: 'Hình ảnh SkinVF3 gom 5 góc nhìn của xe và các ô màu có trong thiết kế kèm mã HEX. Thợ nhìn là biết cần dán gì, màu nào — báo giá nhanh hơn.', links: [] },
      { q: 'Tôi dán ảnh của mình được không?', a: 'Được. Trình phối nhận ảnh PNG, JPG hoặc WEBP (ảnh PNG/WEBP nền trong suốt sẽ giữ nguyên phần trong suốt), và cả chữ tuỳ ý.', links: [] },
      { q: 'Có cần tạo tài khoản không?', a: 'Không. Thiết kế tự lưu trong trình duyệt trên máy bạn. Xoá dữ liệu trình duyệt thì thiết kế cũng mất — nhớ tải hình ảnh SkinVF3 để giữ lại.', links: [] },
      { q: 'Mô hình 3D lấy ở đâu?', a: 'Mô hình gốc là “Vinfast VF3 Plus 2026” của tác giả Hoàng Huy, chia sẻ trên Sketchfab theo giấy phép Creative Commons Attribution 4.0 (CC BY 4.0) — được phép dùng và chỉnh sửa, kể cả cho mục đích thương mại, với điều kiện ghi rõ tên tác giả. SkinVF3 đã tuỳ chỉnh lại chi tiết bằng Claude AI (Anthropic): chia lại từng vùng theo khớp nối của xe thật, cắt và bo mượt các đường nối, tối ưu dung lượng để web tải nhanh. Cảm ơn tác giả Hoàng Huy!',
        links: [{ label: 'Mô hình gốc trên Sketchfab', href: 'https://sketchfab.com/3d-models/vinfast-vf3-plus-2026-aa87e1cd1fdd42ae92e5a397e3d5b125' }, { label: 'Giấy phép CC BY 4.0', href: 'https://creativecommons.org/licenses/by/4.0/deed.vi' }] },
      { q: 'Dùng trên điện thoại được không?', a: 'Được, nhưng trải nghiệm tốt nhất là trên máy tính: màn hình lớn, rê chuột để chọn vùng chính xác hơn.', links: [] },
    ],
  },
  footer: { text: 'SkinVF3' },
};

const HEX = /^#[0-9a-f]{6}$/i;
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {});
const arr = (v: unknown): unknown[] | null => (Array.isArray(v) ? v : null);
const str = (v: unknown, def: string, max: number) => (typeof v === 'string' ? v.slice(0, max) : def);
/** Ảnh: chỉ nhận đường dẫn cùng web (/api/media/…, /home/…, /presets/…). */
const img = (v: unknown, def: string) => (typeof v === 'string' && /^\/(?!\/)[\w./-]*$/.test(v) ? v : def);
/** Link: chỉ http(s), đường dẫn trong web hoặc #mục (chặn javascript: …). */
export const safeHref = (v: string) => /^(https?:\/\/|\/(?!\/)|#)/i.test(v.trim());

export function normalizeConfig(v: unknown): DesignConfig {
  const src = obj(v);
  return Object.fromEntries(EDITABLE.map(id => {
    const z = obj(src[id]), def = DEFAULT_CONFIG[id];
    return [id, { color: typeof z.color === 'string' && HEX.test(z.color) ? z.color.toLowerCase() : def.color, finish: normalizeFinish(typeof z.finish === 'string' ? z.finish : def.finish) }];
  }));
}

const num = (v: unknown, def: number, lo: number, hi: number) => (typeof v === 'number' && isFinite(v) ? Math.min(hi, Math.max(lo, v)) : def);
const vec3 = (v: unknown): [number, number, number] | null => {
  const a = arr(v); return a && a.length === 3 && a.every(x => typeof x === 'number' && isFinite(x)) ? a as [number, number, number] : null;
};
function normalizeDecal(v: unknown): LookDecal | null {
  const o = obj(v), src = img(o.src, ''), position = vec3(o.position), normal = vec3(o.normal);
  if (!src || !position || !normal) return null;   // ảnh phải là đường dẫn trong web (không nhận data: URL — quá nặng)
  return {
    label: str(o.label, 'Decal', 40), src, aspect: num(o.aspect, 1, 0.05, 20), position, normal,
    size: num(o.size, DECAL_SIZE.initial, DECAL_SIZE.min, DECAL_SIZE.max), rotation: num(o.rotation, 0, -360, 360),
    opacity: num(o.opacity, 1, 0.05, 1), flip: o.flip === true,
  };
}

function normalizeHero(v: unknown): HeroContent {
  const h = obj(v), d = DEFAULT_CONTENT.hero;
  const points = arr(h.points)?.filter((p): p is string => typeof p === 'string').slice(0, LIMITS.points).map(p => p.slice(0, LIMITS.point)) ?? d.points;
  const looks = arr(h.looks)?.slice(0, LIMITS.looks).map((l, k) => {
    const o = obj(l);
    return {
      id: str(o.id, 'look' + k, 40) || 'look' + k, name: str(o.name, '', LIMITS.lookName), config: normalizeConfig(o.config),
      decals: (arr(o.decals) ?? []).map(normalizeDecal).filter((x): x is LookDecal => !!x).slice(0, LIMITS.lookDecals),
      accessories: normalizeFitted(o.accessories),
    };
  }) ?? d.looks;
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

function normalizeCard(v: unknown, d: FeatureCard): FeatureCard {
  const c = obj(v);
  return { tag: str(c.tag, d.tag, LIMITS.tag), title: str(c.title, d.title, LIMITS.cardTitle), text: str(c.text, d.text, LIMITS.cardText), image: img(c.image, d.image) };
}

function normalizeFeatures(v: unknown): FeaturesContent {
  const f = obj(v), d = DEFAULT_CONTENT.features, fin = obj(f.finishes);
  return {
    title: str(f.title, d.title, LIMITS.title),
    zones: normalizeCard(f.zones, d.zones),
    finishes: { tag: str(fin.tag, d.finishes.tag, LIMITS.tag), title: str(fin.title, d.finishes.title, LIMITS.cardTitle) },
    decal: normalizeCard(f.decal, d.decal),
  };
}

function normalizeSteps(v: unknown): StepsContent {
  const s = obj(v), d = DEFAULT_CONTENT.steps;
  const items = arr(s.items)?.slice(0, LIMITS.steps[1]).map(x => {
    const o = obj(x);
    return { icon: typeof o.icon === 'string' && o.icon in STEP_ICONS ? o.icon : 'cursor', title: str(o.title, '', LIMITS.cardTitle), text: str(o.text, '', LIMITS.cardText) };
  });
  return { title: str(s.title, d.title, LIMITS.title), items: items?.length ? items : d.items };
}

function normalizeGallery(v: unknown): GalleryContent {
  const g = obj(v), d = DEFAULT_CONTENT.gallery;
  const items = arr(g.items)?.slice(0, LIMITS.gallery[1]).map((x, k) => {
    const o = obj(x), id = str(o.id, '', 40) || 'mau' + k;
    return {
      id, name: str(o.name, '', LIMITS.galleryName), tag: str(o.tag, '', LIMITS.tag), config: normalizeConfig(o.config), image: img(o.image, ''),
      ...(typeof o.imageFor === 'string' ? { imageFor: o.imageFor.slice(0, 20) } : {}),
    };
  });
  return { title: str(g.title, d.title, LIMITS.title), use: str(g.use, d.use, LIMITS.cta), items: items?.length ? items : d.items };
}

function normalizeFaq(v: unknown): FaqContent {
  const f = obj(v), d = DEFAULT_CONTENT.faq;
  const items = arr(f.items)?.slice(0, LIMITS.faq).map(x => {
    const o = obj(x);
    const links = (arr(o.links) ?? []).slice(0, LIMITS.links).map(l => { const q = obj(l); return { label: str(q.label, '', LIMITS.linkLabel), href: str(q.href, '', LIMITS.href) }; });
    return { q: str(o.q, '', LIMITS.question), a: str(o.a, '', LIMITS.answer), links };
  });
  return { title: str(f.title, d.title, LIMITS.title), items: items ?? d.items };
}

export function normalizeContent(v: unknown): SiteContent {
  const c = obj(v);
  return {
    hero: normalizeHero(c.hero),
    features: normalizeFeatures(c.features),
    steps: normalizeSteps(c.steps),
    gallery: normalizeGallery(c.gallery),
    configurator: { title: str(obj(c.configurator).title, DEFAULT_CONTENT.configurator.title, LIMITS.title) },
    faq: normalizeFaq(c.faq),
    footer: { text: str(obj(c.footer).text, DEFAULT_CONTENT.footer.text, LIMITS.footer) },
    ...(typeof c.updatedAt === 'string' ? { updatedAt: c.updatedAt } : {}),
  };
}

/** Mã băm ngắn (ổn định) của 1 giá trị — dùng làm khoá ảnh chờ hero / đánh dấu ảnh mẫu theo màu xe. */
export function hashOf(v: unknown) {
  const s = JSON.stringify(v); let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33 ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}
