type ExportDockProps = {
  totalPages: number
  activeTemplateLabel: string
  onExport: () => void
}

export function ExportDock(props: ExportDockProps) {
  const { totalPages, activeTemplateLabel, onExport } = props

  return (
    <div className="exportDock" role="region" aria-label="Azioni notebook">
      <div className="themeTag themeTagInline" aria-label="Area output notebook">Output notebook</div>
      <div className="exportDockMeta">
        <span>Notebook: {totalPages} pagine</span>
        <span>Template corrente: {activeTemplateLabel}</span>
      </div>
      <button type="button" className="primaryButton exportDockButton" onClick={onExport}>
        Esporta PDF
      </button>
    </div>
  )
}
