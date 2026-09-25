// Chọn chất bề mặt (Bóng / Nhám) — dùng chung cho bảng màu máy tính và dock điện thoại.
// Mỗi lựa chọn có 1 viên cầu nhỏ tô đúng màu vùng đang chọn: Bóng = điểm sáng sắc, Nhám = ánh sáng mềm → nhìn là thấy khác biệt.
// Nền sáng trượt mượt sang lựa chọn đang chọn.
import { FINISHES, METAL_ZONES, type FinishId } from '../config/finishes';
import { t } from '../config/i18n/vi';

const IDS = Object.keys(FINISHES) as FinishId[];

export function FinishPicker({ zone, color, value, onChange, compact }: {
  zone: string; color: string; value: FinishId; onChange: (f: FinishId) => void; compact?: boolean;
}) {
  const metal = zone in METAL_ZONES;
  const i = Math.max(0, IDS.indexOf(value));
  return (
    <div className={'finish-pick' + (compact ? ' compact' : '')} role="radiogroup" aria-label={t.finish}
      style={{ ['--i' as string]: i, ['--n' as string]: IDS.length }}>
      <i className="finish-thumb" aria-hidden />
      {IDS.map(k => (
        <button key={k} role="radio" aria-checked={k === value} className={k === value ? 'on' : ''} onClick={() => onChange(k)}>
          <span className={'finish-ball ' + k + (metal ? ' metal' : '')} style={{ ['--c' as string]: color }} />
          <span className="finish-txt">
            <b>{FINISHES[k].name}</b>
            {!compact && <small>{t.finishHint[k === 'gloss' && metal ? 'metal' : k]}</small>}
          </span>
        </button>
      ))}
    </div>
  );
}
