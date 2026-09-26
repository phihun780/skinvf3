// Decal: thư viện có sẵn (public/decals/*.svg) + giới hạn chỉnh. Thêm mẫu: bỏ file SVG/PNG vào public/decals rồi khai báo ở đây.
export const DECAL_LIBRARY = [
  { id: 'stripes',   label: 'Sọc đua',     src: '/decals/stripes.svg' },
  { id: 'number',    label: 'Số 03',       src: '/decals/number-03.svg' },
  { id: 'bolt',      label: 'Tia sét',     src: '/decals/bolt.svg' },
  { id: 'checker',   label: 'Cờ caro',     src: '/decals/checker.svg' },
  { id: 'swoosh',    label: 'Đường lượn',  src: '/decals/swoosh.svg' },
  { id: 'triangles', label: 'Tam giác',    src: '/decals/triangles.svg' },
];

/** Định dạng ảnh người dùng được tải lên. */
export const UPLOAD_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
export const UPLOAD_ACCEPT = '.png,.jpg,.jpeg,.webp,' + UPLOAD_TYPES.join(',');
export const UPLOAD_MAX_MB = 15;
/** Ảnh tải lên được thu nhỏ còn cạnh dài tối đa bấy nhiêu px (đủ nét, không làm đầy bộ nhớ trình duyệt). */
export const UPLOAD_MAX_PX = 1024;

export const DECAL_SIZE = { min: 0.08, max: 4, initial: 0.45 };  // bề ngang (m); tối đa 4m (dài hơn cả xe) để phóng to rồi cắt theo mép ốp
/** Độ sâu khối chiếu: đủ ôm bề mặt cong, không xuyên sang mặt bên kia xe. */
export const DECAL_DEPTH = 0.22;
/** Chỉ dán lên vùng sơn và ốp nhựa (không kính, đèn, bánh xe). */
export const DECAL_TARGET_GROUPS = ['paint', 'trim'] as const;
/** Ốp nhựa phía dưới + ốp trụ A + gương: không in decal (người dùng chủ yếu dán lên thân xe). Decal vẫn kéo / phóng to tự do qua các vùng
 *  này, chỉ phần nằm trên ốp là không hiện (như bị cắt theo mép ốp). */
export const NO_DECAL_ZONES = ['bumperF', 'lowerF', 'skirt', 'bumperR', 'lowerR', 'aPillar', 'mirrorBase', 'mirror'];

/** Mặt phẳng đối xứng trái/phải của model (model hơi lệch tâm), dùng cho "chép sang bên kia". */
export const MIRROR_X = -0.0285;

export const TEXT_STYLES = [
  { id: 'bold',   label: 'Đậm',         font: '800 {px}px "Plus Jakarta Sans", sans-serif' },
  { id: 'italic', label: 'Nghiêng',     font: 'italic 800 {px}px "Plus Jakarta Sans", sans-serif' },
  { id: 'light',  label: 'Mảnh',        font: '300 {px}px "Plus Jakarta Sans", sans-serif' },
] as const;
