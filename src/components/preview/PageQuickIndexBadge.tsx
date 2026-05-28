type PageQuickIndexBadgeProps = {
  currentPage: number
  totalPages: number
}

export function PageQuickIndexBadge(props: PageQuickIndexBadgeProps) {
  const { currentPage, totalPages } = props

  return (
    <div className="pageQuickIndex" aria-label="Pagina corrente">
      {currentPage}/{totalPages}
    </div>
  )
}
