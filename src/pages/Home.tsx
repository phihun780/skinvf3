// Trang chủ (/): landing page giới thiệu, style mesh xanh + glass.
import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { readStill, stillKey, writeStill } from '../three/heroStill';
import { Link, ROUTES, navigate } from '../router';
import { useDesign } from '../store/design';
import { Toast, toast } from '../ui/Chrome';
import { Icon } from '../ui/icons';
import { FINISHES, type FinishId } from '../config/finishes';
import { home as T } from '../config/i18n/home';
import { SiteHeader } from '../ui/SiteHeader';
import { useContent, IS_PREVIEW } from '../content/store';
import { hashOf, safeHref } from '../content/schema';
import '../styles/home.css';

const HeroCar = lazy(() => import('../three/HeroCar').then(m => ({ default: m.HeroCar })));
const Configurator = lazy(() => import('./Configurator').then(m => ({ default: m.Configurator })));

const Arrow = () => <svg className="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7M9 7h8v8" /></svg>;
// Hiện dần khi cuộn tới (thêm class .in cho phần tử [data-reveal]) — kể cả phần tử thêm sau (nội dung CMS đổi)
function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }),
      { rootMargin: '0px 0px -8% 0px' });
    const scan = () => document.querySelectorAll('[data-reveal]:not(.in)').forEach(el => io.observe(el));
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.querySelector('.home') ?? document.body, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, []);
}

