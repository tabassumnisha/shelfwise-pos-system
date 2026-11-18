import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { useStore } from '../store'
import { money } from '../config'
import { usePageTitle, fmtDate, label } from '../utils'
import { Icon } from '../components/Icons'
import PurchaseForm from '../components/PurchaseForm'
import SupplierPanel from '../components/SupplierPanel'

const TABS = [['low', 'Low stock'], ['orders', 'Purchase orders'], ['suppliers', 'Suppliers']]

export default function Stock() {
  usePageTitle('Stock and orders')
  const { products, loadProducts, notify } = useStore()
  const [tab, setTab] = useState('low')
  const [suppliers, setSuppliers] = useState([])
  const [purchases, setPurchases] = useState([])
  const [form, setForm] = useState(null) // preset | {}
  const load = useCallback(async () => {
    try {
      const [s, p] = await Promise.all([api('GET', '/suppliers'), api('GET', '/purchases')])
      setSuppliers(s.suppliers); setPurchases(p.purchases)
    } catch (e) { notify(e.message) }
  }, [notify])
  useEffect(() => { load() }, [load])

  const low = products.filter((p) => p.active && p.low).sort((a, b) => a.stock - b.stock)
  const act = async (p, what) => {
    try { await api('POST', `/purchases/${p.id}/${what}`, {}); await load(); if (what === 'receive') await loadProducts(); notify(what === 'receive' ? 'Stock received' : 'Order cancelled') } catch (e) { notify(e.message) }
  }
  const reorder = (p) => setForm({ supplierId: p.supplierId, items: [{ productId: p.id, qty: String(Math.max(p.reorderLevel * 2 - p.stock, 6)), unitCost: String(p.cost) }] })

  return (
    <div className="page">
      <header className="page-head">
        <div><h1>Stock and orders</h1><p className="muted">Watch what is running low, order from suppliers, and receive deliveries into stock.</p></div>
        <button type="button" className="btn btn-primary" onClick={() => setForm({})} disabled={suppliers.length === 0}><Icon name="plus" /> New purchase order</button>
      </header>
      <div className="tabs" role="group" aria-label="Sections">
        {TABS.map(([v, t]) => <button type="button" key={v} className={`tab${tab === v ? ' on' : ''}`} aria-pressed={tab === v} onClick={() => setTab(v)}>{t}{v === 'low' && low.length > 0 ? ` (${low.length})` : ''}</button>)}
      </div>
      {tab === 'low' && (
        <div className="table-wrap">
          <table className="data">
            <caption className="sr">Products at or below their reorder level</caption>
            <thead><tr><th scope="col">Product</th><th scope="col" className="right">In stock</th><th scope="col" className="right">Reorder level</th><th scope="col"><span className="sr">Action</span></th></tr></thead>
            <tbody>
              {low.map((p) => (
                <tr key={p.id}>
                  <th scope="row"><span className="swatch" style={{ background: p.color }} aria-hidden="true" />{p.name}<small>{p.sku}</small></th>
                  <td className="right num">{p.stock === 0 ? <span className="badge refunded">Out</span> : p.stock}</td><td className="right num">{p.reorderLevel}</td>
                  <td className="right"><button type="button" className="btn btn-outline btn-sm" onClick={() => reorder(p)} disabled={!p.supplierId} aria-label={`Reorder ${p.name}`}>Reorder</button></td>
                </tr>
              ))}
              {low.length === 0 && <tr><td colSpan={4} className="muted">Everything is above its reorder level.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {tab === 'orders' && (
        <div className="table-wrap">
          <table className="data">
            <caption className="sr">Purchase orders</caption>
            <thead><tr><th scope="col">Order</th><th scope="col">Supplier</th><th scope="col">Items</th><th scope="col" className="right">Total</th><th scope="col">Status</th><th scope="col"><span className="sr">Actions</span></th></tr></thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id}>
                  <th scope="row">PO-{p.id}<small>{fmtDate(p.createdAt)}</small></th><td>{p.supplier}</td>
                  <td>{p.items.map((i) => `${i.qty} × ${i.name}`).join(', ')}</td><td className="right num">{money(p.total)}</td>
                  <td><span className={`badge ${p.status}`}>{label(p.status)}</span></td>
                  <td className="right actions">
                    {p.status === 'ordered' && <>
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => act(p, 'receive')} aria-label={`Receive PO-${p.id}`}>Receive</button>
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => act(p, 'cancel')} aria-label={`Cancel PO-${p.id}`}>Cancel</button>
                    </>}
                  </td>
                </tr>
              ))}
              {purchases.length === 0 && <tr><td colSpan={6} className="muted">No purchase orders yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {tab === 'suppliers' && <SupplierPanel suppliers={suppliers} reload={load} />}
      {form && <PurchaseForm suppliers={suppliers} products={products.filter((p) => p.active)} preset={form.items ? form : null} onClose={() => setForm(null)}
        onSaved={() => { setForm(null); setTab('orders'); load(); notify('Purchase order created') }} />}
    </div>
  )
}
