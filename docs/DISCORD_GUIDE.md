# WWM Damage Calculator — Đừng chạy theo build, hãy tận dụng gear mình có

> **KHÔNG THÍCH ĐỌC? XEM VIDEO HƯỚNG DẪN → https://youtu.be/aqxR2xVWJ7E**

## Mở đầu

Tool này không phải để "tìm build mạnh nhất thế giới".
Nó chỉ giúp bạn trả lời một câu hỏi duy nhất:

> *"Với đống gear mình đang có, kết hợp thế nào cho ra damage cao nhất?"*

Không có build chung cho tất cả. Gear bạn khác gear người khác → kết quả khác.
Có người share cái build top DPS 50k, nhưng đồ bạn khác, copy vô chưa chắc
đã cao hơn. Có khi còn thấp hơn hiện tại.

Tool này xài trên web, không cần cài đặt gì hết. Vô link dùng liền.

- Link: https://wwm-damage-calculator.vercel.app
- Video hướng dẫn: https://youtu.be/aqxR2xVWJ7E
- Nguồn mở: https://github.com/Phong940253/wwm-damage-calculator

---

## Sự thật về build "meta"

Có người dùng 3 món Legendary + full tune đúng stat → đương nhiên damage cao.
Bạn có toàn đồ Epic, nhưng tune ra stat ngon → chưa chắc đã thua.

**Gear Optimizer** trong tool sẽ tự động thử tất cả cách kết hợp gear bạn đang có,
đeo lên tính damage rồi so sánh. Kết quả ra là cái tốt nhất với bộ gear đó,
không phải "cái build mạnh nhất game".

Nếu bạn chỉ có 5 cái Pendant, nó sẽ thử cả 5. Không đời nào nó đề xuất
"bạn nên kiếm thêm cái Pendant khác" — nó chỉ làm việc với cái bạn có.

---

## Một lần chậm mà chắc

Đừng mở tool lên là lao vô Optimize liền. Làm từ từ:

### 1. Quản lý Gear (Gear → Customize Gear)

- **Add Gear** → điền thông tin món đồ bạn có
- Cách nhanh nhất: nhấn nút **OCR** (hình máy ảnh) → chụp ảnh màn hình gear
  trong game → Gemini API tự động điền hết
- Thêm hết gear bạn đang phân vân (không cần thêm gear rác)

### 2. Equip đồ (Gear → Equipped Gear)

- 8 slot: Weapon I, Weapon II, Disc, Pendant, Head, Chest, Hand, Leg
- Để trống = không có gì, tool tự xài stats gốc
- Có slot nào chưa biết đeo gì thì thử nghiệm sau

### 3. Nhập Stats (Main → Stats)

Sang Main → Stats. Nhập theo thứ tự:

1. **Stat nền trước** — level, level boss, môn phái, Body/Power/Defense/Agility/Momentum. Mấy stat này ảnh hưởng đến các chỉ số khác, nhập trước cho đúng.
2. **Stat còn lại sau** — Critical Rate, Precision Rate, v.v. Nhập y hệt như trong game, không cần tính gì thêm. Riêng Critical DMG để nguyên 50 và Affinity DMG để nguyên 35 — tool tự cộng từ passive và inner way.

Nhấn **Save Current** để khỏi nhập lại lần sau.

### 4. Tạo Rotation (Main → Rotation)

- **Add Rotation**, đặt tên
- **Add Skill** → chọn skill → chỉnh số lần xài
- Bật exhausted nếu skill đó dùng lúc boss exhausted
- Bật mấy passive với inner way bạn đang dùng
- *Lý do:* skill đứng riêng không phản ánh đúng. Skill trước buff skill sau.

### 5. Xem damage (Main)

- Panel phải hiển thị: **Min / Normal / Critical / Affinity**
- **Average Damage Composition**: biểu đồ tròn → nhìn tỷ lệ là biết chênh lệch
- Nếu có rotation: còn thêm biểu đồ từng skill + phần mở rộng

### 6. Chạy Optimize (Gear → Customize Gear → nút Optimize)

- Chọn slot bạn muốn tối ưu (vd: tìm cái Pendant xịn nhất)
- Chọn stat filters nếu muốn (vd: chỉ lấy đồ có Physical Attack)
- **Consider Tune**: bật lên nếu bạn muốn tính cả việc tune lại sub-stat
- Nhấn **Recalculate** → chờ → chọn kết quả cao nhất → **Equip**

### 7. Chạy Simulation (Main → Simulation)

- Tool sẽ random từng hit như game thật
- Bấm **Re-simulate** bao nhiêu lần cũng được
- Giúp bạn hình dung damage dao động thế nào (không phải số chính xác tuyệt đối)

---

## Khi nào nên tin tool?

Tool dùng công thức damage của game, nhập stats → ra kết quả.
Nó đúng với số liệu bạn nhập, không đúng với "cảm giác" của bạn.

Ví dụ: bạn đang có 30% Critical Rate + 35% Affinity Rate, đang phân vân
giữa đồ tăng Critical Rate vs đồ tăng Affinity Rate. Tool sẽ cho bạn biết
chính xác cái nào lên nhiều hơn mà không cần phải suy luận.

**Khi kết quả nó khác với suy nghĩ của bạn → đừng vội bỏ qua.**
Có thể bạn đã over-cap một stat nào đó mà không biết.

---

## Đọc kết quả cơ bản

- **Abrasion** (Min) = sát thương thấp nhất, thường là khi đánh trượt
- **Normal** = sát thương trung bình
- **Critical** = chí mạng (× crit dmg bonus)
- **Affinity** = sát thương tối đa (× affinity dmg bonus)
- **Average** = trung bình dựa trên xác suất của 4 outcome kia

---

## Phần cho ai thích đọc số

Mấy chỉ số như Critical Rate, Affinity Rate khi đánh boss sẽ bị trừ kháng.
Boss level càng cao → kháng càng nhiều.
- Precision Rate thì áp công thức shrink về 65 (chỉ phần trên 65 mới bị kháng)
- Critical cap 80%, Affinity cap 40% (sau kháng, trước Direct*)

Nếu muốn đọc kỹ thuật đầy đủ:
[USAGE.md](https://github.com/Phong940253/wwm-damage-calculator/tree/main/docs/USAGE.md)

---

## Mẹo vặt

- **Đổi tiếng Việt:** Main → Settings → Language → Tiếng Việt
- **Export backup:** Main → Import/Export → chọn mục → Copy hoặc Download
- **Xoá hết:** Main → Import/Export → Clear Data (cẩn thận, xoá tất cả)
- **OCR không chạy:** check API key trong Settings
- **Chế độ sáng/tối:** nút mặt trăng/mặt trời góc trên
- **Feedback / bug:** nút Send Feedback ở góc dưới phải

### Mẹo gear

- **4 món bên phải (Head, Chest, Hand, Leg):** main stat chỉ là HP và Defense,
  sub-stat giống hệt đồ Legendary. Có thể xài đồ Epic cũng được, không ảnh
  hưởng damage.
- **4 món bên trái (Weapon I, Weapon II, Disc, Pendant):** main stat là Min
  hoặc Max Physical Attack, đồ Rare có chỉ số rất thấp → không nên thay đồ
  Epic/Legendary ở các slot này.
- **Đồ Rare:** chỉ số stat rất thấp nhưng tốn đồng (material) ngang Epic/Legendary
  → không nên dùng.

---

> **Nhớ:** Không có build nào là "tốt nhất cho mọi người".
> Cái tốt nhất là cái tận dụng được tất cả gear bạn đang có.
