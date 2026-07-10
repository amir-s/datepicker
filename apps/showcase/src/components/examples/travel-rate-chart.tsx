import * as React from "react"
import {
  fromDayOrdinal,
  toDayOrdinal,
  type TimelineChartContext,
} from "@amirs/datepicker"

const ZOOM_BUCKET_DAYS: Record<string, number> = {
  "two-weeks": 1,
  "six-weeks": 1,
  "four-months": 3,
  "thirteen-months": 14,
  "multi-year": 30,
  "travel-fortnight": 1,
  "travel-season": 2,
  "travel-year": 14,
}

function nightlyRate(day: number) {
  const date = fromDayOrdinal(day)
  const weekendPremium = date.getDay() === 5 || date.getDay() === 6 ? 30 : 0
  const seasonalRate = Math.sin(day * 0.035) * 26
  const localPulse = Math.cos(day * 0.47 + 0.6) * 11

  return Math.round(142 + weekendPremium + seasonalRate + localPulse)
}

export function TravelRateChart({
  viewport,
  width,
  height,
  zoomLevel,
  x,
  isInteracting,
}: TimelineChartContext) {
  const gradientId = React.useId().replaceAll(":", "")
  const startDay = toDayOrdinal(viewport.from)
  const endDay = toDayOrdinal(viewport.to)
  const visibleDays = Math.max(1, endDay - startDay + 1)
  const levelBucketDays = ZOOM_BUCKET_DAYS[zoomLevel] ?? 1
  const responsiveTarget = Math.max(12, Math.floor(width / 10))
  const responsiveBucketDays = Math.max(
    1,
    Math.ceil(visibleDays / responsiveTarget),
  )
  const bucketDays = Math.max(levelBucketDays, responsiveBucketDays)
  const chartTop = 8
  const chartBottom = Math.max(chartTop + 1, height - 9)
  const drawableHeight = chartBottom - chartTop

  const buckets = React.useMemo(() => {
    const result = []

    for (let offset = 0; offset < visibleDays; offset += bucketDays) {
      const endOffset = Math.min(visibleDays - 1, offset + bucketDays - 1)
      let totalRate = 0

      for (let dayOffset = offset; dayOffset <= endOffset; dayOffset += 1) {
        totalRate += nightlyRate(startDay + dayOffset)
      }

      result.push({
        startDay: startDay + offset,
        endDay: startDay + endOffset,
        rate: totalRate / (endOffset - offset + 1),
      })
    }

    return result
  }, [bucketDays, startDay, visibleDays])

  const rates = buckets.map((bucket) => bucket.rate)
  const minimumRate = Math.min(...rates)
  const maximumRate = Math.max(...rates)
  const rateSpan = Math.max(1, maximumRate - minimumRate)
  const points = buckets.map((bucket) => ({
    ...bucket,
    left: x(fromDayOrdinal(bucket.startDay), "start"),
    right: x(fromDayOrdinal(bucket.endDay), "end"),
    center: x(
      fromDayOrdinal(Math.round((bucket.startDay + bucket.endDay) / 2)),
      "center",
    ),
    y:
      chartBottom -
      ((bucket.rate - minimumRate) / rateSpan) * drawableHeight,
  }))
  const [firstPoint] = points
  const stepLine = firstPoint
    ? points.slice(1).reduce(
        (path, point) => `${path}V${point.y}H${point.right}`,
        `M${firstPoint.left},${firstPoint.y}H${firstPoint.right}`,
      )
    : ""
  const areaPath = firstPoint
    ? points.slice(1).reduce(
        (path, point) => `${path}V${point.y}H${point.right}`,
        `M${firstPoint.left},${chartBottom}V${firstPoint.y}H${firstPoint.right}`,
      ) + `V${chartBottom}Z`
    : ""
  const showDailyDetails = bucketDays === 1 && visibleDays <= 48

  if (width <= 0 || height <= 0 || points.length === 0) return null

  return (
    <svg
      data-testid="travel-rate-chart"
      data-bucket-days={bucketDays}
      data-zoom-level={zoomLevel}
      role="img"
      aria-label="Average nightly travel rates across the visible dates"
      className="block size-full overflow-visible"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ opacity: isInteracting ? 0.72 : 1 }}
    >
      <title>Average nightly travel rates</title>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.32} />
          <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.03} />
        </linearGradient>
      </defs>

      {showDailyDetails &&
        Array.from({ length: visibleDays }, (_, offset) => {
          const day = startDay + offset
          const date = fromDayOrdinal(day)
          if (date.getDay() !== 5 && date.getDay() !== 6) return null

          const left = x(date, "start")
          const right = x(date, "end")
          return (
            <rect
              key={day}
              x={left}
              y={chartTop}
              width={Math.max(1, right - left)}
              height={drawableHeight}
              fill="var(--muted)"
              fillOpacity={0.34}
            />
          )
        })}

      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path
        d={stepLine}
        fill="none"
        stroke="var(--chart-2)"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />

      {showDailyDetails &&
        points.map((point) => (
          <circle
            key={point.startDay}
            cx={point.center}
            cy={point.y}
            r={2.25}
            fill="var(--card)"
            stroke="var(--chart-2)"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        ))}
    </svg>
  )
}
