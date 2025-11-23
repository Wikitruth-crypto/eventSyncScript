/**
 * Node 环境下的占位符 Label 工具，直接返回传入的字符串。
 * 仍保留与原组件相同的 API 形状，方便后续替换。
 */
export const PlaceholderLabel = ({ label }: { label: string }): string => label
