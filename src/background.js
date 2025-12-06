// Background service worker for Flow extension

// Keep track of locked tab
let lockedTabId = null;
let lockedWindowId = null;
let isLocked = false;

// Debounce rapid tab switches
let switchBackInProgress = false;
let lastSwitchAttempt = 0;

// Initialize from storage
chrome.storage.local.get(['isLocked', 'lockedTabId'], (result) => {
    isLocked = result.isLocked || false;

    // Ensure tab ID is a number
    const storedTabId = result.lockedTabId;
    lockedTabId = storedTabId ? (typeof storedTabId === 'string' ? parseInt(storedTabId) : storedTabId) : null;

    // Set badge to show extension is active
    chrome.action.setBadgeText({ text: '✓' });
    chrome.action.setBadgeBackgroundColor({ color: '#10b981' });

    setTimeout(() => {
        chrome.action.setBadgeText({ text: '' });
    }, 2000);

    if (isLocked && lockedTabId) {
        // Get the window ID for the locked tab
        chrome.tabs.get(lockedTabId, (tab) => {
            if (!chrome.runtime.lastError && tab) {
                lockedWindowId = tab.windowId;
                updateIcon(true);
            } else {
                // Tab no longer exists, unlock
                unlockTab();
            }
        });
    } else {
        updateIcon(false);
    }
});

// Listen for storage changes to sync state
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
        if (changes.isLocked) {
            isLocked = changes.isLocked.newValue || false;
            if (!isLocked) {
                lockedTabId = null;
                lockedWindowId = null;
            }
        }
        if (changes.lockedTabId) {
            // Ensure tab ID is a number
            const newTabId = changes.lockedTabId.newValue;
            lockedTabId = newTabId ? (typeof newTabId === 'string' ? parseInt(newTabId) : newTabId) : null;
            if (lockedTabId) {
                // Get the window ID for the locked tab
                chrome.tabs.get(lockedTabId, (tab) => {
                    if (!chrome.runtime.lastError && tab) {
                        lockedWindowId = tab.windowId;
                    }
                });
            }
        }
    }
});

// Listen for tab activation (switching tabs)
chrome.tabs.onActivated.addListener((activeInfo) => {
    // Ensure we're comparing the same types
    const currentTabId = activeInfo.tabId;
    const targetTabId = typeof lockedTabId === 'string' ? parseInt(lockedTabId) : lockedTabId;

    // Check if we're returning to the locked tab and need to show modal
    if (isLocked && targetTabId && currentTabId === targetTabId) {
        // Simply send the message - script should already be injected when tab was locked
        chrome.tabs.sendMessage(targetTabId, { action: 'showModal' }, () => {
            if (chrome.runtime.lastError) {
                // Ignore error if content script not ready
            }
        });
    }

    if (isLocked && targetTabId && currentTabId !== targetTabId) {
        // Debounce rapid switches
        const now = Date.now();
        if (switchBackInProgress && (now - lastSwitchAttempt) < 500) {
            return;
        }
        lastSwitchAttempt = now;

        switchBackInProgress = true;

        // First verify the locked tab still exists
        chrome.tabs.get(targetTabId, (tab) => {
            if (chrome.runtime.lastError) {
                unlockTab();
                return;
            }

            // Tab exists, switch back to it with infinite retry mechanism
            const switchBackToLocked = (retryCount = 0, currentDelay = 100) => {
                // First ensure the window is focused (if tab is in different window)
                if (tab.windowId && tab.windowId !== chrome.windows.WINDOW_ID_CURRENT) {
                    chrome.windows.update(tab.windowId, { focused: true }, () => {
                        if (chrome.runtime.lastError) {
                            // Ignore error
                        }
                    });
                }

                // Then switch to the tab
                chrome.tabs.update(targetTabId, { active: true }, () => {
                    if (chrome.runtime.lastError) {
                        const errorMsg = chrome.runtime.lastError.message;

                        // Check if it's the "dragging" error
                        if (errorMsg.includes('dragging')) {
                            // Calculate next delay with exponential backoff, max 1 second
                            const nextDelay = Math.min(Math.floor(currentDelay * 1.5), 1000);

                            // Keep retrying indefinitely until successful
                            setTimeout(() => {
                                // Verify tab still exists and we're still locked before retrying
                                if (isLocked && lockedTabId === targetTabId) {
                                    switchBackToLocked(retryCount + 1, nextDelay);
                                } else {
                                    switchBackInProgress = false;
                                }
                            }, currentDelay);
                        } else {
                            // Different error, try window focus approach
                            if (tab.windowId) {
                                chrome.windows.update(tab.windowId, { focused: true }, () => {
                                    setTimeout(() => {
                                        chrome.tabs.update(targetTabId, { active: true }, () => {
                                            if (!chrome.runtime.lastError) {
                                                switchBackInProgress = false;
                                            }
                                        });
                                    }, 50);
                                });
                            } else {
                                // Can't recover, stop trying
                                switchBackInProgress = false;
                            }
                        }
                    } else {
                        // Also ensure window is focused for complete switch
                        if (tab.windowId) {
                            chrome.windows.update(tab.windowId, { focused: true }, () => {
                                // Window focused
                            });
                        }

                        switchBackInProgress = false;
                    }
                });
            };

            // Track the attempted switch
            trackAttemptedSwitch();

            // Start the switch back process
            switchBackToLocked();
        });
    }
});

