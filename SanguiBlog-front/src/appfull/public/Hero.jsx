import React, { useEffect, useMemo, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useLayoutOffsets } from "../../contexts/LayoutOffsetContext.jsx";
import { buildAssetUrl } from "../../utils/asset.js";
import './homeRedesign.css';

const HOME_BG_PATH = '/static/home/bg.jpg';

export default function Hero({ onStartReading, isDarkMode, backgroundResolved = false, backgroundUrl }) {
    const heroParallaxRef = useRef(null);
    const bgRef = useRef(null);
    const { headerHeight } = useLayoutOffsets();
    const { scrollY } = useScroll();
    const contentOpacity = useTransform(scrollY, [0, 180, 520], [1, 0.9, 0]);
    const resolvedBackgroundUrl = backgroundUrl
        ? (backgroundUrl.startsWith('/uploads/') ? buildAssetUrl(backgroundUrl, HOME_BG_PATH) : backgroundUrl)
        : (backgroundResolved ? HOME_BG_PATH : null);
    const motionCapability = useMemo(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
            return { prefersReducedMotion: false, coarsePointer: false, narrowViewport: false };
        }
        return {
            prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
            coarsePointer: window.matchMedia('(pointer: coarse)').matches,
            narrowViewport: window.matchMedia('(max-width: 768px)').matches
        };
    }, []);
    const shouldUseMotionParallax = !motionCapability.prefersReducedMotion && !motionCapability.coarsePointer && !motionCapability.narrowViewport;
    const orbMotionPrimary = shouldUseMotionParallax ? { x: [0, 10, -4, 0], y: [0, -7, 4, 0] } : undefined;
    const orbMotionSecondary = shouldUseMotionParallax ? { x: [0, -10, 4, 0], y: [0, 7, -5, 0] } : undefined;

    useEffect(() => {
        if (typeof window === 'undefined' || !shouldUseMotionParallax) return undefined;

        let frameId = 0;
        const handleMouseMove = (event) => {
            const x = (window.innerWidth / 2 - event.clientX) / 180;
            const y = (window.innerHeight / 2 - event.clientY) / 180;

            if (frameId) {
                window.cancelAnimationFrame(frameId);
            }

            frameId = window.requestAnimationFrame(() => {
                if (bgRef.current) {
                    bgRef.current.style.transform = `scale(1.02) translate(${x}px, ${y}px)`;
                }
                if (heroParallaxRef.current) {
                    heroParallaxRef.current.style.transform = `translate(${-x * 0.45}px, ${-y * 0.45}px)`;
                }
            });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            if (frameId) {
                window.cancelAnimationFrame(frameId);
            }
        };
    }, [shouldUseMotionParallax]);

    const handleStartReading = () => {
        const isMobileViewport = typeof window !== 'undefined'
            && typeof window.matchMedia === 'function'
            && window.matchMedia('(max-width: 768px)').matches;

        if (isMobileViewport && typeof document !== 'undefined') {
            const firstPostElement = document.getElementById('home-first-post');
            if (firstPostElement) {
                firstPostElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                return;
            }
        }

        if (typeof onStartReading === 'function') {
            onStartReading();
            return;
        }
        if (typeof document !== 'undefined') {
            document.getElementById('posts')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <section
            data-home-hero="true"
            className={`home-redesign-surface home-hero ${isDarkMode ? 'is-dark' : ''}`}
            style={{ '--home-header-offset': `${headerHeight || 80}px` }}
        >
            <div
                ref={bgRef}
                aria-hidden="true"
                className="home-hero__bg"
                style={{ backgroundImage: resolvedBackgroundUrl ? `url('${resolvedBackgroundUrl}')` : 'none' }}
            />
            <div aria-hidden="true" className="home-hero__shade" />
            <div aria-hidden="true" className="home-hero__grid" />
            <motion.div
                aria-hidden="true"
                className="home-hero__orb home-hero__orb--primary"
                animate={orbMotionPrimary}
                transition={shouldUseMotionParallax ? { duration: 22, repeat: Infinity, ease: 'easeInOut' } : undefined}
            />
            <motion.div
                aria-hidden="true"
                className="home-hero__orb home-hero__orb--secondary"
                animate={orbMotionSecondary}
                transition={shouldUseMotionParallax ? { duration: 26, repeat: Infinity, ease: 'easeInOut' } : undefined}
            />

            <motion.div
                className="home-hero__content"
                style={{ opacity: contentOpacity }}
            >
                <div ref={heroParallaxRef} className="home-hero__parallax">
                    <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.75, ease: 'easeOut' }}
                        className="home-hero__eyebrow"
                    >
                        Hello, I am Sangui
                    </motion.span>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.85, ease: [0.2, 0.8, 0.2, 1], delay: 0.18 }}
                        className="home-hero__headline"
                    >
                        <span>在这里把问题<br className="home-hero__mobile-break" />想清楚，</span>
                        <span>把代码写简单。</span>
                    </motion.h1>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.9, ease: 'easeOut', delay: 0.62 }}
                        className="home-hero__actions"
                    >
                        <button
                            type="button"
                            onClick={handleStartReading}
                            className="home-hero__cta"
                        >
                            <span>向下探索内容</span>
                            <span className="home-hero__arrow" aria-hidden="true">
                                <ChevronDown size={17} strokeWidth={2.4} />
                            </span>
                        </button>
                    </motion.div>
                </div>
            </motion.div>
        </section>
    );
}
