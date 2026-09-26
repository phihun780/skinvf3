// Phụ kiện "Ốp lazang tua-bin": khối 3D dựng bằng code (không cần file model), lắp lên 4 mâm khi bật trong tab Phụ kiện.
// Hình dạng theo ảnh mẫu: mâm nền trắng hơi vồng · viền đen ngoài · 5 cánh tua-bin đen xoắn, mỗi cánh có khung nổi + hốc lõm
// có gân · tâm đen ngũ giác bo tròn · logo V bạc. Toạ độ cục bộ: mặt ốp nằm trên mặt phẳng XY, bán kính 1, +Z hướng ra ngoài;
// mọi chi tiết được "ép" theo độ vồng của mặt ốp (dome) nên nằm sát bề mặt.
import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const TAU = Math.PI * 2, DEG = Math.PI / 180;
const BLADES = 5;
const R0 = 0.3, R1 = 0.955;          // cánh: từ mép tâm tới sát viền đen
const TWIST = -12 * DEG;              // cánh hơi nghiêng theo chiều kim đồng hồ khi đi ra ngoài (cánh gần như thẳng, góc cạnh)
// bề rộng góc của cánh ở trong / ngoài (chu kỳ 72°): gần tâm cánh gần như liền nhau, ra ngoài hẹp lại
// → phần trắng là các khe nhọn, rộng dần ra viền (như ảnh mẫu)
const W0 = 70 * DEG, W1 = 55 * DEG;
const TIP_CUT = 0.2;                 // đầu cánh cắt xéo: mép sau ngắn hơn mép trước → khe trắng hình tam giác nhọn
const BLADE_H = 0.05, POCKET_H = 0.014, RIB_H = 0.02, HUB_H = 0.06;

/** Độ vồng của mặt ốp tại bán kính r (0 → 1). */
const dome = (r: number) => 0.05 * (1 - Math.min(1, r / 0.95) ** 2) + 0.012;

/** Góc giữa cánh tại bán kính r (xoắn dần ra ngoài). */
const bladeCenter = (c: number, r: number) => c + TWIST * ((r - R0) / (R1 - R0));
const bladeWidth = (r: number, inset = 0) => W0 + (W1 - W0) * ((r - R0) / (R1 - R0)) - inset;
const polar = (r: number, a: number) => new THREE.Vector2(r * Math.cos(a), r * Math.sin(a));

/** Viền 1 cánh (hoặc hốc bên trong nếu inset > 0) dạng đường khép kín. Mép trước dài tới rOut, mép sau dừng sớm hơn
 *  (cut) → đầu cánh là 1 đường cắt xéo theo cung. */
function bladeOutline(c: number, rIn: number, rOut: number, inset: number, cut = TIP_CUT, n = 14): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [];
  const edge = (r: number, side: 1 | -1) => bladeCenter(c, r) + side * bladeWidth(r, inset) / 2;
  const rTrail = rOut - cut;
  for (let i = 0; i <= n; i++) { const r = rIn + (rOut - rIn) * i / n; pts.push(polar(r, edge(r, 1))); }
  // đầu cánh: đi theo cung, bán kính giảm dần từ mép trước (rOut) sang mép sau (rTrail) — nối thẳng thì đoạn thẳng
  // băng qua ~60° sẽ võng sâu vào trong, cắt cụt cả đầu cánh
  const a0 = edge(rOut, 1), a1 = edge(rTrail, -1);
  for (let i = 1; i < 10; i++) { const t = i / 10; pts.push(polar(rOut + (rTrail - rOut) * t, a0 + (a1 - a0) * t)); }
  for (let i = n; i >= 0; i--) { const r = rIn + (rTrail - rIn) * i / n; pts.push(polar(r, edge(r, -1))); }
  for (let i = 1; i < 4; i++) { const a = edge(rIn, -1) + (edge(rIn, 1) - edge(rIn, -1)) * i / 4; pts.push(polar(rIn, a)); }
  return pts;
}

