// Chọn chất bề mặt — dùng chung cho bảng màu máy tính và dock điện thoại.
// Chỉ chữ, căn giữa: "Bóng | Nhám" — bên đang chọn sáng, bên còn lại mờ.
import { Fragment } from 'react';
import { FINISHES, type FinishId } from '../config/finishes';
import { t } from '../config/i18n/vi';

const IDS = Object.keys(FINISHES) as FinishId[];

export function FinishPicker({ value, onChange }: { value: FinishId; onChange: (f: FinishId) => void }) {
  return (
    <div className="finish-pick" role="radiogroup" aria-label={t.finish}>
      {IDS.map((k, i) => (
        <Fragment key={k}>
          {i > 0 && <span className="finish-sep" aria-hidden>|</span>}
          <button role="radio" aria-checked={k === value} className={k === value ? 'on' : ''} onClick={() => onChange(k)}>{FINISHES[k].name}</button>
        </Fragment>
      ))}
    </div>
  );
}
