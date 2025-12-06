// Content script for TabLock modal functionality

let modal = null;
let unlockTimer = null;
let unlockProgress = 0;
let isHoldingUnlock = false;
let motivationalMessages = [
    "A 30 second break can turn into 30 minutes",
    "Don't lose focus",
    "Stay in flow",
    "ADHD strikes again",
    "Your future self will thank you",
    "One task at a time",
    "Deep work is valuable work",
    "Distractions are everywhere, focus is rare",
    "The hardest part is staying committed",
    "You've got this, keep going"
];

let currentMessageIndex = 0;

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'showModal') {
        showUnlockModal();
    } else if (request.action === 'attemptedSwitch') {
        showUnlockModal();
    } else if (request.action === 'displaySessionNotes') {
        // Display session notes received from background
        if (request.notes && request.notes.length > 0) {
            displaySessionNotes(request.notes);
        }
        sendResponse({ success: true });
    } else if (request.action === 'showFloatingNotes') {
        // Show floating notes widget
        showFloatingNotes();
        sendResponse({ success: true });
    } else if (request.action === 'tabUnlocked') {
        // Hide floating notes when tab is unlocked
        hideFloatingNotes();
        sendResponse({ success: true });
    }
});

function showUnlockModal() {
    // Don't create multiple modals
    if (modal) return;

    // Create modal overlay
    modal = document.createElement('div');
    modal.className = 'tablock-modal-overlay';

    const modalContent = document.createElement('div');
    modalContent.className = 'tablock-modal';

    modalContent.innerHTML = `
        <div class="tablock-modal-header">
            <h2 class="tablock-modal-title">Stay Focused!</h2>
            <p class="tablock-modal-subtitle">Close the tab if you're done or unlock to switch</p>
        </div>

        <div class="tablock-unlock-container">
            <button class="tablock-unlock-btn" id="tablock-unlock-btn">
                <div class="tablock-unlock-progress" style="width: 0%;"></div>
                <span class="tablock-unlock-text">Hold to Unlock (10s)</span>
            </button>
            <div class="tablock-motivational-message" id="tablock-message"></div>
        </div>

        <div class="tablock-notes-section">
            <div class="tablock-notes-header">
                <h3 class="tablock-notes-title">Quick Notes</h3>
            </div>
            <textarea
                class="tablock-notes-input"
                id="tablock-notes-input"
                placeholder="Jot down thoughts to look up later..."
                rows="2"
            ></textarea>
            <div class="tablock-previous-notes" id="tablock-previous-notes">
                <div class="tablock-previous-notes-header" id="tablock-notes-toggle">
                    <svg class="tablock-expand-icon" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M10 17l5-5-5-5v10z"/>
                    </svg>
                    <p class="tablock-previous-notes-title">
                        Previous notes (<span id="tablock-notes-count">0</span>)
                    </p>
                </div>
                <div class="tablock-notes-list" id="tablock-notes-list"></div>
            </div>
        </div>
    `;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Setup event handlers
    setupUnlockButton();
    setupNotes();
    startMotivationalMessages();

    // Close modal on overlay click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Prevent escape key from closing modal
    document.addEventListener('keydown', preventEscape);
}

function setupUnlockButton() {
    const unlockBtn = document.getElementById('tablock-unlock-btn');
    const progressBar = unlockBtn.querySelector('.tablock-unlock-progress');
    const unlockText = unlockBtn.querySelector('.tablock-unlock-text');

    unlockBtn.addEventListener('mousedown', startUnlock);
    unlockBtn.addEventListener('mouseup', cancelUnlock);
    unlockBtn.addEventListener('mouseleave', cancelUnlock);
    unlockBtn.addEventListener('touchstart', startUnlock);
    unlockBtn.addEventListener('touchend', cancelUnlock);

    function startUnlock(e) {
        e.preventDefault();
        isHoldingUnlock = true;
        unlockBtn.classList.add('holding');
        unlockProgress = 0;

        unlockTimer = setInterval(() => {
            if (!isHoldingUnlock) {
                cancelUnlock();
                return;
            }

            unlockProgress += 1;
            const percentage = (unlockProgress / 100) * 100;
            progressBar.style.width = percentage + '%';

            // Update text with remaining time
            const remaining = Math.ceil((100 - unlockProgress) / 10);
            unlockText.textContent = remaining > 0 ? `Hold (${remaining}s)` : 'Unlocking...';

            if (unlockProgress >= 100) {
                // Unlock successful
                clearInterval(unlockTimer);
                unlockTab();
            }
        }, 100); // Update every 100ms for 10 seconds total
    }

    function cancelUnlock() {
        isHoldingUnlock = false;
        if (unlockTimer) {
            clearInterval(unlockTimer);
            unlockTimer = null;
        }
        unlockBtn.classList.remove('holding');
        progressBar.style.width = '0%';
        unlockText.textContent = 'Hold to Unlock (10s)';
        unlockProgress = 0;
    }
}