/** Ép khối phẳng theo độ vồng: z += dome(r). */
function conform(g: THREE.BufferGeometry, lift = 0) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, p.getZ(i) + dome(Math.hypot(x, y)) + lift); }
  g.computeVertexNormals();
  return g;
}

const extrude = (shape: THREE.Shape, depth: number, bevel = 0.008) => new THREE.ExtrudeGeometry(shape, {
  depth, curveSegments: 6, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2,
});

/** Dựng hình học 1 ốp, gom theo vật liệu (mỗi vật liệu 1 lưới → 4 ốp chỉ 20 lưới). */
export function buildCover() {
  // mâm nền trắng + viền đen: xoay biên dạng quanh trục (lathe) rồi dựng đứng theo +Z
  const lathe = (pts: [number, number][]) => new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), 96).rotateX(Math.PI / 2);
  const baseProfile: [number, number][] = [];
  for (let i = 0; i <= 12; i++) { const r = 0.93 * i / 12; baseProfile.push([r, dome(r)]); }
  baseProfile.push([0.93, 0.004]);
  const base = lathe(baseProfile.reverse());
  // viền đen ôm ra ngoài rồi vòng ngược vào trong (che khe giữa ốp và mép mâm)
  const ring = lathe([[0.925, 0.0], [0.93, 0.03], [0.95, 0.045], [0.985, 0.04], [1.0, 0.015], [0.998, -0.06], [0.97, -0.08]].reverse() as [number, number][]);

  const frames: THREE.BufferGeometry[] = [], pockets: THREE.BufferGeometry[] = [], ribs: THREE.BufferGeometry[] = [];
  for (let b = 0; b < BLADES; b++) {
    const c = b * TAU / BLADES + 90 * DEG;
    // khung cánh: viền ngoài, khoét hốc bên trong
    const shape = new THREE.Shape(bladeOutline(c, R0, R1, 0));
    const hole = () => bladeOutline(c, R0 + 0.1, R1 - 0.1, 22 * DEG, TIP_CUT);
    shape.holes.push(new THREE.Path(hole().reverse()));   // lỗ phải ngược chiều viền ngoài, nếu không mặt trên của khung bị hỏng
    frames.push(conform(extrude(shape, BLADE_H)));
    // đáy hốc (thấp, tối hơn)
    const pocket = new THREE.Shape(hole());
    pockets.push(conform(extrude(pocket, POCKET_H, 0)));
    // gân trong hốc: các dải cung ngang cánh
    for (let k = 0; k < 6; k++) {
      const r = R0 + 0.14 + k * 0.058, half = bladeWidth(r, 26 * DEG) / 2, mid = bladeCenter(c, r), n = 8;
      const outer: THREE.Vector2[] = [], inner: THREE.Vector2[] = [];
      for (let i = 0; i <= n; i++) { const a = mid - half + 2 * half * i / n; outer.push(polar(r + 0.009, a)); inner.push(polar(r - 0.009, a)); }
      ribs.push(conform(extrude(new THREE.Shape([...outer, ...inner.reverse()]), RIB_H, 0), POCKET_H));
    }
  }
  // tâm: ngũ giác bo tròn (5 thuỳ nằm giữa các cánh)
  const hubPts: THREE.Vector2[] = [];
  for (let i = 0; i < 120; i++) { const a = i / 120 * TAU; hubPts.push(polar(0.33 * (1 + 0.1 * Math.cos(BLADES * (a - 90 * DEG))), a)); }
  const hub = conform(extrude(new THREE.Shape(hubPts), HUB_H, 0.02));
  // logo V (chữ V chĩa xuống)
  const v = new THREE.Shape([[-0.1, 0.06], [-0.066, 0.06], [0, -0.035], [0.066, 0.06], [0.1, 0.06], [0, -0.09]].map(([x, y]) => new THREE.Vector2(x, y)));
  const logo = extrude(v, 0.012, 0.004).translate(0, 0, dome(0) + HUB_H + 0.02);
  logo.computeVertexNormals();

  return {
    base, ring, logo, hub,
    frame: mergeGeometries(frames), pocket: mergeGeometries(pockets), rib: mergeGeometries(ribs),
  };
}

