import { useCallback, useEffect, useMemo, useState } from 'react'

import { toggleDay } from '@/lib/checkin'
import { todayKey } from '@/lib/format'
import { supabase } from '@/lib/supabase'

const MIGRATED_KEY = 'revenueapp:checkins-migrated'

/**
 * Check-ins stored in Supabase (tables "checkins" and "checkin_goals"), shared across devices.
 * Personal app: no sign-in.
 * mode: 'local'   -> Supabase not configured: the caller keeps using browser storage.
 *       'loading' -> first load from Supabase.
 *       'cloud'   -> goal and days come from Supabase; toggle() / saveGoal() write there.
 * The first load on a browser uploads the check-ins already saved in it (once, never overwriting).
 */
export function useCloudCheckins(local) {
  const [loaded, setLoaded] = useState(false)
  const [goal, setGoal] = useState(null) // { goal, from, to } saved in Supabase, null = none yet
  const [days, setDays] = useState({})
  const [status, setStatus] = useState('idle') // idle | saving | error

  const settings = useMemo(
    () => goal ?? { goal: local.goal, from: local.from, to: local.to },
    [goal, local.goal, local.from, local.to],
  )

  const load = useCallback(() => {
    if (!supabase) return
    Promise.all([
      supabase.from('checkin_goals').select('goal, period_from, period_to').eq('id', 1).maybeSingle(),
      supabase.from('checkins').select('day, status'),
    ]).then(async ([goalRes, daysRes]) => {
      setLoaded(true)
      if (goalRes.error || daysRes.error) return setStatus('error')
      if (goalRes.data) {
        setGoal({ goal: goalRes.data.goal, from: goalRes.data.period_from, to: goalRes.data.period_to })
      }
      let cloudDays = Object.fromEntries(daysRes.data.map((row) => [row.day, row.status]))

      // First load on this browser: upload its check-ins (Supabase wins on the same day).
      let migrated = false
      try {
        migrated = localStorage.getItem(MIGRATED_KEY) === '1'
      } catch {
        // Storage unavailable: treat as not migrated (the upload never overwrites).
      }
      const localEntries = Object.entries(local.days ?? {}).filter(([day]) => !(day in cloudDays))
      if (!migrated && localEntries.length > 0) {
        const { error } = await supabase
          .from('checkins')
          .upsert(localEntries.map(([day, state]) => ({ day, status: state })))
        if (!error) cloudDays = { ...cloudDays, ...Object.fromEntries(localEntries) }
      }
      try {
        localStorage.setItem(MIGRATED_KEY, '1')
      } catch {
        // Ignore.
      }
      setDays(cloudDays)
      setStatus('idle')
    })
  }, [local.days])

  // Load once, and again whenever the tab comes back (picks up check-ins from another device).
  useEffect(() => {
    load()
    const onVisible = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [load])

  const toggle = useCallback(
    async (day) => {
      const next = toggleDay({ ...settings, days }, day, todayKey()).days
      if (next === days) return
      const previous = days
      setDays(next) // optimistic
      setStatus('saving')
      const { error } = next[day]
        ? await supabase.from('checkins').upsert({ day, status: next[day], updated_at: new Date().toISOString() })
        : await supabase.from('checkins').delete().eq('day', day)
      if (error) {
        setDays(previous)
        setStatus('error')
      } else {
        setStatus('idle')
      }
    },
    [settings, days],
  )

  const saveGoal = useCallback(async (next) => {
    setStatus('saving')
    const { error } = await supabase.from('checkin_goals').upsert({
      id: 1,
      goal: next.goal,
      period_from: next.from,
      period_to: next.to,
      updated_at: new Date().toISOString(),
    })
    if (error) return setStatus('error')
    setGoal(next)
    setStatus('idle')
  }, [])

  const mode = !supabase ? 'local' : loaded ? 'cloud' : 'loading'
  return { mode, checkins: { ...settings, days }, toggle, saveGoal, status }
}
