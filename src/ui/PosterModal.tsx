// Nút "Xuất poster" → render poster A4 → cửa sổ xem trước + Tải PNG.
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { useDesign } from '../store/design';
import { renderPoster, posterFileName } from '../poster/renderPoster';
import { toast } from './Chrome';
import { t } from '../config/i18n/vi';

// url: PNG đầy đủ (in ấn), lite: JPG nhẹ (gửi Zalo/Messenger)
interface PosterState { open: boolean; busy: boolean; url: string | null; lite: string | null; name: string }
const usePoster = create<PosterState>(() => ({ open: false, busy: false, url: null, lite: null, name: '' }));
const nextFrame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

export async function exportPoster() {
  if (usePoster.getState().busy) return;
  for (const u of [usePoster.getState().url, usePoster.getState().lite]) if (u) URL.revokeObjectURL(u);
  usePoster.setState({ open: true, busy: true, url: null, lite: null });
  const d = useDesign.getState();
  // ảnh xe trên poster không có vệt sáng rê chuột / decal đang chọn / decal chờ dán
  d.setHovered(null); d.selectDecal(null); d.setPending(null);
  await nextFrame();
  try {
    const date = new Date();
    const canvas = await renderPoster({ config: d.config, decals: d.decals, code: d.code, date });
    const toBlob = (type: string, q?: number) => new Promise<Blob>((ok, fail) => canvas.toBlob(b => b ? ok(b) : fail(new Error('toBlob')), type, q));
    const [png, jpg] = await Promise.all([toBlob('image/png'), toBlob('image/jpeg', 0.88)]);
    usePoster.setState({ busy: false, url: URL.createObjectURL(png), lite: URL.createObjectURL(jpg), name: posterFileName(d.code, date) });
  } catch (err) {
    console.error(err);
    usePoster.setState({ open: false, busy: false });
    toast(t.poster.failed);
  }
}

export function PosterModal() {
  const { open, busy, url, lite, name } = usePoster();
  const [zoom, setZoom] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') usePoster.setState({ open: false }); };
    addEventListener('keydown', onKey); return () => removeEventListener('keydown', onKey);
  }, [open]);
  if (!open) return null;
  return (
    <div className="modal" onClick={e => { if (e.target === e.currentTarget) usePoster.setState({ open: false }); }}>
      <div className="modal-box panel">
        <header>
          <div><span className="eyebrow">{t.poster.size}</span><h2>{t.poster.title}</h2></div>
          <div className="modal-actions">
            <button className="btn" onClick={() => usePoster.setState({ open: false })}>{t.poster.close}</button>
            <a className={'btn' + (lite ? '' : ' disabled')} href={lite ?? undefined} download={name.replace(/\.png$/, '.jpg')} title={t.poster.liteHint}>{t.poster.downloadLite}</a>
            <a className={'btn primary' + (url ? '' : ' disabled')} href={url ?? undefined} download={name} title={t.poster.printHint}>{t.poster.download}</a>
          </div>
        </header>
        <div className={'poster-view' + (zoom ? ' zoom' : '')}>
          {busy && <div className="poster-busy"><i />{t.poster.rendering}</div>}
          {url && <img src={url} alt={t.poster.title} onClick={() => setZoom(z => !z)} />}
        </div>
      </div>
    </div>
  );
}
