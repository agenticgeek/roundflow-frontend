import type { FloCell, FloChartAxis, FloChartBlock } from '@/api/flo.api'
import { BlockLink } from '@/components/flo/BlockLink'
import { floContent } from '@/content/flo'
import { formatFloValue } from '@/features/flo/lib/format'
import { fillCopy } from '@/lib/utils'

/** Design tokens (see styles/globals.css), one per series. */
const SERIES_COLOURS = ['var(--primary)', 'var(--warning)', 'var(--success)']
const WIDTH = 420
const BAR_LABEL_MAX = 44
const TICK_LABEL_MAX = 9

const seriesColour = (index: number) => SERIES_COLOURS[index % SERIES_COLOURS.length] as string

const shortDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

/** A cell as a plottable number; anything else is a gap. */
function num(cell: FloCell | undefined): number | null {
  const value = typeof cell === 'string' && cell.trim() !== '' ? Number(cell) : cell
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function categoryLabel(cell: FloCell | undefined, axis: FloChartAxis): string {
  return formatFloValue(cell, axis.format)
}

/** The short x tick: "29 Oct" for dates, otherwise the label cut to fit. */
function tickLabel(cell: FloCell | undefined, axis: FloChartAxis): string {
  if (axis.format === 'date') {
    const parsed = new Date(String(cell))
    if (!Number.isNaN(parsed.getTime())) return shortDate.format(parsed)
  }
  return clip(categoryLabel(cell, axis), TICK_LABEL_MAX)
}

function domain(values: number[]): [number, number] {
  const lo = Math.min(0, ...values)
  const hi = Math.max(0, ...values)
  return hi === lo ? [lo, lo + 1] : [lo, hi]
}

function plotted(block: FloChartBlock): number[] {
  return block.rows.flatMap((row) => block.series.map((series) => num(row[series.key]))).filter((value): value is number => value !== null)
}

/** One sentence describing the chart for assistive tech: first series, highest and lowest point. */
function summarise(block: FloChartBlock): string {
  const kind = floContent.chart[block.kind]
  const title = block.title || floContent.chart.untitled
  const series = block.series[0] as FloChartAxis
  const points = block.rows.flatMap((row) => {
    const y = num(row[series.key])
    return y === null ? [] : [{ x: categoryLabel(row[block.x.key], block.x), y }]
  })
  if (points.length === 0) return fillCopy(floContent.chart.summaryNone, { kind, title })
  const show = (y: number) => formatFloValue(y, series.format)
  if (points.length === 1) {
    const only = points[0] as { x: string; y: number }
    return fillCopy(floContent.chart.summaryOne, { kind, title, series: series.label, x: only.x, y: show(only.y) })
  }
  const high = points.reduce((best, point) => (point.y > best.y ? point : best))
  const low = points.reduce((best, point) => (point.y < best.y ? point : best))
  return fillCopy(floContent.chart.summary, {
    kind,
    title,
    count: points.length,
    series: series.label,
    highX: high.x,
    highY: show(high.y),
    lowX: low.x,
    lowY: show(low.y),
  })
}

/** Horizontal bars: each category's label sits above its bars, so long labels never collide. */
function BarPlot({ block }: { block: FloChartBlock }) {
  const BAR = 14
  const GAP = 4
  const LABEL = 18
  const PAD = 12
  const x0 = 4
  const x1 = WIDTH - 88
  const [lo, hi] = domain(plotted(block))
  const scale = (value: number) => x0 + ((value - lo) / (hi - lo)) * (x1 - x0)
  const zero = scale(0)
  const rowHeight = LABEL + block.series.length * (BAR + GAP) + PAD
  const height = rowHeight * block.rows.length
  return (
    <svg viewBox={`0 0 ${WIDTH} ${height}`} aria-hidden="true" focusable="false" className="block h-auto w-full max-w-[560px]">
      {block.rows.map((row, rowIndex) => {
        const top = rowIndex * rowHeight
        return (
          <g key={rowIndex}>
            <text x={x0} y={top + 12} fontSize="13" fill="var(--foreground)">
              {clip(categoryLabel(row[block.x.key], block.x), BAR_LABEL_MAX)}
            </text>
            {block.series.map((series, seriesIndex) => {
              const value = num(row[series.key])
              if (value === null) return null
              const y = top + LABEL + seriesIndex * (BAR + GAP)
              const end = scale(value)
              return (
                <g key={series.key}>
                  <rect
                    x={Math.min(zero, end)}
                    y={y}
                    width={Math.max(Math.abs(end - zero), value === 0 ? 0 : 1)}
                    height={BAR}
                    rx="3"
                    fill={seriesColour(seriesIndex)}
                  />
                  <text x={Math.max(zero, end) + 6} y={y + BAR - 3} fontSize="12" fill="var(--muted-strong)">
                    {formatFloValue(value, series.format)}
                  </text>
                </g>
              )
            })}
          </g>
        )
      })}
      {lo < 0 ? <line x1={zero} x2={zero} y1={0} y2={height} stroke="var(--line)" /> : null}
    </svg>
  )
}

function LinePlot({ block }: { block: FloChartBlock }) {
  const HEIGHT = 240
  const left = 80
  const right = 14
  const top = 12
  const bottom = 40
  const [lo, hi] = domain(plotted(block))
  const count = block.rows.length
  const px = (index: number) => (count === 1 ? (left + WIDTH - right) / 2 : left + (index / (count - 1)) * (WIDTH - left - right))
  const py = (value: number) => top + (1 - (value - lo) / (hi - lo)) * (HEIGHT - top - bottom)
  const step = Math.ceil(count / 6)
  const first = block.series[0] as FloChartAxis
  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden="true" focusable="false" className="block h-auto w-full max-w-[560px]">
      {[0, 1, 2, 3].map((tick) => {
        const value = lo + ((hi - lo) * tick) / 3
        return (
          <g key={tick}>
            <line x1={left} x2={WIDTH - right} y1={py(value)} y2={py(value)} stroke="var(--hairline)" />
            <text x={left - 6} y={py(value) + 4} fontSize="11" textAnchor="end" fill="var(--muted-strong)">
              {formatFloValue(value, first.format)}
            </text>
          </g>
        )
      })}
      {block.rows.map((row, index) =>
        index % step === 0 ? (
          <text key={index} x={px(index)} y={HEIGHT - 16} fontSize="11" textAnchor="middle" fill="var(--muted-strong)">
            {tickLabel(row[block.x.key], block.x)}
          </text>
        ) : null,
      )}
      {block.series.map((series, seriesIndex) => {
        const points = block.rows.flatMap((row, index) => {
          const value = num(row[series.key])
          return value === null ? [] : [{ x: px(index), y: py(value) }]
        })
        return (
          <g key={series.key} fill={seriesColour(seriesIndex)} stroke={seriesColour(seriesIndex)}>
            {points.length > 1 ? (
              <polyline fill="none" strokeWidth="2" strokeLinejoin="round" points={points.map((p) => `${p.x},${p.y}`).join(' ')} />
            ) : null}
            {points.map((p, pointIndex) => (
              <circle key={pointIndex} cx={p.x} cy={p.y} r="3.5" stroke="none" />
            ))}
          </g>
        )
      })}
    </svg>
  )
}

