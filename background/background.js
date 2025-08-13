// Background service worker for FocusFlow
let timerState = {
  isRunning: false,
  currentSession: 'focus',
  timeLeft: 25 * 60,
  focusTime: 25,
  breakTime: 5
};

let blockedSites = [];
let isBlockerActive = false;

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  // Set default settings
  chrome.storage.sync.set({
    focusTime: 25,
    breakTime: 5,
    blockedSites: ['facebook.com', 'twitter.com'],
    isBlockerActive: false
  });
});

// Load settings on startup
chrome.runtime.onStartup.addListener(() => {
  loadSettings();
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.blockedSites) {
    blockedSites = changes.blockedSites.newValue || [];
  }
  if (changes.isBlockerActive) {
    isBlockerActive = changes.isBlockerActive.newValue || false;
  }
  if (changes.focusTime) {
    timerState.focusTime = changes.focusTime.newValue;
  }
  if (changes.breakTime) {
    timerState.breakTime = changes.breakTime.newValue;
  }
});

async function loadSettings() {
  const result = await chrome.storage.sync.get([
    'focusTime',
    'breakTime', 
    'blockedSites',
    'isBlockerActive'
  ]);
  
  timerState.focusTime = result.focusTime || 25;
  timerState.breakTime = result.breakTime || 5;
  blockedSites = result.blockedSites || [];
  isBlockerActive = result.isBlockerActive || false;
}

// Timer functionality
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'focusTimer') {
    handleTimerComplete();
  } else if (alarm.name === 'timerCountdown') {
    if (timerState.isRunning && timerState.timeLeft > 0) {
      timerState.timeLeft--;
      updateBadge();
      
      // If timer reaches 0, complete it
      if (timerState.timeLeft <= 0) {
        chrome.alarms.clear('timerCountdown');
        handleTimerComplete();
      }
    }
  }
});

function handleTimerComplete() {
  timerState.isRunning = false;
  
  // Clear all timer alarms
  chrome.alarms.clear('focusTimer');
  chrome.alarms.clear('timerCountdown');
  
  // Show notification
  chrome.notifications.create({
    type: 'basic',
    iconUrl: '../icons/icon48.png',
    title: 'FocusFlow',
    message: timerState.currentSession === 'focus' 
      ? 'Focus session complete! Time for a break.' 
      : 'Break time over! Ready to focus?'
  });
  
  // Switch session type
  timerState.currentSession = timerState.currentSession === 'focus' ? 'break' : 'focus';
  timerState.timeLeft = timerState.currentSession === 'focus' 
    ? timerState.focusTime * 60 
    : timerState.breakTime * 60;
    
  // Update badge
  updateBadge();
}

function updateBadge() {
  if (timerState.isRunning) {
    const minutes = Math.ceil(timerState.timeLeft / 60);
    chrome.action.setBadgeText({text: minutes.toString()});
    chrome.action.setBadgeBackgroundColor({color: '#667eea'});
  } else {
    chrome.action.setBadgeText({text: ''});
  }
}

// Website blocking functionality - now handled via content script
// The content script will check if site should be blocked

// Message handling from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'startTimer':
      startTimer(message.duration, message.session);
      sendResponse({success: true});
      break;
      
    case 'pauseTimer':
      pauseTimer();
      sendResponse({success: true});
      break;
      
    case 'resetTimer':
      resetTimer();
      sendResponse({success: true});
      break;
      
    case 'getTimerState':
      sendResponse(timerState);
      break;
      
    case 'toggleBlocker':
      const result = toggleBlocker(message.enabled);
      sendResponse(result);
      break;
      
    case 'updateBlockedSites':
      updateBlockedSites(message.sites);
      sendResponse({success: true});
      break;
      
    case 'getTabGroups':
      getTabGroups().then(groups => sendResponse(groups));
      return true; // Keep message channel open for async response
      
    case 'groupSimilarTabs':
      groupSimilarTabs();
      sendResponse({success: true});
      break;
      
    case 'closeDuplicates':
      closeDuplicateTabs();
      sendResponse({success: true});
      break;
      
    case 'closeTabsToRight':
      closeTabsToRight();
      sendResponse({success: true});
      break;
  }
});

function startTimer(duration, session) {
  timerState.isRunning = true;
  timerState.currentSession = session;
  timerState.timeLeft = duration;
  
  // Create main timer alarm
  chrome.alarms.create('focusTimer', {delayInMinutes: duration / 60});
  
  // Create countdown alarm that updates every second
  chrome.alarms.create('timerCountdown', {delayInMinutes: 0, periodInMinutes: 1/60}); // Every second
  
  updateBadge();
}

function pauseTimer() {
  timerState.isRunning = false;
  chrome.alarms.clear('focusTimer');
  chrome.alarms.clear('timerCountdown');
  updateBadge();
}

function resetTimer() {
  timerState.isRunning = false;
  timerState.currentSession = 'focus';
  timerState.timeLeft = timerState.focusTime * 60;
  chrome.alarms.clear('focusTimer');
  chrome.alarms.clear('timerCountdown');
  updateBadge();
}

function toggleBlocker(enabled) {
  isBlockerActive = enabled;
  chrome.storage.sync.set({isBlockerActive: enabled});
  return {success: true};
}

function updateBlockedSites(sites) {
  blockedSites = sites;
  chrome.storage.sync.set({blockedSites: sites});
}

// Tab management functions
async function getTabGroups() {
  const tabs = await chrome.tabs.query({currentWindow: true});
  const groups = {};
  
  tabs.forEach(tab => {
    const domain = new URL(tab.url).hostname.replace('www.', '');
    if (!groups[domain]) {
      groups[domain] = [];
    }
    groups[domain].push(tab);
  });
  
  return groups;
}

async function groupSimilarTabs() {
  const tabs = await chrome.tabs.query({currentWindow: true});
  const groups = {};
  
  // Group tabs by domain
  tabs.forEach(tab => {
    const domain = new URL(tab.url).hostname.replace('www.', '');
    if (!groups[domain]) {
      groups[domain] = [];
    }
    groups[domain].push(tab);
  });
  
  // Create tab groups for domains with multiple tabs
  for (const [domain, domainTabs] of Object.entries(groups)) {
    if (domainTabs.length > 1) {
      const tabIds = domainTabs.map(tab => tab.id);
      try {
        const groupId = await chrome.tabs.group({tabIds});
        await chrome.tabGroups.update(groupId, {
          title: domain,
          color: 'blue'
        });
      } catch (error) {
        console.log('Error grouping tabs:', error);
      }
    }
  }
}

async function closeDuplicateTabs() {
  const tabs = await chrome.tabs.query({currentWindow: true});
  const seenUrls = new Set();
  const duplicates = [];
  
  tabs.forEach(tab => {
    if (seenUrls.has(tab.url)) {
      duplicates.push(tab.id);
    } else {
      seenUrls.add(tab.url);
    }
  });
  
  if (duplicates.length > 0) {
    chrome.tabs.remove(duplicates);
  }
}

async function closeTabsToRight() {
  const tabs = await chrome.tabs.query({currentWindow: true});
  const activeTab = await chrome.tabs.query({active: true, currentWindow: true});
  
  if (activeTab.length === 0) return;
  
  const activeIndex = activeTab[0].index;
  const tabsToClose = tabs
    .filter(tab => tab.index > activeIndex)
    .map(tab => tab.id);
  
  if (tabsToClose.length > 0) {
    chrome.tabs.remove(tabsToClose);
  }
}

// Initialize on startup
loadSettings();