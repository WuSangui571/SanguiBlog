import React from 'react';
import {motion} from 'framer-motion';

const variants = {
    primary: "bg-[#1A1A1A] text-white hover:bg-[#6366F1]",
    secondary: "bg-white text-black hover:bg-[#FFD700]",
    accent: "bg-[#FF0080] text-white hover:bg-[#D10069]",
    ghost: "bg-transparent text-black border-transparent shadow-none hover:bg-black/5"
};

export const PopButton = ({children, onClick, variant = "primary", className = "", icon: Icon, ...props}) => (
    <motion.button
        whileHover={{scale: 1.05}}
        whileTap={{scale: 0.95}}
        className={`
            relative px-6 py-3 font-black text-sm uppercase tracking-wider
            border-2 border-black transition-colors duration-200 flex items-center gap-2
            ${variants[variant] || variants.primary}
            ${variant !== 'ghost' ? 'shadow-[4px_4px_0px_0px_#000]' : ''}
            ${className}
        `}
        onClick={onClick}
        {...props}
    >
        {Icon && <Icon size={18} strokeWidth={3}/>}
        {children}
    </motion.button>
);

export default PopButton;
