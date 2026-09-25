// Studio tối: ánh sáng softbox (Lightformer, không tải HDR từ mạng), bóng tiếp xúc, camera có chuyển góc mượt.
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { Car } from './Car';
import { DecalController, Decals } from './Decals';
import { DecalGizmo } from './DecalGizmo';
import { useViewer, VIEWS, type ViewId } from '../store/viewer';
import { useDesign } from '../store/design';
import { LAYOUT, frameLeft } from '../config/layout';
import { snapshotter } from './snapshot';
import { isTouch } from '../ui/device';

// điện thoại: độ phân giải khung 3D + bóng đổ thấp hơn (mượt, đỡ nóng máy), chụm 2 ngón để phóng to
const TOUCH = isTouch();

// Phần khung (toạ độ NDC) dành cho xe: chừa chỗ cho thanh trên/dưới. Bề ngang tính theo khung giao diện
// (tối đa LAYOUT.frame px) để màn hình rộng không làm xe to bè ra hai bên.
const FILL = { x: 0.66, y: 0.6 };
const fillX = (width: number) => FILL.x * Math.min(1, LAYOUT.frame / width);
const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

// Khoảng lùi camera để 8 góc hộp bao của xe nằm gọn trong |x| ≤ fx, |y| ≤ fy (NDC), theo hướng nhìn `dir`
export function fitDistance(box: THREE.Box3, target: THREE.Vector3, dir: THREE.Vector3, cam: THREE.PerspectiveCamera, fx: number, fy = FILL.y) {
  const c = cam.clone(), p = new THREE.Vector3(), corners: THREE.Vector3[] = [];
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) corners.push(new THREE.Vector3(x, y, z));
  let lo = 0.3, hi = 40;
  for (let i = 0; i < 28; i++) {
    const mid = (lo + hi) / 2;
    c.position.copy(target).addScaledVector(dir, mid); c.lookAt(target); c.updateMatrixWorld();
    const fits = corners.every(k => { p.copy(k).project(c); return Math.abs(p.x) <= fx && Math.abs(p.y) <= fy; });
    if (fits) hi = mid; else lo = mid;
  }
  return hi;
}

