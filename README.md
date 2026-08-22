# shiyu-dsh-plugins

本仓库提供可随项目分发的 DSH（DeepSeek Harness）插件开发技能，技能目录位于 `.dsh/skills/`。

| 技能 | 用途 |
| --- | --- |
| `dsh-plugin-developer` | 编写和调试 Cordis 插件：`apply`、`inject`、配置、工具、事件、服务与生命周期 |
| `dsh-plugin-publisher` | 打包和交付插件：bundle manifest、`cordis.patch.yml`、profile 安装、Git/npm/tarball 与验收 |

两项技能均以官方 [Basic Plugin Development](https://deepseek-harness.github.io/deepseek-harness/develop/basic/) 文档为依据。实现业务逻辑时使用 `$dsh-plugin-developer`；已有可运行插件、需要安装或发布时使用 `$dsh-plugin-publisher`。

## 示例 bundle

`packages/dsh-enhancement-toolbox/` 是一个可安装的聚合 bundle，提供五个默认关闭、可按会话切换的增强模块：快捷操作、提示词模板、真实 Token Meter 上下文计量、Agent scope 工具可见性控制和诊断信息。Host 通过 `enhancementToolbox` 服务维护设置与 session log-only 事件，Browser 通过 `settings.plugin.item`、`sidebar.footer.action` 和 `shell.overlay` 三个官方 slot 扩展界面。

```bash
pnpm install
pnpm --filter dsh-enhancement-toolbox typecheck
pnpm --filter dsh-enhancement-toolbox test
pnpm --filter dsh-enhancement-toolbox build
```

### DSH 安装

从本仓库源码安装到 `default` profile：

```bash
dsh plugin --profile default add ./packages/dsh-enhancement-toolbox
```

从 GitHub monorepo 的子目录安装（PowerShell 请保留整段引号）：

```bash
dsh plugin --profile default add "github:ShiRuYu/shiyu-dsh-plugins#master&path:packages/dsh-enhancement-toolbox"
```

当前 bundle 尚未发布到 npm，因此直接使用 `dsh-enhancement-toolbox` 会返回 `ERR_PNPM_FETCH_404`。只有完成 npm 发布后，才可以改用 `dsh plugin --profile default add dsh-enhancement-toolbox`。

安装后启动并检查配置层：

```bash
dsh --profile default
dsh plugin --profile default --dump-config
```
