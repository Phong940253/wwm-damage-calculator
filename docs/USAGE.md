# WWM Damage Calculator — Hướng dẫn sử dụng

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Giao diện & Điều hướng](#2-giao-diện--điều-hướng)
3. [Stats Panel](#3-stats-panel)
4. [Rotation System](#4-rotation-system)
5. [Gear System](#5-gear-system)
6. [Gear Optimizer & Ideal Gear](#6-gear-optimizer--ideal-gear)
7. [Simulation Tab](#7-simulation-tab)
8. [Import / Export](#8-import--export)
9. [Admin Panel](#9-admin-panel)
10. [Cơ chế tính Damage](#10-cơ-chế-tính-damage)
11. [Cấu trúc Boss Resistance & Defense](#11-cấu-trúc-boss-resistance--defense)
12. [Exhausted State & Sword Morph](#12-exhausted-state--sword-morph)
13. [FAQ](#13-faq)

---

## 1. Tổng quan

**WWM Damage Calculator** là công cụ tính toán sát thương cho game **Where Winds Meet**, hỗ trợ:

- Tính toán **Min / Normal / Critical / Affinity damage** dựa theo stats, gear, passive skills, inner ways.
- **Rotation system** — xây dựng chuỗi skill, tính damage tổng theo rotation.
- **Gear Optimizer** — tìm bộ gear tối ưu từ kho custom gear.
- **Ideal Gear** — tính toán phân bố lý thuyết lý tưởng của stat lines.
- **Monte Carlo Simulation** — mô phỏng random outcomes (Abrasion / Normal / Critical / Affinity).
- **OCR** — tự động điền thông tin gear từ ảnh chụp màn hình qua Gemini Vision API.

---

## 2. Giao diện & Điều hướng

Điều hướng chính qua URL query params: `?root=...&tab=...`.

### Top-level tabs (StatusBar)

| Tab | `root=` | Mô tả |
|---|---|---|
| **Main** | `main` | Calculator chính: Stats, Rotation, Import/Export, Settings, Simulation |
| **Gear** | `gear` | Quản lý gear: Customize, Equipped, Compare, Ideal Gear, Gear Lab |

Chuyển đổi chế độ sáng/tối qua nút **Theme Toggle** trên StatusBar.

### Main Tabs (`root=main`)

| Tab | `tab=` | Mô tả |
|---|---|---|
| **Stats** | `stats` | Nhập stats, element stats, level settings, stat priority heatmap |
| **Rotation** | `rotation` | Xây dựng skill rotation, quản lý passives & inner ways |
| **Import / Export** | `import` | Export/import dữ liệu (stats, gear, rotations) |
| **Settings** | `settings` | Cấu hình Gemini API key, ngôn ngữ |
| **Simulation** | `simulation` | Mô phỏng Monte Carlo rotation |

Màn hình lớn (≥1024px) hiển thị 2 cột: input bên trái, damage output bên phải. Kéo thanh divider để resize.

### Gear Tabs (`root=gear`)

| Tab | `tab=` | Mô tả |
|---|---|---|
| **Customize Gear** | `custom` | CRUD gear custom + Gear Optimizer |
| **Equipped Gear** | `equipped` | 8 slot equipped + Tune Advisor |
| **Compare Gear** | `compare` | So sánh 2 gear side-by-side |
| **Ideal Gear** | `ideal` | Tối ưu phân bố 48 tune lines lý thuyết |
| **Gear Lab** | `lab` | Nhập thủ công 40 random lines → 8 gear configs |

---

## 3. Stats Panel

### 3.1 Level Settings

Chọn **Player Level** và **Enemy Level** ảnh hưởng đến:

- Boss Resistance (level enemy càng cao, kháng càng lớn)
- Boss Defense (công thức parabolic theo level)
- Level effect scaling từ passive/inner ways

### 3.2 Element & Martial Art

Chọn 1 trong 4 elemental paths:

| Element | Path |
|---|---|
| Bellstrike | `bellstrike` |
| Stonesplit | `stonesplit` |
| Silkbind | `silkbind` |
| Bamboocut | `bamboocut` |

Mỗi element gồm 4 stats: Min Element Attack, Max Element Attack, Element Penetration, Element DMG Bonus.

**Martial Art** được filter theo element.

### 3.3 Input Stats

Chia thành các nhóm có thể collapse:

| Nhóm | Stats |
|---|---|
| **Core** | Min/Max Physical Attack |
| **Attributes** | Body, Power, Defense, Agility, Momentum |
| **Element** | Min/Max/Pen/DMG Bonus (theo element đã chọn) |
| **Rates** | Precision Rate, Critical Rate, Critical DMG Bonus, Affinity Rate, Affinity DMG Bonus, Damage Boost, Boss DMG Boost |
| **Defense** | HP, Physical Defense, Physical Resistance, Physical DMG Reduction, Physical Penetration |

Mỗi stat có 2 ô: **Current** (giá trị hiện tại) và **Increase** (gia số sẽ apply). Nút **"Apply Increase to Current"** để cộng Increase vào Current. Nút **"Save Current"** lưu vào localStorage.

### 3.4 Stat Priority Heatmap

Tự động tính toán stat nào mang lại nhiều damage nhất **trên mỗi affix line** (1 line ≈ 1 tune value). Xếp hạng từ cao xuống thấp, giúp bạn biết nên ưu tiên tune stat nào.

---

## 4. Rotation System

### 4.1 Rotation list

- Tạo, rename, duplicate, export, xoá rotation.
- **Default rotations** (từ Supabase) ở trạng thái read-only, có thể duplicate để chỉnh sửa.

### 4.2 Skill Sequencing

Mỗi skill trong rotation có các thuộc tính:

| Field | Mô tả |
|---|---|
| **Count** | Số lần sử dụng skill trong rotation |
| **Cancelled** | Tick = skill bị cancel, damage hits bỏ qua (chỉ giữ lại self-buff). Đặc biệt: **Mystic Flute of the Tides** khi cancelled vẫn giữ ripple hits (trừ hit đầu) |
| **Exhausted** | Tick = kích hoạt exhausted state cho skill này: +10% Damage Boost + exhausted stat overrides từ passive/inner ways |
| **Params** | Tham số đặc thù cho từng skill (ví dụ `buffDmgBoostPct`, charged skill settings,...). Giao diện popover với `−` / `+` stepper, thay đổi ngay lập tức |

Kéo-thả để sắp xếp thứ tự skill. Nút ↑↓ để di chuyển.

### 4.3 Passive Skills

- Toggle on/off cho từng passive.
- **Uptime slider** (0-100%): passive stat modifier được scale theo uptime.
- **Included in Stats**: passive có flag này được tính vào gear stat aggregation.

### 4.4 Inner Ways

- Tiered inner ways (vd: Sword Morph T1/T2/T3) dùng dropdown select.
- Non-tiered dùng checkbox.
- Các inner way ảnh hưởng đến damage qua:

  - **Stat modifiers** (exhaustedExtra, flat, scale)
  - **Skill damage resolvers** (vd: Phantom Rally tăng resonance scale của Scarlet Spin)

---

## 5. Gear System

### 5.1 Customize Gear

Full CRUD với form chi tiết:

- **Basic**: Name, Slot, Level, Weapon Type, Rarity
- **Main Attributes**: danh sách stat/value, kéo-thả sắp xếp
- **Sub Attributes**: kéo-thả, có "Tune" toggle cho mỗi line
- **Tune History**: ghi lại lịch sử tune (sub-index nào → stat gì)
- **Additional Attribute**: stat đặc thù theo slot (vd: Physical Penetration cho weapon)

#### OCR (Optical Character Recognition)

- Upload ảnh chụp gear in-game → Gemini Vision API tự động điền form.
- Cấu hình API key trong Settings tab.
- Supported models: `gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-2.0-flash`, `gemini-1.5-pro`.

### 5.2 Equipped Gear

8 slot fixed:

| Slot | Label |
|---|---|
| `weapon_1` | Weapon I |
| `weapon_2` | Weapon II |
| `disc` | Disc (trước đây ring) |
| `pendant` | Pendant (trước đây talisman) |
| `head` | Head |
| `chest` | Chest |
| `hand` | Hand |
| `leg` | Leg |

Feature:
- **Per-slot damage impact**: damage stats with/without gear.
- **Stat-line-level impact**: % ảnh hưởng của từng stat line.
- **Tune Advisor**: đề xuất sub-line nào nên tune lại, target stat nào tốt nhất, kèm % gain, success rate.
- **Worst gear badge**: gear có impact thấp nhất được đánh dấu.

### 5.3 Compare Gear

So sánh 2 gear bất kỳ side-by-side:

- Main stats, sub stats.
- Computed damage (Min, Normal, Affinity) + chênh lệch %.

---

## 6. Gear Optimizer & Ideal Gear

### 6.1 Gear Optimizer (Customize Gear)

Nút **"Optimize"** trong Customize tab:

1. Chọn slot và stat filters.
2. **Consider Tune**: có tính đến khả năng tune lại sub-stats không.
3. Web Worker chạy ngầm; nếu worker fail (Turbopack), fallback sang main thread.
4. Kết quả: danh sách xếp hạng combination gear, kèm damage, % gain, per-slot selection.
5. **Apply** để equip combination tối ưu.

### 6.2 Ideal Gear (Ideal tab)

Tính toán **phân bố lý thuyết** của 48 tune lines (8 slots × 6 lines) qua các candidate stats:

- 3 modes: **Exhaustive** (full search), **Fast 1 min**, **Fast 10s**.
- Output: optimal gear grid với per-line values, total allocation summary, projected max damage.
- Kết quả được cache trong localStorage.

### 6.3 Gear Lab

Nhập thủ công **40 random lines** cho 1 element path → tool phân bố vào 8 gear configs tối ưu, validate exclusive stats và pool rules.

---

## 7. Simulation Tab

Monte Carlo simulation của active rotation:

- Mỗi hit của mỗi skill use được random roll outcome độc lập dựa trên **Precision Rate**, **Affinity Rate**, **Critical Rate**.
- Các override đặc biệt (vd: T3 Sword Morph + Exhausted + Homeless Stage 3 forced Affinity hit 3) vẫn được áp dụng.

Hiển thị:

| Chart | Mô tả |
|---|---|
| **Outcome Breakdown** (Pie) | Tỷ lệ Abrasion / Normal / Critical / Affinity |
| **Skill Damage Breakdown** (Bar) | Đóng góp damage từng skill, có nút **Show Group / Show Detail** để gom nhóm (Fearless Lunge, Homeless Charge, Moonlit Shatter Spring) |
| **Per-hit table** | Chi tiết từng hit: outcome, damage, forced flag, subtotal mỗi skill |
| **DPS** | Damage Per Second mặc định 60s |

Nút **Re-simulate** để re-roll toàn bộ outcomes.

---

## 8. Import / Export

### Export

- Format version: `"1.0"`.
- Chọn select: Stats, Gear, Rotations.
- Copy to clipboard hoặc download JSON file.

### Import

- Paste từ clipboard hoặc upload JSON file.
- Merge option cho gear (giữ gear cũ + thêm gear mới).
- **Danger Zone**: "Clear Data" xoá tất cả localStorage keys (`wwm_*`).

---

## 9. Admin Panel

Truy cập tại `/admin`. Yêu cầu **Secret Key** lưu trong localStorage (`wwm_admin_key`).

### Quản lý 5 collections

| Collection | Mô tả |
|---|---|
| **Skills** | Skill ID, name, category, weapon type, hits, damage tags, can crit/affinity |
| **Passive Skills** | ID, name, uptime, modifiers (flat/scale, target stat, exhaustedExtra) |
| **Inner Ways** | ID, name, tier group, modifiers (giống passive) |
| **Martial Arts** | ID, name, element, role, weapons |
| **Default Rotations** | Full rotation editor với skills, passives, inner ways |

### Feature

- **Raw JSON editor**: toggle để edit raw JSON.
- **Save to DB**: push lên Supabase `static_data` table.
- **Seed JSON**: reseed từ local JSON files.
- **Live sync**: thay đổi propagate qua Supabase Realtime đến tất cả client.

---

## 10. Cơ chế tính Damage

### 10.1 Damage Pipeline

```
Input Stats + Element Stats
  → aggregateEquippedGearBonus
    → computeIncludedInStatsGearBonus
      → sumBonuses
        → computeRotationBonuses (passives, inner ways)
          → buildDamageContext
            → calculateDamage / calculateSkillDamage
```

### 10.2 Core Damage Formula

Damage cơ bản dùng **3 attack components**:

```
base = calcBaseDamage(physAtk, otherAttr, yourAttr, cache)
```

Với:

- `physAtk` = Physical Attack (min hoặc max hoặc avg tuỳ outcome)
- `otherAttr` = cao hơn giữa MIN và MAX Attribute Attack of YOUR Type (element)
- `yourAttr` = Attribute Attack of YOUR Type
- Cache từ `buildDamageCache(g)` chứa các multiplier đã được gộp.

**Multiplier chain:**

```
final = base * familyMult * dmgMult * outcomeMult
```

| Multiplier | Công thức |
|---|---|
| `familyMult` | `1 + familyDmgBonus / 100` |
| `dmgMult` | `1 + (dmgBoost + bossDmgBoost) / 100` |
| `outcomeMult` | `1` cho Normal, `1 + critDmgBonus / 100` cho Critical, `1 + affinityDmgBonus / 100` cho Affinity |

### 10.3 Average Damage Composition

Expected damage được decompose thành 4 outcomes qua `calcExpectedNormalBreakdown`:

```
P  = PrecisionRate / 100
As = AffinityRate * scale  (scaled nếu A + C > 1)
Cs = CriticalRate * scale

abrasion  = (1 - P) * (1 - As) * minDamage
affinity  = ((1 - P) * As + P * As) * maxDamage
critical  = P * Cs * critHit
normal    = P * (1 - As - Cs) * baseHit
```

**Decision tree:**

```
Hit
 ├─ Precision (P) ── Affinity (As) ──→ Affinity damage
 │                  ├─ Critical (Cs) ─→ Critical damage (× critDmgBonus)
 │                  └─ Normal (1-As-Cs) → Normal damage
 │
 └─ Non-precision (1-P)
                    ├─ Affinity (As) ─→ Affinity damage
                    └─ Abrasion (1-As) → Abrasion damage (= min damage)
```

### 10.4 Tính các damage riêng lẻ

| Damage | Công thức |
|---|---|
| **Minimum** | `calcMinimumDamage(g)` = dùng min atk × 1.02 |
| **Normal** (expected) | `calcExpectedNormal(g, aff)` = weighted average của 4 outcomes |
| **Critical** | `calcCriticalDamage(g)` = dùng max atk × critDmgBonus |
| **Affinity** | `calcAffinityDamage(g)` = dùng max atk × affinityDmgBonus |

> **Lưu ý:** `Critical` và `Affinity` ở đây là damage **khi outcome đó xảy ra** (giá trị max). Expected Normal là weighted average đã bao gồm xác suất.

### 10.5 Skill Damage

`calculateSkillDamage` mở rộng từ `calculateDamage`:

- Mỗi hit của skill có thể có `physicalMultiplier`, `elementMultiplier`, `flatPhysical`, `flatAttribute` riêng.
- Mỗi hit được tính với `createSkillContext` riêng → damage context riêng.
- Kết quả per-hit được tổng hợp vào skill total.
- **Duration scaling**: skill có thời gian hồi -> scale damage theo duration.
- **Inner Way resolvers**: Phantom Rally T0/T6 tăng Scarlet Spin resonance.

### 10.6 Rotation Damage

`useDamage` hook loop qua rotation skills:

```
for each skill in rotation:
  result = calculateSkillDamage(ctx, skill, opts)
  nhân với rotSkill.count
  skill.total.averageBreakdown × count → weighted breakdown
  sum vào rotation total
```

---

## 11. Cấu trúc Boss Resistance & Defense

### 11.1 Boss Resistance (ảnh hưởng đến rate stats)

Boss resistance **chỉ áp dụng lên 3 stats**: PrecisionRate, CriticalRate, AffinityRate.

**PrecisionRate** (công thức shrink về 65):

```
final = 65 + (base - 65) × (1 - bossResistance)
```

Ví dụ: base 85%, bossRes 13.04% (level 81-85) → `65 + 20 × 0.8696 = 82.39%`

**CriticalRate & AffinityRate** (công thức nhân):

```
final = min(base × (1 - bossResistance), cap) + DirectRate
```

- Critical cap: **80%**
- Affinity cap: **40%**
- **Direct*** rates (DirectCriticalRate, DirectAffinityRate) **không bị kháng**, cộng sau cap.

**Bảng boss resistance theo enemy level:**

| Level | Resistance (`R`) | `bossResistance = R / (R + 100)` |
|---|---|---|
| < 81 | 0 | 0% |
| 81–85 | 15 | ~13.04% |
| 86–90 | 30 | ~23.08% |
| 91–95 | 45 | ~31.03% |
| 96–99 | 65 | ~39.39% |
| ≥ 100 | 115 | ~53.49% |

### 11.2 Boss Defense (ảnh hưởng đến base damage)

`BossDef` là defense vật lý, dùng công thức parabolic:

```
BossDef = max(0, 119 - 10 × level + 0.184 × level²)
```

Áp dụng trong `calcBaseDamage` qua công thức giảm sát thương:

- `dmgReduction = BossDef / (BossDef + constant)`
- `finalPhys = physAtk × (1 - dmgReduction)`

> Boss Defense và Boss Resistance là 2 cơ chế hoàn toàn độc lập. Defense giảm attack flat, Resistance giảm rate stats.

---

## 12. Exhausted State & Sword Morph

### 12.1 Exhausted toggle

Mỗi skill trong rotation có checkbox **Exhausted**:

- **+10% Damage Boost** (cộng dồn với `extraDmgBoost` từ skill, party buff).
- **exhaustedExtra**: passive/inner way modifier có field `exhaustedExtra` → cộng thêm vào stat khi exhausted active.
- `computeExhaustedBonuses` iterate qua active passives + inner ways, sum tất cả `exhaustedExtra` theo stat key.
- Các bonus này áp dụng qua `exhaustedStatOverrides` trong `createSkillContext`.

### 12.2 Sword Morph (Inner Way)

- **T3** (`iw_bellstrike_sword_morph_t3`): Trong simulation, khi `exhausted = true`:
  - Homeless Charge Stage 3 hit 3 → forced **Affinity** (bỏ qua precision roll)
  - Homeless Charge Stage 3 hit 1-2 → forced **Normal** (Abrasion thành Normal)
- **T5** (`iw_bellstrike_sword_morph_t5`): Chưa có effect đặc biệt ngoài modifiers.

> **Lưu ý:** Trong average pipeline (Damage Panel), T3 effect **không được áp dụng**. Chỉ có Simulation Tab mới có override này. Average damage của Homeless Charge Stage 3 sẽ tính như bình thường (không forced affinity/abrasion).

### 12.3 Stacking

```
Total Damage Boost = base (0) + exhaustedDmgBoost (10%) + extraDmgBoost (skill) + partyBuff (rotation)
```

exhausted stat overrides stack với stats context gốc (cộng dồn).

---

## 13. FAQ

### Làm sao để bắt đầu?

1. Vào **Stats** tab, chọn element và martial art, nhập stats cơ bản.
2. Qua **Gear** tab → **Customize Gear**, thêm gear (có thể OCR).
3. Qua **Gear** tab → **Equipped Gear**, equip gear vào 8 slot.
4. Về **Main** tab → **Rotation**, tạo rotation mới, thêm skills, chọn passives/inner ways.
5. Xem kết quả damage ở panel phải. Dùng **Simulation** tab để mô phỏng Monte Carlo.

### Tại sao damage ở Simulation khác với Average Damage Panel?

Average panel dùng công thức kỳ vọng (deterministic). Simulation random từng hit → chênh lệch do variance.

### T3 Sword Morph có ảnh hưởng đến average damage không?

**Không.** T3 override (forced affinity / no abrasion) chỉ áp dụng trong Simulation Tab. Average pipeline tính damage như không có T3.

### Làm sao để import/export dữ liệu?

Dùng **Import / Export** tab trong Main view. Chọn mục cần export, copy hoặc tải file.

### Làm sao để edit skill/passive/inner way data?

Vào `/admin` với secret key. Có thể chỉnh sửa skills, passives, inner ways, martial arts, default rotations. Save to DB để sync lên Supabase.

### Làm sao để chạy Gear Optimizer?

Vào **Gear** tab → **Customize Gear** → nút **Optimize**. Chọn slot, stat filters, bật/tắt "Consider Tune", chờ kết quả.

### Các stat nào được tính vào "Final" rates?

- `FinalCriticalRate` = `min((CriticalRate + derivedCritRate) × (1 - bossResistance), 80%) + DirectCriticalRate`
- `FinalAffinityRate` = `min((AffinityRate + derivedAffinityRate) × (1 - bossResistance), 40%) + DirectAffinityRate`
- `PrecisionRate` dùng công thức shrink riêng (xem mục 11.1)