function makeMaterials() {
  const m = (color: string, roughness: number, extra: Partial<THREE.MeshPhysicalMaterialParameters> = {}) =>
    new THREE.MeshPhysicalMaterial({ color, roughness, ...extra });
  return {
    base: m('#f1f1ee', 0.32, { clearcoat: 1, clearcoatRoughness: 0.08 }),   // phần trắng = màu của ốp
    ring: m('#141517', 0.45, { clearcoat: 0.4 }),
    frame: m('#3b3c41', 0.38, { clearcoat: 0.6, clearcoatRoughness: 0.15 }),   // xám than như ảnh mẫu
    hub: m('#393a3f', 0.32, { clearcoat: 0.8, clearcoatRoughness: 0.12 }),
    pocket: m('#1c1d21', 0.75),
    rib: m('#45464b', 0.55),
    logo: m('#d9dbde', 0.18, { metalness: 1 }),
  };
}

const RIM_LIP = 0.008;   // m: khoảng nhô của mép mâm / thành lốp so với mặt ngoài vùng mâm

interface WheelFrame { center: THREE.Vector3; side: 1 | -1; radius: number }

/** Tìm 4 mâm trong model (vùng "rim"): tâm, bên (trái / phải), bán kính, mặt ngoài. */
function findWheels(scene: THREE.Object3D): WheelFrame[] {
  const boxes = new Map<string, THREE.Box3>(), v = new THREE.Vector3();
  scene.updateMatrixWorld(true);
  scene.traverse(o => {
    if (!(o instanceof THREE.Mesh) || o.userData.zone !== 'rim') return;
    const p = o.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld);
      const key = (v.x > 0 ? 'L' : 'R') + (v.z > 0 ? 'F' : 'B');
      (boxes.get(key) ?? boxes.set(key, new THREE.Box3()).get(key)!).expandByPoint(v);
    }
  });
  return [...boxes.entries()].map(([key, b]) => {
    const side = key[0] === 'L' ? 1 : -1;
    const c = b.getCenter(new THREE.Vector3());
    c.x = side > 0 ? b.max.x : b.min.x;              // mặt ngoài của mâm
    return { center: c, side, radius: (b.max.y - b.min.y) / 2 };
  });
}

/** 4 ốp lazang trên xe (chỉ khi đã bật trong tab Phụ kiện). */
export function WheelCovers({ visible }: { visible: boolean }) {
  const scene = useThree(s => s.scene);
  const geo = useMemo(buildCover, []), mat = useMemo(makeMaterials, []);
  const wheels = useMemo(() => findWheels(scene), [scene]);
  useEffect(() => () => { Object.values(geo).forEach(g => g.dispose()); Object.values(mat).forEach(m => m.dispose()); }, [geo, mat]);
  const noRay = () => {};   // không chặn chuột: bấm vào ốp vẫn chọn được vùng phía sau
  return (
    <group visible={visible}>
      {wheels.map((w, i) => (
        // lắp đè ra ngoài mép mâm + thành lốp (mép mâm nhô ra ~5mm so với mặt mâm, đặt thấp hơn sẽ bị che mất phần ngoài của ốp)
        <group key={i} position={[w.center.x + w.side * RIM_LIP, w.center.y, w.center.z]} rotation={[0, w.side * Math.PI / 2, 0]} scale={w.radius * 1.02}>
          {(Object.keys(geo) as (keyof typeof geo)[]).map(k => (
            <mesh key={k} geometry={geo[k]} material={mat[k]} castShadow receiveShadow raycast={noRay} />
          ))}
        </group>
      ))}
    </group>
  );
}
