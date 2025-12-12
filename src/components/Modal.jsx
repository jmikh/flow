import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import {
  Box,
  Button,
  Typography,
  IconButton,
  ThemeProvider,
  Snackbar,
  Alert
} from '@mui/material';
import {
  Close as CloseIcon
} from '@mui/icons-material';

import { theme } from '../styles/theme';
import { formatDuration } from '../utils/time';
import NotesArea from './shared/NotesArea';
import UnlockButton from './shared/UnlockButton';
import TutorialModal from './Tutorial';

function UnlockModal({ onClose }) {
  const [notes, setNotes] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [elapsedTime, setElapsedTime] = useState('00:00');
  const timerRef = useRef(null);

  useEffect(() => {
    // Load existing notes and start timer
    chrome.storage.local.get(['currentSession'], (result) => {
      if (result.currentSession) {
        if (result.currentSession.notes) {
          setNotes(result.currentSession.notes);
        }

        // Start timer
        const startTime = result.currentSession.startTime;
        const updateTimer = () => {
          const now = Date.now();
          const ms = now - startTime;
          setElapsedTime(formatDuration(ms));
        };

        updateTimer();
        timerRef.current = setInterval(updateTimer, 1000);
      }
    });

    // Prevent escape key
    const preventEscape = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener('keydown', preventEscape);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener('keydown', preventEscape);
    };
  }, []);

  const handleUnlock = () => {
    // Update session data
    chrome.storage.local.get(['currentSession', 'sessionHistory'], (result) => {
      const session = result.currentSession || {};
      session.endTime = Date.now();
      session.unlocks = (session.unlocks || 0) + 1;

      // Add to history
      const history = result.sessionHistory || [];
      history.push(session);

      chrome.storage.local.set({
        isLocked: false,
        lockedTabId: null,
        currentSession: null,
        sessionHistory: history
      }, () => {
        // Update icon
        chrome.runtime.sendMessage({ action: 'updateIcon', locked: false });

        // Show toast via background
        const hasNotes = session.notes && session.notes.length > 0;

        // Calculate duration
        const durationMs = session.endTime - session.startTime;
        const minutes = Math.floor(durationMs / 60000);
        const durationText = minutes === 0 ? 'Less than 1m' : `${minutes}m`;

        chrome.runtime.sendMessage({ action: 'showUnlockNotification', hasNotes, durationText });

        onClose();
      });
    });
  };

  const handleAddNote = (text) => {
    const note = {
      id: Date.now(),
      text: text,
      timestamp: Date.now()
    };

    chrome.storage.local.get(['currentSession'], (result) => {
      const session = result.currentSession || {};
      session.notes = session.notes || [];
      session.notes.push(note);

      chrome.storage.local.set({ currentSession: session }, () => {
        setNotes(session.notes);
        setSnackbar({
          open: true,
          message: 'Note added',
          severity: 'success'
        });
      });
    });
  };

  const handleDeleteNote = (noteId) => {
    chrome.storage.local.get(['currentSession'], (result) => {
      const session = result.currentSession || {};
      session.notes = (session.notes || []).filter(n => n.id !== noteId);

      chrome.storage.local.set({ currentSession: session }, () => {
        setNotes(session.notes);
      });
    });
  };

  return (
    <ThemeProvider theme={theme}>
      {/* Removed CssBaseline to prevent global style interference */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          bgcolor: 'rgba(0, 0, 0, 0.2)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          fontFamily: '"Outfit", sans-serif',
        }}
        onClick={onClose}
      >
        {/* Content Container */}
        <Box
          onClick={(e) => e.stopPropagation()}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '90%',
            maxWidth: '480px', // Narrower for vertical rectangular look
            minHeight: '700px', // Taller
            textAlign: 'center',
            p: 6,
            backgroundImage: `url(${chrome.runtime.getURL('images/flow-bg-v2.jpg')})`,
            backgroundSize: '120%', // Zoomed in slightly
            backgroundPosition: 'top center',
            borderRadius: '32px',
            boxShadow: '0 24px 48px rgba(0, 0, 0, 0.5)',
            position: 'relative',
          }}
        >
          {/* Close Button */}
          <IconButton
            onClick={() => {
              chrome.runtime.sendMessage({ action: 'showToast', message: "Flow session resumed <span style='color: #ef4444; margin-left: 4px;'>❤️</span>" });
              onClose();
            }}
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              color: 'rgba(255, 255, 255, 0.6)',
              '&:hover': {
                color: '#fff',
                bgcolor: 'rgba(255, 255, 255, 0.1)',
              },
              zIndex: 10,
            }}
          >
            <CloseIcon />
          </IconButton>
          {/* Font Injection */}
          <style>
            {`
              @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@200;300;400;600&display=swap');
            `}
          </style>

          {/* Pre-title */}
          <Typography
            variant="h6"
            sx={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontWeight: 300,
              letterSpacing: '2px',
              mb: 2, // Increased spacing
              textTransform: 'lowercase',
              textShadow: '0 2px 4px rgba(0,0,0,0.1)',
              fontFamily: '"Nunito", sans-serif',
              fontSize: '20px',
            }}
          >
            you are currently in
          </Typography>

          {/* Title */}
          <Typography
            variant="h1"
            sx={{
              fontSize: '128px',
              fontWeight: 200,
              background: 'linear-gradient(to bottom, #fbcfe8, #bfdbfe)', // Pink (pink-200) to Blue (blue-200)
              backgroundClip: 'text',
              textFillColor: 'transparent',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              // Removed textShadow as it conflicts with gradient text in some browsers, 
              // or needs specific handling (filter: drop-shadow) which can be heavy.
              // Keeping it clean for now as per "calmer" request.
              filter: 'drop-shadow(0 0 20px rgba(191, 219, 254, 0.3))',
              lineHeight: 1,
              mb: 1,
              userSelect: 'none',
              fontFamily: '"Nunito", sans-serif', // Rounder font
              letterSpacing: '-2px',
            }}
          >
            Flow
          </Typography>

          {/* Timer */}
          <Typography
            variant="h4"
            sx={{
              color: '#ffffff',
              fontWeight: 600,
              letterSpacing: '1px',
              mb: 1,
              textShadow: '0 2px 4px rgba(0,0,0,0.2)',
              fontFamily: '"Nunito", sans-serif',
              fontSize: '32px',
            }}
          >
            {elapsedTime}
          </Typography>

          {/* Subtitle */}
          <Typography
            variant="body1" // Smaller than h6
            sx={{
              color: 'rgba(255, 255, 255, 0.7)', // Greyer/dimmer
              fontWeight: 300,
              letterSpacing: '0.5px',
              mb: 6,
              textShadow: '0 1px 2px rgba(0,0,0,0.2)',
              fontFamily: '"Nunito", sans-serif',
              fontSize: '16px',
            }}
          >
            close tab to end session
          </Typography>

          <UnlockButton onUnlock={handleUnlock} durationSeconds={10} />

          <NotesArea
            notes={notes}
            onAddNote={handleAddNote}
            onDeleteNote={handleDeleteNote}
            placeholder="intrusive thoughts? Jot them down for later"
          />
        </Box>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{
            width: '100%',
            bgcolor: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.2)'
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}

