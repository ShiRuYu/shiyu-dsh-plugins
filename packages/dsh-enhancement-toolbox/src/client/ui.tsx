import { useEffect, useState, useSyncExternalStore } from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { ToolboxController, ToolboxSnapshot } from './controller.ts'
import type { FeatureId, EnhancementSettings } from '../types.ts'
import { FEATURE_DESCRIPTORS } from '../features.ts'

type FooterProps = PropsRuntime<'sidebar.footer.action'> & { controller: ToolboxController }
type OverlayProps = PropsRuntime<'shell.overlay'> & { controller: ToolboxController; scope: SettingsLike }
type SettingsSnapshot = { value: EnhancementSettings | undefined }
type SettingsLike = { getSnapshot: () => SettingsSnapshot; subscribe: (listener: () => void) => () => void }

export function ToolboxFooterAction({ controller, wide }: FooterProps) {
  const snapshot = useSyncExternalStore<ToolboxSnapshot>(controller.subscribe, controller.getSnapshot, controller.getSnapshot)
  return (
    <button type="button" onClick={() => controller.togglePanel()} aria-expanded={snapshot.open} title="DSH 增强工具箱">
      {wide ? '增强工具箱' : '增强'}
    </button>
  )
}

export function ToolboxOverlay({ controller, scope }: OverlayProps) {
  const snapshot = useSyncExternalStore<ToolboxSnapshot>(controller.subscribe, controller.getSnapshot, controller.getSnapshot)
  const settingsSnapshot = useSyncExternalStore<SettingsSnapshot>(scope.subscribe, scope.getSnapshot, scope.getSnapshot)
  const templates = settingsSnapshot.value?.templates ?? []
  if (!snapshot.open) return null
  return (
    <aside role="dialog" aria-label="DSH 增强工具箱" style={panelStyle}>
      <header style={headerStyle}><strong>增强工具箱</strong><button type="button" onClick={() => controller.togglePanel()}>关闭</button></header>
      {!snapshot.sessionId ? <p>请先打开一个会话。</p> : null}
      {snapshot.features.map(feature => (
        <FeatureButton key={feature.id} feature={feature.id} available={feature.available} enabled={feature.enabled} state={feature.state} onClick={() => { void controller.toggleFeature(feature.id) }} />
      ))}
      {snapshot.error ? <p role="alert" style={{ color: 'var(--dsw-alias-label-danger, #c00)' }}>{snapshot.error}</p> : null}
      {snapshot.features.find(item => item.id === 'prompt-templates')?.enabled ? <TemplateList templates={templates} onInsert={prompt => controller.insertTemplate(prompt)} /> : null}
      {snapshot.meter !== null && snapshot.features.find(item => item.id === 'context-meter')?.enabled ? <p>上下文：{snapshot.meter.totalTokens.toLocaleString()} tokens（surface {snapshot.meter.surfaceTokens.toLocaleString()}）</p> : null}
      {snapshot.diagnostics !== null && snapshot.features.find(item => item.id === 'diagnostics')?.enabled ? <Diagnostics snapshot={snapshot.diagnostics} /> : null}
      {snapshot.features.find(item => item.id === 'tool-control')?.enabled ? <ToolSummary count={snapshot.tools.length} /> : null}
      <button type="button" onClick={() => { void controller.resetSession() }}>重置本会话覆盖</button>
    </aside>
  )
}

function FeatureButton(props: { feature: FeatureId; available: boolean; enabled: boolean; state: string; onClick: () => void }) {
  const descriptor = FEATURE_DESCRIPTORS.find(item => item.id === props.feature)
  return <button type="button" disabled={!props.available} onClick={props.onClick} title={descriptor?.description}>{descriptor?.label ?? props.feature}：{props.available ? props.state : '不可用'}{props.enabled ? ' ✓' : ''}</button>
}

function TemplateList({ templates, onInsert }: { templates: EnhancementSettings['templates']; onInsert: (prompt: string) => void }) {
  const active = templates.filter(template => template.enabled)
  if (active.length === 0) return null
  return <section><h4>模板</h4>{active.map(template => <button key={template.id} type="button" onClick={() => onInsert(template.prompt)}>{template.label}</button>)}</section>
}

