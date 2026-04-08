import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';

const BackgroundEasterEggs = ({ isDarkMode, fixed = true }) => {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
    const starCount = fixed ? 40 : 24;
    const stars = useMemo(() => Array.from({ length: starCount }, (_, idx) => ({
        top: Math.random() * 90,
        left: Math.random() * 90,
        size: Math.random() * 2.6 + 1,
        delay: Math.random() * 3,
        id: idx
    })), [starCount]);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
            return undefined;
        }

        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        const syncPreference = () => setPrefersReducedMotion(mediaQuery.matches);
        syncPreference();
        mediaQuery.addEventListener?.('change', syncPreference);

        return () => {
            mediaQuery.removeEventListener?.('change', syncPreference);
        };
    }, []);

    const shellClass = fixed
        ? 'pointer-events-none fixed inset-0 overflow-hidden z-0'
        : 'pointer-events-none absolute inset-0 z-0';
    const dayCelestialTop = fixed ? '24%' : '5.75rem';
    const nightCelestialTop = fixed ? '31%' : '6.5rem';
    const sideOffset = fixed ? 'calc(50% - 62rem)' : 'calc(50% - 56rem)';

    if (!fixed && !isDarkMode) {
        return (
            <div className={shellClass}>
                <div className="sticky top-0 h-screen overflow-hidden">
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(231,242,255,0.96)_0%,rgba(241,247,255,0.9)_25%,rgba(246,249,255,0.82)_58%,rgba(235,243,255,0.96)_100%)]" />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0.04)_32%,transparent_68%)]" />
                    <motion.div
                        className="absolute inset-x-0 bottom-0 h-64"
                        style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(255, 239, 186, 0.3) 44%, rgba(251, 226, 144, 0.62) 100%)' }}
                        animate={prefersReducedMotion ? undefined : { opacity: [0.42, 0.62, 0.42] }}
                        transition={prefersReducedMotion ? undefined : { duration: 12, repeat: Infinity }}
                    />
                    <motion.div
                        className="absolute w-64 h-64"
                        style={{ left: sideOffset, top: dayCelestialTop }}
                        animate={prefersReducedMotion ? undefined : { scale: [0.985, 1.02, 0.985], rotate: [0, 6, 0] }}
                        transition={prefersReducedMotion ? undefined : { duration: 16, repeat: Infinity, ease: 'easeInOut' }}
                    >
                        <div
                            className="absolute left-1/2 top-1/2 w-[36rem] h-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px]"
                            style={{
                                background: 'radial-gradient(circle, rgba(255, 219, 120, 0.24) 0%, rgba(255, 219, 120, 0.12) 28%, transparent 72%)'
                            }}
                        />
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#FFE27A] via-[#FFC43D] to-white border border-white/80 shadow-[0_0_90px_rgba(255,208,107,0.62)]" />
                    </motion.div>
                </div>
            </div>
        );
    }

    if (!fixed) {
        return (
            <div className={shellClass}>
                <div className="sticky top-0 h-screen overflow-hidden">
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,16,31,0.92)_0%,rgba(10,20,38,0.84)_26%,rgba(11,23,42,0.74)_58%,rgba(13,28,49,0.88)_100%)]" />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(163,191,240,0.08)_0%,rgba(163,191,240,0.03)_28%,transparent_70%)]" />
                    {stars.map((star) => (
                        <motion.span
                            key={star.id}
                            className="absolute rounded-full bg-white"
                            style={{
                                width: star.size,
                                height: star.size,
                                top: `${star.top}%`,
                                left: `${star.left}%`,
                                boxShadow: '0 0 18px rgba(220,232,255,0.45)'
                            }}
                            animate={prefersReducedMotion ? undefined : { opacity: [0.08, star.size > 2 ? 0.56 : 0.34, 0.08] }}
                            transition={prefersReducedMotion ? undefined : { duration: 3.2 + Math.random() * 2.2, repeat: Infinity, ease: 'easeInOut', delay: star.delay }}
                        />
                    ))}
                    <motion.div
                        className="absolute inset-x-0 bottom-0 h-56"
                        style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(10, 21, 39, 0.38) 45%, rgba(12, 27, 48, 0.82) 100%)' }}
                        animate={prefersReducedMotion ? undefined : { opacity: [0.5, 0.6, 0.5] }}
                        transition={prefersReducedMotion ? undefined : { duration: 13.5, repeat: Infinity }}
                    />
                    <motion.div
                        className="absolute w-40 h-40"
                        style={{ left: sideOffset, top: nightCelestialTop }}
                        animate={prefersReducedMotion ? undefined : { rotate: [-2, 2, -2], opacity: [0.84, 0.92, 0.84] }}
                        transition={prefersReducedMotion ? undefined : { duration: 20, repeat: Infinity, ease: 'easeInOut' }}
                    >
                        <div
                            className="absolute left-1/2 top-1/2 w-[32rem] h-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[110px]"
                            style={{
                                background: 'radial-gradient(circle, rgba(154, 186, 255, 0.16) 0%, rgba(154, 186, 255, 0.08) 26%, transparent 68%)'
                            }}
                        />
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white via-slate-100 to-slate-300 shadow-[0_0_45px_rgba(196,216,255,0.28)]" />
                    </motion.div>
                </div>
            </div>
        );
    }

    if (!isDarkMode) {
        return (
            <div className={shellClass}>
                <div className="absolute inset-0 bg-gradient-to-b from-[#E6F4FF] via-white/85 to-transparent" />
                <motion.div
                    className="absolute w-72 h-72 rounded-full bg-gradient-to-br from-[#FFD54F] via-[#FFB703] to-white border border-white/70 shadow-[0_0_80px_rgba(255,213,79,0.9)]"
                    style={{ left: sideOffset, top: dayCelestialTop }}
                    animate={prefersReducedMotion ? undefined : { scale: [0.98, 1.04, 0.98], rotate: [0, 8, 0] }}
                    transition={prefersReducedMotion ? undefined : { duration: 15, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                    className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#FFF5C0]/90 via-transparent to-transparent"
                    animate={prefersReducedMotion ? undefined : { opacity: [0.48, 0.64, 0.48] }}
                    transition={prefersReducedMotion ? undefined : { duration: 14, repeat: Infinity }}
                />
            </div>
        );
    }

    return (
        <div className={shellClass}>
            <div className="absolute inset-0 bg-gradient-to-b from-[#010512]/95 via-transparent to-transparent" />
            <motion.div
                className="absolute w-44 h-44 rounded-full bg-gradient-to-br from-white via-slate-200 to-slate-500 shadow-[0_0_90px_rgba(191,219,254,0.7)]"
                style={{ left: sideOffset, top: nightCelestialTop }}
                animate={prefersReducedMotion ? undefined : { rotate: [-3, 3, -3], opacity: [0.84, 0.96, 0.84] }}
                transition={prefersReducedMotion ? undefined : { duration: 20, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
                className="absolute w-[90vw] h-[90vw] rounded-full blur-[110px] mix-blend-screen"
                style={{ left: '-30%', top: '-30%', background: 'radial-gradient(circle, rgba(79,70,229,0.35), transparent 65%)' }}
                animate={prefersReducedMotion ? undefined : { rotate: [0, 14, 0] }}
                transition={prefersReducedMotion ? undefined : { duration: 30, repeat: Infinity }}
            />
            {stars.map((star) => (
                <motion.span
                    key={star.id}
                    className="absolute rounded-full bg-white"
                    style={{
                        width: star.size,
                        height: star.size,
                        top: `${star.top}%`,
                        left: `${star.left}%`,
                        boxShadow: '0 0 22px rgba(255,255,255,0.8)'
                    }}
                    animate={prefersReducedMotion ? undefined : { opacity: [0.08, star.size > 2 ? 0.72 : 0.42, 0.08] }}
                    transition={prefersReducedMotion ? undefined : { duration: 3.5 + Math.random() * 2.2, repeat: Infinity, ease: 'easeInOut', delay: star.delay }}
                />
            ))}
            <motion.div
                className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#020617] via-transparent to-transparent"
                animate={prefersReducedMotion ? undefined : { opacity: [0.38, 0.54, 0.38] }}
                transition={prefersReducedMotion ? undefined : { duration: 14, repeat: Infinity }}
            />
        </div>
    );
};

export default BackgroundEasterEggs;
