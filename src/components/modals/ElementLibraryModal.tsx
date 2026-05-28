import { ModalShell } from '../ui/ModalShell'
import { ElementLibraryContent } from '../ui/ElementLibraryContent'

type ElementLibraryCategoryNode = {
  id: string
  label: string
}

type ElementLibraryItem = {
  id: string
  label: string
  description: string
  iconClass: string
}

type ElementLibraryModalProps = {
  open: boolean
  categories: ElementLibraryCategoryNode[]
  selectedCategory: string
  onSelectCategory: (categoryId: string) => void
  query: string
  onQueryChange: (query: string) => void
  items: ElementLibraryItem[]
  onSelectItem: (itemId: string) => void
  onClose: () => void
}

export function ElementLibraryModal(props: ElementLibraryModalProps) {
  const {
    open,
    categories,
    selectedCategory,
    onSelectCategory,
    query,
    onQueryChange,
    items,
    onSelectItem,
    onClose,
  } = props

  if (!open) {
    return null
  }

  return (
    <ModalShell
      title="Libreria elementi"
      ariaLabel="Libreria elementi custom"
      className="elementLibraryModal"
      onClose={onClose}
    >
      <ElementLibraryContent
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={onSelectCategory}
        query={query}
        onQueryChange={onQueryChange}
        items={items}
        onSelectItem={onSelectItem}
      />
    </ModalShell>
  )
}
