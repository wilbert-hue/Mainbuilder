'use client'

/**
 * Chart renderer for a single buyer-survey question.
 *
 * The JSON supplies an optional `chart_type` per question
 * (pie | donut | horizontal_bar | vertical_bar | lollipop). When absent we fall
 * back to a semi-donut, which is the house default in the reference layout.
 *
 * Percentages come straight from the export. single_select options sum to ~100;
 * multi_select options can sum well past it, so bar-family charts scale to the
 * largest option rather than to 100.
 */

import { useMemo } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
  Tooltip,
} from 'recharts'
import type { BuyerSurveyOption } from '@/lib/buyer-survey-types'

/** Brand palette, alternating teal / deep blue as in the reference design. */
const SURVEY_COLORS = [
  '#52B69A', // teal
  '#1A759F', // blue teal
  '#76C893', // light green
  '#168AAD', // deep teal
  '#184E77', // navy
  '#99D98C', // medium green
  '#34A0A4', // medium teal
  '#1E6091', // deep blue
]

function colorAt(index: number): string {
  return SURVEY_COLORS[index % SURVEY_COLORS.length]
}

function fmtPct(v: number): string {
  return `${v.toFixed(1)}%`
}

/** Split a label into lines of at most `max` characters, breaking on words. */
function wrapLabel(text: string, max: number, maxLines: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    if (!line) line = w
    else if (line.length + 1 + w.length <= max) line += ' ' + w
    else {
      lines.push(line)
      line = w
      if (lines.length === maxLines) break
    }
  }
  if (lines.length < maxLines && line) lines.push(line)
  // Mark truncation so a clipped label never reads as complete.
  if (lines.length === maxLines) {
    const used = lines.join(' ').length
    if (used < text.length - 1) lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '') + '…'
  }
  return lines
}

/**
 * Multi-line axis tick. Recharts clips a single long <text> node against the
 * axis box, which cut the start off labels like "Flight controller or avionics
 * failure requiring grounded fleet"; wrapping keeps every word on the canvas.
 */
function WrappedTick({ x, y, payload, width, anchor }: any) {
  const lines = wrapLabel(String(payload?.value ?? ''), width, 3)
  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor={anchor} fill="#0f172a" fontSize={11}>
        {lines.map((l, i) => (
          <tspan key={i} x={0} dy={i === 0 ? 4 : 13}>
            {l}
          </tspan>
        ))}
      </text>
    </g>
  )
}

/** Longest option label, used to pick a layout that can actually show it. */
function longestLabel(options: BuyerSurveyOption[]): number {
  return options.reduce((m, o) => Math.max(m, o.label.length), 0)
}

interface Props {
  options: BuyerSurveyOption[]
  chartType: string | null
  height?: number
}

