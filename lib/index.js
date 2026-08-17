/**
 * dsh-client-ui-android — host half.
 *
 * Minimal loader entry: the Android / mobile adaptation runs entirely in the
 * browser half (lib/client.js — UA detection, viewport patching, injected
 * mobile CSS, and the off-canvas drawer UI). This node half exists so the
 * profile loader can mount the package as a cordis entry and the
 * client-modules scanner (dsh-client-modules) can serve the client bundle to
 * the page at `/plugins/dsh-client-ui-android/client.js`.
 *
 * @module dsh-client-ui-android
 */

/** Host services this plugin depends on. None — the node half is inert. */
const inject = [];

/**
 * Host plugin body: no-op. The browser half carries the adaptation.
 * @param ctx - host root context (unused).
 */
function apply(ctx) {
	/* intentionally empty — see module doc */
}

export { apply, inject };
