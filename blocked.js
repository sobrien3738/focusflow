// JavaScript for blocked.html page
document.addEventListener('DOMContentLoaded', () => {
  // Get site name from URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const siteName = urlParams.get('site');
  if (siteName) {
    document.getElementById('siteName').textContent = siteName;
  }
  
  // Event listeners
  document.getElementById('backBtn').addEventListener('click', () => {
    window.history.back();
  });
  
  document.getElementById('disableBtn').addEventListener('click', async () => {
    // Check if strict mode is enabled (for future Pro feature)
    let settings = {};
    try {
      settings = await chrome.storage.sync.get(['strictMode']);
    } catch (e) {
      // Ignore error, use default confirmation
    }
    
    // Show confirmation dialog (more stern if strict mode)
    const isStrict = settings.strictMode || false;
    const confirmationText = isStrict 
      ? '⚠️ STRICT MODE: Are you sure you want to disable the blocker?\n\n' +
        'You activated strict mode to make it harder to disable blocking.\n\n' +
        'This will disable blocking for ALL sites until manually re-enabled.\n\n' +
        'Consider taking a 5-minute break instead. Continue?'
      : '🌊 Are you sure you want to disable FocusFlow blocker?\n\n' +
        'This will allow access to all blocked sites until you turn it back on.\n\n' +
        '💡 Tip: Use the extension popup to temporarily disable blocking.';
    
    const confirmed = confirm(confirmationText);
    
    if (!confirmed) {
      return; // User cancelled, do nothing
    }
    
    try {
      // Show feedback to user
      const btn = document.getElementById('disableBtn');
      const originalText = btn.textContent;
      btn.textContent = 'Disabling...';
      btn.disabled = true;
      
      // Send message to background script
      const response = await chrome.runtime.sendMessage({
        action: 'toggleBlocker',
        enabled: false
      });
      
      if (response && response.success) {
        // Update storage directly to ensure immediate effect
        await chrome.storage.sync.set({isBlockerActive: false});
        
        // Navigate back to the original site
        const urlParams = new URLSearchParams(window.location.search);
        const siteName = urlParams.get('site');
        if (siteName) {
          window.location.href = `https://${siteName}`;
        } else {
          window.history.back();
        }
      } else {
        throw new Error('Failed to disable blocker');
      }
    } catch (error) {
      console.error('Error disabling blocker:', error);
      
      // Reset button if error occurs
      const btn = document.getElementById('disableBtn');
      btn.textContent = 'Disable Blocker';
      btn.disabled = false;
      
      // Show error to user
      alert('Failed to disable blocker. Please try again or use the extension popup.');
    }
  });
  
  document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  
  // Check if timer is running and show timer info
  async function checkTimerStatus() {
    try {
      const response = await chrome.runtime.sendMessage({action: 'getTimerState'});
      if (response && response.isRunning) {
        const timerInfo = document.getElementById('timerInfo');
        const timeRemaining = document.getElementById('timeRemaining');
        
        const minutes = Math.floor(response.timeLeft / 60);
        const seconds = response.timeLeft % 60;
        const timeText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        timeRemaining.textContent = `${timeText} remaining`;
        timerInfo.style.display = 'block';
      }
    } catch (error) {
      console.error('Error checking timer status:', error);
    }
  }
  
  // Check timer status on load
  checkTimerStatus();
  
  // Update timer display every second if timer is running
  setInterval(checkTimerStatus, 1000);
  
  // Motivational quotes rotation
  const quotes = [
    "The successful warrior is the average person with laser-like focus. - Bruce Lee",
    "Concentrate all your thoughts upon the work at hand. - Alexander Graham Bell",
    "Focus is a matter of deciding what things you're not going to do. - John Carmack",
    "The art of being wise is knowing what to overlook. - William James",
    "Where attention goes, energy flows. - James Redfield"
  ];
  
  // Rotate quotes every 30 seconds
  let currentQuote = 0;
  setInterval(() => {
    currentQuote = (currentQuote + 1) % quotes.length;
    document.querySelector('.quote').textContent = quotes[currentQuote];
  }, 30000);
});