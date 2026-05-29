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
import { roundedRectPath } from './templates/pdf/utils'
import { drawTemplateOnPdf } from './templates/pdf/drawTemplateOnPdf'
import { PageQuickActionsRail } from './components/preview/PageQuickActionsRail'
import { PageQuickIndexBadge } from './components/preview/PageQuickIndexBadge'
import { CustomElementShape } from './components/preview/CustomElementShape'
import { TemplatePreviewContent } from './components/preview/TemplatePreviewContent'
import { GroupCard } from './components/ui/GroupCard'
import { ToolbarCard } from './components/ui/ToolbarCard'
import { ExportDock } from './components/ui/ExportDock'
import { CustomDropdown, type DropdownSection } from './components/ui/CustomDropdown'
import { ParametricDialogModal } from './components/modals/ParametricDialogModal'
import { ElementLibraryModal } from './components/modals/ElementLibraryModal'

type PageSizeKey = 'A4' | 'A5'
type Orientation = 'portrait' | 'landscape'
type BindingKey = 'none' | 'ringLeft' | 'ringTop' | 'booklet'
type ElementKind = 'phone' | 'browser' | 'card' | 'form'
type TextAlignOption = 'left' | 'center' | 'right' | 'distributed'
type ElementLibraryCategory = 'all' | 'device' | 'layout' | 'content' | 'assets'

type CustomElement = {
  id: string
  kind: ElementKind
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  assetDataUrl?: string
  assetName?: string
}

type DragState = {
  id: string
  pointerOffsetX: number
  pointerOffsetY: number
}

type ResizeState = {
  id: string
  startPointerX: number
  startPointerY: number
  startWidth: number
  startHeight: number
}

