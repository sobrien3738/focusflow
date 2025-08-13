// FocusFlow Options Page JavaScript
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  setupEventListeners();
  loadBlockedSites();
});

// Site categories for quick adding
const siteCategories = {
  social: ['facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com', 'tiktok.com', 'snapchat.com'],
  entertainment: ['youtube.com', 'netflix.com', 'twitch.tv', 'reddit.com', 'imgur.com', 'pinterest.com'],
  news: ['cnn.com', 'bbc.com', 'reddit.com', 'news.ycombinator.com', 'techcrunch.com'],
  shopping: ['amazon.com', 'ebay.com', 'walmart.com', 'target.com', 'etsy.com', 'alibaba.com']
};

function setupEventListeners() {
  // Save settings
  document.getElementById('saveBtn').addEventListener('click', saveSettings);
  document.getElementById('resetBtn').addEventListener('click', resetSettings);
  
  // Blocked sites management
  document.getElementById('addSiteBtn').addEventListener('click', addBlockedSite);
  document.getElementById('newSiteInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addBlockedSite();
  });
  
  // Category buttons
  document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const category = e.target.dataset.category;
      addSiteCategory(category);
    });
  });
  
  // Data management
  document.getElementById('exportData').addEventListener('click', exportData);
  document.getElementById('importData').addEventListener('click', () => {
    document.getElementById('importFile').click();
  });
  document.getElementById('importFile').addEventListener('change', importData);
  document.getElementById('resetSettings').addEventListener('click', resetAllSettings);
  
  // Auto-save on input change
  const inputs = document.querySelectorAll('input, select');
  inputs.forEach(input => {
    input.addEventListener('change', () => {
      showStatus('Settings will be saved when you click Save Settings', 'info');
    });
  });
}

async function loadSettings() {
  try {
    const settings = await chrome.storage.sync.get([
      'focusTime',
      'breakTime', 
      'longBreakTime',
      'autoStartBreak',
      'notificationsEnabled',
      'blockDuringFocus',
      'strictMode',
      'autoGroupSimilar',
      'warnBeforeClosing',
      'maxTabs',
      'theme',
      'showBadgeCount',
      'collectStats'
    ]);
    
    // Populate form fields
    document.getElementById('focusTime').value = settings.focusTime || 25;
    document.getElementById('breakTime').value = settings.breakTime || 5;
    document.getElementById('longBreakTime').value = settings.longBreakTime || 15;
    document.getElementById('autoStartBreak').checked = settings.autoStartBreak || false;
    document.getElementById('notificationsEnabled').checked = settings.notificationsEnabled !== false;
    document.getElementById('blockDuringFocus').checked = settings.blockDuringFocus || false;
    document.getElementById('strictMode').checked = settings.strictMode || false;
    document.getElementById('autoGroupSimilar').checked = settings.autoGroupSimilar || false;
    document.getElementById('warnBeforeClosing').checked = settings.warnBeforeClosing || true;
    document.getElementById('maxTabs').value = settings.maxTabs || 20;
    document.getElementById('theme').value = settings.theme || 'default';
    document.getElementById('showBadgeCount').checked = settings.showBadgeCount !== false;
    document.getElementById('collectStats').checked = settings.collectStats || false;
    
  } catch (error) {
    console.error('Error loading settings:', error);
    showStatus('Error loading settings', 'error');
  }
}

async function loadBlockedSites() {
  try {
    const result = await chrome.storage.sync.get(['blockedSites']);
    const blockedSites = result.blockedSites || ['facebook.com', 'twitter.com'];
    
    const container = document.getElementById('currentSites');
    container.innerHTML = '';
    
    blockedSites.forEach(site => {
      const siteItem = createSiteItem(site);
      container.appendChild(siteItem);
    });
  } catch (error) {
    console.error('Error loading blocked sites:', error);
  }
}

function createSiteItem(site) {
  const item = document.createElement('div');
  item.className = 'site-item';
  item.innerHTML = `
    <span class="site-name">${site}</span>
    <button class="remove-site" data-site="${site}" title="Remove site">×</button>
  `;
  
  item.querySelector('.remove-site').addEventListener('click', () => {
    removeSite(site);
  });
  
  return item;
}

async function addBlockedSite() {
  const input = document.getElementById('newSiteInput');
  const site = input.value.trim().toLowerCase();
  
  if (!site) return;
  
  // Clean up the domain
  const cleanSite = site.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  
  try {
    const result = await chrome.storage.sync.get(['blockedSites']);
    const blockedSites = result.blockedSites || [];
    
    if (!blockedSites.includes(cleanSite)) {
      blockedSites.push(cleanSite);
      await chrome.storage.sync.set({blockedSites});
      loadBlockedSites();
      input.value = '';
      showStatus(`Added ${cleanSite} to blocked sites`, 'success');
    } else {
      showStatus(`${cleanSite} is already blocked`, 'info');
    }
  } catch (error) {
    console.error('Error adding blocked site:', error);
    showStatus('Error adding site', 'error');
  }
}

