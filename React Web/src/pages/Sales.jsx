import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { useStore } from '../store'
import { money } from '../config'
import { usePageTitle, fmtDateTime, label } from '../utils'
import Receipt from '../components/Receipt'
import { Icon } from '../components/Icons'
import { EmptyState, Skeleton } from '../components/Feedback'

export default function Sales() {
  usePageTitle('Sales')
  const { admin, notify, loadProducts } = useStore()
  const [sales, setSales] = useState(null)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [open, setOpen] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => api('GET', '/sales?limit=200').then((d) => setSales(d.sales)).catch((e) => setError(e.message)), [])
  useEffect(() => { load() }, [load])

  const shown = useMemo(() => (sales || []).filter((s) => (status === 'all' || s.status === status)
    && (!q.trim() || `${s.receiptNo} ${s.customer || ''} ${s.cashier}`.toLowerCase().includes(q.trim().toLowerCase()))), [sales, q, status])
  const total = shown.filter((s) => s.status === 'completed').reduce((n, s) => n + s.total, 0)

  const view = async (id) => {
    try { setOpen((await api('GET', `/sales/${id}`)).sale) } catch (e) { notify(e.message, 'error') }
  }
  const refund = async () => {
    if (!window.confirm(`Refund ${open.receiptNo} for ${money(open.total)}? The items go back into stock.`)) return
    setBusy(true)
    try {
      const d = await api('POST', `/sales/${open.id}/refund`, {})
      setOpen(d.sale); notify('Sale refunded and stock restored'); load(); loadProducts()
    } catch (e) { notify(e.message, 'error') } finally { setBusy(false) }
  }

  return (
    <div className="page">
      <header className="page-head">
        <div><h1>Sales</h1><p className="muted">{admin ? 'Every sale in the shop.' : 'Your sales.'}</p></div>
        <div className="stat-inline"><span className="muted small">Shown, completed</span><strong className="num">{money(total)}</strong></div>
      </header>
      <div className="toolbar">
        <div className="search wide">
          <Icon name="search" size={18} />
          <label className="sr" htmlFor="sales-q">Search sales</label>
          <input id="sales-q" type="search" placeholder="Receipt, customer or cashier" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="chips" role="group" aria-label="Status">
          {['all', 'completed', 'refunded'].map((s) => <button type="button" key={s} className={`chip${status === s ? ' on' : ''}`} aria-pressed={status === s} onClick={() => setStatus(s)}>{label(s)}</button>)}
        </div>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {!sales && !error ? <Skeleton /> : (
        <div className="table-wrap">
          <table className="data">
            <caption className="sr">Sales, newest first</caption>
            <thead><tr><th scope="col">Receipt</th><th scope="col">Date</th><th scope="col">Cashier</th><th scope="col">Customer</th><th scope="col">Payment</th><th scope="col" className="right">Total</th><th scope="col">Status</th><th scope="col"><span className="sr">Open</span></th></tr></thead>
            <tbody>
              {shown.map((s) => (
                <tr key={s.id}>
                  <th scope="row">{s.receiptNo}</th>
                  <td>{fmtDateTime(s.createdAt)}</td><td>{s.cashier}</td><td>{s.customer || <span className="muted">Walk-in</span>}</td>
                  <td>{label(s.method)}</td><td className="right num">{money(s.total)}</td>
                  <td><span className={`badge ${s.status}`}>{label(s.status)}</span></td>
                  <td className="right"><button type="button" className="btn btn-outline btn-sm" onClick={() => view(s.id)} aria-label={`View ${s.receiptNo}`}>View</button></td>
                </tr>
              ))}
              {shown.length === 0 && <tr className="empty-row"><td colSpan={8}><EmptyState icon="receipt" title="No sales found" text="Try a different search or status." /></td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {open && (
        <Receipt sale={open} onClose={() => setOpen(null)}>
          {admin && open.status === 'completed' && <button type="button" className="btn btn-danger" disabled={busy} onClick={refund}><Icon name="undo" /> Refund</button>}
        </Receipt>
      )}
    </div>
  )
}
