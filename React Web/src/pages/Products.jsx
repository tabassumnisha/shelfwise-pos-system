import { EmptyState } from '../components/Feedback'
import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { useStore } from '../store'
import { money } from '../config'
import { usePageTitle, fmtDateTime, label } from '../utils'
import { Icon } from '../components/Icons'
import Dialog from '../components/Dialog'
import { TextField } from '../components/Field'
import ProductForm from '../components/ProductForm'

function StockDialog({ product, onClose, onDone }) {
  const [delta, setDelta] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [moves, setMoves] = useState([])
  useEffect(() => { api('GET', `/products/${product.id}/movements`).then((d) => setMoves(d.movements)).catch(() => {}) }, [product.id])
  const submit = async (e) => {
    e.preventDefault(); setError('')
    try { onDone((await api('POST', `/products/${product.id}/stock`, { delta: Number(delta), note })).product) } catch (err) { setError(err.fields?.delta || err.message) }
  }
  return (
    <Dialog title={`Stock: ${product.name}`} onClose={onClose}>
      <p className="muted">In stock now: <strong className="num">{product.stock}</strong>. Enter a positive number to add or a negative number to remove.</p>
      <form onSubmit={submit} noValidate>
        <div className="form-grid">
          <TextField label="Change" type="number" step="1" value={delta} onChange={setDelta} error={error} />
          <TextField label="Note (optional)" value={note} onChange={setNote} maxLength={200} />
        </div>
        <div className="btn-row dialog-actions"><button className="btn btn-primary">Save stock change</button></div>
      </form>
      <h3 className="sub">Recent movements</h3>
      <ul className="moves">
        {moves.slice(0, 8).map((m, i) => <li key={i}><span className={`num ${m.delta > 0 ? 'up' : 'down'}`}>{m.delta > 0 ? '+' : ''}{m.delta}</span> {label(m.reason)}{m.ref ? ` ${m.ref}` : ''}<span className="muted small">{fmtDateTime(m.createdAt)}</span></li>)}
      </ul>
    </Dialog>
  )
}

export default function Products() {
  usePageTitle('Products')
  const { products, categories, loadProducts, notify } = useStore()
  const [suppliers, setSuppliers] = useState([])
  const [q, setQ] = useState('')
  const [only, setOnly] = useState('all')
  const [editing, setEditing] = useState(null) // product | 'new'
  const [stocking, setStocking] = useState(null)
  useEffect(() => { api('GET', '/suppliers').then((d) => setSuppliers(d.suppliers)).catch(() => {}) }, [])

  const shown = useMemo(() => products.filter((p) => (only === 'all' || (only === 'low' ? p.low && p.active : !p.active))
    && (!q.trim() || `${p.name} ${p.sku} ${p.barcode || ''}`.toLowerCase().includes(q.trim().toLowerCase()))), [products, q, only])
  const catName = (id) => categories.find((c) => c.id === id)?.label || id

  const remove = async (p) => {
    if (!window.confirm(`Delete ${p.name}? This cannot be undone.`)) return
    try { await api('DELETE', `/products/${p.id}`, {}); await loadProducts(); notify('Product deleted') } catch (e) { notify(e.message, 'error') }
  }
  const saved = async (p, isNew) => { setEditing(null); await loadProducts(); notify(isNew ? 'Product added' : 'Product saved') }

  return (
    <div className="page">
      <header className="page-head">
        <div><h1>Products</h1><p className="muted">{products.length} products. Prices, tax and stock are set here and checked by the server at the till.</p></div>
        <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}><Icon name="plus" /> Add product</button>
      </header>
      <div className="toolbar">
        <div className="search wide"><Icon name="search" size={18} /><label className="sr" htmlFor="prod-q">Search products</label>
          <input id="prod-q" type="search" placeholder="Name, SKU or barcode" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="chips" role="group" aria-label="Filter">
          {[['all', 'All'], ['low', 'Low stock'], ['off', 'Archived']].map(([v, t]) => <button type="button" key={v} className={`chip${only === v ? ' on' : ''}`} aria-pressed={only === v} onClick={() => setOnly(v)}>{t}</button>)}
        </div>
      </div>
      <div className="table-wrap">
        <table className="data">
          <caption className="sr">Products</caption>
          <thead><tr><th scope="col">Product</th><th scope="col">Category</th><th scope="col" className="right">Price</th><th scope="col" className="right">Cost</th><th scope="col" className="right">Stock</th><th scope="col"><span className="sr">Actions</span></th></tr></thead>
          <tbody>
            {shown.map((p) => (
              <tr key={p.id} className={p.active ? '' : 'off'}>
                <th scope="row"><span className="swatch" style={{ background: p.color }} aria-hidden="true" />{p.name}<small>{p.sku}{p.barcode ? ` · ${p.barcode}` : ''}{p.active ? '' : ' · Archived'}</small></th>
                <td>{catName(p.category)}</td><td className="right num">{money(p.price)}</td><td className="right num">{money(p.cost)}</td>
                <td className="right num">{p.stock} {p.low && p.active && <span className="badge low">Low</span>}</td>
                <td className="right actions">
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setStocking(p)} aria-label={`Adjust stock of ${p.name}`}>Stock</button>
                  <button type="button" className="icon-btn sm" onClick={() => setEditing(p)} aria-label={`Edit ${p.name}`}><Icon name="edit" size={18} /></button>
                  <button type="button" className="icon-btn sm" onClick={() => remove(p)} aria-label={`Delete ${p.name}`}><Icon name="trash" size={18} /></button>
                </td>
              </tr>
            ))}
            {shown.length === 0 && <tr className="empty-row"><td colSpan={6}><EmptyState icon="box" title="No products found" text="Try a different search or category." /></td></tr>}
          </tbody>
        </table>
      </div>
      {editing && <ProductForm product={editing === 'new' ? null : editing} categories={categories} suppliers={suppliers} onClose={() => setEditing(null)} onSaved={saved} />}
      {stocking && <StockDialog product={stocking} onClose={() => setStocking(null)} onDone={async () => { setStocking(null); await loadProducts(); notify('Stock updated') }} />}
    </div>
  )
}
