import React, {useState, useEffect, useRef, useCallback, useMemo, useContext, lazy, Suspense} from 'react';
import {Routes, Route, Link, useLocation, useNavigate, useSearchParams} from 'react-router-dom';
import {useBlog} from "./hooks/useBlogData";
import CommentsSection from "./components/comments/CommentsSection.jsx";
import PopButton from "./components/common/PopButton.jsx";
import {LayoutOffsetContext, useLayoutOffsets} from "./contexts/LayoutOffsetContext.jsx";
import {PermissionContext, usePermissionContext} from "./contexts/PermissionContext.jsx";
import ThemeColorSelector from "./app/common/ThemeColorSelector.jsx";
import {
    THEME,
    ROLES,
    CATEGORY_TREE,
    SITE_STATS,
    MOCK_USER,
    MOCK_POSTS,
    PAGE_SIZE,
    TAG_PREVIEW_COUNT,
    getReferrer,
    getGeoHint
} from "./app/shared/designSystem.jsx";
const AdminPanelLazy = lazy(() => import('./app/admin/AdminPanel.jsx'));
import {
    recordPageView,
    updateBroadcast,
    adminFetchTags,
    adminCreateTag,
    adminUpdateTag,
    adminDeleteTag,
    adminFetchCategories,
    adminCreateCategory,
    adminUpdateCategory,
    adminDeleteCategory,
    adminFetchPosts,
    adminFetchPostDetail,
    adminFetchUsers,
    adminFetchUserDetail,
    adminCreateUser,
    adminUpdateUser,
    adminDeleteUser,
    adminFetchRoles,
    adminFetchAnalyticsSummary,
    adminDeleteMyAnalyticsLogs,
    adminFetchPermissionMatrix,
    adminUpdateRolePermissions,
    fetchMyPermissions,
    fetchCategories,
    fetchTags,
    fetchComments,
    createComment,
    deleteComment,
    updateComment,
    adminFetchComments,
    adminUpdateComment,
    adminDeleteComment,
    uploadAvatar,
    uploadPostAssets,
    reservePostAssetsFolder,
    createPost,
    updatePost,
    ASSET_ORIGIN
} from "./api";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import {visit} from 'unist-util-visit';
import {
    motion,
    AnimatePresence,
    useScroll,
    useTransform,
    useSpring,
    useMotionValue,
    useMotionTemplate
} from 'framer-motion';
import AdminProfile from './pages/admin/Profile';
import {
    Code, User, MessageSquare, Share2, X, Menu, ChevronRight,
    Search, LogIn, LogOut, Settings, Eye, Github, Twitter,
    BarChart3, Filter, Tag, AlertTriangle, MessageCircle,
    Layers, Hash, Clock, FileText, Terminal, Zap, Sparkles,
    ArrowUpRight, Grid, List, Activity, ChevronLeft, Shield, Lock, Users,
    Home, TrendingUp, Edit, Send, Moon, Sun, Upload, ArrowUp, BookOpen, CheckCircle, PenTool, FolderPlus,
    RefreshCw, Plus, Trash2, Save, ImagePlus
} from 'lucide-react';

// --- 1. Design system moved to app/shared/designSystem.js ---
// --- 2. 炫酷 UI 组件库 (不变) ---

const TiltCard = ({children, className = "", onClick}) => {
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotateX = useTransform(y, [0, 1], [5, -5]);
    const rotateY = useTransform(x, [0, 1], [-5, 5]);

    function handleMouse(event) {
        const rect = event.currentTarget.getBoundingClientRect();
        x.set((event.clientX - rect.left) / rect.width);
        y.set((event.clientY - rect.top) / rect.height);
    }

    return (
        <motion.div
            onMouseMove={handleMouse}
            onMouseLeave={() => {
                x.set(0.5);
                y.set(0.5);
            }}
            style={{rotateX, rotateY}}
            onClick={onClick}
            className={`
        relative bg-white border-2 border-black p-0 
        shadow-[8px_8px_0px_0px_#000] hover:shadow-[12px_12px_0px_0px_#000] 
        transition-shadow duration-300 cursor-pointer perspective-1000
        ${className}
      `}
        >
            {children}
        </motion.div>
    );
};

const BROADCAST_STYLE_CONFIG = {
    ALERT: {
        label: "紧急广播 // SYSTEM ALERT",
        containerClass: "bg-[#FF0080] text-white",
        textClass: "text-white",
        icon: AlertTriangle,
        iconClass: "text-[#FFD700]",
        iconSize: 24,
        pulse: true
    },
    ANNOUNCE: {
        label: "系统公告 // COMMUNITY UPDATE",
        containerClass: "bg-[#FFF7CC] text-[#1F2933]",
        textClass: "text-[#1F2933]",
        icon: Sparkles,
        iconClass: "text-[#D97706]",
        iconSize: 22,
        pulse: false
    }
};

