import { unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DEFAULT_PROFILE_BUNDLES, PROFILE_TEMPLATES, initProfile, readProfileManifest, resolveProfileDir, writeProfileManifest } from "@deepseek-ai/dsh-app-boot";
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
//#region lib/types/awesome.js
/**
* Curated plugin catalog source: the awesome-dsh-plugin.com website
* (https://awesome-dsh-plugin.com/zh/). Each plugin is an `<li class="card">`
* carrying its owner/repo slug, GitHub star count, description, and the exact
* `dsh plugin add <spec>` install command. The cards are already ordered by
* stars, so the parsed order is the popularity order.
*/
/** Default catalog: the Chinese page of the awesome-dsh-plugin list. */
const AWESOME_CATALOG_URL = "https://awesome-dsh-plugin.com/zh/";
/** Per-request timeout so a stalled fetch degrades to an error instead of a long spinner. */
const CATALOG_TIMEOUT_MS = 25e3;
/** One plugin card in the rendered page. */
const CARD_PATTERN = /<li class="card"[^>]*>([\s\S]*?)<\/li>/g;
/** Owner login, e.g. the `vectorize-io/` inside the h3 link. */
const OWNER_PATTERN = /class="owner"[^>]*>([^<]+)<\/span>/;
/** Repo slug (with any `#subpath`) that follows the owner span. */
const REPO_PATTERN = /class="owner"[^>]*>[^<]+<\/span>([^<]+)<\/a>/;
/** GitHub star count. */
const STARS_PATTERN = /class="stars"[^>]*>([^<]+)</;
/** Short description (the first `<p>` in the card). */
const DESC_PATTERN = /<p>([^<]*)<\/p>/;
/** The exact CLI install command: `dsh plugin --profile web add <spec>`. */
const SPEC_PATTERN = /input[^>]*value="dsh plugin --profile web add ([^"]+)"/;
/**
* Parse the awesome-dsh-plugin.com HTML into catalog entries in star order.
* @param html - the rendered page HTML.
* @returns frozen entries for every parsed plugin card.
*/
function parseAwesomeHtml(html) {
	const raw = [];
	let match;
	while ((match = CARD_PATTERN.exec(html)) !== null) {
		const card = match[1] ?? "";
		const ownerMatch = OWNER_PATTERN.exec(card);
		const repoMatch = REPO_PATTERN.exec(card);
		const starsMatch = STARS_PATTERN.exec(card);
		const descMatch = DESC_PATTERN.exec(card);
		const specMatch = SPEC_PATTERN.exec(card);
		if (ownerMatch === null || repoMatch === null || specMatch === null) continue;
		const owner = (ownerMatch[1] ?? "").replace(/\/$/, "");
		const fullRepo = (repoMatch[1] ?? "").trim();
		const repo = fullRepo.split("#")[0] ?? "";
		const spec = (specMatch[1] ?? "").trim();
		if (owner === "" || repo === "" || spec === "") continue;
		const stars = starsMatch !== null ? Number.parseInt(starsMatch[1] ?? "", 10) : 0;
		const description = descMatch !== null ? (descMatch[1] ?? "").trim() : "";
		raw.push({
			id: `${owner}/${fullRepo}`,
			name: fullRepo,
			packageName: spec,
			description,
			icon: "🧩",
			author: owner,
			repository: `https://github.com/${owner}/${repo}`,
			stars: Number.isFinite(stars) ? stars : 0,
			version: "",
			changelog: "",
			requirements: Object.freeze([]),
			spec
		});
	}
	const counts = new Map();
	for (const entry of raw) counts.set(entry.id, (counts.get(entry.id) ?? 0) + 1);
	return Object.freeze(raw.map((entry) => {
		if ((counts.get(entry.id) ?? 0) === 1) return Object.freeze(entry);
		const subpath = entry.spec.includes("#") ? entry.spec.slice(entry.spec.indexOf("#")) : "";
		return Object.freeze({ ...entry, id: `${entry.id}${subpath}` });
	}));
}
/**
* Fetch and parse the curated catalog. A non-2xx response throws so the caller
* can surface a load error rather than an empty list.
* @param url - catalog page URL.
* @param fetchFn - injectable fetch.
* @returns frozen entries in star order.
*/
async function awesomeCatalog(url, fetchFn) {
	const response = await fetchFn(url, { signal: AbortSignal.timeout(CATALOG_TIMEOUT_MS) });
	if (!response.ok) throw new Error(`awesome-dsh-plugin fetch failed with HTTP ${response.status}`);
	return parseAwesomeHtml(await response.text());
}
//#endregion
//#region lib/types/registry.js
/**
* Plugin catalog loading. The default source is the curated awesome-dsh-plugin
* list (parsed from its README); the older curated-JSON helpers are retained
* for deployments that publish a manifest document with per-plugin `download` +
* `sha256` integrity metadata.
*/
/**
* Load the catalog from the curated awesome-dsh-plugin list. A fetch failure
* returns an explicit error string (never a hardcoded fallback list).
* @param catalogUrl - the catalog README URL.
* @param fetchFn - injectable fetch (Node's global fetch in production).
* @returns entries in curated order plus an optional load error.
*/
async function loadRegistry(catalogUrl, fetchFn = fetch) {
	try {
		return {
			entries: await awesomeCatalog(catalogUrl, fetchFn),
			error: null
		};
	} catch (error) {
		return {
			entries: Object.freeze([]),
			error: error instanceof Error ? error.message : String(error)
		};
	}
}
//#endregion
//#region lib/types/merge.js
/**
* Pure merge of the catalog with the profile's installed state into the
* snapshot a browser renders. No filesystem or network: the gateway supplies
* plugin state and resolved installed versions, so the projection is
* unit-testable.
*/
/**
* Compare two dotted version strings by their leading numeric `x.y.z` triple.
* A missing or non-numeric segment sorts as 0; a trailing prerelease/build
* suffix is ignored. Returns negative/zero/positive like `Array#sort`.
* @param left - first version string.
* @param right - second version string.
* @returns the numeric ordering of the two versions.
*/
function compareSemver(left, right) {
	const leftParts = left.split(".");
	const rightParts = right.split(".");
	for (let index = 0; index < 3; index++) {
		const leftNumber = Number.parseInt(leftParts[index] ?? "", 10);
		const rightNumber = Number.parseInt(rightParts[index] ?? "", 10);
		const l = Number.isNaN(leftNumber) ? 0 : leftNumber;
		const r = Number.isNaN(rightNumber) ? 0 : rightNumber;
		if (l !== r) return l - r;
	}
	return 0;
}
/**
* Resolve the resolved npm package name for a catalog entry, if the Plugin
* Center installed it.
* @param entry - the catalog entry.
* @param plugins - the profile's plugin state.
* @returns the resolved package name, or undefined when not installed by this plugin.
*/
function installedPackageName(entry, plugins) {
	return plugins.packages.get(entry.id);
}
/**
* Resolve one plugin's lifecycle state from installed facts.
* @param entry - the registry entry.
* @param plugins - the profile's plugin state.
* @param installedVersion - resolved installed version, or null when absent.
* @returns the display state.
*/
function entryState(entry, plugins, installedVersion) {
	const realName = installedPackageName(entry, plugins);
	if (realName === void 0) return "not-installed";
	if (plugins.disabledNames.has(realName)) return "disabled";
	if (entry.version !== "" && installedVersion !== null && compareSemver(entry.version, installedVersion) > 0) return "update-available";
	return "enabled";
}
/**
* Merge catalog entries with the profile state into the rendered snapshot,
* keeping the catalog's order.
* @param registry - catalog entries in curated order.
* @param plugins - the profile's plugin state.
* @param installedVersions - resolved installed version per npm package name.
* @returns the merged snapshot with aggregate counts.
*/
function mergeCatalog(registry, plugins, installedVersions) {
	const entries = registry.map((entry) => {
		const realName = installedPackageName(entry, plugins);
		const installedVersion = realName === void 0 ? null : installedVersions.get(realName) ?? null;
		return Object.freeze({
			id: entry.id,
			name: entry.name,
			packageName: realName ?? entry.packageName,
			description: entry.description,
			icon: entry.icon,
			author: entry.author,
			repository: entry.repository,
			stars: entry.stars,
			version: entry.version,
			installedVersion,
			changelog: entry.changelog,
			requirements: entry.requirements,
			state: entryState(entry, plugins, installedVersion)
		});
	});
	return {
		entries: Object.freeze(entries),
		installedCount: entries.filter((entry) => entry.state !== "not-installed").length,
		totalCount: entries.length
	};
}
//#endregion
//#region lib/types/profile-state.js
/**
* Durable profile state for the Plugin Center: the profile manifest's
* `dsh.profile.bundles` layer list (which bundles are enabled) plus a small
* `plugin-center.json` sidecar holding the names of intentionally-disabled
* bundles and the catalog-id → installed-package-name mapping (a git spec
* `github:owner/repo` resolves to a package whose npm name differs from the
* repo slug, so the resolved name is remembered here).
*/
/** Sidecar filename inside the profile directory. */
const PLUGIN_CENTER_STATE_FILENAME = "plugin-center.json";
/**
* Ensure the profile directory exists and is initialized (a no-op when the
* profile already has its manifest), mirroring the `dsh plugin` first-use
* behavior.
* @param profileDir - the absolute profile directory.
* @param profileName - the profile name, used to pick the shipped template.
* @returns the profile directory.
*/
function ensureProfileDir(profileDir, profileName) {
	if (!existsSync(join(profileDir, "package.json"))) initProfile(profileDir, PROFILE_TEMPLATES[profileName] ?? DEFAULT_PROFILE_BUNDLES);
	return profileDir;
}
/**
* Parse the plugin-center sidecar, treating any missing or malformed field as
* empty (the sidecar is best-effort durability, not the source of truth — the
* manifest's bundles list remains authoritative).
* @param profileDir - the absolute profile directory.
* @returns the parsed sidecar with safe defaults.
*/
function readSidecar(profileDir) {
	const path = join(profileDir, PLUGIN_CENTER_STATE_FILENAME);
	if (!existsSync(path)) return {
		enabled: true,
		disabled: [],
		packages: {}
	};
	try {
		const parsed = JSON.parse(readFileSync(path, "utf8"));
		if (parsed === null || typeof parsed !== "object") return {
			enabled: true,
			disabled: [],
			packages: {}
		};
		return {
			enabled: parsed.enabled !== false,
			disabled: Array.isArray(parsed.disabled) && parsed.disabled.every((name) => typeof name === "string") ? parsed.disabled : [],
			packages: parsed.packages !== null && typeof parsed.packages === "object" && !Array.isArray(parsed.packages) ? parsed.packages : {}
		};
	} catch {
		return {
			enabled: true,
			disabled: [],
			packages: {}
		};
	}
}
/**
* Read the profile's current plugin state from disk.
* @param profileDir - the absolute profile directory.
* @returns the manifest and its projected plugin state.
*/
function readProfileState(profileDir) {
	const manifest = readProfileManifest("dsh", profileDir);
	const sidecar = readSidecar(profileDir);
	const packages = /* @__PURE__ */ new Map();
	for (const [id, name] of Object.entries(sidecar.packages)) if (typeof name === "string" && name !== "") packages.set(id, name);
	return {
		manifest,
		enabled: sidecar.enabled,
		plugins: {
			enabledBundles: manifest.dsh?.profile?.bundles ?? [],
			disabledNames: new Set(sidecar.disabled),
			installedNames: new Set(Object.keys(manifest.dependencies ?? {})),
			packages
		}
	};
}
/**
* Persist the manifest's bundle list and the sidecar (disabled list + id→name
* mapping) together so a mutation cannot leave them disagreeing.
* @param profileDir - the absolute profile directory.
* @param manifest - the manifest to write (its `dsh.profile.bundles` must already reflect the change).
* @param disabledNames - the full disabled-name set to persist.
* @param packages - the full catalog-id → package-name mapping to persist.
*/
function writeProfileState(profileDir, manifest, enabled, disabledNames, packages) {
	writeProfileManifest(profileDir, manifest);
	const sidecar = {
		enabled,
		disabled: [...disabledNames].sort(),
		packages: Object.fromEntries([...packages.entries()].sort(([left], [right]) => left.localeCompare(right)))
	};
	writeFileSync(join(profileDir, PLUGIN_CENTER_STATE_FILENAME), JSON.stringify(sidecar, void 0, 2) + "\n");
}
/**
* Copy a manifest with one bundle appended to the layer list (deduplicated).
* @param manifest - the current manifest.
* @param packageName - the bundle name to enable.
* @returns a new manifest with the bundle enabled.
*/
function withBundleEnabled(manifest, packageName) {
	const current = manifest.dsh?.profile?.bundles ?? [];
	if (current.includes(packageName)) return manifest;
	return {
		...manifest,
		dsh: {
			...manifest.dsh,
			profile: {
				...manifest.dsh?.profile,
				bundles: [...current, packageName]
			}
		}
	};
}
/**
* Copy a manifest with one bundle removed from the layer list.
* @param manifest - the current manifest.
* @param packageName - the bundle name to disable or remove.
* @returns a new manifest without the bundle in the layer list.
*/
function withBundleDisabled(manifest, packageName) {
	const current = manifest.dsh?.profile?.bundles ?? [];
	if (!current.includes(packageName)) return manifest;
	return {
		...manifest,
		dsh: {
			...manifest.dsh,
			profile: {
				...manifest.dsh?.profile,
				bundles: current.filter((name) => name !== packageName)
			}
		}
	};
}
/**
* Read one installed package's resolved version from the profile's hoisted
* `node_modules` (pnpm's `nodeLinker: hoisted` layout). Scoped names nest under
* their scope directory. A missing or unreadable manifest is absent, not fatal:
* the version only feeds the update-available label.
* @param profileDir - the absolute profile directory.
* @param packageName - the npm package name.
* @returns the resolved version, or null when it cannot be read.
*/
function readInstalledVersion(profileDir, packageName) {
	const path = join(profileDir, "node_modules", ...packageName.split("/"), "package.json");
	try {
		if (!existsSync(path)) return null;
		const manifest = JSON.parse(readFileSync(path, "utf8"));
		return manifest !== null && typeof manifest.version === "string" ? manifest.version : null;
	} catch {
		return null;
	}
}
//#endregion
//#region lib/types/package-manager.js
/**
* The pnpm seam behind plugin install/uninstall/update. It is an interface so
* unit tests substitute a fake and never spawn a process; the production
* implementation forwards to pnpm inside the profile directory, exactly like
* `dsh plugin`.
*/
/**
* Run one pnpm command inside the profile directory, capturing combined output
* for error reporting. Windows resolves pnpm through its `.cmd` shim, which
* requires a shell.
* @param profileDir - the profile directory pnpm runs in.
* @param args - pnpm arguments, verbatim after `pnpm`.
* @returns the exit status and captured output.
*/
function runPnpm(profileDir, args) {
	return new Promise((resolve) => {
		const child = spawn("pnpm", [...args], {
			cwd: profileDir,
			shell: process.platform === "win32",
			stdio: [
				"ignore",
				"pipe",
				"pipe"
			]
		});
		let output = "";
		child.stdout?.on("data", (chunk) => {
			output += chunk.toString("utf8");
		});
		child.stderr?.on("data", (chunk) => {
			output += chunk.toString("utf8");
		});
		child.on("error", (error) => {
			resolve({
				ok: false,
				output: error.message
			});
		});
		child.on("close", (code) => {
			resolve({
				ok: code === 0,
				output
			});
		});
	});
}
/** The production pnpm-backed package manager. */
function createPnpmPackageManager() {
	return {
		install: (profileDir, spec) => runPnpm(profileDir, ["add", spec]),
		uninstall: (profileDir, packageName) => runPnpm(profileDir, ["remove", packageName]),
		update: (profileDir, packageName) => runPnpm(profileDir, ["update", packageName])
	};
}
//#endregion
//#region lib/types/operation-log.js
/**
* JSONL operation log for plugin install/uninstall/update/enable/disable. One
* line per committed attempt (success or failure), newest first on read. The
* pure format/parse pair is exported for unit tests; the file helpers own the
* durable boundary.
*/
/** Log filename inside the profile directory. */
const OPERATION_LOG_FILENAME = "plugin-center.log";
/**
* Serialize one log entry to its JSONL line.
* @param entry - the entry to serialize.
* @returns one line without a trailing newline.
*/
function formatLogLine(entry) {
	return JSON.stringify(entry);
}
/**
* Parse one log line, returning undefined for a line that is not a valid
* entry (truncated writes and hand edits are skipped, not fatal).
* @param line - one raw line.
* @returns the parsed entry, or undefined.
*/
function parseLogLine(line) {
	if (line.trim() === "") return void 0;
	try {
		const value = JSON.parse(line);
		if (typeof value.timestamp !== "number" || typeof value.action !== "string" || typeof value.packageName !== "string" || typeof value.ok !== "boolean" || typeof value.message !== "string") return void 0;
		return {
			timestamp: value.timestamp,
			action: value.action,
			packageName: value.packageName,
			version: typeof value.version === "string" ? value.version : null,
			ok: value.ok,
			message: value.message
		};
	} catch {
		return;
	}
}
/**
* Append one committed operation to the log file.
* @param profileDir - the absolute profile directory.
* @param action - the operation verb.
* @param packageName - the npm package name targeted.
* @param version - the version installed or targeted, or null.
* @param ok - whether the operation succeeded.
* @param message - human-readable result.
*/
function appendOperationLog(profileDir, action, packageName, version, ok, message) {
	const entry = {
		timestamp: Date.now(),
		action,
		packageName,
		version,
		ok,
		message
	};
	appendFileSync(join(profileDir, OPERATION_LOG_FILENAME), formatLogLine(entry) + "\n", "utf8");
}
/**
* Read the operation log, newest first.
* @param profileDir - the absolute profile directory.
* @returns parsed entries in reverse-chronological order.
*/
function readOperationLog(profileDir) {
	const path = join(profileDir, OPERATION_LOG_FILENAME);
	if (!existsSync(path)) return [];
	return readFileSync(path, "utf8").split("\n").flatMap((line) => {
		const entry = parseLogLine(line);
		return entry === void 0 ? [] : [entry];
	}).reverse();
}
//#endregion
//#region lib/types/sha256.js
/**
* SHA256 integrity helper for downloaded plugin tarballs. Pure over an input
* byte sequence so the verification contract is unit-testable without network
* or filesystem access.
*/
/**
* Compute the lowercase-hex SHA256 digest of a byte sequence.
* @param bytes - the complete downloaded payload.
* @returns the 64-character lowercase-hex digest.
*/
function sha256Hex(bytes) {
	return createHash("sha256").update(bytes).digest("hex");
}
/**
* Compare a computed digest against a registry-published expectation in
* constant time.
* @param actual - computed lowercase-hex digest.
* @param expected - registry-published lowercase-hex digest.
* @returns whether the two digests match exactly.
*/
function sha256Matches(actual, expected) {
	if (actual.length !== 64 || expected.length !== 64) return false;
	let difference = 0;
	for (let index = 0; index < 64; index++) difference |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
	return difference === 0;
}
//#endregion
//#region lib/types/index.js
/**
* Plugin Center host half: an HTTP route tree plus a settings namespace.
*
* This is a third-party-installable plugin, so it cannot depend on the
* harness's Typert Remote assembly (which is compiled in). Instead it registers
* a `/plugin-center` prefix route on the web server — the same transport the
* balance-check plugin uses — and a `plugin-center` settings namespace whose
* `enabled` boolean (default off) is the on/off toggle rendered by the browser
* card.
*
* The catalog is the curated awesome-dsh-plugin list; install/uninstall/update
* forward to pnpm inside the managed profile (git specs resolve to a package
* name discovered by dependency diff and remembered in the sidecar), and every
* mutation is appended to a JSONL operation log.
* @module @ticoguo/dsh-plugin-center
*/
/** Cordis plugin name used by loader diagnostics. */
const name = "plugin-center";
/** Required service: the HTTP route registry. */
const inject = ["webServer"];
/** Schemastery schema resolving this plugin's configuration (fields optional, like the balance-check plugin). */
/** Effective profile name with the default applied. */
function effectiveProfile(config) {
	return config.profile !== void 0 && config.profile.length > 0 ? config.profile : "web";
}
function effectiveCatalogUrl(config) {
	return config.catalogUrl !== void 0 && config.catalogUrl.length > 0 ? config.catalogUrl : AWESOME_CATALOG_URL;
}
/** Copy a disabled-name set with one name added. */
function withDisabled(disabled, name) {
	const next = new Set(disabled);
	next.add(name);
	return next;
}
/** Copy a disabled-name set with one name removed. */
function withoutDisabled(disabled, name) {
	const next = new Set(disabled);
	next.delete(name);
	return next;
}
/** Copy the id→name mapping with one entry added. */
function withPackage(packages, id, name) {
	const next = new Map(packages);
	next.set(id, name);
	return next;
}
/** Copy the id→name mapping with one entry removed. */
function withoutPackage(packages, id) {
	const next = new Map(packages);
	next.delete(id);
	return next;
}
/**
* Register the settings namespace and mount the `/plugin-center` route tree.
* @param ctx - plugin context carrying the web server (and, when composed, the settings service).
* @param config - resolved plugin configuration.
*/
function apply(ctx, config = {}) {
	const current = () => config;
	const packageManager = createPnpmPackageManager();
	let registryCache = null;
	let registryError = null;
	let registryLoad = null;
	const loadCatalog = (catalogUrl) => {
		registryLoad ??= loadRegistry(catalogUrl).then((result) => {
			registryCache = result.entries;
			registryError = result.error;
		});
		return registryLoad;
	};
	const findEntry = async (id) => {
		await loadCatalog(effectiveCatalogUrl(current()));
		return registryCache?.find((entry) => entry.id === id) ?? null;
	};
	const buildSnapshot = (registry) => {
		const profileName = effectiveProfile(current());
		const profileDir = ensureProfileDir(resolveProfileDir(profileName), profileName);
		const loaded = readProfileState(profileDir);
		const versions = /* @__PURE__ */ new Map();
		for (const packageName of loaded.plugins.packages.values()) {
			const version = readInstalledVersion(profileDir, packageName);
			if (version !== null) versions.set(packageName, version);
		}
		return mergeCatalog(registry, loaded.plugins, versions);
	};
	const resolveInstallSpec = async (entry) => {
		if (entry.download === void 0) return {
			spec: entry.spec,
			sha256Verified: false,
			tempPath: null
		};
		const response = await fetch(entry.download);
		if (!response.ok) throw new Error(`download failed with HTTP ${response.status}`);
		const bytes = new Uint8Array(await response.arrayBuffer());
		if (entry.sha256 !== void 0 && !sha256Matches(sha256Hex(bytes), entry.sha256)) throw new Error(`SHA256 mismatch for ${entry.packageName}`);
		const tempPath = join(tmpdir(), `dsh-plugin-${entry.id}-${Date.now()}.tgz`);
		await writeFile(tempPath, bytes);
		return {
			spec: tempPath,
			sha256Verified: entry.sha256 !== void 0,
			tempPath
		};
	};
	const success = (action, packageName, version, sha256Verified, message) => ({
		ok: true,
		action,
		packageName,
		version,
		sha256Verified,
		code: null,
		message
	});
	const failure = (action, packageName, version, code, message) => ({
		ok: false,
		action,
		packageName,
		version,
		sha256Verified: false,
		code,
		message
	});
	/** Resolve the durable npm name for a catalog id, preferring the remembered mapping. */
	const resolvedName = (loaded, entry) => loaded.plugins.packages.get(entry.id) ?? entry.packageName;
	const installOne = async (id) => {
		const action = "install";
		const entry = await findEntry(id);
		if (entry === null) return failure(action, null, null, "unknown-plugin", `unknown plugin id "${id}"`);
		const profileName = effectiveProfile(current());
		const profileDir = ensureProfileDir(resolveProfileDir(profileName), profileName);
		let tempPath = null;
		try {
			const resolved = await resolveInstallSpec(entry);
			tempPath = resolved.tempPath;
			const before = readProfileState(profileDir);
			const pmResult = await packageManager.install(profileDir, resolved.spec);
			const after = readProfileState(profileDir);
			const added = [...after.plugins.installedNames].filter((name) => !before.plugins.installedNames.has(name));
			if (added.length === 0 && !pmResult.ok) {
				appendOperationLog(profileDir, action, entry.packageName, entry.version, false, pmResult.output);
				return failure(action, entry.packageName, entry.version, "install-failed", pmResult.output);
			}
			const packageName = added[0] ?? resolvedName(after, entry);
			writeProfileState(profileDir, withBundleEnabled(after.manifest, packageName), after.enabled, withoutDisabled(after.plugins.disabledNames, packageName), withPackage(after.plugins.packages, entry.id, packageName));
			const message = `installed ${packageName}`;
			appendOperationLog(profileDir, action, packageName, entry.version, true, message);
			return success(action, packageName, entry.version, resolved.sha256Verified, message);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			appendOperationLog(profileDir, action, entry.packageName, entry.version, false, message);
			return failure(action, entry.packageName, entry.version, "failed", message);
		} finally {
			if (tempPath !== null) unlink(tempPath).catch(() => {});
		}
	};
	const updateOne = async (id) => {
		const action = "update";
		const entry = await findEntry(id);
		if (entry === null) return failure(action, null, null, "unknown-plugin", `unknown plugin id "${id}"`);
		const profileName = effectiveProfile(current());
		const profileDir = ensureProfileDir(resolveProfileDir(profileName), profileName);
		try {
			const packageName = resolvedName(readProfileState(profileDir), entry);
			const beforeVersion = readInstalledVersion(profileDir, packageName);
			const pmResult = await packageManager.update(profileDir, packageName);
			if (!pmResult.ok) {
				appendOperationLog(profileDir, action, packageName, entry.version, false, pmResult.output);
				return failure(action, packageName, entry.version, "update-failed", pmResult.output);
			}
			const afterVersion = readInstalledVersion(profileDir, packageName);
			if (beforeVersion !== null && afterVersion !== null && beforeVersion === afterVersion) {
				const message = `up to date: ${packageName}`;
				appendOperationLog(profileDir, action, packageName, afterVersion, true, message);
				return {
					ok: true,
					action,
					packageName,
					version: afterVersion,
					sha256Verified: false,
					code: "up-to-date",
					message
				};
			}
			const message = `updated ${packageName}`;
			appendOperationLog(profileDir, action, packageName, afterVersion, true, message);
			return success(action, packageName, afterVersion, false, message);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			appendOperationLog(profileDir, action, entry.packageName, entry.version, false, message);
			return failure(action, entry.packageName, entry.version, "failed", message);
		}
	};
	const uninstallOne = async (id) => {
		const action = "uninstall";
		const entry = await findEntry(id);
		if (entry === null) return failure(action, null, null, "unknown-plugin", `unknown plugin id "${id}"`);
		const profileName = effectiveProfile(current());
		const profileDir = ensureProfileDir(resolveProfileDir(profileName), profileName);
		try {
			const loaded = readProfileState(profileDir);
			const packageName = resolvedName(loaded, entry);
			const pmResult = await packageManager.uninstall(profileDir, packageName);
			if (!pmResult.ok) {
				appendOperationLog(profileDir, action, packageName, entry.version, false, pmResult.output);
				return failure(action, packageName, entry.version, "uninstall-failed", pmResult.output);
			}
			const after = readProfileState(profileDir);
			writeProfileState(profileDir, withBundleDisabled(after.manifest, packageName), after.enabled, withoutDisabled(after.plugins.disabledNames, packageName), withoutPackage(after.plugins.packages, entry.id));
			const message = `uninstalled ${packageName}`;
			appendOperationLog(profileDir, action, packageName, entry.version, true, message);
			return success(action, packageName, entry.version, false, message);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			appendOperationLog(profileDir, action, entry.packageName, entry.version, false, message);
			return failure(action, entry.packageName, entry.version, "failed", message);
		}
	};
	const setEnabled = async (id, enabled) => {
		const action = enabled ? "enable" : "disable";
		const entry = await findEntry(id);
		if (entry === null) return failure(action, null, null, "unknown-plugin", `unknown plugin id "${id}"`);
		const profileName = effectiveProfile(current());
		const profileDir = ensureProfileDir(resolveProfileDir(profileName), profileName);
		try {
			const loaded = readProfileState(profileDir);
			const packageName = resolvedName(loaded, entry);
			writeProfileState(profileDir, enabled ? withBundleEnabled(loaded.manifest, packageName) : withBundleDisabled(loaded.manifest, packageName), loaded.enabled, enabled ? withoutDisabled(loaded.plugins.disabledNames, packageName) : withDisabled(loaded.plugins.disabledNames, packageName), loaded.plugins.packages);
			const message = `${action} ${packageName}`;
			appendOperationLog(profileDir, action, packageName, entry.version, true, message);
			return success(action, packageName, entry.version, false, message);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			appendOperationLog(profileDir, action, entry.packageName, entry.version, false, message);
			return failure(action, entry.packageName, entry.version, "failed", message);
		}
	};
	ctx.effect(() => {
		const disposeRoute = ctx.webServer.register({
			kind: "prefix",
			path: "/plugin-center",
			handler: (req, res) => {
				dispatch(req, res);
			}
		});
		return () => {
			disposeRoute();
		};
	}, "plugin-center: /plugin-center routes");
	async function dispatch(req, res) {
		const profileName = effectiveProfile(current());
		const profileDir = ensureProfileDir(resolveProfileDir(profileName), profileName);
		const pathname = (req.url ?? "/").split("?", 1)[0] ?? "/";
		const sub = pathname === "/plugin-center" ? "" : pathname.slice(14);
		try {
			if (sub === "/status" && (req.method === "GET" || req.method === "HEAD")) {
				sendJson(res, 200, { ok: true, enabled: readProfileState(profileDir).enabled });
				return;
			}
			if (sub === "/set-enabled" && req.method === "POST") {
				const body = await readJsonBody(req);
				const enabled = body.enabled === true;
				const loaded = readProfileState(profileDir);
				writeProfileState(profileDir, loaded.manifest, enabled, loaded.plugins.disabledNames, loaded.plugins.packages);
				sendJson(res, 200, { ok: true, enabled });
				return;
			}
			if (!readProfileState(profileDir).enabled) {
				sendJson(res, 403, {
					ok: false,
					code: "disabled",
					message: "Plugin Center is disabled"
				});
				return;
			}
			if (sub === "/list" && (req.method === "GET" || req.method === "HEAD")) {
				await loadCatalog(effectiveCatalogUrl(current()));
				sendJson(res, 200, {
					ok: true,
					...buildSnapshot(registryCache ?? []),
					error: registryError
				});
				return;
			}
			if (sub === "/refresh" && req.method === "POST") {
				registryCache = null;
				registryError = null;
				registryLoad = null;
				await loadCatalog(effectiveCatalogUrl(current()));
				sendJson(res, 200, {
					ok: true,
					...buildSnapshot(registryCache ?? []),
					error: registryError
				});
				return;
			}
			if (sub === "/logs" && (req.method === "GET" || req.method === "HEAD")) {
				sendJson(res, 200, {
					ok: true,
					entries: readOperationLog(profileDir)
				});
				return;
			}
			if (sub === "/install" || sub === "/update" || sub === "/uninstall" || sub === "/enable" || sub === "/disable") {
				if (req.method !== "POST") {
					sendJson(res, 405, {
						ok: false,
						code: "method-not-allowed",
						message: "method not allowed"
					});
					return;
				}
				const body = await readJsonBody(req);
				const id = typeof body.id === "string" ? body.id : "";
				if (id === "") {
					sendJson(res, 400, {
						ok: false,
						code: "bad-request",
						message: "missing plugin id"
					});
					return;
				}
				if (sub === "/install") sendJson(res, 200, await installOne(id));
				else if (sub === "/update") sendJson(res, 200, await updateOne(id));
				else if (sub === "/uninstall") sendJson(res, 200, await uninstallOne(id));
				else if (sub === "/enable") sendJson(res, 200, await setEnabled(id, true));
				else sendJson(res, 200, await setEnabled(id, false));
				return;
			}
			sendJson(res, 404, {
				ok: false,
				code: "not-found",
				message: "unknown plugin-center route"
			});
		} catch (error) {
			sendJson(res, 500, {
				ok: false,
				code: "internal",
				message: error instanceof Error ? error.message : String(error)
			});
		}
	}
}
/** Write one JSON response. */
function sendJson(res, status, body) {
	res.writeHead(status, {
		"content-type": "application/json; charset=utf-8",
		"cache-control": "no-store"
	});
	res.end(JSON.stringify(body));
}
/** Read a request body as parsed JSON (empty body reads as `{}`). */
async function readJsonBody(req) {
	const chunks = [];
	for await (const chunk of req) chunks.push(chunk);
	const raw = Buffer.concat(chunks).toString("utf8");
	if (raw.trim() === "") return {};
	return JSON.parse(raw);
}
//#endregion
export { apply, inject, name };
