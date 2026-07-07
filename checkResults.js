(async () => {
  // Wait for progress to complete
  await new Promise(r => setTimeout(r, 2000));

  // Check if there are results visible
  const dialog = document.querySelector('[role=dialog]');
  if (!dialog) { console.log('No dialog'); return; }

  const text = dialog.textContent;

  // Check for key indicators
  const hasResults = text.includes('Gain') || text.includes('Damage');
  const hasTune = text.includes('T') || text.includes('Tune');
  const hasSwap = text.includes('A') || text.includes('Swap') || text.includes('addition');
  const hasProgress = text.includes('Progress') || text.includes('progress') || text.includes('combo');

  console.log('=== Dialog Analysis ===');
  console.log('Has results:', hasResults);
  console.log('Has Tune references:', hasTune);
  console.log('Has Swap/Addition references:', hasSwap);
  console.log('Has Progress:', hasProgress);
  console.log('Dialog text (first 2000 chars):', text.substring(0, 2000));
})();
