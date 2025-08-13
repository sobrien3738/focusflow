// Content script for FocusFlow
// This script runs on all web pages to support blocking functionality

// Check if current site should be blocked
async function checkAndBlockSite() {
  try {
    const result = await chrome.storage.sync.get(['blockedSites', 'isBlockerActive']);
    const blockedSites = result.blockedSites || [];
    const isBlockerActive = result.isBlockerActive || false;
    
    if (!isBlockerActive) return;
    
    const currentDomain = window.location.hostname.replace('www.', '');
    
    for (const blockedSite of blockedSites) {
      if (currentDomain.includes(blockedSite)) {
        // Redirect to blocked page
        const blockedUrl = chrome.runtime.getURL('blocked.html') + '?site=' + encodeURIComponent(currentDomain);
        window.location.href = blockedUrl;
        return;
      }
    }
  } catch (error) {
    console.error('Error checking blocked sites:', error);
  }
}

// Check on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', checkAndBlockSite);
} else {
  checkAndBlockSite();
}

// Listen for storage changes (when user enables/disables blocker)
chrome.storage.onChanged.addListener((changes) => {
  if (changes.isBlockerActive || changes.blockedSites) {
    checkAndBlockSite();
  }
});

// Optional: Add focus mode visual enhancements
function enableFocusMode() {
  document.body.classList.add('focusflow-focus-mode');
  
  // Add subtle visual indicator that focus mode is active
  const focusIndicator = document.createElement('div');
  focusIndicator.id = 'focusflow-indicator';
  focusIndicator.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 8px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    z-index: 10000;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    opacity: 0.8;
    pointer-events: none;
  `;
  focusIndicator.textContent = '🌊 Focus Mode';
  
  document.body.appendChild(focusIndicator);
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    if (focusIndicator) {
      focusIndicator.style.opacity = '0';
      focusIndicator.style.transition = 'opacity 0.5s';
      setTimeout(() => focusIndicator.remove(), 500);
    }
  }, 3000);
}

// Listen for focus mode activation
chrome.storage.onChanged.addListener((changes) => {
  if (changes.focusModeActive && changes.focusModeActive.newValue) {
    enableFocusMode();
  }
});

// Check if focus mode is already active when script loads
chrome.storage.sync.get(['focusModeActive'], (result) => {
  if (result.focusModeActive) {
    enableFocusMode();
  }
});

// Add CSS for focus mode
const focusStyles = document.createElement('style');
focusStyles.textContent = `
  .focusflow-focus-mode {
    filter: none !important;
  }
  
  .focusflow-focus-mode * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
`;
document.head.appendChild(focusStyles);