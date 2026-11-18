# Shelfwise POS: point of sale and inventory system (React + Node + SQLite)

A complete point of sale for a small shop. Cashiers ring up sales at a fast terminal with search and barcode entry, take cash, card or mobile payments and print a receipt. Admins manage products and stock, order from suppliers, receive deliveries, refund sales, manage the team and read daily reports. A real Node server and SQLite database sit behind the React front end, so you can rebrand it and go live.

## 1. Demo logins

| Role | Email | Password |
|---|---|---|
| Admin | `admin@shelfwise.demo` | the value of `DEMO_ADMIN_PASSWORD` |
| Cashier | `cashier@shelfwise.demo` | the value of `DEMO_CASHIER_PASSWORD` |

No password is written in the code. On the hosted demo the sign-in page shows the logins and has "Sign in as admin" and "Sign in as cashier" buttons while `DEMO_MODE=true`. The app is at `/store/`.

## 2. What is included

**Terminal (all roles)**
- Product tiles with category filter, search by name, SKU or barcode; a scanner that types a code and presses Enter adds the item at once
- Cart with quantity controls (never above stock), customer name, percentage discount (cashier limit 10%, admin 50%), cash with change due, card and mobile payments
- Printable receipt; a failed sale changes nothing

**Sales**
- History with search and status filter; cashiers see only their own sales, admins see all
- Admins refund a sale: the items return to stock and the refund is recorded

**Admin: products, stock and suppliers**
- Add, edit, archive or delete products (delete is refused when a product has sales); per-product price, cost, tax rate and reorder level
- Manual stock changes with a note and a movement log (sale, refund, purchase, adjustment)
- Low-stock list with one-click reorder; purchase orders (ordered, received, cancelled); receiving adds stock and updates cost; supplier directory

**Admin: reports and team**
- Revenue per day chart, gross profit, average sale, top sellers, payment mix, stock value; 7, 14 or 30 days
- Team: add cashiers and admins, change roles, reset passwords, deactivate (signs the person out at once)

**Back end**
- Dependency-free Node 22 API with SQLite. The browser sends product ids and quantities only; prices, tax, discounts and stock are decided by the server inside one transaction. Stock cannot go below zero (database rule)
- Server-side authentication and roles on every route, validation, rate limiting, CSRF checks, security headers and 28 automated tests

## 3. Tech stack and quick start

| Layer | Choice |
|---|---|
| Front end | React 19, Vite 7, plain JavaScript and CSS, hash router |
| API | Node 22 with built-in `node:http`, `node:sqlite`, `node:crypto`; no npm dependencies |
| Database | SQLite, schema in `database/schema.sql`, demo data in `database/seed.sql` |
| Auth | Email + password, scrypt hashes, random session tokens stored hashed, HttpOnly SameSite cookie |

Tables: `users`, `sessions`, `categories`, `suppliers`, `products`, `sales`, `sale_items`, `stock_movements`, `purchases`, `purchase_items`.

```bash
cd "React Web" && npm ci && npm run build && cd ..
cd "Node API" && npm start          # landing page at http://localhost:3000, the app at /store/, demo data loads on first start
```

Docker: `docker compose up -d --build`. Development with hot reload: `npm run dev` in both folders. Tests: `npm test` in `Node API`. Full steps are in `HowToSetup.md`.

## 4. Configuration

Copy `.env.example` and set the values you need.

| Variable | Meaning |
|---|---|
| `DEMO_MODE` | `true` (demo only) loads sample data and the demo accounts. `false` starts empty and creates one admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD` |
| `DATABASE_PATH` | Where the SQLite file lives. Put it on a persistent disk or volume |
| `PORT` | HTTP port, default 3000 |
| `SESSION_SECRET` | Long random string. Required for signed sessions on serverless hosting (Vercel) |
| `DEMO_ADMIN_*`, `DEMO_CASHIER_*` | Demo logins (`EMAIL`, `PASSWORD`) |
| `COOKIE_SECURE`, `TRUST_PROXY` | Turn on when running behind HTTPS or a reverse proxy |

Discount limits are in `Node API/server/config.js`. Tax is set per product.

## 5. Make it yours

| To change | Edit |
|---|---|
| Shop name, currency | `React Web/src/config.js` |
| Discount limits | `Node API/server/config.js` |
| Products, prices, tax, suppliers | the admin screens, or `database/make_seed.py` for the starting data |
| Logo | `React Web/src/components/Logo.jsx` and `React Web/public/favicon.png` |
| Colours and typography | design tokens at the top of `React Web/src/styles/tokens.css` |

## 6. Deployment (four routes)

A real shop needs a host that can run Node.js and keep a file on disk (routes A to C). Static-only hosts (Netlify, GitHub Pages) cannot run the server. Route D shows the app on Vercel for demonstrations only.

**Route A: Docker on a VPS**: `docker compose up -d --build`, then put HTTPS in front (Caddy, nginx, Traefik) and set `COOKIE_SECURE=true`.

**Route B: Render, Railway, Fly.io or any Node host**: build `cd "React Web" && npm ci && npm run build`, start `cd "Node API" && npm start`, Node 22.13+, persistent disk at the folder of `DATABASE_PATH`. A `render.yaml` blueprint is included.

**Route C: plain VPS without Docker**: build `React Web`, then run `npm start` in `Node API` under systemd or pm2 behind a reverse proxy (see `HowToSetup.md`).

**Route D: Vercel (live demo only)**: import the repository. `vercel.json` and `api/index.mjs` are included. Set these Environment Variables in the Vercel project: `SESSION_SECRET` (long random string), `DEMO_ADMIN_PASSWORD`, `DEMO_CASHIER_PASSWORD`. Data lives in memory and resets when the function restarts.

Hosting estimate: 1 vCPU and 512 MB RAM is enough.

## 7. Before you go live

1. Set `DEMO_MODE=false`, set `ADMIN_EMAIL` and a long `ADMIN_PASSWORD`, and start with an empty database; then add your products and team.
2. Card payments are recorded as a method only. No card data is collected or stored. Connect a card terminal or payment provider for real card payments (see `CLAUDE.md`, "Common tasks").
3. Put the app behind HTTPS and back up the SQLite file.
4. Check local rules for receipts, sales tax and record keeping. Tax rates in the demo are examples.

## 8. Project structure

```
Node API/     package.json, package-lock.json
  server/     config, db, auth, validation, pos (pricing), http helpers, routes/ (one file per area)
  tests/      API tests
React Web/    package.json, package-lock.json, index.html (landing), vite.config.js
  src/        pages, components, state, API client, styles/
  public/     favicon
database/     schema.sql, seed.sql, make_seed.py
docs/         api.md, database.md, erd.md, customisation.md
api/          Vercel demo entry (optional)
```

`CLAUDE.md` explains the codebase for AI coding tools. It was built with Claude Code.

## 9. Licence, updates and support

Licensed under the Standard Licence in `LICENSE-NOTE.md` (one End Product per licence). Open-source notices are in `THIRD_PARTY_NOTICES.md`. See `CHANGELOG.md` for releases. Security and defect fixes are published through Vibe96 for 12 months from each sale, and support tickets are answered within two business days for 30 days.
