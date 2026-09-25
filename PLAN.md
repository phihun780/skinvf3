# SkinVF3 — Phương án

Web cho cá nhân chủ xe VF3 tự phối ngoại thất (màu, decal) để **xem trước** rồi mang thiết kế ra tiệm làm.

## Nhu cầu đã chốt
- Người dùng: cá nhân, dùng **máy tính là chính** (mobile chỉ cần xem được).
- Custom: màu + chất bề mặt theo vùng (xem bảng vùng), decal (thư viện có sẵn + upload ảnh + chữ).
- Đầu ra: ảnh render nhiều góc + poster tổng hợp (header thương hiệu web cố định, ngày giờ, bảng màu tham khảo).
- Không backend. Bảo trì bằng Claude Code.
- Phong cách: **mesh gradient xanh + glass** (theo ảnh tham khảo của chủ dự án): nền navy → xanh hoàng gia → cyan/aqua có hạt nhiễu, panel/nút kính mờ viền sáng, nút chính dạng viên thuốc glass chữ in hoa; phông **Plus Jakarta Sans** toàn web; thang độ đậm: tiêu đề lớn 800 (dòng phụ 300), tiêu đề panel/thẻ 700, nút 700, nhãn nhỏ in hoa 600, menu 500, nội dung 400. Token ở đầu `src/styles/app.css`; poster cùng tông (`src/config/poster.ts`).
- Ngôn ngữ: tiếng Việt; chuỗi giao diện gom vào file i18n để thêm tiếng Anh sau.
- Thương hiệu: **SkinVF3**, sub "Làm màu theo cách của bạn" (đổi trong `brand.ts`).
- Các trang: Trang chủ giới thiệu · Trình phối xe · Thư viện mẫu (bản phối có sẵn, bấm để áp dụng) · Hướng dẫn / FAQ.
- Tương tác trình phối: **rê chuột vào vùng nào vùng đó sáng lên, bấm vào thì bảng màu hiện bên phải, căn giữa ngang tầm xe** (thứ tự: tên bộ phận → bảng màu → chất bề mặt); khung 3D tự dời xe sang phần trống để luôn thấy trọn xe. Màn hẹp (≤ 640px): bảng màu là tấm trượt từ dưới lên, xe dời lên trên.
- Bề ngang giao diện tối đa **1280px, căn giữa** (nền studio vẫn phủ kín màn hình); số liệu ở `src/config/layout.ts`.
- Ảnh xuất ra: **dọc A4, PNG**. Tên gọi với người dùng: **"Hình ảnh SkinVF3"** (không dùng chữ "poster" trên giao diện); nút ở thanh dưới: "Tải hình ảnh"; file `<mã>_SkinVF3_<ngày>.png`.
- Màu nhấn: **cyan phát sáng** (#3cc8ff / #8af0ff).
- Poster: PNG 300dpi (~9MB, để in) + bản nhẹ JPG (~0.7MB, gửi Zalo/Messenger).

## Nguồn model
`vinfast_vf3_plus_2026.glb` — tác giả Hoàng Huy (Sketchfab), **CC-BY-4.0** → bắt buộc ghi credit trên web.
Trục thế giới sau khi load: +Z = đầu xe, +Y = lên, +X = bên trái xe.

## Vùng custom (đã duyệt bằng `inspect/index.html`)
Id mảng = mảng rời (connected component) trong mesh gốc; bánh xe: 4 bánh chung `Object_4`, 17 mảng/bánh, dùng offset.

| Vùng | Nguồn |
|---|---|
| Thân xe (sơn chính) | Object_5 #0,1,4,5,6,7,8,9 + Object_7 #3,4 (khe dưới dải thân) + gờ trên cản trước (Object_7 #11 phía cản, cao hơn y = 0.58) |
| Nắp capo | Object_5 #2 |
| Nóc xe + cánh gió sau (giữ chung) | Object_5 #3 |
| Vỏ gương | Object_7 #5,6 |
| Chân gương | Object_7 #7,8 |
| Ốp tam giác trụ A | Object_7 #0,1 |
| Cản dưới + ốp vòm trước (gộp theo yêu cầu) | Object_7 #11, phần còn lại (mép cản quanh khoang biển số + toàn bộ ốp vòm trước) |
| Cản sau + ốp vòm bánh sau (giữ chung) | Object_7 #12 |
| Ốp sườn | Object_7 #9,10 |
| Ca-lăng | Object_7 #2 (mặt lưới + cụm đèn) |
| Ốp cản dưới trước | Object_7 #13,14 (khoang lưới dưới / biển số), #16–45 (nan hốc gió) |
| Ốp cản dưới sau | Object_7 #15 |
| Lốp / Mâm / Moay-ơ / Cùm phanh / Đĩa phanh / Ốc+van | Object_4 offset 8 / 9 / 7 / 0–4 / 5–6 / 10–16 |
| Kính | Object_6 |
| Nẹp chrome + logo V | Object_8 |
| Cụm đèn | Object_9,10,12,13,15,16,17,18 |
| Khác (biển số, tấm gầm) | Object_11,14 |

Mâm giữ 1 khối (không tách vành/nan), không thêm chụp tâm.

Cản trước và ốp vòm trước không có seam trong lưới (mảng là khối kín có độ dày), chỉ ngăn nhau bằng một rãnh dựng hình. Đáy rãnh được dò bằng độ lõm bề mặt thành một polyline (`GROOVES` trong `inspect/index.html`): đoạn dưới thẳng đứng ở x ≈ 0.78 (trái) / −0.84 (phải), đoạn trên chéo về phía vòm bánh rồi chạm mép trên của cản. Điểm dò lệch vài mm nên được khớp thành đường cong trơn (đa thức bậc 4 theo độ cao, sai số ≤ ~3.5mm, kéo dài tuyến tính qua mép trên/dưới). Cách tách: kéo đường cong thành mặt cắt, cắt đôi mọi tam giác có đỉnh trong phạm vi 6cm quanh rãnh mà vắt qua mặt cắt (tính cả đỉnh nằm ngoài phạm vi, để không sót tam giác to), rồi loang từ giữa cản trước. Phần không loang tới là ốp vòm. Script tách model sẽ làm y hệt.

Gờ trên cản / cản dưới (đối chiếu ảnh xe thật: gờ tròn dưới ca-lăng cùng màu thân, cản dưới nhựa đen): model không có rãnh ở đây. Mép dưới gờ = mép trên khoang lưới dưới, nằm ngang ở y ≈ 0.58 suốt chiều ngang → cắt bằng mặt phẳng ngang y = 0.58 (cắt trước, rồi mới cắt rãnh ốp vòm). Ở 2 góc cản, đường cắt nối dài mép khoang lưới ra tới ốp vòm.

Ốp vòm trước và cản dưới trước đã gộp thành 1 vùng, nên bỏ đường khớp vẽ tay cắt chéo chân ốp vòm. Rãnh cản/ốp vòm vẫn dùng để gờ trên cản không lấn sang ốp vòm.

"Má" cản ở 2 góc đầu xe (theo nét chủ dự án vẽ trên ảnh nhìn thẳng của `inspect/`): góc dưới-ngoài dải thân được bo theo đường cong từ mép ngoài dải thân (ngang tầm giữa dải) cong xuống mép dưới dải thân; phần ngoài đường cong thuộc vùng Cản dưới + ốp vòm trước. Camera tham chiếu = góc "Trước" của `inspect/` ở khung 1086×704, nét làm trơn Catmull-Rom, mặt cắt = tia camera, bên phải đối xứng. Code: `CHEEK` trong `shared/vf3-zones.js`.

Toàn bộ logic chia vùng nằm ở `shared/vf3-zones.js` (dùng chung cho `inspect/` và `mockup/`).

## Kiến trúc
- **Vite + React + TypeScript + React Three Fiber (three.js)**, deploy **Cloudflare Pages** (web tĩnh `dist/` + API CMS ở `functions/`, nội dung CMS lưu trên **R2**). Project nằm ngay thư mục gốc; `inspect/`, `mockup/` giữ lại làm công cụ tham khảo.
- `scripts/bake-model.mjs` (gltf-transform + `shared/vf3-zones.js`): chạy **1 lần** khi đổi cách chia vùng → mỗi vùng thành 1 mesh tên `zone:<id>`, hàn đỉnh, nén meshopt → `public/models/vf3.glb`. Web không phải tính chia vùng lúc chạy.
- `src/config/` — **file cấu hình để sửa không cần đụng code**:
  - `zones.ts` — danh sách vùng, tên tiếng Việt, màu mặc định, vùng nào cho dán decal.
  - `palette.ts` — màu chính hãng VF3 + màu wrap phổ biến (tên, HEX, chất bề mặt).
  - `finishes.ts` — preset vật liệu: bóng, nhám, satin, metallic, chrome, carbon.
  - `decals/` + `decals.ts` — thư viện decal (SVG/PNG).
  - `brand.ts` — logo, tên web cho header poster.
  - `presets.ts` — các bản phối mẫu cho Thư viện mẫu.
  - `i18n/vi.ts` — toàn bộ chữ trên giao diện.
- Vật liệu: `MeshPhysicalMaterial` (clearcoat cho sơn bóng, roughness cho nhám…), HDRI studio.
- Decal: `DecalGeometry` chiếu lên bề mặt — click đặt, kéo di chuyển, xoay, co giãn, lật, đổi màu (SVG), xoá; chữ render qua canvas.
- Lưu: tự động lưu vào localStorage; xuất/nhập file thiết kế `.json`.
- Xuất ảnh: render offscreen độ phân giải cao ở 6 góc (trước, sau, trái, phải, 3/4 trước, 3/4 sau) → ghép poster (header brand, ngày giờ, mã thiết kế, lưới ảnh, bảng màu theo vùng, danh sách decal) → PNG + PDF.

## Cách chạy
- `npm install` (lần đầu) → `npm run dev` → mở http://localhost:5180
- Đổi cách chia vùng (`shared/vf3-zones.js`) → `npm run bake` để tạo lại `public/models/vf3.glb` + `src/generated/zones.json` + `src/generated/model-version.json` (mã phiên bản gắn vào URL model, trình duyệt luôn tải bản mới).
- `npm run build` → thư mục `dist/` để deploy.
- CMS trên máy: mở http://localhost:5180/cms. File `.dev.vars` có `CMS_REMOTE=https://skinvf3.pages.dev` → localhost dùng chung web thật: đăng nhập bằng `CMS_PASSWORD` trên Cloudflare, **bấm Lưu ở localhost = sửa thẳng web thật**, trang chủ localhost hiện đúng nội dung thật. Muốn thử riêng không đụng web thật: xoá dòng `CMS_REMOTE` → nội dung lưu vào `.cms-data/`, mật khẩu = `CMS_PASSWORD` trong `.dev.vars`.
- `inspect/` và `mockup/` là công cụ tham khảo cũ, mở bằng server tĩnh riêng (`python -m http.server 5173`).

## Điều hướng
Web **1 trang** (`src/pages/Home.tsx`): Hero · Tính năng cơ bản (#tinh-nang) · Sử dụng đơn giản · Mẫu tham khảo (#mau) · **Tự phối màu (#phoi-xe, trình phối nhúng trong khung `.studio-embed`)** · Câu hỏi thường gặp · Footer. Menu trên cùng (Trang chủ · Tính năng · Mẫu tham khảo · Tự phối màu) chỉ cuộn mượt tới mục và tự sáng mục đang xem. Bấm thẻ mẫu = áp mẫu vào trình phối + cuộn xuống. Trình phối chỉ dựng khi cuộn tới gần, 2 khung 3D (hero + trình phối) tự dừng vẽ khi khuất. Trong trình phối: kéo để xoay, lăn chuột để cuộn trang, Ctrl + lăn để phóng to. Link cũ `/phoi-xe?preset=<id>` vẫn chạy (áp mẫu rồi chuyển về `/#phoi-xe`).

## Điện thoại (màn cảm ứng)
- Nhận biết bằng `(pointer: coarse)` / `(max-width: 760px)` — `src/ui/device.ts`.
- **Menu:** màn ≤ 900px gọn trong nút ☰ → bảng thả xuống đủ 4 mục (`SiteHeader.tsx`); chỉ đóng khi thật sự cuộn > 12px / đổi bề ngang (thanh địa chỉ co giãn không làm đóng).
- **Hero:** cao theo `100svh` (không nhảy khi thanh địa chỉ ẩn/hiện), chữ nhỏ thành 1 dòng giữa, chấm màu 32px dễ chạm.
- **Trình phối:** trong trang chỉ là bản xem trước (không bắt cử chỉ → vuốt vẫn cuộn trang). Chạm **Bắt đầu phối** → toàn màn hình (`.studio-embed.full`, khoá cuộn trang), kéo để xoay, **chụm 2 ngón để phóng to**, ✕ hoặc nút Back của điện thoại để thoát. Thanh dưới có thêm Hoàn tác / Làm lại. Bảng màu / decal là tấm trượt từ dưới lên; bảng decal thu gọn được (chọn decal xong tự thu gọn để chạm lên xe dán), camera tự đưa xe vào phần còn trống. Khung decal có tay cầm to cho ngón tay.
- **Mượt:** khung 3D tối đa 1.5× độ phân giải, bóng đổ 512px; thẻ kính trong danh sách bỏ lớp làm mờ nền (nặng khi cuộn); ô nhập chữ 16px (iOS không tự phóng to); Mẫu tham khảo là dải thẻ vuốt ngang.
- **CMS trên điện thoại:** 1 cột, danh mục cuộn ngang, nút **Xem trước** mở bản xem trước toàn màn hình.

## CMS (/cms)
- Quản lý nội dung trang chủ: đăng nhập bằng mật khẩu → sửa → **Lưu & xuất bản** → web đổi ngay (không cần deploy lại). Bên phải là trang chủ thật thu nhỏ (iframe `/?cms-preview`), đổi theo từng chữ gõ.
- Sửa được **toàn bộ trang chủ**, mỗi mục một form (danh mục bên trái có chấm vàng = mục có thay đổi chưa lưu; xem trước tự cuộn tới mục đang sửa):
  - **Hero:** 2 dòng tiêu đề, chữ nhỏ góc trái (≤ 4 dòng), câu + chữ nút góc phải, **màu xe mockup** (≤ 8 màu, chỉnh màu + Bóng/Nhám từng vùng hoặc cả nhóm, lấy từ mẫu tham khảo, sắp thứ tự; màu đầu tiên hiện lúc mở trang), số giây tự đổi màu.
  - **Tính năng cơ bản:** tiêu đề mục; 3 thẻ (nhãn, tiêu đề, mô tả; thẻ chia vùng + thẻ decal đổi được ảnh).
  - **Sử dụng đơn giản:** tiêu đề mục; 1–6 bước (biểu tượng chọn từ bộ có sẵn `src/ui/icons.tsx`, tiêu đề, mô tả, sắp thứ tự).
  - **Mẫu tham khảo:** tiêu đề, chữ nút; 1–12 mẫu (tên, nhãn, màu từng vùng, ảnh thẻ). **Tạo ảnh từ màu**: CMS tự dựng xe 3D ẩn, chụp góc 3/4 trước giống ảnh render sẵn, tải lên R2 (`src/pages/cms/ThumbMaker.tsx`); đổi màu mà chưa tạo lại ảnh → thẻ có dấu “!”. Thêm mẫu mới tự tạo ảnh luôn.
  - **Tự phối màu:** tiêu đề mục. **Câu hỏi thường gặp:** tiêu đề; ≤ 20 câu (câu hỏi, trả lời có xuống dòng, ≤ 4 link — chỉ nhận https://, /đường-dẫn, #mục). Xoá hết câu hỏi = ẩn mục. **Footer:** chữ sau năm (năm tự cập nhật).
- Ảnh tải lên: CMS tự thu nhỏ (cạnh dài ≤ 1800px) và đổi sang WebP trước khi gửi, lưu R2 `media/<tên ngẫu nhiên>.webp`, phục vụ ở `/api/media/<tên>` (trình duyệt giữ lâu vì tên không đổi).
- Code: `src/content/schema.ts` (nội dung mặc định + kiểm tra dữ liệu — thêm mục mới bắt đầu từ đây), `src/content/store.ts` (trang chủ nạp nội dung, nhớ bản cũ trong trình duyệt để hiện ngay), `src/pages/Cms.tsx` (khung CMS, đăng nhập, xem trước) + `src/pages/cms/forms.tsx` (form từng mục) + `src/pages/cms/fields.tsx` (ô nhập dùng chung) + `src/styles/cms.css`, `server/cms-api.ts` (API), `functions/api/[[path]].ts` (Cloudflare), `server/dev-plugin.ts` (API giả lập cho localhost).
- API: `GET /api/content` (công khai) · `POST /api/cms/login` · `GET /api/cms/me` · `PUT /api/cms/content` · `POST /api/cms/media` (cần token) · `GET /api/media/<tên>`. Token hạn 7 ngày, ký bằng mật khẩu → **đổi mật khẩu là mọi phiên cũ bị đăng xuất**. Mỗi lần lưu có 1 bản sao lưu `content/history/<giờ lưu>.json` trên R2 (khôi phục: chép đè lên `content/site.json`).
- **Deploy lên Cloudflare (lần đầu):**
  1. Cloudflare dashboard → R2 → tạo bucket tên `skinvf3-content` (trùng `wrangler.toml`).
  2. Workers & Pages → Create → Pages → kết nối Git (hoặc `npx wrangler pages deploy dist`). Build command `npm run build`, output `dist`. Binding R2 `CONTENT` lấy từ `wrangler.toml`.
  3. Pages → Settings → Variables and Secrets → thêm **Secret** `CMS_PASSWORD` (mật khẩu dài, khó đoán) → deploy lại.
  4. Mở `https://<tên-miền>/cms`. Tăng bảo mật (tuỳ chọn): Cloudflare Zero Trust → Access → khoá thêm đường dẫn `/cms*` và `/api/cms/*` bằng email.

## Ảnh render sẵn (trang chủ)
`public/presets/<id>.webp` (thẻ mẫu) và `public/home/{zones,decal,poster}.webp`. Tạo lại khi đổi mẫu/model: mở `/phoi-xe` ở chế độ dev, chạy nội dung `scripts/render-home-assets.js` trong console (tạo `window.__files` gồm PNG nền trong suốt), lưu các PNG ra 1 thư mục, rồi `node scripts/pack-home-assets.mjs <thư mục> [poster.png]`.

## Giai đoạn
0. Mockup giao diện (trang chủ + trình phối) để duyệt phong cách, bố cục.
1. Script tách model + khung React/R3F + viewer studio + đổi màu/chất theo vùng. ✅ (model 14.7MB → 2.44MB; rê sáng vùng, bấm hiện bảng màu tại chỗ, 6 góc nhìn, tự xoay, hoàn tác/làm lại, tự lưu)
2. Decal (thư viện, upload, chữ). ✅ (chiếu lên bề mặt sơn + ốp nhựa bằng DecalGeometry; thư viện SVG `public/decals/` khai báo ở `src/config/decals.ts`; tải PNG/JPG/WEBP ≤ 15MB → thu còn ≤ 1024px, lưu WebP; chữ 3 kiểu; kéo để di chuyển; kích thước/xoay/độ đậm/lật/chép sang bên kia/lớp/xoá; hoàn tác chung với màu)
3. Xuất Hình ảnh SkinVF3. ✅ (dọc A4 300dpi 2480×3508 PNG + bản nhẹ JPG, ghép bằng canvas 2D ở `src/poster/renderPoster.ts`; ảnh 3/4 trước + 4 góc chụp riêng nền trong suốt; bên dưới là các ô màu có trong thiết kế (không trùng) kèm mã HEX, ít màu thì ô to, nhiều màu tự chia 2 hàng; không liệt kê decal; màu nền ở `src/config/poster.ts`)
4. Trang chủ, Thư viện mẫu, Hướng dẫn/FAQ. 🟡 Trang chủ `/` xong (hero xe 3D tự xoay + đổi mẫu, cách dùng, bento tính năng, thư viện mẫu → `/phoi-xe?preset=<id>`, hỏi đáp, kêu gọi, footer). Thư viện mẫu & hỏi đáp hiện là mục trên trang chủ.
5. CMS `/cms` (Cloudflare Pages Functions + R2). ✅ Toàn bộ các mục trang chủ.
6. Hoàn thiện: tối ưu tốc độ, responsive cơ bản, SEO, deploy + tên miền.

## Cần từ chủ dự án
- Logo chính thức (tên đã chốt: SkinVF3; ô logo đang dùng tạm chữ "V3").
- Danh sách màu chính hãng muốn đưa vào (hoặc dùng bộ mặc định).
- Decal mẫu muốn có sẵn (hoặc dùng bộ mặc định).
