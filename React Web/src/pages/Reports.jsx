import { useEffect, useState } from 'react'
import { api } from '../api'
import { money } from '../config'
import { usePageTitle, fmtDay, label } from '../utils'

function BarChart({ series }) {
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

export default function Reports() {
  usePageTitle('Reports')
  const [days, setDays] = useState(14)
  const [r, setR] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => { api('GET', `/reports/summary?days=${days}`).then(setR).catch((e) => setError(e.message)) }, [days])
  const kpi = r && [
    ['Revenue', money(r.totals.revenue)], ['Sales', r.totals.sales], ['Average sale', money(r.totals.average)],
    ['Gross profit', money(r.totals.profit)], ['Low-stock items', r.inventory.lowStock], ['Stock value (cost)', money(r.inventory.stockValue)],
  ]
  return (
    <div className="page">
      <header className="page-head">
        <div><h1>Reports</h1><p className="muted">Refunded sales are left out. Profit is price minus cost on items sold.</p></div>
        <div className="chips" role="group" aria-label="Period">
          {[7, 14, 30].map((n) => <button type="button" key={n} className={`chip${days === n ? ' on' : ''}`} aria-pressed={days === n} onClick={() => setDays(n)}>{n} days</button>)}
        </div>
      </header>
      {error && <p className="form-error" role="alert">{error}</p>}
      {!r && !error && <p className="muted" role="status">Loading report…</p>}
      {r && <>
        <dl className="kpis">{kpi.map(([k, v]) => <div key={k} className="kpi"><dt>{k}</dt><dd className="num">{v}</dd></div>)}</dl>
        <section className="card"><h2>Revenue per day</h2><BarChart series={r.series} /></section>
        <div className="two">
          <section className="card"><h2>Top sellers</h2>
            <table className="data tight"><caption className="sr">Top selling products</caption>
              <thead><tr><th scope="col">Product</th><th scope="col" className="right">Sold</th><th scope="col" className="right">Revenue</th></tr></thead>
              <tbody>{r.top.map((t) => <tr key={t.name}><th scope="row">{t.name}</th><td className="right num">{t.qty}</td><td className="right num">{money(t.revenue)}</td></tr>)}</tbody></table>
          </section>
          <section className="card"><h2>Payment methods</h2>
            <table className="data tight"><caption className="sr">Sales by payment method</caption>
              <thead><tr><th scope="col">Method</th><th scope="col" className="right">Sales</th><th scope="col" className="right">Revenue</th></tr></thead>
              <tbody>{r.methods.map((m) => <tr key={m.method}><th scope="row">{label(m.method)}</th><td className="right num">{m.sales}</td><td className="right num">{money(m.revenue)}</td></tr>)}</tbody></table>
          </section>
        </div>
      </>}
    </div>
  )
}
