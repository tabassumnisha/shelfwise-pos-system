const PATHS = {
  search: 'M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zm5-2 5 5',
  close: 'M6 6l12 12M18 6L6 18',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  menu: 'M4 7h16M4 12h16M4 17h16',
  edit: 'M4 20h4L19 9l-4-4L4 16v4zM13 7l4 4',
  trash: 'M5 7h14M9 7V4h6v3m-8 0 1 13h8l1-13',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-8 9c0-4 3.6-6 8-6s8 2 8 6',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14.8c2.2.7 4 2.3 4 5.2',
  logout: 'M10 5H5v14h5M15 8l4 4-4 4M19 12H9',
  box: 'M3 8l9-5 9 5v8l-9 5-9-5V8zm0 0 9 5 9-5M12 13v8',
  chart: 'M4 20V10m6 10V4m6 16v-7m4 7H3',
  register: 'M5 3h14v18H5zM8 7h8M8 11h2m3 0h3M8 15h2m3 0h3',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6',
  truck: 'M3 6h11v10H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  alert: 'M12 4l9 16H3zM12 10v4m0 3v.01',
  print: 'M7 9V3h10v6M7 17H4v-6h16v6h-3M7 14h10v7H7z',
  undo: 'M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
  cash: 'M3 7h18v10H3zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM6 10v.01M18 14v.01',
  card: 'M3 6h18v12H3zM3 10h18M7 15h3',
  phone: 'M8 3h8v18H8zM11 18h2',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7-3 2-1-2-4-2 .5-1.5-1.2L15 4h-4l-.5 2.3L9 7.5 7 7 5 11l2 1v1l-2 1 2 4 2-.5 1.5 1.2L11 20h4l.5-2.3 1.5-1.2 2 .5 2-4-2-1v-1z',
  shield: 'M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3zm-3 9 2.2 2.2L15 10',
  scan: 'M4 8V5a1 1 0 0 1 1-1h3m8 0h3a1 1 0 0 1 1 1v3m0 8v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M8 8v8m3-8v8m3-8v8',
}

export function Icon({ name, size = 20, stroke = 1.7, className, ...rest }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...rest}>
      <path d={PATHS[name]} />
    </svg>
  )
}
