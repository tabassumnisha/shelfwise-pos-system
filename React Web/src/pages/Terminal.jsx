import { EmptyState } from '../components/Feedback'
import { useMemo, useRef, useState } from 'react'
import { api } from '../api'
import { useStore } from '../store'
import { money } from '../config'
import { usePageTitle, cx } from '../utils'
import { Icon } from '../components/Icons'
import CartPanel, { previewTotals } from '../components/CartPanel'
import Receipt from '../components/Receipt'

const EMPTY = { customer: '', discount: '0', method: 'card', tendered: '' }

export default function Terminal() {
  usePageTitle('Terminal')
  const { products, categories, loadProducts, notify, admin, rules } = useStore()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [cart, setCart] = useState({}) // productId -> qty
  const [form, setForm] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [receipt, setReceipt] = useState(null)
  const search = useRef(null)
  const maxPct = admin ? rules.maxAdminDiscountPct : rules.maxCashierDiscountPct

  const active = useMemo(() => products.filter((p) => p.active), [products])
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase()
    return active.filter((p) => (cat === 'all' || p.category === cat) && (!t || p.name.toLowerCase().includes(t) || p.sku.toLowerCase().includes(t) || (p.barcode || '').includes(t)))
  }, [active, q, cat])
  const lines = useMemo(() => Object.entries(cart).map(([id, qty]) => ({ product: active.find((p) => p.id === Number(id)), qty })).filter((l) => l.product), [cart, active])
  const pct = Math.min(100, Math.max(0, Number(form.discount) || 0))
  const totals = previewTotals(lines, pct)

  const setQty = (id, qty) => setCart((c) => {
    const next = { ...c }
    const p = active.find((x) => x.id === id)
    if (qty <= 0) delete next[id]
    else next[id] = Math.min(qty, p?.stock ?? qty)
    return next
  })
  const add = (p) => {
    if (p.stock <= (cart[p.id] || 0)) return notify(`No more ${p.name} in stock`)
    setQty(p.id, (cart[p.id] || 0) + 1)
  }
  // A barcode scanner types the code and presses Enter. An exact barcode or SKU adds the item at once.
  const onSearchKey = (e) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const t = q.trim().toLowerCase()
    const hit = active.find((p) => (p.barcode && p.barcode === t) || p.sku.toLowerCase() === t) || (shown.length === 1 ? shown[0] : null)
    if (hit) { add(hit); setQ('') } else if (t) notify('No product matches that code')
  }
  const reset = () => { setCart({}); setForm(EMPTY); setError(''); setFieldErrors({}) }

  const charge = async () => {
    setBusy(true); setError(''); setFieldErrors({})
    try {
      const body = {
        items: lines.map((l) => ({ productId: l.product.id, qty: l.qty })),
        discountPercent: pct,
        customer: form.customer,
        payment: { method: form.method, tendered: form.method === 'cash' ? form.tendered : undefined },
      }
      const d = await api('POST', '/sales', body)
      setReceipt(d.sale)
      reset()
      loadProducts()
    } catch (e) {
      setError(e.message); setFieldErrors(e.fields || {})
      if (e.status === 409) loadProducts()
    } finally { setBusy(false) }
  }

  const closeReceipt = () => { setReceipt(null); search.current?.focus() }
  return (
    <div className="terminal">
      <h1 className="sr">Terminal</h1>
      <section className="catalog" aria-label="Products">
        <div className="catalog-bar">
          <div className="search">
            <Icon name="search" size={18} />
            <label className="sr" htmlFor="pos-search">Search products or scan a barcode</label>
            <input id="pos-search" ref={search} type="search" placeholder="Search or scan a barcode" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onSearchKey} autoComplete="off" />
          </div>
          <div className="chips" role="group" aria-label="Category">
            {[{ id: 'all', label: 'All' }, ...categories].map((c) => (
              <button type="button" key={c.id} className={cx('chip', cat === c.id && 'on')} aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>{c.label}</button>
            ))}
          </div>
        </div>
        {shown.length === 0 ? <EmptyState icon="search" title="Nothing matches your search" text="Check the spelling or scan the barcode again." /> : (
          <ul className="tiles">
            {shown.map((p) => {
              const left = p.stock - (cart[p.id] || 0)
              return (
                <li key={p.id}>
                  <button type="button" className="tile" disabled={left <= 0} onClick={() => add(p)} style={{ '--tile': p.color }}>
                    <span className="tile-name">{p.name}</span>
                    <span className="tile-price num">{money(p.price)}</span>
                    <span className={cx('tile-stock', p.low && 'low')}>{left <= 0 ? 'Out of stock' : `${left} left`}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
      <CartPanel lines={lines} setQty={setQty} remove={(id) => setQty(id, 0)} form={form} setForm={setForm} totals={totals} maxPct={maxPct}
        busy={busy} error={error} fieldErrors={fieldErrors} onCharge={charge} onClear={reset} />
      {receipt && <Receipt sale={receipt} onClose={closeReceipt} />}
    </div>
  )
}
