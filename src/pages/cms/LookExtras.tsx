// CMS · Hero · 1 màu xe mockup: decal + phụ kiện.
//  - Phụ kiện: bật / tắt ngay tại đây.
//  - Decal: dán trực quan trong trình phối thật — "Mở trình phối với mẫu này" (ghi mẫu vào thiết kế đã lưu của trình
//    duyệt rồi mở /#phoi-xe ở tab mới) → dán, kéo, xoay… → quay lại bấm "Lấy thiết kế từ trình phối" (đọc thiết kế đã lưu;
//    ảnh decal tự tải lên — dạng data: URL — được đưa lên R2 để nội dung web nhẹ).
import { useContext, useState } from 'react';
import type { HeroLook, LookDecal } from '../../content/schema';
import { normalizeConfig } from '../../content/schema';
import { ACCESSORIES, normalizeFitted } from '../../config/accessories';
import { CmsCtx } from './fields';

const DESIGN_KEY = 'vf3-design';   // cùng khoá với src/store/design.ts

async function dataUrlToBlob(url: string) { return (await fetch(url)).blob(); }

export function LookExtras({ look, patch }: { look: HeroLook; patch: (p: Partial<HeroLook>) => void }) {
  const { upload, notify } = useContext(CmsCtx);
  const [busy, setBusy] = useState(false);

  const openStudio = () => {
    if (!confirm('Trình phối trên trình duyệt này sẽ được thay bằng mẫu này (thiết kế đang lưu trên máy bạn sẽ bị ghi đè). Tiếp tục?')) return;
    try {
      const prev = JSON.parse(localStorage.getItem(DESIGN_KEY) || '{}');
      localStorage.setItem(DESIGN_KEY, JSON.stringify({ config: look.config, decals: look.decals.map((d, i) => ({ ...d, id: 'cms' + i })), accessories: look.accessories, code: prev.code ?? 'VF3-CMS' }));
    } catch { notify('Trình duyệt chặn lưu dữ liệu, không mở được trình phối.', true); return; }
    open('/#phoi-xe', '_blank');
  };

  const importDesign = async () => {
    let d: { config?: unknown; decals?: unknown[]; accessories?: unknown } | null = null;
    try { d = JSON.parse(localStorage.getItem(DESIGN_KEY) || 'null'); } catch { /* bỏ qua */ }
    if (!d) { notify('Chưa có thiết kế nào trong trình phối trên trình duyệt này.', true); return; }
    if (!confirm('Thay màu, decal và phụ kiện của mẫu này bằng thiết kế đang có trong trình phối?')) return;
    setBusy(true);
    try {
      const decals: LookDecal[] = [];
      for (const raw of (d.decals ?? []) as (LookDecal & { id?: string })[]) {
        let src = raw.src;
        if (src.startsWith('data:')) src = await upload(await dataUrlToBlob(src));   // ảnh tự tải lên / chữ → R2
        const { id: _id, ...rest } = raw; void _id;
        decals.push({ ...rest, src });
      }
      patch({ config: normalizeConfig(d.config), decals, accessories: normalizeFitted(d.accessories) });
      notify(`Đã lấy thiết kế: ${decals.length} decal. Nhớ bấm Lưu & xuất bản.`);
    } catch (e) { notify((e as Error).message, true); } finally { setBusy(false); }
  };

  return (
    <div className="cms-extras">
      <div className="cms-field">
        <span>Phụ kiện</span>
        <div className="cms-acc">
          {ACCESSORIES.map(a => {
            const on = !!look.accessories[a.id];
            return (
              <button key={a.id} className={'cms-acc-item' + (on ? ' on' : '')} aria-pressed={on}
                onClick={() => { const next = { ...look.accessories }; if (on) delete next[a.id]; else next[a.id] = true; patch({ accessories: next }); }}>
                <img src={a.thumb} alt="" /><span>{a.name}</span><i>{on ? 'Đã lắp' : 'Lắp'}</i>
              </button>
            );
          })}
        </div>
      </div>
      <div className="cms-field">
        <span>Decal ({look.decals.length})</span>
        {look.decals.length > 0 && (
          <div className="cms-decals">
            {look.decals.map((d, i) => <img key={i} src={d.src} alt={d.label} title={d.label} />)}
            <button className="cms-link" onClick={() => { if (confirm('Xoá hết decal của mẫu này?')) patch({ decals: [] }); }}>Xoá hết</button>
          </div>
        )}
        <div className="cms-extras-actions">
          <button className="cms-btn" onClick={openStudio}>Mở trình phối với mẫu này ↗</button>
          <button className="cms-btn primary" disabled={busy} onClick={importDesign}>{busy ? 'Đang lấy…' : 'Lấy thiết kế từ trình phối'}</button>
        </div>
        <small className="cms-hint">Dán decal trong trình phối (tab mới), xong quay lại đây bấm “Lấy thiết kế từ trình phối”. Lấy luôn cả màu và phụ kiện.</small>
      </div>
    </div>
  );
}