async function removeSite(site) {
  try {
    const result = await chrome.storage.sync.get(['blockedSites']);
    const blockedSites = result.blockedSites || [];
    const updatedSites = blockedSites.filter(s => s !== site);
    
    await chrome.storage.sync.set({blockedSites: updatedSites});
    loadBlockedSites();
    showStatus(`Removed ${site} from blocked sites`, 'success');
  } catch (error) {
    console.error('Error removing site:', error);
    showStatus('Error removing site', 'error');
  }
}

async function addSiteCategory(category) {
  const sites = siteCategories[category];
  if (!sites) return;
  
  try {
    const result = await chrome.storage.sync.get(['blockedSites']);
    const blockedSites = result.blockedSites || [];
    
    let addedCount = 0;
    sites.forEach(site => {
      if (!blockedSites.includes(site)) {
        blockedSites.push(site);
        addedCount++;
      }
    });
    
    if (addedCount > 0) {
      await chrome.storage.sync.set({blockedSites});
      loadBlockedSites();
      showStatus(`Added ${addedCount} ${category} sites`, 'success');
    } else {
      showStatus(`All ${category} sites already blocked`, 'info');
    }
  } catch (error) {
    console.error('Error adding category sites:', error);
    showStatus('Error adding sites', 'error');
  }
}

async function saveSettings() {
  try {
    const settings = {
      focusTime: parseInt(document.getElementById('focusTime').value),
      breakTime: parseInt(document.getElementById('breakTime').value),
      longBreakTime: parseInt(document.getElementById('longBreakTime').value),
      autoStartBreak: document.getElementById('autoStartBreak').checked,
      notificationsEnabled: document.getElementById('notificationsEnabled').checked,
      blockDuringFocus: document.getElementById('blockDuringFocus').checked,
      strictMode: document.getElementById('strictMode').checked,
      autoGroupSimilar: document.getElementById('autoGroupSimilar').checked,
      warnBeforeClosing: document.getElementById('warnBeforeClosing').checked,
      maxTabs: parseInt(document.getElementById('maxTabs').value),
      theme: document.getElementById('theme').value,
      showBadgeCount: document.getElementById('showBadgeCount').checked,
      collectStats: document.getElementById('collectStats').checked
    };
    
    await chrome.storage.sync.set(settings);
    
    // Update background script
    await chrome.runtime.sendMessage({
      action: 'updateSettings',
      settings: settings
    });
    
    showStatus('Settings saved successfully!', 'success');
    
    // Add save animation
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.classList.add('save-animation');
    setTimeout(() => saveBtn.classList.remove('save-animation'), 500);
    
  } catch (error) {
    console.error('Error saving settings:', error);
    showStatus('Error saving settings', 'error');
  }
}

async function resetSettings() {
  if (!confirm('Reset all settings to defaults? This cannot be undone.')) {
    return;
  }
  
  try {
    const defaultSettings = {
      focusTime: 25,
      breakTime: 5,
      longBreakTime: 15,
      autoStartBreak: false,
      notificationsEnabled: true,
      blockDuringFocus: false,
      strictMode: false,
      autoGroupSimilar: false,
      warnBeforeClosing: true,
      maxTabs: 20,
      theme: 'default',
      showBadgeCount: true,
      collectStats: false
    };
    
    await chrome.storage.sync.set(defaultSettings);
    loadSettings();
    showStatus('Settings reset to defaults', 'success');
  } catch (error) {
    console.error('Error resetting settings:', error);
    showStatus('Error resetting settings', 'error');
  }
}

async function exportData() {
  try {
    const data = await chrome.storage.sync.get();
    const exportData = {
      settings: data,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `focusflow-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showStatus('Data exported successfully!', 'success');
  } catch (error) {
    console.error('Error exporting data:', error);
    showStatus('Error exporting data', 'error');
  }
}

async function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    
    if (data.settings) {
      await chrome.storage.sync.set(data.settings);
      loadSettings();
      loadBlockedSites();
      showStatus('Data imported successfully!', 'success');
    } else {
      showStatus('Invalid backup file format', 'error');
    }
  } catch (error) {
    console.error('Error importing data:', error);
    showStatus('Error importing data', 'error');
  }
  
  // Reset file input
  event.target.value = '';
}

async function resetAllSettings() {
  const confirmation = prompt(
    'This will delete ALL FocusFlow data including settings and blocked sites. Type "DELETE" to confirm:'
  );
  
  if (confirmation !== 'DELETE') {
    showStatus('Reset cancelled', 'info');
    return;
  }
  
  try {
    await chrome.storage.sync.clear();
    
    // Set minimal defaults
    await chrome.storage.sync.set({
      focusTime: 25,
      breakTime: 5,
      blockedSites: [],
      isBlockerActive: false
    });
    
    loadSettings();
    loadBlockedSites();
    showStatus('All settings and data have been reset', 'success');
  } catch (error) {
    console.error('Error resetting all settings:', error);
    showStatus('Error resetting data', 'error');
  }
}

function showStatus(message, type = 'info') {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status ${type}`;
  
  // Clear status after 3 seconds
  setTimeout(() => {
    status.textContent = '';
    status.className = 'status';
  }, 3000);
}