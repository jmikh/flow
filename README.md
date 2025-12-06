# Flow - Focus Extension for Chrome
Flow is a Chrome extension designed to help you maintain focus by locking your active tab.

## Features

- **Lock Tab**: Prevent switching to other tabs while locked.
- **Flow State**: Enter a flow state with a calming interface.
- **Notes**: Jot down thoughts without leaving your locked tab.
- **10-Second Unlock**: Hold button for 10 seconds to unlock (prevents accidental unlocks)
- **Keyboard Shortcuts**: Quick toggle with Ctrl+Shift+L (Windows/Linux) or Cmd+Shift+L (Mac)
- **Note Taking**: Jot down quick notes while locked for later reference
- **Floating Notes**: Pin notes to keep them visible on screen
- **Focus Sessions History**: Track your focus time and review past sessions
- **Motivational Messages**: Rotating messages to keep you focused
- **Distraction Tracking**: See how many times you tried to switch tabs

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked"
5. Select the `tablock-extension` folder
6. Pin the extension for easy access

## Usage

### Locking a Tab
1. Click the TabLock extension icon
2. Click "Lock This Tab"
3. The tab is now locked - you cannot switch away

### Unlocking
- **Method 1**: Hold the unlock button for 10 seconds when the modal appears
- **Method 2**: Close the locked tab entirely

### Taking Notes
- While locked, use the modal's note field to jot down thoughts
- Press Enter to save a note
- Click the pin icon to float notes on screen
- Notes are saved with your session

### Viewing History
1. Click the extension icon
2. Select "View Focus Sessions"
3. Review your focus stats and past sessions
4. Filter to show only sessions with notes

## File Structure

```
tablock-extension/
├── manifest.json           # Extension configuration
├── popup.html             # Extension popup UI
├── history.html           # Focus sessions history page
├── src/
│   ├── background.js      # Service worker for tab control
│   ├── popup.js          # Popup logic
│   ├── modal.js          # Modal and unlock mechanism
│   ├── floating-notes.js # Floating notes widget
│   └── history.js        # History page logic
├── styles/
│   ├── popup.css         # Popup styles
│   ├── modal.css         # Modal styles
│   └── history.css       # History page styles
└── icons/                # Extension icons
```

## Privacy

- All data is stored locally in Chrome storage
- No external servers or tracking
- Sessions are only saved on your device

## Tips for Best Results

1. **Set Clear Goals**: Before locking, know what you want to accomplish
2. **Use Notes**: Jot down distracting thoughts instead of acting on them
3. **Take Breaks**: After unlocking, take a real break before locking again
4. **Review History**: Learn from your patterns to improve focus

## Known Limitations

- Cannot prevent closing tabs directly (browser limitation)
- Cannot block keyboard shortcuts like Ctrl+T (new tab)
- Some websites may interfere with the modal display

## Development

To modify the extension:
1. Edit the source files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the TabLock extension
4. Test your changes

## Support

For issues or feature requests, please create an issue in the repository.