# @TicoGuo/dsh-plugin-center

> DeepSeek Harness（`dsh`）的插件中心 —— 在侧边栏一键发现、安装、更新、管理社区插件。

这是一个「双面包」插件：装上并重启后，侧边栏底部会出现「插件中心」按钮，点击后在右侧滑出面板里浏览插件列表。插件列表实时来自 [awesome-dsh-plugin.com](https://awesome-dsh-plugin.com/zh/) 精选列表（800+ 个社区插件），按 GitHub 星标热度排序，以卡片形式展示，支持一键安装 / 更新 / 停用 / 启用 / 卸载。

## ✨ 特性

- **实时精选目录** —— 直接读取 awesome-dsh-plugin.com 的精选列表，按星标（热度）排序，服务端 15 分钟 TTL 缓存 + 后台预热，秒开不卡首屏。
- **卡片式浏览** —— 科技简约风卡片：图标、名称、作者、星标、简介、安装状态一屏可见。
- **搜索 + 筛选** —— 按名称/描述搜索，按「全部 / 已安装 / 可更新 / 已停用」分段筛选；「可更新」由 npm registry 实时对比已安装版本得出。
- **一键管理** —— 安装 / 更新 / 停用 / 启用 / 卸载，全程有 Loading 与 Toast 反馈；卸载有二次确认。
- **开箱即用** —— 默认开启；侧边栏按钮常驻，即使停用也能在面板内一键重新启用（不会被锁死在 UI 之外）。
- **浅色 / 深色自适应** —— 全部使用 DSH 主题 token，跟随界面主题自动切换。

## 🖥 界面一览

- **侧边栏底部 → 插件中心按钮**：点击后在右侧滑出插件中心面板。
- 面板内：顶部标题 + 统计、搜索框、圆形刷新、分段筛选胶囊；下方为响应式双列插件卡片网格。
- 点击卡片展开详情：简介、作者、星标、GitHub 仓库链接、安装命令、已安装版本。
- 插件中心被停用时：面板显示停用说明 + 「启用插件中心」按钮，一键恢复。

## 前置条件

安装前请先准备好以下环境。若提示 `无法将“dsh”项识别为 cmdlet`，说明 `dsh` 尚未安装或不在 PATH 中，请先完成第 2 步。

**1. Node.js**（自带 npm）

**2. `dsh` 命令行工具** —— 二选一：

全局安装（之后可直接使用 `dsh` 命令）：

```bash
npm install -g @deepseek-ai/dsh
```

或每次用 `npx` 前缀临时运行，无需全局安装：

```bash
npx @deepseek-ai/dsh --version
```

**3. pnpm** —— `dsh plugin ... add` 底层会转发给 pnpm：

```bash
npm install -g pnpm
```

完成后可运行 `dsh --version`（或 `npx @deepseek-ai/dsh --version`）确认可用。

## 安装

一条命令即可安装：

```bash
dsh plugin --profile web add github:TicoGuo/DSH-plugin-center
```

未全局安装 `dsh` 时，改用 `npx` 前缀：

```bash
npx @deepseek-ai/dsh plugin --profile web add github:TicoGuo/DSH-plugin-center
```

安装后重启 `dsh web`，浏览器打开 http://127.0.0.1:3080 即可。

## 使用

插件中心**默认开启**。安装并重启 `dsh web` 后：

- 侧边栏底部出现「插件中心」按钮，点击即可打开插件列表面板。
- 插件列表实时读取 [awesome-dsh-plugin.com](https://awesome-dsh-plugin.com/zh/) 精选列表，按星标热度排序展示。
- 卡片显示图标、名称、作者、星标、简介、状态（未安装 / 已启用 / 已停用 / 可更新），并提供安装 / 启用 / 停用 / 更新 / 卸载按钮；点击卡片展开详情（简介、作者、星标、仓库、安装命令、已安装版本）。

## 工作原理

- **目录来源**：插件中心抓取 [awesome-dsh-plugin.com](https://awesome-dsh-plugin.com/zh/) 网页，解析每张插件卡片的名称、作者、星标、简介与官方安装命令（`dsh plugin --profile web add <包名>`）。成功加载后缓存 15 分钟；加载失败会保留上次成功的数据并允许下次直接重试。
- **安装 / 卸载**：在 profile 目录内调用 pnpm（与 `dsh plugin` 一致）。安装命令来自该列表，因此安装的是插件发布到 npm 的真实包名；已安装过的插件（含用 `dsh plugin` CLI 装的）点击安装只会重新启用，不会污染 bundle 列表。
- **可更新检测**：已安装插件的最新版本实时查询 npm registry（`registry.npmjs.org`），缓存 30 分钟，驱动「可更新」筛选与角标。
- **启用 / 停用**：只编辑 profile 清单里的 `dsh.profile.bundles` 层列表，不改动已安装依赖。
- **操作日志**：每次安装/卸载/更新/启停都追加写入 `plugin-center.log`，超过 1MB 自动轮转到 `plugin-center.log.1`。

## 安全提示

> 安装第三方插件会在你本机、以你自身的权限运行第三方代码 —— 它可能读取你的文件、使用你的凭据、访问网络。工具审批不会沙箱化插件代码。收录不等于安全审计：安装前请查看源码，并尽量在**不含密钥的环境**里试用陌生插件。

> 插件中心自身做了两层防护：① 所有会改动状态的接口（安装/卸载/更新/启停/开关/刷新）校验 `Origin`/`Referer`，跨站网页发起的伪造请求会被 403 拒绝；② 传给 pnpm 的所有参数经过白名单字符校验，恶意目录条目无法在 Windows 上注入 shell 命令。

## 更新

新版本发布后，重新执行同一条安装命令即可拉取最新代码覆盖旧版本（pnpm 会重新解析 `github:` 源到最新提交）：

```bash
dsh plugin --profile web add github:TicoGuo/DSH-plugin-center
```

或使用已装的插件中心/`dsh plugin` 更新该包（`dsh plugin --profile web update @ticoguo/dsh-plugin-center`），更新后重启 `dsh web` 生效。

## 卸载

一条命令即可卸载：

```bash
dsh plugin --profile web remove @ticoguo/dsh-plugin-center
```

未全局安装 `dsh` 时，改用 `npx` 前缀：

```bash
npx @deepseek-ai/dsh plugin --profile web remove @ticoguo/dsh-plugin-center
```

卸载后重启 `dsh web` 生效。

> 若提示 `ERR_PNPM_CANNOT_REMOVE_MISSING_DEPS`，说明依赖已不在 `dependencies` 中、只剩 bundle 条目残留：手动打开 profile 的 `package.json`，从 `dsh.profile.bundles` 中删掉 `@ticoguo/dsh-plugin-center` 即可（profile 位于 `$DSH_HOME/profiles/web`，`$DSH_HOME` 默认是 `~/.dsh`）。

> 插件中心自身的运行数据（操作日志 `plugin-center.log`、停用列表 `plugin-center.json`）也留在 profile 目录里；如需彻底清除，删除 `$DSH_HOME/profiles/web/plugin-center.log` 和 `$DSH_HOME/profiles/web/plugin-center.json`。注意：插件中心安装/卸载的**其它插件**是各自独立的依赖，卸载插件中心本身不会把它们一并移除。

## 常见问题

- **列表为空或提示无法加载？** 插件中心依赖 awesome-dsh-plugin.com 的网络可达性；若长时间加载失败，点击「检查更新」重试。
- **安装后不生效？** 安装/卸载/更新只写 profile 清单与 pnpm 状态，需重启 `dsh web` 才会组合新装的 bundle。

## 依赖说明

- 运行时依赖 DSH 核心包（`@deepseek-ai/cordis`、`@deepseek-ai/dsh-*`、`@deepseek-ai/schemastery`、`react`），它们由使用者的 DSH 安装提供，无需单独安装。
- 本包是「双面包」：`lib/index.js` 是宿主（`/plugin-center` 路由），`lib/client.js` 是浏览器端（侧边栏按钮 + 面板），`cordis.patch.yml` 是 bundle 补丁。

## 开发

```bash
pnpm install        # 安装 devDependencies（typescript / tsdown / vitest / lightningcss）
pnpm typecheck      # tsc 双面类型检查
pnpm test           # vitest 单测（解析 / 合并 / 日志 / 哈希 / 参数校验 / 筛选）
pnpm build          # tsc 产出 lib/types + tsdown 产出 lib/index.js / lib/client.js
```

`lib/` 是构建产物并随仓库提交（第三方插件的安装源）；改动 `src/` 后请重新 `pnpm build` 并提交 `lib/`。

## 目录

- `cordis.patch.yml` — bundle 补丁
- `lib/` — 构建产物（`index.js` / `invariant.js` / `client.js` / 类型声明）
- `src/` — 源码（`index.ts` 宿主半边，`client/` 浏览器半边）
- `tests/` — vitest 单测
- `tsconfig.json` / `tsconfig.client.json` / `tsdown.config.ts` — 构建配置（tsdown 配置自包含，构建无需 harness checkout）
