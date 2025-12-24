import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { BROADCAST_STYLE_CONFIG } from "../shared.js";

const EmergencyBar = ({ isOpen, content, onClose, onHeightChange, style = "ALERT" }) => {
    const barRef = useRef(null);
    const normalizedStyle = (style || "ALERT").toUpperCase();
    const styleConfig = BROADCAST_STYLE_CONFIG[normalizedStyle] || BROADCAST_STYLE_CONFIG.ALERT;
    const StyleIcon = styleConfig.icon;
    const isCelebration = normalizedStyle === "ANNOUNCE";

    useEffect(() => {
        if (typeof onHeightChange !== 'function') return;
        if (!isOpen) {
            onHeightChange(0);
            return;
        }
        const node = barRef.current;
        if (!node) return;
        const updateHeight = () => onHeightChange(node.offsetHeight || 0);
        updateHeight();
        if (typeof ResizeObserver !== 'undefined') {
            const observer = new ResizeObserver(() => updateHeight());
            observer.observe(node);
            return () => observer.disconnect();
        }
        return undefined;
    }, [isOpen, content, onHeightChange]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    ref={barRef}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className={`border-b-4 border-black overflow-hidden relative z-[60] w-full ${styleConfig.containerClass}`}
                >
                    <div className="max-w-7xl mx-auto px-4 py-3 font-bold">
                        {isCelebration ? (
                            <div className="relative flex items-center gap-3">
                                <div className="pointer-events-none absolute inset-0">
                                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#FF7A59] via-[#FDE68A] to-[#F97316] opacity-80"></div>
                                    <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-[#F59E0B] via-[#FBBF24] to-[#FB7185] opacity-70"></div>
                                    <div className="absolute left-1/4 top-1/2 w-24 h-24 -translate-y-1/2 rounded-full bg-white/40 blur-2xl"></div>
                                    <div className="absolute right-1/3 top-1/3 w-20 h-20 rounded-full bg-[#FFD89B]/60 blur-2xl"></div>
                                </div>
                                <div className="pointer-events-none absolute inset-y-0 left-2 right-12 hidden md:flex items-center justify-between">
                                    <div className="relative w-12 h-12">
                                        <span className="absolute inset-0 rounded-full border-2 border-[#C2410C]/30"></span>
                                        <span className="absolute left-1/2 top-1/2 w-11 h-0.5 bg-[#C2410C]/55 -translate-x-1/2 -translate-y-1/2 rotate-45"></span>
                                        <span className="absolute left-1/2 top-1/2 w-11 h-0.5 bg-[#C2410C]/55 -translate-x-1/2 -translate-y-1/2 -rotate-45"></span>
                                        <span className="absolute left-1/2 top-1/2 w-2.5 h-2.5 rounded-full bg-[#FF7A59] shadow-[0_0_12px_rgba(255,122,89,0.75)] -translate-x-1/2 -translate-y-1/2 animate-pulse"></span>
                                        <span className="absolute left-[18%] top-[22%] w-1.5 h-1.5 rounded-full bg-[#FDBA74]"></span>
                                        <span className="absolute left-[70%] top-[68%] w-1.5 h-1.5 rounded-full bg-[#FDE047]"></span>
                                    </div>
                                    <div className="relative w-12 h-12">
                                        <span className="absolute inset-0 rounded-full border-2 border-[#B45309]/30"></span>
                                        <span className="absolute left-1/2 top-1/2 w-11 h-0.5 bg-[#B45309]/55 -translate-x-1/2 -translate-y-1/2 rotate-90"></span>
                                        <span className="absolute left-1/2 top-1/2 w-11 h-0.5 bg-[#B45309]/55 -translate-x-1/2 -translate-y-1/2 rotate-0"></span>
                                        <span className="absolute left-1/2 top-1/2 w-3 h-3 rounded-full bg-[#FBBF24] shadow-[0_0_12px_rgba(251,191,36,0.75)] -translate-x-1/2 -translate-y-1/2 animate-pulse"></span>
                                        <span className="absolute left-[20%] top-[70%] w-1.5 h-1.5 rounded-full bg-[#FB7185]"></span>
                                        <span className="absolute left-[68%] top-[20%] w-1.5 h-1.5 rounded-full bg-[#FDBA74]"></span>
                                    </div>
                                </div>
                                <div className="pointer-events-none absolute inset-0 hidden sm:block">
                                    <span className="absolute left-[12%] top-2 w-2 h-2 rotate-45 bg-[#F97316]"></span>
                                    <span className="absolute left-[28%] bottom-2 w-1.5 h-1.5 rounded-full bg-[#FACC15] animate-pulse"></span>
                                    <span className="absolute right-[30%] top-2 w-1.5 h-1.5 rounded-full bg-[#FB7185]"></span>
                                    <span className="absolute right-[18%] bottom-2 w-2 h-2 rotate-45 bg-[#F59E0B]"></span>
                                </div>
                                <span className={`relative z-10 flex-1 flex items-center justify-center gap-2 text-center text-sm md:text-base font-black tracking-wide px-10 ${styleConfig.textClass}`}>
                                    <StyleIcon size={18} className={styleConfig.iconClass} />
                                    {content}
                                </span>
                                <button
                                    onClick={onClose}
                                    className="relative z-10 bg-black text-white p-1 hover:rotate-90 transition-transform border border-white shrink-0"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between font-bold">
                                <div className={`flex items-center gap-3 ${styleConfig.pulse ? 'animate-pulse' : ''}`}>
                                    <StyleIcon size={styleConfig.iconSize} strokeWidth={3}
                                        className={styleConfig.iconClass} />
                                    <span className={`uppercase tracking-widest ${styleConfig.textClass}`}>{styleConfig.label}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={`text-sm hidden md:inline ${styleConfig.textClass}`}>{content}</span>
                                    <button
                                        onClick={onClose}
                                        className="bg-black text-white p-1 hover:rotate-90 transition-transform border border-white"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default EmergencyBar;
