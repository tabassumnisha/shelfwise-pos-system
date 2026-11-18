import { money } from '../config'
import { Icon } from './Icons'
import { TextField } from './Field'

const METHODS = [['card', 'card', 'Card'], ['cash', 'cash', 'Cash'], ['mobile', 'phone', 'Mobile']]

// Same arithmetic the server uses, only to preview the total. The server prices the sale again and its numbers are final.
export function previewTotals(lines, pct) {
  let subtotal = 0, discount = 0, tax = 0
  for (const { product: p, qty } of lines) {
    const gross = Math.round(p.price * 100) * qty
    const d = Math.round((gross * pct) / 100)
    subtotal += gross; discount += d
    tax += Math.round(((gross - d) * Math.round(p.taxRate * 100)) / 10000)
  }
  return { subtotal: subtotal / 100, discount: discount / 100, tax: tax / 100, total: (subtotal - discount + tax) / 100 }
}

export default function CartPanel({ lines, setQty, remove, form, setForm, totals, maxPct, busy, error, fieldErrors, onCharge, onClear }) {
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))
  const count = lines.reduce((n, l) => n + l.qty, 0)
  return (
    <section className="cart" aria-label="Current sale">
      <header className="cart-head">
        <h2>Current sale <span className="muted small">({count} {count === 1 ? 'item' : 'items'})</span></h2>
        {lines.length > 0 && <button type="button" className="link-btn" onClick={onClear}>Clear</button>}
      </header>
      {lines.length === 0 ? (
        <p className="cart-empty muted">Tap a product or scan a barcode to start.</p>
      ) : (
        <ul className="cart-lines">
          {lines.map(({ product: p, qty }) => (
            <li key={p.id}>
              <div className="cart-name"><strong>{p.name}</strong><span className="small muted">{money(p.price)} each</span></div>
              <div className="qty" role="group" aria-label={`Quantity of ${p.name}`}>
                <button type="button" className="icon-btn sm" aria-label={`Fewer ${p.name}`} onClick={() => setQty(p.id, qty - 1)}><Icon name="minus" size={16} /></button>
                <output className="num" aria-live="polite">{qty}</output>
                <button type="button" className="icon-btn sm" aria-label={`More ${p.name}`} onClick={() => setQty(p.id, qty + 1)} disabled={qty >= p.stock}><Icon name="plus" size={16} /></button>
              </div>
              <span className="cart-line num">{money(p.price * qty)}</span>
              <button type="button" className="icon-btn sm" aria-label={`Remove ${p.name}`} onClick={() => remove(p.id)}><Icon name="trash" size={16} /></button>
            </li>
          ))}
        </ul>
      )}
      <div className="cart-form">
        <div className="form-grid">
          <TextField label="Customer (optional)" value={form.customer} onChange={set('customer')} maxLength={80} />
          <TextField label={`Discount % (max ${maxPct})`} type="number" inputMode="decimal" min="0" max={maxPct} step="1" value={form.discount} onChange={set('discount')} error={fieldErrors.discountPercent} />
        </div>
        <fieldset className="methods">
          <legend>Payment</legend>
          {METHODS.map(([v, icon, text]) => (
            <label key={v} className={form.method === v ? 'on' : ''}>
              <input type="radio" name="method" value={v} checked={form.method === v} onChange={() => set('method')(v)} />
              <Icon name={icon} size={18} /> {text}
            </label>
          ))}
        </fieldset>
        {form.method === 'cash' && (
          <TextField label="Cash received" type="number" inputMode="decimal" min="0" step="0.01" value={form.tendered} onChange={set('tendered')} error={fieldErrors.tendered}
            hint={form.tendered && Number(form.tendered) >= totals.total ? `Change due ${money(Number(form.tendered) - totals.total)}` : undefined} />
        )}
      </div>
      <dl className="sum">
        <div><dt>Subtotal</dt><dd className="num">{money(totals.subtotal)}</dd></div>
        {totals.discount > 0 && <div><dt>Discount</dt><dd className="num">−{money(totals.discount)}</dd></div>}
        <div><dt>Tax</dt><dd className="num">{money(totals.tax)}</dd></div>
        <div className="grand"><dt>Total</dt><dd className="num">{money(totals.total)}</dd></div>
      </dl>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button type="button" className="btn btn-primary btn-lg btn-block" disabled={busy || lines.length === 0} onClick={onCharge}>
        {busy ? 'Processing…' : `Charge ${money(totals.total)}`}
      </button>
    </section>
  )
}
