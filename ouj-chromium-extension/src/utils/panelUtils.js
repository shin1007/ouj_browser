(function() {
  function closePanel(panel) {
    if (!panel) return;
    panel.style.opacity = '0';
    panel.style.transform = 'translate(-50%, -50%) scale(0.95)';
    setTimeout(() => {
      if (panel.parentNode) panel.remove();
    }, 200);
  }

  function closePanelOnOutsideClick(panel, event) {
    if (document.getElementById('confirm-dialog')) return;
    if (!panel.contains(event.target)) {
      closePanel(panel);
    }
  }

  function closePanelOnEscape(panel, event) {
    if (event.key === 'Escape') {
      closePanel(panel);
    }
  }

  window.closePanel = closePanel;
  window.closePanelOnOutsideClick = closePanelOnOutsideClick;
  window.closePanelOnEscape = closePanelOnEscape;
})(); 