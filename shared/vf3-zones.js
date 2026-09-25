// Chia model VF3 thành các vùng custom — dùng chung cho trang bóc tách (inspect/) và mockup/.
// Đã duyệt với chủ dự án: xem PLAN.md.
import * as THREE from 'three';

// group: 'paint' sơn | 'trim' ốp nhựa | 'wheel' bánh xe | 'detail' chi tiết | null = không cho custom
// Đề xuất vùng custom. Số trong mảng = id mảng rời trong mesh đó.
// Bánh xe: 4 bánh nằm chung Object_4, mỗi bánh 17 mảng theo cùng thứ tự → `wheel` là offset trong 17 mảng.
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
export const ZONES = [
  // + Object_7 #3/#4: tấm lót khuất sau dải thân, chỉ lộ 1 khe mảnh ngay dưới dải thân → theo màu thân (chủ dự án chọn)
  // + gờ trên cản trước (Object_7 #11 phía cản của rãnh, cao hơn BUMPER_SEAM_Y): xe thật cùng màu thân (chủ dự án gộp)
  { id:'body', group:'paint', name:'Thân xe (sơn chính)',        debugColor:'#3b82f6', pick:{ Object_5:[0,1,4,5,6,7,8,9], Object_7:[3,4,11] },
    where: (c, t, mesh, comp) => !(mesh === 'Object_7' && comp === 11) || (!t.flare && !t.cheek && c.y > BUMPER_SEAM_Y) },
  { id:'hood', group:'paint', name:'Nắp capo',                    debugColor:'#22d3ee', pick:{ Object_5:[2] } },
  { id:'roof', group:'paint', name:'Nóc xe + cánh gió sau',       debugColor:'#f43f5e', pick:{ Object_5:[3] } },
  { id:'mirror', group:'trim', name:'Vỏ gương',                    debugColor:'#facc15', pick:{ Object_7:[5,6] } },
  { id:'mirrorBase', group:'trim', name:'Chân gương',                  debugColor:'#a3e635', pick:{ Object_7:[7,8] } },
  { id:'aPillar', group:'trim', name:'Ốp tam giác trụ A',           debugColor:'#c084fc', pick:{ Object_7:[0,1] } },
  // Cản trước và ốp vòm dính chung 1 mảng (Object_7 #11), chỉ ngăn bởi rãnh dựng hình (GROOVES).
  // Gờ trên cản (phía cản của rãnh, cao hơn BUMPER_SEAM_Y) thuộc thân xe; phần còn lại (cản dưới + ốp vòm trước) là 1 vùng.
  { id:'bumperF', group:'trim', name:'Cản dưới + ốp vòm trước',       debugColor:'#fb923c', pick:{ Object_7:[11] } },
  { id:'bumperR', group:'trim', name:'Cản sau + ốp vòm bánh sau',   debugColor:'#f97316', pick:{ Object_7:[12] } },
  { id:'skirt', group:'trim', name:'Ốp sườn (bậc cửa)',           debugColor:'#14b8a6', pick:{ Object_7:[9,10] } },
  // Ca-lăng: #2 mặt lưới có cụm đèn.
  { id:'grille', group:'trim', name:'Ca-lăng',                     debugColor:'#94a3b8', pick:{ Object_7:[2] } },
  // Ốp cản dưới trước: #13/#14 khoang lưới dưới (chỗ biển số), #16–45 nan hốc gió 2 đầu khoang.
  { id:'lowerF', group:'trim', name:'Ốp cản dưới trước',           debugColor:'#0ea5e9', pick:{ Object_7:[13,14,...range(16,45)] } },
  { id:'lowerR', group:'trim', name:'Ốp cản dưới sau',             debugColor:'#64748b', pick:{ Object_7:[15] } },
  { id:'tire', group:'wheel', name:'Lốp',                          debugColor:'#334155', wheel:[8] },
  { id:'rim', group:'wheel', name:'Mâm (la-zăng)',                debugColor:'#e879f9', wheel:[9] },
  { id:'hub', group:'wheel', name:'Moay-ơ (sau mâm)',             debugColor:'#4ade80', wheel:[7] },
  { id:'caliper', group:'wheel', name:'Cùm phanh (heo dầu)',          debugColor:'#ef4444', wheel:[0,1,2,3,4] },
  { id:'disc', group:'wheel', name:'Đĩa phanh',                    debugColor:'#cbd5e1', wheel:[5,6] },
  { id:'nuts', group:'wheel', name:'Ốc bánh + van',                debugColor:'#fde68a', wheel:range(10,16) },
  { id:'glass', group:'detail', name:'Kính xe',                      debugColor:'#1e3a5f', pick:{ Object_6:'all' } },
  { id:'chrome', group:'detail', name:'Nẹp chrome + logo V',          debugColor:'#e5e7eb', pick:{ Object_8:'all' } },
  { id:'lights', group:null, name:'Cụm đèn',                      debugColor:'#fef08a', pick:{ Object_9:'all', Object_10:'all', Object_12:'all', Object_13:'all', Object_15:'all', Object_16:'all', Object_17:'all', Object_18:'all' } },
  { id:'misc', group:null, name:'Khác (biển số, tấm gầm)',      debugColor:'#6b7280', pick:{ Object_11:'all', Object_14:'all' } },
];
// tags: nhãn theo tam giác từ các đường cắt { flare } (xem segmentMesh); where(trọng tâm, tags, tên mesh, id mảng)
export function zoneOfComp(meshName, comp, centroid, tags = {}) {
  for (let z = 0; z < ZONES.length; z++) {
    const Z = ZONES[z];
    if (Z.wheel && meshName === 'Object_4' && Z.wheel.includes(comp % 17)) return z;
    const sel = Z.pick && Z.pick[meshName];
    if ((sel === 'all' || (sel && sel.includes(comp))) && (!Z.where || Z.where(centroid, tags, meshName, comp))) return z;
  }
  return -1;
}

