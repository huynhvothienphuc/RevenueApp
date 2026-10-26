import { cn } from '@/lib/utils'

/**
 * Horizontal timeline: one point per month with its total pinned above.
 * points: [{ key, label, value, status: 'past' | 'current' | 'future', note? }]
 * A point with value null is an empty month: shown as "—" with a small dot.
 * highlight: true colours the point (e.g. a month with a debt payment).
 * lines: optional list of short rows under the month (e.g. "−5tr Khoản 1 ✓").
 * emphasis: true marks a closing point (e.g. money left once debts are paid).
 * yearBreak: "2027" on the first point of a new year: a divider before it (labels then omit the year).
 * accentCurrent: colours the current point (blue) and its column, to spot "now" at a glance.
 * Scrolls sideways when there isn't room for every month, or with stackOnMobile turns into a
 * vertical list when its container is narrow (phones).
 */
export function MoneyTimeline({ stackOnMobile = false, ...props }) {
  if (!stackOnMobile) return <HorizontalTimeline {...props} />
  return (
    <div className="@container">
      <div className="hidden @2xl:block">
        <HorizontalTimeline {...props} />
      </div>
      <div className="@2xl:hidden">
        <VerticalTimeline {...props} />
      </div>
    </div>
  )
}

// One row per month: month | dot on a vertical line | amount and note. Used on narrow screens.
function VerticalTimeline({ points, accentCurrent = false }) {
  return (
    <ol className="flex flex-col">
      {points.map((point, i) => {
        const current = point.status === 'current'
        const accent = accentCurrent && current
        return (
          <li
            key={point.key}
            aria-current={current ? 'date' : undefined}
            className={cn(
              'grid grid-cols-[4.5rem_1.5rem_1fr] items-center gap-2 rounded-lg px-2',
              point.yearBreak && 'border-t border-dashed',
              accent && 'bg-sky-50 dark:bg-sky-950/40',
            )}
          >
            <span
              className={cn(
                'text-sm tabular-nums',
                accent
                  ? 'font-semibold text-sky-700 dark:text-sky-300'
                  : current
                    ? 'font-medium text-foreground'
                    : 'text-muted-foreground',
              )}
            >
              {point.label}
              {point.yearBreak && <span className="block text-[10px] text-muted-foreground">{point.yearBreak}</span>}
            </span>
            <div className="relative flex h-full min-h-11 items-center justify-center">
              {i > 0 && <span className="absolute top-0 left-1/2 h-1/2 w-0.5 -translate-x-1/2 bg-border" />}
              {i < points.length - 1 && (
                <span className="absolute bottom-0 left-1/2 h-1/2 w-0.5 -translate-x-1/2 bg-border" />
              )}
              <span
                className={cn(
                  'relative rounded-full',
                  accent
                    ? 'size-4 bg-sky-500 ring-4 ring-sky-500/25'
                    : point.value === null
                      ? 'size-1.5 bg-muted-foreground/40'
                      : point.status === 'past'
                        ? 'size-2.5 bg-muted-foreground'
                        : current
                          ? 'size-3.5 bg-primary ring-4 ring-primary/15'
                          : 'size-2.5 border-2 border-muted-foreground/60 bg-card',
                )}
              />
            </div>
            <div className="flex min-w-0 items-baseline justify-between gap-2 py-2">
              <div className="flex min-w-0 flex-col">
                <span
                  className={cn(
                    'font-semibold tabular-nums',
                    accent ? 'text-sky-600 dark:text-sky-400' : point.status === 'future' && 'text-muted-foreground',
                  )}
                >
                  {point.value ?? '—'}
                </span>
                {point.lines?.map((line) => (
                  <span key={line} className="text-[11px] leading-tight text-muted-foreground tabular-nums">
                    {line}
                  </span>
                ))}
              </div>
              {point.note && (
                <span
                  className={cn(
                    'truncate text-xs font-medium',
                    accent ? 'text-sky-700 dark:text-sky-300' : 'text-primary',
                  )}
                >
                  {point.note}
                </span>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function HorizontalTimeline({ points, minColumn = '4.5rem', accentCurrent = false }) {
  return (
    <div className="overflow-x-auto pb-1">
      <ol
        className="grid min-w-full"
        style={{ gridTemplateColumns: `repeat(${points.length}, minmax(${minColumn}, 1fr))` }}
      >
        {points.map((point, i) => {
          const accent = accentCurrent && point.status === 'current'
          return (
            <li
              key={point.key}
              aria-current={point.status === 'current' ? 'date' : undefined}
              className={cn(
                'relative flex min-w-0 flex-col items-center gap-1.5 rounded-lg py-2 text-center',
                accent && 'bg-sky-50 dark:bg-sky-950/40',
              )}
            >
              {point.yearBreak && (
                <span
                  title={point.yearBreak}
                  className="absolute inset-y-0 left-0 border-l border-dashed border-muted-foreground/40"
                  aria-hidden="true"
                />
              )}
              <span
                className={cn(
                  'text-sm font-semibold whitespace-nowrap tabular-nums',
                  (point.status === 'future' || point.value === null) && 'text-muted-foreground',
                  point.value === null && 'font-normal',
                  point.highlight && 'text-emerald-600 dark:text-emerald-400',
                  point.emphasis && 'text-base font-bold text-foreground',
                  accent && 'text-sky-600 dark:text-sky-400',
                )}
              >
                {point.value ?? '—'}
              </span>

              <div className="relative flex h-4 w-full items-center justify-center">
                {i > 0 && <span className="absolute top-1/2 left-0 h-0.5 w-1/2 -translate-y-1/2 bg-border" />}
                {i < points.length - 1 && (
                  <span className="absolute top-1/2 right-0 h-0.5 w-1/2 -translate-y-1/2 bg-border" />
                )}
                <span
                  className={cn(
                    'relative rounded-full',
                    accent
                      ? 'size-4 bg-sky-500 ring-4 ring-sky-500/25'
                      : point.emphasis
                      ? 'size-4 bg-primary ring-4 ring-primary/15'
                      : point.value === null
                      ? cn('size-1.5 bg-muted-foreground/40', point.status === 'current' && 'ring-4 ring-primary/15')
                      : point.highlight
                        ? cn('size-3 bg-emerald-500 ring-4 ring-emerald-500/15', point.status === 'past' && 'opacity-60')
                        : [
                          point.status === 'past' && 'size-2.5 bg-muted-foreground',
                          point.status === 'current' && 'size-3.5 bg-primary ring-4 ring-primary/15',
                          point.status === 'future' && 'size-2.5 border-2 border-muted-foreground/60 bg-card',
                        ],
                  )}
                />
              </div>

              <span
                className={cn(
                  'text-xs whitespace-nowrap',
                  accent
                    ? 'font-semibold text-sky-700 dark:text-sky-300'
                    : point.status === 'current' || point.emphasis
                      ? 'font-medium text-foreground'
                      : 'text-muted-foreground',
                )}
              >
                {point.label}
              </span>
              {point.lines?.length > 0 && (
                <ul className="flex w-full flex-col items-center gap-0.5 px-1">
                  {point.lines.map((line) => (
                    <li
                      key={line}
                      title={line}
                      className={cn(
                        'max-w-full text-[11px] leading-tight font-medium break-words tabular-nums',
                        point.highlight ? 'text-emerald-700 dark:text-emerald-400' : point.emphasis ? 'text-foreground' : 'text-muted-foreground',
                      )}
                    >
                      {line}
                    </li>
                  ))}
                </ul>
              )}
              {point.note && (
                <span
                  title={point.note}
                  className={cn(
                    'max-w-full truncate px-1 text-[11px] font-medium',
                    accent
                      ? 'text-sky-700 dark:text-sky-300'
                      : point.highlight
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-primary',
                  )}
                >
                  {point.note}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
