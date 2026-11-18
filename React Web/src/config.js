// Change these values to rebrand the app.
export const STORE = {
  name: 'Shelfwise POS',
  tagline: 'Point of sale and inventory for small shops.',
  shop: 'Corner Market',
  currency: 'USD',
  locale: 'en-US',
}

const fmt = new Intl.NumberFormat(STORE.locale, { style: 'currency', currency: STORE.currency })
export const money = (n) => fmt.format(n)