const EmergencyBar = ({isOpen, content, onClose, onHeightChange, style = "ALERT"}) => {
    const barRef = useRef(null);
    const normalizedStyle = (style || "ALERT").toUpperCase();
    const styleConfig = BROADCAST_STYLE_CONFIG[normalizedStyle] || BROADCAST_STYLE_CONFIG.ALERT;
    const StyleIcon = styleConfig.icon;

    useEffect(() => {
        if (typeof onHeightChange !== 'function') return;
        if (!isOpen) {
            onHeightChange(0);
            return;
        }
        const node = barRef.current;
        if (!node) return;
        const updateHeight = () => onHeightChange(node.offsetHeight || 0);
        updateHeight();
        if (typeof ResizeObserver !== 'undefined') {
            const observer = new ResizeObserver(() => updateHeight());
            observer.observe(node);
            return () => observer.disconnect();
        }
        return undefined;
    }, [isOpen, content, onHeightChange]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    ref={barRef}
                    initial={{height: 0, opacity: 0}}
                    animate={{height: 'auto', opacity: 1}}
                    exit={{height: 0, opacity: 0}}
                    className={`border-b-4 border-black overflow-hidden relative z-[60] w-full ${styleConfig.containerClass}`}
                >
                    <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between font-bold">
                        <div className={`flex items-center gap-3 ${styleConfig.pulse ? 'animate-pulse' : ''}`}>
                            <StyleIcon size={styleConfig.iconSize} strokeWidth={3}
                                       className={styleConfig.iconClass}/>
                            <span className={`uppercase tracking-widest ${styleConfig.textClass}`}>{styleConfig.label}</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className={`text-sm hidden md:inline ${styleConfig.textClass}`}>{content}</span>
                            <button
                                onClick={onClose}
                                className="bg-black text-white p-1 hover:rotate-90 transition-transform border border-white"
                            >
                                <X size={16}/>
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const ErrorToast = ({error, onClose}) => {
    const {headerHeight} = useLayoutOffsets();
    const toastTop = headerHeight + 16;
    useEffect(() => {
        if (error) {
            const timer = setTimeout(onClose, 5000);
            return () => clearTimeout(timer);
        }
    }, [error, onClose]);

    return (
        <AnimatePresence>
            {error && (
                <motion.div
                    initial={{opacity: 0, y: -50}}
                    animate={{opacity: 1, y: 0}}
                    exit={{opacity: 0, y: -50}}
                    className="fixed right-4 z-[70] max-w-md"
                    style={{top: toastTop}}
                >
                    <div className="bg-red-500 border-4 border-black shadow-[8px_8px_0px_0px_#000] p-4">
                        <div className="flex items-start gap-3 text-white">
                            <AlertTriangle size={24} strokeWidth={3} className="flex-shrink-0 mt-1"/>
                            <div className="flex-1">
                                <h4 className="font-black text-lg mb-1">错误 // ERROR</h4>
                                <p className="font-bold text-sm">{error}</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="bg-black p-1 hover:rotate-90 transition-transform border border-white flex-shrink-0"
                            >
                                <X size={16}/>
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// ... (ClickRipple component is kept unchanged for brevity)
const ClickRipple = () => {
    const [ripples, setRipples] = useState([]);
    useEffect(() => {
        const handleClick = (e) => {
            const id = Date.now();
            setRipples(prev => [...prev, {x: e.clientX, y: e.clientY, id}]);
            setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 1000);
        };
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    return (
        <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
            {ripples.map(ripple => (
                <motion.div
                    key={ripple.id}
                    initial={{width: 0, height: 0, opacity: 0.8, borderWidth: 5}}
                    animate={{width: 100, height: 100, opacity: 0, borderWidth: 0}}
                    transition={{duration: 0.6, ease: "easeOut"}}
                    style={{
                        left: ripple.x,
                        top: ripple.y,
                        x: '-50%',
                        y: '-50%',
                        borderColor: ['#6366F1', '#FF0080', '#FFD700'][Math.floor(Math.random() * 3)]
                    }}
                    className="absolute rounded-full border-solid border-black"
                />
            ))}
        </div>
    );
};

// --- 3. 前台视图组件 (保持不变) ---
const NAVIGATION_HEIGHT = 80;

const Navigation = ({user, setView, handleLogout, toggleMenu, isDarkMode, setIsDarkMode, onProfileClick}) => {
    const roleInfo = user ? ROLES[user.role] : null;
    const isFrontNav = true; // Use a flag for front-end vs back-end styling

    return (
        <motion.nav
            initial={{y: -100}}
            animate={{y: 0}}
            className={`relative w-full h-20 flex items-center justify-between px-4 md:px-8 
          ${isDarkMode ? 'bg-gray-900 border-b-4 border-[#FF0080] text-white' : 'bg-white border-b-4 border-black text-black'}
        `}
        >
            <div
                className="flex items-center gap-2 cursor-pointer group"
                onClick={() => setView('home')}
            >
                <div
                    className={`w-12 h-12 ${isDarkMode ? 'bg-[#FF0080] text-white' : 'bg-black text-white'} flex items-center justify-center border-2 border-black group-hover:bg-[#FFD700] group-hover:text-black transition-colors`}>
                    <Code size={28} strokeWidth={3}/>
                </div>
                <div className="flex flex-col">
                    <span className="text-2xl font-black tracking-tighter leading-none italic">SANGUI</span>
                    <span className="text-xs font-bold tracking-widest bg-[#FF0080] text-white px-1">BLOG.OS</span>
                </div>
            </div>

            <div className="hidden md:flex items-center gap-8">
                {['home', 'archive', 'about'].map((key) => (
                    <button
                        key={key}
                        onClick={() => setView(key)}
                        className={`text-lg font-bold uppercase hover:bg-black hover:text-white px-2 py-1 transition-all decoration-4 underline-offset-4 hover:underline ${isDarkMode ? 'decoration-[#FF0080]' : 'decoration-[#FFD700]'}`}
                    >
                        {key === 'home' ? '首页' : key === 'archive' ? '归档' : '关于'}
                    </button>
                ))}

                {user ? (
                    <div className="flex items-center gap-4 pl-6 border-l-4 border-black h-12">
                        <div className="flex items-center gap-2 cursor-pointer"
                             onClick={onProfileClick || (() => setView('admin'))}>
                            <div className="w-10 h-10 border-2 border-black overflow-hidden rounded-full bg-[#FFD700]">
                                <img
                                    src={user.avatar?.startsWith('http') ? user.avatar : `http://localhost:8080${user.avatar}`}
                                    className="w-full h-full object-cover"/>
                            </div>
                            <div className="flex flex-col items-start">
                                <span className="font-black text-sm leading-none">{user.username}</span>
                                <span className={`text-[10px] ${roleInfo?.color} text-white px-1 w-max mt-1 font-bold`}>
                  {roleInfo?.label || "USER"}
                </span>
                            </div>
                        </div>
                        {(user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && (
                            <button onClick={() => setView('admin')}
                                    className="p-2 hover:bg-black hover:text-white border-2 border-transparent hover:border-black rounded-full transition-all">
                                <Settings size={20}/></button>
                        )}
                        <button onClick={handleLogout} className="p-2 hover:text-[#FF0080] transition-colors"><LogOut
                            size={20}/></button>
                    </div>
                ) : (
                    <PopButton onClick={() => setView('login')} icon={LogIn}>Login</PopButton>
                )}
                {/* Dark Mode Toggle */}
                <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className={`p-2 border-2 border-black rounded-full transition-colors ${isDarkMode ? 'bg-[#FFD700] text-black hover:bg-white' : 'bg-black text-white hover:bg-[#6366F1]'}`}
                    title="Toggle Dark Mode"
                >
                    {isDarkMode ? <Sun size={20}/> : <Moon size={20}/>}
                </button>
            </div>

            <button
                className="md:hidden p-2 border-2 border-black bg-[#FFD700] shadow-[4px_4px_0px_0px_#000] active:translate-y-1 active:shadow-none"
                onClick={toggleMenu}>
                <Menu size={24}/>
            </button>
        </motion.nav>
    );
};
// ... (Hero, StatsStrip, ArticleList, CommentsSection, ArticleDetail, LoginView components are kept unchanged in functionality, but are wrapped in the main App with the dark mode context.)
const Hero = ({setView, isDarkMode, onStartReading, version}) => {
    const {scrollY} = useScroll();
    const y1 = useTransform(scrollY, [0, 500], [0, 200]);
    const rotate = useTransform(scrollY, [0, 500], [0, 45]);

    const bgClass = isDarkMode ? THEME.colors.bgDark : THEME.colors.bgLight;
    const textClass = isDarkMode ? 'text-white' : 'text-black';
    const gridColor = isDarkMode ? '#374151' : '#000';

    return (
        <div
            className={`relative min-h-[90vh] flex flex-col justify-center items-center pt-20 overflow-hidden ${bgClass} ${textClass}`}>
            <div className="absolute inset-0 opacity-10 pointer-events-none"
                 style={{
                     backgroundImage: `linear-gradient(${gridColor} 1px, transparent 1px), linear-gradient(90deg, ${gridColor} 1px, transparent 1px)`,
                     backgroundSize: '40px 40px'
                 }}>
            </div>
            <motion.div style={{y: y1, rotate}} className="absolute top-32 left-[10%] text-[#FFD700]">
                <Sparkles size={80} strokeWidth={1.5} className="drop-shadow-[4px_4px_0px_rgba(0,0,0,1)] fill-current"/>
            </motion.div>
            <motion.div style={{y: y1, x: -50}}
                        className="absolute bottom-40 right-[10%] w-32 h-32 border-4 border-black bg-[#00E096] shadow-[8px_8px_0px_0px_#000] z-0 rounded-full flex items-center justify-center font-black text-2xl">
                CODE
            </motion.div>

            <div className="z-10 text-center max-w-5xl px-4 relative">
                <motion.div
                    initial={{scale: 0}} animate={{scale: 1}}
                    className="inline-block mb-6 bg-black text-white px-6 py-2 text-xl font-mono font-bold transform -rotate-2 shadow-[4px_4px_0px_0px_#FF0080]"
                >
                    {`SANGUI BLOG // ${version || 'V1.3.24'}`}
                </motion.div>

                <h1 className={`text-6xl md:text-9xl font-black mb-8 leading-[0.9] tracking-tighter drop-shadow-sm ${textClass}`}>
                    <motion.span initial={{y: 100, opacity: 0}} animate={{y: 0, opacity: 1}} transition={{delay: 0.1}}
                                 className="block">
                        用代码记录<span
                        className="text-[#6366F1] underline decoration-8 decoration-black underline-offset-8 ml-4">探索</span>
                    </motion.span>
                    <motion.span initial={{y: 100, opacity: 0}} animate={{y: 0, opacity: 1}} transition={{delay: 0.2}}
                                 className="block">
                        以分享照亮<span
                        className="text-[#FF0080] bg-[#FFD700] px-2 ml-2 border-4 border-black skew-x-[-10deg] inline-block shadow-[6px_6px_0px_0px_#000]">成长</span>
                    </motion.span>
                </h1>
                <p className={`text-xl md:text-2xl font-bold mb-12 max-w-2xl mx-auto border-2 border-black p-4 shadow-[4px_4px_0px_0px_#000] ${isDarkMode ? 'bg-[#1f2937] text-gray-300' : 'bg-white text-gray-600'}`}>
                    拒绝平庸，在 SpringBoot 与 React 的边缘狂试探。
                    <br/><span className="text-sm font-mono text-[#FF0080]">{`>>`} PRESS START TO CONTINUE</span>
                </p>


                <div className="flex flex-wrap gap-6 justify-center">
                    <PopButton onClick={() => {
                        if (onStartReading) {
                            onStartReading();
                        } else {
                            document.getElementById('posts')?.scrollIntoView({behavior: 'smooth', block: 'start'});
                        }
                    }}
                               icon={ArrowUpRight} className="text-xl px-8 py-4 bg-[#FFD700] text-black">
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

// --- 4. 后台管理组件 (Admin Panel) ---


// --- 4.x Admin Panel moved to app/admin/AdminPanelContents.jsx ---
// --- 6. Scroll To Top Component ---
const ScrollToTop = ({isDarkMode}) => {
    const STORAGE_KEY = 'sangui-scroll-button';
    const BUTTON_SIZE = 56;
    const [isVisible, setIsVisible] = useState(false);
    const [position, setPosition] = useState(() => {
        if (typeof window === 'undefined') return {x: 24, y: 24};
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                return parsed;
            }
        } catch (e) {
        }
        return {
            x: window.innerWidth - BUTTON_SIZE - 24,
            y: window.innerHeight - BUTTON_SIZE - 120
        };
    });
    const [isDragging, setIsDragging] = useState(false);
    const dragMetaRef = useRef({active: false, moved: false, ignoreClick: false, offsetX: 0, offsetY: 0});
    const buttonRef = useRef(null);
    const latestPositionRef = useRef(position);

    const clampPosition = useCallback((pos) => {
        if (typeof window === 'undefined') return pos;
        const maxX = window.innerWidth - BUTTON_SIZE - 12;
        const maxY = window.innerHeight - BUTTON_SIZE - 12;
        return {
            x: Math.min(Math.max(12, pos.x), maxX),
            y: Math.min(Math.max(12, pos.y), maxY)
        };
    }, []);

    const persistPosition = useCallback((pos) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
        } catch (e) {
            console.warn('无法保存滚动按钮位置', e);
        }
    }, []);

    useEffect(() => {
        latestPositionRef.current = position;
    }, [position]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        setPosition(prev => clampPosition(prev));
    }, [clampPosition]);

    useEffect(() => {
        const toggleVisibility = () => {
            if (window.pageYOffset > 300) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        };

        window.addEventListener("scroll", toggleVisibility);
        return () => window.removeEventListener("scroll", toggleVisibility);
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handleResize = () => {
            setPosition(prev => clampPosition(prev));
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [clampPosition]);

    useEffect(() => {
        const handlePointerMove = (event) => {
            if (!dragMetaRef.current.active) return;
            const point = event.touches ? event.touches[0] : event;
            if (!point) return;
            event.preventDefault();
            dragMetaRef.current.moved = true;
            const next = clampPosition({
                x: point.clientX - dragMetaRef.current.offsetX,
                y: point.clientY - dragMetaRef.current.offsetY
            });
            setPosition(next);
        };

        const handlePointerUp = () => {
            if (!dragMetaRef.current.active) return;
            const moved = dragMetaRef.current.moved;
            dragMetaRef.current.active = false;
            dragMetaRef.current.moved = false;
            dragMetaRef.current.ignoreClick = moved;
            setIsDragging(false);
            if (moved) {
                persistPosition(latestPositionRef.current);
            }
        };

        window.addEventListener('mousemove', handlePointerMove);
        window.addEventListener('mouseup', handlePointerUp);
        window.addEventListener('touchmove', handlePointerMove, {passive: false});
        window.addEventListener('touchend', handlePointerUp);

        return () => {
            window.removeEventListener('mousemove', handlePointerMove);
            window.removeEventListener('mouseup', handlePointerUp);
            window.removeEventListener('touchmove', handlePointerMove);
            window.removeEventListener('touchend', handlePointerUp);
        };
    }, [clampPosition, persistPosition]);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    };

    const startDrag = (event) => {
        const point = event.touches ? event.touches[0] : event;
        if (!point) return;
        event.preventDefault();
        const rect = buttonRef.current?.getBoundingClientRect();
        dragMetaRef.current = {
            active: true,
            moved: false,
            ignoreClick: false,
            offsetX: point.clientX - (rect?.left ?? 0),
            offsetY: point.clientY - (rect?.top ?? 0)
        };
        setIsDragging(true);
    };

    const handleClick = (event) => {
        if (dragMetaRef.current.ignoreClick || isDragging) {
            event.preventDefault();
            dragMetaRef.current.ignoreClick = false;
            return;
        }
        scrollToTop();
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.button
                    ref={buttonRef}
                    initial={{opacity: 0, scale: 0.8}}
                    animate={{opacity: 1, scale: 1}}
                    exit={{opacity: 0, scale: 0.8}}
                    onMouseDown={startDrag}
                    onTouchStart={startDrag}
                    onClick={handleClick}
                    style={{left: `${position.x}px`, top: `${position.y}px`}}
                    className={`fixed z-50 p-3 rounded-full shadow-lg transition-colors ${isDarkMode ? 'bg-[#FF0080] text-white hover:bg-[#D9006C]' : 'bg-black text-white hover:bg-gray-800'} ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                >
                    <ArrowUp size={24}/>
                </motion.button>
            )}
        </AnimatePresence>
    );
};

// --- 5. Main App ---

export default function SanGuiBlog({initialView = 'home', initialArticleId = null, onViewChange}) {
    const {
        meta,
        categories,
        tags,
        posts,
        article,
        comments,
        recentComments,
        loadPosts,
        loadArticle,
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
    const [activeParent, setActiveParent] = useState("all");
    const [activeSub, setActiveSub] = useState("all");
    const [menuOpen, setMenuOpen] = useState(false);
    const [notification, setNotification] = useState({
        isOpen: false,
        content: "系统将于今晚 00:00 停机维护",
        style: "ALERT"
    });
    const [emergencyHeight, setEmergencyHeight] = useState(0);
    const [error, setError] = useState(null);
    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('sangui-theme') === 'dark';
        }
        return false;
    }); // Persisted dark mode state
    const [permissionState, setPermissionState] = useState({permissions: [], loading: false, error: ''});
    const lastRecordedArticleRef = useRef(null);
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
    const footerInfo = meta?.footer || {};
    const footerYear = footerInfo.year || new Date().getFullYear();
    const footerBrand = footerInfo.brand || 'SANGUI BLOG';
    const footerCopyright = footerInfo.copyrightText || `Copyright © ${footerYear} ${footerBrand} All rights reserved.`;
    const footerIcpNumber = footerInfo.icpNumber;
    const footerIcpLink = footerInfo.icpLink || 'https://beian.miit.gov.cn/';
    const footerPoweredBy = footerInfo.poweredBy || 'Powered by Spring Boot 3 & React 19';
    const siteVersion = meta?.version || 'V1.3.24';

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
        if (blogUser) setUser(blogUser);
    }, [blogUser]);

    useEffect(() => {
        if (!user) {
            setPermissionState({permissions: [], loading: false, error: ''});
            return;
        }
        let active = true;
        setPermissionState((prev) => ({...prev, loading: true, error: ''}));
        fetchMyPermissions()
            .then((res) => {
                if (!active) return;
                const data = res.data || res || [];
                setPermissionState({permissions: data, loading: false, error: ''});
            })
            .catch((err) => {
                if (!active) return;
                setPermissionState({permissions: [], loading: false, error: err.message || '获取权限失败'});
            });
        return () => {
            active = false;
        };
    }, [user]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('sangui-theme', isDarkMode ? 'dark' : 'light');
        }
    }, [isDarkMode]);

    useEffect(() => {
        if (meta?.stats) Object.assign(SITE_STATS, meta.stats);
        if (meta?.broadcast) {
            setNotification((prev) => ({
                ...prev,
                isOpen: Boolean(meta.broadcast.active),
                content: meta.broadcast.content || prev.content,
                style: (meta.broadcast.style || prev.style || "ALERT").toUpperCase()
            }));
        }
    }, [meta]);

    useEffect(() => {
        if (categories && categories.length) {
            CATEGORY_TREE.splice(0, CATEGORY_TREE.length, {id: "all", label: "全部", children: []}, ...categories);
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
        onViewChange && onViewChange(view, articleId);
    }, [view, articleId]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (view === 'article') {
            window.scrollTo({top: 0, behavior: 'auto'});
        }
    }, [view, articleId]);

    useEffect(() => {
        if (view === 'home') {
            loadPosts && loadPosts();
        } else if (view === 'article' && articleId) {
            loadArticle && loadArticle(articleId);
        }
    }, [view, articleId, loadPosts, loadArticle]);

    useEffect(() => {
        if (view === 'home') {
            recordPageView({
                pageTitle: 'Home',
                referrer: getReferrer(),
                geo: getGeoHint()
            });
        } else if (view === 'admin') {
            recordPageView({
                pageTitle: 'Admin Panel',
                referrer: getReferrer(),
                geo: getGeoHint()
            });
        }
    }, [view]);

    useEffect(() => {
        if (view === 'article' && articleId && article && article.id === articleId) {
            if (lastRecordedArticleRef.current === articleId) return;
            recordPageView({
                postId: Number(articleId),
                pageTitle: article.title || `Article #${articleId}`,
                referrer: getReferrer(),
                geo: getGeoHint()
            });
            lastRecordedArticleRef.current = articleId;
        } else if (view !== 'article') {
            lastRecordedArticleRef.current = null;
        }
    }, [view, articleId, article]);

    const handleLogout = () => {
        logout && logout();
        setUser(null);
        setView('home');
    };

    const handleProfileNav = () => {
        setView('admin');
        navigate('/admin/profile');
    };

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

    const renderView = () => {
        switch (view) {
            case 'home':
                return (
                    <>
                        <Hero setView={setView} isDarkMode={isDarkMode} onStartReading={scrollToPostsTop} version={siteVersion}/>
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
            case 'article':
                return (
                    <ArticleDetail
                        id={articleId}
                        setView={setView}
                        isDarkMode={isDarkMode}
                        articleData={article}
                        commentsData={comments}
                        onSubmitComment={(payload) => submitComment && articleId && submitComment(articleId, payload)}
                        onDeleteComment={(commentId) => removeComment && articleId && removeComment(articleId, commentId)}
                        onUpdateComment={(commentId, content) => editComment && articleId && editComment(articleId, commentId, content)}
                        currentUser={user}
                        onCategoryClick={handleCategoryClick}
                    />
                );
            case 'login':
                return <LoginView setView={setView} setUser={setUser} isDarkMode={isDarkMode} doLogin={doLogin}/>;
            case 'admin':
                if (!user) {
                    return <div className="p-20 text-center text-lg font-bold">请先登录后再访问管理后台</div>;
                }
                return (
                    <Suspense fallback={
                        <div className="p-20 text-center text-lg font-bold">正在加载管理后台...</div>
                    }>
                        <AdminPanelLazy
                            setView={setView}
                            notification={notification}
                            setNotification={setNotification}
                            user={user}
                            isDarkMode={isDarkMode}
                            handleLogout={handleLogout}
                        />
                    </Suspense>
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
                    <ClickRipple/>
                    <ScrollToTop isDarkMode={isDarkMode}/>
                    <div className="fixed top-0 left-0 right-0 z-50">
                        <div className="flex flex-col w-full">
                            <EmergencyBar
                                isOpen={notification.isOpen}
                                content={notification.content}
                                style={notification.style}
                                onClose={() => setNotification(prev => ({...prev, isOpen: false}))}
                                onHeightChange={setEmergencyHeight}
                            />
                            <Navigation
                                user={user}
                                setView={setView}
                                handleLogout={handleLogout}
                                toggleMenu={() => setMenuOpen(!menuOpen)}
                                isDarkMode={isDarkMode}
                                setIsDarkMode={setIsDarkMode}
                                onProfileClick={handleProfileNav}
                            />
                        </div>
                    </div>
                    <div
                        className="w-full"
                        style={{height: layoutContextValue.headerHeight}}
                        aria-hidden="true"
                    />
                    <ErrorToast error={error} onClose={() => setError(null)}/>

                    <AnimatePresence mode="wait">
                        <motion.main key={view} initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}}>
                            {renderView()}
                        </motion.main>
                    </AnimatePresence>
                </div>
            </LayoutOffsetContext.Provider>
        </PermissionContext.Provider>
    );
}

// Below are the remaining Front-end components updated to respect Dark Mode state
const StatsStrip = ({isDarkMode, stats}) => {
    const {headerHeight} = useLayoutOffsets();
    const s = stats || SITE_STATS;
    const items = [
        {label: "文章", value: s.posts, icon: FileText, color: "text-[#6366F1]"},
        {label: "浏览", value: s.views, icon: Eye, color: "text-[#FF0080]"},
        {label: "评论", value: s.comments, icon: MessageSquare, color: "text-[#00E096]"},
        {label: "标签", value: s.tags, icon: Hash, color: "text-[#FFD700]"},
        {
            label: "最后更新",
            value: s.lastUpdated,
            fullValue: s.lastUpdatedFull,
            icon: Clock,
            color: "text-gray-500",
            isDate: true,
        },
    ];
    const bg = isDarkMode ? 'bg-gray-900' : 'bg-black';
    const text_cls = isDarkMode ? 'text-white' : 'text-white';
    const tooltipBg = isDarkMode ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-black text-black';
    const tooltipArrow = isDarkMode ? 'border-b-gray-800' : 'border-b-black';

    return (
        <div
            className={`sticky z-40 ${bg} ${text_cls} border-b-4 border-black`}
            style={{top: headerHeight}}
        >
            <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
                <div className="flex items-center gap-2 mr-8 flex-shrink-0">
                    <Activity className="text-[#00E096] animate-pulse"/>
                    <span className="font-black tracking-widest uppercase">System Status</span>
                </div>

                <div className="flex items-center gap-8 md:gap-12 overflow-visible">
                    {items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 flex-shrink-0 group cursor-default relative">
                            <item.icon size={16}
                                       className={`${item.color} group-hover:scale-125 transition-transform`}/>

                            {item.isDate ? (
                                <div className="relative group/date">
                                    <span
                                        className={`font-mono font-bold text-lg cursor-help border-b border-dashed ${isDarkMode ? 'border-gray-400' : 'border-gray-500'}`}>{item.value}</span>
                                    <div
                                        className={`absolute top-full left-1/2 -translate-x-1/2 mt-4 ${tooltipBg} border-2 px-3 py-2 text-sm font-bold whitespace-nowrap opacity-0 group-hover/date:opacity-100 transition-opacity pointer-events-none z-[100] shadow-[4px_4px_0px_0px_#000]`}>
                                        <div
                                            className={`absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-b-8 ${tooltipArrow}`}></div>
                                        {item.fullValue}
                                    </div>
                                </div>
                            ) : (
                                <span className="font-mono font-bold text-lg">{item.value}</span>
                            )}

                            <span
                                className={`text-[10px] font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const ArticleList = ({
                         setView,
                         setArticleId,
                         isDarkMode,
                         postsData,
                         categoriesData,
                         tagsData,
                         stats,
                         author,
                         activeParent,
                         setActiveParent,
                         activeSub,
                         setActiveSub,
                         recentComments,
                         onScrollToPosts
                     }) => {
    const [showWechat, setShowWechat] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [konamiActive, setKonamiActive] = useState(false);
    const konamiSequence = useRef([]);
    const KONAMI_CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    const [avatarClicks, setAvatarClicks] = useState(0);
    const [expandedTags, setExpandedTags] = useState(false);
    const [activeTag, setActiveTag] = useState('all');
    const NEW_POST_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const isPostNew = (dateStr) => {
        if (!dateStr) return false;
        const parsed = Date.parse(`${dateStr}T00:00:00`);
        if (Number.isNaN(parsed)) return false;
        const diff = now - parsed;
        if (diff < 0) return false;
        return diff <= NEW_POST_WINDOW_MS;
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            konamiSequence.current = [...konamiSequence.current, e.key].slice(-10);
            if (JSON.stringify(konamiSequence.current) === JSON.stringify(KONAMI_CODE)) {
                setKonamiActive(true);
                alert("⚡️ 开发者模式已激活！系统过载中... ⚡️");
                setTimeout(() => setKonamiActive(false), 5000);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const categories = categoriesData && categoriesData.length
        ? (categoriesData.some((c) => c.id === "all") ? categoriesData : [{
            id: "all",
            label: "全部",
            children: []
        }, ...categoriesData])
        : CATEGORY_TREE;
    const currentParentObj = categories.find(c => c.id === activeParent);
    const subCategories = currentParentObj ? currentParentObj.children : [];
    const sourcePosts = postsData && postsData.length ? postsData : MOCK_POSTS;
    const scrollToPostsTop = useCallback(() => {
        if (onScrollToPosts) {
            onScrollToPosts();
        } else {
            document.getElementById('posts')?.scrollIntoView({behavior: 'smooth', block: 'start'});
        }
    }, [onScrollToPosts]);

    const filteredPosts = sourcePosts.filter(post => {
        if (activeParent !== "all" && post.parentCategory !== currentParentObj.label) return false;
        if (activeSub !== "all" && post.category !== subCategories.find(s => s.id === activeSub)?.label) return false;
        if (activeTag !== 'all') {
            const tags = Array.isArray(post.tags) ? post.tags : [];
            const normalized = tags.map((tag) => {
                if (!tag) return '';
                if (typeof tag === 'string') return tag;
                return tag.name || tag.label || '';
            });
            if (!normalized.includes(activeTag)) return false;
        }
        return true;
    });

    useEffect(() => {
        setCurrentPage(1);
    }, [activeParent, activeSub, activeTag]);

    const totalPages = Math.ceil(filteredPosts.length / PAGE_SIZE);
    const displayPosts = filteredPosts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const socialButtonClass = isDarkMode
        ? '!text-white hover:!text-black hover:!bg-white'
        : 'hover:bg-black hover:text-white';
    const wechatButtonClass = isDarkMode
        ? (showWechat ? '!bg-white !text-black' : '!text-white hover:!text-black hover:!bg-white')
        : (showWechat ? 'bg-[#00E096] text-white' : 'hover:bg-[#00E096] hover:text-white');

    const sidebarBg = isDarkMode ? THEME.colors.surfaceDark : THEME.colors.surfaceLight;
    const cardBg = isDarkMode ? 'bg-gray-800' : 'bg-white';
    const text = isDarkMode ? 'text-gray-100' : 'text-black';
    const subText = isDarkMode ? 'text-gray-400' : 'text-gray-600';
    const hoverBg = isDarkMode ? 'hover:bg-gray-900' : 'hover:bg-[#FFFAF0]';

    // Use API author data if available, otherwise fallback to MOCK_USER
    const displayAuthor = author || MOCK_USER;
    const buildMediaUrl = (path, fallback) => {
        if (!path) return fallback;
        if (path.startsWith('http')) return path;
        if (!path.startsWith('/')) return `http://localhost:8080/${path}`;
        return `http://localhost:8080${path}`;
    };
    const authorAvatar = buildMediaUrl(displayAuthor.avatar, MOCK_USER.avatar);
    const authorWechat = "http://localhost:8080/contact/wechat.jpg";
    const allTags = useMemo(() => {
        if (Array.isArray(tagsData) && tagsData.length) {
            const normalized = tagsData
                .map((tag) => {
                    if (!tag) return null;
                    if (typeof tag === 'string') return tag;
                    return tag.name || tag.label || tag.slug || null;
                })
                .filter(Boolean);
            return Array.from(new Set(normalized));
        }
        const source = postsData && postsData.length ? postsData : MOCK_POSTS;
        const unique = [];
        const seen = new Set();
        source.forEach((post) => {
            (post.tags || []).forEach((tag) => {
                if (!tag) return;
                const name = typeof tag === 'string' ? tag : tag.name || tag.label;
                if (!name || seen.has(name)) return;
                seen.add(name);
                unique.push(name);
            });
        });
        return unique;
    }, [tagsData, postsData]);
    useEffect(() => {
        setExpandedTags(false);
        if (activeTag !== 'all' && !allTags.includes(activeTag)) {
            setActiveTag('all');
        }
    }, [allTags, activeTag]);
    const hasMoreTags = allTags.length > TAG_PREVIEW_COUNT;
    const visibleTags = expandedTags ? allTags : allTags.slice(0, TAG_PREVIEW_COUNT);
    const tagAccentClass = useMemo(() => (
        isDarkMode
            ? 'bg-[#1F2937] text-gray-100'
            : 'bg-[#F3F4F6] text-gray-900'
    ), [isDarkMode]);
    const handleTagClick = useCallback((tagName) => {
        setActiveTag((prev) => (prev === tagName ? 'all' : tagName));
        scrollToPostsTop();
    }, [scrollToPostsTop]);
    const recentList = useMemo(() => (Array.isArray(recentComments) ? recentComments.slice(0, 5) : []), [recentComments]);
    const recentFallbackAvatar = 'https://api.dicebear.com/7.x/identicon/svg?seed=sanguicomment&backgroundColor=FFD700,6366F1';

    return (
        <>
            <StatsStrip isDarkMode={isDarkMode} stats={stats}/>
            {konamiActive && (
                <div
                    className="fixed inset-0 z-[100] bg-black mix-blend-difference pointer-events-none animate-pulse flex items-center justify-center">
                    <h1 className="text-white font-black text-9xl -rotate-12">HACKED!!</h1>
                </div>
            )}

            <section id="posts" className="px-4 md:px-8 max-w-7xl mx-auto py-16 min-h-screen">
                <div className="flex flex-col lg:flex-row gap-12">
                    <div className="w-full lg:w-1/4 space-y-8">
                        <div
                            className={`${sidebarBg} border-2 border-black p-6 shadow-[8px_8px_0px_0px_#000] text-center relative ${text}`}>
                            <motion.div
                                animate={{rotate: avatarClicks * 360}}
                                transition={{duration: 0.5}}
                                onClick={() => setAvatarClicks(p => p + 1)}
                                className="absolute -top-6 left-1/2 -translate-x-1/2 w-20 h-20 bg-[#FFD700] rounded-full border-2 border-black flex items-center justify-center cursor-pointer"
                            >
                                <img src={authorAvatar} className="w-full h-full object-cover rounded-full"/>
                            </motion.div>
                            <h3 className="mt-12 font-black text-2xl">{displayAuthor.displayName || displayAuthor.username}</h3>
                            <p className={`text-sm font-bold mb-4 ${subText}`}>{displayAuthor.bio || displayAuthor.title || '保持热爱，持续创作。'}</p>
                            <div className="flex justify-center gap-2">
                                <PopButton variant="ghost" className={`!p-2 border-2 border-black ${socialButtonClass}`}
                                           onClick={() => window.open(displayAuthor.github || MOCK_USER.social.github)}><Github
                                    size={20}/></PopButton>

                                <div
                                    className="relative"
                                    onMouseEnter={() => setShowWechat(true)}
                                    onMouseLeave={() => setShowWechat(false)}
                                >
                                    <PopButton variant="ghost"
                                               className={`!p-2 border-2 border-black ${wechatButtonClass}`}>
                                        <MessageCircle size={20}/>
                                    </PopButton>
                                    <AnimatePresence>
                                        {showWechat && (
                                            <motion.div
                                                initial={{opacity: 0, scale: 0.8, y: 10}}
                                                animate={{opacity: 1, scale: 1, y: 0}}
                                                exit={{opacity: 0, scale: 0.8, y: 10}}
                                                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-50"
                                            >
                                                <div
                                                    className="bg-white p-2 border-4 border-black shadow-[4px_4px_0px_0px_#000] w-40 h-40 flex flex-col items-center justify-center">
                                                    <img src={authorWechat}
                                                         className="w-32 h-32 object-contain border border-gray-200 block"/>
                                                    <p className="text-center text-[10px] font-bold mt-1 bg-black text-white w-full">SCAN
                                                        ME</p>
                                                </div>
                                                <div
                                                    className="w-4 h-4 bg-black rotate-45 absolute -bottom-2 left-1/2 -translate-x-1/2"></div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-black text-xl mb-4 flex items-center gap-2 bg-black text-white p-2 transform -rotate-1 w-max">
                                <Filter size={20}/> NAVIGATOR
                            </h4>
                            <div className="flex flex-col gap-3">
                                {categories.map(cat => (
                                    <div key={cat.id} className="group">
                                        <button
                                            onClick={() => {
                                                setActiveParent(cat.id);
                                                setActiveSub('all');
                                            }}
                                            className={`w-full text-left p-3 font-bold border-2 border-black transition-all flex justify-between items-center
                          ${activeParent === cat.id
                            ? (isDarkMode
                                ? 'bg-[#FFD700] text-black border-[#FFD700] shadow-[4px_4px_0px_0px_#000] -translate-y-1'
                                : 'bg-[#6366F1] text-white shadow-[4px_4px_0px_0px_#000] -translate-y-1')
                            : `${sidebarBg} ${text} ${isDarkMode ? 'hover:bg-gray-700 hover:text-white' : 'hover:bg-gray-100'}`}
                        `}
                                        >
                                            {cat.label}
                                            <ChevronRight size={16}
                                                          className={`transition-transform ${activeParent === cat.id ? 'rotate-90' : ''}`}/>
                                        </button>
                                        <AnimatePresence>
                                            {activeParent === cat.id && cat.children.length > 0 && (
                                                <motion.div
                                                    initial={{height: 0}} animate={{height: 'auto'}} exit={{height: 0}}
                                                    className={`overflow-hidden border-l-4 border-black ml-4 ${sidebarBg}`}
                                                >
                                                    {cat.children.map(sub => (
                                                        <button
                                                            key={sub.id}
                                                            onClick={() => setActiveSub(sub.id)}
                                                            className={`block w-full text-left px-4 py-2 text-sm font-bold ${isDarkMode ? 'border-gray-700' : 'border-black'} border-b last:border-0
                                   ${activeSub === sub.id ? 'bg-[#FFD700] text-black' : `${subText} hover:bg-black/10`}
                                 `}
                                                        >
                                                            {sub.label}
                                                        </button>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ))}
                            </div>
                        </div>


                        <div className={`${sidebarBg} border-2 border-black p-5 shadow-[6px_6px_0px_0px_#000]`}>
                            <div className="flex items-center justify-between gap-3">
                                <h4 className={`font-black text-lg flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                                    <MessageCircle size={18} className={isDarkMode ? 'text-white' : 'text-black'}/> 最新评论
                                </h4>
                                <span className={`text-[10px] font-mono ${subText}`}>NEW X {recentList.length}</span>
                            </div>
                            <div className="mt-4 space-y-4">
                                {recentList.length ? recentList.map((comment, index) => {
                                    const avatar = buildMediaUrl(comment.avatar, recentFallbackAvatar);
                                    const articleLabel = comment.postTitle || '文章';
                                    const handleNavigate = () => {
                                        if (!comment.postId) return;
                                        setArticleId(comment.postId);
                                        setView('article');
                                    };
                                    return (
                                        <div key={comment.id || `recent-${comment.postId || 'post'}-${index}`}
                                             className={`border-2 border-black p-3 rounded-xl ${isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-800'} shadow-[4px_4px_0px_0px_#000]`}>
                                            <div className="flex items-center gap-3">
                                                <img src={avatar} alt={comment.authorName || '访客'}
                                                     className="w-10 h-10 rounded-full border-2 border-black object-cover bg-[#FFD700]"/>
                                                <div>
                                                    <p className="font-black text-sm">{comment.authorName || '访客'}</p>
                                                    <p className="text-[11px] text-gray-500">{comment.time || ''}</p>
                                                </div>
                                            </div>
                                            <p
                                                className={`mt-2 text-sm font-medium leading-relaxed max-h-20 overflow-hidden cursor-pointer ${isDarkMode ? 'hover:text-[#FFD700]' : 'hover:text-[#FF0080]'}`}
                                                onClick={handleNavigate}
                                                title={`来自《${articleLabel}》`}
                                            >
                                                {comment.content}
                                            </p>
                                        </div>
                                    );
                                }) : (
                                    <p className={`text-sm font-bold ${subText}`}>暂无最新评论</p>
                                )}
                            </div>
                        </div>

                        <div className={`${sidebarBg} border-2 border-black p-5 shadow-[6px_6px_0px_0px_#000]`}>
                            <div className="flex items-center justify-between gap-3">
                                <h4 className={`font-black text-lg flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                                    <Hash size={18} className={isDarkMode ? 'text-white' : 'text-black'}/> 全部标签
                                </h4>
                                <span className={`text-[10px] font-mono ${subText}`}>{allTags.length} TAGS</span>
                            </div>
                            {activeTag !== 'all' && (
                                <div className="mt-2 flex items-center justify-between text-xs font-bold">
                                    <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                                        正在查看 #{activeTag}
                                    </span>
                                    <button
                                        onClick={() => {
                                            setActiveTag('all');
                                            scrollToPostsTop();
                                        }}
                                        className={`px-2 py-1 border-2 border-black shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5 transition-transform ${isDarkMode ? 'bg-[#111827] text-white' : 'bg-white text-black'}`}
                                    >
                                        清除筛选
                                    </button>
                                </div>
                            )}
                            <div className="mt-4 flex flex-wrap gap-2">
                                {visibleTags.length ? (
                                    visibleTags.map((tag) => {
                                        const isActive = activeTag === tag;
                                        return (
                                            <button
                                                type="button"
                                                key={tag}
                                                onClick={() => handleTagClick(tag)}
                                                aria-pressed={isActive}
                                                className={`px-3 py-1 text-xs font-black border-2 border-black rounded-full shadow-[3px_3px_0px_0px_#000] transition-transform hover:-translate-y-0.5 ${isActive ? 'bg-[#FFD700] text-black' : tagAccentClass}`}
                                            >
                                                #{tag}
                                            </button>
                                        );
                                    })
                                ) : (
                                    <span className={`text-sm font-bold ${subText}`}>暂无标签</span>
                                )}
                            </div>
                            {hasMoreTags && (
                                <button
                                    onClick={() => setExpandedTags(prev => !prev)}
                                    className="mt-3 w-full text-xs font-black border-2 border-black px-3 py-2 shadow-[3px_3px_0px_0px_#000] bg-[#FFD700] text-black hover:-translate-y-0.5 transition-transform"
                                >
                                    {expandedTags ? '收起标签' : '展开全部标签'}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col">
                        <div className="space-y-8 flex-1">
                            {displayPosts.length > 0 ? (
                                displayPosts.map((post, idx) => {
                                    const viewCount = post.views ?? post.viewsCount ?? 0;
                                    const commentCount = post.comments ?? post.commentsCount ?? 0;
                                    return (
                                        <motion.div
                                            key={post.id}
                                            initial={{opacity: 0, y: 50}}
                                            animate={{opacity: 1, y: 0}}
                                            transition={{delay: idx * 0.1, duration: 0.5}}
                                        >
                                            <TiltCard onClick={() => {
                                                setArticleId(post.id);
                                                setView('article');
                                            }}>
                                                <div className="flex flex-col md:flex-row">
                                                    <div
                                                        className={`md:w-1/3 h-48 md:h-auto ${post.color} border-b-2 md:border-b-0 md:border-r-2 border-black p-6 flex flex-col justify-between text-white relative overflow-hidden group`}>
                                                        <div
                                                            className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity transform group-hover:scale-110 duration-500">
                                                            <Code size={120}/>
                                                        </div>
                                                        <span className="relative z-10 font-black text-5xl opacity-50">
                              {(idx + 1 + (currentPage - 1) * PAGE_SIZE).toString().padStart(2, '0')}
                            </span>
                                                        <div className="relative z-10">
                                                            <span
                                                                className="bg-black text-white px-2 py-1 text-xs font-bold uppercase mb-2 inline-block">{post.parentCategory}</span>
                                                            <h4 className="font-black text-2xl leading-none">{post.category}</h4>
                                                        </div>
                                                    </div>

                                                    <div className={`flex-1 p-6 md:p-8 ${cardBg} group ${hoverBg}`}>
                                                        <div className="flex flex-wrap gap-2 mb-4">
                                                            {post.tags.map(t => (
                                                                <span key={t}
                                                                      className={`px-2 py-1 border border-black text-xs font-bold ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-white'} shadow-[2px_2px_0px_0px_#000]`}>#{t}</span>
                                                            ))}
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-3 mb-4">
                                                            <h2 className={`text-3xl font-black flex-1 group-hover:text-[#6366F1] transition-colors ${text}`}>{post.title}</h2>
                                                            {isPostNew(post.date) && (
                                                                <span
                                                                    className="inline-flex items-center gap-1 px-3 py-1 text-xs font-black uppercase tracking-widest border-2 border-black bg-[#FF0080] text-white shadow-[2px_2px_0px_0px_#000] animate-pulse">
                                                                    <Sparkles size={14} strokeWidth={3}/>
                                                                    NEW
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className={`text-lg font-medium mb-6 border-l-4 border-gray-300 pl-4 ${subText}`}>{post.excerpt}</p>

                                                        <div
                                                            className={`flex justify-between items-center border-t-2 ${isDarkMode ? 'border-gray-700' : 'border-black'} pt-4 border-dashed`}>
                                                            <span
                                                                className="font-mono font-bold text-xs bg-black text-white px-2 py-1">{post.date}</span>
                                                            <div className={`flex gap-4 font-bold text-sm ${text}`}>
                                                                <span
                                                                    className="flex items-center gap-1 hover:text-[#FF0080]"><Eye
                                                                    size={18}/> {viewCount}</span>
                                                                <span
                                                                    className="flex items-center gap-1 hover:text-[#6366F1]"><MessageSquare
                                                                    size={18}/> {commentCount}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </TiltCard>
                                        </motion.div>
                                    );
                                })
                            ) : (
                                <div className={`p-12 border-4 border-black border-dashed text-center ${cardBg}`}>
                                    <p className={`text-2xl font-black ${subText}`}>NO DATA FOUND</p>
                                    <PopButton variant="primary" className="mt-4" onClick={() => {
                                        setActiveParent('all');
                                        setActiveSub('all')
                                    }}>RESET FILTERS</PopButton>
                                </div>
                            )}
                        </div>

                        {totalPages > 1 && (
                            <div className="mt-12 flex justify-center items-center gap-4">
                                <button
                                    disabled={currentPage === 1}
                                    onClick={() => {
                                        setCurrentPage(p => Math.max(1, p - 1));
                                        scrollToPostsTop();
                                    }}
                                    className={`p-3 border-2 border-black ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-white'} hover:bg-[#FFD700] disabled:opacity-50 disabled:hover:bg-white transition-colors shadow-[4px_4px_0px_0px_#000] active:translate-y-1 active:shadow-none`}
                                >
                                    <ChevronLeft size={20} strokeWidth={3}/>
                                </button>

                                <div className="flex gap-2">
                                    {Array.from({length: totalPages}, (_, i) => i + 1).map(p => (
                                        <button
                                            key={p}
                                            onClick={() => {
                                                setCurrentPage(p);
                                                scrollToPostsTop();
                                            }}
                                            className={`w-10 h-10 border-2 border-black font-black transition-all shadow-[4px_4px_0px_0px_#000]
                          ${currentPage === p ? 'bg-black text-white -translate-y-1 shadow-[6px_6px_0px_0px_#FF0080]' : `${isDarkMode ? 'bg-gray-700 text-white' : 'bg-white'} hover:bg-[#6366F1] hover:text-white`}
                        `}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    disabled={currentPage === totalPages}
                                    onClick={() => {
                                        setCurrentPage(p => Math.min(totalPages, p + 1));
                                        scrollToPostsTop();
                                    }}
                                    className={`p-3 border-2 border-black ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-white'} hover:bg-[#FFD700] disabled:opacity-50 disabled:hover:bg-white transition-colors shadow-[4px_4px_0px_0px_#000] active:translate-y-1 active:shadow-none`}
                                >
                                    <ChevronRight size={20} strokeWidth={3}/>
                                </button>
                            </div>
                        )}

                        <div className="py-12 text-center mt-8">
                            <div className="inline-block relative">
                                <div
                                    className="absolute inset-0 bg-[#FFD700] transform translate-x-2 translate-y-2 border-2 border-black"></div>
                                <div
                                    className={`relative border-2 border-black px-8 py-4 text-2xl font-black italic ${cardBg} ${text}`}>
                                    "阻挡你的不是别人，而是你自己。"
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
};

const LoginView = ({setView, setUser, isDarkMode, doLogin}) => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            if (doLogin) {
                const res = await doLogin(username, password);
                if (res?.user) setUser(res.user);
            } else {
                setUser(MOCK_USER);
            }
            setView('home');
        } catch (err) {
            setError(err.message || "\u767b\u5f55\u5931\u8d25");
        } finally {
            setLoading(false);
        }
    };
    const bg = isDarkMode ? THEME.colors.bgDark : 'bg-gray-100';
    const surface = isDarkMode ? THEME.colors.surfaceDark : THEME.colors.surfaceLight;
    const text = isDarkMode ? 'text-gray-100' : 'text-gray-800';
    const inputBg = isDarkMode ? 'bg-gray-700 text-white' : 'bg-white text-black';

    return (
        <div className={`h-screen flex items-center justify-center ${bg} ${text}`}>
            <div className={`${surface} p-8 rounded-none border-4 border-black shadow-[8px_8px_0px_0px_#000] w-96`}>
                <h2 className="text-3xl font-black mb-6 text-center uppercase italic">System Access</h2>
                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                        <label className="font-bold text-sm uppercase">Username</label>
                        <input
                            className={`w-full border-2 border-black p-3 font-bold outline-none focus:shadow-[4px_4px_0px_0px_#FFD700] transition-shadow ${inputBg}`}
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter username"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="font-bold text-sm uppercase">Password</label>
                        <input
                            className={`w-full border-2 border-black p-3 font-bold outline-none focus:shadow-[4px_4px_0px_0px_#FFD700] transition-shadow ${inputBg}`}
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password"
                        />
                    </div>
                    {error && <div
                        className="bg-red-500 text-white p-2 font-bold text-sm border-2 border-black">{error}</div>}
                    <div className="flex gap-4">
                        <PopButton variant="primary" className="w-full justify-center"
                                   disabled={loading}>{loading ? 'Accessing...' : 'Login'}</PopButton>
                        <PopButton variant="ghost" type="button" onClick={() => setView('home')}>Cancel</PopButton>
                    </div>
                </form>
            </div>
        </div>
    );
};
