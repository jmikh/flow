// Focus Sessions History Page Script

let allSessions = [];
let showNotesOnly = false;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadSessions();
    setupEventListeners();
});

function setupEventListeners() {
    // Notes only toggle
    document.getElementById('notes-only-toggle').addEventListener('change', (e) => {
        showNotesOnly = e.target.checked;
        renderSessions();
    });

    // Clear history button
    document.getElementById('clear-history').addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all focus sessions history?')) {
            chrome.storage.local.set({ focusSessions: [] }, () => {
                allSessions = [];
                renderSessions();
                updateStats();
            });
        }
    });
}

function loadSessions() {
    chrome.storage.local.get(['focusSessions'], (result) => {
        allSessions = result.focusSessions || [];
        renderSessions();
        updateStats();
    });
}

function renderSessions() {
    const sessionsList = document.getElementById('sessions-list');
    const emptyState = document.getElementById('empty-state');

    // Filter sessions
    let sessions = allSessions;
    if (showNotesOnly) {
        sessions = sessions.filter(s => s.notes && s.notes.length > 0);
    }

    // Sort by most recent
    sessions.sort((a, b) => b.startTime - a.startTime);

    if (sessions.length === 0) {
        sessionsList.innerHTML = '';
        emptyState.style.display = 'flex';
        emptyState.style.flexDirection = 'column';
        emptyState.style.alignItems = 'center';
        return;
    }

    emptyState.style.display = 'none';
    sessionsList.innerHTML = '';

    sessions.forEach(session => {
        const sessionElement = createSessionElement(session);
        sessionsList.appendChild(sessionElement);
    });
}

function createSessionElement(session) {
    const div = document.createElement('div');
    div.className = 'session-item';

    const duration = formatDuration(session.endTime - session.startTime);
    const date = new Date(session.startTime);
    const dateStr = formatDate(date);

    // Create favicon or default icon
    const faviconHtml = session.favicon
        ? `<img src="${session.favicon}" class="session-favicon" onerror="this.style.display='none'">`
        : `<div class="session-favicon" style="display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #7c3aed, #6d28d9); color: white; font-weight: bold;">${(session.title || 'Tab')[0].toUpperCase()}</div>`;

    let notesHtml = '';
    if (session.notes && session.notes.length > 0) {
        notesHtml = `
            <div class="session-notes">
                <div class="session-notes-title">Notes (${session.notes.length})</div>
                ${session.notes.map(note => `
                    <div class="session-note">${escapeHtml(note.text)}</div>
                `).join('')}
            </div>
        `;
    }

    div.innerHTML = `
        ${faviconHtml}
        <div class="session-content">
            <div class="session-title">${escapeHtml(session.title || 'Untitled Tab')}</div>
            <div class="session-url">${escapeHtml(session.url || '')}</div>
            <div class="session-meta">
                <div class="session-meta-item">
                    <svg width="14" height="14" viewBox="0 0 24 24">
                        <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                    </svg>
                    ${dateStr}
                </div>
                <div class="session-meta-item">
                    <svg width="14" height="14" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                    </svg>
                    ${session.attemptedSwitches || 0} distractions blocked
                </div>
                ${session.unlocks ? `
                <div class="session-meta-item">
                    <svg width="14" height="14" viewBox="0 0 24 24">
                        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/>
                    </svg>
                    ${session.unlocks} unlocks
                </div>
                ` : ''}
            </div>
            ${notesHtml}
        </div>
        <div class="session-duration">${duration}</div>
    `;

    return div;
}

function updateStats() {
    // Calculate total focus time
    let totalTime = 0;
    let totalUnlocks = 0;
    let totalAttempts = 0;

    allSessions.forEach(session => {
        if (session.endTime && session.startTime) {
            totalTime += session.endTime - session.startTime;
        }
        totalUnlocks += session.unlocks || 0;
        totalAttempts += session.attemptedSwitches || 0;
    });

    // Update UI
    document.getElementById('total-time').textContent = formatDuration(totalTime);
    document.getElementById('total-sessions').textContent = allSessions.length;
    document.getElementById('total-unlocks').textContent = totalUnlocks;
    document.getElementById('total-attempts').textContent = totalAttempts;
}

function formatDuration(ms) {
    if (!ms || ms < 0) return '0m';

    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}

function formatDate(date) {
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
        return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    } else if (days === 1) {
        return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    } else if (days < 7) {
        return `${days} days ago`;
    } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}