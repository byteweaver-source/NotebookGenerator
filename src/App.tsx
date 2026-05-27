import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { PDFDocument, rgb } from 'pdf-lib'
import './App.css'
import type { MmRect, TemplateKey } from './templates/types'
import {
  isTemplateSelectable,
  selectableTemplateGroups,
  templateLabels,
} from './templates/config'
import { drawTemplateOnPdf } from './templates/pdf/drawTemplateOnPdf'

type PageSizeKey = 'A4' | 'A5'
type Orientation = 'portrait' | 'landscape'
type BindingKey = 'none' | 'ringLeft' | 'ringTop' | 'booklet'
type ElementKind = 'phone' | 'browser' | 'card' | 'form'
type TextAlignOption = 'left' | 'center' | 'right' | 'distributed'

type CustomElement = {
  id: string
  kind: ElementKind
  x: number
  y: number
  width: number
  height: number
  assetDataUrl?: string
  assetName?: string
}

type DragState = {
  id: string
  pointerOffsetX: number
  pointerOffsetY: number
}

type PlannedPage = {
  id: string
  template: TemplateKey
}

type HeaderFooterOptions = {
  text: string
  includePageNumber: boolean
  align: TextAlignOption
}

const MM_TO_PT = 2.8346456693

const pageSizes: Record<PageSizeKey, { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  A5: { width: 148, height: 210 },
}

const bindingLabels: Record<BindingKey, string> = {
  none: 'Nessuna',
  ringLeft: 'Raccoglitore ad anelli (sinistra)',
  ringTop: 'Raccoglitore ad anelli (alto)',
  booklet: 'Piegatura a libretto',
}

const elementIconLabels: Record<ElementKind, { short: string; title: string }> = {
  phone: { short: 'PH', title: 'Aggiungi telefono' },
  browser: { short: 'BR', title: 'Aggiungi browser frame' },
  card: { short: 'CD', title: 'Aggiungi card' },
  form: { short: 'FM', title: 'Aggiungi form' },
}

function mmToPt(mm: number): number {
  return mm * MM_TO_PT
}

function getPageDimensions(size: PageSizeKey, orientation: Orientation): {
  width: number
  height: number
} {
  const base = pageSizes[size]
  return orientation === 'portrait'
    ? { width: base.width, height: base.height }
    : { width: base.height, height: base.width }
}

function getMargins(
  binding: BindingKey,
  pageIndex: number,
  totalPages: number,
  duplexEnabled: boolean,
): { top: number; right: number; bottom: number; left: number } {
  const margin = { top: 10, right: 10, bottom: 10, left: 10 }
  const isBackSide = pageIndex % 2 === 1

  if (binding === 'ringLeft') {
    if (duplexEnabled && isBackSide) {
      margin.right += 10
    } else {
      margin.left += 10
    }
  }
  if (binding === 'ringTop') {
    margin.top += 10
  }

  if (duplexEnabled && binding !== 'ringTop' && binding !== 'booklet') {
    if (isBackSide) {
      margin.right += 6
    } else {
      margin.left += 6
    }
  }

  if (binding === 'booklet') {
    const isLeftPage = totalPages > 1 && pageIndex % 2 === 1
    if (isLeftPage) {
      margin.right += 8
    } else {
      margin.left += 8
    }
  }

  return margin
}

function getContentRect(
  pageWidth: number,
  pageHeight: number,
  margins: { top: number; right: number; bottom: number; left: number },
): MmRect {
  return {
    x: margins.left,
    y: margins.top,
    width: pageWidth - margins.left - margins.right,
    height: pageHeight - margins.top - margins.bottom,
  }
}

function elementPreset(kind: ElementKind): Pick<CustomElement, 'width' | 'height'> {
  if (kind === 'phone') {
    return { width: 48, height: 88 }
  }
  if (kind === 'browser') {
    return { width: 100, height: 70 }
  }
  if (kind === 'form') {
    return { width: 84, height: 72 }
  }
  return { width: 62, height: 44 }
}

async function svgDataUrlToPngBytes(options: {
  dataUrl: string
  widthMm: number
  heightMm: number
}): Promise<Uint8Array | null> {
  const { dataUrl, widthMm, heightMm } = options
  const pxPerMm = 6
  const widthPx = Math.max(32, Math.round(widthMm * pxPerMm))
  const heightPx = Math.max(32, Math.round(heightMm * pxPerMm))

  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = widthPx
      canvas.height = heightPx
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(null)
        return
      }
      ctx.clearRect(0, 0, widthPx, heightPx)
      ctx.drawImage(image, 0, 0, widthPx, heightPx)
      canvas.toBlob(async (blob) => {
        if (!blob) {
          resolve(null)
          return
        }
        const bytes = new Uint8Array(await blob.arrayBuffer())
        resolve(bytes)
      }, 'image/png')
    }
    image.onerror = () => resolve(null)
    image.src = dataUrl
  })
}

function clampElementToContent(element: CustomElement, content: MmRect): CustomElement {
  return {
    ...element,
    x: Math.min(Math.max(element.x, content.x), content.x + content.width - element.width),
    y: Math.min(Math.max(element.y, content.y), content.y + content.height - element.height),
  }
}

function drawBindingGuides(
  page: import('pdf-lib').PDFPage,
  binding: BindingKey,
  pageWidthMm: number,
  pageHeightMm: number,
  pageIndex: number,
  duplexEnabled: boolean,
) {
  const holeColor = rgb(0.7, 0.7, 0.74)
  const isBackSide = pageIndex % 2 === 1

  if (binding === 'ringLeft') {
    const holeX = duplexEnabled && isBackSide ? pageWidthMm - 6 : 6
    const holes = 6
    for (let i = 0; i < holes; i += 1) {
      const ratio = i / (holes - 1)
      const y = 20 + ratio * (pageHeightMm - 40)
      page.drawCircle({
        x: mmToPt(holeX),
        y: mmToPt(pageHeightMm - y),
        size: mmToPt(2),
        borderWidth: mmToPt(0.3),
        borderColor: holeColor,
      })
    }
  }

  if (binding === 'ringTop') {
    const holes = 6
    for (let i = 0; i < holes; i += 1) {
      const ratio = i / (holes - 1)
      const x = 20 + ratio * (pageWidthMm - 40)
      page.drawCircle({
        x: mmToPt(x),
        y: mmToPt(pageHeightMm - 6),
        size: mmToPt(2),
        borderWidth: mmToPt(0.3),
        borderColor: holeColor,
      })
    }
  }
}

