import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    ThemeProvider,
    IconButton,
    Checkbox,
    FormControlLabel
} from '@mui/material';
import {
    ArrowForward,
    Check,
    Spa
} from '@mui/icons-material';
import { theme } from '../styles/theme';

const MockToast = ({ title, subtitle, iconUrl, hasLink, linkText }) => (
    <Box
        sx={{
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'white',
            borderRadius: '99px',
            padding: '12px 24px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.4)',
            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            fontFamily: '"Nunito", sans-serif',
            whiteSpace: 'nowrap',
            width: '320px', // Fixed width for consistency
            mx: 'auto'
        }}
    >
        <img src={iconUrl} style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover' }} />

        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', overflow: 'hidden' }}>
            <Typography sx={{ fontWeight: 600, fontSize: '15px', letterSpacing: '0.3px', lineHeight: 1.2 }}>
                {title}
            </Typography>
            {(subtitle || hasLink) && (
                <Typography sx={{ fontSize: '13px', opacity: 0.9, fontWeight: 400 }}>
                    {subtitle}
                    {hasLink && (
                        <>
                            {subtitle && " • "}
                            <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>
                                {linkText || "View notes"}
                            </span>
                        </>
                    )}
                </Typography>
            )}
        </Box>
    </Box>
);

export default function TutorialModal({ onClose }) {
    const [step, setStep] = useState(0);
    const [dontShowAgain, setDontShowAgain] = useState(false);
    const iconUrl = chrome.runtime.getURL('icons/icon-flow-master.png');

    useEffect(() => {
        // Check local storage for existing preference
        chrome.storage.local.get(['tutorialSeen'], (result) => {
            if (result.tutorialSeen) {
                setDontShowAgain(true);
            }
        });
    }, []);

    const steps = [
        {
            // Page 1: Start Flow
            title: "Starting Flow",
            description: "Ready to focus? Start a session to lock yourself in the current tab and block out the noise",
            toast: <MockToast title="Flow session activated" iconUrl={iconUrl} />
        },
        {
            // Page 2: Interruptions
            title: "Handling Distractions",
            description: "Compulsively switched to another tab? Flow will bring you back and provide a scratchpad to write notes for later.",
            toast: <MockToast title="Flow session interrupted" hasLink={true} linkText="Take notes" iconUrl={iconUrl} />
        },
        {
            // Page 3: Exiting
            title: "Exiting Session",
            description: "Finished? Simply close the tab. If you just need a break, hold the unlock button for 10 seconds.",
            toast: <MockToast title="Flow session ended" subtitle="45m" hasLink={true} iconUrl={iconUrl} />
        }
    ];

    const handleNext = () => {
        if (step < steps.length - 1) {
            setStep(step + 1);
        } else {
            onClose(dontShowAgain);
        }
    };

    return (
        <ThemeProvider theme={theme}>
            <Box
                sx={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    bgcolor: 'rgba(0, 0, 0, 0.6)',
                    backdropFilter: 'blur(12px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10000,
                    fontFamily: '"Outfit", sans-serif',
                    animation: 'fadeIn 0.5s ease-out'
                }}
            >
                <style>
                    {`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideUp {
              from { transform: translateY(20px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
          `}
                </style>

                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        width: '90%',
                        maxWidth: '480px',
                        minHeight: '600px', // Fixed height for consistency
                        textAlign: 'center',
                        p: 6,
                        backgroundImage: `url(${chrome.runtime.getURL('images/flow-bg-v2.jpg')})`,
                        backgroundSize: '120%',
                        backgroundPosition: 'top center',
                        borderRadius: '32px',
                        boxShadow: '0 24px 48px rgba(0, 0, 0, 0.5)',
                        position: 'relative',
                        animation: 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                >
                    {/* Font Injection */}
                    <style>
                        {`
                          @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@200;300;400;600&display=swap');
                        `}
                    </style>

                    {/* Progress Dots */}
                    <Box sx={{ display: 'flex', gap: 1, mb: 6 }}>
                        {steps.map((_, index) => (
                            <Box
                                key={index}
                                sx={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    bgcolor: index === step ? '#fff' : 'rgba(255, 255, 255, 0.3)',
                                    transition: 'all 0.3s ease',
                                    boxShadow: index === step ? '0 0 10px rgba(255,255,255,0.5)' : 'none'
                                }}
                            />
                        ))}
                    </Box>

                    {/* Content */}
                    <Box sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        width: '100%',
                        justifyContent: 'flex-start', // Align to top to prevent jumping
                        pt: 2
                    }}>

                        {/* Title */}
                        <Typography
                            variant="h3"
                            sx={{
                                fontSize: '32px',
                                fontWeight: 200,
                                background: 'linear-gradient(to bottom, #fbcfe8, #bfdbfe)',
                                backgroundClip: 'text',
                                textFillColor: 'transparent',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                filter: 'drop-shadow(0 0 10px rgba(191, 219, 254, 0.3))',
                                fontFamily: '"Nunito", sans-serif',
                                mb: 2,
                                letterSpacing: '-0.5px',
                                minHeight: '48px' // Reserve space
                            }}
                        >
                            {steps[step].title}
                        </Typography>

                        <Typography
                            variant="body1"
                            sx={{
                                color: 'rgba(255, 255, 255, 0.8)',
                                lineHeight: 1.6,
                                fontSize: '17px',
                                maxWidth: '80%', // Slightly narrower (was 90%)
                                fontFamily: '"Nunito", sans-serif',
                                fontWeight: 300,
                                minHeight: '77px', // Reserve space for 3 lines
                                mb: 4
                            }}
                        >
                            {steps[step].description}
                        </Typography>

                        {/* Toast Preview */}
                        <Box sx={{
                            height: 80,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mb: 0,
                            width: '100%',
                            transform: `scale(${step === step ? 1 : 0.95})`,
                            transition: 'all 0.4s ease'
                        }}>
                            {steps[step].toast}
                        </Box>
                    </Box>


                    {/* Don't show again checkbox (Only on last step) */}
                    {step === steps.length - 1 && (
                        <Box sx={{ mt: 2, mb: 1 }}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={dontShowAgain}
                                        onChange={(e) => setDontShowAgain(e.target.checked)}
                                        sx={{
                                            color: 'rgba(255, 255, 255, 0.5)',
                                            '&.Mui-checked': {
                                                color: '#fff',
                                            },
                                        }}
                                    />
                                }
                                label={
                                    <Typography sx={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', fontFamily: '"Nunito", sans-serif' }}>
                                        Don't show this again
                                    </Typography>
                                }
                            />
                        </Box>
                    )}

                    {/* Actions */}
                    <Box sx={{ width: '100%', mt: step === steps.length - 1 ? 2 : 4, display: 'flex', justifyContent: 'center' }}>
                        <Button
                            onClick={handleNext}
                            variant="contained"
                            endIcon={step === steps.length - 1 ? <Check /> : <ArrowForward />}
                            sx={{
                                bgcolor: 'rgba(255, 255, 255, 0.2)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                borderRadius: '12px',
                                color: '#fff',
                                py: 1.5,
                                px: 5,
                                fontSize: '16px',
                                fontWeight: 600,
                                textTransform: 'none',
                                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                                '&:hover': {
                                    bgcolor: 'rgba(255, 255, 255, 0.3)',
                                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                                },
                                width: 'auto', // Allow it to shrink
                                minWidth: '160px' // But keep a minimum
                            }}
                        >
                            {step === steps.length - 1 ? "Start Flowing" : "Continue"}
                        </Button>
                    </Box>

                </Box>
            </Box>
        </ThemeProvider>
    );
}
