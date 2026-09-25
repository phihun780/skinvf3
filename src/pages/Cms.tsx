// Trang quản lý nội dung (/cms): đăng nhập bằng mật khẩu → sửa nội dung → "Lưu & xuất bản" (ghi lên R2, web đổi ngay).
// Bên phải là trang chủ thật (iframe /?cms-preview) nhận bản nháp qua postMessage → thấy thay đổi ngay khi gõ,
// tự cuộn tới mục đang sửa. Form từng mục: src/pages/cms/forms.tsx · ô nhập dùng chung: src/pages/cms/fields.tsx.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { AuthError, cmsApi, getToken, setToken } from '../content/api';
import { DEFAULT_CONTENT, type SiteContent } from '../content/schema';
import type { PreviewMessage } from '../content/store';
import { BRAND } from '../config/brand';
import { CmsCtx } from './cms/fields';
import { ConfiguratorForm, FaqForm, FeaturesForm, FooterForm, GalleryForm, HeroForm, StepsForm, type Set } from './cms/forms';
import '../styles/cms.css';

type SectionId = Exclude<keyof SiteContent, 'updatedAt'>;
const SECTIONS: { id: SectionId; label: string }[] = [
  { id: 'hero', label: 'Hero (đầu trang)' },
  { id: 'features', label: 'Tính năng cơ bản' },
  { id: 'steps', label: 'Sử dụng đơn giản' },
  { id: 'gallery', label: 'Mẫu tham khảo' },
  { id: 'configurator', label: 'Tự phối màu' },
  { id: 'faq', label: 'Câu hỏi thường gặp' },
  { id: 'footer', label: 'Footer' },
];

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const fmtTime = (iso?: string) => iso ? new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '';

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
  const [section, setSection] = useState<SectionId>('hero');
  const [look, setLook] = useState(0);
  const [cycle, setCycle] = useState(false);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');

  useEffect(() => {
    cmsApi.load().then(c => { setSaved(c); setDraft(c); }).catch(e => { setLoadErr((e as Error).message); setSaved(DEFAULT_CONTENT); });
  }, []);
  useEffect(() => { if (!toast) return; const h = setTimeout(() => setToast(null), 3600); return () => clearTimeout(h); }, [toast]);
  const notify = useCallback((text: string, bad?: boolean) => setToast({ text, bad }), []);

  const changed = (id: SectionId) => !!saved && !same(draft[id], saved[id]);
  const dirty = SECTIONS.some(s => changed(s.id));
  // rời trang khi chưa lưu → trình duyệt hỏi lại
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    addEventListener('beforeunload', warn); return () => removeEventListener('beforeunload', warn);
  }, [dirty]);

  const authFail = useCallback((e: unknown) => {
    if (e instanceof AuthError) { onLogout(e.message + ' Đăng nhập lại để tiếp tục.'); return true; }
    return false;
  }, [onLogout]);

  const save = useCallback(async () => {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      const { updatedAt } = await cmsApi.save(token, draft);
      const next = { ...draft, updatedAt }; setSaved(next); setDraft(next);
      const noImg = draft.gallery.items.filter(x => !x.image).length;
      notify(noImg ? `Đã lưu & xuất bản. Lưu ý: ${noImg} mẫu tham khảo chưa có ảnh.` : 'Đã lưu & xuất bản. Web đã cập nhật.', !!noImg);
    } catch (e) {
      if (!authFail(e)) notify((e as Error).message, true);
    } finally { setSaving(false); }
  }, [dirty, saving, token, draft, notify, authFail]);
  // Ctrl+S = lưu
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); } };
    addEventListener('keydown', k); return () => removeEventListener('keydown', k);
  }, [save]);

  // sửa 1 mục (nhận phần thay đổi hoặc hàm trên nội dung mới nhất)
  const setter = <K extends SectionId>(id: K): Set<SiteContent[K]> => patch =>
    setDraft(d => ({ ...d, [id]: { ...d[id], ...(typeof patch === 'function' ? patch(d[id]) : patch) } }));

  const ctx = useMemo(() => ({
    upload: async (b: Blob) => {
      try { return (await cmsApi.upload(token, b)).url; } catch (e) { if (authFail(e)) throw new Error('Phiên đăng nhập đã hết hạn.'); throw e; }
    },
    notify,
  }), [token, notify, authFail]);

  const lookIdx = Math.min(look, draft.hero.looks.length - 1);

  return (
    <CmsCtx.Provider value={ctx}>
      <div className="cms mesh-bg">
        <header className="cms-top">
          <div className="logo"><span className="logo-mark">{BRAND.mark}</span><span>{BRAND.name}<small>Quản lý nội dung</small></span></div>
          <span className={'cms-status' + (dirty ? ' dirty' : '')}>
            {!saved ? 'Đang tải…' : dirty ? 'Có thay đổi chưa lưu' : saved.updatedAt ? 'Đã xuất bản · ' + fmtTime(saved.updatedAt) : 'Đang dùng nội dung mặc định'}
          </span>
          <div className="cms-actions">
            <a className="btn sm" href="/" target="_blank" rel="noreferrer">Xem web ↗</a>
            <button className="btn sm" disabled={!dirty} onClick={() => { if (saved && confirm('Bỏ mọi thay đổi chưa lưu?')) setDraft(saved); }}>Huỷ thay đổi</button>
            <button className="btn primary sm" disabled={!dirty || saving} onClick={save}>{saving ? 'Đang lưu…' : 'Lưu & xuất bản'}</button>
            <button className="btn sm ghost" onClick={() => onLogout()}>Đăng xuất</button>
          </div>
        </header>

        <nav className="cms-nav">
          <span className="eyebrow">Trang chủ</span>
          {SECTIONS.map(s => (
            <button key={s.id} className={s.id === section ? 'on' : ''} onClick={() => setSection(s.id)}>
              {s.label}{changed(s.id) && <i className="cms-dot" title="Có thay đổi chưa lưu" />}
            </button>
          ))}
        </nav>

        <main className="cms-form" key={section}>
          {loadErr && <p className="cms-error">Không tải được nội dung đã lưu: {loadErr}</p>}
          {section === 'hero' && <HeroForm hero={draft.hero} set={setter('hero')} look={lookIdx} setLook={setLook} gallery={draft.gallery.items} />}
          {section === 'features' && <FeaturesForm f={draft.features} set={setter('features')} />}
          {section === 'steps' && <StepsForm s={draft.steps} set={setter('steps')} />}
          {section === 'gallery' && <GalleryForm g={draft.gallery} set={setter('gallery')} />}
          {section === 'configurator' && <ConfiguratorForm title={draft.configurator.title} set={title => setter('configurator')({ title })} />}
          {section === 'faq' && <FaqForm faq={draft.faq} set={setter('faq')} />}
          {section === 'footer' && <FooterForm text={draft.footer.text} set={text => setter('footer')({ text })} />}
        </main>

        <section className="cms-preview">
          <div className="cms-preview-bar">
            <span className="eyebrow">Xem trước</span>
            <div className="cms-seg">
              <button className={device === 'desktop' ? 'on' : ''} onClick={() => setDevice('desktop')}>Máy tính</button>
              <button className={device === 'mobile' ? 'on' : ''} onClick={() => setDevice('mobile')}>Điện thoại</button>
            </div>
            {section === 'hero' && <label className="cms-check"><input type="checkbox" checked={cycle} onChange={e => setCycle(e.target.checked)} />Tự đổi màu xe</label>}
          </div>
          <Preview content={draft} focusLook={section === 'hero' && !cycle ? lookIdx : null} section={section} device={device} />
        </section>

        {toast && <div className={'cms-toast' + (toast.bad ? ' bad' : '')} role="status">{toast.text}</div>}
      </div>
    </CmsCtx.Provider>
  );
}

/* ---------------- xem trước: trang chủ thật trong iframe, thu nhỏ vừa khung ---------------- */

const DEVICES = { desktop: [1440, 900], mobile: [390, 844] } as const;

function Preview({ content, focusLook, section, device }: { content: SiteContent; focusLook: number | null; section: string; device: keyof typeof DEVICES }) {
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
    const msg: PreviewMessage = { type: 'cms-preview', content, focusLook, section };
    frame.current?.contentWindow?.postMessage(msg, location.origin);
  }, [ready, content, focusLook, section]);

  return (
    <div className="cms-preview-box" ref={box}>
      <div className="cms-device" style={{ width: W * scale, height: H * scale }}>
        <iframe key={device} ref={frame} src="/?cms-preview=1" title="Xem trước trang chủ"
          style={{ width: W, height: H, transform: `scale(${scale})` }} />
      </div>
    </div>
  );
}
