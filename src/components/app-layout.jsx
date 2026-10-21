import { AppSidebar } from '@/components/app-sidebar'
import { DataMenu } from '@/components/data-menu'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { pages } from '@/lib/pages'

export function AppLayout({ activePage, onNavigate, onExport, onImport, onReset, children }) {
  const title = pages.find((page) => page.id === activePage)?.title

  return (
    <SidebarProvider>
      <AppSidebar activePage={activePage} onNavigate={onNavigate} />
      <SidebarInset className="min-w-0">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 sm:px-6 lg:px-8">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink asChild>
                  <button type="button" onClick={() => onNavigate('overview')}>
                    RevenueApp
                  </button>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>{title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto">
            <DataMenu onExport={onExport} onImport={onImport} onReset={onReset} />
          </div>
        </header>
        {/* SidebarInset already renders <main>, so this is a plain wrapper. */}
        <div className="mx-auto flex w-full max-w-screen-2xl min-w-0 flex-1 flex-col gap-4 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
