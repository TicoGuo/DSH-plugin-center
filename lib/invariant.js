//#region lib/types/invariant.js
/** Package-owned invariant companion. @module @ticoguo/dsh-plugin-center/invariant */
const PACKAGE_NAME = "@ticoguo/dsh-plugin-center";
/** Cordis companion plugin name. */
const name = "plugin-center-invariant";
/** Service required before the companion can reserve package ownership. */
const inject = ["invariants"];
/**
* No runtime invariant: the Plugin Center owns no event stream or live Loader
* relation to assert. Its durable state is the profile manifest, the
* `plugin-center.json` sidecar, and the operation log — files written only by
* this plugin, so there is no cross-owner relationship a runtime invariant
* could catch.
*/
const install = () => {};
/** Register this package's invariant companion. */
const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
//#endregion
export { apply, inject, name };
