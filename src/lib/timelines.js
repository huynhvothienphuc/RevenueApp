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
    })),
  ]
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
