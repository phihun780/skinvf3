// Decal chiếu lên bề mặt xe (DecalGeometry): ôm theo độ cong, dán vắt qua nhiều mảng vẫn liền.
// DecalController: bản xem trước theo con trỏ khi đang chờ dán, bấm để dán, kéo decal để di chuyển.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { useDesign, type Decal } from '../store/design';
import { DECAL_MIN_FACING, DECAL_SIZE, NO_DECAL_ZONES, decalDepth } from '../config/decals';
import { decalTargets } from './targets';

type Vec3 = [number, number, number];
const CLICK_TOLERANCE = 4;
const noRaycast = () => {};

// ---- hình học
/** Giữ lại các tam giác quay mặt về hướng dán (pháp tuyến · n ≥ DECAL_MIN_FACING); bỏ mặt xiên / quay lưng. */
function dropGrazing(g: THREE.BufferGeometry, n: THREE.Vector3) {
  const nor = g.attributes.normal, count = g.attributes.position.count;   // DecalGeometry: không đánh chỉ số, pháp tuyến theo world
  const keep: number[] = [], v = new THREE.Vector3();
  for (let t = 0; t < count; t += 3) {
    let ok = true;
    for (let k = 0; k < 3 && ok; k++) ok = v.fromBufferAttribute(nor, t + k).dot(n) >= DECAL_MIN_FACING;
    if (ok) keep.push(t);
  }
  if (keep.length * 3 === count) return g;
  const out = new THREE.BufferGeometry();
  for (const name of Object.keys(g.attributes)) {
    const a = g.attributes[name] as THREE.BufferAttribute, size = a.itemSize, arr = new Float32Array(keep.length * 3 * size);
    keep.forEach((t, i) => arr.set((a.array as Float32Array).subarray(t * size, (t + 3) * size), i * 3 * size));
    out.setAttribute(name, new THREE.BufferAttribute(arr, size));
  }
  g.dispose();
  return out;
}

const _o = new THREE.Object3D(), _box = new THREE.Box3(), _sphere = new THREE.Sphere();
/** Vùng gốc của decal = vùng nằm ngay dưới điểm dán. Decal chỉ in trên vùng này (như tô màu từng vùng: dán ở thân xe
 *  thì không lem sang capo / nóc). Điểm dán nằm trên ốp không in decal (NO_DECAL_ZONES) → in lên thân xe (cắt theo mép ốp). */
const _ray = new THREE.Raycaster();
function anchorZone(targets: THREE.Mesh[], p: THREE.Vector3, n: THREE.Vector3): string {
  _ray.set(p.clone().addScaledVector(n, 0.03), n.clone().negate()); _ray.far = 0.08;
  const z = _ray.intersectObjects(targets, false)[0]?.object.userData.zone as string | undefined;
  return !z || NO_DECAL_ZONES.includes(z) ? 'body' : z;
}

function buildGeometry(targets: THREE.Mesh[], position: Vec3, normal: Vec3, size: number, aspect: number, rotation: number) {
  const p = new THREE.Vector3(...position), n = new THREE.Vector3(...normal).normalize();
  _o.position.copy(p); _o.lookAt(p.clone().add(n)); _o.rotateZ(THREE.MathUtils.degToRad(rotation));
  const dims = new THREE.Vector3(size, size / aspect, decalDepth(size));
  _sphere.set(p, dims.length() / 2);
  const parts: THREE.BufferGeometry[] = [], zone = anchorZone(targets, p, n);
  for (const mesh of targets) {
    if (mesh.userData.zone !== zone) continue;  // chỉ in trên vùng gốc (ốp không in decal không bao giờ là vùng gốc)
    _box.copy(mesh.geometry.boundingBox ?? mesh.geometry.computeBoundingBox()!).applyMatrix4(mesh.matrixWorld);
    if (!_box.intersectsSphere(_sphere)) continue;  // bỏ qua mảng ở xa: kéo decal mượt hơn
    const g = dropGrazing(new DecalGeometry(mesh, p, _o.rotation, dims), n);
    if (g.attributes.position.count) parts.push(g); else g.dispose();
  }
  if (!parts.length) return null;
  const merged = parts.length === 1 ? parts[0] : mergeGeometries(parts);
  if (parts.length > 1) parts.forEach(g => g.dispose());
  return merged;
}

