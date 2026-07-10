import * as React from "react"
import { Bar, BarChart } from "recharts"
import {
  fromDayOrdinal,
  toDayOrdinal,
  type TimelineChartContext,
} from "@amir-s/datepicker"

import {
  ChartContainer,
  type ChartConfig,
} from "@/components/ui/chart"

const chartConfig = {
  subscriptions: {
    label: "Subscriptions",
    color: "var(--chart-1)",
  },
  expansion: {
    label: "Expansion",
    color: "var(--chart-2)",
  },
  services: {
    label: "Services",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig

type RevenuePoint = {
  day: number
  subscriptions: number
  expansion: number
  services: number
}

function revenueForDay(day: number) {
  const weeklyPulse = Math.sin(day * 0.9) * 5
  const seasonalPulse = Math.cos(day * 0.17) * 8

  return {
    subscriptions: Math.max(
      12,
      Math.round(48 + seasonalPulse + weeklyPulse),
    ),
    expansion: Math.max(
      6,
      Math.round(24 + Math.sin(day * 0.31 + 1.4) * 7),
    ),
    services: Math.max(
      3,
      Math.round(12 + Math.cos(day * 0.23 + 0.8) * 5),
    ),
  }
}

function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = React.useState(() =>
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )

  React.useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReducedMotion(query.matches)

    update()
    query.addEventListener("change", update)
    return () => query.removeEventListener("change", update)
  }, [])

  return reducedMotion
}

export function StackedRevenueChart({
  viewport,
  width,
  height,
  isInteracting,
}: TimelineChartContext) {
  const startDay = toDayOrdinal(viewport.from)
  const endDay = toDayOrdinal(viewport.to)
  const visibleDays = Math.max(1, endDay - startDay + 1)
  const targetBars = Math.max(12, Math.min(72, Math.floor(width / 9)))
  const bucketDays = Math.max(1, Math.ceil(visibleDays / targetBars))
  const reducedMotion = usePrefersReducedMotion()

  const data = React.useMemo<RevenuePoint[]>(() => {
    const points: RevenuePoint[] = []

    for (let offset = 0; offset < visibleDays; offset += bucketDays) {
      const sampleDays = Math.min(bucketDays, visibleDays - offset)
      const totals = {
        subscriptions: 0,
        expansion: 0,
        services: 0,
      }

      for (let dayOffset = 0; dayOffset < sampleDays; dayOffset += 1) {
        const revenue = revenueForDay(startDay + offset + dayOffset)
        totals.subscriptions += revenue.subscriptions
        totals.expansion += revenue.expansion
        totals.services += revenue.services
      }

      points.push({
        day: startDay + offset,
        subscriptions: Math.round(totals.subscriptions / sampleDays),
        expansion: Math.round(totals.expansion / sampleDays),
        services: Math.round(totals.services / sampleDays),
      })
    }

    return points
  }, [bucketDays, startDay, visibleDays])

  if (width <= 0 || height <= 0) return null

  const animate = !isInteracting && !reducedMotion

  return (
    <ChartContainer
      data-testid="stacked-revenue-chart"
      data-bucket-days={bucketDays}
      role="img"
      aria-label={`Stacked revenue mix from ${fromDayOrdinal(startDay).toLocaleDateString()} to ${fromDayOrdinal(endDay).toLocaleDateString()}`}
      config={chartConfig}
      initialDimension={{ width, height }}
      className="size-full min-h-0 aspect-auto"
      style={{ opacity: isInteracting ? 0.72 : 1 }}
    >
      <BarChart
        data={data}
        margin={{ top: 6, right: 0, bottom: 0, left: 0 }}
        barCategoryGap={bucketDays === 1 ? "18%" : "10%"}
        barGap={0}
        accessibilityLayer={false}
      >
        <Bar
          dataKey="subscriptions"
          stackId="revenue"
          fill="var(--color-subscriptions)"
          radius={[0, 0, 2, 2]}
          isAnimationActive={animate}
          animationDuration={280}
          animationEasing="ease-out"
        />
        <Bar
          dataKey="expansion"
          stackId="revenue"
          fill="var(--color-expansion)"
          isAnimationActive={animate}
          animationDuration={280}
          animationEasing="ease-out"
        />
        <Bar
          dataKey="services"
          stackId="revenue"
          fill="var(--color-services)"
          radius={[3, 3, 0, 0]}
          isAnimationActive={animate}
          animationDuration={280}
          animationEasing="ease-out"
        />
      </BarChart>
    </ChartContainer>
  )
}
