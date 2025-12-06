import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import {
  Box,
  Button,
  Typography,
  TextField,
  IconButton,
  Fade,
  ThemeProvider,
  createTheme,

  Stack,
  Snackbar,
  Alert,
  Collapse
} from '@mui/material';
import {
  LockOpen as LockOpenIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Close as CloseIcon
} from '@mui/icons-material';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#ffffff',
    },
    text: {
      primary: '#ffffff',
      secondary: 'rgba(255, 255, 255, 0.7)',
    },
  },
  typography: {
    fontFamily: '"Outfit", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    // Removed MuiCssBaseline overrides
  },
});

function UnlockModal({ onClose }) {
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [showPreviousNotes, setShowPreviousNotes] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [elapsedTime, setElapsedTime] = useState('00:00');
  const intervalRef = useRef(null);
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
          const seconds = Math.floor((ms / 1000) % 60);
          const minutes = Math.floor((ms / (1000 * 60)) % 60);
          const hours = Math.floor((ms / (1000 * 60 * 60)));

          if (hours > 0) {
            setElapsedTime(`${hours}h ${minutes}m`);
          } else {
            setElapsedTime(`${minutes}m ${seconds}s`);
          }
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
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener('keydown', preventEscape);
    };
  }, []);

  const startUnlock = () => {
    setIsHolding(true);
    setProgress(0);

    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleUnlock();
          return 100;
        }
        return prev + 1;
      });
    }, 100); // 10 seconds total
  };

  const stopUnlock = () => {
    setIsHolding(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setProgress(0);
  };

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

  const handleAddNote = () => {
    if (!newNote.trim()) return;

    const note = {
      id: Date.now(),
      text: newNote.trim(),
      timestamp: Date.now()
    };

    chrome.storage.local.get(['currentSession'], (result) => {
      const session = result.currentSession || {};
      session.notes = session.notes || [];
      session.notes.push(note);

      chrome.storage.local.set({ currentSession: session }, () => {
        setNotes(session.notes);
        setNewNote('');
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

  const remainingSeconds = Math.ceil((100 - progress) / 10);

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
          bgcolor: 'rgba(0, 0, 0, 0.7)',
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
            onClick={onClose}
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
              color: 'rgba(255, 255, 255, 0.6)', // Greyer/dimmer
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

          {/* Unlock Button */}
          <Box sx={{ position: 'relative', mb: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Button
              variant="contained"
              onMouseDown={startUnlock}
              onMouseUp={stopUnlock}
              onMouseLeave={stopUnlock}
              onTouchStart={startUnlock}
              onTouchEnd={stopUnlock}
              sx={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                minWidth: 'unset',
                bgcolor: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.3)',
                },
                position: 'relative',
                overflow: 'hidden',
                // Fix for pixelated edges on border-radius + overflow:hidden
                transform: 'translateZ(0)',
                WebkitMaskImage: '-webkit-radial-gradient(white, black)',
              }}
            >
              <LockOpenIcon sx={{ fontSize: 32, color: '#fff', zIndex: 2 }} />

              {/* Progress Fill */}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: `${progress}%`,
                  bgcolor: 'rgba(255, 255, 255, 0.4)', // Soft white fill
                  transition: 'height 0.1s linear',
                  zIndex: 1,
                }}
              />
            </Button>
            <Typography
              variant="body1"
              sx={{
                color: 'rgba(255, 255, 255, 0.8)',
                fontWeight: 300,
                letterSpacing: '0.5px',
                mt: 1,
                textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                fontFamily: '"Nunito", sans-serif',
                fontSize: '16px',
              }}
            >
              {isHolding ? `Hold ${remainingSeconds}s` : 'unlock'}
            </Typography>
          </Box>

          {/* Glassmorphic Notes Area */}
          <Box
            sx={{
              mt: 'auto', // Push to bottom
              width: '100%',
              maxWidth: '400px',
              bgcolor: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(12px)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              p: 2,
              boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.3s ease',
              '&:focus-within': {
                bgcolor: 'rgba(255, 255, 255, 0.15)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
              }
            }}
          >
            <TextField
              fullWidth
              multiline
              rows={2}
              variant="standard"
              placeholder="intrusive thoughts? Jot them down for later"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddNote();
                }
              }}
              InputProps={{
                disableUnderline: true,
                sx: {
                  color: '#fff',
                  fontSize: '15px',
                  fontWeight: 300,
                  '&::placeholder': {
                    color: 'rgba(255, 255, 255, 0.5)',
                    opacity: 1,
                  },
                  // Custom Scrollbar for Textarea
                  '& textarea::-webkit-scrollbar': {
                    width: '4px',
                  },
                  '& textarea::-webkit-scrollbar-track': {
                    bgcolor: 'transparent',
                  },
                  '& textarea::-webkit-scrollbar-thumb': {
                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '2px',
                  },
                  '& textarea::-webkit-scrollbar-thumb:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.4)',
                  },
                }
              }}
            />

            {/* Previous Notes Toggle */}
            {notes.length > 0 && (
              <Box sx={{ mt: 1, borderTop: '1px solid rgba(255,255,255,0.1)', pt: 1 }}>
                <Button
                  size="small"
                  onClick={() => setShowPreviousNotes(!showPreviousNotes)}
                  endIcon={showPreviousNotes ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  sx={{
                    color: 'rgba(255,255,255,0.7)',
                    textTransform: 'none',
                    fontSize: '13px',
                    minWidth: 'unset',
                    p: 0,
                    '&:hover': { bgcolor: 'transparent', color: '#fff' }
                  }}
                >
                  {notes.length} note{notes.length !== 1 ? 's' : ''}
                </Button>

                <Collapse in={showPreviousNotes}>
                  <Box sx={{
                    maxHeight: '150px',
                    overflowY: 'auto',
                    mt: 1,
                    '&::-webkit-scrollbar': { width: '4px' },
                    '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.2)', borderRadius: '2px' }
                  }}>
                    {[...notes].reverse().map((note) => (
                      <Box
                        key={note.id}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          py: 0.5,
                          borderBottom: '1px solid rgba(255,255,255,0.05)'
                        }}
                      >
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', textAlign: 'left' }}>
                          {note.text}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteNote(note.id)}
                          sx={{ color: 'rgba(255,255,255,0.4)', '&:hover': { color: '#fff' } }}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                  </Box>
                </Collapse>
              </Box>
            )}
          </Box>
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
let modalRoot = null;
let toastRoot = null;

if (!window.flowInjected) {
  window.flowInjected = true;

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'showModal' || request.action === 'attemptedSwitch') {
      showModal();
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