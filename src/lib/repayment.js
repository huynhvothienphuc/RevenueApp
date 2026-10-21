import { capThreshold, periodStatus } from '@/lib/interest'

/**
 * Debt repayment plan on top of the interest roadmap.
 *
 * Interest is added each payout exactly like calculateRoadmap (10%, capped). The principal never goes
 * below the threshold (300tr), so interest stays at the 30tr cap every month: debts are paid only
 * from the money above it. No outside money is assumed (only deposits entered on the roadmap).
 *
 * Debts are paid in instalments, strictly in priority order (the order of the list): each payout,
 * the money above the threshold goes to the debt whose turn it is, then to the next one.
 * Instalments are round (multiples of `step`, 5tr by default) so they are easy to follow; only the
 * last one is the exact remainder. Odd change waits in the account for the next payout.
 * Due dates don't change the order; they only report how much arrives on time and what is late.
 * If debts remain after the last roadmap period, the plan continues month by month until they are paid.
 */
// Instalments are multiples of this (5tr), except the one that finishes a debt.
const DEFAULT_STEP = 5_000_000

// Safety stop for the extension (10 years).
const MAX_EXTRA_MONTHS = 120

// "2027-05-27" + 1 month -> "2027-06-27" (day kept; payouts are on the 27th).
function addMonths(date, count) {
  const [year, month, day] = date.split('-').map(Number)
  const d = new Date(year, month - 1 + count, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function planRepayment({ principal, interestRate, interestCap, periods, debts, repayStep = DEFAULT_STEP }) {
  const threshold = capThreshold({ interestRate, interestCap })
  const queue = debts
    .filter((d) => (Number(d.amount) || 0) > 0)
    .map((d) => ({
      id: d.id,
      name: d.name,
      dueDate: d.dueDate ?? null,
      amount: Number(d.amount) || 0,
      remaining: Number(d.amount) || 0,
      paidOff: null,
      paidByDue: 0,
    }))

  let balance = principal
  let started = false
  // One payout: add interest, then pay debts in priority order from the money above the threshold.
  const runPeriod = (payoutDate, status, deposit, extended) => {
    const opening = balance
    const base = opening + deposit
    const interest = Math.min(Math.round(base * interestRate), interestCap)
    const total = base + interest
    if (total >= threshold) started = true

    let cash = total
    const payments = []
    for (const debt of queue) {
      if (debt.remaining === 0) continue
      const surplus = started ? Math.max(0, cash - threshold) : 0
      // Finish the debt if possible, otherwise a round instalment.
      const amount =
        debt.remaining <= surplus ? debt.remaining : repayStep > 0 ? Math.floor(surplus / repayStep) * repayStep : surplus
      if (amount > 0) {
        debt.remaining -= amount
        cash -= amount
        if (!debt.dueDate || payoutDate <= debt.dueDate) debt.paidByDue += amount
        if (debt.remaining === 0) debt.paidOff = payoutDate
        payments.push({ debtId: debt.id, name: debt.name, amount, done: debt.remaining === 0 })
      }
      // Its turn isn't over until it is paid: later debts wait.
      if (debt.remaining > 0) break
    }

    balance = cash
    // Money above the threshold before this payout's interest: change kept from earlier payouts
    // (plus any deposit). The rest of the money available now is this payout's new interest.
    const carry = Math.max(0, base - threshold)
    return {
      payoutDate,
      // Available to pay debts: new money this payout (round, e.g. 30tr) + carried change.
      budget: started ? Math.max(0, total - threshold) - carry : null,
      carry: started ? carry : 0,
      status,
      opening,
      deposit,
      interest,
      total,
      withdraw: total - cash,
      payments,
      closing: balance,
      // Past the end of the roadmap: added only to finish paying the debts.
      extended,
    }
  }

  const rows = periods.map((period, index) => {
    const status = periodStatus(periods, index)
    return runPeriod(period.payoutDate, status, status === 'future' ? 0 : Number(period.deposit) || 0, false)
  })

  // Debts left after the roadmap: keep going month by month (same day, no deposits) until paid.
  const owed = () => queue.some((d) => d.remaining > 0)
  for (let i = 0; owed() && rows.length > 0 && i < MAX_EXTRA_MONTHS; i++) {
    rows.push(runPeriod(addMonths(rows[rows.length - 1].payoutDate, 1), 'future', 0, true))
  }

  const debtsOut = queue.map((d) => ({
    id: d.id,
    name: d.name,
    amount: d.amount,
    dueDate: d.dueDate,
    remaining: d.remaining,
    paidOff: d.paidOff,
    // Received by the due date (all of it for an undated debt).
    paidByDue: d.paidByDue,
    instalments: rows.reduce((n, r) => n + r.payments.filter((x) => x.debtId === d.id).length, 0),
    // Not received in full by the deadline (or not at all).
    late: Boolean(d.dueDate && (!d.paidOff || d.paidOff > d.dueDate)),
  }))

  return {
    rows,
    threshold,
    debts: debtsOut,
    finalBalance: balance,
    remainingDebt: debtsOut.reduce((sum, d) => sum + d.remaining, 0),
    paidOffDate:
      debtsOut.length > 0 && debtsOut.every((d) => d.paidOff)
        ? debtsOut.reduce((last, d) => (d.paidOff > last ? d.paidOff : last), '')
        : null,
  }
}
