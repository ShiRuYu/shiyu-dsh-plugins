# dsh-enhancement-toolbox

`dsh-enhancement-toolbox` 是一个聚合式 DSH bundle，安装后五个功能全部关闭。用户可以在设置页编辑全局默认值和提示词模板，也可以在侧边栏底部打开增强面板，对当前会话即时设置覆盖：

- `quick-actions`：面板入口和快捷操作；
- `prompt-templates`：模板管理和一键插入；
- `context-meter`：使用 `ctx.tokenMeter.measure(session)` 显示真实 Token Meter 数据；
- `tool-control`：读取 Agent scope 的 `ctx.tools.schemas(scope)`，并使用同一 scope 的 `ctx.tools.restrict()`；
- `diagnostics`：显示连接、会话、工具和 Token Meter 的降级状态。

Host 侧服务名为 `enhancementToolbox`，设置命名空间为 `dsh-enhancement-toolbox`。每次会话覆盖和工具限制都写入 `enhancement/feature-toggle`、`enhancement/tool-restriction` log-only session event，恢复会话时重放事件。工具限制只改变模型可见性，不是权限或安全边界。

工具控制要求 Agent 组合在自己的 scoped context 中调用 `bindSessionScope(sessionId, { tools: () => agent.ctx.tools, tokenMeter })`；服务不会为了方便而从根上下文调用 `ctx.tools.restrict()`。没有该绑定时 UI 会显示“不可用”，其他模块仍可用。

## 本地构建

```bash
pnpm install
pnpm --filter dsh-enhancement-toolbox typecheck
pnpm --filter dsh-enhancement-toolbox test
pnpm --filter dsh-enhancement-toolbox build
```

安装 bundle 时使用 `cordis.patch.yml` 的 `insert` 条目；外部发布可使用 npm、Git 或 tarball，具体流程见仓库 `.dsh/skills/dsh-plugin-publisher/`。
