import React from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';

export function getGlassPopupToastTop(fixedTopOffset) {
    return Math.max(fixedTopOffset + 8, 104);
}

function buildGlassPopupCardStyle(isDarkMode) {
    return {
        background: isDarkMode
            ? 'linear-gradient(160deg, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0.06) 46%, rgba(15, 23, 42, 0.3) 100%), rgba(15, 23, 42, 0.22)'
            : 'linear-gradient(160deg, rgba(255, 255, 255, 0.78) 0%, rgba(255, 255, 255, 0.38) 46%, rgba(244, 248, 255, 0.42) 100%), rgba(255, 255, 255, 0.22)',
        backdropFilter: 'blur(14px) saturate(1.01)',
        WebkitBackdropFilter: 'blur(14px) saturate(1.01)',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden'
    };
}

const GlassPopupToast = ({
    open,
    isDarkMode,
    top,
    icon,
    title,
    description,
    children,
    role = 'status',
    ariaLive = 'polite',
    portalTarget,
}) => {
    const resolvedPortalTarget = portalTarget || (typeof document !== 'undefined' ? document.body : null);

    if (!resolvedPortalTarget) {
        return null;
    }

    const content = children || (
        <span className="min-w-0">
            <span className="block text-sm font-black tracking-[0.08em]">{title}</span>
            {description && (
                <span className={`mt-0.5 block truncate text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {description}
                </span>
            )}
        </span>
    );

    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ y: 12, x: '-50%' }}
                    animate={{ y: 0, x: '-50%' }}
                    exit={{ opacity: 0, y: -10, x: '-50%' }}
                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    role={role}
                    aria-live={ariaLive}
                    className="pointer-events-none fixed left-1/2 z-[140] w-[min(92vw,320px)]"
                    style={{ top, willChange: 'transform' }}
                >
                    <div
                        className={`relative overflow-hidden px-4 py-3 home-ios-card home-ios-card--static ${isDarkMode ? 'home-ios-card--dark text-white border-white/12' : 'text-black border-white/75'} shadow-[0_20px_60px_rgba(15,23,42,0.22)]`}
                        style={buildGlassPopupCardStyle(isDarkMode)}
                    >
                        <div className={`absolute inset-x-8 -top-10 h-20 rounded-full blur-2xl ${isDarkMode ? 'bg-emerald-400/18' : 'bg-[#FFD700]/28'}`} />
                        <div className="relative flex items-center gap-3">
                            {icon && (
                                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${isDarkMode ? 'border-emerald-300/30 bg-emerald-400/18 text-emerald-200' : 'border-emerald-500/20 bg-emerald-100 text-emerald-700'}`}>
                                    {icon}
                                </span>
                            )}
                            {content}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>,
        resolvedPortalTarget
    );
};

export default GlassPopupToast;
