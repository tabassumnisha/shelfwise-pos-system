import { useStore } from '../store'
import { STORE } from '../config'
import { usePageTitle } from '../utils'

export default function Settings() {
  usePageTitle('Settings')
  const { demoMode, resetDemo, rules } = useStore()
  return (
    <div className="page">
      <header className="page-head"><div><h1>Settings</h1><p className="muted">Shop rules the server applies to every sale.</p></div></header>
      <section className="card">
        <h2>Shop rules</h2>
        <dl className="facts">
          <div><dt>Shop</dt><dd>{STORE.shop}</dd></div>
          <div><dt>Currency</dt><dd>{STORE.currency}</dd></div>
          <div><dt>Cashier discount limit</dt><dd>{rules.maxCashierDiscountPct}%</dd></div>
          <div><dt>Admin discount limit</dt><dd>{rules.maxAdminDiscountPct}%</dd></div>
        </dl>
        <p className="muted small">Change limits in <code>Node API/server/config.js</code>. Tax is set per product.</p>
      </section>
      {demoMode && (
        <section className="card">
          <h2>Demo data</h2>
          <p className="muted">Replace every sale, product and order with the original sample data. Demo mode only.</p>
          <button type="button" className="btn btn-danger" onClick={() => window.confirm('Restore the original demo data? Your changes will be lost.') && resetDemo()}>Restore demo data</button>
        </section>
      )}
    </div>
  )
}
