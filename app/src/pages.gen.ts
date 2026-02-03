// deno-fmt-ignore-file
// biome-ignore format: generated types do not need formatting
// prettier-ignore
import type { PathsForPages, GetConfigResponse } from 'waku/router';

// prettier-ignore
import type { getConfig as File_Root_getConfig } from './pages/_root';
// prettier-ignore
import type { getConfig as File_CSlug_getConfig } from './pages/c/[slug]';
// prettier-ignore
import type { getConfig as File_DistilledIndex_getConfig } from './pages/distilled/index';
// prettier-ignore
import type { getConfig as File_Index_getConfig } from './pages/index';

// prettier-ignore
type Page =
| ({ path: '/_root' } & GetConfigResponse<typeof File_Root_getConfig>)
| ({ path: '/c/[slug]' } & GetConfigResponse<typeof File_CSlug_getConfig>)
| ({ path: '/distilled' } & GetConfigResponse<typeof File_DistilledIndex_getConfig>)
| ({ path: '/' } & GetConfigResponse<typeof File_Index_getConfig>);

// prettier-ignore
declare module 'waku/router' {
  interface RouteConfig {
    paths: PathsForPages<Page>;
  }
  interface CreatePagesConfig {
    pages: Page;
  }
}
