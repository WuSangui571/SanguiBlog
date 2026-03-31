import React from 'react';
import { motion } from 'framer-motion';
import { buildAssetUrl } from "../../utils/asset.js";
import './homeRedesign.css';

const HOME_BG_PATH = '/static/home/bg.jpg';

export default function Hero({ onStartReading, isDarkMode }) {
    const bgUrl = buildAssetUrl(HOME_BG_PATH, HOME_BG_PATH);

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
        <section className={`home-redesign-surface home-hero ${isDarkMode ? 'is-dark' : ''}`}>
            <div
                aria-hidden="true"
                className="home-hero__bg"
                style={{ backgroundImage: `url("${bgUrl}")` }}
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

            <div className="home-hero__content">
                <motion.span
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                    className="home-hero__eyebrow"
                >
                    Hello, I am Sangui
                </motion.span>

                <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: 0.08 }}
                    className="home-hero__headline"
                >
                    <span>在这里把问题想清楚，</span>
                    <span>把代码写简单。</span>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 28 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.75, ease: 'easeOut', delay: 0.24 }}
                    className="home-hero__actions"
                >
                    <button
                        type="button"
                        onClick={handleStartReading}
                        className="home-hero__cta home-hero__cta--primary"
                    >
                        <span>向下探索内容</span>
                        <span className="home-hero__arrow">↓</span>
                    </button>
                </motion.div>
            </div>
        </section>
    );
}
