import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import PopButton from "../../components/common/PopButton.jsx";
import ImageWithFallback from "../../components/common/ImageWithFallback.jsx";
import TiltCard from "../ui/TiltCard.jsx";
import BackgroundEasterEggs from "../ui/BackgroundEasterEggs.jsx";
import StatsStrip from "./StatsStrip.jsx";
import GlassPopupToast, { getGlassPopupToastTop } from "../ui/GlassPopupToast.jsx";
import {
    createArticleExcerptOverflowTracker,
    getArticleExcerptTooltip,
    observeArticleExcerptOverflow
} from "./articleExcerptTooltip.js";
import { buildAssetUrl } from "../../utils/asset.js";
import sanitizeHtml from "../../utils/sanitize.js";
import {
    DEFAULT_HOME_QUOTE,
    DEFAULT_PAGE_SIZE,
    CATEGORY_TREE,
    MOCK_USER,
    SPIN_INTERVAL_MS,
    SPIN_LOCK_DURATION,
    SPIN_WARNINGS,
    SPIN_WARN_THRESHOLD,
    MEGA_SPIN_DURATION,
    MEGA_SPIN_THRESHOLD,
    TAG_PREVIEW_COUNT,
    THEME,
    extractHexFromBgClass
} from "../shared.js";
import {
    ArrowRight,
    ArrowUp,
    ChevronRight,
    Clock,
    Code,
    Eye,
    Filter,
    Github,
    Hash,
    Lock,
    MessageCircle,
    MessageSquare,
    Search,
    Sparkles,
    Tag,
    X
} from 'lucide-react';

const NEW_BADGE_ACTIVE_MS = 7000;