// Listen for new tabs being created
chrome.tabs.onCreated.addListener((tab) => {
    if (isLocked && lockedTabId && tab.id !== lockedTabId) {
        // Close the new tab and switch back to locked tab
        chrome.tabs.remove(tab.id);
        chrome.tabs.update(lockedTabId, { active: true }, () => {
            if (!chrome.runtime.lastError) {
                // Set flag to show modal when tab becomes active
                trackAttemptedSwitch();
            }
        });
    }
});

// Listen for window focus changes
chrome.windows.onFocusChanged.addListener((windowId) => {
    if (isLocked && lockedWindowId && windowId !== lockedWindowId && windowId !== chrome.windows.WINDOW_ID_NONE) {
        // User tried to switch windows, bring them back
        chrome.windows.update(lockedWindowId, { focused: true }, () => {
            if (!chrome.runtime.lastError) {
                chrome.tabs.update(lockedTabId, { active: true }, () => {
                    if (!chrome.runtime.lastError) {
                        // Set flag to show modal when tab becomes active
                        trackAttemptedSwitch();
                    }
                });
            }
        });
    } else if (isLocked && lockedWindowId && windowId === lockedWindowId) {
        // Returned to the locked window, check if locked tab is active
        chrome.tabs.query({ active: true, windowId: lockedWindowId }, (tabs) => {
            if (tabs[0] && tabs[0].id === lockedTabId) {
                // Show modal directly since we're already on the locked tab
                chrome.tabs.sendMessage(lockedTabId, { action: 'showModal' }, () => {
                    if (chrome.runtime.lastError) {
                        // Ignore error
                    }
                });
            }
        });
    }
});

// Listen for tab removal
chrome.tabs.onRemoved.addListener((tabId) => {
    if (isLocked && tabId === lockedTabId) {
        // Locked tab was closed, end the session
        endSession();
    }
});

// Listen for keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
    if (command === 'toggle-lock') {
        toggleLock();
    }
});

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateIcon') {
        updateIcon(request.locked);
    } else if (request.action === 'requestShowModal') {
        // Set flag to show modal when locked tab becomes active
        sendResponse({ success: true });
    } else if (request.action === 'showSessionNotes') {
        // Show session notes in active tab
        if (request.notes && request.notes.length > 0) {
            showSessionNotesInActiveTab(request.notes);
        }
        sendResponse({ success: true });
    } else if (request.action === 'createFloatingNotes') {
        // Handle floating notes creation
        chrome.tabs.sendMessage(lockedTabId, { action: 'createFloatingNotes' });
    } else if (request.action === 'lockTab') {
        // Lock the specified tab
        lockTab(request.tab);
        sendResponse({ success: true });
    } else if (request.action === 'unlockTab') {
        // Unlock the tab
        unlockTab();
        sendResponse({ success: true });
    } else if (request.action === 'openHistory') {
        // Open the history page
        chrome.tabs.create({ url: 'history.html' });
        sendResponse({ success: true });
    } else if (request.action === 'showUnlockNotification') {
        showUnlockToast(request.hasNotes, request.durationText);
        sendResponse({ success: true });
    } else if (request.action === 'showToast') {
        showGenericToast(request.message);
        sendResponse({ success: true });
    }
});

