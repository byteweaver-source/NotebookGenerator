import type { PointerEvent as ReactPointerEvent } from 'react'

type ElementKind = 'phone' | 'browser' | 'card' | 'form'

type CustomElement = {
  id: string
  kind: ElementKind
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  assetDataUrl?: string
}

type CustomElementShapeProps = {
  element: CustomElement
  selected: boolean
  onPointerDown: (event: ReactPointerEvent<SVGGElement>) => void
  onResizePointerDown: (event: ReactPointerEvent<SVGRectElement>) => void
  onRotatePointerDown: (event: ReactPointerEvent<SVGGElement>) => void
}

export function CustomElementShape(props: CustomElementShapeProps) {
  const { element, selected, onPointerDown, onResizePointerDown, onRotatePointerDown } = props
  const stroke = selected ? '#1f6cb4' : '#7f8794'
  const strokeWidth = selected ? 0.8 : 0.5
  const handleSize = 4
  const rotation = element.rotation ?? 0
  const centerX = element.x + element.width / 2
  const centerY = element.y + element.height / 2
  const resizeHandleX = element.x + element.width - handleSize / 2
  const resizeHandleY = element.y + element.height - handleSize / 2
  const rotateHandleX = element.x - handleSize / 2
  const rotateHandleY = element.y - handleSize - 2

  return (
    <g onPointerDown={onPointerDown} style={{ cursor: 'move' }}>
      <g transform={`rotate(${rotation} ${centerX} ${centerY})`}>
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

        {selected && (
          <>
            <rect
              x={resizeHandleX}
              y={resizeHandleY}
              width={handleSize}
              height={handleSize}
              rx="1"
              fill="#1f6cb4"
              stroke="#ffffff"
              strokeWidth="0.4"
              style={{ cursor: 'nwse-resize' }}
              onPointerDown={onResizePointerDown}
            />

            <g onPointerDown={onRotatePointerDown} style={{ cursor: 'grab' }}>
              <rect
                x={rotateHandleX}
                y={rotateHandleY}
                width={handleSize}
                height={handleSize}
                rx="1"
                fill="#ffffff"
                stroke="#1f6cb4"
                strokeWidth="0.45"
              />
              <path
                d={`M ${rotateHandleX + 0.9} ${rotateHandleY + 2.9} A 1.2 1.2 0 1 1 ${rotateHandleX + 2.85} ${rotateHandleY + 1.25}`}
                fill="none"
                stroke="#1f6cb4"
                strokeWidth="0.45"
                strokeLinecap="round"
              />
              <path
                d={`M ${rotateHandleX + 2.75} ${rotateHandleY + 0.85} L ${rotateHandleX + 3.45} ${rotateHandleY + 1.2} L ${rotateHandleX + 2.65} ${rotateHandleY + 1.65} Z`}
                fill="#1f6cb4"
              />
            </g>
          </>
        )}
      </g>
    </g>
  )
}
