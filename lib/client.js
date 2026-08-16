window.__ModuleLoader__.load({
	id: "@ticoguo/dsh-plugin-center",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let _deepseek_ai_dsh_client_runtime_client = require("@deepseek-ai/dsh-client-runtime/client");
		//#region lib/types/client/plugin-center-store.js
		/** Pure Plugin Center projections: the toolbar filter, unit-tested without React. */
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
		//#region \0dsh-css:E:\DeepSeek_Harness_Code\deepseek-harness\packages\extensions\plugin-center\src\client\PluginCenterView.module.css.mjs
		const css$1 = ".rswBTa_root{width:100%;height:100%;color:var(--dsw-alias-label-primary);flex-direction:column;gap:16px;padding:4px 2px 24px;display:flex;overflow-y:auto}.rswBTa_header{flex-wrap:wrap;justify-content:space-between;align-items:center;gap:16px;display:flex}.rswBTa_titleRow{align-items:baseline;gap:10px;min-width:0;display:flex}.rswBTa_title{letter-spacing:-.01em;margin:0;font-size:18px;font-weight:650;line-height:26px}.rswBTa_stats{color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;white-space:nowrap;font-size:12px;line-height:18px}.rswBTa_headerControls{flex:auto;justify-content:flex-end;align-items:center;gap:8px;min-width:220px;display:flex}.rswBTa_search{max-width:360px;color:var(--dsw-alias-label-tertiary);flex:260px;align-items:center;display:flex;position:relative}.rswBTa_search>svg{pointer-events:none;position:absolute;left:12px}.rswBTa_search input{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);width:100%;height:34px;color:var(--dsw-alias-label-primary);font:inherit;border-radius:999px;outline:none;padding:0 14px 0 34px;font-size:13px;transition:border-color .16s,box-shadow .16s}.rswBTa_search input::placeholder{color:var(--dsw-alias-label-tertiary)}.rswBTa_search input:focus-visible{border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 3px color-mix(in srgb, var(--dsw-alias-brand-primary) 16%, transparent)}.rswBTa_refresh{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);width:34px;height:34px;color:var(--dsw-alias-label-secondary);cursor:pointer;border-radius:999px;flex:none;justify-content:center;align-items:center;transition:border-color .16s,color .16s,background .16s;display:inline-flex}.rswBTa_refresh:hover{border-color:var(--dsw-alias-label-dimmed);color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}.rswBTa_tabs{display:flex;gap:36px;padding-left:8px;border-bottom:1px solid var(--dsw-alias-border-l2)}.rswBTa_tab{position:relative;padding:0 0 11px;border:none;background:0 0;font:inherit;font-size:13px;line-height:16px;font-weight:500;color:var(--dsw-alias-label-tertiary);cursor:pointer}.rswBTa_tab::after{content:\"\";position:absolute;right:0;bottom:-1px;left:0;height:2px;border-radius:2px;background:transparent}.rswBTa_tab:hover{color:var(--dsw-alias-label-primary)}.rswBTa_tabActive{color:var(--dsw-alias-state-business-primary)}.rswBTa_tabActive::after{background:var(--dsw-alias-state-business-primary)}.rswBTa_backButton{appearance:none;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:5px 14px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;line-height:18px;cursor:pointer;white-space:nowrap;transition:border-color .16s,background .16s}.rswBTa_backButton:hover{border-color:var(--dsw-alias-label-dimmed);background:var(--dsw-alias-interactive-bg-hover)}.rswBTa_status{color:var(--dsw-alias-label-tertiary);margin:0;font-size:13px;line-height:20px}.rswBTa_banner{border:1px solid color-mix(in srgb, var(--dsw-alias-state-warning-primary,#f59e0b) 35%, transparent);background:color-mix(in srgb, var(--dsw-alias-state-warning-primary,#f59e0b) 8%, transparent);color:var(--dsw-alias-label-secondary);border-radius:10px;margin:0;padding:8px 12px;font-size:12px;line-height:18px}.rswBTa_failure{color:var(--dsw-alias-state-error-primary);align-items:center;gap:10px;font-size:13px;line-height:20px;display:flex}.rswBTa_failure p{margin:0}.rswBTa_failure button{border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer;background:0 0;border-radius:8px;padding:4px 12px}.rswBTa_cards{grid-template-columns:repeat(2,minmax(0,1fr));align-items:start;gap:12px;margin:0;padding:0;list-style:none;display:grid}@media (width<=760px){.rswBTa_cards{grid-template-columns:minmax(0,1fr)}}.rswBTa_card{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:12px;transition:border-color .16s,box-shadow .16s;overflow:hidden}.rswBTa_card:hover{border-color:var(--dsw-alias-label-dimmed)}.rswBTa_card[data-open=true]{border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 3px color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, transparent)}.rswBTa_cardContent{box-sizing:border-box;width:100%;color:inherit;font:inherit;text-align:left;cursor:pointer;background:0 0;border:0;align-items:flex-start;gap:12px;padding:14px 14px 12px;display:flex}.rswBTa_cardContent:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}.rswBTa_cardMain{flex-direction:column;flex:auto;gap:3px;min-width:0;display:flex}.rswBTa_nameRow{align-items:baseline;gap:8px;min-width:0;display:flex}.rswBTa_cardTitle{text-overflow:ellipsis;white-space:nowrap;min-width:0;font-size:14px;font-weight:600;line-height:20px;overflow:hidden}.rswBTa_stars{color:var(--dsw-alias-state-warning-primary,#f59e0b);font-variant-numeric:tabular-nums;flex:none;font-size:12px;line-height:18px}.rswBTa_author{color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;line-height:16px;overflow:hidden}.rswBTa_description{-webkit-line-clamp:2;color:var(--dsw-alias-label-secondary);-webkit-box-orient:vertical;margin:2px 0 0;font-size:12px;line-height:18px;display:-webkit-box;overflow:hidden}.rswBTa_cardTrailing{color:var(--dsw-alias-label-tertiary);flex:none;align-items:center;gap:7px;display:inline-flex}.rswBTa_statusTag{background:var(--dsw-alias-bg-layer-1);min-height:20px;color:var(--dsw-alias-label-secondary);white-space:nowrap;border-radius:999px;align-items:center;padding:1px 8px;font-size:11px;line-height:16px;display:inline-flex}.rswBTa_statusTag[data-state=enabled]{background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 12%, transparent);color:var(--dsw-alias-state-success-primary)}.rswBTa_statusTag[data-state=update-available]{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent);color:var(--dsw-alias-brand-primary)}.rswBTa_statusTag[data-state=disabled]{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-tertiary)}.rswBTa_chevron{flex:none;transition:transform .16s}.rswBTa_card[data-open=true] .rswBTa_chevron{transform:rotate(180deg)}.rswBTa_actions{align-items:center;gap:6px;padding:0 14px 14px;display:flex}.rswBTa_actions button{appearance:none;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer;border-radius:8px;padding:5px 14px;font-size:12px;line-height:18px;transition:background .16s,border-color .16s,opacity .16s}.rswBTa_actions button:hover:not(:disabled){border-color:var(--dsw-alias-label-dimmed);background:var(--dsw-alias-interactive-bg-hover)}.rswBTa_actions button:disabled{opacity:.45;cursor:default}.rswBTa_actions button[data-action=install],.rswBTa_actions button[data-action=update],.rswBTa_actions button[data-action=enable]{border-color:var(--dsw-alias-label-primary);background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-3);font-weight:600}.rswBTa_actions button[data-action=install]:hover:not(:disabled),.rswBTa_actions button[data-action=update]:hover:not(:disabled),.rswBTa_actions button[data-action=enable]:hover:not(:disabled){opacity:.85;background:var(--dsw-alias-label-primary)}.rswBTa_actions button[data-action=uninstall]{border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 40%, transparent);color:var(--dsw-alias-state-error-primary)}.rswBTa_actions button[data-action=uninstall]:hover:not(:disabled){background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent);border-color:var(--dsw-alias-state-error-primary)}.rswBTa_details{border-top:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-module-platform);padding:12px 14px 14px}.rswBTa_details dl{grid-template-columns:88px minmax(0,1fr);gap:8px 10px;margin:0;display:grid}.rswBTa_details div{display:contents}.rswBTa_details dt{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:18px}.rswBTa_details dd{overflow-wrap:anywhere;min-width:0;color:var(--dsw-alias-label-secondary);margin:0;font-size:12px;line-height:18px}.rswBTa_details a{color:var(--dsw-alias-brand-primary);text-decoration:none}.rswBTa_details a:hover{text-decoration:underline}.rswBTa_details code{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-1);overflow-wrap:anywhere;border-radius:6px;padding:2px 6px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px}";
		const tagId$1 = "@ticoguo/dsh-plugin-center/PluginCenterView.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@ticoguo/dsh-plugin-center";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var PluginCenterView_module_css_default = {
			"search": "rswBTa_search",
			"header": "rswBTa_header",
			"titleRow": "rswBTa_titleRow",
			"tabActive": "rswBTa_tabActive",
			"root": "rswBTa_root",
			"cardTrailing": "rswBTa_cardTrailing",
			"cards": "rswBTa_cards",
			"chevron": "rswBTa_chevron",
			"cardTitle": "rswBTa_cardTitle",
			"stats": "rswBTa_stats",
			"title": "rswBTa_title",
			"refresh": "rswBTa_refresh",
			"status": "rswBTa_status",
			"cardContent": "rswBTa_cardContent",
			"banner": "rswBTa_banner",
			"tabs": "rswBTa_tabs",
			"details": "rswBTa_details",
			"cardMain": "rswBTa_cardMain",
			"actions": "rswBTa_actions",
			"statusTag": "rswBTa_statusTag",
			"description": "rswBTa_description",
			"nameRow": "rswBTa_nameRow",
			"headerControls": "rswBTa_headerControls",
			"card": "rswBTa_card",
			"tab": "rswBTa_tab",
			"author": "rswBTa_author",
			"stars": "rswBTa_stars",
			"failure": "rswBTa_failure"
		};
		//#endregion
		//#region lib/types/client/PluginCenterView.js
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
		function PluginCenterView({ t, onClose, list, refresh, install, uninstall, update, setEnabled }) {
			const [state, setState] = (0, react.useState)({ status: "loading" });
			const [query, setQuery] = (0, react.useState)("");
			const [filter, setFilter] = (0, react.useState)("all");
			const [expandedId, setExpandedId] = (0, react.useState)(null);
			const [pending, setPending] = (0, react.useState)(/* @__PURE__ */ new Set());
			const [confirmEntry, setConfirmEntry] = (0, react.useState)(null);
			const [toast, setToast] = (0, react.useState)(null);
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
				load();
			}, [load]);
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
			const snapshot = state.status === "ready" ? state.snapshot : void 0;
			const loadError = state.status === "ready" ? state.error : null;
			const filtered = (0, react.useMemo)(() => snapshot === void 0 ? [] : filterPluginEntries(snapshot.entries, query, filter), [
				filter,
				query,
				snapshot
			]);
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
			return (0, react_jsx_runtime.jsxs)("div", {
				className: PluginCenterView_module_css_default.root,
				"data-plugin-center": "",
				children: [
					(0, react_jsx_runtime.jsxs)("header", {
						className: PluginCenterView_module_css_default.header,
						children: [(0, react_jsx_runtime.jsxs)("div", {
							className: PluginCenterView_module_css_default.titleRow,
							children: [(0, react_jsx_runtime.jsx)("h2", {
								className: PluginCenterView_module_css_default.title,
								children: t("view.pluginCenter")
							}), snapshot !== void 0 && (0, react_jsx_runtime.jsx)("span", {
								className: PluginCenterView_module_css_default.stats,
								children: t("stats", {
									installed: snapshot.installedCount,
									total: snapshot.totalCount
								})
							})]
						}), (0, react_jsx_runtime.jsxs)("div", {
							className: PluginCenterView_module_css_default.headerControls,
							children: [(0, react_jsx_runtime.jsxs)("label", {
								className: PluginCenterView_module_css_default.search,
								children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSearchOutline16, { "aria-hidden": "true" }), (0, react_jsx_runtime.jsx)("input", {
									type: "search",
									value: query,
									placeholder: t("search"),
									"aria-label": t("search"),
									onChange: (event) => {
										setQuery(event.currentTarget.value);
									}
								})]
							}), (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: PluginCenterView_module_css_default.refresh,
								title: t("refresh"),
								"aria-label": t("refresh"),
								onClick: runRefresh,
								children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutline16, { "aria-hidden": "true" })
							}), (0, react_jsx_runtime.jsx)("button", { type: "button", className: PluginCenterView_module_css_default.backButton, onClick: onClose, children: t("backToChat") })]
						})]
					}),
					(0, react_jsx_runtime.jsx)("div", {
						className: PluginCenterView_module_css_default.tabs,
						role: "tablist",
						"aria-label": t("filter.all"),
						children: PLUGIN_CENTER_FILTERS.map((option) => (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							role: "tab",
							"aria-selected": filter === option,
							className: filter === option ? PluginCenterView_module_css_default.tabActive : PluginCenterView_module_css_default.tab,
							onClick: () => {
								setFilter(option);
								setExpandedId(null);
								setConfirmEntry(null);
							},
							children: t(FILTER_LABEL_KEY[option])
						}, option))
					}),
					loadError !== null ? (0, react_jsx_runtime.jsx)("p", {
						className: PluginCenterView_module_css_default.banner,
						role: "alert",
						children: t("githubError", { message: loadError })
					}) : null,
					state.status === "loading" ? (0, react_jsx_runtime.jsx)("p", {
						className: PluginCenterView_module_css_default.status,
						children: t("loading")
					}) : null,
					state.status === "error" ? (0, react_jsx_runtime.jsxs)("div", {
						className: PluginCenterView_module_css_default.failure,
						children: [(0, react_jsx_runtime.jsx)("p", {
							role: "alert",
							children: t("error")
						}), (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: load,
							children: t("retry")
						})]
					}) : null,
					snapshot !== void 0 && snapshot.entries.length === 0 && loadError === null ? (0, react_jsx_runtime.jsx)("p", {
						className: PluginCenterView_module_css_default.status,
						children: t("empty")
					}) : null,
					snapshot !== void 0 && snapshot.entries.length > 0 && filtered.length === 0 ? (0, react_jsx_runtime.jsx)("p", {
						className: PluginCenterView_module_css_default.status,
						children: t("emptySearch")
					}) : null,
					filtered.length > 0 ? (0, react_jsx_runtime.jsx)("ul", {
						className: PluginCenterView_module_css_default.cards,
						children: filtered.map((entry) => {
							const open = expandedId === entry.id;
							const busy = pending.has(entry.id);
							return (0, react_jsx_runtime.jsxs)("li", {
								className: PluginCenterView_module_css_default.card,
								"data-open": open || void 0,
								children: [
									(0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										className: PluginCenterView_module_css_default.cardContent,
										"aria-expanded": open,
										onClick: () => {
											setExpandedId((current) => current === entry.id ? null : entry.id);
										},
										children: [
											(0, react_jsx_runtime.jsxs)("span", {
												className: PluginCenterView_module_css_default.cardMain,
												children: [
													(0, react_jsx_runtime.jsxs)("span", {
														className: PluginCenterView_module_css_default.nameRow,
														children: [(0, react_jsx_runtime.jsx)("strong", {
															className: PluginCenterView_module_css_default.cardTitle,
															children: entry.name
														}), entry.stars > 0 && (0, react_jsx_runtime.jsxs)("span", {
															className: PluginCenterView_module_css_default.stars,
															title: t("detail.stars"),
															children: ["★ ", formatStars(entry.stars)]
														})]
													}),
													(0, react_jsx_runtime.jsx)("span", {
														className: PluginCenterView_module_css_default.author,
														children: entry.author
													}),
													(0, react_jsx_runtime.jsx)("span", {
														className: PluginCenterView_module_css_default.description,
														children: entry.description
													})
												]
											}),
											(0, react_jsx_runtime.jsxs)("span", {
												className: PluginCenterView_module_css_default.cardTrailing,
												children: [(0, react_jsx_runtime.jsx)("span", {
													className: PluginCenterView_module_css_default.statusTag,
													"data-state": entry.state,
													children: t(STATUS_LABEL_KEY[entry.state])
												}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, {
													className: PluginCenterView_module_css_default.chevron,
													size: 14,
													"aria-hidden": "true"
												})]
											})
										]
									}),
									(0, react_jsx_runtime.jsx)("div", {
										className: PluginCenterView_module_css_default.actions,
										children: actionButtons(entry).map((kind) => (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											disabled: busy,
											"data-action": kind,
											onClick: () => {
												invoke(entry.id, kind);
											},
											children: busy ? t("loading") : t(ACTION_LABEL_KEY[kind])
										}, kind))
									}),
									open ? (0, react_jsx_runtime.jsx)("div", {
										className: PluginCenterView_module_css_default.details,
										children: (0, react_jsx_runtime.jsxs)("dl", { children: [
											(0, react_jsx_runtime.jsxs)("div", { children: [(0, react_jsx_runtime.jsx)("dt", { children: t("detail.description") }), (0, react_jsx_runtime.jsx)("dd", { children: entry.description })] }),
											(0, react_jsx_runtime.jsxs)("div", { children: [(0, react_jsx_runtime.jsx)("dt", { children: t("detail.author") }), (0, react_jsx_runtime.jsx)("dd", { children: entry.author })] }),
											(0, react_jsx_runtime.jsxs)("div", { children: [(0, react_jsx_runtime.jsx)("dt", { children: t("detail.stars") }), (0, react_jsx_runtime.jsx)("dd", { children: entry.stars })] }),
											(0, react_jsx_runtime.jsxs)("div", { children: [(0, react_jsx_runtime.jsx)("dt", { children: t("detail.repository") }), (0, react_jsx_runtime.jsx)("dd", { children: (0, react_jsx_runtime.jsx)("a", {
												href: entry.repository,
												target: "_blank",
												rel: "noreferrer",
												children: entry.repository
											}) })] }),
											(0, react_jsx_runtime.jsxs)("div", { children: [(0, react_jsx_runtime.jsx)("dt", { children: t("detail.installCommand") }), (0, react_jsx_runtime.jsx)("dd", { children: (0, react_jsx_runtime.jsx)("code", { children: `dsh plugin add ${entry.packageName}` }) })] }),
											entry.installedVersion !== null && (0, react_jsx_runtime.jsxs)("div", { children: [(0, react_jsx_runtime.jsx)("dt", { children: t("detail.installedVersion") }), (0, react_jsx_runtime.jsx)("dd", { children: entry.installedVersion })] })
										] })
									}) : null
								]
							}, entry.id);
						})
					}) : null,
					toast !== null && (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Toast, {
						text: toast.text,
						onDone: () => {
							setToast(null);
						}
					}, toast.seq),
					confirmEntry !== null && (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
						open: true,
						onClose: () => {
							setConfirmEntry(null);
						},
						title: t("confirm.uninstallTitle"),
						footer: (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => {
								setConfirmEntry(null);
							},
							children: t("confirm.cancel")
						}), (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							"data-danger": "true",
							onClick: () => {
								const entry = confirmEntry;
								setConfirmEntry(null);
								run(entry.id, "uninstall", () => uninstall(entry.id));
							},
							children: t("confirm.confirm")
						})] }),
						children: (0, react_jsx_runtime.jsx)("p", { children: t("confirm.uninstallBody", { name: confirmEntry.name }) })
					})
				]
			});
		}
		//#endregion
		//#region \0dsh-css:E:\DeepSeek_Harness_Code\deepseek-harness\packages\extensions\plugin-center\src\client\PluginCenterCard.module.css.mjs
		const css = ".fBcizq_card{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:12px;list-style:none;transition:border-color .16s,background .16s}.fBcizq_card:hover{border-color:var(--dsw-alias-label-dimmed)}.fBcizq_cardOpen{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-label-dimmed)}.fBcizq_header{appearance:none;width:100%;font:inherit;color:inherit;text-align:left;cursor:pointer;background:0 0;border:0;border-radius:12px;align-items:center;gap:12px;padding:14px 16px;display:flex}.fBcizq_header:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}.fBcizq_headText{flex-direction:column;flex:1;gap:4px;min-width:0;display:flex}.fBcizq_name{color:var(--dsw-alias-label-primary);font-size:15px;font-weight:600;line-height:1.4}.fBcizq_description{color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:1.5}.fBcizq_chevron{color:var(--dsw-alias-label-tertiary);flex:none;transition:transform .16s}.fBcizq_chevronOpen{transform:rotate(180deg)}.fBcizq_body{border-top:1px solid var(--dsw-alias-border-l2);margin:0 16px;padding-bottom:8px}.fBcizq_field{justify-content:space-between;align-items:center;gap:12px;padding:12px 0;display:flex}.fBcizq_label{min-width:0;color:var(--dsw-alias-label-primary);flex:1;font-size:13px;font-weight:500;line-height:1.5}.fBcizq_switch{appearance:none;background:var(--dsw-alias-border-l2);cursor:pointer;border:0;border-radius:999px;flex:none;width:40px;height:22px;margin:0;transition:background .16s;position:relative}.fBcizq_switch:after{content:\"\";background:var(--dsw-alias-bg-layer-3);border-radius:50%;width:18px;height:18px;transition:transform .16s;position:absolute;top:2px;left:2px}.fBcizq_switch:checked{background:var(--dsw-alias-brand-primary)}.fBcizq_switch:checked:after{transform:translate(18px)}.fBcizq_switch:disabled{opacity:.4;cursor:default}.fBcizq_switch:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}";
		const tagId = "@ticoguo/dsh-plugin-center/PluginCenterCard.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@ticoguo/dsh-plugin-center";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var PluginCenterCard_module_css_default = {
			"card": "fBcizq_card",
			"headText": "fBcizq_headText",
			"description": "fBcizq_description",
			"chevronOpen": "fBcizq_chevronOpen",
			"field": "fBcizq_field",
			"header": "fBcizq_header",
			"label": "fBcizq_label",
			"name": "fBcizq_name",
			"chevron": "fBcizq_chevron",
			"body": "fBcizq_body",
			"switch": "fBcizq_switch",
			"cardOpen": "fBcizq_cardOpen"
		};
		//#endregion
		//#region PluginCenterSidebarButton.module.css
		const css2 = ".pcSb_button{display:flex;align-items:center;gap:6px;width:100%;height:38px;padding:8px 16px;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-size:14px;font-weight:500;line-height:22px;cursor:pointer}.pcSb_button:hover{background:var(--dsw-alias-interactive-bg-hover)}.pcSb_buttonRail{display:flex;align-items:center;justify-content:center;width:36px;height:36px;border:1px solid transparent;border-radius:10px;background:transparent;cursor:pointer}.pcSb_buttonRail:hover{background:var(--dsw-alias-interactive-bg-hover)}.pcSb_icon{flex:none;font-size:16px;line-height:1}.pcSb_label{overflow:hidden;white-space:nowrap}.pcSb_overlay{position:fixed;inset:0;z-index:1000;display:flex;flex-direction:column;padding:24px 28px;box-sizing:border-box;background:var(--dsw-alias-bg-layer-1)}";
		const tagId2 = "@ticoguo/dsh-plugin-center/PluginCenterSidebarButton.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId2) + "]") === null) {
			const tag2 = document.createElement("style");
			tag2.dataset.plugin = "@ticoguo/dsh-plugin-center";
			tag2.dataset.pluginCss = tagId2;
			tag2.textContent = css2;
			document.head.appendChild(tag2);
		}
		var PluginCenterSidebarButton_module_css_default = {
			"button": "pcSb_button",
			"buttonRail": "pcSb_buttonRail",
			"icon": "pcSb_icon",
			"label": "pcSb_label",
			"overlay": "pcSb_overlay"
		};
		//#endregion
		//#region lib/types/client/PluginCenterCard.js
		/** The Plugin Center settings card: mirrors the native plugin-card chrome. */
		/** The card component rendered by the `settings.plugin.item` slot. */
		function PluginCenterCard({ t, useCard, toggle }) {
			const [open, setOpen] = (0, react.useState)(false);
			const card = useCard((value) => value);
			if (!card.available) return null;
			return (0, react_jsx_runtime.jsxs)("li", {
				className: open ? `${PluginCenterCard_module_css_default.card} ${PluginCenterCard_module_css_default.cardOpen}` : PluginCenterCard_module_css_default.card,
				children: [(0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: PluginCenterCard_module_css_default.header,
					"aria-expanded": open,
					onClick: () => {
						setOpen(!open);
					},
					children: [(0, react_jsx_runtime.jsxs)("span", {
						className: PluginCenterCard_module_css_default.headText,
						children: [(0, react_jsx_runtime.jsx)("span", {
							className: PluginCenterCard_module_css_default.name,
							children: t("card.title")
						}), (0, react_jsx_runtime.jsx)("span", {
							className: PluginCenterCard_module_css_default.description,
							children: t("card.description")
						})]
					}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { className: open ? PluginCenterCard_module_css_default.chevronOpen : PluginCenterCard_module_css_default.chevron })]
				}), open ? (0, react_jsx_runtime.jsx)("div", {
					className: PluginCenterCard_module_css_default.body,
					children: (0, react_jsx_runtime.jsxs)("div", {
						className: PluginCenterCard_module_css_default.field,
						children: [(0, react_jsx_runtime.jsx)("label", {
							className: PluginCenterCard_module_css_default.label,
							htmlFor: "plugin-center-enabled",
							children: t("card.enable")
						}), (0, react_jsx_runtime.jsx)("input", {
							id: "plugin-center-enabled",
							className: PluginCenterCard_module_css_default.switch,
							type: "checkbox",
							role: "switch",
							"aria-checked": card.enabled,
							checked: card.enabled,
							disabled: card.saving,
							onChange: (event) => {
								toggle(event.currentTarget.checked);
							}
						})]
					})
				}) : null]
			});
		}
		//#endregion
		//#region lib/types/client/plugin-center-card.js
		/** The Plugin Center settings card: an enable toggle bound to the `plugin-center` settings namespace. */
		/** Bridges the `plugin-center` settings namespace onto the enable card. */
		var PluginCenterCardController = class {
			status;
			setEnabled;
			onChanged;
			store;
			saving = false;
			constructor(status, setEnabled, onChanged) {
				this.status = status;
				this.setEnabled = setEnabled;
				this.onChanged = onChanged;
				this.store = (0, _deepseek_ai_dsh_client_runtime_client.createSnapshotStore)({ available: false, enabled: false, saving: false });
				void this.load();
			}
			/** Build the face the card's slot registration injects. */
			inject() {
				return {
					hooks: { card: this.store },
					toggle: (enabled) => {
						this.toggle(enabled);
					}
				};
			}
			async load() {
				try {
					const snapshot = await this.status();
					this.store.set({ available: true, enabled: snapshot.enabled, saving: this.saving });
				} catch {
					this.store.set({ available: false, enabled: false, saving: this.saving });
				}
			}
			async toggle(enabled) {
				if (this.saving) return;
				this.saving = true;
				this.store.set({ available: true, enabled, saving: true });
				try {
					await this.setEnabled(enabled);
					this.onChanged();
				} finally {
					this.saving = false;
					await this.load();
				}
			}
		};
		//#endregion
		//#region lib/types/client/locales.js
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
			"refresh": "检查更新", "backToChat": "返回对话",
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
			"disabled": "插件中心已停用，请在「设置 → 插件 → 插件配置」中开启。",
			"githubError": "无法加载插件列表：{message}",
			"card.title": "插件中心",
			"card.description": "在「对话 / 轨迹」标签旁显示插件中心，实时读取 awesome-dsh-plugin.com 精选插件并按热度排序。",
			"card.enable": "启用插件中心"
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
			"refresh": "Check updates", "backToChat": "Back to chat",
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
			"disabled": "Plugin Center is disabled. Enable it in Settings → Plugins → Plugin configuration.",
			"githubError": "Could not load the plugin list: {message}",
			"card.title": "Plugin Center",
			"card.description": "Shows the Plugin Center beside the Chat/Trajectory tabs, reading curated plugins from awesome-dsh-plugin.com and ranking them by stars.",
			"card.enable": "Enable Plugin Center"
		};
		//#endregion
		//#region lib/types/client/index.js
		/**
		* Browser Plugin Center plugin: the conversation view tab (shown only while the
		* plugin is enabled) plus the settings enable card. It is a pure consumer of the
		* host `/plugin-center` HTTP routes and the `plugin-center` settings namespace.
		*/
		/** Services required: the conversation slot, locale, and the settings scope. */
		const inject = [
			"slots",
			"locale"
		];
		/** Fetch one `/plugin-center` endpoint and parse its JSON body, throwing on a transport error. */
		async function request(path, init) {
			const response = await fetch(`/plugin-center${path}`, {
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json"
				},
				...init
			});
			if (!response.ok) {
				const body = await response.json().catch(() => ({}));
				throw new Error(body.message ?? `HTTP ${response.status}`);
			}
			return await response.json();
		}
		/**
		* Client plugin body: register the settings enable card and, while enabled,
		* the conversation view tab. Both registrations ride the slot service's effect
		* wrapper, so plugin unload removes them.
		* @param ctx - client root context.
		*/
		/** Host settings namespace (must match the host `settingsNamespace('plugin-center')`). */
		function PluginCenterSidebarButton({ t, wide, list, refresh, install, uninstall, update, setEnabled }) {
			const [open, setOpen] = (0, react.useState)(false);
			return (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, {
				children: [(0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: wide ? PluginCenterSidebarButton_module_css_default.button : PluginCenterSidebarButton_module_css_default.buttonRail,
					onClick: () => {
						setOpen(true);
					},
					title: t("view.pluginCenter"),
					children: [(0, react_jsx_runtime.jsx)("span", {
						className: PluginCenterSidebarButton_module_css_default.icon,
						"aria-hidden": "true",
						children: "🧩"
					}), wide && (0, react_jsx_runtime.jsx)("span", {
						className: PluginCenterSidebarButton_module_css_default.label,
						children: t("view.pluginCenter")
					})]
				}), open && (0, react_jsx_runtime.jsx)("div", {
					className: PluginCenterSidebarButton_module_css_default.overlay,
					role: "dialog",
					"aria-modal": "true",
					children: (0, react_jsx_runtime.jsx)(PluginCenterView, {
						t,
						list,
						refresh,
						install,
						uninstall,
						update,
						setEnabled,
						onClose: () => {
							setOpen(false);
						}
					})
				})]
			});
		}
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "ui-plugin-center: dictionaries");
			const t = ctx.locale.bind(NS);
			const list = () => request("/list");
			const refresh = () => request("/refresh", { method: "POST" });
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
			const status = () => request("/status");
			const setFeatureEnabled = (enabled) => request("/set-enabled", {
				method: "POST",
				body: JSON.stringify({ enabled })
			});
			const enabledStore = (0, _deepseek_ai_dsh_client_runtime_client.createSnapshotStore)({ enabled: false });
			const refreshEnabled = () => {
				void status().then(
					(snapshot) => {
						enabledStore.set({ enabled: snapshot.enabled });
					},
					() => {
						enabledStore.set({ enabled: false });
					}
				);
			};
			refreshEnabled();
			let disposeButton = null;
			const syncButton = () => {
				const enabled = enabledStore.getSnapshot().enabled;
				if (enabled && disposeButton === null) disposeButton = ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
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
						setEnabled
					})
				}, PluginCenterSidebarButton));
				else if (!enabled && disposeButton !== null) {
					disposeButton();
					disposeButton = null;
				}
			};
			syncButton();
			enabledStore.subscribe(syncButton);
			const card = new PluginCenterCardController(status, setFeatureEnabled, refreshEnabled);
			ctx.slots.inject("settings.plugin.item", () => ctx.slots.register({
				name: "settings.plugin.item",
				id: "plugin-center",
				order: 20,
				locale: NS,
				inject: () => card.inject()
			}, PluginCenterCard));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map