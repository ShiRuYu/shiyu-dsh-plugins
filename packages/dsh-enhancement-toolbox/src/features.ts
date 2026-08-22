import type { FeatureDescriptor, FeatureId } from './types.ts'

export const FEATURE_DESCRIPTORS: readonly FeatureDescriptor[] = [
  {
    id: 'quick-actions',
    label: '快捷操作',
    description: '打开增强面板并提供会话级快捷操作。',
    requires: ['slots'],
  },
  {
    id: 'prompt-templates',
    label: '提示词模板',
    description: '管理模板并一键插入当前输入框。',
    requires: ['slots'],
  },
  {
    id: 'context-meter',
    label: '上下文计量',
    description: '展示 Token Meter 的真实上下文压力。',
    requires: ['tokenMeter'],
  },
  {
    id: 'tool-control',
    label: '工具控制',
    description: '按会话限制模型可见的继承工具。',
    requires: ['tools'],
  },
  {
    id: 'diagnostics',
    label: '诊断信息',
    description: '查看插件、会话、工具和连接状态。',
    requires: ['connection'],
  },
] as const

export const featureDescriptor = (id: FeatureId): FeatureDescriptor => {
  const descriptor = FEATURE_DESCRIPTORS.find(item => item.id === id)
  if (descriptor === undefined) throw new Error(`unknown feature id: ${id}`)
  return descriptor
}
