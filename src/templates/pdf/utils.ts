export const MM_TO_PT = 2.8346456693

export function mmToPt(mm: number): number {
  return mm * MM_TO_PT
}

export function roundedRectPath(width: number, height: number, radius: number): string {
  const safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2))
  return [
    `M ${safeRadius} 0`,
    `H ${width - safeRadius}`,
    `Q ${width} 0 ${width} ${safeRadius}`,
    `V ${height - safeRadius}`,
    `Q ${width} ${height} ${width - safeRadius} ${height}`,
    `H ${safeRadius}`,
    `Q 0 ${height} 0 ${height - safeRadius}`,
    `V ${safeRadius}`,
    `Q 0 0 ${safeRadius} 0`,
    'Z',
  ].join(' ')
}
