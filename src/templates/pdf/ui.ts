import { rgb, type PDFPage } from 'pdf-lib'
import type { MmRect } from '../types'
import { mmToPt } from './utils'

const lineColor = rgb(0.78, 0.8, 0.84)
const darkColor = rgb(0.55, 0.58, 0.64)

export function drawUiTemplatePdf(page: PDFPage, template: 'uiMobile' | 'uiDesktop' | 'uiUseCase', rect: MmRect): void {
  const pageHeightMm = page.getSize().height / 2.8346456693

  if (template === 'uiMobile') {
    const phone = {
      x: rect.x + rect.width * 0.2,
      y: rect.y + 8,
      width: rect.width * 0.6,
      height: rect.height - 16,
    }
    page.drawRectangle({
      x: mmToPt(phone.x),
      y: mmToPt(pageHeightMm - phone.y - phone.height),
      width: mmToPt(phone.width),
      height: mmToPt(phone.height),
      borderColor: darkColor,
      borderWidth: mmToPt(0.5),
    })
    page.drawRectangle({
      x: mmToPt(phone.x + 4),
      y: mmToPt(pageHeightMm - phone.y - 14),
      width: mmToPt(phone.width - 8),
      height: mmToPt(10),
      color: rgb(0.92, 0.93, 0.95),
    })
    for (let i = 0; i < 4; i += 1) {
      page.drawRectangle({
        x: mmToPt(phone.x + 4),
        y: mmToPt(pageHeightMm - (phone.y + 30 + i * 24) - 18),
        width: mmToPt(phone.width - 8),
        height: mmToPt(18),
        borderColor: lineColor,
        borderWidth: mmToPt(0.35),
      })
    }
    return
  }

  if (template === 'uiDesktop') {
    const frame = {
      x: rect.x + 4,
      y: rect.y + 6,
      width: rect.width - 8,
      height: rect.height - 12,
    }
    page.drawRectangle({
      x: mmToPt(frame.x),
      y: mmToPt(pageHeightMm - frame.y - frame.height),
      width: mmToPt(frame.width),
      height: mmToPt(frame.height),
      borderColor: darkColor,
      borderWidth: mmToPt(0.45),
    })
    page.drawRectangle({
      x: mmToPt(frame.x),
      y: mmToPt(pageHeightMm - frame.y - 10),
      width: mmToPt(frame.width),
      height: mmToPt(10),
      color: rgb(0.92, 0.93, 0.95),
    })
    page.drawRectangle({
      x: mmToPt(frame.x + 6),
      y: mmToPt(pageHeightMm - frame.y - 42),
      width: mmToPt(frame.width - 12),
      height: mmToPt(26),
      borderColor: lineColor,
      borderWidth: mmToPt(0.35),
    })
    for (let i = 0; i < 2; i += 1) {
      page.drawRectangle({
        x: mmToPt(frame.x + 6 + i * ((frame.width - 18) / 2 + 6)),
        y: mmToPt(pageHeightMm - frame.y - 82),
        width: mmToPt((frame.width - 18) / 2),
        height: mmToPt(32),
        borderColor: lineColor,
        borderWidth: mmToPt(0.35),
      })
    }
    return
  }

  // ── Use Case ───────────────────────────────────────────────────────────────
  const actorMargin = 16
  const titleLineY = rect.y + 8
  const boxY = rect.y + 15
  const boxHeight = Math.round(rect.height * 0.50)
  const boxX = rect.x + actorMargin
  const boxWidth = rect.width - actorMargin * 2
  const linesTop = boxY + boxHeight + 6
  const lineGap = 5.5

  page.drawLine({
    start: { x: mmToPt(rect.x + 2), y: mmToPt(pageHeightMm - titleLineY) },
    end: { x: mmToPt(rect.x + rect.width - 2), y: mmToPt(pageHeightMm - titleLineY) },
    thickness: mmToPt(0.35),
    color: darkColor,
  })

  page.drawRectangle({
    x: mmToPt(boxX),
    y: mmToPt(pageHeightMm - boxY - boxHeight),
    width: mmToPt(boxWidth),
    height: mmToPt(boxHeight),
    borderColor: darkColor,
    borderWidth: mmToPt(0.5),
  })

  for (
    let lineY = linesTop;
    lineY <= rect.y + rect.height - 2;
    lineY += lineGap
  ) {
    page.drawLine({
      start: { x: mmToPt(rect.x + 2), y: mmToPt(pageHeightMm - lineY) },
      end: { x: mmToPt(rect.x + rect.width - 2), y: mmToPt(pageHeightMm - lineY) },
      thickness: mmToPt(0.2),
      color: lineColor,
    })
  }
}
