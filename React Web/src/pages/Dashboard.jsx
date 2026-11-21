import { useEffect, useState } from 'react'
import { api } from '../api'
import { useStore } from '../store'
import { Link } from '../router'
import { money } from '../config'
import { usePageTitle, fmtDateTime, label } from '../utils'
import BarChart from '../components/BarChart'
import { Icon } from '../components/Icons'
import { EmptyState, Skeleton } from '../components/Feedback'

export default function Dashboard() {
  usePageTitle('Dashboard')
  const { user, products } = useStore()
  const [r, setR] = useState(null)
  const [recent, setRecent] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    api('GET', '/reports/summary?days=14').then(setR).catch((e) => setError(e.message))
    api('GET', '/sales?limit=6').then((d) => setRecent(d.sales)).catch((e) => setError(e.message))
  }, [])
  const low = products.filter((p) => p.active && p.low).sort((a, b) => a.stock - b.stock).slice(0, 6)
  const kpi = r && [
    ['Revenue', money(r.totals.revenue), 'cash'], ['Sales', r.totals.sales, 'receipt'], ['Average sale', money(r.totals.average), 'register'],
    ['Gross profit', money(r.totals.profit), 'chart'], ['Low-stock items', r.inventory.lowStock, 'alert'], ['Stock value (cost)', money(r.inventory.stockValue), 'box'],
  ]
  return (
    <div className="page">
      <header className="page-head">
        <div><h1>Dashboard</h1><p className="muted">Welcome back, {user.name.split(' ')[0]}. Here is the last 14 days.</p></div>
        <Link to="/pos" className="btn btn-primary"><Icon name="register" size={18} /> Open terminal</Link>
      </header>
      {error && <p className="form-error" role="alert">{error}</p>}
      {!r && !error ? <Skeleton kind="report" /> : r && <>
        <dl className="kpis">{kpi.map(([k, v, i]) => <div key={k} className="kpi"><span className="kpi-icon" aria-hidden="true"><Icon name={i} size={20} /></span><dt>{k}</dt><dd className="num">{v}</dd></div>)}</dl>
        <section className="card"><h2>Revenue per day</h2><BarChart series={r.series} /></section>
        <div className="two">
          <section className="card"><div className="card-head"><h2>Recent sales</h2><Link to="/sales" className="small">View all</Link></div>
            {recent && recent.length === 0 ? <EmptyState icon="receipt" title="No sales yet" text="Sales appear here as soon as the first one is charged."><Link to="/pos" className="btn btn-outline btn-sm">Open terminal</Link></EmptyState> : (
              <ul className="mini-list">{(recent || []).map((s) => <li key={s.id}><span><strong>{s.receiptNo}</strong><small className="muted">{fmtDateTime(s.createdAt)} · {label(s.method)}</small></span><span className="num">{money(s.total)}</span></li>)}</ul>
            )}
          </section>
          <section className="card"><div className="card-head"><h2>Needs restocking</h2><Link to="/stock" className="small">Stock and orders</Link></div>
            {low.length === 0 ? <EmptyState icon="check" title="Stock looks healthy" text="Nothing is at or below its reorder level." /> : (
              <ul className="mini-list">{low.map((p) => <li key={p.id}><span><strong>{p.name}</strong><small className="muted">Reorder at {p.reorderLevel}</small></span><span className={`badge low`}>{p.stock} left</span></li>)}</ul>
            )}
          </section>
        </div>
      </>}
    </div>
  )
}
