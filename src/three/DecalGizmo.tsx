// Khung biến đổi decal ngay trên xe, kiểu Photoshop (chế độ Decal, decal đang chọn):
//  - khung chữ nhật ôm sát decal (xoay theo decal, theo góc nhìn camera)
//  - rê vào CẠNH hoặc Ô VUÔNG ở góc: con trỏ co giãn → kéo để phóng to / thu nhỏ
//  - rê RA NGOÀI GÓC một chút: con trỏ xoay → kéo để xoay 360° (giữ Shift: bước 15°)
//  - nút ✕ phía trên khung: xoá decal
// Kéo = xem trước trực tiếp; thả chuột mới ghi 1 bước hoàn tác.
import { useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useDesign, type Decal } from '../store/design';
import { DECAL_SIZE } from '../config/decals';
import { t } from '../config/i18n/vi';
import { rotateCursor } from './rotateCursor';

const _o = new THREE.Object3D(), _v = new THREE.Vector3();
type Pt = [number, number];
const ROT_OFF = 24, ROT_R = 21;  // vùng xoay ngoài góc (px)

/** 4 góc decal trên màn hình (px, so với tâm decal): trên-trái, trên-phải, dưới-phải, dưới-trái (theo hướng decal). */
function screenCorners(d: Decal, camera: THREE.Camera, w: number, h: number): Pt[] {
  const p = new THREE.Vector3(...d.position), n = new THREE.Vector3(...d.normal).normalize();
  _o.position.copy(p); _o.lookAt(p.clone().add(n)); _o.rotateZ(THREE.MathUtils.degToRad(d.rotation)); _o.updateMatrixWorld();
  const c = _v.copy(p).project(camera), cx = (c.x + 1) / 2 * w, cy = (1 - c.y) / 2 * h;
  const hw = d.size / 2, hh = d.size / d.aspect / 2;
  return ([[-hw, hh], [hw, hh], [hw, -hh], [-hw, -hh]] as Pt[]).map(([x, y]) => {
    const s = new THREE.Vector3(x, y, 0).applyMatrix4(_o.matrixWorld).project(camera);
    return [(s.x + 1) / 2 * w - cx, (1 - s.y) / 2 * h - cy];
  });
}

