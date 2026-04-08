import React from 'react';
import { motion } from 'framer-motion';

const TiltCard = ({
    children,
    className = "",
    onClick,
    isNew = false,
    accentColor = '#22D3EE',
    variant = 'default',
    isDarkMode = false,
    disableEffects = false
}) => {
    const motionEffectsEnabled = isNew && !disableEffects;

    const containerClass = variant === 'glass'
        ? `home-ios-card home-ios-card--article ${isDarkMode ? 'home-ios-card--dark' : ''}`
        : `
            relative bg-white border-2 border-black p-0
            shadow-[8px_8px_0px_0px_#000] hover:shadow-[12px_12px_0px_0px_#000]
            transition-shadow duration-300 cursor-pointer perspective-1000
          `;

    return (
        <motion.div
            whileHover={{ y: -2 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            onClick={onClick}
            className={`cursor-pointer perspective-1000 ${containerClass} ${className}`}
        >
            {motionEffectsEnabled && (
                <>
                    <motion.div
                        className="pointer-events-none absolute -inset-3 rounded-[22px] opacity-70"
                        style={{
                            background: `linear-gradient(135deg, ${accentColor} 0%, #FF55AE 35%, #22D3EE 70%, ${accentColor} 100%)`,
                            filter: 'blur(12px)'
                        }}
                        animate={{ opacity: [0.42, 0.62, 0.46] }}
                        transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <motion.div
                        className="pointer-events-none absolute -inset-[10px] rounded-[26px] border border-white/10"
                        style={{
                            boxShadow: `0 0 0 1px rgba(255,255,255,0.08), 0 0 22px 6px ${accentColor}24, 0 0 40px 10px #FF008014`
                        }}
                        animate={{ scale: [1, 1.006, 1], opacity: [0.48, 0.64, 0.52] }}
                        transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <motion.div
                        className="pointer-events-none absolute -inset-1 rounded-[20px] opacity-60 mix-blend-screen"
                        style={{
                            backgroundImage: `radial-gradient(circle at 18% 24%, ${accentColor}22 0, transparent 45%), radial-gradient(circle at 82% 28%, #FF008022 0, transparent 40%), radial-gradient(circle at 50% 82%, #22D3EE22 0, transparent 40%)`
                        }}
                        animate={{ opacity: [0.18, 0.34, 0.22] }}
                        transition={{ duration: 4.6, repeat: Infinity, ease: 'easeInOut' }}
                    />
                </>
            )}
            <div className="relative z-10">
                {children}
            </div>
        </motion.div>
    );
};

export default TiltCard;
