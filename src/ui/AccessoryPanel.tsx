// Tab "Phụ kiện": thư viện phụ kiện lắp lên xe (ốp lazang…). Chạm thẻ = lắp / tháo (1 bước hoàn tác, tự lưu).
//  - Máy tính: bảng bên phải như bảng decal.
//  - Điện thoại: dải thẻ trong dock (AccessoryStrip, dùng ở MobileDock).
import { useDesign } from '../store/design';
import { ACCESSORIES } from '../config/accessories';
import { NARROW_QUERY, useMedia } from './device';
import { t } from '../config/i18n/vi';

export function AccessoryPanel() {
  const mode = useDesign(s => s.mode), narrow = useMedia(NARROW_QUERY);
  if (mode !== 'accessory' || narrow) return null;
  return (
    <aside className="popover panel acc-panel" aria-label={t.accessory.title}>
      <header>
        <div><span className="eyebrow">{t.accessory.eyebrow}</span><h2>{t.accessory.title}</h2></div>
      </header>
      <AccessoryList />
    </aside>
  );
}

/** Danh sách thẻ phụ kiện (dọc trên máy tính, ngang trong dock điện thoại). */
export function AccessoryList({ strip }: { strip?: boolean }) {
  const fitted = useDesign(s => s.accessories), toggle = useDesign(s => s.toggleAccessory);
  return (
    <div className={strip ? 'dock-strip acc-strip' : 'acc-list'}>
      {ACCESSORIES.map(a => {
        const on = !!fitted[a.id];
        return (
          <button key={a.id} className={'acc-card' + (on ? ' on' : '')} aria-pressed={on} onClick={() => toggle(a.id)}>
            <img src={a.thumb} alt="" />
            <span className="acc-txt">
              <b>{a.name}</b>
              {!strip && <small>{a.desc}</small>}
              <em>{on ? <>✓ {t.accessory.fitted} · <u>{t.accessory.remove}</u></> : t.accessory.fit}</em>
            </span>
          </button>
        );
      })}
    </div>
  );
}
