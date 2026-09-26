// Form sửa từng mục trang chủ trong CMS. Mỗi form nhận nội dung của mục + set(patch).
import { useContext, useState } from 'react';
import { DEFAULT_CONTENT, LIMITS, hashOf, safeHref, type FaqContent, type FeaturesContent, type GalleryContent, type GalleryItem,
  type HeroContent, type HeroLook, type StepsContent } from '../../content/schema';
import { DEFAULT_CONFIG, type DesignConfig } from '../../config/zones';
import { STEP_ICONS, Icon } from '../../ui/icons';
import { CmsCtx, Group, ImageField, ItemTools, TextArea, TextField, ZoneEditor, moveItem } from './fields';
import { ThumbMaker } from './ThumbMaker';
import { LookExtras } from './LookExtras';

/** Sửa 1 mục: truyền phần thay đổi, hoặc hàm nhận nội dung mới nhất (dùng khi cập nhật sau 1 việc chạy nền). */
export type Set<T> = (patch: Partial<T> | ((prev: T) => Partial<T>)) => void;
const newId = (p: string) => p + '-' + Math.random().toString(36).slice(2, 8);
// nửa thân / nửa nóc; mép chéo mềm 1% (hết răng cưa); tô cả dưới viền (không lặp dải màu ở mép)
const swatch = (c: DesignConfig) => `linear-gradient(135deg, ${c.body.color} 51.5%, ${c.roof.color} 52.5%) border-box`;

function Head({ title, onReset }: { title: string; onReset: () => void }) {
  return (
    <div className="cms-head">
      <h1>{title}</h1>
      <button className="cms-link" onClick={() => { if (confirm(`Đưa mục "${title}" về nội dung mặc định? (Chưa lưu cho tới khi bấm Lưu & xuất bản)`)) onReset(); }}>Khôi phục mặc định</button>
    </div>
  );
}

/* ---------------- Hero ---------------- */

