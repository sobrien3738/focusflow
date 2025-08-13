// FocusFlow Popup JavaScript
let currentTab = 'tabs';
let timerInterval;
let timerState = {
  isRunning: false,
  currentSession: 'focus',
  timeLeft: 25 * 60,
  focusTime: 25,
  breakTime: 5
};

// Initialize popup when DOM loads
document.addEventListener('DOMContentLoaded', async () => {
  initializeTabs();
  await loadSettings();
  await loadTabsData();
  await loadBlockerData();
  await updateTimerDisplay();
  
  // Set up event listeners
  setupEventListeners();
  
  // Start timer update interval
  timerInterval = setInterval(updateTimerDisplay, 1000);
});

function initializeTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const sections = document.querySelectorAll('.section');
  
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.id.replace('Btn', '');
      switchTab(targetTab);
    });
  });
}

function switchTab(tabName) {
  currentTab = tabName;
  
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.getElementById(tabName + 'Btn').classList.add('active');
  
  // Update sections
  document.querySelectorAll('.section').forEach(section => {
    section.classList.remove('active');
  });
  document.getElementById(tabName + 'Section').classList.add('active');
  
  // Refresh data for the active tab
  if (tabName === 'tabs') {
    loadTabsData();
  } else if (tabName === 'blocker') {
    loadBlockerData();
  }
}

function setupEventListeners() {
  // Tab management listeners
  document.getElementById('groupSimilarBtn').addEventListener('click', groupSimilarTabs);
  document.getElementById('closeDuplicatesBtn').addEventListener('click', closeDuplicates);
  document.getElementById('closeRightBtn').addEventListener('click', closeTabsToRight);
  
  // Timer listeners
  document.getElementById('startBtn').addEventListener('click', startTimer);
  document.getElementById('pauseBtn').addEventListener('click', pauseTimer);
  document.getElementById('resetBtn').addEventListener('click', resetTimer);
  document.getElementById('focusTime').addEventListener('change', updateSettings);
  document.getElementById('breakTime').addEventListener('change', updateSettings);
  
  // Blocker listeners
  document.getElementById('blockerToggle').addEventListener('change', toggleBlocker);
  document.getElementById('addSiteBtn').addEventListener('click', addBlockedSite);
  document.getElementById('siteInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addBlockedSite();
  });
  
  // Quick block buttons
  document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const site = btn.dataset.site;
      addSiteToBlockList(site);
    });
  });
}

// Tab Management Functions
async function loadTabsData() {
  try {
    const tabs = await chrome.tabs.query({currentWindow: true});
    const duplicates = findDuplicates(tabs);
    
    // Update stats
    document.getElementById('tabCount').textContent = `${tabs.length} tabs`;
    document.getElementById('duplicateCount').textContent = `${duplicates.length} duplicates`;
    
    // Populate tab list
    const tabList = document.getElementById('tabList');
    tabList.innerHTML = '';
    
    tabs.forEach(tab => {
      const tabItem = createTabItem(tab, duplicates.includes(tab.id));
      tabList.appendChild(tabItem);
    });
  } catch (error) {
    console.error('Error loading tabs:', error);
  }
}

function createTabItem(tab, isDuplicate) {
  const item = document.createElement('div');
  item.className = `tab-item${isDuplicate ? ' duplicate' : ''}`;
  
  item.innerHTML = `
    <img class="tab-favicon" src="${tab.favIconUrl || '../icons/icon16.png'}" alt="">
    <span class="tab-title" title="${tab.title}">${tab.title}</span>
    <button class="tab-close" data-tab-id="${tab.id}">×</button>
  `;
  
  // Add click listener to focus tab
  item.addEventListener('click', (e) => {
    if (e.target.classList.contains('tab-close')) {
      chrome.tabs.remove(parseInt(e.target.dataset.tabId));
      setTimeout(loadTabsData, 100);
    } else {
      chrome.tabs.update(tab.id, {active: true});
    }
  });
  
  return item;
}

function findDuplicates(tabs) {
  const urlCounts = {};
  const duplicates = [];
  
  tabs.forEach(tab => {
    if (urlCounts[tab.url]) {
      duplicates.push(tab.id);
    } else {
      urlCounts[tab.url] = 1;
    }
  });
  
  return duplicates;
}

async function groupSimilarTabs() {
  try {
    await chrome.runtime.sendMessage({action: 'groupSimilarTabs'});
    setTimeout(loadTabsData, 500);
  } catch (error) {
    console.error('Error grouping tabs:', error);
  }
}

async function closeDuplicates() {
  try {
    await chrome.runtime.sendMessage({action: 'closeDuplicates'});
    setTimeout(loadTabsData, 500);
  } catch (error) {
    console.error('Error closing duplicates:', error);
  }
}

async function closeTabsToRight() {
  try {
    await chrome.runtime.sendMessage({action: 'closeTabsToRight'});
    setTimeout(loadTabsData, 500);
  } catch (error) {
    console.error('Error closing tabs to right:', error);
  }
}

// Timer Functions
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get(['focusTime', 'breakTime']);
    const focusTime = result.focusTime || 25;
    const breakTime = result.breakTime || 5;
    
    document.getElementById('focusTime').value = focusTime;
    document.getElementById('breakTime').value = breakTime;
    
    timerState.focusTime = focusTime;
    timerState.breakTime = breakTime;
    timerState.timeLeft = focusTime * 60;
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

