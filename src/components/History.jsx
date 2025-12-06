import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Switch,
  FormControlLabel,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemAvatar,
  Avatar,
  Paper,
  IconButton,
  Collapse,
  ThemeProvider,
  createTheme,
  CssBaseline,
  Alert,
  Snackbar
} from '@mui/material';
import {
  AccessTime as TimeIcon,
  CalendarToday as CalendarIcon,
  Lock as LockIcon,
  CheckCircle as CheckIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Note as NoteIcon,
  Block as BlockIcon
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

function HistoryApp() {
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState({
    totalTime: 0,
    totalSessions: 0,
    totalUnlocks: 0,
    totalAttempts: 0
  });
  const [notesOnlyFilter, setNotesOnlyFilter] = useState(false);
  const [expandedSessions, setExpandedSessions] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    loadSessionData();
  }, []);

  const loadSessionData = () => {
    chrome.storage.local.get(['sessionHistory'], (result) => {
      const history = result.sessionHistory || [];
      setSessions(history.reverse()); // Show newest first
      calculateStats(history);
    });
  };

  const calculateStats = (history) => {
    let totalTime = 0;
    let totalUnlocks = 0;
    let totalAttempts = 0;

    history.forEach(session => {
      if (session.endTime && session.startTime) {
        totalTime += session.endTime - session.startTime;
      }
      totalUnlocks += session.unlocks || 0;
      totalAttempts += session.attemptedSwitches || 0;
    });

    setStats({
      totalTime,
      totalSessions: history.length,
      totalUnlocks,
      totalAttempts
    });
  };

  const formatDuration = (milliseconds) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear all session history?')) {
      chrome.storage.local.set({ sessionHistory: [] }, () => {
        setSessions([]);
        setStats({
          totalTime: 0,
          totalSessions: 0,
          totalUnlocks: 0,
          totalAttempts: 0
        });
        setSnackbar({
          open: true,
          message: 'All session history cleared',
          severity: 'success'
        });
      });
    }
  };

  const toggleSessionExpand = (sessionId) => {
    setExpandedSessions(prev => ({
      ...prev,
      [sessionId]: !prev[sessionId]
    }));
  };

  const filteredSessions = notesOnlyFilter
    ? sessions.filter(s => s.notes && s.notes.length > 0)
    : sessions;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          backgroundImage: `url(${chrome.runtime.getURL('images/flow-bg-history.png')})`,
          backgroundSize: 'cover',
          backgroundPosition: 'top center',
          backgroundAttachment: 'fixed',
          py: 4,
          position: 'relative'
        }}
      >
        {/* Font Injection */}
        <style>
          {`
            @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@200;300;400;600&display=swap');
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@200;300;400;500;600&display=swap');
          `}
        </style>

        {/* Base Overlay for readability */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0, 0, 0, 0.2)',
            zIndex: 0,
            pointerEvents: 'none'
          }}
        />

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Box
            sx={{
              bgcolor: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(12px)',
              borderRadius: '24px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              p: 4,
              mb: 3,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 200,
                  background: 'linear-gradient(to bottom, #fbcfe8, #bfdbfe)',
                  backgroundClip: 'text',
                  textFillColor: 'transparent',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 0 10px rgba(191, 219, 254, 0.3))',
                  fontFamily: '"Nunito", sans-serif',
                  letterSpacing: '-1px',
                }}
              >
                Flow History
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={notesOnlyFilter}
                      onChange={(e) => setNotesOnlyFilter(e.target.checked)}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#fff',
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: 'rgba(255,255,255,0.5)',
                        },
                      }}
                    />
                  }
                  label={<Typography sx={{ fontFamily: '"Nunito", sans-serif', fontWeight: 300 }}>Sessions with notes only</Typography>}
                />
                <Button
                  variant="outlined"
                  startIcon={<DeleteIcon />}
                  onClick={handleClearHistory}
                  sx={{
                    borderColor: 'rgba(255,255,255,0.3)',
                    color: '#fff',
                    '&:hover': {
                      borderColor: '#fff',
                      bgcolor: 'rgba(255,255,255,0.1)'
                    }
                  }}
                >
                  Clear All
                </Button>
              </Box>
            </Box>

            <Grid container spacing={3} sx={{ mb: 4 }}>
              {[
                { icon: <TimeIcon />, value: formatDuration(stats.totalTime), label: 'Total Flow Time' },
                { icon: <CalendarIcon />, value: stats.totalSessions, label: 'Total Sessions' },
                { icon: <BlockIcon />, value: stats.totalAttempts, label: 'Escape Attempts' }
              ].map((stat, index) => (
                <Grid item xs={12} sm={6} md={3} key={index}>
                  <Box
                    sx={{
                      bgcolor: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '16px',
                      p: 2,
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      transition: 'transform 0.2s',
                      '&:hover': { transform: 'translateY(-2px)' }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, color: 'rgba(255,255,255,0.9)' }}>
                      {React.cloneElement(stat.icon, { sx: { mr: 1, color: 'rgba(255,255,255,0.7)' } })}
                      <Typography variant="h5" fontWeight="bold" sx={{ fontFamily: '"Outfit", sans-serif' }}>
                        {stat.value}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', fontFamily: '"Nunito", sans-serif' }}>
                      {stat.label}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>

            <Typography variant="h5" sx={{ mb: 3, fontFamily: '"Nunito", sans-serif', fontWeight: 300 }}>
              Recent Sessions
            </Typography>

            {filteredSessions.length === 0 ? (
              <Alert
                severity="info"
                sx={{
                  bgcolor: 'rgba(255,255,255,0.05)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.1)',
                  '& .MuiAlert-icon': { color: '#fff' }
                }}
              >
                {notesOnlyFilter
                  ? "No sessions with notes found. Try adding notes during your flow sessions!"
                  : "No flow sessions yet. Lock a tab to start your first session!"}
              </Alert>
            ) : (
              <List>
                {filteredSessions.map((session) => (
                  <Paper
                    key={session.id}
                    elevation={0}
                    sx={{
                      mb: 2,
                      bgcolor: 'rgba(0, 0, 0, 0.25)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '16px',
                      color: '#fff',
                      overflow: 'hidden'
                    }}
                  >
                    <ListItem
                      alignItems="flex-start"
                      secondaryAction={
                        <IconButton
                          onClick={() => toggleSessionExpand(session.id)}
                          edge="end"
                          sx={{ color: 'rgba(255,255,255,0.7)' }}
                        >
                          {expandedSessions[session.id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                      }
                    >
                      <ListItemAvatar>
                        <Avatar
                          src={session.favicon}
                          alt={session.title}
                          sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' }}
                        >
                          {session.title?.charAt(0)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle1" fontWeight="medium" sx={{ fontFamily: '"Outfit", sans-serif' }}>
                              {session.title || 'Untitled'}
                            </Typography>
                            {session.notes && session.notes.length > 0 && (
                              <Chip
                                icon={<NoteIcon sx={{ color: '#fff !important' }} />}
                                label={`${session.notes.length} notes`}
                                size="small"
                                sx={{
                                  bgcolor: 'rgba(255,255,255,0.2)',
                                  color: '#fff',
                                  border: '1px solid rgba(255,255,255,0.1)'
                                }}
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', fontFamily: '"Nunito", sans-serif' }}>
                              {formatDate(session.startTime)}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                              <Chip
                                icon={<TimeIcon sx={{ color: 'rgba(255,255,255,0.7) !important' }} />}
                                label={formatDuration(session.endTime - session.startTime)}
                                size="small"
                                variant="outlined"
                                sx={{ color: 'rgba(255,255,255,0.8)', borderColor: 'rgba(255,255,255,0.2)' }}
                              />
                              {session.attemptedSwitches > 0 && (
                                <Chip
                                  icon={<BlockIcon sx={{ color: '#81c995 !important' }} />}
                                  label={`${session.attemptedSwitches} escape attempts`}
                                  size="small"
                                  variant="outlined"
                                  sx={{ color: '#81c995', borderColor: 'rgba(129, 201, 149, 0.3)' }}
                                />
                              )}
                            </Box>
                          </Box>
                        }
                      />
                    </ListItem>

                    <Collapse in={expandedSessions[session.id]} timeout="auto" unmountOnExit>
                      <Box sx={{ px: 3, pb: 2, borderTop: '1px solid rgba(255,255,255,0.1)', pt: 2 }}>
                        {session.notes && session.notes.length > 0 && (
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1, color: 'rgba(255,255,255,0.9)' }}>
                              Notes:
                            </Typography>
                            <List dense>
                              {session.notes.map((note, index) => (
                                <ListItem key={index} sx={{ px: 0 }}>
                                  <ListItemIcon sx={{ minWidth: 32 }}>
                                    <NoteIcon fontSize="small" sx={{ color: 'rgba(255,255,255,0.5)' }} />
                                  </ListItemIcon>
                                  <ListItemText
                                    primary={<Typography sx={{ color: 'rgba(255,255,255,0.9)' }}>{note.text}</Typography>}
                                    secondary={<Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>{formatDate(note.timestamp)}</Typography>}
                                  />
                                </ListItem>
                              ))}
                            </List>
                          </Box>
                        )}
                        <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'rgba(255,255,255,0.4)' }}>
                          URL: {session.url}
                        </Typography>
                      </Box>
                    </Collapse>
                  </Paper>
                ))}
              </List>
            )}
          </Box>
        </Container>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
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

// Initialize React app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<HistoryApp />);