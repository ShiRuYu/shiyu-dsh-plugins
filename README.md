# shiyu-dsh-plugins

本仓库提供可随项目分发的 DSH（DeepSeek Harness）插件开发技能，技能目录位于 `.dsh/skills/`。

| 技能 | 用途 |
| --- | --- |
| `dsh-plugin-developer` | 编写和调试 Cordis 插件：`apply`、`inject`、配置、工具、事件、服务与生命周期 |
| `dsh-plugin-publisher` | 打包和交付插件：bundle manifest、`cordis.patch.yml`、profile 安装、Git/npm/tarball 与验收 |

两项技能均以官方 [Basic Plugin Development](https://deepseek-harness.github.io/deepseek-harness/develop/basic/) 文档为依据。实现业务逻辑时使用 `$dsh-plugin-developer`；已有可运行插件、需要安装或发布时使用 `$dsh-plugin-publisher`。
