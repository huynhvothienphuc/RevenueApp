import { HandCoins, LayoutDashboard } from 'lucide-react'

// hidden: not listed in the sidebar, only reachable by its URL.
// bare: rendered on its own, without the sidebar and header.
// Any unknown URL redirects to HOME (the first page).
export const pages = [
  { id: 'landing', path: '/', title: 'Trang chủ', hidden: true, bare: true },
  { id: 'overview', path: '/revenue', title: 'Tổng quan', icon: LayoutDashboard },
  { id: 'debts', path: '/debts', title: 'Nợ', icon: HandCoins, hidden: true },
]

export const HOME = pages[0].path
