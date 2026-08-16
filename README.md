# @ticoguo/dsh-plugin-center

DSH 插件中心（双面包）：在「对话 / 轨迹」标签旁新增 **插件中心**，实时读取 GitHub 上的 DSH 插件并按星标热度排序，支持安装 / 更新 / 停用 / 启用 / 卸载；在「设置 → 插件 → 插件配置」提供「插件中心」卡片开关。

## 安装（一条命令）

```bash
dsh plugin --profile web add github:TicoGuo/DSH-plugin-center
```

> `dsh` 即 DeepSeek Harness CLI；若从源码仓库运行则用 `pnpm dsh`。安装后重启 `dsh web`，打开 http://127.0.0.1:3080 即可。

## 使用

1. 点击「对话 / 轨迹」标签旁的「插件中心」标签，进入插件中心。
2. 列表实时读取 GitHub 上声明了 `dsh` 清单的仓库（默认查询 `topic:dsh-plugin OR dsh-plugin in:name,description OR deepseek-harness in:name,description,readme`），按星标数降序排列。
3. 卡片显示图标、名称、版本、简介、状态（未安装 / 已启用 / 已停用 / 可更新），并提供安装 / 启用 / 停用 / 更新 / 卸载按钮；点击卡片展开详情（版本、作者、仓库、更新日志、依赖要求）。
4. 在「设置 → 插件 → 插件配置 → 插件中心」用开关启用/停用该功能。

## 给插件作者

想让你的 DSH 插件被插件中心收录：给仓库添加 `topic:dsh-plugin`（或让名称/描述包含 `dsh-plugin` / `deepseek-harness`），并在根 `package.json` 声明 `dsh` 清单（`dsh.bundle.patch` 或 `dsh.client`）。星标越多排序越靠前。

## 目录

- `cordis.patch.yml` — bundle 补丁（插入 `plugin-center` 一行，宿主 + 浏览器双面）
- `lib/` — 构建产物（`index.js` 宿主半边、`client.js` 浏览器半边、`invariant.js`、类型声明）
- `src/` — 源码（`index.ts` 宿主半边，`client/` 浏览器半边）

## 说明

- 安装/卸载/更新在 profile 目录内调用 pnpm（与 `dsh plugin` 一致），安装后需重启 `dsh web` 生效。
- `plugin-center` 设置命名空间需要在宿主 `WEB_SETTINGS_NAMESPACES` 白名单中（随 DSH 版本发布），否则开关卡片不可用；宿主路由与视图仍可用。
