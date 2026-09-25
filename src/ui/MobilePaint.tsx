// Phối màu trên điện thoại (chế độ Màu sơn, màn hẹp): 1 tấm gọn ở cuối màn hình, gần ngón cái.
//  - dải tên vùng vuốt ngang (luôn có): chạm tên = chọn vùng (vùng loé sáng trên xe) — không cần chạm trúng chi tiết nhỏ
//  - chọn vùng rồi: dải ô màu to vuốt ngang + ô màu tuỳ chọn, Bóng / Nhám, "Giống thân xe"
// Camera đọc mép trên của tấm (useSheetTop) để đặt xe vào phần còn trống phía trên.
import { useEffect, useRef } from 'react';
import { useDesign } from '../store/design';
import { EDITABLE, SHORT_NAMES, zoneInfo } from '../config/zones';
import { FINISHES, type FinishId } from '../config/finishes';
import { PALETTE, colorName } from '../config/palette';
import { useSheetTop } from './useSheetTop';
import { t } from '../config/i18n/vi';

export function MobilePaint({ active }: { active: boolean }) {
  const selected = useDesign(s => s.selected), config = useDesign(s => s.config);
  const { apply, preview, commitPreview, select } = useDesign.getState();
  const box = useRef<HTMLDivElement>(null), chips = useRef<HTMLDivElement>(null), colors = useRef<HTMLDivElement>(null);
  useSheetTop(box, active);

  const zone = selected?.zone ?? null, style = zone ? config[zone] : null;
  // vùng được chọn (chạm xe hoặc chạm tên) → cuộn dải tên + dải màu tới đúng chỗ
  useEffect(() => {
    if (!zone) return;
    chips.current?.querySelector<HTMLElement>(`[data-zone="${zone}"]`)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [zone]);
  useEffect(() => {
    if (!style) return;
    colors.current?.querySelector<HTMLElement>('.on')?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [zone]);  // eslint-disable-line react-hooks/exhaustive-deps -- chỉ khi đổi vùng

  if (!active) return null;
  const pick = (id: string) => {
    const r = box.current?.getBoundingClientRect();
    select(zone === id ? null : { zone: id, x: r ? r.left + r.width / 2 : 0, y: r ? r.top : 0 });
  };

  return (
    <div className={'mpaint panel' + (style ? ' open' : '')} ref={box}>
      {zone && style && (
        <>
          <div className="mp-head">
            <div><b>{zoneInfo(zone)?.name}</b><span>{colorName(style.color)} · {style.color.toUpperCase()}</span></div>
            <button className="icon-btn" onClick={() => select(null)} aria-label={t.close}>✕</button>
          </div>
          <div className="mp-colors" ref={colors}>
            <label className="mp-custom" title={t.custom}>
              <input type="color" value={style.color} aria-label={t.custom}
                onChange={e => preview(zone, { color: e.target.value })} onBlur={commitPreview} />
            </label>
            {PALETTE.map(p => (
              <button key={p.hex} aria-label={p.name} className={'mp-sw' + (p.hex.toLowerCase() === style.color.toLowerCase() ? ' on' : '')}
                style={{ background: p.hex }} onClick={() => apply({ [zone]: { color: p.hex } })} />
            ))}
          </div>
          <div className="mp-opts">
            <div className="mp-seg">
              {(Object.keys(FINISHES) as FinishId[]).map(k => (
                <button key={k} className={k === style.finish ? 'on' : ''} onClick={() => apply({ [zone]: { finish: k } })}>{FINISHES[k].name}</button>
              ))}
            </div>
            {zone !== 'body' && <button className="mp-same" onClick={() => apply({ [zone]: config.body })}>{t.sameAsBody}</button>}
          </div>
        </>
      )}
      {!zone && <p className="mp-hint">{t.mobile.pickZone}</p>}
      <div className="mp-zones" ref={chips}>
        {EDITABLE.map(id => (
          <button key={id} data-zone={id} className={id === zone ? 'on' : ''} onClick={() => pick(id)}>
            <i style={{ background: config[id]?.color }} />{SHORT_NAMES[id] ?? zoneInfo(id)?.name ?? id}
          </button>
        ))}
      </div>
    </div>
  );
}