function Hero() {
  const hero = useContent(s => s.content.hero), loaded = useContent(s => s.loaded), focusLook = useContent(s => s.focusLook);
  const looks = hero.looks;
  const [pick, setI] = useState(0);
  const [ready, setReady] = useState(false);
  const [auto, setAuto] = useState(true);
  const [inView, setInView] = useState(true);
  const heroRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting));
    io.observe(heroRef.current!); return () => io.disconnect();
  }, []);
  // CMS đang sửa 1 màu xe → hiện đúng màu đó, không tự đổi
  const i = focusLook != null ? Math.min(focusLook, looks.length - 1) : pick % looks.length;
  const cycling = auto && ready && focusLook == null && looks.length > 1;
  // tự đổi màu sau mỗi hero.interval giây (bắt đầu khi xe đã hiện) cho tới khi người dùng tự bấm chọn
  useEffect(() => { if (!cycling) return; const h = setInterval(() => setI(v => (v + 1) % looks.length), hero.interval * 1000); return () => clearInterval(h); }, [cycling, looks.length, hero.interval]);
  const look = looks[i];
  const iRef = useRef(i); iRef.current = i;

  // ảnh chờ: khung hình đã chụp ở lần mở trước (cùng cỡ khung, cùng màu xe đầu tiên) → hiện ngay trong lúc dựng xe 3D
  const carBox = useRef<HTMLDivElement>(null);
  const firstKey = hashOf(looks[0].config);
  const [still, setStill] = useState<string | null>(null);
  useLayoutEffect(() => {
    if (IS_PREVIEW) return;
    const el = carBox.current!;
    setStill(readStill(stillKey(el.clientWidth, el.clientHeight, firstKey)));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- chỉ đọc lúc mở trang
  // khoá theo cỡ bố cục của khung (không tính hiệu ứng vào) để lần sau khớp đúng
  const capture = (url: string) => {
    const el = carBox.current; if (!el || iRef.current !== 0 || IS_PREVIEW) return;
    writeStill(stillKey(el.clientWidth, el.clientHeight, firstKey), url);
  };

  return (
    <section className={'hero' + (loaded ? '' : ' pending')} ref={heroRef}>
      <div className="hero-title">
        <h1><span className="l1">{hero.line1}</span><span className="l2">{hero.line2}</span></h1>
      </div>
      <div ref={carBox} className={'hero-car' + (ready || still ? ' ready' : '') + (still ? ' instant' : '')}>
        {still && <img className={'hero-still' + (ready ? ' out' : '')} src={still} alt="" aria-hidden />}
        <div className={'hero-canvas' + (ready ? ' on' : '')}>
          <Suspense fallback={null}><HeroCar config={look.config} onReady={() => setReady(true)} onCapture={capture} active={inView} /></Suspense>
        </div>
      </div>
      {!ready && !still && <div className="hero-loading"><i />{T.hero.loading}</div>}

      {looks.length > 1 && (
        <div className="hero-presets panel" role="radiogroup" aria-label={T.hero.presetsLabel}>
          {looks.map((q, k) => (
            <button key={q.id + k} role="radio" aria-checked={k === i} title={q.name} className={k === i ? 'on' : ''}
              onClick={() => { setAuto(false); setI(k); }}
              style={{ background: `linear-gradient(135deg, ${q.config.body.color} 52%, ${q.config.roof.color} 52%)` }} />
          ))}
        </div>
      )}

      {hero.points.length > 0 && (
        <ul className="hero-points">
          {hero.points.map((label, k) => <li key={k}>{label}</li>)}
        </ul>
      )}
      <div className="hero-side">
        {hero.side && <p>{hero.side}</p>}
        <Link className="btn primary" to={ROUTES.home + '#phoi-xe'}>{hero.cta}<Arrow /></Link>
      </div>
    </section>
  );
}

function SectionHead({ title }: { title: string }) {
  return (
    <div className="section-head" data-reveal>
      <h2><span className="bold">{title}</span></h2>
    </div>
  );
}

function Steps() {
  const steps = useContent(s => s.content.steps);
  return (
    <section className="section" id="cach-dung">
      <div className="wrap">
        <SectionHead title={steps.title} />
        <div className="steps" style={{ ['--cols' as string]: steps.items.length === 4 ? 4 : Math.min(steps.items.length, 3) }}>
          {steps.items.map((s, k) => (
            <article key={k} className="step panel" data-reveal style={{ transitionDelay: (k % 3) * 90 + 'ms' }}>
              <div className="step-top"><span className="step-num">{String(k + 1).padStart(2, '0')}</span><span className="step-icon"><Icon name={s.icon} /></span></div>
              <h3>{s.title}</h3><p>{s.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

const SPHERE_FINISHES: FinishId[] = ['gloss', 'matte'];

function Features() {
  const f = useContent(s => s.content.features);
  return (
    <section className="section" id="tinh-nang">
      <div className="wrap">
        <SectionHead title={f.title} />
        <div className="bento">
          <article className="card panel zones" data-reveal>
            <div className="card-text"><span className="tag">{f.zones.tag}</span><h3>{f.zones.title}</h3><p>{f.zones.text}</p></div>
            {f.zones.image && <img src={f.zones.image} alt={f.zones.title} loading="lazy" />}
          </article>
          <article className="card panel finishes-card" data-reveal>
            <div className="card-text"><span className="tag">{f.finishes.tag}</span><h3>{f.finishes.title}</h3></div>
            <div className="spheres">
              {SPHERE_FINISHES.map(k => <figure key={k}><i className={'sphere ' + k} /><figcaption>{FINISHES[k].name}</figcaption></figure>)}
            </div>
          </article>
          <article className="card panel decal-card" data-reveal>
            {f.decal.image && <img src={f.decal.image} alt={f.decal.title} loading="lazy" />}
            <div className="card-text"><span className="tag">{f.decal.tag}</span><h3>{f.decal.title}</h3><p>{f.decal.text}</p></div>
          </article>
        </div>
      </div>
    </section>
  );
}

function Gallery() {
  const g = useContent(s => s.content.gallery);
  return (
    <section className="section" id="mau">
      <div className="wrap">
        <SectionHead title={g.title} />
        <div className="gallery">
          {g.items.map((p, k) => (
            <button key={p.id + k} className="preset-card panel" data-reveal style={{ transitionDelay: (k % 3) * 80 + 'ms' }}
              onClick={() => { useDesign.getState().replaceAll(p.config); toast(T.gallery.applied(p.name)); navigate(ROUTES.home + '#phoi-xe'); }}>
              <div className="preset-img">{p.image ? <img src={p.image} alt={p.name} loading="lazy" /> : <span className="preset-noimg" />}</div>
              <div className="preset-meta">
                <span className="dots">{[p.config.body, p.config.roof, p.config.rim].map((s, j) => <i key={j} style={{ background: s.color }} />)}</span>
                <span className="t"><b>{p.name}</b><small>{p.tag}</small></span>
                <span className="use">{g.use}<Arrow /></span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function ConfiguratorSection() {
  const title = useContent(s => s.content.configurator.title);
  // chỉ dựng trình phối khi người dùng cuộn tới gần (đỡ tải lúc mở trang); dựng rồi thì giữ nguyên
  const [mount, setMount] = useState(location.hash === '#phoi-xe');
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (mount) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setMount(true); }, { rootMargin: '100% 0px' });
    io.observe(ref.current!); return () => io.disconnect();
  }, [mount]);
  return (
    <section className="section" ref={ref}>
      <div className="wrap">
        <SectionHead title={title} />
        {/* neo #phoi-xe đặt ở khung trình phối: bấm "Tự phối màu" thì khung vừa khít màn hình ngay dưới thanh trên */}
        <div id="phoi-xe" className="studio-anchor">
          <Suspense fallback={<div className="studio-embed panel" />}>
            {mount ? <Configurator /> : <div className="studio-embed panel" />}
          </Suspense>
        </div>
      </div>
    </section>
  );
}

function Faq() {
  const faq = useContent(s => s.content.faq);
  if (!faq.items.length) return null;
  return (
    <section className="section" id="hoi-dap">
      <div className="wrap faq-grid">
        <SectionHead title={faq.title} />
        <div className="faq" data-reveal>
          {faq.items.map(({ q, a, links }, k) => {
            const ok = links.filter(l => l.label && safeHref(l.href));
            return (
              <details key={k} className="panel"><summary>{q}<span className="plus" /></summary><p>{a}</p>
                {ok.length > 0 && <p className="faq-links">{ok.map((l, j) => <a key={j} href={l.href} target={l.href.startsWith('#') ? undefined : '_blank'} rel="noopener noreferrer">{l.label}<Arrow /></a>)}</p>}
              </details>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const text = useContent(s => s.content.footer.text);
  return (
    <footer className="site-footer">
      <div className="wrap">{new Date().getFullYear()}{text && <> <span className="sep-v">|</span> {text}</>}</div>
    </footer>
  );
}

export function Home() {
  useReveal();
  // mở trang chủ kèm #mục (vd. từ menu trình phối) → cuộn tới mục đó sau khi trang đã dựng
  useEffect(() => {
    if (!location.hash) return;
    const h = setTimeout(() => document.querySelector(location.hash)?.scrollIntoView({ behavior: 'instant' }), 60);
    return () => clearTimeout(h);
  }, []);
  return (
    <div className="home">
      <div className="page-bg mesh-bg" aria-hidden />
      <SiteHeader />
      <main>
        <Hero />
        <Features />
        <Steps />
        <Gallery />
        <ConfiguratorSection />
        <Faq />
      </main>
      <Footer />
      <Toast />
    </div>
  );
}
