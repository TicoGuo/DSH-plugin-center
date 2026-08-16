# @ticoguo/dsh-plugin-center

DSH 插件中心（双面包）：在「设置 → 插件 → 插件配置」提供「插件中心」卡片开关（默认关闭），开启后在「对话 / 轨迹」标签旁新增 **插件中心**，实时读取 [awesome-dsh-plugin.com](https://awesome-dsh-plugin.com/zh/) 精选列表并以卡片展示，支持安装 / 更新 / 停用 / 启用 / 卸载。

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
- 插件列表实时读取 [awesome-dsh-plugin.com](https://awesome-dsh-plugin.com/zh/) 精选列表（源码为 `awesome-dsh-plugin/awesome-dsh-plugin` 仓库的 README），按该列表的精选顺序展示。
- 卡片显示图标、名称、简介、状态（未安装 / 已启用 / 已停用），并提供安装 / 启用 / 停用 / 更新 / 卸载按钮；点击卡片展开详情（版本、作者、仓库、简介）。

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

## 依赖说明

- 运行时依赖 DSH 核心包（`@deepseek-ai/cordis`、`@deepseek-ai/dsh-*`、`@deepseek-ai/schemastery`、`react`），它们由使用者的 DSH 安装提供，无需单独安装。
- 本包是「双面包」：`lib/index.js` 是宿主（`/plugin-center` 路由 + 设置命名空间），`lib/client.js` 是浏览器端（视图 + 卡片），`cordis.patch.yml` 是 bundle 补丁。

## 目录

- `cordis.patch.yml` — bundle 补丁
- `lib/` — 构建产物（`index.js` / `invariant.js` / `client.js` / 类型声明）
- `src/` — 源码（`index.ts` 宿主半边，`client/` 浏览器半边）
