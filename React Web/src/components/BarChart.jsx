import { money } from '../config'
import { fmtDay } from '../utils'

export default function BarChart({ series }) {
  const W = 720, H = 240, L = 44, B = 28, T = 10
  const max = Math.max(1, ...series.map((d) => d.revenue))
  const step = Math.pow(10, Math.floor(Math.log10(max)))
  const top = Math.ceil(max / step) * step
  const bw = (W - L) / series.length
  const ticks = [0, 0.5, 1].map((t) => t * top)
  const summary = `Daily revenue for the last ${series.length} days. Highest ${money(max)}.`
  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary}>
        {ticks.map((t) => {
          const y = T + (H - T - B) * (1 - t / top)
          return <g key={t}><line x1={L} x2={W} y1={y} y2={y} className="grid" /><text x={L - 8} y={y + 4} textAnchor="end" className="axis">{money(t).replace('.00', '')}</text></g>
        })}
        {series.map((d, i) => {
          const h = (H - T - B) * (d.revenue / top)
          return (
            <g key={d.day}>
              <rect x={L + i * bw + bw * 0.16} y={H - B - h} width={bw * 0.68} height={Math.max(h, 0)} rx="3" className="bar"><title>{`${fmtDay(d.day)}: ${money(d.revenue)}, ${d.sales} sales`}</title></rect>
              {(series.length <= 14 || i % 2 === 0) && <text x={L + i * bw + bw / 2} y={H - 8} textAnchor="middle" className="axis">{fmtDay(d.day)}</text>}
            </g>
          )
        })}
      </svg>
    </figure>
  )
}
