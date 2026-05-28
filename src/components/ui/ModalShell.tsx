import type { ReactNode } from 'react'

type ModalShellProps = {
  title: string
  ariaLabel: string
  onClose: () => void
  className?: string
  closeLabel?: string
  children: ReactNode
}

export function ModalShell(props: ModalShellProps) {
  const {
    title,
    ariaLabel,
    onClose,
    className = '',
    closeLabel = 'Chiudi',
    children,
  } = props
  const modalClassName = ['floatingModal', className].filter(Boolean).join(' ')

  return (
    <div className="floatingModalLayer" role="dialog" aria-modal="true" aria-label={ariaLabel}>
      <div className={modalClassName}>
        <div className="floatingModalHeader">
          <strong>{title}</strong>
          <button
            type="button"
            className="smallButton"
            onClick={onClose}
          >
            {closeLabel}
          </button>
        </div>

        {children}
      </div>
    </div>
  )
}
