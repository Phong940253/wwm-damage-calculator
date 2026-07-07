// Disable "Upgrades only" to see all results
const upgradesCheckbox = document.querySelector('#opt-upgrades-only');
if (upgradesCheckbox) {
  const isChecked = upgradesCheckbox.getAttribute('data-state') === 'checked' || upgradesCheckbox.checked;
  if (isChecked) {
    // Click the label, not the checkbox (shadcn)
    const label = document.querySelector('label[for="opt-upgrades-only"]');
    if (label) label.click();
    console.log('[debug] Upgrades only disabled');
  }
}

// Wait for re-render then check
setTimeout(() => {
  const rows = document.querySelectorAll('tbody tr');
  console.log('[debug] Total rows (all):', rows.length);
  
  rows.forEach((row, i) => {
    const cells = row.querySelectorAll('td');
    if (cells.length < 9) return;
    
    const dmg = cells[1]?.textContent?.trim() || '';
    const gain = cells[2]?.textContent?.trim() || '';
    const tune = cells[4]?.textContent?.trim() || '';
    
    // Pendant column is col 9 (8th gear slot = 4th, weapon_1=col6, weapon_2=col7, disc=col8, pendant=col9)
    const pendantCell = cells[8];
    const pendantName = pendantCell?.textContent?.trim() || '';
    const badge = pendantCell?.querySelector('[class*="text-\\[10px\\]"]');
    const badgeText = badge ? badge.textContent : '(none)';
    const badgeTitle = badge ? (badge.getAttribute('title') || '') : '';
    
    console.log(`row ${i}: dmg=${dmg} gain=${gain} tune=${tune} pendant="${pendantName}" badge=${badgeText} title="${badgeTitle}"`);
  });
  
  // Count all A badges
  let aCount = 0;
  document.querySelectorAll('[class*="text-\\[10px\\]"]').forEach(b => {
    if (b.textContent === 'A') {
      aCount++;
      console.log(`[A badge] "${b.title}" in:`, b.closest('td')?.textContent?.trim()?.substring(0, 60));
    }
  });
  console.log('[debug] Total A badges:', aCount);
}, 1000);
