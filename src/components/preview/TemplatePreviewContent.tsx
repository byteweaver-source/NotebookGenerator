import type { MmRect, TemplateKey } from '../../templates/types'

const dialoghiRowCounts: Partial<Record<TemplateKey, number>> = {
  dialoghi2: 2,
  dialoghi3: 3,
  dialoghi: 4,
  dialoghi6: 6,
}

type TemplatePreviewContentProps = {
  page: { width: number; height: number }
  previewContent: MmRect
  activeTemplate: TemplateKey
  dialoghiParametricActors: Array<{ color: string }>
}

export function TemplatePreviewContent(props: TemplatePreviewContentProps) {
  const { page, previewContent, activeTemplate, dialoghiParametricActors } = props

  return (
    <>
      <defs>
        <pattern id="p-dots" width="5" height="5" patternUnits="userSpaceOnUse">
          <circle cx="2.5" cy="2.5" r="0.45" fill="#b9bdc4" />
        </pattern>
        <pattern id="p-lines" width="7" height="7" patternUnits="userSpaceOnUse">
          <path d="M 0 0 L 7 0" stroke="#c7cbd2" strokeWidth="0.25" />
        </pattern>
        <pattern id="p-grid" width="5" height="5" patternUnits="userSpaceOnUse">
          <path d="M 0 0 L 5 0 M 0 0 L 0 5" stroke="#c7cbd2" strokeWidth="0.2" />
        </pattern>
        <pattern id="p-iso" width="16" height="13.86" patternUnits="userSpaceOnUse">
          <path d="M 0 13.86 L 8 0 L 16 13.86" fill="none" stroke="#c7cbd2" strokeWidth="0.2" />
          <path d="M 0 4.62 L 16 4.62" fill="none" stroke="#c7cbd2" strokeWidth="0.2" />
        </pattern>
      </defs>

      <rect x="0" y="0" width={page.width} height={page.height} fill="#fefdf8" />
      <rect
        x={previewContent.x}
        y={previewContent.y}
        width={previewContent.width}
        height={previewContent.height}
        fill={
          activeTemplate === 'blank'
            ? '#ffffff'
            : activeTemplate === 'dots'
              ? 'url(#p-dots)'
              : activeTemplate === 'lines'
                ? 'url(#p-lines)'
                : activeTemplate === 'grid'
                  ? 'url(#p-grid)'
                  : activeTemplate === 'isometric'
                    ? 'url(#p-iso)'
                    : '#ffffff'
        }
      />

      {activeTemplate === 'fashionGrid9' && (
        <g stroke="#c4c9d1" fill="none">
          {(() => {
            const top = previewContent.y + 6
            const bottom = previewContent.y + previewContent.height - 6
            const step = (bottom - top) / 9
            const centerX = previewContent.x + previewContent.width / 2
            return (
              <>
                {Array.from({ length: 10 }, (_, i) => {
                  const y = top + i * step
                  return (
                    <line
                      key={`g9-${i}`}
                      x1={previewContent.x}
                      y1={y}
                      x2={previewContent.x + previewContent.width}
                      y2={y}
                      strokeWidth={i === 0 || i === 9 ? 0.35 : 0.2}
                      stroke={i === 0 || i === 9 ? '#8a909c' : '#c4c9d1'}
                    />
                  )
                })}
                <line x1={centerX} y1={top} x2={centerX} y2={bottom} strokeWidth="0.25" />
              </>
            )
          })()}
        </g>
      )}

      {(activeTemplate === 'fashionMale' ||
        activeTemplate === 'fashionMaleBack' ||
        activeTemplate === 'fashionFemale' ||
        activeTemplate === 'fashionFemaleBack' ||
        activeTemplate === 'fashionChildUnisex') && (
        <g stroke="#8a909c" fill="none">
          {(() => {
            const cx = previewContent.x + previewContent.width / 2
            const topY = previewContent.y + 10
            const ankleY = previewContent.y + previewContent.height - 8
            const isMale = activeTemplate === 'fashionMale' || activeTemplate === 'fashionMaleBack'
            const isBack = activeTemplate === 'fashionMaleBack' || activeTemplate === 'fashionFemaleBack'
            const isChild = activeTemplate === 'fashionChildUnisex'
            const headRadius = isChild ? 4.8 : 4.1
            const shoulderHalf = isChild ? 9 : isMale ? 11.5 : 10.1
            const waistHalf = isChild ? 7.2 : isMale ? 8.2 : 6.7
            const hipHalf = isChild ? 8 : isMale ? 7.3 : 8.7
            const torsoTop = topY + headRadius * 2 + 1
            const waistY = torsoTop + (isChild ? 16 : 19)
            const hipY = waistY + (isChild ? 8 : 10)
            const kneeY = hipY + (ankleY - hipY) * 0.5
            const armDrop = isChild ? 19 : 24
            const armSpread = isBack ? 8 : 6
            const kneeOffset = isBack ? 2.5 : 1.7
            return (
              <>
                <circle cx={cx} cy={topY} r={headRadius} strokeWidth="0.45" />
                <line x1={cx} y1={topY + headRadius} x2={cx} y2={ankleY} stroke="#c4c9d1" strokeWidth="0.25" />
                <line x1={cx - shoulderHalf} y1={torsoTop} x2={cx + shoulderHalf} y2={torsoTop} strokeWidth="0.35" />
                <line x1={cx - shoulderHalf} y1={torsoTop} x2={cx - waistHalf} y2={waistY} strokeWidth="0.35" />
                <line x1={cx + shoulderHalf} y1={torsoTop} x2={cx + waistHalf} y2={waistY} strokeWidth="0.35" />
                <line x1={cx - waistHalf} y1={waistY} x2={cx - hipHalf} y2={hipY} strokeWidth="0.35" />
                <line x1={cx + waistHalf} y1={waistY} x2={cx + hipHalf} y2={hipY} strokeWidth="0.35" />
                <line x1={cx - shoulderHalf} y1={torsoTop + 1} x2={cx - (shoulderHalf + armSpread)} y2={torsoTop + armDrop} stroke="#c4c9d1" strokeWidth="0.28" />
                <line x1={cx + shoulderHalf} y1={torsoTop + 1} x2={cx + (shoulderHalf + armSpread)} y2={torsoTop + armDrop} stroke="#c4c9d1" strokeWidth="0.28" />
                <line x1={cx - hipHalf + 0.8} y1={hipY} x2={cx - kneeOffset} y2={kneeY} strokeWidth="0.35" />
                <line x1={cx - kneeOffset} y1={kneeY} x2={cx - 0.8} y2={ankleY} strokeWidth="0.35" />
                <line x1={cx + hipHalf - 0.8} y1={hipY} x2={cx + kneeOffset} y2={kneeY} strokeWidth="0.35" />
                <line x1={cx + kneeOffset} y1={kneeY} x2={cx + 0.8} y2={ankleY} strokeWidth="0.35" />
              </>
            )
          })()}
        </g>
      )}

      {(dialoghiRowCounts[activeTemplate] || activeTemplate === 'dialoghiParametric') && (
        <g stroke="#8c919c" fill="#f7f9fc" strokeWidth="0.45">
          {(() => {
            const isParametric = activeTemplate === 'dialoghiParametric'
            const rowCount = isParametric
              ? Math.max(
                  2,
                  Math.floor((previewContent.height - 14 + 6) / (28 + 6)),
                )
              : (dialoghiRowCounts[activeTemplate] ?? 4)
            const outerPaddingX = 5
            const outerPaddingY = 7
            const rowGap = 6
            const rowHeight =
              (previewContent.height - outerPaddingY * 2 - rowGap * (rowCount - 1)) /
              rowCount
            const actorWidth = 34
            const actorPadding = 2.5
            const balloonGap = 4
            const actorColors = dialoghiParametricActors.map((actor) => actor.color)
            const headerY = previewContent.y + 5.2
            const headerLineStartX = previewContent.x + outerPaddingX + 22
            const headerLineEndX =
              previewContent.x + previewContent.width - outerPaddingX - 4

            return (
              <>
                <line
                  x1={headerLineStartX}
                  y1={headerY}
                  x2={headerLineEndX}
                  y2={headerY}
                  strokeWidth="0.32"
                />
                {Array.from({ length: rowCount }, (_, i) => {
                  const rowY = previewContent.y + outerPaddingY + i * (rowHeight + rowGap)
                  const alignRight = i % 2 === 1
                  const actorX = alignRight
                    ? previewContent.x + previewContent.width - outerPaddingX - actorWidth
                    : previewContent.x + outerPaddingX
                  const balloonX = alignRight
                    ? previewContent.x + outerPaddingX
                    : actorX + actorWidth + balloonGap
                  const balloonWidth =
                    previewContent.width - outerPaddingX * 2 - actorWidth - balloonGap
                  const balloonY = rowY + actorPadding
                  const balloonHeight = rowHeight - actorPadding * 2 - 2
                  const centerX = actorX + actorWidth / 2
                  const headCenterY = rowY + 8
                  const shoulderY = rowY + 18
                  const nameLineY = rowY + 25
                  const descriptionStartY = nameLineY + 7.5
                  const nameStartX = actorX + (isParametric ? 8 : 2)
                  const actorColor = actorColors[i % Math.max(1, actorColors.length)]
                  const tailMidY = balloonY + 8.5
                  const topJoinY = tailMidY - 2.6
                  const bottomJoinY = tailMidY + 2.6
                  const writingStartY = balloonY + 8
                  const radius = 2.2
                  const localTailY = tailMidY + 3 - balloonY
                  const localTopJoinY = topJoinY - balloonY
                  const localBottomJoinY = bottomJoinY - balloonY
                  const balloonPath = alignRight
                    ? [
                        `M ${radius} 0`,
                        `H ${balloonWidth - radius}`,
                        `Q ${balloonWidth} 0 ${balloonWidth} ${radius}`,
                        `V ${localTopJoinY}`,
                        `L ${balloonWidth + 6} ${localTailY}`,
                        `L ${balloonWidth} ${localBottomJoinY}`,
                        `V ${balloonHeight - radius}`,
                        `Q ${balloonWidth} ${balloonHeight} ${balloonWidth - radius} ${balloonHeight}`,
                        `H ${radius}`,
                        `Q 0 ${balloonHeight} 0 ${balloonHeight - radius}`,
                        `V ${radius}`,
                        `Q 0 0 ${radius} 0`,
                        'Z',
                      ].join(' ')
                    : [
                        `M ${radius} 0`,
                        `H ${balloonWidth - radius}`,
                        `Q ${balloonWidth} 0 ${balloonWidth} ${radius}`,
                        `V ${balloonHeight - radius}`,
                        `Q ${balloonWidth} ${balloonHeight} ${balloonWidth - radius} ${balloonHeight}`,
                        `H ${radius}`,
                        `Q 0 ${balloonHeight} 0 ${balloonHeight - radius}`,
                        `V ${localBottomJoinY}`,
                        `L -6 ${localTailY}`,
                        `L 0 ${localTopJoinY}`,
                        `V ${radius}`,
                        `Q 0 0 ${radius} 0`,
                        'Z',
                      ].join(' ')

                  return (
                    <g key={`dialog-row-${i}`}>
                      {isParametric && (
                        <rect
                          x={actorX + 1}
                          y={rowY + 4.5}
                          width={actorWidth - 2}
                          height={16}
                          rx="3.5"
                          fill={actorColor}
                          fillOpacity="0.25"
                          stroke="none"
                        />
                      )}
                      <circle cx={centerX} cy={headCenterY} r="5.2" fill="none" />
                      <path
                        d={`M ${centerX - 11} ${shoulderY} Q ${centerX} ${shoulderY - 5} ${centerX + 11} ${shoulderY}`}
                        fill="none"
                      />
                      {isParametric && (
                        <circle
                          cx={actorX + 4.2}
                          cy={nameLineY - 1.2}
                          r="1.2"
                          fill={actorColor}
                          stroke="#8c919c"
                          strokeWidth="0.2"
                        />
                      )}
                      <line
                        x1={nameStartX}
                        y1={nameLineY}
                        x2={actorX + actorWidth - 2}
                        y2={nameLineY}
                      />
                      {Array.from({ length: 5 }, (_, lineIndex) => (
                        <line
                          key={`dialog-desc-${i}-${lineIndex}`}
                          x1={actorX + 2}
                          y1={descriptionStartY + lineIndex * 3.9}
                          x2={actorX + actorWidth - 2}
                          y2={descriptionStartY + lineIndex * 3.9}
                          strokeWidth="0.18"
                        />
                      ))}
                      <path
                        d={balloonPath}
                        transform={`translate(${balloonX} ${balloonY})`}
                      />
                      {Array.from({ length: 8 }, (_, lineIndex) => {
                        const lineY = writingStartY + lineIndex * 5.2
                        if (lineY >= balloonY + balloonHeight - 3) {
                          return null
                        }
                        return (
                          <line
                            key={`dialog-write-${i}-${lineIndex}`}
                            x1={balloonX + 4}
                            y1={lineY}
                            x2={balloonX + balloonWidth - 4}
                            y2={lineY}
                            strokeWidth="0.18"
                          />
                        )
                      })}
                    </g>
                  )
                })}
              </>
            )
          })()}
        </g>
      )}

      {activeTemplate === 'storyboard' && (
        <g stroke="#8c919c" fill="#f7f9fc" strokeWidth="0.4">
          {(() => {
            const sceneCount = 3
            const outerPaddingX = 4
            const outerPaddingY = 6
            const sceneGap = 6
            const sceneWidth = previewContent.width - outerPaddingX * 2
            const sceneHeight =
              (previewContent.height - outerPaddingY * 2 - sceneGap * (sceneCount - 1)) /
              sceneCount

            return (
              <>
                {Array.from({ length: sceneCount }, (_, i) => {
                  const sceneX = previewContent.x + outerPaddingX
                  const sceneY =
                    previewContent.y + outerPaddingY + i * (sceneHeight + sceneGap)
                  const headerY = sceneY + 5.2
                  const textBlockWidth = sceneWidth / 3
                  const splitGap = 3
                  const textX = sceneX + 2
                  const contentTop = sceneY + 9
                  const contentHeight = sceneHeight - 12
                  const sketchX = textX + textBlockWidth + splitGap
                  const sketchWidth = sceneWidth - (textBlockWidth + splitGap + 4)

                  return (
                    <g key={`story-scene-${i}`}>
                      <rect
                        x={sceneX}
                        y={sceneY}
                        width={sceneWidth}
                        height={sceneHeight}
                      />
                      <line
                        x1={sceneX + 22}
                        y1={headerY}
                        x2={sceneX + sceneWidth - 4}
                        y2={headerY}
                        strokeWidth="0.32"
                      />
                      <rect
                        x={sketchX}
                        y={contentTop}
                        width={sketchWidth}
                        height={contentHeight}
                        fill="none"
                        strokeWidth="0.35"
                      />
                      {Array.from(
                        {
                          length: Math.max(1, Math.floor((contentHeight - 4) / 5.8)),
                        },
                        (_, lineIndex) => {
                          const lineY = contentTop + 4 + lineIndex * 5.8
                          return (
                            <line
                              key={`story-line-${i}-${lineIndex}`}
                              x1={textX}
                              y1={lineY}
                              x2={textX + textBlockWidth - 1.8}
                              y2={lineY}
                              strokeWidth="0.2"
                            />
                          )
                        },
                      )}
                    </g>
                  )
                })}
              </>
            )
          })()}
        </g>
      )}

      {activeTemplate === 'uiUseCase' && (() => {
        const actorMargin = previewContent.width * (16 / 210)
        const titleLineY = previewContent.y + previewContent.height * (8 / 277)
        const boxY = previewContent.y + previewContent.height * (15 / 277)
        const boxHeight = previewContent.height * 0.50
        const boxX = previewContent.x + actorMargin
        const boxWidth = previewContent.width - actorMargin * 2
        const linesTop = boxY + boxHeight + previewContent.height * (6 / 277)
        const lineGap = previewContent.height * (5.5 / 277)
        return (
          <g stroke="#8c919c" fill="none" strokeWidth="0.4">
            <line
              x1={previewContent.x + 2}
              y1={titleLineY}
              x2={previewContent.x + previewContent.width - 2}
              y2={titleLineY}
              stroke="#6b7280"
            />
            <rect
              x={boxX}
              y={boxY}
              width={boxWidth}
              height={boxHeight}
              stroke="#6b7280"
              strokeWidth="0.6"
            />
            {Array.from({ length: Math.floor((previewContent.y + previewContent.height - 2 - linesTop) / lineGap) }).map((_, i) => (
              <line
                key={i}
                x1={previewContent.x + 2}
                y1={linesTop + i * lineGap}
                x2={previewContent.x + previewContent.width - 2}
                y2={linesTop + i * lineGap}
                strokeWidth="0.25"
              />
            ))}
          </g>
        )
      })()}

      {activeTemplate === 'projectCover' && (() => {
        const titleY = previewContent.y + previewContent.height * 0.33
        const subtitleY = previewContent.y + previewContent.height * 0.46
        const dividerY = previewContent.y + previewContent.height * 0.57
        const dateY = previewContent.y + previewContent.height * 0.89
        return (
          <g fill="none" strokeWidth="0.4">
            <rect
              x={previewContent.x}
              y={previewContent.y}
              width={previewContent.width}
              height={previewContent.height * (3 / 277)}
              fill="#6b7280"
              stroke="none"
            />
            <line
              x1={previewContent.x + 4} y1={titleY}
              x2={previewContent.x + previewContent.width - 4} y2={titleY}
              stroke="#6b7280" strokeWidth="0.8"
            />
            <line
              x1={previewContent.x + 4} y1={subtitleY}
              x2={previewContent.x + previewContent.width - 14} y2={subtitleY}
              stroke="#6b7280" strokeWidth="0.5"
            />
            <line
              x1={previewContent.x + 4} y1={dividerY}
              x2={previewContent.x + previewContent.width - 4} y2={dividerY}
              stroke="#c8cdd6" strokeWidth="0.3"
            />
            {[0, 1].map((i) => (
              <line
                key={i}
                x1={previewContent.x + 4}
                y1={previewContent.y + previewContent.height * (0.66 + i * 0.09)}
                x2={previewContent.x + previewContent.width - 22}
                y2={previewContent.y + previewContent.height * (0.66 + i * 0.09)}
                stroke="#6b7280" strokeWidth="0.4"
              />
            ))}
            <line
              x1={previewContent.x + previewContent.width * 0.55} y1={dateY}
              x2={previewContent.x + previewContent.width - 4} y2={dateY}
              stroke="#8c919c" strokeWidth="0.35"
            />
          </g>
        )
      })()}

      {activeTemplate === 'projectChecklist' && (() => {
        const checkboxSize = previewContent.height * (8 / 277)
        const checkboxLeft = previewContent.x + previewContent.width * (3 / 210)
        const textLeft = previewContent.x + previewContent.width * (15 / 210)
        const textRight = previewContent.x + previewContent.width - previewContent.width * (3 / 210)
        const lineGap = previewContent.height * (6 / 277)
        const textAreaH = 3 * lineGap
        const checkboxTopOffset = (textAreaH - checkboxSize) / 2
        const itemPitch = textAreaH + previewContent.height * (4 / 277)
        const items: number[] = []
        for (
          let itemTop = previewContent.y + previewContent.height * (4 / 277);
          itemTop + textAreaH <= previewContent.y + previewContent.height - 2;
          itemTop += itemPitch
        ) {
          items.push(itemTop)
        }
        return (
          <g fill="none">
            {items.map((itemTop, idx) => (
              <g key={idx}>
                <rect
                  x={checkboxLeft}
                  y={itemTop + checkboxTopOffset}
                  width={checkboxSize}
                  height={checkboxSize}
                  stroke="#8c919c"
                  strokeWidth="0.45"
                />
                {[0, 1, 2].map((j) => (
                  <line
                    key={j}
                    x1={textLeft}
                    y1={itemTop + (j + 1) * lineGap}
                    x2={textRight}
                    y2={itemTop + (j + 1) * lineGap}
                    stroke="#c8cdd6"
                    strokeWidth="0.3"
                  />
                ))}
              </g>
            ))}
          </g>
        )
      })()}

      {(activeTemplate === 'uiMobile' || activeTemplate === 'uiDesktop') && (
        <g stroke="#8c919c" fill="none" strokeWidth="0.4">
          {activeTemplate === 'uiMobile' ? (
            <>
              <rect
                x={previewContent.x + previewContent.width * 0.2}
                y={previewContent.y + 8}
                width={previewContent.width * 0.6}
                height={previewContent.height - 16}
                rx="3"
              />
              <rect
                x={previewContent.x + previewContent.width * 0.2 + 4}
                y={previewContent.y + 12}
                width={previewContent.width * 0.6 - 8}
                height="10"
                fill="#eef0f3"
              />
              {[0, 1, 2, 3].map((i) => (
                <rect
                  key={i}
                  x={previewContent.x + previewContent.width * 0.2 + 4}
                  y={previewContent.y + 30 + i * 24}
                  width={previewContent.width * 0.6 - 8}
                  height="18"
                />
              ))}
            </>
          ) : (
            <>
              <rect
                x={previewContent.x + 4}
                y={previewContent.y + 6}
                width={previewContent.width - 8}
                height={previewContent.height - 12}
                rx="2"
              />
              <rect
                x={previewContent.x + 4}
                y={previewContent.y + 6}
                width={previewContent.width - 8}
                height="10"
                fill="#eef0f3"
              />
              <rect
                x={previewContent.x + 10}
                y={previewContent.y + 18}
                width={previewContent.width - 20}
                height="26"
              />
              <rect
                x={previewContent.x + 10}
                y={previewContent.y + 50}
                width={(previewContent.width - 26) / 2}
                height="32"
              />
              <rect
                x={previewContent.x + 16 + (previewContent.width - 26) / 2}
                y={previewContent.y + 50}
                width={(previewContent.width - 26) / 2}
                height="32"
              />
            </>
          )}
        </g>
      )}
    </>
  )
}
