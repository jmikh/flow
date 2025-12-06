import React, { useState, useRef, useEffect } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { LockOpen as LockOpenIcon } from '@mui/icons-material';

export default function UnlockButton({ onUnlock, durationSeconds = 10 }) {
    const [progress, setProgress] = useState(0);
    const [isHolding, setIsHolding] = useState(false);
    const intervalRef = useRef(null);

    const startUnlock = () => {
        setIsHolding(true);
        setProgress(0);

        // Calculate interval to reach 100% in durationSeconds
        // We update every 100ms
        const updateInterval = 100;
        const steps = (durationSeconds * 1000) / updateInterval;
        const increment = 100 / steps;

        intervalRef.current = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    handleUnlock();
                    return 100;
                }
                return prev + increment;
            });
        }, updateInterval);
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
        stopUnlock();
        onUnlock();
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    const remainingSeconds = Math.ceil((durationSeconds * (100 - progress)) / 100);

    return (
        <Box sx={{ position: 'relative', mb: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
                        bgcolor: 'rgba(255, 255, 255, 0.4)',
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
    );
}
