import { HttpError, send } from '../http.js'
import { tx } from '../db.js'
import { purchaseJson, supplierJson } from '../pos.js'
import { validatePurchase, validateSupplier } from '../validate.js'

export function purchaseRoutes({ db, q, route, requireAdmin }) {
  const supplier = (id) => {
    const s = q('SELECT * FROM suppliers WHERE id = ?').get(id)
    if (!s) throw new HttpError(404, 'Supplier not found')
    return s
  }
  const purchase = (id) => {
    const p = q('SELECT p.*, s.name AS supplier_name FROM purchases p JOIN suppliers s ON s.id = p.supplier_id WHERE p.id = ?').get(id)
    if (!p) throw new HttpError(404, 'Purchase not found')
    return p
  }
  const itemsOf = (id) => q('SELECT i.*, pr.name FROM purchase_items i JOIN products pr ON pr.id = i.product_id WHERE i.purchase_id = ? ORDER BY i.id').all(id)

  route('GET', '/api/suppliers', (c) => {
    requireAdmin(c)
    send(c.res, 200, { suppliers: q('SELECT * FROM suppliers ORDER BY name').all().map(supplierJson) })
  })
  route('POST', '/api/suppliers', (c) => {
    requireAdmin(c)
    const v = validateSupplier(c.body)
    const r = q('INSERT INTO suppliers (name, contact_name, email, phone) VALUES (?,?,?,?)').run(v.name, v.contact_name, v.email, v.phone)
    send(c.res, 201, { supplier: supplierJson(supplier(Number(r.lastInsertRowid))) })
  }, { body: true })
  route('PUT', '/api/suppliers/:id', (c) => {
    requireAdmin(c)
    const id = Number(c.params.id)
    supplier(id)
    const v = validateSupplier(c.body)
    q('UPDATE suppliers SET name=?, contact_name=?, email=?, phone=? WHERE id=?').run(v.name, v.contact_name, v.email, v.phone, id)
    send(c.res, 200, { supplier: supplierJson(supplier(id)) })
  }, { body: true })
  route('DELETE', '/api/suppliers/:id', (c) => {
    requireAdmin(c)
    const id = Number(c.params.id)
    supplier(id)
    if (q('SELECT 1 FROM purchases WHERE supplier_id = ?').get(id)) throw new HttpError(409, 'This supplier has purchase orders and cannot be deleted')
    q('DELETE FROM suppliers WHERE id = ?').run(id)
    send(c.res, 200, { ok: true })
  }, { body: true })

  route('GET', '/api/purchases', (c) => {
    requireAdmin(c)
    const rows = q('SELECT p.*, s.name AS supplier_name FROM purchases p JOIN suppliers s ON s.id = p.supplier_id ORDER BY p.id DESC LIMIT 100').all()
    send(c.res, 200, { purchases: rows.map((p) => purchaseJson(p, itemsOf(p.id))) })
  })
  route('POST', '/api/purchases', (c) => {
    const user = requireAdmin(c)
    const v = validatePurchase(c.body)
    supplier(v.supplierId)
    for (const i of v.items) if (!q('SELECT 1 FROM products WHERE id = ?').get(i.productId)) throw new HttpError(422, 'Unknown product', { items: 'Unknown product' })
    const id = tx(db, () => {
      const r = q('INSERT INTO purchases (supplier_id, note, created_by) VALUES (?,?,?)').run(v.supplierId, v.note, user.id)
      const pid = Number(r.lastInsertRowid)
      for (const i of v.items) q('INSERT INTO purchase_items (purchase_id, product_id, qty, unit_cost_cents) VALUES (?,?,?,?)').run(pid, i.productId, i.qty, i.unit_cost_cents)
      return pid
    })
    send(c.res, 201, { purchase: purchaseJson(purchase(id), itemsOf(id)) })
  }, { body: true })

  route('POST', '/api/purchases/:id/receive', (c) => {
    const user = requireAdmin(c)
    const id = Number(c.params.id)
    const p = purchase(id)
    if (p.status !== 'ordered') throw new HttpError(409, `This order is already ${p.status}`)
    tx(db, () => {
      for (const i of itemsOf(id)) {
        q('UPDATE products SET stock = stock + ?, cost_cents = ? WHERE id = ?').run(i.qty, i.unit_cost_cents, i.product_id)
        q("INSERT INTO stock_movements (product_id, delta, reason, ref, user_id) VALUES (?, ?, 'purchase', ?, ?)").run(i.product_id, i.qty, 'PO-' + id, user.id)
      }
      q("UPDATE purchases SET status = 'received', received_at = datetime('now') WHERE id = ?").run(id)
    })
    send(c.res, 200, { purchase: purchaseJson(purchase(id), itemsOf(id)) })
  }, { body: true })

  route('POST', '/api/purchases/:id/cancel', (c) => {
    requireAdmin(c)
    const id = Number(c.params.id)
    const p = purchase(id)
    if (p.status !== 'ordered') throw new HttpError(409, `This order is already ${p.status}`)
    q("UPDATE purchases SET status = 'cancelled' WHERE id = ?").run(id)
    send(c.res, 200, { purchase: purchaseJson(purchase(id), itemsOf(id)) })
  }, { body: true })
}