// ---- texture (dùng chung theo src)
const textures = new Map<string, THREE.Texture>();
function useDecalTexture(src: string) {
  const [tex, setTex] = useState(() => textures.get(src) ?? null);
  useEffect(() => {
    if (textures.has(src)) { setTex(textures.get(src)!); return; }
    new THREE.TextureLoader().load(src, t => {
      t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
      textures.set(src, t); setTex(t);
    });
  }, [src]);
  return tex;
}

function DecalMesh({ decal, index, ghost = false }: { decal: Omit<Decal, 'id'> & { id?: string }; index: number; ghost?: boolean }) {
  const tex = useDecalTexture(decal.src);
  const { position, normal, size, aspect, rotation } = decal;
  const geometry = useMemo(() => buildGeometry(decalTargets, position, normal, size, aspect, rotation),
    [position[0], position[1], position[2], normal[0], normal[1], normal[2], size, aspect, rotation]);  // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => geometry?.dispose(), [geometry]);

  // lật ngang = lật UV (mỗi decal 1 bản texture riêng để không ảnh hưởng decal khác cùng ảnh)
  const map = useMemo(() => {
    if (!tex) return null;
    const m = tex.clone(); m.needsUpdate = true;
    if (decal.flip) { m.wrapS = THREE.RepeatWrapping; m.repeat.x = -1; m.offset.x = 1; }
    return m;
  }, [tex, decal.flip]);

  const selected = useDesign(s => s.selectedDecal === decal.id && !!decal.id);
  // chỉ bắt chuột ở chế độ decal và khi không chờ dán (đang chờ dán thì bấm chồng lên decal cũ vẫn dán được)
  const interactive = useDesign(s => s.mode === 'decal' && !s.pending) && !ghost;
  const controls = useThree(s => s.controls) as unknown as { enabled: boolean } | null;
  if (!geometry || !map) return null;
  return (
    <mesh
      geometry={geometry} renderOrder={10 + index}
      // luôn truyền hàm cụ thể: đổi sang undefined thì R3F không khôi phục raycast mặc định
      raycast={interactive ? THREE.Mesh.prototype.raycast : noRaycast}
      onPointerDown={interactive ? (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        useDesign.getState().selectDecal(decal.id!);
        dragState.start = { id: decal.id!, x: e.clientX, y: e.clientY, moved: false };
        if (controls) controls.enabled = false;  // kéo decal, không xoay xe (bật lại khi thả chuột)
      } : undefined}
    >
      <meshPhysicalMaterial
        map={map} transparent opacity={ghost ? 0.6 : decal.opacity} depthWrite={false}
        polygonOffset polygonOffsetFactor={-4 - index} polygonOffsetUnits={-4}
        roughness={0.4} clearcoat={0.6} clearcoatRoughness={0.1}
        emissive={selected ? '#3cc8ff' : '#000000'} emissiveIntensity={selected ? 0.12 : 0}
      />
    </mesh>
  );
}

/** Decal tĩnh trên xe trưng bày (hero trang chủ): không bắt chuột, dựng lên đúng các mesh của xe đó. */
function StaticDecal({ decal, index, targets }: { decal: DecalLike; index: number; targets: THREE.Mesh[] }) {
  const tex = useDecalTexture(decal.src);
  const { position, normal, size, aspect, rotation } = decal;
  const geometry = useMemo(() => buildGeometry(targets, position, normal, size, aspect, rotation),
    [targets, position[0], position[1], position[2], normal[0], normal[1], normal[2], size, aspect, rotation]);  // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => geometry?.dispose(), [geometry]);
  const map = useMemo(() => {
    if (!tex) return null;
    const m = tex.clone(); m.needsUpdate = true;
    if (decal.flip) { m.wrapS = THREE.RepeatWrapping; m.repeat.x = -1; m.offset.x = 1; }
    return m;
  }, [tex, decal.flip]);
  if (!geometry || !map) return null;
  return (
    <mesh geometry={geometry} renderOrder={10 + index} raycast={noRaycast}>
      <meshPhysicalMaterial map={map} transparent opacity={decal.opacity} depthWrite={false}
        polygonOffset polygonOffsetFactor={-4 - index} polygonOffsetUnits={-4} roughness={0.4} clearcoat={0.6} clearcoatRoughness={0.1} />
    </mesh>
  );
}
type DecalLike = Pick<Decal, 'src' | 'position' | 'normal' | 'size' | 'aspect' | 'rotation' | 'opacity' | 'flip'>;

