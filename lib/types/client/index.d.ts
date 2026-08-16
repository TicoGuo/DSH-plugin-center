/**
 * Browser Plugin Center plugin: the conversation view tab plus the settings
 * enable card. It is a pure consumer of the host `/plugin-center` HTTP routes
 * and the `plugin-center` settings namespace.
 */
import type { Context } from '@deepseek-ai/cordis';
export type { PluginCenterViewInjected } from './PluginCenterView.tsx';
/** Services required: the conversation slot, locale, and the settings scope. */
export declare const inject: string[];
/**
 * Client plugin body: register the Plugin Center view tab and the settings
 * enable card. Both registrations ride the slot service's effect wrapper, so
 * plugin unload removes them.
 * @param ctx - client root context.
 */
export declare function apply(ctx: Context): void;
//# sourceMappingURL=index.d.ts.map