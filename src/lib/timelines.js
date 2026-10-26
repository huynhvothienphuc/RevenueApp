import { endOfMonth, formatDate, formatDayMonth, formatMonth, formatShort } from '@/lib/format'

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

// Money held from each payout to the next, labelled by the date it starts ("27/10": 278,3tr, held
// until 27/11). The first point starts a month before the first payout (27/9: the principal), the
// last one at the last payout. yearBreak marks the first point of a new year (shown as a divider).
// The current point is the money on hand today.
export function holdingTimeline(roadmap) {
  const { rows, threshold } = roadmap
  if (rows.length === 0) return []
  const last = rows[rows.length - 1]
  const points = [
    // Until a period's payout the account holds its opening balance (+ deposit − withdrawals).
    ...rows.map((row, i) => ({
      key: row.payoutDate,
      date: i === 0 ? addMonths(row.payoutDate, -1) : rows[i - 1].payoutDate,
      amount: row.base,
      status: row.status,
      // Money taken out right after the previous payout: "Lãi: 278,3tr · Đã rút: 12,3tr · Còn: 266tr".
      lines:
        row.withdrawn > 0
          ? [
              `Lãi: ${formatShort(row.opening)}`,
              `Đã rút: ${formatShort(row.withdrawn)}`,
              `Còn: ${formatShort(row.base)}`,
            ]
          : [],
    })),
    // After the last payout: its total.
    {
      key: 'after',
      date: last.payoutDate,
      amount: last.total,
      // It is "now" only once the last payout has passed.
      status: last.status === 'past' ? 'current' : 'future',
      lines: [],
    },
  ]
  const reachIndex = points.findIndex((p) => p.amount >= threshold)
  return points.map((p, i) => ({
    key: p.key,
    label: formatDayMonth(p.date),
    value: formatShort(p.amount),
    status: p.status,
    lines: p.lines,
    yearBreak: i > 0 && p.date.slice(0, 4) !== points[i - 1].date.slice(0, 4) ? p.date.slice(0, 4) : null,
    note:
      [p.status === 'current' && 'Hiện tại', i === reachIndex && `Đạt ${formatShort(threshold)}`]
        .filter(Boolean)
        .join(' · ') || null,
  }))
}

// "2026-10-27", -1 -> "2026-09-27" (payouts keep their day of the month)
function addMonths(date, count) {
  const [year, month, day] = date.split('-').map(Number)
  const d = new Date(year, month - 1 + count, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
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
