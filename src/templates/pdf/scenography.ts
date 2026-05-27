import { rgb, type PDFPage } from 'pdf-lib'
import type { MmRect } from '../types'
import { mmToPt } from './utils'

const frameColor = rgb(0.53, 0.56, 0.61)
const fillColor = rgb(0.97, 0.98, 0.99)

export function drawScenographyTemplatePdf(
  page: PDFPage,
  template: 'dialoghi',
  rect: MmRect,
): void {
  if (template !== 'dialoghi') {
    return
  }

  const pageHeightMm = page.getSize().height / 2.8346456693
  const blockGap = 8
  const sidePadding = 6
  const topPadding = 8
  const bottomPadding = 8
  const availableHeight = rect.height - topPadding - bottomPadding - blockGap
  const blockHeight = availableHeight / 2
  const blockWidth = rect.width - sidePadding * 2
  const topBlockY = rect.y + topPadding
  const bottomBlockY = topBlockY + blockHeight + blockGap

  const drawBlock = (y: number) => {
    page.drawRectangle({
      x: mmToPt(rect.x + sidePadding),
      y: mmToPt(pageHeightMm - y - blockHeight),
      width: mmToPt(blockWidth),
      height: mmToPt(blockHeight),
      color: fillColor,
      borderColor: frameColor,
      borderWidth: mmToPt(0.45),
    })
  }

  drawBlock(topBlockY)
  drawBlock(bottomBlockY)
}
