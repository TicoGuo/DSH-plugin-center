/**
 * Browser Plugin Center plugin: the conversation view tab (shown only while the
 * plugin is enabled) plus the settings enable card. It is a pure consumer of the
 * host `/plugin-center` HTTP routes and the `plugin-center` settings namespace.
 */
import type { Context } from '@deepseek-ai/cordis';
export type { PluginCenterViewInjected } from './PluginCenterView.tsx';
/** Services required: the conversation slot, locale, and the settings scope. */
export declare const inject: string[];
export declare function apply(ctx: Context): void;
//# sourceMappingURL=index.d.ts.map