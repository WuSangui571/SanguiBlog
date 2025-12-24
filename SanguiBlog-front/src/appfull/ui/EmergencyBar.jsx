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
                            <div className="flex items-center gap-3">
                                <span className={`flex-1 flex items-center justify-center gap-2 text-center text-sm md:text-base font-black tracking-wide ${styleConfig.textClass}`}>
                                    <StyleIcon size={18} className={styleConfig.iconClass} />
                                    {content}
                                </span>
                                <button
                                    onClick={onClose}
                                    className="bg-black text-white p-1 hover:rotate-90 transition-transform border border-white shrink-0"
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
