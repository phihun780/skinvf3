// Nút "Tải hình ảnh" → ghép Hình ảnh SkinVF3 A4 → cửa sổ xem trước + tải về.
//  - Cửa sổ gắn thẳng vào <body> (portal), nằm trên cả thanh trên, nền tối đặc → nhìn rõ kết quả.
//  - Máy tính: Bản nhẹ (JPG) + Tải PNG (bản in 300dpi).
//  - Điện thoại: cửa sổ toàn màn hình, nút lớn ở dưới. "Lưu hình" mở bảng chia sẻ của máy (Lưu vào Ảnh, Zalo, Messenger…);
//    máy không hỗ trợ chia sẻ file thì tải JPG. Bản in PNG (nặng, chậm trên điện thoại) chỉ tạo khi bấm.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { create } from 'zustand';
import { useDesign } from '../store/design';
import { renderPoster, posterFileName } from '../poster/renderPoster';
import { toast } from './Chrome';
import { NARROW_QUERY, useMedia } from './device';
import { t } from '../config/i18n/vi';

// lite: JPG nhẹ (xem trước + gửi đi), url: PNG đầy đủ (in ấn)
interface PosterState { open: boolean; busy: boolean; pngBusy: boolean; url: string | null; lite: string | null; liteFile: File | null; name: string }
const usePoster = create<PosterState>(() => ({ open: false, busy: false, pngBusy: false, url: null, lite: null, liteFile: null, name: '' }));
const nextFrame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
let lastCanvas: HTMLCanvasElement | null = null;
const toBlob = (cv: HTMLCanvasElement, type: string, q?: number) =>
  new Promise<Blob>((ok, fail) => cv.toBlob(b => (b ? ok(b) : fail(new Error('toBlob'))), type, q));

export async function exportPoster() {
  if (usePoster.getState().busy) return;
  for (const u of [usePoster.getState().url, usePoster.getState().lite]) if (u) URL.revokeObjectURL(u);
  usePoster.setState({ open: true, busy: true, pngBusy: false, url: null, lite: null, liteFile: null });
  const d = useDesign.getState();
  // ảnh xe không có vệt sáng rê chuột / vùng đang chọn / decal đang chọn / decal chờ dán
  d.setHovered(null); d.select(null); d.selectDecal(null); d.setPending(null);
  await nextFrame();
  try {
    const date = new Date(), name = posterFileName(date);
    const canvas = await renderPoster(date);
    lastCanvas = canvas;
    const jpg = await toBlob(canvas, 'image/jpeg', 0.88);
    usePoster.setState({ busy: false, lite: URL.createObjectURL(jpg), liteFile: new File([jpg], name.replace(/\.png$/, '.jpg'), { type: 'image/jpeg' }), name });
    if (!matchMedia(NARROW_QUERY).matches) await makePng();   // máy tính: có sẵn bản in như trước
  } catch (err) {
    console.error(err);
    usePoster.setState({ open: false, busy: false });
    toast(t.poster.failed);
  }
}

async function makePng() {
  const s = usePoster.getState();
  if (s.url || s.pngBusy || !lastCanvas) return;
  usePoster.setState({ pngBusy: true });
  try { usePoster.setState({ url: URL.createObjectURL(await toBlob(lastCanvas, 'image/png')), pngBusy: false }); }
  catch { usePoster.setState({ pngBusy: false }); toast(t.poster.failed); }
}

/** Tải 1 file (tạo thẻ <a download> tạm). */
function download(url: string, name: string) {
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
}

/** Điện thoại: bảng chia sẻ của máy (Lưu vào Ảnh / Zalo…); không hỗ trợ → tải JPG. */
async function saveImage() {
  const { liteFile, lite } = usePoster.getState();
  if (!liteFile || !lite) return;
  if (navigator.canShare?.({ files: [liteFile] })) {
    try { await navigator.share({ files: [liteFile], title: t.poster.title }); return; }
    catch (e) { if ((e as Error).name === 'AbortError') return; }   // người dùng tự đóng bảng chia sẻ
  }
  download(lite, liteFile.name);
}

const close = () => usePoster.setState({ open: false });

export function PosterModal() {
  const { open, busy, pngBusy, url, lite, name } = usePoster();
  const narrow = useMedia(NARROW_QUERY);
  const [zoom, setZoom] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    addEventListener('keydown', onKey); document.body.classList.add('modal-open');
    return () => { removeEventListener('keydown', onKey); document.body.classList.remove('modal-open'); };
  }, [open]);
  if (!open) return null;
  const view = (
    <div className={'poster-view' + (zoom ? ' zoom' : '')}>
      {busy && <div className="poster-busy"><i />{t.poster.rendering}</div>}
      {(url ?? lite) && <img src={(url ?? lite)!} alt={t.poster.title} onClick={() => setZoom(z => !z)} />}
    </div>
  );

  if (narrow) return createPortal(
    <div className="modal modal-full">
      <div className="modal-box panel">
        <header>
          <div><span className="eyebrow">{t.poster.size}</span><h2>{t.poster.title}</h2></div>
          <button className="icon-btn modal-x" onClick={close} aria-label={t.poster.close}>✕</button>
        </header>
        {view}
        <footer className="modal-foot">
          <button className="btn primary" disabled={!lite} onClick={saveImage}>{t.mobile.saveImage}</button>
          {url
            ? <button className="btn" onClick={() => download(url, name)}>{t.mobile.downloadPng}</button>
            : <button className="btn" disabled={!lite || pngBusy} onClick={makePng}>{pngBusy ? t.mobile.makingPng : t.mobile.printPng}</button>}
          <small>{t.mobile.saveImageHint}</small>
        </footer>
      </div>
    </div>,
    document.body,
  );

  return createPortal(
    <div className="modal" onClick={e => { if (e.target === e.currentTarget) close(); }}>
      <div className="modal-box panel">
        <header>
          <div><span className="eyebrow">{t.poster.size}</span><h2>{t.poster.title}</h2></div>
          <div className="modal-actions">
            <button className="btn" onClick={close}>{t.poster.close}</button>
            <a className={'btn' + (lite ? '' : ' disabled')} href={lite ?? undefined} download={name.replace(/\.png$/, '.jpg')} title={t.poster.liteHint}>{t.poster.downloadLite}</a>
            <a className={'btn primary' + (url ? '' : ' disabled')} href={url ?? undefined} download={name} title={t.poster.printHint}>{t.poster.download}</a>
          </div>
        </header>
        {view}
      </div>
    </div>,
    document.body,
  );
}
