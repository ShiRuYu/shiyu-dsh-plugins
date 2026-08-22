---
name: dsh-plugin-developer
description: 编写和调试 DeepSeek Harness（DSH）Cordis 插件，覆盖 apply、依赖注入、配置、工具、事件、服务与生命周期。适用于新建或修改 DSH 插件；只做打包发布时改用 dsh-plugin-publisher。
---

# DSH 插件开发者

使用本技能时，以官方 [Basic Plugin Development](https://deepseek-harness.github.io/deepseek-harness/develop/basic/) 文档和当前 DSH/Cordis SDK 类型为准。先确认目标是 host 插件、工具、服务还是 Web UI 扩展，再选择最小实现；不要为了示例引入未声明的服务或硬编码部署参数。

## 核心契约

- 插件模块必须导出 `apply(ctx)`；建议同时导出稳定、唯一的 `name`。
- 依赖服务通过 `inject` 声明。必需依赖缺失时让 Cordis 延迟加载；可选依赖不要伪造 `inject`，在使用点用 `ctx.get()` 查询。
- 凡是监听器、工具、定时器等由 `ctx` 注册的资源，都让 Cordis 管理其生命周期；自有网络连接、子进程等资源用 `ctx.effect()` 返回 disposer。
- 若插件对外提供能力，用 `Service` 或明确的上下文扩展提供服务，并通过类型声明合并暴露类型；消费方只依赖服务接口，不依赖实现细节。

## 实现流程

1. 在独立 scratch 目录创建 `src/<plugin>.ts` 与 `cordis.yml`，先用绝对路径 `insert` 行挂载本地模块。
2. 写最小 `apply(ctx)`，确认 `pnpm dsh web --patch ./cordis.yml` 启动后能在终端看到加载日志。
3. 按需增加 `inject`、配置 schema、工具注册、事件监听或 Service；每增加一项都补充对应的缺失依赖、失败行为和清理逻辑。
4. 修改配置时依赖 schema 默认值和校验，不在代码中写部署相关常量；确认 HMR/卸载后旧监听器和定时器没有残留。
5. 运行类型检查、单元测试和一次真实 Web UI 验收；需要安装到 profile 或发布 npm/Git 时转用 `$dsh-plugin-publisher`。

## 常用模式

- 工具插件：声明 `inject = ['tools']`，使用 `defineTool` 描述参数、规范化输出和渲染；`execute` 只返回 schema 声明的值。
- 配置插件：导出同名的 `Config` 类型和 `Schema<Config>`，把必填项、枚举、范围和默认值写进 schema。
- 事件插件：先确认事件名称和模式（`emit`、`bail`、`serial`、`waterfall`）；`waterfall` 监听器必须调用 `next()` 才能继续链路。
- 服务插件：提供方用 `Service` 注册服务名，消费方用 `inject` 等待服务就绪；服务消失时应允许 Cordis 自动 dispose/reload。

## 边界与安全

- 不直接修改 DSH 源码，不通过隐式全局变量取得服务，不把 API key 或机器路径提交进源码。
- 不把 `ctx` 注册的资源保存到跨实例全局单例；插件重新加载后必须能得到干净实例。
- 配置校验失败要在加载时明确报错；外部网络、文件和子进程失败要返回可诊断错误并执行清理。

## 按需参考

- 需要官方 TypeScript、配置、工具、事件和服务示例时，读取 [references/official-basic.md](references/official-basic.md)。
- 需要 `package.json`、`cordis.patch.yml`、profile 安装或发布流程时，读取 `$dsh-plugin-publisher`，不要在本技能中重复维护打包规则。

## 最小验收清单

- [ ] `apply(ctx)` 可被加载，`name`/`inject` 与实际能力一致。
- [ ] 配置由 schema 校验，默认值和错误信息符合预期。
- [ ] 工具参数、返回值和渲染输出类型一致。
- [ ] 事件、服务、定时器和外部资源在卸载后均无残留。
- [ ] 本地 `--patch` 启动、一次正常调用和一次失败路径均已验证。
