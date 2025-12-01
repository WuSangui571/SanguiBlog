import React, {useCallback, useRef, useState} from 'react';
import {motion} from 'framer-motion';

const variants = {
    primary: "bg-[#1A1A1A] text-white hover:bg-[#6366F1]",
    secondary: "bg-white text-black hover:bg-[#FFD700]",
    accent: "bg-[#FF0080] text-white hover:bg-[#D10069]",
    ghost: "bg-transparent text-black border-transparent shadow-none hover:bg-black/5"
};

const ripplePalette = {
    primary: 'rgba(255,255,255,0.35)',
    secondary: 'rgba(0,0,0,0.15)',
    accent: 'rgba(255,255,255,0.4)',
    ghost: 'rgba(0,0,0,0.1)'
};

export const PopButton = ({children, onClick, variant = "primary", className = "", icon: Icon, ...props}) => {
    const [ripples, setRipples] = useState([]);
    const rippleId = useRef(0);

    const spawnRipple = useCallback((event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height) * 0.9;
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;
        const id = rippleId.current++;
        const color = ripplePalette[variant] || ripplePalette.primary;
        setRipples((prev) => [...prev, {x, y, size, color, id}]);
        setTimeout(() => {
            setRipples((prev) => prev.filter((r) => r.id !== id));
        }, 450);
    }, [variant]);

    const handleClick = useCallback((event) => {
        spawnRipple(event);
        onClick?.(event);
    }, [onClick, spawnRipple]);

    return (
        <motion.button
            whileHover={{scale: 1.05}}
            whileTap={{scale: 0.93, transition: {type: 'spring', stiffness: 420, damping: 26}}}
            className={`
            relative overflow-hidden px-6 py-3 font-black text-sm uppercase tracking-wider
            border-2 border-black transition-colors duration-200 flex items-center gap-2
            ${variants[variant] || variants.primary}
            ${variant !== 'ghost' ? 'shadow-[4px_4px_0px_0px_#000]' : ''}
            ${className}
        `}
            onClick={handleClick}
            {...props}
        >
            {Icon && <Icon size={18} strokeWidth={3}/>}
            {children}
            <span className="pointer-events-none absolute inset-0">
                {ripples.map((ripple) => (
                    <motion.span
                        key={ripple.id}
                        className="absolute rounded-full mix-blend-overlay"
                        style={{
                            left: ripple.x,
                            top: ripple.y,
                            width: ripple.size,
                            height: ripple.size,
                            backgroundColor: ripple.color
                        }}
                        initial={{opacity: 0.5, scale: 0}}
                        animate={{opacity: 0, scale: 1.4}}
                        transition={{duration: 0.45, ease: 'easeOut'}}
                    />
                ))}
            </span>
        </motion.button>
    );
};

export default PopButton;
