import { useEffect, useRef } from 'react'
import { Icon } from './Icons'

// Modal dialog: closes on Escape, keeps keyboard focus inside, and gives focus back when it closes.
export default function Dialog({ title, onClose, children, wide = false }) {
  const ref = useRef(null)
  useEffect(() => {
    const prev = document.activeElement
    const box = ref.current
    const focusables = () => [...box.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((e) => !e.disabled)
    const first = box.querySelector('input, select, textarea') || focusables()[0]
    first?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') return onClose()
      if (e.key !== 'Tab') return
      const f = focusables()
      if (!f.length) return
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus() }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey); prev?.focus?.() }
  }, [onClose])
  return (
    <div className="scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`dialog${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <header className="dialog-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn sm" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </header>
        <div className="dialog-body">{children}</div>
      </div>
    </div>
  )
}
