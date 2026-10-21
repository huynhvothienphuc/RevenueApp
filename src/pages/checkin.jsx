import { CalendarCheck, Check, Cloud, CloudOff, Pencil } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { checkinStats, isWeekend, monthGrid } from '@/lib/checkin'
import { useCloudCheckins } from '@/lib/checkin-cloud'
import { formatDayPadded } from '@/lib/format'
import { useToday } from '@/lib/today'
import { cn } from '@/lib/utils'

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

// Display only: check in with the buttons above (today, or a chosen day).
function Month({ year, month, checkins, today }) {
  const weeks = monthGrid(year, month)
  const days = weeks.flat().filter(Boolean)
  const done = days.filter((k) => checkins.days[k] === 'done').length
  return (
    <Card size="sm">
      <CardHeader className="flex items-baseline justify-between">
        <CardTitle>Tháng {month}/{year}</CardTitle>
        <CardDescription>{done} ngày đã đi</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((d) => (
            <div key={d} className="pb-1 text-xs text-muted-foreground">
              {d}
            </div>
          ))}
          {weeks.flat().map((key, i) => {
            if (!key) return <div key={`pad-${i}`} />
            const state = checkins.days[key]
            const label = `${formatDayPadded(key)}${state === 'done' ? ', đã đi' : state === 'plan' ? ', dự định' : ''}`
            return (
              <div
                key={key}
                role="img"
                aria-label={label}
                className={cn(
                  'relative flex aspect-square items-center justify-center rounded-md text-sm tabular-nums',
                  isWeekend(key) && 'text-muted-foreground/40',
                  state === 'done' && 'bg-emerald-500 font-semibold text-white',
                  state === 'plan' &&
                    'bg-orange-100 font-medium text-orange-800 ring-1 ring-orange-300 ring-inset dark:bg-orange-950/50 dark:text-orange-300',
                  key === today && 'ring-2 ring-sky-500 ring-offset-1 ring-offset-card',
                )}
              >
                {Number(key.slice(8))}
                {state === 'done' && <Check className="absolute top-0.5 right-0.5 size-3" aria-hidden="true" />}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// Where check-ins are saved, and whether the last change reached Supabase.
function SyncStatus({ cloud }) {
  if (cloud.mode === 'local') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <CloudOff className="size-3.5" /> Lưu trên trình duyệt này
      </span>
    )
  }
  return (
    <span className={cn('flex items-center gap-1.5 text-xs whitespace-nowrap', cloud.status === 'error' ? 'text-destructive' : 'text-muted-foreground')}>
      <Cloud className="size-3.5" />
      {cloud.status === 'saving' ? 'Đang lưu…' : cloud.status === 'error' ? 'Lỗi đồng bộ Supabase' : 'Đã đồng bộ'}
    </span>
  )
}

// "Mục tiêu 36 ngày, 01/10/2026 → 31/12/2026" with an inline editor.
function GoalEditor({ checkins, onSave }) {
  const [draft, setDraft] = useState(null)
  if (!draft) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        Mục tiêu {checkins.goal} ngày · {formatDayPadded(checkins.from)} → {formatDayPadded(checkins.to)}
        <button
          type="button"
          aria-label="Sửa mục tiêu"
          className="-m-1.5 rounded p-1.5 hover:bg-muted hover:text-foreground"
          onClick={() => setDraft({ goal: checkins.goal, from: checkins.from, to: checkins.to })}
        >
          <Pencil className="size-3.5" />
        </button>
      </div>
    )
  }
  const valid = draft.goal > 0 && draft.from && draft.to && draft.from <= draft.to
  return (
    <form
      className="grid grid-cols-[auto_1fr] items-center gap-2 text-sm sm:flex sm:flex-wrap"
      onSubmit={(e) => {
        e.preventDefault()
        if (!valid) return
        onSave({ goal: Number(draft.goal), from: draft.from, to: draft.to })
        setDraft(null)
      }}
    >
      <span className="text-muted-foreground">Số ngày</span>
      <Input
        type="number"
        inputMode="numeric"
        min={1}
        aria-label="Số ngày mục tiêu"
        className="h-9 sm:w-20"
        value={draft.goal}
        onChange={(e) => setDraft({ ...draft, goal: e.target.value })}
      />
      <span className="text-muted-foreground">Từ</span>
      <Input type="date" aria-label="Từ ngày" className="h-9 sm:w-40" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} />
      <span className="text-muted-foreground">Đến</span>
      <Input type="date" aria-label="Đến ngày" className="h-9 sm:w-40" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} />
      <div className="col-span-2 flex gap-2">
        <Button type="submit" className="flex-1 sm:flex-none" disabled={!valid}>
          Lưu
        </Button>
        <Button type="button" variant="ghost" className="flex-1 sm:flex-none" onClick={() => setDraft(null)}>
          Huỷ
        </Button>
      </div>
    </form>
  )
}

