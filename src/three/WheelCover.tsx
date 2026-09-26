// Phụ kiện "Ốp lazang tua-bin": dùng chính ảnh thiết kế (public/accessories/wheel-cover-face.webp — ảnh gốc cắt tròn,
// nền trong suốt) dán lên 1 mặt ốp hơi vồng + thành viền dày như ốp thật → giữ nguyên 100% thiết kế.
// Ốp tự tìm 4 mâm trong model (vùng "rim") và lắp đè ra ngoài mép mâm. Ảnh không bị lật ở bên nào (nhìn từ ngoài vào).
// Đổi mẫu ốp: thay file ảnh (vuông, hình tròn sát mép, nền trong suốt).
import { useEffect, useMemo } from 'react';
import { useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export const COVER_TEXTURE = '/accessories/wheel-cover-face.webp';
const DOME = 0.07;        // độ vồng ở tâm (theo bán kính ốp)
const EDGE = 0.06;        // bề dày thành viền
const RIM_LIP = 0.008;    // m: khoảng nhô của mép mâm / thành lốp so với mặt ngoài vùng mâm

/** Mặt ốp: đĩa chia nhiều vòng (để uốn vồng), toạ độ ảnh phẳng theo XY; +Z hướng ra ngoài. */
function faceGeometry() {
  const g = new THREE.RingGeometry(0.0005, 1, 128, 32);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const r = Math.hypot(p.getX(i), p.getY(i)); p.setZ(i, DOME * (1 - r * r)); }
  g.computeVertexNormals();
  return g;
}

/** Thành viền: ống ngắn quanh mép, từ mặt ốp vòng vào trong mép mâm (che khe). */
function edgeGeometry() {
  const pts = [[0.965, -EDGE], [1.0, -EDGE * 0.6], [1.005, 0], [0.99, 0.004]].map(([r, z]) => new THREE.Vector2(r, z));
  return new THREE.LatheGeometry(pts, 128).rotateX(Math.PI / 2);
}

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
  const scene = useThree(s => s.scene), gl = useThree(s => s.gl);
  const map = useLoader(THREE.TextureLoader, COVER_TEXTURE);
  const geo = useMemo(() => ({ face: faceGeometry(), edge: edgeGeometry() }), []);
  const mat = useMemo(() => {
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = gl.capabilities.getMaxAnisotropy();
    return {
      // ảnh đã có sẵn bóng đổ / điểm sáng của thiết kế; thêm lớp phủ bóng nhẹ để mặt vồng bắt sáng khi xoay xe
      face: new THREE.MeshPhysicalMaterial({ map, transparent: true, alphaTest: 0.5, roughness: 0.55, clearcoat: 0.6, clearcoatRoughness: 0.2 }),
      edge: new THREE.MeshPhysicalMaterial({ color: '#141517', roughness: 0.45, clearcoat: 0.4 }),
    };
  }, [map, gl]);
  const wheels = useMemo(() => findWheels(scene), [scene]);
  useEffect(() => () => { Object.values(geo).forEach(g => g.dispose()); Object.values(mat).forEach(m => m.dispose()); }, [geo, mat]);
  const noRay = () => {};   // không chặn chuột: bấm vào ốp vẫn chọn được vùng phía sau
  return (
    <group visible={visible}>
      {wheels.map((w, i) => (
        // lắp đè ra ngoài mép mâm + thành lốp (đặt thấp hơn sẽ bị mép mâm che mất phần ngoài của ốp)
        <group key={i} position={[w.center.x + w.side * RIM_LIP, w.center.y, w.center.z]} rotation={[0, w.side * Math.PI / 2, 0]} scale={w.radius * 1.02}>
          <mesh geometry={geo.face} material={mat.face} castShadow receiveShadow raycast={noRay} />
          <mesh geometry={geo.edge} material={mat.edge} castShadow receiveShadow raycast={noRay} />
        </group>
      ))}
    </group>
  );
}
