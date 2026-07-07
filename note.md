
luật hiện tại là:
- các chỉ số có thể là "MaxPhysicalAttack",
"bellstrikeMax",
"CriticalRate",
"AffinityRate",
"CombatBoostAgainstBossUnits",
"AllMartialArtsBoost",
"ArtOfSwordDMGBoost",
"Momentum",
"Power",
- đối với bellstrike_splendor, 8 stat bắt buộc ban đầu phải có là 4 dòng NamelessSwordChargedSkillDMGBoost và 4 dòng Physical penetration.
- mỗi stat được phép xuất hiện tối đa 8 lần trừ một số quy định sau.
- với 40 dòng còn lại 32 dòng là ngẫu nhiên, 8 dòng đặc biệt được đánh số từ 1 đến 8, với rule sau:

- 1 - 2 có thể xuất hiện bellstrikeMax MaxPhysicalAttack Power Momentum
- 3 - 4 chỉ xuất hiện MaxPhysicalAttack
- 5 - 6 có thể xuất hiện CriticalRate AffinityRate
- 7 - 8 có thể xuất hiện AffinityRate CriticalRate Power

- 8 dòng đặc biệt này được phép vượt quá quy định 8 dòng limit.
- các stat CombatBoostAgainstBossUnits ArtOfSwordDMGBoost chỉ được phép tối đa 1 dòng, AllMartialArtsBoost chỉ được phép tối đa 2 dòng.
phan bo cac stat vao cac vi tri va hien tri giao dien trang bi biet rang:                                                                                                                                                              -  
- co 8 gear sap xep theo thu tu
   1 2   5 6
   3 4   7 8

- moi gear co 6 dong cho 48 stat tim duoc.
- moi gear khong duoc phep co dong nao trung nhau tru dong dau tien cua moi gear.
- toi da 8 dong trung nhau cho tong cac gear
- 8 dong dac biet la 8 dong dau tien cua cac gear    
- dong dau tien cua moi gear duoc phep vuot qua limit 8 dong.                                                                                                
- pool cac dong dac biet dua theo SPECIAL_LINE_POOLS
- do dinh 4 dong thu 6 gear 1 2 3 4 la physical penetration, dong thu 6 gear 5 6 7 8 la NamelessSwordChargedSkillDMGBoost

- dong All Martial Arts Boost chi xuat hien o gear 3 4
- dong Art of Sword DMG Boost chi xuat hien o gear 1
- dong Combat Boost against Boss Units chi xuat hien o gear 7
