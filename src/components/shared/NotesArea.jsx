import React, { useState } from 'react';
import {
    Box,
    Button,
    Typography,
    TextField,
    IconButton,
    Collapse
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    Close as CloseIcon
} from '@mui/icons-material';

export default function NotesArea({ notes, onAddNote, onDeleteNote, placeholder = "jot down thoughts..." }) {
    const [newNote, setNewNote] = useState('');
    const [showPreviousNotes, setShowPreviousNotes] = useState(false);

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (newNote.trim()) {
                onAddNote(newNote.trim());
                setNewNote('');
            }
        }
    };

    return (
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
                mb: 0,
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
                placeholder={placeholder}
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyPress={handleKeyPress}
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
                        // Prevent host page styles from bleeding in
                        '& textarea': {
                            outline: 'none !important',
                            border: 'none !important',
                            boxShadow: 'none !important',
                            background: 'transparent !important',
                            appearance: 'none !important',
                        },
                        '&.Mui-focused': {
                            outline: 'none !important',
                            boxShadow: 'none !important',
                        }
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
                                        onClick={() => onDeleteNote(note.id)}
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
    );
}