// con trỏ co giãn theo hướng pháp tuyến của cạnh trên màn hình
const RESIZE = ['ew-resize', 'nwse-resize', 'ns-resize', 'nesw-resize'];
const resizeCursor = (a: Pt, b: Pt) => {
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) + Math.PI / 2;           // hướng pháp tuyến
  const i = Math.round(((ang % Math.PI) + Math.PI) % Math.PI / (Math.PI / 4)) % 4;
  return RESIZE[i];
};
export function DecalGizmo() {
  const mode = useDesign(s => s.mode), pending = useDesign(s => s.pending);
  const decal = useDesign(s => s.decals.find(d => d.id === s.selectedDecal));
  const { camera, size, controls } = useThree() as unknown as { camera: THREE.Camera; size: { width: number; height: number }; controls: { enabled: boolean } | null };
  const frame = useRef<SVGPolygonElement>(null);
  const edges = useRef<(SVGLineElement | null)[]>([]);
  const corners = useRef<(SVGCircleElement | null)[]>([]);
  const rotZones = useRef<(SVGCircleElement | null)[]>([]);
  const knobs = useRef<(SVGRectElement | null)[]>([]);
  const del = useRef<HTMLButtonElement>(null);

  // vẽ lại khung theo camera / decal mỗi khung hình (đặt thẳng vào DOM, không render lại React)
  useFrame(() => {
    const st = useDesign.getState(), d = st.decals.find(x => x.id === st.selectedDecal);
    if (!d || !frame.current) return;
    const c = screenCorners(d, camera, size.width, size.height);
    frame.current.setAttribute('points', c.map(p => p.join(',')).join(' '));
    c.forEach((p, i) => {
      const q = c[(i + 1) % 4], e = edges.current[i], k = corners.current[i], kn = knobs.current[i];
      if (e) { e.setAttribute('x1', String(p[0])); e.setAttribute('y1', String(p[1])); e.setAttribute('x2', String(q[0])); e.setAttribute('y2', String(q[1])); e.style.cursor = resizeCursor(p, q); }
      if (k) { k.setAttribute('cx', String(p[0])); k.setAttribute('cy', String(p[1])); k.style.cursor = resizeCursor([0, 0], [-p[1], p[0]]); }
      // vùng xoay: vòng tròn nằm hẳn bên ngoài góc (tâm cách góc ROT_OFF theo hướng từ tâm decal ra, bán kính < ROT_OFF
      // → không lấn vào trong khung, bên trong khung vẫn là kéo di chuyển decal)
      const r = rotZones.current[i], l = Math.hypot(p[0], p[1]) || 1;
      if (r) {
        r.setAttribute('cx', String(p[0] + p[0] / l * ROT_OFF)); r.setAttribute('cy', String(p[1] + p[1] / l * ROT_OFF));
        // con trỏ xoay quay mặt ra ngoài góc này
        const cur = rotateCursor(Math.atan2(p[1], p[0]) * 180 / Math.PI);
        if (r.style.cursor !== cur) r.style.cursor = cur;
      }
      if (kn) { kn.setAttribute('x', String(p[0] - 4.5)); kn.setAttribute('y', String(p[1] - 4.5)); }
    });
    // nút ✕: phía trên giữa cạnh đang nằm cao nhất trên màn hình (không đè vùng xoay ở các góc)
    let top = 0;
    for (let i = 1; i < 4; i++) if (c[i][1] + c[(i + 1) % 4][1] < c[top][1] + c[(top + 1) % 4][1]) top = i;
    const a = c[top], b = c[(top + 1) % 4], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, ml = Math.hypot(mx, my) || 1;
    if (del.current) del.current.style.transform = `translate(${mx + mx / ml * 26}px, ${my + my / ml * 26}px)`;
  });

  if (mode !== 'decal' || pending || !decal) return null;

  const startDrag = (kind: 'rotate' | 'scale') => (e: ReactPointerEvent<SVGElement>) => {
    e.preventDefault(); e.stopPropagation();
    const box = (e.currentTarget.ownerSVGElement ?? e.currentTarget).getBoundingClientRect();
    const cx = box.left + box.width / 2, cy = box.top + box.height / 2;  // svg căn giữa tại tâm decal
    const start = { size: decal.size, rot: decal.rotation, a: Math.atan2(e.clientY - cy, e.clientX - cx), d: Math.hypot(e.clientX - cx, e.clientY - cy) || 1 };
    if (controls) controls.enabled = false;
    document.body.classList.add('gizmo-dragging');
    const pointerCursor = (x: number, y: number) => rotateCursor(Math.atan2(y - cy, x - cx) * 180 / Math.PI);
    document.body.style.cursor = kind === 'rotate' ? pointerCursor(e.clientX, e.clientY) : getComputedStyle(e.currentTarget).cursor;
    const move = (ev: PointerEvent) => {
      const { updateDecal } = useDesign.getState();
      if (kind === 'scale') {
        const k = Math.hypot(ev.clientX - cx, ev.clientY - cy) / start.d;
        updateDecal(decal.id, { size: THREE.MathUtils.clamp(start.size * k, DECAL_SIZE.min, DECAL_SIZE.max) }, true);
      } else {
        // màn hình: trục y hướng xuống → quay theo chiều kim đồng hồ trên màn = góc decal giảm
        const da = THREE.MathUtils.radToDeg(Math.atan2(ev.clientY - cy, ev.clientX - cx) - start.a);
        document.body.style.cursor = pointerCursor(ev.clientX, ev.clientY);   // con trỏ quay theo tay kéo
        let rot = start.rot - da; rot = ((rot + 180) % 360 + 360) % 360 - 180;
        if (ev.shiftKey) rot = Math.round(rot / 15) * 15;
        updateDecal(decal.id, { rotation: Math.round(rot) }, true);
      }
    };
    const up = () => {
      removeEventListener('pointermove', move); removeEventListener('pointerup', up);
      document.body.classList.remove('gizmo-dragging'); document.body.style.cursor = '';
      if (controls) controls.enabled = true;
      useDesign.getState().commitPreview();
    };
    addEventListener('pointermove', move); addEventListener('pointerup', up);
  };

  return (
    <Html position={decal.position} center zIndexRange={[8, 0]} style={{ pointerEvents: 'none' }}>
      <div className="gizmo">
        <svg className="gizmo-svg" width="2" height="2" viewBox="-1 -1 2 2" overflow="visible">
          <polygon ref={frame} className="gizmo-frame" />
          {/* lớp dưới → trên: vùng xoay ngoài góc · cạnh (co giãn) · ô vuông góc (co giãn) */}
          {[0, 1, 2, 3].map(i => <circle key={'r' + i} ref={el => { rotZones.current[i] = el; }} className="gizmo-rotate" r={ROT_R} onPointerDown={startDrag('rotate')}><title>{t.decal.gizmoRotate}</title></circle>)}
          {[0, 1, 2, 3].map(i => <line key={'e' + i} ref={el => { edges.current[i] = el; }} className="gizmo-edge" onPointerDown={startDrag('scale')}><title>{t.decal.gizmoScale}</title></line>)}
          {[0, 1, 2, 3].map(i => <rect key={'k' + i} ref={el => { knobs.current[i] = el; }} className="gizmo-knob" width="9" height="9" />)}
          {[0, 1, 2, 3].map(i => <circle key={'c' + i} ref={el => { corners.current[i] = el; }} className="gizmo-corner" r="9" onPointerDown={startDrag('scale')}><title>{t.decal.gizmoScale}</title></circle>)}
        </svg>
        <button ref={del} className="gizmo-del" title={t.decal.remove} aria-label={t.decal.remove}
          onPointerDown={e => e.stopPropagation()} onClick={() => useDesign.getState().removeDecal(decal.id)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"><path d="M7 7l10 10M17 7L7 17" /></svg>
        </button>
      </div>
    </Html>
  );
}
