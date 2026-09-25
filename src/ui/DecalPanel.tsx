// Panel decal (chế độ Decal): thêm từ thư viện / tải ảnh PNG-JPG-WEBP / chữ → bấm lên xe để dán;
// danh sách decal đã dán + chỉnh decal đang chọn (kích thước, xoay, độ trong, lật, đối xứng, lớp, xoá).
import { useEffect, useRef, useState } from 'react';
import { useDesign, type Decal, type DecalDraft } from '../store/design';
import { DECAL_LIBRARY, TEXT_STYLES, UPLOAD_ACCEPT } from '../config/decals';
import { imageAspect, prepareUpload, renderText } from './decalImage';
import { toast } from './Chrome';
import { t } from '../config/i18n/vi';
import { NARROW_QUERY, TOUCH_QUERY, useMedia } from './device';
import { useSheetTop } from './useSheetTop';

export function DecalPanel() {
  const mode = useDesign(s => s.mode);
  const decals = useDesign(s => s.decals), selectedId = useDesign(s => s.selectedDecal), pending = useDesign(s => s.pending);
  const { setPending, selectDecal, removeDecal } = useDesign.getState();
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const narrow = useMedia(NARROW_QUERY), touch = useMedia(TOUCH_QUERY);
  const [min, setMin] = useState(false);   // màn hẹp: thu gọn bảng còn thanh tiêu đề (để thấy xe)
  const panel = useRef<HTMLElement>(null);
  useSheetTop(panel, narrow && mode === 'decal');
  const [text, setText] = useState(''), [textColor, setTextColor] = useState('#f6f6f4'), [textStyle, setTextStyle] = useState<string>(TEXT_STYLES[0].id);

  // phím Delete xoá decal đang chọn, Esc huỷ chờ dán / bỏ chọn
  useEffect(() => {
    if (mode !== 'decal') return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      const s = useDesign.getState();
      if ((e.key === 'Delete' || e.key === 'Backspace') && s.selectedDecal) { e.preventDefault(); s.removeDecal(s.selectedDecal); }
      if (e.key === 'Escape') { if (s.pending) s.setPending(null); else s.selectDecal(null); }
    };
    addEventListener('keydown', onKey); return () => removeEventListener('keydown', onKey);
  }, [mode]);

  if (mode !== 'decal') return null;
  const selected = decals.find(d => d.id === selectedId) ?? null;

  const choose = (draft: DecalDraft) => { selectDecal(null); setPending(draft); if (narrow) setMin(true); };
  const pickLibrary = async (item: (typeof DECAL_LIBRARY)[number]) => choose({ label: item.label, src: item.src, aspect: await imageAspect(item.src) });
  const upload = async (file: File | undefined) => {
    if (!file) return;
    try { choose(await prepareUpload(file)); }
    catch (err) { toast((err as Error).message); }
  };
  const addText = async () => { if (text.trim()) choose(await renderText(text.trim(), textColor, textStyle)); };

  return (
    <aside ref={panel} className={'popover panel decal-panel' + (dragOver ? ' drag-over' : '') + (narrow && min ? ' min' : '')} aria-label={t.decal.title}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); setDragOver(false); upload(e.dataTransfer.files[0]); }}>
      <header onClick={narrow ? () => setMin(m => !m) : undefined}>
        <div><span className="eyebrow">{t.decal.eyebrow}</span><h2>{t.decal.title}</h2></div>
        {narrow && <button className="icon-btn sheet-toggle" aria-label={min ? t.mobile.expand : t.mobile.collapse}>{min ? '▴' : '▾'}</button>}
      </header>

      {pending && (
        <div className="pending">
          <img src={pending.src} alt="" />
          <span>{(touch ? t.mobile.placeHint : t.decal.placeHint)(pending.label)}</span>
          <button className="btn sm" onClick={() => setPending(null)}>{t.decal.cancel}</button>
        </div>
      )}

      <section>
        <span className="eyebrow">{t.decal.library}</span>
        <div className="decal-grid">
          {DECAL_LIBRARY.map(item => (
            <button key={item.id} className={'decal-thumb' + (pending?.src === item.src ? ' active' : '')} title={item.label} onClick={() => pickLibrary(item)}>
              <img src={item.src} alt={item.label} />
            </button>
          ))}
        </div>
      </section>

      <section>
        <span className="eyebrow">{t.decal.upload}</span>
        <button className="drop" onClick={() => fileInput.current?.click()}>
          <b>{t.decal.uploadBtn}</b><span>{t.decal.uploadHint}</span>
        </button>
        <input ref={fileInput} type="file" accept={UPLOAD_ACCEPT} hidden onChange={e => { upload(e.target.files?.[0]); e.target.value = ''; }} />
      </section>

      <section>
        <span className="eyebrow">{t.decal.text}</span>
        <div className="custom">
          <input type="text" value={text} placeholder={t.decal.textPlaceholder} maxLength={24} onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addText(); }} style={{ textTransform: 'none' }} />
          <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} aria-label={t.decal.textColor} />
        </div>
        <div className="row-gap">
          {TEXT_STYLES.map(s => <button key={s.id} className={'chip' + (s.id === textStyle ? ' active' : '')} onClick={() => setTextStyle(s.id)}>{s.label}</button>)}
          <button className="btn sm primary" disabled={!text.trim()} onClick={addText}>{t.decal.addText}</button>
        </div>
      </section>

      <section>
        <span className="eyebrow">{t.decal.placed(decals.length)}</span>
        {!decals.length && <p className="muted">{t.decal.empty}</p>}
        <div className="decal-list">
          {[...decals].reverse().map(d => (
            <button key={d.id} className={'decal-row' + (d.id === selectedId ? ' active' : '')} onClick={() => selectDecal(d.id === selectedId ? null : d.id)}>
              <img src={d.src} alt="" /><span>{d.label}</span>
              <span className="x" role="button" aria-label={t.decal.remove} onClick={e => { e.stopPropagation(); removeDecal(d.id); }}>✕</span>
            </button>
          ))}
        </div>
      </section>

      {selected && <DecalControls decal={selected} />}
    </aside>
  );
}

function DecalControls({ decal }: { decal: Decal }) {
  const { updateDecal, commitPreview, mirrorDecal } = useDesign.getState();
  return (
    <section className="decal-controls">
      <span className="eyebrow">{t.decal.editing(decal.label)}</span>
      {/* kích thước & góc xoay chỉnh thẳng trên xe bằng khung decal (DecalGizmo) */}
      <label className="slider">
        <span>{t.decal.opacity}<b>{Math.round(decal.opacity * 100)}%</b></span>
        <input type="range" min={0.1} max={1} step={0.01} value={decal.opacity}
          onChange={e => updateDecal(decal.id, { opacity: +e.target.value }, true)}
          onPointerUp={commitPreview} onKeyUp={commitPreview} onBlur={commitPreview} />
      </label>
      <div className="row-gap">
        <button className={'chip' + (decal.flip ? ' active' : '')} onClick={() => updateDecal(decal.id, { flip: !decal.flip })}>{t.decal.flip}</button>
        <button className="chip" onClick={() => mirrorDecal(decal.id)}>{t.decal.mirror}</button>
      </div>
    </section>
  );
}
