# 官方 DSH 基础开发参考

本参考提炼自官方文档：

- [第一个插件](https://deepseek-harness.github.io/deepseek-harness/develop/basic/)
- [插件配置](https://deepseek-harness.github.io/deepseek-harness/develop/basic/config)
- [开发一个工具](https://deepseek-harness.github.io/deepseek-harness/develop/basic/tool)
- [服务与依赖](https://deepseek-harness.github.io/deepseek-harness/develop/framework/service)
- [事件系统](https://deepseek-harness.github.io/deepseek-harness/develop/framework/events)

## 1. 最小本地插件

从已能运行的 DSH 源码 checkout 根目录开始：

```sh
mkdir -p scratch-plugin/src
```

`scratch-plugin/src/my-plugin.ts`：

```ts
import type { Context } from '@deepseek-ai/cordis'

export const name = 'hello-plugin'

export function apply(ctx: Context) {
  console.log('[hello-plugin] plugin loaded!')
}
```

`scratch-plugin/cordis.yml`：

```yaml
- insert:
    - id: hello
      name: '/absolute/path/to/deepseek-harness/scratch-plugin/src/my-plugin.ts'
```

运行：

```sh
pnpm dsh web --patch ./scratch-plugin/cordis.yml
```

官方教程要求本地模块路径使用绝对路径；打开 `http://127.0.0.1:3080`，并在终端确认加载日志。

## 2. 生命周期与依赖

```ts
import type { Context } from '@deepseek-ai/cordis'

export const name = 'heartbeat-plugin'

export function apply(ctx: Context) {
  ctx.effect(() => {
    const timer = setInterval(() => console.log('heartbeat'), 5000)
    return () => clearInterval(timer)
  })
}
```

必需服务通过 `inject` 声明：

```ts
export const inject = ['tools']

export function apply(ctx: Context) {
  ctx.tools.register(/* ... */)
}
```

不声明为必需依赖的能力，用 `ctx.get('serviceName')` 在使用点查询并处理不存在的情况。`ctx.on()`、工具注册和定时器等 effect 会随插件卸载自动清理。

## 3. 配置 schema

```ts
import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'

export const name = 'validated-plugin'

export interface Config {
  apiKey: string
  timeout: number
  mode: 'fast' | 'accurate'
}

export const Config: Schema<Config> = Schema.object({
  apiKey: Schema.string().required(),
  timeout: Schema.number().default(30000),
  mode: Schema.union(['fast', 'accurate']).default('fast'),
})

export function apply(_ctx: Context, config: Config) {
  console.log(config.mode, config.timeout)
}
```

在 patch 行中传入配置：

```yaml
- insert:
    - id: validated
      name: './src/validated-plugin.ts'
      config:
        apiKey: 'replace-me'
        timeout: 5000
```

配置变更会触发旧实例卸载和新实例加载；因此所有注册和外部资源都必须可逆。

## 4. 工具注册

```ts
import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'

export const name = 'greet-tool'
export const inject = ['tools']

export function apply(ctx: Context) {
  ctx.tools.register(defineTool({
    name: 'greet',
    description: 'Greet someone by name.',
    parameters: {
      name: { type: 'string', required: true, description: 'The name to greet' },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args) {
      return `Hello, ${args.name}!`
    },
  }))
}
```

先完成本地启动，再让模型实际调用工具，验证参数校验、执行结果和 UI/模型可见输出。

## 5. 事件与服务

事件基本形式：

```ts
ctx.on('my-plugin/ready', payload => {
  console.log(payload)
})

ctx.emit('my-plugin/ready', { id: 'worker-1' })
```

`bail` 会在首个非空结果处停止，`serial` 等待监听器顺序执行，`waterfall` 必须调用 `next()` 传递下游。需要类型安全事件时，通过模块声明合并扩展 `@deepseek-ai/cordis` 的 `Events` 接口。

提供服务时使用 `Service`：

```ts
import { Service, type Context } from '@deepseek-ai/cordis'

declare module '@deepseek-ai/cordis' {
  interface Context {
    metrics: MetricsService
  }
}

export default class MetricsService extends Service {
  constructor(ctx: Context) {
    super(ctx, 'metrics')
  }

  record(event: string, value: number) {
    console.log(event, value)
  }
}
```

消费方声明 `export const inject = ['metrics']`，不要直接 import 提供方的实现类来绕过服务边界。