// Content script integration
// Content script integration
let modalRoot = null;
let toastRoot = null;
let tutorialRoot = null;

if (!window.flowInjected) {
  window.flowInjected = true;

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'showModal' || request.action === 'attemptedSwitch') {
      showModal();
    } else if (request.action === 'showTutorial') {
      showTutorial();
    } else if (request.action === 'tabUnlocked') {
      hideModal();
    } else if (request.action === 'displaySessionNotes') {
      // Display session notes count in toast
      if (request.notes && request.notes.length > 0) {
        showToast(`Session ended with ${request.notes.length} note(s) saved`, 'success');
      }
      sendResponse({ success: true });
    }
  });
}

function showModal() {
  if (modalRoot) return;

  const existingContainer = document.getElementById('flow-modal-root');
  if (existingContainer) existingContainer.remove();

  const container = document.createElement('div');
  container.id = 'flow-modal-root';
  document.body.appendChild(container);

  modalRoot = ReactDOM.createRoot(container);
  modalRoot.render(<UnlockModal onClose={() => {
    hideModal();
  }} />);
}

function hideModal() {
  if (modalRoot) {
    modalRoot.unmount();
    modalRoot = null;
    const container = document.getElementById('flow-modal-root');
    if (container) container.remove();
  }
}

function showToast(message, severity = 'info') {
  if (toastRoot) {
    toastRoot.unmount();
    const existingContainer = document.getElementById('flow-toast-root');
    if (existingContainer) existingContainer.remove();
  }

  const container = document.createElement('div');
  container.id = 'flow-toast-root';
  document.body.appendChild(container);

  const ToastComponent = () => {
    const [open, setOpen] = React.useState(true);

    return (
      <ThemeProvider theme={theme}>
        <Snackbar
          open={open}
          autoHideDuration={5000}
          onClose={() => {
            setOpen(false);
            setTimeout(() => {
              if (toastRoot) {
                toastRoot.unmount();
                toastRoot = null;
                container.remove();
              }
            }, 500);
          }}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert
            onClose={() => setOpen(false)}
            severity={severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {message}
          </Alert>
        </Snackbar>
      </ThemeProvider>
    );
  };

  toastRoot = ReactDOM.createRoot(container);
  toastRoot.render(<ToastComponent />);
}

function showTutorial() {
  if (tutorialRoot) return;

  const existingContainer = document.getElementById('flow-tutorial-root');
  if (existingContainer) existingContainer.remove();

  const container = document.createElement('div');
  container.id = 'flow-tutorial-root';
  document.body.appendChild(container);

  tutorialRoot = ReactDOM.createRoot(container);
  tutorialRoot.render(
    <TutorialModal
      onClose={(dontShowAgain) => {
        // Update preference
        chrome.storage.local.set({ tutorialSeen: dontShowAgain });
        hideTutorial();
      }}
    />
  );
}

function hideTutorial() {
  if (tutorialRoot) {
    tutorialRoot.unmount();
    tutorialRoot = null;
    const container = document.getElementById('flow-tutorial-root');
    if (container) container.remove();
  }
}