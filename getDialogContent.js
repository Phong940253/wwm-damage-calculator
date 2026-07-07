Array.from(document.querySelectorAll('[role=dialog] button, [role=dialog] label, [role=dialog] span, [role=dialog] input')).map(e => ({
  tag: e.tagName,
  type: e.getAttribute('type'),
  text: e.textContent.trim().slice(0, 60),
  id: e.id,
})).filter(e => e.text || e.id);
