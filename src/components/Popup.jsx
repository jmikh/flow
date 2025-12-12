import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import {
  Box,
  Button,
  Typography,
  ThemeProvider,
  CssBaseline
} from '@mui/material';
import {
  History as HistoryIcon,
  PlayArrow as PlayArrowIcon
} from '@mui/icons-material';

import { theme } from '../styles/theme';
import { formatDuration } from '../utils/time';
import NotesArea from './shared/NotesArea';
import UnlockButton from './shared/UnlockButton';

function PopupApp() {
  const [isLocked, setIsLocked] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [notes, setNotes] = useState([]);
  const timerRef = useRef(null);
  const [isRestrictedTab, setIsRestrictedTab] = useState(false);

  useEffect(() => {
    // Check current tab URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        const url = tabs[0].url;
        if (url.startsWith('chrome://') ||
          url.startsWith('chrome-extension://') ||
          url.startsWith('https://chrome.google.com/webstore') ||
          url.startsWith('view-source:') ||
          url.startsWith('about:')) {
          setIsRestrictedTab(true);
        }
      }
    });

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

      chrome.storage.local.set({ currentSession: session });
    });
  };

  const handleDeleteNote = (noteId) => {
    chrome.storage.local.get(['currentSession'], (result) => {
      const session = result.currentSession || {};
      session.notes = (session.notes || []).filter(n => n.id !== noteId);

      chrome.storage.local.set({ currentSession: session });
    });
  };

  const handleUnlock = () => {
    chrome.runtime.sendMessage({ action: 'unlockTab' }, () => {
      window.close();
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
          backgroundImage: `url(${chrome.runtime.getURL('images/flow-bg-popup.jpg')})`,
          backgroundSize: '135%',
          backgroundPosition: 'top center',
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
        <Box sx={{ position: 'relative', zIndex: 1, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>

          {/* Pre-header */}
          {isLocked && (
            <Typography
              variant="h6"
              sx={{
                color: 'rgba(255, 255, 255, 0.8)',
                fontWeight: 300,
                fontFamily: '"Nunito", sans-serif',
                mb: -2,
                mt: 1,
                textAlign: 'center'
              }}
            >
              you are in
            </Typography>
          )}

          {/* Header */}
          <Typography
            variant="h3"
            sx={{
              fontSize: '3.5rem',
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
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'center',
                  gap: 1
                }}
              >
                <span style={{ fontSize: '1rem', fontWeight: 300 }}>for</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 600, color: '#fff' }}>
                  {formatDuration(elapsedTime)}
                </span>
              </Typography>

              <UnlockButton onUnlock={handleUnlock} durationSeconds={10} />

              <NotesArea
                notes={notes}
                onAddNote={handleAddNote}
                onDeleteNote={handleDeleteNote}
              />
            </>
          ) : isRestrictedTab ? (
            <>
              <Typography
                variant="body1"
                sx={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontWeight: 300,
                  fontFamily: '"Nunito", sans-serif',
                  mb: 4,
                  textAlign: 'center',
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                  p: 2,
                  borderRadius: 2,
                  border: '1px solid rgba(255,255,255,0.2)'
                }}
              >
                Flow sessions cannot be started on system pages.
              </Typography>

              <Button
                variant="text"
                href="history.html"
                target="_blank"
                startIcon={<HistoryIcon />}
                sx={{
                  color: 'rgba(255, 255, 255, 0.8)',
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
                  color: 'rgba(255, 255, 255, 0.8)',
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


          {!isRestrictedTab && (
            <Button
              variant="text"
              startIcon={<PlayArrowIcon />}
              onClick={() => {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                  if (tabs[0]) {
                    // Try to send message
                    chrome.tabs.sendMessage(tabs[0].id, { action: 'showTutorial' }, (response) => {
                      if (chrome.runtime.lastError) {
                        // If error (content script missing), inject it manually
                        chrome.scripting.executeScript({
                          target: { tabId: tabs[0].id },
                          files: ['modal.bundle.js']
                        }, () => {
                          // Retry sending message after injection
                          setTimeout(() => {
                            chrome.tabs.sendMessage(tabs[0].id, { action: 'showTutorial' });
                            window.close();
                          }, 100);
                        });
                      } else {
                        window.close();
                      }
                    });
                  }
                });
              }}
              sx={{
                color: 'rgba(255, 255, 255, 0.8)',
                textTransform: 'none',
                mt: 'auto', // Pin to bottom
                mb: 1,      // Add bottom margin
                '&:hover': {
                  color: '#fff',
                  bgcolor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              View Tutorial
            </Button>
          )}
        </Box>


      </Box>
    </ThemeProvider >
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<PopupApp />);