import { rgb, type PDFPage } from 'pdf-lib'
import type { MmRect } from '../types'
import { mmToPt } from './utils'

const frameColor = rgb(0.53, 0.56, 0.61)
const fillColor = rgb(0.97, 0.98, 0.99)
const dialoghiRowCounts = {
  dialoghi2: 2,
  dialoghi3: 3,
  dialoghi: 4,
  dialoghi6: 6,
} as const

export function drawScenographyTemplatePdf(
  page: PDFPage,
  template: keyof typeof dialoghiRowCounts | 'storyboard',
  rect: MmRect,
): void {
  const pageHeightMm = page.getSize().height / 2.8346456693

  if (template in dialoghiRowCounts) {
    const rowCount = dialoghiRowCounts[template as keyof typeof dialoghiRowCounts]
    const outerPaddingX = 5
    const outerPaddingY = 7
    const rowGap = 6
    const rowHeight = (rect.height - outerPaddingY * 2 - rowGap * (rowCount - 1)) / rowCount
    const actorWidth = 34
    const actorPadding = 2.5
    const balloonGap = 4

    const drawActor = (x: number, y: number) => {
      const centerX = x + actorWidth / 2
      const headRadius = 5.2
      const headCenterY = y + 8
      const shoulderY = y + 18
      const shoulderHalf = 11
      const nameLineY = y + 25
      const descriptionStartY = nameLineY + 7.5
      const descriptionLineGap = 3.9
      const nameStartX = x + 2
      const nameEndX = x + actorWidth - 2

      page.drawCircle({
        x: mmToPt(centerX),
        y: mmToPt(pageHeightMm - headCenterY),
        size: mmToPt(headRadius),
        borderColor: frameColor,
        borderWidth: mmToPt(0.4),
      })

      page.drawLine({
        start: { x: mmToPt(centerX - shoulderHalf), y: mmToPt(pageHeightMm - shoulderY) },
        end: { x: mmToPt(centerX), y: mmToPt(pageHeightMm - (shoulderY - 5)) },
        thickness: mmToPt(0.4),
        color: frameColor,
      })
      page.drawLine({
        start: { x: mmToPt(centerX), y: mmToPt(pageHeightMm - (shoulderY - 5)) },
        end: { x: mmToPt(centerX + shoulderHalf), y: mmToPt(pageHeightMm - shoulderY) },
        thickness: mmToPt(0.4),
        color: frameColor,
      })
      page.drawLine({
        start: { x: mmToPt(centerX - shoulderHalf + 2), y: mmToPt(pageHeightMm - (shoulderY + 2.5)) },
        end: { x: mmToPt(centerX + shoulderHalf - 2), y: mmToPt(pageHeightMm - (shoulderY + 2.5)) },
        thickness: mmToPt(0.25),
        color: frameColor,
      })

      page.drawLine({
        start: { x: mmToPt(nameStartX), y: mmToPt(pageHeightMm - nameLineY) },
        end: { x: mmToPt(nameEndX), y: mmToPt(pageHeightMm - nameLineY) },
        thickness: mmToPt(0.25),
        color: frameColor,
      })

      for (let i = 0; i < 5; i += 1) {
        const lineY = descriptionStartY + i * descriptionLineGap
        page.drawLine({
          start: { x: mmToPt(nameStartX), y: mmToPt(pageHeightMm - lineY) },
          end: { x: mmToPt(nameEndX), y: mmToPt(pageHeightMm - lineY) },
          thickness: mmToPt(0.18),
          color: frameColor,
        })
      }

      return { attachX: x + actorWidth / 2, attachY: y + 18 }
    }

    const drawBalloon = (x: number, y: number, width: number, height: number, tailToLeft: boolean) => {
      const tailMidY = y + 8.5
      const topJoinY = tailMidY - 2.6
      const bottomJoinY = tailMidY + 2.6
      const radius = 2.2

      const localTailY = tailMidY + 3 - y
      const localTopJoinY = topJoinY - y
      const localBottomJoinY = bottomJoinY - y

      const balloonPath = tailToLeft
        ? [
            `M ${radius} 0`,
            `H ${width - radius}`,
            `Q ${width} 0 ${width} ${radius}`,
            `V ${height - radius}`,
            `Q ${width} ${height} ${width - radius} ${height}`,
            `H ${radius}`,
            `Q 0 ${height} 0 ${height - radius}`,
            `V ${localBottomJoinY}`,
            `L -6 ${localTailY}`,
            `L 0 ${localTopJoinY}`,
            `V ${radius}`,
            `Q 0 0 ${radius} 0`,
            'Z',
          ].join(' ')
        : [
            `M ${radius} 0`,
            `H ${width - radius}`,
            `Q ${width} 0 ${width} ${radius}`,
            `V ${localTopJoinY}`,
            `L ${width + 6} ${localTailY}`,
            `L ${width} ${localBottomJoinY}`,
            `V ${height - radius}`,
            `Q ${width} ${height} ${width - radius} ${height}`,
            `H ${radius}`,
            `Q 0 ${height} 0 ${height - radius}`,
            `V ${radius}`,
            `Q 0 0 ${radius} 0`,
            'Z',
          ].join(' ')

      page.drawSvgPath(balloonPath, {
        x: mmToPt(x),
        y: mmToPt(pageHeightMm - y - height),
        color: fillColor,
        borderColor: frameColor,
        borderWidth: mmToPt(0.45),
      })

      const writingStartY = y + 8
      const writingLineGap = 5.2
      for (let i = 0; i < 8; i += 1) {
        const lineY = writingStartY + i * writingLineGap
        if (lineY < y + height - 3) {
          page.drawLine({
            start: { x: mmToPt(x + 4), y: mmToPt(pageHeightMm - lineY) },
            end: { x: mmToPt(x + width - 4), y: mmToPt(pageHeightMm - lineY) },
            thickness: mmToPt(0.18),
            color: frameColor,
          })
        }
      }
    }

    for (let i = 0; i < rowCount; i += 1) {
      const rowY = rect.y + outerPaddingY + i * (rowHeight + rowGap)
      const alignRight = i % 2 === 1
      const actorX = alignRight
        ? rect.x + rect.width - outerPaddingX - actorWidth
        : rect.x + outerPaddingX
      const balloonX = alignRight
        ? rect.x + outerPaddingX
        : actorX + actorWidth + balloonGap
      const balloonWidth = rect.width - outerPaddingX * 2 - actorWidth - balloonGap
      const balloonY = rowY + actorPadding
      const balloonHeight = rowHeight - actorPadding * 2 - 2

      drawActor(actorX, rowY)
      drawBalloon(balloonX, balloonY, balloonWidth, balloonHeight, !alignRight)
    }
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
