# Changelog

## 1.0.0 (2026-11-18)
First release of Shelfwise POS, a point of sale and inventory system.
- Terminal: product tiles, search and barcode entry, cart, discount, cash change, card and mobile payments, printable receipt.
- Sales history with search and status filter; admins refund a sale and the items return to stock.
- Products: add, edit, archive or delete, per-product tax rate and reorder level, manual stock changes with a movement log.
- Stock and orders: low-stock list, one-click reorder, purchase orders, receiving that updates stock and cost, suppliers.
- Reports: revenue per day, gross profit, average sale, top sellers and payment mix for 7, 14 or 30 days.
- Team: admin and cashier accounts; deactivating an account signs the person out.
- Dependency-free Node 22 API with SQLite. Every route needs sign-in, prices, tax, discount limits and stock are decided on the server in one transaction. 28 automated tests.
- Demo mode with 36 products, 72 sample sales and one-click "Sign in as admin" and "Sign in as cashier". No password is written in the code.
- Vercel demo entry (`api/index.mjs`), Docker, Render blueprint and a plain-VPS guide.
