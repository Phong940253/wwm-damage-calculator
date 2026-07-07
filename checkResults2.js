const dialog = document.querySelector('[role=dialog]');
if (!dialog) { "no dialog"; }
else {
  const text = dialog.textContent;
  const hasResults = /Gain|Damage|%/.test(text);
  const hasTuneBadge = /[TA]/.test(text);
  const hasSwap = /Swap|Addition/i.test(text);
  const hasProgress = /Progress|combo/i.test(text);
  JSON.stringify({
    hasResults,
    hasTuneBadge,
    hasSwap,
    hasProgress,
    length: text.length,
    preview: text.substring(0, 3000)
  });
}
