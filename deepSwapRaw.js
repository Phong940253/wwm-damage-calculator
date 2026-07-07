console.log('=== RAW RESULT CHECK ===');

// Find the dialog
const dlg = document.querySelector('[role=dialog]');
if (!dlg) { console.log('NO DIALOG'); }

// Find all result rows
const rows = dlg.querySelectorAll('tbody tr');
console.log('rows:', rows.length);

// Check each row's pendant cell (col 9 = 5 fixed + 4th gear slot)
rows.forEach((row, i) => {
  const pendantCell = row.querySelectorAll('td')[8]; // 0-indexed: col 9
  if (!pendantCell) { console.log(`row ${i}: no pendant cell`); return; }
  
  // Get gear name
  const gearName = pendantCell.textContent?.trim() || '';
  
  // Get badge
  const badge = pendantCell.querySelector('[class*="text-\\[10px\\]"]');
  const badgeText = badge ? badge.textContent : '(none)';
  const badgeTitle = badge ? (badge.getAttribute('title') || '') : '';
  
  // Get damage and gain
  const dmgCell = row.querySelectorAll('td')[1];
  const gainCell = row.querySelectorAll('td')[2];
  const tuneCell = row.querySelectorAll('td')[4];
  const dmg = dmgCell?.textContent?.trim() || '';
  const gain = gainCell?.textContent?.trim() || '';
  const tune = tuneCell?.textContent?.trim() || '';
  
  console.log(`row ${i}: dmg=${dmg} gain=${gain} tune=${tune} pendant=${gearName} badge=${badgeText} title="${badgeTitle}"`);
});

// Check ALL gear cells for any A badge
const allGearBadges = dlg.querySelectorAll('td [class*="text-\\[10px\\]"]');
let aCount = 0;
allGearBadges.forEach(b => {
  if (b.textContent === 'A') {
    aCount++;
    const cell = b.closest('td');
    const nameEl = cell?.querySelector('.truncate') || cell?.querySelector('[class*="text-emerald"]') || cell;
    console.log(`A badge found in: ${cell?.textContent?.trim()?.substring(0, 80)}`);
  }
});
console.log('total A badges in gear cells:', aCount);

// Check Tune/Swap column for any A
const tuneColBadges = dlg.querySelectorAll('td:nth-child(5) .tabular-nums');
tuneColBadges.forEach((b, i) => {
  if (b.textContent.includes('A')) {
    console.log(`Tune col row ${i+1}: ${b.textContent}`);
  }
});

// Check the dialog header for combo count
const headerSpans = dlg.querySelectorAll('.gap-2 span, .gap-2 .bg-secondary');
headerSpans.forEach(s => console.log('header:', s.textContent?.trim()));
