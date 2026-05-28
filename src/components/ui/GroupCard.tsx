import type { ReactNode } from 'react'

type GroupCardProps = {
  title: string
  className?: string
  children: ReactNode
}

export function GroupCard(props: GroupCardProps) {
  const { title, className = '', children } = props
  const mergedClassName = ['group', 'groupedBox', className].filter(Boolean).join(' ')

  return (
    <div className={mergedClassName}>
      <label className="groupTitle">{title}</label>
      {children}
    </div>
  )
}
