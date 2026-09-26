// Xe VF3 đã chia vùng (public/models/vf3.glb, do `npm run bake` tạo). Mỗi mesh có userData.zone.
// Vùng chỉnh được dùng chung 1 MeshPhysicalMaterial/vùng; vùng còn lại giữ vật liệu gốc.
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { EDITABLE, isEditable, zoneInfo, type DesignConfig } from '../config/zones';
import { DECAL_TARGET_GROUPS } from '../config/decals';
import { decalTargets } from './targets';
import { FINISHES, METAL_ZONES } from '../config/finishes';
import { useDesign } from '../store/design';

import { MODEL_URL } from './modelUrl';
export { MODEL_URL };
const GLOW = new THREE.Color('#3cc8ff');  // cùng màu --accent
const CLICK_TOLERANCE = 4;                // px: kéo xoay xa hơn thì không tính là bấm chọn

interface CarProps {
  /** targets: các mesh nhận decal của chính xe này (bản trưng bày có danh sách riêng). */
  onLoaded?: (box: THREE.Box3, targets: THREE.Mesh[]) => void;
  /** Chế độ trưng bày (trang chủ): dùng bảng màu này thay cho thiết kế của người dùng, đổi màu mượt, không bắt chuột. */
  showcase?: DesignConfig;
}

const NO_CAST_SHADOW = ['mirror', 'mirrorBase'];

export function Car({ onLoaded, showcase }: CarProps) {
  const { scene: loaded } = useGLTF(MODEL_URL);
  // trang chủ có 2 khung 3D (hero + trình phối): bản trưng bày dùng bản sao, 1 đối tượng three.js chỉ gắn được 1 nơi
  const scene = useMemo(() => showcase ? loaded.clone(true) : loaded, [loaded, !!showcase]);  // eslint-disable-line react-hooks/exhaustive-deps
  const materials = useMemo(() => Object.fromEntries(EDITABLE.map(id =>
    [id, new THREE.MeshPhysicalMaterial({ emissive: GLOW, emissiveIntensity: 0 })])), []);

  useLayoutEffect(() => {
    const targets: THREE.Mesh[] = showcase ? [] : decalTargets;
    targets.length = 0;
    scene.updateMatrixWorld(true);
    scene.traverse(o => {
      if (!(o instanceof THREE.Mesh)) return;
      o.receiveShadow = true;
      // gương không đổ bóng lên thân xe (vệt tối ở cửa trước làm khó nhìn decal dán ở đó)
      o.castShadow = !NO_CAST_SHADOW.includes(o.userData.zone);
      if (isEditable(o.userData.zone)) o.material = materials[o.userData.zone];
      const group = zoneInfo(o.userData.zone)?.group;
      if (group && (DECAL_TARGET_GROUPS as readonly string[]).includes(group)) targets.push(o);
    });
    onLoaded?.(new THREE.Box3().setFromObject(scene), targets);
    if (import.meta.env.DEV && !showcase) Object.assign(window, { __car: scene });
  }, [scene, materials, onLoaded, showcase]);

  // màu + chất theo cấu hình (trưng bày: màu chuyển dần trong useFrame bên dưới)
  const userConfig = useDesign(s => s.config);
  const config = showcase ?? userConfig;
  const targetColors = useRef<Record<string, THREE.Color>>({});
  useEffect(() => {
    for (const [id, m] of Object.entries(materials)) {
      const style = config[id]; if (!style) continue;
      const base = FINISHES[style.finish] ?? FINISHES.gloss;
      const f = style.finish === 'gloss' && METAL_ZONES[id] ? { ...base, ...METAL_ZONES[id] } : base;
      if (showcase && targetColors.current[id]) targetColors.current[id].set(style.color);
      else { m.color.set(style.color); targetColors.current[id] = new THREE.Color(style.color); }
      Object.assign(m, { roughness: f.roughness, metalness: f.metalness, clearcoat: f.clearcoat, clearcoatRoughness: f.clearcoatRoughness });
      m.needsUpdate = true;
    }
  }, [config, materials, showcase]);

  // phát sáng: vùng đang rê sáng rõ; lúc bấm chọn loé 1 nhịp rồi tắt hẳn
  // (không giữ sáng khi bảng màu đang mở: lớp sáng xanh làm sai màu người dùng đang chọn)
  const lastPick = useRef<{ zone: string | null; at: number }>({ zone: null, at: 0 });
  useFrame((_, dt) => {
    if (showcase) {
      for (const [id, m] of Object.entries(materials)) { const c = targetColors.current[id]; if (c) m.color.lerp(c, 1 - Math.exp(-6 * dt)); }
      return;
    }
    const { hovered, selected } = useDesign.getState(), now = performance.now();
    if ((selected?.zone ?? null) !== lastPick.current.zone) lastPick.current = { zone: selected?.zone ?? null, at: now };
    for (const [id, m] of Object.entries(materials)) {
      const pulse = id === lastPick.current.zone ? Math.max(0, 1 - (now - lastPick.current.at) / 500) * 0.35 : 0;
      const target = id === hovered && id !== selected?.zone ? 0.22 : 0;
      m.emissiveIntensity = Math.max(pulse, THREE.MathUtils.damp(m.emissiveIntensity, target, 14, dt));
    }
  });

  const setHovered = useDesign(s => s.setHovered), select = useDesign(s => s.select);
  const zoneOf = (e: ThreeEvent<PointerEvent | MouseEvent>) => {
    const z = e.object.userData.zone;
    return isEditable(z) ? z : null;  // chỉ nhận vùng chỉnh được nếu nó là vật thể gần nhất (không chọn xuyên kính, đèn…)
  };

  if (showcase) return <primitive object={scene} />;
  return (
    <primitive
      object={scene}
      // chế độ decal: chuột do DecalController xử lý, xe không sáng vùng / không mở bảng màu
      onPointerMove={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHovered(useDesign.getState().mode === 'paint' ? zoneOf(e) : null); }}
      onPointerOut={() => setHovered(null)}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (e.delta > CLICK_TOLERANCE || useDesign.getState().mode !== 'paint') return;
        const zone = zoneOf(e);
        select(zone ? { zone, x: e.nativeEvent.clientX, y: e.nativeEvent.clientY } : null);
      }}
    />
  );
}

useGLTF.preload(MODEL_URL);
