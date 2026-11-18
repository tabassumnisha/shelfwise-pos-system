// Run with: npm test   (Node 22.13+; uses an in-memory database, nothing on disk is touched)
import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { openDb, bootstrap } from '../server/db.js'
import { createApp } from '../server/index.js'
import { config } from '../server/config.js'

let server, base, db
const ADMIN = config.demo.admin // demo logins come from server/config.js, not from the tests
const CASHIER = config.demo.cashier

before(async () => {
  db = openDb(':memory:')
  bootstrap(db)
  server = createApp(db)
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  base = `http://127.0.0.1:${server.address().port}`
})
after(() => server.close())

async function call(method, path, { body, cookie } = {}) {
  const res = await fetch(base + path, {
    method, redirect: 'manual',
    headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  return { status: res.status, json: text ? JSON.parse(text) : null, cookie: (res.headers.get('set-cookie') || '').split(';')[0] }
}
const login = async (who) => (await call('POST', '/api/auth/login', { body: who })).cookie

const sale = (items, extra = {}) => ({ items, payment: { method: 'card' }, ...extra })
const stockOf = async (cookie, id) => (await call('GET', `/api/products/${id}`, { cookie })).json.product.stock

test('every route needs a signed-in user: no guest access to shop data', async () => {
  for (const p of ['/api/products', '/api/categories', '/api/sales', '/api/sales/1', '/api/suppliers', '/api/purchases', '/api/users', '/api/reports/summary'])
    assert.equal((await call('GET', p)).status, 401, p)
  assert.equal((await call('POST', '/api/sales', { body: sale([{ productId: 1, qty: 1 }]) })).status, 401)
})

test('write routes: 401 without login, 403 for cashiers, allowed for admin', async () => {
  const admin = await login(ADMIN), cashier = await login(CASHIER)
  const writes = [
    ['POST', '/api/products', {}], ['PUT', '/api/products/1', {}], ['DELETE', '/api/products/1', {}], ['POST', '/api/products/1/stock', { delta: 1 }],
    ['POST', '/api/sales/1/refund', {}], ['POST', '/api/suppliers', {}], ['PUT', '/api/suppliers/1', {}], ['DELETE', '/api/suppliers/1', {}],
    ['POST', '/api/purchases', {}], ['POST', '/api/purchases/3/receive', {}], ['POST', '/api/purchases/3/cancel', {}],
    ['POST', '/api/users', {}], ['PATCH', '/api/users/2', {}], ['POST', '/api/admin/reset-demo', {}],
  ]
  for (const [m, p, body] of writes) {
    assert.equal((await call(m, p, { body })).status, 401, `${m} ${p} without login`)
    assert.equal((await call(m, p, { body, cookie: cashier })).status, 403, `${m} ${p} as cashier`)
  }
  for (const p of ['/api/suppliers', '/api/purchases', '/api/users', '/api/reports/summary', '/api/products/1/movements'])
    assert.equal((await call('GET', p, { cookie: cashier })).status, 403, `GET ${p} as cashier`)
  assert.equal((await call('GET', '/api/reports/summary', { cookie: admin })).status, 200)
})

test('products: cashiers see no cost price, admin does; inactive products are hidden from cashiers', async () => {
  const admin = await login(ADMIN), cashier = await login(CASHIER)
  const a = (await call('GET', '/api/products', { cookie: admin })).json.products
  const c = (await call('GET', '/api/products', { cookie: cashier })).json.products
  assert.ok(a.every((p) => typeof p.cost === 'number'))
  assert.ok(c.every((p) => !('cost' in p)))
  const r = await call('POST', '/api/products', { cookie: admin, body: { sku: 'TST-HIDE', name: 'Hidden item', category: 'snacks', price: 1, active: false } })
  assert.equal(r.status, 201)
  assert.ok(!(await call('GET', '/api/products', { cookie: cashier })).json.products.some((p) => p.sku === 'TST-HIDE'))
})

test('product validation and duplicate SKU or barcode', async () => {
  const admin = await login(ADMIN)
  const bad = (b) => call('POST', '/api/products', { cookie: admin, body: b })
  const ok = { sku: 'TST-001', name: 'Test item', category: 'drinks', price: 2.5, cost: 1, taxRate: 8, stock: 5, barcode: '123456789012' }
  assert.equal((await bad({ ...ok, price: -1 })).status, 422)
  assert.equal((await bad({ ...ok, category: 'nope' })).status, 422)
  assert.equal((await bad({ ...ok, sku: 'bad sku!' })).status, 422)
  assert.equal((await bad({ ...ok, barcode: 'abc' })).status, 422)
  assert.equal((await bad({ ...ok, taxRate: 99 })).status, 422)
  const made = await bad(ok)
  assert.equal(made.status, 201)
  assert.equal(made.json.product.stock, 5)
  assert.equal((await bad(ok)).status, 409)
  assert.equal((await bad({ ...ok, sku: 'TST-002' })).status, 409) // same barcode
})

test('sale: the server prices the basket, ignores client prices, and takes stock', async () => {
  const cashier = await login(CASHIER)
  const before1 = await stockOf(cashier, 1), before2 = await stockOf(cashier, 2)
  // product 1: 1.25, 0% tax. product 2: 3.90, 8% tax
  const r = await call('POST', '/api/sales', { cookie: cashier, body: sale([{ productId: 1, qty: 2, price: 0.01 }, { productId: 2, qty: 1 }], { total: 0.01 }) })
  assert.equal(r.status, 201)
  const s = r.json.sale
  assert.equal(s.subtotal, 6.4)
  assert.equal(s.tax, 0.31)
  assert.equal(s.total, 6.71)
  assert.match(s.receiptNo, /^R-\d+$/)
  assert.equal(s.items.length, 2)
  assert.equal(await stockOf(cashier, 1), before1 - 2)
  assert.equal(await stockOf(cashier, 2), before2 - 1)
})

test('sale: cash needs enough money and returns change; card and mobile take the exact total', async () => {
  const cashier = await login(CASHIER)
  const items = [{ productId: 1, qty: 1 }]
  assert.equal((await call('POST', '/api/sales', { cookie: cashier, body: sale(items, { payment: { method: 'cash', tendered: 1 } }) })).status, 422)
  const ok = await call('POST', '/api/sales', { cookie: cashier, body: sale(items, { payment: { method: 'cash', tendered: 5 } }) })
  assert.equal(ok.status, 201)
  assert.equal(ok.json.sale.change, 3.75)
  const card = await call('POST', '/api/sales', { cookie: cashier, body: sale(items, { payment: { method: 'mobile' } }) })
  assert.equal(card.json.sale.tendered, 1.25)
  assert.equal(card.json.sale.change, 0)
})

test('sale: stock is never oversold, and a failed sale changes nothing', async () => {
  const cashier = await login(CASHIER)
  const before = await stockOf(cashier, 1)
  const r = await call('POST', '/api/sales', { cookie: cashier, body: sale([{ productId: 1, qty: 1 }, { productId: 5, qty: 999 }]) })
  assert.equal(r.status, 409)
  assert.equal(await stockOf(cashier, 1), before) // the first line was rolled back
  assert.equal((await call('POST', '/api/sales', { cookie: cashier, body: sale([{ productId: 35, qty: 1 }]) })).status, 409) // razors: 0 in stock
})

test('sale validation: empty basket, bad quantity, duplicate lines, unknown product, bad method', async () => {
  const cashier = await login(CASHIER)
  const post = (b) => call('POST', '/api/sales', { cookie: cashier, body: b })
  assert.equal((await post(sale([]))).status, 422)
  assert.equal((await post(sale([{ productId: 1, qty: 0 }]))).status, 422)
  assert.equal((await post(sale([{ productId: 1, qty: 1.5 }]))).status, 422)
  assert.equal((await post(sale([{ productId: 1, qty: 1 }, { productId: 1, qty: 1 }]))).status, 422)
  assert.equal((await post(sale([{ productId: 9999, qty: 1 }]))).status, 422)
  assert.equal((await post({ items: [{ productId: 1, qty: 1 }], payment: { method: 'cheque' } })).status, 422)
})

test('discounts: cashiers are capped at 10%, admins at 50%, and the discount reduces tax too', async () => {
  const admin = await login(ADMIN), cashier = await login(CASHIER)
  const items = [{ productId: 2, qty: 1 }] // 3.90 with 8% tax
  assert.equal((await call('POST', '/api/sales', { cookie: cashier, body: sale(items, { discountPercent: 11 }) })).status, 403)
  const c = await call('POST', '/api/sales', { cookie: cashier, body: sale(items, { discountPercent: 10 }) })
  assert.equal(c.status, 201)
  assert.equal(c.json.sale.discount, 0.39)
  assert.equal(c.json.sale.tax, 0.28)
  assert.equal(c.json.sale.total, 3.79)
  assert.equal((await call('POST', '/api/sales', { cookie: admin, body: sale(items, { discountPercent: 51 }) })).status, 403)
  assert.equal((await call('POST', '/api/sales', { cookie: admin, body: sale(items, { discountPercent: 50 }) })).status, 201)
})

test('sales history: cashiers see only their own sales, admin sees all', async () => {
  const admin = await login(ADMIN), cashier = await login(CASHIER)
  const mine = (await call('GET', '/api/sales', { cookie: cashier })).json.sales
  const all = (await call('GET', '/api/sales', { cookie: admin })).json.sales
  assert.ok(mine.length > 0 && mine.length < all.length)
  assert.ok(mine.every((s) => s.cashier === 'Riley Chen'))
  const others = all.find((s) => s.cashierId === 1)
  assert.equal((await call('GET', `/api/sales/${others.id}`, { cookie: cashier })).status, 404)
  assert.equal((await call('GET', `/api/sales/${others.id}`, { cookie: admin })).status, 200)
})

test('refund: admin restocks the items once; a second refund is refused', async () => {
  const admin = await login(ADMIN), cashier = await login(CASHIER)
  const made = await call('POST', '/api/sales', { cookie: cashier, body: sale([{ productId: 3, qty: 2 }]) })
  const id = made.json.sale.id
  const after = await stockOf(admin, 3)
  const r = await call('POST', `/api/sales/${id}/refund`, { cookie: admin, body: {} })
  assert.equal(r.status, 200)
  assert.equal(r.json.sale.status, 'refunded')
  assert.equal(await stockOf(admin, 3), after + 2)
  assert.equal((await call('POST', `/api/sales/${id}/refund`, { cookie: admin, body: {} })).status, 409)
  assert.equal((await call('POST', '/api/sales/99999/refund', { cookie: admin, body: {} })).status, 404)
})

test('stock adjustment is logged and can never go below zero', async () => {
  const admin = await login(ADMIN)
  const start = await stockOf(admin, 4)
  assert.equal((await call('POST', '/api/products/4/stock', { cookie: admin, body: { delta: -(start + 1) } })).status, 409)
  assert.equal((await call('POST', '/api/products/4/stock', { cookie: admin, body: { delta: 0 } })).status, 422)
  const r = await call('POST', '/api/products/4/stock', { cookie: admin, body: { delta: 5, note: 'Found a box' } })
  assert.equal(r.status, 200)
  assert.equal(r.json.product.stock, start + 5)
  const log = (await call('GET', '/api/products/4/movements', { cookie: admin })).json.movements
  assert.equal(log[0].reason, 'adjustment')
  assert.equal(log[0].delta, 5)
})

test('deleting a product: refused when it has sales, allowed when it has none', async () => {
  const admin = await login(ADMIN)
  assert.equal((await call('DELETE', '/api/products/1', { cookie: admin, body: {} })).status, 409)
  const made = await call('POST', '/api/products', { cookie: admin, body: { sku: 'TST-DEL', name: 'Delete me', category: 'snacks', price: 1 } })
  assert.equal((await call('DELETE', `/api/products/${made.json.product.id}`, { cookie: admin, body: {} })).status, 200)
  assert.equal((await call('GET', `/api/products/${made.json.product.id}`, { cookie: admin })).status, 404)
})

test('purchases: receiving adds stock and updates cost once; cancelled orders cannot be received', async () => {
  const admin = await login(ADMIN)
  const before = await stockOf(admin, 15)
  const made = await call('POST', '/api/purchases', { cookie: admin, body: { supplierId: 3, items: [{ productId: 15, qty: 10, unitCost: 1.2 }] } })
  assert.equal(made.status, 201)
  assert.equal(made.json.purchase.total, 12)
  assert.equal(await stockOf(admin, 15), before) // ordering does not change stock
  const id = made.json.purchase.id
  const r = await call('POST', `/api/purchases/${id}/receive`, { cookie: admin, body: {} })
  assert.equal(r.json.purchase.status, 'received')
  assert.equal(await stockOf(admin, 15), before + 10)
  assert.equal((await call('GET', '/api/products/15', { cookie: admin })).json.product.cost, 1.2)
  assert.equal((await call('POST', `/api/purchases/${id}/receive`, { cookie: admin, body: {} })).status, 409)
  const second = await call('POST', '/api/purchases', { cookie: admin, body: { supplierId: 3, items: [{ productId: 15, qty: 1, unitCost: 1 }] } })
  assert.equal((await call('POST', `/api/purchases/${second.json.purchase.id}/cancel`, { cookie: admin, body: {} })).json.purchase.status, 'cancelled')
  assert.equal((await call('POST', `/api/purchases/${second.json.purchase.id}/receive`, { cookie: admin, body: {} })).status, 409)
  assert.equal((await call('POST', '/api/purchases', { cookie: admin, body: { supplierId: 99, items: [{ productId: 15, qty: 1, unitCost: 1 }] } })).status, 404)
})

test('suppliers: validation, update, and no delete while orders exist', async () => {
  const admin = await login(ADMIN)
  assert.equal((await call('POST', '/api/suppliers', { cookie: admin, body: { name: '' } })).status, 422)
  assert.equal((await call('POST', '/api/suppliers', { cookie: admin, body: { name: 'X', email: 'bad' } })).status, 422)
  const s = await call('POST', '/api/suppliers', { cookie: admin, body: { name: 'Fresh Farms', email: 'a@farm.example' } })
  assert.equal(s.status, 201)
  assert.equal((await call('PUT', `/api/suppliers/${s.json.supplier.id}`, { cookie: admin, body: { name: 'Fresh Farms Ltd' } })).json.supplier.name, 'Fresh Farms Ltd')
  assert.equal((await call('DELETE', `/api/suppliers/${s.json.supplier.id}`, { cookie: admin, body: {} })).status, 200)
  assert.equal((await call('DELETE', '/api/suppliers/3', { cookie: admin, body: {} })).status, 409)
})

test('reports: totals match the sales list and the series covers every day', async () => {
  const admin = await login(ADMIN)
  const r = (await call('GET', '/api/reports/summary?days=14', { cookie: admin })).json
  assert.equal(r.series.length, 14)
  assert.ok(r.totals.revenue > 0 && r.totals.profit > 0 && r.totals.profit < r.totals.revenue)
  const sum = r.series.reduce((n, d) => n + d.revenue, 0)
  assert.ok(Math.abs(sum - r.totals.revenue) < 0.01)
  assert.ok(r.top.length > 0 && r.methods.length > 0 && r.inventory.lowStock > 0)
})

test('users: admin creates cashiers, deactivation signs them out, no self-lockout', async () => {
  const admin = await login(ADMIN)
  const u = await call('POST', '/api/users', { cookie: admin, body: { name: 'New Cashier', email: 'new@shelfwise.demo', role: 'cashier', password: 'long-enough-pw-1' } })
  assert.equal(u.status, 201)
  assert.ok(!('password' in u.json.user) && !('password_hash' in u.json.user))
  assert.equal((await call('POST', '/api/users', { cookie: admin, body: { name: 'Dup', email: 'NEW@shelfwise.demo', role: 'cashier', password: 'long-enough-pw-1' } })).status, 409)
  assert.equal((await call('POST', '/api/users', { cookie: admin, body: { name: 'Weak', email: 'weak@shelfwise.demo', role: 'cashier', password: 'short' } })).status, 422)
  assert.equal((await call('POST', '/api/users', { cookie: admin, body: { name: 'Boss', email: 'boss@shelfwise.demo', role: 'owner', password: 'long-enough-pw-1' } })).status, 422)
  const cookie = await login({ email: 'new@shelfwise.demo', password: 'long-enough-pw-1' })
  assert.equal((await call('GET', '/api/auth/me', { cookie })).json.user.role, 'cashier')
  assert.equal((await call('PATCH', `/api/users/${u.json.user.id}`, { cookie: admin, body: { active: false } })).status, 200)
  assert.equal((await call('GET', '/api/auth/me', { cookie })).json.user, null)
  assert.equal((await call('POST', '/api/auth/login', { body: { email: 'new@shelfwise.demo', password: 'long-enough-pw-1' } })).status, 401)
  assert.equal((await call('PATCH', '/api/users/1', { cookie: admin, body: { active: false } })).status, 409)
  assert.equal((await call('PATCH', '/api/users/1', { cookie: admin, body: { role: 'cashier' } })).status, 409)
})

test('there is no public registration', async () => {
  const r = await call('POST', '/api/auth/register', { body: { name: 'A', email: 'a@b.co', password: 'long-enough-pw-1' } })
  assert.equal(r.status, 404)
})

test('health reports counts and config lists the demo accounts without passwords in the code', async () => {
  const h = (await call('GET', '/api/health')).json
  assert.ok(h.products >= 36)
  assert.ok((await call('GET', '/api/config')).json.demoAccounts.length === 2)
})

test('CSRF: cross-origin and non-JSON writes are blocked', async () => {
  const admin = await login(ADMIN)
  const x = await fetch(base + '/api/admin/reset-demo', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://evil.example', cookie: admin }, body: '{}' })
  assert.equal(x.status, 403)
  const y = await fetch(base + '/api/admin/reset-demo', { method: 'POST', headers: { 'content-type': 'text/plain', cookie: admin }, body: '{}' })
  assert.equal(y.status, 415)
})

test('logout destroys the session', async () => {
  const c = await login(CASHIER)
  await call('POST', '/api/auth/logout', { body: {}, cookie: c })
  assert.equal((await call('GET', '/api/auth/me', { cookie: c })).json.user, null)
})

test('login is rate limited after repeated failures', async () => {
  let last
  for (let i = 0; i < 12; i++) last = await call('POST', '/api/auth/login', { body: { email: 'brute@example.com', password: 'nope-nope' } })
  assert.equal(last.status, 429)
})

test('demo reset restores the sample data (admin only)', async () => {
  const admin = await login(ADMIN), cust = await login(CASHIER)
  assert.equal((await call('POST', '/api/admin/reset-demo', { body: {}, cookie: cust })).status, 403)
  assert.equal((await call('POST', '/api/admin/reset-demo', { body: {}, cookie: admin })).status, 200)
  assert.equal((await call('GET', '/api/products', { cookie: admin })).json.products.length, 36)
  assert.equal((await call('GET', '/api/sales', { cookie: admin })).json.sales.length, 72)
  assert.equal((await call('GET', '/api/auth/me', { cookie: admin })).json.user.role, 'admin') // still signed in
})

test('unknown API routes return JSON 404', async () => {
  const r = await call('GET', '/api/nope')
  assert.equal(r.status, 404)
})

test('stateless sessions (serverless demo mode) work across a fresh database instance', async () => {
  process.env.STATELESS_SESSIONS = 'true'
  try {
    const r = await call('POST', '/api/auth/login', { body: ADMIN })
    assert.equal(r.status, 200)
    assert.equal((await call('GET', '/api/auth/me', { cookie: r.cookie })).json.user.role, 'admin')
    const tampered = r.cookie.replace(/.$/, (c) => (c === 'a' ? 'b' : 'a'))
    assert.equal((await call('GET', '/api/auth/me', { cookie: tampered })).json.user, null)
    assert.equal((await call('POST', '/api/products', { body: {}, cookie: tampered })).status, 401)
  } finally {
    delete process.env.STATELESS_SESSIONS
  }
})

test('request bodies already parsed by the host (Vercel) are accepted', async () => {
  const { readJson } = await import('../server/http.js')
  const h = { 'content-type': 'application/json' }
  assert.deepEqual(await readJson({ headers: h, body: { a: 1 } }), { a: 1 })
  assert.deepEqual(await readJson({ headers: h, body: '{"b":2}' }), { b: 2 })
  assert.deepEqual(await readJson({ headers: h, body: Buffer.from('{"c":3}') }), { c: 3 })
  assert.deepEqual(await readJson({ headers: h, readableEnded: true }), {})
  await assert.rejects(readJson({ headers: h, body: '{bad' }), { status: 400 })
})

test('demo (stateless) cookie works inside a frame over HTTPS; real hosts keep SameSite=Lax', async () => {
  const { sessionCookie } = await import('../server/auth.js')
  assert.match(sessionCookie('tok', true), /SameSite=Lax/)
  process.env.STATELESS_SESSIONS = 'true'
  try {
    assert.match(sessionCookie('tok', true), /SameSite=None; Path=\/; Max-Age=\d+; Secure; Partitioned/)
    assert.match(sessionCookie('tok', false), /SameSite=Lax/)
    const { createHandler } = await import('../server/routes.js')
    const prev = config.demoMode
    config.demoMode = false
    assert.throws(() => createHandler(db), /demo host only/)
    config.demoMode = prev
  } finally {
    delete process.env.STATELESS_SESSIONS
  }
})

test('demo sign-in endpoint signs in the right account and is demo-only', async () => {
  const a = await call('GET', '/api/auth/demo-login?role=admin')
  assert.equal(a.status, 200)
  assert.equal(a.json.user.role, 'admin')
  assert.equal(a.json.user.email, config.demo.admin.email)
  const cookie = a.cookie
  assert.equal((await call('GET', '/api/auth/me', { cookie })).json.user.role, 'admin')
  const c = await call('GET', '/api/auth/demo-login?role=cashier')
  assert.equal(c.json.user.role, 'cashier')
  const prev = config.demoMode
  config.demoMode = false
  assert.equal((await call('GET', '/api/auth/demo-login?role=admin')).status, 404)
  config.demoMode = prev
})
