// Floating notes widget functionality

let floatingNotesWidget = null;
let isDragging = false;
let currentX;
let currentY;
let initialX;
let initialY;
let xOffset = 0;
let yOffset = 0;

// Listen for messages to create floating notes
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'createFloatingNotes') {
        if (!floatingNotesWidget) {
            createFloatingNotesWidget();
        }
    }
});

function createFloatingNotesWidget() {
    // Create floating widget
    floatingNotesWidget = document.createElement('div');
    floatingNotesWidget.className = 'tablock-floating-notes';

    floatingNotesWidget.innerHTML = `
        <div class="tablock-floating-notes-header" id="tablock-floating-header">
            <h4 class="tablock-floating-notes-title">Quick Notes</h4>
            <div class="tablock-floating-notes-controls">
                <button class="tablock-floating-notes-btn" id="tablock-floating-minimize" title="Minimize">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 13H5v-2h14v2z"/>
                    </svg>
                </button>
                <button class="tablock-floating-notes-btn" id="tablock-floating-close" title="Close">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                </button>
            </div>
        </div>
        <div class="tablock-floating-notes-content" id="tablock-floating-content">
            <textarea
                class="tablock-notes-input"
                id="tablock-floating-notes-input"
                placeholder="Type notes here..."
                rows="4"
                style="margin-bottom: 12px;"
            ></textarea>
            <div id="tablock-floating-notes-list"></div>
        </div>
    `;

    document.body.appendChild(floatingNotesWidget);

    // Load existing notes
    loadNotesToWidget();

    // Setup drag functionality
    setupDragging();

    // Setup controls
    setupFloatingControls();

    // Setup note input
    setupFloatingNoteInput();
}

function setupDragging() {
    const header = document.getElementById('tablock-floating-header');

    header.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    function dragStart(e) {
        if (e.target.closest('.tablock-floating-notes-controls')) return;

        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;

        if (e.target.closest('.tablock-floating-notes-header')) {
            isDragging = true;
            floatingNotesWidget.style.transition = 'none';
        }
    }

    function drag(e) {
        if (isDragging) {
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;

            xOffset = currentX;
            yOffset = currentY;

            // Keep widget within viewport
            const rect = floatingNotesWidget.getBoundingClientRect();
            const maxX = window.innerWidth - rect.width;
            const maxY = window.innerHeight - rect.height;

            currentX = Math.min(Math.max(0, currentX), maxX);
            currentY = Math.min(Math.max(0, currentY), maxY);

            floatingNotesWidget.style.transform = `translate(${currentX}px, ${currentY}px)`;
        }
    }

    function dragEnd(e) {
        isDragging = false;
        floatingNotesWidget.style.transition = '';
    }
}

function setupFloatingControls() {
    const minimizeBtn = document.getElementById('tablock-floating-minimize');
    const closeBtn = document.getElementById('tablock-floating-close');
    const content = document.getElementById('tablock-floating-content');

    minimizeBtn.addEventListener('click', () => {
        const isMinimized = floatingNotesWidget.classList.contains('minimized');

        if (isMinimized) {
            floatingNotesWidget.classList.remove('minimized');
            content.classList.remove('hidden');
            minimizeBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 13H5v-2h14v2z"/>
                </svg>
            `;
        } else {
            floatingNotesWidget.classList.add('minimized');
            content.classList.add('hidden');
            minimizeBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
            `;
        }
    });

    closeBtn.addEventListener('click', () => {
        floatingNotesWidget.remove();
        floatingNotesWidget = null;

        // Update pin button in modal if it exists
        const pinBtn = document.getElementById('tablock-pin-btn');
        if (pinBtn) {
            pinBtn.classList.remove('pinned');
        }
    });
}

function setupFloatingNoteInput() {
    const input = document.getElementById('tablock-floating-notes-input');

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const note = input.value.trim();
            if (note) {
                addFloatingNote(note);
                input.value = '';
            }
        }
    });
}

function addFloatingNote(note) {
    chrome.storage.local.get(['currentSession'], (result) => {
        const session = result.currentSession || {};
        session.notes = session.notes || [];
        session.notes.push({
            id: Date.now(),
            text: note,
            timestamp: Date.now()
        });

        chrome.storage.local.set({ currentSession: session }, () => {
            loadNotesToWidget();

            // Update main modal notes if it exists
            const modalNotesList = document.getElementById('tablock-notes-list');
            if (modalNotesList) {
                const notesCount = document.getElementById('tablock-notes-count');
                if (notesCount) {
                    notesCount.textContent = session.notes.length;
                }
                renderNotesInModal(session.notes);
            }
        });
    });
}

function loadNotesToWidget() {
    chrome.storage.local.get(['currentSession'], (result) => {
        const notesList = document.getElementById('tablock-floating-notes-list');
        if (!notesList) return;

        notesList.innerHTML = '';

        if (result.currentSession && result.currentSession.notes) {
            result.currentSession.notes.forEach(note => {
                const noteItem = document.createElement('div');
                noteItem.className = 'tablock-note-item';
                noteItem.style.cssText = 'margin-bottom: 8px;';
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
                    deleteFloatingNote(noteId);
                });
            });
        }
    });
}

function deleteFloatingNote(noteId) {
    chrome.storage.local.get(['currentSession'], (result) => {
        const session = result.currentSession || {};
        session.notes = (session.notes || []).filter(n => n.id !== noteId);

        chrome.storage.local.set({ currentSession: session }, () => {
            loadNotesToWidget();

            // Update main modal notes if it exists
            const modalNotesList = document.getElementById('tablock-notes-list');
            if (modalNotesList) {
                const notesCount = document.getElementById('tablock-notes-count');
                if (notesCount) {
                    notesCount.textContent = session.notes.length;
                }
                renderNotesInModal(session.notes);
            }
        });
    });
}

function renderNotesInModal(notes) {
    const notesList = document.getElementById('tablock-notes-list');
    if (!notesList) return;

    notesList.innerHTML = '';

    notes.forEach(note => {
        const noteItem = document.createElement('div');
        noteItem.className = 'tablock-note-item';
        noteItem.innerHTML = `
            <span class="tablock-note-text">${escapeHtml(note.text)}</span>
            <button class="tablock-note-delete" data-note-id="${note.id}">&times;</button>
        `;
        notesList.appendChild(noteItem);
    });

    // Re-add delete handlers
    notesList.querySelectorAll('.tablock-note-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const noteId = parseInt(e.target.dataset.noteId);
            deleteFloatingNote(noteId);
        });
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}