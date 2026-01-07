import React, { useCallback, useEffect, useRef, useState } from 'react';
import PopButton from "../../components/common/PopButton.jsx";
import ImageWithFallback from "../../components/common/ImageWithFallback.jsx";
import { useLayoutOffsets } from "../../contexts/LayoutOffsetContext.jsx";
import { buildAssetUrl } from "../../utils/asset.js";
import { DEFAULT_AVATAR, PAGE_SIZE_OPTIONS, ROLES } from "../shared.js";
import {
    Code,
    ChevronRight,
    Grid,
    Home,
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
    User,
    X
} from 'lucide-react';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';

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
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [, setLogoClicks] = useState(0);
    const [devUnlocked, setDevUnlocked] = useState(false);
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

    const settingsPanelTop = (headerHeight || NAVIGATION_HEIGHT) + 12;

    return (
        <>
        <motion.nav
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            className={`relative w-full h-20 flex items-center justify-between px-4 md:px-8 
          ${isDarkMode ? 'bg-gray-900 border-b-4 border-gray-700 text-white' : 'bg-white border-b-4 border-black text-black'}
        `}
        >
            <div
                className="flex items-center gap-2 cursor-pointer group"
                onClick={handleLogoClick}
            >
                <div
                    className={`w-12 h-12 ${isDarkMode ? 'bg-white text-black' : 'bg-black text-white'} flex items-center justify-center border-2 border-black group-hover:bg-[#FFD700] group-hover:text-black transition-colors`}>
                    <Code size={28} strokeWidth={3} />
                </div>
                <div className="flex flex-col">
                    <span
                        className={`text-2xl font-black tracking-tighter leading-none italic ${isDarkMode ? 'text-white' : 'text-black'}`}>SANGUI</span>
                    <span
                        className={`text-xs font-bold tracking-widest px-1 ${isDarkMode ? 'bg-white text-black' : 'bg-black text-white'}`}>BLOG.OS</span>
                </div>
            </div>

            <div className="hidden md:flex items-center gap-8">
                <LayoutGroup id="primary-nav-tabs">
                    <div className="flex items-center gap-8">
                        {PRIMARY_NAV_ITEMS.map((item) => {
                            const isActive = activeView === item.key;
                            return (
                                <button
                                    key={item.key}
                                    type="button"
                                    onClick={() => handleNavItemSelect(item.key)}
                                    aria-current={isActive ? 'page' : undefined}
                                    className={`relative overflow-hidden px-4 py-1 text-lg font-black uppercase tracking-wide rounded-full transition-colors ${isActive ? 'text-black' : (isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-black')}`}
                                >
                                    {isActive && (
                                        <motion.span
                                            layoutId="desktop-nav-highlight"
                                            className="absolute inset-0 rounded-full border-2 border-black bg-[#FFD700]"
                                            transition={{ duration: 0.08, ease: 'easeInOut', delay: 0.05 }}
                                        />
                                    )}
                                    <span className="relative z-10">{item.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </LayoutGroup>

                <div className="flex items-center gap-3">
                    {user ? (
                        <div className="flex items-center gap-4 pl-6 border-l-4 border-black h-12">
                            <div className="flex items-center gap-2 cursor-pointer"
                                onClick={onProfileClick || (() => setView('admin'))}>
                                <div className="w-10 h-10 border-2 border-black overflow-hidden rounded-full bg-[#FFD700]">
                                    <ImageWithFallback src={buildAssetUrl(user.avatar || user.avatarUrl, DEFAULT_AVATAR)} alt="用户头像" className="w-full h-full object-cover" />
                                </div>
                                <div className="flex flex-col items-start">
                                    <span className="font-black text-sm leading-none">{displayName}</span>
                                    <span className={`text-[10px] ${roleInfo?.color} text-white px-1 w-max mt-1 font-bold`}>
                                        {roleInfo?.label || "USER"}
                                    </span>
                                </div>
                            </div>
                            <button onClick={handleLogout} className="p-2 hover:text-[#F97316] transition-colors">
                                <LogOut size={20} />
                            </button>
                        </div>
                    ) : (
                        <PopButton onClick={() => setView('login')} icon={LogIn}>前往登录</PopButton>
                    )}

                    {user && (
                        <div className="relative">
                            <button
                                type="button"
                                onClick={onNotificationToggle}
                                className={`relative p-2 border-2 border-black rounded-full transition-colors ${isDarkMode ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                                title="未读提醒"
                            >
                                <Mail size={20} />
                                {notificationUnread > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full border border-white shadow-[2px_2px_0px_0px_#000]">
                                        {notificationUnread > 99 ? '99+' : notificationUnread}
                                    </span>
                                )}
                            </button>
                        </div>
                    )}

                    <button
                        onClick={() => setSettingsOpen(true)}
                        className={`p-2 border-2 border-black rounded-full transition-colors ${isDarkMode ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                        title="系统设定"
                    >
                        <Settings size={20} />
                    </button>
                    <button
                        type="button"
                        onClick={handleThemeButton}
                        aria-disabled={themeLockActive}
                        className={`relative p-2 border-2 border-black rounded-full transition-colors ${themeLockActive
                            ? 'bg-gray-400 text-black cursor-not-allowed opacity-70'
                            : isDarkMode
                                ? 'bg-[#FFD700] text-black hover:bg-white'
                                : 'bg-black text-white hover:bg-[#6366F1]'}`}
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
                        onClick={onNotificationToggle}
                        className={`relative p-2 border-2 border-black shadow-[4px_4px_0px_0px_#000] active:translate-y-1 active:shadow-none rounded-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}`}
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
                    className="p-2 border-2 border-black bg-[#FFD700] shadow-[4px_4px_0px_0px_#000] active:translate-y-1 active:shadow-none rounded-md"
                    onClick={toggleMenu}
                    aria-label="打开导航菜单"
                    aria-pressed={menuOpen}>
                    <Menu size={24} />
                </button>
            </div>

            <AnimatePresence>
                {notificationOpen && (
                    <>
                        <motion.div
                            key="notice-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.2 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="fixed inset-0 z-[48] bg-black"
                            onClick={onCloseNotifications}
                        />
                        <motion.div
                            key="notice-panel"
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.18 }}
                            className={`absolute right-3 top-20 z-[50] w-[min(500px,calc(100vw-32px))] max-h-[100vh] border-2 border-black rounded-2xl shadow-[8px_8px_0px_0px_#000] ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}`}
                        >
                        <div className="flex items-center justify-between px-4 py-3 border-b-2 border-black">
                            <div>
                                <p className="font-black text-sm">消息通知</p>
                                <p className="text-xs opacity-70">
                                    {notificationUnread > 0 ? `未读 ${notificationUnread} 条 · 共 ${notificationTotal || 0} 条` : `共 ${notificationTotal || 0} 条`}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={onNotificationMarkAll}
                                    disabled={!notificationTotal}
                                    className={`px-2 py-1 text-[11px] font-black border-2 border-black rounded ${notificationTotal ? 'bg-[#FFD700] text-black hover:-translate-y-0.5 shadow-[2px_2px_0px_0px_#000]' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                                >
                                    全部已读
                                </button>
                                <button
                                    type="button"
                                    onClick={onCloseNotifications}
                                    className={`p-1 border-2 border-black rounded-full ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100'}`}
                                    aria-label="关闭通知"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        </div>
                        <div className="max-h-[calc(100vh-180px)] overflow-y-auto divide-y-2 divide-black/10">
                            {notificationLoading ? (
                                <div className="p-4 text-sm font-semibold">加载中...</div>
                            ) : (notifications && notifications.length ? (
                                notifications.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => onNotificationClick && onNotificationClick(item)}
                                        className={`w-full text-left px-4 py-3 flex gap-3 ${isDarkMode ? 'hover:bg-[#111827]' : 'hover:bg-gray-100'}`}
                                    >
                                        <div className="w-10 h-10 rounded-full border-2 border-black bg-[#FFD700] text-black font-black flex items-center justify-center shrink-0 overflow-hidden">
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
                                                <span className="text-[11px] text-gray-500 truncate">{item.createdAt || ''}</span>
                                            </div>
                                            <p className="mt-1 text-sm font-semibold leading-5 break-words">
                                                {item.commentContent || '收到一条新的评论通知'}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1 truncate">{item.postTitle || '文章'}</p>
                                        </div>
                                        {item.read ? null : (
                                            <span className="self-start text-[10px] font-black text-red-500 border border-red-500 px-1 rounded">未读</span>
                                        )}
                                    </button>
                                ))
                            ) : (
                                <div className="p-4 text-sm font-semibold">暂无通知</div>
                            ))}
                        </div>
                        <div className="px-4 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {notificationCanBackfill && (
                                    <button
                                        type="button"
                                        onClick={() => onBackfill && onBackfill()}
                                        className="text-xs font-black px-3 py-1 border-2 border-black rounded bg-white text-black hover:-translate-y-0.5 shadow-[2px_2px_0px_0px_#000]"
                                    >
                                        补全历史
                                    </button>
                                )}
                            </div>
                            <div className="flex flex-1 items-center justify-center gap-2 flex-wrap">
                                <button
                                    type="button"
                                    disabled={notificationPage <= 1}
                                    onClick={() => onNotificationPageChange && onNotificationPageChange(1)}
                                    className={`text-xs font-black px-2 py-1 border-2 border-black rounded ${notificationPage <= 1 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white text-black hover:-translate-y-0.5 shadow-[2px_2px_0px_0px_#000]'}`}
                                >
                                    首页
                                </button>
                                <button
                                    type="button"
                                    disabled={notificationPage <= 1}
                                    onClick={() => onNotificationPageChange && onNotificationPageChange(notificationPage - 1)}
                                    className={`text-xs font-black px-2 py-1 border-2 border-black rounded ${notificationPage <= 1 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white text-black hover:-translate-y-0.5 shadow-[2px_2px_0px_0px_#000]'}`}
                                >
                                    上一页
                                </button>
                                <span className={`text-[11px] font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                    第 {notificationPage} 页 / 共 {Math.max(1, Math.ceil(notificationTotal / notificationPageSize))} 页
                                </span>
                                <select
                                    value={notificationPage}
                                    onChange={(e) => {
                                        const v = Number(e.target.value);
                                        if (Number.isFinite(v) && v >= 1) {
                                            onNotificationPageChange && onNotificationPageChange(v);
                                        }
                                    }}
                                    className="text-xs font-black border-2 border-black rounded px-2 py-1 bg-white text-black shadow-[2px_2px_0px_0px_#000]"
                                >
                                    {Array.from({ length: Math.max(1, Math.ceil(notificationTotal / notificationPageSize)) }).map((_, idx) => {
                                        const num = idx + 1;
                                        return (
                                            <option key={`p-${num}`} value={num}>
                                                跳转到第 {num} 页
                                            </option>
                                        );
                                    })}
                                </select>
                                <button
                                    type="button"
                                    disabled={notificationPage * notificationPageSize >= notificationTotal}
                                    onClick={() => onNotificationPageChange && onNotificationPageChange(notificationPage + 1)}
                                    className={`text-xs font-black px-2 py-1 border-2 border-black rounded ${notificationPage * notificationPageSize >= notificationTotal ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white text-black hover:-translate-y-0.5 shadow-[2px_2px_0px_0px_#000]'}`}
                                >
                                    下一页
                                </button>
                                <button
                                    type="button"
                                    disabled={notificationPage * notificationPageSize >= notificationTotal}
                                    onClick={() => {
                                         const lastPage = Math.max(1, Math.ceil(notificationTotal / notificationPageSize));
                                         onNotificationPageChange && onNotificationPageChange(lastPage);
                                     }}
                                    className={`text-xs font-black px-2 py-1 border-2 border-black rounded ${notificationPage * notificationPageSize >= notificationTotal ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white text-black hover:-translate-y-0.5 shadow-[2px_2px_0px_0px_#000]'}`}
                                >
                                    尾页
                                </button>
                            </div>
                        </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </motion.nav>

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
                        className={`absolute right-0 top-0 h-full w-[88vw] max-w-sm flex flex-col border-l-4 border-black shadow-[8px_0_0_0_#000] ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-4 py-3 border-b-2 border-black">
                            <div className="flex items-center gap-3">
                                <div className={`w-11 h-11 ${isDarkMode ? 'bg-white text-black' : 'bg-black text-white'} flex items-center justify-center border-2 border-black`}>
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
                                className={`p-2 border-2 border-black rounded-full ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100'}`}
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
                                            className={`flex items-center justify-between px-4 py-3 border-2 border-black rounded-xl text-base font-black shadow-[4px_4px_0px_0px_#000] transition-transform active:translate-y-0.5 ${isActive
                                                ? 'bg-[#FFD700] text-black'
                                                : isDarkMode
                                                    ? 'bg-gray-800 text-white hover:bg-gray-700'
                                                    : 'bg-gray-100 text-black hover:bg-white'}`}
                                        >
                                            <span>{item.label}</span>
                                            <ChevronRight size={18} />
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="h-px bg-gradient-to-r from-transparent via-black to-transparent opacity-30" />

                            {user ? (
                                <div className={`flex items-center gap-3 p-3 border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_#000] ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-black bg-[#FFD700]">
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
                                                className="flex-1 px-3 py-2 text-xs font-black border-2 border-black rounded-lg bg-[#FFD700] text-black shadow-[3px_3px_0px_0px_#000] hover:-translate-y-0.5 transition-transform"
                                            >
                                                后台/个人中心
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    handleLogout?.();
                                                    onCloseMenu?.();
                                                }}
                                                className={`px-3 py-2 text-xs font-black border-2 border-black rounded-lg shadow-[3px_3px_0px_0px_#000] ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}`}
                                            >
                                                退出
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleLoginClick}
                                    className="w-full px-4 py-3 border-2 border-black rounded-xl text-base font-black bg-[#FFD700] text-black shadow-[4px_4px_0px_0px_#000] hover:-translate-y-0.5 transition-transform"
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
                                    className={`px-3 py-3 border-2 border-black rounded-xl font-black shadow-[3px_3px_0px_0px_#000] transition ${themeLockActive
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-80'
                                        : (isDarkMode ? 'bg-white text-black' : 'bg-black text-white')}`}
                                >
                                    {themeLockActive ? '冷却中' : (isDarkMode ? '切到亮色' : '切到暗色')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onToggleBackground && onToggleBackground()}
                                    className={`px-3 py-3 border-2 border-black rounded-xl font-black shadow-[3px_3px_0px_0px_#000] ${backgroundEnabled ? 'bg-[#00E096] text-black' : (isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-100 text-black')}`}
                                >
                                    {backgroundEnabled ? '关闭彩蛋背景' : '开启彩蛋背景'}
                                </button>
                            </div>

                            <div className={`p-3 border-2 border-dashed border-black rounded-xl ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                                <div className="text-xs font-semibold uppercase tracking-[0.2em] mb-2">首页每页</div>
                                <div className="flex items-center gap-2">
                                    <select
                                        value={pageSize}
                                        onChange={(e) => handlePageSizeSelect(Number(e.target.value))}
                                        className={`flex-1 p-2 border-2 border-black rounded-lg text-sm font-black shadow-[3px_3px_0px_0px_#000] ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}`}
                                    >
                                        {pageSizeOptions.map((opt) => (
                                            <option key={opt} value={opt}>{opt} 条</option>
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

        <AnimatePresence>
            {settingsOpen && (
                <>
                    <motion.div
                        key="settings-mask"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.16 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="fixed inset-0 z-[110] bg-black"
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
                        className={`fixed right-3 md:right-6 z-[120] w-[min(500px,calc(100vw-32px))] max-h-[92vh] overflow-hidden border-2 border-black rounded-2xl shadow-[8px_8px_0px_0px_#000] ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}`}
                        style={{ top: settingsPanelTop }}
                    >
                        <div className="flex items-center justify-between px-4 py-3 border-b-2 border-black">
                            <div className="flex items-center gap-3">
                                <span className={`w-10 h-10 rounded-full border-2 border-black flex items-center justify-center shadow-[3px_3px_0px_0px_#000] ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}`}>
                                    <Settings size={18} />
                                </span>
                                <div className="leading-tight">
                                    <div className="font-black text-sm uppercase tracking-wide">系统设置</div>
                                    {/*<div className="text-[11px] font-semibold opacity-70">位置与信箱一致，纯白基底</div>*/}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {/*<span className={`text-[11px] font-black px-2 py-1 rounded-full border border-black ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}`}>*/}
                                {/*    即时生效*/}
                                {/*</span>*/}
                                <button
                                    onClick={() => setSettingsOpen(false)}
                                    className={`p-2 border-2 border-black rounded-full ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
                                    aria-label="关闭设置"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="p-4 space-y-3 max-h-[calc(92vh-64px)] overflow-y-auto">
                            <div className={`flex items-center gap-3 p-4 border-2 border-black rounded-none shadow-[4px_4px_0px_0px_#000] ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                                <div className={`w-11 h-11 rounded-full border-2 border-black flex items-center justify-center ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}`}>
                                    {isDarkMode ? <Moon size={18} /> : <Sun size={18} />}
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="font-black text-sm">彩蛋背景</div>
                                    <div className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>显示/隐藏太阳与月亮动画</div>
                                </div>
                                <button
                                    onClick={() => onToggleBackground && onToggleBackground()}
                                    className={`relative w-16 h-9 border-2 border-black rounded-full transition-all ${backgroundEnabled ? 'bg-black text-white' : (isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-black')}`}
                                    aria-pressed={backgroundEnabled}
                                    aria-label="切换彩蛋背景"
                                >
                                    <span
                                        className={`absolute top-1/2 left-1 w-7 h-7 -translate-y-1/2 rounded-full border-2 border-black bg-white shadow-[2px_2px_0px_0px_#000] transition-transform ${backgroundEnabled ? 'translate-x-6' : 'translate-x-0'}`}
                                    />
                                    <span className="absolute inset-y-0 right-2 flex items-center text-[10px] font-black uppercase">
                                        {backgroundEnabled ? 'ON' : 'OFF'}
                                    </span>
                                </button>
                            </div>

                            <div className={`flex items-start gap-3 p-4 border-2 border-black rounded-none shadow-[4px_4px_0px_0px_#000] ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                                <div className={`w-11 h-11 rounded-full border-2 border-black flex items-center justify-center ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}`}>
                                    <List size={18} />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="font-black text-sm">首页每页文章数</div>
                                    <div className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>默认 5 条，可选 10 / 20</div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <select
                                        value={pageSize}
                                        onChange={(e) => handlePageSizeSelect(Number(e.target.value))}
                                        className={`w-28 p-2 border-2 border-black rounded-none font-black text-sm shadow-[3px_3px_0px_0px_#000] ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}`}
                                    >
                                        {pageSizeOptions.map((opt) => (
                                            <option key={opt} value={opt}>{opt} 条/页</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className={`flex items-center gap-2 px-3 py-2 border-2 border-dashed border-black rounded-none text-[11px] font-semibold ${isDarkMode ? 'bg-gray-900 text-gray-300' : 'bg-white text-gray-600'}`}>
                                <Sparkles size={14} className="text-[#F97316]" />
                                <span>设置仅存于本地浏览器</span>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    </>
    );
};
// ... (Hero, StatsStrip, ArticleList, CommentsSection, ArticleDetail, LoginView components are kept unchanged in functionality, but are wrapped in the main App with the dark mode context.)
export default Navigation;
