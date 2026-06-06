// Quick script to reproduce distributeStatsToGears behavior for a given IdealGearResult
// Run with: node scripts/printGearAssignments.js

const result = {
    path: "bellstrike",
    maxDamage: 2964998.934345342,
    allocations: {
        MaxPhysicalAttack: 8,
        bellstrikeMax: 7,
        CriticalRate: 1,
        AffinityRate: 7,
        CombatBoostAgainstBossUnits: 1,
        AllMartialArtsBoost: 1,
        ArtOfSwordDMGBoost: 1,
        Momentum: 8,
        Power: 11,
        NamelessSwordChargedSkillDMGBoost: 4,
        PhysicalPenetration: 4,
    },
    stats: {
        MinPhysicalAttack: 177,
        MaxPhysicalAttack: 864.4,
        NamelessSwordChargedSkillDMGBoost: 20,
        PhysicalPenetration: 36,
        bellstrikeMax: 253.40000000000003,
        CriticalRate: 7.4,
        AffinityRate: 25.2,
        CombatBoostAgainstBossUnits: 2.6,
        AllMartialArtsBoost: 2.6,
        ArtOfSwordDMGBoost: 5.2,
        Momentum: 323.2,
        Power: 444.4,
    },
    specialLines: [
        "Power",
        "MaxPhysicalAttack",
        "MaxPhysicalAttack",
        "MaxPhysicalAttack",
        "AffinityRate",
        "CriticalRate",
        "Power",
        "Power",
    ],
    mode: "fast",
    elapsedMs: 1000,
    iterations: 875,
};

