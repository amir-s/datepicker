import * as React from "react"

import type { TimelineChartContext } from "@amir-s/datepicker"

const MS_PER_DAY = 86_400_000

function toDayNumber(date: Date) {
  return Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MS_PER_DAY
  )
}

function addDays(date: Date, amount: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  next.setHours(0, 0, 0, 0)
  return next
}

function activityFor(date: Date) {
  const day = toDayNumber(date)
  const wave = Math.sin(day * 0.43) * 0.22 + Math.cos(day * 0.17) * 0.15
  const pulse = Math.sin(day * 0.07 + 1.8) * 0.18
  return Math.max(0.08, Math.min(0.94, 0.48 + wave + pulse))
}

export function TimelineUsageChart({
  viewport,
  width,
  height,
  x,
  isInteracting,
}: TimelineChartContext) {
  const gradientId = React.useId().replaceAll(":", "")
  const totalDays = Math.max(
    1,
    toDayNumber(viewport.to) - toDayNumber(viewport.from) + 1
  )
  const sampleCount = Math.min(90, totalDays)
  const chartTop = 12
  const chartBottom = Math.max(chartTop + 1, height - 14)
  const chartHeight = chartBottom - chartTop

  const points = React.useMemo(() => {
    return Array.from({ length: sampleCount }, (_, index) => {
      const ratio = sampleCount === 1 ? 0 : index / (sampleCount - 1)
      const dayOffset = Math.round(ratio * (totalDays - 1))
      const date = addDays(viewport.from, dayOffset)
      return {
        x: x(date, "center"),
        y: chartBottom - activityFor(date) * chartHeight,
      }
    })
  }, [chartBottom, chartHeight, sampleCount, totalDays, viewport.from, x])

  if (width <= 0 || height <= 0 || points.length === 0) {
    return null
  }

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`)
    .join(" ")
  const areaPath = `${linePath} L${points.at(-1)?.x ?? width},${chartBottom} L${
    points[0]?.x ?? 0
  },${chartBottom} Z`

  return (
    <svg
      data-testid="chart-layer"
      role="img"
      aria-label="Daily product activity behind the selected date range"
      className="block size-full overflow-visible"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.34" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path
        d={areaPath}
        fill={`url(#${gradientId})`}
        opacity={isInteracting ? 0.72 : 1}
      />
      <path
        d={linePath}
        fill="none"
        stroke="var(--primary)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.75"
        vectorEffect="non-scaling-stroke"
        opacity={isInteracting ? 0.75 : 1}
      />
    </svg>
  )
}
