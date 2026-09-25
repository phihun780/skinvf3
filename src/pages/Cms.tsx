// Trang quản lý nội dung (/cms): đăng nhập bằng mật khẩu → sửa nội dung → "Lưu & xuất bản" (ghi lên R2, web đổi ngay).
// Bên phải là trang chủ thật (iframe /?cms-preview) nhận bản nháp qua postMessage → thấy thay đổi ngay khi gõ.
// Hiện có mục Hero; các mục khác thêm dần (SECTIONS).
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { AuthError, cmsApi, getToken, setToken } from '../content/api';
import { DEFAULT_CONTENT, LIMITS, type HeroContent, type HeroLook, type SiteContent } from '../content/schema';
import type { PreviewMessage } from '../content/store';
import { EDITABLE, GROUPS, zoneInfo, type DesignConfig, type ZoneGroup, type ZoneStyle } from '../config/zones';
import { FINISHES, type FinishId } from '../config/finishes';
import { PRESETS } from '../config/presets';
import { BRAND } from '../config/brand';
import '../styles/cms.css';

const SECTIONS = [
  { id: 'hero', label: 'Hero (đầu trang)', ready: true },
  { id: 'features', label: 'Tính năng cơ bản' },
  { id: 'steps', label: 'Sử dụng đơn giản' },
  { id: 'gallery', label: 'Mẫu tham khảo' },
  { id: 'faq', label: 'Câu hỏi thường gặp' },
  { id: 'footer', label: 'Footer' },
];

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const fmtTime = (iso?: string) => iso ? new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
const newId = () => 'look-' + Math.random().toString(36).slice(2, 8);

export function Cms() {
  const [token, setTok] = useState(getToken);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    document.title = BRAND.name + ' CMS';
    const meta = Object.assign(document.createElement('meta'), { name: 'robots', content: 'noindex, nofollow' });
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);
  const logout = useCallback((msg = '') => { setToken(null); setTok(null); setNotice(msg); }, []);
  // token cũ hết hạn → về màn đăng nhập
  useEffect(() => { if (token) cmsApi.me(token).catch(e => { if (e instanceof AuthError) logout(e.message); }); }, [token, logout]);

  if (!token) return <Login notice={notice} onToken={t => { setToken(t); setTok(t); setNotice(''); }} />;
  return <Editor token={token} onLogout={logout} />;
}

/* ---------------- đăng nhập ---------------- */

function Login({ notice, onToken }: { notice: string; onToken: (t: string) => void }) {
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(notice);
  const submit = async (e: FormEvent) => {
    e.preventDefault(); if (!pw || busy) return;
    setBusy(true); setErr('');
    try { onToken((await cmsApi.login(pw)).token); } catch (x) { setErr((x as Error).message); setBusy(false); }
  };
  return (
    <div className="cms-login mesh-bg">
      <form className="cms-login-card panel" onSubmit={submit}>
        <div className="logo"><span className="logo-mark">{BRAND.mark}</span><span>{BRAND.name}<small>Quản lý nội dung</small></span></div>
        <label className="cms-field">
          <span>Mật khẩu</span>
          <input type="password" autoFocus autoComplete="current-password" value={pw} onChange={e => setPw(e.target.value)} />
        </label>
        {err && <p className="cms-error">{err}</p>}
        <button className="btn primary" disabled={!pw || busy}>{busy ? 'Đang kiểm tra…' : 'Đăng nhập'}</button>
      </form>
    </div>
  );
}

/* ---------------- trình sửa ---------------- */

