---
name: dsh-plugin-publisher
description: 将 DeepSeek Harness（DSH）插件打包为可安装 bundle，配置 cordis.patch.yml，安装到 profile，并验证 npm、Git 或 tarball 交付。适用于发布、安装和升级流程，不负责插件业务逻辑实现。
---

# DSH 插件打包发布者

本技能处理官方 bundle/profile 交付链路。以 [官方打包与安装文档](https://deepseek-harness.github.io/deepseek-harness/develop/basic/publish) 为准；如果还没有可运行的 `apply(ctx)`，先使用 `$dsh-plugin-developer`。

## Bundle 最小结构

```text
hello-plugin/
├── package.json
├── cordis.patch.yml
└── index.js
```

`package.json` 必须声明 `dsh.bundle.patch`，并将 patch 文件和入口文件纳入发布内容。patch 中的插件行用已安装包名引用入口：

```yaml
- insert:
    - id: hello
      name: dsh-hello-plugin
```

不要把普通依赖误声明成 bundle；没有 `dsh.bundle` 的包可以被安装，但不会激活配置层。

## 发布流程

1. 确认入口是可独立加载的 JavaScript/TypeScript 构建产物，且不依赖开发仓库的相对路径。
2. 检查 `package.json`、`cordis.patch.yml`、`files`、`main`/`exports` 和版本号。
3. 选择 npm、Git 或 tarball 交付方式，并明确构建脚本和安装授权风险。
4. 在隔离 profile 中执行 `dsh plugin --profile <name> add ...`，用 `--dump-config` 检查层是否挂载。
5. 重启 `dsh --profile <name>` 或 `dsh web`，验证插件行为；卸载后再次启动，确认 patch 和依赖一并移除。

## Profile 与 patch 规则

profile 由 `dsh plugin` 管理，不要手写其 bundle 列表。生效顺序是：profile bundles（按安装顺序）→ profile 自有 patch → home patch → 命令行 `--patch` overlays（按参数顺序）。后应用层按 id 胜出；覆盖行的 `config` 是整体替换，不是深度合并，因此覆盖时必须重述所需配置键。

## Git 安装与构建授权

- Git 安装取得源码，不会自动得到 `lib/`；TypeScript 包必须提供 `prepare`，且构建必须自包含。
- pnpm 10+ 可能阻止 Git 依赖的 `prepare`。只有确认源码可信时，才在目标 profile 的 `pnpm-workspace.yaml` 中为该包加入 `allowBuilds`。
- 若不希望用户授权安装时执行构建，发布预构建 npm 包或 tarball。
- Git 依赖应锁定 commit；不要让生产 profile 随意跟随可变分支。

## 验收清单

- [ ] `package.json` 含有效 `dsh.bundle.patch`。
- [ ] patch 使用包名入口，发布包内存在 patch 与构建产物。
- [ ] `dsh plugin --profile <name> add ...` 成功且 `--dump-config` 能看到 bundle 层。
- [ ] 启动、正常调用、错误路径和重启后的行为均已验证。
- [ ] `remove` 后依赖和 bundle 层消失，profile 仍可启动。
- [ ] npm/Git/tarball 的构建、授权和版本锁定策略已写入发布说明。

## 按需参考

完整的 manifest、命令和加载顺序示例见 [references/bundle-publishing.md](references/bundle-publishing.md)。
