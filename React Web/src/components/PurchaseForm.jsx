import { useState } from 'react'
import { api } from '../api'
import { money } from '../config'
import Dialog from './Dialog'
import { TextField, SelectField } from './Field'
import { Icon } from './Icons'

// items: [{ productId, qty, unitCost }] kept as strings while typing
export default function PurchaseForm({ suppliers, products, preset, onClose, onSaved }) {
  const [supplierId, setSupplierId] = useState(String(preset?.supplierId || suppliers[0]?.id || ''))
  const [note, setNote] = useState('')
  const [items, setItems] = useState(preset?.items || [])
  const [pick, setPick] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const choices = products.filter((p) => !items.some((i) => i.productId === p.id))
  const add = () => {
    const p = products.find((x) => x.id === Number(pick))
    if (!p) return
    setItems((l) => [...l, { productId: p.id, qty: String(Math.max(p.reorderLevel * 2 - p.stock, 6)), unitCost: String(p.cost) }])
    setPick('')
  }
  const edit = (id, k, v) => setItems((l) => l.map((i) => (i.productId === id ? { ...i, [k]: v } : i)))
  const total = items.reduce((n, i) => n + (Number(i.qty) || 0) * (Number(i.unitCost) || 0), 0)

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError('')
    try {
      const d = await api('POST', '/purchases', { supplierId: Number(supplierId), note, items: items.map((i) => ({ productId: i.productId, qty: Number(i.qty), unitCost: i.unitCost })) })
      onSaved(d.purchase)
    } catch (err) { setError(err.fields?.items || err.message) } finally { setBusy(false) }
  }
  return (
    <Dialog title="New purchase order" onClose={onClose} wide>
      <form onSubmit={submit} noValidate>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form-grid">
          <SelectField label="Supplier" value={supplierId} onChange={setSupplierId} options={suppliers.map((s) => ({ value: s.id, label: s.name }))} />
          <TextField label="Note (optional)" value={note} onChange={setNote} maxLength={200} />
        </div>
        <div className="add-line">
          <SelectField label="Add a product" value={pick} onChange={setPick} options={[{ value: '', label: 'Choose a product' }, ...choices.map((p) => ({ value: p.id, label: `${p.name} (${p.stock} in stock)` }))]} />
          <button type="button" className="btn btn-outline" onClick={add} disabled={!pick}><Icon name="plus" /> Add</button>
        </div>
        {items.length > 0 && (
          <ul className="po-lines">
            {items.map((i) => {
              const p = products.find((x) => x.id === i.productId)
              return (
                <li key={i.productId}>
                  <strong>{p?.name}</strong>
                  <TextField label="Quantity" type="number" min="1" step="1" value={i.qty} onChange={(v) => edit(i.productId, 'qty', v)} />
                  <TextField label="Unit cost" type="number" min="0" step="0.01" value={i.unitCost} onChange={(v) => edit(i.productId, 'unitCost', v)} />
                  <button type="button" className="icon-btn sm" aria-label={`Remove ${p?.name}`} onClick={() => setItems((l) => l.filter((x) => x.productId !== i.productId))}><Icon name="trash" size={16} /></button>
                </li>
              )
            })}
          </ul>
        )}
        <div className="btn-row dialog-actions">
          <strong className="num po-total">Total {money(total)}</strong>
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy || items.length === 0}>{busy ? 'Saving…' : 'Create order'}</button>
        </div>
      </form>
    </Dialog>
  )
}
