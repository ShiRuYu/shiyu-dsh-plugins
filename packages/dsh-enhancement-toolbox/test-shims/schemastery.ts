type Resolver = (value: unknown) => unknown

class TestSchema {
  constructor(private readonly resolver: Resolver = value => value, private readonly fallback?: unknown) {}
  default(value: unknown): TestSchema { return new TestSchema(value_ => value_ == null ? value : this.resolver(value_), value) }
  pattern(): TestSchema { return this }
  min(): TestSchema { return this }
  max(): TestSchema { return this }
  resolve(value: unknown): unknown { return this.resolver(value) }
}

const z = {
  boolean: () => new TestSchema(value => typeof value === 'boolean' ? value : false),
  string: () => new TestSchema(value => String(value ?? '')),
  object: (shape: Record<string, TestSchema>) => new TestSchema(value => Object.fromEntries(Object.entries(shape).map(([key, schema]) => [key, schema.resolve((value as Record<string, unknown> | undefined)?.[key])] ))),
  array: (schema: TestSchema) => new TestSchema(value => Array.isArray(value) ? value.map(item => schema.resolve(item)) : []),
}

export default z
