// The Shelfwise mark: three shelves with items on them. Wordmark colour follows `tone`,
// so it is readable on white ("dark" text) and on dark backgrounds ("light" text).
export function Mark({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <rect width="48" height="48" rx="11" fill="#0E7C66" />
      <rect x="9" y="12" width="7" height="9" rx="1.5" fill="#FFFFFF" />
      <rect x="18" y="9" width="7" height="12" rx="1.5" fill="#F5B83D" />
      <rect x="27" y="14" width="12" height="7" rx="1.5" fill="#FFFFFF" />
      <rect x="9" y="22.5" width="30" height="2.6" rx="1.3" fill="#FFFFFF" opacity=".9" />
      <rect x="9" y="29" width="12" height="7" rx="1.5" fill="#F5B83D" />
      <rect x="23" y="27" width="7" height="9" rx="1.5" fill="#FFFFFF" />
      <rect x="32" y="30" width="7" height="6" rx="1.5" fill="#FFFFFF" />
      <rect x="9" y="37.5" width="30" height="2.6" rx="1.3" fill="#FFFFFF" opacity=".9" />
    </svg>
  )
}

export default function Logo({ tone = 'dark', size = 36 }) {
  return (
    <span className={`logo logo-${tone}`}>
      <Mark size={size} />
      <span className="logo-word">Shelfwise<small>POS</small></span>
    </span>
  )
}
