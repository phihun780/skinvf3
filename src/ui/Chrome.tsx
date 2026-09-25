// Khung giao diện quanh khung 3D: thanh trên, thanh góc nhìn, nhãn vùng theo con trỏ, gợi ý, tải, thông báo.
import { useEffect, useState } from 'react';
import { useProgress } from '@react-three/drei';
import { useDesign } from '../store/design';
import { useViewer } from '../store/viewer';
import { zoneInfo } from '../config/zones';
import { BRAND } from '../config/brand';
import { t } from '../config/i18n/vi';

// ---- thông báo nhỏ
let pushToast: (msg: string) => void = () => {};
export const toast = (msg: string) => pushToast(msg);
export function Toast() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    let h: number;
    pushToast = m => { setMsg(m); clearTimeout(h); h = window.setTimeout(() => setMsg(null), 2400); };
  }, []);
  return <div className={'toast' + (msg ? ' show' : '')} role="status">{msg}</div>;
}

const Icon = {
  rotate: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 4v5h-5" /></svg>,
  save: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3h11l3 3v15H5z" /><path d="M8 3v5h8V3M8 21v-7h8v7" /></svg>,
  export: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v3h16v-3" /></svg>,
  reset: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></svg>,
};

// Thanh dưới: Tự xoay · Reset màu xe · Lưu màu · Xuất file. Xoay/zoom xe bằng chuột; hoàn tác bằng Ctrl+Z / Ctrl+Y.
export function Toolbar() {
  const { autoRotate, toggleAutoRotate } = useViewer();
  const code = useDesign(s => s.code);
  const { undo, redo, resetAll, save } = useDesign.getState();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || !(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      if (k === 'y') { e.preventDefault(); redo(); }
    };
    addEventListener('keydown', onKey); return () => removeEventListener('keydown', onKey);
  }, [undo, redo]);

  return (
    <div className="toolbar"><div className="panel">
      <button className={'tb' + (autoRotate ? ' active' : '')} onClick={toggleAutoRotate}>{Icon.rotate}<span>{t.autoRotate}</span></button>
      <span className="sep" />
      <button className="tb" title={t.resetHint} onClick={() => { resetAll(); toast(t.resetDone); }}>{Icon.reset}<span>{t.reset}</span></button>
      <button className="tb" onClick={() => { save(); toast(t.saved(code)); }}>{Icon.save}<span>{t.save}</span></button>
      <button className="tb" onClick={() => import('./PosterModal').then(m => m.exportPoster())}>{Icon.export}<span>{t.posterBtn}</span></button>
    </div></div>
  );
}

// Tên vùng đi theo con trỏ khi rê lên xe
export function HoverTip() {
  const hovered = useDesign(s => s.hovered), selected = useDesign(s => s.selected);
  const [p, setP] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e: PointerEvent) => setP({ x: e.clientX, y: e.clientY });
    addEventListener('pointermove', onMove); return () => removeEventListener('pointermove', onMove);
  }, []);
  useEffect(() => { document.body.style.cursor = hovered ? 'pointer' : ''; }, [hovered]);
  const show = hovered && hovered !== selected?.zone;
  return <div className={'tip' + (show ? ' show' : '')} style={{ left: p.x, top: p.y }}>{hovered ? zoneInfo(hovered)?.name : ''}</div>;
}

// Công tắc Màu sơn / Decal + dòng gợi ý theo chế độ
export function ModeSwitch() {
  const mode = useDesign(s => s.mode), selected = useDesign(s => s.selected), setMode = useDesign(s => s.setMode);
  const hint = mode === 'decal' ? t.decalHint : selected ? null : t.hint;
  return (
    <div className="mode">
      {/* tab chữ + vạch sáng trượt dưới tab đang chọn (không đóng khung nút) */}
      <div className={'mode-tabs on-' + mode} role="tablist">
        {(['paint', 'decal'] as const).map(m => (
          <button key={m} role="tab" aria-selected={mode === m} className={mode === m ? 'active' : ''} onClick={() => setMode(m)}>{t.modes[m]}</button>
        ))}
        <i className="mode-bar" aria-hidden />
      </div>
      <div className={'hint' + (hint ? '' : ' hide')}>{hint}</div>
    </div>
  );
}

export function Loader() {
  const { progress, active } = useProgress();
  const [gone, setGone] = useState(false);
  useEffect(() => { if (!active && progress === 100) { const h = setTimeout(() => setGone(true), 400); return () => clearTimeout(h); } }, [active, progress]);
  if (gone) return null;
  return (
    <div className={'loader mesh-bg' + (!active && progress === 100 ? ' done' : '')}>
      <div className="loader-box">
        <div className="logo"><span className="logo-mark">{BRAND.mark}</span><span>{BRAND.name}</span></div>
        <div className="loader-bar"><i style={{ width: progress + '%' }} /></div>
        <p>{t.loading.model}</p>
      </div>
    </div>
  );
}

export function Credit() {
  return <div className="credit">Mô hình 3D: {BRAND.modelCredit} · {BRAND.disclaimer}</div>;
}