function setupNotes() {
    const notesInput = document.getElementById('tablock-notes-input');
    const notesToggle = document.getElementById('tablock-notes-toggle');
    const notesList = document.getElementById('tablock-notes-list');
    const expandIcon = notesToggle.querySelector('.tablock-expand-icon');
    const notesCount = document.getElementById('tablock-notes-count');

    // Load existing notes
    chrome.storage.local.get(['currentSession'], (result) => {
        if (result.currentSession && result.currentSession.notes) {
            renderNotes(result.currentSession.notes);
        }
    });

    // Handle note input
    notesInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const note = notesInput.value.trim();
            if (note) {
                addNote(note);
                notesInput.value = '';
            }
        }
    });

    // Toggle previous notes
    notesToggle.addEventListener('click', () => {
        notesList.classList.toggle('expanded');
        expandIcon.classList.toggle('expanded');
    });

    function addNote(note) {
        chrome.storage.local.get(['currentSession'], (result) => {
            const session = result.currentSession || {};
            session.notes = session.notes || [];
            session.notes.push({
                id: Date.now(),
                text: note,
                timestamp: Date.now()
            });

            chrome.storage.local.set({ currentSession: session }, () => {
                renderNotes(session.notes);
            });
        });
    }

    function renderNotes(notes) {
        notesCount.textContent = notes.length;
        notesList.innerHTML = '';

        if (notes.length === 0) {
            document.getElementById('tablock-previous-notes').style.display = 'none';
            return;
        }

        document.getElementById('tablock-previous-notes').style.display = 'block';

        // Sort notes to show newest first (highest timestamp/id first)
        const sortedNotes = [...notes].sort((a, b) => b.timestamp - a.timestamp);

        sortedNotes.forEach(note => {
            const noteItem = document.createElement('div');
            noteItem.className = 'tablock-note-item';
            noteItem.innerHTML = `
                <span class="tablock-note-text">${escapeHtml(note.text)}</span>
                <button class="tablock-note-delete" data-note-id="${note.id}">&times;</button>
            `;
            notesList.appendChild(noteItem);
        });

        // Add delete handlers
        notesList.querySelectorAll('.tablock-note-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const noteId = parseInt(e.target.dataset.noteId);
                deleteNote(noteId);
            });
        });
    }

    function deleteNote(noteId) {
        chrome.storage.local.get(['currentSession'], (result) => {
            const session = result.currentSession || {};
            session.notes = (session.notes || []).filter(n => n.id !== noteId);

            chrome.storage.local.set({ currentSession: session }, () => {
                renderNotes(session.notes);
            });
        });
    }
}

function startMotivationalMessages() {
    const messageElement = document.getElementById('tablock-message');

    function showNextMessage() {
        if (!isHoldingUnlock && messageElement) {
            messageElement.textContent = motivationalMessages[currentMessageIndex];
            currentMessageIndex = (currentMessageIndex + 1) % motivationalMessages.length;
        }
    }

    // Show first message immediately
    showNextMessage();

    // Rotate messages every 3 seconds
    const messageInterval = setInterval(() => {
        if (!modal) {
            clearInterval(messageInterval);
            return;
        }
        showNextMessage();
    }, 3000);
}

function unlockTab() {
    // Update session data
    chrome.storage.local.get(['currentSession', 'focusSessions'], (result) => {
        const session = result.currentSession || {};
        session.endTime = Date.now();
        session.unlocks = (session.unlocks || 0) + 1;

        // Add to focus sessions history
        const sessions = result.focusSessions || [];
        sessions.push(session);

        chrome.storage.local.set({
            isLocked: false,
            lockedTabId: null,
            currentSession: null,
            focusSessions: sessions
        }, () => {
            // Update icon
            chrome.runtime.sendMessage({ action: 'updateIcon', locked: false });

            // Hide floating notes when unlocking
            hideFloatingNotes();

            // Show notes if any
            if (session.notes && session.notes.length > 0) {
                displaySessionNotes(session.notes);
            }

            closeModal();
        });
    });
}

