# API reference

Base path `/api`. JSON in, JSON out. Money is in dollars in responses and in requests (`price: 4.5`); the database stores cents. Every write must send `Content-Type: application/json` and come from the same origin. Errors look like `{ "error": "message", "fields": { "name": "Required" } }`.

Auth: session cookie (HttpOnly, SameSite=Lax). Roles: `admin`, `cashier`. There are no guest routes: everything below except Public needs a signed-in user.

## Public
| Method and path | Purpose |
|---|---|
| `GET /api/health` | Status and counts, no secrets |
| `GET /api/config` | Demo flag, shop rules, demo accounts (demo mode only) |
| `POST /api/auth/login` | `{ email, password }`. 401 on wrong details or inactive users, 429 after 10 tries in 15 minutes |
| `POST /api/auth/logout` | Ends the session |
| `GET /api/auth/me` | The signed-in user or `null` |
| `GET /api/auth/demo-login?role=admin\|cashier` | Demo mode only, 404 otherwise |

## Signed in (admin or cashier)
| Method and path | Purpose |
|---|---|
| `GET /api/categories` | Category list |
| `GET /api/products`, `GET /api/products/:id` | Products. Cashiers get no `cost`, and no archived products |
| `POST /api/sales` | Ring up a sale (below) |
| `GET /api/sales?limit=100` | Own sales; admins get all |
| `GET /api/sales/:id` | A sale with items. Owner or admin, otherwise 404 |

### `POST /api/sales`
```json
{ "items": [{ "productId": 2, "qty": 1 }], "discountPercent": 5, "customer": "Nadia",
  "payment": { "method": "cash", "tendered": 20 } }
```
The server loads each product, checks it is active and in stock (409 otherwise), applies the discount per line (cashier max 10%, admin max 50%, 403 above), adds per-product tax, checks cash covers the total (422), writes the sale, the lines and the stock movements, and lowers stock, all in one transaction. Anything sent about prices or totals is ignored.

## Admin only
| Method and path | Purpose |
|---|---|
| `POST /api/products`, `PUT /api/products/:id` | Create or update. 409 for a duplicate SKU or barcode |
| `DELETE /api/products/:id` | 409 when the product has sales or orders (archive it with `active: false`) |
| `POST /api/products/:id/stock` | `{ delta, note }` manual change, never below zero |
| `GET /api/products/:id/movements` | Last 50 stock movements |
| `POST /api/sales/:id/refund` | Refund once; items return to stock |
| `GET/POST /api/suppliers`, `PUT/DELETE /api/suppliers/:id` | Suppliers (delete refused when orders exist) |
| `GET/POST /api/purchases` | Purchase orders: `{ supplierId, note, items: [{ productId, qty, unitCost }] }` |
| `POST /api/purchases/:id/receive`, `/cancel` | Receive adds stock and sets cost; only `ordered` orders |
| `GET /api/reports/summary?days=14` | Totals, daily series, top sellers, payment mix, inventory (1 to 90 days) |
| `GET/POST /api/users`, `PATCH /api/users/:id` | Team. Cannot demote or deactivate yourself; deactivating ends their sessions |
| `POST /api/admin/reset-demo` | Demo mode only |

Status codes: 401 not signed in, 403 wrong role or discount over the limit, 404 not found, 409 conflict (stock, duplicates, state), 422 validation, 429 rate limit.
