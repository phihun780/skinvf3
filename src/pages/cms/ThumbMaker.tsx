// Tạo ảnh thẻ "Mẫu tham khảo" ngay trong CMS: dựng xe 3D (ẩn, ngoài màn hình) với màu của mẫu, chụp góc 3/4 trước
// giống hệt ảnh render sẵn (scripts/render-home-assets.js + pack-home-assets.mjs): 1200×800, nền trong suốt,
// cắt bớt nền thừa quanh xe rồi chừa lề 24px → WebP.
import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { Car } from '../../three/Car';
import { Lights, fitDistance } from '../../three/Studio';
import { VIEWS } from '../../store/viewer';
import type { DesignConfig } from '../../config/zones';

const W = 1200, H = 800, MARGIN = 24;

/** Cắt phần trong suốt thừa quanh xe (giống sharp.trim) + chừa lề → WebP. */
function trimToWebp(src: HTMLCanvasElement): Promise<Blob> {
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
  const g = c.getContext('2d', { willReadFrequently: true })!; g.drawImage(src, 0, 0);
  const { data } = g.getImageData(0, 0, c.width, c.height);
  let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    if (data[(y * c.width + x) * 4 + 3] > 1) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) { x0 = 0; y0 = 0; x1 = c.width - 1; y1 = c.height - 1; }
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const out = document.createElement('canvas'); out.width = w + MARGIN * 2; out.height = h + MARGIN * 2;
  out.getContext('2d')!.drawImage(c, x0, y0, w, h, MARGIN, MARGIN, w, h);
  return new Promise((ok, err) => out.toBlob(b => (b ? ok(b) : err(new Error('Trình duyệt không tạo được ảnh WebP.'))), 'image/webp', 0.86));
}

function Shooter({ box, onShot }: { box: THREE.Box3; onShot: (c: HTMLCanvasElement) => void }) {
  const gl = useThree(s => s.gl), scene = useThree(s => s.scene), camera = useThree(s => s.camera) as THREE.PerspectiveCamera;
  const frames = useRef(0), done = useRef(false);
  useFrame(() => {
    // chờ vài khung: bản đồ môi trường + bóng đổ vẽ xong
    if (done.current || ++frames.current < 6) return;
    done.current = true;
    const size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
    const target = new THREE.Vector3(center.x, box.min.y + size.y * 0.42, center.z);
    const cam = new THREE.PerspectiveCamera(camera.fov, W / H, camera.near, camera.far);
    const dir = new THREE.Vector3(...VIEWS.front34).normalize();
    cam.position.copy(target).addScaledVector(dir, fitDistance(box, target, dir, cam, 0.96, 0.94));
    cam.lookAt(target); cam.updateMatrixWorld();
    gl.setPixelRatio(1); gl.setSize(W, H, false);
    gl.render(scene, cam);
    onShot(gl.domElement);
  });
  return null;
}

/** Dựng ẩn → chụp 1 ảnh → gọi onDone(blob) rồi có thể gỡ component. */
export function ThumbMaker({ config, onDone, onError }: { config: DesignConfig; onDone: (b: Blob) => void; onError: (e: Error) => void }) {
  const [box, setBox] = useState<THREE.Box3 | null>(null);
  const [cfg] = useState(config);   // giữ màu lúc bấm tạo
  const fired = useRef(false);
  useEffect(() => { const h = setTimeout(() => { if (!fired.current) onError(new Error('Tạo ảnh quá lâu, thử lại.')); }, 30000); return () => clearTimeout(h); }, [onError]);
  const shot = (c: HTMLCanvasElement) => {
    if (fired.current) return; fired.current = true;
    trimToWebp(c).then(onDone, onError);
  };
  return (
    <div className="cms-thumb-stage" aria-hidden>
      <Canvas shadows dpr={1} camera={{ fov: 28, near: 0.05, far: 60, position: [4, 2, 5] }}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0, preserveDrawingBuffer: true }}>
        <Lights />
        <Suspense fallback={null}><Car showcase={cfg} onLoaded={setBox} /></Suspense>
        {box && (
          <>
            <ContactShadows position={[0, box.min.y + 0.002, 0]} opacity={0.7} color="#010516" scale={7} blur={2.2} far={1.6} resolution={1024} />
            <Shooter box={box} onShot={shot} />
          </>
        )}
      </Canvas>
    </div>
  );
}
