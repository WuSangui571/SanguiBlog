import React, { useCallback, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { rehypeSanitize, SG_REHYPE_SANITIZE_SCHEMA } from "../../utils/rehypeSanitizeSchema.js";
import 'katex/dist/katex.min.css';
import { AnimatePresence, motion } from 'framer-motion';
import { buildAssetUrl } from "../../utils/asset.js";
import { THEME, remarkHighlight } from "../shared.js";
import { Copy } from 'lucide-react';function AboutView({ about, isDarkMode, onReload, onEdit, isSuperAdmin }) {
    const surface = isDarkMode ? THEME.colors.surfaceDark : THEME.colors.surfaceLight;
    const text = isDarkMode ? 'text-gray-100' : 'text-gray-900';
    const cardBorder = 'border-black';
    const [aboutPreview, setAboutPreview] = useState(null);
    const inlineCodeBg = isDarkMode ? 'bg-gray-800 text-pink-200' : 'bg-gray-100 text-pink-600';

    const CodeBlockWithCopy = ({ textContent, className }) => {
        const [copied, setCopied] = useState(false);
        const langMatch = typeof className === 'string' ? className.match(/language-([a-zA-Z0-9]+)/) : null;
        const langLabel = langMatch && langMatch[1] ? langMatch[1].toUpperCase() : 'CODE';

        const handleCopy = useCallback(() => {
            if (!textContent) return;
            navigator.clipboard?.writeText(textContent).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1600);
            }).catch(() => setCopied(false));
        }, [textContent]);

        return (
            <div
                className={`not-prose my-6 rounded-2xl border-2 border-black overflow-hidden shadow-[6px_6px_0px_0px_#000] ${isDarkMode ? 'border-gray-600' : ''}`}>
                <div
                    className={`flex items-center gap-2 px-4 py-2 border-b-2 border-black ${isDarkMode ? 'bg-[#0B1221] text-gray-200 border-gray-700' : 'bg-gray-100 text-gray-600'}`}>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-[#FF5F56] border border-black/10"></div>
                        <div className="w-4 h-4 rounded-full bg-[#FFBD2E] border border-black/10"></div>
                        <div className="w-4 h-4 rounded-full bg-[#27C93F] border border-black/10"></div>
                        <span className="ml-2 text-[10px] font-black tracking-[0.2em]">{langLabel}</span>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        {copied && (
                            <span className="text-[10px] font-black text-emerald-400">已复制</span>
                        )}
                        <button
                            type="button"
                            onClick={handleCopy}
                            className={`px-2 py-1 text-[11px] font-black border-2 border-black rounded-full inline-flex items-center gap-1 transition-transform hover:-translate-y-0.5 ${isDarkMode ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-white text-black hover:bg-gray-100'}`}
                            aria-label="复制代码"
                        >
                            <Copy size={14} /> 复制
                        </button>
                    </div>
                </div>
                <pre
                    className={`p-5 overflow-auto m-0 ${isDarkMode ? 'bg-[#0B1221] text-gray-100' : 'bg-white text-gray-900'}`}>
                    <code className={`${className || ''} !bg-transparent !p-0 !border-none font-mono text-sm`}>
                        {textContent}
                    </code>
                </pre>
            </div>
        );
    };

    const markdownComponents = useMemo(() => ({
        img: ({ src, alt, className = '', ...props }) => {
            const resolvedSrc = buildAssetUrl(src || '', src || '');
            return (
                <img
                    src={resolvedSrc}
                    alt={alt}
                    loading="lazy"
                    {...props}
                    className={`cursor-zoom-in max-w-full h-auto ${className}`.trim()}
                    onClick={() => setAboutPreview(resolvedSrc)}
                />
            );
        },
        code({ inline, className, children, ...props }) {
            const rawText = String(children);
            const textContent = rawText.replace(/\n$/, '');
            const hasLanguage = typeof className === 'string' && className.includes('language-');
            const isMultiline = textContent.includes('\n');
            const shouldInline = inline ?? (!hasLanguage && !isMultiline);
            if (shouldInline) {
                const backtickCount = (textContent.match(/`/g) || []).length;
                if (backtickCount > 0 && backtickCount % 2 === 0) {
                    const parts = textContent.split('`');
                    return (
                        <>
                            {parts.map((part, i) => {
                                if (i % 2 === 0) {
                                    return (
                                        <code
                                            key={i}
                                            className={`px-1 py-0.5 rounded font-mono text-sm ${inlineCodeBg}`}
                                            {...props}
                                        >
                                            {part}
                                        </code>
                                    );
                                }
                                return <span key={i}>{part}</span>;
                            })}
                        </>
                    );
                }
                return (
                    <code
                        className={`px-1 py-0.5 rounded font-mono text-sm ${inlineCodeBg}`}
                        {...props}
                    >
                        {textContent}
                    </code>
                );
            }
            return <CodeBlockWithCopy textContent={textContent} className={className} {...props} />;
        }
    }), [inlineCodeBg]);

    return (
        <section className="relative pt-28 pb-20 min-h-screen">
            <div className={`absolute inset-0 ${isDarkMode ? 'bg-gradient-to-b from-[#020617]/70 via-transparent to-[#020617]/70' : 'bg-gradient-to-b from-white/70 via-white/50 to-white/70'} backdrop-blur-[2px] pointer-events-none`} />
            <div className="relative max-w-5xl mx-auto px-4 space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-mono uppercase tracking-[0.2em] text-[#FF0080]">About</p>
                        <h1 className={`text-4xl md:text-5xl font-black leading-tight mt-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>关于本站</h1>
                        <p className={`text-sm mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>由超级管理员维护的单页介绍，访客与管理员均可阅读。</p>
                    </div>
                    <div className="flex gap-3">
                        {onReload && (
                            <button
                                onClick={onReload}
                                className={`px-4 py-2 border-2 border-black rounded-full text-sm font-bold shadow-[4px_4px_0px_0px_#000] ${isDarkMode ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-white text-black hover:bg-gray-100'}`}
                            >
                                刷新
                            </button>
                        )}
                        {isSuperAdmin && onEdit && (
                            <button
                                onClick={onEdit}
                                className="px-4 py-2 border-2 border-black rounded-full text-sm font-bold bg-[#FFD700] text-black shadow-[4px_4px_0px_0px_#000] hover:translate-y-[-2px] transition"
                            >
                                编辑关于
                            </button>
                        )}
                    </div>
                </div>

                <div className={`border-4 ${cardBorder} shadow-[10px_10px_0px_0px_#000] rounded-2xl p-6 md:p-10 ${surface} ${text}`}>
                    {about && about.contentMd ? (
                        <article className={`prose prose-xl max-w-none prose-headings:font-black prose-p:font-medium prose-code:before:content-none prose-code:after:content-none prose-pre:p-0 prose-pre:bg-transparent ${isDarkMode ? 'prose-invert' : ''}`}>
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm, remarkMath, remarkHighlight]}
                                rehypePlugins={[rehypeKatex, [rehypeSanitize, SG_REHYPE_SANITIZE_SCHEMA]]}
                                components={markdownComponents}
                            >
                                {about.contentMd}
                            </ReactMarkdown>
                        </article>
                    ) : (
                        <div className="text-center py-16 space-y-3">
                            <div className="text-2xl font-black">还没有“关于本站”内容</div>
                            <p className="text-sm text-gray-500">等待超级管理员添加或上传一份 Markdown 正文。</p>
                        </div>
                    )}

                    <div className="mt-6 text-xs text-gray-500 flex items-center justify-between">
                        <span>最后更新：{about?.updatedAt ? new Date(about.updatedAt).toLocaleString() : '暂无'}</span>
                        <span>维护人：{about?.updatedBy || '未记录'}</span>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {aboutPreview && (
                    <motion.div
                        className="fixed inset-0 z-[75] bg-black/80 flex items-center justify-center p-6"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setAboutPreview(null)}
                    >
                        <motion.img
                            src={aboutPreview}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="max-w-full max-h-full rounded-lg shadow-[10px_10px_0px_0px_#000] border-4 border-white cursor-zoom-out"
                            onClick={() => setAboutPreview(null)}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
}

export default AboutView;