const ArticleList = ({
    setView,
    setArticleId,
    isDarkMode,
    postsPage,
    postsLoading,
    postsError,
    onQueryChange,
    categoriesData,
    tagsData,
    stats,
    author,
    activeParent,
    setActiveParent,
    activeSub,
    setActiveSub,
    recentComments,
    onScrollToPosts,
    backgroundEnabled = true,
    homeQuote,
    pageSize = DEFAULT_PAGE_SIZE,
    skipInitialQuery = false
}) => {
    const [showWechat, setShowWechat] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const paginationScrollReadyRef = useRef(false);
    const [konamiActive, setKonamiActive] = useState(false);
    const konamiSequence = useRef([]);
    const KONAMI_CODE = useMemo(() => ([
        'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
        'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
        'b', 'a'
    ]), []);
    const [avatarClicks, setAvatarClicks] = useState(0);
    const [spinWarning, setSpinWarning] = useState('');
    const [showSpinWarning, setShowSpinWarning] = useState(false);
    const [spinLockActive, setSpinLockActive] = useState(false);
    const [megaSpinActive, setMegaSpinActive] = useState(false);
    const [expandedTags, setExpandedTags] = useState(false);
    const [activeTag, setActiveTag] = useState('all');
    const [keyword, setKeyword] = useState('');
    const [appliedKeyword, setAppliedKeyword] = useState('');
    const [excerptOverflowMap, setExcerptOverflowMap] = useState({});
    const [newBadgeMotionEnabled, setNewBadgeMotionEnabled] = useState(true);
    const [mobilePerformanceMode, setMobilePerformanceMode] = useState(false);
    const endingQuote = (typeof homeQuote === 'string' && homeQuote.trim().length > 0) ? homeQuote : DEFAULT_HOME_QUOTE;
    const skipInitialQueryRef = useRef(skipInitialQuery);
    const skipInitialQueryReleaseTimerRef = useRef(null);
    const warningTimerRef = useRef(null);
    const excerptOverflowTracker = useMemo(() => createArticleExcerptOverflowTracker(), []);
    const lastSpinAtRef = useRef(0);
    const spinComboRef = useRef(0);
    const lastWarningComboRef = useRef(0);
    const megaSpinTimerRef = useRef(null);
    const spinLockTimerRef = useRef(null);
    const starField = useMemo(() => ([
        { top: '12%', left: '20%', scale: 0.8 },
        { top: '25%', left: '70%', scale: 1 },
        { top: '60%', left: '30%', scale: 0.9 },
        { top: '75%', left: '65%', scale: 1.1 },
        { top: '40%', left: '50%', scale: 1.2 },
        { top: '15%', left: '85%', scale: 0.7 }
    ]), []);
    const NEW_POST_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const keywordText = appliedKeyword.trim();
    const cardEffectsDisabled = mobilePerformanceMode || !newBadgeMotionEnabled;
    const visibleTagLimit = mobilePerformanceMode ? 1 : 3;
    const isPostNew = (dateStr) => {
        if (!dateStr) return false;
        const parsed = Date.parse(`${dateStr}T00:00:00`);
        if (Number.isNaN(parsed)) return false;
        const diff = now - parsed;
        if (diff < 0) return false;
        return diff <= NEW_POST_WINDOW_MS;
    };

    useEffect(() => {
        const timer = setTimeout(() => setNewBadgeMotionEnabled(false), NEW_BADGE_ACTIVE_MS);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
            return undefined;
        }

        const mobileQuery = window.matchMedia('(max-width: 768px)');
        const syncMobilePerformanceMode = () => setMobilePerformanceMode(mobileQuery.matches);
        syncMobilePerformanceMode();
        mobileQuery.addEventListener?.('change', syncMobilePerformanceMode);

        return () => {
            mobileQuery.removeEventListener?.('change', syncMobilePerformanceMode);
        };
    }, []);

    const showSpinHint = useCallback((message, duration = 2200) => {
        setSpinWarning(message);
        setShowSpinWarning(true);
        if (warningTimerRef.current) {
            clearTimeout(warningTimerRef.current);
        }
        warningTimerRef.current = setTimeout(() => setShowSpinWarning(false), duration);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e) => {
            konamiSequence.current = [...konamiSequence.current, e.key].slice(-10);
            if (JSON.stringify(konamiSequence.current) === JSON.stringify(KONAMI_CODE)) {
                setKonamiActive(true);
                showSpinHint("开发者模式已激活：系统过载中…", 2600);
                setTimeout(() => setKonamiActive(false), 5000);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [KONAMI_CODE, showSpinHint]);

    const categories = categoriesData && categoriesData.length
        ? (categoriesData.some((c) => c.id === "all") ? categoriesData : [{
            id: "all",
            label: "全部",
            children: []
        }, ...categoriesData])
        : CATEGORY_TREE;
    const sourcePosts = useMemo(
        () => (Array.isArray(postsPage?.records) ? postsPage.records : []),
        [postsPage?.records]
    );
    const registerExcerptElement = useCallback((postId, element) => {
        excerptOverflowTracker.registerElement(postId, element);
    }, [excerptOverflowTracker]);
    const measureExcerptOverflow = useCallback(() => {
        const nextOverflowMap = excerptOverflowTracker.measure();
        setExcerptOverflowMap((prev) => {
            const prevKeys = Object.keys(prev);
            const nextKeys = Object.keys(nextOverflowMap);
            if (prevKeys.length === nextKeys.length && nextKeys.every((key) => prev[key] === nextOverflowMap[key])) {
                return prev;
            }
            return nextOverflowMap;
        });
    }, [excerptOverflowTracker]);
    const scrollToPostsTop = useCallback(() => {
        if (onScrollToPosts) {
            onScrollToPosts();
        } else {
            document.getElementById('posts')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [onScrollToPosts]);

    const handleParentClick = useCallback((catId) => {
        setActiveSub('all');
        if (catId === 'all' || catId === activeParent) {
            setActiveParent('all');
        } else {
            setActiveParent(catId);
        }
        scrollToPostsTop();
    }, [activeParent, scrollToPostsTop, setActiveParent, setActiveSub]);

    const handleSubClick = useCallback((subId) => {
        setActiveSub(subId);
        scrollToPostsTop();
    }, [scrollToPostsTop, setActiveSub]);

    const triggerSpinLock = useCallback(() => {
        setSpinLockActive(true);
        setMegaSpinActive(true);
        if (megaSpinTimerRef.current) {
            clearTimeout(megaSpinTimerRef.current);
        }
        megaSpinTimerRef.current = setTimeout(() => {
            setMegaSpinActive(false);
        }, MEGA_SPIN_DURATION);
        if (spinLockTimerRef.current) {
            clearTimeout(spinLockTimerRef.current);
        }
        spinLockTimerRef.current = setTimeout(() => {
            setSpinLockActive(false);
            setMegaSpinActive(false);
        }, SPIN_LOCK_DURATION);
    }, []);

    const handleAvatarClick = useCallback(() => {
        if (spinLockActive) {
            showSpinHint('冷却中…别急！', 1800);
            return;
        }
        setAvatarClicks((prev) => prev + 1);
        const now = Date.now();
        if (now - lastSpinAtRef.current < SPIN_INTERVAL_MS) {
            spinComboRef.current += 1;
        } else {
            spinComboRef.current = 1;
            lastWarningComboRef.current = 0;
        }
        lastSpinAtRef.current = now;

        if (spinComboRef.current >= MEGA_SPIN_THRESHOLD) {
            spinComboRef.current = 0;
            lastWarningComboRef.current = 0;
            showSpinHint('系统过载，强制降速！', 2000);
            triggerSpinLock();
            return;
        }

        if (spinComboRef.current >= SPIN_WARN_THRESHOLD && lastWarningComboRef.current !== spinComboRef.current) {
            lastWarningComboRef.current = spinComboRef.current;
            const message = SPIN_WARNINGS[Math.floor(Math.random() * SPIN_WARNINGS.length)];
            showSpinHint(message);
        }
    }, [showSpinHint, spinLockActive, triggerSpinLock]);

    useEffect(() => {
        return () => {
            if (skipInitialQueryReleaseTimerRef.current) {
                clearTimeout(skipInitialQueryReleaseTimerRef.current);
            }
            if (warningTimerRef.current) {
                clearTimeout(warningTimerRef.current);
            }
            if (megaSpinTimerRef.current) {
                clearTimeout(megaSpinTimerRef.current);
            }
            if (spinLockTimerRef.current) {
                clearTimeout(spinLockTimerRef.current);
            }
        };
    }, []);

    const normalizeNumericId = useCallback((value) => {
        if (value === null || value === undefined) return null;
        const num = Number(value);
        return Number.isFinite(num) && num > 0 ? num : null;
    }, []);

    const selectedCategoryId = useMemo(() => {
        if (activeSub !== 'all') return normalizeNumericId(activeSub);
        if (activeParent !== 'all') return normalizeNumericId(activeParent);
        return null;
    }, [activeParent, activeSub, normalizeNumericId]);

    const selectedTagId = useMemo(() => {
        if (activeTag === 'all') return null;
        if (!Array.isArray(tagsData) || !tagsData.length) return null;
        const matched = tagsData.find((tag) => {
            if (!tag) return false;
            const name = typeof tag === 'string' ? tag : (tag.name || tag.label || tag.slug || '');
            return name === activeTag;
        });
        const id = typeof matched === 'string' ? null : matched?.id;
        return normalizeNumericId(id);
    }, [activeTag, tagsData, normalizeNumericId]);
    const hasSearchFilters = Boolean(selectedCategoryId || selectedTagId || keywordText);
    const searchTotal = Number(postsPage?.total ?? 0) || 0;
    const searchGlobalTotal = Number(stats?.posts ?? 0) || searchTotal;
    const searchSummaryText = hasSearchFilters ? `已筛选 ${searchTotal} 篇` : `共 ${searchGlobalTotal} 篇`;

    const buildQueryParams = useCallback((overrides = {}) => {
        const params = {
            page: typeof overrides.page === 'number' ? overrides.page : 1,
            size: pageSize,
        };
        if (selectedCategoryId) params.categoryId = selectedCategoryId;
        if (selectedTagId) params.tagId = selectedTagId;
        if (keywordText) params.keyword = keywordText;
        return params;
    }, [keywordText, pageSize, selectedCategoryId, selectedTagId]);

    useEffect(() => {
        if (skipInitialQueryRef.current) {
            if (skipInitialQueryReleaseTimerRef.current === null) {
                skipInitialQueryReleaseTimerRef.current = setTimeout(() => {
                    skipInitialQueryRef.current = false;
                    skipInitialQueryReleaseTimerRef.current = null;
                }, 0);
            }
            return;
        }
        setCurrentPage(1);
        paginationScrollReadyRef.current = false;
        if (onQueryChange) {
            onQueryChange(buildQueryParams({ page: 1 }));
        }
    }, [activeParent, activeSub, activeTag, pageSize, keywordText, onQueryChange, buildQueryParams]);

    useEffect(() => {
        if (!paginationScrollReadyRef.current) {
            paginationScrollReadyRef.current = true;
            return;
        }
        scrollToPostsTop();
    }, [currentPage, scrollToPostsTop]);

    const totalPages = Math.max(1, Math.ceil((Number(postsPage?.total ?? 0) || 0) / pageSize));
    // 筛选/分页触发加载时，隐藏旧文章卡片，避免“加载中卡片 + 旧卡片堆叠”的视觉别扭
    const displayPosts = useMemo(() => (postsLoading ? [] : sourcePosts), [postsLoading, sourcePosts]);
    useEffect(() => {
        return observeArticleExcerptOverflow(
            excerptOverflowTracker.getElements(),
            measureExcerptOverflow
        );
    }, [displayPosts, excerptOverflowTracker, measureExcerptOverflow]);
    const goToPage = useCallback((page) => {
        const targetPage = Math.min(totalPages, Math.max(1, Number(page) || 1));
        if (targetPage === currentPage) return;
        setCurrentPage(targetPage);
        if (onQueryChange) {
            onQueryChange(buildQueryParams({ page: targetPage }));
        }
        scrollToPostsTop();
    }, [buildQueryParams, currentPage, onQueryChange, scrollToPostsTop, totalPages]);

    const paginationItems = useMemo(() => {
        const numericWindow = 6;
        if (totalPages <= numericWindow + 2) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }

        let windowStart = Math.max(1, currentPage - Math.floor(numericWindow / 2));
        let windowEnd = windowStart + numericWindow - 1;

        if (windowEnd > totalPages) {
            windowEnd = totalPages;
            windowStart = Math.max(1, windowEnd - numericWindow + 1);
        }

        const pages = [];
        if (windowStart > 1) {
            pages.push(1);
        }
        if (windowStart > 2) {
            pages.push('ellipsis-left');
        }
        for (let p = windowStart; p <= windowEnd; p += 1) {
            pages.push(p);
        }
        if (windowEnd < totalPages - 1) {
            pages.push('ellipsis-right');
        }
        if (windowEnd < totalPages) {
            pages.push(totalPages);
        }
        return pages;
    }, [currentPage, totalPages]);

    const socialButtonClass = isDarkMode
        ? '!text-white hover:!text-black hover:!bg-white'
        : 'hover:bg-black/10 hover:text-black';
    const wechatButtonClass = isDarkMode
        ? (showWechat ? '!bg-white !text-black' : '!text-white hover:!text-black hover:!bg-white')
        : (showWechat ? 'bg-[#00E096] text-black' : 'hover:bg-[#00E096] hover:text-black');

    const sidebarBg = isDarkMode ? THEME.colors.surfaceDark : THEME.colors.surfaceLight;
    const cardBg = isDarkMode ? 'bg-gray-800' : 'bg-white';
    const text = isDarkMode ? 'text-gray-100' : 'text-black';
    const subText = isDarkMode ? 'text-gray-400' : 'text-gray-600';
    const hoverBg = isDarkMode ? 'hover:bg-gray-900/45' : 'hover:bg-white/35';
    const glassSurface = `home-ios-card ${isDarkMode ? 'home-ios-card--dark' : ''}`;
    const glassInner = 'home-ios-inner-card';

    // Use API author data if available, otherwise fallback to MOCK_USER
    const displayAuthor = author || MOCK_USER;
    const buildMediaUrl = (path, fallback) => buildAssetUrl(path, fallback);
    const authorAvatar = buildMediaUrl(displayAuthor.avatar, MOCK_USER.avatar);
    const authorWechat = buildMediaUrl("/contact/wechat.jpg");
    const authorBioHtml = typeof displayAuthor.bio === 'string' ? displayAuthor.bio.trim() : '';
    const safeAuthorBioHtml = useMemo(() => (authorBioHtml ? sanitizeHtml(authorBioHtml) : ''), [authorBioHtml]);
    const fallbackBio = displayAuthor.title || '保持热爱，持续创作。';
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
        return [];
    }, [tagsData]);
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
            <div className={`relative z-20 home-redesign-surface ${isDarkMode ? 'bg-[#09111d] is-dark' : 'bg-[#f8f8fa]'}`}>
                {backgroundEnabled && (
                    <div className="pointer-events-none absolute inset-x-0 top-0 bottom-0 z-0">
                        <BackgroundEasterEggs isDarkMode={isDarkMode} fixed={false} />
                    </div>
                )}
                <div className="relative z-10">
                    <StatsStrip isDarkMode={isDarkMode} stats={stats} />
                </div>
                <GlassPopupToast
                    open={showSpinWarning}
                    isDarkMode={isDarkMode}
                    top={getGlassPopupToastTop(88)}
                >
                    <span className="block w-full text-center text-base font-black tracking-[0.08em]">
                        {spinWarning}
                    </span>
                </GlassPopupToast>
                <AnimatePresence>
                    {megaSpinActive && (
                        <motion.div
                            className="fixed inset-0 z-[145] pointer-events-none"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <motion.div
                                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0.8 }}
                                exit={{ opacity: 0 }}
                            />
                            {starField.map((pos, idx) => (
                                <motion.div
                                    key={`star-${idx}`}
                                    className={`absolute ${isDarkMode ? 'text-amber-200' : 'text-[#FFD700]'}`}
                                    style={{ top: pos.top, left: pos.left }}
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: [0, 1, 0.4, 1], scale: [0, pos.scale, pos.scale * 0.8, pos.scale] }}
                                    transition={{ duration: 2 + idx * 0.2, repeat: Infinity, ease: 'easeInOut' }}
                                >
                                    <Sparkles size={48} strokeWidth={1.2} />
                                </motion.div>
                            ))}
                            <div className="relative w-full h-full flex flex-col items-center justify-center gap-6 text-white">
                                <motion.div
                                    aria-label="眼冒金星模式"
                                    initial={{ scale: 0.8, rotate: -6 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    exit={{ scale: 0.8, rotate: 4, opacity: 0 }}
                                    className={`relative overflow-hidden px-7 py-5 md:px-10 md:py-6 text-center home-ios-card home-ios-card--static ${isDarkMode ? 'home-ios-card--dark text-white border-white/14' : 'text-black border-white/75'} shadow-[0_24px_70px_rgba(15,23,42,0.28)]`}
                                >
                                    <div className="absolute inset-x-6 -top-12 h-24 rounded-full bg-[#FFD700]/25 blur-3xl" />
                                    <div className="relative flex items-center justify-center gap-3">
                                        <span className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${isDarkMode ? 'border-amber-200/30 bg-amber-300/14 text-amber-100' : 'border-amber-500/25 bg-amber-100 text-amber-700'}`}>
                                            <Sparkles size={22} strokeWidth={2.6} />
                                        </span>
                                        <span className="text-2xl md:text-3xl font-black tracking-[0.18em]">
                                            眼冒金星模式
                                        </span>
                                    </div>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className={`px-4 py-2 rounded-full border text-xs md:text-sm font-mono tracking-[0.32em] backdrop-blur-2xl ${isDarkMode ? 'border-white/14 bg-white/8 text-white/75' : 'border-white/60 bg-white/45 text-white'}`}
                                >
                                    SYSTEM COOLING DOWN...
                                </motion.div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                {konamiActive && (
                    <div
                        className="fixed inset-0 z-[100] bg-black mix-blend-difference pointer-events-none animate-pulse flex items-center justify-center">
                        <h1 className="text-white font-black text-9xl -rotate-12">HACKED!!</h1>
                    </div>
                )}

                <section id="posts" className="relative w-full pt-12 pb-16 min-h-screen overflow-hidden">
                <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 flex flex-col lg:flex-row gap-12">
                    <div className="hidden lg:block w-full lg:w-1/4 space-y-8">
                        <div
                            className={`${sidebarBg} ${glassSurface} home-ios-card--static home-ios-card--overflow-visible p-6 text-center relative ${text}`}>
                            <motion.div
                                animate={spinLockActive ? { rotate: [0, -8, 8, -5, 5, 0] } : { rotate: avatarClicks * 360 }}
                                transition={spinLockActive ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.5 }}
                                onClick={handleAvatarClick}
                                className="absolute -top-6 left-1/2 -translate-x-1/2 w-20 h-20 bg-[#FFD700] rounded-full border border-white/60 flex items-center justify-center cursor-pointer shadow-[0_8px_20px_rgba(0,0,0,0.16)]"
                            >
                                <img src={authorAvatar} className="w-full h-full object-cover rounded-full" />
                                {spinLockActive && (
                                    <motion.div
                                        className="absolute inset-0 rounded-full border-2 border-black bg-black/40 flex items-center justify-center"
                                        animate={{ scale: [1, 1.05, 1] }}
                                        transition={{ duration: 1.2, repeat: Infinity }}
                                    >
                                        <span className="text-[10px] font-black tracking-[0.4em] text-white">LOCK</span>
                                    </motion.div>
                                )}
                            </motion.div>
                            <h3 className="mt-12 font-black text-2xl">{displayAuthor.displayName || displayAuthor.username}</h3>
                            {safeAuthorBioHtml ? (
                                <div
                                    className={`text-sm font-bold mb-4 ${subText}`}
                                    dangerouslySetInnerHTML={{ __html: safeAuthorBioHtml }}
                                />
                            ) : (
                                <p className={`text-sm font-bold mb-4 ${subText}`}>{fallbackBio}</p>
                            )}
                            <div className="flex justify-center gap-2">
                                <PopButton variant="ghost" className={`!p-2 border-2 border-black ${socialButtonClass}`}
                                    onClick={() => window.open(displayAuthor.github || MOCK_USER.social.github)}><Github
                                        size={20} /></PopButton>

                                <div
                                    className="relative"
                                    onMouseEnter={() => setShowWechat(true)}
                                    onMouseLeave={() => setShowWechat(false)}
                                >
                                    <PopButton variant="ghost"
                                        className={`!p-2 border-2 border-black ${wechatButtonClass}`}>
                                        <MessageCircle size={20} />
                                    </PopButton>
                                    <AnimatePresence>
                                        {showWechat && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                                                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-50"
                                            >
                                                <div
                                                    className="bg-white p-2 border-4 border-black shadow-[4px_4px_0px_0px_#000] w-40 h-40 flex flex-col items-center justify-center">
                                                    <img src={authorWechat}
                                                        className="w-32 h-32 object-contain border border-gray-200 block" />
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
                                <Filter size={20} /> NAVIGATOR
                            </h4>
                            <div className="flex flex-col gap-3">
                                {categories.map(cat => (
                                    <div key={cat.id} className="group">
                                        <button
                                            onClick={() => handleParentClick(cat.id)}
                                            className={`w-full text-left p-3 font-bold transition-all flex justify-between items-center rounded-2xl border
                          ${activeParent === cat.id
                                                    ? (isDarkMode
                                                        ? 'bg-[#FFD700]/90 text-black border-[#FFD700]/90 shadow-[0_12px_28px_rgba(255,215,0,0.28)] -translate-y-0.5'
                                                        : 'bg-[#6366F1]/85 text-white border-[#8B90FF]/70 shadow-[0_10px_24px_rgba(99,102,241,0.24)] -translate-y-0.5')
                                                    : `${glassInner} ${text} ${isDarkMode ? 'hover:bg-gray-700/40 hover:text-white' : 'hover:bg-white/60'}`}
                        `}
                                        >
                                            {cat.label}
                                            <ChevronRight size={16}
                                                className={`transition-transform ${activeParent === cat.id ? 'rotate-90' : ''}`} />
                                        </button>
                                        <AnimatePresence>
                                            {activeParent === cat.id && cat.children.length > 0 && (
                                                <motion.div
                                                    initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                                                    className={`overflow-hidden ml-4 rounded-xl ${glassInner}`}
                                                >
                                                    {cat.children.map(sub => (
                                                        <button
                                                            key={sub.id}
                                                            onClick={() => handleSubClick(sub.id)}
                                                            className={`block w-full text-left px-4 py-2 text-sm font-bold border-b last:border-0 ${isDarkMode ? 'border-white/10' : 'border-black/10'}
                                   ${activeSub === sub.id ? 'bg-[#FFD700]/85 text-black' : `${subText} hover:bg-black/10`}
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


                        <div className={`${sidebarBg} ${glassSurface} home-ios-card--static p-5`}>
                            <div className="flex items-center justify-between gap-3">
                                <h4 className={`font-black text-lg flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                                    <MessageCircle size={18} className={isDarkMode ? 'text-white' : 'text-black'} /> 最新评论
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
                                            className={`${glassInner} p-3 rounded-xl transition-transform duration-200 hover:-translate-y-0.5 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                                            <div className="flex items-center gap-3">
                                                <img src={avatar} alt={comment.authorName || '访客'}
                                                    className="w-10 h-10 rounded-full border border-white/70 object-cover bg-[#FFD700]" />
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

                        <div className={`${sidebarBg} ${glassSurface} home-ios-card--static p-5`}>
                            <div className="flex items-center justify-between gap-3">
                                <h4 className={`font-black text-lg flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                                    <Hash size={18} className={isDarkMode ? 'text-white' : 'text-black'} /> 全部标签
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
                                        className={`px-2 py-1 border border-white/60 hover:-translate-y-0.5 transition-transform rounded-xl ${isDarkMode ? 'bg-[#111827]/60 text-white' : 'bg-white/75 text-black'}`}
                                    >
                                        清除筛选
                                    </button>
                                </div>
                            )}
                            {visibleTags.length ? (
                                <LayoutGroup id="tag-filter-shared-highlight">
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {visibleTags.map((tag) => {
                                            const isActive = activeTag === tag;
                                            return (
                                                <button
                                                    type="button"
                                                    key={tag}
                                                    onClick={() => handleTagClick(tag)}
                                                    aria-pressed={isActive}
                                                    className={`relative overflow-hidden px-3 py-1 text-xs font-black rounded-full transition-transform hover:-translate-y-0.5 bg-transparent home-ios-chip ${isActive ? 'text-black' : tagAccentClass}`}
                                                >
                                                    {isActive && (
                                                        <motion.span
                                                            layoutId="tag-filter-highlight"
                                                            className="absolute inset-0 rounded-full bg-[#FFD700]"
                                                            transition={{ duration: 0.09, ease: 'easeInOut', delay: 0.05 }}
                                                        />
                                                    )}
                                                    <span className="relative z-10">#{tag}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </LayoutGroup>
                            ) : (
                                <div className="mt-4">
                                    <span className={`text-sm font-bold ${subText}`}>暂无标签</span>
                                </div>
                            )}
                            {hasMoreTags && (
                                <button
                                    onClick={() => setExpandedTags(prev => !prev)}
                                    className="mt-3 w-full text-xs font-black border border-white/70 px-3 py-2 rounded-xl bg-[#FFD700]/90 text-black hover:-translate-y-0.5 transition-transform shadow-[0_10px_20px_rgba(255,215,0,0.22)]"
                                >
                                    {expandedTags ? '收起标签' : '展开全部标签'}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col">
                        <div
                            className={`mb-8 ${glassSurface} overflow-hidden ${isDarkMode ? 'text-white' : 'text-black'}`}>
                            <div className="flex flex-col md:flex-row md:items-center gap-3 px-5 py-4">
                                <div className="flex items-center justify-between gap-3 font-black text-lg tracking-tight">
                                    <div className="flex items-center gap-2">
                                        <Search size={18} />
                                        <span>文章搜索</span>
                                    </div>
                                    <div
                                        className={`md:hidden text-[11px] font-mono font-black px-3 py-2 border border-white/70 rounded-xl ${isDarkMode ? 'bg-[#111827]/75 text-gray-100' : 'bg-[#FFD700]/90 text-black'}`}>
                                        {searchSummaryText}
                                    </div>
                                </div>
                                <div className="flex-1 flex flex-col md:flex-row md:items-center gap-3">
                                    <div
                                        className={`flex items-center gap-2 flex-1 min-w-0 px-3 py-2 rounded-xl border ${glassInner} ${isDarkMode ? 'text-white' : 'text-black'}`}>
                                        <Search size={16} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                                        <input
                                            type="text"
                                            value={keyword}
                                            onChange={(e) => setKeyword(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    setAppliedKeyword(keyword);
                                                    setCurrentPage(1);
                                                    scrollToPostsTop();
                                                }
                                            }}
                                            placeholder="请输入关键词搜索"
                                            className={`flex-1 min-w-0 bg-transparent outline-none text-sm font-semibold placeholder:font-normal placeholder:text-gray-400 ${isDarkMode ? 'text-white' : 'text-black'}`}
                                        />
                                        <div className="flex w-[72px] shrink-0 justify-end">
                                            <button
                                                type="button"
                                                disabled={!keyword}
                                                onClick={() => {
                                                    setKeyword('');
                                                    setAppliedKeyword('');
                                                    setCurrentPage(1);
                                                    scrollToPostsTop();
                                                }}
                                                aria-hidden={!keyword}
                                                tabIndex={keyword ? 0 : -1}
                                                className={`flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-bold px-2 py-1 rounded-xl border border-white/70 transition-opacity ${
                                                    keyword
                                                        ? (isDarkMode ? 'bg-white text-black hover:-translate-y-0.5' : 'bg-black text-white hover:bg-[#FF0080]')
                                                        : 'opacity-0 pointer-events-none'
                                                }`}
                                            >
                                                <X size={14} /> 清空
                                            </button>
                                        </div>
                                    </div>
                                    <div
                                        className={`hidden md:block text-[11px] font-mono font-black px-3 py-2 border border-white/70 rounded-xl ${isDarkMode ? 'bg-[#111827]/75 text-gray-100' : 'bg-[#FFD700]/90 text-black'}`}>
                                        {searchSummaryText}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-8">
                            {postsLoading && (
                                <div className={`p-10 text-center ${glassSurface} ${cardBg}`}>
                                    <p className={`text-xl font-black ${subText}`}>文章加载中…</p>
                                </div>
                            )}
                            {!postsLoading && postsError && (
                                <div className={`p-10 text-center ${glassSurface} ${cardBg}`}>
                                    <p className={`text-xl font-black ${subText}`}>文章加载失败</p>
                                    <p className={`mt-3 text-sm font-bold ${subText}`}>{postsError}</p>
                                    <PopButton
                                        variant="primary"
                                        className="mt-4"
                                        onClick={() => onQueryChange && onQueryChange(buildQueryParams({ page: currentPage }))}
                                    >
                                        重试加载
                                    </PopButton>
                                </div>
                            )}
                            {!postsLoading && !postsError && (displayPosts.length > 0 ? (
                                displayPosts.map((post, idx) => {
                                    const viewCount = post.views ?? post.viewsCount ?? 0;
                                    const commentCount = post.comments ?? post.commentsCount ?? 0;
                                    const coverUrl = buildMediaUrl(post.coverImage);
                                    const tags = Array.isArray(post.tags) ? post.tags : [];
                                    const accentColor = extractHexFromBgClass(post.color, '#6366F1');
                                    const isNewPost = isPostNew(post.date);
                                    const excerptTooltip = getArticleExcerptTooltip(post.excerpt, excerptOverflowMap[post.id] === true);
                                    return (
                                        <motion.div
                                            key={post.id}
                                            id={idx === 0 ? 'home-first-post' : undefined}
                                            initial={{ opacity: 0, y: 50 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.1, duration: 0.5 }}
                                            whileHover="hover"
                                        >
                                            <TiltCard variant="glass" isDarkMode={isDarkMode} isNew={isNewPost} accentColor={accentColor} disableEffects={cardEffectsDisabled} onClick={() => {
                                                setArticleId(post.id);
                                                setView('article');
                                            }}>
                                                <div className="flex flex-row md:flex-row min-h-[200px] md:min-h-[360px]">
                                                    <div className="w-[35%] md:w-1/3 shrink-0 min-h-[200px] md:min-h-[360px] md:max-h-[360px] border-b-0 border-r-2 md:border-b-0 md:border-r-2 border-black relative overflow-hidden group">
                                                        {coverUrl ? (
                                                            <motion.img
                                                                src={coverUrl}
                                                                alt={post.title}
                                                                className="absolute inset-0 w-full h-full object-cover"
                                                                initial={{ scale: 1.01 }}
                                                                whileHover={{ scale: 1.03 }}
                                                                transition={{ duration: 0.4 }}
                                                            />
                                                        ) : (
                                                            <div
                                                                className="absolute inset-0"
                                                                style={{
                                                                    backgroundColor: extractHexFromBgClass(post.color, '#6366F1'),
                                                                    backgroundImage: `linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)`,
                                                                    backgroundSize: '24px 24px'
                                                                }}
                                                            />
                                                        )}
                                                        <div
                                                            className="absolute inset-0"
                                                            style={{
                                                                background: coverUrl
                                                                    ? 'linear-gradient(160deg, rgba(0,0,0,0.22), rgba(0,0,0,0.08))'
                                                                    : 'linear-gradient(160deg, rgba(0,0,0,0.55), rgba(0,0,0,0.25))'
                                                            }}
                                                        />
                                                        {coverUrl && (
                                                            <div
                                                                className="absolute inset-0 opacity-0 group-hover:opacity-80 transition-opacity duration-300 mix-blend-multiply pointer-events-none"
                                                                style={{
                                                                    backgroundImage: `radial-gradient(${extractHexFromBgClass(post.color, '#FFD700')}22 1px, transparent 1px)`,
                                                                    backgroundSize: '12px 12px'
                                                                }}
                                                            />
                                                        )}
                                                        {!coverUrl && (
                                                            <>
                                                                <div
                                                                    className="absolute inset-0 mix-blend-multiply"
                                                                    style={{ backgroundColor: extractHexFromBgClass(post.color, '#6366F1'), opacity: 0.12 }}
                                                                />
                                                                <div
                                                                    className="absolute inset-0 opacity-0 group-hover:opacity-90 transition-all duration-300 mix-blend-multiply pointer-events-none origin-center transform group-hover:rotate-[2deg]"
                                                                    style={{
                                                                        backgroundImage: `radial-gradient(${extractHexFromBgClass(post.color, '#6366F1')}30 1px, transparent 1px)`,
                                                                        backgroundSize: '12px 12px',
                                                                        backgroundColor: `${extractHexFromBgClass(post.color, '#6366F1')}12`
                                                                    }}
                                                                />
                                                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                                    <div className="w-20 h-20 rounded-full border-2 border-black/30 bg-white/15 backdrop-blur-[1px] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.18)] flex items-center justify-center">
                                                                        <Code size={32} className="text-white/80 drop-shadow" />
                                                                    </div>
                                                                </div>
                                                            </>
                                                        )}
                                                        <div className="relative z-10 p-3 md:p-6 h-full flex flex-col justify-between text-white">
                                                            <span className="font-black text-2xl md:text-5xl opacity-60 drop-shadow">
                                                                {(idx + 1 + (currentPage - 1) * pageSize).toString().padStart(2, '0')}
                                                            </span>
                                                            <div className="hidden md:block">
                                                                <span
                                                                    className="bg-black/80 text-white px-2 py-1 text-xs font-bold uppercase mb-2 inline-block rounded">
                                                                    {post.parentCategory}
                                                                </span>
                                                                <h4 className="font-black text-2xl leading-none drop-shadow-lg">{post.category}</h4>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className={`flex-1 min-w-0 p-3.5 md:p-8 ${cardBg} group ${hoverBg} flex flex-col rounded-r-[24px] min-h-[200px] md:min-h-[360px]`}>
                                                        <div className="flex flex-wrap items-center gap-1 md:gap-2 mb-2 md:mb-3">
                                                            <span className={`px-2 py-1 text-[11px] font-black rounded-full home-ios-chip ${isDarkMode ? 'text-gray-100' : 'text-gray-700'}`}>
                                                                {post.parentCategory}
                                                            </span>
                                                            <ChevronRight size={12} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                                                            <span className={`px-2 py-1 text-[11px] font-black rounded-full home-ios-chip ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                                                                {post.category}
                                                            </span>
                                                            <div className="flex flex-wrap gap-1 ml-auto">
                                                                {tags.slice(0, visibleTagLimit).map(t => (
                                                                    <span key={t}
                                                                        className={`px-2 py-0.5 text-[11px] font-black rounded-full home-ios-chip ${isDarkMode ? 'text-gray-200' : ''}`}>#{t}</span>
                                                                ))}
                                                                {tags.length > visibleTagLimit && (
                                                                    <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-black/80 text-white border border-white/35">+{tags.length - visibleTagLimit}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-start gap-2 mb-2 md:mb-3">
                                                            <h2
                                                                className={`sg-home-article-title text-xl md:text-3xl font-black flex-1 transition-colors group-hover:text-[var(--title-color)] ${text}`}
                                                                style={{
                                                                    '--title-color': extractHexFromBgClass(post.color, '#6366F1'),
                                                                    WebkitLineClamp: 2,
                                                                    display: '-webkit-box',
                                                                    WebkitBoxOrient: 'vertical',
                                                                    overflow: 'hidden'
                                                                }}
                                                            >
                                                                {post.title}
                                                            </h2>
                                                            {isNewPost && (
                                                                <motion.span
                                                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-black uppercase tracking-widest border border-white/65 rounded-full bg-[#FF0080]/88 text-white shadow-[0_10px_22px_rgba(255,0,128,0.3)]"
                                                                    initial={{ scale: 0.95, opacity: 0.9 }}
                                                                    animate={cardEffectsDisabled ? undefined : { scale: [0.95, 1.08, 1], opacity: [0.9, 1, 0.95] }}
                                                                    transition={cardEffectsDisabled ? undefined : { duration: 2, repeat: 1, ease: 'easeInOut' }}
                                                                >
                                                                    <Sparkles size={12} strokeWidth={3} />
                                                                    NEW
                                                                </motion.span>
                                                            )}
                                                        </div>
                                                        <div className="relative mt-0 group/excerpt">
                                                            <p
                                                                ref={(element) => registerExcerptElement(post.id, element)}
                                                                aria-label={excerptTooltip ? `文章摘要：${excerptTooltip}` : undefined}
                                                                className={`sg-home-article-excerpt text-xs md:text-lg font-medium border-l-2 md:border-l-4 border-gray-300 pl-2 md:pl-4 pr-1 md:pr-2 ${subText} ${excerptTooltip ? 'cursor-help' : ''}`}
                                                            >
                                                                {post.excerpt}
                                                            </p>
                                                            {excerptTooltip && (
                                                                <div className="pointer-events-none absolute left-0 right-0 top-full z-30 mt-3 opacity-0 translate-y-1 transition-all duration-200 group-hover/excerpt:opacity-100 group-hover/excerpt:translate-y-0">
                                                                    <div className={`relative border border-white/65 p-3 text-sm font-medium leading-6 shadow-[0_12px_24px_rgba(0,0,0,0.14)] whitespace-normal break-words rounded-xl ${isDarkMode ? 'bg-[#111827]/88 text-gray-100' : 'bg-[#FFF7E8]/92 text-black'}`}>
                                                                        {excerptTooltip}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="mt-auto pt-2 md:pt-4">
                                                            <div
                                                                className={`flex justify-between items-center border-t md:border-t-2 ${isDarkMode ? 'border-gray-700' : 'border-black'} pt-2 md:pt-4 border-dashed`}>
                                                                <span className="font-mono font-bold text-[10px] md:text-xs bg-black text-white px-1.5 md:px-2 py-0.5 md:py-1 flex items-center gap-1">
                                                                    <Clock size={14} /> {post.date}
                                                                </span>
                                                                <div className={`flex gap-2 md:gap-4 font-bold text-xs md:text-sm items-center ${text}`}>
                                                                    <span className="flex items-center gap-1 hover:text-[#FF0080]">
                                                                        <Eye size={18} /> {viewCount}
                                                                    </span>
                                                                    <span className="flex items-center gap-1 hover:text-[#6366F1]">
                                                                        <MessageSquare size={18} /> {commentCount}
                                                                    </span>
                                                                    <span
                                                                        className="hidden md:inline-flex items-center gap-1 text-sm font-semibold opacity-0 translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0 group-hover:flex"
                                                                        style={{ color: extractHexFromBgClass(post.color, '#1f2937') }}
                                                                    >
                                                                        阅读 <ArrowRight size={16} />
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </TiltCard>
                                        </motion.div>
                                    );
                                })
                            ) : (
                                    <div className={`p-12 text-center ${glassSurface} ${cardBg}`}>
                                    <p className={`text-2xl font-black ${subText}`}>
                                        {(selectedCategoryId || selectedTagId || keywordText) ? '未找到匹配的文章，换个筛选条件试试？' : 'NO DATA FOUND'}
                                    </p>
                                    {keywordText && (
                                        <p className={`mt-3 text-sm font-bold ${subText}`}>
                                            当前关键词：{keywordText}
                                        </p>
                                    )}
                                    <PopButton variant="primary" className="mt-4" onClick={() => {
                                        setActiveParent('all');
                                        setActiveSub('all');
                                        setKeyword('');
                                        setAppliedKeyword('');
                                        setActiveTag('all');
                                        scrollToPostsTop();
                                    }}>重置筛选</PopButton>
                                </div>
                            ))}
                        </div>

                        {!postsLoading && !postsError && totalPages > 1 && (
                            <div className="mt-12 flex flex-wrap justify-center items-center gap-2">
                                {[
                                    { key: 'prev', label: '上一页', target: currentPage - 1, disabled: currentPage <= 1, wide: true }
                                ].map((control) => (
                                    <button
                                        key={control.key}
                                        type="button"
                                        disabled={control.disabled}
                                        onClick={() => goToPage(control.target)}
                                        className={`h-10 ${control.wide ? 'px-4 min-w-[72px]' : 'w-10'} border border-white/65 rounded-xl font-black transition-all ${control.disabled
                                            ? (isDarkMode ? 'bg-gray-900/70 text-gray-500 cursor-not-allowed shadow-none' : 'bg-gray-100/70 text-gray-400 cursor-not-allowed shadow-none')
                                            : (isDarkMode ? 'bg-gray-700/65 text-white hover:bg-[#6366F1] hover:text-white shadow-[0_10px_20px_rgba(99,102,241,0.2)]' : 'bg-white/75 text-black hover:bg-[#6366F1] hover:text-white shadow-[0_10px_20px_rgba(0,0,0,0.12)]')
                                        }`}
                                    >
                                        {control.label}
                                    </button>
                                ))}
                                {paginationItems.map((item, idx) => {
                                    if (typeof item === 'string') {
                                        return (
                                            <span
                                                key={`${item}-${idx}`}
                                                className={`h-9 px-3 inline-flex items-center justify-center rounded-full text-xs font-black border border-white/65 opacity-80 hover:opacity-90 transition-opacity ${isDarkMode
                                                    ? 'bg-gray-900/70 text-gray-200'
                                                    : 'bg-white/75 text-gray-700'}`}
                                            >
                                                <span className="flex items-center gap-1">
                                                    <span className="w-1.25 h-1.25 rounded-full bg-current opacity-80 shadow-[0.8px_0.8px_0px_0px_#000]" />
                                                    <span className="w-1.25 h-1.25 rounded-full bg-current opacity-80 shadow-[0.8px_0.8px_0px_0px_#000]" />
                                                    <span className="w-1.25 h-1.25 rounded-full bg-current opacity-80 shadow-[0.8px_0.8px_0px_0px_#000]" />
                                                </span>
                                            </span>
                                        );
                                    }
                                    const isActive = currentPage === item;
                                    return (
                                        <button
                                            key={item}
                                            type="button"
                                            onClick={() => goToPage(item)}
                                            className={`w-10 h-10 border border-white/65 rounded-xl font-black transition-all
                          ${isActive ? 'bg-black/90 text-white -translate-y-0.5 shadow-[0_12px_24px_rgba(255,0,128,0.28)]' : `${isDarkMode ? 'bg-gray-700/65 text-white' : 'bg-white/75'} hover:bg-[#6366F1] hover:text-white shadow-[0_10px_18px_rgba(0,0,0,0.12)]`}
                        `}
                                        >
                                            {item}
                                        </button>
                                    );
                                })}
                                {[
                                    { key: 'next', label: '下一页', target: currentPage + 1, disabled: currentPage >= totalPages, wide: true }
                                ].map((control) => (
                                    <button
                                        key={control.key}
                                        type="button"
                                        disabled={control.disabled}
                                        onClick={() => goToPage(control.target)}
                                        className={`h-10 ${control.wide ? 'px-4 min-w-[72px]' : 'w-10'} border border-white/65 rounded-xl font-black transition-all ${control.disabled
                                            ? (isDarkMode ? 'bg-gray-900/70 text-gray-500 cursor-not-allowed shadow-none' : 'bg-gray-100/70 text-gray-400 cursor-not-allowed shadow-none')
                                            : (isDarkMode ? 'bg-gray-700/65 text-white hover:bg-[#6366F1] hover:text-white shadow-[0_10px_20px_rgba(99,102,241,0.2)]' : 'bg-white/75 text-black hover:bg-[#6366F1] hover:text-white shadow-[0_10px_20px_rgba(0,0,0,0.12)]')
                                        }`}
                                    >
                                        {control.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="py-12 text-center mt-8">
                            <div className="inline-block relative">
                                <div
                                    className={`relative px-8 py-4 text-lg md:text-2xl font-black italic rounded-2xl ${glassSurface} ${cardBg} ${text}`}>
                                    {endingQuote ? endingQuote : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                </section>
            </div>
        </>
    );
};

export default ArticleList;
