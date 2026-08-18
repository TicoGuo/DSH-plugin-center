window.__ModuleLoader__.load({
	id: "@ticoguo/dsh-plugin-center",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _deepseek_ai_dsh_client_runtime_client = require("@deepseek-ai/dsh-client-runtime/client");
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/plugin-center-store.ts
		/** The filter options in toolbar order. */
		const PLUGIN_CENTER_FILTERS = [
			"all",
			"installed",
			"updatable",
			"disabled"
		];
		/**
		* Filter entries by the active toolbar filter and a name/description query.
		* @param entries - the merged catalog rows.
		* @param query - raw search text.
		* @param filter - the active filter id.
		* @returns matching rows in catalog order.
		*/
		function filterPluginEntries(entries, query, filter) {
			const normalized = query.trim().toLocaleLowerCase();
			return entries.filter((entry) => {
				if (filter === "installed" && (entry.state === "not-installed" || entry.state === "disabled")) return false;
				if (filter === "updatable" && entry.state !== "update-available") return false;
				if (filter === "disabled" && entry.state !== "disabled") return false;
				if (normalized === "") return true;
				return entry.name.toLocaleLowerCase().includes(normalized) || entry.description.toLocaleLowerCase().includes(normalized) || entry.packageName.toLocaleLowerCase().includes(normalized);
			});
		}
		//#endregion
		//#region \0dsh-css:src/client/PluginCenterView.module.css.mjs
		const css$1 = "._0K5v1W_root{overscroll-behavior:contain;min-height:0;color:var(--dsw-alias-label-primary);flex:auto;padding:16px 32px;overflow-y:auto}._0K5v1W_content{flex-direction:column;gap:16px;width:100%;max-width:748px;margin:0 auto;display:flex}._0K5v1W_header{flex-wrap:wrap;justify-content:space-between;align-items:center;gap:16px;min-height:32px;display:flex}._0K5v1W_titleRow{align-items:center;gap:8px;min-width:0;display:flex}._0K5v1W_title{margin:0;font-size:14px;font-weight:500;line-height:20px}._0K5v1W_stats{color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;white-space:nowrap;font-size:12px;line-height:18px}._0K5v1W_headerControls{flex:auto;justify-content:flex-end;align-items:center;gap:8px;min-width:220px;display:flex}._0K5v1W_search{max-width:360px;color:var(--dsw-alias-label-tertiary);flex:260px;align-items:center;display:flex;position:relative}._0K5v1W_search>svg{pointer-events:none;position:absolute;left:12px}._0K5v1W_search input{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);width:100%;height:34px;color:var(--dsw-alias-label-primary);font:inherit;border-radius:999px;outline:none;padding:0 14px 0 34px;font-size:13px;transition:border-color .16s,box-shadow .16s}._0K5v1W_search input::placeholder{color:var(--dsw-alias-label-tertiary)}._0K5v1W_search input:focus-visible{border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 3px color-mix(in srgb, var(--dsw-alias-brand-primary) 16%, transparent)}._0K5v1W_refresh{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);width:34px;height:34px;color:var(--dsw-alias-label-secondary);cursor:pointer;border-radius:999px;flex:none;justify-content:center;align-items:center;transition:border-color .16s,color .16s,background .16s;display:inline-flex}._0K5v1W_refresh:hover{border-color:var(--dsw-alias-label-dimmed);color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}._0K5v1W_stickyBar{background:var(--dsw-alias-bg-base);flex-direction:column;flex:none;padding:12px 28px 0 20px;display:flex;position:relative}._0K5v1W_stickyBar:after{content:\"\";background:var(--dsw-alias-border-l2);pointer-events:none;height:1px;position:absolute;bottom:1px;left:0;right:0}._0K5v1W_tabs{gap:36px;margin-top:4px;padding-left:8px;display:flex}._0K5v1W_tab{color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;padding:0 0 11px;font-size:13px;font-weight:500;line-height:16px;position:relative}._0K5v1W_tab:after{content:\"\";background:0 0;border-radius:2px;height:2px;position:absolute;bottom:1px;left:0;right:0}._0K5v1W_tab:hover{color:var(--dsw-alias-label-primary)}._0K5v1W_tabActive{color:var(--dsw-alias-state-business-primary)}._0K5v1W_tabActive:after{background:var(--dsw-alias-state-business-primary)}._0K5v1W_status{color:var(--dsw-alias-label-tertiary);margin:0;font-size:13px;line-height:20px}._0K5v1W_banner{border:1px solid color-mix(in srgb, var(--dsw-alias-state-warning-primary,#f59e0b) 35%, transparent);background:color-mix(in srgb, var(--dsw-alias-state-warning-primary,#f59e0b) 8%, transparent);color:var(--dsw-alias-label-secondary);border-radius:10px;margin:0;padding:8px 12px;font-size:12px;line-height:18px}._0K5v1W_failure{color:var(--dsw-alias-state-error-primary);align-items:center;gap:10px;font-size:13px;line-height:20px;display:flex}._0K5v1W_failure p{margin:0}._0K5v1W_failure button{border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer;background:0 0;border-radius:8px;padding:4px 12px}._0K5v1W_disabled{text-align:center;flex-direction:column;align-items:center;gap:14px;max-width:360px;margin:64px auto 0;display:flex}._0K5v1W_disabled p{color:var(--dsw-alias-label-secondary);margin:0;font-size:13px;line-height:20px}._0K5v1W_disabled button{appearance:none;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-3);font:inherit;cursor:pointer;border-radius:999px;padding:7px 22px;font-size:13px;font-weight:600;transition:opacity .16s}._0K5v1W_disabled button:hover:not(:disabled){opacity:.85}._0K5v1W_disabled button:disabled{opacity:.5;cursor:default}._0K5v1W_disabled ._0K5v1W_error{color:var(--dsw-alias-state-error-primary);margin:0;font-size:12px;line-height:18px}._0K5v1W_cards{grid-template-columns:repeat(2,minmax(0,1fr));align-items:start;gap:12px;margin:0;padding:0;list-style:none;display:grid}@media (width<=760px){._0K5v1W_cards{grid-template-columns:minmax(0,1fr)}}._0K5v1W_card{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);contain:content;content-visibility:auto;contain-intrinsic-size:auto 150px;border-radius:12px;transition:border-color .16s,box-shadow .16s;overflow:hidden}._0K5v1W_card:hover{border-color:var(--dsw-alias-label-dimmed)}._0K5v1W_card[data-open=true]{border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 3px color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, transparent)}._0K5v1W_cardContent{box-sizing:border-box;width:100%;color:inherit;font:inherit;text-align:left;cursor:pointer;background:0 0;border:0;align-items:flex-start;gap:12px;padding:14px 14px 12px;display:flex}._0K5v1W_cardContent:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}._0K5v1W_cardMain{flex-direction:column;flex:auto;gap:3px;min-width:0;display:flex}._0K5v1W_nameRow{align-items:baseline;gap:8px;min-width:0;display:flex}._0K5v1W_cardTitle{text-overflow:ellipsis;white-space:nowrap;min-width:0;font-size:14px;font-weight:600;line-height:20px;overflow:hidden}._0K5v1W_stars{color:var(--dsw-alias-state-warning-primary,#f59e0b);font-variant-numeric:tabular-nums;flex:none;font-size:12px;line-height:18px}._0K5v1W_author{color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;line-height:16px;overflow:hidden}._0K5v1W_description{-webkit-line-clamp:2;color:var(--dsw-alias-label-secondary);-webkit-box-orient:vertical;margin:2px 0 0;font-size:12px;line-height:18px;display:-webkit-box;overflow:hidden}._0K5v1W_cardTrailing{color:var(--dsw-alias-label-tertiary);flex:none;align-items:center;gap:7px;display:inline-flex}._0K5v1W_statusTag{background:var(--dsw-alias-bg-layer-1);min-height:20px;color:var(--dsw-alias-label-secondary);white-space:nowrap;border-radius:999px;align-items:center;padding:1px 8px;font-size:11px;line-height:16px;display:inline-flex}._0K5v1W_statusTag[data-state=enabled]{background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 12%, transparent);color:var(--dsw-alias-state-success-primary)}._0K5v1W_statusTag[data-state=update-available]{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent);color:var(--dsw-alias-brand-primary)}._0K5v1W_statusTag[data-state=disabled]{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-tertiary)}._0K5v1W_chevron{flex:none;transition:transform .16s}._0K5v1W_card[data-open=true] ._0K5v1W_chevron{transform:rotate(180deg)}._0K5v1W_actions{align-items:center;gap:6px;padding:0 14px 14px;display:flex}._0K5v1W_actions button{appearance:none;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer;border-radius:8px;padding:5px 14px;font-size:12px;line-height:18px;transition:background .16s,border-color .16s,opacity .16s}._0K5v1W_actions button:hover:not(:disabled){border-color:var(--dsw-alias-label-dimmed);background:var(--dsw-alias-interactive-bg-hover)}._0K5v1W_actions button:disabled{opacity:.45;cursor:default}._0K5v1W_actions button[data-action=install],._0K5v1W_actions button[data-action=update],._0K5v1W_actions button[data-action=enable]{border-color:var(--dsw-alias-label-primary);background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-3);font-weight:600}._0K5v1W_actions button[data-action=install]:hover:not(:disabled),._0K5v1W_actions button[data-action=update]:hover:not(:disabled),._0K5v1W_actions button[data-action=enable]:hover:not(:disabled){opacity:.85;background:var(--dsw-alias-label-primary)}._0K5v1W_actions button[data-action=uninstall]{border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 40%, transparent);color:var(--dsw-alias-state-error-primary)}._0K5v1W_actions button[data-action=uninstall]:hover:not(:disabled){background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent);border-color:var(--dsw-alias-state-error-primary)}._0K5v1W_details{border-top:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-module-platform);padding:12px 14px 14px}._0K5v1W_details dl{grid-template-columns:88px minmax(0,1fr);gap:8px 10px;margin:0;display:grid}._0K5v1W_details div{display:contents}._0K5v1W_details dt{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:18px}._0K5v1W_details dd{overflow-wrap:anywhere;min-width:0;color:var(--dsw-alias-label-secondary);margin:0;font-size:12px;line-height:18px}._0K5v1W_details a{color:var(--dsw-alias-brand-primary);text-decoration:none}._0K5v1W_details a:hover{text-decoration:underline}._0K5v1W_details code{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-1);overflow-wrap:anywhere;border-radius:6px;padding:2px 6px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px}";
		const tagId$1 = "@ticoguo/dsh-plugin-center/PluginCenterView.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@ticoguo/dsh-plugin-center";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var PluginCenterView_module_css_default = {
			"statusTag": "_0K5v1W_statusTag",
			"stickyBar": "_0K5v1W_stickyBar",
			"root": "_0K5v1W_root",
			"card": "_0K5v1W_card",
			"titleRow": "_0K5v1W_titleRow",
			"status": "_0K5v1W_status",
			"author": "_0K5v1W_author",
			"tab": "_0K5v1W_tab",
			"content": "_0K5v1W_content",
			"refresh": "_0K5v1W_refresh",
			"header": "_0K5v1W_header",
			"tabActive": "_0K5v1W_tabActive",
			"failure": "_0K5v1W_failure",
			"cardTitle": "_0K5v1W_cardTitle",
			"nameRow": "_0K5v1W_nameRow",
			"disabled": "_0K5v1W_disabled",
			"title": "_0K5v1W_title",
			"search": "_0K5v1W_search",
			"stats": "_0K5v1W_stats",
			"headerControls": "_0K5v1W_headerControls",
			"stars": "_0K5v1W_stars",
			"actions": "_0K5v1W_actions",
			"cardTrailing": "_0K5v1W_cardTrailing",
			"details": "_0K5v1W_details",
			"cardContent": "_0K5v1W_cardContent",
			"cardMain": "_0K5v1W_cardMain",
			"tabs": "_0K5v1W_tabs",
			"error": "_0K5v1W_error",
			"cards": "_0K5v1W_cards",
			"banner": "_0K5v1W_banner",
			"description": "_0K5v1W_description",
			"chevron": "_0K5v1W_chevron"
		};
		//#endregion
		//#region src/client/PluginCenterView.tsx
		/** Plugin Center view: header, filter pills, card grid, detail expansion, and mutation feedback. */
		const STATUS_LABEL_KEY = {
			"not-installed": "status.notInstalled",
			"enabled": "status.enabled",
			"disabled": "status.disabled",
			"update-available": "status.updateAvailable"
		};
		const FILTER_LABEL_KEY = {
			all: "filter.all",
			installed: "filter.installed",
			updatable: "filter.updatable",
			disabled: "filter.disabled"
		};
		const ACTION_LABEL_KEY = {
			install: "action.install",
			uninstall: "action.uninstall",
			update: "action.update",
			enable: "action.enable",
			disable: "action.disable"
		};
		const SUCCESS_TOAST_KEY = {
			install: "toast.install",
			uninstall: "toast.uninstall",
			update: "toast.update",
			enable: "toast.enable",
			disable: "toast.disable"
		};
		/** Format a star count compactly (20008 → "20.0k"). */
		function formatStars(stars) {
			if (stars >= 1e3) return `${(stars / 1e3).toFixed(1)}k`;
			return String(stars);
		}
		/** Build one card's action buttons for the entry's current state. */
		function actionButtons(entry) {
			switch (entry.state) {
				case "not-installed": return ["install"];
				case "enabled": return [
					"update",
					"disable",
					"uninstall"
				];
				case "disabled": return [
					"update",
					"enable",
					"uninstall"
				];
				case "update-available": return [
					"update",
					"disable",
					"uninstall"
				];
			}
		}
		/** The Plugin Center conversation view. */
		function PluginCenterView({ t, list, refresh, install, uninstall, update, setEnabled, featureEnabled, setFeatureEnabled }) {
			const [state, setState] = (0, react.useState)({ status: "loading" });
			const [query, setQuery] = (0, react.useState)("");
			const [filter, setFilter] = (0, react.useState)("all");
			const [expandedId, setExpandedId] = (0, react.useState)(null);
			const [pending, setPending] = (0, react.useState)(/* @__PURE__ */ new Set());
			const [confirmEntry, setConfirmEntry] = (0, react.useState)(null);
			const [toast, setToast] = (0, react.useState)(null);
			const [featureBusy, setFeatureBusy] = (0, react.useState)(false);
			const [featureError, setFeatureError] = (0, react.useState)(null);
			const toastSeq = (0, react.useRef)(0);
			const applyResult = (0, react.useCallback)((result) => {
				setState({
					status: "ready",
					snapshot: result,
					error: result.error
				});
			}, []);
			const load = (0, react.useCallback)(() => {
				setState((current) => current.status === "ready" ? current : { status: "loading" });
				list().then(applyResult, () => {
					setState({ status: "error" });
				});
			}, [applyResult, list]);
			(0, react.useEffect)(() => {
				if (featureEnabled === true) load();
			}, [featureEnabled, load]);
			const reload = (0, react.useCallback)(() => {
				list().then(applyResult, () => {
					setState({ status: "error" });
				});
			}, [applyResult, list]);
			const runRefresh = (0, react.useCallback)(() => {
				setState({ status: "loading" });
				refresh().then(applyResult, () => {
					setState({ status: "error" });
				});
			}, [applyResult, refresh]);
			const run = (0, react.useCallback)((id, action, op) => {
				setPending((current) => new Set(current).add(id));
				op().then((result) => {
					setToast({
						seq: ++toastSeq.current,
						text: result.ok ? result.code === "up-to-date" ? t("toast.upToDate") : `${t(SUCCESS_TOAST_KEY[action])}${t("toast.restartHint")}` : t("toast.failed", { message: result.message })
					});
				}, (error) => {
					setToast({
						seq: ++toastSeq.current,
						text: t("toast.failed", { message: error instanceof Error ? error.message : String(error) })
					});
				}).finally(() => {
					setPending((current) => {
						const next = new Set(current);
						next.delete(id);
						return next;
					});
					reload();
				});
			}, [reload, t]);
			const enableFeature = (0, react.useCallback)(() => {
				setFeatureBusy(true);
				setFeatureError(null);
				setFeatureEnabled(true).catch((error) => {
					setFeatureError(error instanceof Error ? error.message : String(error));
				}).finally(() => {
					setFeatureBusy(false);
				});
			}, [setFeatureEnabled]);
			const snapshot = state.status === "ready" ? state.snapshot : void 0;
			const loadError = state.status === "ready" ? state.error : null;
			const filtered = (0, react.useMemo)(() => snapshot === void 0 ? [] : filterPluginEntries(snapshot.entries, query, filter), [
				filter,
				query,
				snapshot
			]);
			if (featureEnabled === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: PluginCenterView_module_css_default.status,
				children: t("loading")
			});
			if (featureEnabled === false) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: PluginCenterView_module_css_default.disabled,
				role: "status",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: t("disabled") }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						disabled: featureBusy,
						onClick: enableFeature,
						children: featureBusy ? t("loading") : t("enableFeature")
					}),
					featureError !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: PluginCenterView_module_css_default.error,
						role: "alert",
						children: featureError
					}) : null
				]
			});
			const invoke = (id, action) => {
				switch (action) {
					case "install":
						run(id, "install", () => install(id));
						return;
					case "uninstall":
						setConfirmEntry(snapshot?.entries.find((entry) => entry.id === id) ?? null);
						return;
					case "update":
						run(id, "update", () => update(id));
						return;
					case "enable":
						run(id, "enable", () => setEnabled(id, true));
						return;
					case "disable":
						run(id, "disable", () => setEnabled(id, false));
						return;
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: PluginCenterView_module_css_default.stickyBar,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
					className: PluginCenterView_module_css_default.header,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: PluginCenterView_module_css_default.titleRow,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
							className: PluginCenterView_module_css_default.title,
							children: t("view.pluginCenter")
						}), snapshot !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: PluginCenterView_module_css_default.stats,
							children: t("stats", {
								installed: snapshot.installedCount,
								total: snapshot.totalCount
							})
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: PluginCenterView_module_css_default.headerControls,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: PluginCenterView_module_css_default.search,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSearchOutline16, { "aria-hidden": "true" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								type: "search",
								value: query,
								placeholder: t("search"),
								"aria-label": t("search"),
								onChange: (event) => {
									setQuery(event.currentTarget.value);
								}
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: PluginCenterView_module_css_default.refresh,
							title: t("refresh"),
							"aria-label": t("refresh"),
							onClick: runRefresh,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutline16, { "aria-hidden": "true" })
						})]
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: PluginCenterView_module_css_default.tabs,
					role: "tablist",
					"aria-label": t("filter.all"),
					children: PLUGIN_CENTER_FILTERS.map((option) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						role: "tab",
						"aria-selected": filter === option,
						className: filter === option ? `${PluginCenterView_module_css_default.tab} ${PluginCenterView_module_css_default.tabActive}` : PluginCenterView_module_css_default.tab,
						onClick: () => {
							setFilter(option);
							setExpandedId(null);
							setConfirmEntry(null);
						},
						children: t(FILTER_LABEL_KEY[option])
					}, option))
				})]
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: PluginCenterView_module_css_default.root,
				"data-plugin-center": "",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: PluginCenterView_module_css_default.content,
					children: [
						loadError !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: PluginCenterView_module_css_default.banner,
							role: "alert",
							children: t("githubError", { message: loadError })
						}) : null,
						state.status === "loading" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: PluginCenterView_module_css_default.status,
							children: t("loading")
						}) : null,
						state.status === "error" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: PluginCenterView_module_css_default.failure,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								role: "alert",
								children: t("error")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: runRefresh,
								children: t("retry")
							})]
						}) : null,
						snapshot !== void 0 && snapshot.entries.length === 0 && loadError === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: PluginCenterView_module_css_default.status,
							children: t("empty")
						}) : null,
						snapshot !== void 0 && snapshot.entries.length > 0 && filtered.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: PluginCenterView_module_css_default.status,
							children: t("emptySearch")
						}) : null,
						filtered.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
							className: PluginCenterView_module_css_default.cards,
							children: filtered.map((entry) => {
								const open = expandedId === entry.id;
								const busy = pending.has(entry.id);
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
									className: PluginCenterView_module_css_default.card,
									"data-open": open || void 0,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											className: PluginCenterView_module_css_default.cardContent,
											"aria-expanded": open,
											onClick: () => {
												setExpandedId((current) => current === entry.id ? null : entry.id);
											},
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												className: PluginCenterView_module_css_default.cardMain,
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
														className: PluginCenterView_module_css_default.nameRow,
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
															className: PluginCenterView_module_css_default.cardTitle,
															children: entry.name
														}), entry.stars > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
															className: PluginCenterView_module_css_default.stars,
															title: t("detail.stars"),
															children: ["★ ", formatStars(entry.stars)]
														})]
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: PluginCenterView_module_css_default.author,
														children: entry.author
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: PluginCenterView_module_css_default.description,
														children: entry.description
													})
												]
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												className: PluginCenterView_module_css_default.cardTrailing,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: PluginCenterView_module_css_default.statusTag,
													"data-state": entry.state,
													children: t(STATUS_LABEL_KEY[entry.state])
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, {
													className: PluginCenterView_module_css_default.chevron,
													size: 14,
													"aria-hidden": "true"
												})]
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: PluginCenterView_module_css_default.actions,
											children: actionButtons(entry).map((kind) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												disabled: busy,
												"data-action": kind,
												onClick: () => {
													invoke(entry.id, kind);
												},
												children: busy ? t("loading") : t(ACTION_LABEL_KEY[kind])
											}, kind))
										}),
										open ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: PluginCenterView_module_css_default.details,
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("dl", { children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("detail.description") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: entry.description })] }),
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("detail.author") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: entry.author })] }),
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("detail.stars") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: entry.stars })] }),
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("detail.repository") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
													href: entry.repository,
													target: "_blank",
													rel: "noreferrer",
													children: entry.repository
												}) })] }),
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("detail.installCommand") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: `dsh plugin add ${entry.packageName}` }) })] }),
												entry.installedVersion !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("detail.installedVersion") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: entry.installedVersion })] })
											] })
										}) : null
									]
								}, entry.id);
							})
						}) : null,
						toast !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Toast, {
							text: toast.text,
							onDone: () => {
								setToast(null);
							}
						}, toast.seq),
						confirmEntry !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
							open: true,
							onClose: () => {
								setConfirmEntry(null);
							},
							title: t("confirm.uninstallTitle"),
							footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => {
									setConfirmEntry(null);
								},
								children: t("confirm.cancel")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								"data-danger": "true",
								onClick: () => {
									const entry = confirmEntry;
									setConfirmEntry(null);
									run(entry.id, "uninstall", () => uninstall(entry.id));
								},
								children: t("confirm.confirm")
							})] }),
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: t("confirm.uninstallBody", { name: confirmEntry.name }) })
						})
					]
				})
			})] });
		}
		//#endregion
		//#region \0dsh-css:src/client/PluginCenterSidebarButton.module.css.mjs
		const css = "._4bqZ2q_button{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-button-elevated-fill);width:100%;height:38px;color:var(--dsw-alias-label-primary);cursor:pointer;border-radius:12px;flex:none;justify-content:center;align-items:center;gap:6px;margin:0 2px 8px;padding:8px 16px;font-size:14px;font-weight:500;line-height:22px;display:flex;overflow:hidden}._4bqZ2q_button:hover{background:var(--dsw-alias-button-floating-hover)}._4bqZ2q_buttonRail{cursor:pointer;background:0 0;border:1px solid #0000;border-radius:12px;justify-content:center;align-items:center;width:36px;height:36px;padding:0;display:flex}._4bqZ2q_buttonRail:hover{background:var(--dsw-alias-interactive-bg-hover)}._4bqZ2q_label{white-space:nowrap;max-width:200px;overflow:hidden}._4bqZ2q_overlay{z-index:1000;box-sizing:border-box;background:var(--dsw-alias-bg-base);flex-direction:column;display:flex;position:fixed;top:0;bottom:0;right:0}";
		const tagId = "@ticoguo/dsh-plugin-center/PluginCenterSidebarButton.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@ticoguo/dsh-plugin-center";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var PluginCenterSidebarButton_module_css_default = {
			"label": "_4bqZ2q_label",
			"button": "_4bqZ2q_button",
			"overlay": "_4bqZ2q_overlay",
			"buttonRail": "_4bqZ2q_buttonRail"
		};
		//#endregion
		//#region src/client/PluginCenterSidebarButton.tsx
		/** The Plugin Center sidebar entry: a footer button (New-Session chrome) that opens a right-panel overlay. */
		/** The footer button plus the right-panel overlay it toggles. */
		function PluginCenterSidebarButton({ t, wide, useFeatureEnabled, setFeatureEnabled, list, refresh, install, uninstall, update, setEnabled }) {
			const [open, setOpen] = (0, react.useState)(false);
			const [left, setLeft] = (0, react.useState)(0);
			const buttonRef = (0, react.useRef)(null);
			const featureEnabled = useFeatureEnabled((value) => value.enabled);
			(0, react.useEffect)(() => {
				if (!open) return;
				const onKey = (event) => {
					if (event.key === "Escape") setOpen(false);
				};
				document.addEventListener("keydown", onKey);
				return () => {
					document.removeEventListener("keydown", onKey);
				};
			}, [open]);
			const toggle = () => {
				if (open) {
					setOpen(false);
					return;
				}
				const rect = buttonRef.current?.getBoundingClientRect();
				setLeft(wide ? rect?.right ?? 280 : 56);
				setOpen(true);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				ref: buttonRef,
				type: "button",
				className: wide ? PluginCenterSidebarButton_module_css_default.button : PluginCenterSidebarButton_module_css_default.buttonRail,
				onClick: toggle,
				title: t("view.pluginCenter"),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCordisPluginOutline14, { size: wide ? 14 : 18 }), wide && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: PluginCenterSidebarButton_module_css_default.label,
					children: t("view.pluginCenter")
				})]
			}), open && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: PluginCenterSidebarButton_module_css_default.overlay,
				style: { left },
				role: "dialog",
				"aria-modal": "true",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PluginCenterView, {
					t,
					list,
					refresh,
					install,
					uninstall,
					update,
					setEnabled,
					featureEnabled,
					setFeatureEnabled
				})
			})] });
		}
		//#endregion
		//#region src/client/locales.ts
		/** `pluginCenter` namespace dictionaries (view tab, toolbar, cards, actions, settings card). */
		/** Dictionary namespace owned by this plugin. */
		const NS = "pluginCenter";
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"view.pluginCenter": "插件中心",
			"toolbar.aria": "插件中心工具栏",
			"search": "搜索插件",
			"filter.all": "全部",
			"filter.installed": "已安装",
			"filter.updatable": "可更新",
			"filter.disabled": "已停用",
			"refresh": "检查更新",
			"stats": "已安装 {installed} / {total}",
			"status.notInstalled": "未安装",
			"status.enabled": "已启用",
			"status.disabled": "已停用",
			"status.updateAvailable": "可更新",
			"action.install": "安装",
			"action.uninstall": "卸载",
			"action.update": "更新",
			"action.enable": "启用",
			"action.disable": "停用",
			"detail.version": "版本",
			"detail.installedVersion": "已安装版本",
			"detail.author": "作者",
			"detail.repository": "仓库",
			"detail.changelog": "更新日志",
			"detail.requirements": "依赖要求",
			"detail.requirementsEmpty": "无额外依赖要求",
			"detail.description": "简介",
			"detail.stars": "星标",
			"detail.installCommand": "安装命令",
			"confirm.uninstallTitle": "卸载插件",
			"confirm.uninstallBody": "确定要卸载「{name}」吗？将清理插件文件和数据。",
			"confirm.cancel": "取消",
			"confirm.confirm": "卸载",
			"toast.install": "安装完成",
			"toast.uninstall": "已卸载",
			"toast.update": "更新完成",
			"toast.enable": "已启用",
			"toast.disable": "已停用",
			"toast.failed": "操作失败：{message}",
			"toast.upToDate": "已是最新版本",
			"toast.restartHint": "（需重启 dsh web 生效）",
			"loading": "正在加载插件…",
			"error": "加载插件列表失败",
			"retry": "重试",
			"empty": "暂无插件",
			"emptySearch": "没有匹配的插件",
			"disabled": "插件中心已停用。",
			"enableFeature": "启用插件中心",
			"githubError": "无法加载插件列表：{message}"
		};
		/** English dictionary. */
		const en = {
			"view.pluginCenter": "Plugin Center",
			"toolbar.aria": "Plugin Center toolbar",
			"search": "Search plugins",
			"filter.all": "All",
			"filter.installed": "Installed",
			"filter.updatable": "Updatable",
			"filter.disabled": "Disabled",
			"refresh": "Check updates",
			"stats": "Installed {installed} / {total}",
			"status.notInstalled": "Not installed",
			"status.enabled": "Enabled",
			"status.disabled": "Disabled",
			"status.updateAvailable": "Update available",
			"action.install": "Install",
			"action.uninstall": "Uninstall",
			"action.update": "Update",
			"action.enable": "Enable",
			"action.disable": "Disable",
			"detail.version": "Version",
			"detail.installedVersion": "Installed version",
			"detail.author": "Author",
			"detail.repository": "Repository",
			"detail.changelog": "Changelog",
			"detail.requirements": "Requirements",
			"detail.requirementsEmpty": "No additional requirements",
			"detail.description": "About",
			"detail.stars": "Stars",
			"detail.installCommand": "Install command",
			"confirm.uninstallTitle": "Uninstall plugin",
			"confirm.uninstallBody": "Uninstall \"{name}\"? Plugin files and data will be removed.",
			"confirm.cancel": "Cancel",
			"confirm.confirm": "Uninstall",
			"toast.install": "Installed",
			"toast.uninstall": "Uninstalled",
			"toast.update": "Updated",
			"toast.enable": "Enabled",
			"toast.disable": "Disabled",
			"toast.failed": "Failed: {message}",
			"toast.upToDate": "Already up to date",
			"toast.restartHint": " (restart dsh web to apply)",
			"loading": "Loading plugins…",
			"error": "Failed to load plugins",
			"retry": "Retry",
			"empty": "No plugins",
			"emptySearch": "No matching plugins",
			"disabled": "Plugin Center is disabled.",
			"enableFeature": "Enable Plugin Center",
			"githubError": "Could not load the plugin list: {message}"
		};
		//#endregion
		//#region src/client/index.ts
		/** Services required: the slots service and the locale. */
		const inject = ["slots", "locale"];
		/** Timeout for read endpoints; mutations may legitimately run for minutes. */
		const READ_TIMEOUT_MS = 35e3;
		const REFRESH_TIMEOUT_MS = 6e4;
		/** Fetch one `/plugin-center` endpoint and parse its JSON body, throwing on a transport error. */
		async function request(path, init = {}) {
			const { timeoutMs, ...fetchInit } = init;
			const response = await fetch(`/plugin-center${path}`, {
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json"
				},
				...timeoutMs !== void 0 ? { signal: AbortSignal.timeout(timeoutMs) } : {},
				...fetchInit
			});
			if (!response.ok) {
				const body = await response.json().catch(() => ({}));
				throw new Error(body.message ?? `HTTP ${response.status}`);
			}
			return await response.json();
		}
		/**
		* Client plugin body: register the sidebar footer button. The on/off flag is
		* read from the host's `/plugin-center/status` route; a transient failure
		* retries with exponential backoff instead of permanently hiding the entry.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "ui-plugin-center: dictionaries");
			const list = () => request("/list", { timeoutMs: READ_TIMEOUT_MS });
			const refresh = () => request("/refresh", {
				method: "POST",
				timeoutMs: REFRESH_TIMEOUT_MS
			});
			const install = (id) => request("/install", {
				method: "POST",
				body: JSON.stringify({ id })
			});
			const uninstall = (id) => request("/uninstall", {
				method: "POST",
				body: JSON.stringify({ id })
			});
			const update = (id) => request("/update", {
				method: "POST",
				body: JSON.stringify({ id })
			});
			const setEnabled = (id, enabled) => request(enabled ? "/enable" : "/disable", {
				method: "POST",
				body: JSON.stringify({ id })
			});
			const status = () => request("/status", { timeoutMs: READ_TIMEOUT_MS });
			const setFeatureEnabled = (enabled) => request("/set-enabled", {
				method: "POST",
				body: JSON.stringify({ enabled })
			}).then((result) => {
				enabledStore.set({ enabled: result.enabled });
				return result;
			});
			const enabledStore = (0, _deepseek_ai_dsh_client_runtime_client.createSnapshotStore)({ enabled: null });
			const refreshEnabled = () => {
				const retryAfter = (delayMs) => {
					setTimeout(() => {
						status().then((snapshot) => {
							enabledStore.set({ enabled: snapshot.enabled });
						}, () => {
							retryAfter(Math.min(delayMs * 2, 3e4));
						});
					}, delayMs);
				};
				status().then((snapshot) => {
					enabledStore.set({ enabled: snapshot.enabled });
				}, () => {
					retryAfter(1e3);
				});
			};
			refreshEnabled();
			ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
				name: "sidebar.footer.action",
				id: "plugin-center",
				order: 20,
				locale: NS,
				inject: () => ({
					list,
					refresh,
					install,
					uninstall,
					update,
					setEnabled,
					setFeatureEnabled,
					hooks: { featureEnabled: enabledStore }
				})
			}, PluginCenterSidebarButton));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map