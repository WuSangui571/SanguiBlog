import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, MessageSquarePlus, SendHorizontal, X } from 'lucide-react';
import {
    createAiChatSession,
    fetchAiChatMessages,
    fetchAiChatSessions,
    streamAiChat
} from '../../api.js';
import { useLayoutOffsets } from '../../contexts/LayoutOffsetContext.jsx';
import { resolveAiAssistantConfig } from '../aiAssistantConfig.js';

function createLocalMessage(role, content, idPrefix = role) {
    return {
        id: `${idPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        role,
        content
    };
}

function mapServerMessage(message) {
    return {
        id: `server-${message.id}`,
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: message.content || ''
    };
}

const MIN_TEXTAREA_HEIGHT = 54;
const MAX_TEXTAREA_HEIGHT = 132;

function AssistantLogo({ logoPath, alt, size, roundedClassName = 'rounded-2xl' }) {
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        setHasError(false);
    }, [logoPath]);

    return (
        <div
            className={`shrink-0 overflow-hidden border-2 border-black bg-[#FF0080] text-white flex items-center justify-center ${roundedClassName}`}
            style={{ width: size, height: size }}
        >
            {!hasError ? (
                <img
                    src={logoPath}
                    alt={alt}
                    className="h-full w-full object-cover"
                    onError={() => setHasError(true)}
                />
            ) : (
                <Bot size={Math.max(18, Math.floor(size * 0.52))} strokeWidth={2.6} />
            )}
        </div>
    );
}

export default function AiAssistantWidget({ isDarkMode, config }) {
    const { headerHeight } = useLayoutOffsets();
    const assistantConfig = useMemo(() => resolveAiAssistantConfig(config), [config]);
    const [isOpen, setIsOpen] = useState(false);
    const [draft, setDraft] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [sessions, setSessions] = useState([]);
    const [sessionsLoading, setSessionsLoading] = useState(false);
    const [sessionsLoaded, setSessionsLoaded] = useState(false);
    const [activeSessionId, setActiveSessionId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const viewportRef = useRef(null);
    const interactionBlockerRef = useRef(null);
    const textareaRef = useRef(null);

    useLayoutEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        textarea.style.height = `${MIN_TEXTAREA_HEIGHT}px`;
        const nextHeight = Math.min(Math.max(textarea.scrollHeight, MIN_TEXTAREA_HEIGHT), MAX_TEXTAREA_HEIGHT);
        textarea.style.height = `${nextHeight}px`;
    }, [draft]);

    useEffect(() => {
        if (!isOpen) return;
        requestAnimationFrame(() => {
            viewportRef.current?.scrollTo({
                top: viewportRef.current.scrollHeight,
                behavior: 'smooth'
            });
        });
    }, [isOpen, messages, messagesLoading]);

    useEffect(() => {
        if (!isOpen || !interactionBlockerRef.current) {
            return undefined;
        }

        const blocker = interactionBlockerRef.current;
        const preventDefault = (event) => {
            event.preventDefault();
        };

        blocker.addEventListener('wheel', preventDefault, { passive: false });
        blocker.addEventListener('touchmove', preventDefault, { passive: false });

        return () => {
            blocker.removeEventListener('wheel', preventDefault);
            blocker.removeEventListener('touchmove', preventDefault);
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen || sessionsLoaded) {
            return;
        }

        let cancelled = false;
        setSessionsLoading(true);

        fetchAiChatSessions()
            .then((response) => {
                if (cancelled) return;
                const list = Array.isArray(response?.data) ? response.data : [];
                setSessions(list);
                setSessionsLoaded(true);
            })
            .catch(() => {
                if (cancelled) return;
                setSessionsLoaded(true);
            })
            .finally(() => {
                if (!cancelled) {
                    setSessionsLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [isOpen, sessionsLoaded]);

    const loadSessions = async () => {
        const response = await fetchAiChatSessions();
        const list = Array.isArray(response?.data) ? response.data : [];
        setSessions(list);
        setSessionsLoaded(true);
        return list;
    };

    const loadSessionMessages = async (sessionId) => {
        setMessagesLoading(true);
        try {
            const response = await fetchAiChatMessages(sessionId);
            const list = Array.isArray(response?.data) ? response.data : [];
            setMessages(list.map(mapServerMessage));
        } finally {
            setMessagesLoading(false);
        }
    };

    const handleStartNewChat = () => {
        setActiveSessionId(null);
        setMessages([]);
        setDraft('');
        setMessagesLoading(false);
    };

    const handleSelectSession = async (sessionId) => {
        if (!sessionId || sessionId === activeSessionId) return;
        setActiveSessionId(sessionId);
        await loadSessionMessages(sessionId);
    };

    const sendDisabled = !draft.trim() || isSending;

    const sendCurrentDraft = async () => {
        const content = draft.trim();
        if (!content || isSending) return;

        let sessionId = activeSessionId;

        try {
            setIsSending(true);

            if (!sessionId) {
                const createResponse = await createAiChatSession();
                const createdSession = createResponse?.data;
                sessionId = createdSession?.id;
                if (!sessionId) {
                    throw new Error('创建对话失败，请稍后再试。');
                }
                setActiveSessionId(sessionId);
                setSessions((prev) => [createdSession, ...prev.filter((item) => item.id !== sessionId)]);
            }

            const pendingId = `assistant-pending-${Date.now()}`;
            setMessages((prev) => [
                ...prev,
                createLocalMessage('user', content, 'user'),
                {
                    id: pendingId,
                    role: 'assistant',
                    content: assistantConfig.pendingReply
                }
            ]);
            setDraft('');

            let streamedReply = '';
            await streamAiChat({
                message: content,
                sessionId,
                onChunk: (chunk) => {
                    if (!chunk) return;
                    streamedReply += chunk;
                    setMessages((prev) => prev.map((message) => (
                        message.id === pendingId
                            ? { ...message, content: streamedReply }
                            : message
                    )));
                },
                onComplete: (payload) => {
                    const reply = payload?.reply?.trim() || streamedReply.trim() || '抱歉，我这次没有生成有效回复。';
                    streamedReply = reply;
                    setMessages((prev) => prev.map((message) => (
                        message.id === pendingId
                            ? { ...message, content: reply }
                            : message
                    )));
                },
                onError: (message) => {
                    throw new Error(message || 'AI 服务暂时不可用，请稍后再试。');
                }
            });
            await loadSessions();
        } catch (error) {
            const fallback = error?.message?.trim() || 'AI 服务暂时不可用，请稍后再试。';
            setMessages((prev) => prev.map((message) => (
                message.id.startsWith('assistant-pending-')
                    ? { ...message, content: fallback }
                    : message
            )));
        } finally {
            setIsSending(false);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        await sendCurrentDraft();
    };

    const handleTextareaKeyDown = async (event) => {
        if (event.key !== 'Enter') return;
        if (event.altKey || event.shiftKey) return;
        if (event.nativeEvent?.isComposing) return;
        event.preventDefault();
        await sendCurrentDraft();
    };

    const shellClass = isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-black';
    const subTextClass = isDarkMode ? 'text-gray-300' : 'text-gray-600';
    const bubbleButtonClass = isDarkMode
        ? 'bg-[#FFD700] text-black hover:bg-white'
        : 'bg-black text-[#FFD700] hover:bg-[#FFD700] hover:text-black';
    const panelAccentClass = isDarkMode ? 'bg-[#111827]' : 'bg-[#FFF9DB]';
    const emptyStateNoteClass = isDarkMode ? 'text-gray-400' : 'text-gray-500';
    const sessionItemClass = isDarkMode
        ? 'bg-gray-800 text-white hover:bg-gray-700'
        : 'bg-white text-black hover:bg-[#FFF4BF]';

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            ref={interactionBlockerRef}
                            aria-hidden="true"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.16 }}
                            className="fixed inset-0 z-[82] bg-transparent touch-none"
                        />
                        <motion.section
                            role="dialog"
                            aria-modal="true"
                            aria-label={assistantConfig.title}
                            initial={{ opacity: 0, x: 32 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 32 }}
                            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                            className={`fixed z-[83] left-0 right-0 md:left-auto md:w-[460px] border-t-2 border-black md:border-l-2 md:border-r-0 md:border-b-0 rounded-none overflow-hidden flex flex-col ${shellClass}`}
                            style={{ top: headerHeight, bottom: 0 }}
                        >
                            <div className={`border-b-2 border-black px-4 py-4 ${panelAccentClass}`}>
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3">
                                        <AssistantLogo
                                            logoPath={assistantConfig.logoPath}
                                            alt={assistantConfig.title}
                                            size={44}
                                        />
                                        <div>
                                            <p className="font-black text-base tracking-[0.06em]">
                                                {assistantConfig.title}
                                            </p>
                                            <p className={`mt-1 text-xs font-semibold ${subTextClass}`}>
                                                登录后可用
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsOpen(false)}
                                        className={`shrink-0 w-10 h-10 rounded-full border-2 border-black flex items-center justify-center ${isDarkMode ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-white text-black hover:bg-gray-100'}`}
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className={`border-b-2 border-black px-4 py-3 ${isDarkMode ? 'bg-[#0B1220]' : 'bg-[#FFFBEA]'}`}>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleStartNewChat}
                                        className={`shrink-0 inline-flex items-center gap-2 rounded-[16px] border-2 border-black px-3 py-2 text-xs font-black ${isDarkMode ? 'bg-[#FFD700] text-black hover:bg-white' : 'bg-black text-[#FFD700] hover:bg-[#FFD700] hover:text-black'}`}
                                    >
                                        <MessageSquarePlus size={15} />
                                        新对话
                                    </button>
                                    <div className="min-w-0 flex-1 overflow-x-auto">
                                        <div className="flex min-w-max gap-2 pr-1">
                                            {sessionsLoading ? (
                                                <div className={`px-3 py-2 text-xs font-semibold ${subTextClass}`}>正在加载历史会话...</div>
                                            ) : sessions.length === 0 ? (
                                                <div className={`px-3 py-2 text-xs font-semibold ${subTextClass}`}>还没有历史会话</div>
                                            ) : (
                                                sessions.map((session) => {
                                                    const active = session.id === activeSessionId;
                                                    return (
                                                        <button
                                                            key={session.id}
                                                            type="button"
                                                            onClick={() => handleSelectSession(session.id)}
                                                            className={`max-w-[170px] rounded-[16px] border-2 border-black px-3 py-2 text-left transition-colors ${active ? 'bg-[#FFD700] text-black' : sessionItemClass}`}
                                                        >
                                                            <div className="truncate text-xs font-black">
                                                                {session.title || '新对话'}
                                                            </div>
                                                            <div className={`mt-1 truncate text-[11px] font-semibold ${active ? 'text-black/70' : subTextClass}`}>
                                                                {session.lastMessagePreview || '暂无消息'}
                                                            </div>
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div
                                ref={viewportRef}
                                className={`sg-scrollbar flex-1 min-h-0 overflow-y-auto px-4 py-4 ${isDarkMode ? 'sg-scrollbar-dark bg-[#0F172A]' : 'sg-scrollbar-light bg-[#FFFDF6]'}`}
                                style={{ overscrollBehavior: 'contain' }}
                            >
                                {messagesLoading ? (
                                    <div className="flex min-h-[240px] items-center justify-center">
                                        <p className={`text-sm font-semibold ${subTextClass}`}>正在加载该对话的消息...</p>
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="flex min-h-[240px] items-center justify-center">
                                        <div className="w-full max-w-[320px] text-center">
                                            <div className="mx-auto mb-5 flex justify-center">
                                                <AssistantLogo
                                                    logoPath={assistantConfig.logoPath}
                                                    alt={assistantConfig.title}
                                                    size={64}
                                                    roundedClassName="rounded-[22px]"
                                                />
                                            </div>
                                            <h3 className="text-2xl font-black tracking-[0.08em]">
                                                {assistantConfig.welcomeMessage}
                                            </h3>
                                            <p className={`mt-3 text-sm font-semibold leading-6 ${subTextClass}`}>
                                                从一个全新的对话开始，或者切换到上方历史会话继续交流。
                                            </p>
                                            <p className={`mt-5 text-[11px] font-bold uppercase tracking-[0.24em] ${emptyStateNoteClass}`}>
                                                新进入时默认是空白会话
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {messages.map((message) => {
                                            const isAssistant = message.role === 'assistant';
                                            return (
                                                <div
                                                    key={message.id}
                                                    className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}
                                                >
                                                    <div
                                                        className={`max-w-[85%] border-2 border-black px-4 py-3 rounded-[20px] ${
                                                            isAssistant
                                                                ? 'bg-[#FFD700] text-black'
                                                                : isDarkMode
                                                                    ? 'bg-gray-800 text-white'
                                                                    : 'bg-white text-black'
                                                        }`}
                                                    >
                                                        <p className="text-sm leading-6 font-semibold whitespace-pre-wrap break-words">
                                                            {message.content}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <form onSubmit={handleSubmit} className={`border-t-2 border-black p-3 ${shellClass}`}>
                                <div className="relative">
                                    <label className="block">
                                        <span className="sr-only">输入消息</span>
                                        <textarea
                                            ref={textareaRef}
                                            rows={1}
                                            value={draft}
                                            onChange={(event) => setDraft(event.target.value)}
                                            onKeyDown={handleTextareaKeyDown}
                                            placeholder={assistantConfig.inputPlaceholder}
                                            style={{
                                                minHeight: `${MIN_TEXTAREA_HEIGHT}px`,
                                                maxHeight: `${MAX_TEXTAREA_HEIGHT}px`
                                            }}
                                            className={`sg-scrollbar w-full resize-none overflow-y-auto rounded-[18px] border-2 border-black px-4 pt-[15px] pb-[15px] pr-[72px] text-sm leading-5 font-semibold outline-none ${
                                                isDarkMode
                                                    ? 'sg-scrollbar-dark bg-gray-800 text-white placeholder:text-gray-400'
                                                    : 'sg-scrollbar-light bg-[#FFF9DB] text-black placeholder:text-gray-500'
                                            }`}
                                        />
                                    </label>
                                    <button
                                        type="submit"
                                        disabled={sendDisabled}
                                        className={`absolute right-3 bottom-3 shrink-0 w-[42px] h-[42px] rounded-[14px] border-2 border-black flex items-center justify-center transition-transform ${
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
                aria-label={isOpen ? '三桂博客AI助理已打开' : '打开三桂博客AI助理'}
                onClick={() => setIsOpen((prev) => !prev)}
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className={`fixed z-[81] right-4 bottom-6 md:right-6 md:bottom-6 border-2 border-black rounded-full pl-4 pr-5 py-3 flex items-center gap-3 transition-colors ${bubbleButtonClass}`}
            >
                <span className="relative flex items-center justify-center w-11 h-11 rounded-full border-2 border-black bg-[#FF0080] text-white overflow-hidden">
                    <img
                        src={assistantConfig.logoPath}
                        alt={assistantConfig.title}
                        className="h-full w-full object-cover"
                        onError={(event) => {
                            event.currentTarget.style.display = 'none';
                            const fallback = event.currentTarget.nextElementSibling;
                            if (fallback) fallback.style.display = 'flex';
                        }}
                    />
                    <span
                        className="hidden h-full w-full items-center justify-center"
                        aria-hidden="true"
                    >
                        <Bot size={22} strokeWidth={2.8} />
                    </span>
                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#00E096] border border-black" />
                </span>
                <span className="text-left">
                    <span className="block text-[10px] font-black uppercase tracking-[0.24em] opacity-80">
                        Ask Sangui AI
                    </span>
                    <span className="mt-0.5 block text-sm font-black">
                        三桂在线
                    </span>
                </span>
            </motion.button>
        </>
    );
}
