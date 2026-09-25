// Tách model gốc thành các mesh theo vùng custom (shared/vf3-zones.js) và nén lại cho web.
// Chạy lại mỗi khi đổi cách chia vùng:  npm run bake
//
// Mỗi vùng thành 1 node có extras.zone = id vùng (GLTFLoader đưa vào userData.zone) — web chỉ việc gán vật liệu.
// Một vùng có thể gồm nhiều node (vd. thân xe lấy từ 2 mesh gốc có vật liệu khác nhau).
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, meshopt, textureCompress } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import * as THREE from 'three';
import { ZONES, segmentMesh } from '../shared/vf3-zones.js';
import { statSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const SRC = 'vinfast_vf3_plus_2026.glb';
const OUT = 'public/models/vf3.glb';
const ZONES_OUT = 'src/generated/zones.json';  // tên + nhóm vùng cho giao diện (không kéo code chia vùng xuống trình duyệt)

// tên attribute: module chia vùng dùng tên three.js cho position/normal, các attribute khác giữ nguyên tên glTF
const toThree = s => ({ POSITION: 'position', NORMAL: 'normal' })[s] || s;
const toGltf = n => ({ position: 'POSITION', normal: 'NORMAL' })[n] || n;

await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(SRC);
const root = doc.getRoot(), scene = root.listScenes()[0], buffer = root.listBuffers()[0];

const sources = [];
scene.traverse(node => { if (node.getMesh()) sources.push(node); });

const stats = {};
for (const node of sources) {
  const name = node.getName();
  const prims = node.getMesh().listPrimitives();
  if (prims.length !== 1) throw new Error(`${name}: cần đúng 1 primitive, có ${prims.length}`);
  const prim = prims[0];

  // glTF → BufferGeometry
  const geometry = new THREE.BufferGeometry();
  for (const sem of prim.listSemantics()) {
    const acc = prim.getAttribute(sem);
    geometry.setAttribute(toThree(sem), new THREE.BufferAttribute(acc.getArray().slice(), acc.getElementSize(), acc.getNormalized()));
  }
  const idx = prim.getIndices();
  if (idx) geometry.setIndex(new THREE.BufferAttribute(idx.getArray().slice(), 1));
  const matrixWorld = new THREE.Matrix4().fromArray(node.getWorldMatrix());
  const mesh = { name, geometry, matrixWorld };  // segmentMesh chỉ cần name, geometry, matrixWorld

  const { zoneOf } = segmentMesh(mesh);

  // gom tam giác theo vùng (geometry sau khi chia không có index: mỗi tam giác 3 đỉnh liên tiếp)
  const byZone = new Map();
  for (let v = 0; v < zoneOf.length; v += 3) {
    const id = zoneOf[v] < 0 ? 'none' : ZONES[zoneOf[v]].id;
    (byZone.get(id) || byZone.set(id, []).get(id)).push(v / 3);
  }
  for (const [id, tris] of byZone) {
    const out = doc.createPrimitive().setMaterial(prim.getMaterial());
    for (const [attrName, a] of Object.entries(mesh.geometry.attributes)) {
      const s = a.itemSize, arr = new a.array.constructor(tris.length * 3 * s);
      tris.forEach((t, i) => arr.set(a.array.subarray(t * 3 * s, (t + 1) * 3 * s), i * 3 * s));
      const type = { 1: 'SCALAR', 2: 'VEC2', 3: 'VEC3', 4: 'VEC4' }[s];
      out.setAttribute(toGltf(attrName), doc.createAccessor().setType(type).setArray(arr).setNormalized(a.normalized).setBuffer(buffer));
    }
    const m = doc.createMesh(`${id}__${name}`).addPrimitive(out);
    const n = doc.createNode(`${id}__${name}`).setMesh(m).setMatrix(node.getWorldMatrix()).setExtras({ zone: id });
    scene.addChild(n);
    stats[id] = (stats[id] || 0) + tris.length;
  }
  node.setMesh(null);
}

// bỏ cây node gốc (giờ chỉ còn node rỗng), hàn đỉnh, gộp dữ liệu trùng, texture PNG → WebP, nén meshopt
for (const child of scene.listChildren()) if (!child.getExtras().zone) child.dispose();
await doc.transform(
  weld(), dedup(), prune(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 88 }),
  meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
);

mkdirSync('public/models', { recursive: true });
await io.write(OUT, doc);
const mb = f => (statSync(f).size / 1048576).toFixed(2) + ' MB';
console.log(`${SRC} (${mb(SRC)}) → ${OUT} (${mb(OUT)})`);
mkdirSync('src/generated', { recursive: true });
writeFileSync(ZONES_OUT, JSON.stringify(ZONES.filter(z => stats[z.id]).map(({ id, name, group }) => ({ id, name, group })), null, 2) + '\n');
// mã phiên bản model: web tải /models/vf3.glb?v=<mã> → trình duyệt không dùng lại bản cũ trong bộ nhớ đệm
const version = createHash('sha1').update(readFileSync(OUT)).digest('hex').slice(0, 10);
writeFileSync('src/generated/model-version.json', JSON.stringify({ version }) + '\n');
console.log(`${ZONES_OUT}: ${Object.keys(stats).length} vùng · model v=${version}`);
console.log('tam giác theo vùng:', stats);
