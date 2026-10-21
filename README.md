# RevenueApp

Lãi kép 10%/tháng (tối đa 30tr/tháng) và kế hoạch trả nợ bằng phần lãi vượt 300tr.

- `/` — timeline lãi
- `/revenue` — tổng quan: tháng này, timeline, lộ trình gửi tiền
- `/debts` — kế hoạch trả nợ và danh sách nợ

Dữ liệu ban đầu ở `src/data/data.json`; chỉnh sửa trên giao diện được lưu trong trình duyệt
(sao lưu bằng **Dữ liệu → Tải file JSON**).

```bash
npm install
npm run dev     # http://localhost:5173
npm test
npm run build
```

React + Vite, Tailwind CSS v4, shadcn/ui.