function displaySessionNotes(notes) {
    // Create a temporary overlay showing the notes
    const notesOverlay = document.createElement('div');
    notesOverlay.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
        z-index: 2147483647;
        max-width: 400px;
        animation: tablock-slideUp 0.3s ease;
    `;

    notesOverlay.innerHTML = `
        <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">Session Notes</h3>
        <div style="max-height: 200px; overflow-y: auto;">
            ${notes.map(n => `<p style="margin: 8px 0; padding: 8px; background: #f9fafb; border-radius: 6px; font-size: 14px;">${escapeHtml(n.text)}</p>`).join('')}
        </div>
        <button style="
            margin-top: 12px;
            padding: 8px 16px;
            background: #7c3aed;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
        " onclick="this.parentElement.remove()">Close</button>
    `;

    document.body.appendChild(notesOverlay);

    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (notesOverlay.parentElement) {
            notesOverlay.remove();
        }
    }, 10000);
}

function closeModal() {
    if (modal) {
        modal.remove();
        modal = null;
    }
    document.removeEventListener('keydown', preventEscape);
}

function preventEscape(e) {
    if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Floating notes widget
let floatingNotesWidget = null;

function hideFloatingNotes() {
    const floatingNotes = document.querySelector('.tablock-floating-notes');
    if (floatingNotes) {
        floatingNotes.remove();
    }
    floatingNotesWidget = null;
}

function showFloatingNotes() {
    // Don't create multiple floating notes
    const existingNotes = document.querySelector('.tablock-floating-notes');
    if (existingNotes) {
        existingNotes.remove();
        return;
    }

    const floatingNotes = document.createElement('div');
    floatingNotes.className = 'tablock-floating-notes';
    floatingNotesWidget = floatingNotes;

    floatingNotes.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 350px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
        z-index: 2147483646;
        animation: slideUp 0.3s ease;
        transition: width 0.2s ease;
    `;

    floatingNotes.innerHTML = `
        <div class="tablock-floating-notes-header" style="
            padding: 12px 16px;
            background: #7c3aed;
            color: white;
            border-radius: 12px 12px 0 0;
            display: flex;
            align-items: center;
            justify-content: space-between;
            user-select: none;
        ">
            <h3 style="margin: 0; font-size: 14px; font-weight: 600;">Quick Notes</h3>
            <div style="display: flex; align-items: center; gap: 8px;">
                <button id="tablock-minimize-btn" style="
                    background: transparent;
                    border: none;
                    color: white;
                    cursor: pointer;
                    font-size: 18px;
                    line-height: 1;
                    padding: 0;
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">−</button>
                <button onclick="this.closest('.tablock-floating-notes').remove()" style="
                    background: transparent;
                    border: none;
                    color: white;
                    cursor: pointer;
                    font-size: 20px;
                    line-height: 1;
                    padding: 0;
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">×</button>
            </div>
        </div>
        <div id="tablock-floating-notes-content" style="padding: 16px;">
            <textarea
                id="tablock-floating-notes-input"
                placeholder="Jot down thoughts - press Enter to save..."
                style="
                    width: 100%;
                    min-height: 80px;
                    padding: 10px;
                    border: 1px solid #e5e7eb;
                    border-radius: 6px;
                    font-family: inherit;
                    font-size: 14px;
                    resize: vertical;
                    box-sizing: border-box;
                "
            ></textarea>
            <div style="
                margin-top: 8px;
                font-size: 12px;
                color: #9ca3af;
            ">Press Enter to save • Shift+Enter for new line</div>
            <div id="tablock-floating-notes-list" style="
                margin-top: 12px;
                max-height: 200px;
                overflow-y: auto;
            "></div>
        </div>
    `;

    document.body.appendChild(floatingNotes);

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    if (!document.querySelector('style[data-tablock-animations]')) {
        style.setAttribute('data-tablock-animations', 'true');
        document.head.appendChild(style);
    }

    // Load and display existing notes
    loadFloatingNotes();

    // Handle Enter key to save note
    const input = document.getElementById('tablock-floating-notes-input');
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const note = input.value.trim();
            if (note) {
                addNoteToSession(note);
                input.value = '';
                loadFloatingNotes();
            }
        }
    });

    // Handle minimize/maximize
    const minimizeBtn = document.getElementById('tablock-minimize-btn');
    const content = document.getElementById('tablock-floating-notes-content');
    let isMinimized = false;

    minimizeBtn.addEventListener('click', () => {
        isMinimized = !isMinimized;

        if (isMinimized) {
            // Minimize
            content.style.display = 'none';
            floatingNotes.style.width = '200px';
            minimizeBtn.innerHTML = '+';
            minimizeBtn.title = 'Maximize';

            // Change border radius for minimized state
            const header = floatingNotes.querySelector('.tablock-floating-notes-header');
            header.style.borderRadius = '12px';
        } else {
            // Maximize
            content.style.display = 'block';
            floatingNotes.style.width = '350px';
            minimizeBtn.innerHTML = '−';
            minimizeBtn.title = 'Minimize';

            // Restore border radius
            const header = floatingNotes.querySelector('.tablock-floating-notes-header');
            header.style.borderRadius = '12px 12px 0 0';

            // Focus input when maximized
            input.focus();
        }
    });
}

function addNoteToSession(note) {
    chrome.storage.local.get(['currentSession'], (result) => {
        const session = result.currentSession || {};
        session.notes = session.notes || [];
        session.notes.push({
            id: Date.now(),
            text: note,
            timestamp: Date.now()
        });

        chrome.storage.local.set({ currentSession: session });
    });
}

function loadFloatingNotes() {
    const notesList = document.getElementById('tablock-floating-notes-list');
    if (!notesList) return;

    chrome.storage.local.get(['currentSession'], (result) => {
        const notes = result.currentSession?.notes || [];
        if (notes.length === 0) {
            notesList.innerHTML = '<p style="margin: 0; color: #9ca3af; font-size: 13px;">No notes yet</p>';
            return;
        }

        // Sort notes to show newest first
        const sortedNotes = [...notes].sort((a, b) => b.timestamp - a.timestamp);

        notesList.innerHTML = sortedNotes.map(note => `
            <div style="
                padding: 8px;
                margin-bottom: 8px;
                background: #f9fafb;
                border-radius: 6px;
                font-size: 13px;
                color: #4b5563;
            ">
                ${escapeHtml(note.text)}
            </div>
        `).join('');
    });
}