function distributeStatsToGears(result) {
    const { path, specialLines, allocations } = result;
    if (!specialLines || specialLines.length < 8) return [];

    const gears = Array.from({ length: 8 }, (_, index) => ({
        id: index + 1,
        specialLine: specialLines[index],
        tuningLines: [],
    }));

    const tuningCounts = { ...allocations };

    for (const gear of gears) {
        tuningCounts[gear.specialLine] = Math.max(0, (tuningCounts[gear.specialLine] || 0) - 1);
    }

    const getSlot6Stat = (gearId) => {
        if (path !== 'bellstrike') return null;
        return gearId <= 4 ? 'PhysicalPenetration' : 'NamelessSwordChargedSkillDMGBoost';
    };

    const reserveLine = (gearIndex, stat) => {
        const gear = gears[gearIndex];
        if (!gear) return false;
        if ((tuningCounts[stat] || 0) <= 0) return false;
        if (gear.tuningLines.includes(stat)) return false;
        gear.tuningLines.push(stat);
        tuningCounts[stat] -= 1;
        return true;
    };

    for (const gear of gears) {
        const fixedStat = getSlot6Stat(gear.id);
        if (fixedStat) {
            reserveLine(gear.id - 1, fixedStat);
        }
    }

    const exclusivePlacements = {
        ArtOfSwordDMGBoost: 1,
        AllMartialArtsBoost: 3,
        CombatBoostAgainstBossUnits: 7,
    };

    for (const [stat, gearId] of Object.entries(exclusivePlacements)) {
        reserveLine(gearId - 1, stat);
    }

    const remainingStats = Object.entries(tuningCounts)
        .filter(([, count]) => count > 0)
        .map(([stat, count]) => ({ stat, count }));

    const remainingCapacity = gears.map((gear) => Math.max(0, 5 - gear.tuningLines.length));
    console.log('DEBUG remainingStats:', remainingStats);
    console.log('DEBUG remainingCapacity:', remainingCapacity);
    const statNodeCount = remainingStats.length;
    const gearNodeOffset = 1 + statNodeCount;
    const sinkNode = gearNodeOffset + gears.length;
    const nodeCount = sinkNode + 1;
    const graph = Array.from({ length: nodeCount }, () => []);

    function addEdge(from, to, cap, meta) {
        const forward = { to, rev: graph[to].length, cap, statIndex: meta?.statIndex, gearIndex: meta?.gearIndex };
        const backward = { to: from, rev: graph[from].length, cap: 0 };
        graph[from].push(forward);
        graph[to].push(backward);
    }

    const source = 0;
    let targetAssignments = 0;

    remainingStats.forEach(({ stat, count }, statIndex) => {
        addEdge(source, 1 + statIndex, count, { statIndex });
        targetAssignments += count;
    });

    remainingStats.forEach(({ stat }, statIndex) => {
        gears.forEach((gear, gearIndex) => {
            if (remainingCapacity[gearIndex] <= 0) return;
            if (gear.tuningLines.includes(stat)) return;
            addEdge(1 + statIndex, gearNodeOffset + gearIndex, 1, { statIndex, gearIndex });
        });
    });

    remainingCapacity.forEach((cap, gearIndex) => {
        addEdge(gearNodeOffset + gearIndex, sinkNode, cap, { gearIndex });
    });

    let flow = 0;
    while (true) {
        const parentNode = Array(nodeCount).fill(-1);
        const parentEdge = Array(nodeCount).fill(-1);
        const queue = [source];
        parentNode[source] = source;

        for (let head = 0; head < queue.length && parentNode[sinkNode] === -1; head++) {
            const node = queue[head];
            for (let edgeIndex = 0; edgeIndex < graph[node].length; edgeIndex++) {
                const edge = graph[node][edgeIndex];
                if (edge.cap <= 0 || parentNode[edge.to] !== -1) continue;
                parentNode[edge.to] = node;
                parentEdge[edge.to] = edgeIndex;
                queue.push(edge.to);
                if (edge.to === sinkNode) break;
            }
        }

        if (parentNode[sinkNode] === -1) break;

        let bottleneck = Infinity;
        for (let node = sinkNode; node !== source; node = parentNode[node]) {
            const prev = parentNode[node];
            const edge = graph[prev][parentEdge[node]];
            bottleneck = Math.min(bottleneck, edge.cap);
        }

        for (let node = sinkNode; node !== source; node = parentNode[node]) {
            const prev = parentNode[node];
            const edgeIndex = parentEdge[node];
            const edge = graph[prev][edgeIndex];
            edge.cap -= bottleneck;
            graph[node][edge.rev].cap += bottleneck;
        }

        flow += bottleneck;
    }

    if (flow !== targetAssignments) {
        console.log('DEBUG flow:', flow, 'targetAssignments:', targetAssignments);
        // Fallback: greedy fill remaining stats into available gear slots
        console.log('FALLBACK: performing greedy assignment');
        const remaining = {};
        for (const s of remainingStats) remaining[s.stat] = s.count;

        // capacity per gear
        const cap = remainingCapacity.slice();

        // fill heuristically: largest remaining stat first, assign to gear with most capacity that doesn't already have it
        const statsByCount = Object.keys(remaining).sort((a, b) => remaining[b] - remaining[a]);
        for (const stat of statsByCount) {
            let toAssign = remaining[stat];
            while (toAssign > 0) {
                // find gear index with max capacity that doesn't already include this stat
                let bestGear = -1;
                let bestCap = -1;
                for (let i = 0; i < gears.length; i++) {
                    if (cap[i] <= 0) continue;
                    if (gears[i].tuningLines.includes(stat)) continue;
                    if (cap[i] > bestCap) {
                        bestCap = cap[i];
                        bestGear = i;
                    }
                }
                if (bestGear === -1) {
                    // no gear available, stop
                    break;
                }
                gears[bestGear].tuningLines.push(stat);
                cap[bestGear] -= 1;
                toAssign -= 1;
            }
            remaining[stat] = toAssign;
        }

        console.log('FALLBACK remaining after greedy:', remaining);
        return gears;
    }

    for (let statIndex = 0; statIndex < remainingStats.length; statIndex++) {
        const node = 1 + statIndex;
        for (const edge of graph[node]) {
            if (edge.gearIndex === undefined) continue;
            const reverse = graph[edge.to][edge.rev];
            if (reverse.cap > 0) {
                gears[edge.gearIndex].tuningLines.push(remainingStats[statIndex].stat);
            }
        }
    }

    if (path === 'bellstrike') {
        for (const gear of gears) {
            const fixedStat = getSlot6Stat(gear.id);
            if (!fixedStat) continue;
            const fixedIdx = gear.tuningLines.indexOf(fixedStat);
            if (fixedIdx !== -1) {
                gear.tuningLines.splice(fixedIdx, 1);
                gear.tuningLines.push(fixedStat);
            }
        }
    }

    return gears;
}

function getSlot6Stat(gearId) {
    if (result.path !== 'bellstrike') return null;
    return gearId <= 4 ? 'PhysicalPenetration' : 'NamelessSwordChargedSkillDMGBoost';
}

const gears = distributeStatsToGears(result);
if (!gears || gears.length === 0) {
    console.log('No valid gear distribution produced');
    process.exit(1);
}

console.log('Per-gear assignments:');
for (const g of gears) {
    console.log(`Gear ${g.id}: special=${g.specialLine}, tuning=[${g.tuningLines.join(', ')}]`);
}
