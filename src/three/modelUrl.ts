// URL model kèm mã phiên bản (npm run bake tạo) → trình duyệt được giữ lâu trong bộ nhớ đệm, đổi model thì URL đổi.
import MODEL from '../generated/model-version.json';

export const MODEL_URL = `/models/vf3.glb?v=${MODEL.version}`;
