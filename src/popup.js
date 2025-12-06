document.addEventListener('DOMContentLoaded', () => {
    const lockBtn = document.getElementById('lockBtn');
    const lockBtnText = document.getElementById('lockBtnText');
    const status = document.getElementById('status');
    const shortcutKey = document.getElementById('shortcutKey');
    const testUnlockBtn = document.getElementById('testUnlockBtn');
    const historyLink = document.getElementById('historyLink');
    const notesBtn = document.getElementById('notesBtn');

    // Detect OS for shortcut display
    if (navigator.platform.toUpperCase().indexOf('MAC') >= 0) {
        shortcutKey.textContent = 'Cmd+Shift+L';
    }

    // Check current state
    chrome.storage.local.get(['isLocked', 'lockedTabId'], (result) => {
        updateUI(result.isLocked || false);
    });

    // Listen for storage changes to update UI
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.isLocked) {
            updateUI(changes.isLocked.newValue);
        }
    });

    lockBtn.addEventListener('click', async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        chrome.storage.local.get(['isLocked'], (result) => {
            if (!result.isLocked) {
                // Lock the tab
                lockTab(tab);
            } else {
                // Request unlock (shows modal)
                chrome.runtime.sendMessage({ action: 'requestShowModal' }, () => {
                    // Also try to send directly to tab in case background script fails
                    chrome.tabs.sendMessage(tab.id, { action: 'showModal' });
                    window.close();
                });
            }
        });
    });

    // Test button for quick unlock (dev only)
    testUnlockBtn.addEventListener('click', () => {
        chrome.storage.local.get(['currentSession'], (result) => {
            const session = result.currentSession;
            if (session) {
                session.endTime = Date.now();
                session.unlocks = (session.unlocks || 0) + 1;

                chrome.storage.local.get(['sessionHistory'], (historyResult) => {
                    const history = historyResult.sessionHistory || [];
                    history.push(session);

                    chrome.storage.local.set({
                        isLocked: false,
                        lockedTabId: null,
                        currentSession: null,
                        sessionHistory: history
                    }, () => {
                        chrome.runtime.sendMessage({ action: 'unlockTab' });
                        chrome.runtime.sendMessage({ action: 'updateIcon', locked: false });
                        updateUI(false);
                        window.close();
                    });
                });
            }
        });
    });

    notesBtn.addEventListener('click', async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        // Send message to content script to show floating notes
        chrome.tabs.sendMessage(tab.id, { action: 'showFloatingNotes' }, () => {
            if (chrome.runtime.lastError) {
                // Content script might not be loaded yet
                chrome.runtime.sendMessage({ action: 'injectFloatingNotes', tabId: tab.id });
            }
        });
        window.close();
    });

    function lockTab(tab) {
        // Start a new session
        const session = {
            id: Date.now(),
            tabId: tab.id,
            url: tab.url,
            title: tab.title,
            favicon: tab.favIconUrl,
            startTime: Date.now(),
            endTime: null,
            attemptedSwitches: 0,
            notes: [],
            unlocks: 0
        };

        chrome.storage.local.set({
            isLocked: true,
            lockedTabId: tab.id,
            currentSession: session
        }, () => {
            chrome.runtime.sendMessage({
                action: 'lockTab',
                tab: tab
            }, () => {
                chrome.runtime.sendMessage({ action: 'updateIcon', locked: true });
                updateUI(true);

                // Close popup after a brief delay
                setTimeout(() => window.close(), 500);
            });
        });
    }

    function updateUI(isLocked) {
        if (isLocked) {
            status.textContent = 'Locked';
            status.className = 'status locked';
            lockBtn.className = 'lock-btn locked';
            lockBtnText.textContent = 'Unlock Tab';

            // Show test unlock button when locked
            testUnlockBtn.style.display = 'flex';

            // Hide history link when locked
            historyLink.style.display = 'none';

            // Show notes button when locked
            notesBtn.style.display = 'flex';
        } else {
            status.textContent = 'Unlocked';
            status.className = 'status';
            lockBtn.className = 'lock-btn';
            lockBtnText.textContent = 'Lock This Tab';

            // Hide test unlock button
            testUnlockBtn.style.display = 'none';

            // Show history link when unlocked
            historyLink.style.display = 'flex';

            // Hide notes button when unlocked
            notesBtn.style.display = 'none';
        }
    }
});