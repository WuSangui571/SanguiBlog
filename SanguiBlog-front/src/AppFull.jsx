import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBlog } from "./hooks/useBlogData";
import { fetchLoginCaptcha } from "./api";
import CommentsSection from "./components/comments/CommentsSection.jsx";
import ImageWithFallback from "./components/common/ImageWithFallback.jsx";
import PopButton from "./components/common/PopButton.jsx";
import { LayoutOffsetContext, useLayoutOffsets } from "./contexts/LayoutOffsetContext.jsx";
import { PermissionContext } from "./contexts/PermissionContext.jsx";
import {
    recordPageView,
    updateBroadcast,
    fetchGames,
    fetchGameDetail,
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
import { buildAssetUrl } from "./utils/asset.js";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import {
    motion,
    AnimatePresence,
    useScroll,
    useTransform,
    useSpring,
    useMotionValue,
    LayoutGroup as AnimateSharedLayout
} from 'framer-motion';
import {
    Code, User, MessageSquare, Share2, X, Menu, ChevronRight,
    Search, LogIn, LogOut, Settings, Eye, EyeOff, Github, Twitter,
    BarChart3, Filter, Tag, AlertTriangle, MessageCircle,
    Layers, Hash, Clock, FileText, Terminal, Zap, Sparkles,
    ArrowUpRight, ArrowRight, Grid, List, Activity, ChevronLeft, Shield, Lock, Users, Mail, Megaphone,
    Home, TrendingUp, Edit, Send, Moon, Sun, Upload, ArrowUp, BookOpen, CheckCircle, PenTool, FolderPlus,
    RefreshCw, Plus, Trash2, Save, ImagePlus, ChevronsLeft, ChevronsRight, Copy
} from 'lucide-react';
import { AdminPanel } from "./appfull/AdminPanel.jsx";
import {
    THEME,
    ROLES,
    CATEGORY_TREE,
    SITE_STATS,
    MOCK_USER,
    MOCK_POSTS,
    DEFAULT_PAGE_SIZE,
    PAGE_SIZE_OPTIONS,
    PAGE_SIZE_STORAGE_KEY,
    DEFAULT_HERO_TAGLINE,
    DEFAULT_HOME_QUOTE,
    TAG_PREVIEW_COUNT,
    SPIN_WARNINGS,
    SPIN_INTERVAL_MS,
    SPIN_WARN_THRESHOLD,
    MEGA_SPIN_THRESHOLD,
    SPIN_LOCK_DURATION,
    MEGA_SPIN_DURATION,
    THEME_SPREE_THRESHOLD,
    THEME_SPREE_INTERVAL,
    THEME_SPREE_DURATION,
    THEME_SPREE_PALETTES,
    THEME_LOCK_DURATION,
    ARCHIVE_MONTH_LABELS,
    HERO_NOISE_TEXTURE,
    DEFAULT_AVATAR,
    PUBLIC_IP_ENDPOINT,
    ENABLE_PUBLIC_IP_FALLBACK,
    randomAngle,
    randomSprayPolygon,
    createTendrils,
    getReferrerMeta,
    getGeoHint,
    claimAutoPageView,
    resetAutoPageViewGuard,
    remarkHighlight
} from "./appfull/shared.js";

const BackgroundEasterEggs = ({ isDarkMode }) => {
    const stars = useMemo(() => Array.from({ length: 80 }, (_, idx) => ({
        top: Math.random() * 90,
        left: Math.random() * 90,
        size: Math.random() * 2.6 + 1,
        delay: Math.random() * 3,
        id: idx
    })), []);
    const meteors = useMemo(() => Array.from({ length: 10 }, (_, idx) => ({
        top: 5 + Math.random() * 50,
        left: -40 - Math.random() * 30,
        delay: Math.random() * 2.5,
        duration: 2.8 + Math.random() * 1.5,
        id: idx
    })), []);

    if (!isDarkMode) {
        return (
            <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
                <div className="absolute inset-0 bg-gradient-to-b from-[#E6F4FF] via-white to-transparent" />
                <motion.div
                    className="absolute w-72 h-72 rounded-full bg-gradient-to-br from-[#FFD54F] via-[#FFB703] to-white border border-white/70 shadow-[0_0_80px_rgba(255,213,79,0.9)]"
                    style={{ left: 'calc(50% - 55rem)', top: '28%' }}
                    animate={{ scale: [0.95, 1.08, 0.95], rotate: [0, 15, 0] }}
                    transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                    className="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-[#FFF5C0]/90 via-transparent to-transparent"
                    animate={{ opacity: [0.45, 0.75, 0.45] }}
                    transition={{ duration: 12, repeat: Infinity }}
                />
            </div>
        );
    }

    return (
        <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
            <div className="absolute inset-0 bg-gradient-to-b from-[#010512]/95 via-transparent to-transparent" />
            <motion.div
                className="absolute w-44 h-44 rounded-full bg-gradient-to-br from-white via-slate-200 to-slate-500 shadow-[0_0_90px_rgba(191,219,254,0.7)]"
                style={{ left: 'calc(50% - 55rem)', top: '36%' }}
                animate={{ rotate: [-6, 6, -6], opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
                className="absolute w-[90vw] h-[90vw] rounded-full blur-[110px] mix-blend-screen"
                style={{ left: '-30%', top: '-30%', background: 'radial-gradient(circle, rgba(79,70,229,0.35), transparent 65%)' }}
                animate={{ rotate: [0, 25, 0] }}
                transition={{ duration: 26, repeat: Infinity }}
            />
            {stars.map((star) => (
                <motion.span
                    key={star.id}
                    className="absolute rounded-full bg-white"
                    style={{
                        width: star.size,
                        height: star.size,
                        top: `${star.top}%`,
                        left: `${star.left}%`,
                        boxShadow: '0 0 22px rgba(255,255,255,0.8)'
                    }}
                    animate={{ opacity: [0.05, star.size > 2 ? 1 : 0.6, 0.05] }}
                    transition={{ duration: 2 + Math.random() * 2, repeat: Infinity, ease: 'easeInOut', delay: star.delay }}
                />
            ))}
            {meteors.map((meteor) => (
                <motion.span
                    key={`meteor-${meteor.id}`}
                    className="absolute h-3 w-60 bg-gradient-to-r from-transparent via-white to-transparent blur-[1px]"
                    style={{ top: `${meteor.top}%`, left: `${meteor.left}%`, transform: 'rotate(-20deg)' }}
                    animate={{ x: ['0%', '180%'], y: ['0%', '70%'], opacity: [0, 1, 0] }}
                    transition={{ duration: meteor.duration, repeat: Infinity, delay: meteor.delay, ease: 'linear' }}
                />
            ))}
            <motion.div
                className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#020617] via-transparent to-transparent"
                animate={{ opacity: [0.35, 0.6, 0.35] }}
                transition={{ duration: 12, repeat: Infinity }}
            />
        </div>
    );
};

const ArticleDetail = ({
    id,
    setView,
    isDarkMode,
    articleData,
    commentsData,
    onSubmitComment,
    onDeleteComment,
    onUpdateComment,
    currentUser,
    onCategoryClick,
    onBackToPrevious
}) => {
    const { meta: siteMeta } = useBlog();
    const summary = articleData?.summary;
    const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role?.code === 'SUPER_ADMIN';

    // The backend returns a PostDetailDto which contains a 'summary' field (PostSummaryDto).
    // We should prioritize using 'summary' as the source of post metadata.
    const postSource = summary || MOCK_POSTS.find(p => p.id === id) || MOCK_POSTS[0];

    const siteAuthorAvatar = siteMeta?.author?.avatar || siteMeta?.author?.avatarUrl;

    const post = {
        ...postSource,
        // Ensure fallback for fields that might be missing or named differently in Mock vs API
        authorName: postSource.authorName || postSource.author || 'Unknown',
        authorAvatar: postSource.authorAvatar || siteAuthorAvatar || postSource.avatar,
        tags: Array.isArray(postSource.tags) ? postSource.tags : [],
        // PostSummaryDto does not have 'authorTitle', so we default it.
        // If needed, we would need to update the backend DTO.
        authorTitle: postSource.authorTitle || '博主',
        date: postSource.date || (postSource.publishedAt ? new Date(postSource.publishedAt).toLocaleDateString() : 'Recently'),
        views: postSource.views || postSource.viewsCount || 0,
        color: postSource.color || postSource.themeColor || 'shadow-[8px_8px_0px_0px_#000]',
    };
    const articleTags = (Array.isArray(articleData?.tags) && articleData.tags.length ? articleData.tags : post.tags)
        .map((tag) => {
            if (!tag) return null;
            if (typeof tag === 'string') return tag;
            return tag.name || tag.label || tag.slug || null;
        })
        .filter(Boolean);

    const contentHtml = articleData?.contentHtml;
    const contentMd = articleData?.contentMd;
    const comments = commentsData && commentsData.length ? commentsData : [];
    const text = isDarkMode ? 'text-gray-100' : 'text-black';
    const surface = isDarkMode ? THEME.colors.surfaceDark : THEME.colors.surfaceLight;
    const pageBackground = 'bg-transparent';
    const articleContentRef = useRef(null);
    const { headerHeight } = useLayoutOffsets();
    const fixedTopOffset = headerHeight + 16;
    const [previewImage, setPreviewImage] = useState(null);
    const handleImagePreview = useCallback((src) => {
        if (!src) return;
        setPreviewImage(src);
    }, []);
    const closeImagePreview = useCallback(() => setPreviewImage(null), []);
    const scrollHomeAfterReturn = useCallback(() => {
        setTimeout(() => {
            const postsSection = document.getElementById('posts');
            if (postsSection) {
                postsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }, 220);
    }, []);

    const quoteBg = isDarkMode ? 'bg-gray-800' : 'bg-[#FFFAF0]';
    const quoteText = isDarkMode ? 'text-gray-300' : 'text-black';
    const inlineCodeBg = isDarkMode ? 'bg-gray-800 text-pink-200' : 'bg-gray-100 text-pink-600';
    const proseClass = `prose prose-xl prose-headings:font-black prose-p:font-medium max-w-none prose-code:before:content-none prose-code:after:content-none ${isDarkMode ? 'prose-invert' : ''}`;
    const shouldRenderMarkdown = Boolean(contentMd && contentMd.trim());

    const CodeBlockWithCopy = ({ textContent, className }) => {
        const [copied, setCopied] = useState(false);
        const langMatch = typeof className === 'string' ? className.match(/language-([a-zA-Z0-9]+)/) : null;
        const langLabel = langMatch && langMatch[1] ? langMatch[1].toUpperCase() : 'CODE';

        const handleCopy = useCallback(() => {
            if (!textContent) return;
            navigator.clipboard?.writeText(textContent).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1600);
            }).catch(() => setCopied(false));
        }, [textContent]);

        return (
            <div
                className={`not-prose my-6 rounded-2xl border-2 border-black overflow-hidden shadow-[6px_6px_0px_0px_#000] ${isDarkMode ? 'border-gray-600' : ''}`}>
                <div
                    className={`flex items-center gap-2 px-4 py-2 border-b-2 border-black ${isDarkMode ? 'bg-[#0B1221] text-gray-200 border-gray-700' : 'bg-gray-100 text-gray-600'}`}>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-[#FF5F56] border border-black/10"></div>
                        <div className="w-4 h-4 rounded-full bg-[#FFBD2E] border border-black/10"></div>
                        <div className="w-4 h-4 rounded-full bg-[#27C93F] border border-black/10"></div>
                        <span className="ml-2 text-[10px] font-black tracking-[0.2em]">{langLabel}</span>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        {copied && (
                            <span className="text-[10px] font-black text-emerald-400">已复制</span>
                        )}
                        <button
                            type="button"
                            onClick={handleCopy}
                            className={`px-2 py-1 text-[11px] font-black border-2 border-black rounded-full inline-flex items-center gap-1 transition-transform hover:-translate-y-0.5 ${isDarkMode ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-white text-black hover:bg-gray-100'}`}
                            aria-label="复制代码"
                        >
                            <Copy size={14} /> 复制
                        </button>
                    </div>
                </div>
                <pre
                    className={`p-5 overflow-auto m-0 ${isDarkMode ? 'bg-[#0B1221] text-gray-100' : 'bg-white text-gray-900'}`}>
                    <code className={`${className || ''} !bg-transparent !p-0 !border-none font-mono text-sm`}>
                        {textContent}
                    </code>
                </pre>
            </div>
        );
    };

    const headingSluggerRef = useRef({});
    headingSluggerRef.current = {};

    const extractText = useCallback((children) => {
        if (typeof children === 'string' || typeof children === 'number') return String(children);
        if (Array.isArray(children)) return children.map(extractText).join('');
        if (children && typeof children === 'object' && 'props' in children) {
            return extractText(children.props.children);
        }
        return '';
    }, []);

    const slugifyHeading = useCallback((text) => {
        const base = (text || '').trim();
        if (!base) return 'heading';
        const sanitized = base.replace(/[^A-Za-z0-9\u4e00-\u9fa5\s-]/g, '');
        const hyphenated = sanitized.replace(/\s+/g, '-').toLowerCase();
        return hyphenated || base;
    }, []);

    const createHeading = useCallback((Tag) => ({ children, ...props }) => {
        const rawText = extractText(children);
        const baseSlug = slugifyHeading(rawText);
        const count = headingSluggerRef.current[baseSlug] || 0;
        const nextCount = count + 1;
        headingSluggerRef.current[baseSlug] = nextCount;
        const finalSlug = count === 0 ? baseSlug : `${baseSlug}-${nextCount}`;
        return <Tag id={finalSlug} {...props}>{children}</Tag>;
    }, [extractText, slugifyHeading]);

    const handleAdminEdit = useCallback(() => {
        if (!post.id) return;
        const url = `/admin/posts/edit?postId=${post.id}`;
        window.open(url, '_blank', 'noopener');
    }, [post.id]);

    const handleAnchorClick = useCallback((event, href) => {
        if (!href || !href.startsWith('#')) return;
        event.preventDefault();
        const rawTarget = decodeURIComponent(href.slice(1));
        const exactMatch = document.getElementById(rawTarget);
        const slugMatch = exactMatch || document.getElementById(slugifyHeading(rawTarget));
        if (slugMatch) {
            slugMatch.scrollIntoView({ behavior: 'smooth', block: 'start' });
            if (window?.history?.replaceState) {
                window.history.replaceState(null, '', `#${slugMatch.id}`);
            } else {
                window.location.hash = slugMatch.id;
            }
        } else {
            window.location.hash = rawTarget;
        }
    }, [slugifyHeading]);

    const prefixAssetOrigin = useCallback(
        (path = "") => {
            if (!path) return path;
            const normalized = path.startsWith("/") ? path : `/${path}`;
            return buildAssetUrl(normalized, normalized);
        },
        []
    );

    const slugPath = summary?.slug || articleData?.slug || null;
    const relativeAssetsBase = slugPath ? `/uploads/${slugPath}` : null;
    const assetsBase = relativeAssetsBase ? prefixAssetOrigin(relativeAssetsBase) : null;
    const resolveAssetPath = useCallback(
        (input) => {
            if (!input) return input;
            const trimmed = input.trim();
            if (/^(https?:)?\/\//i.test(trimmed)) return trimmed;
            const normalized = trimmed
                .replace(/^\.\/+/, '')
                .replace(/\.\.\//g, '')
                .replace(/\\/g, '/');
            if (normalized.startsWith('/uploads/') || normalized.startsWith('/avatar/')) {
                return prefixAssetOrigin(normalized);
            }
            if (normalized.startsWith('/')) {
                return normalized;
            }
            if (assetsBase) {
                return encodeURI(`${assetsBase}/${normalized}`);
            }
            return normalized;
        },
        [assetsBase, prefixAssetOrigin]
    );

    const resolvedHtml = useMemo(() => {
        if (!contentHtml) return contentHtml;
        const doubleQuoteReplaced = contentHtml.replace(/src="([^"]+)"/g, (_, src) => `src="${resolveAssetPath(src)}"`);
        return doubleQuoteReplaced.replace(/src='([^']+)'/g, (_, src) => `src='${resolveAssetPath(src)}'`);
    }, [contentHtml, resolveAssetPath]);

    const scrollToComments = useCallback(() => {
        if (typeof document === 'undefined') return;
        const commentsEl = document.getElementById('comments-section');
        if (commentsEl) {
            commentsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, []);

    useEffect(() => {
        if (typeof document === 'undefined') return;
        const container = articleContentRef.current;
        if (!container) return;
        const images = container.querySelectorAll('img');
        const handleClick = (event) => {
            event.preventDefault();
            handleImagePreview(event.currentTarget.src);
        };
        images.forEach((img) => {
            img.style.cursor = 'zoom-in';
            img.addEventListener('click', handleClick);
        });
        return () => {
            images.forEach((img) => img.removeEventListener('click', handleClick));
        };
    }, [resolvedHtml, contentMd, handleImagePreview]);

    const markdownComponents = useMemo(() => ({
        pre: ({ children }) => <>{children}</>,
        img: ({ src, alt, className = '', ...props }) => {
            const resolved = resolveAssetPath(src);
            return (
                <img
                    src={resolved}
                    alt={alt}
                    {...props}
                    className={`cursor-zoom-in ${className}`.trim()}
                    onClick={() => handleImagePreview(resolved)}
                />
            );
        },
        code({ inline, className, children, ...props }) {
            const rawText = String(children);
            const textContent = rawText.replace(/\n$/, '');
            const hasLanguage = typeof className === 'string' && className.includes('language-');
            const isMultiline = textContent.includes('\n');
            const shouldInline = inline ?? (!hasLanguage && !isMultiline);
            if (shouldInline) {
                const backtickCount = (textContent.match(/`/g) || []).length;
                if (backtickCount > 0 && backtickCount % 2 === 0) {
                    const parts = textContent.split('`');
                    return (
                        <>
                            {parts.map((part, i) => {
                                if (i % 2 === 0) {
                                    return (
                                        <code
                                            key={i}
                                            className={`px-1 py-0.5 rounded font-mono text-sm ${inlineCodeBg}`}
                                            {...props}
                                        >
                                            {part}
                                        </code>
                                    );
                                }
                                return <span key={i}>{part}</span>;
                            })}
                        </>
                    );
                }
                return (
                    <code
                        className={`px-1 py-0.5 rounded font-mono text-sm ${inlineCodeBg}`}
                        {...props}
                    >
                        {textContent}
                    </code>
                );
            }
            return <CodeBlockWithCopy textContent={textContent} className={className} {...props} />;
        },
        h1: createHeading('h1'),
        h2: createHeading('h2'),
        h3: createHeading('h3'),
        h4: createHeading('h4'),
        h5: createHeading('h5'),
        h6: createHeading('h6'),
        a: ({ href, children, ...props }) => {
            if (href && href.startsWith('#')) {
                return (
                    <a
                        href={href}
                        {...props}
                        onClick={(event) => handleAnchorClick(event, href)}
                    >
                        {children}
                    </a>
                );
            }
            return (
                <a href={href} {...props} target="_blank" rel="noreferrer">
                    {children}
                </a>
            );
        },
    }), [handleImagePreview, inlineCodeBg, resolveAssetPath, createHeading, handleAnchorClick]);

    const handleCommentSubmit = (payload) => {
        onSubmitComment && onSubmitComment(payload);
    };

    const [showShareToast, setShowShareToast] = useState(false);

    useEffect(() => {
        if (!previewImage || typeof document === 'undefined') return;
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, [previewImage]);

    const handleShare = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            setShowShareToast(true);
            setTimeout(() => setShowShareToast(false), 3000);
        });
    };

    const getAvatarUrl = (avatarPath) => {
        if (!avatarPath) return MOCK_USER.avatar;
        if (/^(https?:)?\/\//i.test(avatarPath)) return avatarPath;

        // Ensure it starts with /
        let cleanPath = avatarPath.startsWith('/') ? avatarPath : `/${avatarPath}`;

        // Fix for legacy static avatars: if it's not in /uploads/ or /avatar/, prepend /avatar
        // This handles DB values like "/sangui.jpg" -> "/avatar/sangui.jpg"
        if (!cleanPath.startsWith('/uploads/') && !cleanPath.startsWith('/avatar/')) {
            cleanPath = `/avatar${cleanPath}`;
        }

        return prefixAssetOrigin(cleanPath);
    };

    const avatarSrc = getAvatarUrl(post.authorAvatar);

    const articleTopPadding = Math.max(16, fixedTopOffset - headerHeight);

    return (
        <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`min-h-screen px-4 md:px-0 pb-20 ${pageBackground} ${text}`}
            style={{ paddingTop: articleTopPadding }}>
            {/* Share Toast Notification */}
            <AnimatePresence>
                {showShareToast && (
                    <motion.div
                        initial={{ opacity: 0, y: -50, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: -50, x: '-50%' }}
                        style={{ top: fixedTopOffset }}
                        className={`fixed left-1/2 z-[60] px-6 py-3 border-2 border-black shadow-[4px_4px_0px_0px_#000] flex items-center gap-3 ${isDarkMode ? 'bg-green-600 text-white' : 'bg-green-400 text-black'}`}
                    >
                        <CheckCircle size={24} strokeWidth={3} />
                        <span className="font-black text-lg">链接已复制！</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating Back Button - Aligned with article content */}
            <div
                className="fixed left-0 right-0 z-30 pointer-events-none"
                style={{ top: fixedTopOffset }}
            >
                <div className="max-w-4xl mx-auto px-4 md:px-0 relative">
                    <motion.button
                        onClick={() => {
                            if (onBackToPrevious) {
                                onBackToPrevious();
                            } else {
                                setView('home');
                                scrollHomeAfterReturn();
                            }
                        }}
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        whileHover={{ scale: 1.05 }}
                        className={`pointer-events-auto absolute -left-6 md:-left-40 px-4 py-2 font-black border-2 border-black shadow-[4px_4px_0px_0px_#000] transition-all hover:shadow-[6px_6px_0px_0px_#000] ${isDarkMode ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-white text-black hover:bg-gray-100'}`}
                    >
                        <div className="flex items-center gap-2">
                            <ChevronRight size={20} className="rotate-180" />
                            <span>首页</span>
                        </div>
                    </motion.button>
                    <motion.button
                        onClick={scrollToComments}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        whileHover={{ scale: 1.05 }}
                        className={`pointer-events-auto absolute -right-6 md:-right-40 px-4 py-2 font-black border-2 border-black shadow-[4px_4px_0px_0px_#000] transition-all hover:shadow-[6px_6px_0px_0px_#000] ${isDarkMode ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-white text-black hover:bg-gray-100'}`}
                    >
                        <div className="flex items-center gap-2">
                            <MessageCircle size={18} />
                            <span>评论</span>
                        </div>
                    </motion.button>
                </div>
            </div>

            <div className="max-w-4xl mx-auto">

                <div
                    className={`border-4 border-black shadow-[12px_12px_0px_0px_#000] p-8 md:p-12 ${surface} relative overflow-hidden`}>
                    <div
                        className={`absolute top-0 right-0 w-64 h-64 ${post.color} rounded-full blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2 pointer-events-none`}></div>

                    <div
                        className={`flex items-center gap-2 mb-6 border-b-4 ${isDarkMode ? 'border-gray-700' : 'border-black'} pb-6`}>
                        <span
                            onClick={() => onCategoryClick && onCategoryClick(post.parentCategory)}
                            className={`bg-black text-white px-3 py-1 font-bold text-sm cursor-pointer transition-transform hover:scale-105 ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'hover:bg-gray-800'}`}
                        >{post.parentCategory}</span>
                        <ChevronRight size={16} className={`${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}
                            strokeWidth={3} />
                        <span
                            onClick={() => onCategoryClick && onCategoryClick(post.parentCategory, post.category)}
                            className={`px-3 py-1 font-bold text-sm border-2 border-black ${post.color} text-white shadow-[2px_2px_0px_0px_#000] cursor-pointer transition-transform hover:scale-105`}
                        >{post.category}</span>
                    </div>

                    <h1 className="text-4xl md:text-6xl font-black mb-4 leading-tight">{post.title}</h1>

                    {/* Article Meta: Date, Reading Time, Word Count */}
                    <div className="flex flex-wrap items-center gap-4 mb-8 text-sm font-bold text-gray-500">
                        <div className="flex items-center gap-1">
                            <Clock size={16} />
                            <span>{post.date}</span>
                        </div>
                        {articleData?.readingTime && (
                            <div className="flex items-center gap-1">
                                <BookOpen size={16} />
                                <span>{articleData.readingTime}</span>
                            </div>
                        )}
                        {articleData?.wordCount && (
                            <div className="flex items-center gap-1">
                                <FileText size={16} />
                                <span>{articleData.wordCount} 字</span>
                            </div>
                        )}
                        <div className="flex items-center gap-1">
                            <Eye size={16} />
                            <span>{post.views} 阅读</span>
                        </div>
                    </div>

                    <div
                        className={`flex flex-wrap items-center gap-4 p-4 border-2 border-black mb-12 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                        <div className="flex items-center gap-3">
                            <div
                                className="w-12 h-12 border-2 border-black rounded-full bg-white overflow-hidden flex items-center justify-center">
                                <img
                                    src={avatarSrc}
                                    alt={post.authorName}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = MOCK_USER.avatar;
                                    }}
                                />
                            </div>
                            <div>
                                <p className="font-black text-lg leading-none">{post.authorName}</p>
                                <span
                                    className={`inline-block mt-1 px-2 py-0.5 text-xs font-black border-2 border-black shadow-[2px_2px_0px_0px_#000] ${isDarkMode ? 'bg-pink-600 text-white' : 'bg-yellow-400 text-black'}`}>
                                    {post.authorTitle ? post.authorTitle.toUpperCase() : '博主'}
                                </span>
                            </div>
                        </div>

                        {articleTags.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2">
                                {articleTags.map((tag) => (
                                    <span
                                        key={`article-tag-${tag}`}
                                        className={`px-2.5 py-1 text-[11px] font-black border-2 border-black rounded-full shadow-[2px_2px_0px_0px_#000] ${isDarkMode ? 'bg-gray-700 text-gray-100 border-gray-600' : 'bg-[#FFF5C0] text-black'}`}
                                    >
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className="flex items-center gap-2 ml-auto">
                            {isSuperAdmin && (
                                <button
                                    onClick={handleAdminEdit}
                                    className={`px-3 py-2 text-xs font-black border-2 border-black shadow-[4px_4px_0px_0px_#000] inline-flex items-center gap-2 ${isDarkMode ? 'bg-pink-600 text-white hover:bg-pink-500' : 'bg-[#FFD700] text-black hover:-translate-y-0.5'} transition-all`}
                                    title="跳转后台编辑此文章"
                                >
                                    <Edit size={16} /> 后台编辑
                                </button>
                            )}
                            <button
                                onClick={handleShare}
                                className={`p-2 border-2 border-black shadow-[4px_4px_0px_0px_#000] transition-all hover:shadow-[2px_2px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-white text-black'}`}
                                title="复制链接"
                            >
                                <Share2 size={20} />
                            </button>
                        </div>
                    </div>

                    <article className={proseClass} ref={articleContentRef}>
                        <div
                            className={`p-6 border-l-8 border-[#FFD700] font-serif italic text-xl mb-8 ${quoteBg} ${quoteText}`}>
                            {post.excerpt}
                        </div>
                        {shouldRenderMarkdown ? (
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm, remarkMath, remarkHighlight]}
                                rehypePlugins={[rehypeRaw, rehypeKatex]}
                                components={markdownComponents}
                            >
                                {contentMd}
                            </ReactMarkdown>
                        ) : contentHtml ? (
                            <div
                                dangerouslySetInnerHTML={{ __html: resolvedHtml || contentHtml }}
                            />
                        ) : (
                            <p className="font-semibold">暂无正文内容</p>
                        )}
                    </article>

                    <div id="comments-section" className="scroll-mt-32">
                        <CommentsSection
                            list={comments}
                            isDarkMode={isDarkMode}
                            onSubmit={handleCommentSubmit}
                            currentUser={currentUser}
                            setView={setView}
                            onDeleteComment={onDeleteComment}
                            onUpdateComment={onUpdateComment}
                            postAuthorName={post.authorName}
                        />
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {previewImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center p-6"
                        onClick={closeImagePreview}
                    >
                        <motion.img
                            src={previewImage}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            className="max-w-full max-h-full rounded-lg shadow-[8px_8px_0px_0px_#000] border-4 border-white cursor-zoom-out"
                            onClick={closeImagePreview}
                        />
                        <button
                            className="absolute top-6 right-6 text-white text-xl font-black border-2 border-white px-3 py-1"
                            onClick={closeImagePreview}
                        >
                            关闭
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// --- 2. 炫酷 UI 组件库 (不变) ---

const TiltCard = ({ children, className = "", onClick, isNew = false, accentColor = '#22D3EE' }) => {
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
            style={{ rotateX, rotateY }}
            whileHover={{ y: -6, rotate: -1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            onClick={onClick}
            className={`
        relative bg-white border-2 border-black p-0 
        shadow-[8px_8px_0px_0px_#000] hover:shadow-[12px_12px_0px_0px_#000] 
        transition-shadow duration-300 cursor-pointer perspective-1000
        ${className}
      `}
        >
            {isNew && (
                <>
                    <motion.div
                        className="pointer-events-none absolute -inset-3 rounded-[22px] opacity-75"
                        style={{
                            background: `linear-gradient(135deg, ${accentColor} 0%, #FF55AE 35%, #22D3EE 70%, ${accentColor} 100%)`,
                            filter: 'blur(18px)'
                        }}
                        animate={{ opacity: [0.55, 0.85, 0.6] }}
                        transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <motion.div
                        className="pointer-events-none absolute -inset-[10px] rounded-[26px] border border-white/10"
                        style={{
                            boxShadow: `0 0 0 1px rgba(255,255,255,0.08), 0 0 38px 10px ${accentColor}33, 0 0 72px 18px #FF008022`
                        }}
                        animate={{ scale: [1, 1.015, 1], opacity: [0.65, 0.9, 0.7] }}
                        transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <motion.div
                        className="pointer-events-none absolute -inset-[8px] rounded-[24px] overflow-hidden"
                        initial={{ backgroundPosition: '0% 50%' }}
                        animate={{ backgroundPosition: ['-120% 50%', '120% 50%', '120% 50%'] }}
                        transition={{ duration: 6, repeat: Infinity, repeatDelay: 2.2, ease: 'easeInOut' }}
                        style={{
                            backgroundImage: 'linear-gradient(120deg, transparent 32%, rgba(255,255,255,0.35) 50%, transparent 68%)',
                            backgroundSize: '200% 200%'
                        }}
                    />
                    <motion.div
                        className="pointer-events-none absolute -inset-1 rounded-[20px] opacity-65 mix-blend-screen"
                        style={{
                            backgroundImage: `radial-gradient(circle at 18% 24%, ${accentColor}22 0, transparent 45%), radial-gradient(circle at 82% 28%, #FF008022 0, transparent 40%), radial-gradient(circle at 50% 82%, #22D3EE22 0, transparent 40%)`
                        }}
                        animate={{ opacity: [0.35, 0.6, 0.4] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    />
                </>
            )}
            <div className="relative z-10">
                {children}
            </div>
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
        label: "庆典公告 // CELEBRATION",
        containerClass: "bg-gradient-to-r from-[#FFF1D0] via-[#FFE1A8] to-[#FFD166] text-[#3A2C0F]",
        textClass: "text-[#3A2C0F]",
        icon: Sparkles,
        iconClass: "text-[#C2410C]",
        iconSize: 24,
        pulse: true
    }
};

const EmergencyBar = ({ isOpen, content, onClose, onHeightChange, style = "ALERT" }) => {
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
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className={`border-b-4 border-black overflow-hidden relative z-[60] w-full ${styleConfig.containerClass}`}
                >
                    <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between font-bold">
                        <div className={`flex items-center gap-3 ${styleConfig.pulse ? 'animate-pulse' : ''}`}>
                            <StyleIcon size={styleConfig.iconSize} strokeWidth={3}
                                className={styleConfig.iconClass} />
                            <span className={`uppercase tracking-widest ${styleConfig.textClass}`}>{styleConfig.label}</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className={`text-sm hidden md:inline ${styleConfig.textClass}`}>{content}</span>
                            <button
                                onClick={onClose}
                                className="bg-black text-white p-1 hover:rotate-90 transition-transform border border-white"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const ErrorToast = ({ error, onClose }) => {
    const { headerHeight } = useLayoutOffsets();
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
                    initial={{ opacity: 0, y: -50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -50 }}
                    className="fixed right-4 z-[70] max-w-md"
                    style={{ top: toastTop }}
                >
                    <div className="bg-red-500 border-4 border-black shadow-[8px_8px_0px_0px_#000] p-4">
                        <div className="flex items-start gap-3 text-white">
                            <AlertTriangle size={24} strokeWidth={3} className="flex-shrink-0 mt-1" />
                            <div className="flex-1">
                                <h4 className="font-black text-lg mb-1">错误 // ERROR</h4>
                                <p className="font-bold text-sm">{error}</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="bg-black p-1 hover:rotate-90 transition-transform border border-white flex-shrink-0"
                            >
                                <X size={16} />
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
            setRipples(prev => [...prev, { x: e.clientX, y: e.clientY, id }]);
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
                    initial={{ width: 0, height: 0, opacity: 0.8, borderWidth: 5 }}
                    animate={{ width: 100, height: 100, opacity: 0, borderWidth: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
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
                <AnimateSharedLayout id="primary-nav-tabs">
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
                </AnimateSharedLayout>

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
                        className="relative p-2 border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000] active:translate-y-1 active:shadow-none rounded-full"
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
                            <div className={`flex items-center gap-3 p-4 border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_#000] ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                                <div className={`w-11 h-11 rounded-full border-2 border-black flex items-center justify-center ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}`}>
                                    {backgroundEnabled ? <Sun size={18} /> : <Moon size={18} />}
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
                                        className={`absolute top-1 left-1 w-7 h-7 rounded-full border-2 border-black bg-white shadow-[2px_2px_0px_0px_#000] transition-transform ${backgroundEnabled ? 'translate-x-6' : 'translate-x-0'}`}
                                    />
                                    <span className="absolute inset-y-0 right-2 flex items-center text-[10px] font-black uppercase">
                                        {backgroundEnabled ? 'ON' : 'OFF'}
                                    </span>
                                </button>
                            </div>

                            <div className={`flex items-start gap-3 p-4 border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_#000] ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
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
                                        className={`w-28 p-2 border-2 border-black rounded-lg font-black text-sm shadow-[3px_3px_0px_0px_#000] ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}`}
                                    >
                                        {pageSizeOptions.map((opt) => (
                                            <option key={opt} value={opt}>{opt} 条/页</option>
                                        ))}
                                    </select>
                                    <span className={`text-[11px] font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>选择后立即生效</span>
                                </div>
                            </div>

                            <div className={`flex items-center gap-2 px-3 py-2 border-2 border-dashed border-black rounded-lg text-[11px] font-semibold ${isDarkMode ? 'bg-gray-900 text-gray-300' : 'bg-white text-gray-600'}`}>
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
const Hero = ({ isDarkMode, onStartReading, version, tagline }) => {
    const { scrollY } = useScroll();
    const y1 = useTransform(scrollY, [0, 500], [0, 200]);
    const rotate = useTransform(scrollY, [0, 500], [0, 45]);

    const bgClass = isDarkMode ? THEME.colors.bgDark : THEME.colors.bgLight;
    const textClass = isDarkMode ? 'text-white' : 'text-black';
    const gridColor = isDarkMode ? '#374151' : '#000';
    const heroCopy = (typeof tagline === 'string' && tagline.trim().length > 0) ? tagline : DEFAULT_HERO_TAGLINE;

    return (
        <div
            className={`relative min-h-[90vh] flex flex-col justify-center items-center pt-20 overflow-hidden ${bgClass} ${textClass}`}>
            <div className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                    backgroundImage: `linear-gradient(${gridColor} 1px, transparent 1px), linear-gradient(90deg, ${gridColor} 1px, transparent 1px)`,
                    backgroundSize: '40px 40px'
                }}>
            </div>
            <div
                aria-hidden
                className="absolute inset-0 pointer-events-none mix-blend-multiply"
                style={{
                    backgroundImage: 'conic-gradient(from 180deg at 50% 50%, rgba(255,215,0,0.35), rgba(14,165,233,0.2), transparent 290deg)',
                    opacity: isDarkMode ? 0.35 : 0.5
                }}
            />
            <motion.div
                aria-hidden
                className="absolute inset-0 pointer-events-none"
                style={{
                    backgroundImage: `url(${HERO_NOISE_TEXTURE})`,
                    backgroundSize: '200px 200px',
                    opacity: isDarkMode ? 0.18 : 0.28,
                    mixBlendMode: isDarkMode ? 'screen' : 'multiply'
                }}
                initial={{ backgroundPosition: '0% 0%' }}
                animate={{ backgroundPosition: ['0% 0%', '100% 100%'] }}
                transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div style={{ y: y1, rotate }} className="absolute top-32 left-[10%] text-[#FFD700]">
                <Sparkles size={80} strokeWidth={1.5} className="drop-shadow-[4px_4px_0px_rgba(0,0,0,1)] fill-current" />
            </motion.div>
            <motion.div style={{ y: y1, x: -50 }}
                className="absolute bottom-40 right-[10%] w-32 h-32 border-4 border-black bg-[#00E096] shadow-[8px_8px_0px_0px_#000] z-0 rounded-full flex items-center justify-center font-black text-2xl">
                CODE
            </motion.div>

            <div className="z-10 text-center max-w-5xl px-4 relative">
                <motion.div
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="inline-block mb-6 bg-black text-white px-6 py-2 text-xl font-mono font-bold transform -rotate-2 shadow-[4px_4px_0px_0px_#111827]"
                >
                    {version ? `SANGUI BLOG // ${version}` : 'SANGUI BLOG'}
                </motion.div>

                <h1 className={`text-6xl md:text-9xl font-black mb-8 leading-[0.9] tracking-tighter drop-shadow-sm ${textClass}`}>
                    <motion.span
                        initial={{ y: 80, scale: 0.85, opacity: 0 }}
                        animate={{ y: [80, -12, 0], scale: [0.85, 1.08, 1], opacity: [0, 1, 1] }}
                        transition={{ delay: 0.08, duration: 0.9, ease: 'easeOut', times: [0, 0.6, 1] }}
                        className="block space-x-3"
                    >
                        <motion.span
                            whileHover={{ y: -4, scale: 1.02, rotate: -2 }}
                            transition={{ type: 'spring', stiffness: 260, damping: 14 }}
                            className="inline-block"
                        >
                            用代码记录
                        </motion.span>
                        <motion.span
                            whileHover={{ y: -6, scale: 1.04, rotate: 2, color: '#4F46E5' }}
                            transition={{ type: 'spring', stiffness: 280, damping: 14 }}
                            className="inline-block text-[#6366F1] underline decoration-8 decoration-black underline-offset-8 px-2"
                        >
                            探索
                        </motion.span>
                    </motion.span>
                    <motion.span
                        initial={{ y: 80, scale: 0.85, opacity: 0 }}
                        animate={{ y: [80, -12, 0], scale: [0.85, 1.08, 1], opacity: [0, 1, 1] }}
                        transition={{ delay: 0.18, duration: 0.9, ease: 'easeOut', times: [0, 0.6, 1] }}
                        className="block space-x-3 mt-2"
                    >
                        <motion.span
                            whileHover={{ y: -4, scale: 1.02, rotate: -1.5 }}
                            transition={{ type: 'spring', stiffness: 240, damping: 13 }}
                            className="inline-block"
                        >
                            以分享沉淀
                        </motion.span>
                        <motion.span
                            whileHover={{ y: -6, scale: 1.05, rotate: 2.5, backgroundColor: '#FFD700', color: '#0EA5E9' }}
                            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                            className="inline-block text-[#0EA5E9] bg-[#FFD700] px-2 ml-1 border-4 border-black skew-x-[-10deg] shadow-[6px_6px_0px_0px_#000]"
                        >
                            成长
                        </motion.span>
                    </motion.span>
                </h1>
                <p className={`text-xl md:text-2xl font-bold mb-12 max-w-2xl mx-auto border-2 border-black p-4 shadow-[4px_4px_0px_0px_#000] ${isDarkMode ? 'bg-[#1f2937] text-gray-300' : 'bg-white text-gray-600'}`}>
                    {heroCopy}
                    <br /><span className="text-sm font-mono text-[#0EA5E9]">{`>>`} PRESS START TO CONTINUE</span>
                </p>


                <div className="flex flex-wrap gap-6 justify-center">
                    <PopButton onClick={() => {
                        if (onStartReading) {
                            onStartReading();
                        } else {
                            document.getElementById('posts')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                    }}
                        icon={ArrowUpRight} className="text-xl px-8 py-4 bg-[#FF0080] text-white">
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

// --- 6. Scroll To Top Component ---
const ScrollToTop = ({ isDarkMode }) => {
    const STORAGE_KEY = 'sangui-scroll-button';
    const BUTTON_SIZE = 56;
    const [isVisible, setIsVisible] = useState(false);
    const [scrollPercent, setScrollPercent] = useState(0);
    const scrollProgress = useSpring(0, { stiffness: 160, damping: 28, mass: 0.6 });
    const [sparks, setSparks] = useState([]);
    const sparkTimersRef = useRef([]);
    const [position, setPosition] = useState(() => {
        if (typeof window === 'undefined') return { x: 24, y: 24 };
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                return parsed;
            }
        } catch {
            // ignore invalid stored position
        }
        return {
            x: window.innerWidth - BUTTON_SIZE - 24,
            y: window.innerHeight - BUTTON_SIZE - 120
        };
    });
    const [isDragging, setIsDragging] = useState(false);
    const dragMetaRef = useRef({ active: false, moved: false, ignoreClick: false, offsetX: 0, offsetY: 0 });
    const buttonRef = useRef(null);
    const latestPositionRef = useRef(position);
    const sparklePalette = useMemo(() => ['#FFD700', '#FF0080', '#6366F1', '#4ADE80'], []);

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
        if (typeof window === 'undefined') return;
        const handleResize = () => {
            setPosition(prev => clampPosition(prev));
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [clampPosition]);

    useEffect(() => {
        const timers = sparkTimersRef.current;
        return () => {
            timers.forEach((timer) => clearTimeout(timer));
        };
    }, []);

    useEffect(() => {
        const handlePointerMove = (event) => {
            if (!dragMetaRef.current.active) return;
            const point = event.touches ? event.touches[0] : event;
            if (!point) return;
            if (event.cancelable) event.preventDefault();
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
        window.addEventListener('touchmove', handlePointerMove, { passive: false });
        window.addEventListener('touchend', handlePointerUp);

        return () => {
            window.removeEventListener('mousemove', handlePointerMove);
            window.removeEventListener('mouseup', handlePointerUp);
            window.removeEventListener('touchmove', handlePointerMove);
            window.removeEventListener('touchend', handlePointerUp);
        };
    }, [clampPosition, persistPosition]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const updateScrollState = () => {
            const doc = document.documentElement;
            const scrollTop = window.pageYOffset || doc.scrollTop || 0;
            const maxScroll = Math.max(doc.scrollHeight - window.innerHeight, 1);
            const ratio = Math.min(Math.max(scrollTop / maxScroll, 0), 1);
            setScrollPercent(ratio);
            setIsVisible(scrollTop > 300);
            scrollProgress.set(ratio);
        };
        updateScrollState();
        window.addEventListener('scroll', updateScrollState);
        window.addEventListener('resize', updateScrollState);
        return () => {
            window.removeEventListener('scroll', updateScrollState);
            window.removeEventListener('resize', updateScrollState);
        };
    }, [scrollProgress]);

    const spawnSparkles = useCallback(() => {
        const baseId = Date.now();
        const burstCount = 14;
        const burst = Array.from({ length: burstCount }).map((_, index) => {
            const angle = (Math.PI * 2 * index) / burstCount + Math.random() * 0.4;
            const distance = 28 + Math.random() * 22;
            return {
                id: `${baseId}-${index}`,
                dx: Math.cos(angle) * distance,
                dy: Math.sin(angle) * distance,
                color: sparklePalette[index % sparklePalette.length]
            };
        });
        const ids = burst.map((spark) => spark.id);
        setSparks((prev) => [...prev, ...burst]);
        const timer = setTimeout(() => {
            setSparks((prev) => prev.filter((spark) => !ids.includes(spark.id)));
        }, 900);
        sparkTimersRef.current.push(timer);
    }, [sparklePalette]);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    };

    const startDrag = useCallback((event) => {
        const point = event.touches ? event.touches[0] : event;
        if (!point) return;
        const isTouch = event.type === 'touchstart';
        if (event.cancelable && !isTouch) event.preventDefault();
        const rect = buttonRef.current?.getBoundingClientRect();
        dragMetaRef.current = {
            active: true,
            moved: false,
            ignoreClick: false,
            offsetX: point.clientX - (rect?.left ?? 0),
            offsetY: point.clientY - (rect?.top ?? 0)
        };
        setIsDragging(true);
    }, []);

    useEffect(() => {
        const btn = buttonRef.current;
        if (!btn) return;
        const handleTouchStart = (event) => startDrag(event);
        btn.addEventListener('touchstart', handleTouchStart, { passive: false });
        return () => {
            btn.removeEventListener('touchstart', handleTouchStart);
        };
    }, [startDrag, isVisible]);

    const handleClick = (event) => {
        if (dragMetaRef.current.ignoreClick || isDragging) {
            if (event.cancelable) event.preventDefault();
            dragMetaRef.current.ignoreClick = false;
            return;
        }
        requestAnimationFrame(() => {
            if (scrollPercent > 0.95) {
                spawnSparkles();
            }
            scrollToTop();
        });
    };

    const indicatorRadius = 28;
    const indicatorStroke = 4;
    const indicatorSize = indicatorRadius * 2 + indicatorStroke * 2;
    const circumference = 2 * Math.PI * indicatorRadius;
    const dashOffset = useTransform(scrollProgress, (value) => (1 - value) * circumference);
    const trackColor = isDarkMode ? 'rgba(255,255,255,0.35)' : 'rgba(255,215,0,0.35)';
    const progressColor = isDarkMode ? '#F9FAFB' : '#FFD700';
    const percentLabel = Math.round(scrollPercent * 100);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.button
                    ref={buttonRef}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onMouseDown={startDrag}
                    onClick={handleClick}
                    style={{ left: `${position.x}px`, top: `${position.y}px`, touchAction: 'none' }}
                    aria-label={`返回顶部（已滚动 ${percentLabel}%）`}
                    className={`fixed z-50 p-3 rounded-full shadow-[6px_6px_0px_0px_rgba(0,0,0,0.45)] transition-colors ${isDarkMode ? 'bg-[#FF0080] text-white hover:bg-[#D9006C]' : 'bg-black text-[#FFD700] hover:bg-gray-900'} ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                >
                    <span className="relative flex items-center justify-center w-10 h-10">
                        <ArrowUp size={24} className="relative z-10" />
                    </span>
                    <motion.svg
                        className="absolute pointer-events-none"
                        width={indicatorSize}
                        height={indicatorSize}
                        viewBox={`0 0 ${indicatorSize} ${indicatorSize}`}
                        style={{ left: `calc(50% - ${indicatorSize / 2}px)`, top: `calc(50% - ${indicatorSize / 2}px)` }}
                        fill="none"
                    >
                        <circle
                            cx={indicatorSize / 2}
                            cy={indicatorSize / 2}
                            r={indicatorRadius}
                            stroke={trackColor}
                            strokeWidth={indicatorStroke}
                        />
                        <motion.circle
                            cx={indicatorSize / 2}
                            cy={indicatorSize / 2}
                            r={indicatorRadius}
                            stroke={progressColor}
                            strokeWidth={indicatorStroke}
                            strokeDasharray={circumference}
                            style={{ strokeDashoffset: dashOffset }}
                            strokeLinecap="round"
                        />
                    </motion.svg>
                    <span className="pointer-events-none absolute inset-0 overflow-visible">
                        {sparks.map((spark) => (
                            <motion.span
                                key={spark.id}
                                className="absolute w-2.5 h-2.5 rounded-full"
                                style={{ left: '50%', top: '50%', backgroundColor: spark.color }}
                                initial={{ opacity: 0.95, x: 0, y: 0, scale: 0.5, rotate: 0 }}
                                animate={{ opacity: 0, x: spark.dx, y: spark.dy, scale: 1.3, rotate: 180 }}
                                transition={{ duration: 0.85, ease: 'easeOut' }}
                            />
                        ))}
                    </span>
                </motion.button>
            )}
        </AnimatePresence>
    );
};

// --- 5. Main App ---

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
    const [emergencyHeight, setEmergencyHeight] = useState(0);
    const [error, setError] = useState(null);
    const [archivePosts, setArchivePosts] = useState([]);
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

    const loadArchivePosts = useCallback(async () => {
        setArchiveLoading(true);
        setArchiveError('');
        try {
            const res = await fetchPosts({ page: 1, size: 200, status: 'PUBLISHED' });
            const data = res.data || res;
            setArchivePosts(data?.records || data || []);
        } catch (err) {
            console.warn('load archive posts failed', err);
            setArchiveError(err?.message || '无法加载归档文章');
        } finally {
            setArchiveLoading(false);
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
    const siteVersion = meta?.version || 'V2.1.160';
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
        if (view === 'archive' && archivePosts.length === 0 && !archiveLoading) {
            loadArchivePosts();
        }
    }, [view, archivePosts.length, archiveLoading, loadArchivePosts]);

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
        navigate('/admin/profile');
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

    const archiveData = archivePosts && archivePosts.length ? archivePosts : posts;
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
        const surface = isDarkMode ? 'bg-gray-900/75 border border-gray-700 shadow-[8px_12px_0px_rgba(0,0,0,0.45)]' : 'bg-white/85 backdrop-blur border border-black/70 shadow-[8px_12px_0px_rgba(0,0,0,0.2)]';
        return (
            <div className="relative pt-28 pb-20 px-4">
                <div className={`max-w-5xl mx-auto space-y-8 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    <div className={`${surface} rounded-3xl p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4`}>
                        <div className="space-y-2">
                            <p className="text-xs uppercase tracking-[0.2em] text-[#FFD700] font-semibold">Indie Lab</p>
                            <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
                                <span>工具中心</span>
                                <span className="text-[11px] px-2 py-1 rounded-full bg-[#FFD700] text-black font-bold shadow-sm">测试</span>
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
                        <div className="px-4 py-3 border-2 border-red-400 bg-red-50 text-red-700 font-semibold rounded-2xl">
                            {gameListError}
                        </div>
                    )}

                    <div className={`${surface} rounded-3xl p-6 md:p-8`}>
                        <div className="grid gap-5 md:grid-cols-2">
                            {gameListLoading && Array.from({ length: 4 }).map((_, idx) => (
                                <div key={`skeleton-${idx}`} className="border-2 border-dashed border-gray-400/70 rounded-2xl p-4 animate-pulse">
                                    <div className="h-4 bg-gray-300/70 rounded w-1/2 mb-3"></div>
                                    <div className="h-3 bg-gray-200/70 rounded w-2/3 mb-2"></div>
                                    <div className="h-3 bg-gray-200/50 rounded w-1/3"></div>
                                </div>
                            ))}

                            {!gameListLoading && gameList.length === 0 && (
                                <div className="md:col-span-2 text-center py-12 border-2 border-dashed rounded-2xl text-sm font-semibold">
                                    还没有发布的独立页面，敬请期待。
                                </div>
                            )}

                            {gameList.map((game) => {
                                const statusTone = {
                                    ACTIVE: 'bg-emerald-500 text-white',
                                    DISABLED: 'bg-gray-500 text-white',
                                    DRAFT: 'bg-amber-400 text-black'
                                }[game.status] || 'bg-black text-white';
                                return (
                                    <div
                                        key={game.id}
                                        className={`${isDarkMode ? 'bg-gray-800/70 border-gray-700' : 'bg-white/85 border-black/70'} border-2 rounded-2xl p-5 flex flex-col gap-4 hover:-translate-y-1 transition-transform duration-200 shadow-[6px_8px_0px_rgba(0,0,0,0.25)]`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs px-2 py-0.5 rounded-full font-bold border border-black/60 bg-white/70 text-black">#{game.id}</span>
                                                    {game.status && (
                                                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold border border-black/50 ${statusTone}`}>
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
                                                className="px-3 py-1.5 border-2 border-black bg-[#FFD700] text-black font-bold rounded hover:-translate-y-0.5 transition-transform"
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
                        postsData={archiveData}
                        isDarkMode={isDarkMode}
                        loading={archiveLoading}
                        error={archiveError}
                        onBackHome={() => setView('home')}
                        onReload={loadArchivePosts}
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
                                onClose={() => setNotification(prev => ({ ...prev, isOpen: false }))}
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
const StatsStrip = ({ isDarkMode, stats }) => {
    const { headerHeight } = useLayoutOffsets();
    const s = stats || SITE_STATS;
    const items = [
        { label: "文章", value: s.posts, icon: FileText, color: "text-[#6366F1]" },
        { label: "浏览", value: s.views, icon: Eye, color: "text-[#FF0080]" },
        { label: "评论", value: s.comments, icon: MessageSquare, color: "text-[#00E096]" },
        { label: "标签", value: s.tags, icon: Hash, color: "text-[#FFD700]" },
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
            style={{ top: headerHeight }}
        >
            <div className="max-w-7xl mx-auto px-4 py-2 sm:py-0 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:h-14">
                <div className="flex items-center gap-2 sm:mr-8 flex-shrink-0">
                    <Activity className="text-[#00E096] animate-pulse" />
                    <span className="font-black tracking-widest uppercase">System Status</span>
                </div>

                <div className="flex items-center gap-6 md:gap-12 overflow-x-auto sm:overflow-visible w-full sm:w-auto pb-1 sm:pb-0 pr-1 snap-x snap-mandatory [-webkit-overflow-scrolling:touch]">
                    {items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 flex-shrink-0 group cursor-default relative snap-start">
                            <item.icon size={16}
                                className={`${item.color} group-hover:scale-125 transition-transform`} />

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
    onScrollToPosts,
    homeQuote,
    pageSize = DEFAULT_PAGE_SIZE
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
    const endingQuote = (typeof homeQuote === 'string' && homeQuote.trim().length > 0) ? homeQuote : DEFAULT_HOME_QUOTE;
    const warningTimerRef = useRef(null);
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
    const keywordText = keyword.trim().toLowerCase();
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
    }, [KONAMI_CODE]);

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

    const showSpinHint = useCallback((message, duration = 2200) => {
        setSpinWarning(message);
        setShowSpinWarning(true);
        if (warningTimerRef.current) {
            clearTimeout(warningTimerRef.current);
        }
        warningTimerRef.current = setTimeout(() => setShowSpinWarning(false), duration);
    }, []);

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
        if (keywordText) {
            const titleText = `${post.title || ''}`.toLowerCase();
            const abstractText = `${post.excerpt || post.summary || post.description || ''}`.toLowerCase();
            if (!titleText.includes(keywordText) && !abstractText.includes(keywordText)) return false;
        }
        return true;
    });

    useEffect(() => {
        setCurrentPage(1);
        paginationScrollReadyRef.current = false;
    }, [activeParent, activeSub, activeTag, pageSize, keyword]);

    useEffect(() => {
        if (!paginationScrollReadyRef.current) {
            paginationScrollReadyRef.current = true;
            return;
        }
        scrollToPostsTop();
    }, [currentPage, scrollToPostsTop]);

    const totalPages = Math.max(1, Math.ceil(filteredPosts.length / pageSize));
    const displayPosts = filteredPosts.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    const paginationItems = useMemo(() => {
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }
        const pages = [1];
        const windowStart = Math.max(2, currentPage - 1);
        const windowEnd = Math.min(totalPages - 1, currentPage + 1);
        if (windowStart > 2) {
            pages.push('ellipsis-left');
        }
        for (let p = windowStart; p <= windowEnd; p += 1) {
            pages.push(p);
        }
        if (windowEnd < totalPages - 1) {
            pages.push('ellipsis-right');
        }
        pages.push(totalPages);
        return pages;
    }, [currentPage, totalPages]);

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
    const buildMediaUrl = (path, fallback) => buildAssetUrl(path, fallback);
    const authorAvatar = buildMediaUrl(displayAuthor.avatar, MOCK_USER.avatar);
    const authorWechat = buildMediaUrl("/contact/wechat.jpg");
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
            <StatsStrip isDarkMode={isDarkMode} stats={stats} />
            <AnimatePresence>
                {showSpinWarning && (
                    <motion.div
                        className="fixed inset-0 z-[140] flex items-center justify-center px-4 pointer-events-none"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            initial={{ scale: 0.85, rotate: -4 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0.8, rotate: 6, opacity: 0 }}
                            className="relative max-w-md w-full pointer-events-none"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-[#FF0080] via-[#6366F1] to-[#0EA5E9] opacity-60 blur-3xl" />
                            <div
                                className={`relative border-4 border-black px-6 py-5 text-center shadow-[8px_8px_0px_0px_#000] ${isDarkMode ? 'bg-[#050816] text-[#FFD700]' : 'bg-white text-black'}`}>
                                <div className="text-[10px] font-mono tracking-[0.6em] text-gray-400 uppercase mb-2">
                                    SPIN ALERT
                                </div>
                                <div className="text-2xl font-black italic leading-snug">{spinWarning}</div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
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
                                className="absolute text-[#FFD700]"
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
                                initial={{ scale: 0.8, rotate: -6 }}
                                animate={{ scale: 1, rotate: 0 }}
                                exit={{ scale: 0.8, rotate: 4, opacity: 0 }}
                                className="px-8 py-4 border-4 border-[#FFD700] bg-[#0f172a] text-[#FFD700] text-3xl font-black tracking-widest shadow-[12px_12px_0px_0px_#FF0080]"
                            >
                                眼冒金星模式
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="text-base font-mono tracking-[0.4em]"
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

            <section id="posts" className="px-4 md:px-8 max-w-7xl mx-auto py-16 min-h-screen">
                <div className="flex flex-col lg:flex-row gap-12">
                    <div className="hidden lg:block w-full lg:w-1/4 space-y-8">
                        <div
                            className={`${sidebarBg} border-2 border-black p-6 shadow-[8px_8px_0px_0px_#000] text-center relative ${text}`}>
                            <motion.div
                                animate={spinLockActive ? { rotate: [0, -8, 8, -5, 5, 0] } : { rotate: avatarClicks * 360 }}
                                transition={spinLockActive ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.5 }}
                                onClick={handleAvatarClick}
                                className="absolute -top-6 left-1/2 -translate-x-1/2 w-20 h-20 bg-[#FFD700] rounded-full border-2 border-black flex items-center justify-center cursor-pointer"
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
                            <p className={`text-sm font-bold mb-4 ${subText}`}>{displayAuthor.bio || displayAuthor.title || '保持热爱，持续创作。'}</p>
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
                                                className={`transition-transform ${activeParent === cat.id ? 'rotate-90' : ''}`} />
                                        </button>
                                        <AnimatePresence>
                                            {activeParent === cat.id && cat.children.length > 0 && (
                                                <motion.div
                                                    initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                                                    className={`overflow-hidden border-l-4 border-black ml-4 ${sidebarBg}`}
                                                >
                                                    {cat.children.map(sub => (
                                                        <button
                                                            key={sub.id}
                                                            onClick={() => handleSubClick(sub.id)}
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
                                            className={`border-2 border-black p-3 rounded-xl ${isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-800'} shadow-[4px_4px_0px_0px_#000]`}>
                                            <div className="flex items-center gap-3">
                                                <img src={avatar} alt={comment.authorName || '访客'}
                                                    className="w-10 h-10 rounded-full border-2 border-black object-cover bg-[#FFD700]" />
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
                                        className={`px-2 py-1 border-2 border-black shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5 transition-transform ${isDarkMode ? 'bg-[#111827] text-white' : 'bg-white text-black'}`}
                                    >
                                        清除筛选
                                    </button>
                                </div>
                            )}
                            {visibleTags.length ? (
                                <AnimateSharedLayout id="tag-filter-shared-highlight">
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {visibleTags.map((tag) => {
                                            const isActive = activeTag === tag;
                                            return (
                                                <button
                                                    type="button"
                                                    key={tag}
                                                    onClick={() => handleTagClick(tag)}
                                                    aria-pressed={isActive}
                                                    className={`relative overflow-hidden px-3 py-1 text-xs font-black border-2 border-black rounded-full shadow-[3px_3px_0px_0px_#000] transition-transform hover:-translate-y-0.5 bg-transparent ${isActive ? 'text-black' : tagAccentClass}`}
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
                                </AnimateSharedLayout>
                            ) : (
                                <div className="mt-4">
                                    <span className={`text-sm font-bold ${subText}`}>暂无标签</span>
                                </div>
                            )}
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
                        <div
                            className={`mb-8 border-2 border-black rounded-none shadow-[6px_6px_0px_0px_#000] overflow-hidden ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}`}>
                            <div className="flex flex-col md:flex-row md:items-center gap-3 px-5 py-4">
                                <div className="flex items-center gap-2 font-black text-lg tracking-tight">
                                    <Search size={18} />
                                    <span>文章搜索</span>
                                </div>
                                <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3">
                                    <div
                                        className={`flex items-center gap-2 flex-1 px-3 py-2 border-2 border-black rounded-none shadow-[3px_3px_0px_0px_#000] ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}`}>
                                        <Search size={16} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                                        <input
                                            type="text"
                                            value={keyword}
                                            onChange={(e) => setKeyword(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    setCurrentPage(1);
                                                    scrollToPostsTop();
                                                }
                                            }}
                                            placeholder="搜索标题或摘要，实时模糊匹配"
                                            className={`w-full bg-transparent outline-none text-sm font-semibold placeholder:font-normal placeholder:text-gray-400 ${isDarkMode ? 'text-white' : 'text-black'}`}
                                        />
                                        {keyword && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setKeyword('');
                                                    setCurrentPage(1);
                                                    scrollToPostsTop();
                                                }}
                                                className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-none border-2 border-black shadow-[2px_2px_0px_0px_#000] ${isDarkMode ? 'bg-white text-black hover:-translate-y-0.5' : 'bg-black text-white hover:bg-[#FF0080]'}`}
                                            >
                                                <X size={14} /> 清空
                                            </button>
                                        )}
                                    </div>
                                    <div
                                        className={`text-[11px] font-mono font-black px-3 py-2 border-2 border-black shadow-[3px_3px_0px_0px_#000] rounded-none ${isDarkMode ? 'bg-[#111827] text-gray-100' : 'bg-[#FFD700] text-black'}`}>
                                        {keywordText ? `已筛选 ${filteredPosts.length} 篇` : `共 ${sourcePosts.length} 篇`}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-8">
                            {displayPosts.length > 0 ? (
                                displayPosts.map((post, idx) => {
                                    const viewCount = post.views ?? post.viewsCount ?? 0;
                                    const commentCount = post.comments ?? post.commentsCount ?? 0;
                                    const coverUrl = buildMediaUrl(post.coverImage);
                                    const tags = Array.isArray(post.tags) ? post.tags : [];
                                    const accentColor = extractHexFromBgClass(post.color, '#6366F1');
                                    const isNewPost = isPostNew(post.date);
                                    return (
                                        <motion.div
                                            key={post.id}
                                            initial={{ opacity: 0, y: 50 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.1, duration: 0.5 }}
                                            whileHover="hover"
                                        >
                                            <TiltCard isNew={isNewPost} accentColor={accentColor} onClick={() => {
                                                setArticleId(post.id);
                                                setView('article');
                                            }}>
                                                <div className="flex flex-col md:flex-row min-h-[360px]">
                                                    <div className="md:w-1/3 w-full h-60 md:h-auto md:min-h-[360px] md:max-h-[360px] border-b-2 md:border-b-0 md:border-r-2 border-black relative overflow-hidden group">
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
                                                        <div className="relative z-10 p-6 h-full flex flex-col justify-between text-white">
                                                            <span className="font-black text-5xl opacity-60 drop-shadow">
                                                                {(idx + 1 + (currentPage - 1) * pageSize).toString().padStart(2, '0')}
                                                            </span>
                                                            <div>
                                                                <span
                                                                    className="bg-black/80 text-white px-2 py-1 text-xs font-bold uppercase mb-2 inline-block rounded">
                                                                    {post.parentCategory}
                                                                </span>
                                                                <h4 className="font-black text-2xl leading-none drop-shadow-lg">{post.category}</h4>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className={`flex-1 p-6 md:p-8 ${cardBg} group ${hoverBg} flex flex-col`} style={{ minHeight: '360px' }}>
                                                        <div className="flex flex-wrap items-center gap-2 mb-3">
                                                            <span className={`px-2 py-1 text-[11px] font-black border-2 border-black rounded-full shadow-[2px_2px_0px_0px_#000] ${isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-700'}`}>
                                                                {post.parentCategory}
                                                            </span>
                                                            <ChevronRight size={12} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                                                            <span className={`px-2 py-1 text-[11px] font-black border-2 border-black rounded-full shadow-[2px_2px_0px_0px_#000] ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                                                                {post.category}
                                                            </span>
                                                            <div className="flex flex-wrap gap-1 ml-auto">
                                                                {tags.slice(0, 3).map(t => (
                                                                    <span key={t}
                                                                        className={`px-2 py-0.5 border border-black text-[11px] font-black rounded-full ${isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-white'} shadow-[2px_2px_0px_0px_#000]`}>#{t}</span>
                                                                ))}
                                                                {tags.length > 3 && (
                                                                    <span className="text-[11px] font-black px-2 py-0.5 border border-black rounded-full bg-black text-white shadow-[2px_2px_0px_0px_#000]">+{tags.length - 3}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-start gap-2 mb-3">
                                                            <h2
                                                                className={`text-3xl font-black flex-1 transition-colors group-hover:text-[var(--title-color)] ${text}`}
                                                                style={{
                                                                    '--title-color': extractHexFromBgClass(post.color, '#6366F1'),
                                                                    WebkitLineClamp: 2,
                                                                    display: '-webkit-box',
                                                                    WebkitBoxOrient: 'vertical',
                                                                    overflow: 'hidden',
                                                                    minHeight: '4.6rem',
                                                                    maxHeight: '4.6rem'
                                                                }}
                                                            >
                                                                {post.title}
                                                            </h2>
                                                            {isNewPost && (
                                                                <motion.span
                                                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-black uppercase tracking-widest border-2 border-black bg-[#FF0080] text-white shadow-[2px_2px_0px_0px_#000]"
                                                                    initial={{ scale: 0.95, opacity: 0.9 }}
                                                                    animate={{ scale: [0.95, 1.08, 1], opacity: [0.9, 1, 0.95] }}
                                                                    transition={{ duration: 2, repeat: 1, ease: 'easeInOut' }}
                                                                >
                                                                    <Sparkles size={12} strokeWidth={3} />
                                                                    NEW
                                                                </motion.span>
                                                            )}
                                                        </div>
                                                        <p
                                                            className={`text-base md:text-lg font-medium border-l-4 border-gray-300 pl-4 pr-2 ${subText}`}
                                                            style={{
                                                                minHeight: '4.5em',
                                                                display: '-webkit-box',
                                                                WebkitLineClamp: 3,
                                                                WebkitBoxOrient: 'vertical',
                                                                overflow: 'hidden'
                                                            }}
                                                        >
                                                            {post.excerpt}
                                                        </p>

                                                        <div className="mt-auto pt-4">
                                                            <div
                                                                className={`flex justify-between items-center border-t-2 ${isDarkMode ? 'border-gray-700' : 'border-black'} pt-4 border-dashed`}>
                                                                <span className="font-mono font-bold text-xs bg-black text-white px-2 py-1 flex items-center gap-1">
                                                                    <Clock size={14} /> {post.date}
                                                                </span>
                                                                <div className={`flex gap-4 font-bold text-sm items-center ${text}`}>
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
                                <div className={`p-12 border-4 border-black border-dashed text-center ${cardBg}`}>
                                    <p className={`text-2xl font-black ${subText}`}>
                                        {keywordText ? '未找到匹配的文章，换个关键词试试？' : 'NO DATA FOUND'}
                                    </p>
                                    {keywordText && (
                                        <p className={`mt-3 text-sm font-bold ${subText}`}>
                                            当前关键词：{keyword}
                                        </p>
                                    )}
                                    <PopButton variant="primary" className="mt-4" onClick={() => {
                                        setActiveParent('all');
                                        setActiveSub('all');
                                        setKeyword('');
                                        scrollToPostsTop();
                                    }}>RESET FILTERS</PopButton>
                                </div>
                            )}
                        </div>

                        {totalPages > 1 && (
                            <div className="mt-12 flex flex-wrap justify-center items-center gap-2">
                                {paginationItems.map((item, idx) => {
                                    if (typeof item === 'string') {
                                        return (
                                            <span
                                                key={`${item}-${idx}`}
                                                className={`h-9 px-3 inline-flex items-center justify-center rounded-full text-xs font-black border-2 border-black shadow-[3px_3px_0px_0px_#000] opacity-80 hover:opacity-90 transition-opacity ${isDarkMode
                                                    ? 'bg-gray-900 text-gray-200'
                                                    : 'bg-white text-gray-700'}`}
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
                                            onClick={() => {
                                                setCurrentPage(item);
                                                scrollToPostsTop();
                                            }}
                                            className={`w-10 h-10 border-2 border-black font-black transition-all shadow-[4px_4px_0px_0px_#000]
                          ${isActive ? 'bg-black text-white -translate-y-1 shadow-[6px_6px_0px_0px_#FF0080]' : `${isDarkMode ? 'bg-gray-700 text-white' : 'bg-white'} hover:bg-[#6366F1] hover:text-white`}
                        `}
                                        >
                                            {item}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        <div className="py-12 text-center mt-8">
                            <div className="inline-block relative">
                                <div
                                    className="absolute inset-0 bg-[#FFD700] transform translate-x-2 translate-y-2 border-2 border-black"></div>
                                <div
                                    className={`relative border-2 border-black px-8 py-4 text-2xl font-black italic ${cardBg} ${text}`}>
                                    {endingQuote ? `“${endingQuote}”` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
};

const ArchiveView = ({
    postsData,
    isDarkMode,
    onBackHome,
    onOpenArticle,
    loading,
    error,
    onReload
}) => {
    const { headerHeight } = useLayoutOffsets();
    const archiveScrollMargin = useMemo(() => Math.max(headerHeight + 16, 0), [headerHeight]);
    const quickJumpTop = useMemo(() => headerHeight + 48, [headerHeight]);
    const timelineWrapRef = useRef(null);
    const [quickDockId, setQuickDockId] = useState('');
    const [quickDockTop, setQuickDockTop] = useState(0);
    const scrollTickingRef = useRef(false);
    const postsSource = useMemo(() => (Array.isArray(postsData) && postsData.length ? postsData : MOCK_POSTS), [postsData]);

    const normalizedList = useMemo(() => {
        return postsSource
            .map((post, index) => {
                const rawDate = post.publishedAt || post.published_at || post.date || post.createdAt || post.created_at;
                const parsed = rawDate ? new Date(rawDate) : null;
                const isValidDate = parsed && !Number.isNaN(parsed.getTime());
                const timestamp = isValidDate ? parsed.getTime() : 0;
                const year = isValidDate ? `${parsed.getFullYear()}` : '未归档';
                const monthIndex = isValidDate ? parsed.getMonth() : -1;
                const dateLabel = isValidDate
                    ? `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`
                    : (rawDate || '日期待定');
                return {
                    post,
                    timestamp,
                    year,
                    monthIndex,
                    monthLabel: monthIndex >= 0 ? ARCHIVE_MONTH_LABELS[monthIndex] : '日期待定',
                    displayDate: dateLabel,
                    fallbackKey: `${post.id || index}-${timestamp}`
                };
            })
            .sort((a, b) => b.timestamp - a.timestamp);
    }, [postsSource]);

    const timelineData = useMemo(() => {
        const grouped = new Map();
        normalizedList.forEach((item) => {
            if (!grouped.has(item.year)) {
                grouped.set(item.year, new Map());
            }
            const monthKey = item.monthIndex >= 0 ? item.monthIndex : `unknown-${item.fallbackKey}`;
            const monthLabel = item.monthIndex >= 0 ? item.monthLabel : '日期待定';
            const monthMap = grouped.get(item.year);
            if (!monthMap.has(monthKey)) {
                monthMap.set(monthKey, {
                    label: monthLabel,
                    sortIndex: item.monthIndex,
                    posts: []
                });
            }
            monthMap.get(monthKey).posts.push(item);
        });
        return Array.from(grouped.entries())
            .map(([year, monthMap]) => {
                const yearValue = Number(year);
                const sortValue = Number.isNaN(yearValue) ? -Infinity : yearValue;
                const months = Array.from(monthMap.values()).map((month) => ({
                    ...month,
                    posts: month.posts.sort((a, b) => b.timestamp - a.timestamp),
                    anchorId: typeof month.sortIndex === 'number' && month.sortIndex >= 0
                        ? `archive-${year}-${String(month.sortIndex + 1).padStart(2, '0')}`
                        : null
                })).sort((a, b) => {
                    const aIndex = typeof a.sortIndex === 'number' ? a.sortIndex : -1;
                    const bIndex = typeof b.sortIndex === 'number' ? b.sortIndex : -1;
                    return bIndex - aIndex;
                });
                return {
                    year,
                    sortValue,
                    months,
                    total: months.reduce((sum, month) => sum + month.posts.length, 0)
                };
            })
            .sort((a, b) => b.sortValue - a.sortValue);
    }, [normalizedList]);

    const totalCount = normalizedList.length;
    const totalYears = timelineData.length;
    const lastUpdated = normalizedList[0]?.displayDate || '-';
    const monthShortcuts = useMemo(() => (
        timelineData.flatMap((yearBlock) => (
            yearBlock.months
                .filter((month) => month.anchorId)
                .map((month) => ({
                    id: month.anchorId,
                    label: `${yearBlock.year}年${month.label}`
                }))
        ))
    ), [timelineData]);

    const recalcQuickDockTop = useCallback((anchorId) => {
        if (typeof document === 'undefined') return;
        const targetId = anchorId || quickDockId;
        const anchorEl = targetId ? document.getElementById(targetId) : null;
        const wrapEl = timelineWrapRef.current;
        if (!anchorEl || !wrapEl) return;
        const anchorTop = anchorEl.getBoundingClientRect().top + window.scrollY;
        const wrapTop = wrapEl.getBoundingClientRect().top + window.scrollY;
        const nextTop = Math.max(anchorTop - wrapTop, 0);
        setQuickDockTop(nextTop);
    }, [quickDockId]);

    const syncActiveMonthByScroll = useCallback(() => {
        if (typeof document === 'undefined' || scrollTickingRef.current) return;
        scrollTickingRef.current = true;
        requestAnimationFrame(() => {
            const scrollPos = window.scrollY + quickJumpTop + 8;
            let candidateId = monthShortcuts[0]?.id || '';
            for (const shortcut of monthShortcuts) {
                const el = document.getElementById(shortcut.id);
                if (!el) continue;
                const top = el.getBoundingClientRect().top + window.scrollY;
                if (top <= scrollPos) {
                    candidateId = shortcut.id;
                } else {
                    break;
                }
            }
            if (candidateId && candidateId !== quickDockId) {
                setQuickDockId(candidateId);
                recalcQuickDockTop(candidateId);
            } else if (candidateId) {
                recalcQuickDockTop(candidateId);
            }
            scrollTickingRef.current = false;
        });
    }, [monthShortcuts, quickDockId, quickJumpTop, recalcQuickDockTop]);

    useEffect(() => {
        if (!monthShortcuts.length) return;
        setQuickDockId((prev) => prev || monthShortcuts[0].id);
        recalcQuickDockTop(monthShortcuts[0].id);
    }, [monthShortcuts, recalcQuickDockTop]);

    const handleMonthJump = useCallback((anchorId) => {
        if (typeof document === 'undefined' || typeof window === 'undefined' || !anchorId) return;
        setQuickDockId(anchorId);
        const el = document.getElementById(anchorId);
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const targetTop = window.scrollY + rect.top - archiveScrollMargin;
        window.scrollTo({ top: Math.max(targetTop, 0), behavior: 'smooth' });
        requestAnimationFrame(() => recalcQuickDockTop(anchorId));
    }, [archiveScrollMargin, recalcQuickDockTop]);

    useEffect(() => {
        recalcQuickDockTop();
        const handleResize = () => {
            recalcQuickDockTop();
            syncActiveMonthByScroll();
        };
        window.addEventListener('resize', handleResize, { passive: true });
        window.addEventListener('scroll', syncActiveMonthByScroll, { passive: true });
        syncActiveMonthByScroll();
        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', syncActiveMonthByScroll);
        };
    }, [recalcQuickDockTop, syncActiveMonthByScroll, timelineData]);

    const sectionText = isDarkMode ? 'text-gray-100' : 'text-gray-900';
    const secondaryText = isDarkMode ? 'text-gray-300' : 'text-gray-600';
    const cardBg = isDarkMode ? 'bg-[#0F172A]/85 text-gray-100' : 'bg-white/90 text-gray-900';
    const borderColor = isDarkMode ? 'border-gray-700' : 'border-black';
    const quickJumpBtn = isDarkMode
        ? 'bg-[#111827]/80 text-white hover:bg-[#1F2937]'
        : 'bg-white/90 text-black hover:bg-[#FFD700]';

    const handleArticleClick = (postId) => {
        if (!postId || typeof onOpenArticle !== 'function') return;
        onOpenArticle(postId);
    };

    return (
        <section className="relative min-h-screen pt-32 pb-20 overflow-hidden">
            <div className={`absolute inset-0 ${isDarkMode ? 'bg-gradient-to-b from-[#020617]/80 via-transparent to-[#020617]/70' : 'bg-gradient-to-b from-white/80 via-white/30 to-white/70'} backdrop-blur-[2px]`} />
            <div className={`relative z-10 max-w-6xl mx-auto px-4 md:px-8 ${sectionText}`}>
                <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
                    <div>
                        <p className="text-xs tracking-[0.4em] uppercase text-gray-500">ARCHIVE // TIMELINE</p>
                        <h1 className="text-4xl md:text-5xl font-black mt-3">归档时间线</h1>
                        <p className={`mt-4 text-base md:text-lg ${secondaryText} max-w-2xl`}>
                            将所有文章按年份与月份折叠成一条可追溯的时间轴，方便快速定位历史输出。点击任意条目即可跳转至文章详情。
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <PopButton variant="accent" onClick={onBackHome} className="shadow-[6px_6px_0px_0px_#000]">
                            返回首页
                        </PopButton>
                        <PopButton variant="primary" onClick={onReload} disabled={loading} className="shadow-[6px_6px_0px_0px_#000]">
                            {loading ? '加载中…' : '刷新归档'}
                        </PopButton>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10">
                    <div className={`${cardBg} border-2 border-black shadow-[6px_6px_0px_0px_#000] px-6 py-5 rounded-2xl`}>
                        <p className="text-xs font-bold uppercase text-gray-500">累计文章</p>
                        <p className="text-3xl font-black mt-2">{totalCount}</p>
                    </div>
                    <div className={`${cardBg} border-2 border-black shadow-[6px_6px_0px_0px_#000] px-6 py-5 rounded-2xl`}>
                        <p className="text-xs font-bold uppercase text-gray-500">覆盖年份</p>
                        <p className="text-3xl font-black mt-2">{totalYears}</p>
                    </div>
                    <div className={`${cardBg} border-2 border-black shadow-[6px_6px_0px_0px_#000] px-6 py-5 rounded-2xl`}>
                        <p className="text-xs font-bold uppercase text-gray-500">最近更新</p>
                        <p className="text-xl font-black mt-2">{lastUpdated}</p>
                    </div>
                </div>

                {error && (
                    <div className="mt-8 border-2 border-red-500 bg-red-100/60 text-red-700 font-bold px-4 py-3 rounded-xl">
                        {error}
                    </div>
                )}

                {loading && (
                    <div className="mt-12 space-y-6">
                        {[1, 2, 3].map((skeleton) => (
                            <div key={skeleton} className={`h-32 ${cardBg} border-2 border-dashed ${borderColor} rounded-2xl animate-pulse`}></div>
                        ))}
                    </div>
                )}

                {!loading && !timelineData.length && (
                    <div className={`mt-12 ${cardBg} border-2 ${borderColor} rounded-2xl p-12 text-center`}>
                        <p className="text-lg font-black">暂无归档文章</p>
                        <p className="text-sm text-gray-500 mt-2">发布新文章后会自动出现在这里。</p>
                    </div>
                )}

                <div className="mt-12 flex flex-col lg:flex-row gap-8" ref={timelineWrapRef}>
                    <div className="flex-1 space-y-12">
                        {timelineData.map((yearBlock) => (
                            <div key={yearBlock.year}>
                                <div className="flex items-center gap-4">
                                    <span className="text-3xl md:text-4xl font-black">{yearBlock.year}</span>
                                    <div className="h-px flex-1 bg-gradient-to-r from-black/60 to-transparent"></div>
                                    <span className="text-xs font-bold tracking-widest text-gray-500">{yearBlock.total} 篇</span>
                                </div>
                                <div className="mt-6 space-y-8">
                                    {yearBlock.months.map((monthBlock, monthIdx) => (
                                        <div
                                            key={`${yearBlock.year}-${monthIdx}`}
                                            id={monthBlock.anchorId || undefined}
                                            style={{ scrollMarginTop: archiveScrollMargin }}
                                            className="relative pl-6 border-l-4 border-black/40"
                                        >
                                            <span className="absolute -left-3 top-2 w-5 h-5 rounded-full border-2 border-black bg-[#FFD700]"></span>
                                            <div className="flex items-baseline justify-between flex-wrap gap-4">
                                                <div>
                                                    <p className="text-lg font-black">{monthBlock.label}</p>
                                                    <p className="text-xs font-bold text-gray-500">{monthBlock.posts.length} 篇</p>
                                                </div>
                                            </div>
                                            <div className="mt-4 space-y-3">
                                                {monthBlock.posts.map(({ post, displayDate }) => {
                                                    const tags = Array.isArray(post.tags)
                                                        ? post.tags.map((tag) => (typeof tag === 'string' ? tag : tag?.name || tag?.label)).filter(Boolean)
                                                        : [];
                                                    const parentCategory = post.parentCategory || post?.summary?.parentCategory || '';
                                                    const subCategory = post.category || post?.summary?.category || '';
                                                    const category = subCategory || parentCategory || '未分类';
                                                    const views = post.views ?? post.viewsCount ?? 0;
                                                    const comments = post.comments ?? post.commentsCount ?? 0;
                                                    return (
                                                        <button
                                                            key={`archive-${post.id || displayDate}`}
                                                            onClick={() => handleArticleClick(post.id)}
                                                            className={`w-full text-left border-2 border-black rounded-2xl px-4 py-3 flex flex-col gap-2 hover:-translate-y-1 transition-transform shadow-[4px_4px_0px_0px_#000] ${cardBg}`}
                                                        >
                                                            <div className="flex items-center justify-between gap-3">
                                                                <p className="text-xl font-black flex-1">{post.title}</p>
                                                                <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                                                                    <Clock size={14} />
                                                                    <span>{displayDate}</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                                                                {parentCategory && (
                                                                    <span className="px-2 py-1 border-2 border-black rounded-full bg-white text-black inline-flex items-center gap-1 shadow-[2px_2px_0px_0px_#000]">
                                                                        <FolderPlus size={12} />
                                                                        <span>{parentCategory}</span>
                                                                    </span>
                                                                )}
                                                                {parentCategory && subCategory && (
                                                                    <ChevronRight size={12} className="text-gray-500" />
                                                                )}
                                                                {subCategory && (
                                                                    <span className="px-2 py-1 border-2 border-black rounded-full bg-[#F3F4F6] text-black inline-flex items-center gap-1 shadow-[2px_2px_0px_0px_#000]">
                                                                        <span>{subCategory}</span>
                                                                    </span>
                                                                )}
                                                                {!parentCategory && !subCategory && (
                                                                    <span className="px-2 py-1 border-2 border-black rounded-full bg-[#FFF5C0] text-black">
                                                                        {category}
                                                                    </span>
                                                                )}
                                                                <div className="flex flex-wrap gap-2 ml-auto">
                                                                    {tags.slice(0, 4).map((tag) => (
                                                                        <span key={`${post.id}-${tag}`} className="px-2 py-1 border-2 border-black rounded-full bg-[#FFF5C0] text-black">
                                                                            {tag}
                                                                        </span>
                                                                    ))}
                                                                    {tags.length > 4 && (
                                                                        <span className="px-2 py-1 border-2 border-black rounded-full bg-[#FFF5C0] text-black">+{tags.length - 4}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center justify-between text-xs font-mono text-gray-500">
                                                                <span>阅读 {views}</span>
                                                                <span>评论 {comments}</span>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    {monthShortcuts.length > 0 && (
                        <aside className="w-full lg:w-64">
                            <div
                                className={`${cardBg} border-2 ${borderColor} rounded-2xl p-5 shadow-[6px_6px_0px_0px_#000] sticky`}
                                style={{ top: quickJumpTop, marginTop: quickDockTop }}
                            >
                                <p className="text-sm font-black mb-4">快速跳转</p>
                                <div className="space-y-2 max-h-[70vh] overflow-auto pr-1">
                                    {monthShortcuts.map((shortcut) => (
                                        <button
                                            key={shortcut.id}
                                            onClick={() => handleMonthJump(shortcut.id)}
                                            className={`w-full text-left text-xs font-black tracking-wide border-2 border-black rounded-xl px-3 py-2 transition-all duration-200 hover:shadow-[4px_4px_0px_0px_#000] ${quickJumpBtn}`}
                                        >
                                            {shortcut.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </aside>
                    )}
                </div>
            </div>
        </section>
    );
};

function AboutView({ about, isDarkMode, onReload, onEdit, isSuperAdmin }) {
    const surface = isDarkMode ? THEME.colors.surfaceDark : THEME.colors.surfaceLight;
    const text = isDarkMode ? 'text-gray-100' : 'text-gray-900';
    const cardBorder = 'border-black';
    const [aboutPreview, setAboutPreview] = useState(null);
    const inlineCodeBg = isDarkMode ? 'bg-gray-800 text-pink-200' : 'bg-gray-100 text-pink-600';

    const CodeBlockWithCopy = ({ textContent, className }) => {
        const [copied, setCopied] = useState(false);
        const langMatch = typeof className === 'string' ? className.match(/language-([a-zA-Z0-9]+)/) : null;
        const langLabel = langMatch && langMatch[1] ? langMatch[1].toUpperCase() : 'CODE';

        const handleCopy = useCallback(() => {
            if (!textContent) return;
            navigator.clipboard?.writeText(textContent).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1600);
            }).catch(() => setCopied(false));
        }, [textContent]);

        return (
            <div
                className={`not-prose my-6 rounded-2xl border-2 border-black overflow-hidden shadow-[6px_6px_0px_0px_#000] ${isDarkMode ? 'border-gray-600' : ''}`}>
                <div
                    className={`flex items-center gap-2 px-4 py-2 border-b-2 border-black ${isDarkMode ? 'bg-[#0B1221] text-gray-200 border-gray-700' : 'bg-gray-100 text-gray-600'}`}>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-[#FF5F56] border border-black/10"></div>
                        <div className="w-4 h-4 rounded-full bg-[#FFBD2E] border border-black/10"></div>
                        <div className="w-4 h-4 rounded-full bg-[#27C93F] border border-black/10"></div>
                        <span className="ml-2 text-[10px] font-black tracking-[0.2em]">{langLabel}</span>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        {copied && (
                            <span className="text-[10px] font-black text-emerald-400">已复制</span>
                        )}
                        <button
                            type="button"
                            onClick={handleCopy}
                            className={`px-2 py-1 text-[11px] font-black border-2 border-black rounded-full inline-flex items-center gap-1 transition-transform hover:-translate-y-0.5 ${isDarkMode ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-white text-black hover:bg-gray-100'}`}
                            aria-label="复制代码"
                        >
                            <Copy size={14} /> 复制
                        </button>
                    </div>
                </div>
                <pre
                    className={`p-5 overflow-auto m-0 ${isDarkMode ? 'bg-[#0B1221] text-gray-100' : 'bg-white text-gray-900'}`}>
                    <code className={`${className || ''} !bg-transparent !p-0 !border-none font-mono text-sm`}>
                        {textContent}
                    </code>
                </pre>
            </div>
        );
    };

    const markdownComponents = useMemo(() => ({
        img: ({ src, alt, className = '', ...props }) => {
            const resolvedSrc = buildAssetUrl(src || '', src || '');
            return (
                <img
                    src={resolvedSrc}
                    alt={alt}
                    loading="lazy"
                    {...props}
                    className={`cursor-zoom-in max-w-full h-auto ${className}`.trim()}
                    onClick={() => setAboutPreview(resolvedSrc)}
                />
            );
        },
        code({ inline, className, children, ...props }) {
            const rawText = String(children);
            const textContent = rawText.replace(/\n$/, '');
            const hasLanguage = typeof className === 'string' && className.includes('language-');
            const isMultiline = textContent.includes('\n');
            const shouldInline = inline ?? (!hasLanguage && !isMultiline);
            if (shouldInline) {
                const backtickCount = (textContent.match(/`/g) || []).length;
                if (backtickCount > 0 && backtickCount % 2 === 0) {
                    const parts = textContent.split('`');
                    return (
                        <>
                            {parts.map((part, i) => {
                                if (i % 2 === 0) {
                                    return (
                                        <code
                                            key={i}
                                            className={`px-1 py-0.5 rounded font-mono text-sm ${inlineCodeBg}`}
                                            {...props}
                                        >
                                            {part}
                                        </code>
                                    );
                                }
                                return <span key={i}>{part}</span>;
                            })}
                        </>
                    );
                }
                return (
                    <code
                        className={`px-1 py-0.5 rounded font-mono text-sm ${inlineCodeBg}`}
                        {...props}
                    >
                        {textContent}
                    </code>
                );
            }
            return <CodeBlockWithCopy textContent={textContent} className={className} {...props} />;
        }
    }), [inlineCodeBg]);

    return (
        <section className="relative pt-28 pb-20 min-h-screen">
            <div className={`absolute inset-0 ${isDarkMode ? 'bg-gradient-to-b from-[#020617]/70 via-transparent to-[#020617]/70' : 'bg-gradient-to-b from-white/70 via-white/50 to-white/70'} backdrop-blur-[2px] pointer-events-none`} />
            <div className="relative max-w-5xl mx-auto px-4 space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-mono uppercase tracking-[0.2em] text-[#FF0080]">About</p>
                        <h1 className={`text-4xl md:text-5xl font-black leading-tight mt-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>关于本站</h1>
                        <p className={`text-sm mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>由超级管理员维护的单页介绍，访客与管理员均可阅读。</p>
                    </div>
                    <div className="flex gap-3">
                        {onReload && (
                            <button
                                onClick={onReload}
                                className={`px-4 py-2 border-2 border-black rounded-full text-sm font-bold shadow-[4px_4px_0px_0px_#000] ${isDarkMode ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-white text-black hover:bg-gray-100'}`}
                            >
                                刷新
                            </button>
                        )}
                        {isSuperAdmin && onEdit && (
                            <button
                                onClick={onEdit}
                                className="px-4 py-2 border-2 border-black rounded-full text-sm font-bold bg-[#FFD700] text-black shadow-[4px_4px_0px_0px_#000] hover:translate-y-[-2px] transition"
                            >
                                编辑关于
                            </button>
                        )}
                    </div>
                </div>

                <div className={`border-4 ${cardBorder} shadow-[10px_10px_0px_0px_#000] rounded-2xl p-6 md:p-10 ${surface} ${text}`}>
                    {about && about.contentMd ? (
                        <article className={`prose prose-xl max-w-none prose-headings:font-black prose-p:font-medium prose-code:before:content-none prose-code:after:content-none prose-pre:p-0 prose-pre:bg-transparent ${isDarkMode ? 'prose-invert' : ''}`}>
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm, remarkMath, remarkHighlight]}
                                rehypePlugins={[rehypeRaw, rehypeKatex]}
                                components={markdownComponents}
                            >
                                {about.contentMd}
                            </ReactMarkdown>
                        </article>
                    ) : (
                        <div className="text-center py-16 space-y-3">
                            <div className="text-2xl font-black">还没有“关于本站”内容</div>
                            <p className="text-sm text-gray-500">等待超级管理员添加或上传一份 Markdown 正文。</p>
                        </div>
                    )}

                    <div className="mt-6 text-xs text-gray-500 flex items-center justify-between">
                        <span>最后更新：{about?.updatedAt ? new Date(about.updatedAt).toLocaleString() : '暂无'}</span>
                        <span>维护人：{about?.updatedBy || '未记录'}</span>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {aboutPreview && (
                    <motion.div
                        className="fixed inset-0 z-[75] bg-black/80 flex items-center justify-center p-6"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setAboutPreview(null)}
                    >
                        <motion.img
                            src={aboutPreview}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="max-w-full max-h-full rounded-lg shadow-[10px_10px_0px_0px_#000] border-4 border-white cursor-zoom-out"
                            onClick={() => setAboutPreview(null)}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
}

const LoginView = ({ setView, setUser, isDarkMode, doLogin }) => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [captchaRequired, setCaptchaRequired] = useState(false);
    const [captchaImage, setCaptchaImage] = useState("");
    const [captchaInput, setCaptchaInput] = useState("");
    const [captchaLoading, setCaptchaLoading] = useState(false);
    const [captchaNextAllowedAt, setCaptchaNextAllowedAt] = useState(0);
    const [remainingAttempts, setRemainingAttempts] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const sanitizeAscii = (value) => {
        if (!value) return "";
        return [...value].filter((ch) => {
            const code = ch.charCodeAt(0);
            return code >= 32 && code <= 126; // 可打印 ASCII
        }).join("");
    };

    const loadCaptcha = async (force = false) => {
        const now = Date.now();
        if (now < captchaNextAllowedAt) {
            const waitSeconds = Math.ceil((captchaNextAllowedAt - now) / 1000);
            setError(`刷新过快，请${waitSeconds}秒后再试`);
            return;
        }
        // 前端也跟随后端 5s 防刷节奏，避免自动获取后立刻手动刷新导致被后端限流
        setCaptchaNextAllowedAt(now + 5000);
        setCaptchaLoading(true);
        try {
            const res = await fetchLoginCaptcha(force);
            const data = res.data || res;
            setCaptchaImage(data?.imageBase64 || "");
            setCaptchaRequired(true);
            if (typeof data?.remainingAttempts === 'number') {
                setRemainingAttempts(data.remainingAttempts);
            }
        } catch (err) {
            setError(err.message || "获取验证码失败");
            // 若非后端速率限制类错误，允许立刻重试
            if (!/(过于频繁|too frequent)/.test(err.message || "")) {
                setCaptchaNextAllowedAt(Date.now());
            }
        } finally {
            setCaptchaLoading(false);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        setRemainingAttempts(null);
        const nameLen = username.length;
        const passLen = password.length;
        if (nameLen < 3 || nameLen > 32) {
            setError("用户名长度需在 3-32 之间");
            return;
        }
        if (passLen < 6 || passLen > 64) {
            setError("密码长度需在 6-64 之间");
            return;
        }
        if (captchaRequired && captchaInput.length === 0) {
            setError("请输入验证码");
            return;
        }
        setLoading(true);
        try {
            if (doLogin) {
                const res = await doLogin(username, password, captchaRequired ? captchaInput : undefined);
                if (res?.user) setUser(res.user);
            } else {
                setUser(MOCK_USER);
            }
            setView('home');
            setCaptchaInput("");
            setCaptchaImage("");
            setCaptchaRequired(false);
            setRemainingAttempts(null);
        } catch (err) {
            setError(err.message || "\u767b\u5f55\u5931\u8d25");
            const needCaptcha = err.payload?.data?.captchaRequired;
            const remain = err.payload?.data?.remainingAttempts;
            if (typeof remain === 'number') {
                setRemainingAttempts(remain);
            }
            if (needCaptcha) {
                await loadCaptcha();
            }
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
                <h2 className="text-3xl font-black mb-6 text-center uppercase italic">系统登录</h2>
                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                        <label className="font-bold text-sm uppercase">用户名</label>
                        <input
                            className={`w-full border-2 border-black p-3 font-bold outline-none focus:shadow-[4px_4px_0px_0px_#FFD700] transition-shadow ${inputBg}`}
                            pattern="[ -~]*"
                            autoComplete="username"
                            value={username}
                            onChange={(e) => {
                                const safe = sanitizeAscii(e.target.value);
                                setUsername(safe);
                                if (safe !== e.target.value) setError("用户名仅支持英文、数字与常见符号。");
                            }}
                            placeholder="请输入用户名"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="font-bold text-sm uppercase">密码</label>
                        <div className="relative">
                            <input
                                className={`w-full border-2 border-black p-3 pr-16 font-bold outline-none focus:shadow-[4px_4px_0px_0px_#FFD700] transition-shadow ${inputBg}`}
                                type={showPassword ? "text" : "password"}
                                pattern="[ -~]*"
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => {
                                    const safe = sanitizeAscii(e.target.value);
                                    setPassword(safe);
                                    if (safe !== e.target.value) setError("密码仅支持英文、数字与常见符号。");
                                }}
                                placeholder="请输入密码"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                className={`absolute inset-y-0 right-3 my-auto h-9 w-10 inline-flex items-center justify-center border-2 active:translate-y-0.5 transition ${isDarkMode
                                    ? 'border-gray-300 bg-gray-800 text-gray-100 hover:bg-gray-700'
                                    : 'border-black bg-white text-black hover:bg-gray-100'}`}
                                aria-label={showPassword ? '隐藏密码' : '显示密码'}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                    {captchaRequired && (
                        <div className="space-y-2">
                            <label className="font-bold text-sm uppercase">验证码</label>
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    {captchaImage && (
                                        <img
                                            src={captchaImage}
                                            alt="captcha"
                                            className="h-14 w-32 border-2 border-black object-contain cursor-pointer select-none"
                                            onClick={() => loadCaptcha(true)}
                                            onError={() => {
                                                setCaptchaImage("");
                                                setError("验证码加载失败，请点击重新获取或稍后再试");
                                            }}
                                            title={captchaLoading ? '加载中…' : '点击刷新验证码'}
                                        />
                                    )}
                                    {!captchaImage && (
                                        <button
                                            type="button"
                                            onClick={() => loadCaptcha(true)}
                                            className={`px-3 py-2 border-2 border-dashed text-sm font-bold ${isDarkMode ? 'border-gray-200 bg-gray-800 text-gray-100' : 'border-black bg-white text-black'}`}
                                            disabled={captchaLoading}
                                        >
                                            {captchaLoading ? '加载中' : '获取验证码'}
                                        </button>
                                    )}
                                    {typeof remainingAttempts === 'number' && remainingAttempts > 0 && (
                                        <span className="text-xs font-bold text-red-600">
                                            剩余尝试：{remainingAttempts}
                                        </span>
                                    )}
                                    {typeof remainingAttempts === 'number' && remainingAttempts <= 0 && (
                                        <span className="text-xs font-bold text-amber-600">
                                            已触发验证码，请先完成图形验证
                                        </span>
                                    )}
                                </div>
                                <input
                                    className={`w-full border-2 border-black p-3 font-bold outline-none focus:shadow-[4px_4px_0px_0px_#FFD700] transition-shadow ${inputBg}`}
                                    autoComplete="one-time-code"
                                    value={captchaInput}
                                    onChange={(e) => setCaptchaInput(sanitizeAscii(e.target.value).slice(0, 4))}
                                    placeholder="请输入验证码"
                                />
                            </div>
                        </div>
                    )}
                    {error && <div
                        className="bg-red-500 text-white p-2 font-bold text-sm border-2 border-black">{error}</div>}
                    <div className="flex gap-4">
                        <PopButton
                            variant="primary"
                            className="flex-1 max-w-[160px] justify-center whitespace-nowrap px-4 py-2 text-sm"
                            disabled={loading}
                        >
                            {loading ? '登录中...' : '登录'}
                        </PopButton>
                        <PopButton
                            variant="ghost"
                            type="button"
                            onClick={() => setView('home')}
                            className="min-w-[90px] justify-center whitespace-nowrap px-4 py-2 text-sm"
                        >
                            取消
                        </PopButton>
                    </div>
                </form>
            </div>
        </div>
    );
};



































