// Bố cục giao diện. `frame` = bề ngang tối đa của khung giao diện (căn giữa); nền studio vẫn phủ kín màn hình.
// main.tsx đưa các số này vào biến CSS (--frame, --panel-w…) để CSS và khung 3D dùng chung 1 nguồn.
export const LAYOUT = {
  frame: 1280,       // px
  gutter: 24,        // lề trong khung
  panelWidth: 340,   // panel bảng màu ở góc phải, căn giữa theo chiều dọc
  mobile: 640,       // hẹp hơn: panel thành tấm trượt từ dưới lên, không dời xe sang ngang
};

/** Mép trái khung giao diện (px) với bề ngang cửa sổ `w`. */
export const frameLeft = (w: number) => Math.max(0, (w - LAYOUT.frame) / 2);
