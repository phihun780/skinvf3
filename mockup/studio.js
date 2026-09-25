// Studio 3D dùng chung cho trang chủ và trình phối: nạp model, chia vùng, vật liệu theo vùng,
// ánh sáng studio tối, sàn đổ bóng, góc camera có chuyển động, chụp ảnh.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ZONES, segmentMesh } from '../shared/vf3-zones.js';
import { FINISHES, EDITABLE } from './data.js';

const MODEL_URL = '../vinfast_vf3_plus_2026.glb';

export const VIEWS = {
  front34: { label: '3/4 trước', dir: [0.9, 0.3, 1] },
  front:   { label: 'Trước',     dir: [0, 0.12, 1] },
  side:    { label: 'Bên',       dir: [1, 0.1, 0] },
  rear:    { label: 'Sau',       dir: [0, 0.14, -1] },
  rear34:  { label: '3/4 sau',   dir: [-0.9, 0.3, -1] },
  top:     { label: 'Trên',      dir: [0.001, 1, 0.3] },
};

const ease = t => t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

// Bóng tiếp xúc mềm dưới gầm: ellipse gradient vẽ bằng canvas
function contactShadowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), grd = g.createRadialGradient(128, 128, 10, 128, 128, 128);
  grd.addColorStop(0, 'rgba(0,0,0,0.85)'); grd.addColorStop(0.55, 'rgba(0,0,0,0.35)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}
// Vệt sáng sân khấu trên sàn
function stageTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d'), grd = g.createRadialGradient(256, 256, 0, 256, 256, 256);
  grd.addColorStop(0, 'rgba(255,255,255,0.10)'); grd.addColorStop(0.6, 'rgba(255,255,255,0.03)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 512, 512);
  return new THREE.CanvasTexture(c);
}

// Tách 1 mesh gốc thành các mesh con theo vùng (geometry không index → mỗi tam giác 3 đỉnh liên tiếp)
function splitByZone(mesh, zoneOf) {
  const byZone = new Map();
  for (let v = 0; v < zoneOf.length; v += 3) { const z = zoneOf[v]; (byZone.get(z) || byZone.set(z, []).get(z)).push(v / 3); }
  const out = [];
  for (const [z, tris] of byZone) {
    const g = new THREE.BufferGeometry();
    for (const [name, a] of Object.entries(mesh.geometry.attributes)) {
      if (name === 'color') continue;
      const s = a.itemSize, arr = new a.array.constructor(tris.length * 3 * s);
      tris.forEach((t, i) => arr.set(a.array.subarray(t * 3 * s, (t + 1) * 3 * s), i * 3 * s));
      g.setAttribute(name, new THREE.BufferAttribute(arr, s, a.normalized));
    }
    out.push({ zone: z < 0 ? null : ZONES[z].id, geometry: g });
  }
  return out;
}

export async function createStudio(container, { onProgress = () => {}, interactive = true } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.02).texture;
  scene.environmentIntensity = 0.85;

  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(2.5, 6, 3.5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 0.5, far: 15 });
  key.shadow.bias = -0.0004;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xbfd4ff, 0.6);  // viền sáng phía sau
  rim.position.set(-3, 3, -5); scene.add(rim);

  const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 60);
  const controls = new OrbitControls(camera, renderer.domElement);
  Object.assign(controls, { enableDamping: true, dampingFactor: 0.08, enablePan: false, minPolarAngle: 0.15, maxPolarAngle: Math.PI / 2 - 0.04, autoRotateSpeed: 0.8 });
  controls.enabled = interactive;
  controls.addEventListener('start', () => { tween = null; });  // người dùng kéo xoay → huỷ chuyển góc đang chạy

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container); resize();

  // ---- model
  const gltf = await new GLTFLoader().loadAsync(MODEL_URL, e => e.total && onProgress(0.4 * e.loaded / e.total, 'Đang tải model…'));
  const root = gltf.scene;
  root.updateMatrixWorld(true);
  const originals = []; root.traverse(o => o.isMesh && originals.push(o));
  const zoneMats = {}, pickables = [];
  for (let i = 0; i < originals.length; i++) {
    const o = originals[i];
    onProgress(0.4 + 0.6 * i / originals.length, 'Đang chia vùng…');
    await new Promise(r => setTimeout(r));  // nhả luồng để thanh tiến trình kịp vẽ
    const { zoneOf } = segmentMesh(o);
    for (const { zone, geometry } of splitByZone(o, zoneOf)) {
      let mat = o.material;
      if (EDITABLE.includes(zone)) {
        mat = zoneMats[zone] ||= new THREE.MeshPhysicalMaterial({ side: o.material.side, emissive: 0xd8b775, emissiveIntensity: 0 });
      }
      const m = new THREE.Mesh(geometry, mat);
      m.position.copy(o.position); m.quaternion.copy(o.quaternion); m.scale.copy(o.scale);
      m.castShadow = true; m.receiveShadow = true;
      m.userData.zone = zone;
      o.parent.add(m);
      if (EDITABLE.includes(zone)) pickables.push(m);
    }
    o.parent.remove(o);
  }
  scene.add(root);
  root.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
  const floorY = box.min.y;
  const target = new THREE.Vector3(center.x, floorY + size.y * 0.42, center.z);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.35 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = floorY; floor.receiveShadow = true; scene.add(floor);
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(size.x * 1.25, size.z * 1.12),
    new THREE.MeshBasicMaterial({ map: contactShadowTexture(), transparent: true, depthWrite: false }));
  contact.rotation.x = -Math.PI / 2; contact.position.set(center.x, floorY + 0.002, center.z); scene.add(contact);
  const stage = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 5.5),
    new THREE.MeshBasicMaterial({ map: stageTexture(), transparent: true, depthWrite: false }));
  stage.rotation.x = -Math.PI / 2; stage.position.set(center.x, floorY + 0.001, center.z); scene.add(stage);

  // ---- camera
  // Khoảng lùi để 8 góc hộp bao của xe nằm gọn trong khung: |x| ≤ fillX, |y| ≤ fillY (toạ độ NDC)
  const corners = [];
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) corners.push(new THREE.Vector3(x, y, z));
  const fitCam = camera.clone(), pv = new THREE.Vector3();
  function fitDistance(dir, aspect, fillX, fillY) {
    fitCam.aspect = aspect; fitCam.updateProjectionMatrix();
    let lo = 0.3, hi = 40;
    for (let i = 0; i < 28; i++) {
      const mid = (lo + hi) / 2;
      fitCam.position.copy(target).addScaledVector(dir, mid); fitCam.lookAt(target); fitCam.updateMatrixWorld();
      const fits = corners.every(c => { pv.copy(c).project(fitCam); return Math.abs(pv.x) <= fillX && Math.abs(pv.y) <= fillY; });
      if (fits) hi = mid; else lo = mid;
    }
    return hi;
  }
  // Mặc định chừa chỗ cho 2 panel hai bên trình phối (xe chiếm ~ giữa khung)
  let frame = { fillX: 0.5, fillY: 0.62 };
  let tween = null;
  function viewPosition(name, aspect = camera.aspect, fill = frame) {
    const d = new THREE.Vector3(...VIEWS[name].dir).normalize();
    return target.clone().addScaledVector(d, fitDistance(d, aspect, fill.fillX, fill.fillY));
  }
  function setView(name, animate = true) {
    const to = viewPosition(name);
    if (!animate) { camera.position.copy(to); controls.target.copy(target); controls.update(); return; }
    const a = new THREE.Spherical().setFromVector3(camera.position.clone().sub(target));
    const b = new THREE.Spherical().setFromVector3(to.clone().sub(target));
    let dt = b.theta - a.theta; if (dt > Math.PI) dt -= 2 * Math.PI; if (dt < -Math.PI) dt += 2 * Math.PI;
    tween = { a, b, dt, t0: performance.now(), dur: 900 };
  }
  camera.position.copy(viewPosition('front34')); controls.target.copy(target); controls.update();
  const home = camera.position.distanceTo(target);
  controls.minDistance = home * 0.45; controls.maxDistance = home * 1.8;

  // ---- vật liệu
  function applyZone(id, { color, finish }) {
    const m = zoneMats[id]; if (!m) return;
    const f = FINISHES[finish] || FINISHES.gloss;
    m.color.set(color);
    m.roughness = f.roughness; m.metalness = f.metalness;
    m.clearcoat = f.clearcoat; m.clearcoatRoughness = f.clearcoatRoughness;
    m.iridescence = f.iridescence || 0; m.iridescenceIOR = f.iridescenceIOR || 1.3;
    m.needsUpdate = true;
  }
  function applyConfig(cfg) { for (const [id, v] of Object.entries(cfg)) applyZone(id, v); }

  // ---- chọn / làm nổi vùng
  let hoverZone = null; const pulses = new Map();
  function pulse(id) { if (zoneMats[id]) pulses.set(id, performance.now()); }
  function setHover(id) { hoverZone = id; }
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick(clientX, clientY) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    // chỉ nhận vùng chỉnh được nếu nó là vật thể gần nhất (không chọn xuyên qua kính, đèn…)
    const hit = ray.intersectObjects(root.children.length ? [root] : [], true)[0];
    return hit && EDITABLE.includes(hit.object.userData.zone) ? hit.object.userData.zone : null;
  }

  // ---- ảnh chụp (dùng cho thẻ mẫu và poster)
  function snapshot(view, w, h, type = 'image/jpeg') {
    const prevPos = camera.position.clone(), prevTarget = controls.target.clone(), prevAspect = camera.aspect;
    const prevSize = renderer.getSize(new THREE.Vector2()), prevRatio = renderer.getPixelRatio();
    renderer.setPixelRatio(1); renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    camera.position.copy(viewPosition(view, w / h, { fillX: 0.86, fillY: 0.8 })); camera.lookAt(target);
    renderer.render(scene, camera);
    const url = renderer.domElement.toDataURL(type, 0.9);
    renderer.setPixelRatio(prevRatio); renderer.setSize(prevSize.x, prevSize.y, false);
    camera.aspect = prevAspect; camera.updateProjectionMatrix();
    camera.position.copy(prevPos); controls.target.copy(prevTarget); controls.update();
    renderer.render(scene, camera);
    return url;
  }

  renderer.setAnimationLoop(now => {
    if (tween) {
      const t = Math.min(1, (now - tween.t0) / tween.dur), k = ease(t), { a, b, dt } = tween;
      const s = new THREE.Spherical(a.radius + (b.radius - a.radius) * k, a.phi + (b.phi - a.phi) * k, a.theta + dt * k);
      camera.position.setFromSpherical(s).add(target); controls.target.copy(target);
      if (t === 1) tween = null;
    }
    for (const [id, m] of Object.entries(zoneMats)) {
      const t0 = pulses.get(id), p = t0 ? Math.max(0, 1 - (now - t0) / 700) : 0;
      if (t0 && p === 0) pulses.delete(id);
      m.emissiveIntensity = Math.max(p * 0.55, id === hoverZone ? 0.12 : 0);
    }
    controls.update();
    renderer.render(scene, camera);
  });
  onProgress(1, 'Sẵn sàng');

  return {
    renderer, scene, camera, controls,
    setView, applyZone, applyConfig, pick, pulse, setHover, snapshot,
    setAutoRotate: on => { controls.autoRotate = on; },
    setFrame: f => { frame = f; },  // chỉnh phần khung dành cho xe (vd. trang chủ đặt xe lệch phải)
    stopTween: () => { tween = null; },
  };
}
