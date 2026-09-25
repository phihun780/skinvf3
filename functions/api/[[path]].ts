// Cloudflare Pages Functions: mọi đường dẫn /api/* chạy qua đây (web tĩnh vẫn do Pages phục vụ).
// Cấu hình: binding R2 tên CONTENT (wrangler.toml) + secret CMS_PASSWORD (Cloudflare dashboard). Xem PLAN.md, mục "CMS".
import { handleApi, type CmsEnv } from '../../server/cms-api';

export const onRequest = ({ request, env }: { request: Request; env: CmsEnv }) => handleApi(request, env);
