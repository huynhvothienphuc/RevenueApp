/**
 * Office check-in tracking. days: { "YYYY-MM-DD": "done" | "plan" }.
 * "done" = went to the office (past or today), "plan" = intend to go (future).
 */

export const DEFAULT_CHECKINS = { goal: 36, from: '2026-10-01', to: '2026-12-31', days: {} }

const pad = (n) => String(n).padStart(2, '0')
export const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const parse = (key) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const isWeekend = (key) => [0, 6].includes(parse(key).getDay())

// Every date from `from` to `to` inclusive.
export function datesBetween(from, to) {
  const dates = []
  for (let d = parse(from); dateKey(d) <= to; d.setDate(d.getDate() + 1)) dates.push(dateKey(d))
  return dates
}

// Clicking a day: past/today toggles "done", future toggles "plan".
// Only Monday–Friday inside the range; anything else is ignored.
export function toggleDay(checkins, key, today) {
  if (key < checkins.from || key > checkins.to || isWeekend(key)) return checkins
  const days = { ...checkins.days }
  const next = key <= today ? 'done' : 'plan'
  if (days[key] === next) delete days[key]
  else days[key] = next
  return { ...checkins, days }
}

// Weeks of a month, Monday first; null for padding cells.
export function monthGrid(year, month) {
  const first = new Date(year, month - 1, 1)
  const offset = (first.getDay() + 6) % 7
  const total = new Date(year, month, 0).getDate()
  const cells = [...Array(offset).fill(null), ...Array.from({ length: total }, (_, i) => dateKey(new Date(year, month - 1, i + 1)))]
  while (cells.length % 7) cells.push(null)
  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

export function checkinStats({ goal, from, to, days }, today) {
  const inRange = (k) => k >= from && k <= to
  const counts = (k) => inRange(k) && !isWeekend(k)
  const done = Object.entries(days).filter(([k, v]) => v === 'done' && counts(k) && k <= today).length
  const planned = Object.entries(days).filter(([k, v]) => v === 'plan' && counts(k) && k > today).length
  const needed = Math.max(0, goal - done)
  // Weekdays still available: from today (if not already checked in) to the end of the range.
  const start = today < from ? from : today
  const workdaysLeft =
    start > to ? 0 : datesBetween(start, to).filter((k) => !isWeekend(k) && !(k === today && days[k] === 'done')).length
  const weeksLeft = workdaysLeft / 5
  return {
    goal,
    done,
    planned,
    needed,
    workdaysLeft,
    perWeek: needed === 0 ? 0 : weeksLeft > 0 ? needed / weeksLeft : Infinity,
    reached: done >= goal,
    feasible: needed <= workdaysLeft,
    projected: done + planned,
    onTrack: done + planned >= goal,
    percent: Math.min(100, Math.round((done / goal) * 100)),
  }
}