// Tách mesh thành các mảng liền nhau (gộp đỉnh trùng vị trí rồi union-find theo tam giác)
export function components(geo) {
  const pos = geo.attributes.position, n = pos.count;
  const key = new Map(), weld = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    const k = Math.round(pos.getX(i)*1e4)+','+Math.round(pos.getY(i)*1e4)+','+Math.round(pos.getZ(i)*1e4);
    let w = key.get(k); if (w === undefined) { w = key.size; key.set(k, w); } weld[i] = w;
  }
  const par = new Int32Array(key.size).map((_, i) => i);
  const find = x => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  const idx = geo.index ? geo.index.array : [...Array(n).keys()];
  for (let t = 0; t < idx.length; t += 3) {
    const a = find(weld[idx[t]]), b = find(weld[idx[t+1]]), c = find(weld[idx[t+2]]);
    par[b] = a; par[find(c)] = a;
  }
  const rootId = new Map(), compOf = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    const r = find(weld[i]); let c = rootId.get(r);
    if (c === undefined) { c = rootId.size; rootId.set(r, c); } compOf[i] = c;
  }
  const compTris = new Array(rootId.size).fill(0);
  for (let t = 0; t < idx.length; t += 3) compTris[compOf[idx[t]]]++;
  return { compOf, compCount: rootId.size, compTris };
}


