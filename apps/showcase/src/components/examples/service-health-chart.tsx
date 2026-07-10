import {
  fromDayOrdinal,
  toDayOrdinal,
  type TimelineChartContext,
} from "@amirs/datepicker"

const SERVICES = [
  { id: "api", color: "var(--chart-1)", seed: 3 },
  { id: "web", color: "var(--chart-3)", seed: 11 },
  { id: "workers", color: "var(--primary)", seed: 23 },
] as const

type IncidentSeverity = 0 | 1 | 2 | 3

function incidentSeverity(day: number, seed: number): IncidentSeverity {
  const foldedDay = Math.abs(day % 10_007)
  const signature = Math.abs(
    (foldedDay * 37 + seed * 53 + (foldedDay % 97) * (foldedDay % 89) * seed) %
      101,
  )

  if (signature < 4) return 3
  if (signature < 12) return 2
  if (signature < 29) return 1
  return 0
}

function incidentColor(
  severity: IncidentSeverity,
  serviceColor: string,
) {
  if (severity === 3) return "var(--destructive)"
  if (severity === 2) return "var(--chart-2)"
  return serviceColor
}

export function ServiceHealthChart({
  viewport,
  width,
  height,
  x,
  isInteracting,
}: TimelineChartContext) {
  const startDay = toDayOrdinal(viewport.from)
  const endDay = toDayOrdinal(viewport.to)
  const visibleDays = Math.max(1, endDay - startDay + 1)
  const targetCells = Math.max(12, Math.min(84, Math.floor(width / 7)))
  const bucketDays = Math.max(1, Math.ceil(visibleDays / targetCells))
  const laneGap = 4
  const chartPadding = 7
  const availableHeight = Math.max(
    3,
    height - chartPadding * 2 - laneGap * (SERVICES.length - 1),
  )
  const laneHeight = availableHeight / SERVICES.length

  if (width <= 0 || height <= 0) return null

  return (
    <svg
      data-testid="service-health-chart"
      data-bucket-days={bucketDays}
      role="img"
      aria-label="Service health incidents for API, web, and worker services"
      className="block size-full"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ opacity: isInteracting ? 0.72 : 1 }}
    >
      <title>Service health incidents across three service lanes</title>
      {SERVICES.map((service, laneIndex) => {
        const laneY = chartPadding + laneIndex * (laneHeight + laneGap)
        const incidents = []

        for (let offset = 0; offset < visibleDays; offset += bucketDays) {
          const bucketEndOffset = Math.min(
            visibleDays - 1,
            offset + bucketDays - 1,
          )
          let severity: IncidentSeverity = 0

          for (let dayOffset = offset; dayOffset <= bucketEndOffset; dayOffset += 1) {
            severity = Math.max(
              severity,
              incidentSeverity(startDay + dayOffset, service.seed),
            ) as IncidentSeverity
          }

          if (severity === 0) continue

          const left = x(fromDayOrdinal(startDay + offset), "start")
          const right = x(
            fromDayOrdinal(startDay + bucketEndOffset),
            "end",
          )
          const incidentWidth = Math.max(1.5, right - left - 1)

          incidents.push(
            <rect
              key={`${service.id}-${startDay + offset}`}
              data-incident-severity={severity}
              x={left + 0.5}
              y={laneY + 2}
              width={incidentWidth}
              height={Math.max(1, laneHeight - 4)}
              rx={Math.min(2, laneHeight / 4)}
              fill={incidentColor(severity, service.color)}
              fillOpacity={severity === 1 ? 0.56 : 0.88}
            />,
          )
        }

        return (
          <g key={service.id} data-service-lane={service.id}>
            <rect
              x={0}
              y={laneY}
              width={width}
              height={laneHeight}
              rx={Math.min(3, laneHeight / 3)}
              fill="var(--muted)"
              fillOpacity={0.3}
            />
            <line
              x1={0}
              x2={width}
              y1={laneY + laneHeight / 2}
              y2={laneY + laneHeight / 2}
              stroke={service.color}
              strokeOpacity={0.24}
              vectorEffect="non-scaling-stroke"
            />
            {incidents}
          </g>
        )
      })}
    </svg>
  )
}
