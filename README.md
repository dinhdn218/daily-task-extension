# Việc hôm nay

Extension Chrome thay trang **Tab mới** bằng danh sách việc của hôm nay, kèm nhắc đúng giờ bằng thông báo hệ thống.

## Cài đặt (dùng cá nhân)

Cần Node.js 22 trở lên.

```bash
npm install
npm run build
```

1. Mở `chrome://extensions`, bật **Developer mode** (góc phải trên).
2. Bấm **Load unpacked** → chọn thư mục `.output/chrome-mv3`.
3. Mở một tab mới. Chrome hỏi có giữ thay đổi trang Tab mới không → chọn **Keep it**.

Cập nhật bản mới: `npm run build` rồi bấm nút reload (↻) của extension trong `chrome://extensions`.

## Phát triển

| Lệnh | Việc |
|---|---|
| `npm run dev` | Mở một Chrome riêng đã cài extension, sửa code là tự nạp lại |
| `npm test` | Chạy toàn bộ test (Vitest) |
| `npm run compile` | Kiểm tra kiểu TypeScript |
| `npm run build` | Build ra `.output/chrome-mv3` |

## Nhắc việc không hiện?

- Chrome phải đang chạy, tức là còn ít nhất một cửa sổ Chrome đang mở. Extension không xin quyền
  chạy nền, nên đóng hết cửa sổ là Chrome thoát và không có thông báo đúng giờ.
- Windows: Settings → System → Notifications → bật cho **Google Chrome**, và tắt
  **Do not disturb / Focus** nếu đang bật.
- Chỉ task **có giờ nhắc** mới được nhắc. Chrome tắt hoặc máy ngủ lúc đến giờ thì khi mở lại
  trong vòng 60 phút vẫn được nhắc bù ("Đã quá giờ").

## Checklist kiểm thử thủ công

- [ ] Thêm nhanh (gõ + Enter), thêm đầy đủ qua nút "Thêm chi tiết" (biểu tượng thanh trượt), sửa, xoá + Hoàn tác, tick và bỏ tick.
- [ ] Chuyển ngày ‹ ›, thêm việc cho ngày mai, bấm nhãn ngày để về hôm nay.
- [ ] Task chưa xong của hôm qua hiện ở **Quá hạn**; nút "Dời sang hôm nay" hoạt động.
- [ ] Mở 2 tab mới: sửa ở tab này, tab kia cập nhật theo.
- [ ] Tạo task hẹn 1–2 phút sau: có thông báo hệ thống + Toast trong tab; nút
      "Đánh dấu xong" trên thông báo hoạt động; bấm thông báo mở tab mới.
- [ ] Đổi giờ task trước khi đến giờ: chỉ nhắc theo giờ mới.
- [ ] Thoát hẳn Chrome (⋮ → Thoát) khi task sắp đến giờ, mở lại sau giờ hẹn hơn 1 phút nhưng chưa quá 60 phút: có thông báo "Đã quá giờ".
- [ ] Sáng / Tối / Theo hệ thống; mở tab mới ở chế độ tối không bị nháy trắng.
- [ ] Thu hẹp cửa sổ: bố cục chuyển một cột, không tràn ngang.
