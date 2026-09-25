// Điện thoại (màn hẹp): 1 dock dính đáy màn hình, gần ngón cái — thay cho bảng màu góc phải, bảng decal và thanh công cụ nổi.
//   [nội dung theo chế độ]  Màu sơn: dải tên vùng + (khi chọn vùng) dải ô màu, Bóng/Nhám
//                           Decal: chờ dán → 1 dòng hướng dẫn · đang chọn decal → thanh chỉnh · còn lại → 3 tab Thư viện / Ảnh / Chữ
//   [hàng công cụ]          Hoàn tác · Làm lại · Tự xoay · Reset · Lưu · Tải hình
// Dock tự báo mép trên (useSheetTop) → camera đặt xe giữa phần trống phía trên.
import { useEffect, useRef, useState } from 'react';
import { useDesign, type Decal, type DecalDraft } from '../store/design';
import { EDITABLE, SHORT_NAMES, zoneInfo } from '../config/zones';
import { PALETTE, colorName } from '../config/palette';
import { DECAL_LIBRARY, TEXT_STYLES, UPLOAD_ACCEPT } from '../config/decals';
import { imageAspect, prepareUpload, renderText } from './decalImage';
import { DockTools, toast } from './Chrome';
import { useSheetTop } from './useSheetTop';
import { FinishPicker } from './FinishPicker';
import { t } from '../config/i18n/vi';

export function MobileDock({ active }: { active: boolean }) {
  const mode = useDesign(s => s.mode);
  const box = useRef<HTMLDivElement>(null);
  useSheetTop(box, active);
  if (!active) return null;
  return (
    <div className="mdock" ref={box}>
      <i className="mdock-grip" aria-hidden />
      {mode === 'paint' ? <PaintDock /> : <DecalDock />}
      <DockTools />
    </div>
  );
}

/* ---------------- Màu sơn ---------------- */

