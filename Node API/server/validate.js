import { HttpError } from './http.js'
import { config } from './config.js'

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const str = (v, max, field, { required = true } = {}) => {
  const s = typeof v === 'string' ? v.trim() : ''
  if (!s && required) throw new HttpError(422, `${field} is required`, { [field]: 'Required' })
  if (s.length > max) throw new HttpError(422, `${field} is too long`, { [field]: `At most ${max} characters` })
  return s || null
}
const int = (v, field, min, max) => {
  const n = Number(v)
  if (!Number.isInteger(n) || n < min || n > max) throw new HttpError(422, `${field} must be a whole number from ${min} to ${max}`, { [field]: `Whole number, ${min} to ${max}` })
  return n
}
const cents = (v, field) => {
  const n = Number(v)
  if (v === '' || v == null || !Number.isFinite(n) || n < 0 || n > 100000) throw new HttpError(422, `${field} must be between 0 and 100000`, { [field]: 'Invalid amount' })
  return Math.round(n * 100)
}
const email = (v, required = true) => {
  const e = str(v, 160, 'email', { required })
  if (e && !EMAIL_RE.test(e)) throw new HttpError(422, 'Enter a valid email address', { email: 'Enter a valid email address' })
  return e ? e.toLowerCase() : null
}
const COLOR_RE = /^#[0-9a-fA-F]{6}$/

export function validatePassword(v) {
  const password = typeof v === 'string' ? v : ''
  if (password.length < 10 || password.length > 200) throw new HttpError(422, 'Password must be 10 to 200 characters', { password: 'Use at least 10 characters' })
  return password
}

export function validateUser(b, { partial = false } = {}) {
  if (!b || typeof b !== 'object') throw new HttpError(400, 'Invalid user')
  const out = {}
  if (!partial || b.name !== undefined) out.name = str(b.name, 80, 'name')
  if (!partial || b.email !== undefined) out.email = email(b.email)
  if (!partial || b.role !== undefined) {
    if (!['admin', 'cashier'].includes(b.role)) throw new HttpError(422, 'Role must be admin or cashier', { role: 'Choose a role' })
    out.role = b.role
  }
  if (!partial || b.password !== undefined) out.password = validatePassword(b.password)
  if (partial && b.active !== undefined) out.active = b.active ? 1 : 0
  return out
}

export function validateProduct(b, categories) {
  if (!b || typeof b !== 'object') throw new HttpError(400, 'Invalid product')
  const category = str(b.category, 40, 'category')
  if (!categories.includes(category)) throw new HttpError(422, 'Unknown category', { category: 'Unknown category' })
  const sku = str(b.sku, 40, 'sku')
  if (!/^[\w.-]+$/.test(sku)) throw new HttpError(422, 'SKU may use letters, numbers, dots, dashes and underscores', { sku: 'Letters, numbers, . - _' })
  const barcode = str(b.barcode, 32, 'barcode', { required: false })
  if (barcode && !/^\d{6,32}$/.test(barcode)) throw new HttpError(422, 'Barcode must be 6 to 32 digits', { barcode: '6 to 32 digits' })
  const color = b.color ? String(b.color) : '#2F6F73'
  if (!COLOR_RE.test(color)) throw new HttpError(422, 'Colour must look like #2F6F73', { color: 'Use a #RRGGBB colour' })
  const supplierId = b.supplierId ? int(b.supplierId, 'supplier', 1, 1e9) : null
  const taxPct = Number(b.taxRate ?? 0)
  if (!Number.isFinite(taxPct) || taxPct < 0 || taxPct > 50) throw new HttpError(422, 'Tax rate must be 0 to 50', { taxRate: '0 to 50' })
  return {
    sku, barcode, name: str(b.name, 100, 'name'), category_id: category, supplier_id: supplierId,
    price_cents: cents(b.price, 'price'), cost_cents: cents(b.cost ?? 0, 'cost'), tax_bp: Math.round(taxPct * 100),
    stock: b.stock === undefined ? 0 : int(b.stock, 'stock', 0, 1e6), reorder_level: int(b.reorderLevel ?? 5, 'reorderLevel', 0, 1e6),
    color, active: b.active === false ? 0 : 1,
  }
}

export function validateStockChange(b) {
  const delta = int(b?.delta, 'delta', -1e6, 1e6)
  if (delta === 0) throw new HttpError(422, 'Change cannot be zero', { delta: 'Enter a non-zero number' })
  return { delta, note: str(b.note, 200, 'note', { required: false }) }
}

export function validateSale(b) {
  if (!b || typeof b !== 'object') throw new HttpError(400, 'Invalid sale')
  if (!Array.isArray(b.items) || b.items.length < 1 || b.items.length > 100) throw new HttpError(422, 'Add at least one item (up to 100)', { items: 'Add at least one item' })
  const seen = new Set()
  const items = b.items.map((it) => {
    const productId = int(it?.productId, 'product', 1, 1e9)
    if (seen.has(productId)) throw new HttpError(422, 'Each product may appear once', { items: 'Duplicate product' })
    seen.add(productId)
    return { productId, qty: int(it?.qty, 'quantity', 1, config.pos.maxLineQty) }
  })
  const pct = b.discountPercent === undefined || b.discountPercent === '' ? 0 : Number(b.discountPercent)
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) throw new HttpError(422, 'Discount must be 0 to 100', { discountPercent: '0 to 100' })
  const method = b.payment?.method
  if (!['cash', 'card', 'mobile'].includes(method)) throw new HttpError(422, 'Choose cash, card or mobile', { method: 'Choose a payment method' })
  const tendered = method === 'cash' ? cents(b.payment.tendered, 'tendered') : null
  return { items, discountPercent: pct, method, tendered, customer: str(b.customer, 80, 'customer', { required: false }) }
}

export function validateSupplier(b) {
  if (!b || typeof b !== 'object') throw new HttpError(400, 'Invalid supplier')
  return { name: str(b.name, 100, 'name'), contact_name: str(b.contact, 80, 'contact', { required: false }), email: email(b.email, false), phone: str(b.phone, 40, 'phone', { required: false }) }
}

export function validatePurchase(b) {
  if (!b || typeof b !== 'object') throw new HttpError(400, 'Invalid purchase')
  if (!Array.isArray(b.items) || b.items.length < 1 || b.items.length > 100) throw new HttpError(422, 'Add at least one item', { items: 'Add at least one item' })
  const seen = new Set()
  return {
    supplierId: int(b.supplierId, 'supplier', 1, 1e9), note: str(b.note, 200, 'note', { required: false }),
    items: b.items.map((it) => {
      const productId = int(it?.productId, 'product', 1, 1e9)
      if (seen.has(productId)) throw new HttpError(422, 'Each product may appear once', { items: 'Duplicate product' })
      seen.add(productId)
      return { productId, qty: int(it?.qty, 'quantity', 1, 1e5), unit_cost_cents: cents(it?.unitCost, 'unit cost') }
    }),
  }
}
