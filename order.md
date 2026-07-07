
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