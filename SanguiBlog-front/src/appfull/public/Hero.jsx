import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import PopButton from "../../components/common/PopButton.jsx";
import { DEFAULT_HERO_TAGLINE, HERO_NOISE_TEXTURE, THEME } from "../shared.js";
import { ArrowUpRight, Github, Sparkles } from 'lucide-react';const Hero = ({ isDarkMode, onStartReading, version, tagline }) => {
    const { scrollY } = useScroll();
    const y1 = useTransform(scrollY, [0, 500], [0, 200]);
    const rotate = useTransform(scrollY, [0, 500], [0, 45]);

    const bgClass = isDarkMode ? THEME.colors.bgDark : THEME.colors.bgLight;
    const textClass = isDarkMode ? 'text-white' : 'text-black';
    const gridColor = isDarkMode ? '#374151' : '#000';
    const heroCopy = (typeof tagline === 'string' && tagline.trim().length > 0) ? tagline : DEFAULT_HERO_TAGLINE;

    return (
        <div
            className={`relative min-h-[90vh] flex flex-col justify-center items-center pt-20 overflow-hidden ${bgClass} ${textClass}`}>
            <div className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                    backgroundImage: `linear-gradient(${gridColor} 1px, transparent 1px), linear-gradient(90deg, ${gridColor} 1px, transparent 1px)`,
                    backgroundSize: '40px 40px'
                }}>
            </div>
            <div
                aria-hidden
                className="absolute inset-0 pointer-events-none mix-blend-multiply"
                style={{
                    backgroundImage: 'conic-gradient(from 180deg at 50% 50%, rgba(255,215,0,0.35), rgba(14,165,233,0.2), transparent 290deg)',
                    opacity: isDarkMode ? 0.35 : 0.5
                }}
            />
            <motion.div
                aria-hidden
                className="absolute inset-0 pointer-events-none"
                style={{
                    backgroundImage: `url(${HERO_NOISE_TEXTURE})`,
                    backgroundSize: '200px 200px',
                    opacity: isDarkMode ? 0.18 : 0.28,
                    mixBlendMode: isDarkMode ? 'screen' : 'multiply'
                }}
                initial={{ backgroundPosition: '0% 0%' }}
                animate={{ backgroundPosition: ['0% 0%', '100% 100%'] }}
                transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div style={{ y: y1, rotate }} className="absolute top-32 left-[10%] text-[#FFD700]">
                <Sparkles size={80} strokeWidth={1.5} className="drop-shadow-[4px_4px_0px_rgba(0,0,0,1)] fill-current" />
            </motion.div>
            <motion.div style={{ y: y1, x: -50 }}
                className="absolute bottom-40 right-[10%] w-32 h-32 border-4 border-black bg-[#00E096] shadow-[8px_8px_0px_0px_#000] z-0 rounded-full flex items-center justify-center font-black text-2xl">
                CODE
            </motion.div>

            <div className="z-10 text-center max-w-5xl px-4 relative">
                <motion.div
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="inline-block mb-6 bg-black text-white px-6 py-2 text-xl font-mono font-bold transform -rotate-2 shadow-[4px_4px_0px_0px_#111827]"
                >
                    {version ? `SANGUI BLOG // ${version}` : 'SANGUI BLOG'}
                </motion.div>

                <h1 className={`text-6xl md:text-9xl font-black mb-8 leading-[0.9] tracking-tighter drop-shadow-sm ${textClass}`}>
                    <motion.span
                        initial={{ y: 80, scale: 0.85, opacity: 0 }}
                        animate={{ y: [80, -12, 0], scale: [0.85, 1.08, 1], opacity: [0, 1, 1] }}
                        transition={{ delay: 0.08, duration: 0.9, ease: 'easeOut', times: [0, 0.6, 1] }}
                        className="block space-x-3"
                    >
                        <motion.span
                            whileHover={{ y: -4, scale: 1.02, rotate: -2 }}
                            transition={{ type: 'spring', stiffness: 260, damping: 14 }}
                            className="inline-block"
                        >
                            用代码记录
                        </motion.span>
                        <motion.span
                            whileHover={{ y: -6, scale: 1.04, rotate: 2, color: '#4F46E5' }}
                            transition={{ type: 'spring', stiffness: 280, damping: 14 }}
                            className="inline-block text-[#6366F1] underline decoration-8 decoration-black underline-offset-8 px-2"
                        >
                            探索
                        </motion.span>
                    </motion.span>
                    <motion.span
                        initial={{ y: 80, scale: 0.85, opacity: 0 }}
                        animate={{ y: [80, -12, 0], scale: [0.85, 1.08, 1], opacity: [0, 1, 1] }}
                        transition={{ delay: 0.18, duration: 0.9, ease: 'easeOut', times: [0, 0.6, 1] }}
                        className="block space-x-3 mt-2"
                    >
                        <motion.span
                            whileHover={{ y: -4, scale: 1.02, rotate: -1.5 }}
                            transition={{ type: 'spring', stiffness: 240, damping: 13 }}
                            className="inline-block"
                        >
                            以分享沉淀
                        </motion.span>
                        <motion.span
                            whileHover={{ y: -6, scale: 1.05, rotate: 2.5, backgroundColor: '#FFD700', color: '#0EA5E9' }}
                            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                            className="inline-block text-[#0EA5E9] bg-[#FFD700] px-2 ml-1 border-4 border-black skew-x-[-10deg] shadow-[6px_6px_0px_0px_#000]"
                        >
                            成长
                        </motion.span>
                    </motion.span>
                </h1>
                <p className={`text-xl md:text-2xl font-bold mb-12 max-w-2xl mx-auto border-2 border-black p-4 shadow-[4px_4px_0px_0px_#000] ${isDarkMode ? 'bg-[#1f2937] text-gray-300' : 'bg-white text-gray-600'}`}>
                    {heroCopy}
                    <br /><span className="text-sm font-mono text-[#0EA5E9]">{`>>`} PRESS START TO CONTINUE</span>
                </p>


                <div className="flex flex-wrap gap-6 justify-center">
                    <PopButton onClick={() => {
                        if (onStartReading) {
                            onStartReading();
                        } else {
                            document.getElementById('posts')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                    }}
                        icon={ArrowUpRight} className="text-xl px-8 py-4 bg-[#FF0080] text-white">
                        START READING
                    </PopButton>
                    <PopButton variant="secondary" icon={Github}
                        onClick={() => window.open('https://github.com/Wusangui571')}
                        className="text-xl px-8 py-4">
                        GITHUB REPO
                    </PopButton>
                </div>
            </div>

        </div>
    );
};
// StatsStrip, ArticleList, CommentsSection, ArticleDetail, LoginView are omitted for brevity in the component logic section, but included in the final file.

// --- 6. Scroll To Top Component ---
export default Hero;
