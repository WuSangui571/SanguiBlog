import React from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';

const TiltCard = ({ children, className = "", onClick, isNew = false, accentColor = '#22D3EE' }) => {
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotateX = useTransform(y, [0, 1], [5, -5]);
    const rotateY = useTransform(x, [0, 1], [-5, 5]);

    function handleMouse(event) {
        const rect = event.currentTarget.getBoundingClientRect();
        x.set((event.clientX - rect.left) / rect.width);
        y.set((event.clientY - rect.top) / rect.height);
    }

    return (
        <motion.div
            onMouseMove={handleMouse}
            onMouseLeave={() => {
                x.set(0.5);
                y.set(0.5);
            }}
            style={{ rotateX, rotateY }}
            whileHover={{ y: -6, rotate: -1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            onClick={onClick}
            className={`
        relative bg-white border-2 border-black p-0 
        shadow-[8px_8px_0px_0px_#000] hover:shadow-[12px_12px_0px_0px_#000] 
        transition-shadow duration-300 cursor-pointer perspective-1000
        ${className}
      `}
        >
            {isNew && (
                <>
                    <motion.div
                        className="pointer-events-none absolute -inset-3 rounded-[22px] opacity-75"
                        style={{
                            background: `linear-gradient(135deg, ${accentColor} 0%, #FF55AE 35%, #22D3EE 70%, ${accentColor} 100%)`,
                            filter: 'blur(18px)'
                        }}
                        animate={{ opacity: [0.55, 0.85, 0.6] }}
                        transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <motion.div
                        className="pointer-events-none absolute -inset-[10px] rounded-[26px] border border-white/10"
                        style={{
                            boxShadow: `0 0 0 1px rgba(255,255,255,0.08), 0 0 38px 10px ${accentColor}33, 0 0 72px 18px #FF008022`
                        }}
                        animate={{ scale: [1, 1.015, 1], opacity: [0.65, 0.9, 0.7] }}
                        transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <motion.div
                        className="pointer-events-none absolute -inset-[8px] rounded-[24px] overflow-hidden"
                        initial={{ backgroundPosition: '0% 50%' }}
                        animate={{ backgroundPosition: ['-120% 50%', '120% 50%', '120% 50%'] }}
                        transition={{ duration: 6, repeat: Infinity, repeatDelay: 2.2, ease: 'easeInOut' }}
                        style={{
                            backgroundImage: 'linear-gradient(120deg, transparent 32%, rgba(255,255,255,0.35) 50%, transparent 68%)',
                            backgroundSize: '200% 200%'
                        }}
                    />
                    <motion.div
                        className="pointer-events-none absolute -inset-1 rounded-[20px] opacity-65 mix-blend-screen"
                        style={{
                            backgroundImage: `radial-gradient(circle at 18% 24%, ${accentColor}22 0, transparent 45%), radial-gradient(circle at 82% 28%, #FF008022 0, transparent 40%), radial-gradient(circle at 50% 82%, #22D3EE22 0, transparent 40%)`
                        }}
                        animate={{ opacity: [0.35, 0.6, 0.4] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
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