async function updateTimerDisplay() {
  try {
    const response = await chrome.runtime.sendMessage({action: 'getTimerState'});
    if (response) {
      timerState = response;
    }
  } catch (error) {
    // Background script might not be ready, use local state
  }
  
  const minutes = Math.floor(timerState.timeLeft / 60);
  const seconds = timerState.timeLeft % 60;
  const timeText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  
  document.getElementById('timerDisplay').textContent = timeText;
  document.getElementById('timerLabel').textContent = 
    timerState.currentSession === 'focus' ? 'Focus Time' : 'Break Time';
  
  // Update button states
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  
  if (timerState.isRunning) {
    startBtn.textContent = 'Resume';
    startBtn.disabled = true;
    pauseBtn.disabled = false;
  } else {
    startBtn.textContent = 'Start';
    startBtn.disabled = false;
    pauseBtn.disabled = true;
  }
}

async function startTimer() {
  const focusTime = parseInt(document.getElementById('focusTime').value);
  const breakTime = parseInt(document.getElementById('breakTime').value);
  
  timerState.focusTime = focusTime;
  timerState.breakTime = breakTime;
  
  const duration = timerState.currentSession === 'focus' 
    ? focusTime * 60 
    : breakTime * 60;
  
  try {
    await chrome.runtime.sendMessage({
      action: 'startTimer',
      duration: duration,
      session: timerState.currentSession
    });
    
    timerState.isRunning = true;
    timerState.timeLeft = duration;
  } catch (error) {
    console.error('Error starting timer:', error);
  }
}

async function pauseTimer() {
  try {
    await chrome.runtime.sendMessage({action: 'pauseTimer'});
    timerState.isRunning = false;
  } catch (error) {
    console.error('Error pausing timer:', error);
  }
}

async function resetTimer() {
  try {
    await chrome.runtime.sendMessage({action: 'resetTimer'});
    timerState.isRunning = false;
    timerState.currentSession = 'focus';
    timerState.timeLeft = timerState.focusTime * 60;
  } catch (error) {
    console.error('Error resetting timer:', error);
  }
}

async function updateSettings() {
  const focusTime = parseInt(document.getElementById('focusTime').value);
  const breakTime = parseInt(document.getElementById('breakTime').value);
  
  try {
    await chrome.storage.sync.set({focusTime, breakTime});
    timerState.focusTime = focusTime;
    timerState.breakTime = breakTime;
    
    if (!timerState.isRunning) {
      timerState.timeLeft = timerState.currentSession === 'focus' 
        ? focusTime * 60 
        : breakTime * 60;
    }
  } catch (error) {
    console.error('Error updating settings:', error);
  }
}

// Blocker Functions
async function loadBlockerData() {
  try {
    const result = await chrome.storage.sync.get(['blockedSites', 'isBlockerActive']);
    const blockedSites = result.blockedSites || [];
    const isActive = result.isBlockerActive || false;
    
    // Update toggle
    document.getElementById('blockerToggle').checked = isActive;
    document.querySelector('.toggle-text').textContent = isActive ? 'Blocker On' : 'Blocker Off';
    
    // Update site list
    const siteList = document.getElementById('siteList');
    siteList.innerHTML = '';
    
    blockedSites.forEach(site => {
      const siteItem = createSiteItem(site);
      siteList.appendChild(siteItem);
    });
  } catch (error) {
    console.error('Error loading blocker data:', error);
  }
}

function createSiteItem(site) {
  const item = document.createElement('div');
  item.className = 'site-item';
  item.innerHTML = `
    <span>${site}</span>
    <button class="remove-site" data-site="${site}">×</button>
  `;
  
  item.querySelector('.remove-site').addEventListener('click', () => {
    removeSiteFromBlockList(site);
  });
  
  return item;
}

async function toggleBlocker() {
  const isEnabled = document.getElementById('blockerToggle').checked;
  document.querySelector('.toggle-text').textContent = isEnabled ? 'Blocker On' : 'Blocker Off';
  
  try {
    await chrome.runtime.sendMessage({
      action: 'toggleBlocker',
      enabled: isEnabled
    });
  } catch (error) {
    console.error('Error toggling blocker:', error);
  }
}

async function addBlockedSite() {
  const input = document.getElementById('siteInput');
  const site = input.value.trim().toLowerCase();
  
  if (!site) return;
  
  // Clean up the domain
  const cleanSite = site.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  
  await addSiteToBlockList(cleanSite);
  input.value = '';
}

async function addSiteToBlockList(site) {
  try {
    const result = await chrome.storage.sync.get(['blockedSites']);
    const blockedSites = result.blockedSites || [];
    
    if (!blockedSites.includes(site)) {
      blockedSites.push(site);
      await chrome.storage.sync.set({blockedSites});
      await chrome.runtime.sendMessage({
        action: 'updateBlockedSites',
        sites: blockedSites
      });
      loadBlockerData();
    }
  } catch (error) {
    console.error('Error adding blocked site:', error);
  }
}

async function removeSiteFromBlockList(site) {
  try {
    const result = await chrome.storage.sync.get(['blockedSites']);
    const blockedSites = result.blockedSites || [];
    const updatedSites = blockedSites.filter(s => s !== site);
    
    await chrome.storage.sync.set({blockedSites: updatedSites});
    await chrome.runtime.sendMessage({
      action: 'updateBlockedSites',
      sites: updatedSites
    });
    loadBlockerData();
  } catch (error) {
    console.error('Error removing blocked site:', error);
  }
}

// Clean up interval when popup closes
window.addEventListener('beforeunload', () => {
  if (timerInterval) {
    clearInterval(timerInterval);
  }
});