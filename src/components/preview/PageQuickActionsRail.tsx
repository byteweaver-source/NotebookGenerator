import type { RefObject } from 'react'
import { SplitActionButton } from './SplitActionButton'

type PageQuickActionsRailProps = {
  canDragElements: boolean
  pageActionMenuOpen: boolean
  pageActionMenuRef: RefObject<HTMLDivElement | null>
  duplicateDisabled: boolean
  disableMoveUp: boolean
  disableMoveDown: boolean
  disableDelete: boolean
  onOpenElementLibrary: () => void
  onAddBlankPage: () => void
  onTogglePageActionMenu: () => void
  onDuplicateOne: () => void
  onDuplicateFive: () => void
  onDuplicateTen: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onDelete: () => void
}

export function PageQuickActionsRail(props: PageQuickActionsRailProps) {
  const {
    canDragElements,
    pageActionMenuOpen,
    pageActionMenuRef,
    duplicateDisabled,
    disableMoveUp,
    disableMoveDown,
    disableDelete,
    onOpenElementLibrary,
    onAddBlankPage,
    onTogglePageActionMenu,
    onDuplicateOne,
    onDuplicateFive,
    onDuplicateTen,
    onMoveUp,
    onMoveDown,
    onDelete,
  } = props

  return (
    <div className="pageQuickActions" aria-label="Azioni pagina">
      <button
        type="button"
        className="iconToolButton"
        title="Apri libreria elementi"
        aria-label="Apri libreria elementi"
        onClick={onOpenElementLibrary}
        disabled={!canDragElements}
      >
        <span className="iconShort" aria-hidden="true">
          <i className="fa-solid fa-shapes" />
        </span>
      </button>

      <SplitActionButton
        containerClassName="splitAction pageQuickSplit"
        containerRef={pageActionMenuRef}
        mainTitle="Aggiungi pagina blank"
        mainAriaLabel="Aggiungi pagina blank"
        mainIconClass="fa-solid fa-plus"
        onMainClick={onAddBlankPage}
        toggleAriaLabel="Apri menu azioni pagina"
        expanded={pageActionMenuOpen}
        onToggle={onTogglePageActionMenu}
        menuAriaLabel="Azioni pagina rapide"
        menuItems={[
          {
            label: 'Duplica +1',
            disabled: duplicateDisabled,
            onClick: onDuplicateOne,
          },
          {
            label: 'Duplica +5',
            disabled: duplicateDisabled,
            onClick: onDuplicateFive,
          },
          {
            label: 'Duplica +10',
            disabled: duplicateDisabled,
            onClick: onDuplicateTen,
          },
        ]}
      />

      <button
        type="button"
        className="iconToolButton"
        title="Sposta pagina su"
        aria-label="Sposta pagina su"
        onClick={onMoveUp}
        disabled={disableMoveUp}
      >
        <span className="iconShort" aria-hidden="true">
          <i className="fa-solid fa-angle-up" />
        </span>
      </button>
      <button
        type="button"
        className="iconToolButton"
        title="Sposta pagina giu"
        aria-label="Sposta pagina giu"
        onClick={onMoveDown}
        disabled={disableMoveDown}
      >
        <span className="iconShort" aria-hidden="true">
          <i className="fa-solid fa-angle-down" />
        </span>
      </button>
      <button
        type="button"
        className="iconToolButton danger"
        title="Elimina pagina"
        aria-label="Elimina pagina"
        onClick={onDelete}
        disabled={disableDelete}
      >
        <span className="iconShort" aria-hidden="true">
          <i className="fa-solid fa-trash" />
        </span>
      </button>
    </div>
  )
}
