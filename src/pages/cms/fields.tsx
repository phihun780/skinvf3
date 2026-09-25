// Ô nhập dùng chung cho các form CMS.
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { EDITABLE, GROUPS, zoneInfo, type DesignConfig, type ZoneGroup, type ZoneStyle } from '../../config/zones';
import { FINISHES, type FinishId } from '../../config/finishes';

/** Tải ảnh lên (Editor cung cấp: có token, tự xử lý hết phiên) + báo lỗi / thông báo. */
export const CmsCtx = createContext<{ upload: (b: Blob) => Promise<string>; notify: (text: string, bad?: boolean) => void }>({
  upload: () => Promise.reject(new Error('Chưa sẵn sàng')), notify: () => {},
});

export function Group({ title, hint, children, aside }: { title: string; hint?: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="cms-group panel">
      <div className="cms-group-head"><h2>{title}</h2>{aside}</div>
      {hint && <p className="cms-hint">{hint}</p>}
      {children}
    </section>
  );
}

export function TextField({ label, value, max, onChange, placeholder }: { label: string; value: string; max: number; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="cms-field">
      <span>{label}<em>{value.length}/{max}</em></span>
      <input type="text" value={value} maxLength={max} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
    </label>
  );
}

export function TextArea({ label, value, max, onChange, rows = 3 }: { label: string; value: string; max: number; onChange: (v: string) => void; rows?: number }) {
  return (
    <label className="cms-field">
      <span>{label}<em>{value.length}/{max}</em></span>
      <textarea value={value} maxLength={max} rows={rows} onChange={e => onChange(e.target.value)} />
    </label>
  );
}

/** Nút sắp xếp / xoá 1 mục trong danh sách. */
export function ItemTools({ index, count, min = 0, onMove, onRemove, vertical }: {
  index: number; count: number; min?: number; onMove: (to: number) => void; onRemove: () => void; vertical?: boolean;
}) {
  return (
    <div className="cms-item-tools">
      <button className="cms-icon" title={vertical ? 'Lên trên' : 'Đưa lên trước'} disabled={index === 0} onClick={() => onMove(index - 1)}>{vertical ? '↑' : '←'}</button>
      <button className="cms-icon" title={vertical ? 'Xuống dưới' : 'Đưa ra sau'} disabled={index === count - 1} onClick={() => onMove(index + 1)}>{vertical ? '↓' : '→'}</button>
      <button className="cms-icon danger" title="Xoá" disabled={count <= min} onClick={onRemove}>✕</button>
    </div>
  );
}

/** Đổi chỗ phần tử i → j trong mảng (trả mảng mới). */
export const moveItem = <T,>(list: T[], i: number, j: number) => { const next = [...list]; const [x] = next.splice(i, 1); next.splice(j, 0, x); return next; };

/* ---------------- màu từng vùng ---------------- */

const GROUP_ORDER: ZoneGroup[] = ['paint', 'trim', 'wheel', 'detail'];

export function ZoneEditor({ config, onChange }: { config: DesignConfig; onChange: (c: DesignConfig) => void }) {
  const set = (ids: string[], patch: Partial<ZoneStyle>) => onChange({ ...config, ...Object.fromEntries(ids.map(id => [id, { ...config[id], ...patch }])) });
  return (
    <div className="cms-zones">
      {GROUP_ORDER.map(g => {
        const ids = EDITABLE.filter(id => (zoneInfo(id)?.group ?? 'detail') === g);
        if (!ids.length) return null;
        return (
          <details key={g} className="cms-zone-group" open={g === 'paint'}>
            <summary>
              <span>{GROUPS[g]}</span>
              <span className="cms-dots">{ids.map(id => <i key={id} style={{ background: config[id].color }} />)}</span>
            </summary>
            {ids.length > 1 && (
              <div className="cms-zone all">
                <span>Cả nhóm</span>
                <ColorInput value={config[ids[0]].color} onChange={color => set(ids, { color })} />
                <FinishSeg value={ids.every(id => config[id].finish === config[ids[0]].finish) ? config[ids[0]].finish : null} onChange={finish => set(ids, { finish })} />
              </div>
            )}
            {ids.map(id => (
              <div key={id} className="cms-zone">
                <span>{zoneInfo(id)?.name ?? id}</span>
                <ColorInput value={config[id].color} onChange={color => set([id], { color })} />
                <FinishSeg value={config[id].finish} onChange={finish => set([id], { finish })} />
              </div>
            ))}
          </details>
        );
      })}
    </div>
  );
}

function ColorInput({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const commit = () => { const v = text.trim().replace(/^#?/, '#'); if (/^#[0-9a-f]{6}$/i.test(v)) onChange(v.toLowerCase()); else setText(value); };
  return (
    <span className="cms-color">
      <input type="color" value={value} onChange={e => onChange(e.target.value)} aria-label="Chọn màu" />
      <input type="text" value={text} maxLength={7} spellCheck={false} onChange={e => setText(e.target.value)}
        onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') commit(); }} aria-label="Mã màu" />
    </span>
  );
}

function FinishSeg({ value, onChange }: { value: FinishId | null; onChange: (f: FinishId) => void }) {
  return (
    <span className="cms-seg sm">
      {(Object.keys(FINISHES) as FinishId[]).map(f => (
        <button key={f} className={value === f ? 'on' : ''} onClick={() => onChange(f)}>{FINISHES[f].name}</button>
      ))}
    </span>
  );
}

/* ---------------- ảnh ---------------- */

const MAX_SIDE = 1800;

/** Ảnh người dùng chọn → thu còn cạnh dài ≤ 1800px, WebP (giữ nền trong suốt). */
export async function toWebp(file: File): Promise<Blob> {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error('Chỉ nhận ảnh PNG, JPG hoặc WEBP.');
  if (file.size > 20 * 1024 * 1024) throw new Error('Ảnh quá lớn (tối đa 20MB).');
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height); bmp.close();
  const blob = await new Promise<Blob | null>(ok => c.toBlob(ok, 'image/webp', 0.88));
  if (!blob) throw new Error('Trình duyệt không đổi được ảnh sang WebP.');
  if (blob.size > 3 * 1024 * 1024) throw new Error('Ảnh sau khi nén vẫn lớn hơn 3MB, hãy chọn ảnh nhỏ hơn.');
  return blob;
}

export function ImageField({ label, value, def, onChange, hint, children }: {
  label: string; value: string; def?: string; onChange: (url: string) => void; hint?: string; children?: ReactNode;
}) {
  const { upload, notify } = useContext(CmsCtx);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try { onChange(await upload(await toWebp(file))); } catch (e) { notify((e as Error).message, true); } finally { setBusy(false); if (input.current) input.current.value = ''; }
  };
  return (
    <div className="cms-field">
      <span>{label}</span>
      <div className="cms-image">
        <div className="cms-image-box">{value ? <img src={value} alt="" /> : <em>Chưa có ảnh</em>}{busy && <i className="cms-spin" />}</div>
        <div className="cms-image-actions">
          {children}
          <button className="cms-btn" disabled={busy} onClick={() => input.current?.click()}>{busy ? 'Đang tải lên…' : 'Tải ảnh lên'}</button>
          {def !== undefined && value !== def && <button className="cms-link" onClick={() => onChange(def)}>Về ảnh mặc định</button>}
          {hint && <small>{hint}</small>}
        </div>
      </div>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e => pick(e.target.files?.[0])} />
    </div>
  );
}
