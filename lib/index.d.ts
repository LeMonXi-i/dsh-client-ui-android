/**
 * dsh-client-ui-android — host half (type declarations).
 *
 * The Android / mobile adaptation runs entirely in the browser half
 * (`lib/client.js` — UA detection, viewport patching, injected mobile CSS,
 * and the off-canvas drawer UI). This host half is a minimal loader entry so
 * the profile loader can mount the package as a cordis entry and the
 * client-modules scanner can serve the client bundle to the page at
 * `/plugins/dsh-client-ui-android/client.js`.
 *
 * @module dsh-client-ui-android
 */

/** Host services this plugin depends on. None — the node half is inert. */
export declare const inject: string[];

/**
 * Host plugin body: no-op. The browser half carries the adaptation.
 * @param ctx - host root context (unused).
 */
export declare function apply(ctx: unknown): void;
