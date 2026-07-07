const bigTexts = Array.from(document.querySelectorAll('h1, h2, h3, .text-2xl, .font-bold, [class*=damage], .text-primary, strong, b, .value'))
  .map(e => ({ cls: e.className?.slice(0,40), text: e.textContent.trim().slice(0,60) }))
  .filter(e => e.text && !e.cls?.includes('sr-only'));
bigTexts.slice(0, 20);
