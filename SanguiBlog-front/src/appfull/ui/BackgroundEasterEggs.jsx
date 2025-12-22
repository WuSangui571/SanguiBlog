import React, { useMemo } from 'react';
import { motion } from 'framer-motion';const BackgroundEasterEggs = ({ isDarkMode }) => {
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

    if (!isDarkMode) {
        return (
            <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
                <div className="absolute inset-0 bg-gradient-to-b from-[#E6F4FF] via-white to-transparent" />
                <motion.div
                    className="absolute w-72 h-72 rounded-full bg-gradient-to-br from-[#FFD54F] via-[#FFB703] to-white border border-white/70 shadow-[0_0_80px_rgba(255,213,79,0.9)]"
                    style={{ left: 'calc(50% - 55rem)', top: '28%' }}
                    animate={{ scale: [0.95, 1.08, 0.95], rotate: [0, 15, 0] }}
                    transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                    className="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-[#FFF5C0]/90 via-transparent to-transparent"
                    animate={{ opacity: [0.45, 0.75, 0.45] }}
                    transition={{ duration: 12, repeat: Infinity }}
                />
            </div>
        );
    }

    return (
        <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
            <div className="absolute inset-0 bg-gradient-to-b from-[#010512]/95 via-transparent to-transparent" />
            <motion.div
                className="absolute w-44 h-44 rounded-full bg-gradient-to-br from-white via-slate-200 to-slate-500 shadow-[0_0_90px_rgba(191,219,254,0.7)]"
                style={{ left: 'calc(50% - 55rem)', top: '36%' }}
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
