const vnd = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })
const num = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 })
const short = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 })

export const formatVND = (value) => vnd.format(value ?? 0)

export const formatNumber = (value) => num.format(value ?? 0)

// 300000000 -> "300tr", 1250000000 -> "1,3 tỷ"
export function formatShort(value) {
  const abs = Math.abs(value)
  if (abs >= 1e9) return `${short.format(value / 1e9)} tỷ`
  if (abs >= 1e6) return `${short.format(value / 1e6)}tr`
  if (abs >= 1e3) return `${short.format(value / 1e3)}k`
  return num.format(value)
}

// "2026-11" -> "11/2026"
export function formatMonth(month) {
  if (!month) return ''
  const [year, m] = month.split('-')
  return `${Number(m)}/${year}`
}

// "2026-10-27" -> "27/10/2026"
export function formatDate(date) {
  if (!date) return ''
  const [year, month, day] = date.split('-')
  return `${Number(day)}/${Number(month)}/${year}`
}

// "2026-10-27" -> "27/10" (no year: the timeline marks where a new year starts)
export function formatDayMonth(date) {
  if (!date) return ''
  const [, month, day] = date.split('-')
  return `${Number(day)}/${Number(month)}`
}

// Today as "YYYY-MM-DD" in local time
export function todayKey(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// 6130000 -> "6,13" (millions, for compact tables labelled in "triệu")
const million = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 })
export const formatMillion = (value) => million.format((value ?? 0) / 1e6)

// Debts are due on the last day of their month (always after the 27th payout).
// "2027-01-21" or "2027-01" -> "2027-01-31"; "2027-02" -> "2027-02-28".
export function endOfMonth(value) {
  if (!value) return null
  const [year, month] = String(value).split('-').map(Number)
  if (!year || !month) return null
  return `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`
}

// "2026-10-21" -> "21/10/2026", "2027-01-05" -> "05/01/2027" (always two-digit day and month)
export function formatDayPadded(date) {
  if (!date) return ''
  const [year, month, day] = date.split('-')
  return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`
}
