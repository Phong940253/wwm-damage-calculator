import statistics

rows = [
    {
        "damage": 32259,
        "crit": 35,
        "bonus": {
            "weapon": 2.5,
            "sword": 5.1,
            "boss": 2.4,
            "passive": 20,
            "charge": 19.4,
            "stack": 8,
        }
    },
    {
        "damage": 36560,
        "crit": 53,
        "bonus": {
            "weapon": 2.5,
            "sword": 5.1,
            "boss": 2.4,
            "passive": 20,
            "charge": 19.4,
            "stack": 8,
        }
    },
    {
        "damage": 38679,
        "crit": 53,
        "bonus": {
            "weapon": 2.5,
            "sword": 5.1,
            "boss": 2.4,
            "passive": 20,
            "charge": 19.4,
            "break": 10,
            "stack": 10,
        }
    },
    {
        "damage": 42386,
        "crit": 53,
        "bonus": {
            "weapon": 2.5,
            "sword": 5.1,
            "boss": 2.4,
            "passive": 20,
            "charge": 19.4,
            "break": 10,
            "stack": 20,
        }
    },
    {
        "damage": 45035,
        "crit": 53,
        "bonus": {
            "weapon": 2.5,
            "sword": 5.1,
            "boss": 2.4,
            "passive": 20,
            "charge": 19.4,
            "break": 10,
            "stack": 30,
        }
    },
]

bonus_names = sorted(
    set().union(*(r["bonus"].keys() for r in rows))
)

def set_partitions(elements):
    if not elements:
        yield []
        return
    first = elements[0]
    rest = elements[1:]
    for partition in set_partitions(rest):
        yield [[first]] + partition
        for i, group in enumerate(partition):
            yield partition[:i] + [[first] + group] + partition[i+1:]

def calc_base(row, partition):
    multiplier = 1.0
    for group in partition:
        s = sum(row["bonus"].get(name, 0) for name in group)
        multiplier *= (1 + s / 100)
    return (
        row["damage"]
        / (1 + row["crit"] / 100)
        / multiplier
    )

results = []

for partition in set_partitions(bonus_names):
    bases = [calc_base(r, partition) for r in rows]
    mean = statistics.mean(bases)
    stdev = statistics.pstdev(bases)
    cv = stdev / mean * 100
    results.append({
        "partition": partition,
        "cv": cv,
        "bases": bases,
    })

results.sort(key=lambda x: x["cv"])

all_in_one = [bonus_names]
base_case = next((r for r in results if r["partition"] == all_in_one), None)
if base_case:
    print("\nAll-in-one:", base_case["partition"])
    print("CV %:", round(base_case["cv"], 4))
    print("Bases:", [round(x, 2) for x in base_case["bases"]])

print()
print("Best partition:")
r = results[0]
print(r["partition"])
print("CV %:", round(r["cv"], 4))
print("Bases:", [round(x, 2) for x in r["bases"]])

print()
print("Top 20:")
for i, r in enumerate(results[:20], 1):
    print(f"\n{i}. {r['partition']}")
    print("   CV %:", round(r["cv"], 4))
    print("   Bases:", [round(x, 2) for x in r["bases"]])
