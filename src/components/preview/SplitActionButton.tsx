import type { RefObject } from 'react'

type SplitActionMenuItem = {
  label: string
  disabled?: boolean
  onClick: () => void
}

type SplitActionButtonProps = {
  containerClassName?: string
  containerRef?: RefObject<HTMLDivElement | null>
  mainTitle: string
  mainAriaLabel: string
  mainIconClass: string
  onMainClick: () => void
  toggleAriaLabel: string
  expanded: boolean
  onToggle: () => void
  menuAriaLabel: string
  menuItems: SplitActionMenuItem[]
}

export function SplitActionButton(props: SplitActionButtonProps) {
  const {
    containerClassName = 'splitAction',
    containerRef,
    mainTitle,
    mainAriaLabel,
    mainIconClass,
    onMainClick,
    toggleAriaLabel,
    expanded,
    onToggle,
    menuAriaLabel,
    menuItems,
  } = props

  return (
    <div className={containerClassName} ref={containerRef}>
      <button
        type="button"
        className="smallButton splitActionMain"
        onClick={onMainClick}
        title={mainTitle}
        aria-label={mainAriaLabel}
      >
        <i className={mainIconClass} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="smallButton splitActionToggle"
        aria-label={toggleAriaLabel}
        aria-expanded={expanded}
        onClick={onToggle}
      >
        ▾
      </button>

      {expanded && (
        <div className="splitActionMenu" role="menu" aria-label={menuAriaLabel}>
          {menuItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className="splitActionMenuItem"
              role="menuitem"
              disabled={item.disabled}
              onClick={item.onClick}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
