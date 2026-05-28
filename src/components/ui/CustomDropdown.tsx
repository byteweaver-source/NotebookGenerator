import { useEffect, useRef, useState } from 'react'

export type DropdownSection = {
  label?: string
  items: Array<{ value: string; label: string }>
}

type CustomDropdownProps = {
  value: string
  sections: DropdownSection[]
  onChange: (value: string) => void
  disabled?: boolean
  id?: string
}

export function CustomDropdown(props: CustomDropdownProps) {
  const { value, sections, onChange, disabled = false, id } = props
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current) {
        return
      }
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function onEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onEscape)
    }
  }, [])

  const selectedItem = sections
    .flatMap((section) => section.items)
    .find((item) => item.value === value)

  return (
    <div ref={rootRef} className={`customDropdown ${open ? 'isOpen' : ''}`}>
      <button
        id={id}
        type="button"
        className="customDropdownTrigger"
        onClick={() => !disabled && setOpen((prev) => !prev)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="customDropdownValue">{selectedItem?.label ?? value}</span>
        <span className="customDropdownCaret" aria-hidden="true">
          ▾
        </span>
      </button>

      {open && !disabled && (
        <div className="customDropdownMenu" role="listbox">
          {sections.map((section, sectionIndex) => (
            <div key={`${section.label ?? 'section'}-${sectionIndex}`} className="customDropdownSection">
              {section.label && <div className="customDropdownSectionLabel">{section.label}</div>}
              {section.items.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={`customDropdownOption ${item.value === value ? 'isSelected' : ''}`}
                  onClick={() => {
                    onChange(item.value)
                    setOpen(false)
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
