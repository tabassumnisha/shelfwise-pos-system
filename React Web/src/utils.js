import { useEffect } from 'react'
import { STORE } from './config'

export const cx = (...a) => a.filter(Boolean).join(' ')

export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | ${STORE.name}` : `${STORE.name} | ${STORE.tagline}`
  }, [title])
}

// The server stores UTC 'YYYY-MM-DD HH:MM:SS'. Show it in the viewer's local time.
const asDate = (s) => new Date(String(s).replace(' ', 'T') + 'Z')
export const fmtDateTime = (s) => asDate(s).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
export const fmtDate = (s) => asDate(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
export const fmtDay = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
export const label = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '')
