import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import {
  Box,
  Button,
  Typography,
  TextField,
  IconButton,
  ThemeProvider,
  createTheme,
  CssBaseline,
  Snackbar,
  Alert,
  Collapse
} from '@mui/material';
import {
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  History as HistoryIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  PlayArrow as PlayArrowIcon,
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
});

function PopupApp() {
  const [isLocked, setIsLocked] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [showPreviousNotes, setShowPreviousNotes] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const timerRef = useRef(null);

  useEffect(() => {
    // Check current lock state
    chrome.storage.local.get(['isLocked', 'currentSession'], (result) => {
      const locked = result.isLocked || false;
      setIsLocked(locked);

      if (locked && result.currentSession) {
        setStartTime(result.currentSession.startTime);
        setNotes(result.currentSession.notes || []);

        // Calculate initial elapsed time
        if (result.currentSession.startTime) {
          setElapsedTime(Date.now() - result.currentSession.startTime);
        }
      }
    });

    // Listen for storage changes
    const handleStorageChange = (changes, namespace) => {
      if (namespace === 'local') {
        if (changes.isLocked) {
          setIsLocked(changes.isLocked.newValue);
          if (!changes.isLocked.newValue) {
            setStartTime(null);
            setElapsedTime(0);
          }
        }
        if (changes.currentSession) {
          const session = changes.currentSession.newValue;
          if (session) {
            setStartTime(session.startTime);
            setNotes(session.notes || []);
          }
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  // Timer effect
  useEffect(() => {
    if (isLocked && startTime) {
      timerRef.current = setInterval(() => {
        setElapsedTime(Date.now() - startTime);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isLocked, startTime]);

  const formatDuration = (ms) => {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)));

    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m ${seconds}s`;
  };

  const handleLockClick = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

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
        window.close();
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

      chrome.storage.local.set({ currentSession: session });
    });
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          width: 350,
          minHeight: 500,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          p: 3,
          backgroundImage: `url(${chrome.runtime.getURL('images/flow-bg-v2.jpg')})`,
          backgroundSize: '160%', // Zoomed in 2.5x
          backgroundPosition: 'top',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Font Injection */}
        <style>
          {`
            @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@200;300;400;600&display=swap');
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@200;300;400;500;600&display=swap');
          `}
        </style>

        {/* Content */}
        <Box sx={{ position: 'relative', zIndex: 1, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>

          {/* Header */}
          <Typography
            variant="h3"
            sx={{
              fontSize: '3rem',
              fontWeight: 200,
              background: 'linear-gradient(to bottom, #fbcfe8, #bfdbfe)',
              backgroundClip: 'text',
              textFillColor: 'transparent',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 10px rgba(191, 219, 254, 0.3))',
              fontFamily: '"Nunito", sans-serif',
              letterSpacing: '-1px',
              mb: 1,
              mt: 2
            }}
          >
            Flow
          </Typography>

          {isLocked ? (
            <>
              <Typography
                variant="body1"
                sx={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontWeight: 300,
                  fontFamily: '"Nunito", sans-serif',
                  mb: 4,
                  textAlign: 'center'
                }}
              >
                You've been in flow for<br />
                <span style={{ fontSize: '1.5rem', fontWeight: 600, color: '#fff' }}>
                  {formatDuration(elapsedTime)}
                </span>
              </Typography>

              {/* Notes Area */}
              <Box
                sx={{
                  width: '100%',
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(12px)',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  p: 2,
                  boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
                  mt: 'auto',
                  mb: 2
                }}
              >
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  variant="standard"
                  placeholder="jot down thoughts..."
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
                      fontSize: '0.9rem',
                      fontWeight: 300,
                      '&::placeholder': {
                        color: 'rgba(255, 255, 255, 0.5)',
                        opacity: 1,
                      },
                      '& textarea::-webkit-scrollbar': { width: '4px' },
                      '& textarea::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255, 255, 255, 0.2)', borderRadius: '2px' },
                    }
                  }}
                />

                {notes.length > 0 && (
                  <Box sx={{ mt: 1, borderTop: '1px solid rgba(255,255,255,0.1)', pt: 1 }}>
                    <Button
                      size="small"
                      onClick={() => setShowPreviousNotes(!showPreviousNotes)}
                      endIcon={showPreviousNotes ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      sx={{
                        color: 'rgba(255,255,255,0.7)',
                        textTransform: 'none',
                        fontSize: '0.8rem',
                        minWidth: 'unset',
                        p: 0,
                        '&:hover': { bgcolor: 'transparent', color: '#fff' }
                      }}
                    >
                      {notes.length} note{notes.length !== 1 ? 's' : ''}
                    </Button>

                    <Collapse in={showPreviousNotes}>
                      <Box sx={{
                        maxHeight: '100px',
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
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.8rem', textAlign: 'left' }}>
                              {note.text}
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteNote(note.id)}
                              sx={{ color: 'rgba(255,255,255,0.4)', '&:hover': { color: '#fff' }, p: 0.5 }}
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
            </>
          ) : (
            <>
              <Typography
                variant="body1"
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontWeight: 300,
                  fontFamily: '"Nunito", sans-serif',
                  mb: 6,
                  textAlign: 'center'
                }}
              >
                ready to focus?
              </Typography>

              <Button
                variant="contained"
                onClick={handleLockClick}
                startIcon={<PlayArrowIcon />}
                sx={{
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px',
                  color: '#fff',
                  py: 1.5,
                  px: 4,
                  fontSize: '1rem',
                  textTransform: 'none',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.3)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                  },
                  mb: 3
                }}
              >
                Start Flow Session
              </Button>

              <Button
                variant="text"
                href="history.html"
                target="_blank"
                startIcon={<HistoryIcon />}
                sx={{
                  color: 'rgba(255, 255, 255, 0.6)',
                  textTransform: 'none',
                  '&:hover': {
                    color: '#fff',
                    bgcolor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                View Previous Sessions
              </Button>
            </>
          )}
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
      </Box>
    </ThemeProvider>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<PopupApp />);