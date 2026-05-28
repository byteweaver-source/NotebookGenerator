import type { ReactNode } from 'react'

type ToolbarCardProps = {
  className?: string
  children: ReactNode
}

export function ToolbarCard(props: ToolbarCardProps) {
  const { className = '', children } = props
  const mergedClassName = ['previewTopToolbar', className].filter(Boolean).join(' ')

  return <div className={mergedClassName}>{children}</div>
}
