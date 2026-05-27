import { rgb, type PDFPage } from 'pdf-lib'
import type { MmRect } from '../types'
import { mmToPt } from './utils'

const lineColor = rgb(0.78, 0.8, 0.84)

export function drawBasicTemplatePdf(page: PDFPage, template: 'blank' | 'dots' | 'lines' | 'grid' | 'isometric', rect: MmRect): void {
  if (template === 'blank') {
    return
  }

  const pageHeightMm = page.getSize().height / 2.8346456693

  if (template === 'dots') {
    for (let y = rect.y; y <= rect.y + rect.height; y += 5) {
      for (let x = rect.x; x <= rect.x + rect.width; x += 5) {
        page.drawCircle({
          x: mmToPt(x),
          y: mmToPt(pageHeightMm - y),
          size: mmToPt(0.45),
          color: lineColor,
        })
      }
    }
    return
  }

  if (template === 'lines') {
    for (let y = rect.y; y <= rect.y + rect.height; y += 7) {
      page.drawLine({
        start: { x: mmToPt(rect.x), y: mmToPt(pageHeightMm - y) },
        end: { x: mmToPt(rect.x + rect.width), y: mmToPt(pageHeightMm - y) },
        thickness: mmToPt(0.28),
        color: lineColor,
      })
    }
    return
  }

  if (template === 'grid') {
    for (let y = rect.y; y <= rect.y + rect.height; y += 5) {
      page.drawLine({
        start: { x: mmToPt(rect.x), y: mmToPt(pageHeightMm - y) },
        end: { x: mmToPt(rect.x + rect.width), y: mmToPt(pageHeightMm - y) },
        thickness: mmToPt(0.23),
        color: lineColor,
      })
    }
    for (let x = rect.x; x <= rect.x + rect.width; x += 5) {
      page.drawLine({
        start: { x: mmToPt(x), y: mmToPt(pageHeightMm - rect.y) },
        end: { x: mmToPt(x), y: mmToPt(pageHeightMm - (rect.y + rect.height)) },
        thickness: mmToPt(0.23),
        color: lineColor,
      })
    }
    return
  }

  for (let x = rect.x - rect.height; x <= rect.x + rect.width + rect.height; x += 8) {
    page.drawLine({
      start: { x: mmToPt(x), y: mmToPt(pageHeightMm - (rect.y + rect.height)) },
      end: { x: mmToPt(x + rect.height), y: mmToPt(pageHeightMm - rect.y) },
      thickness: mmToPt(0.2),
      color: lineColor,
    })
    page.drawLine({
      start: { x: mmToPt(x + rect.height), y: mmToPt(pageHeightMm - (rect.y + rect.height)) },
      end: { x: mmToPt(x), y: mmToPt(pageHeightMm - rect.y) },
      thickness: mmToPt(0.2),
      color: lineColor,
    })
  }
  for (let y = rect.y; y <= rect.y + rect.height; y += 8) {
    page.drawLine({
      start: { x: mmToPt(rect.x), y: mmToPt(pageHeightMm - y) },
      end: { x: mmToPt(rect.x + rect.width), y: mmToPt(pageHeightMm - y) },
      thickness: mmToPt(0.2),
      color: lineColor,
    })
  }
}