// Rãnh ngăn cản trước / ốp vòm trước: không có seam trong lưới, chỉ là rãnh dựng hình.
// `pts` = đáy rãnh dò bằng độ lõm bề mặt (toạ độ world), từ dưới lên: đoạn dưới gần như thẳng đứng,
// đoạn trên chéo về phía vòm bánh rồi chạm mép trên của cản.
// Hệ trục cục bộ: S = ngang bề mặt chỉ sang phía ốp vòm, D = hướng mặt ngoài góc cản, Y = lên.
// Điểm dò lệch vài mm qua lại → khớp đa thức bậc 4 theo y để có đường cong trơn (sai số ≤ ~3.5mm),
// ngoài khoảng dò thì kéo dài tuyến tính theo độ dốc ở đầu mút để vết cắt đứt qua mép trên/dưới.
// Mặt cắt = đường cong kéo theo D.
const GROOVE_BAND = 0.06;  // chỉ cắt tam giác có đỉnh cách đường rãnh < 6cm
function fitPoly(xs, ys, deg) {  // bình phương tối thiểu, biến chuẩn hoá t = (x - 0.5) / 0.25
  const n = deg + 1, A = Array.from({ length: n }, () => new Array(n + 1).fill(0));
  xs.forEach((x, k) => { const t = (x - 0.5) / 0.25, pw = Array.from({ length: n }, (_, i) => t ** i);
    for (let i = 0; i < n; i++) { for (let j = 0; j < n; j++) A[i][j] += pw[i] * pw[j]; A[i][n] += pw[i] * ys[k]; } });
  for (let i = 0; i < n; i++) {
    let m = i; for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[m][i])) m = r;
    [A[i], A[m]] = [A[m], A[i]];
    for (let r = 0; r < n; r++) if (r !== i) { const f = A[r][i] / A[i][i]; for (let c = i; c <= n; c++) A[r][c] -= f * A[i][c]; }
  }
  const c = A.map((row, i) => row[n] / row[i]);
  return x => c.reduce((s, ci, i) => s + ci * ((x - 0.5) / 0.25) ** i, 0);
}
function smoothCurve(poly, lo, hi) {  // đa thức trong [lo, hi], tuyến tính ngoài khoảng
  const h = 1e-3, sLo = (poly(lo + h) - poly(lo)) / h, sHi = (poly(hi) - poly(hi - h)) / h;
  return y => y < lo ? poly(lo) + sLo * (y - lo) : y > hi ? poly(hi) + sHi * (y - hi) : poly(y);
}
const GROOVES = [
  { S:[0.77,0,-0.64], D:[0.64,0,0.77], pts:[[0.755,0.30,1.283],[0.756,0.33,1.281],[0.764,0.38,1.294],[0.774,0.42,1.304],[0.781,0.50,1.310],[0.782,0.54,1.308],[0.783,0.60,1.297],[0.783,0.63,1.283],[0.783,0.67,1.254],[0.782,0.69,1.244],[0.779,0.701,1.234],[0.778,0.716,1.218],[0.771,0.735,1.204],[0.768,0.753,1.186]] },
  { S:[-0.77,0,-0.64], D:[-0.64,0,0.77], pts:[[-0.811,0.32,1.275],[-0.813,0.33,1.273],[-0.823,0.39,1.287],[-0.831,0.42,1.295],[-0.836,0.48,1.308],[-0.839,0.51,1.302],[-0.839,0.54,1.300],[-0.839,0.60,1.291],[-0.840,0.65,1.265],[-0.838,0.70,1.224],[-0.835,0.72,1.210],[-0.830,0.734,1.195],[-0.824,0.753,1.178]] },
].map(g => {
  const S = new THREE.Vector3(...g.S), D = new THREE.Vector3(...g.D), pts = g.pts.map(p => new THREE.Vector3(...p));
  const ys = pts.map(p => p.y), lo = ys[0], hi = ys[ys.length - 1];
  const W = smoothCurve(fitPoly(ys, pts.map(p => p.dot(S)), 4), lo, hi);  // vị trí ngang của rãnh theo độ cao
  const U = smoothCurve(fitPoly(ys, pts.map(p => p.dot(D)), 2), lo, hi);  // độ sâu theo D (chỉ dùng đo khoảng cách)
  const curve = []; for (let y = 0.20; y <= 0.80; y += 0.004) curve.push(S.clone().multiplyScalar(W(y)).addScaledVector(D, U(y)).setY(y));
  const box = new THREE.Box3().setFromPoints(curve).expandByScalar(GROOVE_BAND + 0.03);  // loại nhanh điểm ở xa
  return { S, W, curve, box };
});