function PaintDock() {
  const selected = useDesign(s => s.selected), config = useDesign(s => s.config);
  const { apply, preview, commitPreview, select } = useDesign.getState();
  const chips = useRef<HTMLDivElement>(null), colors = useRef<HTMLDivElement>(null);
  const zone = selected?.zone ?? null, style = zone ? config[zone] : null;

  // vùng được chọn (chạm xe hoặc chạm tên) → cuộn dải tên + dải màu tới đúng chỗ
  useEffect(() => {
    if (!zone) return;
    chips.current?.querySelector<HTMLElement>(`[data-zone="${zone}"]`)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    colors.current?.querySelector<HTMLElement>('.on')?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [zone]);

  return (
    <div className="dock-body">
      {zone && style && (
        <div className="dock-color">
          <div className="dock-head">
            <div><b>{zoneInfo(zone)?.name}</b><span>{colorName(style.color)} · {style.color.toUpperCase()}</span></div>
            <button className="dock-x" onClick={() => select(null)} aria-label={t.close}>✕</button>
          </div>
          <div className="dock-strip swatch-strip" ref={colors}>
            <label className="mp-custom" title={t.custom}>
              <input type="color" value={style.color} aria-label={t.custom} onChange={e => preview(zone, { color: e.target.value })} onBlur={commitPreview} />
            </label>
            {PALETTE.map(p => (
              <button key={p.hex} aria-label={p.name} className={'mp-sw' + (p.hex.toLowerCase() === style.color.toLowerCase() ? ' on' : '')}
                style={{ background: p.hex }} onClick={() => apply({ [zone]: { color: p.hex } })} />
            ))}
          </div>
          <div className="dock-row">
            <FinishPicker compact zone={zone} color={style.color} value={style.finish} onChange={k => apply({ [zone]: { finish: k } })} />
          </div>
        </div>
      )}
      <div className="dock-label">{zone ? t.mobile.otherZone : t.mobile.pickZone}</div>
      <div className="dock-strip zone-strip" ref={chips}>
        {EDITABLE.map(id => (
          <button key={id} data-zone={id} className={'zone-chip' + (id === zone ? ' on' : '')}
            onClick={() => select(zone === id ? null : { zone: id, x: 0, y: 0 })}>
            <i style={{ background: config[id]?.color }} />{SHORT_NAMES[id] ?? zoneInfo(id)?.name ?? id}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Decal ---------------- */

type Tab = 'library' | 'upload' | 'text';

function DecalDock() {
  const decals = useDesign(s => s.decals), selectedId = useDesign(s => s.selectedDecal), pending = useDesign(s => s.pending);
  const { setPending, selectDecal } = useDesign.getState();
  const [tab, setTab] = useState<Tab>('library');
  const selected = decals.find(d => d.id === selectedId) ?? null;

  const choose = (draft: DecalDraft) => { selectDecal(null); setPending(draft); };

  // 1) đang chờ dán: chỉ 1 dòng hướng dẫn → xe gần như chiếm trọn màn hình
  if (pending) return (
    <div className="dock-body">
      <div className="dock-pending">
        <img src={pending.src} alt="" />
        <span>{t.mobile.placeHint(pending.label)}</span>
        <button className="dock-chip" onClick={() => setPending(null)}>{t.decal.cancel}</button>
      </div>
    </div>
  );

  // 2) đang chọn 1 decal: thanh chỉnh (to nhỏ / xoay kéo thẳng trên xe)
  if (selected) return <DecalEdit decal={selected} />;

  // 3) còn lại: 3 tab + dải decal đã dán
  return (
    <div className="dock-body">
      <div className="dock-tabs" role="tablist">
        {(Object.keys(t.mobile.tabs) as Tab[]).map(k => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{t.mobile.tabs[k]}</button>
        ))}
      </div>
      {tab === 'library' && (
        <div className="dock-strip lib-strip">
          {DECAL_LIBRARY.map(item => (
            <button key={item.id} className="lib-card" aria-label={item.label}
              onClick={async () => choose({ label: item.label, src: item.src, aspect: await imageAspect(item.src) })}>
              <img src={item.src} alt="" />
            </button>
          ))}
        </div>
      )}
      {tab === 'upload' && <UploadTab onPick={choose} />}
      {tab === 'text' && <TextTab onPick={choose} />}
      {decals.length > 0 && (
        <>
          <div className="dock-label">{t.mobile.placedTitle} ({decals.length})</div>
          <div className="dock-strip placed-strip">
            {[...decals].reverse().map(d => (
              <button key={d.id} className="placed-card" onClick={() => selectDecal(d.id)} aria-label={d.label}><img src={d.src} alt="" /></button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function UploadTab({ onPick }: { onPick: (d: DecalDraft) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try { onPick(await prepareUpload(file)); } catch (e) { toast((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <div className="dock-upload">
      <button className="btn primary" disabled={busy} onClick={() => input.current?.click()}>{busy ? '…' : t.mobile.pickPhoto}</button>
      <small>{t.mobile.pickPhotoHint}</small>
      <input ref={input} type="file" accept={UPLOAD_ACCEPT} hidden onChange={e => { pick(e.target.files?.[0]); e.target.value = ''; }} />
    </div>
  );
}

function TextTab({ onPick }: { onPick: (d: DecalDraft) => void }) {
  const [text, setText] = useState(''), [color, setColor] = useState('#f6f6f4'), [style, setStyle] = useState<string>(TEXT_STYLES[0].id);
  const add = async () => { if (text.trim()) onPick(await renderText(text.trim(), color, style)); };
  return (
    <div className="dock-text">
      <div className="dock-text-row">
        <input type="text" value={text} placeholder={t.decal.textPlaceholder} maxLength={24} enterKeyHint="done"
          onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add(); }} />
        <label className="dock-color-pick" style={{ background: color }}><input type="color" value={color} onChange={e => setColor(e.target.value)} aria-label={t.decal.textColor} /></label>
      </div>
      <div className="dock-row">
        <div className="dock-seg">
          {TEXT_STYLES.map(s => <button key={s.id} className={s.id === style ? 'on' : ''} onClick={() => setStyle(s.id)}>{s.label}</button>)}
        </div>
        <button className="btn primary sm" disabled={!text.trim()} onClick={add}>{t.decal.addText}</button>
      </div>
    </div>
  );
}

function DecalEdit({ decal }: { decal: Decal }) {
  const { updateDecal, commitPreview, mirrorDecal, removeDecal, selectDecal } = useDesign.getState();
  return (
    <div className="dock-body">
      <div className="dock-head">
        <div className="dock-decal-title"><img src={decal.src} alt="" /><b>{decal.label}</b></div>
        <button className="btn primary sm" onClick={() => selectDecal(null)}>{t.mobile.done}</button>
      </div>
      <label className="dock-slider">
        <span>{t.decal.opacity}</span>
        <input type="range" min={0.1} max={1} step={0.01} value={decal.opacity}
          onChange={e => updateDecal(decal.id, { opacity: +e.target.value }, true)} onPointerUp={commitPreview} onBlur={commitPreview} />
        <b>{Math.round(decal.opacity * 100)}%</b>
      </label>
      <div className="dock-row">
        <button className={'dock-chip' + (decal.flip ? ' on' : '')} onClick={() => updateDecal(decal.id, { flip: !decal.flip })}>{t.decal.flip}</button>
        <button className="dock-chip" onClick={() => mirrorDecal(decal.id)}>{t.decal.mirror}</button>
        <button className="dock-chip danger" onClick={() => removeDecal(decal.id)}>{t.decal.remove}</button>
      </div>
    </div>
  );
}