export function BuyerSurveyChart({ options, chartType, height = 340 }: Props) {
  const data = useMemo(
    () => options.map((o, i) => ({ ...o, fill: colorAt(i) })),
    [options]
  )

  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-md bg-slate-50 text-sm text-slate-500">
        No response breakdown available for this question.
      </div>
    )
  }

  let type = (chartType || '').toLowerCase()

  // A vertical bar chart cannot show long category names: rotated ticks run off
  // the canvas and get clipped. Long labels belong on a horizontal bar, where
  // they sit in a full-height left gutter.
  const maxLabel = longestLabel(data)
  if (type === 'vertical_bar' && maxLabel > 24) {
    type = 'horizontal_bar'
  }

  // ── Bar family ────────────────────────────────────────────────────────────
  if (type === 'horizontal_bar' || type === 'lollipop') {
    // Lollipop reads as a thin bar with an emphasised cap at this size, so we
    // render both through the horizontal bar path with a narrower bar for pops.
    const isLollipop = type === 'lollipop'
    // Give the label gutter room in proportion to the longest name, and grow
    // the plot so wrapped labels do not collide with their neighbours.
    const gutter = Math.min(360, Math.max(190, Math.round(maxLabel * 5.2)))
    const wrapChars = Math.max(18, Math.floor(gutter / 6.2))
    const barHeight = Math.max(height, data.length * 62 + 60)
    return (
      <div style={{ width: '100%', height: barHeight }}>
        <ResponsiveContainer>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 8, right: 62, bottom: 8, left: 8 }}
            barCategoryGap={isLollipop ? '45%' : '22%'}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
            <XAxis type="number" tick={{ fontSize: 12, fill: '#475569' }} unit="%" />
            <YAxis
              type="category"
              dataKey="label"
              width={gutter}
              interval={0}
              tickLine={false}
              tick={(props) => <WrappedTick {...props} width={wrapChars} anchor="end" />}
            />
            <Tooltip
              formatter={(v: any) => [fmtPct(Number(v)), 'Share']}
              contentStyle={{ fontSize: 12, borderRadius: 6 }}
            />
            <Bar dataKey="pct" radius={[0, 4, 4, 0]} barSize={isLollipop ? 10 : undefined}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.fill} />
              ))}
              <LabelList
                dataKey="pct"
                position="right"
                formatter={(v: any) => fmtPct(Number(v))}
                style={{ fontSize: 12, fontWeight: 700, fill: '#0f172a' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (type === 'vertical_bar') {
    return (
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 28, right: 16, bottom: 12, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            {/* Upright wrapped ticks rather than rotated ones: rotation is what
                pushed long names off the canvas and truncated them. */}
            <XAxis
              dataKey="label"
              interval={0}
              height={72}
              tickLine={false}
              tick={(props) => <WrappedTick {...props} width={16} anchor="middle" />}
            />
            <YAxis tick={{ fontSize: 12, fill: '#475569' }} unit="%" />
            <Tooltip
              formatter={(v: any) => [fmtPct(Number(v)), 'Share']}
              contentStyle={{ fontSize: 12, borderRadius: 6 }}
            />
            <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.fill} />
              ))}
              <LabelList
                dataKey="pct"
                position="top"
                formatter={(v: any) => fmtPct(Number(v))}
                style={{ fontSize: 12, fontWeight: 700, fill: '#0f172a' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  // ── Donut (full ring, labels outside) ─────────────────────────────────────
  if (type === 'donut') {
    return (
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
          <PieChart margin={{ top: 16, right: 16, bottom: 16, left: 16 }}>
            <Pie
              data={data}
              dataKey="pct"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius="52%"
              outerRadius="76%"
              paddingAngle={2}
              stroke="#fff"
              strokeWidth={2}
              isAnimationActive={false}
              labelLine={{ stroke: '#94a3b8' }}
              label={(entry: any) => `${fmtPct(Number(entry.pct))}`}
            >
              {data.map((d, i) => (
                <Cell key={i} fill={d.fill} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: any, n: any) => [fmtPct(Number(v)), n]}
              contentStyle={{ fontSize: 12, borderRadius: 6 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    )
  }

  // ── Full pie ──────────────────────────────────────────────────────────────
  if (type === 'pie') {
    return (
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
          <PieChart margin={{ top: 16, right: 16, bottom: 16, left: 16 }}>
            <Pie
              data={data}
              dataKey="pct"
              nameKey="label"
              cx="50%"
              cy="50%"
              outerRadius="78%"
              paddingAngle={2}
              stroke="#fff"
              strokeWidth={2}
              isAnimationActive={false}
              label={(entry: any) => `${fmtPct(Number(entry.pct))}`}
            >
              {data.map((d, i) => (
                <Cell key={i} fill={d.fill} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: any, n: any) => [fmtPct(Number(v)), n]}
              contentStyle={{ fontSize: 12, borderRadius: 6 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    )
  }

  // ── Default: semi-donut (half ring, values inside the band) ───────────────
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Pie
            data={data}
            dataKey="pct"
            nameKey="label"
            cx="50%"
            cy="78%"
            startAngle={180}
            endAngle={0}
            innerRadius="46%"
            outerRadius="86%"
            paddingAngle={2}
            stroke="#fff"
            strokeWidth={2}
            isAnimationActive={false}
            labelLine={false}
            label={(entry: any) => fmtPct(Number(entry.pct))}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.fill} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v: any, n: any) => [fmtPct(Number(v)), n]}
            contentStyle={{ fontSize: 12, borderRadius: 6 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Swatch legend rendered under every chart so labels stay readable. */
export function BuyerSurveyLegend({ options }: { options: BuyerSurveyOption[] }) {
  if (options.length === 0) return null
  return (
    <div className="mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
      {options.map((o, i) => (
        <span key={i} className="flex items-center gap-2 text-xs text-slate-700">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: colorAt(i) }}
          />
          {o.label}
        </span>
      ))}
    </div>
  )
}