function CameraRig({ box, onPlaced }: { box: THREE.Box3; onPlaced: () => void }) {
  const camera = useThree(s => s.camera) as THREE.PerspectiveCamera;
  const controls = useRef<OrbitControlsImpl>(null);
  const { view, request, autoRotate, clearView, full } = useViewer();
  const target = useRef(new THREE.Vector3()).current;
  const tween = useRef<{ a: THREE.Spherical; b: THREE.Spherical; dt: number; t0: number } | null>(null);
  const dragging = useRef(false);

  const size = useThree(s => s.size);
  const positionFor = useCallback((v: ViewId) => {
    const dir = new THREE.Vector3(...VIEWS[v]).normalize();
    return target.clone().addScaledVector(dir, fitDistance(box, target, dir, camera, fillX(size.width)));
  }, [box, camera, target, size.width]);

  // lần đầu: đặt camera ở góc 3/4 trước, giới hạn zoom quanh khoảng đó
  useEffect(() => {
    const size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
    target.set(center.x, box.min.y + size.y * 0.42, center.z);
    camera.position.copy(positionFor('front34'));
    const c = controls.current!; c.target.copy(target); c.update();
    const d = camera.position.distanceTo(target);
    c.minDistance = d * 0.45; c.maxDistance = d * 1.8;
    if (import.meta.env.DEV) Object.assign(window, { __cam: { camera, controls: c } });  // kiểm thử: đặt góc chụp
    onPlaced();
  }, [box]);  // eslint-disable-line react-hooks/exhaustive-deps

  // bấm chuyển góc → nội suy theo toạ độ cầu quanh xe (không cắt ngang qua xe)
  useEffect(() => {
    if (!request || !view) return;
    const a = new THREE.Spherical().setFromVector3(camera.position.clone().sub(target));
    const b = new THREE.Spherical().setFromVector3(positionFor(view).sub(target));
    let dt = b.theta - a.theta; if (dt > Math.PI) dt -= 2 * Math.PI; if (dt < -Math.PI) dt += 2 * Math.PI;
    tween.current = { a, b, dt, t0: performance.now() };
  }, [request]);  // eslint-disable-line react-hooks/exhaustive-deps

  // Panel bảng màu đang mở → dời khung hình để xe nằm giữa phần còn trống (chuyển mượt):
  //  - màn rộng: panel ở góc phải khung giao diện → dời ngang, xe nằm giữa phần bên trái panel
  //  - màn hẹp: panel là tấm trượt từ dưới lên → dời dọc, xe nằm giữa phần phía trên tấm
  const shift = useRef({ x: 0, y: 0 });
  const panelShift = (w: number, h: number) => {
    if (w <= LAYOUT.mobile) {
      const sheetTop = h - 72 - Math.min(0.55 * h, 460);  // khớp .popover ở CSS màn hẹp
      return { x: 0, y: h / 2 - (64 + sheetTop) / 2 };
    }
    const left = frameLeft(w) + LAYOUT.gutter, panelLeft = w - left - LAYOUT.panelWidth;
    return { x: w / 2 - (left + panelLeft - LAYOUT.gutter) / 2, y: 0 };
  };
  useFrame((_, delta) => {
    // màn hẹp: tấm bảng dưới (bảng màu / decal) tự báo mép trên → xe nằm giữa phần trống phía trên nó
    // màn rộng: panel ở góc phải → dời xe sang trái khi panel mở (chế độ decal: panel luôn mở)
    const st = useDesign.getState(), sheetTop = useViewer.getState().sheetTop;
    const want = size.width <= LAYOUT.mobile
      ? (sheetTop != null ? { x: 0, y: size.height / 2 - (64 + Math.min(sheetTop, size.height - 72)) / 2 } : { x: 0, y: 0 })
      : (st.selected || st.mode === 'decal') ? panelShift(size.width, size.height) : { x: 0, y: 0 };
    const cur = shift.current, v = camera.view;
    const settled = Math.abs(want.x - cur.x) < 0.5 && Math.abs(want.y - cur.y) < 0.5;
    // bỏ qua nếu không đổi gì (kể cả kích thước khung)
    if (settled && v && v.offsetX === want.x && v.offsetY === want.y && v.fullWidth === size.width && v.fullHeight === size.height) return;
    shift.current = settled ? want : { x: THREE.MathUtils.damp(cur.x, want.x, 8, delta), y: THREE.MathUtils.damp(cur.y, want.y, 8, delta) };
    camera.setViewOffset(size.width, size.height, shift.current.x, shift.current.y, size.width, size.height);
  });

  // Chụp ảnh các góc cho poster: camera riêng (không lệch khung, không bị panel che), canvas đổi cỡ tạm thời,
  // nền trong suốt. Chạy liền một mạch rồi trả canvas về như cũ nên màn hình không kịp nháy.
  const gl = useThree(s => s.gl), scene = useThree(s => s.scene);
  useEffect(() => {
    snapshotter.take = (views, w, h) => {
      const cam = new THREE.PerspectiveCamera(camera.fov, w / h, camera.near, camera.far);
      const prevSize = gl.getSize(new THREE.Vector2()), prevRatio = gl.getPixelRatio();
      gl.setPixelRatio(1); gl.setSize(w, h, false);
      const out = views.map(v => {
        const dir = new THREE.Vector3(...VIEWS[v]).normalize();
        cam.position.copy(target).addScaledVector(dir, fitDistance(box, target, dir, cam, 0.96, 0.94));
        cam.lookAt(target); cam.updateMatrixWorld();
        gl.render(scene, cam);
        return gl.domElement.toDataURL('image/png');
      });
      gl.setPixelRatio(prevRatio); gl.setSize(prevSize.x, prevSize.y, false);
      gl.render(scene, camera);
      return out;
    };
    return () => { snapshotter.take = null; };
  }, [gl, scene, camera, box, target]);

  // Trình phối nằm trong trang cuộn: lăn chuột thường = cuộn trang; Ctrl/⌘ + lăn (hoặc chụm 2 ngón trên touchpad) = phóng to
  useEffect(() => {
    const el = gl.domElement;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const c = controls.current; if (!c) return;
      const off = camera.position.clone().sub(c.target), d = THREE.MathUtils.clamp(off.length() * Math.exp(e.deltaY * 0.0015), c.minDistance, c.maxDistance);
      camera.position.copy(c.target).addScaledVector(off.normalize(), d); c.update();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [gl, camera]);

  useFrame(() => {
    const tw = tween.current; if (!tw) return;
    const t = Math.min(1, (performance.now() - tw.t0) / 900), k = ease(t);
    const s = new THREE.Spherical(tw.a.radius + (tw.b.radius - tw.a.radius) * k, tw.a.phi + (tw.b.phi - tw.a.phi) * k, tw.a.theta + tw.dt * k);
    camera.position.setFromSpherical(s).add(target);
    controls.current?.target.copy(target);
    if (t === 1) tween.current = null;
  });

  return (
    <OrbitControls
      // chụm 2 ngón để phóng to: chỉ khi mở toàn màn hình trên điện thoại (máy tính: Ctrl + lăn chuột, lăn thường = cuộn trang)
      ref={controls} makeDefault enablePan={false} enableZoom={full && TOUCH} enableDamping dampingFactor={0.08}
      minPolarAngle={0.15} maxPolarAngle={Math.PI / 2 - 0.04} autoRotate={autoRotate} autoRotateSpeed={0.8}
      // chỉ coi là "tự xoay" khi thật sự kéo (bấm chọn vùng cũng phát 'start' nhưng không có 'change')
      onStart={() => { dragging.current = true; }}
      onChange={() => { if (!dragging.current) return; tween.current = null; if (useViewer.getState().view) clearView(); }}
      onEnd={() => { dragging.current = false; }}
    />
  );
}

export function Lights() {
  return (
    <>
      {/* bản đồ môi trường dựng từ các tấm sáng: phản chiếu kiểu studio chụp xe */}
      <Environment resolution={256} frames={1}>
        <Lightformer intensity={2.2} rotation-x={Math.PI / 2} position={[0, 5, 0]} scale={[10, 4, 1]} />
        <Lightformer intensity={1.2} rotation-y={Math.PI / 2} position={[-6, 1.5, 0]} scale={[12, 1.2, 1]} />
        <Lightformer intensity={1.2} rotation-y={-Math.PI / 2} position={[6, 1.5, 0]} scale={[12, 1.2, 1]} />
        <Lightformer intensity={0.8} position={[0, 1.5, 7]} scale={[8, 2, 1]} />
        <Lightformer intensity={0.6} rotation-y={Math.PI} position={[0, 2, -7]} scale={[8, 2, 1]} color="#7fd8ff" />
        {/* hắt sáng xanh từ nền mesh để xe hoà vào khung cảnh */}
        <Lightformer intensity={0.5} rotation-y={-Math.PI / 3} position={[5, 0.6, -4]} scale={[6, 1.5, 1]} color="#3cc8ff" />
      </Environment>
      <directionalLight position={[2.5, 6, 3.5]} intensity={1.2} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} />
    </>
  );
}

