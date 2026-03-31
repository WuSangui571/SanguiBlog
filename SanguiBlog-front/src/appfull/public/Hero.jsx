import React from 'react';
import { motion } from 'framer-motion';
import { ArrowDownRight, Github, Sparkles } from 'lucide-react';
import { buildAssetUrl } from "../../utils/asset.js";
import { DEFAULT_HERO_TAGLINE } from "../shared.js";
import './homeRedesign.css';

const HOME_BG_PATH = '/static/home/bg.jpg';

export default function Hero({ onStartReading, version, tagline, isDarkMode }) {
    const heroCopy = (typeof tagline === 'string' && tagline.trim().length > 0)
        ? tagline.trim()
        : DEFAULT_HERO_TAGLINE;
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
                animate={{ x: [0, 28, -12, 0], y: [0, -18, 12, 0] }}
                transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
                aria-hidden="true"
                className="home-hero__orb home-hero__orb--secondary"
                animate={{ x: [0, -22, 10, 0], y: [0, 20, -16, 0] }}
                transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
            />

            <div className="home-hero__content">
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                    className="home-hero__eyebrow"
                >
                    <span>Hello, I am Sangui</span>
                    <span className="home-hero__dot" />
                    <span>{version ? `版本 ${version}` : 'Sangui Blog'}</span>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: 0.08 }}
                    className="home-hero__headline"
                >
                    <span>在这里把问题想清楚，</span>
                    <span>把代码写简单。</span>
                </motion.div>

                <motion.p
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.75, ease: 'easeOut', delay: 0.16 }}
                    className="home-hero__copy"
                >
                    {heroCopy}
                </motion.p>

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
                        <ArrowDownRight size={18} />
                    </button>
                    <button
                        type="button"
                        onClick={() => window.open('https://github.com/Wusangui571', '_blank', 'noopener,noreferrer')}
                        className="home-hero__cta home-hero__cta--ghost"
                    >
                        <Github size={18} />
                        <span>GitHub</span>
                    </button>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 32 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: 0.32 }}
                    className="home-hero__status"
                >
                    <span className="home-hero__status-item">
                        <Sparkles size={14} />
                        <span>首页新版视觉已启用</span>
                    </span>
                    <span className="home-hero__status-item">Light / Dark 自适配</span>
                    <span className="home-hero__status-item">Background Ready</span>
                </motion.div>
            </div>
        </section>
    );
}
