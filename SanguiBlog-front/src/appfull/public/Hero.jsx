import React, { useEffect, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useLayoutOffsets } from "../../contexts/LayoutOffsetContext.jsx";
import './homeRedesign.css';

const HOME_BG_PATH = '/static/home/bg.jpg';

export default function Hero({ onStartReading, isDarkMode }) {
    const heroParallaxRef = useRef(null);
    const bgRef = useRef(null);
    const { headerHeight } = useLayoutOffsets();
    const { scrollY } = useScroll();
    const contentOpacity = useTransform(scrollY, [0, 90, 220], [1, 0.78, 0]);
    const contentY = useTransform(scrollY, [0, 220], [0, 96]);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;

        let frameId = 0;
        const handleMouseMove = (event) => {
            const x = (window.innerWidth / 2 - event.clientX) / 100;
            const y = (window.innerHeight / 2 - event.clientY) / 100;

            if (frameId) {
                window.cancelAnimationFrame(frameId);
            }

            frameId = window.requestAnimationFrame(() => {
                if (bgRef.current) {
                    bgRef.current.style.transform = `scale(1.05) translate(${x}px, ${y}px)`;
                }
                if (heroParallaxRef.current) {
                    heroParallaxRef.current.style.transform = `translate(${-x}px, ${-y}px)`;
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
    }, []);

    const handleStartReading = () => {
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
            className={`home-redesign-surface home-hero ${isDarkMode ? 'is-dark' : ''}`}
            style={{ '--home-header-offset': `${headerHeight || 80}px` }}
        >
            <div
                ref={bgRef}
                aria-hidden="true"
                className="home-hero__bg"
                style={{ backgroundImage: `url('${HOME_BG_PATH}')` }}
            />
            <div aria-hidden="true" className="home-hero__shade" />
            <div aria-hidden="true" className="home-hero__grid" />
            <motion.div
                aria-hidden="true"
                className="home-hero__orb home-hero__orb--primary"
                animate={{ x: [0, 18, -8, 0], y: [0, -12, 8, 0] }}
                transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
                aria-hidden="true"
                className="home-hero__orb home-hero__orb--secondary"
                animate={{ x: [0, -18, 8, 0], y: [0, 12, -10, 0] }}
                transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
            />

            <motion.div
                className="home-hero__content"
                style={{ opacity: contentOpacity, y: contentY }}
            >
                <div ref={heroParallaxRef} className="home-hero__parallax">
                    <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1.2, ease: 'easeOut' }}
                        className="home-hero__eyebrow"
                    >
                        Hello, I am Sangui
                    </motion.span>

                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1.1, ease: [0.2, 0.8, 0.2, 1], delay: 0.3 }}
                        className="home-hero__headline"
                    >
                        <span>在这里把问题想清楚，</span>
                        <span>把代码写简单。</span>
                    </motion.h1>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1.3, ease: 'easeOut', delay: 0.9 }}
                        className="home-hero__actions"
                    >
                        <button
                            type="button"
                            onClick={handleStartReading}
                            className="home-hero__cta"
                        >
                            <span>向下探索内容</span>
                            <span className="home-hero__arrow">↓</span>
                        </button>
                    </motion.div>
                </div>
            </motion.div>
        </section>
    );
}
