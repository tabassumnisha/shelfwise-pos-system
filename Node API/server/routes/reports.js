import { send } from '../http.js'

export function reportRoutes({ q, route, requireAdmin }) {
  route('GET', '/api/reports/summary', (c) => {
    requireAdmin(c)
    const days = Math.min(90, Math.max(1, Number(c.url.searchParams.get('days')) || 14))
    const since = `-${days - 1} days`
    const done = "status = 'completed'"
    const totals = q(`SELECT COUNT(*) AS sales, COALESCE(SUM(total_cents),0) AS revenue, COALESCE(SUM(tax_cents),0) AS tax, COALESCE(SUM(discount_cents),0) AS discounts FROM sales WHERE ${done} AND date(created_at) >= date('now', ?)`).get(since)
    const profit = q(`SELECT COALESCE(SUM((i.unit_price_cents - i.unit_cost_cents) * i.qty),0) AS p FROM sale_items i JOIN sales s ON s.id = i.sale_id WHERE s.${done} AND date(s.created_at) >= date('now', ?)`).get(since).p
    const daily = q(`SELECT date(created_at) AS day, COUNT(*) AS sales, SUM(total_cents) AS revenue FROM sales WHERE ${done} AND date(created_at) >= date('now', ?) GROUP BY day ORDER BY day`).all(since)
    const byDay = new Map(daily.map((r) => [r.day, r]))
    const series = []
    for (let i = days - 1; i >= 0; i--) {
      const day = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10)
      const r = byDay.get(day)
      series.push({ day, sales: r?.sales || 0, revenue: (r?.revenue || 0) / 100 })
    }
    const top = q(`SELECT i.name, SUM(i.qty) AS qty, SUM(i.line_cents) AS revenue FROM sale_items i JOIN sales s ON s.id = i.sale_id WHERE s.${done} AND date(s.created_at) >= date('now', ?) GROUP BY i.name ORDER BY qty DESC, i.name LIMIT 5`).all(since)
    const methods = q(`SELECT method, COUNT(*) AS sales, SUM(total_cents) AS revenue FROM sales WHERE ${done} AND date(created_at) >= date('now', ?) GROUP BY method ORDER BY revenue DESC`).all(since)
    const low = q('SELECT COUNT(*) AS n FROM products WHERE active = 1 AND stock <= reorder_level').get().n
    const value = q('SELECT COALESCE(SUM(stock * cost_cents),0) AS v FROM products WHERE active = 1').get().v
    send(c.res, 200, {
      days,
      totals: { sales: totals.sales, revenue: totals.revenue / 100, tax: totals.tax / 100, discounts: totals.discounts / 100, profit: profit / 100, average: totals.sales ? Math.round(totals.revenue / totals.sales) / 100 : 0 },
      inventory: { lowStock: low, stockValue: value / 100 },
      series,
      top: top.map((t) => ({ name: t.name, qty: t.qty, revenue: t.revenue / 100 })),
      methods: methods.map((m) => ({ method: m.method, sales: m.sales, revenue: m.revenue / 100 })),
    })
  })
}