function Diagnostics({ snapshot }: { snapshot: NonNullable<ReturnType<ToolboxController['getSnapshot']>['diagnostics']> }) {
  return <ul><li>会话：{snapshot.session}</li><li>工具：{snapshot.tools}</li><li>Token Meter：{snapshot.tokenMeter}</li>{snapshot.messages.map(message => <li key={message}>{message}</li>)}</ul>
}

function ToolSummary({ count }: { count: number }) { return <p>当前会话可见工具：{count} 个（限制是可见性策略，不是安全边界）。</p> }

export function ToolboxSettingsCard({ scope }: { scope: { getSnapshot: () => { status: string; writable: boolean; value: EnhancementSettings | undefined }; subscribe: (listener: () => void) => () => void; set: (field: string, value: unknown) => Promise<void> } }) {
  const snap = useSyncExternalStore(scope.subscribe, scope.getSnapshot, scope.getSnapshot)
  const [draft, setDraft] = useState<EnhancementSettings | undefined>(snap.value)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  useEffect(() => { if (!dirty && snap.value !== undefined) setDraft(snap.value) }, [snap.value, dirty])
  if (snap.status !== 'ready' || draft === undefined) return <p>正在加载增强工具箱设置…</p>
  const invalid = draft.templates.some(template => !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/.test(template.id) || template.label.trim() === '' || template.prompt.trim() === '')
  const save = async () => { setSaving(true); try { await scope.set('defaults', draft.defaults); await scope.set('templates', draft.templates); setDirty(false) } finally { setSaving(false) } }
  const reset = () => { setDraft({ defaults: { 'quick-actions': false, 'prompt-templates': false, 'context-meter': false, 'tool-control': false, diagnostics: false }, templates: draft.templates }); setDirty(true) }
  const updateTemplate = (index: number, patch: Partial<EnhancementSettings['templates'][number]>) => { setDraft({ ...draft, templates: draft.templates.map((template, i) => i === index ? { ...template, ...patch } : template) }); setDirty(true) }
  const addTemplate = () => { const id = `template-${draft.templates.length + 1}`; setDraft({ ...draft, templates: [...draft.templates, { id, label: '新模板', prompt: '', enabled: true }] }); setDirty(true) }
  return <section><h3>DSH 增强工具箱</h3><p>全局默认值（安装后全部关闭）。会话中的按钮切换会即时提交，不影响这里的草稿。</p>{Object.entries(draft.defaults).map(([id, value]) => <label key={id} style={{ display: 'block' }}><input type="checkbox" checked={value} onChange={event => { setDraft({ ...draft, defaults: { ...draft.defaults, [id as FeatureId]: event.target.checked } }); setDirty(true) }} /> {id}</label>)}<h4>提示词模板</h4>{draft.templates.map((template, index) => <fieldset key={template.id}><input value={template.label} aria-label={`${template.id} label`} onChange={event => updateTemplate(index, { label: event.target.value })} /><textarea value={template.prompt} aria-label={`${template.id} prompt`} onChange={event => updateTemplate(index, { prompt: event.target.value })} /><label><input type="checkbox" checked={template.enabled} onChange={event => updateTemplate(index, { enabled: event.target.checked })} /> 启用</label><button type="button" onClick={() => { setDraft({ ...draft, templates: draft.templates.filter((_, i) => i !== index) }); setDirty(true) }}>删除</button></fieldset>)}<button type="button" onClick={addTemplate}>添加模板</button>{invalid ? <p role="alert">模板 ID、名称和内容不能为空，ID 只能包含字母、数字、点、下划线和连字符。</p> : null}<p><button type="button" onClick={reset}>恢复全部关闭</button><button type="button" disabled={!dirty || invalid || saving || !snap.writable} onClick={() => { void save() }}>保存</button><button type="button" disabled={!dirty || saving} onClick={() => { setDraft(snap.value); setDirty(false) }}>Discard</button></p></section>
}

const panelStyle = { position: 'fixed' as const, right: 16, bottom: 64, zIndex: 1000, width: 320, padding: 16, background: 'var(--dsw-alias-bg-layer-1, white)', border: '1px solid var(--dsw-alias-border, #ddd)', boxShadow: '0 8px 28px #0002' }
const headerStyle = { display: 'flex', justifyContent: 'space-between', marginBottom: 8 }