async function drawCustomElementOnPdf(
  page: import('pdf-lib').PDFPage,
  element: CustomElement,
  pageHeightMm: number,
  pdf: PDFDocument,
  imageCache: Map<string, import('pdf-lib').PDFImage>,
) {
  const stroke = rgb(0.54, 0.57, 0.62)
  const light = rgb(0.93, 0.94, 0.96)
  const baseY = pageHeightMm - element.y - element.height

  if (element.assetDataUrl) {
    let embedded = imageCache.get(element.assetDataUrl)
    if (!embedded) {
      const pngBytes = await svgDataUrlToPngBytes({
        dataUrl: element.assetDataUrl,
        widthMm: element.width,
        heightMm: element.height,
      })
      if (pngBytes) {
        embedded = await pdf.embedPng(pngBytes)
        imageCache.set(element.assetDataUrl, embedded)
      }
    }

    if (embedded) {
      page.drawImage(embedded, {
        x: mmToPt(element.x),
        y: mmToPt(baseY),
        width: mmToPt(element.width),
        height: mmToPt(element.height),
      })
      page.drawRectangle({
        x: mmToPt(element.x),
        y: mmToPt(baseY),
        width: mmToPt(element.width),
        height: mmToPt(element.height),
        borderColor: stroke,
        borderWidth: mmToPt(0.25),
      })
      return
    }
  }

  page.drawRectangle({
    x: mmToPt(element.x),
    y: mmToPt(baseY),
    width: mmToPt(element.width),
    height: mmToPt(element.height),
    borderColor: stroke,
    borderWidth: mmToPt(0.45),
  })

  if (element.kind === 'browser') {
    page.drawRectangle({
      x: mmToPt(element.x),
      y: mmToPt(baseY + element.height - 8),
      width: mmToPt(element.width),
      height: mmToPt(8),
      color: light,
    })
  }

  if (element.kind === 'phone') {
    page.drawRectangle({
      x: mmToPt(element.x + 2),
      y: mmToPt(baseY + element.height - 8),
      width: mmToPt(element.width - 4),
      height: mmToPt(5),
      color: light,
    })
  }

  if (element.kind === 'card') {
    page.drawRectangle({
      x: mmToPt(element.x + 2),
      y: mmToPt(baseY + element.height - 12),
      width: mmToPt(element.width - 4),
      height: mmToPt(8),
      borderColor: stroke,
      borderWidth: mmToPt(0.3),
    })
  }

  if (element.kind === 'form') {
    for (let i = 0; i < 4; i += 1) {
      page.drawRectangle({
        x: mmToPt(element.x + 3),
        y: mmToPt(baseY + element.height - 14 - i * 12),
        width: mmToPt(element.width - 6),
        height: mmToPt(7),
        borderColor: stroke,
        borderWidth: mmToPt(0.3),
      })
    }
  }
}

function buildHeaderFooterText(
  text: string,
  pageNumber: number,
  totalPages: number,
): string {
  return text
    .replaceAll('{page}', String(pageNumber))
    .replaceAll('{total}', String(totalPages))
}

function drawAlignedTextOnPdf(options: {
  page: import('pdf-lib').PDFPage
  text: string
  pageNumberText: string
  align: TextAlignOption
  lineYmm: number
  leftXmm: number
  rightXmm: number
}) {
  const { page, text, pageNumberText, align, lineYmm, leftXmm, rightXmm } = options
  const fontSize = 8.5
  const color = rgb(0.35, 0.34, 0.31)
  const pageHeightMm = page.getSize().height / MM_TO_PT
  const midXmm = (leftXmm + rightXmm) / 2

  if (align === 'distributed' && text && pageNumberText) {
    page.drawText(text, {
      x: mmToPt(leftXmm),
      y: mmToPt(pageHeightMm - lineYmm),
      size: fontSize,
      color,
    })

    const pageNumberWidthPt = pageNumberText.length * fontSize * 0.5
    page.drawText(pageNumberText, {
      x: mmToPt(rightXmm) - pageNumberWidthPt,
      y: mmToPt(pageHeightMm - lineYmm),
      size: fontSize,
      color,
    })
    return
  }

  const finalText = [text, pageNumberText].filter(Boolean).join(' ').trim()
  if (!finalText) {
    return
  }

  const textWidthPt = finalText.length * fontSize * 0.5
  let xPt = mmToPt(leftXmm)

  if (align === 'center' || align === 'distributed') {
    xPt = mmToPt(midXmm) - textWidthPt / 2
  }
  if (align === 'right') {
    xPt = mmToPt(rightXmm) - textWidthPt
  }

  page.drawText(finalText, {
    x: xPt,
    y: mmToPt(pageHeightMm - lineYmm),
    size: fontSize,
    color,
  })
}

function drawHeaderFooterOnPdf(options: {
  page: import('pdf-lib').PDFPage
  margins: { top: number; right: number; bottom: number; left: number }
  pageNumber: number
  totalPages: number
  header: HeaderFooterOptions
  footer: HeaderFooterOptions
  pageWidthMm: number
  pageHeightMm: number
}) {
  const {
    page,
    margins,
    pageNumber,
    totalPages,
    header,
    footer,
    pageWidthMm,
    pageHeightMm,
  } = options

  const leftXmm = margins.left
  const rightXmm = pageWidthMm - margins.right
  const headerYmm = Math.max(4, margins.top * 0.5)
  const footerYmm = pageHeightMm - Math.max(4, margins.bottom * 0.5)

  const headerText = buildHeaderFooterText(header.text, pageNumber, totalPages)
  const footerText = buildHeaderFooterText(footer.text, pageNumber, totalPages)
  const pageNumberText = `${pageNumber}/${totalPages}`

  drawAlignedTextOnPdf({
    page,
    text: headerText,
    pageNumberText: header.includePageNumber ? pageNumberText : '',
    align: header.align,
    lineYmm: headerYmm,
    leftXmm,
    rightXmm,
  })

  drawAlignedTextOnPdf({
    page,
    text: footerText,
    pageNumberText: footer.includePageNumber ? pageNumberText : '',
    align: footer.align,
    lineYmm: footerYmm,
    leftXmm,
    rightXmm,
  })
}

