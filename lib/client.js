window.__ModuleLoader__.load({
	id: "dsh-client-ui-android",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region lib/types/client/detect.js
		/**
		* Android / mobile detection and page adaptation.
		*
		* Runs at module load (the bundle is eager in the boot graph) and again on
		* window resize. Everything is defensive: a failure here must never break
		* the shell boot, so the whole pass is wrapped in try/catch.
		*
		* Detection keys:
		* - platform: android / ios / windows / macos / linux / unknown (UA + UA-Client-Hints).
		* - deviceType: mobile (narrow + touch/coarse pointer) / tablet (touch but not
		*   narrow) / desktop (no touch) — plus "touch" for wide touch screens.
		*
		* Adaptation:
		* - stamps <html> with data-platform / data-device-type / data-touch /
		*   data-android(+version) / data-dsh-mobile / data-dsh-tablet and the
		*   dsh-mobile / dsh-android classes;
		* - upgrades the viewport meta (viewport-fit=cover + interactive-widget
		*   so the composer stays above the Android keyboard and content avoids
		*   the display cutout / gesture area);
		* - injects a scoped stylesheet (safe-area insets, no double-tap zoom,
		*   touch-first sizing, and the phone drawer layout);
		* - tags the AppFrame columns so the stylesheet can address them without
		*   depending on hashed class names.
		*/
		const ANDROID_RE = /Android(?:\s+([\d.]+))?/i;
		const IOS_RE = /iPhone|iPad|iPod/i;

		/** Snapshot the current platform/device facts. */
		function detectDevice() {
			const ua = typeof navigator !== "undefined" ? String(navigator.userAgent ?? "") : "";
			const uaData = typeof navigator !== "undefined" && typeof navigator.userAgentData === "object" && navigator.userAgentData !== null ? navigator.userAgentData : void 0;
			const androidUa = ua.match(ANDROID_RE);
			const androidBrand = uaData !== void 0 && Array.isArray(uaData.brands) ? uaData.brands.some((b) => /android/i.test(String(b && b.brand))) : false;
			const isAndroid = Boolean(androidUa) || androidBrand || uaData?.platform === "Android";
			const androidVersion = androidUa ? androidUa[1] ?? "" : "";
			let platform = "unknown";
			if (isAndroid) platform = "android";
			else if (IOS_RE.test(ua)) platform = "ios";
			else if (/windows/i.test(ua)) platform = "windows";
			else if (/macintosh|mac os/i.test(ua)) platform = "macos";
			else if (/linux/i.test(ua)) platform = "linux";
			const touch = (navigator.maxTouchPoints ?? 0) > 0;
			const coarse = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
			const width = window.innerWidth || document.documentElement.clientWidth || 0;
			let deviceType = "desktop";
			if (touch || coarse) deviceType = width < 768 ? "mobile" : width < 1024 ? "tablet" : "touch";
			return {
				platform,
				androidVersion,
				deviceType,
				touch,
				coarse,
				width
			};
		}

		let detected = detectDevice();
		const mobile = () => detected.deviceType === "mobile";
		const tablet = () => detected.deviceType === "tablet";

		/** Stamp the <html> element with the detected facts (stylesheet key). */
		function applyAttributes() {
			const el = document.documentElement;
			el.setAttribute("data-platform", detected.platform);
			el.setAttribute("data-device-type", detected.deviceType);
			el.setAttribute("data-touch", detected.touch ? "true" : "false");
			if (detected.platform === "android") {
				el.setAttribute("data-android", "true");
				el.setAttribute("data-android-version", detected.androidVersion || "unknown");
			} else {
				el.removeAttribute("data-android");
				el.removeAttribute("data-android-version");
			}
			el.toggleAttribute("data-dsh-mobile", mobile());
			el.toggleAttribute("data-dsh-tablet", tablet());
			el.classList.toggle("dsh-mobile", mobile());
			el.classList.toggle("dsh-android", detected.platform === "android");
		}

		/**
		* Upgrade the viewport meta for cover rendering and keyboard resizing.
		* Only touches the attribute when a viewport meta exists; unknown tokens
		* are ignored by older browsers, so this is safe across Android Chrome
		* versions.
		*/
		function patchViewport() {
			const meta = document.querySelector('meta[name="viewport"]');
			if (meta === null) return;
			const content = meta.getAttribute("content") ?? "";
			const want = [];
			if (!/width=device-width/.test(content)) want.push("width=device-width");
			if (!/initial-scale=1/.test(content)) want.push("initial-scale=1");
			if (!/viewport-fit=cover/.test(content)) want.push("viewport-fit=cover");
			if (!/interactive-widget=resizes-content/.test(content)) want.push("interactive-widget=resizes-content");
			if (want.length > 0) meta.setAttribute("content", `${content.trim()}${content.trim() === "" ? "" : ", "}${want.join(", ")}`);
		}

		/** Scoped adaptation stylesheet (injected once, owned by this plugin). */
		const STYLE_TAG_ID = "dsh-client-ui-android/styles.css";
		const CSS = [
			"/* dsh-client-ui-android — touch-first adaptation (Android phones especially) */",
			"html[data-dsh-mobile],html[data-dsh-tablet]{-webkit-text-size-adjust:100%;text-size-adjust:100%;-webkit-tap-highlight-color:rgba(0,0,0,0)}",
			"html[data-dsh-mobile] body,html[data-dsh-tablet] body{overflow-x:hidden;overscroll-behavior-y:contain}",
			"html[data-dsh-mobile] button,html[data-dsh-mobile] a,html[data-dsh-mobile] input,html[data-dsh-mobile] textarea,html[data-dsh-mobile] select,html[data-dsh-mobile] [role=button],html[data-dsh-tablet] button,html[data-dsh-tablet] a,html[data-dsh-tablet] input,html[data-dsh-tablet] textarea,html[data-dsh-tablet] select,html[data-dsh-tablet] [role=button]{touch-action:manipulation}",
			"html[data-dsh-mobile] input,html[data-dsh-mobile] textarea,html[data-dsh-mobile] select{font-size:16px}",
			"html[data-dsh-mobile] [data-dsh-frame],html[data-dsh-tablet] [data-dsh-frame]{position:fixed;inset:0;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-right:env(safe-area-inset-right,0px);padding-bottom:env(safe-area-inset-bottom,0px);padding-left:env(safe-area-inset-left,0px)}",
			"html[data-dsh-mobile] [data-dsh-frame]{grid-template-columns:minmax(0,1fr)!important}",
			/* Drawers slide with left/right offsets — NEVER transform. A transform on the
			* sidebar would create a containing block for position:fixed descendants
			* (the settings modal is rendered inside the sidebar's settings area), trapping
			* the modal inside the drawer. left/right positioning has no such trap. */
			"html[data-dsh-mobile] [data-dsh-frame]>[data-dsh-sidebar]{position:fixed;top:0;bottom:0;left:0;z-index:60;--dsh-drawer-w:min(84vw,340px);width:var(--dsh-drawer-w);left:calc(-1 * var(--dsh-drawer-w));transition:left .25s var(--ds-ease-in-out,ease);border-right:1px solid var(--dsw-alias-border-l2);box-shadow:none!important}",
			"html[data-dsh-mobile] [data-dsh-frame]:not([data-sidebar-collapsed])>[data-dsh-sidebar]{left:0;box-shadow:var(--dsw-shadow-lv3)!important}",
			"html[data-dsh-mobile] [data-dsh-frame]>[data-dsh-details]{position:fixed;top:0;bottom:0;right:0;z-index:58;--dsh-details-w:min(88vw,380px);width:var(--dsh-details-w);right:calc(-1 * var(--dsh-details-w));transition:right .25s var(--ds-ease-in-out,ease);border-left:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);box-shadow:none!important}",
			"html[data-dsh-mobile] [data-dsh-frame]:not([data-details-collapsed])>[data-dsh-details]{right:0;box-shadow:var(--dsw-shadow-lv3)!important}",
			"html[data-dsh-mobile] [data-dsh-frame]>[data-side],html[data-dsh-tablet] [data-dsh-frame]>[data-side]{display:none!important}",
			"[data-dsh-hamburger]{display:none}",
			"html[data-dsh-mobile] [data-dsh-hamburger]{display:flex!important}",
			"html[data-dsh-mobile] [data-dsh-frame]:not([data-sidebar-collapsed]) [data-dsh-hamburger]{display:none!important}",
			"[data-dsh-scrim]{position:absolute;inset:0;z-index:55;background:var(--dsw-alias-bg-mask-3,rgba(0,0,0,.48));opacity:0;pointer-events:none;transition:opacity .25s var(--ds-ease-in-out,ease)}",
			"html[data-dsh-mobile] [data-dsh-frame]:not([data-sidebar-collapsed]) [data-dsh-scrim]{opacity:1;pointer-events:auto}",
			/* Settings modal (rendered inside the sidebar, position:fixed): on phones make
			* it a full-screen page with a horizontal nav row so the two-column desktop
			* layout cannot squeeze the content column (model names / permission rows). */
			"html[data-dsh-mobile] [data-dsh-modal]{width:100vw!important;max-width:100vw!important;height:100dvh!important;max-height:100dvh!important;border-radius:0!important;flex-direction:column!important}",
			"html[data-dsh-mobile] [data-dsh-modal]>[data-dsh-modal-nav]{flex-direction:row!important;flex:none!important;width:100%!important;max-width:100%!important;gap:6px!important;padding:12px 12px 0!important;overflow-x:auto!important;-webkit-overflow-scrolling:touch;scrollbar-width:none}",
			"html[data-dsh-mobile] [data-dsh-modal]>[data-dsh-modal-nav]>[class$=_navTitle]{display:none!important}",
			"html[data-dsh-mobile] [data-dsh-modal]>[data-dsh-modal-nav]>[class$=_navList]{flex-direction:row!important;gap:4px!important;padding-bottom:8px}",
			"html[data-dsh-mobile] [data-dsh-modal]>[data-dsh-modal-content]{min-width:0!important}",
			"html[data-dsh-mobile] [data-dsh-modal-content] [class$=_options]{padding-left:16px!important;padding-right:16px!important}",
			/* model name rows: truncate long names instead of overflowing / wrapping */
			"html[data-dsh-mobile] [data-dsh-modal-content] [class$=_rowHead]{min-width:0!important}",
			"html[data-dsh-mobile] [data-dsh-modal-content] [class$=_rowIdentity]{flex:1 1 auto!important;min-width:0!important}",
			"html[data-dsh-mobile] [data-dsh-modal-content] [class$=_rowName]{max-width:100%!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}",
			/* permission rows: keep the text + selector pill from overflowing */
			"html[data-dsh-mobile] [data-dsh-modal-content] [class$=_row]{min-width:0!important}",
			"html[data-dsh-mobile] [data-dsh-modal-content] [class$=_rowText]{padding-right:12px!important}",
			"html[data-dsh-mobile] [data-dsh-modal-content] [class$=_selector]{flex:none!important}",
			/* Composer toolbar row (below the chat input): on phones keep "+",
			* the permission button, the model name and send on ONE line. The
			* permission trigger becomes an icon-only button (its name appears in
			* the picker after tapping) so the row never needs to squeeze or wrap;
			* the model group keeps its own UI and may only shrink (ellipsis) at
			* very narrow widths. The :has() guard scopes this to the composer
			* toolbar row (the only _row carrying a trailing group). */
			"html[data-dsh-mobile] [class$=_row]:has([class$=_trailing]){flex-wrap:nowrap!important}",
			"html[data-dsh-mobile] [class$=_row]:has([class$=_trailing])>[class$=_tools]{flex:0 0 auto!important;min-width:0!important;overflow:visible!important}",
			"html[data-dsh-mobile] [class$=_row]:has([class$=_trailing])>[class$=_trailing]{flex:0 1 auto!important;min-width:0!important;margin-left:auto!important}",
			"html[data-dsh-mobile] [class$=_row]:has([class$=_trailing]) [class$=_modes] [class$=_triggerLabel]{display:none!important}",
			"html[data-dsh-mobile] [class$=_row]:has([class$=_trailing]) [class$=_modes] [class$=_trigger]{width:28px!important;height:28px!important;padding:0!important;justify-content:center!important;flex:none!important}",
			"html[data-dsh-mobile] [class$=_row]:has([class$=_trailing]) [class$=_modes] [class$=_chevron]{display:none!important}",
			/* model group: allow the name to ellipsize instead of overlapping the
			* send button on very narrow screens (≥390px nothing changes — the row
			* fits at its natural width). */
			"html[data-dsh-mobile] [class$=_row]:has([class$=_trailing]) [class$=_trailing] [class$=_root]{min-width:0!important}",
			"html[data-dsh-mobile] [class$=_row]:has([class$=_trailing]) [class$=_trailing] [class$=_trigger]{min-width:0!important;max-width:100%!important}",
			"@media (prefers-reduced-motion:reduce){html[data-dsh-mobile] [data-dsh-frame]>[data-dsh-sidebar],html[data-dsh-mobile] [data-dsh-frame]>[data-dsh-details],html[data-dsh-mobile] [data-dsh-scrim]{transition:none}}"
		].join("\n");

		/** Inject the stylesheet once (tagged so HMR/plugin bookkeeping can claim it). */
		function injectStyles() {
			if (document.querySelector(`style[data-plugin-css=${JSON.stringify(STYLE_TAG_ID)}]`) !== null) return;
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-client-ui-android";
			tag.dataset.pluginCss = STYLE_TAG_ID;
			tag.textContent = CSS;
			document.head.appendChild(tag);
		}

		/**
		* Tag the AppFrame and its three columns with stable data attributes so the
		* stylesheet can target them without depending on hashed class names, and
		* tag the settings modal (rendered inside the sidebar's settings area) so
		* the mobile full-screen modal styles can address it the same way.
		*/
		function tagFrame(root) {
			const overlay = root.querySelector("[data-shell-overlay]");
			if (overlay !== null && overlay.parentElement !== null) {
				const frame = overlay.parentElement;
				frame.setAttribute("data-dsh-frame", "");
				const children = frame.children;
				if (children.length >= 3) {
					children[0].setAttribute("data-dsh-sidebar", "");
					children[1].setAttribute("data-dsh-center", "");
					children[2].setAttribute("data-dsh-details", "");
				}
			}
			const modal = root.querySelector('[aria-modal="true"]');
			if (modal !== null) {
				modal.setAttribute("data-dsh-modal", "");
				if (modal.children.length >= 2) {
					modal.children[0].setAttribute("data-dsh-modal-nav", "");
					modal.children[1].setAttribute("data-dsh-modal-content", "");
				}
			}
		}

		function watchFrame() {
			if (typeof document === "undefined") return;
			tagFrame(document);
			/* Keep watching: the shell mounts after this plugin loads, and modals
			* mount/unmount on demand — the observer stays alive (cheap) and re-tags
			* idempotently. */
			const observer = new MutationObserver(() => {
				tagFrame(document);
			});
			observer.observe(document.body ?? document.documentElement, { childList: true, subtree: true });
		}

		/** Keep the <html> stamps fresh across resize / rotation. */
		function watchResize() {
			let timer = null;
			window.addEventListener("resize", () => {
				if (timer !== null) clearTimeout(timer);
				timer = setTimeout(() => {
					timer = null;
					detected = detectDevice();
					applyAttributes();
				}, 120);
			}, { passive: true });
		}

		/** Full adaptation pass — never throws. */
		function runAdaptation() {
			try {
				detected = detectDevice();
				applyAttributes();
				patchViewport();
				injectStyles();
				watchFrame();
				watchResize();
				globalThis.__DSH_DEVICE__ = detected;
			} catch (error) {
				// Adaptation must never take the shell down with it.
				console.warn("[dsh-client-ui-android] adaptation failed", error);
			}
		}
		//#endregion
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region lib/types/client/ui.js
		/**
		* The mobile control surface, mounted into the shell.overlay slot:
		* - a floating hamburger (visible only on phones) that toggles the sidebar
		*   through ctx.layout.toggleSidebar() — below 1024px the layout store's
		*   toggle flips the narrowExpanded override, which the stylesheet uses to
		*   slide the sidebar in as an off-canvas drawer;
		* - a scrim behind the drawer that closes it on tap.
		* Both are styled by the injected stylesheet; the components themselves are
		* invisible on desktop.
		*/
		function AndroidAdaptationUI({ toggleSidebar }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, {
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						"data-dsh-scrim": true,
						"aria-hidden": true,
						onClick: toggleSidebar
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						"data-dsh-hamburger": true,
						"aria-label": "Open navigation",
						title: "Open navigation",
						onClick: toggleSidebar,
						style: {
							position: "fixed",
							top: "calc(env(safe-area-inset-top, 0px) + 8px)",
							left: 8,
							zIndex: 50,
							width: 40,
							height: 40,
							alignItems: "center",
							justifyContent: "center",
							borderRadius: 12,
							background: "var(--dsw-alias-button-floating-fill)",
							color: "var(--dsw-alias-label-primary)",
							border: "1px solid var(--dsw-alias-border-l2)",
							boxShadow: "var(--dsw-shadow-lv2)",
							cursor: "pointer",
							padding: 0
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
								width: 20,
								height: 20,
								viewBox: "0 0 24 24",
								fill: "none",
								stroke: "currentColor",
								strokeWidth: 2,
								strokeLinecap: "round",
								"aria-hidden": true,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", { x1: 3, y1: 6, x2: 21, y2: 6 }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", { x1: 3, y1: 12, x2: 21, y2: 12 }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", { x1: 3, y1: 18, x2: 21, y2: 18 })
								]
							})
						]
					})
				]
			});
		}
		//#endregion
		//#region lib/types/client/index.js
		/** Client services this plugin depends on (the slot registry and the layout controller). */
		const inject = ["slots", "layout"];
		/**
		* Client plugin body: run the adaptation pass, then seat the mobile
		* control surface in the shell.overlay slot.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			runAdaptation();
			ctx.effect(() => ctx.slots.inject("shell.overlay", () => ctx.slots.register({
				name: "shell.overlay",
				id: "dsh-client-ui-android",
				order: 90,
				label: "Android adaptation",
				inject: () => ({
					toggleSidebar: () => {
						ctx.layout.toggleSidebar();
					}
				})
			}, AndroidAdaptationUI)), "dsh-client-ui-android: shell overlay UI");
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
