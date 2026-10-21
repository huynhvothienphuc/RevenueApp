import { Lock } from 'lucide-react'

import { MoneyInput } from '@/components/money-input'
import { MoneyTimeline } from '@/components/money-timeline'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate, formatMonth, formatShort, formatVND } from '@/lib/format'
import { interestTimeline } from '@/lib/timelines'
import { cn } from '@/lib/utils'

function SummaryCard({ label, value }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
    </Card>
  )
}

function StatusBadge({ status }) {
  if (status === 'past') {
    return (
      <Badge variant="secondary">
        <Lock />
        Đã nhận lãi
      </Badge>
    )
  }
  if (status === 'current') return <Badge>Kỳ hiện tại</Badge>
  return <Badge variant="outline">Dự kiến</Badge>
}

export function OverviewPage({ data, roadmap, actions }) {
  const { rows, threshold, currentIndex, reachIndex } = roadmap
  const thresholdLabel = formatShort(threshold)
  // After the last payout there is no current period: show the final one.
  const current = rows[currentIndex] ?? rows[rows.length - 1]
  const lastMonth = rows.length ? rows[rows.length - 1].payoutDate.slice(0, 7) : ''
  // Can't shorten the roadmap past the current period.
  const minEndMonth = [...rows].reverse().find((row) => row.status !== 'future')?.payoutDate.slice(0, 7)

  const timeline = interestTimeline(data, roadmap)

  return (
    <>
      {current && (
        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryCard label={`Hiện có tháng ${formatMonth(current.payoutDate.slice(0, 7))}`} value={formatVND(current.base)} />
          <SummaryCard label="Lãi tháng này" value={`+${formatVND(current.interest)}`} />
          <SummaryCard label={`Cuối tháng (${formatDate(current.payoutDate)})`} value={formatVND(current.total)} />
        </div>
      )}

      <Card>
        <CardContent>
          <MoneyTimeline points={timeline} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Lộ trình {formatMonth(data.depositMonth)} → {formatMonth(lastMonth)}
          </CardTitle>
          <CardDescription>
            Lãi {Math.round(data.interestRate * 100)}%/tháng, tối đa {formatVND(data.interestCap)}. Chỉ sửa được tiền
            gửi thêm của kỳ hiện tại; kỳ đã nhận lãi được cố định.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="end-month" className="text-muted-foreground">
              Tính đến
            </Label>
            <Input
              id="end-month"
              type="month"
              className="h-8 w-40"
              min={minEndMonth}
              value={lastMonth}
              onChange={(e) => actions.setEndMonth(e.target.value)}
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mốc</TableHead>
                <TableHead className="text-right">Gốc</TableHead>
                <TableHead>Gửi thêm</TableHead>
                <TableHead className="text-right">Lãi</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">{formatMonth(data.depositMonth)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatVND(data.principal)}</TableCell>
                <TableCell className="text-muted-foreground">—</TableCell>
                <TableCell className="text-right text-muted-foreground">—</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{formatVND(data.principal)}</TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    <Lock />
                    Gửi tiền
                  </Badge>
                </TableCell>
              </TableRow>

              {rows.map((row, i) => (
                <TableRow key={row.payoutDate} className={cn(row.status === 'current' && 'bg-muted/50')}>
                  <TableCell className="font-medium">{formatDate(row.payoutDate)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatVND(row.opening)}</TableCell>
                  <TableCell>
                    {row.status === 'current' ? (
                      <MoneyInput
                        aria-label={`Gửi thêm trước ${formatDate(row.payoutDate)}`}
                        className="h-8 w-40 tabular-nums"
                        placeholder="0 ₫"
                        value={row.deposit || null}
                        onChange={(v) => actions.setDeposit(row.payoutDate, v)}
                      />
                    ) : row.deposit > 0 ? (
                      <span className="tabular-nums">+{formatVND(row.deposit)}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    +{formatVND(row.interest)}
                    {row.interest >= data.interestCap && (
                      <span className="ml-1 text-xs text-muted-foreground">(tối đa)</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{formatVND(row.total)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <StatusBadge status={row.status} />
                      {i === reachIndex && <Badge variant="outline">Đạt {thresholdLabel}</Badge>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}
