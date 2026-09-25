// Trình phối, nhúng thành 1 mục của trang chủ (#phoi-xe). Mọi lớp giao diện (chế độ, thanh dưới, bảng màu, decal, tải)
// nằm trong khung .studio-embed; chỉ nhãn vùng theo con trỏ và cửa sổ poster là toàn màn hình.
import { useEffect, useRef, useState } from 'react';
import { Studio } from '../three/Studio';
import { ColorPopover } from '../ui/ColorPopover';
import { DecalPanel } from '../ui/DecalPanel';
import { PosterModal } from '../ui/PosterModal';
import { HoverTip, Loader, ModeSwitch, Toolbar } from '../ui/Chrome';

export function Configurator() {
  // chỉ vẽ 3D khi khung đang hiện trên màn hình (trang chủ còn xe 3D ở hero)
  const box = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: '120px 0px' });
    io.observe(box.current!); return () => io.disconnect();
  }, []);

  return (
    <div className="studio-embed panel" ref={box}>
      <div className="stage mesh-bg"><Studio active={visible} /></div>
      <ModeSwitch />
      <Toolbar />
      <ColorPopover />
      <DecalPanel />
      <HoverTip />
      <PosterModal />
      <Loader />
    </div>
  );
}
