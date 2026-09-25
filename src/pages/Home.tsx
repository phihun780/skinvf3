// Trang chủ (/): landing page giới thiệu, style mesh xanh + glass.
import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { readStill, stillKey, writeStill } from '../three/heroStill';
import { Link, ROUTES, navigate } from '../router';
import { useDesign } from '../store/design';
import { Toast, toast } from '../ui/Chrome';
import { PRESETS } from '../config/presets';
import { FINISHES, type FinishId } from '../config/finishes';
import { EDITABLE } from '../config/zones';
import { home as T } from '../config/i18n/home';
import { SiteHeader } from '../ui/SiteHeader';
import { useContent, IS_PREVIEW } from '../content/store';
import { hashOf } from '../content/schema';
import '../styles/home.css';

const HeroCar = lazy(() => import('../three/HeroCar').then(m => ({ default: m.HeroCar })));
const Configurator = lazy(() => import('./Configurator').then(m => ({ default: m.Configurator })));

const Arrow = () => <svg className="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7M9 7h8v8" /></svg>;
const ICONS: Record<string, ReactNode> = {
  cursor: <path d="M5 3l6 16 2.5-6.5L20 10 5 3z" />,
  palette: <><circle cx="12" cy="12" r="9" /><circle cx="8" cy="10" r="1.3" /><circle cx="12" cy="7.5" r="1.3" /><circle cx="16" cy="10" r="1.3" /><path d="M12 21a2.5 2.5 0 0 1 0-5h1.5a2.5 2.5 0 0 0 0-5" /></>,
  poster: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 14l3-3 2 2 3-3" /><path d="M8 18h8" /></>,
};
const Icon = ({ name }: { name: string }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{ICONS[name]}</svg>;

// Hiện dần khi cuộn tới (thêm class .in cho phần tử [data-reveal])
function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }),
      { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('[data-reveal]').forEach(el => io.observe(el));
    return () => io.disconnect();
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

function SectionHead({ eyebrow, title, text }: { eyebrow: string; title: [string, string]; text?: string }) {
  return (
    <div className="section-head" data-reveal>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2>{title[0] && <><span className="thin">{title[0]}</span> </>}<span className="bold">{title[1]}</span></h2>
      {text && <p className="lead">{text}</p>}
    </div>
  );
}

function Steps() {
  return (
    <section className="section" id="cach-dung">
      <div className="wrap">
        <SectionHead eyebrow={T.steps.eyebrow} title={T.steps.title} />
        <div className="steps">
          {T.steps.items.map((s, k) => (
            <article key={s.title} className="step panel" data-reveal style={{ transitionDelay: k * 90 + 'ms' }}>
              <div className="step-top"><span className="step-num">0{k + 1}</span><span className="step-icon"><Icon name={s.icon} /></span></div>
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
  const f = T.features;
  return (
    <section className="section" id="tinh-nang">
      <div className="wrap">
        <SectionHead eyebrow={f.eyebrow} title={f.title} />
        <div className="bento">
          <article className="card panel zones" data-reveal>
            <div className="card-text"><span className="tag">{EDITABLE.length} {f.zones.tag}</span><h3>{f.zones.title}</h3><p>{f.zones.text}</p></div>
            <img src="/home/zones.webp" alt={f.zones.title} loading="lazy" />
          </article>
          <article className="card panel finishes-card" data-reveal>
            <div className="card-text"><span className="tag">{f.finishes.tag}</span><h3>{f.finishes.title}</h3></div>
            <div className="spheres">
              {SPHERE_FINISHES.map(k => <figure key={k}><i className={'sphere ' + k} /><figcaption>{FINISHES[k].name}</figcaption></figure>)}
            </div>
          </article>
          <article className="card panel decal-card" data-reveal>
            <img src="/home/decal.webp" alt={f.decal.title} loading="lazy" />
            <div className="card-text"><span className="tag">{f.decal.tag}</span><h3>{f.decal.title}</h3><p>{f.decal.text}</p></div>
          </article>
        </div>
      </div>
    </section>
  );
}

function Gallery() {
  return (
    <section className="section" id="mau">
      <div className="wrap">
        <SectionHead eyebrow={T.gallery.eyebrow} title={T.gallery.title} />
        <div className="gallery">
          {PRESETS.map((p, k) => (
            <button key={p.id} className="preset-card panel" data-reveal style={{ transitionDelay: (k % 3) * 80 + 'ms' }}
              onClick={() => { useDesign.getState().replaceAll(p.config); toast(T.gallery.applied(p.name)); navigate(ROUTES.home + '#phoi-xe'); }}>
              <div className="preset-img"><img src={`/presets/${p.id}.webp`} alt={p.name} loading="lazy" /></div>
              <div className="preset-meta">
                <span className="dots">{[p.config.body, p.config.roof, p.config.rim].map((s, j) => <i key={j} style={{ background: s.color }} />)}</span>
                <span className="t"><b>{p.name}</b><small>{p.tag}</small></span>
                <span className="use">{T.gallery.use}<Arrow /></span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function ConfiguratorSection() {
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
        <SectionHead eyebrow="" title={T.configurator.title} />
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
  return (
    <section className="section" id="hoi-dap">
      <div className="wrap faq-grid">
        <SectionHead eyebrow={T.faq.eyebrow} title={T.faq.title} />
        <div className="faq" data-reveal>
          {T.faq.items.map(([q, a, links]) => (
            <details key={q} className="panel"><summary>{q}<span className="plus" /></summary><p>{a}</p>
              {links && <p className="faq-links">{links.map(([label, href]) => <a key={href} href={href} target="_blank" rel="noopener noreferrer">{label}<Arrow /></a>)}</p>}
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap">{new Date().getFullYear()} <span className="sep-v">|</span> SkinVF3</div>
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
