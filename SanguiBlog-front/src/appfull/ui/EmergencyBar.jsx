import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Sparkles, X } from 'lucide-react';

const BROADCAST_STYLE_CONFIG = {
    ALERT: {
        label: "紧急广播 // SYSTEM ALERT",
        containerClass: "bg-[#FF0080] text-white",
        textClass: "text-white",
        icon: AlertTriangle,
        iconClass: "text-[#FFD700]",
        iconSize: 24,
        pulse: true
    },
    ANNOUNCE: {
        label: "庆典公告 // CELEBRATION",
        containerClass: "bg-gradient-to-r from-[#FFF1D0] via-[#FFE1A8] to-[#FFD166] text-[#3A2C0F]",
        textClass: "text-[#3A2C0F]",
        icon: Sparkles,
        iconClass: "text-[#C2410C]",
        iconSize: 24,
        pulse: true
    }
};

const EmergencyBar = ({ isOpen, content, onClose, onHeightChange, style = "ALERT" }) => {
    const barRef = useRef(null);
    const normalizedStyle = (style || "ALERT").toUpperCase();
    const styleConfig = BROADCAST_STYLE_CONFIG[normalizedStyle] || BROADCAST_STYLE_CONFIG.ALERT;
    const StyleIcon = styleConfig.icon;

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
                    <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between font-bold">
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
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default EmergencyBar;
