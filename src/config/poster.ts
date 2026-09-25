// Poster xuất ra: dọc A4 ở 300dpi (2480 × 3508 px), PNG. Màu poster đổi ở đây (đi cùng token giao diện).
export const POSTER = {
  W: 2480,
  H: 3508,
  M: 150,  // lề
  colors: {
    // nền mesh vẽ trong renderPoster.ts (drawMesh), cùng tông với --mesh trong app.css
    text: '#f2f7ff',
    muted: 'rgba(220,234,255,0.75)',
    faint: 'rgba(200,220,255,0.55)',
    line: 'rgba(255,255,255,0.22)',
    lineSoft: 'rgba(255,255,255,0.1)',
    accent: '#3cc8ff',
    accent2: '#8af0ff',
  },
};
