import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, SendHorizontal, Sparkles, X } from 'lucide-react';
import { resolveAiAssistantConfig } from '../aiAssistantConfig.js';

function createAssistantMessage(content) {
    return {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content
    };
}

function createUserMessage(content) {
    return {
        id: `user-${Date.now()}`,
        role: 'user',
        content
    };
}

export default function AiAssistantWidget({ isDarkMode, config }) {
    const assistantConfig = useMemo(() => resolveAiAssistantConfig(config), [config]);
    const [isOpen, setIsOpen] = useState(false);
    const [draft, setDraft] = useState('');
    const [messages, setMessages] = useState(() => [
        createAssistantMessage(assistantConfig.welcomeMessage)
    ]);
    const openedOnceRef = useRef(false);
    const viewportRef = useRef(null);

    useEffect(() => {
        setMessages((prev) => {
            if (!prev.length) {
                return [createAssistantMessage(assistantConfig.welcomeMessage)];
            }
            const [first, ...rest] = prev;
            if (first?.role !== 'assistant') {
                return [createAssistantMessage(assistantConfig.welcomeMessage), ...prev];
            }
            return [{ ...first, content: assistantConfig.welcomeMessage }, ...rest];
        });
    }, [assistantConfig.welcomeMessage]);

    useEffect(() => {
        if (!isOpen) return;
        if (!openedOnceRef.current) {
            openedOnceRef.current = true;
        }
        requestAnimationFrame(() => {
            viewportRef.current?.scrollTo({
                top: viewportRef.current.scrollHeight,
                behavior: 'smooth'
            });
        });
    }, [isOpen, messages]);

    const sendDisabled = !draft.trim();

    const handleSubmit = (event) => {
        event.preventDefault();
        const content = draft.trim();
        if (!content) return;
        setMessages((prev) => [
            ...prev,
            createUserMessage(content),
            createAssistantMessage(assistantConfig.pendingReply)
        ]);
        setDraft('');
    };

    const shellClass = isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-black';
    const subTextClass = isDarkMode ? 'text-gray-300' : 'text-gray-600';
    const bubbleButtonClass = isDarkMode
        ? 'bg-[#FFD700] text-black hover:bg-white'
        : 'bg-black text-[#FFD700] hover:bg-[#FFD700] hover:text-black';
    const panelAccentClass = isDarkMode ? 'bg-[#111827]' : 'bg-[#FFF9DB]';

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.button
                            type="button"
                            aria-label="关闭 AI 助手遮罩"
                            className="fixed inset-0 z-[82] bg-black/20 backdrop-blur-[2px]"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                        />
                        <motion.section
                            role="dialog"
                            aria-modal="false"
                            aria-label={assistantConfig.title}
                            initial={{ opacity: 0, y: 16, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 16, scale: 0.96 }}
                            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                            className={`fixed z-[83] right-4 bottom-24 md:right-6 md:bottom-6 w-[min(420px,calc(100vw-24px))] border-2 border-black rounded-[28px] shadow-[10px_10px_0px_0px_#000] overflow-hidden ${shellClass}`}
                        >
                            <div className={`relative border-b-2 border-black px-4 py-4 ${panelAccentClass}`}>
                                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_#FF0080_0,_transparent_45%),radial-gradient(circle_at_bottom_left,_#FFD700_0,_transparent_38%)]" />
                                <div className="relative flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3">
                                        <div className="shrink-0 w-12 h-12 rounded-2xl border-2 border-black bg-[#FF0080] text-white flex items-center justify-center shadow-[4px_4px_0px_0px_#000]">
                                            <Bot size={22} strokeWidth={2.6} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-black text-base uppercase tracking-[0.14em]">
                                                    AI 助手
                                                </p>
                                                <span className="px-2 py-0.5 text-[10px] font-black uppercase border border-black rounded-full bg-[#FFD700] text-black">
                                                    Preview
                                                </span>
                                            </div>
                                            <p className={`mt-1 text-xs font-semibold ${subTextClass}`}>
                                                {assistantConfig.title}
                                            </p>
                                            <p className={`mt-2 text-[11px] font-semibold ${subTextClass}`}>
                                                欢迎语已预留后续后台配置入口。
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsOpen(false)}
                                        className={`shrink-0 w-10 h-10 rounded-full border-2 border-black flex items-center justify-center shadow-[3px_3px_0px_0px_#000] ${isDarkMode ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-white text-black hover:bg-gray-100'}`}
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>

                            <div
                                ref={viewportRef}
                                className={`max-h-[46vh] min-h-[240px] overflow-y-auto px-4 py-4 space-y-3 ${isDarkMode ? 'bg-[#0F172A]' : 'bg-[#FFFDF6]'}`}
                            >
                                {messages.map((message) => {
                                    const isAssistant = message.role === 'assistant';
                                    return (
                                        <div
                                            key={message.id}
                                            className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}
                                        >
                                            <div
                                                className={`max-w-[85%] border-2 border-black px-4 py-3 rounded-[22px] shadow-[4px_4px_0px_0px_#000] ${
                                                    isAssistant
                                                        ? 'bg-[#FFD700] text-black'
                                                        : isDarkMode
                                                            ? 'bg-gray-800 text-white'
                                                            : 'bg-white text-black'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2 mb-1">
                                                    {isAssistant ? <Sparkles size={14} /> : <SendHorizontal size={14} />}
                                                    <span className="text-[10px] font-black uppercase tracking-[0.14em]">
                                                        {isAssistant ? assistantConfig.assistantName : '你'}
                                                    </span>
                                                </div>
                                                <p className="text-sm leading-6 font-semibold whitespace-pre-wrap break-words">
                                                    {message.content}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <form onSubmit={handleSubmit} className={`border-t-2 border-black p-3 ${shellClass}`}>
                                <div className="flex items-end gap-3">
                                    <label className="flex-1">
                                        <span className="sr-only">输入消息</span>
                                        <textarea
                                            rows={2}
                                            value={draft}
                                            onChange={(event) => setDraft(event.target.value)}
                                            placeholder={assistantConfig.inputPlaceholder}
                                            className={`w-full resize-none rounded-[20px] border-2 border-black px-4 py-3 text-sm font-semibold outline-none shadow-[4px_4px_0px_0px_#000] ${
                                                isDarkMode
                                                    ? 'bg-gray-800 text-white placeholder:text-gray-400'
                                                    : 'bg-[#FFF9DB] text-black placeholder:text-gray-500'
                                            }`}
                                        />
                                    </label>
                                    <button
                                        type="submit"
                                        disabled={sendDisabled}
                                        className={`shrink-0 w-14 h-14 rounded-[20px] border-2 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_#000] transition-transform ${
                                            sendDisabled
                                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                : 'bg-[#FF0080] text-white hover:-translate-y-0.5'
                                        }`}
                                    >
                                        <SendHorizontal size={18} />
                                    </button>
                                </div>
                            </form>
                        </motion.section>
                    </>
                )}
            </AnimatePresence>

            <motion.button
                type="button"
                aria-label={isOpen ? 'AI 助手已打开' : '打开 AI 助手'}
                onClick={() => setIsOpen((prev) => !prev)}
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className={`fixed z-[81] right-4 bottom-6 md:right-6 md:bottom-6 border-2 border-black rounded-full pl-4 pr-5 py-3 flex items-center gap-3 shadow-[8px_8px_0px_0px_#000] transition-colors ${bubbleButtonClass}`}
            >
                <span className="relative flex items-center justify-center w-12 h-12 rounded-full border-2 border-black bg-[#FF0080] text-white shadow-[3px_3px_0px_0px_#000]">
                    <Bot size={22} strokeWidth={2.8} />
                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#00E096] border border-black" />
                </span>
                <span className="text-left">
                    <span className="block text-[10px] font-black uppercase tracking-[0.24em] opacity-80">
                        Ask Sangui AI
                    </span>
                    <span className="block text-sm font-black">
                        三桂在线
                    </span>
                </span>
            </motion.button>
        </>
    );
}
