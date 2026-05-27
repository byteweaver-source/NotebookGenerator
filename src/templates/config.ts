import type { TemplateKey } from './types'

export const templateLabels: Record<TemplateKey, string> = {
  blank: 'Blank (vuoto)',
  dots: 'Puntini',
  lines: 'Righe',
  grid: 'Quadretti',
  isometric: 'Isometrico',
  dialoghi: 'Dialoghi',
  fashionMale: 'Manichino Uomo Front',
  fashionMaleBack: 'Manichino Uomo Back',
  fashionFemale: 'Manichino Donna Front',
  fashionFemaleBack: 'Manichino Donna Back',
  fashionChildUnisex: 'Manichino Bambino Unisex',
  fashionGrid9: 'Griglia Fashion 9-Head',
  uiMobile: 'Mockup UI Mobile',
  uiDesktop: 'Mockup UI Desktop',
}

type TemplateGroup = {
  id: string
  label: string
  templates: TemplateKey[]
  hidden?: boolean
}

export const templateGroups: TemplateGroup[] = [
  {
    id: 'base',
    label: 'Base',
    templates: ['blank', 'dots', 'lines', 'grid', 'isometric'],
  },
  {
    id: 'scenography',
    label: 'Scenografia',
    templates: ['dialoghi'],
  },
  {
    id: 'ui',
    label: 'UI',
    templates: ['uiMobile', 'uiDesktop'],
  },
  {
    id: 'fashion',
    label: 'Fashion',
    hidden: true,
    templates: [
      'fashionMale',
      'fashionMaleBack',
      'fashionFemale',
      'fashionFemaleBack',
      'fashionChildUnisex',
      'fashionGrid9',
    ],
  },
]

export const selectableTemplateGroups = templateGroups.filter((group) => !group.hidden)

const selectableTemplateSet = new Set(
  selectableTemplateGroups.flatMap((group) => group.templates),
)

export function isTemplateSelectable(template: TemplateKey): boolean {
  return selectableTemplateSet.has(template)
}
