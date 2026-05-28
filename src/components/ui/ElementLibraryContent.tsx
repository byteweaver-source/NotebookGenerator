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

type ElementLibraryContentProps = {
  categories: ElementLibraryCategoryNode[]
  selectedCategory: string
  onSelectCategory: (categoryId: string) => void
  query: string
  onQueryChange: (query: string) => void
  items: ElementLibraryItem[]
  onSelectItem: (itemId: string) => void
}

export function ElementLibraryContent(props: ElementLibraryContentProps) {
  const {
    categories,
    selectedCategory,
    onSelectCategory,
    query,
    onQueryChange,
    items,
    onSelectItem,
  } = props

  return (
    <div className="elementLibraryLayout">
      <aside className="elementLibraryTree" aria-label="Categorie elementi">
        {categories.map((node) => (
          <button
            key={node.id}
            type="button"
            className={`elementTreeNode ${node.id === selectedCategory ? 'isActive' : ''}`}
            onClick={() => onSelectCategory(node.id)}
          >
            {node.label}
          </button>
        ))}
      </aside>

      <div className="elementLibraryList" aria-label="Elementi disponibili">
        <label htmlFor="elementLibrarySearch" className="elementLibrarySearchLabel">
          Cerca elemento
        </label>
        <input
          id="elementLibrarySearch"
          className="elementLibrarySearch"
          type="search"
          placeholder="Cerca per nome o descrizione"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="elementLibraryItem"
            onClick={() => onSelectItem(item.id)}
          >
            <span className="elementLibraryIcon" aria-hidden="true">
              <i className={item.iconClass} />
            </span>
            <span className="elementLibraryText">
              <strong>{item.label}</strong>
              <span>{item.description}</span>
            </span>
          </button>
        ))}
        {items.length === 0 && (
          <p className="hint">
            Nessun elemento trovato per questa categoria e ricerca.
          </p>
        )}
      </div>
    </div>
  )
}
