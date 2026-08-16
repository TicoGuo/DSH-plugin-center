/** Package-owned invariant companion. @module @ticoguo/dsh-plugin-center/invariant */
const PACKAGE_NAME = '@ticoguo/dsh-plugin-center';
/** Cordis companion plugin name. */
export const name = 'plugin-center-invariant';
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants'];
/**
 * No runtime invariant: the Plugin Center owns no event stream or live Loader
 * relation to assert. Its durable state is the profile manifest, the
 * `plugin-center.json` sidecar, and the operation log — files written only by
 * this plugin, so there is no cross-owner relationship a runtime invariant
 * could catch.
 */
const install = () => { };
/** Register this package's invariant companion. */
export const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
/* jscpd:ignore-end */
//# sourceMappingURL=invariant.js.map