function Editor({ token, onLogout }: { token: string; onLogout: (msg?: string) => void }) {
  const [saved, setSaved] = useState<SiteContent | null>(null);
  const [draft, setDraft] = useState<SiteContent>(DEFAULT_CONTENT);
  const [loadErr, setLoadErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ text: string; bad?: boolean } | null>(null);
  const [look, setLook] = useState(0);
  const [cycle, setCycle] = useState(false);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');

  useEffect(() => {
    cmsApi.load().then(c => { setSaved(c); setDraft(c); }).catch(e => { setLoadErr((e as Error).message); setSaved(DEFAULT_CONTENT); });
  }, []);
  useEffect(() => { if (!toast) return; const h = setTimeout(() => setToast(null), 3200); return () => clearTimeout(h); }, [toast]);

  const dirty = !!saved && !same(draft.hero, saved.hero);
  // rời trang khi chưa lưu → trình duyệt hỏi lại
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    addEventListener('beforeunload', warn); return () => removeEventListener('beforeunload', warn);
  }, [dirty]);

  const save = useCallback(async () => {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      const { updatedAt } = await cmsApi.save(token, draft);
      const next = { ...draft, updatedAt }; setSaved(next); setDraft(next);
      setToast({ text: 'Đã lưu & xuất bản. Web đã cập nhật.' });
    } catch (e) {
      if (e instanceof AuthError) return onLogout(e.message + ' Đăng nhập lại để lưu (bản nháp vẫn còn trên trang nếu bạn chưa tải lại).');
      setToast({ text: (e as Error).message, bad: true });
    } finally { setSaving(false); }
  }, [dirty, saving, token, draft, onLogout]);
  // Ctrl+S = lưu
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); } };
    addEventListener('keydown', k); return () => removeEventListener('keydown', k);
  }, [save]);

  const setHero = (patch: Partial<HeroContent>) => setDraft(d => ({ ...d, hero: { ...d.hero, ...patch } }));
  const lookIdx = Math.min(look, draft.hero.looks.length - 1);

  return (
    <div className="cms mesh-bg">
      <header className="cms-top">
        <div className="logo"><span className="logo-mark">{BRAND.mark}</span><span>{BRAND.name}<small>Quản lý nội dung</small></span></div>
        <span className={'cms-status' + (dirty ? ' dirty' : '')}>
          {!saved ? 'Đang tải…' : dirty ? 'Có thay đổi chưa lưu' : saved.updatedAt ? 'Đã xuất bản · ' + fmtTime(saved.updatedAt) : 'Đang dùng nội dung mặc định'}
        </span>
        <div className="cms-actions">
          <a className="btn sm" href="/" target="_blank" rel="noreferrer">Xem web ↗</a>
          <button className="btn sm" disabled={!dirty} onClick={() => saved && setDraft(saved)}>Huỷ thay đổi</button>
          <button className="btn primary sm" disabled={!dirty || saving} onClick={save}>{saving ? 'Đang lưu…' : 'Lưu & xuất bản'}</button>
          <button className="btn sm ghost" onClick={() => onLogout()}>Đăng xuất</button>
        </div>
      </header>

      <nav className="cms-nav">
        <span className="eyebrow">Trang chủ</span>
        {SECTIONS.map(s => (
          <button key={s.id} className={s.id === 'hero' ? 'on' : ''} disabled={!s.ready}>
            {s.label}{!s.ready && <small>Sắp có</small>}
          </button>
        ))}
      </nav>

      <main className="cms-form">
        {loadErr && <p className="cms-error">Không tải được nội dung đã lưu: {loadErr}</p>}
        <HeroForm hero={draft.hero} set={setHero} look={lookIdx} setLook={setLook} />
      </main>

      <section className="cms-preview">
        <div className="cms-preview-bar">
          <span className="eyebrow">Xem trước</span>
          <div className="cms-seg">
            <button className={device === 'desktop' ? 'on' : ''} onClick={() => setDevice('desktop')}>Máy tính</button>
            <button className={device === 'mobile' ? 'on' : ''} onClick={() => setDevice('mobile')}>Điện thoại</button>
          </div>
          <label className="cms-check"><input type="checkbox" checked={cycle} onChange={e => setCycle(e.target.checked)} />Tự đổi màu xe</label>
        </div>
        <Preview content={draft} focusLook={cycle ? null : lookIdx} device={device} />
      </section>

      {toast && <div className={'cms-toast' + (toast.bad ? ' bad' : '')} role="status">{toast.text}</div>}
    </div>
  );
}

/* ---------------- xem trước: trang chủ thật trong iframe, thu nhỏ vừa khung ---------------- */

const DEVICES = { desktop: [1440, 900], mobile: [390, 844] } as const;