function toggleLock() {
    if (isLocked) {
        // Switch to the locked tab to trigger the modal
        if (lockedTabId) {
            chrome.tabs.update(lockedTabId, { active: true });
        }
    } else {
        // Lock current tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                lockTab(tabs[0]);
            }
        });
    }
}

function lockTab(tab) {
    lockedTabId = tab.id;
    lockedWindowId = tab.windowId;
    isLocked = true;

    // Start a new focus session
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

    // Inject modal script when locking the tab
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['modal.bundle.js']
    }, () => {
        if (chrome.runtime.lastError) {
            console.log('Warning: Could not inject modal script:', chrome.runtime.lastError.message);
        }
    });

    chrome.storage.local.set({
        isLocked: true,
        lockedTabId: tab.id,
        currentSession: session
    }, () => {
        updateIcon(true);

        // Show lock toast notification
        showLockToast();
    });
}

function unlockTab() {
    const wasLockedTabId = lockedTabId;

    // Notify content script to hide floating notes
    if (wasLockedTabId) {
        chrome.tabs.sendMessage(wasLockedTabId, { action: 'tabUnlocked' }, () => {
            if (chrome.runtime.lastError) {
                // Ignore error
            }
        });
    }

    isLocked = false;
    lockedTabId = null;
    lockedWindowId = null;

    updateIcon(false);

    chrome.storage.local.set({
        isLocked: false,
        lockedTabId: null
    }, () => {
        // Storage updated
    });
}

function endSession(showToast = true) {
    // Save session data
    chrome.storage.local.get(['currentSession', 'sessionHistory'], (result) => {
        if (result.currentSession) {
            const session = result.currentSession;
            session.endTime = Date.now();

            const sessions = result.sessionHistory || [];
            sessions.push(session);

            // Check if session has notes
            const hasNotes = session.notes && session.notes.length > 0;

            // Calculate duration
            const durationMs = session.endTime - session.startTime;
            const minutes = Math.floor(durationMs / 60000);
            const durationText = minutes === 0 ? 'Less than 1m' : `${minutes}m`;

            chrome.storage.local.set({
                sessionHistory: sessions,
                currentSession: null
            }, () => {
                // Show toast notification if requested
                if (showToast) {
                    // Add delay to ensure new tab is active and ready
                    setTimeout(() => {
                        showUnlockToast(hasNotes, durationText);
                    }, 500);
                }
            });
        }
    });

    unlockTab();
}


function showLockToast() {
    // Get the currently active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            const activeTab = tabs[0];
            const iconUrl = chrome.runtime.getURL('icons/icon-flow-master.png');

            // Inject script to show lock toast notification
            chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                func: (iconUrl) => {
                    // Remove any existing toast
                    const existingToast = document.getElementById('flow-lock-toast');
                    if (existingToast) {
                        existingToast.remove();
                    }

                    // Create toast container
                    const toast = document.createElement('div');
                    toast.id = 'flow-lock-toast';
                    toast.style.cssText = `
                        position: fixed;
                        top: 20px;
                        left: 50%;
                        transform: translateX(-50%) translateY(-20px);
                        background: rgba(15, 23, 42, 0.65); /* More transparent */
                        backdrop-filter: blur(20px);
                        -webkit-backdrop-filter: blur(20px);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        color: white;
                        border-radius: 99px; /* Pill shape */
                        padding: 12px 24px;
                        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
                        text-shadow: 0 1px 2px rgba(0,0,0,0.5);
                        z-index: 2147483647;
                        display: flex;
                        align-items: center;
                        gap: 16px;
                        font-family: 'Nunito', sans-serif;
                        opacity: 0;
                        transition: all 0.5s cubic-bezier(0.19, 1, 0.22, 1);
                        pointer-events: none;
                        min-width: 280px;
                    `;

                    // Inject Font
                    if (!document.getElementById('flow-fonts')) {
                        const link = document.createElement('link');
                        link.id = 'flow-fonts';
                        link.rel = 'stylesheet';
                        link.href = 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600&display=swap';
                        document.head.appendChild(link);
                    }

                    // Create toast content
                    toast.innerHTML = `
                        <img src="${iconUrl}" style="width: 32px; height: 32px; border-radius: 8px; object-fit: cover;" />
                        <div style="font-weight: 600; font-size: 15px; letter-spacing: 0.3px;">Flow session activated</div>
                    `;

                    document.body.appendChild(toast);

                    // Animate in
                    requestAnimationFrame(() => {
                        toast.style.opacity = '1';
                        toast.style.transform = 'translateX(-50%) translateY(0)';
                    });

                    // Auto-remove toast after 4 seconds
                    setTimeout(() => {
                        toast.style.opacity = '0';
                        toast.style.transform = 'translateX(-50%) translateY(-20px)';
                        setTimeout(() => toast.remove(), 500);
                    }, 4000);
                },
                args: [iconUrl]
            }, () => {
                if (chrome.runtime.lastError) {
                    // Ignore error
                }
            });
        }
    });
}

