import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, History, MessageSquarePlus, Move, RotateCcw, SendHorizontal, Trash2, X } from 'lucide-react';
import {
    createAiChatSession,
    deleteAiChatSession,
    fetchAiChatMessages,
    fetchAiChatSessions,
    streamAiChatReliable
} from '../../api.js';
import { useLayoutOffsets } from '../../contexts/LayoutOffsetContext.jsx';
import {
    canUseAiAssistant,
    getAiAssistantGuestReply,
    shouldResetAiAssistantState
} from '../aiAssistantAccess.js';
import { resolveAiAssistantConfig } from '../aiAssistantConfig.js';
import AiMessageMarkdown from './AiMessageMarkdown.js';
import { getAiMessagePresentation } from './aiMessagePresentation.js';
import {
    DEFAULT_FLOATING_PANEL_WIDTH,
    clampFloatingPosition,
    getDefaultFloatingSize,
    getDefaultFloatingPosition,
    resizeFloatingPanel,
    shouldStartPanelDrag
} from './aiFloatingPanel.js';
import {
    shouldCapturePageScrollWithAssistantOpen,
    getHistoryPopoverScrollStyle,
    shouldLockAssistantViewport
} from './aiHistoryOverlay.js';
import { formatAiSessionTimeLabel, truncateAiSessionTitle } from './aiSessionMeta.js';
import { isIdleNewSession, shouldCloseHistoryPopover } from './aiSessionToolbar.js';
import { buildAiSessionDeleteDialog } from './aiSessionDeleteDialog.js';
import {
    buildAiWelcomeIntroLines,
    hasPlayedAiWelcomeIntro,
    markAiWelcomeIntroPlayed,
    shouldPlayAiWelcomeIntro
} from './aiWelcomeIntro.js';

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
const WELCOME_INTRO_DURATION_MS = 2400;

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