export function Studio({ active = true }: { active?: boolean }) {
  const [box, setBox] = useState<THREE.Box3 | null>(null);
  // hiện khung 3D khi camera đã vào đúng góc (tránh 1–2 khung hình xe to sai góc lúc vừa chuyển trang)
  const [placed, setPlaced] = useState(false);
  const select = useDesign(s => s.select);
  const down = useRef<[number, number] | null>(null);
  return (
    <Canvas
      shadows dpr={[1, TOUCH ? 1.5 : 2]} frameloop={active ? 'always' : 'never'}
      style={{ opacity: placed ? 1 : 0, transition: 'opacity .6s ease' }}
      camera={{ fov: 28, near: 0.05, far: 60, position: [4, 2, 5] }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0, preserveDrawingBuffer: true }}
      onPointerDown={e => { down.current = [e.clientX, e.clientY]; }}
      // bấm ra ngoài xe (không kéo) → đóng bảng màu
      onPointerMissed={e => { const d = down.current; if (d && Math.hypot(e.clientX - d[0], e.clientY - d[1]) < 4) select(null); }}
    >
      <Lights />
      <Suspense fallback={null}>
        <Car onLoaded={setBox} />
      </Suspense>
      {box && (
        <>
          <ContactShadows position={[0, box.min.y + 0.002, 0]} opacity={0.7} color="#010516" scale={7} blur={2.2} far={1.6} resolution={TOUCH ? 512 : 1024} />
          <CameraRig box={box} onPlaced={() => setPlaced(true)} />
          <Decals />
          <DecalController />
          <DecalGizmo />
        </>
      )}
    </Canvas>
  );
}
