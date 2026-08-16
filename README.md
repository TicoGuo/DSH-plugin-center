# @ticoguo/dsh-plugin-center

> DeepSeek Harness（`dsh`）的插件中心 —— 在对话界面里一键发现、安装、更新、管理社区插件。

这是一个「双面包」插件：装上它，你就能在 **设置 → 插件 → 插件配置** 里打开「插件中心」开关，之后「对话 / 轨迹」标签旁会出现「插件中心」入口。插件列表实时来自 [awesome-dsh-plugin.com](https://awesome-dsh-plugin.com/zh/) 精选列表（800+ 个社区插件），按 GitHub 星标热度排序，以卡片形式展示，支持一键安装 / 更新 / 停用 / 启用 / 卸载。

## ✨ 特性

- **实时精选目录** —— 直接读取 awesome-dsh-plugin.com 的精选列表，按星标（热度）排序，持续更新。
- **卡片式浏览** —— 科技简约风卡片：图标、名称、作者、星标、简介、安装状态一屏可见。
- **搜索 + 筛选** —— 按名称/描述搜索，按「全部 / 已安装 / 可更新 / 已停用」分段筛选。
- **一键管理** —— 安装 / 更新 / 停用 / 启用 / 卸载，全程有 Loading 与 Toast 反馈；卸载有二次确认。
- **开箱即用** —— 默认关闭，由「插件中心」设置卡片开关控制标签显隐，互不干扰。
- **浅色 / 深色自适应** —— 全部使用 DSH 主题 token，跟随界面主题自动切换。

## 🖥 界面一览

- **设置 → 插件 → 插件配置 → 插件中心**：原生卡片样式的「启用插件中心」开关。
- **对话页 → 插件中心**：顶部标题 + 统计、搜索框、圆形刷新、分段筛选胶囊；下方为响应式双列插件卡片网格。
- 点击卡片展开详情：简介、作者、星标、GitHub 仓库链接、安装命令、已安装版本。

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

插件中心**默认关闭**。先进入 **设置 → 插件 → 插件配置 → 插件中心**，打开「启用插件中心」开关：

- 开启后，「对话 / 轨迹」标签旁才会出现「插件中心」标签；再次关闭开关，标签即隐藏。
- 插件列表实时读取 [awesome-dsh-plugin.com](https://awesome-dsh-plugin.com/zh/) 精选列表，按星标热度排序展示。
- 卡片显示图标、名称、作者、星标、简介、状态（未安装 / 已启用 / 已停用 / 可更新），并提供安装 / 启用 / 停用 / 更新 / 卸载按钮；点击卡片展开详情（简介、作者、星标、仓库、安装命令、已安装版本）。

## 工作原理

- **目录来源**：插件中心抓取 [awesome-dsh-plugin.com](https://awesome-dsh-plugin.com/zh/) 网页，解析每张插件卡片的名称、作者、星标、简介与官方安装命令（`dsh plugin --profile web add <包名>`）。
- **安装 / 卸载**：在 profile 目录内调用 pnpm（与 `dsh plugin` 一致）。安装命令来自该列表，因此安装的是插件发布到 npm 的真实包名。
- **启用 / 停用**：只编辑 profile 清单里的 `dsh.profile.bundles` 层列表，不改动已安装依赖。
- **操作日志**：每次安装/卸载/更新/启停都追加写入 `plugin-center.log`。

## 安全提示

> 安装第三方插件会在你本机、以你自身的权限运行第三方代码 —— 它可能读取你的文件、使用你的凭据、访问网络。工具审批不会沙箱化插件代码。收录不等于安全审计：安装前请查看源码，并尽量在**不含密钥的环境**里试用陌生插件。

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

- **看不到「插件中心」开关卡片？** 需要在宿主 DSH 的 `WEB_SETTINGS_NAMESPACES` 白名单中加入 `plugin-center`（见「依赖说明」），并用该改动重新构建 DSH。
- **列表为空或提示无法加载？** 插件中心依赖 awesome-dsh-plugin.com 的网络可达性；若长时间加载失败，点击「检查更新」重试。
- **安装后不生效？** 安装/卸载/更新只写 profile 清单与 pnpm 状态，需重启 `dsh web` 才会组合新装的 bundle。

## 依赖说明

- 运行时依赖 DSH 核心包（`@deepseek-ai/cordis`、`@deepseek-ai/dsh-*`、`@deepseek-ai/schemastery`、`react`），它们由使用者的 DSH 安装提供，无需单独安装。
- 开关卡片依赖宿主 DSH 将 `plugin-center` 命名空间列入 apiproxy 的 `WEB_SETTINGS_NAMESPACES` 白名单（`packages/host/apiproxy/src/api-proxy.ts`）。
- 本包是「双面包」：`lib/index.js` 是宿主（`/plugin-center` 路由 + 设置命名空间），`lib/client.js` 是浏览器端（视图 + 卡片），`cordis.patch.yml` 是 bundle 补丁。

## 给插件作者

想让你的 DSH 插件被收录，向 [awesome-dsh-plugin/awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) 仓库提交 PR（README 的插件列表），即可出现在插件中心，并按 GitHub 星标参与热度排序。

## 目录

- `cordis.patch.yml` — bundle 补丁
- `lib/` — 构建产物（`index.js` / `invariant.js` / `client.js` / 类型声明）
- `src/` — 源码（`index.ts` 宿主半边，`client/` 浏览器半边）