export default function AiAssistantWidget({ isDarkMode, config, user, currentPageContext = null }) {
    const { headerHeight } = useLayoutOffsets();
    const assistantConfig = useMemo(() => resolveAiAssistantConfig(config), [config]);
    const [isMobileViewport, setIsMobileViewport] = useState(() =>
        typeof window !== 'undefined' ? window.innerWidth < 768 : false
    );
    const [isOpen, setIsOpen] = useState(false);
    const [draft, setDraft] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [sessions, setSessions] = useState([]);
    const [sessionsLoading, setSessionsLoading] = useState(false);
    const [sessionsLoaded, setSessionsLoaded] = useState(false);
    const [activeSessionId, setActiveSessionId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [isFloating, setIsFloating] = useState(false);
    const [floatingPosition, setFloatingPosition] = useState(null);
    const [floatingSize, setFloatingSize] = useState(null);
    const [pendingDeleteSession, setPendingDeleteSession] = useState(null);
    const [hasPlayedWelcomeIntro, setHasPlayedWelcomeIntro] = useState(() => hasPlayedAiWelcomeIntro());
    const [welcomeIntroActive, setWelcomeIntroActive] = useState(false);
    const viewportRef = useRef(null);
    const textareaRef = useRef(null);
    const previousUserRef = useRef(user);
    const historyPopoverRef = useRef(null);
    const historyTriggerGroupRef = useRef(null);
    const panelRef = useRef(null);
    const dragStateRef = useRef(null);
    const resizeStateRef = useRef(null);

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
        const handleResize = () => {
            setIsMobileViewport(window.innerWidth < 768);
        };

        handleResize();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    useEffect(() => {
        if (!shouldPlayAiWelcomeIntro({
            isOpen,
            messagesLength: messages.length,
            messagesLoading,
            hasPlayed: hasPlayedWelcomeIntro
        })) {
            return undefined;
        }

        markAiWelcomeIntroPlayed();
        setHasPlayedWelcomeIntro(true);
        setWelcomeIntroActive(true);

        const timeoutId = window.setTimeout(() => {
            setWelcomeIntroActive(false);
        }, WELCOME_INTRO_DURATION_MS);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [hasPlayedWelcomeIntro, isOpen, messages.length, messagesLoading]);

    useEffect(() => {
        if (shouldResetAiAssistantState(previousUserRef.current, user)) {
            setIsOpen(false);
            setDraft('');
            setIsSending(false);
            setSessions([]);
            setSessionsLoading(false);
            setSessionsLoaded(false);
            setActiveSessionId(null);
            setMessages([]);
            setMessagesLoading(false);
            setHistoryOpen(false);
            setIsFloating(false);
            setFloatingPosition(null);
            setFloatingSize(null);
            setPendingDeleteSession(null);
        }

        previousUserRef.current = user;
    }, [user]);

    useEffect(() => {
        if (isMobileViewport && isFloating) {
            setIsFloating(false);
            setFloatingPosition(null);
            setFloatingSize(null);
            dragStateRef.current = null;
            resizeStateRef.current = null;
        }
    }, [isFloating, isMobileViewport]);

    useEffect(() => {
        if (!historyOpen) {
            return undefined;
        }

        const handlePointerDown = (event) => {
            const target = event.target;
            const clickedInsidePopover = historyPopoverRef.current?.contains(target) ?? false;
            const clickedInsideTrigger = historyTriggerGroupRef.current?.contains(target) ?? false;

            if (shouldCloseHistoryPopover({
                isHistoryOpen: historyOpen,
                clickedInsidePopover,
                clickedInsideTrigger
            })) {
                setHistoryOpen(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('touchstart', handlePointerDown);

        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('touchstart', handlePointerDown);
        };
    }, [historyOpen]);

    useEffect(() => {
        if (!isFloating) {
            dragStateRef.current = null;
            resizeStateRef.current = null;
            return undefined;
        }

        const handlePointerMove = (event) => {
            if (!panelRef.current) {
                return;
            }

            if (resizeStateRef.current) {
                const nextRect = resizeFloatingPanel({
                    direction: resizeStateRef.current.direction,
                    startRect: resizeStateRef.current.startRect,
                    pointerX: event.clientX,
                    pointerY: event.clientY,
                    viewportWidth: window.innerWidth,
                    viewportHeight: window.innerHeight,
                    headerHeight
                });

                setFloatingPosition({ x: nextRect.x, y: nextRect.y });
                setFloatingSize({ width: nextRect.width, height: nextRect.height });
                return;
            }

            if (!dragStateRef.current) {
                return;
            }

            const nextPosition = clampFloatingPosition({
                x: event.clientX - dragStateRef.current.offsetX,
                y: event.clientY - dragStateRef.current.offsetY,
                viewportWidth: window.innerWidth,
                viewportHeight: window.innerHeight,
                panelWidth: panelRef.current.offsetWidth,
                panelHeight: panelRef.current.offsetHeight,
                headerHeight
            });

            setFloatingPosition(nextPosition);
        };

        const handlePointerUp = () => {
            dragStateRef.current = null;
            resizeStateRef.current = null;
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);

        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [headerHeight, isFloating]);

    useEffect(() => {
        if (!isOpen || sessionsLoaded || !canUseAiAssistant(user)) {
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
        setHistoryOpen(false);
    };

    const resetFloatingMode = () => {
        setIsFloating(false);
        setFloatingPosition(null);
        setFloatingSize(null);
        dragStateRef.current = null;
        resizeStateRef.current = null;
    };

    const handleToggleFloatingMode = () => {
        if (isMobileViewport) {
            window.alert('手机端暂不支持浮动窗口，请在桌面端使用该功能。');
            return;
        }

        if (isFloating) {
            resetFloatingMode();
            return;
        }

        const nextSize = getDefaultFloatingSize({
            viewportHeight: window.innerHeight,
            headerHeight
        });
        const nextPosition = getDefaultFloatingPosition({
            viewportWidth: window.innerWidth,
            headerHeight,
            panelWidth: nextSize.width
        });

        setHistoryOpen(false);
        setFloatingSize(nextSize);
        setFloatingPosition(nextPosition);
        setIsFloating(true);
    };

    const handleCloseAssistant = () => {
        resetFloatingMode();
        setHistoryOpen(false);
        setPendingDeleteSession(null);
        setIsOpen(false);
    };

    const handleSelectSession = async (sessionId) => {
        if (!sessionId || sessionId === activeSessionId) return;
        setActiveSessionId(sessionId);
        setHistoryOpen(false);
        await loadSessionMessages(sessionId);
    };

    const handleDeleteSession = async (session, event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!session?.id) return;
        setPendingDeleteSession(session);
        return;

        const confirmed = window.confirm(`确认删除这条会话记录吗？\n\n${session.title || '新对话'}`);
        if (!confirmed) return;

        try {
            await deleteAiChatSession(session.id);
            const nextSessions = await loadSessions();

            if (session.id === activeSessionId) {
                handleStartNewChat();
            } else {
                setSessions(nextSessions);
            }
        } catch (error) {
            window.alert(error?.message?.trim() || '删除会话失败，请稍后再试。');
        }
    };

    const confirmDeleteSession = async () => {
        if (!pendingDeleteSession?.id) return;

        try {
            await deleteAiChatSession(pendingDeleteSession.id);
            const nextSessions = await loadSessions();

            if (pendingDeleteSession.id === activeSessionId) {
                handleStartNewChat();
            } else {
                setSessions(nextSessions);
            }
            setPendingDeleteSession(null);
        } catch (error) {
            window.alert(error?.message?.trim() || '删除会话失败，请稍后再试。');
        }
    };

    const deleteDialog = buildAiSessionDeleteDialog(pendingDeleteSession?.title);
    const welcomeIntroLines = useMemo(
        () => buildAiWelcomeIntroLines(assistantConfig.welcomeMessage),
        [assistantConfig.welcomeMessage]
    );
    const sendDisabled = !draft.trim() || isSending;
    const newChatDisabled = isIdleNewSession({
        activeSessionId,
        messages,
        draft
    });
    const capturePageScroll = shouldCapturePageScrollWithAssistantOpen(isOpen);
    const lockAssistantViewport = shouldLockAssistantViewport(historyOpen);
    const floatingPanelStyle = isFloating
        ? {
            top: floatingPosition?.y ?? headerHeight + 16,
            left:
                floatingPosition?.x ??
                (typeof window !== 'undefined'
                    ? Math.max(24, window.innerWidth - DEFAULT_FLOATING_PANEL_WIDTH - 24)
                    : 24),
            right: 'auto',
            bottom: 'auto',
            width: floatingSize?.width ?? DEFAULT_FLOATING_PANEL_WIDTH,
            height:
                floatingSize?.height ?? `min(calc(100vh - ${headerHeight + 32}px), 760px)`
        }
        : {
            top: headerHeight,
            bottom: 0
        };
    const panelStyle = isMobileViewport
        ? {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            width: '100vw',
            height: '100vh'
        }
        : floatingPanelStyle;

    const handlePanelDragStart = (event) => {
        if (!isFloating || !panelRef.current) {
            return;
        }

        const target = event.target;
        const isInteractiveTarget = Boolean(
            target?.closest?.('button, textarea, input, a, [data-no-drag="true"]')
        );
        const rect = event.currentTarget.getBoundingClientRect();

        if (!shouldStartPanelDrag({
            isFloating,
            rect,
            isInteractiveTarget
        })) {
            return;
        }

        event.preventDefault();
        dragStateRef.current = {
            offsetX: event.clientX - rect.left,
            offsetY: event.clientY - rect.top
        };
    };

    const handleResizeStart = (direction, event) => {
        if (!isFloating || !panelRef.current) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const rect = panelRef.current.getBoundingClientRect();
        resizeStateRef.current = {
            direction,
            startRect: {
                x: rect.left,
                y: rect.top,
                width: rect.width,
                height: rect.height
            }
        };
    };

    const sendCurrentDraft = async () => {
        const content = draft.trim();
        if (!content || isSending) return;

        if (!canUseAiAssistant(user)) {
            setMessages((prev) => [
                ...prev,
                createLocalMessage('user', content, 'guest-user'),
                createLocalMessage('assistant', getAiAssistantGuestReply(), 'guest-assistant')
            ]);
            setDraft('');
            return;
        }

        let sessionId = activeSessionId;
        let streamCompleted = false;

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
            await streamAiChatReliable({
                message: content,
                sessionId,
                currentPageContext,
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
                    streamCompleted = true;
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
            if (streamCompleted) {
                await loadSessions();
                return;
            }
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
                        {capturePageScroll && (
                            <motion.div
                                aria-hidden="true"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.16 }}
                                className="fixed inset-0 z-[82] bg-transparent touch-none"
                            />
                        )}
                        <motion.section
                            ref={panelRef}
                            role="dialog"
                            aria-modal="true"
                            aria-label={assistantConfig.title}
                            initial={{ opacity: 0, x: 32 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 32 }}
                            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                            className={`fixed z-[83] left-0 right-0 overflow-hidden rounded-none border-t-2 border-black flex flex-col ${shellClass} ${
                                isMobileViewport
                                    ? 'border-0 rounded-none'
                                    : isFloating
                                    ? 'md:border-2'
                                    : 'md:left-auto md:w-[460px] md:border-l-2 md:border-r-0 md:border-b-0'
                            }`}
                            style={panelStyle}
                        >
                            {isFloating && !isMobileViewport && (
                                <>
                                    <div
                                        onPointerDown={(event) => handleResizeStart('n', event)}
                                        className="absolute left-3 right-3 top-0 z-[84] h-3 -translate-y-1/2 cursor-ns-resize bg-transparent"
                                    />
                                    <div
                                        onPointerDown={(event) => handleResizeStart('e', event)}
                                        className="absolute bottom-3 right-0 top-3 z-[84] w-3 translate-x-1/2 cursor-ew-resize bg-transparent"
                                    />
                                    <div
                                        onPointerDown={(event) => handleResizeStart('s', event)}
                                        className="absolute bottom-0 left-3 right-3 z-[84] h-3 translate-y-1/2 cursor-ns-resize bg-transparent"
                                    />
                                    <div
                                        onPointerDown={(event) => handleResizeStart('w', event)}
                                        className="absolute bottom-3 left-0 top-3 z-[84] w-3 -translate-x-1/2 cursor-ew-resize bg-transparent"
                                    />
                                    <div
                                        onPointerDown={(event) => handleResizeStart('nw', event)}
                                        className="absolute left-0 top-0 z-[85] h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize bg-transparent"
                                    />
                                    <div
                                        onPointerDown={(event) => handleResizeStart('ne', event)}
                                        className="absolute right-0 top-0 z-[85] h-4 w-4 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize bg-transparent"
                                    />
                                    <div
                                        onPointerDown={(event) => handleResizeStart('se', event)}
                                        className="absolute bottom-0 right-0 z-[85] h-4 w-4 translate-x-1/2 translate-y-1/2 cursor-nwse-resize bg-transparent"
                                    />
                                    <div
                                        onPointerDown={(event) => handleResizeStart('sw', event)}
                                        className="absolute bottom-0 left-0 z-[85] h-4 w-4 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize bg-transparent"
                                    />
                                </>
                            )}
                            <div
                                onPointerDown={handlePanelDragStart}
                                className={`border-b-2 border-black px-4 py-4 ${panelAccentClass} ${
                                    isFloating && !isMobileViewport ? 'cursor-move' : ''
                                }`}
                            >
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
                                                Beta测试
                                            </p>
                                        </div>
                                    </div>
                                    <div
                                        ref={historyTriggerGroupRef}
                                        className="relative flex shrink-0 items-center gap-2"
                                    >
                                        <button
                                            type="button"
                                            onClick={handleStartNewChat}
                                            title={newChatDisabled ? '当前已是新对话' : '新对话'}
                                            disabled={newChatDisabled}
                                            className={`inline-flex h-10 w-10 items-center justify-center rounded-[14px] border-2 border-black transition-colors ${
                                                newChatDisabled
                                                    ? 'cursor-not-allowed bg-gray-200 text-gray-500'
                                                    : isDarkMode
                                                        ? 'bg-[#FFD700] text-black hover:bg-white'
                                                        : 'bg-black text-[#FFD700] hover:bg-[#FFD700] hover:text-black'
                                            }`}
                                        >
                                            <MessageSquarePlus size={18} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => canUseAiAssistant(user) && setHistoryOpen((prev) => !prev)}
                                            title={canUseAiAssistant(user) ? '历史会话' : '登录后可查看历史会话'}
                                            disabled={!canUseAiAssistant(user)}
                                            className={`inline-flex h-10 w-10 items-center justify-center rounded-[14px] border-2 border-black transition-colors ${
                                                canUseAiAssistant(user)
                                                    ? isDarkMode
                                                        ? 'bg-gray-800 text-white hover:bg-gray-700'
                                                        : 'bg-white text-black hover:bg-[#FFF4BF]'
                                                    : 'cursor-not-allowed bg-gray-200 text-gray-500'
                                            }`}
                                        >
                                            <History size={18} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleToggleFloatingMode}
                                            title={isFloating ? '恢复停靠' : '浮动窗口'}
                                            className={`inline-flex h-10 w-10 items-center justify-center rounded-[14px] border-2 border-black transition-colors ${
                                                isFloating
                                                    ? 'bg-[#FFD700] text-black'
                                                    : isDarkMode
                                                        ? 'bg-gray-800 text-white hover:bg-gray-700'
                                                        : 'bg-white text-black hover:bg-gray-100'
                                            }`}
                                        >
                                            {isFloating ? <RotateCcw size={18} /> : <Move size={18} />}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleCloseAssistant}
                                            title="关闭"
                                            className={`inline-flex h-10 w-10 items-center justify-center rounded-[14px] border-2 border-black transition-colors ${
                                                isDarkMode ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-white text-black hover:bg-gray-100'
                                            }`}
                                        >
                                            <X size={18} />
                                        </button>
                                        {historyOpen && canUseAiAssistant(user) && (
                                            <div
                                                ref={historyPopoverRef}
                                                className={`absolute right-0 top-[calc(100%+10px)] z-[84] w-[300px] rounded-[20px] border-2 border-black p-2 ${
                                                    isDarkMode ? 'bg-[#111827] text-white' : 'bg-white text-black'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-3 border-b border-black/10 px-3 pb-2 pt-1">
                                                    <div className={`text-[11px] font-black uppercase tracking-[0.18em] ${subTextClass}`}>
                                                        历史会话
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setHistoryOpen(false)}
                                                        title="关闭历史会话窗口"
                                                        className={`inline-flex h-7 w-7 items-center justify-center rounded-[10px] border border-black transition-colors ${
                                                            isDarkMode ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-white text-black hover:bg-gray-100'
                                                        }`}
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                                <div
                                                    className="mt-2 max-h-[280px] overflow-y-auto pr-1"
                                                    style={getHistoryPopoverScrollStyle()}
                                                >
                                                    {sessionsLoading ? (
                                                        <div className={`px-3 py-3 text-xs font-semibold ${subTextClass}`}>正在加载历史会话...</div>
                                                    ) : sessions.length === 0 ? (
                                                        <div className={`px-3 py-3 text-xs font-semibold ${subTextClass}`}>还没有历史会话</div>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            {sessions.map((session) => {
                                                                const active = session.id === activeSessionId;
                                                                return (
                                                                    <div
                                                                        key={session.id}
                                                                        onClick={() => handleSelectSession(session.id)}
                                                                        onKeyDown={(event) => {
                                                                            if (event.key === 'Enter' || event.key === ' ') {
                                                                                event.preventDefault();
                                                                                void handleSelectSession(session.id);
                                                                            }
                                                                        }}
                                                                        role="button"
                                                                        tabIndex={0}
                                                                        className={`w-full cursor-pointer rounded-[16px] border-2 border-black px-3 py-3 text-left transition-colors ${
                                                                            active
                                                                                ? 'bg-[#FFD700] text-black'
                                                                                : isDarkMode
                                                                                    ? 'bg-gray-800 text-white hover:bg-gray-700'
                                                                                    : 'bg-[#FFFBEA] text-black hover:bg-[#FFF4BF]'
                                                                        }`}
                                                                    >
                                                                        <div className="truncate text-sm font-black">
                                                                            {truncateAiSessionTitle(session.title || '新对话')}
                                                                        </div>
                                                                        <div className={`mt-1 text-[11px] font-semibold ${active ? 'text-black/70' : subTextClass}`}>
                                                                            {formatAiSessionTimeLabel(session.updatedAt)}
                                                                        </div>
                                                                        <div className="mt-2 flex justify-end">
                                                                            <button
                                                                                type="button"
                                                                                title="删除这条会话"
                                                                                aria-label="删除这条会话"
                                                                                onClick={(event) => {
                                                                                    void handleDeleteSession(session, event);
                                                                                }}
                                                                                className={`inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-black transition-colors ${
                                                                                    active
                                                                                        ? 'bg-black/10 text-black hover:bg-black/20'
                                                                                        : isDarkMode
                                                                                            ? 'bg-gray-900 text-white hover:bg-gray-950'
                                                                                            : 'bg-white text-black hover:bg-gray-100'
                                                                                }`}
                                                                            >
                                                                                <Trash2 size={14} />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                            <div className={`px-1 pt-1 text-[11px] font-semibold ${subTextClass}`}>
                                                                仅显示最近 10 条对话
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {lockAssistantViewport && (
                                <div
                                    aria-hidden="true"
                                    className="absolute inset-x-0 bottom-0 z-[83] bg-transparent"
                                    style={{ top: 78 }}
                                    onWheel={(event) => event.preventDefault()}
                                    onTouchMove={(event) => event.preventDefault()}
                                />
                            )}

                            <div className={`hidden border-b-2 border-black px-4 py-3 ${isDarkMode ? 'bg-[#0B1220]' : 'bg-[#FFFBEA]'}`}>
                                <div className="flex items-center justify-between gap-3">
                                    <div className={`min-w-0 text-[11px] font-bold uppercase tracking-[0.16em] ${subTextClass}`}>
                                        {activeSessionId ? '继续对话' : '新的对话'}
                                    </div>
                                    <div className="relative flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={handleStartNewChat}
                                            title="新对话"
                                            className={`inline-flex h-10 w-10 items-center justify-center rounded-[14px] border-2 border-black transition-colors ${
                                                isDarkMode ? 'bg-[#FFD700] text-black hover:bg-white' : 'bg-black text-[#FFD700] hover:bg-[#FFD700] hover:text-black'
                                            }`}
                                        >
                                            <MessageSquarePlus size={18} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => canUseAiAssistant(user) && setHistoryOpen((prev) => !prev)}
                                            title={canUseAiAssistant(user) ? '历史会话' : '登录后可查看历史会话'}
                                            disabled={!canUseAiAssistant(user)}
                                            className={`inline-flex h-10 w-10 items-center justify-center rounded-[14px] border-2 border-black transition-colors ${
                                                canUseAiAssistant(user)
                                                    ? isDarkMode
                                                        ? 'bg-gray-800 text-white hover:bg-gray-700'
                                                        : 'bg-white text-black hover:bg-[#FFF4BF]'
                                                    : 'cursor-not-allowed bg-gray-200 text-gray-500'
                                            }`}
                                        >
                                            <History size={18} />
                                        </button>
                                        {historyOpen && canUseAiAssistant(user) && (
                                            <div
                                                className={`absolute right-0 top-[calc(100%+10px)] z-[84] w-[300px] rounded-[20px] border-2 border-black p-2 ${
                                                    isDarkMode ? 'bg-[#111827] text-white' : 'bg-white text-black'
                                                }`}
                                            >
                                                <div className={`border-b border-black/10 px-3 pb-2 pt-1 text-[11px] font-black uppercase tracking-[0.18em] ${subTextClass}`}>
                                                    历史会话
                                                </div>
                                                <div className="mt-2 max-h-[280px] overflow-y-auto pr-1">
                                                    {sessionsLoading ? (
                                                        <div className={`px-3 py-3 text-xs font-semibold ${subTextClass}`}>正在加载历史会话...</div>
                                                    ) : sessions.length === 0 ? (
                                                        <div className={`px-3 py-3 text-xs font-semibold ${subTextClass}`}>还没有历史会话</div>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            {sessions.map((session) => {
                                                                const active = session.id === activeSessionId;
                                                                return (
                                                                    <button
                                                                        key={session.id}
                                                                        type="button"
                                                                        onClick={() => handleSelectSession(session.id)}
                                                                        className={`w-full rounded-[16px] border-2 border-black px-3 py-3 text-left transition-colors ${
                                                                            active
                                                                                ? 'bg-[#FFD700] text-black'
                                                                                : isDarkMode
                                                                                    ? 'bg-gray-800 text-white hover:bg-gray-700'
                                                                                    : 'bg-[#FFFBEA] text-black hover:bg-[#FFF4BF]'
                                                                        }`}
                                                                    >
                                                                        <div className="truncate text-sm font-black">
                                                                            {truncateAiSessionTitle(session.title || '新对话')}
                                                                        </div>
                                                                        <div className={`mt-1 text-[11px] font-semibold ${active ? 'text-black/70' : subTextClass}`}>
                                                                            {formatAiSessionTimeLabel(session.updatedAt)}
                                                                        </div>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="hidden flex items-center gap-2">
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
                                            {!canUseAiAssistant(user) ? (
                                                <div className={`px-3 py-2 text-xs font-semibold ${subTextClass}`}>登录后可查看历史会话</div>
                                            ) : sessionsLoading ? (
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
                                className={`sg-scrollbar flex-1 min-h-0 px-4 py-4 ${isDarkMode ? 'sg-scrollbar-dark bg-[#0F172A]' : 'sg-scrollbar-light bg-[#FFFDF6]'} ${
                                    lockAssistantViewport ? 'overflow-hidden' : 'overflow-y-auto'
                                }`}
                                style={{ overscrollBehavior: 'contain' }}
                            >
                                {messagesLoading ? (
                                    <div className="flex min-h-[240px] items-center justify-center">
                                        <p className={`text-sm font-semibold ${subTextClass}`}>正在加载该对话的消息...</p>
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="flex min-h-[240px] items-center justify-center">
                                        <div className="w-full max-w-[320px] text-center">
                                            <motion.div
                                                className="mx-auto mb-5 flex justify-center"
                                                initial={welcomeIntroActive ? { opacity: 0, scale: 0.84, rotate: -8 } : false}
                                                animate={welcomeIntroActive ? {
                                                    opacity: [0, 1, 1],
                                                    scale: [0.84, 1.08, 1],
                                                    rotate: [-8, 0, 0],
                                                    filter: [
                                                        'drop-shadow(0 0 0px rgba(255,0,128,0))',
                                                        'drop-shadow(0 0 20px rgba(255,0,128,0.42))',
                                                        'drop-shadow(0 0 10px rgba(255,215,0,0.22))'
                                                    ]
                                                } : { opacity: 1, scale: 1, rotate: 0, filter: 'drop-shadow(0 0 0px rgba(0,0,0,0))' }}
                                                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                                            >
                                                <div className="relative">
                                                    <motion.div
                                                        aria-hidden="true"
                                                        className="pointer-events-none absolute inset-[-8px] rounded-[28px] border border-[#00F0FF]/40"
                                                        initial={welcomeIntroActive ? { opacity: 0, scale: 0.92 } : false}
                                                        animate={welcomeIntroActive ? {
                                                            opacity: [0, 0.85, 0],
                                                            scale: [0.92, 1.08, 1.14]
                                                        } : { opacity: 0 }}
                                                        transition={{ duration: 1.1, delay: 0.08, ease: 'easeOut' }}
                                                    />
                                                    <AssistantLogo
                                                        logoPath={assistantConfig.logoPath}
                                                        alt={assistantConfig.title}
                                                        size={64}
                                                        roundedClassName="rounded-[22px]"
                                                    />
                                                </div>
                                            </motion.div>
                                            <div className="space-y-3">
                                                {welcomeIntroLines.map((line, index) => {
                                                    const isHeadline = index === 0;
                                                    const isHint = index === welcomeIntroLines.length - 1;
                                                    return (
                                                        <motion.div
                                                            key={`${index}-${line}`}
                                                            initial={welcomeIntroActive ? {
                                                                opacity: 0,
                                                                y: 18,
                                                                scale: 0.96,
                                                                filter: 'blur(10px)'
                                                            } : false}
                                                            animate={welcomeIntroActive ? {
                                                                opacity: [0, 1, 1],
                                                                y: [18, -4, 0],
                                                                scale: [0.96, 1.02, 1],
                                                                filter: ['blur(10px)', 'blur(0px)', 'blur(0px)']
                                                            } : {
                                                                opacity: 1,
                                                                y: 0,
                                                                scale: 1,
                                                                filter: 'blur(0px)'
                                                            }}
                                                            transition={{
                                                                duration: isHeadline ? 0.72 : 0.58,
                                                                delay: 0.18 + index * 0.19,
                                                                ease: [0.22, 1, 0.36, 1]
                                                            }}
                                                            className="relative overflow-hidden"
                                                        >
                                                            {welcomeIntroActive && (
                                                                <motion.div
                                                                    aria-hidden="true"
                                                                    className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-[#00F0FF]/25 to-transparent"
                                                                    initial={{ x: '-120%', opacity: 0 }}
                                                                    animate={{ x: ['-120%', '120%', '360%'], opacity: [0, 0.9, 0] }}
                                                                    transition={{
                                                                        duration: 0.72,
                                                                        delay: 0.24 + index * 0.19,
                                                                        ease: 'easeOut'
                                                                    }}
                                                                />
                                                            )}
                                                            {isHeadline ? (
                                                                <h3 className="text-2xl font-black tracking-[0.08em]">
                                                                    {line}
                                                                </h3>
                                                            ) : isHint ? (
                                                                <p className={`text-[11px] font-bold uppercase tracking-[0.24em] ${emptyStateNoteClass}`}>
                                                                    {line}
                                                                </p>
                                                            ) : (
                                                                <p className={`text-sm font-semibold leading-6 ${subTextClass}`}>
                                                                    {line}
                                                                </p>
                                                            )}
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {messages.map((message) => {
                                            const isAssistant = message.role === 'assistant';
                                            const presentation = getAiMessagePresentation(message.role, isDarkMode);
                                            return (
                                                <div
                                                    key={message.id}
                                                    className={presentation.wrapperClassName}
                                                >
                                                    <div
                                                        className={presentation.contentClassName}
                                                    >
                                                        {isAssistant ? (
                                                            <AiMessageMarkdown
                                                                content={message.content}
                                                                isDarkMode={isDarkMode}
                                                                isAssistant={isAssistant}
                                                            />
                                                        ) : (
                                                            <p className="text-sm leading-6 font-semibold whitespace-pre-wrap break-words">
                                                                {message.content}
                                                            </p>
                                                        )}
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
                        <AnimatePresence>
                            {pendingDeleteSession && (
                                <motion.div
                                    className="fixed inset-0 z-[85] flex items-center justify-center px-4"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                >
                                    <div
                                        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
                                        onClick={() => setPendingDeleteSession(null)}
                                    />
                                    <motion.div
                                        role="dialog"
                                        aria-modal="true"
                                        aria-label={deleteDialog.title}
                                        initial={{ opacity: 0, y: 14, scale: 0.96 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.96 }}
                                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                                        className={`relative w-full max-w-sm overflow-hidden border-2 border-black shadow-[10px_10px_0px_0px_#000] ${
                                            isDarkMode ? 'bg-[#111827] text-white' : 'bg-[#FFF9E6] text-black'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-3 border-b-2 border-black px-5 py-4">
                                            <div className="space-y-1">
                                                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#FF0080]">
                                                    会话删除
                                                </p>
                                                <h3 className="text-lg font-black">{deleteDialog.title}</h3>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setPendingDeleteSession(null)}
                                                className={`inline-flex h-8 w-8 items-center justify-center rounded-[10px] border-2 border-black ${
                                                    isDarkMode ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-white text-black hover:bg-gray-100'
                                                }`}
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                        <div className="space-y-4 px-5 py-5">
                                            <div className={`rounded-2xl border-2 border-black px-4 py-3 ${
                                                isDarkMode ? 'bg-gray-900/80' : 'bg-white'
                                            }`}>
                                                <p className="text-xs font-semibold opacity-70">会话标题</p>
                                                <p className="mt-1 text-sm font-black break-words">{deleteDialog.sessionTitle}</p>
                                            </div>
                                            <p className={`text-sm leading-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                {deleteDialog.description}
                                            </p>
                                            <div className="flex items-center justify-end gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setPendingDeleteSession(null)}
                                                    className={`px-4 py-2 rounded-full border-2 border-black text-sm font-bold shadow-[3px_3px_0px_0px_#000] ${
                                                        isDarkMode ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-white text-black hover:bg-gray-100'
                                                    }`}
                                                >
                                                    {deleteDialog.cancelText}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={confirmDeleteSession}
                                                    className="px-4 py-2 rounded-full border-2 border-black bg-[#FF5A5F] text-white text-sm font-bold shadow-[3px_3px_0px_0px_#000] hover:bg-[#E84B50]"
                                                >
                                                    {deleteDialog.confirmText}
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
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
