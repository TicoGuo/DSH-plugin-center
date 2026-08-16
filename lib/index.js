import { unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import z from "@deepseek-ai/schemastery";
import { DEFAULT_PROFILE_BUNDLES, PROFILE_TEMPLATES, initProfile, readProfileManifest, resolveProfileDir, writeProfileManifest } from "@deepseek-ai/dsh-app-boot";
import { installSettingsSection, settingsNamespace } from "@deepseek-ai/dsh-settings";
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
//#region lib/types/github.js
/**
* Real-time GitHub catalog source: search public repositories for DeepSeek
* Harness plugins, then read each candidate's package.json to confirm it
* declares a `dsh` manifest and project it into a registry entry. Repositories
* arrive GitHub-star-sorted and stay in that order.
*/
/** GitHub REST API base. */
const GITHUB_API_BASE = "https://api.github.com";
/** Raw file base for fetching repository package.json. */
const RAW_GITHUB_BASE = "https://raw.githubusercontent.com";
const GITHUB_ACCEPT = "application/vnd.github+json";
const USER_AGENT = "deepseek-harness";
/** Per-request timeout so a stalled GitHub call degrades to an error instead of a long spinner. */
const GITHUB_TIMEOUT_MS = 1e4;
/** The default search query: plugin repos by the `dsh-plugin` topic or name, plus anything mentioning deepseek-harness. */
const DEFAULT_GITHUB_QUERY = "topic:dsh-plugin OR dsh-plugin in:name,description OR deepseek-harness in:name,description,readme";
/** Required headers GitHub's REST API expects. */
const GITHUB_HEADERS = {
	Accept: GITHUB_ACCEPT,
	"User-Agent": USER_AGENT
};
/**
* Project and validate a GitHub search response into repository summaries.
* @param json - parsed JSON from `GET /search/repositories`.
* @returns validated repository rows in the API's (star-sorted) order.
*/
function parseGithubSearchResponse(json) {
	if (json === null || typeof json !== "object" || Array.isArray(json)) throw new TypeError("plugin-center: GitHub search response must be a JSON object");
	const items = json.items;
	if (!Array.isArray(items)) throw new TypeError("plugin-center: GitHub search response field \"items\" must be an array");
	const summaries = [];
	for (const item of items) {
		if (item === null || typeof item !== "object" || Array.isArray(item)) continue;
		const record = item;
		const fullName = record.full_name;
		const stars = record.stargazers_count;
		const htmlUrl = record.html_url;
		const defaultBranch = record.default_branch;
		if (typeof fullName !== "string" || fullName === "") continue;
		if (typeof stars !== "number" || typeof htmlUrl !== "string") continue;
		summaries.push({
			fullName,
			description: typeof record.description === "string" ? record.description : null,
			stars,
			htmlUrl,
			defaultBranch: typeof defaultBranch === "string" && defaultBranch !== "" ? defaultBranch : "main"
		});
	}
	return Object.freeze(summaries);
}
/**
* Project one repository's package.json into a registry entry. Returns null
* when the package is not a DSH plugin (no `dsh` manifest section), so a
* search match that is not actually a plugin is silently skipped.
* @param owner - repository owner login.
* @param repo - repository name.
* @param stars - GitHub star count (popularity).
* @param json - parsed package.json.
* @returns a frozen registry entry, or null.
*/
function parseGithubPluginManifest(owner, repo, stars, json) {
	if (json === null || typeof json !== "object" || Array.isArray(json)) return null;
	const record = json;
	const dsh = record.dsh;
	if (dsh === null || typeof dsh !== "object" || Array.isArray(dsh)) return null;
	const name = typeof record.name === "string" && record.name !== "" ? record.name : repo;
	const description = typeof record.description === "string" && record.description !== "" ? record.description : `DSH plugin ${repo}`;
	const version = typeof record.version === "string" && record.version !== "" ? record.version : "0.0.0";
	const peerDependencies = record.peerDependencies;
	const requirements = peerDependencies !== null && typeof peerDependencies === "object" && !Array.isArray(peerDependencies) ? Object.keys(peerDependencies) : [];
	return Object.freeze({
		id: name,
		name: repo,
		packageName: name,
		description,
		icon: "📦",
		author: owner,
		repository: `https://github.com/${owner}/${repo}`,
		stars,
		version,
		changelog: "",
		requirements,
		spec: `github:${owner}/${repo}`
	});
}
/**
* Search GitHub for DSH plugins and read each candidate's manifest, returning
* only confirmed plugins in GitHub star order. A failed or unreadable
* repository manifest skips that repository; only a failed search request
* throws (so a rate limit or outage degrades to the bundled catalog).
* @param query - GitHub search query.
* @param fetchFn - injectable fetch.
* @returns confirmed plugin entries in star order.
*/
async function githubCatalog(query, fetchFn) {
	const searchResponse = await fetchFn(`${GITHUB_API_BASE}/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=50`, {
		headers: GITHUB_HEADERS,
		signal: AbortSignal.timeout(GITHUB_TIMEOUT_MS)
	});
	if (!searchResponse.ok) throw new Error(`GitHub search failed with HTTP ${searchResponse.status}`);
	const repos = parseGithubSearchResponse(await searchResponse.json());
	const entries = (await Promise.all(repos.map(async (repo) => {
		const [owner, name] = repo.fullName.split("/");
		if (owner === void 0 || name === void 0) return null;
		const rawUrl = `${RAW_GITHUB_BASE}/${owner}/${name}/${repo.defaultBranch}/package.json`;
		try {
			const manifestResponse = await fetchFn(rawUrl, {
				headers: GITHUB_HEADERS,
				signal: AbortSignal.timeout(GITHUB_TIMEOUT_MS)
			});
			if (!manifestResponse.ok) return null;
			return parseGithubPluginManifest(owner, name, repo.stars, await manifestResponse.json());
		} catch {
			return null;
		}
	}))).filter((entry) => entry !== null);
	return Object.freeze(entries);
}
//#endregion
//#region lib/types/registry.js
/**
* Plugin registry loading: fetch a JSON catalog from a configurable URL,
* validate each entry at the network boundary, and order the result by GitHub
* popularity. A bundled default catalog keeps the Plugin Center usable before
* a deployment publishes its own registry.
*/
/**
* Order entries by popularity: GitHub stars descending, ties broken by id so
* the sort is deterministic across fetches.
* @param entries - validated entries in any order.
* @returns a new array ordered by popularity.
*/
function sortRegistry(entries) {
	return Object.freeze([...entries].sort((left, right) => right.stars - left.stars || left.id.localeCompare(right.id)));
}
/**
* Load the catalog live from GitHub and order it by popularity. A search
* failure returns an explicit error string (never a hardcoded fallback list);
* an empty result is a genuine "no public DSH plugins found" state.
* @param githubQuery - GitHub search query.
* @param fetchFn - injectable fetch (Node's global fetch in production).
* @returns entries ordered by popularity plus an optional load error.
*/
async function loadRegistry(githubQuery, fetchFn = fetch) {
	try {
		return {
			entries: sortRegistry(await githubCatalog(githubQuery, fetchFn)),
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
* Pure merge of the registry catalog with the profile's installed state into
* the snapshot a browser renders. No filesystem or network: the gateway
* supplies installed-versions and plugin state, so the projection (and the
* popularity/status decisions) is unit-testable.
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
* Resolve one plugin's lifecycle state from installed facts.
* @param entry - the registry entry.
* @param plugins - the profile's plugin state.
* @param installedVersion - resolved installed version, or null when absent.
* @returns the display state.
*/
function entryState(entry, plugins, installedVersion) {
	if (!plugins.installedNames.has(entry.packageName)) return "not-installed";
	if (plugins.disabledNames.has(entry.packageName)) return "disabled";
	if (installedVersion !== null && compareSemver(entry.version, installedVersion) > 0) return "update-available";
	return "enabled";
}
/**
* Merge registry entries with the profile state into the rendered snapshot,
* keeping the registry's popularity order.
* @param registry - registry entries ordered by popularity.
* @param plugins - the profile's plugin state.
* @param installedVersions - resolved installed version per package name.
* @returns the merged snapshot with aggregate counts.
*/
function mergeCatalog(registry, plugins, installedVersions) {
	const entries = registry.map((entry) => {
		const installedVersion = installedVersions.get(entry.packageName) ?? null;
		return Object.freeze({
			id: entry.id,
			name: entry.name,
			packageName: entry.packageName,
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
* bundles. Keeping the disabled list separate from `dependencies` lets an
* installed plugin stay installed while its patch layer is switched off.
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
* Parse the plugin-center sidecar, treating any missing or malformed file as
* the empty state (the sidecar is best-effort durability, not the source of
* truth — the manifest's bundles list remains authoritative).
* @param profileDir - the absolute profile directory.
* @returns the disabled-name set.
*/
function readDisabledNames(profileDir) {
	const path = join(profileDir, PLUGIN_CENTER_STATE_FILENAME);
	if (!existsSync(path)) return /* @__PURE__ */ new Set();
	try {
		const disabled = JSON.parse(readFileSync(path, "utf8"))?.disabled;
		if (Array.isArray(disabled) && disabled.every((name) => typeof name === "string")) return new Set(disabled);
		return /* @__PURE__ */ new Set();
	} catch {
		return /* @__PURE__ */ new Set();
	}
}
/**
* Read the profile's current plugin state from disk.
* @param profileDir - the absolute profile directory.
* @returns the manifest and its projected plugin state.
*/
function readProfileState(profileDir) {
	const manifest = readProfileManifest("dsh", profileDir);
	return {
		manifest,
		plugins: {
			enabledBundles: manifest.dsh?.profile?.bundles ?? [],
			disabledNames: readDisabledNames(profileDir),
			installedNames: new Set(Object.keys(manifest.dependencies ?? {}))
		}
	};
}
/**
* Persist the manifest's bundle list and the sidecar's disabled list. The two
* files are written together so an enable/disable toggle cannot leave them
* disagreeing about which bundles are composed.
* @param profileDir - the absolute profile directory.
* @param manifest - the manifest to write (its `dsh.profile.bundles` must already reflect the change).
* @param disabledNames - the full disabled-name set to persist.
*/
function writeProfileState(profileDir, manifest, disabledNames) {
	writeProfileManifest(profileDir, manifest);
	const sidecar = { disabled: [...disabledNames].sort() };
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
* `enabled` boolean is the on/off toggle rendered by the browser card.
*
* The catalog is read live from GitHub (ranked by stars) with a curated
* registry URL override; install/uninstall/update forward to pnpm inside the
* managed profile; tarball downloads are SHA256-verified when the registry
* publishes a digest; and every mutation is appended to a JSONL operation log.
* @module @ticoguo/dsh-plugin-center
*/
/** Cordis plugin name used by loader diagnostics. */
const name = "plugin-center";
/** Required service: the HTTP route registry. */
const inject = ["webServer"];
/** Schemastery schema resolving this plugin's configuration (fields optional, like the balance-check plugin). */
const Config = z.object({
	profile: z.string(),
	enabled: z.boolean(),
	githubQuery: z.string()
});
/** Settings namespace carrying this plugin's user-facing fields. */
const PLUGIN_CENTER_SETTINGS_NAMESPACE = settingsNamespace("plugin-center");
/** Effective profile name with the default applied. */
function effectiveProfile(config) {
	return config.profile !== void 0 && config.profile.length > 0 ? config.profile : "web";
}
function effectiveEnabled(config) {
	return config.enabled ?? true;
}
function effectiveQuery(config) {
	return config.githubQuery !== void 0 && config.githubQuery.length > 0 ? config.githubQuery : DEFAULT_GITHUB_QUERY;
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
/**
* Register the settings namespace and mount the `/plugin-center` route tree.
* @param ctx - plugin context carrying the web server (and, when composed, the settings service).
* @param config - resolved plugin configuration.
*/
function apply(ctx, config = {}) {
	let current = () => config;
	installSettingsSection(ctx, PLUGIN_CENTER_SETTINGS_NAMESPACE, Config, config, {
		setSource: (source) => {
			current = source;
		},
		onChange: () => {}
	});
	const packageManager = createPnpmPackageManager();
	let registryCache = null;
	let registryError = null;
	let registryLoad = null;
	const loadCatalog = (query) => {
		registryLoad ??= loadRegistry(query).then((result) => {
			registryCache = result.entries;
			registryError = result.error;
		});
		return registryLoad;
	};
	const findEntry = async (id) => {
		await loadCatalog(effectiveQuery(current()));
		return registryCache?.find((entry) => entry.id === id) ?? null;
	};
	const buildSnapshot = (registry) => {
		const profileName = effectiveProfile(current());
		const profileDir = ensureProfileDir(resolveProfileDir(profileName), profileName);
		const loaded = readProfileState(profileDir);
		const versions = /* @__PURE__ */ new Map();
		for (const packageName of loaded.plugins.installedNames) {
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
	const installOrUpdate = async (action, id) => {
		const entry = await findEntry(id);
		if (entry === null) return failure(action, null, null, "unknown-plugin", `unknown plugin id "${id}"`);
		const profileName = effectiveProfile(current());
		const profileDir = ensureProfileDir(resolveProfileDir(profileName), profileName);
		let tempPath = null;
		try {
			const resolved = await resolveInstallSpec(entry);
			tempPath = resolved.tempPath;
			const pmResult = await packageManager.install(profileDir, resolved.spec);
			if (!pmResult.ok) {
				appendOperationLog(profileDir, action, entry.packageName, entry.version, false, pmResult.output);
				return failure(action, entry.packageName, entry.version, "install-failed", pmResult.output);
			}
			const loaded = readProfileState(profileDir);
			writeProfileState(profileDir, withBundleEnabled(loaded.manifest, entry.packageName), withoutDisabled(loaded.plugins.disabledNames, entry.packageName));
			const message = `${action}ed ${entry.packageName}`;
			appendOperationLog(profileDir, action, entry.packageName, entry.version, true, message);
			return success(action, entry.packageName, entry.version, resolved.sha256Verified, message);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			appendOperationLog(profileDir, action, entry.packageName, entry.version, false, message);
			return failure(action, entry.packageName, entry.version, "failed", message);
		} finally {
			if (tempPath !== null) unlink(tempPath).catch(() => {});
		}
	};
	const uninstallOne = async (id) => {
		const action = "uninstall";
		const entry = await findEntry(id);
		if (entry === null) return failure(action, null, null, "unknown-plugin", `unknown plugin id "${id}"`);
		const profileName = effectiveProfile(current());
		const profileDir = ensureProfileDir(resolveProfileDir(profileName), profileName);
		try {
			const pmResult = await packageManager.uninstall(profileDir, entry.packageName);
			if (!pmResult.ok) {
				appendOperationLog(profileDir, action, entry.packageName, entry.version, false, pmResult.output);
				return failure(action, entry.packageName, entry.version, "uninstall-failed", pmResult.output);
			}
			const loaded = readProfileState(profileDir);
			writeProfileState(profileDir, withBundleDisabled(loaded.manifest, entry.packageName), withoutDisabled(loaded.plugins.disabledNames, entry.packageName));
			const message = `uninstalled ${entry.packageName}`;
			appendOperationLog(profileDir, action, entry.packageName, entry.version, true, message);
			return success(action, entry.packageName, entry.version, false, message);
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
			writeProfileState(profileDir, enabled ? withBundleEnabled(loaded.manifest, entry.packageName) : withBundleDisabled(loaded.manifest, entry.packageName), enabled ? withoutDisabled(loaded.plugins.disabledNames, entry.packageName) : withDisabled(loaded.plugins.disabledNames, entry.packageName));
			const message = `${action} ${entry.packageName}`;
			appendOperationLog(profileDir, action, entry.packageName, entry.version, true, message);
			return success(action, entry.packageName, entry.version, false, message);
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
		if (!effectiveEnabled(current())) {
			sendJson(res, 403, {
				ok: false,
				code: "disabled",
				message: "Plugin Center is disabled"
			});
			return;
		}
		const pathname = (req.url ?? "/").split("?", 1)[0] ?? "/";
		const sub = pathname === "/plugin-center" ? "" : pathname.slice(14);
		try {
			if (sub === "/list" && (req.method === "GET" || req.method === "HEAD")) {
				await loadCatalog(effectiveQuery(current()));
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
				await loadCatalog(effectiveQuery(current()));
				sendJson(res, 200, {
					ok: true,
					...buildSnapshot(registryCache ?? []),
					error: registryError
				});
				return;
			}
			if (sub === "/logs" && (req.method === "GET" || req.method === "HEAD")) {
				const profileName = effectiveProfile(current());
				sendJson(res, 200, {
					ok: true,
					entries: readOperationLog(ensureProfileDir(resolveProfileDir(profileName), profileName))
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
				if (sub === "/install") sendJson(res, 200, await installOrUpdate("install", id));
				else if (sub === "/update") sendJson(res, 200, await installOrUpdate("update", id));
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
export { Config, PLUGIN_CENTER_SETTINGS_NAMESPACE, apply, inject, name };
