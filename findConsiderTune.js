// Find all labels and checkboxes related to "Consider Tune"
const allElements = Array.from(document.querySelectorAll('label, span, div, button'));
const tuneRelated = allElements
  .filter(e => e.textContent.toLowerCase().includes('consider') || e.textContent.toLowerCase().includes('tune'))
  .map(e => ({
    tag: e.tagName,
    text: e.textContent.trim().slice(0, 80),
    class: e.className?.slice(0, 60),
    parentTag: e.parentElement?.tagName,
    parentClass: e.parentElement?.className?.slice(0, 60),
  }));
tuneRelated;
