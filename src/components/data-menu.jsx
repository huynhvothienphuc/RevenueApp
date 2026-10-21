import { Database, Download, RotateCcw, Upload } from 'lucide-react'
import { useRef } from 'react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// Backup / restore the app data as a JSON file.
export function DataMenu({ onExport, onImport, onReset }) {
  const fileRef = useRef(null)

  async function handleFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file && !(await onImport(file))) {
      window.alert('File không hợp lệ. Hãy chọn file data.json đã tải từ ứng dụng.')
    }
  }

  return (
    <>
      <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={handleFile} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Database />
            <span className="hidden sm:inline">Dữ liệu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onSelect={onExport}>
            <Download />
            Tải file JSON
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => fileRef.current?.click()}>
            <Upload />
            Nhập file JSON
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={onReset}>
            <RotateCcw />
            Khôi phục dữ liệu gốc
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