async function exportPdf(options: {
  size: PageSizeKey
  orientation: Orientation
  template: TemplateKey
  binding: BindingKey
  pages: number
  customElementsByPage: Record<string, CustomElement[]>
  compositionTemplates: TemplateKey[] | null
  compositionPageIds: string[] | null
  duplexEnabled: boolean
  header: HeaderFooterOptions
  footer: HeaderFooterOptions
}) {
  const pdf = await PDFDocument.create()
  const imageCache = new Map<string, import('pdf-lib').PDFImage>()
  const plannedTemplates =
    options.compositionTemplates && options.compositionTemplates.length > 0
      ? options.compositionTemplates
      : Array.from({ length: Math.max(1, options.pages) }, () => options.template)
  const totalPages = plannedTemplates.length
  const dimensions = getPageDimensions(options.size, options.orientation)

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex += 1) {
    const currentTemplate = plannedTemplates[pageIndex]
    const pageKey =
      options.compositionPageIds && options.compositionPageIds[pageIndex]
        ? `comp-${options.compositionPageIds[pageIndex]}`
        : `page-${pageIndex + 1}`
    const currentCustomElements = options.customElementsByPage[pageKey] ?? []
    const page = pdf.addPage([mmToPt(dimensions.width), mmToPt(dimensions.height)])
    const margins = getMargins(options.binding, pageIndex, totalPages, options.duplexEnabled)
    const content = getContentRect(dimensions.width, dimensions.height, margins)

    drawTemplateOnPdf(page, currentTemplate, content)
    drawBindingGuides(
      page,
      options.binding,
      dimensions.width,
      dimensions.height,
      pageIndex,
      options.duplexEnabled,
    )

    const pageHeightMm = page.getSize().height / MM_TO_PT
    for (const element of currentCustomElements) {
      const safeElement = clampElementToContent(element, content)
      await drawCustomElementOnPdf(page, safeElement, pageHeightMm, pdf, imageCache)
    }

    drawHeaderFooterOnPdf({
      page,
      margins,
      pageNumber: pageIndex + 1,
      totalPages,
      header: options.header,
      footer: options.footer,
      pageWidthMm: dimensions.width,
      pageHeightMm: dimensions.height,
    })
  }

  const bytes = await pdf.save()
  const blob = new Blob([Uint8Array.from(bytes)], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const modeName = options.compositionTemplates ? 'mixed' : options.template
  a.download = `notebook-${options.size}-${modeName}-${options.binding}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

function screenPointToSvg(
  event: ReactPointerEvent<Element>,
  svg: SVGSVGElement,
): { x: number; y: number } | null {
  const ctm = svg.getScreenCTM()
  if (!ctm) {
    return null
  }

  const point = new DOMPoint(event.clientX, event.clientY)
  const local = point.matrixTransform(ctm.inverse())
  return { x: local.x, y: local.y }
}

function CustomElementShape(props: {
  element: CustomElement
  selected: boolean
  onPointerDown: (event: ReactPointerEvent<SVGGElement>) => void
}) {
  const { element, selected, onPointerDown } = props
  const stroke = selected ? '#1f6cb4' : '#7f8794'
  const strokeWidth = selected ? 0.8 : 0.5

  return (
    <g onPointerDown={onPointerDown} style={{ cursor: 'move' }}>
      <rect
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        fill="#fff"
        stroke={stroke}
        strokeWidth={strokeWidth}
        rx="2"
      />

      {element.assetDataUrl && (
        <image
          href={element.assetDataUrl}
          x={element.x + 0.8}
          y={element.y + 0.8}
          width={Math.max(0, element.width - 1.6)}
          height={Math.max(0, element.height - 1.6)}
          preserveAspectRatio="xMidYMid meet"
        />
      )}

      {!element.assetDataUrl && element.kind === 'browser' && (
        <>
          <rect x={element.x} y={element.y} width={element.width} height="8" fill="#eef0f3" />
          <circle cx={element.x + 4} cy={element.y + 4} r="1" fill="#a0a6b1" />
          <circle cx={element.x + 8} cy={element.y + 4} r="1" fill="#a0a6b1" />
        </>
      )}

      {!element.assetDataUrl && element.kind === 'phone' && (
        <>
          <rect x={element.x + 2} y={element.y + 2} width={element.width - 4} height="6" fill="#eef0f3" />
          <line
            x1={element.x + element.width / 2 - 3}
            y1={element.y + element.height - 3}
            x2={element.x + element.width / 2 + 3}
            y2={element.y + element.height - 3}
            stroke="#9aa2af"
            strokeWidth="0.4"
          />
        </>
      )}

      {!element.assetDataUrl && element.kind === 'card' && (
        <>
          <rect
            x={element.x + 3}
            y={element.y + 3}
            width={element.width - 6}
            height="10"
            fill="none"
            stroke="#a0a6b1"
            strokeWidth="0.4"
          />
          <line
            x1={element.x + 3}
            y1={element.y + 17}
            x2={element.x + element.width - 3}
            y2={element.y + 17}
            stroke="#a0a6b1"
            strokeWidth="0.4"
          />
        </>
      )}

      {!element.assetDataUrl && element.kind === 'form' &&
        [0, 1, 2, 3].map((i) => (
          <rect
            key={i}
            x={element.x + 3}
            y={element.y + 4 + i * 12}
            width={element.width - 6}
            height="7"
            fill="none"
            stroke="#a0a6b1"
            strokeWidth="0.4"
          />
        ))}
    </g>
  )
}

function App() {
  const [size, setSize] = useState<PageSizeKey>('A4')
  const [orientation, setOrientation] = useState<Orientation>('portrait')
  const [template, setTemplate] = useState<TemplateKey>('uiDesktop')
  const [binding, setBinding] = useState<BindingKey>('ringLeft')
  const [pages, setPages] = useState(8)
  const [duplexEnabled, setDuplexEnabled] = useState(false)
  const [compositionEnabled, setCompositionEnabled] = useState(false)
  const [compositionPages, setCompositionPages] = useState<PlannedPage[]>([])
  const [compositionTemplateToAdd, setCompositionTemplateToAdd] =
    useState<TemplateKey>('uiDesktop')
  const [previewPageNumber, setPreviewPageNumber] = useState(1)
  const [headerOptions, setHeaderOptions] = useState<HeaderFooterOptions>({
    text: '',
    includePageNumber: false,
    align: 'left',
  })
  const [footerOptions, setFooterOptions] = useState<HeaderFooterOptions>({
    text: '{page}',
    includePageNumber: false,
    align: 'right',
  })
  const [customElementsByPage, setCustomElementsByPage] = useState<Record<string, CustomElement[]>>({})
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dragState, setDragState] = useState<DragState | null>(null)

  const svgRef = useRef<SVGSVGElement | null>(null)
  const uploadSvgInputRef = useRef<HTMLInputElement | null>(null)

  const page = useMemo(() => getPageDimensions(size, orientation), [size, orientation])
  const totalPages = compositionEnabled
    ? Math.max(1, compositionPages.length)
    : Math.max(1, pages)
  const clampedPreviewPageNumber = Math.min(
    Math.max(previewPageNumber, 1),
    totalPages,
  )
  const previewPageIndex = clampedPreviewPageNumber - 1
  const previewTemplates =
    compositionEnabled && compositionPages.length > 0
      ? compositionPages.map((item) => item.template)
      : Array.from({ length: Math.max(1, pages) }, () => template)
  const selectedCompositionPage =
    compositionEnabled && compositionPages.length > 0
      ? compositionPages[previewPageIndex] ?? null
      : null
  const currentPageKey = selectedCompositionPage
    ? `comp-${selectedCompositionPage.id}`
    : `page-${previewPageIndex + 1}`
  const currentCustomElements = customElementsByPage[currentPageKey] ?? []
  const thumbnailGroups = duplexEnabled
    ? Array.from({ length: Math.ceil(previewTemplates.length / 2) }, (_, groupIndex) => {
        const start = groupIndex * 2
        return previewTemplates
          .slice(start, start + 2)
          .map((groupTemplate, itemIndex) => ({
            template: groupTemplate,
            pageIndex: start + itemIndex,
            side: itemIndex === 0 ? 'FR' : 'RE',
          }))
      })
    : previewTemplates.map((groupTemplate, pageIndex) => [
        { template: groupTemplate, pageIndex, side: 'PAG' },
      ])
  const activeTemplate =
    compositionEnabled && compositionPages.length > 0
      ? compositionPages[previewPageIndex]?.template ?? template
      : template

  const previewMargins = useMemo(
    () => getMargins(binding, previewPageIndex, totalPages, duplexEnabled),
    [binding, duplexEnabled, previewPageIndex, totalPages],
  )
  const previewContent = useMemo(
    () => getContentRect(page.width, page.height, previewMargins),
    [page.height, page.width, previewMargins],
  )

  const maxPreviewWidth = 700
  const previewScale = Math.min(maxPreviewWidth / page.width, 1)
  const previewWidth = page.width * previewScale
  const previewHeight = page.height * previewScale

  function toggleComposition() {
    setCompositionEnabled((prev) => {
      const next = !prev
      if (next && compositionPages.length === 0) {
        setCompositionPages([{ id: crypto.randomUUID(), template }])
        setPreviewPageNumber(1)
      }
      return next
    })
  }

  function addCompositionPage() {
    setCompositionPages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), template: compositionTemplateToAdd },
    ])
    setPreviewPageNumber((prev) => prev + 1)
  }

  function updateCurrentCompositionTemplate(nextTemplate: TemplateKey) {
    if (!selectedCompositionPage) {
      return
    }
    setCompositionPages((prev) =>
      prev.map((item) =>
        item.id === selectedCompositionPage.id
          ? { ...item, template: nextTemplate }
          : item,
      ),
    )
  }

  function removeCurrentCompositionPage() {
    if (!selectedCompositionPage || compositionPages.length <= 1) {
      return
    }
    setCompositionPages((prev) =>
      prev.filter((item) => item.id !== selectedCompositionPage.id),
    )
    setPreviewPageNumber((prev) => Math.max(1, prev - 1))
  }

  function moveCurrentCompositionPage(direction: -1 | 1) {
    if (!selectedCompositionPage) {
      return
    }
    setCompositionPages((prev) => {
      const currentIndex = prev.findIndex(
        (item) => item.id === selectedCompositionPage.id,
      )
      const nextIndex = currentIndex + direction
      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= prev.length) {
        return prev
      }
      const next = [...prev]
      const temp = next[currentIndex]
      next[currentIndex] = next[nextIndex]
      next[nextIndex] = temp
      setPreviewPageNumber(nextIndex + 1)
      return next
    })
  }

  function duplicateCurrentCompositionPage() {
    if (!selectedCompositionPage) {
      return
    }
    setCompositionPages((prev) => {
      const currentIndex = prev.findIndex(
        (item) => item.id === selectedCompositionPage.id,
      )
      if (currentIndex < 0) {
        return prev
      }
      const clone: PlannedPage = {
        id: crypto.randomUUID(),
        template: selectedCompositionPage.template,
      }
      const next = [...prev]
      next.splice(currentIndex + 1, 0, clone)
      setPreviewPageNumber(currentIndex + 2)
      return next
    })
  }

  function addElement(kind: ElementKind) {
    const preset = elementPreset(kind)
    const next: CustomElement = {
      id: crypto.randomUUID(),
      kind,
      width: preset.width,
      height: preset.height,
      x: previewContent.x + (previewContent.width - preset.width) / 2 + currentCustomElements.length * 2,
      y: previewContent.y + (previewContent.height - preset.height) / 2 + currentCustomElements.length * 2,
    }
    const safe = clampElementToContent(next, previewContent)
    setCustomElementsByPage((prev) => ({
      ...prev,
      [currentPageKey]: [...(prev[currentPageKey] ?? []), safe],
    }))
    setSelectedId(safe.id)
  }

  function addSvgElement(dataUrl: string, fileName: string) {
    const preset = { width: 76, height: 52 }
    const next: CustomElement = {
      id: crypto.randomUUID(),
      kind: 'card',
      width: preset.width,
      height: preset.height,
      x: previewContent.x + (previewContent.width - preset.width) / 2 + currentCustomElements.length * 2,
      y: previewContent.y + (previewContent.height - preset.height) / 2 + currentCustomElements.length * 2,
      assetDataUrl: dataUrl,
      assetName: fileName,
    }
    const safe = clampElementToContent(next, previewContent)
    setCustomElementsByPage((prev) => ({
      ...prev,
      [currentPageKey]: [...(prev[currentPageKey] ?? []), safe],
    }))
    setSelectedId(safe.id)
  }

  function handleSvgUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }
    const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')
    if (!isSvg) {
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : ''
      if (!dataUrl) {
        return
      }
      addSvgElement(dataUrl, file.name)
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  function removeSelected() {
    if (!selectedId) {
      return
    }
    setCustomElementsByPage((prev) => ({
      ...prev,
      [currentPageKey]: (prev[currentPageKey] ?? []).filter(
        (item) => item.id !== selectedId,
      ),
    }))
    setSelectedId(null)
  }

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (!dragState || !svgRef.current) {
      return
    }

    const point = screenPointToSvg(event, svgRef.current)
    if (!point) {
      return
    }

    setCustomElementsByPage((prev) => {
      const current = prev[currentPageKey] ?? []
      return {
        ...prev,
        [currentPageKey]: current.map((item) => {
        if (item.id !== dragState.id) {
          return item
        }

        return clampElementToContent(
          {
            ...item,
            x: point.x - dragState.pointerOffsetX,
            y: point.y - dragState.pointerOffsetY,
          },
          previewContent,
        )
      }),
      }
    })
  }

  function handlePointerUp() {
    if (dragState) {
      setDragState(null)
    }
  }

  const canDragElements = activeTemplate === 'uiDesktop' || activeTemplate === 'uiMobile'
    || activeTemplate === 'blank'

  useEffect(() => {
    setSelectedId(null)
    setDragState(null)
  }, [currentPageKey])

  useEffect(() => {
    if (compositionEnabled && compositionPages.length === 0) {
      setCompositionPages([{ id: crypto.randomUUID(), template }])
      setPreviewPageNumber(1)
    }
  }, [compositionEnabled, compositionPages.length, template])
  const previewHeaderText = buildHeaderFooterText(
    headerOptions.text,
    clampedPreviewPageNumber,
    totalPages,
  )
  const previewFooterText = buildHeaderFooterText(
    footerOptions.text,
    clampedPreviewPageNumber,
    totalPages,
  )

  const renderTemplateOptions = (currentValue: TemplateKey) => {
    const isHiddenCurrent = !isTemplateSelectable(currentValue)

    return (
      <>
        {isHiddenCurrent && (
          <option value={currentValue}>
            {templateLabels[currentValue]} (temporaneamente nascosto)
          </option>
        )}
        {selectableTemplateGroups.map((group) => (
          <optgroup key={group.id} label={group.label}>
            {group.templates.map((templateKey) => (
              <option key={templateKey} value={templateKey}>
                {templateLabels[templateKey]}
              </option>
            ))}
          </optgroup>
        ))}
      </>
    )
  }

  const previewPageNumberText = `${clampedPreviewPageNumber}/${totalPages}`

  function renderPreviewHeaderFooterLine(options: {
    text: string
    includePageNumber: boolean
    align: TextAlignOption
    y: number
    keyBase: string
  }) {
    const { text, includePageNumber, align, y, keyBase } = options
    const leftX = previewMargins.left
    const rightX = page.width - previewMargins.right
    const centerX = (leftX + rightX) / 2
    const pageNumberText = includePageNumber ? previewPageNumberText : ''

    if (align === 'distributed' && text && pageNumberText) {
      return (
        <g key={`${keyBase}-distributed`}>
          <text x={leftX} y={y} fontSize="3" fill="#6b6353">
            {text}
          </text>
          <text x={rightX} y={y} fontSize="3" fill="#6b6353" textAnchor="end">
            {pageNumberText}
          </text>
        </g>
      )
    }

    const finalText = [text, pageNumberText].filter(Boolean).join(' ').trim()
    if (!finalText) {
      return null
    }

    const anchor =
      align === 'right' ? 'end' : align === 'center' || align === 'distributed' ? 'middle' : 'start'
    const x = align === 'right' ? rightX : align === 'center' || align === 'distributed' ? centerX : leftX

    return (
      <text key={`${keyBase}-single`} x={x} y={y} fontSize="3" fill="#6b6353" textAnchor={anchor}>
        {finalText}
      </text>
    )
  }

  return (
    <main className="layout">
      <aside className="panel">
        <h1>PageForge</h1>
        <p>
          Generatore di pagine stampabili con template tecnici, mockup UI e
          rilegature per stampa.
        </p>

        <div className="group">
          <label htmlFor="size">Formato</label>
          <select
            id="size"
            value={size}
            onChange={(event) => setSize(event.target.value as PageSizeKey)}
          >
            {Object.keys(pageSizes).map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </div>

        <div className="group">
          <label htmlFor="orientation">Orientamento</label>
          <select
            id="orientation"
            value={orientation}
            onChange={(event) => setOrientation(event.target.value as Orientation)}
          >
            <option value="portrait">Verticale</option>
            <option value="landscape">Orizzontale</option>
          </select>
        </div>

        <div className="group">
          <label htmlFor="binding">Rilegatura</label>
          <select
            id="binding"
            value={binding}
            onChange={(event) => setBinding(event.target.value as BindingKey)}
          >
            {Object.entries(bindingLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {!compositionEnabled && (
          <div className="group groupedBox">
            <label className="groupTitle">Impostazioni Generali Pagine</label>
            <label htmlFor="template">Template generale</label>
            <select
              id="template"
              value={template}
              onChange={(event) => setTemplate(event.target.value as TemplateKey)}
            >
              {renderTemplateOptions(template)}
            </select>

            <label htmlFor="pages">Numero pagine PDF</label>
            <input
              id="pages"
              type="number"
              min={1}
              max={300}
              value={pages}
              onChange={(event) => setPages(Number(event.target.value) || 1)}
            />
          </div>
        )}

        <div className="group">
          <label className="checkboxRow">
            <input
              type="checkbox"
              checked={duplexEnabled}
              onChange={(event) => setDuplexEnabled(event.target.checked)}
            />
            Stampa fronte-retro (duplex)
          </label>
          {duplexEnabled && (
            <p className="hint">Margini e fori vengono specchiati tra fronte e retro.</p>
          )}
        </div>

        <div className="group">
          <label className="checkboxRow">
            <input
              type="checkbox"
              checked={compositionEnabled}
              onChange={toggleComposition}
            />
            Composizione quaderno con pagine diverse
          </label>
        </div>

        {compositionEnabled && (
          <div className="group">
            <label>Aggiungi nuova pagina</label>

            <div className="rowControls">
              <select
                value={compositionTemplateToAdd}
                onChange={(event) =>
                  setCompositionTemplateToAdd(event.target.value as TemplateKey)
                }
              >
                {renderTemplateOptions(compositionTemplateToAdd)}
              </select>
              <button type="button" className="smallButton" onClick={addCompositionPage}>
                Aggiungi pagina
              </button>
            </div>
            <p className="hint">Usa la barra miniature sotto per selezionare la pagina.</p>
          </div>
        )}

        {compositionEnabled && (
          <div className="group">
            <p className="hint">Template generale e numero pagine sono nascosti in composizione custom.</p>
          </div>
        )}

        <div className="group groupedBox">
          <label className="groupTitle">Header / Footer</label>

          <label htmlFor="headerText">Header testo</label>
          <input
            id="headerText"
            type="text"
            value={headerOptions.text}
            onChange={(event) =>
              setHeaderOptions((prev) => ({ ...prev, text: event.target.value }))
            }
            placeholder="Titolo, {page}, {total}"
          />

          <label className="checkboxRow">
            <input
              type="checkbox"
              checked={headerOptions.includePageNumber}
              onChange={(event) =>
                setHeaderOptions((prev) => ({ ...prev, includePageNumber: event.target.checked }))
              }
            />
            Header: includi numero pagina
          </label>

          <label htmlFor="headerAlign">Header allineamento</label>
          <select
            id="headerAlign"
            value={headerOptions.align}
            onChange={(event) =>
              setHeaderOptions((prev) => ({ ...prev, align: event.target.value as TextAlignOption }))
            }
          >
            <option value="left">Sinistra</option>
            <option value="center">Centrato</option>
            <option value="right">Destra</option>
            <option value="distributed">Distribuito</option>
          </select>

          <label htmlFor="footerText">Footer testo</label>
          <input
            id="footerText"
            type="text"
            value={footerOptions.text}
            onChange={(event) =>
              setFooterOptions((prev) => ({ ...prev, text: event.target.value }))
            }
            placeholder="Titolo, {page}, {total}"
          />

          <label className="checkboxRow">
            <input
              type="checkbox"
              checked={footerOptions.includePageNumber}
              onChange={(event) =>
                setFooterOptions((prev) => ({ ...prev, includePageNumber: event.target.checked }))
              }
            />
            Footer: includi numero pagina
          </label>

          <label htmlFor="footerAlign">Footer allineamento</label>
          <select
            id="footerAlign"
            value={footerOptions.align}
            onChange={(event) =>
              setFooterOptions((prev) => ({ ...prev, align: event.target.value as TextAlignOption }))
            }
          >
            <option value="left">Sinistra</option>
            <option value="center">Centrato</option>
            <option value="right">Destra</option>
            <option value="distributed">Distribuito</option>
          </select>
        </div>

        <button
          type="button"
          className="primaryButton"
          onClick={() =>
            exportPdf({
              size,
              orientation,
              template,
              binding,
              pages,
              customElementsByPage,
              compositionTemplates: compositionEnabled
                ? compositionPages.map((item) => item.template)
                : null,
              compositionPageIds: compositionEnabled
                ? compositionPages.map((item) => item.id)
                : null,
              duplexEnabled,
              header: headerOptions,
              footer: footerOptions,
            })
          }
        >
          Esporta PDF
        </button>

        <p className="hint">
          Area utile: {Math.round(previewContent.width)} x {Math.round(previewContent.height)} mm
        </p>
        <p className="hint">Totale pagine export: {totalPages}</p>
        <p className="hint hintReserved">
          {canDragElements
            ? 'Elementi custom UI attivi per questa pagina.'
            : 'Per usare elementi custom scegli un template UI o Blank.'}
        </p>
      </aside>

      <section className="previewWrap" aria-label="Anteprima pagina">
        <div className="previewTopToolbar">
          <span className="selectedPageLabel">
            Pagina corrente {previewPageIndex + 1} / {totalPages}
          </span>

          {compositionEnabled && selectedCompositionPage ? (
            <select
              value={selectedCompositionPage.template}
              onChange={(event) =>
                updateCurrentCompositionTemplate(event.target.value as TemplateKey)
              }
            >
              {renderTemplateOptions(selectedCompositionPage.template)}
            </select>
          ) : (
            <select
              value={template}
              onChange={(event) => setTemplate(event.target.value as TemplateKey)}
              disabled={compositionEnabled}
            >
              {renderTemplateOptions(template)}
            </select>
          )}

          {compositionEnabled && selectedCompositionPage && (
            <div className="topActions">
              <button
                type="button"
                className="smallButton"
                onClick={() => moveCurrentCompositionPage(-1)}
                disabled={previewPageIndex === 0}
              >
                Su
              </button>
              <button
                type="button"
                className="smallButton"
                onClick={() => moveCurrentCompositionPage(1)}
                disabled={previewPageIndex === totalPages - 1}
              >
                Giu
              </button>
              <button
                type="button"
                className="smallButton"
                onClick={duplicateCurrentCompositionPage}
              >
                Duplica
              </button>
              <button
                type="button"
                className="smallButton danger"
                onClick={removeCurrentCompositionPage}
                disabled={compositionPages.length <= 1}
              >
                Elimina
              </button>
            </div>
          )}

          <div className="iconToolbar" aria-label="Inserimento elementi custom UI">
            {(Object.keys(elementIconLabels) as ElementKind[]).map((kind) => (
              <button
                key={kind}
                type="button"
                className="iconToolButton"
                title={elementIconLabels[kind].title}
                onClick={() => addElement(kind)}
                disabled={!canDragElements}
              >
                <span className="iconShort">{elementIconLabels[kind].short}</span>
              </button>
            ))}
              <button
                type="button"
                className="iconToolButton"
                title="Carica elemento SVG"
                onClick={() => uploadSvgInputRef.current?.click()}
                disabled={!canDragElements}
              >
                <span className="iconShort">SVG</span>
              </button>
            <button
              type="button"
              className="iconToolButton danger"
              title="Elimina selezionato"
              onClick={removeSelected}
              disabled={!selectedId}
            >
              <span className="iconShort">DEL</span>
            </button>
          </div>
        </div>

        <input
          ref={uploadSvgInputRef}
          className="hiddenFileInput"
          type="file"
          accept=".svg,image/svg+xml"
          onChange={handleSvgUpload}
        />

        <svg
          ref={svgRef}
          className="preview"
          viewBox={`0 0 ${page.width} ${page.height}`}
          width={previewWidth}
          height={previewHeight}
          role="img"
          aria-label="Anteprima del template"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <defs>
            <pattern id="p-dots" width="5" height="5" patternUnits="userSpaceOnUse">
              <circle cx="2.5" cy="2.5" r="0.45" fill="#b9bdc4" />
            </pattern>
            <pattern id="p-lines" width="7" height="7" patternUnits="userSpaceOnUse">
              <path d="M 0 0 L 7 0" stroke="#c7cbd2" strokeWidth="0.25" />
            </pattern>
            <pattern id="p-grid" width="5" height="5" patternUnits="userSpaceOnUse">
              <path d="M 0 0 L 5 0 M 0 0 L 0 5" stroke="#c7cbd2" strokeWidth="0.2" />
            </pattern>
            <pattern id="p-iso" width="16" height="13.86" patternUnits="userSpaceOnUse">
              <path d="M 0 13.86 L 8 0 L 16 13.86" fill="none" stroke="#c7cbd2" strokeWidth="0.2" />
              <path d="M 0 4.62 L 16 4.62" fill="none" stroke="#c7cbd2" strokeWidth="0.2" />
            </pattern>
          </defs>

          <rect x="0" y="0" width={page.width} height={page.height} fill="#fefdf8" />
          <rect
            x={previewContent.x}
            y={previewContent.y}
            width={previewContent.width}
            height={previewContent.height}
            fill={
              activeTemplate === 'blank'
                ? '#ffffff'
                : activeTemplate === 'dots'
                ? 'url(#p-dots)'
                : activeTemplate === 'lines'
                  ? 'url(#p-lines)'
                  : activeTemplate === 'grid'
                    ? 'url(#p-grid)'
                    : activeTemplate === 'isometric'
                      ? 'url(#p-iso)'
                      : '#ffffff'
            }
          />

          {activeTemplate === 'fashionGrid9' && (
            <g stroke="#c4c9d1" fill="none">
              {(() => {
                const top = previewContent.y + 6
                const bottom = previewContent.y + previewContent.height - 6
                const step = (bottom - top) / 9
                const centerX = previewContent.x + previewContent.width / 2
                return (
                  <>
                    {Array.from({ length: 10 }, (_, i) => {
                      const y = top + i * step
                      return (
                        <line
                          key={`g9-${i}`}
                          x1={previewContent.x}
                          y1={y}
                          x2={previewContent.x + previewContent.width}
                          y2={y}
                          strokeWidth={i === 0 || i === 9 ? 0.35 : 0.2}
                          stroke={i === 0 || i === 9 ? '#8a909c' : '#c4c9d1'}
                        />
                      )
                    })}
                    <line x1={centerX} y1={top} x2={centerX} y2={bottom} strokeWidth="0.25" />
                  </>
                )
              })()}
            </g>
          )}

          {(activeTemplate === 'fashionMale' ||
            activeTemplate === 'fashionMaleBack' ||
            activeTemplate === 'fashionFemale' ||
            activeTemplate === 'fashionFemaleBack' ||
            activeTemplate === 'fashionChildUnisex') && (
            <g stroke="#8a909c" fill="none">
              {(() => {
                const cx = previewContent.x + previewContent.width / 2
                const topY = previewContent.y + 10
                const ankleY = previewContent.y + previewContent.height - 8
                const isMale = activeTemplate === 'fashionMale' || activeTemplate === 'fashionMaleBack'
                const isBack = activeTemplate === 'fashionMaleBack' || activeTemplate === 'fashionFemaleBack'
                const isChild = activeTemplate === 'fashionChildUnisex'
                const headRadius = isChild ? 4.8 : 4.1
                const shoulderHalf = isChild ? 9 : isMale ? 11.5 : 10.1
                const waistHalf = isChild ? 7.2 : isMale ? 8.2 : 6.7
                const hipHalf = isChild ? 8 : isMale ? 7.3 : 8.7
                const torsoTop = topY + headRadius * 2 + 1
                const waistY = torsoTop + (isChild ? 16 : 19)
                const hipY = waistY + (isChild ? 8 : 10)
                const kneeY = hipY + (ankleY - hipY) * 0.5
                const armDrop = isChild ? 19 : 24
                const armSpread = isBack ? 8 : 6
                const kneeOffset = isBack ? 2.5 : 1.7
                return (
                  <>
                    <circle cx={cx} cy={topY} r={headRadius} strokeWidth="0.45" />
                    <line x1={cx} y1={topY + headRadius} x2={cx} y2={ankleY} stroke="#c4c9d1" strokeWidth="0.25" />
                    <line x1={cx - shoulderHalf} y1={torsoTop} x2={cx + shoulderHalf} y2={torsoTop} strokeWidth="0.35" />
                    <line x1={cx - shoulderHalf} y1={torsoTop} x2={cx - waistHalf} y2={waistY} strokeWidth="0.35" />
                    <line x1={cx + shoulderHalf} y1={torsoTop} x2={cx + waistHalf} y2={waistY} strokeWidth="0.35" />
                    <line x1={cx - waistHalf} y1={waistY} x2={cx - hipHalf} y2={hipY} strokeWidth="0.35" />
                    <line x1={cx + waistHalf} y1={waistY} x2={cx + hipHalf} y2={hipY} strokeWidth="0.35" />
                    <line x1={cx - shoulderHalf} y1={torsoTop + 1} x2={cx - (shoulderHalf + armSpread)} y2={torsoTop + armDrop} stroke="#c4c9d1" strokeWidth="0.28" />
                    <line x1={cx + shoulderHalf} y1={torsoTop + 1} x2={cx + (shoulderHalf + armSpread)} y2={torsoTop + armDrop} stroke="#c4c9d1" strokeWidth="0.28" />
                    <line x1={cx - hipHalf + 0.8} y1={hipY} x2={cx - kneeOffset} y2={kneeY} strokeWidth="0.35" />
                    <line x1={cx - kneeOffset} y1={kneeY} x2={cx - 0.8} y2={ankleY} strokeWidth="0.35" />
                    <line x1={cx + hipHalf - 0.8} y1={hipY} x2={cx + kneeOffset} y2={kneeY} strokeWidth="0.35" />
                    <line x1={cx + kneeOffset} y1={kneeY} x2={cx + 0.8} y2={ankleY} strokeWidth="0.35" />
                  </>
                )
              })()}
            </g>
          )}

          {activeTemplate === 'dialoghi' && (
            <g stroke="#8c919c" fill="#f7f9fc" strokeWidth="0.45">
              {(() => {
                const gap = 8
                const sidePadding = 6
                const topPadding = 8
                const bottomPadding = 8
                const availableHeight =
                  previewContent.height - topPadding - bottomPadding - gap
                const blockHeight = availableHeight / 2
                const blockWidth = previewContent.width - sidePadding * 2
                const topY = previewContent.y + topPadding
                const bottomY = topY + blockHeight + gap

                return (
                  <>
                    <rect
                      x={previewContent.x + sidePadding}
                      y={topY}
                      width={blockWidth}
                      height={blockHeight}
                      rx="2"
                    />
                    <rect
                      x={previewContent.x + sidePadding}
                      y={bottomY}
                      width={blockWidth}
                      height={blockHeight}
                      rx="2"
                    />
                  </>
                )
              })()}
            </g>
          )}

          {(activeTemplate === 'uiMobile' || activeTemplate === 'uiDesktop') && (
            <g stroke="#8c919c" fill="none" strokeWidth="0.4">
              {activeTemplate === 'uiMobile' ? (
                <>
                  <rect
                    x={previewContent.x + previewContent.width * 0.2}
                    y={previewContent.y + 8}
                    width={previewContent.width * 0.6}
                    height={previewContent.height - 16}
                    rx="3"
                  />
                  <rect
                    x={previewContent.x + previewContent.width * 0.2 + 4}
                    y={previewContent.y + 12}
                    width={previewContent.width * 0.6 - 8}
                    height="10"
                    fill="#eef0f3"
                  />
                  {[0, 1, 2, 3].map((i) => (
                    <rect
                      key={i}
                      x={previewContent.x + previewContent.width * 0.2 + 4}
                      y={previewContent.y + 30 + i * 24}
                      width={previewContent.width * 0.6 - 8}
                      height="18"
                    />
                  ))}
                </>
              ) : (
                <>
                  <rect
                    x={previewContent.x + 4}
                    y={previewContent.y + 6}
                    width={previewContent.width - 8}
                    height={previewContent.height - 12}
                    rx="2"
                  />
                  <rect
                    x={previewContent.x + 4}
                    y={previewContent.y + 6}
                    width={previewContent.width - 8}
                    height="10"
                    fill="#eef0f3"
                  />
                  <rect
                    x={previewContent.x + 10}
                    y={previewContent.y + 18}
                    width={previewContent.width - 20}
                    height="26"
                  />
                  <rect
                    x={previewContent.x + 10}
                    y={previewContent.y + 50}
                    width={(previewContent.width - 26) / 2}
                    height="32"
                  />
                  <rect
                    x={previewContent.x + 16 + (previewContent.width - 26) / 2}
                    y={previewContent.y + 50}
                    width={(previewContent.width - 26) / 2}
                    height="32"
                  />
                </>
              )}
            </g>
          )}

          <g>
            {renderPreviewHeaderFooterLine({
              text: previewHeaderText,
              includePageNumber: headerOptions.includePageNumber,
              align: headerOptions.align,
              y: Math.max(4, previewMargins.top * 0.55),
              keyBase: 'header',
            })}
            {renderPreviewHeaderFooterLine({
              text: previewFooterText,
              includePageNumber: footerOptions.includePageNumber,
              align: footerOptions.align,
              y: page.height - Math.max(4, previewMargins.bottom * 0.35),
              keyBase: 'footer',
            })}
          </g>

          <g>
            {currentCustomElements.map((element) => (
              <CustomElementShape
                key={element.id}
                element={element}
                selected={selectedId === element.id}
                onPointerDown={(event) => {
                  if (!canDragElements || !svgRef.current) {
                    return
                  }
                  event.preventDefault()
                  event.stopPropagation()

                  const point = screenPointToSvg(event, svgRef.current)
                  if (!point) {
                    return
                  }

                  setSelectedId(element.id)
                  setDragState({
                    id: element.id,
                    pointerOffsetX: point.x - element.x,
                    pointerOffsetY: point.y - element.y,
                  })
                }}
              />
            ))}
          </g>

          {binding === 'ringLeft' && (
            <g fill="none" stroke="#9ea3ad" strokeWidth="0.25">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <circle key={i} cx="6" cy={20 + (i * (page.height - 40)) / 5} r="2" />
              ))}
            </g>
          )}

          {binding === 'ringTop' && (
            <g fill="none" stroke="#9ea3ad" strokeWidth="0.25">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <circle key={i} cy="6" cx={20 + (i * (page.width - 40)) / 5} r="2" />
              ))}
            </g>
          )}

          <rect
            x={previewContent.x}
            y={previewContent.y}
            width={previewContent.width}
            height={previewContent.height}
            fill="none"
            stroke="#8d93a0"
            strokeWidth="0.25"
            strokeDasharray="2 2"
          />
        </svg>

        {totalPages > 1 && (
          <div className="thumbnailBar" aria-label="Miniature pagine">
            {thumbnailGroups.map((group, groupIndex) => (
              <div
                key={`group-${groupIndex}`}
                className={`spreadGroup ${duplexEnabled ? 'duplex' : ''}`}
              >
                {duplexEnabled && (
                  <span className="spreadLabel">F/R {groupIndex + 1}</span>
                )}
                <div className="spreadPages">
                  {group.map((item) => (
                    <button
                      key={`${item.template}-${item.pageIndex}`}
                      type="button"
                      className={`thumbnail ${item.pageIndex === previewPageIndex ? 'isActive' : ''}`}
                      onClick={() => setPreviewPageNumber(item.pageIndex + 1)}
                    >
                      <span className={`thumbPreview thumb-${item.template}`}>
                        {item.template === 'blank' && (
                          <span className="thumbUi">BLANK</span>
                        )}
                        {item.template === 'fashionMale' && (
                          <span className="thumbUi">MAN F</span>
                        )}
                        {item.template === 'fashionMaleBack' && (
                          <span className="thumbUi">MAN B</span>
                        )}
                        {item.template === 'fashionFemale' && (
                          <span className="thumbUi">WOM F</span>
                        )}
                        {item.template === 'fashionFemaleBack' && (
                          <span className="thumbUi">WOM B</span>
                        )}
                        {item.template === 'fashionChildUnisex' && (
                          <span className="thumbUi">KID</span>
                        )}
                        {item.template === 'fashionGrid9' && (
                          <span className="thumbUi">9H</span>
                        )}
                        {item.template === 'dialoghi' && (
                          <span className="thumbUi">DIA</span>
                        )}
                        {item.template === 'uiMobile' && (
                          <>
                            <span className="thumbMobileFrame" />
                            <span className="thumbMobileTop" />
                            <span className="thumbUi">MOBILE</span>
                          </>
                        )}
                        {item.template === 'uiDesktop' && (
                          <>
                            <span className="thumbDesktopFrame" />
                            <span className="thumbDesktopTop" />
                            <span className="thumbDesktopBlocks" />
                            <span className="thumbUi">DESKTOP</span>
                          </>
                        )}
                      </span>
                      <span className="thumbMeta">
                        Pag {item.pageIndex + 1}
                        {duplexEnabled ? ` ${item.side}` : ''}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

export default App