/**
 * The single place where money is calculated. Only principal and interest matter:
 *
 *   base     = opening + deposit         (deposit = money added during the period)
 *   interest = min(base × rate, cap)     (10%/month, at most 30tr)
 *   total    = base + interest           (becomes the next period's opening)
 *
 * Nothing calculated is stored: every change re-runs this from the first period,
 * so all later periods stay in sync.
 */

// Money at which interest hits the cap (30tr / 10% = 300tr).
export function capThreshold({ interestRate, interestCap }) {
  return interestRate > 0 ? interestCap / interestRate : Infinity
}

export function periodStatus(periods, index) {
  if (periods[index].disabled) return 'past'
  const current = periods.findIndex((p) => !p.disabled)
  return index === current ? 'current' : 'future'
}

export function calculateRoadmap({ principal, interestRate, interestCap, periods }) {
  const threshold = capThreshold({ interestRate, interestCap })
  let total = principal

  const rows = periods.map((period, index) => {
    const status = periodStatus(periods, index)
    // Only past (fixed) and current periods can hold a deposit; future ones count as 0.
    const deposit = status === 'future' ? 0 : Number(period.deposit) || 0
    const opening = total
    const base = opening + deposit
    const interest = Math.min(Math.round(base * interestRate), interestCap)
    total = base + interest
    return { payoutDate: period.payoutDate, status, opening, deposit, base, interest, total }
  })

  return {
    rows,
    threshold,
    currentIndex: rows.findIndex((row) => row.status === 'current'),
    reachIndex: rows.findIndex((row) => row.total >= threshold),
    finalTotal: rows.length ? rows[rows.length - 1].total : principal,
  }
}

// A period is fixed once its payout date has passed. Never un-fixes a period.
export function syncDisabled(periods, today) {
  return periods.map((p) => ({ ...p, disabled: Boolean(p.disabled) || p.payoutDate < today }))
}

// Monthly payout dates from the first period through endMonth ("YYYY-MM"), keeping existing entries.
export function buildPeriods(periods, endMonth) {
  if (periods.length === 0) return periods
  const [year, month, day] = periods[0].payoutDate.split('-').map(Number)
  const byDate = new Map(periods.map((p) => [p.payoutDate, p]))
  const result = []
  for (let i = 0; ; i++) {
    const d = new Date(year, month - 1 + i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (key > endMonth) break
    const payoutDate = `${key}-${String(day).padStart(2, '0')}`
    result.push(byDate.get(payoutDate) ?? { payoutDate, deposit: 0, disabled: false })
  }
  // Fixed periods are history: never drop them.
  const kept = new Set(result.map((p) => p.payoutDate))
  const fixed = periods.filter((p) => p.disabled && !kept.has(p.payoutDate))
  return [...result, ...fixed].sort((a, b) => a.payoutDate.localeCompare(b.payoutDate))
}
