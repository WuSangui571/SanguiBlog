import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBlog } from "./hooks/useBlogData";
import {
    recordPageView,
    updateBroadcast,
    fetchGames,
    fetchGameDetail,
    fetchArchiveSummary,
    fetchArchiveMonth,
    fetchMyPermissions,
    fetchCategories,
    fetchPosts,
    fetchTags,
    createComment,
    fetchUnreadNotifications,
    fetchNotificationHistory,
    backfillNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    fetchClientIp
} from "./api";
import { LayoutOffsetContext } from "./contexts/LayoutOffsetContext.jsx";
import { PermissionContext } from "./contexts/PermissionContext.jsx";
import { AdminPanel } from "./appfull/AdminPanel.jsx";
import BackgroundEasterEggs from "./appfull/ui/BackgroundEasterEggs.jsx";
import Navigation, { NAVIGATION_HEIGHT } from "./appfull/ui/Navigation.jsx";
import EmergencyBar from "./appfull/ui/EmergencyBar.jsx";
import ErrorToast from "./appfull/ui/ErrorToast.jsx";
import ClickRipple from "./appfull/ui/ClickRipple.jsx";
import ScrollToTop from "./appfull/ui/ScrollToTop.jsx";
import { buildAssetUrl } from "./utils/asset.js";
import Hero from "./appfull/public/Hero.jsx";
import StatsStrip from "./appfull/public/StatsStrip.jsx";
import ArticleList from "./appfull/public/ArticleList.jsx";
import ArticleDetail from "./appfull/public/ArticleDetail.jsx";
import ArchiveView from "./appfull/public/ArchiveView.jsx";
import AboutView from "./appfull/public/AboutView.jsx";
import LoginView from "./appfull/public/LoginView.jsx";
import {
    THEME,
    CATEGORY_TREE,
    SITE_STATS,
    MOCK_POSTS,
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
const BROADCAST_SESSION_KEY = 'sangui-broadcast-dismissed';
export default function SanGuiBlog({ initialView = 'home', initialArticleId = null, initialGameId = null, onViewChange }) {
    const {
        meta,
        categories,
        tags,
        posts,
        article,
        comments,
        recentComments,
        about,
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
    const [archiveSummary, setArchiveSummary] = useState(null);
    const [archiveMonthMap, setArchiveMonthMap] = useState({});
    const [archiveLoading, setArchiveLoading] = useState(false);
    const [archiveError, setArchiveError] = useState('');
    const lastViewRef = useRef(initialView);
    const [articleBackTarget, setArticleBackTarget] = useState(initialView === 'article' ? 'home' : initialView || 'home');
    const [backgroundEnabled, setBackgroundEnabled] = useState(() => {
        if (typeof window === 'undefined') return true;
        const stored = window.localStorage.getItem('sg_background_enabled');
        if (stored === null) return true;
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
        const element = document.getElementById('posts');
        if (!element) return;
        const headerOffset = 140;
        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementPosition - headerOffset;
        window.scrollTo({
            top: offsetPosition > 0 ? offsetPosition : 0,
            behavior: 'smooth'
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
            console.warn('load archive summary failed', err);
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
            console.warn('load archive month failed', err);
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
            console.warn('load games failed', err);
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
            console.warn('load game detail failed', err);
            setGameDetailError(err?.message || '无法加载页面');
        } finally {
            setGameDetailLoading(false);
        }
    }, []);
    const footerInfo = meta?.footer || {};
    const footerYear = footerInfo.year || new Date().getFullYear();
    const footerBrand = footerInfo.brand || 'SANGUI BLOG';
    const footerCopyright = footerInfo.copyrightText || `Copyright © ${footerYear} ${footerBrand} All rights reserved.`;
    const footerIcpNumber = footerInfo.icpNumber;
    const footerIcpLink = footerInfo.icpLink || 'https://beian.miit.gov.cn/';
    const footerPoweredBy = footerInfo.poweredBy || 'Powered by Spring Boot 3 & React 19';
    const siteVersion = meta?.version || 'V2.1.216';
    const heroTagline = meta?.heroTagline || DEFAULT_HERO_TAGLINE;
    const homeQuote = meta?.homeQuote || DEFAULT_HOME_QUOTE;

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

    const sendPageView = useCallback((payload = {}) => {
        const ip = clientIpRef.current;
        const refMeta = getReferrerMeta();
        const body = { ...refMeta, ...payload };
        if (ip) {
            body.clientIp = ip;
        }
        recordPageView(body);
    }, []);

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
            });
        return () => {
            active = false;
        };
    }, [user]);

    const loadUnreadNotifications = useCallback(async () => {
        if (!user) return;
        try {
            const res = await fetchUnreadNotifications(1); // 仅用于计数
            const payload = res.data || res || {};
            const total = typeof payload.total === 'number' ? payload.total : 0;
            setCommentNotificationUnread(total);
        } catch (e) {
            console.warn('load unread notifications failed', e);
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
            console.warn('load notification history failed', e);
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
            console.warn('mark notification read failed', err);
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
            console.warn('mark all notifications failed', err);
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
        if (posts && posts.length) {
            MOCK_POSTS.splice(
                0,
                MOCK_POSTS.length,
                ...posts.map((p) => ({
                    ...p,
                    color: p.color || "bg-[#6366F1]",
                    likes: p.likes ?? 0,
                    comments: p.comments ?? p.commentsCount ?? 0,
                    views: p.views ?? 0,
                }))
            );
        }
    }, [posts]);

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
            loadPosts && loadPosts();
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
            if (claimAutoPageView('home')) {
                sendPageView({
                    pageTitle: 'Home',
                    geo: getGeoHint()
                });
            }
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
        const surface = isDarkMode
            ? 'bg-gray-900 text-gray-100 border-2 border-black shadow-[8px_8px_0px_0px_#000]'
            : 'bg-white text-gray-900 border-2 border-black shadow-[8px_8px_0px_0px_#000]';
        const cardSurface = isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-900';
        return (
            <div className="relative pt-28 pb-20 px-4">
                <div className={`max-w-5xl mx-auto space-y-8 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    <div className={`${surface} rounded-none p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4`}>
                        <div className="space-y-2">
                            <p className="text-xs uppercase tracking-[0.2em] text-[#FFD700] font-semibold">Indie Lab</p>
                            <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
                                <span>工具中心</span>
                                <span className="text-[11px] px-2 py-1 rounded-none bg-[#FFD700] text-black font-bold shadow-[2px_2px_0px_0px_#000] border-2 border-black">测试</span>
                            </h1>
                            <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} text-sm`}>点击『进入」卡片在新标签打开。</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={loadGameList}
                                className="px-4 py-2 border-2 border-black bg-white text-black font-bold hover:-translate-y-0.5 transition-transform"
                            >
                                刷新列表
                            </button>
                        </div>
                    </div>

                    {gameListError && (
                        <div className="px-4 py-3 border-2 border-red-400 bg-red-50 text-red-700 font-semibold rounded-none">
                            {gameListError}
                        </div>
                    )}

                    <div className={`${surface} rounded-none p-6 md:p-8`}>
                        <div className="grid gap-5 md:grid-cols-2">
                            {gameListLoading && Array.from({ length: 4 }).map((_, idx) => (
                                <div key={`skeleton-${idx}`} className={`${cardSurface} border-2 border-dashed border-black/60 rounded-none p-4 animate-pulse shadow-[4px_4px_0px_0px_#000]`}>
                                    <div className="h-4 bg-gray-300/70 rounded-none w-1/2 mb-3"></div>
                                    <div className="h-3 bg-gray-200/70 rounded-none w-2/3 mb-2"></div>
                                    <div className="h-3 bg-gray-200/50 rounded-none w-1/3"></div>
                                </div>
                            ))}

                            {!gameListLoading && gameList.length === 0 && (
                                <div className="md:col-span-2 text-center py-12 border-2 border-dashed border-black rounded-none text-sm font-semibold shadow-[4px_4px_0px_0px_#000]">
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
                                        className={`${cardSurface} border-2 border-black rounded-none p-5 flex flex-col gap-4 hover:-translate-y-1 transition-transform duration-200 shadow-[6px_6px_0px_0px_#000]`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs px-2 py-0.5 rounded-none font-bold border-2 border-black bg-white text-black shadow-[2px_2px_0px_0px_#000]">#{game.id}</span>
                                                    {game.status && (
                                                        <span className={`text-[11px] px-2 py-0.5 rounded-none font-bold border-2 border-black ${statusTone} shadow-[2px_2px_0px_0px_#000]`}>
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
                                                className="px-3 py-1.5 border-2 border-black bg-[#FFD700] text-black font-bold rounded-none hover:-translate-y-0.5 transition-transform shadow-[2px_2px_0px_0px_#000]"
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
        return (
            <div className={`pt-24 pb-10 px-4 md:px-8 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'} min-h-screen`}>
                <div className="flex items-center justify-between gap-3 mb-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleGameBack}
                                className="px-3 py-1 border-2 border-black bg-white text-black font-bold hover:bg-[#FFD700]"
                            >
                                ← 返回列表
                            </button>
                            {target?.url && (
                                <a
                                    href={src}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-3 py-1 border-2 border-black bg-black text-white font-bold hover:bg-[#FF0080]"
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
                        className="px-3 py-1 border-2 border-black bg-white text-black font-bold"
                    >
                        重新加载
                    </button>
                </div>
                {gameDetailError && (
                    <div className="mb-4 px-4 py-3 border-2 border-red-500 bg-red-50 text-red-700 rounded-lg font-semibold">
                        {gameDetailError}
                    </div>
                )}
                <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-black'} border-2 rounded-xl overflow-hidden shadow-lg min-h-[70vh]`}>
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
                    <>
                        <Hero setView={setView} isDarkMode={isDarkMode} onStartReading={scrollToPostsTop} version={siteVersion} tagline={heroTagline} />
                        <ArticleList
                            setView={setView}
                            setArticleId={setArticleId}
                            isDarkMode={isDarkMode}
                            postsData={posts}
                            categoriesData={categories}
                            tagsData={tags}
                            recentComments={recentComments}
                            onScrollToPosts={scrollToPostsTop}
                            stats={meta?.stats}
                            author={meta?.author}
                            activeParent={activeParent}
                            setActiveParent={setActiveParent}
                            activeSub={activeSub}
                            setActiveSub={setActiveSub}
                            homeQuote={homeQuote}
                            pageSize={homePageSize}
                        />
                        <footer
                            className={`py-12 text-center mt-12 border-t-8 ${isDarkMode ? 'bg-gray-900 text-white border-[#FF0080]' : 'bg-black text-white border-[#FFD700]'}`}>
                            <h2 className="text-3xl font-black italic tracking-tighter mb-3">{footerBrand}</h2>
                            <p className="text-sm font-mono text-gray-200">{footerCopyright}</p>
                            {footerIcpNumber && (
                                <a
                                    href={footerIcpLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center text-xs font-bold text-[#FFD700] underline underline-offset-4 mt-2"
                                >
                                    {footerIcpNumber}
                                </a>
                            )}
                            {footerPoweredBy && (
                                <p className="text-xs text-gray-400 font-mono mt-3">
                                    {footerPoweredBy}
                                </p>
                            )}
                        </footer>
                    </>
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
            case 'admin':
                if (!user) {
                    return <div className="p-20 text-center text-lg font-bold">请先登录后再访问管理后台</div>;
                }
                return <AdminPanel setView={setView} notification={notification} setNotification={setNotification}
                    user={user} isDarkMode={isDarkMode} handleLogout={handleLogout} onAboutSaved={loadAbout} loadGameList={loadGameList} />;
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

    return (
        <PermissionContext.Provider value={permissionContextValue}>
            <LayoutOffsetContext.Provider value={layoutContextValue}>
            <div className={`min-h-screen relative ${globalBg}`}>
                {backgroundEnabled && <BackgroundEasterEggs isDarkMode={isDarkMode} />}
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
            <AnimatePresence>
                {themeOverdriveNotice && (
                    <motion.div
                        className="fixed inset-0 z-[72] flex items-center justify-center pointer-events-none px-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            initial={{ scale: 0.8, rotate: -4 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0.8, rotate: 6 }}
                            className="px-6 md:px-10 py-4 md:py-6 border-4 border-black bg-black text-[#FFD700] font-black text-lg md:text-2xl tracking-[0.3em] shadow-[8px_8px_0px_0px_#FF0080]"
                        >
                            {themeOverdriveMessage || '超频模式'}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
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
                                        console.warn('backfill notifications failed', e);
                                    }
                                }}
                            />
                            <motion.div
                                initial={false}
                                animate={{ opacity: notification.isOpen ? 0.85 : 0.65 }}
                                transition={{ duration: 0.4, ease: 'easeInOut' }}
                                className="h-1 w-full bg-gradient-to-r from-[#FFD700] via-[#FF0080] to-[#6366F1]"
                            />
                        </div>
                    </div>
                    <div
                        className="w-full"
                        style={{ height: layoutContextValue.headerHeight }}
                        aria-hidden="true"
                    />
                    <ErrorToast error={error} onClose={() => setError(null)} />

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
