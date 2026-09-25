// Con trỏ xoay cho khung decal. Trình duyệt không có sẵn con trỏ xoay, nên tự vẽ theo kiểu con trỏ hệ thống
// (nét đen, viền trắng, cỡ 24px như con trỏ co giãn): 1 cung tròn mảnh, 2 đầu mũi tên thon.
// Cung luôn quay mặt ra phía ngoài góc đang rê (giống Figma / Photoshop) → truyền hướng góc trên màn hình.
const R = 7.6, A0 = -98, A1 = 8;              // cung vẽ sẵn cho góc TRÊN-PHẢI (giữa cung ở -45°), độ, trục y hướng xuống
const HL = 3.1, HW = 2.4;                      // đầu mũi tên: dài, nửa bề ngang
// dời tâm cung để cả hình (cung + mũi tên) nằm giữa ô 24px
const CX = 12 - R * 0.62, CY = 12 + R * 0.62;
const f = (n: number) => +n.toFixed(2);
const pt = (a: number) => [CX + R * Math.cos(a * Math.PI / 180), CY + R * Math.sin(a * Math.PI / 180)];

/** Đầu mũi tên tại điểm cuối cung, chĩa theo tiếp tuyến (dir = -1: về phía A0, +1: về phía A1). */
function head(a: number, dir: number) {
  const r = a * Math.PI / 180, [x, y] = pt(a);
  const tx = -Math.sin(r) * dir, ty = Math.cos(r) * dir;          // tiếp tuyến
  const nx = -ty, ny = tx;                                         // pháp tuyến
  const tip = [x + tx * HL, y + ty * HL], bx = x - tx * 0.3, by = y - ty * 0.3;
  return `M${f(tip[0])} ${f(tip[1])}L${f(bx + nx * HW)} ${f(by + ny * HW)}L${f(bx - nx * HW)} ${f(by - ny * HW)}Z`;
}

const [sx, sy] = pt(A0), [ex, ey] = pt(A1);
const ARC = `M${f(sx)} ${f(sy)}A${R} ${R} 0 0 1 ${f(ex)} ${f(ey)}`;
const HEADS = head(A0, -1) + head(A1, 1);

/** SVG con trỏ; deg = hướng góc decal trên màn hình (atan2 theo trục y xuống, độ). */
export function rotateCursorSvg(deg: number) {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">'
    + `<g transform="rotate(${Math.round(deg + 45)} 12 12)">`
    + `<path d="${ARC}" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round"/>`
    + `<path d="${HEADS}" fill="#fff" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/>`
    + `<path d="${ARC}" fill="none" stroke="#111" stroke-width="1.4" stroke-linecap="round"/>`
    + `<path d="${HEADS}" fill="#111" stroke="#111" stroke-width=".6" stroke-linejoin="round"/>`
    + '</g></svg>';
}

const cache = new Map<number, string>();
/** Giá trị CSS cursor, làm tròn hướng theo bước 15° (dùng lại chuỗi đã tạo). */
export function rotateCursor(deg: number) {
  const k = ((Math.round(deg / 15) * 15) % 360 + 360) % 360;
  let c = cache.get(k);
  if (!c) cache.set(k, c = `url("data:image/svg+xml;utf8,${encodeURIComponent(rotateCursorSvg(k))}") 12 12, alias`);
  return c;
}
