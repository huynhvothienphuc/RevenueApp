import { endOfMonth, formatDate, formatMonth, formatShort } from '@/lib/format'

// Interest timeline: deposit month + one point per payout, total pinned. Same numbers as the roadmap table.
export function interestTimeline(data, roadmap) {
  const { rows, reachIndex, threshold } = roadmap
  return [
    { key: 'start', label: formatMonth(data.depositMonth), value: formatShort(data.principal), status: 'past' },
    ...rows.map((row, i) => ({
      key: row.payoutDate,
      label: formatMonth(row.payoutDate.slice(0, 7)),
      value: formatShort(row.total),
      status: row.status,
      note:
        [row.status === 'current' && 'Hiện tại', i === reachIndex && `Đạt ${formatShort(threshold)}`]
          .filter(Boolean)
          .join(' · ') || null,
      lines: row.withdrawals.map((w) => `−${formatShort(w.amount)} rút đầu kỳ`),
    })),
  ]
}

// Money held during each month: interest paid on the 27th counts from the next month
// (27/10 pays 278,3tr -> November holds 278,3tr). One point per month, from the first payout's month
// to the month after the last payout. The current point is the money on hand today.
export function holdingTimeline(roadmap) {
  const { rows, threshold } = roadmap
  if (rows.length === 0) return []
  const last = rows[rows.length - 1]
  const points = [
    // During a period's month the account holds the opening balance (+ any deposit), until the 27th.
    ...rows.map((row) => ({ key: row.payoutDate, month: row.payoutDate.slice(0, 7), amount: row.base, status: row.status })),
    // After the last payout: its total, in the following month.
    {
      key: 'after',
      month: nextMonth(last.payoutDate.slice(0, 7)),
      amount: last.total,
      // It is "now" only once the last payout has passed.
      status: last.status === 'past' ? 'current' : 'future',
    },
  ]
  const reachIndex = points.findIndex((p) => p.amount >= threshold)
  return points.map((p, i) => ({
    key: p.key,
    label: formatMonth(p.month),
    value: formatShort(p.amount),
    status: p.status,
    note:
      [p.status === 'current' && 'Hiện tại', i === reachIndex && `Đạt ${formatShort(threshold)}`]
        .filter(Boolean)
        .join(' · ') || null,
  }))
}

// "2027-05" -> "2027-06", "2026-12" -> "2027-01"
function nextMonth(month) {
  const [year, m] = month.split('-').map(Number)
  return m === 12 ? `${year + 1}-01` : `${year}-${String(m + 1).padStart(2, '0')}`
}

// Debt page: "+30tr" new money at the payout (the plan's "Ngân sách"), "+1,1tr dư" for change kept
// from earlier payouts, then one subtraction per debt ("−5tr (Khoản 1) ✓"). Same numbers as the plan table.
// Ends with the money left once every debt is paid, on the last day of that month ("31/7/2027").
export function paymentTimeline(data, plan) {
  const points = [
    { key: 'start', label: formatMonth(data.depositMonth), status: 'past', value: null },
    ...plan.rows.map((row, i) => ({
      key: row.payoutDate,
      label: formatMonth(row.payoutDate.slice(0, 7)),
      value: row.budget !== null ? `+${formatShort(row.budget)}` : null,
      status: row.status,
      highlight: row.withdraw > 0,
      lines: [
        // Carried change only when it is actually spent (payments exceed this payout's new money).
        ...(row.carry > 0 && row.withdraw > (row.budget ?? 0) ? [`+${formatShort(row.carry)} dư`] : []),
        ...row.payments.map((p) => `−${formatShort(p.amount)} (${p.name})${p.done ? ' ✓' : ''}`),
      ],
      note: row.extended && !plan.rows[i - 1]?.extended ? 'Kéo dài' : null,
    })),
  ]
  if (plan.paidOffDate) {
    points.push({
      key: 'end',
      label: formatDate(endOfMonth(plan.paidOffDate)),
      value: formatShort(plan.finalBalance),
      status: 'future',
      emphasis: true,
      lines: ['Còn lại · hết nợ'],
    })
  }
  return points
}
