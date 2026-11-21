import { Icon } from './Icons'

// Friendly empty state: icon, short title, one line of help and an optional action.
export function EmptyState({ icon = 'box', title, text, children }) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><Icon name={icon} size={28} /></span>
      <h3>{title}</h3>
      {text && <p className="muted">{text}</p>}
      {children}
    </div>
  )
}

// Loading placeholders. They keep the layout steady and tell screen readers something is loading.
export function Skeleton({ kind = 'table', rows = 6 }) {
  if (kind === 'report') {
    return (
      <div role="status" aria-label="Loading">
        <span className="sr">Loading…</span>
        <div className="kpis">{Array.from({ length: 6 }, (_, i) => <div key={i} className="kpi sk-box"><i className="sk sk-s" /><i className="sk sk-l" /></div>)}</div>
        <div className="card sk-box"><i className="sk sk-s" /><i className="sk sk-chart" /></div>
      </div>
    )
  }
  return (
    <div className="table-wrap sk-box" role="status" aria-label="Loading">
      <span className="sr">Loading…</span>
      {Array.from({ length: rows }, (_, i) => <div key={i} className="sk-row"><i className="sk sk-m" /><i className="sk sk-s" /><i className="sk sk-s" /><i className="sk sk-xs" /></div>)}
    </div>
  )
}

export function Spinner({ label = 'Loading' }) {
  return <span className="spinner" role="status" aria-label={label} />
}
