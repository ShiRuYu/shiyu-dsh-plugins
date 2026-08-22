# DSH Bundle 与 Profile 发布参考

来源：[官方《打包与安装插件》](https://deepseek-harness.github.io/deepseek-harness/develop/basic/publish)。

## 1. Bundle manifest

一个最小 JavaScript bundle：

```json
{
  "name": "dsh-hello-plugin",
  "version": "0.1.0",
  "type": "module",
  "main": "index.js",
  "files": ["index.js", "cordis.patch.yml"],
  "dsh": { "bundle": { "patch": "./cordis.patch.yml" } }
}
```

入口 `index.js`：

```js
export const name = 'hello-plugin'

export function apply() {
  console.log('[hello-plugin] plugin loaded!')
}
```

`cordis.patch.yml`：

```yaml
- insert:
    - id: hello
      name: dsh-hello-plugin
```

本地开发阶段可以用相对/绝对源码路径的 `--patch` overlay；已安装 bundle 的 patch 行应使用包名，让 Node 模块解析从 profile 中找到入口。

## 2. 安装与检查

```sh
dsh plugin --profile demo add ./hello-plugin
dsh --profile demo --dump-config
dsh --profile demo
dsh plugin --profile demo remove dsh-hello-plugin
```

首次安装会初始化 profile，并把 bundle 追加到 `dsh.profile.bundles`。`remove` 会同时移除依赖和对应层。

## 3. 层顺序与覆盖

```text
1. profile.dsh.profile.bundles（按列表顺序）
2. profile/cordis.patch.yml
3. $DSH_HOME/cordis.patch.yml
4. 每个 --patch overlay（按命令行顺序）
```

后应用层按插件行 `id` 胜出。配置是整值替换：覆盖某个插件行时必须提供该行需要保留的全部配置键；不要假设 patch 会深度合并对象。

## 4. Git、npm 与 tarball

Git 安装：

```sh
dsh plugin --profile demo add github:you/hello-plugin#<commit-sha>
```

Git 依赖拉取源码，因此 TypeScript bundle 应提供类似下面的构建入口：

```json
{
  "scripts": {
    "prepare": "tsdown -c tsdown.config.ts"
  }
}
```

首次安装若 pnpm 报构建脚本未获授权，用户需要审查包来源后，将准确的包键加入 profile 的 `pnpm-workspace.yaml`：

```yaml
allowBuilds:
  dsh-hello-plugin: true
```

发布 npm 时在发布前构建 `lib/`；交付 tarball 时：

```sh
pnpm pack
dsh plugin --profile demo add ./dsh-hello-plugin-0.1.0.tgz
```

预构建 npm/tarball 不需要在用户安装时执行 Git `prepare`，但仍需验证产物内包含 `dsh.bundle` 指向的 patch 和入口。

## 5. 交付前验证

1. 在干净 profile 安装一次，确认依赖解析和 bundle 层出现。
2. 执行 `--dump-config`，检查 patch 行的 id、name 和 config。
3. 启动实际目标（例如 `dsh web`），验证加载日志和用户可见行为。
4. 改变配置或重启，确认没有重复注册、旧定时器或残留监听器。
5. 执行卸载并再次启动，确认插件不再加载且 profile 其余 bundle 不受影响。
