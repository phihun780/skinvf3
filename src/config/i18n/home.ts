// Chữ cố định trên trang chủ (không chỉnh trong CMS).
// Tiêu đề, nội dung các mục (hero, tính năng, các bước, mẫu, hỏi đáp, footer): chỉnh trong CMS (/cms) —
// nội dung mặc định ở src/content/schema.ts.
export const home = {
  hero: {
    loading: 'Đang đưa xe vào studio…',
    presetsLabel: 'Màu xe',
  },
  gallery: {
    applied: (name: string) => `Đã áp dụng mẫu ${name} · Ctrl+Z để quay lại`,
  },
};