// Khoảng cách tới đường rãnh gần nhất → { g, d }.
function nearestGroove(p) {
  let best = { g: null, d: Infinity };
  for (const g of GROOVES) { if (!g.box.containsPoint(p)) continue; for (const c of g.curve) { const d = c.distanceToSquared(p); if (d < best.d) best = { g, d }; } }
  best.d = Math.sqrt(best.d); return best;
}
// Giá trị trường cắt tại điểm world theo rãnh g: >0 phía ốp vòm, <0 phía cản.
const grooveValue = (g, p) => p.dot(g.S) - g.W(p.y);

// Trường cắt theo rãnh cho cả tam giác (3 đỉnh world) → 3 giá trị, hoặc null nếu tam giác xa rãnh.
// Cả tam giác dùng chung 1 rãnh, kể cả đỉnh nằm ngoài dải, để không sót tam giác to.
function grooveTriField(ws) {
  const near = ws.map(nearestGroove).filter(r => r.d < GROOVE_BAND).sort((a, b) => a.d - b.d)[0];
  return near ? ws.map(w => grooveValue(near.g, w)) : null;
}

// Đường nối gờ trên cản trước / cản dưới (theo xe thật: gờ tròn màu thân, cản dưới nhựa đen).
// Trên model không có rãnh ở đây; mép dưới của gờ tròn = mép trên khoang lưới dưới, nằm ngang ở y ≈ 0.58
// suốt chiều ngang đầu xe → cắt bằng mặt phẳng ngang, ở 2 góc cản nó nối dài mép khoang lưới ra tới ốp vòm.
const BUMPER_SEAM_Y = 0.58;
const bumperSeamTriField = ws => ws.map(w => w.y - BUMPER_SEAM_Y);

// Cắt đôi các tam giác của mảng `comp` nơi trường `triField(3 đỉnh world)` đổi dấu; nội suy mọi attribute.
// Trả về geometry mới + comp của từng đỉnh (tam giác con thừa hưởng comp của tam giác gốc).
function sliceByField(geo, compOf, comp, matrixWorld, triField) {
  const names = Object.keys(geo.attributes), A = names.map(n => geo.attributes[n]);
  const out = names.map(() => []), outComp = [];
  const P = geo.attributes.position, n = P.count;
  const vert = i => A.map(a => Array.from(a.array.subarray(i * a.itemSize, (i + 1) * a.itemSize)));
  const lerp = (x, y, t) => x.map((arr, k) => arr.map((q, j) => q + (y[k][j] - q) * t));
  const emit = (poly, c) => { for (let k = 1; k + 1 < poly.length; k++) for (const w of [poly[0], poly[k], poly[k+1]]) { w.forEach((val, j) => out[j].push(...val)); outComp.push(c); } };
  for (let t = 0; t < n; t += 3) {
    const c = compOf[t], vs = [vert(t), vert(t+1), vert(t+2)];
    const d = c !== comp ? null : triField([0, 1, 2].map(k => new THREE.Vector3().fromBufferAttribute(P, t + k).applyMatrix4(matrixWorld)));
    if (!d || d.every(x => x >= 0) || d.every(x => x <= 0)) { emit(vs, c); continue; }
    const pos = [], neg = [];
    for (let k = 0; k < 3; k++) {
      const k2 = (k + 1) % 3;
      (d[k] >= 0 ? pos : neg).push(vs[k]);
      if ((d[k] > 0 && d[k2] < 0) || (d[k] < 0 && d[k2] > 0)) {
        const m = lerp(vs[k], vs[k2], d[k] / (d[k] - d[k2])); pos.push(m); neg.push(m);
      }
    }
    emit(pos, c); emit(neg, c);
  }
  const g = new THREE.BufferGeometry();
  names.forEach((nm, j) => g.setAttribute(nm, new THREE.BufferAttribute(new A[j].array.constructor(out[j]), A[j].itemSize, A[j].normalized)));
  return { geo: g, compOf: Int32Array.from(outComp) };
}

const MIRROR_X = -0.0285;  // mặt phẳng đối xứng trái/phải (model lệch tâm: rãnh ốp vòm trái x = 0.782, phải x = -0.839)

