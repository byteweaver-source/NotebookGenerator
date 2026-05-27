import { rgb, type PDFPage } from 'pdf-lib'
import type { MmRect } from '../types'
import { mmToPt } from './utils'

const frameColor = rgb(0.53, 0.56, 0.61)
const fillColor = rgb(0.97, 0.98, 0.99)

export function drawScenographyTemplatePdf(
  page: PDFPage,
  template: 'dialoghi' | 'storyboard',
  rect: MmRect,
): void {
  const pageHeightMm = page.getSize().height / 2.8346456693

  if (template === 'dialoghi') {
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
    return
  }

  const sceneCount = 3
  const outerPaddingX = 4
  const outerPaddingY = 6
  const sceneGap = 6
  const sceneWidth = rect.width - outerPaddingX * 2
  const sceneHeight =
    (rect.height - outerPaddingY * 2 - sceneGap * (sceneCount - 1)) / sceneCount

  const drawScene = (sceneY: number) => {
    const sceneX = rect.x + outerPaddingX

    page.drawRectangle({
      x: mmToPt(sceneX),
      y: mmToPt(pageHeightMm - sceneY - sceneHeight),
      width: mmToPt(sceneWidth),
      height: mmToPt(sceneHeight),
      color: fillColor,
      borderColor: frameColor,
      borderWidth: mmToPt(0.45),
    })

    const headerY = sceneY + 5.2
    const headerLineStartX = sceneX + 22
    const headerLineEndX = sceneX + sceneWidth - 4
    page.drawLine({
      start: { x: mmToPt(headerLineStartX), y: mmToPt(pageHeightMm - headerY) },
      end: { x: mmToPt(headerLineEndX), y: mmToPt(pageHeightMm - headerY) },
      thickness: mmToPt(0.32),
      color: frameColor,
    })

    const contentTop = sceneY + 9
    const contentHeight = sceneHeight - 12
    const textBlockWidth = sceneWidth / 3
    const splitGap = 3
    const textX = sceneX + 2
    const sketchX = textX + textBlockWidth + splitGap
    const sketchWidth = sceneWidth - (textBlockWidth + splitGap + 4)

    page.drawRectangle({
      x: mmToPt(sketchX),
      y: mmToPt(pageHeightMm - contentTop - contentHeight),
      width: mmToPt(sketchWidth),
      height: mmToPt(contentHeight),
      borderColor: frameColor,
      borderWidth: mmToPt(0.35),
    })

    const textLineGap = 5.8
    for (
      let y = contentTop + 4;
      y <= contentTop + contentHeight - 1;
      y += textLineGap
    ) {
      page.drawLine({
        start: { x: mmToPt(textX), y: mmToPt(pageHeightMm - y) },
        end: {
          x: mmToPt(textX + textBlockWidth - 1.8),
          y: mmToPt(pageHeightMm - y),
        },
        thickness: mmToPt(0.2),
        color: frameColor,
      })
    }
  }

  for (let i = 0; i < sceneCount; i += 1) {
    drawScene(rect.y + outerPaddingY + i * (sceneHeight + sceneGap))
  }
}
