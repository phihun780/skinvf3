// Chữ trên trang chủ.
export const home = {
  nav: [['Cách dùng', '#cach-dung'], ['Tính năng', '#tinh-nang'], ['Thư viện mẫu', '#mau'], ['Hỏi đáp', '#hoi-dap']] as [string, string][],
  // tiêu đề, chữ, màu xe của hero: chỉnh trong CMS (/cms) — mặc định ở src/content/schema.ts
  hero: {
    loading: 'Đang đưa xe vào studio…',
    presetsLabel: 'Màu xe',
  },
  steps: {
    eyebrow: '',
    title: ['', 'Sử dụng đơn giản'] as [string, string],
    items: [
      { icon: 'cursor', title: 'Chọn vùng trên xe', text: 'Rê chuột lên xe, vùng nào sáng lên là vùng đó: thân, nóc, capo, cản, ốp vòm, gương, mâm, cùm phanh…' },
      { icon: 'palette', title: 'Phối màu & dán decal', text: 'Chọn màu và chất bề mặt, dán decal có sẵn, ảnh PNG/JPG/WEBP của bạn hoặc chữ tuỳ ý.' },
      { icon: 'poster', title: 'Tải hình ảnh SkinVF3 mang ra tiệm', text: 'Hình ảnh SkinVF3 khổ A4 gồm 5 góc nhìn, mã màu HEX từng vùng và vị trí, kích thước từng decal.' },
    ],
  },
  features: {
    eyebrow: '',
    title: ['', 'Tính năng cơ bản'] as [string, string],
    zones: { tag: 'vùng', title: 'Chia đúng theo khớp nối xe thật', text: 'Thân, nóc, capo, cản, ốp vòm, ca-lăng, gương, mâm, cùm phanh… mỗi mảng một màu riêng, đường chia bám theo khe nối thật của VF3.' },
    finishes: { tag: '2 chất bề mặt', title: 'Bóng hoặc nhám cho từng vùng' },
    decal: { tag: 'Decal', title: 'Dán ôm theo thân xe', text: 'Decal chiếu thẳng lên bề mặt 3D: kéo để di chuyển, xoay, co giãn, chép đối xứng sang bên kia.' },
  },
  gallery: {
    eyebrow: '',
    title: ['', 'Mẫu tham khảo'] as [string, string],
    use: 'Dùng mẫu',
    applied: (name: string) => `Đã áp dụng mẫu ${name} · Ctrl+Z để quay lại`,
  },
  configurator: {
    title: ['', 'Tự phối màu'] as [string, string],
  },
  faq: {
    eyebrow: '',
    title: ['', 'Câu hỏi thường gặp'] as [string, string],
    items: [
      ['Màu trên màn hình có giống màu thật không?', 'Gần đúng, nhưng màn hình và ánh sáng khác nhau sẽ làm màu lệch. Hãy dùng mã màu trên hình ảnh SkinVF3 để đối chiếu với bảng màu decal thật tại tiệm.'],
      ['Hình ảnh SkinVF3 dùng để làm gì?', 'Hình ảnh SkinVF3 gom 5 góc nhìn, bảng màu từng vùng và danh sách decal (vị trí, kích thước). Thợ nhìn là biết cần dán gì, ở đâu — báo giá nhanh hơn.'],
      ['Tôi dán ảnh của mình được không?', 'Được. Trình phối nhận ảnh PNG, JPG hoặc WEBP (ảnh PNG/WEBP nền trong suốt sẽ giữ nguyên phần trong suốt), và cả chữ tuỳ ý.'],
      ['Có cần tạo tài khoản không?', 'Không. Thiết kế tự lưu trong trình duyệt trên máy bạn. Xoá dữ liệu trình duyệt thì thiết kế cũng mất — nhớ tải hình ảnh SkinVF3 để giữ lại.'],
      ['Mô hình 3D lấy ở đâu?', 'Mô hình gốc là “Vinfast VF3 Plus 2026” của tác giả Hoàng Huy, chia sẻ trên Sketchfab theo giấy phép Creative Commons Attribution 4.0 (CC BY 4.0) — được phép dùng và chỉnh sửa, kể cả cho mục đích thương mại, với điều kiện ghi rõ tên tác giả. SkinVF3 đã tuỳ chỉnh lại chi tiết bằng Claude AI (Anthropic): chia lại từng vùng theo khớp nối của xe thật, cắt và bo mượt các đường nối, tối ưu dung lượng để web tải nhanh. Cảm ơn tác giả Hoàng Huy!', [['Mô hình gốc trên Sketchfab', 'https://sketchfab.com/3d-models/vinfast-vf3-plus-2026-aa87e1cd1fdd42ae92e5a397e3d5b125'], ['Giấy phép CC BY 4.0', 'https://creativecommons.org/licenses/by/4.0/deed.vi']]],
      ['Dùng trên điện thoại được không?', 'Được, nhưng trải nghiệm tốt nhất là trên máy tính: màn hình lớn, rê chuột để chọn vùng chính xác hơn.'],
    ] as [string, string, [string, string][]?][],
  },
};
