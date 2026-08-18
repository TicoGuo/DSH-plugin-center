/**
 * Browser Plugin Center plugin: the sidebar footer button (always mounted — the
 * panel itself shows the disabled state with a re-enable switch) plus its
 * right-panel overlay. It is a pure consumer of the host `/plugin-center` HTTP
 * routes (no settings namespace).
 */
import type { Context } from '@deepseek-ai/cordis';
export type { PluginCenterViewInjected } from './PluginCenterView.tsx';
/** Services required: the slots service and the locale. */
export declare const inject: string[];
/**
 * Client plugin body: register the sidebar footer button. The on/off flag is
 * read from the host's `/plugin-center/status` route; a transient failure
 * retries with exponential backoff instead of permanently hiding the entry.
 * @param ctx - client root context.
 */
export declare function apply(ctx: Context): void;
//# sourceMappingURL=index.d.ts.map