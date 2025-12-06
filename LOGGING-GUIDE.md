# TabLock Extension - Complete Logging & Mechanism Guide

## 🔍 How Tab Switching Detection Works

### 1. **Core Components**

```javascript
// Three main variables track the lock state:
let isLocked = false;      // Is any tab locked?
let lockedTabId = null;    // Which tab ID is locked?
let lockedWindowId = null; // Which window contains the locked tab?
```

### 2. **Event Flow Diagram**

```
User Action                Extension Response              Console Logs
-----------                ------------------              ------------
Click "Lock Tab"     →     Store lock state          →    🔒 LOCK: Tab 123 locked
                           Set isLocked = true
                           Set lockedTabId = 123
                           Update icon to locked

Try to switch tab    →     onActivated fires         →    🔄 SWITCH: Attempt from 123 to 456
                           Check if locked
                           If yes, prevent switch    →    ❌ BLOCKED: Prevented switch
                           Force back to locked tab  →    ✅ SUCCESS: Returned to tab 123
                           Trigger modal             →    📋 MODAL: Showing unlock modal

Try to open new tab  →     onCreated fires           →    ➕ NEW_TAB: Tab 789 created
                           Check if locked
                           If yes, close new tab     →    ❌ BLOCKED: New tab closed
                           Return to locked tab      →    ✅ SUCCESS: Returned to tab 123

Hold unlock 10s      →     Modal timer completes     →    🔓 UNLOCK: Tab 123 unlocked
                           Set isLocked = false
                           Clear lockedTabId
                           Update icon to unlocked
```

## 📊 Complete Logging Events

### When Tab is LOCKED
```javascript
console.log('🔒 LOCK: Tab locked', {
    tabId: 123,
    url: 'https://example.com',
    title: 'Work Document',
    timestamp: '10:30:45 AM'
});
```

### When Tab is UNLOCKED
```javascript
console.log('🔓 UNLOCK: Tab unlocked', {
    tabId: 123,
    sessionDuration: '25 minutes',
    switchAttempts: 5,
    notes: 2
});
```

### When Switch is ATTEMPTED
```javascript
console.log('🔄 SWITCH: Tab switch attempted', {
    from: 'Tab 123 (locked)',
    to: 'Tab 456',
    action: 'BLOCKING'
});
```

### When Switch is BLOCKED
```javascript
console.log('❌ BLOCKED: Switch prevented', {
    attemptNumber: 3,
    redirectingTo: 'Tab 123'
});
```

### When Modal APPEARS
```javascript
console.log('📋 MODAL: Showing unlock modal', {
    reason: 'Tab switch attempt',
    unlockMethod: '10-second hold'
});
```

### When New Tab is CREATED
```javascript
console.log('➕ NEW_TAB: New tab detected', {
    newTabId: 789,
    action: 'CLOSING',
    reason: 'Tab locked'
});
```

## 🔧 Chrome Extension Event Listeners

### 1. `chrome.tabs.onActivated`
- **Fires when:** User clicks on a different tab
- **Purpose:** Detect tab switching
- **Response:** Block switch if locked

### 2. `chrome.tabs.onCreated`
- **Fires when:** New tab is created (Ctrl+T, links, etc.)
- **Purpose:** Detect new tab creation
- **Response:** Close new tab if locked

### 3. `chrome.storage.onChanged`
- **Fires when:** Storage values change
- **Purpose:** Sync lock state across extension
- **Response:** Update variables

### 4. `chrome.tabs.onRemoved`
- **Fires when:** Tab is closed
- **Purpose:** Detect if locked tab was closed
- **Response:** End session and unlock

### 5. `chrome.commands.onCommand`
- **Fires when:** Keyboard shortcut pressed
- **Purpose:** Toggle lock with Ctrl+Shift+L
- **Response:** Lock/unlock current tab

## 🐛 Debugging Guide

### Check these in the console:

1. **Service Worker Console** (chrome://extensions/ → Service Worker)
```javascript
// You should see:
[TabLock] Initialized - Locked: false, TabId: null
[TabLock] Tab activated: 123, Locked: false, LockedTab: null
[TabLock] Storage changed - isLocked: true
[TabLock] Storage changed - lockedTabId: 123
```

2. **Common Issues & Solutions**

| Console Error | Cause | Solution |
|--------------|-------|----------|
| "Tab not found" | Tab was closed | Unlock automatically |
| "Cannot update tab" | Wrong tab ID | Check ID type (number vs string) |
| "No response from content script" | Page not loaded | Wait for page load |
| "Permission denied" | Missing permission | Check manifest.json |

## 📈 Session Tracking

Every focus session logs:
```javascript
{
    sessionId: 1234567890,
    startTime: "10:30:45 AM",
    endTime: "10:55:32 AM",
    duration: "24m 47s",
    tabInfo: {
        id: 123,
        url: "https://docs.google.com",
        title: "Project Proposal"
    },
    statistics: {
        switchAttempts: 8,
        newTabsBlocked: 3,
        notesCreated: 5,
        unlocks: 1
    }
}
```

## 🎯 Testing Checklist

- [ ] Lock a tab → Console shows `🔒 LOCK`
- [ ] Click another tab → Console shows `❌ BLOCKED`
- [ ] Press Ctrl+T → Console shows `➕ NEW_TAB` then `❌ BLOCKED`
- [ ] Close locked tab → Console shows `🔓 UNLOCK` (auto)
- [ ] Hold unlock button → Console shows progress
- [ ] Complete unlock → Console shows `🔓 UNLOCK` with stats

## 💡 Pro Tips

1. **Watch the tab ID**: Most issues are tab ID mismatches
2. **Check storage sync**: Use Chrome DevTools Application tab
3. **Monitor all events**: Keep Service Worker console open
4. **Test edge cases**: Multiple windows, incognito, pinned tabs