function Preview({ content, focusLook, device }: { content: SiteContent; focusLook: number | null; device: keyof typeof DEVICES }) {
  const box = useRef<HTMLDivElement>(null), frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [scale, setScale] = useState(0.5);
  const [W, H] = DEVICES[device];

  useLayoutEffect(() => {
    const el = box.current!;
    const fit = () => setScale(Math.min(el.clientWidth / W, el.clientHeight / H));
    fit(); const ro = new ResizeObserver(fit); ro.observe(el); return () => ro.disconnect();
  }, [W, H]);
  useEffect(() => {
    const on = (e: MessageEvent) => { if (e.source === frame.current?.contentWindow && e.data?.type === 'cms-preview-ready') setReady(true); };
    addEventListener('message', on); return () => removeEventListener('message', on);
  }, []);
  useEffect(() => { setReady(false); }, [device]);
  useEffect(() => {
    if (!ready) return;
    const msg: PreviewMessage = { type: 'cms-preview', content, focusLook };
    frame.current?.contentWindow?.postMessage(msg, location.origin);
  }, [ready, content, focusLook]);

  return (
    <div className="cms-preview-box" ref={box}>
      <div className="cms-device" style={{ width: W * scale, height: H * scale }}>
        <iframe key={device} ref={frame} src="/?cms-preview=1" title="Xem trước trang chủ"
          style={{ width: W, height: H, transform: `scale(${scale})` }} />
      </div>
    </div>
  );
}

/* ---------------- form Hero ---------------- */