// Check in (or schedule) a chosen day.
function CustomDay({ checkins, today, onToggle }) {
  const [day, setDay] = useState('')
  const state = checkins.days[day]
  const valid = day && day >= checkins.from && day <= checkins.to && !isWeekend(day)
  const action = state ? 'Bỏ đánh dấu' : day > today ? 'Lên lịch' : 'Check in ngày này'
  return (
    <form
      className="flex flex-col gap-1"
      onSubmit={(e) => {
        e.preventDefault()
        if (!valid) return
        onToggle(day)
        setDay('')
      }}
    >
      <div className="flex gap-2">
        <Input
          type="date"
          aria-label="Chọn ngày"
          className="h-10 min-w-0 flex-1 sm:w-40 sm:flex-none"
          min={checkins.from}
          max={checkins.to}
          value={day}
          onChange={(e) => setDay(e.target.value)}
        />
        <Button type="submit" size="lg" className="h-10" variant={state ? 'outline' : 'secondary'} disabled={!valid}>
          {action}
        </Button>
      </div>
      {day && !valid && <p className="text-xs text-destructive">Chỉ T2–T6, trong khoảng mục tiêu.</p>}
      {valid && state && (
        <p className="text-xs text-muted-foreground">{formatDayPadded(day)}: {state === 'done' ? 'đã đi' : 'dự định'}</p>
      )}
    </form>
  )
}

// "/checkin": a bare page (no sidebar, no header), built for the phone first.
export function CheckinPage({ checkins: localCheckins, onToggle: localToggle, onSaveGoal: localSaveGoal }) {
  const today = useToday()
  const cloud = useCloudCheckins(localCheckins)
  if (cloud.mode === 'loading') {
    return (
      <main className="flex min-h-svh items-center justify-center bg-background text-sm text-muted-foreground">Đang tải…</main>
    )
  }

  // Supabase when configured, otherwise this browser's storage.
  const checkins = cloud.mode === 'cloud' ? cloud.checkins : localCheckins
  const onToggle = cloud.mode === 'cloud' ? cloud.toggle : localToggle
  const onSaveGoal = cloud.mode === 'cloud' ? cloud.saveGoal : localSaveGoal
  const stats = checkinStats(checkins, today)
  const todayDone = checkins.days[today] === 'done'
  const todayInRange = today >= checkins.from && today <= checkins.to && !isWeekend(today)
  // Only the current month's calendar; useToday moves it on at midnight.
  const [year, month] = today.split('-').map(Number)

  return (
    <main className="min-h-svh bg-background px-4 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <header className="flex items-center justify-between gap-2">
          <h1 className="flex items-center gap-2 text-lg font-semibold">
            <CalendarCheck className="size-5 text-emerald-600 dark:text-emerald-400" /> Check-in<span className="hidden sm:inline"> văn phòng</span>
          </h1>
          <SyncStatus cloud={cloud} />
        </header>

        <Card>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2">
              <GoalEditor checkins={checkins} onSave={onSaveGoal} />
              <div className="text-4xl font-semibold tabular-nums">
                {stats.done}
                <span className="text-lg text-muted-foreground"> / {stats.goal} ngày</span>
              </div>
              <div
                className="h-2 w-full overflow-hidden rounded-full bg-muted sm:w-80"
                role="progressbar"
                aria-valuenow={stats.done}
                aria-valuemin={0}
                aria-valuemax={stats.goal}
                aria-label="Tiến độ check-in"
              >
                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${stats.percent}%` }} />
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:items-end">
              <Button
                size="lg"
                className="h-12 w-full text-base sm:h-10 sm:w-auto sm:text-sm"
                variant={todayDone ? 'outline' : 'default'}
                disabled={!todayInRange}
                onClick={() => onToggle(today)}
              >
                {todayDone ? <Check /> : <CalendarCheck />}
                {todayDone ? `Đã check-in ${formatDayPadded(today)}` : 'Check in hôm nay'}
              </Button>
              <CustomDay checkins={checkins} today={today} onToggle={onToggle} />
            </div>
          </CardContent>
        </Card>


        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm bg-emerald-500" /> Đã đi
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm bg-orange-100 ring-1 ring-orange-300 ring-inset" /> Dự định
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm ring-2 ring-sky-500" /> Hôm nay
          </span>
          <span>Chỉ T2–T6.</span>
        </div>

        <div className="mx-auto w-full max-w-md">
          <Month year={year} month={month} checkins={checkins} today={today} />
        </div>
      </div>
    </main>
  )
}
