import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useSpring, useTransform } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import logger from "../../utils/logger.js";

const ScrollToTop = ({ isDarkMode }) => {
    const STORAGE_KEY = 'sangui-scroll-button';
    const BUTTON_SIZE = 56;
    const [isVisible, setIsVisible] = useState(false);
    const [scrollPercent, setScrollPercent] = useState(0);
    const scrollProgress = useSpring(0, { stiffness: 160, damping: 28, mass: 0.6 });
    const [sparks, setSparks] = useState([]);
    const sparkTimersRef = useRef([]);
    const [position, setPosition] = useState(() => {
        if (typeof window === 'undefined') return { x: 24, y: 24 };
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                return parsed;
            }
        } catch {
            // ignore invalid stored position
        }
        return {
            x: window.innerWidth - BUTTON_SIZE - 24,
            y: window.innerHeight - BUTTON_SIZE - 120
        };
    });
    const [isDragging, setIsDragging] = useState(false);
    const dragMetaRef = useRef({ active: false, moved: false, ignoreClick: false, offsetX: 0, offsetY: 0 });
    const buttonRef = useRef(null);
    const latestPositionRef = useRef(position);
    const sparklePalette = useMemo(() => ['#FFD700', '#FF0080', '#6366F1', '#4ADE80'], []);

    const clampPosition = useCallback((pos) => {
        if (typeof window === 'undefined') return pos;
        const maxX = window.innerWidth - BUTTON_SIZE - 12;
        const maxY = window.innerHeight - BUTTON_SIZE - 12;
        return {
            x: Math.min(Math.max(12, pos.x), maxX),
            y: Math.min(Math.max(12, pos.y), maxY)
        };
    }, []);

    const persistPosition = useCallback((pos) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
        } catch (e) {
            logger.warn('无法保存滚动按钮位置', e);
        }
    }, []);

    useEffect(() => {
        latestPositionRef.current = position;
    }, [position]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        setPosition(prev => clampPosition(prev));
    }, [clampPosition]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handleResize = () => {
            setPosition(prev => clampPosition(prev));
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [clampPosition]);

    useEffect(() => {
        const timers = sparkTimersRef.current;
        return () => {
            timers.forEach((timer) => clearTimeout(timer));
        };
    }, []);

    useEffect(() => {
        const handlePointerMove = (event) => {
            if (!dragMetaRef.current.active) return;
            const point = event.touches ? event.touches[0] : event;
            if (!point) return;
            if (event.cancelable) event.preventDefault();
            dragMetaRef.current.moved = true;
            const next = clampPosition({
                x: point.clientX - dragMetaRef.current.offsetX,
                y: point.clientY - dragMetaRef.current.offsetY
            });
            setPosition(next);
        };

        const handlePointerUp = () => {
            if (!dragMetaRef.current.active) return;
            const moved = dragMetaRef.current.moved;
            dragMetaRef.current.active = false;
            dragMetaRef.current.moved = false;
            dragMetaRef.current.ignoreClick = moved;
            setIsDragging(false);
            if (moved) {
                persistPosition(latestPositionRef.current);
            }
        };

        window.addEventListener('mousemove', handlePointerMove);
        window.addEventListener('mouseup', handlePointerUp);
        window.addEventListener('touchmove', handlePointerMove, { passive: false });
        window.addEventListener('touchend', handlePointerUp);

        return () => {
            window.removeEventListener('mousemove', handlePointerMove);
            window.removeEventListener('mouseup', handlePointerUp);
            window.removeEventListener('touchmove', handlePointerMove);
            window.removeEventListener('touchend', handlePointerUp);
        };
    }, [clampPosition, persistPosition]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const updateScrollState = () => {
            const doc = document.documentElement;
            const scrollTop = window.pageYOffset || doc.scrollTop || 0;
            const maxScroll = Math.max(doc.scrollHeight - window.innerHeight, 1);
            const ratio = Math.min(Math.max(scrollTop / maxScroll, 0), 1);
            setScrollPercent(ratio);
            setIsVisible(scrollTop > 300);
            scrollProgress.set(ratio);
        };
        updateScrollState();
        window.addEventListener('scroll', updateScrollState);
        window.addEventListener('resize', updateScrollState);
        return () => {
            window.removeEventListener('scroll', updateScrollState);
            window.removeEventListener('resize', updateScrollState);
        };
    }, [scrollProgress]);

    const spawnSparkles = useCallback(() => {
        const baseId = Date.now();
        const burstCount = 14;
        const burst = Array.from({ length: burstCount }).map((_, index) => {
            const angle = (Math.PI * 2 * index) / burstCount + Math.random() * 0.4;
            const distance = 28 + Math.random() * 22;
            return {
                id: `${baseId}-${index}`,
                dx: Math.cos(angle) * distance,
                dy: Math.sin(angle) * distance,
                color: sparklePalette[index % sparklePalette.length]
            };
        });
        const ids = burst.map((spark) => spark.id);
        setSparks((prev) => [...prev, ...burst]);
        const timer = setTimeout(() => {
            setSparks((prev) => prev.filter((spark) => !ids.includes(spark.id)));
        }, 900);
        sparkTimersRef.current.push(timer);
    }, [sparklePalette]);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    };

    const startDrag = useCallback((event) => {
        const point = event.touches ? event.touches[0] : event;
        if (!point) return;
        const isTouch = event.type === 'touchstart';
        if (event.cancelable && !isTouch) event.preventDefault();
        const rect = buttonRef.current?.getBoundingClientRect();
        dragMetaRef.current = {
            active: true,
            moved: false,
            ignoreClick: false,
            offsetX: point.clientX - (rect?.left ?? 0),
            offsetY: point.clientY - (rect?.top ?? 0)
        };
        setIsDragging(true);
    }, []);

    useEffect(() => {
        const btn = buttonRef.current;
        if (!btn) return;
        const handleTouchStart = (event) => startDrag(event);
        btn.addEventListener('touchstart', handleTouchStart, { passive: false });
        return () => {
            btn.removeEventListener('touchstart', handleTouchStart);
        };
    }, [startDrag, isVisible]);

    const handleClick = (event) => {
        if (dragMetaRef.current.ignoreClick || isDragging) {
            if (event.cancelable) event.preventDefault();
            dragMetaRef.current.ignoreClick = false;
            return;
        }
        requestAnimationFrame(() => {
            if (scrollPercent > 0.95) {
                spawnSparkles();
            }
            scrollToTop();
        });
    };

    const indicatorRadius = 28;
    const indicatorStroke = 4;
    const indicatorSize = indicatorRadius * 2 + indicatorStroke * 2;
    const circumference = 2 * Math.PI * indicatorRadius;
    const dashOffset = useTransform(scrollProgress, (value) => (1 - value) * circumference);
    const trackColor = isDarkMode ? 'rgba(255,255,255,0.22)' : 'rgba(15,23,42,0.12)';
    const progressColor = isDarkMode ? '#E2E8F0' : '#1B63D6';
    const percentLabel = Math.round(scrollPercent * 100);
    const buttonToneClass = isDarkMode
        ? 'border border-white/12 bg-[linear-gradient(160deg,rgba(255,255,255,0.1)_0%,rgba(255,255,255,0.05)_100%)] text-slate-100 ring-1 ring-white/10 shadow-[0_18px_48px_rgba(0,0,0,0.34)] hover:bg-[linear-gradient(160deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.08)_100%)]'
        : 'border border-[rgba(215,226,241,0.52)] bg-[linear-gradient(160deg,rgba(255,255,255,0.82)_0%,rgba(255,255,255,0.58)_48%,rgba(244,248,255,0.72)_100%)] text-slate-900 ring-1 ring-black/5 shadow-[0_18px_48px_rgba(15,23,42,0.18)] hover:bg-[linear-gradient(160deg,rgba(255,255,255,0.92)_0%,rgba(255,255,255,0.74)_48%,rgba(244,248,255,0.84)_100%)]';

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.button
                    ref={buttonRef}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onMouseDown={startDrag}
                    onClick={handleClick}
                    style={{ left: `${position.x}px`, top: `${position.y}px`, touchAction: 'none' }}
                    aria-label={`返回顶部（已滚动 ${percentLabel}%）`}
                    className={`fixed z-50 p-3 rounded-full backdrop-blur-[18px] transition-colors ${buttonToneClass} ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                >
                    <span className="relative flex items-center justify-center w-10 h-10">
                        <ArrowUp size={24} className="relative z-10" strokeWidth={2.4} />
                    </span>
                    <motion.svg
                        className="absolute pointer-events-none"
                        width={indicatorSize}
                        height={indicatorSize}
                        viewBox={`0 0 ${indicatorSize} ${indicatorSize}`}
                        style={{ left: `calc(50% - ${indicatorSize / 2}px)`, top: `calc(50% - ${indicatorSize / 2}px)` }}
                        fill="none"
                    >
                        <circle
                            cx={indicatorSize / 2}
                            cy={indicatorSize / 2}
                            r={indicatorRadius}
                            stroke={trackColor}
                            strokeWidth={indicatorStroke}
                        />
                        <motion.circle
                            cx={indicatorSize / 2}
                            cy={indicatorSize / 2}
                            r={indicatorRadius}
                            stroke={progressColor}
                            strokeWidth={indicatorStroke}
                            strokeDasharray={circumference}
                            style={{ strokeDashoffset: dashOffset }}
                            strokeLinecap="round"
                        />
                    </motion.svg>
                    <span className="pointer-events-none absolute inset-0 overflow-visible">
                        {sparks.map((spark) => (
                            <motion.span
                                key={spark.id}
                                className="absolute w-2.5 h-2.5 rounded-full"
                                style={{ left: '50%', top: '50%', backgroundColor: spark.color }}
                                initial={{ opacity: 0.95, x: 0, y: 0, scale: 0.5, rotate: 0 }}
                                animate={{ opacity: 0, x: spark.dx, y: spark.dy, scale: 1.3, rotate: 180 }}
                                transition={{ duration: 0.85, ease: 'easeOut' }}
                            />
                        ))}
                    </span>
                </motion.button>
            )}
        </AnimatePresence>
    );
};

// --- 5. Main App ---

export default ScrollToTop;
