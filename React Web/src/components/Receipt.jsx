import { STORE, money } from '../config'
import { fmtDateTime, label } from '../utils'
import Dialog from './Dialog'
import { Icon } from './Icons'

export default function Receipt({ sale, onClose, children }) {
  return (
    <Dialog title={`Receipt ${sale.receiptNo}`} onClose={onClose}>
      <div className="receipt" id="receipt">
        <p className="receipt-shop"><strong>{STORE.shop}</strong><br />{STORE.name}</p>
        <p className="small muted">{fmtDateTime(sale.createdAt)} · Cashier {sale.cashier}{sale.customer ? ` · ${sale.customer}` : ''}</p>
        {sale.status === 'refunded' && <p className="badge refunded">Refunded</p>}
        <table>
          <caption className="sr">Items on this receipt</caption>
          <thead><tr><th scope="col">Item</th><th scope="col" className="right">Qty</th><th scope="col" className="right">Amount</th></tr></thead>
          <tbody>
            {sale.items.map((i) => (
              <tr key={i.sku}><td>{i.name}<small>{money(i.price)} each</small></td><td className="right num">{i.qty}</td><td className="right num">{money(i.line)}</td></tr>
            ))}
          </tbody>
        </table>
        <dl className="sum">
          <div><dt>Subtotal</dt><dd className="num">{money(sale.subtotal)}</dd></div>
          {sale.discount > 0 && <div><dt>Discount</dt><dd className="num">−{money(sale.discount)}</dd></div>}
          <div><dt>Tax</dt><dd className="num">{money(sale.tax)}</dd></div>
          <div className="grand"><dt>Total</dt><dd className="num">{money(sale.total)}</dd></div>
          <div><dt>Paid by {label(sale.method)}</dt><dd className="num">{money(sale.tendered)}</dd></div>
          {sale.change > 0 && <div><dt>Change</dt><dd className="num">{money(sale.change)}</dd></div>}
        </dl>
        <p className="center small muted">Thank you for shopping with us.</p>
      </div>
      <div className="btn-row dialog-actions">
        <button type="button" className="btn btn-outline" onClick={() => window.print()}><Icon name="print" /> Print</button>
        {children}
        <button type="button" className="btn btn-dark" onClick={onClose}>Done</button>
      </div>
    </Dialog>
  )
}