export function HeroForm({ hero, set, look, setLook, gallery }: { hero: HeroContent; set: Set<HeroContent>; look: number; setLook: (i: number) => void; gallery: GalleryItem[] }) {
  const looks = hero.looks, cur = looks[look];
  const setLooks = (next: HeroLook[]) => set({ looks: next });
  const patchLook = (patch: Partial<HeroLook>) => setLooks(looks.map((l, k) => (k === look ? { ...l, ...patch } : l)));
  const addLook = (from: GalleryItem | undefined) => {
    if (looks.length >= LIMITS.looks) return;
    setLooks([...looks, from ? { id: newId('look'), name: from.name, config: { ...from.config }, decals: [], accessories: {} }
      : { id: newId('look'), name: cur.name + ' (bản sao)', config: { ...cur.config }, decals: [...cur.decals], accessories: { ...cur.accessories } }]);
    setLook(looks.length);
  };

  return (
    <>
      <Head title="Hero" onReset={() => { set(DEFAULT_CONTENT.hero); setLook(0); }} />

      <Group title="Tiêu đề">
        <TextField label="Dòng 1 (chữ to)" value={hero.line1} max={LIMITS.line1} onChange={v => set({ line1: v })} />
        <TextField label="Dòng 2" value={hero.line2} max={LIMITS.line2} onChange={v => set({ line2: v })} />
      </Group>

      <Group title="Màu xe mockup" hint="Các chấm màu dưới xe. Xe tự đổi lần lượt từng màu; màu đầu tiên là màu hiện lúc mở trang.">
        <div className="cms-looks">
          {looks.map((l, k) => (
            <button key={l.id + k} className={'cms-look' + (k === look ? ' on' : '')} title={l.name || `Màu ${k + 1}`} onClick={() => setLook(k)} style={{ background: swatch(l.config) }} />
          ))}
          {looks.length < LIMITS.looks && (
            <label className="cms-look add" title="Thêm màu">
              +
              <select value="" onChange={e => { const v = e.target.value; if (v) addLook(v === 'copy' ? undefined : gallery.find(x => x.id === v)); }}>
                <option value="">Thêm màu…</option>
                <option value="copy">Nhân bản màu đang chọn</option>
                {gallery.map(p => <option key={p.id} value={p.id}>Từ mẫu: {p.name}</option>)}
              </select>
            </label>
          )}
        </div>

        {cur && (
          <div className="cms-sub">
            <div className="cms-row">
              <TextField label={`Tên màu ${look + 1}`} value={cur.name} max={LIMITS.lookName} onChange={v => patchLook({ name: v })} />
              <ItemTools index={look} count={looks.length} min={1}
                onMove={j => { setLooks(moveItem(looks, look, j)); setLook(j); }}
                onRemove={() => { setLooks(looks.filter((_, k) => k !== look)); setLook(Math.max(0, look - 1)); }} />
            </div>
            <label className="cms-field">
              <span>Lấy màu từ mẫu tham khảo</span>
              <select value="" onChange={e => { const p = gallery.find(x => x.id === e.target.value); if (p) patchLook({ config: { ...p.config } }); }}>
                <option value="">Chọn mẫu…</option>
                {gallery.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <ZoneEditor config={cur.config} onChange={config => patchLook({ config })} />
            <LookExtras look={cur} patch={patchLook} />
          </div>
        )}

        <label className="cms-field inline">
          <span>Tự đổi màu sau</span>
          <input type="number" min={LIMITS.interval[0]} max={LIMITS.interval[1]} value={hero.interval}
            onChange={e => set({ interval: Math.min(LIMITS.interval[1], Math.max(LIMITS.interval[0], +e.target.value || LIMITS.interval[0])) })} />
          <span>giây</span>
        </label>
      </Group>

      <Group title="Chữ nhỏ góc trái" hint={`Tối đa ${LIMITS.points} dòng. Không có dòng nào thì ẩn.`}>
        {hero.points.map((p, k) => (
          <div className="cms-row" key={k}>
            <TextField label={`Dòng ${k + 1}`} value={p} max={LIMITS.point} onChange={v => set({ points: hero.points.map((x, j) => (j === k ? v : x)) })} />
            <button className="cms-icon danger" title="Xoá dòng" onClick={() => set({ points: hero.points.filter((_, j) => j !== k) })}>✕</button>
          </div>
        ))}
        {hero.points.length < LIMITS.points && <button className="cms-add" onClick={() => set({ points: [...hero.points, ''] })}>+ Thêm dòng</button>}
      </Group>

      <Group title="Góc phải">
        <TextField label="Câu phía trên nút" value={hero.side} max={LIMITS.side} onChange={v => set({ side: v })} />
        <TextField label="Chữ trên nút" value={hero.cta} max={LIMITS.cta} onChange={v => set({ cta: v })} />
      </Group>
    </>
  );
}

/* ---------------- Tính năng cơ bản ---------------- */

export function FeaturesForm({ f, set }: { f: FeaturesContent; set: Set<FeaturesContent> }) {
  const d = DEFAULT_CONTENT.features;
  return (
    <>
      <Head title="Tính năng cơ bản" onReset={() => set(d)} />
      <Group title="Tiêu đề mục">
        <TextField label="Tiêu đề" value={f.title} max={LIMITS.title} onChange={v => set({ title: v })} />
      </Group>
      <Group title="Thẻ lớn: chia vùng">
        <TextField label="Nhãn nhỏ" value={f.zones.tag} max={LIMITS.tag} onChange={v => set({ zones: { ...f.zones, tag: v } })} />
        <TextField label="Tiêu đề thẻ" value={f.zones.title} max={LIMITS.cardTitle} onChange={v => set({ zones: { ...f.zones, title: v } })} />
        <TextArea label="Mô tả" value={f.zones.text} max={LIMITS.cardText} onChange={v => set({ zones: { ...f.zones, text: v } })} />
        <ImageField label="Ảnh" value={f.zones.image} def={d.zones.image} onChange={v => set({ zones: { ...f.zones, image: v } })} hint="Nên dùng ảnh PNG/WEBP nền trong suốt." />
      </Group>
      <Group title="Thẻ chất bề mặt (2 quả cầu Bóng / Nhám)">
        <TextField label="Nhãn nhỏ" value={f.finishes.tag} max={LIMITS.tag} onChange={v => set({ finishes: { ...f.finishes, tag: v } })} />
        <TextField label="Tiêu đề thẻ" value={f.finishes.title} max={LIMITS.cardTitle} onChange={v => set({ finishes: { ...f.finishes, title: v } })} />
      </Group>
      <Group title="Thẻ decal">
        <TextField label="Nhãn nhỏ" value={f.decal.tag} max={LIMITS.tag} onChange={v => set({ decal: { ...f.decal, tag: v } })} />
        <TextField label="Tiêu đề thẻ" value={f.decal.title} max={LIMITS.cardTitle} onChange={v => set({ decal: { ...f.decal, title: v } })} />
        <TextArea label="Mô tả" value={f.decal.text} max={LIMITS.cardText} onChange={v => set({ decal: { ...f.decal, text: v } })} />
        <ImageField label="Ảnh" value={f.decal.image} def={d.decal.image} onChange={v => set({ decal: { ...f.decal, image: v } })} hint="Nên dùng ảnh PNG/WEBP nền trong suốt." />
      </Group>
    </>
  );
}

/* ---------------- Sử dụng đơn giản ---------------- */

export function StepsForm({ s, set }: { s: StepsContent; set: Set<StepsContent> }) {
  const items = s.items;
  const patch = (k: number, p: Partial<StepsContent['items'][number]>) => set({ items: items.map((x, j) => (j === k ? { ...x, ...p } : x)) });
  return (
    <>
      <Head title="Sử dụng đơn giản" onReset={() => set(DEFAULT_CONTENT.steps)} />
      <Group title="Tiêu đề mục">
        <TextField label="Tiêu đề" value={s.title} max={LIMITS.title} onChange={v => set({ title: v })} />
      </Group>
      {items.map((it, k) => (
        <Group key={k} title={`Bước ${String(k + 1).padStart(2, '0')}`}
          aside={<ItemTools vertical index={k} count={items.length} min={LIMITS.steps[0]} onMove={j => set({ items: moveItem(items, k, j) })} onRemove={() => set({ items: items.filter((_, j) => j !== k) })} />}>
          <div className="cms-field">
            <span>Biểu tượng</span>
            <div className="cms-icons">
              {Object.entries(STEP_ICONS).map(([id, ic]) => (
                <button key={id} className={'cms-icon-pick' + (it.icon === id ? ' on' : '')} title={ic.label} onClick={() => patch(k, { icon: id })}><Icon name={id} /></button>
              ))}
            </div>
          </div>
          <TextField label="Tiêu đề" value={it.title} max={LIMITS.cardTitle} onChange={v => patch(k, { title: v })} />
          <TextArea label="Mô tả" value={it.text} max={LIMITS.cardText} onChange={v => patch(k, { text: v })} />
        </Group>
      ))}
      {items.length < LIMITS.steps[1] && <button className="cms-add" onClick={() => set({ items: [...items, { icon: 'sparkle', title: '', text: '' }] })}>+ Thêm bước</button>}
    </>
  );
}

/* ---------------- Mẫu tham khảo ---------------- */

/** Ảnh thẻ không còn khớp màu (đã đổi màu sau khi tạo ảnh). */
function imageStale(it: GalleryItem) {
  if (!it.image) return false;
  if (it.imageFor) return it.imageFor !== hashOf(it.config);
  const d = DEFAULT_CONTENT.gallery.items.find(x => x.id === it.id);
  return !!d && it.image === d.image && hashOf(d.config) !== hashOf(it.config);
}

export function GalleryForm({ g, set }: { g: GalleryContent; set: Set<GalleryContent> }) {
  const { upload, notify } = useContext(CmsCtx);
  const [sel, setSel] = useState(0);
  const [job, setJob] = useState<{ id: string; config: GalleryItem['config'] } | null>(null);
  const items = g.items, k = Math.min(sel, items.length - 1), cur = items[k];
  const patchItem = (id: string, p: Partial<GalleryItem>) => set({ items: items.map(x => (x.id === id ? { ...x, ...p } : x)) });

  // ảnh tạo xong → tải lên R2 → gắn vào đúng mẫu (theo id, trên nội dung mới nhất: trong lúc chờ có thể đã sửa thứ khác)
  const onShot = async (j: NonNullable<typeof job>, blob: Blob) => {
    setJob(null);
    try {
      const url = await upload(blob);
      set(prev => ({ items: prev.items.map(x => (x.id === j.id ? { ...x, image: url, imageFor: hashOf(j.config) } : x)) }));
      notify('Đã tạo ảnh mới cho mẫu.');
    } catch (e) { notify((e as Error).message, true); }
  };
  const make = (it: GalleryItem) => setJob({ id: it.id, config: it.config });
  const add = () => {
    if (items.length >= LIMITS.gallery[1]) return;
    const it: GalleryItem = { id: newId('mau'), name: 'Mẫu mới', tag: '', config: { ...(cur?.config ?? DEFAULT_CONFIG) }, image: '' };
    set({ items: [...items, it] }); setSel(items.length); make(it);
  };

  return (
    <>
      <Head title="Mẫu tham khảo" onReset={() => { set(DEFAULT_CONTENT.gallery); setSel(0); }} />
      <Group title="Tiêu đề mục">
        <TextField label="Tiêu đề" value={g.title} max={LIMITS.title} onChange={v => set({ title: v })} />
        <TextField label="Chữ nút trên thẻ" value={g.use} max={LIMITS.cta} onChange={v => set({ use: v })} />
      </Group>

      <Group title="Các mẫu" hint="Bấm thẻ để sửa. Bấm “Dùng mẫu” trên web sẽ áp đúng màu này vào trình phối.">
        <div className="cms-cards">
          {items.map((it, j) => (
            <button key={it.id + j} className={'cms-card' + (j === k ? ' on' : '')} onClick={() => setSel(j)}>
              <span className="cms-card-img">{it.image ? <img src={it.image} alt="" /> : <i style={{ background: swatch(it.config) }} />}{job?.id === it.id && <i className="cms-spin" />}</span>
              <span className="cms-card-name">{it.name || 'Chưa đặt tên'}</span>
              {(imageStale(it) || !it.image) && <span className="cms-badge" title="Ảnh chưa khớp màu">!</span>}
            </button>
          ))}
          {items.length < LIMITS.gallery[1] && <button className="cms-card add" onClick={add}>+<span>Thêm mẫu</span></button>}
        </div>

        {cur && (
          <div className="cms-sub">
            <div className="cms-row">
              <TextField label="Tên mẫu" value={cur.name} max={LIMITS.galleryName} onChange={v => patchItem(cur.id, { name: v })} />
              <ItemTools index={k} count={items.length} min={LIMITS.gallery[0]}
                onMove={j => { set({ items: moveItem(items, k, j) }); setSel(j); }}
                onRemove={() => { set({ items: items.filter((_, j) => j !== k) }); setSel(Math.max(0, k - 1)); }} />
            </div>
            <TextField label="Nhãn nhỏ (phong cách)" value={cur.tag} max={LIMITS.tag} onChange={v => patchItem(cur.id, { tag: v })} placeholder="Ví dụ: Thể thao" />
            <ImageField label="Ảnh thẻ" value={cur.image} onChange={url => patchItem(cur.id, { image: url, imageFor: undefined })}
              hint={!cur.image ? 'Mẫu chưa có ảnh.' : imageStale(cur) ? 'Màu đã đổi, ảnh chưa khớp → bấm “Tạo ảnh từ màu”.' : undefined}>
              <button className="cms-btn primary" disabled={!!job} onClick={() => make(cur)}>{job?.id === cur.id ? 'Đang tạo ảnh…' : 'Tạo ảnh từ màu'}</button>
            </ImageField>
            <ZoneEditor config={cur.config} onChange={config => patchItem(cur.id, { config })} />
          </div>
        )}
      </Group>
      {job && <ThumbMaker key={job.id + hashOf(job.config)} config={job.config} onDone={b => onShot(job, b)} onError={e => { setJob(null); notify(e.message, true); }} />}
    </>
  );
}

/* ---------------- Tự phối màu / Footer ---------------- */

export function ConfiguratorForm({ title, set }: { title: string; set: (t: string) => void }) {
  return (
    <>
      <Head title="Tự phối màu" onReset={() => set(DEFAULT_CONTENT.configurator.title)} />
      <Group title="Tiêu đề mục" hint="Trình phối màu bên dưới tiêu đề giữ nguyên, không chỉnh trong CMS.">
        <TextField label="Tiêu đề" value={title} max={LIMITS.title} onChange={set} />
      </Group>
    </>
  );
}

export function FooterForm({ text, set }: { text: string; set: (t: string) => void }) {
  return (
    <>
      <Head title="Footer" onReset={() => set(DEFAULT_CONTENT.footer.text)} />
      <Group title="Chân trang" hint={`Năm tự cập nhật theo năm hiện tại: “${new Date().getFullYear()} | ${text || '…'}”.`}>
        <TextField label="Chữ sau năm" value={text} max={LIMITS.footer} onChange={set} />
      </Group>
    </>
  );
}

/* ---------------- Câu hỏi thường gặp ---------------- */

export function FaqForm({ faq, set }: { faq: FaqContent; set: Set<FaqContent> }) {
  const items = faq.items;
  const [open, setOpen] = useState<number | null>(null);
  const patch = (k: number, p: Partial<FaqContent['items'][number]>) => set({ items: items.map((x, j) => (j === k ? { ...x, ...p } : x)) });
  return (
    <>
      <Head title="Câu hỏi thường gặp" onReset={() => set(DEFAULT_CONTENT.faq)} />
      <Group title="Tiêu đề mục" hint="Xoá hết câu hỏi thì mục này ẩn khỏi web.">
        <TextField label="Tiêu đề" value={faq.title} max={LIMITS.title} onChange={v => set({ title: v })} />
      </Group>
      <div className="cms-faq">
        {items.map((it, k) => (
          <details key={k} className="cms-group panel" open={open === k} onToggle={e => { if ((e.target as HTMLDetailsElement).open) setOpen(k); else if (open === k) setOpen(null); }}>
            <summary><span className="cms-faq-n">{k + 1}</span><span className="cms-faq-q">{it.q || 'Câu hỏi mới'}</span></summary>
            <div className="cms-faq-body">
              <div className="cms-row end"><ItemTools vertical index={k} count={items.length}
                onMove={j => { set({ items: moveItem(items, k, j) }); setOpen(j); }} onRemove={() => { set({ items: items.filter((_, j) => j !== k) }); setOpen(null); }} /></div>
              <TextField label="Câu hỏi" value={it.q} max={LIMITS.question} onChange={v => patch(k, { q: v })} />
              <TextArea label="Trả lời" value={it.a} max={LIMITS.answer} rows={5} onChange={v => patch(k, { a: v })} />
              <div className="cms-field">
                <span>Link kèm theo (tuỳ chọn)</span>
                {it.links.map((l, j) => (
                  <div key={j} className="cms-link-row">
                    <input type="text" placeholder="Chữ hiển thị" value={l.label} maxLength={LIMITS.linkLabel} onChange={e => patch(k, { links: it.links.map((x, i) => (i === j ? { ...x, label: e.target.value } : x)) })} />
                    <input type="text" placeholder="https://…" value={l.href} maxLength={LIMITS.href} className={l.href && !safeHref(l.href) ? 'bad' : ''}
                      onChange={e => patch(k, { links: it.links.map((x, i) => (i === j ? { ...x, href: e.target.value } : x)) })} />
                    <button className="cms-icon danger" title="Xoá link" onClick={() => patch(k, { links: it.links.filter((_, i) => i !== j) })}>✕</button>
                  </div>
                ))}
                {it.links.some(l => l.href && !safeHref(l.href)) && <small className="cms-warn">Link phải bắt đầu bằng https:// (link sai sẽ không hiện trên web).</small>}
                {it.links.length < LIMITS.links && <button className="cms-add" onClick={() => patch(k, { links: [...it.links, { label: '', href: '' }] })}>+ Thêm link</button>}
              </div>
            </div>
          </details>
        ))}
      </div>
      {items.length < LIMITS.faq && <button className="cms-add" onClick={() => { set({ items: [...items, { q: '', a: '', links: [] }] }); setOpen(items.length); }}>+ Thêm câu hỏi</button>}
    </>
  );
}