/**
 * A bar or line chart drawn as inline SVG from the server's built block (no chart library). The drawing is
 * hidden from assistive tech; a labelled `img` summary and a visually hidden data table carry the content.
 * Nothing animates beyond the block's own fade-in, which is switched off under prefers-reduced-motion.
 */
export function ChartBlock({ block }: { block: FloChartBlock }) {
  const title = block.title || floContent.chart.untitled
  const plottable = block.rows.length > 0 && block.series.length > 0
  return (
    <figure className="min-w-0 rounded-xl border border-border bg-background px-4 py-3">
      <figcaption className="text-sm font-semibold text-foreground">{title}</figcaption>
      {plottable ? (
        <>
          <div role="img" aria-label={summarise(block)} className="mt-3">
            {block.kind === 'line' ? <LinePlot block={block} /> : <BarPlot block={block} />}
          </div>
          {block.series.length > 1 ? (
            <ul aria-label={floContent.chart.legend} className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-strong">
              {block.series.map((series, index) => (
                <li key={series.key} className="inline-flex items-center gap-1.5">
                  <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm" style={{ background: seriesColour(index) }} />
                  {series.label}
                </li>
              ))}
            </ul>
          ) : null}
          <table className="sr-only">
            <caption>{fillCopy(floContent.chart.tableLabel, { title })}</caption>
            <thead>
              <tr>
                <th scope="col">{block.x.label}</th>
                {block.series.map((series) => (
                  <th key={series.key} scope="col">
                    {series.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, index) => (
                <tr key={index}>
                  <td>{categoryLabel(row[block.x.key], block.x)}</td>
                  {block.series.map((series) => (
                    <td key={series.key}>{formatFloValue(row[series.key], series.format)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <p className="mt-2 text-sm text-muted">{floContent.chart.empty}</p>
      )}
      <BlockLink link={block.link} />
    </figure>
  )
}