export function ShowcaseDecals({ decals, targets }: { decals: DecalLike[]; targets: THREE.Mesh[] }) {
  return <>{decals.map((d, i) => <StaticDecal key={i + d.src + d.position.join()} decal={d} index={i} targets={targets} />)}</>;
}

// trạng thái kéo decal (dùng chung giữa DecalMesh và DecalController)
const dragState: { start: { id: string; x: number; y: number; moved: boolean } | null } = { start: null };

export function Decals() {
  const decals = useDesign(s => s.decals);
  return <>{decals.map((d, i) => <DecalMesh key={d.id} decal={d} index={i} />)}</>;
}

/** Xem trước khi chờ dán, bấm để dán, kéo để di chuyển decal đang chọn. */
export function DecalController() {
  const { camera, gl, controls } = useThree() as unknown as { camera: THREE.Camera; gl: THREE.WebGLRenderer; controls: { enabled: boolean } | null };
  const mode = useDesign(s => s.mode), pending = useDesign(s => s.pending);
  const [ghostAt, setGhostAt] = useState<{ position: Vec3; normal: Vec3 } | null>(null);
  const ray = useRef(new THREE.Raycaster()).current, ndc = useRef(new THREE.Vector2()).current;
  const down = useRef<[number, number] | null>(null);

  // điểm + pháp tuyến (world) trên bề mặt xe dưới con trỏ
  const hitAt = (clientX: number, clientY: number): { position: Vec3; normal: Vec3 } | null => {
    const r = gl.domElement.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(decalTargets, false)[0];
    // ốp nhựa dưới vẫn chặn tia (không xuyên qua thân phía sau) và vẫn cho đặt / kéo decal tới đó — chỉ là phần decal
    // nằm trên ốp không in ra (buildGeometry bỏ qua) → người dùng có thể dùng mép ốp để "cắt" decal
    if (!hit?.face) return null;
    const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
    if (n.dot(ray.ray.direction) > 0) n.negate();  // mặt quay lưng (vật liệu 2 mặt)
    return { position: hit.point.toArray() as Vec3, normal: n.toArray() as Vec3 };
  };

  useEffect(() => {
    if (mode !== 'decal') return;
    const el = gl.domElement;
    const onDown = (e: PointerEvent) => { down.current = [e.clientX, e.clientY]; };
    const onMove = (e: PointerEvent) => {
      const s = useDesign.getState();
      if (s.pending) { setGhostAt(hitAt(e.clientX, e.clientY)); return; }
      const drag = dragState.start;
      if (!drag || !(e.buttons & 1)) return;
      if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < CLICK_TOLERANCE) return;
      drag.moved = true;
      const at = hitAt(e.clientX, e.clientY);
      if (at) s.updateDecal(drag.id, at, true);
    };
    const onUp = (e: PointerEvent) => {
      const s = useDesign.getState(), d = down.current;
      const isClick = d && Math.hypot(e.clientX - d[0], e.clientY - d[1]) < CLICK_TOLERANCE;
      if (dragState.start) {
        if (dragState.start.moved) s.commitPreview();
        dragState.start = null;
      } else if (isClick && s.pending) {
        const at = hitAt(e.clientX, e.clientY);
        if (at) { s.addDecal(s.pending, at, DECAL_SIZE.initial); setGhostAt(null); }
      } else if (isClick) {
        s.selectDecal(null);  // bấm ra chỗ không có decal
      }
      if (controls) controls.enabled = true;
      down.current = null;
    };
    el.addEventListener('pointerdown', onDown);
    addEventListener('pointermove', onMove);
    addEventListener('pointerup', onUp);
    return () => { el.removeEventListener('pointerdown', onDown); removeEventListener('pointermove', onMove); removeEventListener('pointerup', onUp); };
  }, [mode, gl, camera, controls]);  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (!pending) setGhostAt(null); }, [pending]);
  // con trỏ: chữ thập khi chờ dán
  useFrame(() => { gl.domElement.style.cursor = mode === 'decal' && pending ? 'crosshair' : ''; });

  if (mode !== 'decal' || !pending || !ghostAt) return null;
  return <DecalMesh ghost index={999} decal={{ ...pending, ...ghostAt, size: DECAL_SIZE.initial, rotation: 0, opacity: 1, flip: false }} />;
}
