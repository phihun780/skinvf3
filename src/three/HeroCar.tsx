// Xe 3D ở hero trang chủ: tự xoay chậm, nền trong suốt (nằm trên nền mesh), không bắt chuột.
// Khung hình thứ 3 (bóng đổ đã vẽ xong) được chụp lại làm ảnh chờ cho lần mở trang sau (heroStill.ts).
import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { Car } from './Car';
import { Lights, fitDistance } from './Studio';
import type { DesignConfig } from '../config/zones';
import { isTouch } from '../ui/device';

const TOUCH = isTouch();  // điện thoại: độ phân giải + bóng đổ thấp hơn cho mượt

const SPEED = 0.16;        // rad/s
export const START_ANGLE = 0.62;

function Turntable({ box, onReady, onCapture }: { box: THREE.Box3; onReady: () => void; onCapture?: (url: string) => void }) {
  const camera = useThree(s => s.camera) as THREE.PerspectiveCamera;
  const size = useThree(s => s.size);
  const gl = useThree(s => s.gl), scene = useThree(s => s.scene);
  const [rig] = useState(() => ({ angle: START_ANGLE, dist: 5, target: new THREE.Vector3(), placed: false }));
  const frames = useRef(0);

  // khoảng lùi để xe vừa khung ở mọi góc xoay (lấy góc bất lợi nhất: nhìn ngang hông)
  useEffect(() => {
    const s = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    rig.target.set(c.x, box.min.y + s.y * 0.4, c.z);
    const narrow = size.width < 700;
    const dirs = [0, Math.PI / 4, Math.PI / 2].map(a => new THREE.Vector3(Math.sin(a), 0.28, Math.cos(a)).normalize());
    rig.dist = Math.max(...dirs.map(d => fitDistance(box, rig.target, d, camera, narrow ? 0.92 : 0.8, 0.86)));
    rig.placed = true;
    onReady();
  }, [box, camera, size.width, size.height, rig, onReady]);

  useFrame((_, dt) => {
    if (!rig.placed) return;
    frames.current++;
    // 3 khung đầu giữ nguyên góc bắt đầu (khớp với ảnh chờ), sau đó mới xoay
    if (frames.current > 3) rig.angle += dt * SPEED;
    const d = new THREE.Vector3(Math.sin(rig.angle), 0.28, Math.cos(rig.angle)).normalize();
    camera.position.copy(rig.target).addScaledVector(d, rig.dist);
    camera.lookAt(rig.target);
    if (frames.current === 3 && onCapture) {
      gl.render(scene, camera);
      onCapture(gl.domElement.toDataURL('image/webp', 0.82));
    }
  });
  return null;
}

interface HeroCarProps {
  config: DesignConfig;
  onReady: () => void;
  onCapture?: (url: string) => void;
  active?: boolean;
}

export function HeroCar({ config, onReady, onCapture, active = true }: HeroCarProps) {
  const [box, setBox] = useState<THREE.Box3 | null>(null);
  return (
    <Canvas
      shadows dpr={[1, TOUCH ? 1.5 : 2]} frameloop={active ? 'always' : 'never'} camera={{ fov: 26, near: 0.05, far: 60, position: [4, 1.5, 5] }}
      gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }}
      style={{ pointerEvents: 'none' }}
    >
      <Lights />
      <Suspense fallback={null}><Car showcase={config} onLoaded={setBox} /></Suspense>
      {box && (
        <>
          <ContactShadows position={[0, box.min.y + 0.002, 0]} opacity={0.75} scale={7} blur={2.4} far={1.6} resolution={TOUCH ? 512 : 1024} color="#010516" />
          <Turntable box={box} onReady={onReady} onCapture={onCapture} />
        </>
      )}
    </Canvas>
  );
}