function showUnlockToast(hasNotes, durationText) {
    // Get the currently active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            const activeTab = tabs[0];
            const iconUrl = chrome.runtime.getURL('icons/icon-flow-master.png');

            // Inject script to show toast notification
            chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                func: (hasNotes, durationText, iconUrl) => {
                    // Remove any existing toast
                    const existingToast = document.getElementById('flow-unlock-toast');
                    if (existingToast) {
                        existingToast.remove();
                    }

                    // Create toast container
                    const toast = document.createElement('div');
                    toast.id = 'flow-unlock-toast';
                    toast.style.cssText = `
                        position: fixed;
                        top: 20px;
                        left: 50%;
                        transform: translateX(-50%) translateY(-20px);
                        background: rgba(15, 23, 42, 0.65); /* More transparent */
                        backdrop-filter: blur(20px);
                        -webkit-backdrop-filter: blur(20px);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        color: white;
                        border-radius: 99px; /* Pill shape */
                        padding: 12px 24px;
                        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
                        text-shadow: 0 1px 2px rgba(0,0,0,0.5);
                        z-index: 2147483647;
                        display: flex;
                        align-items: center;
                        gap: 16px;
                        font-family: 'Nunito', sans-serif;
                        opacity: 0;
                        transition: all 0.5s cubic-bezier(0.19, 1, 0.22, 1);
                        pointer-events: none;
                        min-width: 280px;
                    `;

                    // Inject Font
                    if (!document.getElementById('flow-fonts')) {
                        const link = document.createElement('link');
                        link.id = 'flow-fonts';
                        link.rel = 'stylesheet';
                        link.href = 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600&display=swap';
                        document.head.appendChild(link);
                    }

                    // Create toast content
                    let toastContent = `
                        <img src="${iconUrl}" style="width: 32px; height: 32px; border-radius: 8px; object-fit: cover;" />
                        <div style="display: flex; flex-direction: column;">
                            <div style="font-weight: 600; font-size: 15px; letter-spacing: 0.3px;">Flow session ended</div>
                            <div style="font-size: 13px; opacity: 0.9; font-weight: 400;">
                                ${durationText}
                    `;

                    if (hasNotes) {
                        toastContent += `
                             • <a href="#" style="color: white; text-decoration: underline;" id="view-notes-link">View notes</a>
                        `;
                    }

                    toastContent += `</div></div>`;

                    toast.innerHTML = toastContent;
                    document.body.appendChild(toast);

                    // Add click handler for notes link
                    if (hasNotes) {
                        const notesLink = document.getElementById('view-notes-link');
                        if (notesLink) {
                            // Enable pointer events for the link
                            toast.style.pointerEvents = 'auto';

                            notesLink.addEventListener('click', (e) => {
                                e.preventDefault();
                                // Send message to open history page
                                chrome.runtime.sendMessage({ action: 'openHistory' });
                                toast.remove();
                            });
                        }
                    }

                    // Animate in
                    requestAnimationFrame(() => {
                        toast.style.opacity = '1';
                        toast.style.transform = 'translateX(-50%) translateY(0)';
                    });

                    // Auto-remove toast after 5 seconds
                    setTimeout(() => {
                        toast.style.opacity = '0';
                        toast.style.transform = 'translateX(-50%) translateY(-20px)';
                        setTimeout(() => toast.remove(), 500);
                    }, 5000);
                },
                args: [hasNotes, durationText, iconUrl]
            }, () => {
                if (chrome.runtime.lastError) {
                    // Ignore error
                }
            });
        }
    });
}

