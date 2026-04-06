import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ImageWithFallback from "../../components/common/ImageWithFallback.jsx";
import { useLayoutOffsets } from "../../contexts/LayoutOffsetContext.jsx";
import { buildAssetUrl } from "../../utils/asset.js";
import { DEFAULT_AVATAR, PAGE_SIZE_OPTIONS, ROLES } from "../shared.js";
import '../public/homeRedesign.css';
import {
    Code,
    ChevronRight,
    List,
    Lock,
    LogIn,
    LogOut,
    Mail,
    Menu,
    Moon,
    Settings,
    Sparkles,
    Sun,
    X
} from 'lucide-react';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { claimOverlayStackBase, OVERLAY_STACK_BASE } from './overlayStack.js';

export const NAVIGATION_HEIGHT = 80;
const PRIMARY_NAV_ITEMS = [
    { key: 'home', label: '首页' },
    { key: 'archive', label: '归档' },
    { key: 'games', label: '工具' },
    { key: 'about', label: '关于' }
];

const Navigation = ({
    user,
    setView,
    currentView,
    siteVersion,
    handleLogout,
    toggleMenu,
    menuOpen = false,
    onCloseMenu,
    isDarkMode,
    onToggleTheme,
    onProfileClick,
    backgroundEnabled = true,
    onToggleBackground,
    themeLockActive = false,
    pageSize,
    onPageSizeChange,
    pageSizeOptions = PAGE_SIZE_OPTIONS,
    notifications = [],
    notificationTotal = 0,
    notificationUnread = 0,
    notificationPage = 1,
    notificationPageSize = 10,
    notificationOpen = false,
    notificationLoading = false,
    onNotificationToggle,
    onNotificationClick,
    onNotificationMarkAll,
    onCloseNotifications = () => {},
    onNotificationPageChange,
    onBackfill = null,
    notificationCanBackfill = true
}) => {
    const { headerHeight } = useLayoutOffsets();
    const roleInfo = user ? ROLES[user.role] : null;
    const displayName = user?.displayName || user?.display_name || user?.nickname || user?.username || 'USER';
    const activeView = currentView === 'game' ? 'games' : (currentView || 'home');
    const shellThemeClass = `home-redesign-surface ${isDarkMode ? 'is-dark' : ''}`;
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [notificationOverlayBase, setNotificationOverlayBase] = useState(OVERLAY_STACK_BASE);
    const [settingsOverlayBase, setSettingsOverlayBase] = useState(OVERLAY_STACK_BASE);
    const [heroMode, setHeroMode] = useState(currentView === 'home');
    const [topMode, setTopMode] = useState(true);
    const [navVisible, setNavVisible] = useState(true);
    const [, setLogoClicks] = useState(0);
    const [devUnlocked, setDevUnlocked] = useState(false);
    const lastScrollYRef = useRef(0);
    const normalizeAvatarPathLocal = (path) => {
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
    };
    const logoResetTimer = useRef(null);
    const devMessageTimer = useRef(null);
    const scrollNavToTop = useCallback(() => {
        if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, []);
    const handleNavItemSelect = useCallback((key) => {
        setView(key);
        scrollNavToTop();
        if (typeof onCloseMenu === 'function') {
            onCloseMenu();
        }
    }, [setView, scrollNavToTop, onCloseMenu]);

    const handleLogoClick = useCallback(() => {
        setView('home');
        scrollNavToTop();
        setLogoClicks((prev) => {
            const next = prev + 1;
            if (logoResetTimer.current) clearTimeout(logoResetTimer.current);
            if (next >= 5) {
                setDevUnlocked(true);
                if (devMessageTimer.current) clearTimeout(devMessageTimer.current);
                devMessageTimer.current = setTimeout(() => setDevUnlocked(false), 2500);
                return 0;
            }
            logoResetTimer.current = setTimeout(() => setLogoClicks(0), 1500);
            return next;
        });
    }, [setView, scrollNavToTop]);

    useEffect(() => {
        return () => {
            if (logoResetTimer.current) clearTimeout(logoResetTimer.current);
            if (devMessageTimer.current) clearTimeout(devMessageTimer.current);
        };
    }, []);

    useEffect(() => {
        if (!menuOpen || typeof document === 'undefined') return undefined;
        const originalOverflow = document.body.style.overflow;
        const originalPaddingRight = document.body.style.paddingRight;
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = `${scrollbarWidth}px`;
        }
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = originalOverflow;
            document.body.style.paddingRight = originalPaddingRight;
        };
    }, [menuOpen]);

    const previousViewRef = useRef(currentView);
    useEffect(() => {
        const previousView = previousViewRef.current;
        if (previousView !== currentView && menuOpen && typeof onCloseMenu === 'function') {
            onCloseMenu();
        }
        previousViewRef.current = currentView;
    }, [currentView, menuOpen, onCloseMenu]);

    useEffect(() => {
        if (menuOpen && typeof onCloseNotifications === 'function') {
            onCloseNotifications();
        }
    }, [menuOpen, onCloseNotifications]);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;

        const updateNavState = () => {
            const currentScrollY = window.scrollY || 0;
            setTopMode(currentScrollY <= 24);

            if (currentView !== 'home') {
                setHeroMode(false);
            } else {
                const heroSection = document.querySelector('[data-home-hero="true"]');
                if (heroSection instanceof HTMLElement) {
                    const heroBottom = heroSection.getBoundingClientRect().bottom;
                    const navBottom = (headerHeight || NAVIGATION_HEIGHT) + 24;
                    setHeroMode(heroBottom > navBottom);
                } else {
                    const postsSection = document.getElementById('posts');
                    if (postsSection) {
                        const threshold = postsSection.offsetTop - (headerHeight || NAVIGATION_HEIGHT) - 48;
                        setHeroMode(currentScrollY < threshold);
                    } else {
                        setHeroMode(currentScrollY < window.innerHeight * 0.55);
                    }
                }
            }

            const delta = currentScrollY - lastScrollYRef.current;
            if (currentScrollY <= 24 || delta < -6) {
                setNavVisible(true);
            } else if (delta > 6 && currentScrollY > (headerHeight || NAVIGATION_HEIGHT) + 12) {
                setNavVisible(false);
            }
            lastScrollYRef.current = currentScrollY;
        };

        updateNavState();
        window.addEventListener('scroll', updateNavState, { passive: true });
        window.addEventListener('resize', updateNavState);
        return () => {
            window.removeEventListener('scroll', updateNavState);
            window.removeEventListener('resize', updateNavState);
        };
    }, [currentView, headerHeight]);

    useEffect(() => {
        if (menuOpen || notificationOpen || settingsOpen) {
            setNavVisible(true);
        }
    }, [menuOpen, notificationOpen, settingsOpen]);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;
        const handlePointerNearTop = (event) => {
            if (event.clientY <= (headerHeight || NAVIGATION_HEIGHT) + 18) {
                setNavVisible(true);
            }
        };
        window.addEventListener('mousemove', handlePointerNearTop, { passive: true });
        return () => {
            window.removeEventListener('mousemove', handlePointerNearTop);
        };
    }, [headerHeight]);

    const handleThemeButton = useCallback((event) => {
        if (typeof onToggleTheme === 'function') {
            onToggleTheme(event);
        }
    }, [onToggleTheme]);

    const handlePageSizeSelect = useCallback((value) => {
        if (!Number.isFinite(value)) return;
        if (!pageSizeOptions.includes(value)) return;
        if (typeof onPageSizeChange === 'function') {
            onPageSizeChange(value);
        }
    }, [onPageSizeChange, pageSizeOptions]);

    const handleLoginClick = useCallback(() => {
        setView('login');
        scrollNavToTop();
        if (typeof onCloseMenu === 'function') {
            onCloseMenu();
        }
    }, [setView, scrollNavToTop, onCloseMenu]);

    const handleProfileEntry = useCallback(() => {
        if (typeof onProfileClick === 'function') {
            onProfileClick();
        } else {
            setView('admin');
        }
        scrollNavToTop();
        if (typeof onCloseMenu === 'function') {
            onCloseMenu();
        }
    }, [onProfileClick, setView, scrollNavToTop, onCloseMenu]);

    const portalTarget = typeof document !== 'undefined' ? document.body : null;
    const raiseNotificationOverlay = useCallback(() => {
        setNotificationOverlayBase(claimOverlayStackBase());
    }, []);
    const raiseSettingsOverlay = useCallback(() => {
        setSettingsOverlayBase(claimOverlayStackBase());
    }, []);
    const handleNotificationEntry = useCallback(() => {
        if (!notificationOpen) {
            raiseNotificationOverlay();
        }
        onNotificationToggle?.();
    }, [notificationOpen, onNotificationToggle, raiseNotificationOverlay]);
    const openSettingsPanel = useCallback(() => {
        raiseSettingsOverlay();
        setSettingsOpen(true);
    }, [raiseSettingsOverlay]);

    useEffect(() => {
        if (notificationOpen) {
            raiseNotificationOverlay();
        }
    }, [notificationOpen, raiseNotificationOverlay]);

    useEffect(() => {
        if (settingsOpen) {
            raiseSettingsOverlay();
        }
    }, [settingsOpen, raiseSettingsOverlay]);

    const settingsPanelTop = (headerHeight || NAVIGATION_HEIGHT) + 12;
    const notificationPanelTop = (headerHeight || NAVIGATION_HEIGHT) + 12;
    const authPageMode = currentView === 'login' || currentView === 'register';
    const adminPageMode = currentView === 'admin';
    const recalledGlassMode = navVisible && (!topMode || adminPageMode);
    const authGlassMode = authPageMode && navVisible;
    const floatingNavMode = !authGlassMode && !adminPageMode && (heroMode || topMode) && !recalledGlassMode;
    const navIconToneClass = floatingNavMode
        ? 'home-nav-icon-btn--hero'
        : ((recalledGlassMode || authGlassMode) ? 'home-nav-icon-btn--glass' : '');
    const desktopActionClass = `home-nav-icon-btn ${navIconToneClass} inline-flex items-center justify-center rounded-full p-2.5`;
    const desktopAccentActionClass = `${desktopActionClass} home-nav-icon-btn--accent`;
    const mobileActionClass = `home-nav-icon-btn ${navIconToneClass} inline-flex items-center justify-center rounded-full p-2`;
    const overlayPanelClass = isDarkMode
        ? 'border border-white/12 bg-[linear-gradient(180deg,rgba(14,23,38,0.96),rgba(11,18,31,0.9))] text-white shadow-[0_24px_60px_rgba(0,0,0,0.46),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-3xl'
        : 'border border-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(250,252,255,0.9))] text-black shadow-[0_24px_60px_rgba(15,23,42,0.16),inset_0_1px_0_rgba(255,255,255,0.88)] backdrop-blur-3xl';
    const overlayDividerClass = isDarkMode ? 'border-white/10' : 'border-black/10';
    const overlaySoftCardClass = isDarkMode
        ? 'border border-white/10 bg-white/[0.06] shadow-[0_16px_36px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.08)]'
        : 'border border-black/10 bg-white/72 shadow-[0_16px_36px_rgba(148,163,184,0.16),inset_0_1px_0_rgba(255,255,255,0.76)]';
    const overlayIconWrapClass = isDarkMode
        ? 'border border-white/12 bg-white/[0.08] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
        : 'border border-black/10 bg-white/80 text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]';
    const overlayButtonClass = isDarkMode
        ? 'border border-white/12 bg-white/[0.07] text-white hover:bg-white/[0.14] shadow-[0_12px_24px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.1)]'
        : 'border border-black/10 bg-white/72 text-black hover:bg-white/90 shadow-[0_12px_24px_rgba(148,163,184,0.16),inset_0_1px_0_rgba(255,255,255,0.78)]';
    const overlayAccentButtonClass = isDarkMode
        ? 'border border-white/10 bg-[linear-gradient(180deg,rgba(255,215,0,0.34),rgba(255,196,0,0.2))] text-white hover:bg-[linear-gradient(180deg,rgba(255,215,0,0.4),rgba(255,196,0,0.24))] shadow-[0_14px_28px_rgba(255,196,0,0.16),inset_0_1px_0_rgba(255,255,255,0.18)]'
        : 'border border-[#d9a200]/28 bg-[linear-gradient(180deg,rgba(255,232,145,0.92),rgba(255,217,92,0.72))] text-black hover:bg-[linear-gradient(180deg,rgba(255,236,165,0.96),rgba(255,220,110,0.82))] shadow-[0_14px_28px_rgba(255,215,0,0.16),inset_0_1px_0_rgba(255,255,255,0.65)]';
    const overlayDisabledButtonClass = isDarkMode
        ? 'border border-white/8 bg-white/[0.04] text-white/35 cursor-not-allowed'
        : 'border border-black/8 bg-white/45 text-black/35 cursor-not-allowed';
    const overlayMutedTextClass = isDarkMode ? 'text-white/68' : 'text-black/55';
    const overlaySubtleTextClass = isDarkMode ? 'text-white/52' : 'text-black/45';
    const mobileDrawerPanelClass = isDarkMode
        ? 'border border-white/14 bg-[linear-gradient(180deg,rgba(10,18,30,0.96),rgba(8,14,24,0.92))] text-white shadow-[0_24px_60px_rgba(0,0,0,0.46),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-3xl'
        : 'border border-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(250,252,255,0.9))] text-black shadow-[0_24px_60px_rgba(15,23,42,0.16),inset_0_1px_0_rgba(255,255,255,0.86)] backdrop-blur-3xl';
    const mobileDrawerSoftCardClass = isDarkMode
        ? 'border border-white/12 bg-white/[0.06] shadow-[0_12px_30px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.08)]'
        : 'border border-black/10 bg-white/75 shadow-[0_12px_30px_rgba(148,163,184,0.16),inset_0_1px_0_rgba(255,255,255,0.8)]';
    const mobileDrawerButtonClass = isDarkMode
        ? 'border border-white/12 bg-white/[0.07] text-white hover:bg-white/[0.14] shadow-[0_10px_22px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.1)]'
        : 'border border-black/10 bg-white/78 text-black hover:bg-white/92 shadow-[0_10px_22px_rgba(148,163,184,0.15),inset_0_1px_0_rgba(255,255,255,0.84)]';
    const mobileDrawerAccentClass = isDarkMode
        ? 'border border-white/10 bg-[linear-gradient(180deg,rgba(255,215,0,0.34),rgba(255,196,0,0.2))] text-white hover:bg-[linear-gradient(180deg,rgba(255,215,0,0.42),rgba(255,196,0,0.28))] shadow-[0_14px_26px_rgba(255,196,0,0.18),inset_0_1px_0_rgba(255,255,255,0.2)]'
        : 'border border-[#d9a200]/28 bg-[linear-gradient(180deg,rgba(255,232,145,0.92),rgba(255,217,92,0.72))] text-black hover:bg-[linear-gradient(180deg,rgba(255,236,165,0.96),rgba(255,220,110,0.82))] shadow-[0_14px_26px_rgba(255,215,0,0.16),inset_0_1px_0_rgba(255,255,255,0.65)]';
    const notificationHeaderClass = isDarkMode
        ? 'bg-[linear-gradient(180deg,rgba(6,11,21,0.99),rgba(8,14,24,0.96))] backdrop-blur-3xl'
        : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.995),rgba(252,253,255,0.97))] backdrop-blur-3xl';
    const totalNotificationPages = Math.max(1, Math.ceil(notificationTotal / notificationPageSize));
    const notificationOverlay = (
        <>
            <motion.div
                key="notice-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.2 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 bg-black"
                style={{ zIndex: notificationOverlayBase }}
                onClick={onCloseNotifications}
            />
            <motion.div
                key="notice-panel"
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 240, damping: 20 }}
                className={`fixed right-3 md:right-6 w-[min(500px,calc(100vw-32px))] max-h-[92vh] overflow-hidden rounded-[28px] ${overlayPanelClass}`}
                style={{ top: notificationPanelTop, zIndex: notificationOverlayBase + 2 }}
                onPointerDownCapture={raiseNotificationOverlay}
            >
                <div className={`sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b ${overlayDividerClass} ${notificationHeaderClass}`}>
                    <div>
                        <p className="font-black text-sm">消息通知</p>
                        <p className={`text-xs ${overlayMutedTextClass}`}>
                            {notificationUnread > 0
                                ? `未读 ${notificationUnread} 条 · 共 ${notificationTotal || 0} 条`
                                : `共 ${notificationTotal || 0} 条`}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onNotificationMarkAll}
                            disabled={!notificationTotal}
                            className={`px-2.5 py-1.5 text-[11px] font-black rounded-full transition ${notificationTotal ? overlayAccentButtonClass : overlayDisabledButtonClass}`}
                        >
                            全部已读
                        </button>
                        <button
                            type="button"
                            onClick={onCloseNotifications}
                            className={`p-2 rounded-full transition ${overlayButtonClass}`}
                            aria-label="关闭通知"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>
                <div className={`max-h-[calc(92vh-132px)] overflow-y-auto divide-y ${overlayDividerClass}`}>
                    {notificationLoading ? (
                        <div className="p-4 text-sm font-semibold">加载中...</div>
                    ) : (notifications && notifications.length ? (
                        notifications.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => onNotificationClick && onNotificationClick(item)}
                                className={`w-full text-left px-4 py-3 flex gap-3 transition ${isDarkMode ? 'hover:bg-white/[0.07]' : 'hover:bg-white/45'}`}
                            >
                                <div className={`w-10 h-10 rounded-full font-black flex items-center justify-center shrink-0 overflow-hidden ${overlayIconWrapClass}`}>
                                    <img
                                        src={buildAssetUrl(normalizeAvatarPathLocal(item.avatar) || DEFAULT_AVATAR, DEFAULT_AVATAR)}
                                        alt={item.from || '访客'}
                                        className="w-full h-full object-cover"
                                        onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="font-black text-sm truncate">{item.from || '访客'}</p>
                                        <span className={`text-[11px] truncate ${overlaySubtleTextClass}`}>{item.createdAt || ''}</span>
                                    </div>
                                    <p className="mt-1 text-sm font-semibold leading-5 break-words">
                                        {item.commentContent || '收到一条新的评论通知'}
                                    </p>
                                    <p className={`text-xs mt-1 truncate ${overlaySubtleTextClass}`}>{item.postTitle || '文章'}</p>
                                </div>
                                {item.read ? null : (
                                    <span className="self-start text-[10px] font-black text-red-500 border border-red-400/60 bg-red-500/10 px-1.5 py-0.5 rounded-full">未读</span>
                                )}
                            </button>
                        ))
                    ) : (
                        <div className="p-4 text-sm font-semibold">暂无通知</div>
                    ))}
                </div>
                <div className={`px-4 py-3 flex items-center justify-between border-t ${overlayDividerClass}`}>
                    <div className="flex items-center gap-2">
                        {notificationCanBackfill && (
                            <button
                                type="button"
                                onClick={() => onBackfill && onBackfill()}
                                className={`text-xs font-black px-3 py-1.5 rounded-full transition ${overlayButtonClass}`}
                            >
                                琛ュ叏鍘嗗彶
                            </button>
                        )}
                    </div>
                    <div className="flex flex-1 items-center justify-center gap-2 flex-wrap">
                        <button
                            type="button"
                            disabled={notificationPage <= 1}
                            onClick={() => onNotificationPageChange && onNotificationPageChange(1)}
                            className={`text-xs font-black px-2.5 py-1.5 rounded-full transition ${notificationPage <= 1 ? overlayDisabledButtonClass : overlayButtonClass}`}
                        >
                            首页
                        </button>
                        <button
                            type="button"
                            disabled={notificationPage <= 1}
                            onClick={() => onNotificationPageChange && onNotificationPageChange(notificationPage - 1)}
                            className={`text-xs font-black px-2.5 py-1.5 rounded-full transition ${notificationPage <= 1 ? overlayDisabledButtonClass : overlayButtonClass}`}
                        >
                            上一页
                        </button>
                        <span className={`text-[11px] font-bold ${overlayMutedTextClass}`}>
                            第 {notificationPage} 页 / 共 {totalNotificationPages} 页
                        </span>
                        <select
                            value={notificationPage}
                            onChange={(e) => {
                                const v = Number(e.target.value);
                                if (Number.isFinite(v) && v >= 1) {
                                    onNotificationPageChange && onNotificationPageChange(v);
                                }
                            }}
                            className={`text-xs font-black rounded-full px-3 py-1.5 transition outline-none ${overlayButtonClass}`}
                        >
                            {Array.from({ length: totalNotificationPages }).map((_, idx) => {
                                const page = idx + 1;
                                return (
                                    <option key={page} value={page}>
                                        绗?{page} 椤?                                    </option>
                                );
                            })}
                        </select>
                        <button
                            type="button"
                            disabled={notificationPage >= totalNotificationPages}
                            onClick={() => onNotificationPageChange && onNotificationPageChange(notificationPage + 1)}
                            className={`text-xs font-black px-2.5 py-1.5 rounded-full transition ${notificationPage >= totalNotificationPages ? overlayDisabledButtonClass : overlayButtonClass}`}
                        >
                            下一页
                        </button>
                        <button
                            type="button"
                            disabled={notificationPage >= totalNotificationPages}
                            onClick={() => {
                                onNotificationPageChange && onNotificationPageChange(totalNotificationPages);
                            }}
                            className={`text-xs font-black px-2.5 py-1.5 rounded-full transition ${notificationPage >= totalNotificationPages ? overlayDisabledButtonClass : overlayButtonClass}`}
                        >
                            灏鹃〉
                        </button>
                    </div>
                </div>
            </motion.div>
        </>
    );
    const settingsOverlay = (
        <>
            <motion.div
                key="settings-mask"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.16 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="fixed inset-0 bg-black"
                style={{ zIndex: settingsOverlayBase }}
                onClick={() => setSettingsOpen(false)}
            />
            <motion.div
                key="settings-panel"
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 240, damping: 20 }}
                role="dialog"
                aria-modal="true"
                className={`fixed right-3 md:right-6 w-[min(500px,calc(100vw-32px))] max-h-[92vh] overflow-hidden rounded-[28px] ${overlayPanelClass}`}
                style={{ top: settingsPanelTop, zIndex: settingsOverlayBase + 2 }}
                onPointerDownCapture={raiseSettingsOverlay}
            >
                <div className={`flex items-center justify-between px-4 py-3 border-b ${overlayDividerClass}`}>
                    <div className="flex items-center gap-3">
                        <span className={`w-10 h-10 rounded-full flex items-center justify-center ${overlayIconWrapClass}`}>
                            <Settings size={18} />
                        </span>
                        <div className="leading-tight">
                            <div className="font-black text-sm uppercase tracking-wide">系统设置</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setSettingsOpen(false)}
                            className={`p-2 rounded-full transition ${overlayButtonClass}`}
                            aria-label="关闭设置"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                <div className="p-4 space-y-3 max-h-[calc(92vh-64px)] overflow-y-auto">
                    <div className={`flex items-center gap-3 p-4 rounded-[24px] ${overlaySoftCardClass}`}>
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center ${overlayIconWrapClass}`}>
                            {isDarkMode ? <Moon size={18} /> : <Sun size={18} />}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                            <div className="font-black text-sm">彩蛋背景</div>
                            <div className={`text-xs ${overlayMutedTextClass}`}>显示或隐藏太阳与月亮动画</div>
                        </div>
                        <button
                            onClick={() => onToggleBackground && onToggleBackground()}
                            className={`relative flex h-9 w-24 items-center rounded-full border px-2.5 transition-all duration-300 ${
                                backgroundEnabled
                                    ? (isDarkMode
                                        ? 'border-amber-300/35 bg-amber-300/22 text-amber-50 shadow-[0_10px_28px_rgba(245,158,11,0.22)]'
                                        : 'border-amber-300/60 bg-amber-200/70 text-amber-950 shadow-[0_10px_24px_rgba(245,158,11,0.16)]')
                                    : (isDarkMode
                                        ? 'border-white/10 bg-white/[0.05] text-gray-300'
                                        : 'border-black/10 bg-slate-200/55 text-slate-500')
                            }`}
                            aria-pressed={backgroundEnabled}
                            aria-label="切换彩蛋背景"
                        >
                            <span
                                className={`absolute top-1/2 left-1 h-7 w-7 -translate-y-1/2 rounded-full transition-transform duration-300 ${
                                    isDarkMode ? 'border border-white/14 bg-white/90' : 'border border-black/8 bg-white'
                                } ${backgroundEnabled ? 'translate-x-0' : 'translate-x-[56px]'}`}
                            />
                            <span className={`relative z-[1] w-full text-center text-[10px] font-black tracking-[0.14em] transition-colors ${
                                backgroundEnabled
                                    ? (isDarkMode ? 'text-amber-50' : 'text-amber-950')
                                    : (isDarkMode ? 'text-gray-300' : 'text-slate-500')
                            }`}>
                                {backgroundEnabled ? '已开启' : '已关闭'}
                            </span>
                        </button>
                    </div>

                    <div className={`flex items-start gap-3 p-4 rounded-[24px] ${overlaySoftCardClass}`}>
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center ${overlayIconWrapClass}`}>
                            <List size={18} />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                            <div className="font-black text-sm">首页每页文章数</div>
                            <div className={`text-xs ${overlayMutedTextClass}`}>默认 5 篇，可选 10 / 20</div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <select
                                value={pageSize}
                                onChange={(e) => handlePageSizeSelect(Number(e.target.value))}
                                className={`h-9 w-24 rounded-full px-2.5 font-black text-xs outline-none transition ${overlayButtonClass}`}
                            >
                                {pageSizeOptions.map((opt) => (
                                    <option key={opt} value={opt}>{opt} 篇/页</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className={`flex items-center gap-2 px-3 py-2 rounded-[20px] text-[11px] font-semibold ${overlaySoftCardClass} ${overlayMutedTextClass}`}>
                        <Sparkles size={14} className="text-[#F97316]" />
                        <span>设置仅保存在当前浏览器</span>
                    </div>
                </div>
            </motion.div>
        </>
    );
    const notificationOverlayLayer = (
        <AnimatePresence>
            {notificationOpen && notificationOverlay}
        </AnimatePresence>
    );
    const settingsOverlayLayer = (
        <AnimatePresence>
            {settingsOpen && settingsOverlay}
        </AnimatePresence>
    );

    return (
        <>
        <div className={shellThemeClass}>
        <motion.nav
            initial={{ y: -100 }}
            animate={{ y: navVisible ? 0 : -((headerHeight || NAVIGATION_HEIGHT) + 24) }}
            transition={{ duration: 0.26, ease: 'easeInOut' }}
            className={`home-nav-shell ${heroMode ? 'home-nav-shell--hero' : ''} ${!heroMode && topMode && !authPageMode && !adminPageMode ? 'home-nav-shell--top' : ''} ${(recalledGlassMode || authGlassMode) ? 'home-nav-shell--glass' : ''} relative w-full h-20 flex items-center justify-between px-4 md:px-8`}
        >
            <div
                className="flex items-center gap-2 cursor-pointer group shrink-0"
                onClick={handleLogoClick}
            >
                <div className="home-nav-brand">
                    <span className="home-nav-brand__title">三桂博客</span>
                    <span className="home-nav-brand__version">{siteVersion || 'V2.2.6'}</span>
                </div>
            </div>

            <div className="hidden md:flex items-center gap-8 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <LayoutGroup id="primary-nav-tabs">
                    <div className="home-nav-links">
                        {PRIMARY_NAV_ITEMS.map((item) => {
                            const isActive = activeView === item.key;
                            return (
                                <button
                                    key={item.key}
                                    type="button"
                                    onClick={() => handleNavItemSelect(item.key)}
                                    aria-current={isActive ? 'page' : undefined}
                                    className={`home-nav-link relative overflow-hidden px-4 py-2 text-[13px] font-medium uppercase tracking-[0.12em] transition-colors ${isActive ? 'home-nav-link--active' : (isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-black')}`}
                                >
                                    {isActive && (
                                        <motion.span
                                            layoutId="desktop-nav-highlight"
                                            className="absolute inset-0 rounded-full"
                                            transition={{ duration: 0.18, ease: 'easeInOut' }}
                                        />
                                    )}
                                    <span className="relative z-10">{item.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </LayoutGroup>
            </div>

            <div className="hidden md:flex items-center gap-3 shrink-0">
                {user && (
                    <button
                        type="button"
                        onClick={handleNotificationEntry}
                        className={`${desktopActionClass} relative`}
                        title="未读提醒"
                    >
                        <Mail size={18} />
                        {notificationUnread > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full border border-white shadow-[2px_2px_0px_0px_#000]">
                                {notificationUnread > 99 ? '99+' : notificationUnread}
                            </span>
                        )}
                    </button>
                )}
                {user ? (
                    <div className={`flex items-center gap-3 pl-3 ${isDarkMode ? 'border-l border-white/10' : 'border-l border-black/10'}`}>
                        <button
                            type="button"
                            onClick={handleProfileEntry}
                            className="inline-flex items-center gap-2"
                            title="后台/个人中心"
                        >
                            <div className={`w-9 h-9 overflow-hidden rounded-full border ${floatingNavMode
                                ? (isDarkMode ? 'border-white/25 bg-white/10' : 'border-black/10 bg-white/15')
                                : recalledGlassMode
                                    ? (isDarkMode ? 'border-white/20 bg-white/10 backdrop-blur-md' : 'border-black/10 bg-white/40 backdrop-blur-md')
                                    : 'border-black/10 bg-white/80'}`}>
                                <ImageWithFallback src={buildAssetUrl(user.avatar || user.avatarUrl, DEFAULT_AVATAR)} alt="用户头像" className="w-full h-full object-cover" />
                            </div>
                        </button>
                        <button onClick={handleLogout} className={desktopActionClass} title="退出登录">
                            <LogOut size={18} />
                        </button>
                    </div>
                ) : (
                    <button type="button" onClick={handleLoginClick} className={`${desktopActionClass} px-4 text-[11px] font-semibold tracking-[0.18em] uppercase`}>
                        <LogIn size={15} />
                        <span>登录</span>
                    </button>
                )}
                <button
                    onClick={openSettingsPanel}
                    className={desktopActionClass}
                    title="系统设置"
                >
                    <Settings size={18} />
                </button>
                <button
                    type="button"
                    onClick={handleThemeButton}
                    aria-disabled={themeLockActive}
                    className={`relative p-2 border-2 rounded-full transition-colors ${floatingNavMode
                        ? (isDarkMode ? 'border-white/30 bg-white/10 text-white hover:bg-white hover:text-black' : 'border-black/15 bg-white/15 text-black hover:bg-black hover:text-white')
                        : recalledGlassMode
                            ? (isDarkMode ? 'border-white/20 bg-white/10 text-white hover:bg-white/20' : 'border-black/10 bg-white/45 text-black hover:bg-white/70')
                        : themeLockActive
                            ? 'border-black bg-gray-400 text-black cursor-not-allowed opacity-70'
                            : isDarkMode
                                ? 'border-black bg-[#FFD700] text-black hover:bg-white'
                                : 'border-black bg-black text-white hover:bg-[#6366F1]'}`}
                    title="Toggle Dark Mode"
                >
                    {themeLockActive ? (
                        <motion.span
                            initial={{ scale: 0.9 }}
                            animate={{ scale: [0.9, 1.1, 0.9] }}
                            transition={{ duration: 1.2, repeat: Infinity }}
                            className="flex items-center justify-center"
                        >
                            <Lock size={18} />
                        </motion.span>
                    ) : (
                        (isDarkMode ? <Sun size={20} /> : <Moon size={20} />)
                    )}
                </button>
            </div>

            <AnimatePresence>
                {devUnlocked && (
                    <motion.div
                        className="pointer-events-none absolute -bottom-10 left-1/2 -translate-x-1/2 px-6 py-2 text-sm md:text-base font-black uppercase tracking-[0.2em] bg-black text-[#FFD700] border-2 border-white rounded-full shadow-[4px_4px_0px_0px_#000] z-50"
                        style={{ filter: 'drop-shadow(0 0 6px rgba(255,215,0,0.8))' }}
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.9 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                    >
                        DEV MODE READY
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="md:hidden flex items-center gap-3">
                {user && (
                    <button
                        type="button"
                        onClick={handleNotificationEntry}
                        className={`${mobileActionClass} relative`}
                        aria-label="未读提醒"
                    >
                        <Mail size={22} />
                        {notificationUnread > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full border border-white shadow-[2px_2px_0px_0px_#000]">
                                {notificationUnread > 99 ? '99+' : notificationUnread}
                            </span>
                        )}
                    </button>
                )}
                <button
                    className={`${mobileActionClass} home-nav-icon-btn--accent`}
                    onClick={toggleMenu}
                    aria-label="打开导航菜单"
                    aria-pressed={menuOpen}>
                    <Menu size={24} />
                </button>
            </div>

        </motion.nav>
        </div>
        {portalTarget ? createPortal(notificationOverlayLayer, portalTarget) : notificationOverlayLayer}

        <AnimatePresence>
            {menuOpen && (
                <motion.div
                    className="fixed inset-0 z-[125] md:hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.div
                        className="absolute inset-0 bg-black/50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        aria-label="关闭导航遮罩"
                        onClick={onCloseMenu}
                    />
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                        className={`absolute right-0 top-0 h-full w-[88vw] max-w-sm flex flex-col rounded-l-[28px] ${mobileDrawerPanelClass}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={`flex items-center justify-between px-4 py-3 border-b ${overlayDividerClass}`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-11 h-11 rounded-full flex items-center justify-center ${overlayIconWrapClass}`}>
                                    <Code size={22} strokeWidth={3} />
                                </div>
                                <div className="flex flex-col leading-tight">
                                    <span className="text-lg font-black">SANGUI</span>
                                    <span className="text-[11px] font-bold tracking-[0.28em]">BLOG.OS</span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={onCloseMenu}
                                className={`p-2 rounded-full transition ${mobileDrawerButtonClass}`}
                                aria-label="关闭导航菜单"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
                            <div className="grid grid-cols-1 gap-2">
                                {PRIMARY_NAV_ITEMS.map((item) => {
                                    const isActive = activeView === item.key;
                                    return (
                                        <button
                                            key={item.key}
                                            type="button"
                                            onClick={() => handleNavItemSelect(item.key)}
                                            className={`flex items-center justify-between px-4 py-3 rounded-2xl text-base font-black transition-transform active:translate-y-0.5 ${isActive ? mobileDrawerAccentClass : mobileDrawerButtonClass}`}
                                        >
                                            <span>{item.label}</span>
                                            <ChevronRight size={18} />
                                        </button>
                                    );
                                })}
                            </div>

                            <div className={`h-px bg-gradient-to-r from-transparent ${isDarkMode ? 'via-white/40' : 'via-black/30'} to-transparent`} />

                            {user ? (
                                <div className={`flex items-center gap-3 p-3 rounded-2xl ${mobileDrawerSoftCardClass}`}>
                                    <div className="w-12 h-12 rounded-full overflow-hidden border border-white/50 bg-[#FFD700]">
                                    <ImageWithFallback src={buildAssetUrl(user.avatar || user.avatarUrl, DEFAULT_AVATAR)} alt="用户头像" className="w-full h-full object-cover" />
                                </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-black truncate">{displayName}</span>
                                            <span className={`text-[10px] px-1 rounded-sm ${ROLES[user.role]?.color || 'bg-gray-500'} text-white font-bold`}>
                                                {ROLES[user.role]?.label || 'USER'}
                                            </span>
                                        </div>
                                        <div className="mt-2 flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={handleProfileEntry}
                                                className={`flex-1 px-3 py-2 text-xs font-black rounded-xl hover:-translate-y-0.5 transition-transform ${mobileDrawerAccentClass}`}
                                            >
                                                后台/个人中心
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    handleLogout?.();
                                                    onCloseMenu?.();
                                                }}
                                                className={`px-3 py-2 text-xs font-black rounded-xl ${mobileDrawerButtonClass}`}
                                            >
                                                退出登录
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleLoginClick}
                                    className={`w-full px-4 py-3 rounded-2xl text-base font-black hover:-translate-y-0.5 transition-transform ${mobileDrawerAccentClass}`}
                                >
                                    前往登录
                                </button>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={handleThemeButton}
                                    disabled={themeLockActive}
                                    aria-disabled={themeLockActive}
                                    className={`px-3 py-3 rounded-xl font-black transition ${themeLockActive
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-80'
                                        : mobileDrawerButtonClass}`}
                                >
                                    {themeLockActive ? '冷却中' : (isDarkMode ? '切到亮色' : '切到暗色')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onToggleBackground && onToggleBackground()}
                                    className={`px-3 py-3 rounded-xl font-black ${backgroundEnabled ? mobileDrawerAccentClass : mobileDrawerButtonClass}`}
                                >
                                    {backgroundEnabled ? '关闭彩蛋背景' : '开启彩蛋背景'}
                                </button>
                            </div>

                            <div className={`p-3 rounded-2xl ${mobileDrawerSoftCardClass}`}>
                                <div className="text-xs font-semibold uppercase tracking-[0.2em] mb-2">首页每页</div>
                                <div className="flex items-center gap-2">
                                    <select
                                        value={pageSize}
                                        onChange={(e) => handlePageSizeSelect(Number(e.target.value))}
                                        className={`flex-1 p-2 rounded-xl text-sm font-black ${mobileDrawerButtonClass}`}
                                    >
                                        {pageSizeOptions.map((opt) => (
                                            <option key={opt} value={opt}>{opt} 篇</option>
                                        ))}
                                    </select>
                                    <span className={`text-[11px] font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>文章</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
        {portalTarget ? createPortal(settingsOverlayLayer, portalTarget) : settingsOverlayLayer}
    </>
    );
};
// ... (Hero, StatsStrip, ArticleList, CommentsSection, ArticleDetail, LoginView components are kept unchanged in functionality, but are wrapped in the main App with the dark mode context.)
export default Navigation;