// Loang theo cạnh chung giữa các tam giác của mảng `comp` từ các hạt giống (điểm world),
// không băng qua vết cắt: 2 tam giác kề nhau mà `side(3 đỉnh world)` trái dấu thì không nối.
// `allow(t, 3 đỉnh world)` giới hạn tam giác được loang. Trả về Uint8Array theo tam giác: 1 = loang tới.
function floodRegion(geo, compOf, comp, matrixWorld, seeds, side, allow = () => true) {
  const P = geo.attributes.position, nT = P.count / 3, v = new THREE.Vector3();
  const W = []; for (let i = 0; i < P.count; i++) W.push(v.fromBufferAttribute(P, i).applyMatrix4(matrixWorld).clone());
  const key = p => `${Math.round(p.x*1e4)},${Math.round(p.y*1e4)},${Math.round(p.z*1e4)}`;
  const s = new Float32Array(nT).fill(NaN), edgeTris = new Map(), tris = [];
  for (let t = 0; t < nT; t++) {
    if (compOf[t*3] !== comp || !allow(t, [W[t*3], W[t*3+1], W[t*3+2]])) continue; tris.push(t);
    s[t] = side([W[t*3], W[t*3+1], W[t*3+2]]);
    for (let e = 0; e < 3; e++) {
      const a = key(W[t*3+e]), b = key(W[t*3+(e+1)%3]), k = a < b ? a + '|' + b : b + '|' + a;
      (edgeTris.get(k) || edgeTris.set(k, []).get(k)).push(t);
    }
  }
  const cen = t => new THREE.Vector3().add(W[t*3]).add(W[t*3+1]).add(W[t*3+2]).divideScalar(3);
  const reached = new Uint8Array(nT), queue = [];
  for (const seed of seeds) {
    const sp = new THREE.Vector3(...seed); let start = -1, bd = Infinity;
    for (const t of tris) { const d = cen(t).distanceTo(sp); if (d < bd) { bd = d; start = t; } }
    if (start >= 0 && !reached[start]) { reached[start] = 1; queue.push(start); }
  }
  while (queue.length) {
    const t = queue.pop();
    for (let e = 0; e < 3; e++) {
      const a = key(W[t*3+e]), b = key(W[t*3+(e+1)%3]);
      for (const u of edgeTris.get(a < b ? a + '|' + b : b + '|' + a)) {
        if (reached[u] || s[t] * s[u] < 0) continue;  // hai bên vết cắt → không nối
        reached[u] = 1; queue.push(u);
      }
    }
  }
  return reached;
}
// Dấu của tam giác (tại trọng tâm) so với đường cắt nếu tam giác nằm gần đường cắt, NaN nếu xa.
const centroid = ws => new THREE.Vector3().add(ws[0]).add(ws[1]).add(ws[2]).divideScalar(3);

