(async () => {
  try {
    // Dynamic import from the app's module
    const mod = await import('/app/domain/gear/gearOptimize.ts');
    const { computeOptimizeResultsAsync } = mod;

    // Read data from localStorage (set by instrumentation script)
    const customGears = JSON.parse(localStorage.getItem('wwm_custom_gear') || '[]');
    const equippedRaw = JSON.parse(localStorage.getItem('wwm_equipped') || '{}');
    const stats = JSON.parse(localStorage.getItem('wwm_dmg_current_stats') || '{}');
    const elementStats = JSON.parse(localStorage.getItem('wwm_element_stats') || '{}');

    // Convert equipped to the right format
    const equipped = {};
    for (const [slot, id] of Object.entries(equippedRaw)) {
      equipped[slot] = id;
    }

    const slots = ['weapon_1', 'weapon_2', 'disc', 'pendant', 'head', 'chest', 'hand', 'leg'];

    console.log('[directTest] Starting main-thread optimizer with', customGears.length, 'gears');
    console.log('[directTest] considerTune=true');

    const r = await computeOptimizeResultsAsync(
      stats,
      elementStats,
      customGears,
      equipped,
      10,
      undefined,
      undefined,
      {
        candidateGears: customGears,
        slotsToOptimize: slots,
        considerTune: true,
        autoReduceIfOverCombos: 1,
        reduceTargetCombos: 200000,
      },
      (current, total) => console.log('[directTest] progress', current, '/', total),
    );

    console.log('[directTest] baseDamage:', r.baseDamage);
    console.log('[directTest] totalCombos:', r.totalCombos);
    console.log('[directTest] results:', r.results.length);

    // Check for swap variants
    let swapCount = 0;
    for (const res of r.results) {
      for (const [slot, g] of Object.entries(res.selection)) {
        if (g && g.__tuneId && g.__tuneId.startsWith('::swap::')) {
          swapCount++;
          console.log('[directTest] SWAP FOUND:', slot, g.name, g.__tuneId, g.__tuneLabel);
        }
      }
    }
    console.log('[directTest] Total swap occurrences in results:', swapCount);

    // Check for tune variants
    let tuneCount = 0;
    for (const res of r.results) {
      for (const [slot, g] of Object.entries(res.selection)) {
        if (g && g.__tuneId && g.__tuneId.startsWith('::tune::')) {
          tuneCount++;
        }
      }
    }
    console.log('[directTest] Total tune occurrences in results:', tuneCount);

  } catch (e) {
    console.error('[directTest] ERROR:', e.message, e.stack);
  }
})();
