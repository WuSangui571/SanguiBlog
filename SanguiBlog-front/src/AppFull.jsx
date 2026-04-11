import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { useBlog } from "./hooks/useBlogData";
import {
    recordPageView,
    fetchGames,
    fetchGameDetail,
    fetchArchiveSummary,
    fetchArchiveMonth,
    fetchMyPermissions,
    fetchUnreadNotifications,
    fetchNotificationHistory,
    backfillNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    fetchClientIp
} from "./api";
import { LayoutOffsetContext } from "./contexts/LayoutOffsetContext.jsx";
import { PermissionContext } from "./contexts/PermissionContext.jsx";
import BackgroundEasterEggs from "./appfull/ui/BackgroundEasterEggs.jsx";
import Navigation, { NAVIGATION_HEIGHT } from "./appfull/ui/Navigation.jsx";
import EmergencyBar from "./appfull/ui/EmergencyBar.jsx";
import ErrorToast from "./appfull/ui/ErrorToast.jsx";
import SessionExpiredModal from "./appfull/ui/SessionExpiredModal.jsx";
import ClickRipple from "./appfull/ui/ClickRipple.jsx";
import ScrollToTop from "./appfull/ui/ScrollToTop.jsx";
import AiAssistantWidget from "./appfull/ui/AiAssistantWidget.jsx";
import GlassPopupToast, { getGlassPopupToastTop } from "./appfull/ui/GlassPopupToast.jsx";
import { shouldShowAiAssistant } from "./appfull/aiAssistantVisibility.js";
import { buildAiCurrentPageContext } from "./appfull/aiCurrentPageContext.js";
import { buildAssetUrl } from "./utils/asset.js";
import logger from "./utils/logger.js";
import HomeView from "./appfull/public/HomeView.jsx";
import ArticleDetail from "./appfull/public/ArticleDetail.jsx";
import ArchiveView from "./appfull/public/ArchiveView.jsx";
import AboutView from "./appfull/public/AboutView.jsx";
import LoginView from "./appfull/public/LoginView.jsx";
import RegisterView from "./appfull/public/RegisterView.jsx";
import {
    THEME,
    CATEGORY_TREE,
    SITE_STATS,
    DEFAULT_PAGE_SIZE,
    PAGE_SIZE_OPTIONS,
    PAGE_SIZE_STORAGE_KEY,
    DEFAULT_HERO_TAGLINE,
    DEFAULT_HOME_QUOTE,
    THEME_SPREE_THRESHOLD,
    THEME_SPREE_INTERVAL,
    THEME_SPREE_DURATION,
    THEME_SPREE_PALETTES,
    THEME_LOCK_DURATION,
    PUBLIC_IP_ENDPOINT,
    ENABLE_PUBLIC_IP_FALLBACK,
    randomAngle,
    randomSprayPolygon,
    createTendrils,
    getReferrerMeta,
    getGeoHint,
    claimAutoPageView,
    resetAutoPageViewGuard
} from "./appfull/shared.js";
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
const BROADCAST_SESSION_KEY = 'sangui-broadcast-dismissed';
const LazyAdminPanel = lazy(() =>
    import("./appfull/AdminPanel.jsx").then((module) => ({ default: module.AdminPanel }))
);
export default function SanGuiBlog({ initialView = 'home', initialArticleId = null, initialGameId = null, onViewChange }) {
    const {
        meta,
        metaLoaded,
        categories,
        tags,
        postsPage,
        postsLoading: postsLoading,
        postsError: postsError,
        article,
        articleState,
        comments,
        recentComments,
        about,
        loadMeta,
        loadPosts,
        loadArticle,
        loadAbout,
        submitComment,
        removeComment,
        editComment,
        doLogin,
        logout,
        user: blogUser
    } = useBlog();
    const navigate = useNavigate();
    const [view, setView] = useState(initialView);
    const [user, setUser] = useState(null);
    const [articleId, setArticleId] = useState(initialArticleId);
    const [gameId, setGameId] = useState(initialGameId);
    const [gameList, setGameList] = useState([]);
    const [gameListLoading, setGameListLoading] = useState(false);
    const [gameListError, setGameListError] = useState('');
    const [gameDetail, setGameDetail] = useState(null);
    const [gameDetailLoading, setGameDetailLoading] = useState(false);
    const [gameDetailError, setGameDetailError] = useState('');
    const [activeParent, setActiveParent] = useState("all");
    const [activeSub, setActiveSub] = useState("all");
    const [homePageSize, setHomePageSize] = useState(() => {
        if (typeof window === 'undefined') return DEFAULT_PAGE_SIZE;
        const saved = Number(window.localStorage.getItem(PAGE_SIZE_STORAGE_KEY));
        return PAGE_SIZE_OPTIONS.includes(saved) ? saved : DEFAULT_PAGE_SIZE;
    });
    const [menuOpen, setMenuOpen] = useState(false);
    const [commentNotifications, setCommentNotifications] = useState([]);
    const [commentNotificationTotal, setCommentNotificationTotal] = useState(0); // total history
    const [commentNotificationUnread, setCommentNotificationUnread] = useState(0);
    const [commentNotificationOpen, setCommentNotificationOpen] = useState(false);
    const [commentNotificationLoading, setCommentNotificationLoading] = useState(false);
    const commentNotificationTimerRef = useRef(null);
    const [commentAnchorId, setCommentAnchorId] = useState(null);
    const [notificationPage, setNotificationPage] = useState(1);
    const NOTIFICATION_PAGE_SIZE = 4;
    const [notificationCanBackfill, setNotificationCanBackfill] = useState(true);
    const handleToggleMenu = useCallback(() => {
        setMenuOpen((prev) => {
            const next = !prev;
            if (!prev) {
                setCommentNotificationOpen(false);
            }
            return next;
        });
    }, []);
    const handleCloseMenu = useCallback(() => setMenuOpen(false), []);
    useEffect(() => {
        setMenuOpen(false);
        setCommentNotificationOpen(false);
    }, [view]);
    const [notification, setNotification] = useState({
        isOpen: false,
        content: "系统将于今晚 00:00 停机维护",
        style: "ALERT"
    });
    const getBroadcastDismissed = useCallback(() => {
        if (typeof window === 'undefined') return false;
        try {
            return window.sessionStorage.getItem(BROADCAST_SESSION_KEY) === 'true';
        } catch {
            return false;
        }
    }, []);
    const markBroadcastDismissed = useCallback(() => {
        if (typeof window === 'undefined') return;
        try {
            window.sessionStorage.setItem(BROADCAST_SESSION_KEY, 'true');
        } catch {
            // ignore
        }
    }, []);
    const [emergencyHeight, setEmergencyHeight] = useState(0);
    const [error, setError] = useState(null);
    const sessionExpiredRef = useRef(false);
    const [sessionExpired, setSessionExpired] = useState({ open: false, reason: '' });
    const [archiveSummary, setArchiveSummary] = useState(null);
    const [archiveMonthMap, setArchiveMonthMap] = useState({});
    const [archiveLoading, setArchiveLoading] = useState(false);
    const [archiveError, setArchiveError] = useState('');
    const lastViewRef = useRef(initialView);
    const [articleBackTarget, setArticleBackTarget] = useState(initialView === 'article' ? 'home' : initialView || 'home');
    const [backgroundEnabled, setBackgroundEnabled] = useState(() => {
        if (typeof window === 'undefined') return false;
        const stored = window.localStorage.getItem('sg_background_enabled');
        if (stored === null) return false;
        return stored !== 'false';
    });

    // 浏览器刷新时强制回到顶部，关闭自动滚动恢复
    useEffect(() => {
        if (typeof window === 'undefined') return;
        let prev = null;
        if ('scrollRestoration' in window.history) {
            prev = window.history.scrollRestoration;
            window.history.scrollRestoration = 'manual';
        }
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        return () => {
            if (prev !== null) {
                window.history.scrollRestoration = prev;
            }
        };
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem('sg_background_enabled', String(backgroundEnabled));
    }, [backgroundEnabled]);
    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(homePageSize));
    }, [homePageSize]);

    const applyDocumentMeta = useCallback((title, description) => {
        if (typeof document === 'undefined') return;
        if (title) {
            document.title = title;
        }
        if (typeof description === 'string') {
            let tag = document.querySelector('meta[name="description"]');
            if (!tag) {
                tag = document.createElement('meta');
                tag.setAttribute('name', 'description');
                document.head.appendChild(tag);
            }
            tag.setAttribute('content', description);
        }
    }, []);

    useEffect(() => {
        const brand = meta?.footer?.brand || '三桂博客';
        const defaultDesc = meta?.heroTagline || meta?.homeQuote || '';
        let title = brand;
        let description = defaultDesc;

        if (view === 'home') {
            title = brand;
        } else if (view === 'archive') {
            title = `归档｜${brand}`;
        } else if (view === 'games') {
            title = `工具｜${brand}`;
        } else if (view === 'game') {
            const currentGame = gameDetail || gameList.find((item) => item?.id === gameId);
            if (currentGame?.title) {
                title = `工具：${currentGame.title}｜${brand}`;
                if (currentGame.description) {
                    description = currentGame.description;
                }
            } else {
                title = `工具｜${brand}`;
            }
        } else if (view === 'about') {
            title = `关于｜${brand}`;
        } else if (view === 'login') {
            title = `登录｜${brand}`;
        } else if (view === 'register') {
            title = `注册｜${brand}`;
        } else if (view === 'admin') {
            title = `后台管理｜${brand}`;
        } else if (view === 'article') {
            const articleTitle = article?.summary?.title;
            title = article?.metaTitle || (articleTitle ? `${articleTitle}｜${brand}` : brand);
            description = article?.metaDescription
                || article?.summary?.excerpt
                || defaultDesc;
        }

        applyDocumentMeta(title, description || '');
    }, [view, meta, article, gameDetail, gameId, gameList, applyDocumentMeta]);
    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('sangui-theme') === 'dark';
        }
        return false;
    }); // Persisted dark mode state
    const [themeBlast, setThemeBlast] = useState({
        active: false,
        x: 0,
        y: 0,
        toDark: false,
        swirl: randomAngle(),
        id: 0,
        mask: randomSprayPolygon(),
        tendrils: []
    });
    const themeBlastTimers = useRef([]);
    const [themeOverdrive, setThemeOverdrive] = useState({
        active: false,
        palette: THEME_SPREE_PALETTES[0]
    });
    const [themeOverdriveNotice, setThemeOverdriveNotice] = useState(false);
    const themeComboRef = useRef(0);
    const lastThemeToggleRef = useRef(0);
    const themeOverdriveTimerRef = useRef(null);
    const themeNoticeTimerRef = useRef(null);
    const themeLockTimerRef = useRef(null);
    const [themeOverdriveLock, setThemeOverdriveLock] = useState(false);
    const [themeOverdriveMessage, setThemeOverdriveMessage] = useState('');
    useEffect(() => () => {
        themeBlastTimers.current.forEach((timer) => clearTimeout(timer));
        themeBlastTimers.current = [];
        if (themeOverdriveTimerRef.current) clearTimeout(themeOverdriveTimerRef.current);
        if (themeNoticeTimerRef.current) clearTimeout(themeNoticeTimerRef.current);
        if (themeLockTimerRef.current) clearTimeout(themeLockTimerRef.current);
    }, []);
    const showThemeMessage = useCallback((text, duration = 2000) => {
        setThemeOverdriveMessage(text);
        setThemeOverdriveNotice(true);
        if (themeNoticeTimerRef.current) clearTimeout(themeNoticeTimerRef.current);
        themeNoticeTimerRef.current = setTimeout(() => setThemeOverdriveNotice(false), duration);
    }, []);
    const triggerThemeOverdrive = useCallback(() => {
        const palette = THEME_SPREE_PALETTES[Math.floor(Math.random() * THEME_SPREE_PALETTES.length)];
        setThemeOverdrive({ active: true, palette });
        showThemeMessage('超频模式已开启', THEME_SPREE_DURATION);
        setThemeOverdriveLock(true);
        themeComboRef.current = 0;
        if (themeOverdriveTimerRef.current) clearTimeout(themeOverdriveTimerRef.current);
        if (themeLockTimerRef.current) clearTimeout(themeLockTimerRef.current);
        themeOverdriveTimerRef.current = setTimeout(() => {
            setThemeOverdrive((prev) => ({ ...prev, active: false }));
        }, THEME_SPREE_DURATION);
        themeLockTimerRef.current = setTimeout(() => {
            setThemeOverdriveLock(false);
        }, THEME_LOCK_DURATION);
    }, [showThemeMessage]);
    const handleThemeToggle = useCallback((event) => {
        if (themeOverdriveLock) {
            if (!themeOverdriveNotice || themeOverdriveMessage !== '超频模式已开启') {
                showThemeMessage('冷却中…请稍候', 2000);
            }
            return;
        }
        const rect = event?.currentTarget?.getBoundingClientRect?.();
        const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
        const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
        const targetMode = !isDarkMode;
        const blastId = Date.now();
        setThemeBlast({
            active: true,
            x,
            y,
            toDark: targetMode,
            swirl: randomAngle(),
            id: blastId,
            mask: randomSprayPolygon(),
            tendrils: createTendrils(targetMode)
        });
        themeBlastTimers.current.forEach((timer) => clearTimeout(timer));
        themeBlastTimers.current = [];
        themeBlastTimers.current.push(setTimeout(() => {
            setIsDarkMode((prev) => {
                const next = !prev;
                if (typeof window !== 'undefined') {
                    localStorage.setItem('sangui-theme', next ? 'dark' : 'light');
                }
                return next;
            });
        }, 320));
        themeBlastTimers.current.push(setTimeout(() => {
            setThemeBlast((prev) => (prev.id === blastId ? { ...prev, active: false } : prev));
        }, 950));
        const now = Date.now();
        if (now - lastThemeToggleRef.current < THEME_SPREE_INTERVAL) {
            themeComboRef.current += 1;
        } else {
            themeComboRef.current = 1;
        }
        lastThemeToggleRef.current = now;
        if (themeComboRef.current >= THEME_SPREE_THRESHOLD) {
            themeComboRef.current = 0;
            triggerThemeOverdrive();
        }
    }, [isDarkMode, triggerThemeOverdrive, themeOverdriveLock, showThemeMessage, themeOverdriveMessage, themeOverdriveNotice]);
    const [permissionState, setPermissionState] = useState({ permissions: [], loading: false, error: '' });
    const lastRecordedArticleRef = useRef(null);
    const clientIpRef = useRef(
        typeof window !== 'undefined' && window.__SG_CLIENT_IP__ ? window.__SG_CLIENT_IP__ : ''
    );
    const scrollToPostsTop = useCallback(() => {
        if (typeof window === 'undefined') return;
        const element = document.getElementById('home-status-strip') || document.getElementById('posts');
        if (!element) return;
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }, []);

    const loadArchiveSummary = useCallback(async () => {
        setArchiveLoading(true);
        setArchiveError('');
        try {
            const res = await fetchArchiveSummary();
            const data = res?.data || res;
            setArchiveSummary(data || null);
            setArchiveMonthMap({});
        } catch (err) {
            logger.warn('load archive summary failed', err);
            setArchiveError(err?.message || '无法加载归档摘要');
        } finally {
            setArchiveLoading(false);
        }
    }, []);

    const loadArchiveMonth = useCallback(async (year, month) => {
        if (!year || !month) return;
        const key = `${year}-${month}`;
        setArchiveMonthMap((prev) => {
            const existing = prev[key];
            if (existing?.loading || existing?.loaded) return prev;
            return {
                ...prev,
                [key]: {
                    ...existing,
                    loading: true,
                    loaded: false,
                    error: ''
                }
            };
        });
        try {
            const res = await fetchArchiveMonth(year, month, { page: 1, size: 200 });
            const data = res?.data || res;
            const records = data?.records || data || [];
            setArchiveMonthMap((prev) => ({
                ...prev,
                [key]: {
                    loading: false,
                    loaded: true,
                    error: '',
                    records,
                    total: data?.total ?? records.length
                }
            }));
        } catch (err) {
            logger.warn('load archive month failed', err);
            setArchiveMonthMap((prev) => ({
                ...prev,
                [key]: {
                    ...prev[key],
                    loading: false,
                    loaded: false,
                    error: err?.message || '加载归档月份失败'
                }
            }));
        }
    }, []);

    const handleArchiveArticleOpen = useCallback((postId) => {
        if (!postId) return;
        setArticleId(postId);
        setView('article');
    }, [setArticleId, setView]);

    const loadGameList = useCallback(async () => {
        setGameListLoading(true);
        setGameListError('');
        try {
            const res = await fetchGames();
            const data = res?.data || res;
            const list = Array.isArray(data) ? data : (data?.records || []);
            const sorted = [...list].sort((a, b) => {
                const orderA = Number(a?.sortOrder ?? 0);
                const orderB = Number(b?.sortOrder ?? 0);
                if (orderA !== orderB) return orderB - orderA;
                const timeA = a?.updatedAt ? new Date(a.updatedAt).getTime() : 0;
                const timeB = b?.updatedAt ? new Date(b.updatedAt).getTime() : 0;
                if (timeA !== timeB) return timeB - timeA;
                const idA = Number(a?.id ?? 0);
                const idB = Number(b?.id ?? 0);
                return idB - idA;
            });
            setGameList(sorted);
        } catch (err) {
            logger.warn('load games failed', err);
            setGameListError(err?.message || '加载页面失败');
        } finally {
            setGameListLoading(false);
        }
    }, []);

    const loadGameDetail = useCallback(async (id) => {
        if (!id) return;
        setGameDetail(null);
        setGameDetailError('');
        setGameDetailLoading(true);
        try {
            const res = await fetchGameDetail(id);
            const data = res?.data || res;
            setGameDetail(data);
        } catch (err) {
            logger.warn('load game detail failed', err);
            setGameDetailError(err?.message || '无法加载页面');
        } finally {
            setGameDetailLoading(false);
        }
    }, []);
    const hasPermission = useCallback((code) => {
        if (!code) return true;
        if (user?.role === 'SUPER_ADMIN') return true;
        return permissionState.permissions.includes(code);
    }, [permissionState.permissions, user]);

    const permissionContextValue = useMemo(() => ({
        permissions: permissionState.permissions,
        loading: permissionState.loading,
        error: permissionState.error,
        hasPermission
    }), [permissionState, hasPermission]);

    const layoutContextValue = useMemo(() => ({
        headerHeight: NAVIGATION_HEIGHT + emergencyHeight,
        navHeight: NAVIGATION_HEIGHT,
        emergencyHeight
    }), [emergencyHeight]);

    useEffect(() => {
        if (typeof window === 'undefined' || clientIpRef.current) return;
        let cancelled = false;

        const isLoopbackIp = (ip = '') => {
            const normalized = ip.trim().toLowerCase();
            return normalized === '127.0.0.1'
                || normalized === '::1'
                || normalized === '0:0:0:0:0:0:0:1'
                || normalized.startsWith('::ffff:127.');
        };

        const assignClientIp = (ip) => {
            if (cancelled || !ip || isLoopbackIp(ip)) return false;
            clientIpRef.current = ip;
            if (typeof window !== 'undefined') {
                window.__SG_CLIENT_IP__ = ip;
            }
            return true;
        };

        const fetchWithTimeout = async (url, timeoutMs = 1500) => {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeoutMs);
            try {
                const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
                if (!res.ok) return null;
                const data = await res.json().catch(() => null);
                return data;
            } catch {
                return null;
            } finally {
                clearTimeout(timer);
            }
        };

        const loadClientIp = async () => {
            try {
                // 1) 优先尝试后端同源接口，避免外网被拦截
                const backendResp = await fetchClientIp();
                const backendIp = backendResp?.data?.ip || backendResp?.ip || null;
                if (assignClientIp(backendIp)) return;
            } catch {
                // 忽略后端 IP 获取失败，继续尝试兜底逻辑
            }

            if (!ENABLE_PUBLIC_IP_FALLBACK) return;
            const publicResp = await fetchWithTimeout(PUBLIC_IP_ENDPOINT);
            const publicIp = publicResp?.ip;
            assignClientIp(publicIp);
        };

        loadClientIp();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (blogUser) setUser(blogUser);
    }, [blogUser]);

    const triggerSessionExpired = useCallback((detail = {}) => {
        if (sessionExpiredRef.current) return;
        const hasToken = typeof window !== 'undefined' && localStorage.getItem('sg_token');
        const hasSession = Boolean(user || blogUser || hasToken);
        if (!hasSession) return;
        sessionExpiredRef.current = true;
        logout && logout();
        setUser(null);
        setSessionExpired({
            open: true,
            reason: detail?.message || detail?.reason || ''
        });
    }, [logout, user, blogUser]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handler = (event) => triggerSessionExpired(event?.detail || {});
        window.addEventListener('sg-auth-expired', handler);
        return () => window.removeEventListener('sg-auth-expired', handler);
    }, [triggerSessionExpired]);

    useEffect(() => {
        if (user) {
            sessionExpiredRef.current = false;
            if (sessionExpired.open) {
                setSessionExpired({ open: false, reason: '' });
            }
        }
    }, [user, sessionExpired.open]);

    const sendPageView = useCallback((payload = {}) => {
        const ip = clientIpRef.current;
        const refMeta = getReferrerMeta();
        const body = { ...refMeta, ...payload };
        if (ip) {
            body.clientIp = ip;
        }
        recordPageView(body);
    }, []);

    const homePostsLoadingSeenRef = useRef(false);
    useEffect(() => {
        if (view !== 'home') {
            homePostsLoadingSeenRef.current = false;
            return;
        }
        if (postsLoading) {
            homePostsLoadingSeenRef.current = true;
        }
    }, [view, postsLoading]);

    useEffect(() => {
        if (view !== 'home') return;
        if (!homePostsLoadingSeenRef.current) return;
        if (postsLoading) return;

        const current = Math.max(1, Number(postsPage?.page || 1));
        const size = Math.max(1, Number(homePageSize || DEFAULT_PAGE_SIZE));
        const total = Number(postsPage?.total ?? 0) || 0;
        const totalPages = Math.max(1, Math.ceil(total / size));
        const pageTitle = `home(${current}/${totalPages})`;
        const key = `home-${current}-${totalPages}-size-${size}`;

        if (claimAutoPageView(key)) {
            sendPageView({
                pageTitle,
                geo: getGeoHint()
            });
        }
    }, [view, postsLoading, postsPage?.page, postsPage?.total, homePageSize, sendPageView]);

    useEffect(() => {
        if (!user) {
            setPermissionState({ permissions: [], loading: false, error: '' });
            return;
        }
        let active = true;
        setPermissionState((prev) => ({ ...prev, loading: true, error: '' }));
        fetchMyPermissions()
            .then((res) => {
                if (!active) return;
                const data = res.data || res || [];
                setPermissionState({ permissions: data, loading: false, error: '' });
            })
            .catch((err) => {
                if (!active) return;
                setPermissionState({ permissions: [], loading: false, error: err.message || '获取权限失败' });
                if (err?.status === 401 || err?.status === 403) {
                    triggerSessionExpired({ reason: 'permissions', message: err.message });
                }
            });
        return () => {
            active = false;
        };
    }, [user, triggerSessionExpired]);

    const loadUnreadNotifications = useCallback(async () => {
        if (!user) return;
        try {
            const res = await fetchUnreadNotifications(1); // 仅用于计数
            const payload = res.data || res || {};
            const total = typeof payload.total === 'number' ? payload.total : 0;
            setCommentNotificationUnread(total);
        } catch (e) {
            logger.warn('load unread notifications failed', e);
        }
    }, [user]);

    const normalizeAvatarPath = useCallback((path) => {
        if (!path) return null;
        const trimmed = path.trim();
        if (!trimmed) return null;
        if (/^https?:\/\//i.test(trimmed)) return trimmed;
        if (trimmed.startsWith("/uploads/avatar/") || trimmed.startsWith("uploads/avatar/")) {
            return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
        }
        if (trimmed.startsWith("/avatar/") || trimmed.startsWith("avatar/")) {
            const name = trimmed.replace(/^\/?avatar\//, "");
            return `/uploads/avatar/${name}`;
        }
        return `/uploads/avatar/${trimmed.replace(/^\/+/, "")}`;
    }, []);

    const loadNotificationHistory = useCallback(async (page = 1, append = false) => {
        if (!user) return;
        setCommentNotificationLoading(true);
        try {
            const res = await fetchNotificationHistory(page, NOTIFICATION_PAGE_SIZE);
            const payload = res.data || res || {};
            const items = Array.isArray(payload.items) ? payload.items : [];
            const total = typeof payload.total === 'number' ? payload.total : items.length;
            const normalizedItems = items.map((item) => ({
                ...item,
                avatar: normalizeAvatarPath(item.avatar),
            }));
            setCommentNotificationTotal(total);
            setNotificationPage(page);
            setNotificationCanBackfill(total === 0); // 如果总数为0，允许补全；补全后会刷新
            setCommentNotifications((prev) => append ? [...prev, ...normalizedItems] : normalizedItems);
        } catch (e) {
            logger.warn('load notification history failed', e);
        } finally {
            setCommentNotificationLoading(false);
        }
    }, [user, normalizeAvatarPath]);

    useEffect(() => {
        if (commentNotificationTimerRef.current) {
            clearInterval(commentNotificationTimerRef.current);
            commentNotificationTimerRef.current = null;
        }
        if (!user) {
            setCommentNotifications([]);
            setCommentNotificationTotal(0);
            setCommentNotificationUnread(0);
            setCommentNotificationOpen(false);
            setCommentNotificationLoading(false);
            return;
        }
        loadUnreadNotifications();
        loadNotificationHistory(1, false);
        commentNotificationTimerRef.current = setInterval(() => {
            loadUnreadNotifications();
        }, 60000);
        return () => {
            if (commentNotificationTimerRef.current) {
                clearInterval(commentNotificationTimerRef.current);
                commentNotificationTimerRef.current = null;
            }
        };
    }, [user, loadUnreadNotifications, loadNotificationHistory]);

    const handleNotificationToggle = useCallback(() => {
        if (!user) {
            setView('login');
            return;
        }
        setCommentNotificationOpen((prev) => {
            const next = !prev;
            if (next && commentNotifications.length === 0) {
                loadNotificationHistory(1, false);
            }
            return next;
        });
    }, [user, setView, commentNotifications.length, loadNotificationHistory]);

    const handleNotificationClick = useCallback(async (notificationItem) => {
        if (!notificationItem) return;
        setCommentNotificationOpen(false);
        setCommentNotifications((prev) =>
            prev.map((n) => n.id === notificationItem.id ? { ...n, read: true } : n)
        );
        if (!notificationItem.read) {
            setCommentNotificationUnread((prev) => Math.max(0, prev - 1));
        }
        if (notificationItem.commentId) {
            setCommentAnchorId(notificationItem.commentId);
        }
        try {
            await markNotificationRead(notificationItem.id);
        } catch (err) {
            logger.warn('mark notification read failed', err);
        }
        if (notificationItem.postId) {
            setArticleId(notificationItem.postId);
            setView('article');
        }
    }, [setArticleId, setView]);

    const handleNotificationMarkAll = useCallback(async () => {
        setCommentNotificationOpen(false);
        setCommentNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setCommentNotificationUnread(0);
        try {
            await markAllNotificationsRead();
        } catch (err) {
            logger.warn('mark all notifications failed', err);
        }
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('sangui-theme', isDarkMode ? 'dark' : 'light');
        }
    }, [isDarkMode]);

    useEffect(() => {
        if (meta?.stats) Object.assign(SITE_STATS, meta.stats);
        if (meta?.broadcast) {
            const dismissed = getBroadcastDismissed();
            setNotification((prev) => ({
                ...prev,
                isOpen: Boolean(meta.broadcast.active) && !dismissed,
                content: meta.broadcast.content || prev.content,
                style: (meta.broadcast.style || prev.style || "ALERT").toUpperCase()
            }));
        }
    }, [meta, getBroadcastDismissed]);

    useEffect(() => {
        if (categories && categories.length) {
            CATEGORY_TREE.splice(0, CATEGORY_TREE.length, { id: "all", label: "全部", children: [] }, ...categories);
        }
    }, [categories]);

    useEffect(() => {
        const targetId = view === 'article' ? articleId : (view === 'game' ? gameId : null);
        onViewChange && onViewChange(view, targetId);
    }, [view, articleId, gameId, onViewChange]);

    useEffect(() => {
        if (view !== 'article' || !commentAnchorId) return;
        if (!comments || comments.length === 0) return;
        const el = typeof document !== 'undefined' ? document.getElementById(`comment-${commentAnchorId}`) : null;
        if (el) {
            const rect = el.getBoundingClientRect();
            const offset = typeof window !== 'undefined' ? window.pageYOffset : 0;
            const top = rect.top + offset - 120; // offset for fixed nav
            window.scrollTo({ top: top > 0 ? top : 0, behavior: 'smooth' });
            setCommentAnchorId(null);
        }
    }, [comments, commentAnchorId, view]);

    useEffect(() => {
        const previousView = lastViewRef.current;
        if (view === 'article' && previousView !== 'article') {
            setArticleBackTarget(previousView && previousView !== 'article' ? previousView : 'home');
        }
        lastViewRef.current = view;
    }, [view]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (view === 'article') {
            window.scrollTo({ top: 0, behavior: 'auto' });
        }
    }, [view, articleId]);

    useEffect(() => {
        if (view === 'home') {
            // 首页文章列表由 ArticleList 触发分页查询，避免一次性拉全量数据
        } else if (view === 'article' && articleId) {
            loadArticle && loadArticle(articleId);
        } else if (view === 'games') {
            if (!gameListLoading && gameList.length === 0) {
                loadGameList();
            }
        } else if (view === 'game' && gameId) {
            loadGameDetail(gameId);
        }
    }, [view, articleId, loadPosts, loadArticle, gameId, loadGameDetail, loadGameList, gameList.length, gameListLoading]);

    useEffect(() => {
        if (view === 'archive' && !archiveSummary && !archiveLoading) {
            loadArchiveSummary();
        }
    }, [view, archiveSummary, archiveLoading, loadArchiveSummary]);

    useEffect(() => {
        if (view === 'home') {
            // 首页访问日志由 posts 分页加载后补齐：pageTitle = home(当前页/总页数)
        } else if (view === 'archive') {
            if (claimAutoPageView('archive')) {
                sendPageView({
                    pageTitle: 'Archive',
                    geo: getGeoHint()
                });
            }
        } else if (view === 'about') {
            if (claimAutoPageView('about')) {
                sendPageView({
                    pageTitle: 'About',
                    geo: getGeoHint()
                });
            }
        } else if (view === 'games') {
            if (claimAutoPageView('games')) {
                sendPageView({
                    pageTitle: 'GameHub',
                    geo: getGeoHint()
                });
            }
        } else if (view === 'game') {
            const target = gameDetail || gameList.find((g) => g.id === gameId) || {};
            const title = target.title || target.name || `Game#${gameId || ''}`;
            if (claimAutoPageView(`game-${gameId || 'detail'}`)) {
                sendPageView({
                    pageTitle: `Game: ${title}`,
                    sourceLabel: `游戏详情-${title}`,
                    geo: getGeoHint()
                });
            }
        } else if (view === 'admin') {
            if (claimAutoPageView('admin')) {
                sendPageView({
                    pageTitle: 'Admin Panel',
                    geo: getGeoHint()
                });
            }
        } else {
            resetAutoPageViewGuard();
        }
    }, [view, sendPageView, gameDetail, gameId, gameList]);

    useEffect(() => {
        if (view !== 'article') {
            lastRecordedArticleRef.current = null;
        }
    }, [view, articleId]);

    const handleLogout = () => {
        logout && logout();
        setUser(null);
        setView('home');
    };

    const handleSessionExpiredConfirm = useCallback(() => {
        setSessionExpired((prev) => ({ ...prev, open: false }));
        setView('login');
    }, [setView]);

    const handleProfileNav = () => {
        setView('admin');
        if (view === 'admin') {
            navigate('/admin/profile');
        } else {
            navigate('/admin');
        }
    };

    const handleOpenGame = useCallback((game) => {
        const target = game || {};
        const targetUrl = target.url ? buildAssetUrl(target.url) : '';
        const title = target.title || target.name || `Game#${target.id || ''}`;

        // 无论是否新开标签，先记录访问日志
        sendPageView({
            pageTitle: `Game: ${title}`,
            sourceLabel: `游戏详情-${title}`,
            geo: getGeoHint()
        });

        if (targetUrl) {
            if (typeof window !== 'undefined') {
                window.open(targetUrl, '_blank', 'noopener,noreferrer');
            }
        } else if (target.id) {
            setGameId(target.id);
            setView('game');
        }
    }, [sendPageView]);

    const handleGameBack = useCallback(() => {
        setView('games');
        setGameDetailError('');
    }, []);

    const handleCategoryClick = (parentLabel, subLabel) => {
        const categoriesList = categories && categories.length ? categories : CATEGORY_TREE;
        const parent = categoriesList.find(c => c.label === parentLabel);
        if (parent) {
            setActiveParent(parent.id);
            if (subLabel) {
                const sub = parent.children.find(s => s.label === subLabel);
                setActiveSub(sub ? sub.id : 'all');
            } else {
                setActiveSub('all');
            }
            setView('home');
        }
    };

    const handleHomePageSizeChange = useCallback((size) => {
        if (!PAGE_SIZE_OPTIONS.includes(size)) return;
        setHomePageSize(size);
    }, []);

    const handleArticleBack = useCallback(() => {
        const target = (articleBackTarget && articleBackTarget !== 'article') ? articleBackTarget : 'home';
        setView(target);
        if (target === 'home') {
            setTimeout(() => {
                scrollToPostsTop();
            }, 220);
        }
    }, [articleBackTarget, scrollToPostsTop, setView]);
    const handleBackgroundToggle = useCallback(() => {
        setBackgroundEnabled((prev) => !prev);
    }, []);

    const renderGamesView = () => {
        const formatDate = (value) => (value ? new Date(value).toLocaleString() : '--');
        const glassCard = `home-ios-card ${isDarkMode ? 'home-ios-card--dark' : ''}`;
        const glassInner = 'home-ios-inner-card';
        const surface = isDarkMode
            ? `${glassCard} bg-[#0F172A]/55 text-gray-100`
            : `${glassCard} bg-white/45 text-gray-900`;
        const cardSurface = isDarkMode ? 'bg-[#0F172A]/55 text-gray-100' : 'bg-white/45 text-gray-900';
        return (
            <div className="relative pt-28 pb-20 px-4">
                <div className={`max-w-5xl mx-auto space-y-8 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    <div className={`${surface} p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4`}>
                        <div className="space-y-2">
                            <p className="text-xs uppercase tracking-[0.2em] text-[#FFD700] font-semibold">Indie Lab</p>
                            <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
                                <span>工具中心</span>
                                <span className="text-[11px] px-2 py-1 rounded-full bg-[#FFD700]/90 text-black font-bold border border-white/60 shadow-[0_10px_20px_rgba(255,215,0,0.2)]">测试</span>
                            </h1>
                            <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} text-sm`}>点击『进入」卡片在新标签打开。</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={loadGameList}
                                className={`px-4 py-2 rounded-xl font-bold hover:-translate-y-0.5 transition-transform border ${isDarkMode ? 'border-white/14 bg-white/10 text-white hover:bg-white/16' : 'border-black/10 bg-white/78 text-black hover:bg-white/92'}`}
                            >
                                刷新列表
                            </button>
                        </div>
                    </div>

                    {gameListError && (
                        <div className="px-4 py-3 border border-red-300 bg-red-50/90 text-red-700 font-semibold rounded-xl">
                            {gameListError}
                        </div>
                    )}

                    <div className={`${surface} p-6 md:p-8`}>
                        <div className="grid gap-5 md:grid-cols-2">
                            {gameListLoading && Array.from({ length: 4 }).map((_, idx) => (
                                <div key={`skeleton-${idx}`} className={`${glassInner} ${cardSurface} border border-black/10 rounded-2xl p-4 animate-pulse`}>
                                    <div className="h-4 bg-gray-300/70 rounded-none w-1/2 mb-3"></div>
                                    <div className="h-3 bg-gray-200/70 rounded-none w-2/3 mb-2"></div>
                                    <div className="h-3 bg-gray-200/50 rounded-none w-1/3"></div>
                                </div>
                            ))}

                            {!gameListLoading && gameList.length === 0 && (
                                <div className={`md:col-span-2 text-center py-12 text-sm font-semibold ${glassInner} rounded-2xl`}>
                                    还没有发布的独立页面，敬请期待。
                                </div>
                            )}

                            {!gameListLoading && gameList.map((game) => {
                                const statusTone = {
                                    ACTIVE: 'bg-emerald-500 text-white',
                                    DISABLED: 'bg-gray-500 text-white',
                                    DRAFT: 'bg-amber-400 text-black'
                                }[game.status] || 'bg-black text-white';
                                return (
                                    <div
                                        key={game.id}
                                        className={`${glassCard} ${cardSurface} p-5 flex flex-col gap-4 hover:-translate-y-1 transition-transform duration-200`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs px-2 py-0.5 rounded-full font-bold home-ios-chip text-black">#{game.id}</span>
                                                    {game.status && (
                                                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold border border-white/50 ${statusTone}`}>
                                                            {game.status}
                                                        </span>
                                                    )}
                                                </div>
                                                <h3 className="text-xl font-black leading-tight">{game.title}</h3>
                                                <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} text-sm line-clamp-3`}>{game.description || '暂无描述'}</p>
                                                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-xs`}>更新：{formatDate(game.updatedAt || game.createdAt)}</p>
                                            </div>
                                            <button
                                                onClick={() => handleOpenGame(game)}
                                                className="px-3 py-1.5 border border-white/60 bg-[#FFD700]/90 text-black font-bold rounded-xl hover:-translate-y-0.5 transition-transform shadow-[0_10px_20px_rgba(255,215,0,0.2)]"
                                            >
                                                进入
                                            </button>
                                        </div>
                                        {game.url && (
                                            <div className={`text-[11px] font-mono break-all ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                {game.url}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderGamePlayer = () => {
        const target = gameDetail || gameList.find((g) => g.id === gameId);
        const src = target?.url ? buildAssetUrl(target.url) : '';
        const glassCard = `home-ios-card ${isDarkMode ? 'home-ios-card--dark' : ''}`;
        return (
            <div className={`pt-24 pb-10 px-4 md:px-8 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'} min-h-screen`}>
                <div className="flex items-center justify-between gap-3 mb-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleGameBack}
                                className={`px-3 py-1 rounded-xl font-bold border ${isDarkMode ? 'border-white/14 bg-white/10 text-white hover:bg-white/16' : 'border-black/10 bg-white/78 text-black hover:bg-[#FFD700]/86'}`}
                            >
                                ← 返回列表
                            </button>
                            {target?.url && (
                                <a
                                    href={src}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`px-3 py-1 rounded-xl font-bold border ${isDarkMode ? 'border-white/14 bg-[#FF0080]/65 text-white hover:bg-[#FF0080]/82' : 'border-black/10 bg-black/86 text-white hover:bg-[#FF0080]'}`}
                                >
                                    新标签打开
                                </a>
                            )}
                        </div>
                        <h2 className="text-2xl font-black mt-3">{target?.title || '游戏页面'}</h2>
                        {target?.description && <p className="text-sm text-gray-500 mt-1">{target.description}</p>}
                    </div>
                    <button
                        onClick={() => gameId && loadGameDetail(gameId)}
                        className={`px-3 py-1 rounded-xl font-bold border ${isDarkMode ? 'border-white/14 bg-white/10 text-white hover:bg-white/16' : 'border-black/10 bg-white/78 text-black hover:bg-white/92'}`}
                    >
                        重新加载
                    </button>
                </div>
                {gameDetailError && (
                    <div className="mb-4 px-4 py-3 border border-red-300 bg-red-50/90 text-red-700 rounded-xl font-semibold">
                        {gameDetailError}
                    </div>
                )}
                <div className={`${glassCard} ${isDarkMode ? 'bg-gray-800/60' : 'bg-white/55'} overflow-hidden min-h-[70vh]`}>
                    {gameDetailLoading && <div className="p-6 text-center text-sm">加载中…</div>}
                    {!gameDetailLoading && src ? (
                        <iframe title={target?.title || 'game'} src={src} className="w-full min-h-[70vh] border-0"></iframe>
                    ) : (
                        <div className="p-6 text-center text-sm">暂无可展示的页面</div>
                    )}
                </div>
            </div>
        );
    };

    const renderView = () => {
        switch (view) {
            case 'home':
                return (
                    <HomeView
                        meta={meta}
                        metaLoaded={metaLoaded}
                        setView={setView}
                        setArticleId={setArticleId}
                        isDarkMode={isDarkMode}
                        postsPage={postsPage}
                        postsLoading={postsLoading}
                        postsError={postsError}
                        onQueryChange={loadPosts}
                        categoriesData={categories}
                        tagsData={tags}
                        recentComments={recentComments}
                        onScrollToPosts={scrollToPostsTop}
                        backgroundEnabled={backgroundEnabled}
                        activeParent={activeParent}
                        setActiveParent={setActiveParent}
                        activeSub={activeSub}
                        setActiveSub={setActiveSub}
                        pageSize={homePageSize}
                    />
                );
            case 'archive':
                return (
                    <ArchiveView
                        summary={archiveSummary}
                        monthMap={archiveMonthMap}
                        onLoadMonth={loadArchiveMonth}
                        isDarkMode={isDarkMode}
                        loading={archiveLoading}
                        error={archiveError}
                        onBackHome={() => setView('home')}
                        onReload={loadArchiveSummary}
                        onOpenArticle={handleArchiveArticleOpen}
                    />
                );
            case 'games':
                return renderGamesView();
            case 'game':
                return renderGamePlayer();
            case 'article':
                if (articleState?.status === 'loading' || articleState?.status === 'idle') {
                    return (
                        <div className="max-w-4xl mx-auto px-4 pt-32">
                            <div className={`home-ios-card home-ios-card--static ${isDarkMode ? 'home-ios-card--dark bg-[#0F172A]/54 text-white' : 'bg-white/48 text-black'} p-8 md:p-10`}>
                                <div className="flex items-center gap-3">
                                    <span className={`inline-flex items-center gap-2 px-3 py-1 text-[11px] font-black uppercase tracking-[0.3em] rounded-full border ${isDarkMode ? 'border-white/12 bg-white/10 text-gray-100' : 'border-black/10 bg-white/78 text-black'}`}>
                                        文章载入中
                                    </span>
                                    <div className={`h-px flex-1 ${isDarkMode ? 'bg-white/10' : 'bg-black/10'}`}></div>
                                </div>

                                <div className="mt-6 space-y-4 animate-pulse">
                                    <div className={`h-4 w-32 rounded-full ${isDarkMode ? 'bg-white/10' : 'bg-black/8'}`}></div>
                                    <div className={`h-14 w-4/5 rounded-[28px] ${isDarkMode ? 'bg-white/12' : 'bg-white/78 border border-black/6'}`}></div>
                                    <div className={`h-5 w-1/2 rounded-full ${isDarkMode ? 'bg-white/10' : 'bg-black/8'}`}></div>
                                    <div className={`home-ios-inner-card ${isDarkMode ? 'bg-[#0F172A]/62 border-white/10' : 'bg-white/62 border-black/10'} p-4 md:p-5 space-y-3`}>
                                        <div className={`h-4 w-11/12 rounded-full ${isDarkMode ? 'bg-white/10' : 'bg-black/8'}`}></div>
                                        <div className={`h-4 w-10/12 rounded-full ${isDarkMode ? 'bg-white/10' : 'bg-black/8'}`}></div>
                                        <div className={`h-4 w-7/12 rounded-full ${isDarkMode ? 'bg-white/10' : 'bg-black/8'}`}></div>
                                    </div>
                                </div>

                                <div className={`mt-6 home-ios-inner-card ${isDarkMode ? 'bg-[#0F172A]/62 text-gray-200 border-white/10' : 'bg-white/64 text-gray-700 border-black/10'} p-4 md:p-5`}>
                                    <div className="text-xl font-black">加载中…</div>
                                    <div className="mt-2 text-sm font-semibold">
                                        正在整理文章内容、目录与评论数据，请稍候片刻。
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                }
                if (articleState?.status === 'not_found') {
                    return (
                        <div className="max-w-4xl mx-auto px-4 pt-32">
                            <div className={`border-4 border-black shadow-[12px_12px_0px_0px_#000] p-10 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}`}>
                                <div className="text-3xl font-black">404：文章不存在</div>
                                <div className={`mt-3 text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                    你访问的文章 ID 不存在或未发布，请检查链接是否正确。
                                </div>
                                <div className="mt-6 flex flex-wrap gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setView('home')}
                                        className={`px-6 py-3 font-black border-2 border-black shadow-[6px_6px_0px_0px_#000] transition-transform hover:-translate-y-0.5 ${isDarkMode ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-white text-black hover:bg-gray-100'}`}
                                    >
                                        返回首页
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                }
                if (articleState?.status === 'error') {
                    return (
                        <div className="max-w-4xl mx-auto px-4 pt-32">
                            <div className={`home-ios-card home-ios-card--static ${isDarkMode ? 'home-ios-card--dark bg-[#0F172A]/54 text-white' : 'bg-white/48 text-black'} p-8 md:p-10`}>
                                <div className="flex items-center gap-3">
                                    <span className={`inline-flex items-center gap-2 px-3 py-1 text-[11px] font-black uppercase tracking-[0.3em] rounded-full border ${isDarkMode ? 'border-white/12 bg-white/10 text-gray-100' : 'border-black/10 bg-white/78 text-black'}`}>
                                        文章加载失败
                                    </span>
                                    <div className={`h-px flex-1 ${isDarkMode ? 'bg-white/10' : 'bg-black/10'}`}></div>
                                </div>

                                <div className={`mt-6 home-ios-inner-card ${isDarkMode ? 'bg-[#0F172A]/62 text-gray-200 border-white/10' : 'bg-white/64 text-gray-700 border-black/10'} p-5 md:p-6`}>
                                    <div className="text-2xl font-black">暂时没有取到这篇文章</div>
                                    <div className="mt-3 text-sm font-semibold leading-6">
                                        {articleState?.error || '未知错误'}
                                    </div>
                                    <div className={`mt-4 text-xs font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        你可以重新加载一次，或先返回首页继续浏览其它内容。
                                    </div>
                                </div>

                                <div className="mt-6 flex flex-wrap gap-3">
                                    <button
                                        type="button"
                                        onClick={() => articleId && loadArticle && loadArticle(articleId)}
                                        className={`inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-black border transition-all hover:-translate-y-0.5 ${isDarkMode ? 'border-white/14 bg-white/12 text-white hover:bg-white/18 shadow-[0_16px_40px_rgba(0,0,0,0.26)]' : 'border-white/80 bg-white/72 text-black hover:bg-white/86 shadow-[0_14px_34px_rgba(15,23,42,0.14)]'}`}
                                    >
                                        重试加载
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setView('home')}
                                        className={`inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-black border transition-all hover:-translate-y-0.5 ${isDarkMode ? 'border-white/10 bg-white/8 text-gray-100 hover:bg-white/14 shadow-[0_14px_34px_rgba(0,0,0,0.22)]' : 'border-black/8 bg-white/46 text-gray-800 hover:bg-white/70 shadow-[0_12px_30px_rgba(15,23,42,0.10)]'}`}
                                    >
                                        返回首页
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                }
                return (
                    <ArticleDetail
                        id={articleId}
                        setView={setView}
                        setArticleId={setArticleId}
                        isDarkMode={isDarkMode}
                        articleData={article}
                        commentsData={comments}
                        onSubmitComment={(payload) => submitComment && articleId && submitComment(articleId, payload)}
                        onDeleteComment={(commentId) => removeComment && articleId && removeComment(articleId, commentId)}
                        onUpdateComment={(commentId, content) => editComment && articleId && editComment(articleId, commentId, content)}
                        currentUser={user}
                        onBackToPrevious={handleArticleBack}
                         onCategoryClick={handleCategoryClick}
                    />
                );
            case 'login':
                return <LoginView setView={setView} setUser={setUser} isDarkMode={isDarkMode} doLogin={doLogin} />;
            case 'register':
                return <RegisterView setView={setView} isDarkMode={isDarkMode} />;
            case 'admin':
                if (!user) {
                    return (
                        <div className={`p-20 text-center text-lg font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                            请先登录后再访问管理后台
                        </div>
                    );
                }
                return (
                    <Suspense
                        fallback={
                            <div className={`min-h-screen px-4 pt-28 pb-10 ${isDarkMode ? 'bg-gray-950 text-white' : 'bg-gray-100 text-gray-900'}`}>
                                <div className="mx-auto max-w-5xl">
                                    <div className={`rounded-[28px] border p-6 backdrop-blur-2xl ${
                                        isDarkMode
                                            ? 'border-white/10 bg-white/[0.04] shadow-[0_24px_80px_rgba(0,0,0,0.42)]'
                                            : 'border-black/10 bg-white/75 shadow-[0_24px_80px_rgba(15,23,42,0.12)]'
                                    }`}>
                                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#FF0080]">Admin Loading</p>
                                        <h2 className="mt-2 text-3xl font-black">管理后台正在按需加载</h2>
                                        <p className={`mt-3 text-sm leading-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                            后台模块已从首页主包拆出，只有进入后台时才会下载对应代码。
                                        </p>
                                        <div className="mt-6 grid gap-3 md:grid-cols-3">
                                            {Array.from({ length: 3 }).map((_, index) => (
                                                <div
                                                    key={index}
                                                    className={`h-28 animate-pulse rounded-[22px] border ${
                                                        isDarkMode ? 'border-white/10 bg-white/[0.05]' : 'border-black/8 bg-black/[0.04]'
                                                    }`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        }
                    >
                        <LazyAdminPanel
                            setView={setView}
                            notification={notification}
                            setNotification={setNotification}
                            user={user}
                            isDarkMode={isDarkMode}
                            handleLogout={handleLogout}
                            onAboutSaved={loadAbout}
                            loadGameList={loadGameList}
                            onAiAssistantChanged={loadMeta}
                            onHomeBackgroundChanged={loadMeta}
                        />
                    </Suspense>
                );
            case 'about':
                return (
                    <AboutView
                        about={about}
                        isDarkMode={isDarkMode}
                        onReload={loadAbout}
                        onEdit={user?.role === 'SUPER_ADMIN' ? () => {
                            setView('admin');
                            setTimeout(() => navigate('/admin/about'), 0);
                        } : null}
                        isSuperAdmin={user?.role === 'SUPER_ADMIN'}
                    />
                );
            default:
                return <div className="pt-32 text-center">404</div>;
        }
    };

    const globalBg = isDarkMode ? THEME.colors.bgDark : THEME.colors.bgLight;
    const currentAiPageContext = buildAiCurrentPageContext({
        view,
        article,
        articleState,
        gameDetail,
        gameId
    });
    const aiAssistantEnabled = meta ? meta?.aiAssistant?.enabled !== false : false;

    return (
        <PermissionContext.Provider value={permissionContextValue}>
            <LayoutOffsetContext.Provider value={layoutContextValue}>
            <div className={`min-h-screen relative ${globalBg}`}>
                {backgroundEnabled && view !== 'home' && <BackgroundEasterEggs isDarkMode={isDarkMode} />}
                    <div className="relative z-10">
                        <ClickRipple />
                    <ScrollToTop isDarkMode={isDarkMode} />
                    <AnimatePresence>
                        {themeBlast.active && (
                            <motion.div
                                key={themeBlast.id}
                                className="fixed inset-0 pointer-events-none z-[60]"
                                initial={{ clipPath: `circle(0% at ${themeBlast.x}px ${themeBlast.y}px)` }}
                                animate={{ clipPath: `circle(160% at ${themeBlast.x}px ${themeBlast.y}px)` }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.95, ease: [0.45, 0, 0.25, 1] }}
                            >
                                <motion.div
                                    className="absolute mix-blend-screen blur-[14px]"
                                    style={{
                                        width: '80vw',
                                        height: '80vw',
                                        left: themeBlast.x,
                                        top: themeBlast.y,
                                        marginLeft: '-40vw',
                                        marginTop: '-40vw',
                                        borderRadius: '50%',
                                        clipPath: themeBlast.mask,
                                        background: themeBlast.toDark
                                            ? 'conic-gradient(from 0deg, rgba(255,215,0,0.6), rgba(99,102,241,0.45), rgba(17,24,39,0.85), rgba(255,215,0,0.6))'
                                            : 'conic-gradient(from 0deg, rgba(17,24,39,0.8), rgba(99,102,241,0.35), rgba(255,255,255,0.9), rgba(17,24,39,0.8))'
                                    }}
                                    initial={{ scale: 0.15, rotate: themeBlast.swirl, opacity: 0.95 }}
                                    animate={{ scale: 2.3, rotate: themeBlast.swirl + (themeBlast.toDark ? 220 : -220), opacity: 0 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.95, ease: [0.45, 0, 0.25, 1] }}
                                />
                                {themeBlast.tendrils.map((tendril, idx) => (
                                    <motion.div
                                        key={`${themeBlast.id}-t-${idx}`}
                                        className="absolute pointer-events-none"
                                        style={{
                                            width: '60vw',
                                            height: '20vw',
                                            left: themeBlast.x,
                                            top: themeBlast.y,
                                            marginLeft: '-30vw',
                                            marginTop: '-5vw',
                                            filter: 'blur(20px)',
                                            mixBlendMode: 'screen',
                                            background: `linear-gradient(90deg, transparent 0%, ${tendril.color} 55%, transparent 100%)`,
                                            transformOrigin: 'center center'
                                        }}
                                        initial={{ opacity: 0.3, scaleX: 0.2, rotate: tendril.angle }}
                                        animate={{ opacity: 0.7, scaleX: tendril.length, rotate: tendril.angle + (themeBlast.toDark ? 40 : -40) }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.85, ease: 'easeOut', delay: tendril.delay }}
                                    />
                                ))}
                                <motion.div
                                    className="absolute inset-0"
                                    initial={{ opacity: 0.25 }}
                                    animate={{ opacity: 0 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.9, ease: 'easeInOut' }}
                                    style={{
                                        background: themeBlast.toDark
                                            ? 'radial-gradient(circle at center, rgba(0,0,0,0.7), transparent 55%)'
                                            : 'radial-gradient(circle at center, rgba(255,255,255,0.85), transparent 55%)'
                                    }}
                                />
                    </motion.div>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {themeOverdrive.active && (
                    <motion.div
                        className="fixed inset-0 pointer-events-none z-[58] overflow-hidden"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.95 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <motion.div
                            className="absolute inset-0"
                            style={{
                                background: `linear-gradient(120deg, ${themeOverdrive.palette[0]}, ${themeOverdrive.palette[1]}, ${themeOverdrive.palette[2]})`
                            }}
                            animate={{ opacity: [0.4, 0.8, 0.5], filter: ['hue-rotate(0deg)', 'hue-rotate(20deg)', 'hue-rotate(-15deg)'] }}
                            transition={{ duration: 0.8, repeat: Infinity }}
                        />
                        {Array.from({ length: 22 }).map((_, idx) => (
                            <motion.div
                                key={`matrix-${idx}`}
                                className="absolute w-[6vw] h-full opacity-30 mix-blend-screen"
                                style={{
                                    left: `${(idx / 22) * 100}%`,
                                    background: `linear-gradient(180deg, transparent, rgba(255,255,255,0.6), transparent)`
                                }}
                                initial={{ y: '-120%' }}
                                animate={{ y: '120%' }}
                                transition={{ duration: 1.4 + (idx % 5) * 0.2, repeat: Infinity, ease: 'linear', delay: idx * 0.05 }}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
            <GlassPopupToast
                open={themeOverdriveNotice}
                isDarkMode={isDarkMode}
                top={getGlassPopupToastTop(layoutContextValue.headerHeight)}
                icon={<Sparkles size={18} strokeWidth={2.5} />}
                title={themeOverdriveMessage || '超频模式'}
                description={themeOverdriveMessage === '冷却中…请稍候' ? '主题系统正在降温' : '主题能量已进入玻璃超频态'}
            />
            <div className="fixed top-0 left-0 right-0 z-50">
                <div className="flex flex-col w-full">
                            <EmergencyBar
                                isOpen={notification.isOpen}
                                content={notification.content}
                                style={notification.style}
                                onClose={() => {
                                    markBroadcastDismissed();
                                    setNotification(prev => ({ ...prev, isOpen: false }));
                                }}
                                onHeightChange={setEmergencyHeight}
                            />
                            <Navigation
                                user={user}
                                setView={setView}
                                currentView={view}
                                siteVersion={meta?.version}
                                handleLogout={handleLogout}
                                toggleMenu={handleToggleMenu}
                                menuOpen={menuOpen}
                                onCloseMenu={handleCloseMenu}
                                isDarkMode={isDarkMode}
                                onToggleTheme={handleThemeToggle}
                                onProfileClick={handleProfileNav}
                                backgroundEnabled={backgroundEnabled}
                                onToggleBackground={handleBackgroundToggle}
                                themeLockActive={themeOverdriveLock}
                                pageSize={homePageSize}
                                onPageSizeChange={handleHomePageSizeChange}
                                pageSizeOptions={PAGE_SIZE_OPTIONS}
                                notifications={commentNotifications}
                                notificationTotal={commentNotificationTotal}
                                notificationUnread={commentNotificationUnread}
                                notificationOpen={commentNotificationOpen}
                                notificationLoading={commentNotificationLoading}
                                onNotificationToggle={handleNotificationToggle}
                                onNotificationClick={handleNotificationClick}
                                onNotificationMarkAll={handleNotificationMarkAll}
                                onCloseNotifications={() => setCommentNotificationOpen(false)}
                                notificationPage={notificationPage}
                                notificationPageSize={NOTIFICATION_PAGE_SIZE}
                                notificationCanBackfill={notificationCanBackfill}
                                onNotificationPageChange={(page) => loadNotificationHistory(page, false)}
                                onBackfill={async () => {
                                    try {
                                        await backfillNotifications();
                                        await loadNotificationHistory(1, false);
                                        await loadUnreadNotifications();
                                        setNotificationCanBackfill(false);
                                    } catch (e) {
                                        logger.warn('backfill notifications failed', e);
                                    }
                                }}
                            />
                        </div>
                    </div>
                    <div
                        className="w-full"
                        style={{ height: layoutContextValue.headerHeight }}
                        aria-hidden="true"
                    />
                    <ErrorToast error={error} onClose={() => setError(null)} />
                    <SessionExpiredModal
                        open={sessionExpired.open}
                        onConfirm={handleSessionExpiredConfirm}
                        isDarkMode={isDarkMode}
                    />
                    {aiAssistantEnabled && shouldShowAiAssistant(view) && (
                        <AiAssistantWidget
                            isDarkMode={isDarkMode}
                            config={meta?.aiAssistant}
                            user={user}
                            currentPageContext={currentAiPageContext}
                        />
                    )}

                    <AnimatePresence mode="wait">
                        <motion.main key={view} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            {renderView()}
                        </motion.main>
                    </AnimatePresence>
                </div>
            </div>
            </LayoutOffsetContext.Provider>
        </PermissionContext.Provider>
    );
}

// Below are the remaining Front-end components updated to respect Dark Mode state
