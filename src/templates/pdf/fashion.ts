import { rgb, type PDFPage } from 'pdf-lib'
import type { MmRect } from '../types'
import { mmToPt } from './utils'

const lineColor = rgb(0.78, 0.8, 0.84)
const darkColor = rgb(0.55, 0.58, 0.64)

export function drawFashionTemplatePdf(
  page: PDFPage,
  template: 'fashionMale' | 'fashionMaleBack' | 'fashionFemale' | 'fashionFemaleBack' | 'fashionChildUnisex' | 'fashionGrid9',
  rect: MmRect,
): void {
  const pageHeightMm = page.getSize().height / 2.8346456693

  if (template === 'fashionGrid9') {
    const top = rect.y + 6
    const bottom = rect.y + rect.height - 6
    const centerX = rect.x + rect.width / 2
    const step = (bottom - top) / 9

    for (let i = 0; i <= 9; i += 1) {
      const y = top + i * step
      page.drawLine({
        start: { x: mmToPt(rect.x), y: mmToPt(pageHeightMm - y) },
        end: { x: mmToPt(rect.x + rect.width), y: mmToPt(pageHeightMm - y) },
        thickness: mmToPt(i === 0 || i === 9 ? 0.35 : 0.2),
        color: i === 0 || i === 9 ? darkColor : lineColor,
      })
    }

    page.drawLine({
      start: { x: mmToPt(centerX), y: mmToPt(pageHeightMm - top) },
      end: { x: mmToPt(centerX), y: mmToPt(pageHeightMm - bottom) },
      thickness: mmToPt(0.22),
      color: lineColor,
    })
    return
  }

  const centerX = rect.x + rect.width / 2
  const topY = rect.y + 10
  const ankleY = rect.y + rect.height - 8
  const isMale = template === 'fashionMale' || template === 'fashionMaleBack'
  const isBack = template === 'fashionMaleBack' || template === 'fashionFemaleBack'
  const isChild = template === 'fashionChildUnisex'

  const headRadius = isChild ? 4.8 : 4.1
  const shoulderHalf = isChild ? 9 : isMale ? 11.5 : 10.1
  const waistHalf = isChild ? 7.2 : isMale ? 8.2 : 6.7
  const hipHalf = isChild ? 8 : isMale ? 7.3 : 8.7
  const torsoTop = topY + headRadius * 2 + 1
  const waistY = torsoTop + (isChild ? 16 : 19)
  const hipY = waistY + (isChild ? 8 : 10)
  const kneeY = hipY + (ankleY - hipY) * 0.5

  page.drawCircle({
    x: mmToPt(centerX),
    y: mmToPt(pageHeightMm - topY),
    size: mmToPt(headRadius),
    borderColor: darkColor,
    borderWidth: mmToPt(0.4),
  })

  page.drawLine({
    start: { x: mmToPt(centerX), y: mmToPt(pageHeightMm - (topY + headRadius)) },
    end: { x: mmToPt(centerX), y: mmToPt(pageHeightMm - ankleY) },
    thickness: mmToPt(0.25),
    color: lineColor,
  })

  page.drawLine({
    start: { x: mmToPt(centerX - shoulderHalf), y: mmToPt(pageHeightMm - torsoTop) },
    end: { x: mmToPt(centerX + shoulderHalf), y: mmToPt(pageHeightMm - torsoTop) },
    thickness: mmToPt(0.34),
    color: darkColor,
  })

  page.drawLine({
    start: { x: mmToPt(centerX - shoulderHalf), y: mmToPt(pageHeightMm - torsoTop) },
    end: { x: mmToPt(centerX - waistHalf), y: mmToPt(pageHeightMm - waistY) },
    thickness: mmToPt(0.34),
    color: darkColor,
  })
  page.drawLine({
    start: { x: mmToPt(centerX + shoulderHalf), y: mmToPt(pageHeightMm - torsoTop) },
    end: { x: mmToPt(centerX + waistHalf), y: mmToPt(pageHeightMm - waistY) },
    thickness: mmToPt(0.34),
    color: darkColor,
  })
  page.drawLine({
    start: { x: mmToPt(centerX - waistHalf), y: mmToPt(pageHeightMm - waistY) },
    end: { x: mmToPt(centerX - hipHalf), y: mmToPt(pageHeightMm - hipY) },
    thickness: mmToPt(0.34),
    color: darkColor,
  })
  page.drawLine({
    start: { x: mmToPt(centerX + waistHalf), y: mmToPt(pageHeightMm - waistY) },
    end: { x: mmToPt(centerX + hipHalf), y: mmToPt(pageHeightMm - hipY) },
    thickness: mmToPt(0.34),
    color: darkColor,
  })

  const armDrop = isChild ? 19 : 24
  const armSpread = isBack ? 8 : 6
  page.drawLine({
    start: { x: mmToPt(centerX - shoulderHalf), y: mmToPt(pageHeightMm - (torsoTop + 1)) },
    end: { x: mmToPt(centerX - (shoulderHalf + armSpread)), y: mmToPt(pageHeightMm - (torsoTop + armDrop)) },
    thickness: mmToPt(0.28),
    color: lineColor,
  })
  page.drawLine({
    start: { x: mmToPt(centerX + shoulderHalf), y: mmToPt(pageHeightMm - (torsoTop + 1)) },
    end: { x: mmToPt(centerX + (shoulderHalf + armSpread)), y: mmToPt(pageHeightMm - (torsoTop + armDrop)) },
    thickness: mmToPt(0.28),
    color: lineColor,
  })

  const kneeOffset = isBack ? 2.5 : 1.7
  page.drawLine({
    start: { x: mmToPt(centerX - hipHalf + 0.8), y: mmToPt(pageHeightMm - hipY) },
    end: { x: mmToPt(centerX - kneeOffset), y: mmToPt(pageHeightMm - kneeY) },
    thickness: mmToPt(0.32),
    color: darkColor,
  })
  page.drawLine({
    start: { x: mmToPt(centerX - kneeOffset), y: mmToPt(pageHeightMm - kneeY) },
    end: { x: mmToPt(centerX - 0.8), y: mmToPt(pageHeightMm - ankleY) },
    thickness: mmToPt(0.32),
    color: darkColor,
  })
  page.drawLine({
    start: { x: mmToPt(centerX + hipHalf - 0.8), y: mmToPt(pageHeightMm - hipY) },
    end: { x: mmToPt(centerX + kneeOffset), y: mmToPt(pageHeightMm - kneeY) },
    thickness: mmToPt(0.32),
    color: darkColor,
  })
  page.drawLine({
    start: { x: mmToPt(centerX + kneeOffset), y: mmToPt(pageHeightMm - kneeY) },
    end: { x: mmToPt(centerX + 0.8), y: mmToPt(pageHeightMm - ankleY) },
    thickness: mmToPt(0.32),
    color: darkColor,
  })
}
