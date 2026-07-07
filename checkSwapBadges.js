const dialog = document.querySelector('[role=dialog]');
if (!dialog) { "no dialog"; }
else {
  const text = dialog.textContent;
  // Search for "A" (swap badge) as standalone character near gear names
  // The format is typically "GearNameT" for tune, "GearNameA" for swap
  // Let's find all gear names and their following badge chars
  const rows = Array.from(dialog.querySelectorAll('tr, [role=row], .row, .result-row'));
  const foundSwaps = [];
  for (const row of rows) {
    const rowText = row.textContent;
    // Look for pattern: word character followed by A (badge) 
    const matches = rowText.match(/([A-Za-z\s]+?)([TA])\s/g);
    if (matches) {
      for (const m of matches) {
        if (m.includes('A')) foundSwaps.push(m.trim());
      }
    }
  }
  
  // Also search dialog text for badges
  const badgeRegex = /([A-Za-z]+(?:Armor|Crown|Bracers|Spear|Sword|Charm|Pendant|Veil|Ward|Leg|Head|Hand|Chest|Disc))([TA])/g;
  let badgeMatch;
  const tuneGears = [];
  const swapGears = [];
  while ((badgeMatch = badgeRegex.exec(text)) !== null) {
    if (badgeMatch[2] === 'T') tuneGears.push(badgeMatch[1]);
    if (badgeMatch[2] === 'A') swapGears.push(badgeMatch[1]);
  }
  
  JSON.stringify({
    hasABadge: text.includes('A '),
    totalRows: rows.length,
    tuneGearCount: tuneGears.length,
    swapGearCount: swapGears.length,
    sampleTuneGears: tuneGears.slice(0, 5),
    sampleSwapGears: swapGears.slice(0, 5),
    textIncludesSwap: text.includes('Swap'),
    textIncludesA: /[^a-zA-Z]A[^a-zA-Z]/.test(text),
  });
}
