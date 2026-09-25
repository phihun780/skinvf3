// Bảng màu: bấm 1 vùng trên xe → panel hiện ở góc phải (không che xe; khung 3D tự đẩy xe sang trái, xem Studio).
// Thứ tự: tên bộ phận → bảng màu → chất bề mặt. Esc hoặc bấm ra ngoài xe để đóng.
import { useEffect, useState } from 'react';
import { useDesign } from '../store/design';
import { GROUPS, zoneInfo } from '../config/zones';
import { FINISHES, type FinishId } from '../config/finishes';
import { PALETTE, colorName } from '../config/palette';
import { t } from '../config/i18n/vi';

export function ColorPopover() {
  const selected = useDesign(s => s.selected);
  const config = useDesign(s => s.config);
  const { apply, preview, commitPreview, select } = useDesign.getState();
  const [hoverColor, setHoverColor] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') select(null); };
    addEventListener('keydown', onKey); return () => removeEventListener('keydown', onKey);
  }, [select]);

  if (!selected) return null;
  const zone = selected.zone, info = zoneInfo(zone), style = config[zone];
  if (!info || !style) return null;
  const group = info.group ?? 'detail';
  const shown = hoverColor ?? style.color;

  return (
    <aside className="popover panel" role="dialog" aria-label={info.name}>
      <header>
        <div>
          <span className="eyebrow">{GROUPS[group]}</span>
          <h2 key={zone}>{info.name}</h2>
        </div>
        <button className="icon-btn" onClick={() => select(null)} aria-label={t.close}>✕</button>
      </header>

      <section>
        <span className="eyebrow">{t.palette}</span>
        <div className="swatches">
          {PALETTE.map(p => (
            <button key={p.hex} title={p.name} aria-label={p.name}
              className={'swatch' + (p.hex.toLowerCase() === style.color.toLowerCase() ? ' active' : '')}
              style={{ background: p.hex }}
              onMouseEnter={() => setHoverColor(p.hex)} onMouseLeave={() => setHoverColor(null)}
              onClick={() => apply({ [zone]: { color: p.hex } })} />
          ))}
        </div>
        <div className="color-name">{colorName(shown)}<span>{shown.toUpperCase()}</span></div>
        <div className="custom">
          <input type="color" value={style.color} aria-label={t.custom}
            onChange={e => preview(zone, { color: e.target.value })}
            onBlur={commitPreview} onPointerUp={commitPreview} />
          <input type="text" key={style.color} defaultValue={style.color.toUpperCase()} maxLength={7} spellCheck={false} aria-label="Mã HEX"
            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
            onBlur={e => { const h = e.target.value.trim(); if (/^#?[0-9a-f]{6}$/i.test(h)) apply({ [zone]: { color: (h[0] === '#' ? h : '#' + h).toLowerCase() } }); }} />
        </div>
      </section>

      <section>
        <span className="eyebrow">{t.finish}</span>
        <div className="finishes">
          {(Object.keys(FINISHES) as FinishId[])
            .map(k => (
              <button key={k} className={'chip' + (k === style.finish ? ' active' : '')} onClick={() => apply({ [zone]: { finish: k } })}>
                {FINISHES[k].name}
              </button>
            ))}
        </div>
      </section>

      {zone !== 'body' && (
        <section className="quick"><button className="btn sm" onClick={() => apply({ [zone]: config.body })}>{t.sameAsBody}</button></section>
      )}
    </aside>
  );
}
