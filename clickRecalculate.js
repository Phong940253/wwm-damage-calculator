const btn = Array.from(document.querySelectorAll('[role=dialog] button')).find(b => b.textContent.trim() === 'Recalculate');
if (btn) {
  btn.click();
  'Recalculate clicked';
} else {
  'Recalculate button NOT found in dialog';
}
