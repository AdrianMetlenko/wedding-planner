const money = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const moneyCents = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Money is always shown with "$"; there is no currency setting. */
export function formatMoney(value: number, cents = false): string {
  const sign = value < 0 ? '-' : ''
  return `${sign}$${(cents ? moneyCents : money).format(Math.abs(value))}`
}

export const formatPercent = (fraction: number) => `${Math.round(fraction * 100)}%`

export const guestName = (g: { title?: string; firstName: string; lastName: string }) =>
  [g.firstName, g.lastName].filter(Boolean).join(' ')

export function daysUntil(isoDate: string, today = new Date()): number | undefined {
  if (!isoDate) return undefined
  const target = new Date(`${isoDate}T00:00:00`)
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((target.getTime() - start.getTime()) / 86_400_000)
}
