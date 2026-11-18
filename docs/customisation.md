# Customisation guide

| To change | Edit |
|---|---|
| Shop name and currency | `React Web/src/config.js` (`STORE`) |
| Discount limits, max quantity per line | `Node API/server/config.js` (`pos`) |
| Tax | Per product: admin, Products, Edit, Tax rate |
| Categories | Rows at the bottom of `database/schema.sql` |
| Logo | `React Web/src/components/Logo.jsx` (SVG mark and wordmark) and `React Web/public/favicon.png` |
| Colours, fonts | Tokens at the top of `React Web/src/styles/tokens.css` |
| Starting data | `database/make_seed.py`, then `python3 database/make_seed.py > database/seed.sql` |
| Receipt layout | `React Web/src/components/Receipt.jsx` (print styles in `styles/pos.css`) |

After front-end changes run `npm run build` in `React Web`. Keep prices, tax and stock logic on the server (`Node API/server/pos.js`); the browser only previews totals.