function showGenericToast(message) {
    // Get the currently active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            const activeTab = tabs[0];
            const iconUrl = chrome.runtime.getURL('icons/icon-flow-master.png');

            // Inject script to show toast notification
            chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                func: (message, iconUrl) => {
                    // Remove any existing toast
                    const existingToast = document.getElementById('flow-generic-toast');
                    if (existingToast) {
                        existingToast.remove();
                    }

                    // Create toast container
                    const toast = document.createElement('div');
                    toast.id = 'flow-generic-toast';
                    toast.style.cssText = `
                        position: fixed;
                        top: 20px;
                        left: 50%;
                        transform: translateX(-50%) translateY(-20px);
                        background: rgba(15, 23, 42, 0.65); /* More transparent */
                        backdrop-filter: blur(20px);
                        -webkit-backdrop-filter: blur(20px);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        color: white;
                        border-radius: 99px; /* Pill shape */
                        padding: 12px 24px;
                        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
                        text-shadow: 0 1px 2px rgba(0,0,0,0.5);
                        z-index: 2147483647;
                        display: flex;
                        align-items: center;
                        gap: 16px;
                        font-family: 'Nunito', sans-serif;
                        opacity: 0;
                        transition: all 0.5s cubic-bezier(0.19, 1, 0.22, 1);
                        pointer-events: none;
                        min-width: 280px;
                    `;

                    // Inject Font
                    if (!document.getElementById('flow-fonts')) {
                        const link = document.createElement('link');
                        link.id = 'flow-fonts';
                        link.rel = 'stylesheet';
                        link.href = 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600&display=swap';
                        document.head.appendChild(link);
                    }

                    // Create toast content
                    toast.innerHTML = `
                        <img src="${iconUrl}" style="width: 32px; height: 32px; border-radius: 8px; object-fit: cover;" />
                        <div style="font-weight: 600; font-size: 15px; letter-spacing: 0.3px;">${message}</div>
                    `;

                    document.body.appendChild(toast);

                    // Animate in
                    requestAnimationFrame(() => {
                        toast.style.opacity = '1';
                        toast.style.transform = 'translateX(-50%) translateY(0)';
                    });

                    // Auto-remove toast after 4 seconds
                    setTimeout(() => {
                        toast.style.opacity = '0';
                        toast.style.transform = 'translateX(-50%) translateY(-20px)';
                        setTimeout(() => toast.remove(), 500);
                    }, 4000);
                },
                args: [message, iconUrl]
            }, () => {
                if (chrome.runtime.lastError) {
                    // Ignore error
                }
            });
        }
    });
}

function trackAttemptedSwitch() {
    chrome.storage.local.get(['currentSession'], (result) => {
        if (result.currentSession) {
            const session = result.currentSession;
            session.attemptedSwitches = (session.attemptedSwitches || 0) + 1;

            chrome.storage.local.set({ currentSession: session });
        }
    });
}

function updateIcon(locked) {
    // Ensure default icon is used
    chrome.action.setIcon({
        path: {
            "16": "icons/icon-16.png",
            "48": "icons/icon-48.png",
            "128": "icons/icon-128.png"
        }
    });

    if (locked) {
        chrome.action.setBadgeText({ text: 'F' });
        chrome.action.setBadgeBackgroundColor({ color: '#f472b6' }); // Pink-400
        chrome.action.setBadgeTextColor({ color: '#ffffff' }); // White
    } else {
        chrome.action.setBadgeText({ text: '' });
    }
}

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
    // Initialize storage
    chrome.storage.local.set({
        isLocked: false,
        lockedTabId: null,
        currentSession: null,
        focusSessions: []
    });
});