import type { PointerEvent as ReactPointerEvent } from 'react'

type ElementKind = 'phone' | 'browser' | 'card' | 'form'

type CustomElement = {
  id: string
  kind: ElementKind
  x: number
  y: number
  width: number
  height: number
  assetDataUrl?: string
}

type CustomElementShapeProps = {
  element: CustomElement
  selected: boolean
  onPointerDown: (event: ReactPointerEvent<SVGGElement>) => void
}

export function CustomElementShape(props: CustomElementShapeProps) {
  const { element, selected, onPointerDown } = props
  const stroke = selected ? '#1f6cb4' : '#7f8794'
  const strokeWidth = selected ? 0.8 : 0.5

  return (
    <g onPointerDown={onPointerDown} style={{ cursor: 'move' }}>
      <rect
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        fill="#fff"
        stroke={stroke}
        strokeWidth={strokeWidth}
        rx="2"
      />

      {element.assetDataUrl && (
        <image
          href={element.assetDataUrl}
          x={element.x + 0.8}
          y={element.y + 0.8}
          width={Math.max(0, element.width - 1.6)}
          height={Math.max(0, element.height - 1.6)}
          preserveAspectRatio="xMidYMid meet"
        />
      )}

      {!element.assetDataUrl && element.kind === 'browser' && (
        <>
          <rect x={element.x} y={element.y} width={element.width} height="8" fill="#eef0f3" />
          <circle cx={element.x + 4} cy={element.y + 4} r="1" fill="#a0a6b1" />
          <circle cx={element.x + 8} cy={element.y + 4} r="1" fill="#a0a6b1" />
        </>
      )}

      {!element.assetDataUrl && element.kind === 'phone' && (
        <>
          <rect x={element.x + 2} y={element.y + 2} width={element.width - 4} height="6" fill="#eef0f3" />
          <line
            x1={element.x + element.width / 2 - 3}
            y1={element.y + element.height - 3}
            x2={element.x + element.width / 2 + 3}
            y2={element.y + element.height - 3}
            stroke="#9aa2af"
            strokeWidth="0.4"
          />
        </>
      )}

      {!element.assetDataUrl && element.kind === 'card' && (
        <>
          <rect
            x={element.x + 3}
            y={element.y + 3}
            width={element.width - 6}
            height="10"
            fill="none"
            stroke="#a0a6b1"
            strokeWidth="0.4"
          />
          <line
            x1={element.x + 3}
            y1={element.y + 17}
            x2={element.x + element.width - 3}
            y2={element.y + 17}
            stroke="#a0a6b1"
            strokeWidth="0.4"
          />
        </>
      )}

      {!element.assetDataUrl && element.kind === 'form' &&
        [0, 1, 2, 3].map((i) => (
          <rect
            key={i}
            x={element.x + 3}
            y={element.y + 4 + i * 12}
            width={element.width - 6}
            height="7"
            fill="none"
            stroke="#a0a6b1"
            strokeWidth="0.4"
          />
        ))}
    </g>
  )
}
