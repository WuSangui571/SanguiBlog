import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

const BackgroundEasterEggs = ({ isDarkMode, fixed = true }) => {
    const stars = useMemo(() => Array.from({ length: 80 }, (_, idx) => ({
        top: Math.random() * 90,
        left: Math.random() * 90,
        size: Math.random() * 2.6 + 1,
        delay: Math.random() * 3,
        id: idx
    })), []);
    const meteors = useMemo(() => Array.from({ length: 10 }, (_, idx) => ({
        top: 5 + Math.random() * 50,
        left: -40 - Math.random() * 30,
        delay: Math.random() * 2.5,
        duration: 2.8 + Math.random() * 1.5,
        id: idx
    })), []);

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
                    <div
                        className="absolute inset-0"
                        style={{
                            background:
                                'radial-gradient(circle at 18% 18%, rgba(255, 222, 124, 0.2), transparent 18%), radial-gradient(circle at 26% 28%, rgba(255, 231, 173, 0.12), transparent 34%)'
                        }}
                    />
                    <motion.div
                        className="absolute inset-x-0 bottom-0 h-64"
                        style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(255, 239, 186, 0.3) 44%, rgba(251, 226, 144, 0.62) 100%)' }}
                        animate={{ opacity: [0.42, 0.62, 0.42] }}
                        transition={{ duration: 12, repeat: Infinity }}
                    />
                    <motion.div
                        className="absolute w-64 h-64 rounded-full bg-gradient-to-br from-[#FFE27A] via-[#FFC43D] to-white border border-white/80 shadow-[0_0_90px_rgba(255,208,107,0.62)]"
                        style={{ left: sideOffset, top: dayCelestialTop }}
                        animate={{ scale: [0.97, 1.04, 0.97], rotate: [0, 10, 0] }}
                        transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <motion.div
                        className="absolute w-[36rem] h-[36rem] rounded-full blur-[120px]"
                        style={{
                            left: `calc(${sideOffset} - 6rem)`,
                            top: 'calc(5.75rem - 7rem)',
                            background: 'radial-gradient(circle, rgba(255, 219, 120, 0.24) 0%, rgba(255, 219, 120, 0.12) 28%, transparent 72%)'
                        }}
                        animate={{ opacity: [0.28, 0.42, 0.28] }}
                        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
                    />
                </div>
            </div>
        );
    }

    if (!fixed) {
        return (
            <div className={shellClass}>
                <div className="sticky top-0 h-screen overflow-hidden">
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,16,31,0.92)_0%,rgba(10,20,38,0.84)_26%,rgba(11,23,42,0.74)_58%,rgba(13,28,49,0.88)_100%)]" />
                    <div
                        className="absolute inset-0"
                        style={{
                            background:
                                'radial-gradient(circle at 18% 16%, rgba(188, 210, 255, 0.16), transparent 20%), radial-gradient(circle at 22% 24%, rgba(120, 152, 214, 0.1), transparent 30%)'
                        }}
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
                                boxShadow: '0 0 18px rgba(220,232,255,0.45)'
                            }}
                            animate={{ opacity: [0.04, star.size > 2 ? 0.78 : 0.46, 0.04] }}
                            transition={{ duration: 2 + Math.random() * 2, repeat: Infinity, ease: 'easeInOut', delay: star.delay }}
                        />
                    ))}
                    <motion.div
                        className="absolute inset-x-0 bottom-0 h-56"
                        style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(10, 21, 39, 0.38) 45%, rgba(12, 27, 48, 0.82) 100%)' }}
                        animate={{ opacity: [0.48, 0.64, 0.48] }}
                        transition={{ duration: 12, repeat: Infinity }}
                    />
                    <motion.div
                        className="absolute w-40 h-40 rounded-full bg-gradient-to-br from-white via-slate-100 to-slate-300 shadow-[0_0_45px_rgba(196,216,255,0.28)]"
                        style={{ left: sideOffset, top: nightCelestialTop }}
                        animate={{ rotate: [-4, 4, -4], opacity: [0.82, 0.96, 0.82] }}
                        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <motion.div
                        className="absolute w-[32rem] h-[32rem] rounded-full blur-[110px]"
                        style={{
                            left: `calc(${sideOffset} - 7rem)`,
                            top: 'calc(6.5rem - 5rem)',
                            background: 'radial-gradient(circle, rgba(154, 186, 255, 0.16) 0%, rgba(154, 186, 255, 0.08) 26%, transparent 68%)'
                        }}
                        animate={{ opacity: [0.32, 0.46, 0.32] }}
                        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
                    />
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
                    animate={{ scale: [0.95, 1.08, 0.95], rotate: [0, 15, 0] }}
                    transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                    className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#FFF5C0]/90 via-transparent to-transparent"
                    animate={{ opacity: [0.45, 0.75, 0.45] }}
                    transition={{ duration: 12, repeat: Infinity }}
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
                animate={{ rotate: [-6, 6, -6], opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
                className="absolute w-[90vw] h-[90vw] rounded-full blur-[110px] mix-blend-screen"
                style={{ left: '-30%', top: '-30%', background: 'radial-gradient(circle, rgba(79,70,229,0.35), transparent 65%)' }}
                animate={{ rotate: [0, 25, 0] }}
                transition={{ duration: 26, repeat: Infinity }}
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
                    animate={{ opacity: [0.05, star.size > 2 ? 1 : 0.6, 0.05] }}
                    transition={{ duration: 2 + Math.random() * 2, repeat: Infinity, ease: 'easeInOut', delay: star.delay }}
                />
            ))}
            {meteors.map((meteor) => (
                <motion.span
                    key={`meteor-${meteor.id}`}
                    className="absolute h-3 w-60 bg-gradient-to-r from-transparent via-white to-transparent blur-[1px]"
                    style={{ top: `${meteor.top}%`, left: `${meteor.left}%`, transform: 'rotate(-20deg)' }}
                    animate={{ x: ['0%', '180%'], y: ['0%', '70%'], opacity: [0, 1, 0] }}
                    transition={{ duration: meteor.duration, repeat: Infinity, delay: meteor.delay, ease: 'linear' }}
                />
            ))}
            <motion.div
                className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#020617] via-transparent to-transparent"
                animate={{ opacity: [0.35, 0.6, 0.35] }}
                transition={{ duration: 12, repeat: Infinity }}
            />
        </div>
    );
};

export default BackgroundEasterEggs;
