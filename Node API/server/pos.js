import { config } from './config.js'
import { HttpError } from './http.js'

// Money is integer cents in the database and dollars in the JSON the API returns.
const d = (c) => (c == null ? null : c / 100)

export const productJson = (p) => ({
  id: p.id, sku: p.sku, barcode: p.barcode, name: p.name, category: p.category_id, supplierId: p.supplier_id,
  price: d(p.price_cents), cost: d(p.cost_cents), taxRate: p.tax_bp / 100, stock: p.stock, reorderLevel: p.reorder_level,
  low: p.stock <= p.reorder_level, color: p.color, active: !!p.active,
})

// Cashiers do not see what a product costs the shop.
export const productForUser = (p, user) => {
  const j = productJson(p)
  if (user.role !== 'admin') delete j.cost
  return j
}

export const saleJson = (s, items) => ({
  id: s.id, receiptNo: s.receipt_no, cashierId: s.cashier_id, cashier: s.cashier_name, customer: s.customer_name,
  subtotal: d(s.subtotal_cents), discount: d(s.discount_cents), tax: d(s.tax_cents), total: d(s.total_cents),
  method: s.method, tendered: d(s.tendered_cents), change: d(s.change_cents), status: s.status,
  refundedAt: s.refunded_at, createdAt: s.created_at,
  ...(items ? { items: items.map((i) => ({ productId: i.product_id, name: i.name, sku: i.sku, qty: i.qty, price: d(i.unit_price_cents), taxRate: i.tax_bp / 100, line: d(i.line_cents) })) } : {}),
})

export const supplierJson = (s) => ({ id: s.id, name: s.name, contact: s.contact_name, email: s.email, phone: s.phone })

export const purchaseJson = (p, items) => ({
  id: p.id, supplierId: p.supplier_id, supplier: p.supplier_name, status: p.status, note: p.note, createdAt: p.created_at, receivedAt: p.received_at,
  total: d((items || []).reduce((n, i) => n + i.qty * i.unit_cost_cents, 0)),
  items: (items || []).map((i) => ({ productId: i.product_id, name: i.name, qty: i.qty, unitCost: d(i.unit_cost_cents) })),
})

// Prices a basket from database values only. The browser sends product ids and quantities, nothing else.
// Must run inside a transaction so the stock check and the update see the same rows.
export function priceSale(db, { items, discountPercent }, user) {
  const maxPct = user.role === 'admin' ? config.pos.maxAdminDiscountPct : config.pos.maxCashierDiscountPct
  if (discountPercent > maxPct) throw new HttpError(403, `Your role can give at most ${maxPct}% off`, { discountPercent: `At most ${maxPct}%` })
  const get = db.prepare('SELECT * FROM products WHERE id = ?')
  const lines = items.map((it) => {
    const p = get.get(it.productId)
    if (!p || !p.active) throw new HttpError(422, 'A product in the basket is not available', { items: 'Product not available' })
    if (it.qty > p.stock) throw new HttpError(409, `Only ${p.stock} of ${p.name} in stock`, { items: `Only ${p.stock} of ${p.name} in stock` })
    const gross = p.price_cents * it.qty
    const disc = Math.round((gross * discountPercent) / 100)
    const tax = Math.round(((gross - disc) * p.tax_bp) / 10000)
    return { p, qty: it.qty, gross, disc, tax }
  })
  const subtotal = lines.reduce((n, l) => n + l.gross, 0)
  const discount = lines.reduce((n, l) => n + l.disc, 0)
  const tax = lines.reduce((n, l) => n + l.tax, 0)
  return { lines, subtotal, discount, tax, total: subtotal - discount + tax }
}
