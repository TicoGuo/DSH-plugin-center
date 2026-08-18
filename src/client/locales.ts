/** `pluginCenter` namespace dictionaries (view tab, toolbar, cards, actions, settings card). */

/** Dictionary namespace owned by this plugin. */
export const NS = 'pluginCenter'

/** The plugin-center dictionary key set (the source of truth for both locales). */
export type PluginCenterKey =
  | 'view.pluginCenter'
  | 'toolbar.aria'
  | 'search'
  | 'filter.all'
  | 'filter.installed'
  | 'filter.updatable'
  | 'filter.disabled'
  | 'refresh'
  | 'stats'
  | 'status.notInstalled'
  | 'status.enabled'
  | 'status.disabled'
  | 'status.updateAvailable'
  | 'action.install'
  | 'action.uninstall'
  | 'action.update'
  | 'action.enable'
  | 'action.disable'
  | 'detail.version'
  | 'detail.installedVersion'
  | 'detail.author'
  | 'detail.repository'
  | 'detail.changelog'
  | 'detail.requirements'
  | 'detail.requirementsEmpty'
  | 'detail.description'
  | 'detail.stars'
  | 'detail.installCommand'
  | 'confirm.uninstallTitle'
  | 'confirm.uninstallBody'
  | 'confirm.cancel'
  | 'confirm.confirm'
  | 'toast.install'
  | 'toast.uninstall'
  | 'toast.update'
  | 'toast.enable'
  | 'toast.disable'
  | 'toast.failed'
  | 'toast.upToDate'
  | 'toast.restartHint'
  | 'loading'
  | 'error'
  | 'retry'
  | 'empty'
  | 'emptySearch'
  | 'disabled'
  | 'enableFeature'
  | 'githubError'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The Plugin Center view tab, toolbar, cards, actions, and settings-card copy. */
    'pluginCenter': PluginCenterKey
  }
}

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh: Record<PluginCenterKey, string> = {
  'view.pluginCenter': '插件中心',
  'toolbar.aria': '插件中心工具栏',
  'search': '搜索插件',
  'filter.all': '全部',
  'filter.installed': '已安装',
  'filter.updatable': '可更新',
  'filter.disabled': '已停用',
  'refresh': '检查更新',
  'stats': '已安装 {installed} / {total}',
  'status.notInstalled': '未安装',
  'status.enabled': '已启用',
  'status.disabled': '已停用',
  'status.updateAvailable': '可更新',
  'action.install': '安装',
  'action.uninstall': '卸载',
  'action.update': '更新',
  'action.enable': '启用',
  'action.disable': '停用',
  'detail.version': '版本',
  'detail.installedVersion': '已安装版本',
  'detail.author': '作者',
  'detail.repository': '仓库',
  'detail.changelog': '更新日志',
  'detail.requirements': '依赖要求',
  'detail.requirementsEmpty': '无额外依赖要求',
  'detail.description': '简介',
  'detail.stars': '星标',
  'detail.installCommand': '安装命令',
  'confirm.uninstallTitle': '卸载插件',
  'confirm.uninstallBody': '确定要卸载「{name}」吗？将清理插件文件和数据。',
  'confirm.cancel': '取消',
  'confirm.confirm': '卸载',
  'toast.install': '安装完成',
  'toast.uninstall': '已卸载',
  'toast.update': '更新完成',
  'toast.enable': '已启用',
  'toast.disable': '已停用',
  'toast.failed': '操作失败：{message}',
  'toast.upToDate': '已是最新版本',
  'toast.restartHint': '（需重启 dsh web 生效）',
  'loading': '正在加载插件…',
  'error': '加载插件列表失败',
  'retry': '重试',
  'empty': '暂无插件',
  'emptySearch': '没有匹配的插件',
  'disabled': '插件中心已停用。',
  'enableFeature': '启用插件中心',
  'githubError': '无法加载插件列表：{message}',
}

/** English dictionary. */
export const en: Record<PluginCenterKey, string> = {
  'view.pluginCenter': 'Plugin Center',
  'toolbar.aria': 'Plugin Center toolbar',
  'search': 'Search plugins',
  'filter.all': 'All',
  'filter.installed': 'Installed',
  'filter.updatable': 'Updatable',
  'filter.disabled': 'Disabled',
  'refresh': 'Check updates',
  'stats': 'Installed {installed} / {total}',
  'status.notInstalled': 'Not installed',
  'status.enabled': 'Enabled',
  'status.disabled': 'Disabled',
  'status.updateAvailable': 'Update available',
  'action.install': 'Install',
  'action.uninstall': 'Uninstall',
  'action.update': 'Update',
  'action.enable': 'Enable',
  'action.disable': 'Disable',
  'detail.version': 'Version',
  'detail.installedVersion': 'Installed version',
  'detail.author': 'Author',
  'detail.repository': 'Repository',
  'detail.changelog': 'Changelog',
  'detail.requirements': 'Requirements',
  'detail.requirementsEmpty': 'No additional requirements',
  'detail.description': 'About',
  'detail.stars': 'Stars',
  'detail.installCommand': 'Install command',
  'confirm.uninstallTitle': 'Uninstall plugin',
  'confirm.uninstallBody': 'Uninstall "{name}"? Plugin files and data will be removed.',
  'confirm.cancel': 'Cancel',
  'confirm.confirm': 'Uninstall',
  'toast.install': 'Installed',
  'toast.uninstall': 'Uninstalled',
  'toast.update': 'Updated',
  'toast.enable': 'Enabled',
  'toast.disable': 'Disabled',
  'toast.failed': 'Failed: {message}',
  'toast.upToDate': 'Already up to date',
  'toast.restartHint': ' (restart dsh web to apply)',
  'loading': 'Loading plugins…',
  'error': 'Failed to load plugins',
  'retry': 'Retry',
  'empty': 'No plugins',
  'emptySearch': 'No matching plugins',
  'disabled': 'Plugin Center is disabled.',
  'enableFeature': 'Enable Plugin Center',
  'githubError': 'Could not load the plugin list: {message}',
}
