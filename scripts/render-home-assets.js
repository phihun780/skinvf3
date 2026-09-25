// Chạy trong trang /phoi-xe (chế độ dev) để render ảnh cho trang chủ: window.__files = { 'tên.png': dataURL }.
// Cách chạy: xem PLAN.md, mục "Ảnh render sẵn". Sau đó scripts/pack-home-assets.mjs chuyển PNG → WebP vào public/.
(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const frames = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const st = () => window.__design.getState();
  const { PRESETS } = await import('/src/config/presets.ts');
  const { DEFAULT_CONFIG } = await import('/src/config/zones.ts');
  const files = {};
  const shot = async (name, view, w, h) => { await frames(); await wait(150); files[name] = window.__snap.take([view], w, h)[0]; };
  st().setHovered(null); st().selectDecal(null); st().setPending(null);

  // 1) decal: bản phối có sẵn decal (số 03 + đường lượn) nhìn ngang
  st().replaceAll({ ...DEFAULT_CONFIG, body: { color: '#9fd8c8', finish: 'gloss' }, hood: { color: '#9fd8c8', finish: 'gloss' }, roof: { color: '#f6f6f4', finish: 'gloss' } });
  await shot('decal.png', 'side', 1400, 700);

  // 2) các bản phối mẫu, không decal
  for (const d of st().decals) st().removeDecal(d.id);
  for (const p of PRESETS) { st().replaceAll(p.config); await shot(`preset-${p.id}.png`, 'front34', 1200, 800); }

  // 3) chia vùng: mỗi vùng một màu
  const colors = { body: '#3cc8ff', hood: '#8af0ff', roof: '#f6f6f4', mirror: '#ff9f43', mirrorBase: '#ffd166', aPillar: '#c084fc',
    bumperF: '#1d5bff', bumperR: '#1d5bff', skirt: '#14b8a6', grille: '#0e0f11', lowerF: '#6a3fa0', lowerR: '#6a3fa0',
    rim: '#e8641c', caliper: '#ef4444', nuts: '#f6f6f4', chrome: '#d9dbde' };
  st().replaceAll(Object.fromEntries(Object.entries(colors).map(([k, c]) => [k, { color: c, finish: k === 'chrome' ? 'chrome' : 'gloss' }])));
  await shot('zones.png', 'front34', 1600, 1000);

  st().replaceAll(DEFAULT_CONFIG);
  window.__files = files;
  return Object.keys(files);
})()