type RotationState = {
  id: string
  centerX: number
  centerY: number
  startRotation: number
  startPointerAngle: number
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

type NotebookProjectV1 = {
  version: 1
  size: PageSizeKey
  orientation: Orientation
  binding: BindingKey
  duplexEnabled: boolean
  compositionPages: PlannedPage[]
  previewPageNumber: number
  headerOptions: HeaderFooterOptions
  footerOptions: HeaderFooterOptions
  dialoghiParametricActorCount: number
  dialoghiParametricActorColors: string[]
  customElementsByPage: Record<string, CustomElement[]>
}

const MM_TO_PT = 2.8346456693
const NOTEBOOK_PROJECT_JSON_VERSION = 1
const MIN_CUSTOM_ELEMENT_SIZE = 18

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

const elementLibraryTree: Array<{ id: ElementLibraryCategory; label: string }> = [
  { id: 'all', label: 'Tutti' },
  { id: 'device', label: 'Dispositivi' },
  { id: 'layout', label: 'Layout' },
  { id: 'content', label: 'Contenuto' },
  { id: 'assets', label: 'Asset' },
]

const elementLibraryItems: Array<
  {
    id: string
    category: ElementLibraryCategory
    label: string
    description: string
    iconClass: string
  } & (
    | { action: 'preset'; kind: ElementKind }
    | { action: 'uploadSvg' }
  )
> = [
  {
    id: 'phone',
    category: 'device',
    action: 'preset',
    kind: 'phone',
    label: 'Telefono',
    description: 'Wireframe mobile verticale',
    iconClass: 'fa-solid fa-mobile-screen-button',
  },
  {
    id: 'browser',
    category: 'device',
    action: 'preset',
    kind: 'browser',
    label: 'Browser',
    description: 'Frame desktop con top bar',
    iconClass: 'fa-solid fa-desktop',
  },
  {
    id: 'card',
    category: 'content',
    action: 'preset',
    kind: 'card',
    label: 'Card',
    description: 'Blocco contenuto sintetico',
    iconClass: 'fa-solid fa-address-card',
  },
  {
    id: 'form',
    category: 'layout',
    action: 'preset',
    kind: 'form',
    label: 'Form',
    description: 'Schema form con righe input',
    iconClass: 'fa-solid fa-clipboard-list',
  },
  {
    id: 'upload-svg',
    category: 'assets',
    action: 'uploadSvg',
    label: 'SVG personalizzato',
    description: 'Carica un elemento SVG',
    iconClass: 'fa-solid fa-file-arrow-up',
  },
]

const dialoghiParametricDefaultColors = [
  '#e76f51',
  '#2a9d8f',
  '#457b9d',
  '#f4a261',
  '#8d99ae',
  '#90be6d',
  '#b56576',
  '#577590',
]

const elementKinds: ElementKind[] = ['phone', 'browser', 'card', 'form']
const textAlignOptions: TextAlignOption[] = ['left', 'center', 'right', 'distributed']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function asTextAlignOption(value: unknown, fallback: TextAlignOption): TextAlignOption {
  return typeof value === 'string' && textAlignOptions.includes(value as TextAlignOption)
    ? (value as TextAlignOption)
    : fallback
}

function asHeaderFooterOptions(value: unknown, fallback: HeaderFooterOptions): HeaderFooterOptions {
  if (!isRecord(value)) {
    return fallback
  }

  return {
    text: typeof value.text === 'string' ? value.text : fallback.text,
    includePageNumber:
      typeof value.includePageNumber === 'boolean'
        ? value.includePageNumber
        : fallback.includePageNumber,
    align: asTextAlignOption(value.align, fallback.align),
  }
}

function isTemplateKey(value: unknown): value is TemplateKey {
  return typeof value === 'string' && Object.hasOwn(templateLabels, value)
}

function sanitizeCustomElementsByPage(value: unknown): Record<string, CustomElement[]> {
  if (!isRecord(value)) {
    return {}
  }

  const next: Record<string, CustomElement[]> = {}
  for (const [pageKey, pageElementsRaw] of Object.entries(value)) {
    if (typeof pageKey !== 'string' || !Array.isArray(pageElementsRaw)) {
      continue
    }

    const parsedElements: CustomElement[] = []
    for (const elementRaw of pageElementsRaw) {
      if (!isRecord(elementRaw)) {
        continue
      }

      const kind = elementKinds.includes(elementRaw.kind as ElementKind)
        ? (elementRaw.kind as ElementKind)
        : 'card'
      const width = isFiniteNumber(elementRaw.width) && elementRaw.width > 0 ? elementRaw.width : 62
      const height = isFiniteNumber(elementRaw.height) && elementRaw.height > 0 ? elementRaw.height : 44
      const x = isFiniteNumber(elementRaw.x) ? elementRaw.x : 0
      const y = isFiniteNumber(elementRaw.y) ? elementRaw.y : 0

      parsedElements.push({
        id: typeof elementRaw.id === 'string' && elementRaw.id.trim().length > 0
          ? elementRaw.id
          : crypto.randomUUID(),
        kind,
        x,
        y,
        width,
        height,
        rotation: isFiniteNumber(elementRaw.rotation)
          ? normalizeRotationDeg(elementRaw.rotation)
          : 0,
        assetDataUrl:
          typeof elementRaw.assetDataUrl === 'string' && elementRaw.assetDataUrl.trim().length > 0
            ? elementRaw.assetDataUrl
            : undefined,
        assetName:
          typeof elementRaw.assetName === 'string' && elementRaw.assetName.trim().length > 0
            ? elementRaw.assetName
            : undefined,
      })
    }

    if (parsedElements.length > 0) {
      next[pageKey] = parsedElements
    }
  }

  return next
}

function parseNotebookProject(value: unknown): NotebookProjectV1 | null {
  if (!isRecord(value) || value.version !== NOTEBOOK_PROJECT_JSON_VERSION) {
    return null
  }

  const size: PageSizeKey = value.size === 'A5' ? 'A5' : 'A4'
  const orientation: Orientation = value.orientation === 'landscape' ? 'landscape' : 'portrait'
  const binding: BindingKey =
    value.binding === 'none' || value.binding === 'ringTop' || value.binding === 'booklet'
      ? value.binding
      : 'ringLeft'
  const duplexEnabled = Boolean(value.duplexEnabled)

  const compositionPagesRaw = Array.isArray(value.compositionPages) ? value.compositionPages : []
  const compositionPages: PlannedPage[] = compositionPagesRaw
    .filter((item) => isRecord(item) && isTemplateKey(item.template))
    .map((item) => ({
      id: typeof item.id === 'string' && item.id.trim().length > 0 ? item.id : crypto.randomUUID(),
      template: item.template as TemplateKey,
    }))

  const safeCompositionPages = compositionPages.length > 0
    ? compositionPages
    : [{ id: crypto.randomUUID(), template: 'blank' as TemplateKey }]

  const previewPageNumberRaw = isFiniteNumber(value.previewPageNumber) ? Math.round(value.previewPageNumber) : 1
  const previewPageNumber = Math.min(
    Math.max(previewPageNumberRaw, 1),
    safeCompositionPages.length,
  )

  const headerOptions = asHeaderFooterOptions(value.headerOptions, {
    text: '',
    includePageNumber: false,
    align: 'left',
  })
  const footerOptions = asHeaderFooterOptions(value.footerOptions, {
    text: '{page}',
    includePageNumber: false,
    align: 'right',
  })

  const colorsRaw = Array.isArray(value.dialoghiParametricActorColors)
    ? value.dialoghiParametricActorColors
    : []
  const sanitizedColors = colorsRaw
    .filter((color) => typeof color === 'string' && color.trim().length > 0)
    .map((color) => color.trim())

  const actorCountSource = isFiniteNumber(value.dialoghiParametricActorCount)
    ? Math.round(value.dialoghiParametricActorCount)
    : sanitizedColors.length || 3
  const dialoghiParametricActorCount = Math.min(8, Math.max(2, actorCountSource))
  const dialoghiParametricActorColors = buildDialoghiParametricColors(
    dialoghiParametricActorCount,
    sanitizedColors,
  )

  const customElementsByPage = sanitizeCustomElementsByPage(value.customElementsByPage)

  return {
    version: NOTEBOOK_PROJECT_JSON_VERSION,
    size,
    orientation,
    binding,
    duplexEnabled,
    compositionPages: safeCompositionPages,
    previewPageNumber,
    headerOptions,
    footerOptions,
    dialoghiParametricActorCount,
    dialoghiParametricActorColors,
    customElementsByPage,
  }
}

function buildDialoghiParametricColors(actorCount: number, existing: string[] = []): string[] {
  const safeCount = Math.min(8, Math.max(2, actorCount))
  return Array.from({ length: safeCount }, (_, index) =>
    existing[index] ?? dialoghiParametricDefaultColors[index % dialoghiParametricDefaultColors.length],
  )
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

function clampElementSizeToContent(
  element: CustomElement,
  content: MmRect,
  nextWidth: number,
  nextHeight: number,
): { width: number; height: number } {
  const maxWidth = Math.max(MIN_CUSTOM_ELEMENT_SIZE, content.x + content.width - element.x)
  const maxHeight = Math.max(MIN_CUSTOM_ELEMENT_SIZE, content.y + content.height - element.y)

  return {
    width: Math.min(Math.max(nextWidth, MIN_CUSTOM_ELEMENT_SIZE), maxWidth),
    height: Math.min(Math.max(nextHeight, MIN_CUSTOM_ELEMENT_SIZE), maxHeight),
  }
}

function normalizeRotationDeg(angle: number): number {
  let value = angle % 360
  if (value > 180) {
    value -= 360
  }
  if (value < -180) {
    value += 360
  }
  return value
}

function angleDegFromCenter(centerX: number, centerY: number, x: number, y: number): number {
  return (Math.atan2(y - centerY, x - centerX) * 180) / Math.PI
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
  const framePath = roundedRectPath(element.width, element.height, 2)

  page.drawSvgPath(framePath, {
    x: mmToPt(element.x),
    y: mmToPt(pageHeightMm - element.y),
    scale: mmToPt(1),
    color: rgb(1, 1, 1),
    borderColor: stroke,
    borderWidth: mmToPt(0.45),
  })

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
        x: mmToPt(element.x + 0.8),
        y: mmToPt(baseY + 0.8),
        width: mmToPt(Math.max(0, element.width - 1.6)),
        height: mmToPt(Math.max(0, element.height - 1.6)),
      })
      return
    }
  }

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
  dialoghiParametricActors: { color: string }[]
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

    drawTemplateOnPdf(page, currentTemplate, content, {
      dialoghiParametricActors: options.dialoghiParametricActors,
    })
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

