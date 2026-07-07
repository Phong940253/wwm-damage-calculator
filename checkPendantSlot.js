const dialog = document.querySelector('[role=dialog]');
if (!dialog) { "no dialog"; }
else {
  // Find all rows and focus on pendant column
  const allText = dialog.textContent;
  
  // Search for "Swiftwing Pendant" specifically with A badge
  const pendantMatches = allText.match(/Swiftwing Pendant[A-Z]?/g) || [];
  
  // Also search for "::swap::" in hidden elements or data attributes
  const html = dialog.innerHTML;
  const swapInHidden = html.includes('::swap::');
  
  // Find badge elements with text "A"
  const abadges = Array.from(dialog.querySelectorAll('*'))
    .filter(el => el.childNodes.length === 1 && el.childNodes[0].nodeType === 3 && el.textContent?.trim() === 'A')
    .length;
  
  // Search for badge pattern near specific gear names
  const tbadges = (allText.match(/PendantT/g) || []).length;
  const abadges2 = (allText.match(/PendantA/g) || []).length;
  
  JSON.stringify({
    allPendantTexts: pendantMatches.slice(0, 20),
    swapInHtml: swapInHidden,
    aBadgesFound: abadges,
    tBadgeForPendant: tbadges,
    aBadgeForPendant: abadges2,
    preview: allText.substring(28000, 30000)
  });
}