function HeroForm({ hero, set, look, setLook }: { hero: HeroContent; set: (p: Partial<HeroContent>) => void; look: number; setLook: (i: number) => void }) {
  const looks = hero.looks, cur = looks[look];
  const setLooks = (next: HeroLook[]) => set({ looks: next });
  const patchLook = (patch: Partial<HeroLook>) => setLooks(looks.map((l, k) => (k === look ? { ...l, ...patch } : l)));
  const addLook = (from: HeroLook | undefined) => {
    if (looks.length >= LIMITS.looks) return;
    const src = from ?? cur;
    setLooks([...looks, { id: newId(), name: from ? src.name : src.name + ' (bản sao)', config: { ...src.config } }]);
    setLook(looks.length);
  };
  const move = (dir: -1 | 1) => {
    const j = look + dir; if (j < 0 || j >= looks.length) return;
    const next = [...looks]; [next[look], next[j]] = [next[j], next[look]]; setLooks(next); setLook(j);
  };
  const remove = () => { if (looks.length <= 1) return; setLooks(looks.filter((_, k) => k !== look)); setLook(Math.max(0, look - 1)); };
  const resetHero = () => { if (confirm('Đưa toàn bộ Hero về nội dung mặc định? (Chưa lưu cho tới khi bấm Lưu & xuất bản)')) { set(DEFAULT_CONTENT.hero); setLook(0); } };

  return (
    <>
      <div className="cms-head">
        <h1>Hero</h1>
        <button className="cms-link" onClick={resetHero}>Khôi phục mặc định</button>
      </div>

      <Group title="Tiêu đề">
        <TextField label="Dòng 1 (chữ to)" value={hero.line1} max={LIMITS.line1} onChange={v => set({ line1: v })} />
        <TextField label="Dòng 2" value={hero.line2} max={LIMITS.line2} onChange={v => set({ line2: v })} />
      </Group>

      <Group title="Màu xe mockup" hint="Các chấm màu dưới xe. Xe tự đổi lần lượt từng màu; màu đầu tiên là màu hiện lúc mở trang.">
        <div className="cms-looks">
          {looks.map((l, k) => (
            <button key={l.id + k} className={'cms-look' + (k === look ? ' on' : '')} title={l.name || `Màu ${k + 1}`} onClick={() => setLook(k)}
              style={{ background: `linear-gradient(135deg, ${l.config.body.color} 52%, ${l.config.roof.color} 52%)` }} />
          ))}
          {looks.length < LIMITS.looks && <AddLook onAdd={addLook} />}
        </div>

        {cur && (
          <div className="cms-look-edit">
            <div className="cms-row">
              <TextField label={`Tên màu ${look + 1}`} value={cur.name} max={LIMITS.lookName} onChange={v => patchLook({ name: v })} />
              <div className="cms-look-tools">
                <button className="cms-icon" title="Đưa lên trước" disabled={look === 0} onClick={() => move(-1)}>←</button>
                <button className="cms-icon" title="Đưa ra sau" disabled={look === looks.length - 1} onClick={() => move(1)}>→</button>
                <button className="cms-icon danger" title="Xoá màu này" disabled={looks.length <= 1} onClick={remove}>✕</button>
              </div>
            </div>
            <label className="cms-field">
              <span>Lấy màu từ mẫu tham khảo</span>
              <select value="" onChange={e => { const p = PRESETS.find(x => x.id === e.target.value); if (p) patchLook({ config: { ...p.config } }); }}>
                <option value="">Chọn mẫu…</option>
                {PRESETS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <ZoneEditor config={cur.config} onChange={config => patchLook({ config })} />
          </div>
        )}

        <label className="cms-field inline">
          <span>Tự đổi màu sau</span>
          <input type="number" min={LIMITS.interval[0]} max={LIMITS.interval[1]} value={hero.interval}
            onChange={e => set({ interval: Math.min(LIMITS.interval[1], Math.max(LIMITS.interval[0], +e.target.value || LIMITS.interval[0])) })} />
          <span>giây</span>
        </label>
      </Group>

      <Group title="Chữ nhỏ góc trái" hint={`Tối đa ${LIMITS.points} dòng. Không có dòng nào thì ẩn.`}>
        {hero.points.map((p, k) => (
          <div className="cms-row" key={k}>
            <TextField label={`Dòng ${k + 1}`} value={p} max={LIMITS.point} onChange={v => set({ points: hero.points.map((x, j) => (j === k ? v : x)) })} />
            <button className="cms-icon danger" title="Xoá dòng" onClick={() => set({ points: hero.points.filter((_, j) => j !== k) })}>✕</button>
          </div>
        ))}
        {hero.points.length < LIMITS.points && <button className="cms-add" onClick={() => set({ points: [...hero.points, ''] })}>+ Thêm dòng</button>}
      </Group>

      <Group title="Góc phải">
        <TextField label="Câu phía trên nút" value={hero.side} max={LIMITS.side} onChange={v => set({ side: v })} />
        <TextField label="Chữ trên nút" value={hero.cta} max={LIMITS.cta} onChange={v => set({ cta: v })} />
      </Group>
    </>
  );
}

function AddLook({ onAdd }: { onAdd: (from: HeroLook | undefined) => void }) {
  return (
    <label className="cms-look add" title="Thêm màu">
      +
      <select value="" onChange={e => {
        const v = e.target.value; if (!v) return;
        const p = PRESETS.find(x => x.id === v);
        onAdd(v === 'copy' ? undefined : p && { id: p.id, name: p.name, config: p.config });
      }}>
        <option value="">Thêm màu…</option>
        <option value="copy">Nhân bản màu đang chọn</option>
        {PRESETS.map(p => <option key={p.id} value={p.id}>Từ mẫu: {p.name}</option>)}
      </select>
    </label>
  );
}

/* ---------------- chỉnh màu từng vùng ---------------- */

const GROUP_ORDER: ZoneGroup[] = ['paint', 'trim', 'wheel', 'detail'];

function ZoneEditor({ config, onChange }: { config: DesignConfig; onChange: (c: DesignConfig) => void }) {
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

/* ---------------- ô nhập ---------------- */

function Group({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="cms-group panel">
      <h2>{title}</h2>
      {hint && <p className="cms-hint">{hint}</p>}
      {children}
    </section>
  );
}

function TextField({ label, value, max, onChange }: { label: string; value: string; max: number; onChange: (v: string) => void }) {
  return (
    <label className="cms-field">
      <span>{label}<em>{value.length}/{max}</em></span>
      <input type="text" value={value} maxLength={max} onChange={e => onChange(e.target.value)} />
    </label>
  );
}
