// Comprehensive logging utility for TabLock extension
// This file explains and logs every mechanism

const LOG_PREFIX = '[🔒 TabLock]';
const LOG_STYLES = {
    LOCK: '🔒',
    UNLOCK: '🔓',
    SWITCH: '🔄',
    MODAL: '📋',
    NEW_TAB: '➕',
    BLOCKED: '❌',
    SUCCESS: '✅',
    ERROR: '⚠️',
    INFO: 'ℹ️'
};

// Enhanced logging function with colors
function tabLockLog(type, message, data = null) {
    const timestamp = new Date().toLocaleTimeString();
    const icon = LOG_STYLES[type] || LOG_STYLES.INFO;

    const styles = {
        LOCK: 'color: #10b981; font-weight: bold;',
        UNLOCK: 'color: #f59e0b; font-weight: bold;',
        SWITCH: 'color: #3b82f6;',
        MODAL: 'color: #8b5cf6;',
        NEW_TAB: 'color: #06b6d4;',
        BLOCKED: 'color: #ef4444; font-weight: bold;',
        SUCCESS: 'color: #10b981;',
        ERROR: 'color: #ef4444; font-weight: bold;',
        INFO: 'color: #6b7280;'
    };

    console.log(
        `%c${LOG_PREFIX} ${icon} [${timestamp}] ${message}`,
        styles[type] || styles.INFO,
        data || ''
    );

    if (data && typeof data === 'object') {
        console.table(data);
    }
}

// Export for use in background.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { tabLockLog };
}