// "Má" cản ở 2 góc đầu xe (theo nét chủ dự án vẽ trên ảnh nhìn thẳng của trang bóc tách): góc dưới-ngoài của dải thân
// được bo theo một đường cong từ mép ngoài dải thân (ngang tầm giữa dải) cong xuống mép dưới dải thân; phần phía ngoài
// đường cong thuộc ốp vòm / cản dưới. Camera tham chiếu = góc "Trước" của trang bóc tách ở khung 1086×704
// (fov 35, từ [-0.0204, 0.8566, 4.980] nhìn [-0.0204, 0.8566, -0.317]); mặt cắt = tia camera qua nét.
// Nét gốc vẽ trên ảnh phóng to hơn, đã quy đổi theo mốc thân xe (tâm, bề ngang ốp vòm, mép trên hốc gió dưới).
// Bên phải xe dùng đối xứng qua MIRROR_X.
const CHEEK = (() => {
  const W = 1086, H = 704;
  const cam = new THREE.PerspectiveCamera(35, W / H, 0.01, 100);
  cam.position.set(-0.0204, 0.8566, 4.980); cam.lookAt(-0.0204, 0.8566, -0.317); cam.updateMatrixWorld();
  // Nét của góc bên phải ảnh (= bên trái xe, +X; bên kia dùng đối xứng), từ trên xuống — theo nét vẽ lần 2 của chủ dự án:
  // bắt đầu ở mép trên dải cản (chỗ gặp mảng thân phía trên), cong đều xuống, chạm mép dưới dải ở x ≈ 737.
  // Đầu kéo dài lên trên, cuối kéo dài xuống dưới mép dải để vết cắt đứt hẳn.
  const ctrl = [[779, 340], [777.5, 355], [776, 367], [773, 387], [765.6, 407], [753, 424], [737, 435], [715, 441], [690, 447], [660, 456]];
  const px = [];
  for (let i = 0; i + 1 < ctrl.length; i++) {
    const p0 = ctrl[Math.max(0, i - 1)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(ctrl.length - 1, i + 2)];
    for (let k = 0; k < 8; k++) {
      const t = k / 8, t2 = t * t, t3 = t2 * t;
      px.push([0, 1].map(j => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  px.push(ctrl[ctrl.length - 1]);
  return { cam, px, W, H };
})();
const mirrorX = p => p.x < MIRROR_X ? new THREE.Vector3(2 * MIRROR_X - p.x, p.y, p.z) : p;
const inCheekArea = p => { const q = mirrorX(p); return q.x > 0.45 && q.y > 0.5 && q.y < 0.85 && q.z > 1.05; };
// khoảng cách có dấu (pixel) tới nét: > 0 phía má (ngoài / dưới nét, phía ốp vòm)
function cheekValue(p) {
  const v = mirrorX(p).clone().project(CHEEK.cam), x = (v.x + 1) / 2 * CHEEK.W, y = (1 - v.y) / 2 * CHEEK.H;
  let best = Infinity, sign = 1;
  for (let k = 0; k + 1 < CHEEK.px.length; k++) {
    const [ax, ay] = CHEEK.px[k], [bx, by] = CHEEK.px[k + 1], dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
    const d = Math.hypot(x - ax - t * dx, y - ay - t * dy);
    if (d < best) { best = d; sign = -(Math.sign(dx * (y - ay) - dy * (x - ax)) || 1); }
  }
  return best * sign;
}
const cheekTriField = ws => ws.every(inCheekArea) ? ws.map(cheekValue) : null;
const grooveSide = ws => {
  const near = ws.map(nearestGroove).sort((a, b) => a.d - b.d)[0];
  return near.d < GROOVE_BAND + 0.02 ? Math.sign(grooveValue(near.g, centroid(ws))) : NaN;
};

// Dải thân quanh ca-lăng (#9) và tai xe (#0 trái / #1 phải) là 2 tấm dày ~2–3cm đặt đối đầu ở góc đầu xe; xe thật
// liền tấm. Chỗ ghép hiện thành 1 đường vì: mép tai xe có gờ cuộn mép mảnh (hướng khác hẳn mặt xung quanh nên
// bắt sáng), và mặt ngoài 2 tấm lệch hướng nhau ~20–30°. Xử lý:
//  1. Đỉnh sát chỗ ghép (cách tấm kia < JOINT_R) lệch khỏi mặt ngoài xung quanh không quá MAX_DEPTH (gờ nhô lên
//     hoặc rãnh lõm xuống) được ép về đúng mặt ngoài đó, nhận pháp tuyến của mặt đó. Mặt phẳng cục bộ dựng từ
//     các đỉnh mặt ngoài của cả 2 tấm ở xa chỗ ghép hơn. Mặt trong tấm (sâu hơn) giữ nguyên.
//     Mặt đầu bo sâu hơn (< 3cm) không dời nhưng cũng nhận pháp tuyến mặt ngoài để kẽ nhỏ còn sót không lộ màu tối.
//  2. Trộn pháp tuyến mặt ngoài của 2 tấm trong BLEND_R quanh chỗ ghép (sát chỗ ghép trộn mạnh nhất) để ánh
//     sáng chuyển liền mạch.
function flattenSeam(mesh, compOf, pairs, { JOINT_R = 0.012, REF_R = 0.035, MAX_DEPTH = 0.008, BLEND_R = 0.04 } = {}) {
  const P = mesh.geometry.attributes.position, N = mesh.geometry.attributes.normal;
  const M = mesh.matrixWorld, inv = M.clone().invert(), nm = new THREE.Matrix3().getNormalMatrix(M);
  const W = [], WN = [], pair = [], H = 0.02, grid = new Map(), cell = v => `${Math.floor(v.x / H)},${Math.floor(v.y / H)},${Math.floor(v.z / H)}`;
  for (let i = 0; i < P.count; i++) {
    W.push(new THREE.Vector3().fromBufferAttribute(P, i).applyMatrix4(M));
    WN.push(new THREE.Vector3().fromBufferAttribute(N, i).applyMatrix3(nm).normalize());
    // cặp theo mảng + phía xe (#9 chạy qua cả 2 bên: nửa trái ghép với #0, nửa phải với #1)
    const side = W[i].x > MIRROR_X ? 'L' : 'R';
    pair.push(pairs.findIndex(pr => pr.side === side && pr.comps.includes(compOf[i])));
    if (pair[i] < 0) continue;
    const k = cell(W[i]); (grid.get(k) || grid.set(k, []).get(k)).push(i);
  }
  const around = (p, R, fn) => {
    const n = Math.ceil(R / H), cx = Math.floor(p.x / H), cy = Math.floor(p.y / H), cz = Math.floor(p.z / H);
    for (let a = -n; a <= n; a++) for (let b = -n; b <= n; b++) for (let c = -n; c <= n; c++)
      for (const j of grid.get(`${cx+a},${cy+b},${cz+c}`) || []) { const d = W[j].distanceTo(p); if (d <= R) fn(j, d); }
  };
  // khoảng cách tới tấm còn lại trong cặp
  const dOther = new Float32Array(P.count).fill(Infinity);
  for (const list of grid.values()) for (const i of list)
    around(W[i], REF_R, (j, d) => { if (pair[j] === pair[i] && compOf[j] !== compOf[i] && d < dOther[i]) dOther[i] = d; });
  // hướng ra ngoài thân xe (để nhận biết đỉnh mặt ngoài)
  const outward = (p, n) => n.dot(new THREE.Vector3(p.x - MIRROR_X, 0, p.z - 0.3).normalize()) > 0.3;
  const pos = P.array.slice(), nor = N.array.slice(), q = new THREE.Vector3(), pn = new THREE.Vector3(), pp = new THREE.Vector3();
  let moved = 0;
  for (const list of grid.values()) for (const i of list) {
    if (dOther[i] >= JOINT_R) continue;
    // mặt phẳng cục bộ từ đỉnh mặt ngoài của cả 2 tấm, ở ngoài vùng rãnh
    pn.set(0, 0, 0); pp.set(0, 0, 0); let wsum = 0;
    around(W[i], REF_R, (j, d) => {
      if (pair[j] !== pair[i] || dOther[j] < JOINT_R || !outward(W[j], WN[j])) return;
      const w = 1 - d / REF_R; pn.addScaledVector(WN[j], w); pp.addScaledVector(W[j], w); wsum += w;
    });
    if (wsum === 0) continue;
    pn.normalize(); pp.divideScalar(wsum);
    const depth = pp.clone().sub(W[i]).dot(pn);  // >0: đỉnh nằm dưới mặt ngoài, <0: nhô lên
    // mặt đầu bo của tấm (sâu hơn) chỉ nhận pháp tuyến mặt ngoài: nếu lộ qua kẽ nhỏ ở chỗ ghép thì cùng độ sáng
    if (Math.abs(depth) > MAX_DEPTH) { if (depth < 0.03) WN[i].copy(pn); continue; }
    W[i].addScaledVector(pn, depth); WN[i].copy(pn);
    q.copy(W[i]).applyMatrix4(inv); pos.set([q.x, q.y, q.z], i * 3);
    moved++;
  }
  // 2. trộn pháp tuyến mặt ngoài quanh chỗ ghép (dOther dùng khoảng cách trước khi ép, đủ chính xác ở cỡ cm)
  const blended = WN.map(n => n.clone());
  for (const list of grid.values()) for (const i of list) {
    if (dOther[i] >= BLEND_R || !outward(W[i], WN[i])) continue;
    pn.set(0, 0, 0);
    around(W[i], BLEND_R, (j, d) => { if (pair[j] === pair[i] && WN[j].dot(WN[i]) > 0 && outward(W[j], WN[j])) pn.addScaledVector(WN[j], 1 - d / BLEND_R); });
    const w = 1 - dOther[i] / BLEND_R;
    blended[i].multiplyScalar(1 - w).addScaledVector(pn.normalize(), w).normalize();
  }
  for (let i = 0; i < P.count; i++) { if (pair[i] < 0) continue; q.copy(blended[i]).transformDirection(inv); nor.set([q.x, q.y, q.z], i * 3); }
  mesh.geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  mesh.geometry.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return moved;
}

// Chia 1 mesh của model gốc: bỏ index (mỗi tam giác có đỉnh riêng để tô theo tam giác không loang màu),
// tách mảng rời, cắt các đường khớp (gờ/cản dưới, rãnh cản/ốp vòm), rồi gán vùng cho từng tam giác.
// Thay mesh.geometry bằng geometry mới; trả về { compOf, compCount, compTris, zoneOf } theo đỉnh.
export function segmentMesh(mesh) {
  if (mesh.geometry.index) mesh.geometry = mesh.geometry.toNonIndexed();
  const c = components(mesh.geometry);
  const slice = (comp, f) => { const r = sliceByField(mesh.geometry, c.compOf, comp, mesh.matrixWorld, f); mesh.geometry = r.geo; c.compOf = r.compOf; };
  let flare = null, cheek = null;
  if (mesh.name === 'Object_7') {
    // cắt hết trước (chỉ chia nhỏ tam giác), rồi mới loang để gắn nhãn
    for (const f of [bumperSeamTriField, grooveTriField, cheekTriField]) slice(11, f);
    // ốp vòm = phần không loang tới từ giữa cản (gờ trên cản không được lấn sang ốp vòm)
    const fromBumper = floodRegion(mesh.geometry, c.compOf, 11, mesh.matrixWorld, [[0, 0.35, 1.45]], grooveSide);
    flare = fromBumper.map(v => 1 - v);
    // má cản: tam giác trong vùng góc, nằm phía má của nét (theo trọng tâm; tam giác đã được cắt đôi tại nét)
    const P = mesh.geometry.attributes.position, w = new THREE.Vector3();
    cheek = new Uint8Array(P.count / 3).map((_, t) => {
      const ws = [0, 1, 2].map(k => w.fromBufferAttribute(P, t * 3 + k).applyMatrix4(mesh.matrixWorld).clone());
      return ws.every(inCheekArea) && cheekValue(centroid(ws)) > 0 ? 1 : 0;
    });
  }
  if (mesh.name === 'Object_5') flattenSeam(mesh, c.compOf, [{ side: 'L', comps: [0, 9] }, { side: 'R', comps: [1, 9] }]);
  c.compTris.fill(0); for (let t = 0; t < c.compOf.length; t += 3) c.compTris[c.compOf[t]]++;
  const gp = mesh.geometry.attributes.position, zoneOf = new Int16Array(gp.count);
  const cen = new THREE.Vector3(), tmp = new THREE.Vector3();
  for (let v = 0; v < zoneOf.length; v += 3) {
    cen.set(0, 0, 0);
    for (let k = 0; k < 3; k++) cen.add(tmp.fromBufferAttribute(gp, v + k));
    cen.divideScalar(3).applyMatrix4(mesh.matrixWorld);
    const t = v / 3, tags = { flare: flare ? flare[t] : 0, cheek: cheek ? cheek[t] : 0 };
    zoneOf[v] = zoneOf[v+1] = zoneOf[v+2] = zoneOfComp(mesh.name, c.compOf[v], cen, tags);
  }
  return { ...c, zoneOf };
}
