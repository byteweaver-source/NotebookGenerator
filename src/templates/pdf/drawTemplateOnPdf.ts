import type { PDFPage } from 'pdf-lib'
import type { MmRect, TemplateKey } from '../types'
import { drawBasicTemplatePdf } from './basic'
import { drawFashionTemplatePdf } from './fashion'
import { drawScenographyTemplatePdf } from './scenography'
import { drawUiTemplatePdf } from './ui'

export function drawTemplateOnPdf(page: PDFPage, template: TemplateKey, rect: MmRect): void {
  if (
    template === 'blank' ||
    template === 'dots' ||
    template === 'lines' ||
    template === 'grid' ||
    template === 'isometric'
  ) {
    drawBasicTemplatePdf(page, template, rect)
    return
  }

  if (
    template === 'fashionMale' ||
    template === 'fashionMaleBack' ||
    template === 'fashionFemale' ||
    template === 'fashionFemaleBack' ||
    template === 'fashionChildUnisex' ||
    template === 'fashionGrid9'
  ) {
    drawFashionTemplatePdf(page, template, rect)
    return
  }

  if (
    template === 'dialoghi2' ||
    template === 'dialoghi3' ||
    template === 'dialoghi' ||
    template === 'dialoghi6' ||
    template === 'storyboard'
  ) {
    drawScenographyTemplatePdf(page, template, rect)
    return
  }

  drawUiTemplatePdf(page, template, rect)
}
