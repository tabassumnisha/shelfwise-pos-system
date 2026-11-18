import { HttpError, send } from '../http.js'
import { tx } from '../db.js'
import { productForUser, productJson } from '../pos.js'
import { validateProduct, validateStockChange } from '../validate.js'

export function productRoutes({ db, q, route, requireUser, requireAdmin }) {
  const categories = () => q('SELECT id FROM categories').all().map((c) => c.id)
  const one = (id) => {
    const p = q('SELECT * FROM products WHERE id = ?').get(id)
    if (!p) throw new HttpError(404, 'Product not found')
    return p
  }
  const dupes = (e) => {
    if (/UNIQUE/.test(String(e.message))) {
      const field = /barcode/.test(e.message) ? 'barcode' : 'sku'
      throw new HttpError(409, `That ${field} is already used`, { [field]: 'Already used' })
    }
    if (/FOREIGN KEY/.test(String(e.message))) throw new HttpError(422, 'Unknown supplier', { supplier: 'Unknown supplier' })
    throw e
  }

  route('GET', '/api/categories', (c) => {
    requireUser(c)
    send(c.res, 200, { categories: q('SELECT id, label FROM categories ORDER BY sort_order').all() })
  })

  route('GET', '/api/products', (c) => {
    const user = requireUser(c)
    const rows = q('SELECT * FROM products ORDER BY name').all()
    send(c.res, 200, { products: rows.filter((p) => p.active || user.role === 'admin').map((p) => productForUser(p, user)) })
  })

  route('GET', '/api/products/:id', (c) => {
    const user = requireUser(c)
    send(c.res, 200, { product: productForUser(one(Number(c.params.id)), user) })
  })

  route('POST', '/api/products', (c) => {
    const user = requireAdmin(c)
    const v = validateProduct(c.body, categories())
    try {
      const out = tx(db, () => {
        const r = q('INSERT INTO products (sku, barcode, name, category_id, supplier_id, price_cents, cost_cents, tax_bp, stock, reorder_level, color, active) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
          .run(v.sku, v.barcode, v.name, v.category_id, v.supplier_id, v.price_cents, v.cost_cents, v.tax_bp, v.stock, v.reorder_level, v.color, v.active)
        const id = Number(r.lastInsertRowid)
        if (v.stock > 0) q("INSERT INTO stock_movements (product_id, delta, reason, user_id) VALUES (?, ?, 'initial', ?)").run(id, v.stock, user.id)
        return id
      })
      send(c.res, 201, { product: productJson(one(out)) })
    } catch (e) { dupes(e) }
  }, { body: true })

  route('PUT', '/api/products/:id', (c) => {
    requireAdmin(c)
    const id = Number(c.params.id)
    const old = one(id)
    const v = validateProduct({ ...c.body, stock: old.stock }, categories()) // stock changes go through /stock so they are logged
    try {
      q('UPDATE products SET sku=?, barcode=?, name=?, category_id=?, supplier_id=?, price_cents=?, cost_cents=?, tax_bp=?, reorder_level=?, color=?, active=? WHERE id=?')
        .run(v.sku, v.barcode, v.name, v.category_id, v.supplier_id, v.price_cents, v.cost_cents, v.tax_bp, v.reorder_level, v.color, v.active, id)
    } catch (e) { dupes(e) }
    send(c.res, 200, { product: productJson(one(id)) })
  }, { body: true })

  route('DELETE', '/api/products/:id', (c) => {
    requireAdmin(c)
    const id = Number(c.params.id)
    one(id)
    if (q('SELECT 1 FROM sale_items WHERE product_id = ?').get(id) || q('SELECT 1 FROM purchase_items WHERE product_id = ?').get(id))
      throw new HttpError(409, 'This product has sales or orders. Archive it instead (set it inactive).')
    q('DELETE FROM products WHERE id = ?').run(id)
    send(c.res, 200, { ok: true })
  }, { body: true })

  // Manual stock correction (count, damage, found stock). Always logged.
  route('POST', '/api/products/:id/stock', (c) => {
    const user = requireAdmin(c)
    const id = Number(c.params.id)
    const p = one(id)
    const v = validateStockChange(c.body)
    if (p.stock + v.delta < 0) throw new HttpError(409, `Stock cannot go below zero (now ${p.stock})`, { delta: 'Would go below zero' })
    tx(db, () => {
      q('UPDATE products SET stock = stock + ? WHERE id = ?').run(v.delta, id)
      q("INSERT INTO stock_movements (product_id, delta, reason, note, user_id) VALUES (?, ?, 'adjustment', ?, ?)").run(id, v.delta, v.note, user.id)
    })
    send(c.res, 200, { product: productJson(one(id)) })
  }, { body: true })

  route('GET', '/api/products/:id/movements', (c) => {
    requireAdmin(c)
    const id = Number(c.params.id)
    one(id)
    send(c.res, 200, { movements: q('SELECT delta, reason, ref, note, created_at AS createdAt FROM stock_movements WHERE product_id = ? ORDER BY id DESC LIMIT 50').all(id) })
  })
}
