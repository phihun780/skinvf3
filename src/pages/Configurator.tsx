// Trình phối, nhúng thành 1 mục của trang chủ (#phoi-xe). Mọi lớp giao diện (chế độ, thanh dưới, bảng màu, decal, tải)
// nằm trong khung .studio-embed; chỉ nhãn vùng theo con trỏ và cửa sổ poster là toàn màn hình.
// Màn cảm ứng (điện thoại): khung trong trang chỉ là bản xem trước (không bắt cử chỉ → vuốt vẫn cuộn trang);
// chạm "Bắt đầu phối" → mở toàn màn hình (kéo để xoay, 2 ngón để phóng to), ✕ hoặc nút Back để thoát.
import { useEffect, useRef, useState } from 'react';
import { Studio } from '../three/Studio';
import { ColorPopover } from '../ui/ColorPopover';
import { DecalPanel } from '../ui/DecalPanel';
import { PosterModal } from '../ui/PosterModal';
import { HoverTip, Loader, ModeSwitch, Toolbar } from '../ui/Chrome';
import { useViewer } from '../store/viewer';
import { useDesign } from '../store/design';
import { TOUCH_QUERY, useMedia } from '../ui/device';
import { t } from '../config/i18n/vi';

export function Configurator() {
  // chỉ vẽ 3D khi khung đang hiện trên màn hình (trang chủ còn xe 3D ở hero)
  const box = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: '120px 0px' });
    io.observe(box.current!); return () => io.disconnect();
  }, []);

  const touch = useMedia(TOUCH_QUERY);
  const full = useViewer(s => s.full), setFull = useViewer(s => s.setFull);
  const gated = touch && !full;

  // toàn màn hình: khoá cuộn trang; nút Back của điện thoại = thoát (thêm 1 mục lịch sử khi mở)
  useEffect(() => {
    if (!full) return;
    document.body.classList.add('studio-full');
    const onPop = () => setFull(false);
    addEventListener('popstate', onPop);
    return () => { document.body.classList.remove('studio-full'); removeEventListener('popstate', onPop); };
  }, [full, setFull]);
  const open = () => { history.pushState({ studio: 1 }, ''); setFull(true); };
  const close = () => {
    const s = useDesign.getState(); s.select(null); s.selectDecal(null);
    if (history.state?.studio) history.back(); else setFull(false);
  };

  return (
    <div className={'studio-embed panel' + (full ? ' full' : '') + (gated ? ' gated' : '')} ref={box}>
      <div className="stage mesh-bg"><Studio active={visible || full} /></div>
      <ModeSwitch />
      <Toolbar />
      <ColorPopover />
      <DecalPanel />
      {!touch && <HoverTip />}
      <PosterModal />
      <Loader />
      {gated && (
        <button className="studio-gate" onClick={open}>
          <span className="btn primary">{t.mobile.start}</span>
          <small>{t.mobile.startHint}</small>
        </button>
      )}
      {full && <button className="studio-close" onClick={close} aria-label={t.close}>✕</button>}
    </div>
  );
}
