import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, History, MessageSquarePlus, Move, RotateCcw, SendHorizontal, Trash2, X } from 'lucide-react';
import {
    createAiChatSession,
    deleteAiChatSession,
    fetchAiChatMessages,
    fetchAiChatSessions,
    fetchGuardCaptcha,
    streamAiChatReliable,
    verifyGuardCaptcha
} from '../../api.js';
import { useLayoutOffsets } from '../../contexts/LayoutOffsetContext.jsx';
import {
    isAiAssistantGuest,
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
    getHistoryPopoverScrollbarClass,
    shouldCapturePageScrollWithAssistantOpen,
    getHistoryPopoverScrollStyle,
    shouldLockAssistantViewport
} from './aiHistoryOverlay.js';
import { formatAiSessionTimeLabel, truncateAiSessionTitle } from './aiSessionMeta.js';
import { isIdleNewSession, shouldCloseHistoryPopover } from './aiSessionToolbar.js';
import { buildAiSessionDeleteDialog } from './aiSessionDeleteDialog.js';
import { buildAiLauncherBadge } from './aiLauncherBadge.js';
import { buildAiGuestAccessNotice } from './aiGuestAccessNotice.js';
import { claimOverlayStackBase, OVERLAY_STACK_BASE } from './overlayStack.js';
import { normalizeSelectedText, shouldRaiseAssistantOverlayOnPointerDown } from './aiSelectionGuard.js';
import {
    buildAiWelcomeIntroLines,
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
const launcherGlowShapeClass = 'rounded-[24px]';
const launcherGlowInnerShapeClass = 'rounded-[22px]';

function getMobileViewportRect() {
    if (typeof window === 'undefined') {
        return {
            width: 0,
            height: 0,
            offsetTop: 0,
            offsetLeft: 0,
            keyboardInset: 0
        };
    }

    const visualViewport = window.visualViewport;
    const width = Math.round(visualViewport?.width ?? window.innerWidth);
    const height = Math.round(visualViewport?.height ?? window.innerHeight);
    const offsetTop = Math.max(0, Math.round(visualViewport?.offsetTop ?? 0));
    const offsetLeft = Math.max(0, Math.round(visualViewport?.offsetLeft ?? 0));
    const keyboardInset = Math.max(0, window.innerHeight - height - offsetTop);

    return {
        width,
        height,
        offsetTop,
        offsetLeft,
        keyboardInset
    };
}

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
    const [mobileViewportRect, setMobileViewportRect] = useState(() => getMobileViewportRect());
    const [isOpen, setIsOpen] = useState(false);
    const [overlayBaseZ, setOverlayBaseZ] = useState(OVERLAY_STACK_BASE);
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
    const [welcomeIntroActive, setWelcomeIntroActive] = useState(false);
    const [guardPromptOpen, setGuardPromptOpen] = useState(false);
    const [guardCaptchaImage, setGuardCaptchaImage] = useState('');
    const [guardCaptchaInput, setGuardCaptchaInput] = useState('');
    const [guardCaptchaLoading, setGuardCaptchaLoading] = useState(false);
    const [guardError, setGuardError] = useState('');
    const [assistantNotice, setAssistantNotice] = useState({ visible: false, message: '', tone: 'info' });
    const viewportRef = useRef(null);
    const textareaRef = useRef(null);
    const previousUserRef = useRef(user);
    const historyPopoverRef = useRef(null);
    const historyTriggerGroupRef = useRef(null);
    const panelRef = useRef(null);
    const dragStateRef = useRef(null);
    const resizeStateRef = useRef(null);
    const assistantNoticeTimerRef = useRef(null);
    const isGuestMode = isAiAssistantGuest(user);
    const raiseAssistantOverlay = useCallback(() => {
        setOverlayBaseZ(claimOverlayStackBase());
    }, []);
    const handlePanelPointerDownCapture = useCallback((event) => {
        const selectedText = normalizeSelectedText(
            typeof window !== 'undefined' ? window.getSelection?.()?.toString() : ''
        );

        if (!shouldRaiseAssistantOverlayOnPointerDown({
            button: event.button,
            selectedText
        })) {
            return;
        }

        raiseAssistantOverlay();
    }, [raiseAssistantOverlay]);
    const showAssistantNotice = useCallback((message, tone = 'info') => {
        if (!message) return;
        setAssistantNotice({ visible: true, message, tone });
        if (assistantNoticeTimerRef.current) {
            window.clearTimeout(assistantNoticeTimerRef.current);
        }
        assistantNoticeTimerRef.current = window.setTimeout(() => {
            setAssistantNotice((prev) => ({ ...prev, visible: false }));
        }, 3200);
    }, []);
    const scrollAssistantViewportToBottom = useCallback((behavior = 'smooth') => {
        requestAnimationFrame(() => {
            viewportRef.current?.scrollTo({
                top: viewportRef.current.scrollHeight,
                behavior
            });
        });
    }, []);
    const handleTextareaFocus = useCallback(() => {
        if (!isMobileViewport) {
            return;
        }

        window.setTimeout(() => {
            textareaRef.current?.scrollIntoView({
                block: 'nearest',
                inline: 'nearest'
            });
            scrollAssistantViewportToBottom('smooth');
        }, 120);
    }, [isMobileViewport, scrollAssistantViewportToBottom]);

    useEffect(() => {
        if (isOpen) {
            raiseAssistantOverlay();
        }
    }, [isOpen, raiseAssistantOverlay]);

    useEffect(() => () => {
        if (assistantNoticeTimerRef.current) {
            window.clearTimeout(assistantNoticeTimerRef.current);
        }
    }, []);

    useLayoutEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        textarea.style.height = `${MIN_TEXTAREA_HEIGHT}px`;
        const nextHeight = Math.min(Math.max(textarea.scrollHeight, MIN_TEXTAREA_HEIGHT), MAX_TEXTAREA_HEIGHT);
        textarea.style.height = `${nextHeight}px`;
    }, [draft]);

    useEffect(() => {
        if (!isOpen) return;
        scrollAssistantViewportToBottom('smooth');
    }, [isOpen, messages, messagesLoading, scrollAssistantViewportToBottom]);

    useEffect(() => {
        const handleResize = () => {
            setIsMobileViewport(window.innerWidth < 768);
            setMobileViewportRect(getMobileViewportRect());
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);

        const visualViewport = window.visualViewport;
        visualViewport?.addEventListener('resize', handleResize);
        visualViewport?.addEventListener('scroll', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
            visualViewport?.removeEventListener('resize', handleResize);
            visualViewport?.removeEventListener('scroll', handleResize);
        };
    }, []);

    useEffect(() => {
        if (!isOpen || !isMobileViewport) {
            return;
        }

        if (mobileViewportRect.keyboardInset <= 0 && document.activeElement !== textareaRef.current) {
            return;
        }

        scrollAssistantViewportToBottom('smooth');
    }, [isMobileViewport, isOpen, mobileViewportRect, scrollAssistantViewportToBottom]);

    useEffect(() => {
        if (!shouldPlayAiWelcomeIntro({
            isOpen,
            messagesLength: messages.length,
            messagesLoading
        })) {
            return undefined;
        }

        setWelcomeIntroActive(true);

        const timeoutId = window.setTimeout(() => {
            setWelcomeIntroActive(false);
        }, WELCOME_INTRO_DURATION_MS);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [isOpen, messages.length, messagesLoading]);

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
            closeGuardPrompt();
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
        if (!isOpen || sessionsLoaded || isGuestMode) {
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
    }, [isGuestMode, isOpen, sessionsLoaded]);

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
            showAssistantNotice('手机端暂不支持浮动窗口，请在桌面端使用该功能。', 'warning');
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
        closeGuardPrompt();
        setIsOpen(false);
    };

    const handleLauncherToggle = () => {
        if (!isOpen) {
            raiseAssistantOverlay();
        }
        setIsOpen((prev) => !prev);
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
            showAssistantNotice(error?.message?.trim() || '删除会话失败，请稍后再试。', 'error');
        }
    };

    const deleteDialog = buildAiSessionDeleteDialog(pendingDeleteSession?.title);
    const launcherBadge = useMemo(() => buildAiLauncherBadge(assistantConfig), [assistantConfig]);
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
    const historyPopoverScrollbarClass = getHistoryPopoverScrollbarClass(isDarkMode);
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
            top: mobileViewportRect.offsetTop,
            left: mobileViewportRect.offsetLeft,
            right: 'auto',
            bottom: 'auto',
            width: `${mobileViewportRect.width}px`,
            height: `${mobileViewportRect.height}px`
        }
        : floatingPanelStyle;

    const buildLocalHistory = () =>
        messages
            .filter((item) => item && (item.role === 'user' || item.role === 'assistant') && item.content?.trim())
            .slice(-10)
            .map((item) => ({
                role: item.role,
                content: item.content
            }));

    const openGuardPrompt = async (message = '') => {
        setGuardPromptOpen(true);
        setGuardCaptchaInput('');
        setGuardError(message || '');
        setGuardCaptchaLoading(true);
        try {
            const response = await fetchGuardCaptcha(true);
            const data = response?.data || {};
            setGuardCaptchaImage(data.imageBase64 || '');
        } catch (error) {
            setGuardError(error?.message?.trim() || '获取验证码失败，请稍后再试。');
        } finally {
            setGuardCaptchaLoading(false);
        }
    };

    const closeGuardPrompt = () => {
        setGuardPromptOpen(false);
        setGuardCaptchaInput('');
        setGuardError('');
        setGuardCaptchaImage('');
        setGuardCaptchaLoading(false);
    };

    const handleGuardVerify = async () => {
        const captcha = guardCaptchaInput.trim();
        if (!captcha) {
            setGuardError('请输入验证码。');
            return;
        }
        setGuardCaptchaLoading(true);
        try {
            await verifyGuardCaptcha(captcha);
            closeGuardPrompt();
            showAssistantNotice('验证通过，现在可以继续提问了。', 'success');
        } catch (error) {
            setGuardError(error?.message?.trim() || '验证码验证失败，请重试。');
            try {
                const response = await fetchGuardCaptcha(true);
                const data = response?.data || {};
                setGuardCaptchaImage(data.imageBase64 || '');
            } catch {
                // ignore refresh error here
            }
        } finally {
            setGuardCaptchaLoading(false);
        }
    };

    const handlePanelDragStart = (event) => {
        if (!isFloating || !panelRef.current) {
            return;
        }

        raiseAssistantOverlay();

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

        raiseAssistantOverlay();
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

        let sessionId = activeSessionId;
        let streamCompleted = false;
        const pendingId = `assistant-pending-${Date.now()}`;
        const localHistory = buildLocalHistory();

        try {
            setIsSending(true);

            if (!sessionId && !isGuestMode) {
                const createResponse = await createAiChatSession();
                const createdSession = createResponse?.data;
                sessionId = createdSession?.id;
                if (!sessionId) {
                    throw new Error('创建对话失败，请稍后再试。');
                }
                setActiveSessionId(sessionId);
                setSessions((prev) => [createdSession, ...prev.filter((item) => item.id !== sessionId)]);
            }

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
                localHistory,
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
                    if (payload?.sessionId) {
                        setActiveSessionId(payload.sessionId);
                    }
                    setMessages((prev) => prev.map((message) => (
                        message.id === pendingId
                            ? { ...message, content: reply }
                            : message
                    )));
                },
                onError: (errorPayload) => {
                    if (errorPayload instanceof Error) {
                        throw errorPayload;
                    }
                    if (typeof errorPayload === 'object' && errorPayload !== null) {
                        const nextError = new Error(errorPayload.message || 'AI 服务暂时不可用，请稍后再试。');
                        nextError.payload = errorPayload;
                        throw nextError;
                    }
                    throw new Error(errorPayload || 'AI 服务暂时不可用，请稍后再试。');
                }
            });
            if (!isGuestMode) {
                await loadSessions();
            }
        } catch (error) {
            if (streamCompleted) {
                if (!isGuestMode) {
                    await loadSessions();
                }
                return;
            }
            const payload = error?.payload?.data || error?.payload || {};
            const fallback = error?.message?.trim() || 'AI 服务暂时不可用，请稍后再试。';
            const guestAccessNotice = buildAiGuestAccessNotice({
                isGuestMode,
                payload,
                message: fallback,
                status: error?.status
            });

            if (payload.captchaRequired) {
                const notice = guestAccessNotice || fallback;
                setMessages((prev) => prev.map((message) => (
                    message.id === pendingId
                        ? { ...message, content: notice }
                        : message
                )));
                await openGuardPrompt('检测到访客提问过快，请完成验证码后继续。登录后可获得更高的提问额度。');
                return;
            }

            setMessages((prev) => prev.map((message) => (
                message.id === pendingId
                    ? { ...message, content: guestAccessNotice || fallback }
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

    const assistantBackdropClass = isDarkMode
        ? 'bg-[radial-gradient(circle_at_right_center,rgba(99,102,241,0.28),transparent_34%),linear-gradient(180deg,rgba(2,6,23,0.58),rgba(2,6,23,0.78))] backdrop-blur-[18px]'
        : 'bg-[radial-gradient(circle_at_right_center,rgba(129,140,248,0.24),transparent_34%),linear-gradient(180deg,rgba(241,245,249,0.46),rgba(226,232,240,0.66))] backdrop-blur-[18px]';
    const shellClass = isDarkMode
        ? 'ring-1 ring-white/12 bg-[linear-gradient(180deg,rgba(24,36,60,0.99),rgba(9,14,25,0.985))] text-white backdrop-blur-2xl shadow-[0_36px_120px_rgba(2,6,23,0.68)]'
        : 'ring-1 ring-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.985),rgba(239,244,250,0.95))] text-black backdrop-blur-2xl shadow-[0_32px_96px_rgba(15,23,42,0.22)]';
    const panelBorderClass = isDarkMode ? 'border-white/10' : 'border-black/8';
    const subTextClass = isDarkMode ? 'text-gray-300' : 'text-gray-600';
    const panelAccentClass = isDarkMode
        ? 'bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))]'
        : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0.38))]';
    const emptyStateNoteClass = isDarkMode ? 'text-gray-400' : 'text-gray-500';
    const sessionItemClass = isDarkMode
        ? 'border-white/10 bg-white/[0.06] text-white hover:bg-white/[0.10]'
        : 'border-black/10 bg-white/50 text-black hover:bg-white/75';
    const iconButtonBaseClass = `inline-flex items-center justify-center rounded-[16px] border text-sm transition-all backdrop-blur-xl ${panelBorderClass}`;
    const neutralIconButtonClass = isDarkMode
        ? `${iconButtonBaseClass} bg-white/[0.07] text-white hover:bg-white/[0.14]`
        : `${iconButtonBaseClass} bg-white/58 text-black hover:bg-white/80`;
    const accentIconButtonClass = isDarkMode
        ? `${iconButtonBaseClass} bg-[linear-gradient(180deg,rgba(255,215,0,0.92),rgba(255,215,0,0.72))] text-black hover:bg-[#FFE27A]`
        : `${iconButtonBaseClass} bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.72))] text-[#111827] hover:bg-white`;
    const disabledIconButtonClass = `${iconButtonBaseClass} cursor-not-allowed bg-gray-200/80 text-gray-500`;
    const popoverShellClass = isDarkMode
        ? 'bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(15,23,42,0.88))] text-white border-white/12 shadow-[0_20px_50px_rgba(2,6,23,0.42)]'
        : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(248,250,252,0.82))] text-black border-black/10 shadow-[0_20px_50px_rgba(15,23,42,0.14)]';
    const viewportGlassClass = isDarkMode
        ? 'sg-scrollbar-dark ring-1 ring-white/12 bg-[linear-gradient(180deg,rgba(2,6,14,0.985),rgba(7,11,20,1))]'
        : 'sg-scrollbar-light ring-1 ring-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(236,242,249,0.98))]';
    const textareaGlassClass = isDarkMode
        ? 'sg-scrollbar-dark border-white/10 bg-white/[0.06] text-white placeholder:text-gray-400'
        : 'sg-scrollbar-light border-black/10 bg-white/70 text-black placeholder:text-gray-500';
    const modalCardClass = isDarkMode
        ? 'bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(15,23,42,0.90))] text-white border-white/12 shadow-[0_20px_60px_rgba(2,6,23,0.46)]'
        : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(248,250,252,0.88))] text-black border-black/10 shadow-[0_20px_60px_rgba(15,23,42,0.16)]';
    const modalInsetClass = isDarkMode ? 'bg-white/[0.05] border-white/10' : 'bg-white/72 border-black/8';
    const launcherLayoutClass = isMobileViewport
        ? 'w-[60px] h-[60px] justify-center px-0'
        : 'pl-3.5 pr-5 py-3 gap-3';
    const launcherOverflowClass = isMobileViewport ? 'overflow-visible' : 'overflow-hidden';
    const assistantBackdropZ = overlayBaseZ;
    const assistantLauncherZ = isOpen ? overlayBaseZ + 1 : 89;
    const assistantPanelZ = overlayBaseZ + 2;
    const assistantModalZ = overlayBaseZ + 10;
    const assistantNoticeZ = overlayBaseZ + 11;

    const portalTarget = typeof document !== 'undefined' ? document.body : null;
    const assistantLayer = (
        <div className="sg-ai-assistant-layer">
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
                                className={`fixed inset-0 z-[90] touch-none ${assistantBackdropClass}`}
                                style={{ zIndex: assistantBackdropZ }}
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
                            className={`fixed z-[91] left-0 right-0 overflow-hidden rounded-none border flex flex-col ${shellClass} ${panelBorderClass} ${
                                isMobileViewport
                                    ? 'border-0 rounded-none'
                                    : isFloating
                                    ? 'md:rounded-[30px]'
                                    : 'md:left-auto md:w-[460px] md:rounded-l-[30px] md:border-r-0'
                            }`}
                            style={{ ...panelStyle, zIndex: assistantPanelZ }}
                            onPointerDownCapture={handlePanelPointerDownCapture}
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
                                className={`border-b px-4 py-4 ${panelBorderClass} ${panelAccentClass} ${
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
                                        {!isMobileViewport && (
                                            <div>
                                                <p className="font-black text-base tracking-[0.06em]">
                                                    {assistantConfig.title}
                                                </p>
                                                <p className={`mt-1 text-xs font-semibold ${subTextClass}`}>
                                                    Beta 测试版
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    <div
                                        ref={historyTriggerGroupRef}
                                        className="relative flex shrink-0 items-center gap-2"
                                    >
                                        <button
                                            type="button"
                                            onClick={handleStartNewChat}
                                            title={newChatDisabled ? '当前已经是新对话' : '新对话'}
                                            disabled={newChatDisabled}
                                            className={`h-10 w-10 ${
                                                newChatDisabled
                                                    ? disabledIconButtonClass
                                                    : accentIconButtonClass
                                            }`}
                                        >
                                            <MessageSquarePlus size={18} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => !isGuestMode && setHistoryOpen((prev) => !prev)}
                                            title={!isGuestMode ? '历史会话' : '访客模式不保留历史会话'}
                                            disabled={isGuestMode}
                                            className={`h-10 w-10 ${
                                                !isGuestMode
                                                    ? neutralIconButtonClass
                                                    : disabledIconButtonClass
                                            }`}
                                        >
                                            <History size={18} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleToggleFloatingMode}
                                            title={isFloating ? '恢复停靠' : '浮动窗口'}
                                            className={`h-10 w-10 ${
                                                isFloating
                                                    ? accentIconButtonClass
                                                    : neutralIconButtonClass
                                            }`}
                                        >
                                            {isFloating ? <RotateCcw size={18} /> : <Move size={18} />}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleCloseAssistant}
                                            title="关闭"
                                            className={`h-10 w-10 ${neutralIconButtonClass}`}
                                        >
                                            <X size={18} />
                                        </button>
                                        {historyOpen && !isGuestMode && (
                                            <div
                                                ref={historyPopoverRef}
                                                className={`absolute right-0 top-[calc(100%+10px)] z-[84] w-[320px] rounded-[24px] border p-2 backdrop-blur-2xl ${popoverShellClass}`}
                                            >
                                                <div className={`flex items-start justify-between gap-3 border-b px-3 pb-2 pt-1 ${panelBorderClass}`}>
                                                    <div className={`text-[11px] font-black uppercase tracking-[0.18em] ${subTextClass}`}>
                                                        历史会话
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setHistoryOpen(false)}
                                                        title="关闭历史会话窗口"
                                                        className={`h-7 w-7 ${neutralIconButtonClass}`}
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                                <div
                                                    className={`mt-2 max-h-[280px] overflow-y-auto pr-1 ${historyPopoverScrollbarClass}`}
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
                                                                        className={`w-full cursor-pointer rounded-[18px] border px-3 py-3 text-left transition-colors backdrop-blur-xl ${
                                                                            active
                                                                                ? (isDarkMode
                                                                                    ? 'border-white/15 bg-[linear-gradient(180deg,rgba(255,215,0,0.92),rgba(255,215,0,0.72))] text-black'
                                                                                    : 'border-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,245,204,0.82))] text-black')
                                                                                : sessionItemClass
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
                                                                                className={`h-8 w-8 ${
                                                                                    active
                                                                                        ? (isDarkMode ? `${neutralIconButtonClass} bg-black/10 text-black hover:bg-black/20 border-black/10` : `${neutralIconButtonClass} bg-black/10 text-black hover:bg-black/20`)
                                                                                        : neutralIconButtonClass
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

                            <div className={`hidden border-b px-4 py-3 ${panelBorderClass} ${panelAccentClass}`}>
                                <div className="flex items-center justify-between gap-3">
                                    <div className={`min-w-0 text-[11px] font-bold uppercase tracking-[0.16em] ${subTextClass}`}>
                                        {activeSessionId ? '继续对话' : '新的对话'}
                                    </div>
                                    <div className="relative flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={handleStartNewChat}
                                            title="新对话"
                                            className={`h-10 w-10 ${accentIconButtonClass}`}
                                        >
                                            <MessageSquarePlus size={18} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => !isGuestMode && setHistoryOpen((prev) => !prev)}
                                            title={!isGuestMode ? '历史会话' : '访客模式不保留历史会话'}
                                            disabled={isGuestMode}
                                            className={`h-10 w-10 ${
                                                !isGuestMode
                                                    ? neutralIconButtonClass
                                                    : disabledIconButtonClass
                                            }`}
                                        >
                                            <History size={18} />
                                        </button>
                                        {historyOpen && !isGuestMode && (
                                            <div
                                                className={`absolute right-0 top-[calc(100%+10px)] z-[84] w-[320px] rounded-[24px] border p-2 backdrop-blur-2xl ${popoverShellClass}`}
                                            >
                                                <div className={`border-b px-3 pb-2 pt-1 text-[11px] font-black uppercase tracking-[0.18em] ${subTextClass} ${panelBorderClass}`}>
                                                    历史会话
                                                </div>
                                                <div
                                                    className={`mt-2 max-h-[280px] overflow-y-auto pr-1 ${historyPopoverScrollbarClass}`}
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
                                                                    <button
                                                                        key={session.id}
                                                                        type="button"
                                                                        onClick={() => handleSelectSession(session.id)}
                                                                        className={`w-full rounded-[18px] border px-3 py-3 text-left transition-colors backdrop-blur-xl ${
                                                                            active
                                                                                ? (isDarkMode
                                                                                    ? 'border-white/15 bg-[linear-gradient(180deg,rgba(255,215,0,0.92),rgba(255,215,0,0.72))] text-black'
                                                                                    : 'border-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,245,204,0.82))] text-black')
                                                                                : sessionItemClass
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
                                    <div className={`min-w-0 flex-1 overflow-x-auto ${isDarkMode ? 'sg-scrollbar sg-scrollbar-dark' : ''}`}>
                                        <div className="flex min-w-max gap-2 pr-1">
                                            {isGuestMode ? (
                                                <div className={`px-3 py-2 text-xs font-semibold ${subTextClass}`}>访客模式仅保留当前临时对话</div>
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
                                                            className={`max-w-[170px] rounded-[18px] border px-3 py-2 text-left transition-colors backdrop-blur-xl ${active
                                                                ? (isDarkMode
                                                                    ? 'border-white/15 bg-[linear-gradient(180deg,rgba(255,215,0,0.92),rgba(255,215,0,0.72))] text-black'
                                                                    : 'border-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,245,204,0.82))] text-black')
                                                                : sessionItemClass}`}
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
                                className={`sg-scrollbar flex-1 min-h-0 px-4 py-4 ${viewportGlassClass} ${
                                    lockAssistantViewport ? 'overflow-hidden' : 'overflow-y-auto'
                                }`}
                                style={{
                                    overscrollBehavior: 'contain',
                                    WebkitOverflowScrolling: 'touch'
                                }}
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

                            <form
                                onSubmit={handleSubmit}
                                className={`border-t p-3 ${panelBorderClass} ${shellClass}`}
                                style={isMobileViewport ? { paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' } : undefined}
                            >
                                <div className="relative">
                                    <label className="block">
                                        <span className="sr-only">输入消息</span>
                                        <textarea
                                            ref={textareaRef}
                                            rows={1}
                                            value={draft}
                                            onChange={(event) => setDraft(event.target.value)}
                                            onFocus={handleTextareaFocus}
                                            onKeyDown={handleTextareaKeyDown}
                                            placeholder={assistantConfig.inputPlaceholder}
                                            style={{
                                                minHeight: `${MIN_TEXTAREA_HEIGHT}px`,
                                                maxHeight: `${MAX_TEXTAREA_HEIGHT}px`
                                            }}
                                            className={`sg-scrollbar w-full resize-none overflow-y-auto rounded-[22px] border px-4 pt-[15px] pb-[15px] pr-[72px] text-sm leading-5 font-semibold outline-none backdrop-blur-xl ${textareaGlassClass}`}
                                        />
                                    </label>
                                    <button
                                        type="submit"
                                        disabled={sendDisabled}
                                        className={`absolute right-3 bottom-3 shrink-0 w-[42px] h-[42px] rounded-[14px] border flex items-center justify-center transition-transform backdrop-blur-xl ${panelBorderClass} ${
                                            sendDisabled
                                                ? 'bg-gray-300/80 text-gray-500 cursor-not-allowed'
                                                : isDarkMode
                                                    ? 'bg-[linear-gradient(180deg,rgba(255,215,0,0.9),rgba(255,215,0,0.74))] text-black hover:-translate-y-0.5'
                                                    : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.72))] text-[#111827] hover:-translate-y-0.5'
                                        }`}
                                    >
                                        <SendHorizontal size={18} />
                                    </button>
                                </div>
                            </form>
                        </motion.section>
                        <AnimatePresence>
                            {guardPromptOpen && (
                                <motion.div
                                    className="fixed inset-0 z-[96] flex items-center justify-center px-4"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    style={{ zIndex: assistantModalZ }}
                                >
                                    <div
                                        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
                                        onClick={closeGuardPrompt}
                                    />
                                    <motion.div
                                        role="dialog"
                                        aria-modal="true"
                                        aria-label="访客验证"
                                        initial={{ opacity: 0, y: 14, scale: 0.96 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.96 }}
                                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                                        className={`relative w-full max-w-sm overflow-hidden rounded-[28px] border backdrop-blur-2xl ${modalCardClass}`}
                                    >
                                        <div className={`flex items-start justify-between gap-3 border-b px-5 py-4 ${panelBorderClass}`}>
                                            <div className="space-y-1">
                                                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#3b82f6]">
                                                    访客验证
                                                </p>
                                                <h3 className="text-lg font-black">继续提问前，请先完成验证码</h3>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={closeGuardPrompt}
                                                className={`h-8 w-8 ${neutralIconButtonClass}`}
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                        <div className="space-y-4 px-5 py-5">
                                            <p className={`text-sm leading-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                访客模式下会限制提问频率和额度。当前请求触发了额外验证，完成后即可继续使用。
                                            </p>
                                            <div className="flex items-center gap-3">
                                                {guardCaptchaImage ? (
                                                    <img
                                                        src={guardCaptchaImage}
                                                        alt="guard captcha"
                                                        className={`h-14 w-32 rounded-[16px] border object-contain ${isDarkMode ? 'border-white/10 bg-white/90' : 'border-black/10 bg-white/92'}`}
                                                    />
                                                ) : (
                                                    <div className={`flex h-14 w-32 items-center justify-center rounded-[16px] border border-dashed text-xs font-bold ${
                                                        isDarkMode ? 'border-white/14 bg-white/[0.05] text-gray-300' : 'border-black/12 bg-white/65 text-gray-500'
                                                    }`}>
                                                        {guardCaptchaLoading ? '加载中...' : '验证码'}
                                                    </div>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => openGuardPrompt('')}
                                                    disabled={guardCaptchaLoading}
                                                    className={`rounded-full border px-3 py-2 text-xs font-bold ${neutralIconButtonClass}`}
                                                >
                                                    刷新
                                                </button>
                                            </div>
                                            <input
                                                type="text"
                                                value={guardCaptchaInput}
                                                onChange={(event) => setGuardCaptchaInput(event.target.value.trim().slice(0, 4))}
                                                placeholder="请输入验证码"
                                                className={`w-full rounded-[18px] border px-4 py-3 text-sm font-bold outline-none backdrop-blur-xl ${textareaGlassClass}`}
                                            />
                                            {guardError && (
                                                <div className="rounded-[16px] border border-[#ef4444]/30 bg-[#ef4444]/88 px-3 py-2 text-sm font-bold text-white backdrop-blur-xl">
                                                    {guardError}
                                                </div>
                                            )}
                                            <div className="flex items-center justify-end gap-3">
                                                <button
                                                    type="button"
                                                    onClick={closeGuardPrompt}
                                                    className={`px-4 py-2 rounded-full border text-sm font-bold ${neutralIconButtonClass}`}
                                                >
                                                    稍后再说
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleGuardVerify}
                                                    disabled={guardCaptchaLoading}
                                                    className={`px-4 py-2 rounded-full border text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60 ${isDarkMode ? 'border-white/12 bg-[linear-gradient(180deg,rgba(59,130,246,0.92),rgba(59,130,246,0.72))] text-white hover:bg-[#2563eb]' : 'border-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(219,234,254,0.92))] text-[#1d4ed8] hover:bg-white'}`}
                                                >
                                                    {guardCaptchaLoading ? '验证中...' : '完成验证'}
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            )}
                            {pendingDeleteSession && (
                                <motion.div
                                    className="fixed inset-0 z-[96] flex items-center justify-center px-4"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    style={{ zIndex: assistantModalZ }}
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
                                        className={`relative w-full max-w-sm overflow-hidden rounded-[28px] border backdrop-blur-2xl ${modalCardClass}`}
                                    >
                                        <div className={`flex items-start justify-between gap-3 border-b px-5 py-4 ${panelBorderClass}`}>
                                            <div className="space-y-1">
                                                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#FF0080]">
                                                    会话删除
                                                </p>
                                                <h3 className="text-lg font-black">{deleteDialog.title}</h3>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setPendingDeleteSession(null)}
                                                className={`h-8 w-8 ${neutralIconButtonClass}`}
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                        <div className="space-y-4 px-5 py-5">
                                            <div className={`rounded-2xl border px-4 py-3 backdrop-blur-xl ${modalInsetClass}`}>
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
                                                    className={`px-4 py-2 rounded-full border text-sm font-bold ${neutralIconButtonClass}`}
                                                >
                                                    {deleteDialog.cancelText}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={confirmDeleteSession}
                                                    className={`px-4 py-2 rounded-full border text-sm font-bold ${isDarkMode ? 'border-white/12 bg-[linear-gradient(180deg,rgba(239,68,68,0.95),rgba(220,38,38,0.84))] text-white hover:bg-[#dc2626]' : 'border-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(254,226,226,0.92))] text-[#b91c1c] hover:bg-white'}`}
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
            <AnimatePresence>
                {assistantNotice.visible && assistantNotice.message && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.98 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className={`fixed right-4 md:right-6 w-[min(360px,calc(100vw-32px))] rounded-[24px] border px-4 py-3 backdrop-blur-2xl ${
                            assistantNotice.tone === 'error'
                                ? (isDarkMode
                                    ? 'border-rose-400/30 bg-[rgba(127,29,29,0.88)] text-white'
                                    : 'border-rose-200 bg-[rgba(255,241,242,0.96)] text-rose-700')
                                : assistantNotice.tone === 'success'
                                    ? (isDarkMode
                                        ? 'border-emerald-400/30 bg-[rgba(6,78,59,0.88)] text-white'
                                        : 'border-emerald-200 bg-[rgba(236,253,245,0.96)] text-emerald-700')
                                    : (isDarkMode
                                        ? 'border-amber-400/30 bg-[rgba(120,53,15,0.88)] text-white'
                                        : 'border-amber-200 bg-[rgba(255,251,235,0.96)] text-amber-700')
                        }`}
                        style={{ zIndex: assistantNoticeZ, bottom: isOpen ? 24 : 96 }}
                    >
                        <div className="flex items-start gap-3">
                            <div className="pt-0.5">
                                {assistantNotice.tone === 'error' ? <X size={16} /> : <Bot size={16} />}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold leading-6">{assistantNotice.message}</p>
                                <p className="text-[11px] opacity-80">这是站内提示，不会打断你当前操作。</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setAssistantNotice((prev) => ({ ...prev, visible: false }))}
                                className="rounded-full border border-current/15 px-2 py-1 text-[11px] font-bold opacity-80 transition hover:opacity-100"
                            >
                                关闭
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                type="button"
                aria-label={isOpen ? '三桂博客AI助理已打开' : '打开三桂博客AI助理'}
                onClick={handleLauncherToggle}
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className={`fixed z-[89] right-4 bottom-6 md:right-6 md:bottom-6 isolate border ${launcherGlowShapeClass} flex items-center ${launcherOverflowClass} transition-colors backdrop-blur-2xl ${launcherLayoutClass} ${
                    isDarkMode
                        ? 'border-white/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.86),rgba(15,23,42,0.76))] text-white hover:bg-[rgba(15,23,42,0.92)]'
                        : 'border-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(248,250,252,0.72))] text-black hover:bg-white/85'
                }`}
                style={{
                    zIndex: assistantLauncherZ,
                    boxShadow: isDarkMode
                        ? '0 16px 36px rgba(2,6,23,0.32), inset 0 1px 0 rgba(255,255,255,0.10)'
                        : '0 16px 36px rgba(15,23,42,0.12), inset 0 1px 0 rgba(255,255,255,0.58)'
                }}
            >
                <span className="pointer-events-none absolute inset-[-14px] opacity-100">
                    <motion.span
                        aria-hidden="true"
                        className={`absolute inset-[10px] ${launcherGlowShapeClass} blur-[12px] ${
                            isDarkMode
                                ? 'bg-[radial-gradient(circle,_rgba(148,163,184,0.18),_transparent_66%)]'
                                : 'bg-[radial-gradient(circle,_rgba(148,163,184,0.12),_transparent_66%)]'
                        }`}
                        animate={{ scale: [0.94, 1.04, 0.94], opacity: [0.45, 0.8, 0.45] }}
                        transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
                    />
                </span>
                <span className={`pointer-events-none absolute inset-0 ${launcherGlowInnerShapeClass} opacity-90`}>
                    <motion.span
                        aria-hidden="true"
                        className={`absolute inset-[1px] ${launcherGlowShapeClass} ${
                            isDarkMode
                                ? 'border border-white/12'
                                : 'border border-white/60'
                        }`}
                        animate={{
                            boxShadow: isDarkMode
                                ? [
                                    'inset 0 0 0 rgba(255,255,255,0), 0 0 0 rgba(255,255,255,0)',
                                    'inset 0 0 18px rgba(255,255,255,0.08), 0 0 18px rgba(255,255,255,0.08)',
                                    'inset 0 0 0 rgba(255,255,255,0), 0 0 0 rgba(255,255,255,0)'
                                ]
                                : [
                                    'inset 0 0 0 rgba(255,255,255,0), 0 0 0 rgba(255,255,255,0)',
                                    'inset 0 0 16px rgba(255,255,255,0.18), 0 0 14px rgba(255,255,255,0.14)',
                                    'inset 0 0 0 rgba(255,255,255,0), 0 0 0 rgba(255,255,255,0)'
                                ],
                            opacity: [0.55, 0.9, 0.55]
                        }}
                        transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <motion.span
                        aria-hidden="true"
                        className={`absolute inset-[3px] ${launcherGlowInnerShapeClass} ${
                            isDarkMode
                                ? 'bg-[linear-gradient(110deg,transparent_0%,transparent_34%,rgba(255,255,255,0.12)_48%,transparent_62%,transparent_100%)]'
                                : 'bg-[linear-gradient(110deg,transparent_0%,transparent_34%,rgba(255,255,255,0.52)_48%,transparent_62%,transparent_100%)]'
                        }`}
                        animate={{ x: ['-130%', '155%'], opacity: [0, 0.9, 0] }}
                        transition={{ duration: 5.6, repeat: Infinity, repeatDelay: 1.8, ease: 'easeInOut' }}
                    />
                    <span
                        className={`absolute inset-0 ${launcherGlowInnerShapeClass} ${
                            isDarkMode
                                ? 'bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.10),_transparent_42%),linear-gradient(135deg,rgba(148,163,184,0.08),transparent_48%,rgba(255,255,255,0.06))]'
                                : 'bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.46),_transparent_42%),linear-gradient(135deg,rgba(226,232,240,0.18),transparent_48%,rgba(255,255,255,0.08))]'
                        }`}
                    />
                    {isDarkMode ? (
                        <motion.span
                            aria-hidden="true"
                            className={`absolute inset-[2px] ${launcherGlowInnerShapeClass} border border-white/12`}
                            animate={{
                                opacity: [0.18, 0.42, 0.18],
                                boxShadow: [
                                    '0 0 0 rgba(255,255,255,0)',
                                    '0 0 14px rgba(255,255,255,0.12)',
                                    '0 0 0 rgba(255,255,255,0)'
                                ]
                            }}
                            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                        />
                    ) : (
                        <motion.span
                            aria-hidden="true"
                            className="absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                            animate={{ x: ['-120%', '360%'], opacity: [0, 1, 0] }}
                            transition={{ duration: 4.4, repeat: Infinity, repeatDelay: 1.6, ease: 'easeInOut' }}
                        />
                    )}
                    <motion.span
                        aria-hidden="true"
                        className={`absolute inset-x-[10px] top-[2px] h-[2px] rounded-full ${
                            isDarkMode ? 'bg-white/40' : 'bg-white/55'
                        }`}
                        animate={{ opacity: [0.25, 0.7, 0.25], scaleX: [0.82, 1, 0.82] }}
                        transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                </span>
                <span className={`relative flex items-center justify-center w-11 h-11 rounded-[18px] border overflow-visible backdrop-blur-xl ${isDarkMode ? 'border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.06))] text-white' : 'border-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,255,255,0.68))] text-[#111827]'}`}>
                    <motion.span
                        aria-hidden="true"
                        className="absolute inset-[-7px] rounded-[22px] border border-white/18"
                        animate={{
                            opacity: [0.22, 0.48, 0.22],
                            boxShadow: [
                                '0 0 0 rgba(255,255,255,0)',
                                '0 0 14px rgba(255,255,255,0.12)',
                                '0 0 0 rgba(255,255,255,0)'
                            ]
                        }}
                        transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <motion.span
                        aria-hidden="true"
                        className="absolute inset-[-11px] rounded-[26px] border border-white/10"
                        animate={{ opacity: [0.12, 0.38, 0.12], scale: [0.97, 1.05, 0.97] }}
                        transition={{ duration: 4.6, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
                    />
                    <motion.span
                        aria-hidden="true"
                        className="absolute left-1/2 top-1/2 h-[5px] w-[5px] rounded-full bg-white/80 shadow-[0_0_8px_rgba(255,255,255,0.45)]"
                        animate={{ rotate: 360, opacity: [0.45, 1, 0.45] }}
                        transition={{ rotate: { duration: 6.4, repeat: Infinity, ease: 'linear' }, opacity: { duration: 2.8, repeat: Infinity, ease: 'easeInOut' } }}
                        style={{ transformOrigin: '0 -18px' }}
                    />
                    <motion.span
                        aria-hidden="true"
                        className="absolute left-1/2 top-1/2 h-[4px] w-[4px] rounded-full bg-white/55 shadow-[0_0_8px_rgba(255,255,255,0.26)]"
                        animate={{ rotate: -360, opacity: [0.3, 0.9, 0.3] }}
                        transition={{ rotate: { duration: 7.6, repeat: Infinity, ease: 'linear' }, opacity: { duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 0.4 } }}
                        style={{ transformOrigin: '0 16px' }}
                    />
                    <motion.span
                        aria-hidden="true"
                        className="absolute inset-[-4px] rounded-[20px] border border-white/16"
                        animate={{ scale: [1, 1.12, 1], opacity: [0.3, 0, 0.3] }}
                        transition={{ duration: 3.1, repeat: Infinity, ease: 'easeOut' }}
                    />
                    <motion.span
                        aria-hidden="true"
                        className="absolute inset-[-8px] rounded-[24px] border border-white/12"
                        animate={{ scale: [0.98, 1.18, 0.98], opacity: [0, 0.42, 0] }}
                        transition={{ duration: 3.1, repeat: Infinity, ease: 'easeOut', delay: 0.85 }}
                    />
                    <motion.span
                        aria-hidden="true"
                        className="absolute inset-x-[7px] top-[7px] h-[2px] rounded-full bg-white/35"
                        animate={{ opacity: [0.12, 0.52, 0.12], scaleX: [0.78, 1, 0.78] }}
                        transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <img
                        src={assistantConfig.logoPath}
                        alt={assistantConfig.title}
                        className="relative z-[2] h-full w-full object-cover rounded-[16px]"
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
                    <motion.span
                        className={`absolute -top-1 -right-1 z-[3] w-3 h-3 rounded-full border ${isDarkMode ? 'bg-[#86efac] border-white/16' : 'bg-[#10b981] border-white/60'}`}
                        animate={{ scale: [1, 1.22, 1], opacity: [1, 0.78, 1] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                    />
                </span>
                {!isMobileViewport && <span className="relative text-left">
                    <span className={`block text-[10px] font-black uppercase tracking-[0.28em] ${
                        isDarkMode ? 'text-white/70' : 'text-slate-500'
                    }`}>
                        {launcherBadge.eyebrow}
                    </span>
                    <span className="mt-0.5 block text-sm font-black leading-5">
                        {launcherBadge.label}
                    </span>
                </span>}
            </motion.button>
        </div>
    );
    return portalTarget ? createPortal(assistantLayer, portalTarget) : assistantLayer;
}

