import { useState } from 'react'
import { api } from '../api'
import Dialog from './Dialog'
import { TextField, SelectField } from './Field'

const blank = { sku: '', barcode: '', name: '', category: 'drinks', supplierId: '', price: '', cost: '0', taxRate: '0', stock: '0', reorderLevel: '5', color: '#2f6f73', active: true }

export default function ProductForm({ product, categories, suppliers, onClose, onSaved }) {
  const [f, setF] = useState(product ? { ...blank, ...product, price: product.price.toFixed(2), cost: (product.cost ?? 0).toFixed(2), taxRate: String(product.taxRate), supplierId: product.supplierId || '', barcode: product.barcode || '' } : blank)
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setError(''); setErrors({})
    try {
      const body = { ...f, supplierId: f.supplierId || null, barcode: f.barcode || null }
      const d = product ? await api('PUT', `/products/${product.id}`, body) : await api('POST', '/products', body)
      onSaved(d.product, !product)
    } catch (err) { setError(err.message); setErrors(err.fields || {}) } finally { setBusy(false) }
  }
  return (
    <Dialog title={product ? 'Edit product' : 'Add product'} onClose={onClose} wide>
      <form onSubmit={submit} noValidate>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form-grid">
          <TextField label="Name" value={f.name} onChange={set('name')} error={errors.name} className="full" />
          <TextField label="SKU" value={f.sku} onChange={set('sku')} error={errors.sku} />
          <TextField label="Barcode (optional)" inputMode="numeric" value={f.barcode} onChange={set('barcode')} error={errors.barcode} />
          <SelectField label="Category" value={f.category} onChange={set('category')} error={errors.category} options={categories.map((c) => ({ value: c.id, label: c.label }))} />
          <SelectField label="Supplier" value={f.supplierId} onChange={set('supplierId')} options={[{ value: '', label: 'None' }, ...suppliers.map((s) => ({ value: s.id, label: s.name }))]} />
          <TextField label="Price" type="number" step="0.01" min="0" value={f.price} onChange={set('price')} error={errors.price} />
          <TextField label="Cost" type="number" step="0.01" min="0" value={f.cost} onChange={set('cost')} error={errors.cost} />
          <TextField label="Tax rate %" type="number" step="0.5" min="0" max="50" value={f.taxRate} onChange={set('taxRate')} error={errors.taxRate} />
          <TextField label="Reorder level" type="number" min="0" value={f.reorderLevel} onChange={set('reorderLevel')} error={errors.reorderLevel} hint="Warn when stock is at or below this." />
          {!product && <TextField label="Opening stock" type="number" min="0" value={f.stock} onChange={set('stock')} error={errors.stock} />}
          <TextField label="Tile colour" type="color" value={f.color} onChange={set('color')} error={errors.color} />
          <label className="check full"><input type="checkbox" checked={f.active} onChange={(e) => set('active')(e.target.checked)} /> Available for sale</label>
        </div>
        <div className="btn-row dialog-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save product'}</button>
        </div>
      </form>
    </Dialog>
  )
}
