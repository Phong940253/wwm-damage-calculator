# Hướng dẫn nhanh

> Bắt đầu với WWM Damage Calculator chỉ trong vài phút.

---

## Setup Guide — 10 bước cơ bản

### Bước 1: Chọn cấp độ (Level)

- Vào **Main** → tab **Stats**
- Chọn **Player Level** (cấp nhân vật) và **Enemy Level** (cấp boss)
- Ảnh hưởng đến boss resistance và damage cuối cùng

### Bước 2: Chọn môn phái (Martial Art)

- Trong cùng tab **Stats**, chọn **Martial Art** của bạn
- Element path sẽ tự động đồng bộ theo môn phái
- Các skill, passive, inner way được filter tương ứng

### Bước 3: Mở Rotation

- Chuyển qua tab **Rotation**
- Nhấn **Add Rotation** để tạo rotation mới
- Nhấn **Add Skill** để thêm kỹ năng
- Điều chỉnh: Count (số lần dùng), Cancelled (bỏ qua dmg), Exhausted (+10% dmg)

### Bước 4: Mở Gear

- Nhấn tab **Gear** ở góc trên bên trái
- Đây là nơi quản lý tất cả trang bị

### Bước 5: Thêm gear mới

- Trong **Customize Gear**, nhấn **+ Add Gear**
- Form thêm gear sẽ mở ra

### Bước 6: Dùng OCR (quét ảnh)

- Trong form gear, nhấn nút **OCR** (hình máy ảnh)
- Chọn ảnh chụp màn hình gear trong game
- Gemini API sẽ tự động điền thông tin: tên, slot, stats, sub-stats

### Bước 7: Lưu gear

- Kiểm tra lại thông tin đã điền
- Nhấn **Add Gear** để lưu món đồ

### Bước 8: Quay lại Main

- Nhấn tab **Main** để về màn hình tính damage chính

### Bước 9: Vào Stats & OCR

- Trong **Main**, chọn tab **Stats**
- Nhấn nút **Nhập Stats từ Ảnh (OCR)** để quét ảnh chỉ số từ game
  - Upload **nhiều ảnh cùng lúc** — Gemini xử lý 1 request duy nhất, tự động gộp dữ liệu
  - Tự động nhập: base attributes + general stats (HP, attack, rates...) + **cả 4 element** (bellstrike, stonesplit, silkbind, bamboocut) + **PrecisionRate**
  - Xử lý đúng: **số trắng** (bỏ qua số cam trong ngoặc đã bị boss resistance), format `min-max` (kể cả `69-0`)
- Kiểm tra lại và nhập bổ sung nếu cần
- Nhấn **Save Current** để lưu

### Bước 10: Xem kết quả

- Sau khi nhập stats, kết quả damage hiển thị ngay ở panel bên phải
- Xem: Min / Normal / Critical / Affinity damage
- Biểu đồ tròn Average Damage Composition
- Chi tiết từng skill nếu đã tạo rotation

---

## Optimize Guide — Tối ưu gear

### Bước 1: Mở Gear

- Nhấn tab **Gear** ở góc trên bên trái

### Bước 2: Mở Optimize

- Trong **Customize Gear**, nhấn nút **Optimize**
- Cửa sổ Gear Optimizer mở ra

### Bước 3: Chạy Optimize

- Chọn slot, stat filters
- Bật **Consider Tune** nếu muốn tính cả tune
- Nhấn **Recalculate**
- Chờ worker tính toán — progress bar có **ETA** ước tính thời gian hoàn thành
- Beam search pre-reduction giúp tối ưu chất lượng kết quả khi bật Consider Tune
- Sau khi tính xong, có thể **Xuất JSON** để lưu kết quả hoặc **Nhập JSON** để xem lại mà không cần tính lại

### Bước 4: Equip kết quả

- Danh sách kết quả xếp hạng theo damage
- Nhấn **Equip** trên kết quả muốn dùng
- Gear sẽ tự động equip vào slot tương ứng

### Bước 5: Quay lại Main

- Nhấn tab **Main**

### Bước 6: Kiểm tra Stats

- Vào **Stats** để xem chỉ số đã cập nhật
- Damage panel phải sẽ thay đổi tương ứng

---

## Simulation — Mô phỏng

- Trong **Main**, chọn tab **Simulation**
- Mô phỏng Monte Carlo: mỗi hit random outcome riêng
- Xem: Outcome Breakdown (pie) + Skill Damage Breakdown (bar) + bảng chi tiết từng hit
- Nhấn **Re-simulate** để chạy lại với kết quả khác

---

## Import / Export

- Tab **Import / Export** trong Main
- **Export:** chọn mục (Stats, Gear, Rotations) → Copy hoặc Download
- **Import:** Paste hoặc Upload file → Apply
- **Xoá hết dữ liệu:** nút **Clear Data** ở cuối trang

---

## Cài đặt

- Tab **Settings** trong Main
- Chọn **ngôn ngữ**: English / Tiếng Việt
- Nhập **Gemini API Key** để dùng OCR (quét ảnh gear)

---

## Mẹo

- ❓ Di chuột vào chỉ số để xem giải thích chi tiết
- 🌓 Nút mặt trăng/mặt trời → đổi sáng/tối
- 📱 Kéo thanh divider giữa 2 cột để resize
