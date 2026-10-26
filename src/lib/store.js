import { useEffect, useState } from 'react'

import seed from '@/data/data.json'
import { endOfMonth, todayKey } from '@/lib/format'
import { DEFAULT_CHECKINS, toggleDay } from '@/lib/checkin'
import { buildPeriods, periodStatus, syncDisabled } from '@/lib/interest'

const STORAGE_KEY = 'revenueapp:v2'

const clone = (value) => structuredClone(value)

// A debt is just who, how much, and when. Older backups kept a separate totalRepay: that is the amount owed.
// `note` was only used by the old sample data ("Số tiền mẫu..."), so it is dropped.
const normalizeDebt = ({ totalRepay, note: _note, ...debt }) => ({
  ...debt,
  amount: totalRepay ?? debt.amount ?? 0,
  dueDate: endOfMonth(debt.dueDate),
})

// Fixes past periods (disabled: true) based on today's date.
const withSync = (data) => ({
  ...data,
  periods: syncDisabled(data.periods, todayKey()),
  debts: (data.debts ?? []).map(normalizeDebt),
  // Office check-ins (added later: older data gets the default Oct–Dec goal).
  checkins: { ...DEFAULT_CHECKINS, ...data.checkins, days: { ...data.checkins?.days } },
})

export function isValidData(value) {
  return (
    value &&
    typeof value.principal === 'number' &&
    typeof value.interestRate === 'number' &&
    typeof value.interestCap === 'number' &&
    Array.isArray(value.periods) &&
    value.periods.every((p) => typeof p.payoutDate === 'string')
  )
}

/**
 * Brings saved data up to date with a newer src/data/data.json (its "version" went up):
 * debts and withdrawals added to the file are appended to the saved data. Everything already saved
 * is kept as is, and a debt (same id or name) or withdrawal (same id or amount) already there is not added again.
 * Runs once per version, so something deleted afterwards stays deleted.
 */
export function mergeSeed(saved, seedData = seed) {
  const seedVersion = seedData.version ?? 1
  if ((saved.version ?? 1) >= seedVersion) return saved
  const debts = saved.debts ?? []
  const known = new Set(debts.flatMap((d) => [d.id, d.name?.trim().toLowerCase()]))
  const added = (seedData.debts ?? []).filter((d) => !known.has(d.id) && !known.has(d.name?.trim().toLowerCase()))
  const seedWithdrawals = new Map((seedData.periods ?? []).map((p) => [p.payoutDate, p.withdrawals ?? []]))
  const periods = (saved.periods ?? []).map((p) => {
    // Same id, or same amount (typed in by hand before it was in data.json): already there.
    const have = new Set((p.withdrawals ?? []).flatMap((w) => [w.id, Number(w.amount)]))
    const missing = (seedWithdrawals.get(p.payoutDate) ?? []).filter((w) => !have.has(w.id) && !have.has(w.amount))
    return missing.length ? { ...p, withdrawals: [...(p.withdrawals ?? []), ...clone(missing)] } : p
  })
  return { ...saved, version: seedVersion, debts: [...debts, ...clone(added)], periods }
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (isValidData(saved)) return withSync(mergeSeed(saved))
  } catch {
    // Storage unavailable or corrupt: fall back to the seed.
  }
  return withSync(clone(seed))
}

// App data lives in localStorage, seeded from src/data/data.json and backed up as JSON.
export function useAppData() {
  const [data, setData] = useState(load)

  // Live: when the day changes (midnight, or coming back to the tab after sleep), periods whose
  // payout date has passed get fixed and the current period moves on, without reloading.
  useEffect(() => {
    const resync = () =>
      setData((d) => {
        const periods = syncDisabled(d.periods, todayKey())
        return periods.every((p, i) => p.disabled === d.periods[i].disabled) ? d : { ...d, periods }
      })
    let timer
    const scheduleMidnight = () => {
      const now = new Date()
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1)
      timer = setTimeout(() => {
        resync()
        scheduleMidnight()
      }, next - now)
    }
    scheduleMidnight()
    const onVisible = () => document.visibilityState === 'visible' && resync()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', resync)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', resync)
    }
  }, [])

  // Another tab saved a change (e.g. a withdrawal entered on /revenue while / is open): pick it up.
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return
      try {
        const saved = JSON.parse(event.newValue)
        if (isValidData(saved)) setData(withSync(mergeSeed(saved)))
      } catch {
        // Corrupt value: keep what this tab has.
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // Ignore: edits just won't survive a reload.
    }
  }, [data])

  const actions = {
    // Only the current period accepts a deposit; past ones are fixed, future ones not open yet.
    setDeposit: (payoutDate, value) =>
      setData((d) => {
        const periods = syncDisabled(d.periods, todayKey())
        const index = periods.findIndex((p) => p.payoutDate === payoutDate)
        if (index < 0 || periodStatus(periods, index) !== 'current') return d
        return { ...d, periods: periods.map((p, i) => (i === index ? { ...p, deposit: value ?? 0 } : p)) }
      }),
    // Money taken out at the start of a period. Past periods are fixed; current and future ones accept it.
    addWithdrawal: (payoutDate, amount) =>
      setData((d) => ({
        ...d,
        periods: d.periods.map((p) =>
          p.payoutDate === payoutDate && !p.disabled && amount > 0
            ? { ...p, withdrawals: [...(p.withdrawals ?? []), { id: crypto.randomUUID(), amount }] }
            : p,
        ),
      })),
    removeWithdrawal: (payoutDate, id) =>
      setData((d) => ({
        ...d,
        periods: d.periods.map((p) =>
          p.payoutDate === payoutDate && !p.disabled
            ? { ...p, withdrawals: (p.withdrawals ?? []).filter((w) => w.id !== id) }
            : p,
        ),
      })),
    setEndMonth: (month) => month && setData((d) => ({ ...d, periods: buildPeriods(d.periods, month) })),
    addDebt: (debt) => setData((d) => ({ ...d, debts: [...d.debts, { ...debt, id: crypto.randomUUID() }] })),
    updateDebt: (id, patch) =>
      setData((d) => ({ ...d, debts: d.debts.map((debt) => (debt.id === id ? { ...debt, ...patch } : debt)) })),
    // Office check-in: past/today toggles "done", future toggles "plan".
    toggleCheckin: (day) => setData((d) => ({ ...d, checkins: toggleDay(d.checkins, day, todayKey()) })),
    setCheckinGoal: ({ goal, from, to }) => setData((d) => ({ ...d, checkins: { ...d.checkins, goal, from, to } })),
    removeDebt: (id) => setData((d) => ({ ...d, debts: d.debts.filter((debt) => debt.id !== id) })),
    // Priority order: move a debt one place up (-1) or down (+1).
    moveDebt: (id, step) =>
      setData((d) => {
        const debts = [...d.debts]
        const from = debts.findIndex((debt) => debt.id === id)
        const to = from + step
        if (from < 0 || to < 0 || to >= debts.length) return d
        ;[debts[from], debts[to]] = [debts[to], debts[from]]
        return { ...d, debts }
      }),
    reset: () => setData(withSync(clone(seed))),
    exportJson: () => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `data-${todayKey()}.json`
      link.click()
      URL.revokeObjectURL(url)
    },
    // Returns true when the file was a valid backup.
    importJson: async (file) => {
      try {
        const parsed = JSON.parse(await file.text())
        if (!isValidData(parsed)) return false
        setData(withSync(parsed))
        return true
      } catch {
        return false
      }
    },
  }

  return [data, actions]
}
