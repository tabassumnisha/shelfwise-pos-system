import { HttpError, send } from '../http.js'
import { tx } from '../db.js'
import { priceSale, saleJson } from '../pos.js'
import { validateSale } from '../validate.js'

export function saleRoutes({ db, q, route, requireUser, requireAdmin, writeLimit }) {
  const items = (id) => q('SELECT * FROM sale_items WHERE sale_id = ? ORDER BY id').all(id)

  route('POST', '/api/sales', (c) => {
    const user = requireUser(c)
    if (!writeLimit.take('sale:' + user.id)) throw new HttpError(429, 'Too many sales in a short time. Try again shortly.')
    const v = validateSale(c.body)
    const saleId = tx(db, () => {
      const priced = priceSale(db, v, user)
      let tendered = priced.total, change = 0
      if (v.method === 'cash') {
        if (v.tendered < priced.total) throw new HttpError(422, 'Cash received is less than the total', { tendered: 'Less than the total' })
        tendered = v.tendered
        change = tendered - priced.total
      }
      const r = q('INSERT INTO sales (cashier_id, cashier_name, customer_name, subtotal_cents, discount_cents, tax_cents, total_cents, method, tendered_cents, change_cents) VALUES (?,?,?,?,?,?,?,?,?,?)')
        .run(user.id, user.name, v.customer, priced.subtotal, priced.discount, priced.tax, priced.total, v.method, tendered, change)
      const id = Number(r.lastInsertRowid)
      const receipt = 'R-' + (10000 + id)
      q('UPDATE sales SET receipt_no = ? WHERE id = ?').run(receipt, id)
      for (const l of priced.lines) {
        q('INSERT INTO sale_items (sale_id, product_id, name, sku, qty, unit_price_cents, unit_cost_cents, tax_bp, line_cents) VALUES (?,?,?,?,?,?,?,?,?)')
          .run(id, l.p.id, l.p.name, l.p.sku, l.qty, l.p.price_cents, l.p.cost_cents, l.p.tax_bp, l.gross)
        q('UPDATE products SET stock = stock - ? WHERE id = ?').run(l.qty, l.p.id)
        q("INSERT INTO stock_movements (product_id, delta, reason, ref, user_id) VALUES (?, ?, 'sale', ?, ?)").run(l.p.id, -l.qty, receipt, user.id)
      }
      return id
    })
    send(c.res, 201, { sale: saleJson(q('SELECT * FROM sales WHERE id = ?').get(saleId), items(saleId)) })
  }, { body: true })

  route('GET', '/api/sales', (c) => {
    const user = requireUser(c)
    const limit = Math.min(200, Math.max(1, Number(c.url.searchParams.get('limit')) || 100))
    const rows = user.role === 'admin'
      ? q('SELECT * FROM sales ORDER BY id DESC LIMIT ?').all(limit)
      : q('SELECT * FROM sales WHERE cashier_id = ? ORDER BY id DESC LIMIT ?').all(user.id, limit)
    send(c.res, 200, { sales: rows.map((s) => saleJson(s)) })
  })

  route('GET', '/api/sales/:id', (c) => {
    const user = requireUser(c)
    const s = q('SELECT * FROM sales WHERE id = ?').get(Number(c.params.id))
    if (!s || (user.role !== 'admin' && s.cashier_id !== user.id)) throw new HttpError(404, 'Sale not found')
    send(c.res, 200, { sale: saleJson(s, items(s.id)) })
  })

  route('POST', '/api/sales/:id/refund', (c) => {
    const user = requireAdmin(c)
    const id = Number(c.params.id)
    const s = q('SELECT * FROM sales WHERE id = ?').get(id)
    if (!s) throw new HttpError(404, 'Sale not found')
    if (s.status === 'refunded') throw new HttpError(409, 'This sale was already refunded')
    tx(db, () => {
      q("UPDATE sales SET status = 'refunded', refunded_at = datetime('now'), refunded_by = ? WHERE id = ?").run(user.id, id)
      for (const i of items(id)) {
        if (!i.product_id) continue
        q('UPDATE products SET stock = stock + ? WHERE id = ?').run(i.qty, i.product_id)
        q("INSERT INTO stock_movements (product_id, delta, reason, ref, user_id) VALUES (?, ?, 'refund', ?, ?)").run(i.product_id, i.qty, s.receipt_no, user.id)
      }
    })
    send(c.res, 200, { sale: saleJson(q('SELECT * FROM sales WHERE id = ?').get(id), items(id)) })
  }, { body: true })
}
