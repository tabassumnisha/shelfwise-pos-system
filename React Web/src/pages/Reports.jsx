import { useEffect, useState } from 'react'
import { api } from '../api'
import { money } from '../config'
import { usePageTitle, label } from '../utils'
import BarChart from '../components/BarChart'
import { Skeleton } from '../components/Feedback'

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
      {!r && !error && <Skeleton kind="report" />}
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
