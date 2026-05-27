import { rgb, type PDFPage } from 'pdf-lib'
import type { MmRect } from '../types'
import { mmToPt } from './utils'

const lineColor = rgb(0.78, 0.8, 0.84)
const darkColor = rgb(0.55, 0.58, 0.64)
const midColor = rgb(0.68, 0.71, 0.77)

export function drawProjectsTemplatePdf(
  page: PDFPage,
  template: 'projectCover' | 'projectChecklist',
  rect: MmRect,
): void {
  const pageHeightMm = page.getSize().height / 2.8346456693

  // ── Cover ──────────────────────────────────────────────────────────────────
  if (template === 'projectCover') {
    // Accent bar at top
    page.drawRectangle({
      x: mmToPt(rect.x),
      y: mmToPt(pageHeightMm - rect.y - 3),
      width: mmToPt(rect.width),
      height: mmToPt(3),
      color: darkColor,
    })

    // Title line (thick, full width)
    const titleY = rect.y + rect.height * 0.33
    page.drawLine({
      start: { x: mmToPt(rect.x + 4), y: mmToPt(pageHeightMm - titleY) },
      end: { x: mmToPt(rect.x + rect.width - 4), y: mmToPt(pageHeightMm - titleY) },
      thickness: mmToPt(0.7),
      color: darkColor,
    })

    // Subtitle line
    const subtitleY = rect.y + rect.height * 0.46
    page.drawLine({
      start: { x: mmToPt(rect.x + 4), y: mmToPt(pageHeightMm - subtitleY) },
      end: { x: mmToPt(rect.x + rect.width - 24), y: mmToPt(pageHeightMm - subtitleY) },
      thickness: mmToPt(0.4),
      color: darkColor,
    })

    // Thin divider
    const dividerY = rect.y + rect.height * 0.57
    page.drawLine({
      start: { x: mmToPt(rect.x + 4), y: mmToPt(pageHeightMm - dividerY) },
      end: { x: mmToPt(rect.x + rect.width - 4), y: mmToPt(pageHeightMm - dividerY) },
      thickness: mmToPt(0.25),
      color: lineColor,
    })

    // Author lines (2)
    for (let i = 0; i < 2; i += 1) {
      const authorY = rect.y + rect.height * (0.66 + i * 0.09)
      page.drawLine({
        start: { x: mmToPt(rect.x + 4), y: mmToPt(pageHeightMm - authorY) },
        end: { x: mmToPt(rect.x + rect.width - 44), y: mmToPt(pageHeightMm - authorY) },
        thickness: mmToPt(0.35),
        color: darkColor,
      })
    }

    // Date line (short, right-aligned)
    const dateY = rect.y + rect.height * 0.89
    page.drawLine({
      start: { x: mmToPt(rect.x + rect.width * 0.55), y: mmToPt(pageHeightMm - dateY) },
      end: { x: mmToPt(rect.x + rect.width - 4), y: mmToPt(pageHeightMm - dateY) },
      thickness: mmToPt(0.3),
      color: midColor,
    })

    return
  }

  // ── Checklist ──────────────────────────────────────────────────────────────
  const checkboxSize = 8
  const checkboxLeft = rect.x + 3
  const textLeft = rect.x + 15
  const textRight = rect.x + rect.width - 3
  const lineGap = 6
  const linesPerItem = 3
  const textAreaH = linesPerItem * lineGap
  const checkboxTopOffset = (textAreaH - checkboxSize) / 2
  const itemPitch = textAreaH + 4

  for (
    let itemTop = rect.y + 4;
    itemTop + textAreaH <= rect.y + rect.height - 2;
    itemTop += itemPitch
  ) {
    // Checkbox square
    page.drawRectangle({
      x: mmToPt(checkboxLeft),
      y: mmToPt(pageHeightMm - itemTop - checkboxTopOffset - checkboxSize),
      width: mmToPt(checkboxSize),
      height: mmToPt(checkboxSize),
      borderColor: midColor,
      borderWidth: mmToPt(0.45),
    })

    // Text lines
    for (let j = 0; j < linesPerItem; j += 1) {
      const lineY = itemTop + (j + 1) * lineGap
      page.drawLine({
        start: { x: mmToPt(textLeft), y: mmToPt(pageHeightMm - lineY) },
        end: { x: mmToPt(textRight), y: mmToPt(pageHeightMm - lineY) },
        thickness: mmToPt(0.28),
        color: lineColor,
      })
    }
  }
}