function App() {
  const [size, setSize] = useState<PageSizeKey>('A4')
  const [orientation, setOrientation] = useState<Orientation>('portrait')
  const [binding, setBinding] = useState<BindingKey>('ringLeft')
  const [duplexEnabled, setDuplexEnabled] = useState(false)
  const [compositionPages, setCompositionPages] = useState<PlannedPage[]>([
    { id: crypto.randomUUID(), template: 'uiDesktop' },
  ])
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
  const [dialoghiParametricActorCount, setDialoghiParametricActorCount] = useState(3)
  const [dialoghiParametricActorColors, setDialoghiParametricActorColors] =
    useState<string[]>(() => buildDialoghiParametricColors(3))
  const [customElementsByPage, setCustomElementsByPage] = useState<Record<string, CustomElement[]>>({})
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [resizeState, setResizeState] = useState<ResizeState | null>(null)
  const [rotationState, setRotationState] = useState<RotationState | null>(null)
  const [projectPanelOpenMobile, setProjectPanelOpenMobile] = useState(false)
  const [parametricModalOpen, setParametricModalOpen] = useState(false)
  const [pageActionMenuOpen, setPageActionMenuOpen] = useState(false)
  const [elementLibraryOpen, setElementLibraryOpen] = useState(false)
  const [elementLibraryCategory, setElementLibraryCategory] =
    useState<ElementLibraryCategory>('all')
  const [elementLibraryQuery, setElementLibraryQuery] = useState('')

  const svgRef = useRef<SVGSVGElement | null>(null)
  const uploadSvgInputRef = useRef<HTMLInputElement | null>(null)
  const importProjectInputRef = useRef<HTMLInputElement | null>(null)
  const pageActionMenuRef = useRef<HTMLDivElement | null>(null)

  const page = useMemo(() => getPageDimensions(size, orientation), [size, orientation])
  const totalPages = Math.max(1, compositionPages.length)
  const clampedPreviewPageNumber = Math.min(
    Math.max(previewPageNumber, 1),
    totalPages,
  )
  const previewPageIndex = clampedPreviewPageNumber - 1
  const previewTemplates = compositionPages.map((item) => item.template)
  const selectedCompositionPage = compositionPages[previewPageIndex] ?? null
  const currentPageKey = selectedCompositionPage
    ? `comp-${selectedCompositionPage.id}`
    : 'comp-fallback'
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
  const activeTemplate = compositionPages[previewPageIndex]?.template ?? 'blank'
  const dialoghiParametricActors = useMemo(
    () =>
      buildDialoghiParametricColors(
        dialoghiParametricActorCount,
        dialoghiParametricActorColors,
      ).map((color) => ({ color })),
    [dialoghiParametricActorColors, dialoghiParametricActorCount],
  )
  const filteredElementLibraryItems = useMemo(
    () => {
      const normalizedQuery = elementLibraryQuery.trim().toLowerCase()
      return elementLibraryItems.filter((item) => {
        const categoryMatches =
          elementLibraryCategory === 'all' ? true : item.category === elementLibraryCategory
        if (!categoryMatches) {
          return false
        }
        if (!normalizedQuery) {
          return true
        }
        const haystack = `${item.label} ${item.description}`.toLowerCase()
        return haystack.includes(normalizedQuery)
      })
    },
    [elementLibraryCategory, elementLibraryQuery],
  )

  const previewMargins = useMemo(
    () => getMargins(binding, previewPageIndex, totalPages, duplexEnabled),
    [binding, duplexEnabled, previewPageIndex, totalPages],
  )
  const previewContent = useMemo(
    () => getContentRect(page.width, page.height, previewMargins),
    [page.height, page.width, previewMargins],
  )

  const maxPreviewWidth = 390
  const previewScale = maxPreviewWidth / page.width
  const previewWidth = page.width * previewScale
  const previewHeight = page.height * previewScale

  function setDialoghiParametricActorsCount(nextCountRaw: number) {
    const nextCount = Math.min(8, Math.max(2, Math.round(nextCountRaw) || 2))
    setDialoghiParametricActorCount(nextCount)
    setDialoghiParametricActorColors((prev) => buildDialoghiParametricColors(nextCount, prev))
  }

  function setDialoghiParametricActorColor(index: number, color: string) {
    setDialoghiParametricActorColors((prev) => {
      const next = buildDialoghiParametricColors(dialoghiParametricActorCount, prev)
      next[index] = color
      return next
    })
  }

  function addCompositionPage() {
    setCompositionPages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), template: 'blank' },
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

  function duplicateCurrentCompositionPageTimes(times: number) {
    if (!selectedCompositionPage) {
      return
    }
    const safeTimes = Math.min(20, Math.max(1, Math.floor(times)))
    setCompositionPages((prev) => {
      const currentIndex = prev.findIndex(
        (item) => item.id === selectedCompositionPage.id,
      )
      if (currentIndex < 0) {
        return prev
      }

      const clones: PlannedPage[] = Array.from({ length: safeTimes }, () => ({
        id: crypto.randomUUID(),
        template: selectedCompositionPage.template,
      }))
      const next = [...prev]
      next.splice(currentIndex + 1, 0, ...clones)
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
      rotation: 0,
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
      rotation: 0,
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
    setElementLibraryOpen(false)
  }

  function removeElementById(elementId: string) {
    setCustomElementsByPage((prev) => ({
      ...prev,
      [currentPageKey]: (prev[currentPageKey] ?? []).filter(
        (item) => item.id !== elementId,
      ),
    }))
    setSelectedId((prev) => (prev === elementId ? null : prev))
  }

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (!svgRef.current) {
      return
    }

    const point = screenPointToSvg(event, svgRef.current)
    if (!point) {
      return
    }

    if (resizeState) {
      setCustomElementsByPage((prev) => {
        const current = prev[currentPageKey] ?? []
        return {
          ...prev,
          [currentPageKey]: current.map((item) => {
            if (item.id !== resizeState.id) {
              return item
            }

            const nextWidth = resizeState.startWidth + (point.x - resizeState.startPointerX)
            const nextHeight = resizeState.startHeight + (point.y - resizeState.startPointerY)
            const size = clampElementSizeToContent(item, previewContent, nextWidth, nextHeight)

            return {
              ...item,
              width: size.width,
              height: size.height,
            }
          }),
        }
      })
      return
    }

    if (rotationState) {
      setCustomElementsByPage((prev) => {
        const current = prev[currentPageKey] ?? []
        return {
          ...prev,
          [currentPageKey]: current.map((item) => {
            if (item.id !== rotationState.id) {
              return item
            }

            const pointerAngle = angleDegFromCenter(
              rotationState.centerX,
              rotationState.centerY,
              point.x,
              point.y,
            )
            const delta = pointerAngle - rotationState.startPointerAngle
            const freeAngle = rotationState.startRotation + delta
            const nextRotation = event.shiftKey
              ? Math.round(freeAngle / 45) * 45
              : freeAngle

            return {
              ...item,
              rotation: normalizeRotationDeg(nextRotation),
            }
          }),
        }
      })
      return
    }

    if (!dragState) {
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
    if (resizeState) {
      setResizeState(null)
    }
    if (rotationState) {
      setRotationState(null)
    }
  }

  const canDragElements = activeTemplate === 'uiDesktop' || activeTemplate === 'uiMobile'
    || activeTemplate === 'blank'

  useEffect(() => {
    setSelectedId(null)
    setDragState(null)
    setResizeState(null)
    setRotationState(null)
  }, [currentPageKey])

  useEffect(() => {
    if (compositionPages.length === 0) {
      setCompositionPages([{ id: crypto.randomUUID(), template: 'blank' }])
      setPreviewPageNumber(1)
    }
  }, [compositionPages.length])

  useEffect(() => {
    if (activeTemplate === 'dialoghiParametric') {
      setParametricModalOpen(true)
    }
  }, [activeTemplate])

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!pageActionMenuRef.current) {
        return
      }
      if (!pageActionMenuRef.current.contains(event.target as Node)) {
        setPageActionMenuOpen(false)
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [])

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

  const getTemplateSections = (currentValue: TemplateKey): DropdownSection[] => {
    const isHiddenCurrent = !isTemplateSelectable(currentValue)
    const sections: DropdownSection[] = []

    if (isHiddenCurrent) {
      sections.push({
        label: 'Attivo ma nascosto',
        items: [
          {
            value: currentValue,
            label: `${templateLabels[currentValue]} (temporaneamente nascosto)`,
          },
        ],
      })
    }

    for (const group of selectableTemplateGroups) {
      sections.push({
        label: group.label,
        items: group.templates.map((templateKey) => ({
          value: templateKey,
          label: templateLabels[templateKey],
        })),
      })
    }

    return sections
  }

  const previewPageNumberText = `${clampedPreviewPageNumber}/${totalPages}`

  function handleExportPdf() {
    exportPdf({
      size,
      orientation,
      template: compositionPages[0]?.template ?? 'blank',
      binding,
      pages: compositionPages.length,
      customElementsByPage,
      compositionTemplates: compositionPages.map((item) => item.template),
      compositionPageIds: compositionPages.map((item) => item.id),
      duplexEnabled,
      header: headerOptions,
      footer: footerOptions,
      dialoghiParametricActors,
    })
  }

  function handleExportProjectJson() {
    const payload: NotebookProjectV1 = {
      version: NOTEBOOK_PROJECT_JSON_VERSION,
      size,
      orientation,
      binding,
      duplexEnabled,
      compositionPages,
      previewPageNumber: clampedPreviewPageNumber,
      headerOptions,
      footerOptions,
      dialoghiParametricActorCount,
      dialoghiParametricActorColors,
      customElementsByPage,
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'notebook-project.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImportProjectJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const rawText = typeof reader.result === 'string' ? reader.result : ''
        const parsed = JSON.parse(rawText)
        const project = parseNotebookProject(parsed)
        if (!project) {
          window.alert('JSON progetto non valido o versione non supportata.')
          return
        }

        setSize(project.size)
        setOrientation(project.orientation)
        setBinding(project.binding)
        setDuplexEnabled(project.duplexEnabled)
        setCompositionPages(project.compositionPages)
        setPreviewPageNumber(project.previewPageNumber)
        setHeaderOptions(project.headerOptions)
        setFooterOptions(project.footerOptions)
        setDialoghiParametricActorCount(project.dialoghiParametricActorCount)
        setDialoghiParametricActorColors(project.dialoghiParametricActorColors)
        setCustomElementsByPage(project.customElementsByPage)

        setSelectedId(null)
        setDragState(null)
        setResizeState(null)
        setRotationState(null)
        setPageActionMenuOpen(false)
        setElementLibraryOpen(false)
      } catch {
        window.alert('Impossibile leggere il file JSON progetto.')
      }
    }

    reader.readAsText(file)
    event.target.value = ''
  }

  function runPageMenuAction(action: () => void) {
    action()
    setPageActionMenuOpen(false)
  }

  function handleSelectElementLibraryItem(item: (typeof elementLibraryItems)[number]) {
    if (item.action === 'preset') {
      addElement(item.kind)
      setElementLibraryOpen(false)
      return
    }

    if (item.action === 'uploadSvg') {
      setElementLibraryOpen(false)
      uploadSvgInputRef.current?.click()
    }
  }

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
      {projectPanelOpenMobile && (
        <button
          type="button"
          className="panelBackdrop"
          aria-label="Chiudi impostazioni progetto"
          onClick={() => setProjectPanelOpenMobile(false)}
        />
      )}

      <aside className={`panel ${projectPanelOpenMobile ? 'isPanelOpenMobile' : ''}`}>
        <div className="panelTopRow">
          <h1>PageForge</h1>
          <button
            type="button"
            className="smallButton panelCloseButton"
            onClick={() => setProjectPanelOpenMobile(false)}
          >
            Chiudi
          </button>
        </div>
        <div className="themeTag" aria-label="Area impostazioni progetto">Impostazioni progetto</div>
        <p>
          Generatore di pagine stampabili con template tecnici, mockup UI e
          rilegature per stampa.
        </p>

        <div className="group">
          <label htmlFor="size">Formato</label>
          <CustomDropdown
            id="size"
            value={size}
            onChange={(value) => setSize(value as PageSizeKey)}
            sections={[
              {
                items: Object.keys(pageSizes).map((key) => ({
                  value: key,
                  label: key,
                })),
              },
            ]}
          />
        </div>

        <div className="group">
          <label htmlFor="orientation">Orientamento</label>
          <CustomDropdown
            id="orientation"
            value={orientation}
            onChange={(value) => setOrientation(value as Orientation)}
            sections={[
              {
                items: [
                  { value: 'portrait', label: 'Verticale' },
                  { value: 'landscape', label: 'Orizzontale' },
                ],
              },
            ]}
          />
        </div>

        <div className="group">
          <label htmlFor="binding">Rilegatura</label>
          <CustomDropdown
            id="binding"
            value={binding}
            onChange={(value) => setBinding(value as BindingKey)}
            sections={[
              {
                items: Object.entries(bindingLabels).map(([key, label]) => ({
                  value: key,
                  label,
                })),
              },
            ]}
          />
        </div>

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

        {activeTemplate === 'dialoghiParametric' && (
          <GroupCard title="Dialoghi Parametrico">
            <button
              type="button"
              className="smallButton"
              onClick={() => setParametricModalOpen(true)}
            >
              Apri impostazioni parametriche
            </button>
            <p className="hint">Riapri questa modale quando vuoi tramite il pulsante gear.</p>
          </GroupCard>
        )}

        <GroupCard title="Header / Footer">

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
          <CustomDropdown
            id="headerAlign"
            value={headerOptions.align}
            onChange={(value) =>
              setHeaderOptions((prev) => ({ ...prev, align: value as TextAlignOption }))
            }
            sections={[
              {
                items: [
                  { value: 'left', label: 'Sinistra' },
                  { value: 'center', label: 'Centrato' },
                  { value: 'right', label: 'Destra' },
                  { value: 'distributed', label: 'Distribuito' },
                ],
              },
            ]}
          />

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
          <CustomDropdown
            id="footerAlign"
            value={footerOptions.align}
            onChange={(value) =>
              setFooterOptions((prev) => ({ ...prev, align: value as TextAlignOption }))
            }
            sections={[
              {
                items: [
                  { value: 'left', label: 'Sinistra' },
                  { value: 'center', label: 'Centrato' },
                  { value: 'right', label: 'Destra' },
                  { value: 'distributed', label: 'Distribuito' },
                ],
              },
            ]}
          />
        </GroupCard>

        <GroupCard title="Notebook personalizzato">
          <div className="toolbarTheme">
            <button
              type="button"
              className="smallButton"
              onClick={handleExportProjectJson}
            >
              Esporta progetto JSON
            </button>
            <button
              type="button"
              className="smallButton"
              onClick={() => importProjectInputRef.current?.click()}
            >
              Importa progetto JSON
            </button>
          </div>
          <p className="hint">Condividi il file JSON per riaprire lo stesso notebook su un altro PC.</p>
        </GroupCard>

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
        <button
          type="button"
          className="iconToolButton mobileProjectMenuButton"
          onClick={() => setProjectPanelOpenMobile(true)}
          title="Apri impostazioni progetto"
          aria-label="Apri impostazioni progetto"
        >
          <i className="fa-solid fa-bars" aria-hidden="true" />
        </button>

        <ToolbarCard>
          <div className="themeTag themeTagInline" aria-label="Area pagina corrente">Pagina corrente</div>
          <div className="toolbarTheme toolbarTheme-page">
            {activeTemplate === 'dialoghiParametric' && (
              <button
                type="button"
                className="smallButton"
                onClick={() => setParametricModalOpen(true)}
                title="Apri impostazioni template parametrico"
              >
                <i className="fa-solid fa-gear" aria-hidden="true" /> Parametri
              </button>
            )}
          </div>

          {selectedCompositionPage ? (
            <CustomDropdown
              value={selectedCompositionPage.template}
              onChange={(value) => updateCurrentCompositionTemplate(value as TemplateKey)}
              sections={getTemplateSections(selectedCompositionPage.template)}
            />
          ) : (
            <CustomDropdown
              value={activeTemplate}
              onChange={(value) => updateCurrentCompositionTemplate(value as TemplateKey)}
              sections={getTemplateSections(activeTemplate)}
              disabled
            />
          )}

        </ToolbarCard>

        <input
          ref={uploadSvgInputRef}
          className="hiddenFileInput"
          type="file"
          accept=".svg,image/svg+xml"
          onChange={handleSvgUpload}
        />
        <input
          ref={importProjectInputRef}
          className="hiddenFileInput"
          type="file"
          accept=".json,application/json"
          onChange={handleImportProjectJson}
        />

        <div className="previewStage">
          <PageQuickIndexBadge currentPage={previewPageIndex + 1} totalPages={totalPages} />

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
            <TemplatePreviewContent
              page={page}
              previewContent={previewContent}
              activeTemplate={activeTemplate}
              dialoghiParametricActors={dialoghiParametricActors}
            />

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
              <g key={element.id}>
                <CustomElementShape
                  element={element}
                  selected={selectedId === element.id}
                  onPointerDown={(event: ReactPointerEvent<SVGGElement>) => {
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
                    setResizeState(null)
                    setRotationState(null)
                  }}
                  onResizePointerDown={(event: ReactPointerEvent<SVGRectElement>) => {
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
                    setResizeState({
                      id: element.id,
                      startPointerX: point.x,
                      startPointerY: point.y,
                      startWidth: element.width,
                      startHeight: element.height,
                    })
                    setDragState(null)
                    setRotationState(null)
                  }}
                  onRotatePointerDown={(event: ReactPointerEvent<SVGGElement>) => {
                    if (!canDragElements || !svgRef.current) {
                      return
                    }
                    event.preventDefault()
                    event.stopPropagation()

                    const point = screenPointToSvg(event, svgRef.current)
                    if (!point) {
                      return
                    }

                    const centerX = element.x + element.width / 2
                    const centerY = element.y + element.height / 2
                    setSelectedId(element.id)
                    setRotationState({
                      id: element.id,
                      centerX,
                      centerY,
                      startRotation: element.rotation ?? 0,
                      startPointerAngle: angleDegFromCenter(centerX, centerY, point.x, point.y),
                    })
                    setDragState(null)
                    setResizeState(null)
                  }}
                />

                {selectedId === element.id && (
                  <g
                    role="button"
                    aria-label="Elimina elemento selezionato"
                    onPointerDown={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      removeElementById(element.id)
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle
                      cx={element.x + element.width + 1}
                      cy={element.y - 1}
                      r="2.35"
                      fill="#b7323d"
                      stroke="#ffe4e7"
                      strokeWidth="0.35"
                    />
                    <line
                      x1={element.x + element.width - 0.15}
                      y1={element.y - 2.15}
                      x2={element.x + element.width + 2.15}
                      y2={element.y + 0.15}
                      stroke="#ffffff"
                      strokeWidth="0.35"
                      strokeLinecap="round"
                    />
                    <line
                      x1={element.x + element.width + 2.15}
                      y1={element.y - 2.15}
                      x2={element.x + element.width - 0.15}
                      y2={element.y + 0.15}
                      stroke="#ffffff"
                      strokeWidth="0.35"
                      strokeLinecap="round"
                    />
                  </g>
                )}
              </g>
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

          {selectedCompositionPage && (
            <PageQuickActionsRail
              canDragElements={canDragElements}
              pageActionMenuOpen={pageActionMenuOpen}
              pageActionMenuRef={pageActionMenuRef}
              duplicateDisabled={!selectedCompositionPage}
              disableMoveUp={previewPageIndex === 0}
              disableMoveDown={previewPageIndex === totalPages - 1}
              disableDelete={compositionPages.length <= 1}
              onOpenElementLibrary={() => setElementLibraryOpen(true)}
              onAddBlankPage={addCompositionPage}
              onTogglePageActionMenu={() => setPageActionMenuOpen((prev) => !prev)}
              onDuplicateOne={() => runPageMenuAction(() => duplicateCurrentCompositionPageTimes(1))}
              onDuplicateFive={() => runPageMenuAction(() => duplicateCurrentCompositionPageTimes(5))}
              onDuplicateTen={() => runPageMenuAction(() => duplicateCurrentCompositionPageTimes(10))}
              onMoveUp={() => moveCurrentCompositionPage(-1)}
              onMoveDown={() => moveCurrentCompositionPage(1)}
              onDelete={removeCurrentCompositionPage}
            />
          )}
        </div>

        {totalPages > 1 && (
          <div className="thumbnailBar thumbnailBarSticky" aria-label="Miniature pagine">
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
                        {(item.template === 'dialoghi2' ||
                          item.template === 'dialoghi3' ||
                          item.template === 'dialoghi' ||
                          item.template === 'dialoghi6' ||
                          item.template === 'dialoghiParametric') && (
                          <span className="thumbUi">
                            {item.template === 'dialoghi2'
                              ? 'DIA2'
                              : item.template === 'dialoghi3'
                                ? 'DIA3'
                                : item.template === 'dialoghi6'
                                  ? 'DIA6'
                                  : item.template === 'dialoghiParametric'
                                    ? 'DIAP'
                                  : 'DIA4'}
                          </span>
                        )}
                        {item.template === 'storyboard' && (
                          <span className="thumbUi">STB</span>
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
                        {item.template === 'uiUseCase' && (
                          <span className="thumbUi">UC</span>
                        )}
                        {item.template === 'projectCover' && (
                          <span className="thumbUi">CVR</span>
                        )}
                        {item.template === 'projectChecklist' && (
                          <span className="thumbUi">CHL</span>
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

        <ExportDock
          totalPages={totalPages}
          activeTemplateLabel={templateLabels[activeTemplate]}
          onExport={handleExportPdf}
        />
      </section>

      <ParametricDialogModal
        open={activeTemplate === 'dialoghiParametric' && parametricModalOpen}
        actorCount={dialoghiParametricActorCount}
        actors={dialoghiParametricActors}
        onClose={() => setParametricModalOpen(false)}
        onActorCountChange={setDialoghiParametricActorsCount}
        onActorColorChange={setDialoghiParametricActorColor}
      />

      <ElementLibraryModal
        open={elementLibraryOpen && canDragElements}
        categories={elementLibraryTree}
        selectedCategory={elementLibraryCategory}
        onSelectCategory={(categoryId) => setElementLibraryCategory(categoryId as ElementLibraryCategory)}
        query={elementLibraryQuery}
        onQueryChange={setElementLibraryQuery}
        items={filteredElementLibraryItems}
        onSelectItem={(itemId) => {
          const selectedItem = filteredElementLibraryItems.find((item) => item.id === itemId)
          if (!selectedItem) {
            return
          }
          handleSelectElementLibraryItem(selectedItem)
        }}
        onClose={() => setElementLibraryOpen(false)}
      />
    </main>
  )
}

export default App