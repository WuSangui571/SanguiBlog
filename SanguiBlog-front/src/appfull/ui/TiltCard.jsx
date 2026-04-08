import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';

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
    const [reducedMotionPreferred, setReducedMotionPreferred] = useState(false);
    const [coarsePointer, setCoarsePointer] = useState(false);
    const motionEffectsEnabled = isNew && !disableEffects;
    const tiltEnabled = !disableEffects && !reducedMotionPreferred && !coarsePointer;
    const tiltRange = 3.5;
    const x = useMotionValue(0.5);
    const y = useMotionValue(0.5);
    const rotateX = useTransform(y, [0, 1], [tiltRange, -tiltRange]);
    const rotateY = useTransform(x, [0, 1], [-tiltRange, tiltRange]);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
            return undefined;
        }

        const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        const coarsePointerQuery = window.matchMedia('(pointer: coarse)');
        const syncCapability = () => {
            setReducedMotionPreferred(reducedMotionQuery.matches);
            setCoarsePointer(coarsePointerQuery.matches);
        };

        syncCapability();
        reducedMotionQuery.addEventListener?.('change', syncCapability);
        coarsePointerQuery.addEventListener?.('change', syncCapability);

        return () => {
            reducedMotionQuery.removeEventListener?.('change', syncCapability);
            coarsePointerQuery.removeEventListener?.('change', syncCapability);
        };
    }, []);

    function handleMouse(event) {
        if (!tiltEnabled) return;
        const rect = event.currentTarget.getBoundingClientRect();
        x.set((event.clientX - rect.left) / rect.width);
        y.set((event.clientY - rect.top) / rect.height);
    }

    const containerClass = variant === 'glass'
        ? `home-ios-card home-ios-card--article ${isDarkMode ? 'home-ios-card--dark' : ''}`
        : `
            relative bg-white border-2 border-black p-0
            shadow-[8px_8px_0px_0px_#000] hover:shadow-[12px_12px_0px_0px_#000]
            transition-shadow duration-300 cursor-pointer perspective-1000
          `;

    return (
        <motion.div
            onMouseMove={handleMouse}
            onMouseLeave={() => {
                x.set(0.5);
                y.set(0.5);
            }}
            style={tiltEnabled ? { rotateX, rotateY } : undefined}
            whileHover={{ y: -3, rotate: -0.4 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            onClick={onClick}
            className={`cursor-pointer perspective-1000 ${containerClass} ${className}`}
        >
            {motionEffectsEnabled && tiltEnabled && (
                <>
                    <motion.div
                        className="pointer-events-none absolute -inset-3 rounded-[22px] opacity-75"
                        style={{
                            background: `linear-gradient(135deg, ${accentColor} 0%, #FF55AE 35%, #22D3EE 70%, ${accentColor} 100%)`,
                            filter: 'blur(12px)'
                        }}
                        animate={{ opacity: [0.45, 0.68, 0.5] }}
                        transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <motion.div
                        className="pointer-events-none absolute -inset-[10px] rounded-[26px] border border-white/10"
                        style={{
                            boxShadow: `0 0 0 1px rgba(255,255,255,0.08), 0 0 22px 6px ${accentColor}24, 0 0 40px 10px #FF008014`
                        }}
                        animate={{ scale: [1, 1.008, 1], opacity: [0.52, 0.7, 0.56] }}
                        transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <motion.div
                        className="pointer-events-none absolute -inset-[8px] rounded-[24px] overflow-hidden"
                        initial={{ backgroundPosition: '0% 50%' }}
                        animate={{ backgroundPosition: ['-120% 50%', '120% 50%', '120% 50%'] }}
                        transition={{ duration: 7.5, repeat: Infinity, repeatDelay: 3.6, ease: 'easeInOut' }}
                        style={{
                            backgroundImage: 'linear-gradient(120deg, transparent 34%, rgba(255,255,255,0.24) 50%, transparent 66%)',
                            backgroundSize: '200% 200%'
                        }}
                    />
                    <motion.div
                        className="pointer-events-none absolute -inset-1 rounded-[20px] opacity-65 mix-blend-screen"
                        style={{
                            backgroundImage: `radial-gradient(circle at 18% 24%, ${accentColor}22 0, transparent 45%), radial-gradient(circle at 82% 28%, #FF008022 0, transparent 40%), radial-gradient(circle at 50% 82%, #22D3EE22 0, transparent 40%)`
                        }}
                        animate={{ opacity: [0.22, 0.42, 0.28] }}
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
