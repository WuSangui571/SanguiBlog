import React, { useState, useEffect, useRef, useCallback, useMemo, useContext } from 'react';
import { Routes, Route, Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useBlog } from "./hooks/useBlogData";
import { fetchLoginCaptcha } from "./api";
import CommentsSection from "./components/comments/CommentsSection.jsx";
import PopButton from "./components/common/PopButton.jsx";
import { LayoutOffsetContext, useLayoutOffsets } from "./contexts/LayoutOffsetContext.jsx";
import { PermissionContext, usePermissionContext } from "./contexts/PermissionContext.jsx";
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
    adminFetchPageViewLogs,
    adminDeletePageViewLog,
    adminDeletePageViewLogs,
    adminDeleteMyAnalyticsLogs,
    adminFetchPermissionMatrix,
    adminUpdateRolePermissions,
    adminScanUnusedAssets,
    adminDeleteUnusedAssets,
    adminScanEmptyFolders,
    adminDeleteEmptyFolders,
    fetchGames,
    fetchGameDetail,
    adminFetchGames,
    adminCreateGame,
    adminUpdateGame,
    adminDeleteGame,
    adminFetchAbout,
    adminSaveAbout,
    fetchMyPermissions,
    fetchCategories,
    fetchPosts,
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
    updatePost
} from "./api";
import { buildAssetUrl } from "./utils/asset.js";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { visit } from 'unist-util-visit';
import {
    motion,
    AnimatePresence,
    useScroll,
    useTransform,
    useSpring,
    useMotionValue,
    useMotionTemplate,
    LayoutGroup as AnimateSharedLayout
} from 'framer-motion';
import AdminProfile from './pages/admin/Profile';
import {
    Code, User, MessageSquare, Share2, X, Menu, ChevronRight,
    Search, LogIn, LogOut, Settings, Eye, EyeOff, Github, Twitter,
    BarChart3, Filter, Tag, AlertTriangle, MessageCircle,
    Layers, Hash, Clock, FileText, Terminal, Zap, Sparkles,
    ArrowUpRight, Grid, List, Activity, ChevronLeft, Shield, Lock, Users,
    Home, TrendingUp, Edit, Send, Moon, Sun, Upload, ArrowUp, BookOpen, CheckCircle, PenTool, FolderPlus,
    RefreshCw, Plus, Trash2, Save, ImagePlus, ChevronsLeft, ChevronsRight
} from 'lucide-react';

const THEME_COLOR_PRESETS = [
    'bg-[#00E096]',
    'bg-[#6366F1]',
    'bg-[#FF0080]',
    'bg-[#FFD700]',
    'bg-[#0EA5E9]',
    'bg-[#F97316]'
];
const DEFAULT_THEME_COLOR = 'bg-[#6366F1]';
const HERO_NOISE_TEXTURE = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPScxMjAnIGhlaWdodD0nMTIwJyB2aWV3Qm94PScwIDAgMTIwIDEyMCc+PGZpbHRlciBpZD0nbicgeD0nMCcgeT0nMCc+PGZlVHVyYnVsZW5jZSB0eXBlPSdmcmFjdGFsTm9pc2UnIGJhc2VGcmVxdWVuY3k9JzAuOCcgbnVtT2N0YXZlcz0nMycgc3RpdGNoVGlsZXM9J3N0aXRjaCcvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPScxMjAnIGhlaWdodD0nMTIwJyBmaWx0ZXI9J3VybCgjbiknIG9wYWNpdHk9JzAuNCcvPjwvc3ZnPg==";
const DEFAULT_AVATAR = 'https://api.dicebear.com/7.x/identicon/svg?seed=sanguiblog';
const randomBlobShape = () => {
    const rand = () => `${30 + Math.round(Math.random() * 40)}%`;
    return `${rand()} ${rand()} ${rand()} ${rand()} / ${rand()} ${rand()} ${rand()} ${rand()}`;
};
const randomAngle = () => Math.round(Math.random() * 360);
const randomSprayPolygon = () => {
    const count = 8 + Math.floor(Math.random() * 4);
    const points = [];
    for (let i = 0; i < count; i += 1) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() * 0.35);
        const radius = 35 + Math.random() * 25;
        const x = 50 + radius * Math.cos(angle);
        const y = 50 + radius * Math.sin(angle);
        points.push(`${Math.min(100, Math.max(0, x)).toFixed(1)}% ${Math.min(100, Math.max(0, y)).toFixed(1)}%`);
    }
    return `polygon(${points.join(',')})`;
};
const createTendrils = (toDark) => {
    if (!toDark) return [];
    const palette = ['rgba(255,215,0,0.65)', 'rgba(99,102,241,0.45)', 'rgba(245,56,136,0.5)'];
    const count = 2 + Math.floor(Math.random() * 2);
    return Array.from({ length: count }, () => ({
        angle: Math.random() * 360,
        length: 0.4 + Math.random() * 0.3,
        width: 10 + Math.random() * 10,
        delay: Math.random() * 0.1,
        color: palette[Math.floor(Math.random() * palette.length)]
    }));
};

const countImagesInContent = (content = "") => {
    if (!content) return 0;
    const matches = content.match(/!\[[^\]]*]\([^)]+\)/g);
    return matches ? matches.length : 0;
};

// 通用工具：格式化文件大小（bytes -> 人类可读）
const formatSize = (bytes) => {
    const value = Number(bytes || 0);
    if (value <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const idx = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
    return `${(value / (1024 ** idx)).toFixed(idx === 0 ? 0 : 2)} ${units[idx]}`;
};


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

const extractHexFromBgClass = (value = '', fallback = '#6366F1') => {
    if (typeof value !== 'string') return fallback;
    const match = value.match(/#([0-9a-fA-F]{6})/);
    return match ? `#${match[1].toUpperCase()}` : fallback;
};

const formatBgClassFromHex = (hex) => {
    if (!hex) return DEFAULT_THEME_COLOR;
    const normalized = hex.startsWith('#') ? hex.toUpperCase() : `#${hex.toUpperCase()}`;
    return `bg-[${normalized}]`;
};

const ThemeColorSelector = ({ value, onChange, inputClass, isDarkMode }) => {
    const selectedHex = useMemo(() => extractHexFromBgClass(value, '#6366F1'), [value]);

    return (
        <div className="space-y-3">
            <label
                className={`text-sm font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>主题色（可选）</label>
            <input
                className={inputClass}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="bg-[#FF0080]"
            />
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                    <input
                        type="color"
                        value={selectedHex}
                        onChange={(e) => onChange(formatBgClassFromHex(e.target.value))}
                        className="w-12 h-12 border-2 border-black rounded cursor-pointer"
                        title="自定义颜色"
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400">色盘会自动转换为 bg-[#HEX] 形式</span>
                </div>
            </div>
            <div className="flex flex-wrap gap-2">
                {THEME_COLOR_PRESETS.map((preset) => {
                    const presetHex = extractHexFromBgClass(preset);
                    const isActive = preset === value;
                    return (
                        <button
                            type="button"
                            key={preset}
                            aria-label={`选择颜色 ${presetHex}`}
                            onClick={() => onChange(preset)}
                            className={`w-10 h-10 rounded-full border-2 ${isActive ? 'border-black scale-110' : 'border-transparent'} shadow-[2px_2px_0px_0px_#000] transition-transform`}
                            style={{ backgroundColor: presetHex }}
                        />
                    );
                })}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">示例：bg-[#FF0080]；也可直接填写 Tailwind
                自定义类。</p>
        </div>
    );
};

const useTimedNotice = (duration = 4000) => {
    const [notice, setNotice] = useState({ visible: false, message: '', tone: 'success' });
    const timerRef = useRef(null);

    const showNotice = useCallback((message, tone = 'success') => {
        if (!message) return;
        setNotice({ visible: true, message, tone });
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => {
            setNotice((prev) => ({ ...prev, visible: false }));
        }, duration);
    }, [duration]);

    const hideNotice = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        setNotice((prev) => ({ ...prev, visible: false }));
    }, []);

    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    return { notice, showNotice, hideNotice };
};

const AdminNoticeBar = ({ notice, onClose }) => {
    const { headerHeight } = useLayoutOffsets();
    if (!notice?.visible || !notice?.message) return null;
    const tone = notice.tone === 'error' ? 'error' : 'success';
    const toneStyles = tone === 'error'
        ? 'bg-rose-50 border-rose-200 text-rose-700 shadow-[0_20px_45px_rgba(244,63,94,0.35)]'
        : 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-[0_20px_45px_rgba(16,185,129,0.35)]';
    const Icon = tone === 'error' ? AlertTriangle : CheckCircle;
    const safeTop = headerHeight + 16;

    return (
        <div
            className="fixed right-8 z-50 w-[min(360px,calc(100vw-32px))] transition-all duration-300"
            style={{ top: safeTop }}
        >
            <div className={`flex items-start gap-3 rounded-2xl border px-5 py-4 ${toneStyles}`}>
                <Icon size={20} />
                <div className="flex-1">
                    <p className="font-semibold text-sm leading-5">{notice.message}</p>
                    <p className="text-xs opacity-80 mt-1">提示栏会在 4 秒后自动收起。</p>
                </div>
                <button
                    type="button"
                    aria-label="关闭提示"
                    onClick={onClose}
                    className="text-xs text-current/70 hover:text-current transition-colors"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
};

// ... (keep existing code until CommentsSection)

const escapeHtml = (value = "") =>
    value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

const remarkHighlight = () => (tree) => {
    visit(tree, 'text', (node, index, parent) => {
        if (!parent || typeof node.value !== 'string') return;
        if (!node.value.includes('==')) return;
        const regex = /==([^=]+)==/g;
        const newNodes = [];
        let lastIndex = 0;
        let match;
        while ((match = regex.exec(node.value)) !== null) {
            if (match.index > lastIndex) {
                newNodes.push({
                    type: 'text',
                    value: node.value.slice(lastIndex, match.index),
                });
            }
            newNodes.push({
                type: 'html',
                value: `<mark>${escapeHtml(match[1])}</mark>`,
            });
            lastIndex = match.index + match[0].length;
        }
        if (!newNodes.length) return;
        if (lastIndex < node.value.length) {
            newNodes.push({
                type: 'text',
                value: node.value.slice(lastIndex),
            });
        }
        parent.children.splice(index, 1, ...newNodes);
        return [visit.SKIP, index + newNodes.length];
    });
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

    // The backend returns a PostDetailDto which contains a 'summary' field (PostSummaryDto).
    // We should prioritize using 'summary' as the source of post metadata.
    const postSource = summary || MOCK_POSTS.find(p => p.id === id) || MOCK_POSTS[0];

    const siteAuthorAvatar = siteMeta?.author?.avatar || siteMeta?.author?.avatarUrl;

    const post = {
        ...postSource,
        // Ensure fallback for fields that might be missing or named differently in Mock vs API
        authorName: postSource.authorName || postSource.author || 'Unknown',
        authorAvatar: postSource.authorAvatar || siteAuthorAvatar || postSource.avatar,
        // PostSummaryDto does not have 'authorTitle', so we default it.
        // If needed, we would need to update the backend DTO.
        authorTitle: postSource.authorTitle || '博主',
        date: postSource.date || (postSource.publishedAt ? new Date(postSource.publishedAt).toLocaleDateString() : 'Recently'),
        views: postSource.views || postSource.viewsCount || 0,
        color: postSource.color || postSource.themeColor || 'shadow-[8px_8px_0px_0px_#000]',
    };

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
    const codeBlockBg = isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900';
    const inlineCodeBg = isDarkMode ? 'bg-gray-800 text-pink-200' : 'bg-gray-100 text-pink-600';
    const proseClass = `prose prose-xl prose-headings:font-black prose-p:font-medium max-w-none prose-code:before:content-none prose-code:after:content-none ${isDarkMode ? 'prose-invert' : ''}`;
    const shouldRenderMarkdown = Boolean(contentMd && contentMd.trim());

    const headingSluggerRef = useRef({});
    headingSluggerRef.current = {};

    const extractText = (children) => {
        if (typeof children === 'string' || typeof children === 'number') return String(children);
        if (Array.isArray(children)) return children.map(extractText).join('');
        if (children && typeof children === 'object' && 'props' in children) {
            return extractText(children.props.children);
        }
        return '';
    };

    const slugifyHeading = (text) => {
        const base = (text || '').trim();
        if (!base) return 'heading';
        const sanitized = base.replace(/[^A-Za-z0-9\u4e00-\u9fa5\s-]/g, '');
        const hyphenated = sanitized.replace(/\s+/g, '-').toLowerCase();
        return hyphenated || base;
    };

    const createHeading = (Tag) => ({ children, ...props }) => {
        const rawText = extractText(children);
        const baseSlug = slugifyHeading(rawText);
        const count = headingSluggerRef.current[baseSlug] || 0;
        const nextCount = count + 1;
        headingSluggerRef.current[baseSlug] = nextCount;
        const finalSlug = count === 0 ? baseSlug : `${baseSlug}-${nextCount}`;
        return <Tag id={finalSlug} {...props}>{children}</Tag>;
    };

    const handleAnchorClick = (event, href) => {
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
    };

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
            return (
                <div
                    className={`not-prose my-6 rounded-2xl border-2 border-black overflow-hidden shadow-[6px_6px_0px_0px_#000] ${isDarkMode ? 'border-gray-600' : ''}`}>
                        <div
                            className={`flex items-center gap-2 px-4 py-2 border-b-2 border-black ${isDarkMode ? 'bg-[#0B1221] text-gray-200 border-gray-700' : 'bg-gray-100 text-gray-600'}`}>
                        <div className="w-4 h-4 rounded-full bg-[#FF5F56] border border-black/10"></div>
                        <div className="w-4 h-4 rounded-full bg-[#FFBD2E] border border-black/10"></div>
                        <div className="w-4 h-4 rounded-full bg-[#27C93F] border border-black/10"></div>
                        <span className="ml-2 text-[10px] font-black tracking-[0.2em]">CODE</span>
                        </div>
                    <pre
                        className={`p-5 overflow-auto m-0 ${isDarkMode ? 'bg-[#0B1221] text-gray-100' : 'bg-white text-gray-900'}`}>
                        <code className={`${className} !bg-transparent !p-0 !border-none font-mono text-sm`} {...props}>
                            {textContent}
                        </code>
                    </pre>
                </div>
            );
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
    }), [handleImagePreview, inlineCodeBg, isDarkMode, resolveAssetPath]);

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
                className="fixed left-0 right-0 z-50 pointer-events-none"
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
                        className={`flex items-center justify-between p-4 border-2 border-black mb-12 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
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

                        <button
                            onClick={handleShare}
                            className={`p-2 border-2 border-black shadow-[4px_4px_0px_0px_#000] transition-all hover:shadow-[2px_2px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-white text-black'}`}
                            title="复制链接"
                        >
                            <Share2 size={20} />
                        </button>
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

// --- 1. 设计系统 & 基础数据 ---
const THEME = {
    colors: {
        bgLight: "bg-[#F0F0F0]",
        surfaceLight: "bg-white",
        bgDark: "bg-[#111827]",
        surfaceDark: "bg-[#1f2937]",
        primary: "bg-[#6366F1]",
        secondary: "bg-[#FFD700]",
        accent: "bg-[#FF0080]",
        dark: "bg-[#1A1A1A]",
        border: "border-2 border-black",
    },
};

// 角色定义
const ROLES = {
    SUPER_ADMIN: { label: "超级管理员", color: "bg-[#FF0080]" },
    ADMIN: { label: "管理员", color: "bg-[#6366F1]" },
    USER: { label: "用户", color: "bg-[#00E096]" }
};

const CATEGORY_TREE = [
    { id: "all", label: "全部", children: [] },
    {
        id: "programming",
        label: "硬核编程",
        children: [{ id: "java", label: "Java Core" }, { id: "frontend", label: "Modern Web" }, {
            id: "algo",
            label: "算法进阶"
        }]
    },
    {
        id: "architecture",
        label: "架构视角",
        children: [{ id: "cloud", label: "云原生" }, { id: "system", label: "分布式系统" }]
    },
    { id: "life", label: "数字生活", children: [{ id: "gear", label: "装备控" }, { id: "think", label: "碎碎念" }] }
];

const SITE_STATS = {
    posts: 71,
    comments: 24,
    categories: 11,
    tags: 43,
    views: 1643,
    lastUpdated: "2025/11/17",
    lastUpdatedFull: "2025-11-17 00:00:00"
};

const MOCK_USER = {
    id: 1,
    username: "三桂 SanGui",
    title: "Fullstack Developer",
    bio: "用代码构建现实，用逻辑解构虚无。",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=SanGui&backgroundColor=FFD700",
    role: "SUPER_ADMIN",
    social: {
        github: "https://github.com/Wusangui571",
        wechatQr: "/contact/wechat.jpg"
    }
};

const GENERATE_POSTS = () => {
    const base = [
        {
            id: 101,
            title: "SpringBoot 3.0: 原生编译的终极奥义",
            excerpt: "GraalVM AOT.",
            category: "Java Core",
            parentCategory: "硬核编程",
            tags: ["Java", "AOT"],
            color: "bg-[#6366F1]",
            likes: 128,
            comments: 45,
            date: "2023-11-24",
            views: 532
        },
        {
            id: 102,
            title: "Vue3 Composition API: 逻辑复用的艺术",
            excerpt: "告别 Options API 的面条代码。",
            category: "Modern Web",
            parentCategory: "硬核编程",
            tags: ["Vue3", "Refactor"],
            color: "bg-[#FF0080]",
            likes: 89,
            comments: 12,
            date: "2023-11-20",
            views: 321
        },
        {
            id: 103,
            title: "微服务的一致性困局：Saga 还是 TCC？",
            excerpt: "分布式事务没有银弹。",
            category: "Distributed Sys",
            parentCategory: "架构视角",
            tags: ["Microservices", "System Design"],
            color: "bg-[#00E096]",
            likes: 256,
            comments: 67,
            date: "2023-11-15",
            views: 890
        }
    ];

    let posts = [...base];
    for (let i = 0; i < 15; i++) {
        posts.push({
            ...base[i % 3],
            id: 200 + i,
            title: `${base[i % 3].title} (Part ${i + 1})`,
            date: `2023-10-${10 + i}`
        });
    }
    return posts;
};

const MOCK_POSTS = GENERATE_POSTS();
const DEFAULT_PAGE_SIZE = 5;
const PAGE_SIZE_OPTIONS = [5, 10, 20];
const PAGE_SIZE_STORAGE_KEY = 'sangui_home_page_size';
const DEFAULT_HERO_TAGLINE = '拒绝平庸，在 SpringBoot 与 React 的边缘狂试探。';
const DEFAULT_HOME_QUOTE = '阻挡你的不是别人，而是你自己。';
const TAG_PREVIEW_COUNT = 9;
const SPIN_WARNINGS = [
    '慢点慢点，我的小脑壳有点晕～',
    '转速太快啦，给我缓口气！',
    '呀！眩晕警报，请手下留情。',
    '别急别急，灵感也需要休息。'
];
const SPIN_INTERVAL_MS = 350;
const SPIN_WARN_THRESHOLD = 4;
const MEGA_SPIN_THRESHOLD = 10;
const SPIN_LOCK_DURATION = 60000;
const MEGA_SPIN_DURATION = 4200;
const THEME_SPREE_THRESHOLD = 6;
const THEME_SPREE_INTERVAL = 450;
const THEME_SPREE_DURATION = 15000;
const THEME_SPREE_PALETTES = [
    ['#FF0080', '#FFD700', '#0EA5E9'],
    ['#22D3EE', '#7C3AED', '#F472B6'],
    ['#F97316', '#FACC15', '#16A34A']
];
const THEME_LOCK_DURATION = 60000;
const ARCHIVE_MONTH_LABELS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

const AnalyticsSummaryContext = React.createContext({
    summary: null,
    loading: false,
    error: '',
    rangeDays: 7,
    reload: () => {
    }
});

const useAdminAnalytics = () => useContext(AnalyticsSummaryContext);
const PermissionNotice = ({ title = '权限不足', description = '请联系超级管理员分配权限' }) => (
    <div
        className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-10 text-center space-y-3 bg-white/60 dark:bg-gray-900/40">
        <Lock size={32} className="mx-auto text-gray-400" />
        <h3 className="text-xl font-black">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-6">{description}</p>
    </div>
);

const getReferrerMeta = () => {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
        return { referrer: '', sourceLabel: '直接访问' };
    }
    const referrer = document.referrer || '';
    if (!referrer) {
        return { referrer: '', sourceLabel: '直接访问' };
    }
    try {
        const parsed = new URL(referrer);
        const currentOrigin = window.location.origin;
        if (currentOrigin && parsed.origin === currentOrigin) {
            const path = parsed.pathname || '/';
            if (path === '/' || path === '') {
                return { referrer, sourceLabel: '来自首页' };
            }
            if (path.startsWith('/admin')) {
                return { referrer, sourceLabel: '来自后台页面' };
            }
            if (path.startsWith('/archive')) {
                return { referrer, sourceLabel: '来自归档页' };
            }
            if (path.startsWith('/posts') || path.startsWith('/article')) {
                return { referrer, sourceLabel: '来自站内文章' };
            }
            return { referrer, sourceLabel: `来自站内：${path}` };
        }
        return { referrer, sourceLabel: `外部链接：${parsed.hostname}` };
    } catch (err) {
        return { referrer, sourceLabel: '直接访问' };
    }
};

const getGeoHint = () => {
    if (typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function') {
        try {
            const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            if (zone) return zone;
        } catch (e) {
            return '';
        }
    }
    return '';
};

const AUTO_PAGE_VIEW_GUARD = {
    lastKey: ''
};

const claimAutoPageView = (key) => {
    if (!key) {
        return false;
    }
    if (AUTO_PAGE_VIEW_GUARD.lastKey === key) {
        return false;
    }
    AUTO_PAGE_VIEW_GUARD.lastKey = key;
    return true;
};

const resetAutoPageViewGuard = () => {
    AUTO_PAGE_VIEW_GUARD.lastKey = '';
};


// --- 2. 炫酷 UI 组件库 (不变) ---

const TiltCard = ({ children, className = "", onClick }) => {
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
    { key: 'games', label: '游戏' },
    { key: 'about', label: '关于' }
];

const Navigation = ({
    user,
    setView,
    currentView,
    handleLogout,
    toggleMenu,
    isDarkMode,
    onToggleTheme,
    onProfileClick,
    backgroundEnabled = true,
    onToggleBackground,
    themeLockActive = false,
    pageSize,
    onPageSizeChange,
    pageSizeOptions = PAGE_SIZE_OPTIONS
}) => {
    const roleInfo = user ? ROLES[user.role] : null;
    const activeView = currentView === 'game' ? 'games' : (currentView || 'home');
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [logoClicks, setLogoClicks] = useState(0);
    const [devUnlocked, setDevUnlocked] = useState(false);
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
    }, [setView, scrollNavToTop]);

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
        if (!settingsOpen || typeof document === 'undefined') return undefined;
        const original = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = original;
        };
    }, [settingsOpen]);

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

                {user ? (
                    <div className="flex items-center gap-4 pl-6 border-l-4 border-black h-12">
                        <div className="flex items-center gap-2 cursor-pointer"
                            onClick={onProfileClick || (() => setView('admin'))}>
                            <div className="w-10 h-10 border-2 border-black overflow-hidden rounded-full bg-[#FFD700]">
                                <img
                                    src={buildAssetUrl(user.avatar || user.avatarUrl, DEFAULT_AVATAR)}
                                    className="w-full h-full object-cover" />
                            </div>
                            <div className="flex flex-col items-start">
                                <span className="font-black text-sm leading-none">{user.username}</span>
                                <span className={`text-[10px] ${roleInfo?.color} text-white px-1 w-max mt-1 font-bold`}>
                                    {roleInfo?.label || "USER"}
                                </span>
                            </div>
                        </div>
                        <button onClick={handleLogout} className="p-2 hover:text-[#F97316] transition-colors"><LogOut
                            size={20} /></button>
                    </div>
                ) : (
                    <PopButton onClick={() => setView('login')} icon={LogIn}>前往登录</PopButton>
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

            <button
                className="md:hidden p-2 border-2 border-black bg-[#FFD700] shadow-[4px_4px_0px_0px_#000] active:translate-y-1 active:shadow-none"
                onClick={toggleMenu}>
                <Menu size={24} />
            </button>
        </motion.nav>

        <AnimatePresence>
            {settingsOpen && (
                <motion.div
                    className="fixed inset-0 z-[70] flex items-start justify-end p-4 md:p-8 bg-black/40 backdrop-blur-[2px]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setSettingsOpen(false)}
                >
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.98 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        className={`w-full max-w-md border-4 border-black shadow-[10px_10px_0px_0px_#000] rounded-2xl ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}`}
                    >
                        <div className="flex items-center justify-between px-5 py-4 border-b-2 border-black bg-gradient-to-r from-[#FFD700]/60 via-white to-transparent">
                            <div className="flex items-center gap-2 font-black text-lg">
                                <Settings size={20} />
                                <span>系统设定</span>
                            </div>
                            <button
                                onClick={() => setSettingsOpen(false)}
                                className={`p-2 border-2 border-black rounded-full ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
                                aria-label="关闭设定"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            <div className={`flex items-center justify-between gap-4 p-4 border-2 border-black rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                                <div className="space-y-1">
                                    <div className="font-bold text-sm">彩蛋背景</div>
                                    <div className="text-xs text-gray-500">显示/隐藏太阳与月亮动效</div>
                                </div>
                                <button
                                    onClick={() => onToggleBackground && onToggleBackground()}
                                    className={`relative w-16 h-9 border-2 border-black rounded-full transition-colors ${backgroundEnabled ? 'bg-[#FFE066]' : (isDarkMode ? 'bg-gray-700' : 'bg-gray-200')}`}
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

                            <div className={`flex items-center justify-between gap-4 p-4 border-2 border-black rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                                <div className="space-y-1">
                                    <div className="font-bold text-sm">首页每页文章数</div>
                                    <div className="text-xs text-gray-500">默认 5 条，可选 10 / 20。</div>
                                </div>
                                <select
                                    value={pageSize}
                                    onChange={(e) => handlePageSizeSelect(Number(e.target.value))}
                                    className={`w-28 p-2 border-2 border-black rounded-lg font-black text-sm shadow-[3px_3px_0px_0px_#000] ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}`}
                                >
                                    {pageSizeOptions.map((opt) => (
                                        <option key={opt} value={opt}>{opt} 条/页</option>
                                    ))}
                                </select>
                            </div>

                            <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                系统设定存储在本地浏览器。
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    </>
    );
};
// ... (Hero, StatsStrip, ArticleList, CommentsSection, ArticleDetail, LoginView components are kept unchanged in functionality, but are wrapped in the main App with the dark mode context.)
const Hero = ({ setView, isDarkMode, onStartReading, version, tagline }) => {
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
                    <motion.span initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
                        className="block">
                        用代码记录<span
                            className="text-[#6366F1] underline decoration-8 decoration-black underline-offset-8 ml-4">探索</span>
                    </motion.span>
                    <motion.span initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
                        className="block">
                        以分享照亮<span
                            className="text-[#0EA5E9] bg-[#FFD700] px-2 ml-2 border-4 border-black skew-x-[-10deg] inline-block shadow-[6px_6px_0px_0px_#000]">成长</span>
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

// --- 4. 后台管理组件 (Admin Panel) ---

// 4.1 Sub-Component: Dashboard View
const DashboardView = ({ isDarkMode }) => {
    const { summary, loading, error, reload, rangeDays } = useAdminAnalytics();
    const overview = summary?.overview;
    const rawDailyTrends = summary?.dailyTrends || [];
    const trafficSources = summary?.trafficSources || [];
    const normalizedRange = rangeDays === 0 ? -1 : (rangeDays || 7);
    const trendRangeDays = normalizedRange === -1 ? 30 : Math.max(7, Math.min(normalizedRange, 60));
    const rangeLabel = overview?.rangeLabel || (normalizedRange === -1 ? "全部历史" : `最近${normalizedRange}天`);
    const surface = isDarkMode ? THEME.colors.surfaceDark : THEME.colors.surfaceLight;
    const border = isDarkMode ? "border border-gray-700" : "border border-gray-200";
    const textPrimary = isDarkMode ? "text-gray-100" : "text-gray-900";
    const textMuted = isDarkMode ? "text-gray-400" : "text-gray-500";
    const rangeOptions = [
        { label: "7天", value: 7 },
        { label: "14天", value: 14 },
        { label: "30天", value: 30 },
        { label: "全部", value: -1 },
    ];

    const [aggregatedTrends, setAggregatedTrends] = useState([]);
    const [aggregatedLoading, setAggregatedLoading] = useState(false);
    const [aggregatedError, setAggregatedError] = useState('');

    useEffect(() => {
        let cancelled = false;
        const loadAggregated = async () => {
            setAggregatedLoading(true);
            setAggregatedError('');
            try {
                // 拉取足够覆盖 60 天的访问日志
                const res = await adminFetchPageViewLogs({ page: 1, size: 1500 });
                const data = res.data || res;
                const records = data.records || [];
                const today = new Date();
                const start = new Date(today);
                start.setDate(today.getDate() - (trendRangeDays - 1));

                const byDate = new Map();
                records.forEach((item) => {
                    const dateStr = (item.time || item.viewedAt || item.viewed_at || '').slice(0, 10);
                    if (!dateStr) return;
                    const dateObj = new Date(dateStr);
                    if (Number.isNaN(dateObj.getTime()) || dateObj < start) return;

                    const key = dateStr;
                    const ip = item.ip || item.viewerIp || item.viewer_ip || '';
                    const userId = item.userId ?? item.user_id ?? null;
                    const identity = userId ? `U#${userId}` : (ip ? `G#${ip}` : `G#${item.id || dateStr}`);

                    const current = byDate.get(key) || { views: 0, visitors: new Set() };
                    current.views += 1;
                    current.visitors.add(identity);
                    byDate.set(key, current);
                });

                const result = [];
                for (let i = 0; i < trendRangeDays; i += 1) {
                    const d = new Date(start);
                    d.setDate(start.getDate() + i);
                    const key = d.toISOString().slice(0, 10);
                    const entry = byDate.get(key);
                    result.push({
                        date: key,
                        views: entry ? entry.views : 0,
                        visitors: entry ? entry.visitors.size : 0
                    });
                }
                if (!cancelled) setAggregatedTrends(result);
            } catch (e) {
                if (!cancelled) setAggregatedError(e.message || '访问日志聚合失败');
            } finally {
                if (!cancelled) setAggregatedLoading(false);
            }
        };
        loadAggregated();
        return () => { cancelled = true; };
    }, [trendRangeDays]);

    const trendFromApi = rawDailyTrends.slice(-trendRangeDays);
    const hasApiData = trendFromApi.some((d) => Number(d?.views || 0) > 0 || Number(d?.visitors || 0) > 0);
    const hasAggData = aggregatedTrends.some((d) => Number(d?.views || 0) > 0 || Number(d?.visitors || 0) > 0);
    const dailyTrends = hasAggData ? aggregatedTrends : trendFromApi;
    const isUsingAggregated = hasAggData;

    const formatNumber = (value, fallback = "--") => {
        if (typeof value === "number") return value.toLocaleString();
        return fallback;
    };

    const handleRangeClick = (value) => {
        if (value === normalizedRange) return;
        reload?.(value);
    };

    const StatCard = ({ title, value, desc, icon: Icon, accent }) => (
        <div className={`${surface} ${border} rounded-2xl p-5 shadow-lg relative overflow-hidden`}>
            <div className="flex items-center justify-between">
                <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${textMuted}`}>{title}</p>
                {Icon && (
                    <span className={`p-2 rounded-full ${accent}`}>
                        <Icon size={16} className="text-white" />
                    </span>
                )}
            </div>
            <div className="mt-3 text-3xl font-black">{value}</div>
            {desc && <p className={`text-xs mt-1 ${textMuted}`}>{desc}</p>}
        </div>
    );

    const metrics = [
        {
            title: "累计浏览",
            value: formatNumber(overview?.totalViews),
            desc: "posts.views_count 汇总",
            icon: Activity,
            accent: "bg-gradient-to-br from-indigo-500 to-purple-500",
        },
        {
            title: "评论总数",
            value: formatNumber(overview?.commentCount),
            desc: "posts.comments_count 汇总",
            icon: MessageSquare,
            accent: "bg-gradient-to-br from-rose-500 to-orange-400",
        },
        {
            title: "区间 PV",
            value: formatNumber(overview?.periodViews),
            desc: rangeLabel,
            icon: BarChart3,
            accent: "bg-gradient-to-br from-pink-500 to-amber-400",
        },
        {
            title: "区间 UV",
            value: formatNumber(overview?.uniqueVisitors),
            desc: "登录优先，再按 IP 去重",
            icon: Users,
            accent: "bg-gradient-to-br from-emerald-500 to-lime-500",
        },
        {
            title: "文章总数",
            value: formatNumber(overview?.postCount),
            desc: "仅统计已发布文章",
            icon: FileText,
            accent: "bg-gradient-to-br from-slate-500 to-slate-700",
        },
        {
            title: "评论总数（实时）",
            value: formatNumber(overview?.commentEntries),
            desc: "comments 表实时计数",
            icon: MessageCircle,
            accent: "bg-gradient-to-br from-sky-500 to-indigo-500",
        },
    ];

    const peakViews = dailyTrends.length ? Math.max(...dailyTrends.map((d) => d.views || 0)) : 0;
    const peakVisitors = dailyTrends.length ? Math.max(...dailyTrends.map((d) => d.visitors || 0)) : 0;
    const lastPoint = dailyTrends[dailyTrends.length - 1] || {};

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h2 className="text-3xl font-black flex items-center gap-2">
                        <Activity /> 仪表盘概览
                    </h2>
                    <p className={`text-sm ${textMuted}`}>{rangeLabel} · 数据实时刷新</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className={`${surface} ${border} flex items-center gap-2 rounded-full px-2 py-1`}>
                        {rangeOptions.map((option) => {
                            const active = option.value === normalizedRange;
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => handleRangeClick(option.value)}
                                    className={`px-3 py-1 text-xs font-semibold rounded-full transition ${
                                        active
                                            ? "bg-indigo-600 text-white"
                                            : `${isDarkMode ? "text-gray-300" : "text-gray-600"} hover:text-indigo-500`
                                    }`}
                                >
                                    {option.label}
                                </button>
                            );
                        })}
                    </div>
                    <button
                        type="button"
                        onClick={() => reload?.()}
                        disabled={loading}
                        className="px-4 py-2 border-2 border-black text-sm font-bold bg-[#FFD700] rounded-full hover:-translate-y-0.5 transition disabled:opacity-50"
                    >
                        {loading ? "刷新中..." : "刷新数据"}
                    </button>
                </div>
            </div>

            {error && <div className="text-sm text-red-500">{error}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {metrics.map((metric) => (
                    <StatCard key={metric.title} {...metric} />
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className={`xl:col-span-2 ${surface} ${border} rounded-2xl p-6 shadow-xl`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <h3 className={`text-xl font-bold ${textPrimary}`}>访客走势图</h3>
                            <p className={`text-xs ${textMuted}`}>最近{trendRangeDays}天 PV & UV</p>
                            {isUsingAggregated && (
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300">
                                    访问日志聚合
                                </span>
                            )}
                        </div>
                        <span className="text-xs font-mono">{dailyTrends.length} 天</span>
                    </div>
                    <TrendChart data={dailyTrends} isDarkMode={isDarkMode} />
                    {aggregatedLoading && <p className={`text-xs mt-2 ${textMuted}`}>正在从访问日志聚合趋势...</p>}
                    {aggregatedError && <p className="text-xs mt-2 text-red-500">{aggregatedError}</p>}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs mt-4">
                        <div className={`p-3 rounded-xl ${surface}`}>最高日 PV：{formatNumber(peakViews, "0")}</div>
                        <div className={`p-3 rounded-xl ${surface}`}>最高日 UV：{formatNumber(peakVisitors, "0")}</div>
                        <div className={`p-3 rounded-xl ${surface}`}>
                            最近一日 PV/UV：{formatNumber(lastPoint.views, "0")}/{formatNumber(lastPoint.visitors, "0")}
                        </div>
                    </div>
                </div>
                <div className={`${surface} ${border} rounded-2xl p-6 shadow-xl`}>
                    <h3 className={`text-xl font-bold ${textPrimary}`}>流量来源</h3>
                    <p className={`text-xs ${textMuted} mb-4`}>analytics_traffic_sources 实时占比</p>
                    {trafficSources.length === 0 ? (
                        <p className={`text-sm ${textMuted}`}>暂无流量来源统计</p>
                    ) : (
                        <div className="space-y-3">
                            {trafficSources.map((source, index) => (
                                <div key={`${source.label}-${index}`}>
                                    <div className="flex items-center justify-between text-sm">
                                        <span>{source.label}</span>
                                        <span className="font-semibold">{Math.round(source.value * 10) / 10}%</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-[#FF0080] to-[#6366F1]"
                                            style={{ width: `${Math.min(source.value, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const TrendChart = ({ data, isDarkMode }) => {
    const textMuted = isDarkMode ? "text-gray-400" : "text-gray-500";
    if (!data.length) {
        return <p className={`mt-6 text-sm ${textMuted}`}>暂无趋势数据</p>;
    }
    const gridColor = isDarkMode ? "#2e3445" : "#E5E7EB";
    const accentPv = "#FF0080";
    const accentUv = "#16A34A";
    const surfaceBg = isDarkMode ? "#0b1220" : "#f8fafc";
    const safeData = Array.isArray(data) ? data.filter(Boolean) : [];

    const normalized = safeData.map((item, index) => ({
        views: Number(item?.views || 0),
        visitors: Number(item?.visitors || 0),
        dateLabel: (item?.date || '').slice(5) || `D${index + 1}`
    }));

    const maxValue = Math.max(...normalized.map((n) => Math.max(n.views, n.visitors)), 0);
    const niceMax = (() => {
        if (maxValue <= 5) return 5;
        if (maxValue <= 10) return 10;
        const pow = 10 ** Math.floor(Math.log10(maxValue || 1));
        const ceilings = [1, 2, 5, 10];
        for (const c of ceilings) {
            if (maxValue <= c * pow) return c * pow;
        }
        return 10 * pow;
    })();
    const hasNonZero = maxValue > 0;
    const paddingY = 10;
    const paddingX = 8;
    const chartHeight = 100 - paddingY * 2;
    const chartWidth = 100 - paddingX * 2;
    const lastIndex = Math.max(normalized.length - 1, 1);

    const projectX = (index) => paddingX + (index / lastIndex) * chartWidth;
    const projectY = (value) => {
        if (!hasNonZero) {
            // 避免全 0 时折线贴底不可见
            return 100 - paddingY - chartHeight * 0.12;
        }
        return 100 - paddingY - (value / niceMax) * chartHeight;
    };

    const buildPoints = (key) =>
        normalized
            .map((item, index) => {
                const x = projectX(index);
                const y = projectY(item[key]);
                return `${x.toFixed(2)},${y.toFixed(2)}`;
            })
            .join(" ");

    const pvPoints = buildPoints("views");
    const uvPoints = buildPoints("visitors");
    const baseline = 100 - paddingY;

    const renderDots = (key, color) =>
        normalized.map((item, index) => {
            const x = projectX(index);
            const y = projectY(item[key]);
            return (
                <circle
                    key={`${key}-${index}`}
                    cx={x}
                    cy={y}
                    r={1.4}
                    fill={color}
                    stroke={isDarkMode ? "#0f172a" : "#fff"}
                    strokeWidth="0.6"
                />
            );
        });

    const yTicks = 5;
    const yLabels = Array.from({ length: yTicks + 1 }, (_, idx) => {
        const v = Math.round((niceMax / yTicks) * idx);
        const y = 100 - paddingY - (v / niceMax) * chartHeight;
        return { v, y };
    });

    return (
        <div className="mt-6">
            <div className="relative">
                <svg viewBox="0 0 100 100" className="w-full h-60" preserveAspectRatio="none">
                    <rect x="0" y="0" width="100" height="100" fill={surfaceBg} />
                    {yLabels.map((tick, idx) => (
                        <g key={`grid-${idx}`}>
                            <line
                                x1={paddingX}
                                x2={paddingX + chartWidth}
                                y1={tick.y}
                                y2={tick.y}
                                stroke={gridColor}
                                strokeWidth="0.35"
                                strokeDasharray="1.5 2.5"
                            />
                            <text
                                x={paddingX - 2}
                                y={tick.y + 2.5}
                                fontSize="4"
                                textAnchor="end"
                                fill={isDarkMode ? "#cbd5e1" : "#475569"}
                            >
                                {tick.v}
                            </text>
                        </g>
                    ))}
                    <polygon
                        points={`${paddingX},${baseline} ${pvPoints} ${paddingX + chartWidth},${baseline}`}
                        fill={`${accentPv}1a`}
                        stroke="none"
                    />
                    <polygon
                        points={`${paddingX},${baseline} ${uvPoints} ${paddingX + chartWidth},${baseline}`}
                        fill={`${accentUv}1a`}
                        stroke="none"
                    />
                    <polyline
                        fill="none"
                        stroke={accentPv}
                        strokeWidth="2.4"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        points={pvPoints}
                    />
                    <polyline
                        fill="none"
                        stroke={accentUv}
                        strokeWidth="2.4"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        points={uvPoints}
                    />
                    {renderDots("views", accentPv)}
                    {renderDots("visitors", accentUv)}
                </svg>
                {!hasNonZero && (
                    <p className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-amber-600/80">
                        暂无有效访问，已展示占位折线
                    </p>
                )}
            </div>
            <div className="flex items-center gap-4 text-xs mt-4">
                <span className="flex items-center gap-2 text-[#FF0080]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FF0080]" /> PV
                </span>
                <span className="flex items-center gap-2 text-emerald-500">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> UV
                </span>
                <span className={`text-[11px] ${textMuted}`}>横轴：日期（MM-DD），自动拉伸</span>
            </div>
            <div className="flex flex-wrap justify-between text-[10px] uppercase tracking-widest text-gray-400 mt-2 gap-y-1">
                {normalized.map((item, index) => (
                    <span key={`${item.dateLabel}-${index}`} className="text-center min-w-[32px]">
                        {item.dateLabel}
                    </span>
                ))}
            </div>
        </div>
    );
};

// 4.2 Sub-Component: Analytics View (实时访问日志)
const AnalyticsView = ({ isDarkMode, user }) => {
    const { reload } = useAdminAnalytics();
    const [logs, setLogs] = useState([]);
    const [page, setPage] = useState(1);
    const [size, setSize] = useState(20);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [clearing, setClearing] = useState(false);
    const [actionMessage, setActionMessage] = useState('');
    const [copyToast, setCopyToast] = useState('');
    const copyToastTimer = useRef(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [deleting, setDeleting] = useState(false);
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';

    const surface = isDarkMode ? THEME.colors.surfaceDark : THEME.colors.surfaceLight;
    const border = isDarkMode ? 'border border-gray-700' : 'border border-gray-200';
    const text = isDarkMode ? 'text-gray-100' : 'text-gray-900';
    const textMuted = isDarkMode ? 'text-gray-400' : 'text-gray-500';
    const refreshButtonClass = [
        'px-3 py-1 text-sm font-semibold rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        isDarkMode
            ? 'border border-gray-700 bg-gray-900 text-gray-100 hover:bg-gray-800 focus-visible:ring-indigo-400 focus-visible:ring-offset-gray-900'
            : 'bg-black text-white hover:bg-gray-800 focus-visible:ring-gray-700 focus-visible:ring-offset-white'
    ].join(' ');

    useEffect(() => {
        return () => {
            if (copyToastTimer.current) {
                clearTimeout(copyToastTimer.current);
            }
        };
    }, []);

    const renderReferrer = (referrer) => {
        if (!referrer) return '未知来源';
        if (/^(https?:)?\/\//i.test(referrer)) {
            let label = referrer;
            try {
                const parsed = new URL(referrer);
                label = `外部链接：${parsed.hostname}`;
            } catch {
                label = referrer;
            }
            return <a className="text-indigo-500 hover:underline" href={referrer} target="_blank"
                rel="noopener noreferrer">{label}</a>;
        }
        return referrer;
    };

    const normalizeVisitorAvatarPath = (rawValue) => {
        if (!rawValue || typeof rawValue !== 'string') return '';
        const trimmed = rawValue.trim();
        if (!trimmed) return '';
        if (/^(https?:)?\/\//i.test(trimmed)) return trimmed;

        const uploadsPrefix = '/uploads/';
        let normalized = trimmed.replace(/\\/g, '/');
        if (!normalized.startsWith('/')) normalized = `/${normalized}`;

        if (normalized.startsWith('/avatar/')) {
            normalized = `${uploadsPrefix.slice(0, -1)}${normalized}`;
        } else if (normalized.startsWith(uploadsPrefix)) {
            const rest = normalized.slice(uploadsPrefix.length).replace(/^\/+/, '');
            if (!rest.startsWith('avatar/')) {
                normalized = `${uploadsPrefix}avatar/${rest}`;
            } else {
                normalized = `${uploadsPrefix}${rest}`;
            }
        } else {
            normalized = `${uploadsPrefix}avatar/${normalized.replace(/^\/+/, '')}`;
        }

        return normalized.replace(/\/{2,}/g, '/');
    };

    const resolveVisitorAvatar = (visit) => {
        const rawPath = visit?.avatar || visit?.avatarPath || visit?.avatarUrl || visit?.avatar_url;
        const normalized = normalizeVisitorAvatarPath(rawPath);
        if (!normalized) return '';
        return buildAssetUrl(normalized, '');
    };

    const renderUserBadge = (visit) => {
        if (!visit?.loggedIn) {
            return <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-500">访客</span>;
        }

        const userId = visit.userId ?? visit.user_id ?? '-';
        const username = visit.username || visit.userName || visit.user_name || '-';
        const displayName = visit.displayName
            || visit.display_name
            || visit.userName
            || visit.nickName
            || visit.nickname
            || username
            || '-';
        const title = `${userId}-${username}-${displayName}`;
        const avatarSrc = resolveVisitorAvatar(visit);
        const initials = (displayName || 'U').slice(0, 1).toUpperCase();

        return (
            <div className="flex items-center gap-2" title={title}>
                <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-pink-500 to-indigo-500 text-white flex items-center justify-center text-sm font-bold">
                    {avatarSrc
                        ? <img src={avatarSrc} alt={displayName || 'user'} className="w-full h-full object-cover" />
                        : initials}
                </div>
            </div>
        );
    };

    const loadLogs = useCallback(async (targetPage = 1, targetSize = 20) => {
        setLoading(true);
        setError('');
        try {
            const res = await adminFetchPageViewLogs({ page: targetPage, size: targetSize });
            const data = res.data || res;
            const records = data.records || [];
            setLogs(records);
            setSelectedIds((prev) => {
                const available = new Set(records.map((item) => item.id));
                return prev.filter((id) => available.has(id));
            });
            setTotal(Number(data.total || 0));
            setPage(Number(data.page || targetPage));
            setSize(Number(data.size || targetSize));
        } catch (err) {
            setError(err.message || '加载访问日志失败');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadLogs(1, size);
    }, [loadLogs]);

    const totalPages = Math.max(1, Math.ceil((total || 0) / size) || 1);
    const allSelected = logs.length > 0 && selectedIds.length === logs.length;
    const hasSelection = selectedIds.length > 0;

    const handlePageChange = (target) => {
        const safe = Math.min(Math.max(target, 1), totalPages);
        loadLogs(safe, size);
    };

    const handleSizeChange = (nextSize) => {
        const parsed = Number(nextSize);
        if (!parsed || parsed < 1) return;
        loadLogs(1, parsed);
    };

    const handleClearLogs = async () => {
        if (!isSuperAdmin) return;
        if (!window.confirm('确定要删除你在本站的所有访问日志吗？')) return;
        setClearing(true);
        setActionMessage('');
        try {
            await adminDeleteMyAnalyticsLogs();
            setActionMessage('已清理当前账户的访问日志。');
            await loadLogs(1, size);
            if (reload) reload();
        } catch (err) {
            setActionMessage(err.message || '清理失败，请稍后重试。');
        } finally {
            setClearing(false);
        }
    };

    const toggleSelectAll = () => {
        if (!isSuperAdmin || !logs.length) return;
        const allIds = logs.map((item) => item.id).filter(Boolean);
        if (selectedIds.length === allIds.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(allIds);
        }
    };

    const toggleSelectOne = (id) => {
        if (!isSuperAdmin || !id) return;
        setSelectedIds((prev) => {
            if (prev.includes(id)) {
                return prev.filter((value) => value !== id);
            }
            return [...prev, id];
        });
    };

    const handleDeleteOne = async (id) => {
        if (!isSuperAdmin || !id) return;
        if (!window.confirm('确认删除这条访问日志吗？')) return;
        setDeleting(true);
        setActionMessage('');
        try {
            await adminDeletePageViewLog(id);
            setActionMessage('已删除 1 条访问日志。');
            const nextPage = logs.length === 1 && page > 1 ? page - 1 : page;
            await loadLogs(nextPage, size);
            if (reload) reload();
        } catch (err) {
            setError(err.message || '删除失败，请稍后再试。');
        } finally {
            setDeleting(false);
        }
    };

    const handleBatchDelete = async () => {
        if (!isSuperAdmin || !selectedIds.length) return;
        if (!window.confirm(`确认删除选中的 ${selectedIds.length} 条访问日志吗？`)) return;
        setDeleting(true);
        setActionMessage('');
        try {
            await adminDeletePageViewLogs(selectedIds);
            setActionMessage(`已删除 ${selectedIds.length} 条访问日志。`);
            const nextPage = selectedIds.length >= logs.length && page > 1 ? page - 1 : page;
            setSelectedIds([]);
            await loadLogs(nextPage, size);
            if (reload) reload();
        } catch (err) {
            setError(err.message || '批量删除失败，请稍后再试。');
        } finally {
            setDeleting(false);
        }
    };

    const handleCopyIp = async (ip) => {
        if (!ip) return;
        try {
            await navigator.clipboard.writeText(ip);
            setActionMessage('');
            setCopyToast(`已复制 IP：${ip}`);
        } catch (err) {
            setCopyToast('复制失败，请手动复制该 IP。');
        } finally {
            if (copyToastTimer.current) {
                clearTimeout(copyToastTimer.current);
            }
            copyToastTimer.current = setTimeout(() => setCopyToast(''), 2500);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-3xl font-black flex items-center gap-2"><TrendingUp /> 实时访问日志</h2>
                    <p className={`text-sm ${textMuted}`}>按时间倒序展示 analytics_page_views 全量记录，含 IP / 用户 / 来源 / 地理位置。</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <div className={`${border} px-3 py-1 rounded-full text-sm`}>共 {total.toLocaleString()} 条</div>
                    <select
                        className={`px-3 py-1.5 text-sm rounded-full border transition-colors shadow-sm ${isDarkMode
                            ? 'bg-gray-900/70 border-gray-700 text-gray-100 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/40'
                            : 'bg-white border-gray-200 text-gray-800 hover:border-indigo-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200/80'
                        }`}
                        value={size}
                        onChange={(e) => handleSizeChange(e.target.value)}
                    >
                        {[10, 20, 50, 100].map((opt) => (
                            <option key={opt} value={opt}>{opt} 条/页</option>
                        ))}
                    </select>
                    <button
                        type="button"
                        onClick={() => loadLogs(page, size)}
                        className={refreshButtonClass}
                    >
                        刷新
                    </button>
                    {isSuperAdmin && (
                        <button
                            type="button"
                            onClick={handleBatchDelete}
                            disabled={!hasSelection || deleting || loading}
                            className="px-3 py-1 text-sm font-semibold border-2 border-red-500 text-red-600 rounded-full hover:bg-red-50 disabled:opacity-50"
                        >
                            {deleting ? '删除中...' : `批量删除${hasSelection ? `(${selectedIds.length})` : ''}`}
                        </button>
                    )}
                    {isSuperAdmin && (
                        <button
                            type="button"
                            onClick={handleClearLogs}
                            disabled={clearing}
                            className="px-3 py-1 text-sm font-bold border-2 border-red-600 text-red-600 rounded-full hover:bg-red-50 disabled:opacity-50"
                        >
                            {clearing ? '清理中...' : '清理我的访问日志'}
                        </button>
                    )}
                </div>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            {actionMessage && <p className="text-sm text-emerald-500">{actionMessage}</p>}
            {copyToast && (
                <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
                    <div className="px-5 py-3 rounded-lg shadow-2xl bg-emerald-500 text-white text-sm pointer-events-auto">
                        {copyToast}
                    </div>
                </div>
            )}

            <div className={`${surface} ${border} rounded-2xl p-6 shadow-xl`}>
                {loading ? (
                    <p className={`text-sm ${textMuted}`}>数据加载中...</p>
                ) : logs.length === 0 ? (
                    <p className={`text-sm ${textMuted}`}>暂无访问记录</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className={isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}>
                                <tr>
                                    {isSuperAdmin && (
                                        <th className="px-4 py-3 text-left w-10">
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4"
                                                checked={allSelected}
                                                onChange={toggleSelectAll}
                                                disabled={!logs.length}
                                            />
                                        </th>
                                    )}
                                    <th className="px-4 py-3 text-left">时间</th>
                                    <th className="px-4 py-3 text-left w-88">文章</th>
                                    <th className="px-4 py-3 text-left min-w-[150px]">访客 IP</th>
                                    <th className="px-4 py-3 text-left min-w-[120px]">用户</th>
                                    <th className="px-4 py-3 text-left min-w-[120px]">来源</th>
                                    <th className="px-4 py-3 text-left min-w-[48px]">地理</th>
                                    {isSuperAdmin && <th className="px-4 py-3 text-right">操作</th>}
                                </tr>
                            </thead>
                            <tbody className={isDarkMode ? 'divide-y divide-gray-800' : 'divide-y divide-gray-200'}>
                                {logs.map((visit) => (
                                    <tr key={visit.id} className="align-top">
                                        {isSuperAdmin && (
                                            <td className="px-4 py-3">
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4"
                                                    checked={selectedIds.includes(visit.id)}
                                                    onChange={() => toggleSelectOne(visit.id)}
                                                />
                                            </td>
                                        )}
                                        <td className="px-4 py-3 font-mono whitespace-nowrap">{visit.time || '-'}</td>
                                        <td className="px-4 py-3 w-88">
                                            <p
                                                className="font-semibold truncate max-w-[352px]"
                                                title={visit.title || '未命名文章'}
                                            >
                                                {visit.title || '未命名文章'}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3 font-mono whitespace-nowrap min-w-[150px]">
                                            {visit.ip ? (
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyIp(visit.ip)}
                                                    className="text-current hover:text-current focus:outline-none"
                                                    title="点击复制 IP"
                                                >
                                                    {visit.ip}
                                                </button>
                                            ) : '-'}
                                        </td>
                                        <td className="px-4 py-3 min-w-[120px]">
                                            {renderUserBadge(visit)}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap min-w-[120px]">{renderReferrer(visit.referrer)}</td>
                                        <td className="px-4 py-3">{visit.geo || '未知'}</td>
                                        {isSuperAdmin && (
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteOne(visit.id)}
                                                    disabled={deleting}
                                                    className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold border border-red-500 text-red-600 rounded-md hover:bg-red-50 disabled:opacity-50"
                                                >
                                                    <Trash2 size={14} />
                                                    删除
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
                    <div className={`text-xs ${textMuted}`}>第 {page} / {totalPages} 页</div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => handlePageChange(page - 1)}
                            disabled={page <= 1}
                            className="px-3 py-1 text-sm rounded-md border disabled:opacity-50"
                        >
                            上一页
                        </button>
                        <button
                            type="button"
                            onClick={() => handlePageChange(page + 1)}
                            disabled={page >= totalPages}
                            className="px-3 py-1 text-sm rounded-md border disabled:opacity-50"
                        >
                            下一页
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// 4.3 Sub-Component: Create New Post (The most important module)
const CreatePostView = ({ isDarkMode }) => {
    const { categories } = useBlog();
    const { hasPermission, loading: permLoading } = usePermissionContext();
    const [tags, setTags] = useState([]);
    const [assetsFolder, setAssetsFolder] = useState("");
    const [title, setTitle] = useState("");
    const [excerpt, setExcerpt] = useState("");
    const [mdContent, setMdContent] = useState("");
    const [themeColor, setThemeColor] = useState(DEFAULT_THEME_COLOR);
    const [hasManualThemeColor, setHasManualThemeColor] = useState(false);
    const mdHistoryRef = useRef([]);
    const mdFutureRef = useRef([]);
    const [markdownFileName, setMarkdownFileName] = useState("");
    const [selectedParentId, setSelectedParentId] = useState(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);
    const [selectedTags, setSelectedTags] = useState([]);
    const [imageUploadMessage, setImageUploadMessage] = useState("");
    const [markdownMessage, setMarkdownMessage] = useState("");
    const [submitNotice, setSubmitNotice] = useState("");
    const [submitError, setSubmitError] = useState("");
    const [publishBanner, setPublishBanner] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [uploadingImages, setUploadingImages] = useState(false);
    const markdownFileInputRef = useRef(null);
    const markdownEditorRef = useRef(null);
    const inlineImageInputRef = useRef(null);
    const {
        notice: publishNotice,
        showNotice: showPublishNotice,
        hideNotice: hidePublishNotice
    } = useTimedNotice(4200);

    const surface = isDarkMode ? THEME.colors.surfaceDark : THEME.colors.surfaceLight;
    const text = isDarkMode ? 'text-gray-200' : 'text-gray-800';
    const inputClass = `w-full p-3 border-2 rounded-md transition-all ${isDarkMode ? 'bg-gray-800 border-gray-600 text-white focus:border-indigo-500' : 'bg-white border-gray-300 text-black focus:border-indigo-500'}`;

    const ensureAssetsSlug = useCallback(async () => {
        if (assetsFolder) return assetsFolder;
        const res = await reservePostAssetsFolder();
        const data = res.data || res;
        if (!data?.folder) {
            throw new Error("未获取到资源标识");
        }
        setAssetsFolder(data.folder);
        return data.folder;
    }, [assetsFolder]);

    const pushMdHistory = useCallback((value) => {
        mdHistoryRef.current.push(value);
        if (mdHistoryRef.current.length > 200) {
            mdHistoryRef.current.shift();
        }
    }, []);

    const applyMdContent = useCallback((next) => {
        pushMdHistory(mdContent);
        mdFutureRef.current = [];
        setMdContent(next);
    }, [mdContent, pushMdHistory]);

    const insertImagesAtCursor = useCallback((urls = []) => {
        if (!urls.length) return;
        const snippet = urls
            .map((url, index) => `![${title || `插图${index + 1}`}](${url})`)
            .join("\n") + "\n";
        setMdContent((prev) => {
            const textarea = markdownEditorRef.current;
            if (!textarea) {
                const prefix = prev.endsWith("\n") || prev.length === 0 ? prev : `${prev}\n`;
                return `${prefix}${snippet}`;
            }
            const start = textarea.selectionStart ?? prev.length;
            const end = textarea.selectionEnd ?? start;
            const before = prev.slice(0, start);
            const after = prev.slice(end);
            const normalizedBefore = before && !before.endsWith("\n") ? `${before}\n` : before;
            const normalizedAfter = after.startsWith("\n") || after.length === 0 ? after : `\n${after}`;
            const nextContent = `${normalizedBefore}${snippet}${normalizedAfter}`;
            const cursorPos = (normalizedBefore + snippet).length;
            requestAnimationFrame(() => {
                const el = markdownEditorRef.current;
                if (el) {
                    el.focus();
                    el.selectionStart = cursorPos;
                    el.selectionEnd = cursorPos;
                }
            });
            return nextContent;
        });
    }, [markdownEditorRef, title]);

    useEffect(() => {
        const loadTags = async () => {
            try {
                const res = await fetchTags();
                const data = res.data || res;
                setTags(data || []);
            } catch (error) {
                setSubmitError(error.message || "标签加载失败");
                setSubmitNotice("");
            }
        };
        loadTags();
    }, []);

    const normalizedCategories = useMemo(() => {
        return (categories || []).filter((cat) => typeof cat.id === "number");
    }, [categories]);

    const activeParent = normalizedCategories.find((cat) => Number(cat.id) === selectedParentId) || normalizedCategories[0];
    useEffect(() => {
        if (activeParent) {
            const parentId = Number(activeParent.id);
            if (selectedParentId !== parentId) {
                setSelectedParentId(parentId);
                setSelectedCategoryId(null);
            }
        }
    }, [activeParent, selectedParentId]);

    const secondLevelCategories = activeParent?.children || [];

    const handleFolderReserve = async () => {
        try {
            const res = await reservePostAssetsFolder();
            const data = res.data || res;
            if (data?.folder) {
                setAssetsFolder(data.folder);
                setImageUploadMessage(`已生成资源 slug：${data.folder}`);
            }
        } catch (error) {
            setImageUploadMessage(error.message || "无法生成目录");
        }
    };

    const handleInlineImageUpload = async (event) => {
        const files = Array.from(event.target.files || []);
        if (!files.length) return;
        setUploadingImages(true);
        setImageUploadMessage("图片上传中...");
        try {
            const slug = await ensureAssetsSlug();
            const res = await uploadPostAssets(files, slug);
            const data = res.data || res;
            if (data?.folder && data.folder !== assetsFolder) setAssetsFolder(data.folder);
            const urls = data?.urls || [];

            const uploaded = urls.length;
            if (!uploaded) {
                setImageUploadMessage("上传成功");
            } else {
                const filenameToUrl = {};
                files.forEach((file, idx) => {
                    const url = urls[idx] || urls[urls.length - 1];
                    filenameToUrl[file.name] = url;
                });

                const beforeCount = countImagesInContent(mdContent);
                let replacedCount = 0;
                let nextContent = mdContent.replace(/!\[[^\]]*]\(([^)]+)\)/g, (full, path) => {
                    const filename = path.split(/[/\\\\]/).pop();
                    if (filename && filenameToUrl[filename]) {
                        const url = filenameToUrl[filename];
                        delete filenameToUrl[filename];
                        replacedCount += 1;
                        return full.replace(path, url);
                    }
                    return full;
                });

                const remainingUrls = Object.values(filenameToUrl);
                if (remainingUrls.length) {
                    const snippet = remainingUrls.map((url, index) => `![${files[index]?.name || `图片${index + 1}`}](${url})`).join("\n");
                    const prefix = nextContent.endsWith("\n") || nextContent.length === 0 ? "" : "\n";
                    nextContent = `${nextContent}${prefix}${snippet}\n`;
                }

                applyMdContent(nextContent);

                const message = `已上传 ${uploaded} 张，匹配替换 ${replacedCount} 张`;
                const totalDetected = beforeCount;
                const complete = totalDetected === 0 || replacedCount === totalDetected;
                setImageUploadMessage(`${message}，${complete ? '导入成功！' : '自动导入不全，请手动导入！'}`);
            }
        } catch (error) {
            setImageUploadMessage(error.message || "图片上传失败");
        } finally {
            setUploadingImages(false);
            if (event?.target) {
                event.target.value = null;
            }
        }
    };

    const handleMarkdownUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const extractTitleFromFilename = (filename) => {
            if (!filename) return "";
            const nameWithoutExt = filename.replace(/\.(md|markdown|txt)$/i, "");
            const dashIndex = nameWithoutExt.indexOf("-");
            if (dashIndex === -1) return nameWithoutExt.trim();
            return nameWithoutExt.slice(dashIndex + 1).trim();
        };

        const extractSummaryAndBody = (content) => {
            const lines = content.split(/\r?\n/);
            let summary = "";
            let summaryLineIndex = -1;
            for (let i = 0; i < lines.length; i += 1) {
                const match = lines[i].match(/^\s*>\s?(.*)$/);
                if (match && match[1]) {
                    summary = match[1].trim();
                    summaryLineIndex = i;
                    break;
                }
            }
            if (summaryLineIndex >= 0) {
                const bodyLines = lines.filter((_, idx) => idx !== summaryLineIndex);
                // 去掉摘要行后可能留下的首个空行
                while (bodyLines[0] !== undefined && bodyLines[0].trim() === "") {
                    bodyLines.shift();
                }
                return { summary, body: bodyLines.join("\n") };
            }
            return { summary: "", body: content };
        };

        try {
            const rawText = await file.text();
            const { summary, body } = extractSummaryAndBody(rawText);
            const imageCount = countImagesInContent(body);
            applyMdContent(body);
            setMarkdownFileName(file.name);

            const baseMsg = summary ? `已解析摘要并加载 ${file.name}` : "未识别摘要格式，请手动填写摘要";
            const imageMsg = `📷 本文检测到 ${imageCount} 张图片`;
            setMarkdownMessage(`${baseMsg} · ${imageMsg}`);

            if (!title.trim()) {
                const inferredTitle = extractTitleFromFilename(file.name);
                setTitle(inferredTitle || file.name.replace(/\.(md|markdown|txt)$/i, ""));
            }

            if (summary) {
                setExcerpt(summary);
            } else if (!excerpt.trim()) {
                const plain = body.replace(/[#>*_`-]/g, "").replace(/\s+/g, " ").trim();
                setExcerpt(plain.slice(0, 160));
            }
        } catch (error) {
            setMarkdownMessage(error.message || "读取 Markdown 失败");
        } finally {
            event.target.value = null;
        }
    };

    const handleThemeColorChange = (value) => {
        setHasManualThemeColor(true);
        setThemeColor(value);
    };
    const toggleTag = (id) => {
        const tagId = Number(id);
        setSelectedTags((prev) =>
            prev.includes(tagId) ? prev.filter((value) => value !== tagId) : [...prev, tagId]
        );
    };

    const canPublish = Boolean(
        title.trim() &&
        mdContent.trim() &&
        selectedCategoryId &&
        selectedTags.length > 0
    );

    if (permLoading) {
        return (
            <div className="p-10 text-center text-sm text-gray-500">权限信息加载中...</div>
        );
    }

    if (!hasPermission('POST_CREATE')) {
        return (
            <PermissionNotice
                title="无法访问发布文章功能"
                description="当前角色未被授予“新建文章”权限，请联系超级管理员在权限管理页开启。"
            />
        );
    }

    const handlePublish = async () => {
        if (!canPublish || submitting) return;
        setSubmitting(true);
        setSubmitNotice("");
        setSubmitError("");
        try {
            const slug = await ensureAssetsSlug();
            if (!slug) {
                throw new Error("未能生成资源目录");
            }
            const payload = {
                title: title.trim(),
                slug,
                contentMd: mdContent,
                excerpt: excerpt.trim() || mdContent.replace(/\s+/g, " ").slice(0, 160),
                categoryId: selectedCategoryId,
                tagIds: selectedTags,
                status: "PUBLISHED",
                themeColor: themeColor?.trim() || undefined,
            };
            const res = await createPost(payload);
            const data = res.data || res;
            setSubmitNotice(`发布成功（ID: ${data?.summary?.id || data?.id || "已创建"}）`);
            setPublishBanner(`发布成功（ID: ${data?.summary?.id || data?.id || "已创建"}）`);
            if (typeof window !== 'undefined') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            setTitle("");
            setMdContent("");
            setMarkdownFileName("");
            setSelectedTags([]);
            setExcerpt("");
            setAssetsFolder("");
            setMarkdownMessage("");
            setImageUploadMessage("");
            setThemeColor(DEFAULT_THEME_COLOR);
            setHasManualThemeColor(false);
        } catch (error) {
            setSubmitError(error.message || "发布失败");
            setSubmitNotice("");
        } finally {
            setSubmitting(false);
        }
    };

    const handleResetForm = () => {
        if (!window.confirm("确定要清空当前所有输入吗？此操作不可撤销。")) return;
        const firstParentId = normalizedCategories[0]?.id ?? null;
        const firstChildId = normalizedCategories[0]?.children?.[0]?.id ?? null;
        setTitle("");
        setMdContent("");
        setExcerpt("");
        setMarkdownFileName("");
        setMarkdownMessage("");
        setImageUploadMessage("");
        setAssetsFolder("");
        setSelectedTags([]);
        setThemeColor(DEFAULT_THEME_COLOR);
        setHasManualThemeColor(false);
        setSelectedParentId(firstParentId);
        setSelectedCategoryId(firstChildId ? Number(firstChildId) : null);
        if (firstChildId !== null && typeof firstChildId !== "undefined") {
            const idx = 0;
            const presetColor = THEME_COLOR_PRESETS[idx];
            if (presetColor) {
                setThemeColor(presetColor);
            }
        }
        setSubmitError("");
        setSubmitNotice("");
    };

    const handleResetThemeColor = () => {
        setThemeColor(DEFAULT_THEME_COLOR);
        setHasManualThemeColor(false);
    };

    useEffect(() => {
        if (!publishBanner) return;
        const timer = setTimeout(() => setPublishBanner(""), 4500);
        return () => clearTimeout(timer);
    }, [publishBanner]);

    return (
        <div className="space-y-8">
            {publishBanner && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
                    <div className="px-6 py-3 rounded-2xl border-2 border-black bg-gradient-to-r from-emerald-400 to-amber-300 shadow-[6px_6px_0px_0px_#000] text-black text-lg font-extrabold tracking-tight">
                        🎉 {publishBanner}
                    </div>
                </div>
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm uppercase tracking-[0.4em] text-gray-400">Admin</p>
                    <h2 className="text-3xl font-black italic text-pink-500 flex items-center gap-2">
                        <Edit /> 发布新文章
                    </h2>
                </div>
                <div className="flex items-center gap-3 flex-wrap justify-end">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                        上传 Markdown + 资源图片，整理分类与标签后方可发布
                    </span>
                    <button
                        type="button"
                        onClick={handleResetForm}
                        className="px-3 py-1.5 text-sm font-semibold border-2 border-amber-500 text-amber-700 bg-amber-50 rounded-full hover:bg-amber-100 dark:border-amber-400 dark:text-amber-200 dark:bg-amber-900/40"
                    >
                        清空表单
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 space-y-6">
                    <div
                        className={`${surface} p-6 rounded-2xl shadow-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} space-y-4`}>
                        <label className="text-sm font-semibold text-gray-500 dark:text-gray-400">文章标题</label>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="请输入文章标题"
                            className={`${inputClass} text-2xl font-bold`}
                        />
                    </div>

                    <div
                        className={`${surface} p-6 rounded-2xl shadow-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} space-y-4`}>
                        <div
                            className="flex flex-col gap-3 border-b pb-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <h3 className={`font-semibold ${text}`}>Markdown 正文</h3>
                                <p className="text-xs text-gray-500">上传 .md、粘贴内容，或在当前光标处插入图片</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    className="text-sm text-indigo-500 flex items-center gap-1 hover:text-indigo-400"
                                    onClick={() => markdownFileInputRef.current?.click()}
                                >
                                    <Upload size={16} /> 上传 .md
                                </button>
                                <button
                                    type="button"
                                    disabled={uploadingImages}
                                    className={`text-sm flex items-center gap-1 ${uploadingImages ? 'text-gray-400 cursor-not-allowed' : 'text-pink-500 hover:text-pink-400'}`}
                                    onClick={() => inlineImageInputRef.current?.click()}
                                >
                                    <ImagePlus size={16} /> {uploadingImages ? "插图上传中..." : "插入图片"}
                                </button>
                            </div>
                            <input
                                type="file"
                                accept=".md,.markdown,.txt"
                                ref={markdownFileInputRef}
                                className="hidden"
                                onChange={handleMarkdownUpload}
                            />
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                ref={inlineImageInputRef}
                                className="hidden"
                                onChange={handleInlineImageUpload}
                            />
                        </div>
                        {(markdownFileName || imageUploadMessage) && (
                            <div className="text-xs space-y-1">
                                {markdownFileName && (
                                    <div className="text-emerald-500 flex items-center gap-1">
                                        <CheckCircle size={14} /> {markdownMessage || markdownFileName}
                                    </div>
                                )}
                                {imageUploadMessage && (
                                    <div className="text-indigo-500 flex items-center gap-1">
                                        <ImagePlus size={14} /> {imageUploadMessage}
                                    </div>
                                )}
                            </div>
                        )}
                        <textarea
                            ref={markdownEditorRef}
                            className={`${inputClass} min-h-[420px] font-mono text-sm`}
                            value={mdContent}
                            onChange={(e) => {
                                pushMdHistory(mdContent);
                                mdFutureRef.current = [];
                                setMdContent(e.target.value);
                            }}
                            onKeyDown={(e) => {
                                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                                    e.preventDefault();
                                    if (mdHistoryRef.current.length) {
                                        const prev = mdHistoryRef.current.pop();
                                        mdFutureRef.current.push(mdContent);
                                        setMdContent(prev);
                                    }
                                }
                            }}
                            placeholder="在此粘贴 Markdown 内容"
                        />
                    </div>

                    <div
                        className={`${surface} p-6 rounded-2xl shadow-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} space-y-3`}>
                        <label className="text-sm font-semibold text-gray-500 dark:text-gray-400">文章摘要（可选）</label>
                        <textarea
                            className={`${inputClass} min-h-[120px]`}
                            value={excerpt}
                            onChange={(e) => setExcerpt(e.target.value)}
                            placeholder="用于首页卡片展示，若留空则自动截取正文前 160 字"
                        />
                    </div>
                </div>

                <div className="space-y-6">
                    <div
                        className={`${surface} p-6 rounded-2xl shadow-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} space-y-4`}>
                        <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Step 1</p>
                        <h3 className="font-semibold flex items-center gap-2"><Layers size={16} /> 选择二级分类</h3>
                        <div className="flex flex-wrap gap-2">
                            {normalizedCategories.map((cat) => {
                                const catId = Number(cat.id);
                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => {
                                            setSelectedParentId(catId);
                                            setSelectedCategoryId(null);
                                        }}
                                        className={`px-3 py-1 text-xs rounded-full border ${selectedParentId === catId ? 'bg-pink-500 text-white border-pink-500' : 'border-gray-300 dark:border-gray-600'}`}
                                    >
                                        {cat.label}
                                    </button>
                                )
                            })}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {secondLevelCategories.map((child, idx) => {
                                const childId = Number(child.id);
                                const presetColor = THEME_COLOR_PRESETS[idx];
                                return (
                                    <button
                                        key={child.id}
                                        onClick={() => {
                                            setSelectedCategoryId(childId);
                                            if (presetColor && !hasManualThemeColor) {
                                                setThemeColor(presetColor);
                                            }
                                        }}
                                        className={`p-3 rounded-xl border text-left text-sm ${selectedCategoryId === childId ? 'border-pink-500 bg-pink-50 dark:bg-pink-500/10 text-pink-500' : 'border-gray-200 dark:border-gray-700'}`}
                                    >
                                        {child.label}
                                    </button>
                                )
                            })}
                        </div>
                        {!secondLevelCategories.length && (
                            <p className="text-xs text-amber-500 flex items-center gap-1">
                                <AlertTriangle size={14} /> 当前父级暂无二级分类，请先到分类管理中创建。
                            </p>
                        )}
                    </div>

                    <div
                        className={`${surface} p-6 rounded-2xl shadow-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} space-y-4`}>
                        <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Step 2</p>
                        <h3 className="font-semibold flex items-center gap-2"><Tag size={16} /> 选择标签</h3>
                        <div className="flex flex-wrap gap-2">
                            {tags.map((tag) => (
                                <button
                                    key={tag.id}
                                    onClick={() => toggleTag(tag.id)}
                                    className={`px-3 py-1 text-xs rounded-full border ${selectedTags.includes(tag.id) ? 'bg-indigo-500 text-white border-indigo-500' : 'border-gray-300 dark:border-gray-600'}`}
                                >
                                    {tag.name}
                                </button>
                            ))}
                        </div>
                        {selectedTags.length === 0 && (
                            <p className="text-xs text-amber-500 flex items-center gap-1">
                                <AlertTriangle size={14} /> 至少选择一个标签，用于站内检索。
                            </p>
                        )}
                    </div>

                    <div
                        className={`${surface} p-6 rounded-2xl shadow-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} space-y-4`}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Step 3</p>
                                <h3 className="font-semibold flex items-center gap-2"><FolderPlus size={16} /> 资源标识
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={handleFolderReserve}
                                className="text-xs text-indigo-500 hover:text-indigo-400 flex items-center gap-1"
                            >
                                <RefreshCw size={14} /> 重新生成（不改颜色）
                            </button>
                            <button
                                type="button"
                                onClick={handleResetThemeColor}
                                className="text-xs text-amber-600 hover:text-amber-500 flex items-center gap-1"
                            >
                                <RefreshCw size={14} /> 重置为默认色
                            </button>
                        </div>
                        <div className="text-xs text-gray-500 space-y-2">
                            <p>当前 slug：<code
                                className="px-2 py-1 rounded bg-black/5 dark:bg-white/5 break-all">{assetsFolder ? `/uploads/${assetsFolder}` : "尚未生成"}</code>
                            </p>
                            <p>所有插入的图片文件都会写入该目录，Markdown 将直接引用 `/uploads/&lt;slug&gt;/xxx.png`。</p>
                            <p>每次上传成功后接口会返回以分号拼接的图片地址串，可直接贴入需要存储地址的数据库字段。</p>
                        </div>
                        <ThemeColorSelector
                            value={themeColor}
                            onChange={handleThemeColorChange}
                            inputClass={inputClass}
                            isDarkMode={isDarkMode}
                        />
                    </div>

                    <div
                        className={`${surface} p-6 rounded-2xl shadow-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} space-y-4`}>
                        <div className="flex items-center gap-2">
                            <Send /> <span>发布设置</span>
                        </div>
                        <p className="text-xs text-gray-500">
                            填写完成并确认分类/标签后可立即发布到线上。
                        </p>
                        <PopButton
                            variant={canPublish ? "primary" : "ghost"}
                            icon={Send}
                            className="w-full justify-center"
                            disabled={!canPublish || submitting}
                            onClick={handlePublish}
                        >
                            {submitting ? "发布中..." : "立即发布"}
                        </PopButton>
                        {submitError && (
                            <p className="text-xs text-rose-500">
                                {submitError}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};


const TaxonomyView = ({ isDarkMode }) => {
    const [tags, setTags] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [form, setForm] = useState({ name: "", slug: "", description: "" });
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ name: "", slug: "", description: "" });
    const [saving, setSaving] = useState(false);
    const [keyword, setKeyword] = useState("");
    const [page, setPage] = useState(1);
    const [size, setSize] = useState(10);
    const [total, setTotal] = useState(0);

    const loadTags = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await adminFetchTags({ keyword, page, size });
            const data = res.data || res;
            setTags(data?.records || []);
            setTotal(data?.total || 0);
        } catch (err) {
            setError(err.message || "加载标签失败");
        } finally {
            setLoading(false);
        }
    }, [keyword, page, size]);

    useEffect(() => {
        loadTags();
    }, [loadTags]);

    const normalizePayload = (payload) => ({
        name: payload.name.trim(),
        slug: payload.slug.trim() || undefined,
        description: payload.description.trim() || undefined,
    });

    const handleCreate = async () => {
        if (!form.name.trim()) {
            alert("请输入标签名称");
            return;
        }
        setSaving(true);
        try {
            await adminCreateTag(normalizePayload(form));
            setForm({ name: "", slug: "", description: "" });
            setPage(1);
            await loadTags();
            alert("标签创建成功");
        } catch (err) {
            alert(err.message || "创建失败");
        } finally {
            setSaving(false);
        }
    };

    const startEdit = (tag) => {
        setEditingId(tag.id);
        setEditForm({
            name: tag.name || "",
            slug: tag.slug || "",
            description: tag.description || "",
        });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm({ name: "", slug: "", description: "" });
    };

    const handleUpdate = async () => {
        if (!editingId) return;
        if (!editForm.name.trim()) {
            alert("请输入标签名称");
            return;
        }
        setSaving(true);
        try {
            await adminUpdateTag(editingId, normalizePayload(editForm));
            cancelEdit();
            await loadTags();
            alert("标签已更新");
        } catch (err) {
            alert(err.message || "更新失败");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (tagId) => {
        if (!window.confirm("确定要删除该标签吗？")) return;
        try {
            await adminDeleteTag(tagId);
            if (editingId === tagId) cancelEdit();
            const newTotal = Math.max(total - 1, 0);
            const maxPage = Math.max(Math.ceil(newTotal / size), 1);
            if (page > maxPage) {
                setPage(maxPage);
            }
            await loadTags();
        } catch (err) {
            alert(err.message || "删除失败");
        }
    };

    const cardBg = isDarkMode ? "bg-gray-900 border border-gray-800" : "bg-white border border-gray-200";
    const inputClass = `border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'}`;
    const formatDate = (value) => (value ? new Date(value).toLocaleString() : "—");

    const totalPages = Math.max(Math.ceil(total / size), 1);

    return (
        <div className="space-y-8">
            <div className={`${cardBg} p-6 rounded-lg shadow-lg`}>
                <div className="flex items-center gap-3 mb-4">
                    <Tag className="text-[#FF0080]" />
                    <h2 className="text-2xl font-bold">新增标签</h2>
                </div>
                <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs uppercase tracking-wide text-gray-500">名称</label>
                        <input
                            className={inputClass}
                            value={form.name}
                            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                            placeholder="例如：Spring Cloud"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs uppercase tracking-wide text-gray-500 flex items-center gap-1">
                            别名 / Slug <span className="text-gray-400">(可选)</span>
                        </label>
                        <input
                            className={inputClass}
                            value={form.slug}
                            onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                            placeholder="例如：spring-cloud"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs uppercase tracking-wide text-gray-500">描述</label>
                        <input
                            className={inputClass}
                            value={form.description}
                            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                            placeholder="一句话说明用途"
                        />
                    </div>
                </div>
                <PopButton onClick={handleCreate} icon={Plus} disabled={saving} className="px-6">
                    {saving ? "保存中..." : "保存标签"}
                </PopButton>
            </div>

            <div className={`${cardBg} p-6 rounded-lg shadow-lg`}>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
                    <div>
                        <h2 className="text-2xl font-bold">标签列表</h2>
                        <p className="text-sm text-gray-500 mt-1">共 {total} 个标签</p>
                    </div>
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="flex items-center gap-2">
                            <input
                                className={inputClass}
                                placeholder="输入关键词搜索"
                                value={keyword}
                                onChange={(e) => {
                                    setKeyword(e.target.value);
                                    setPage(1);
                                }}
                            />
                            <button
                                onClick={loadTags}
                                className="flex items-center gap-2 text-sm font-bold text-indigo-500 hover:text-indigo-400"
                            >
                                <RefreshCw size={16} /> 查询
                            </button>
                        </div>
                        <select
                            className={inputClass}
                            value={size}
                            onChange={(e) => {
                                setSize(Number(e.target.value));
                                setPage(1);
                            }}
                        >
                            {[5, 10, 20, 50].map((option) => (
                                <option key={option} value={option}>
                                    每页 {option} 条
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
                {loading ? (
                    <p className="text-center py-10 text-gray-500">加载中...</p>
                ) : tags.length === 0 ? (
                    <p className="text-center py-10 text-gray-500">暂无标签</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full table-auto text-sm">
                            <thead>
                                <tr className={isDarkMode ? "bg-gray-800" : "bg-gray-100"}>
                                    <th className="px-4 py-2 text-left font-semibold">名称</th>
                                    <th className="px-4 py-2 text-left font-semibold">别名</th>
                                    <th className="px-4 py-2 text-left font-semibold">描述</th>
                                    <th className="px-4 py-2 text-left font-semibold">更新时间</th>
                                    <th className="px-4 py-2 text-right font-semibold">操作</th>
                                </tr>
                            </thead>
                            <tbody className={isDarkMode ? "divide-y divide-gray-800" : "divide-y divide-gray-200"}>
                                {tags.map((tag) => (
                                    <tr key={tag.id} className={isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-50"}>
                                        <td className="px-4 py-3 font-semibold">
                                            {editingId === tag.id ? (
                                                <input
                                                    className={inputClass}
                                                    value={editForm.name}
                                                    onChange={(e) => setEditForm((prev) => ({
                                                        ...prev,
                                                        name: e.target.value
                                                    }))}
                                                />
                                            ) : (
                                                tag.name
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {editingId === tag.id ? (
                                                <input
                                                    className={inputClass}
                                                    value={editForm.slug}
                                                    onChange={(e) => setEditForm((prev) => ({
                                                        ...prev,
                                                        slug: e.target.value
                                                    }))}
                                                />
                                            ) : (
                                                <code
                                                    className="px-2 py-1 text-xs bg-black/5 dark:bg-white/10 rounded">{tag.slug}</code>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {editingId === tag.id ? (
                                                <input
                                                    className={inputClass}
                                                    value={editForm.description}
                                                    onChange={(e) => setEditForm((prev) => ({
                                                        ...prev,
                                                        description: e.target.value
                                                    }))}
                                                />
                                            ) : (
                                                tag.description || "—"
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-gray-500">{formatDate(tag.updatedAt || tag.createdAt)}</td>
                                        <td className="px-4 py-3 text-right space-x-2">
                                            {editingId === tag.id ? (
                                                <>
                                                    <button
                                                        onClick={handleUpdate}
                                                        className="inline-flex items-center gap-1 px-3 py-1 border-2 border-green-500 text-green-600 font-bold text-xs"
                                                        disabled={saving}
                                                    >
                                                        <Save size={14} /> 保存
                                                    </button>
                                                    <button
                                                        onClick={cancelEdit}
                                                        className="inline-flex items-center gap-1 px-3 py-1 border-2 border-gray-400 text-gray-500 font-bold text-xs"
                                                    >
                                                        取消
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => startEdit(tag)}
                                                        className="inline-flex items-center gap-1 px-3 py-1 border-2 border-indigo-500 text-indigo-600 font-bold text-xs"
                                                    >
                                                        <Edit size={14} /> 编辑
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(tag.id)}
                                                        className="inline-flex items-center gap-1 px-3 py-1 border-2 border-red-500 text-red-600 font-bold text-xs"
                                                    >
                                                        <Trash2 size={14} /> 删除
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="flex flex-col md:flex-row items-center justify-between mt-4 gap-3">
                    <p className="text-sm text-gray-500">
                        第 {page} / {totalPages} 页（共 {total} 条）
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage((p) => Math.max(p - 1, 1))}
                            disabled={page === 1}
                            className="px-3 py-1 border-2 border-black font-bold disabled:opacity-50"
                        >
                            上一页
                        </button>
                        <button
                            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                            disabled={page >= totalPages}
                            className="px-3 py-1 border-2 border-black font-bold disabled:opacity-50"
                        >
                            下一页
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const CategoriesView = ({ isDarkMode }) => {
    const [categories, setCategories] = useState([]);
    const [parentOptions, setParentOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [form, setForm] = useState({ name: "", slug: "", description: "", parentId: "", sortOrder: "" });
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ name: "", slug: "", description: "", parentId: "", sortOrder: "" });
    const [saving, setSaving] = useState(false);
    const [keyword, setKeyword] = useState("");
    const [parentFilter, setParentFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [size, setSize] = useState(10);
    const [total, setTotal] = useState(0);

    const loadParentOptions = useCallback(async () => {
        try {
            const res = await fetchCategories();
            const data = res.data || res || [];
            setParentOptions(data.map((item) => ({ id: item.id, label: item.label })));
        } catch (err) {
            console.warn("load parent categories failed", err);
        }
    }, []);

    const loadCategories = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = { keyword, page, size };
            if (parentFilter === "root") params.parentId = 0;
            else if (parentFilter !== "all") params.parentId = parentFilter;
            const res = await adminFetchCategories(params);
            const data = res.data || res;
            setCategories(data?.records || []);
            setTotal(data?.total || 0);
        } catch (err) {
            setError(err.message || "加载分类失败");
        } finally {
            setLoading(false);
        }
    }, [keyword, page, size, parentFilter]);

    useEffect(() => {
        loadParentOptions();
    }, [loadParentOptions]);

    useEffect(() => {
        loadCategories();
    }, [loadCategories]);

    const normalizePayload = (payload) => ({
        name: payload.name.trim(),
        slug: payload.slug.trim() || undefined,
        description: payload.description.trim() || undefined,
        parentId: payload.parentId === "" ? null : Number(payload.parentId),
        sortOrder: payload.sortOrder === "" ? undefined : Number(payload.sortOrder),
    });

    const handleCreate = async () => {
        if (!form.name.trim()) {
            alert("请输入分类名称");
            return;
        }
        setSaving(true);
        try {
            await adminCreateCategory(normalizePayload(form));
            setForm({ name: "", slug: "", description: "", parentId: "", sortOrder: "" });
            setPage(1);
            await loadParentOptions();
            await loadCategories();
            alert("分类创建成功");
        } catch (err) {
            alert(err.message || "创建失败");
        } finally {
            setSaving(false);
        }
    };

    const startEdit = (category) => {
        setEditingId(category.id);
        setEditForm({
            name: category.name || "",
            slug: category.slug || "",
            description: category.description || "",
            parentId: category.parentId ?? "",
            sortOrder: category.sortOrder ?? "",
        });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm({ name: "", slug: "", description: "", parentId: "", sortOrder: "" });
    };

    const handleUpdate = async () => {
        if (!editingId) return;
        if (!editForm.name.trim()) {
            alert("请输入分类名称");
            return;
        }
        setSaving(true);
        try {
            await adminUpdateCategory(editingId, normalizePayload(editForm));
            cancelEdit();
            await loadParentOptions();
            await loadCategories();
            alert("分类已更新");
        } catch (err) {
            alert(err.message || "更新失败");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (categoryId) => {
        if (!window.confirm("确定要删除该分类吗？删除前请确保没有子分类。")) return;
        try {
            await adminDeleteCategory(categoryId);
            if (editingId === categoryId) cancelEdit();
            const newTotal = Math.max(total - 1, 0);
            const maxPage = Math.max(Math.ceil(newTotal / size), 1);
            if (page > maxPage) {
                setPage(maxPage);
            }
            await loadCategories();
        } catch (err) {
            alert(err.message || "删除失败");
        }
    };

    const totalPages = Math.max(Math.ceil(total / size), 1);
    const cardBg = isDarkMode ? "bg-gray-900 border border-gray-800" : "bg-white border border-gray-200";
    const inputClass = `border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'}`;
    const formatDate = (value) => (value ? new Date(value).toLocaleString() : "—");

    return (
        <div className="space-y-8">
            <div className={`${cardBg} p-6 rounded-lg shadow-lg`}>
                <div className="flex items-center gap-3 mb-4">
                    <Layers className="text-[#6366F1]" />
                    <div>
                        <h2 className="text-2xl font-bold">新增/编辑分类</h2>
                        <p className="text-sm text-gray-500">支持两级分类，选择父级时仅可选择一级分类。</p>
                    </div>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs uppercase tracking-wide text-gray-500">名称</label>
                        <input
                            className={inputClass}
                            value={form.name}
                            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                            placeholder="例如：硬核编程"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs uppercase tracking-wide text-gray-500">别名 / Slug (可选)</label>
                        <input
                            className={inputClass}
                            value={form.slug}
                            onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                            placeholder="例如：hardcore-dev"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs uppercase tracking-wide text-gray-500">父级分类</label>
                        <select
                            className={inputClass}
                            value={form.parentId}
                            onChange={(e) => setForm((prev) => ({ ...prev, parentId: e.target.value }))}
                        >
                            <option value="">一级分类（无父级）</option>
                            {parentOptions.map((opt) => (
                                <option key={opt.id} value={opt.id}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs uppercase tracking-wide text-gray-500">排序值 (可选)</label>
                        <input
                            className={inputClass}
                            value={form.sortOrder}
                            onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
                            placeholder="数字越小越靠前"
                        />
                    </div>
                    <div className="flex flex-col gap-1 md:col-span-2 lg:col-span-3">
                        <label className="text-xs uppercase tracking-wide text-gray-500">描述</label>
                        <input
                            className={inputClass}
                            value={form.description}
                            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                            placeholder="一句话说明分类用途"
                        />
                    </div>
                </div>
                <PopButton onClick={handleCreate} icon={Plus} disabled={saving} className="px-6">
                    {saving ? "保存中..." : "保存分类"}
                </PopButton>
            </div>

            <div className={`${cardBg} p-6 rounded-lg shadow-lg`}>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
                    <div>
                        <h2 className="text-2xl font-bold">分类列表</h2>
                        <p className="text-sm text-gray-500 mt-1">共 {total} 个分类</p>
                    </div>
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="flex items-center gap-2">
                            <input
                                className={inputClass}
                                placeholder="输入关键词搜索"
                                value={keyword}
                                onChange={(e) => {
                                    setKeyword(e.target.value);
                                    setPage(1);
                                }}
                            />
                            <button
                                onClick={loadCategories}
                                className="flex items-center gap-2 text-sm font-bold text-indigo-500 hover:text-indigo-400"
                            >
                                <RefreshCw size={16} /> 查询
                            </button>
                        </div>
                        <select
                            className={inputClass}
                            value={parentFilter}
                            onChange={(e) => {
                                setParentFilter(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="all">全部分类</option>
                            <option value="root">仅一级分类</option>
                            {parentOptions.map((opt) => (
                                <option key={opt.id} value={opt.id}>仅查看 {opt.label} 下的子分类</option>
                            ))}
                        </select>
                        <select
                            className={inputClass}
                            value={size}
                            onChange={(e) => {
                                setSize(Number(e.target.value));
                                setPage(1);
                            }}
                        >
                            {[5, 10, 20, 50].map((option) => (
                                <option key={option} value={option}>
                                    每页 {option} 条
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
                {loading ? (
                    <p className="text-center py-10 text-gray-500">加载中...</p>
                ) : categories.length === 0 ? (
                    <p className="text-center py-10 text-gray-500">暂无分类</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full table-auto text-sm">
                            <thead>
                                <tr className={isDarkMode ? "bg-gray-800" : "bg-gray-100"}>
                                    <th className="px-4 py-2 text-left font-semibold">名称</th>
                                    <th className="px-4 py-2 text-left font-semibold">别名</th>
                                    <th className="px-4 py-2 text-left font-semibold">父级</th>
                                    <th className="px-4 py-2 text-left font-semibold">排序</th>
                                    <th className="px-4 py-2 text-left font-semibold">描述</th>
                                    <th className="px-4 py-2 text-left font-semibold">更新时间</th>
                                    <th className="px-4 py-2 text-right font-semibold">操作</th>
                                </tr>
                            </thead>
                            <tbody className={isDarkMode ? "divide-y divide-gray-800" : "divide-y divide-gray-200"}>
                                {categories.map((category) => (
                                    <tr key={category.id} className={isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-50"}>
                                        <td className="px-4 py-3 font-semibold">
                                            {editingId === category.id ? (
                                                <input
                                                    className={inputClass}
                                                    value={editForm.name}
                                                    onChange={(e) => setEditForm((prev) => ({
                                                        ...prev,
                                                        name: e.target.value
                                                    }))}
                                                />
                                            ) : (
                                                category.name
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {editingId === category.id ? (
                                                <input
                                                    className={inputClass}
                                                    value={editForm.slug}
                                                    onChange={(e) => setEditForm((prev) => ({
                                                        ...prev,
                                                        slug: e.target.value
                                                    }))}
                                                />
                                            ) : (
                                                <code
                                                    className="px-2 py-1 text-xs bg-black/5 dark:bg-white/10 rounded">{category.slug}</code>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {editingId === category.id ? (
                                                <select
                                                    className={inputClass}
                                                    value={editForm.parentId}
                                                    onChange={(e) => setEditForm((prev) => ({
                                                        ...prev,
                                                        parentId: e.target.value
                                                    }))}
                                                >
                                                    <option value="">一级分类（无父级）</option>
                                                    {parentOptions.map((opt) => (
                                                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                category.parentName || "一级分类"
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {editingId === category.id ? (
                                                <input
                                                    className={inputClass}
                                                    value={editForm.sortOrder}
                                                    onChange={(e) => setEditForm((prev) => ({
                                                        ...prev,
                                                        sortOrder: e.target.value
                                                    }))}
                                                />
                                            ) : (
                                                category.sortOrder ?? "—"
                                            )}
                                        </td>
                                        <td className="px-4 py-3">{editingId === category.id ? (
                                            <input
                                                className={inputClass}
                                                value={editForm.description}
                                                onChange={(e) => setEditForm((prev) => ({
                                                    ...prev,
                                                    description: e.target.value
                                                }))}
                                            />
                                        ) : (
                                            category.description || "—"
                                        )}</td>
                                        <td className="px-4 py-3 text-gray-500">{formatDate(category.updatedAt || category.createdAt)}</td>
                                        <td className="px-4 py-3 text-right space-x-2">
                                            {editingId === category.id ? (
                                                <>
                                                    <button
                                                        onClick={handleUpdate}
                                                        className="inline-flex items-center gap-1 px-3 py-1 border-2 border-green-500 text-green-600 font-bold text-xs"
                                                        disabled={saving}
                                                    >
                                                        <Save size={14} /> 保存
                                                    </button>
                                                    <button
                                                        onClick={cancelEdit}
                                                        className="inline-flex items-center gap-1 px-3 py-1 border-2 border-gray-400 text-gray-500 font-bold text-xs"
                                                    >
                                                        取消
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => startEdit(category)}
                                                        className="inline-flex items-center gap-1 px-3 py-1 border-2 border-indigo-500 text-indigo-600 font-bold text-xs"
                                                    >
                                                        <Edit size={14} /> 编辑
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(category.id)}
                                                        className="inline-flex items-center gap-1 px-3 py-1 border-2 border-red-500 text-red-600 font-bold text-xs"
                                                    >
                                                        <Trash2 size={14} /> 删除
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="flex flex-col md:flex-row items-center justify-between mt-4 gap-3">
                    <p className="text-sm text-gray-500">
                        第 {page} / {totalPages} 页（共 {total} 条）
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage((p) => Math.max(p - 1, 1))}
                            disabled={page === 1}
                            className="px-3 py-1 border-2 border-black font-bold disabled:opacity-50"
                        >
                            上一页
                        </button>
                        <button
                            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                            disabled={page >= totalPages}
                            className="px-3 py-1 border-2 border-black font-bold disabled:opacity-50"
                        >
                            下一页
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};


const EditPostView = ({ isDarkMode }) => {
    const navigate = useNavigate();
    const { categories } = useBlog();
    const { hasPermission, loading: permLoading } = usePermissionContext();
    const [searchParams, setSearchParams] = useSearchParams();
    const initialId = searchParams.get('postId');
    const normalizedInitialId = initialId && !Number.isNaN(Number(initialId)) ? Number(initialId) : null;
    const [selectedPostId, setSelectedPostId] = useState(normalizedInitialId);
    const [selectorKeyword, setSelectorKeyword] = useState('');
    const [selectorPage, setSelectorPage] = useState(1);
    const [selectorTotal, setSelectorTotal] = useState(0);
    const [selectorPosts, setSelectorPosts] = useState([]);
    const [selectorLoading, setSelectorLoading] = useState(false);
    const [selectorError, setSelectorError] = useState('');
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState('');
    const [tags, setTags] = useState([]);
    const [form, setForm] = useState({
        title: '',
        slug: '',
        excerpt: '',
        mdContent: '',
        themeColor: '',
        status: 'DRAFT'
    });
    const [selectedParentId, setSelectedParentId] = useState(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);
    const [selectedTags, setSelectedTags] = useState([]);
    const [markdownFileName, setMarkdownFileName] = useState('');
    const [markdownMessage, setMarkdownMessage] = useState('');
    const [imageUploadMessage, setImageUploadMessage] = useState('');
    const [uploadingImages, setUploadingImages] = useState(false);
    const [assetsFolder, setAssetsFolder] = useState('');
    const [hasManualThemeColorEdit, setHasManualThemeColorEdit] = useState(false);
    const [saving, setSaving] = useState(false);
    const [submitNotice, setSubmitNotice] = useState('');
    const [submitError, setSubmitError] = useState('');
    const markdownEditorRef = useRef(null);
    const markdownFileInputRef = useRef(null);
    const inlineImageInputRef = useRef(null);
    const [postMeta, setPostMeta] = useState({ publishedAt: null });
    const selectorPageSize = 8;
    const {
        notice: editNotice,
        showNotice: showEditNotice,
        hideNotice: hideEditNotice
    } = useTimedNotice(4200);

    const surface = isDarkMode ? THEME.colors.surfaceDark : THEME.colors.surfaceLight;
    const text = isDarkMode ? 'text-gray-200' : 'text-gray-800';
    const inputClass = `w-full p-3 border-2 rounded-md transition-all ${isDarkMode ? 'bg-gray-800 border-gray-600 text-white focus:border-indigo-500' : 'bg-white border-gray-300 text-black focus:border-indigo-500'}`;
    const statusOptions = [
        { value: 'DRAFT', label: '草稿' },
        { value: 'PUBLISHED', label: '已发布' },
        { value: 'ARCHIVED', label: '已归档' },
    ];

    useEffect(() => {
        const paramId = searchParams.get('postId');
        if (paramId) {
            const numeric = Number(paramId);
            if (!Number.isNaN(numeric) && numeric !== selectedPostId) {
                setSelectedPostId(numeric);
            }
        }
    }, [searchParams, selectedPostId]);

    useEffect(() => {
        const loadTags = async () => {
            try {
                const res = await fetchTags();
                const data = res.data || res;
                setTags(data || []);
            } catch (error) {
                console.warn('load tags failed', error);
            }
        };
        loadTags();
    }, []);

    const normalizedCategories = useMemo(() => (categories || []).filter((cat) => typeof cat.id === 'number'), [categories]);
    const activeParent = normalizedCategories.find((cat) => Number(cat.id) === Number(selectedParentId)) || normalizedCategories[0];

    useEffect(() => {
        if (!selectedParentId && activeParent) {
            setSelectedParentId(Number(activeParent.id));
        }
    }, [activeParent, selectedParentId]);

    const secondLevelCategories = activeParent?.children || [];
    const selectorTotalPages = Math.max(Math.ceil(selectorTotal / selectorPageSize), 1);

    const loadSelectorPosts = useCallback(async () => {
        if (selectedPostId) return;
        setSelectorLoading(true);
        setSelectorError('');
        try {
            const res = await adminFetchPosts({ keyword: selectorKeyword, page: selectorPage, size: selectorPageSize });
            const data = res.data || res;
            setSelectorPosts(data?.records || []);
            setSelectorTotal(data?.total || 0);
        } catch (err) {
            setSelectorError(err.message || '获取文章失败');
        } finally {
            setSelectorLoading(false);
        }
    }, [selectedPostId, selectorKeyword, selectorPage]);

    useEffect(() => {
        if (!selectedPostId) {
            loadSelectorPosts();
        }
    }, [selectedPostId, loadSelectorPosts]);

    useEffect(() => {
        if (form.slug && assetsFolder !== form.slug) {
            setAssetsFolder(form.slug);
        }
    }, [form.slug, assetsFolder]);

    const loadPostDetail = useCallback(async (id) => {
        if (!id) return;
        setDetailLoading(true);
        setDetailError('');
        try {
            const res = await adminFetchPostDetail(id);
            const data = res.data || res;
            setForm({
                title: data.title || '',
                slug: data.slug || '',
                excerpt: data.excerpt || '',
                mdContent: data.contentMd || '',
                themeColor: data.themeColor || '',
                status: data.status || 'DRAFT'
            });
            setSelectedCategoryId(data.categoryId ? Number(data.categoryId) : null);
            setSelectedParentId(data.parentCategoryId ? Number(data.parentCategoryId) : null);
            setSelectedTags((data.tagIds || []).map((tid) => Number(tid)));
            setAssetsFolder(data.slug || '');
            setHasManualThemeColorEdit(false);
            setPostMeta({ publishedAt: data.publishedAt || null });
            setSubmitNotice('');
            setSubmitError('');
            setMarkdownFileName('');
            setMarkdownMessage('');
            setImageUploadMessage('');
        } catch (err) {
            setDetailError(err.message || '加载文章详情失败');
        } finally {
            setDetailLoading(false);
        }
    }, []);

    useEffect(() => {
        if (selectedPostId) {
            loadPostDetail(selectedPostId);
            setSearchParams({ postId: selectedPostId });
        }
    }, [selectedPostId, loadPostDetail, setSearchParams]);

    useEffect(() => {
        if (!submitNotice) return;
        showEditNotice(submitNotice);
    }, [submitNotice, showEditNotice]);

    const ensureAssetsFolder = useCallback(async () => {
        if (assetsFolder) {
            return assetsFolder;
        }
        const seed = form.slug || undefined;
        const res = await reservePostAssetsFolder(seed);
        const folder = res?.data?.folder || res?.folder || seed;
        if (!folder) {
            throw new Error('未能获取资源目录');
        }
        setAssetsFolder(folder);
        return folder;
    }, [assetsFolder, form.slug]);

    const insertImagesAtCursor = useCallback((urls = []) => {
        if (!urls.length) return;
        const snippet =
            urls.map((url, index) => `![${form.title || `图片${index + 1}`}](${url})`).join('\n') + '\n';
        setForm((prev) => {
            const current = prev.mdContent || '';
            const textarea = markdownEditorRef.current;
            if (!textarea) {
                const prefix = current.endsWith('\n') || current.length === 0 ? current : `${current}\n`;
                return { ...prev, mdContent: `${prefix}${snippet}` };
            }
            const start = textarea.selectionStart ?? current.length;
            const end = textarea.selectionEnd ?? start;
            const before = current.slice(0, start);
            const after = current.slice(end);
            const normalizedBefore = before && !before.endsWith('\n') ? `${before}\n` : before;
            const normalizedAfter = after.startsWith('\n') || after.length === 0 ? after : `\n${after}`;
            const nextContent = `${normalizedBefore}${snippet}${normalizedAfter}`;
            const cursorPos = (normalizedBefore + snippet).length;
            requestAnimationFrame(() => {
                const el = markdownEditorRef.current;
                if (el) {
                    el.focus();
                    el.selectionStart = cursorPos;
                    el.selectionEnd = cursorPos;
                }
            });
            return { ...prev, mdContent: nextContent };
        });
    }, [form.title]);

    const handleMarkdownUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            const textContent = await file.text();
            setForm((prev) => ({ ...prev, mdContent: textContent }));
            setMarkdownFileName(file.name);
            setMarkdownMessage(`已加载 ${file.name}`);
            if (!form.title.trim()) {
                const inferred = file.name.replace(/\.(md|markdown|txt)$/i, '');
                setForm((prev) => ({ ...prev, title: prev.title || inferred }));
            }
            if (!form.excerpt.trim()) {
                const plain = textContent.replace(/[#>*_`-]/g, '').replace(/\s+/g, ' ').trim();
                setForm((prev) => ({ ...prev, excerpt: prev.excerpt || plain.slice(0, 160) }));
            }
        } catch (error) {
            setMarkdownMessage(error.message || '读取 Markdown 失败');
        } finally {
            event.target.value = null;
        }
    };

    const handleInlineImageUpload = async (event) => {
        const files = Array.from(event.target.files || []);
        if (!files.length) return;
        setUploadingImages(true);
        setImageUploadMessage('图片上传中...');
        try {
            const folder = await ensureAssetsFolder();
            const res = await uploadPostAssets(files, folder);
            const data = res.data || res;
            const urls = data?.urls || [];
            if (urls.length) {
                insertImagesAtCursor(urls);
                setImageUploadMessage('已插入图片链接');
            } else {
                setImageUploadMessage('上传成功');
            }
        } catch (error) {
            setImageUploadMessage(error.message || '图片上传失败');
        } finally {
            setUploadingImages(false);
            if (event?.target) {
                event.target.value = null;
            }
        }
    };

    const toggleTag = (id) => {
        const tagId = Number(id);
        setSelectedTags((prev) => (prev.includes(tagId) ? prev.filter((value) => value !== tagId) : [...prev, tagId]));
    };

    const canSave = Boolean(
        selectedPostId &&
        form.title.trim() &&
        form.slug.trim() &&
        form.mdContent.trim() &&
        selectedCategoryId &&
        selectedTags.length > 0 &&
        form.status
    );

    const handleSave = async () => {
        if (!canSave || saving || !selectedPostId) return;
        setSaving(true);
        setSubmitNotice('');
        setSubmitError('');
        try {
            const payload = {
                title: form.title.trim(),
                slug: form.slug.trim(),
                excerpt: form.excerpt?.trim() || form.mdContent.replace(/\s+/g, ' ').slice(0, 160),
                contentMd: form.mdContent,
                themeColor: form.themeColor?.trim() || undefined,
                categoryId: selectedCategoryId,
                tagIds: selectedTags,
                status: form.status,
            };
            const res = await updatePost(selectedPostId, payload);
            const data = res.data || res;
            setSubmitNotice(`已保存（ID: ${data?.summary?.id || selectedPostId}）`);
            setPostMeta((prev) => ({ ...prev, publishedAt: data?.summary?.date || prev.publishedAt }));
        } catch (error) {
            setSubmitError(error.message || '保存失败');
        } finally {
            setSaving(false);
        }
    };

    const resetSelection = () => {
        setSelectedPostId(null);
        setSearchParams({});
        setForm({ title: '', slug: '', excerpt: '', mdContent: '', themeColor: '', status: 'DRAFT' });
        setSelectedCategoryId(null);
        setSelectedParentId(null);
        setSelectedTags([]);
        setAssetsFolder('');
        setSubmitNotice('');
        setSubmitError('');
    };

    const handleInlineImageUploadEdit = async (event) => {
        const files = Array.from(event.target.files || []);
        if (!files.length) return;
        setUploadingImages(true);
        setImageUploadMessage('图片上传中...');
        try {
            const slug = await ensureAssetsFolder();
            const res = await uploadPostAssets(files, slug);
            const data = res.data || res;
            if (data?.folder && data.folder !== assetsFolder) setAssetsFolder(data.folder);
            const urls = data?.urls || [];
            const uploaded = urls.length;
            if (!uploaded) {
                setImageUploadMessage('上传成功');
            } else {
                const filenameToUrl = {};
                files.forEach((file, idx) => {
                    const url = urls[idx] || urls[urls.length - 1];
                    filenameToUrl[file.name] = url;
                });

                const beforeCount = countImagesInContent(form.mdContent);
                let replacedCount = 0;
                let nextContent = (form.mdContent || '').replace(/!\[[^\]]*]\(([^)]+)\)/g, (full, path) => {
                    const filename = path.split(/[/\\\\]/).pop();
                    if (filename && filenameToUrl[filename]) {
                        const url = filenameToUrl[filename];
                        delete filenameToUrl[filename];
                        replacedCount += 1;
                        return full.replace(path, url);
                    }
                    return full;
                });

                const remainingUrls = Object.values(filenameToUrl);
                if (remainingUrls.length) {
                    const snippet = remainingUrls.map((url, index) => `![${files[index]?.name || `图片${index + 1}`}](${url})`).join("\n");
                    const prefix = nextContent.endsWith("\n") || nextContent.length === 0 ? "" : "\n";
                    nextContent = `${nextContent}${prefix}${snippet}\n`;
                }

                setForm((prev) => ({ ...prev, mdContent: nextContent }));

                const message = `已上传 ${uploaded} 张，匹配替换 ${replacedCount} 张`;
                const totalDetected = beforeCount;
                const complete = totalDetected === 0 || replacedCount === totalDetected;
                setImageUploadMessage(`${message}，${complete ? '导入成功！' : '自动导入不全，请手动导入！'}`);
            }
        } catch (error) {
            setImageUploadMessage(error.message || '图片上传失败');
        } finally {
            setUploadingImages(false);
            if (event?.target) event.target.value = null;
        }
    };

    if (permLoading) {
        return <div className="p-10 text-center text-sm text-gray-500">权限信息加载中...</div>;
    }

    if (!hasPermission('POST_EDIT')) {
        return (
            <PermissionNotice
                title="无法访问文章编辑"
                description="当前账号未被授予“编辑文章”权限，请联系超级管理员在权限管理页开启。"
            />
        );
    }

    if (!selectedPostId) {
        return (
            <div className="space-y-6">
                <AdminNoticeBar notice={editNotice} onClose={hideEditNotice} />
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm uppercase tracking-[0.4em] text-gray-400">Admin</p>
                        <h2 className="text-3xl font-black text-pink-500">选择要编辑的文章</h2>
                    </div>
                    <button
                        className="text-sm text-indigo-500 hover:text-indigo-400"
                        onClick={() => navigate('/admin/posts')}
                    >
                        返回文章列表
                    </button>
                </div>
                <div
                    className={`${surface} p-6 rounded-2xl shadow-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} space-y-4`}>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                            <h3 className={`text-xl font-semibold ${text}`}>从列表选择文章</h3>
                            <p className="text-sm text-gray-500">未携带 postId 时，需要在此选定目标文章。</p>
                        </div>
                        <div className="flex gap-2">
                            <input
                                className="px-3 py-2 border border-black rounded text-sm"
                                placeholder="搜索标题或 Slug"
                                value={selectorKeyword}
                                onChange={(e) => {
                                    setSelectorKeyword(e.target.value);
                                    setSelectorPage(1);
                                }}
                            />
                            <button
                                className="px-4 py-2 border-2 border-black font-bold"
                                onClick={loadSelectorPosts}
                            >
                                搜索
                            </button>
                        </div>
                    </div>
                    {selectorError && <div className="text-sm text-red-500">{selectorError}</div>}
                    {selectorLoading ? (
                        <p className="text-gray-500">加载文章中...</p>
                    ) : (
                        <div className="space-y-2">
                            {selectorPosts.map((post) => (
                                <div
                                    key={post.id}
                                    className={`p-4 border rounded-xl cursor-pointer flex items-center justify-between ${isDarkMode ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-100'}`}
                                    onClick={() => setSelectedPostId(post.id)}
                                >
                                    <div>
                                        <p className="font-semibold">{post.title}</p>
                                        <p className="text-xs text-gray-500">Slug：{post.slug}</p>
                                    </div>
                                    <div
                                        className="text-xs text-gray-500">{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : '未发布'}</div>
                                </div>
                            ))}
                            {selectorPosts.length === 0 && <p className="text-gray-500">未找到文章</p>}
                        </div>
                    )}
                    <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>第 {selectorPage} / {selectorTotalPages} 页</span>
                        <div className="space-x-2">
                            <button
                                onClick={() => setSelectorPage((p) => Math.max(p - 1, 1))}
                                disabled={selectorPage === 1}
                                className="px-3 py-1 border border-black disabled:opacity-50"
                            >
                                上一页
                            </button>
                            <button
                                onClick={() => setSelectorPage((p) => Math.min(p + 1, selectorTotalPages))}
                                disabled={selectorPage >= selectorTotalPages}
                                className="px-3 py-1 border border-black disabled:opacity-50"
                            >
                                下一页
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <AdminNoticeBar notice={editNotice} onClose={hideEditNotice} />
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <p className="text-sm uppercase tracking-[0.4em] text-gray-400">Admin</p>
                    <h2 className="text-3xl font-black italic text-pink-500">编辑文章</h2>
                    <p className="text-sm text-gray-500 mt-1">ID：{selectedPostId}，上次发布时间：{postMeta.publishedAt ? new Date(postMeta.publishedAt).toLocaleString() : '未发布'}</p>
                </div>
                <div className="flex gap-3">
                    <button
                        className="text-sm text-indigo-500 hover:text-indigo-400"
                        onClick={() => navigate('/admin/posts')}
                    >
                        返回文章列表
                    </button>
                    <button
                        className="text-sm text-gray-500 hover:text-gray-700"
                        onClick={resetSelection}
                    >
                        切换文章
                    </button>
                </div>
            </div>

            {detailError && <div className="text-sm text-red-500">{detailError}</div>}
            {detailLoading ? (
                <div
                    className={`${surface} p-6 rounded-2xl shadow-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} text-gray-500`}>
                    正在加载文章详情...
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    <div className="xl:col-span-2 space-y-6">
                        <div
                            className={`${surface} p-6 rounded-2xl shadow-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} space-y-4`}>
                            <label className="text-sm font-semibold text-gray-500 dark:text-gray-400">文章标题</label>
                            <input
                                value={form.title}
                                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                                placeholder="请输入文章标题"
                                className={`${inputClass} text-2xl font-bold`}
                            />
                        </div>

                        <div
                            className={`${surface} p-6 rounded-2xl shadow-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} space-y-4`}>
                            <div
                                className="flex flex-col gap-3 border-b pb-3 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <h3 className={`font-semibold ${text}`}>Markdown 正文</h3>
                                    <p className="text-xs text-gray-500">在当前光标插入图片或重新上传 Markdown 文件。</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        className="text-sm text-indigo-500 flex items-center gap-1 hover:text-indigo-400"
                                        onClick={() => markdownFileInputRef.current?.click()}
                                    >
                                        <Upload size={16} /> 上传 .md
                                    </button>
                                    <button
                                        type="button"
                                        disabled={uploadingImages}
                                        className={`text-sm flex items-center gap-1 ${uploadingImages ? 'text-gray-400 cursor-not-allowed' : 'text-pink-500 hover:text-pink-400'}`}
                                        onClick={() => inlineImageInputRef.current?.click()}
                                    >
                                        <ImagePlus size={16} /> {uploadingImages ? '插图处理中' : '插入图片'}
                                    </button>
                                </div>
                                <input
                                    type="file"
                                    accept=".md,.markdown,.txt"
                                    ref={markdownFileInputRef}
                                    className="hidden"
                                    onChange={handleMarkdownUpload}
                                />
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    ref={inlineImageInputRef}
                                    className="hidden"
                                    onChange={handleInlineImageUploadEdit}
                                />
                            </div>
                            {(markdownFileName || imageUploadMessage) && (
                                <div className="text-xs space-y-1">
                                    {markdownFileName && (
                                        <div className="text-emerald-500 flex items-center gap-1">
                                            <CheckCircle size={14} /> {markdownMessage || markdownFileName}
                                        </div>
                                    )}
                                    {imageUploadMessage && (
                                        <div className="text-indigo-500 flex items-center gap-1">
                                            <ImagePlus size={14} /> {imageUploadMessage}
                                        </div>
                                    )}
                                </div>
                            )}
                            <textarea
                                ref={markdownEditorRef}
                                className={`${inputClass} min-h-[420px] font-mono text-sm`}
                                value={form.mdContent}
                                onChange={(e) => setForm((prev) => ({ ...prev, mdContent: e.target.value }))}
                                placeholder="在此粘贴或编写 Markdown 内容"
                            />
                        </div>

                        <div
                            className={`${surface} p-6 rounded-2xl shadow-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} space-y-3`}>
                            <label
                                className="text-sm font-semibold text-gray-500 dark:text-gray-400">文章摘要（可选）</label>
                            <textarea
                                className={`${inputClass} min-h-[120px]`}
                                value={form.excerpt}
                                onChange={(e) => setForm((prev) => ({ ...prev, excerpt: e.target.value }))}
                                placeholder="用于首页卡片展示，若留空则自动截取正文"
                            />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div
                            className={`${surface} p-6 rounded-2xl shadow-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} space-y-4`}>
                            <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Step 1</p>
                            <h3 className="font-semibold flex items-center gap-2"><FolderPlus size={16} /> 选择二级分类
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {normalizedCategories.map((cat) => {
                                    const catId = Number(cat.id);
                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => {
                                                setSelectedParentId(catId);
                                                setSelectedCategoryId(null);
                                            }}
                                            className={`px-3 py-1 text-xs rounded-full border ${selectedParentId === catId ? 'bg-pink-500 text-white border-pink-500' : 'border-gray-300 dark:border-gray-600'}`}
                                        >
                                            {cat.label}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {secondLevelCategories.map((child, idx) => {
                                    const childId = Number(child.id);
                                    const presetColor = THEME_COLOR_PRESETS[idx];
                                    return (
                                        <button
                                            key={child.id}
                                            onClick={() => {
                                                setSelectedCategoryId(childId);
                                                if (presetColor && !hasManualThemeColorEdit) {
                                                    setForm((prev) => ({ ...prev, themeColor: presetColor }));
                                                }
                                            }}
                                            className={`p-3 rounded-xl border text-left text-sm ${selectedCategoryId === childId ? 'border-pink-500 bg-pink-50 dark:bg-pink-500/10 text-pink-500' : 'border-gray-200 dark:border-gray-700'}`}
                                        >
                                            {child.label}
                                        </button>
                                    );
                                })}
                            </div>
                            {!secondLevelCategories.length && (
                                <p className="text-xs text-amber-500 flex items-center gap-1">
                                    <AlertTriangle size={14} /> 当前父级暂无二级分类，请先到分类管理中创建。
                                </p>
                            )}
                        </div>

                        <div
                            className={`${surface} p-6 rounded-2xl shadow-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} space-y-4`}>
                            <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Step 2</p>
                            <h3 className="font-semibold flex items-center gap-2"><Tag size={16} /> 选择标签</h3>
                            <div className="flex flex-wrap gap-2">
                                {tags.map((tag) => (
                                    <button
                                        key={tag.id}
                                        onClick={() => toggleTag(tag.id)}
                                        className={`px-3 py-1 text-xs rounded-full border ${selectedTags.includes(tag.id) ? 'bg-indigo-500 text-white border-indigo-500' : 'border-gray-300 dark:border-gray-600'}`}
                                    >
                                        {tag.name}
                                    </button>
                                ))}
                            </div>
                            {!tags.length && <p className="text-xs text-gray-500">还没有标签，请先到标签管理页创建。</p>}
                        </div>

                        <div
                            className={`${surface} p-6 rounded-2xl shadow-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} space-y-4`}>
                            <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Step 3</p>
                            <h3 className="font-semibold flex items-center gap-2"><FolderPlus size={16} /> 资源标识 / 颜色 / 状态</h3>
                            <div className="space-y-3">
                                <label className="text-sm font-semibold text-gray-500 dark:text-gray-400">Slug / 资源目录</label>
                                <input
                                    className={inputClass}
                                    value={form.slug}
                                    onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                                    placeholder="文章 slug"
                                />
                                <ThemeColorSelector
                                    value={form.themeColor || ''}
                                    onChange={(next) => {
                                        setHasManualThemeColorEdit(true);
                                        setForm((prev) => ({ ...prev, themeColor: next }));
                                    }}
                                    inputClass={inputClass}
                                    isDarkMode={isDarkMode}
                                />
                                <label className="text-sm font-semibold text-gray-500 dark:text-gray-400">状态</label>
                                <select
                                    className={inputClass}
                                    value={form.status}
                                    onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                                >
                                    {statusOptions.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div
                            className={`${surface} p-6 rounded-2xl shadow-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} space-y-3`}>
                            {submitError && <div className="text-sm text-red-500">{submitError}</div>}
                            <button
                                onClick={handleSave}
                                disabled={!canSave || saving}
                                className={`w-full px-4 py-3 font-bold border-2 border-black ${canSave ? 'bg-[#FFD700] text-black hover:translate-y-0.5 transition-transform' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                            >
                                {saving ? '保存中...' : '保存修改'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


const PostsView = ({ isDarkMode }) => {
    const navigate = useNavigate();
    const { hasPermission } = usePermissionContext();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [size, setSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [keyword, setKeyword] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [categoryOptions, setCategoryOptions] = useState([]);

    const cardBg = isDarkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200';
    const inputClass = `border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'}`;

    const buildSecondLevelOptions = (tree) => {
        const result = [];
        tree.forEach((root) => {
            (root.children || []).forEach((child) => {
                result.push({ id: child.id, label: `${root.label}/${child.label}` });
            });
        });
        return result;
    };

    const loadCategoryOptions = useCallback(async () => {
        try {
            const res = await fetchCategories();
            const data = res.data || res || [];
            setCategoryOptions(buildSecondLevelOptions(data));
        } catch (err) {
            console.warn('load categories failed', err);
        }
    }, []);

    const loadPosts = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = { keyword, page, size };
            if (categoryFilter !== 'all') params.categoryId = categoryFilter;
            const res = await adminFetchPosts(params);
            const data = res.data || res;
            setPosts(data?.records || []);
            setTotal(data?.total || 0);
        } catch (err) {
            setError(err.message || '加载文章失败');
        } finally {
            setLoading(false);
        }
    }, [keyword, page, size, categoryFilter]);

    useEffect(() => {
        loadCategoryOptions();
    }, [loadCategoryOptions]);

    useEffect(() => {
        loadPosts();
    }, [loadPosts]);

    const STATUS_LABELS = { DRAFT: '草稿', PUBLISHED: '已发布', ARCHIVED: '已归档' };
    const totalPages = Math.max(Math.ceil(total / size), 1);
    const formatDate = (value) => (value ? new Date(value).toLocaleString() : '—');
    const rowHoverClass = isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50';
    const statusRowTintClass = (status) => {
        const darkPalette = {
            PUBLISHED: 'bg-[rgba(16,185,129,0.22)]',
            DRAFT: 'bg-[rgba(251,191,36,0.2)]',
            ARCHIVED: 'bg-[rgba(148,163,184,0.2)]',
        };
        const lightPalette = {
            PUBLISHED: 'bg-[rgba(16,185,129,0.12)]',
            DRAFT: 'bg-[rgba(251,191,36,0.15)]',
            ARCHIVED: 'bg-[rgba(148,163,184,0.15)]',
        };
        const palette = isDarkMode ? darkPalette : lightPalette;
        return palette[status] || '';
    };

    const goEdit = (id) => {
        navigate(`/admin/posts/edit?postId=${id}`);
    };

    const goArticle = (id) => {
        if (!id) return;
        const url = `/article/${id}`;
        window.open(url, '_blank', 'noopener');
    };

    const canEditPosts = hasPermission('POST_EDIT');

    return (
        <div className="space-y-8">
            <div className={`${cardBg} p-6 rounded-lg shadow-lg`}>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
                    <div>
                        <h2 className="text-2xl font-bold">文章列表</h2>
                        <p className="text-sm text-gray-500 mt-1">共 {total} 篇文章，可筛选后跳转新的编辑页修改正文与元信息。</p>
                    </div>
                    <div className="flex flex-col md:flex-row gap-3">
                        <input
                            className={inputClass}
                            placeholder="输入关键词（标题/Slug）"
                            value={keyword}
                            onChange={(e) => {
                                setKeyword(e.target.value);
                                setPage(1);
                            }}
                        />
                        <select
                            className={inputClass}
                            value={categoryFilter}
                            onChange={(e) => {
                                setCategoryFilter(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="all">所有分类</option>
                            {categoryOptions.map((opt) => (
                                <option key={opt.id} value={opt.id}>{opt.label}</option>
                            ))}
                        </select>
                        <select
                            className={inputClass}
                            value={size}
                            onChange={(e) => {
                                setSize(Number(e.target.value));
                                setPage(1);
                            }}
                        >
                            {[5, 10, 20, 50].map((option) => (
                                <option key={option} value={option}>
                                    每页 {option} 条
                                </option>
                            ))}
                        </select>
                        <button
                            onClick={loadPosts}
                            className="flex items-center gap-2 text-sm font-bold text-indigo-500 hover:text-indigo-400"
                        >
                            <RefreshCw size={16} /> 刷新
                        </button>
                    </div>
                </div>
                {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
                {loading ? (
                    <p className="text-center py-10 text-gray-500">加载中...</p>
                ) : posts.length === 0 ? (
                    <p className="text-center py-10 text-gray-500">暂无文章</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full table-auto text-sm">
                            <thead>
                                <tr className={isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}>
                                    <th className="px-4 py-2 text-left font-semibold">标题</th>
                                    <th className="px-4 py-2 text-left font-semibold">摘要</th>
                                    <th className="px-4 py-2 text-left font-semibold">分类</th>
                                    <th className="px-4 py-2 text-left font-semibold">标签</th>
                                    <th className="px-4 py-2 text-left font-semibold w-24">状态</th>
                                    <th className="px-4 py-2 text-left font-semibold">发布时间</th>
                                    {canEditPosts && <th className="px-4 py-2 text-right font-semibold">操作</th>}
                                </tr>
                            </thead>
                            <tbody className={isDarkMode ? 'divide-y divide-gray-800' : 'divide-y divide-gray-200'}>
                                {posts.map((post) => (
                                    <tr key={post.id}
                                        className={`${statusRowTintClass(post.status)} ${rowHoverClass} transition-colors`}>
                                        <td className="px-4 py-3">
                                            <button
                                                type="button"
                                                onClick={() => goArticle(post.id)}
                                                className="font-semibold text-left text-indigo-500 hover:underline"
                                            >
                                                {post.title}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className="text-sm text-gray-600 dark:text-gray-300">{post.excerpt || '无摘要'}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {post.parentCategoryName && post.categoryName && post.parentCategoryName !== post.categoryName
                                                ? `${post.parentCategoryName}/${post.categoryName}`
                                                : (post.categoryName || '未分类')}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap gap-1">
                                                {(post.tags || []).map((tag) => (
                                                    <span key={tag.id}
                                                        className="px-2 py-0.5 text-xs border border-black">{tag.name}</span>
                                                ))}
                                                {(!post.tags || post.tags.length === 0) &&
                                                    <span className="text-gray-400">无标签</span>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 w-24">{STATUS_LABELS[post.status] || '未知'}</td>
                                        <td className="px-4 py-3 text-gray-500">{formatDate(post.publishedAt)}</td>
                                        {canEditPosts && (
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() => goEdit(post.id)}
                                                    className="inline-flex items-center gap-1 px-3 py-1 border-2 border-indigo-500 text-indigo-600 font-bold text-xs"
                                                >
                                                    <Edit size={14} /> 打开编辑页
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="flex flex-col md:flex-row items-center justify-between mt-4 gap-3">
                    <p className="text-sm text-gray-500">第 {page} / {totalPages} 页（共 {total} 篇）</p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage((p) => Math.max(p - 1, 1))}
                            disabled={page === 1}
                            className="px-3 py-1 border-2 border-black font-bold disabled:opacity-50"
                        >
                            上一页
                        </button>
                        <button
                            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                            disabled={page >= totalPages}
                            className="px-3 py-1 border-2 border-black font-bold disabled:opacity-50"
                        >
                            下一页
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const COMMENT_STATUS_OPTIONS = [
    { value: 'ALL', label: '全部状态' },
    { value: 'APPROVED', label: '已通过' },
    { value: 'PENDING', label: '待审核' },
    { value: 'REJECTED', label: '已拒绝' },
    { value: 'SPAM', label: '垃圾' },
];
const REVIEW_STATUS_OPTIONS = COMMENT_STATUS_OPTIONS.filter((item) => item.value !== 'ALL');

const CommentsAdminView = ({ isDarkMode }) => {
    const cardBg = isDarkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200';
    const inputClass = `w-full px-3 py-2 border-2 rounded-md text-sm outline-none transition ${isDarkMode ? 'bg-gray-900 border-gray-700 text-white focus:border-indigo-400' : 'bg-white border-gray-200 text-gray-900 focus:border-indigo-500'}`;
    const statsBg = isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-50 text-gray-800';
    const { hasPermission, loading: permLoading } = usePermissionContext();
    const canView = hasPermission('COMMENT_VIEW');
    const canCreate = hasPermission('COMMENT_CREATE');
    const canReply = hasPermission('COMMENT_REPLY');
    const canReview = hasPermission('COMMENT_REVIEW');
    const canDelete = hasPermission('COMMENT_DELETE');

    const [postKeywordInput, setPostKeywordInput] = useState('');
    const [postPage, setPostPage] = useState(1);
    const postPageSize = 8;
    const [postTotal, setPostTotal] = useState(0);
    const [postOptions, setPostOptions] = useState([]);
    const [postLoading, setPostLoading] = useState(false);
    const [selectedPostId, setSelectedPostId] = useState('all');

    const [commentKeywordInput, setCommentKeywordInput] = useState('');
    const [commentKeyword, setCommentKeyword] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [page, setPage] = useState(1);
    const pageSize = 10;
    const [total, setTotal] = useState(0);
    const [comments, setComments] = useState([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const [commentsError, setCommentsError] = useState('');

    const [form, setForm] = useState({ postId: '', authorName: '', content: '', parentId: '' });
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [replyTarget, setReplyTarget] = useState(null);

    const [editingId, setEditingId] = useState(null);
    const [editContent, setEditContent] = useState('');
    const [editStatus, setEditStatus] = useState('APPROVED');
    const [editError, setEditError] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    const normalizedPostId = selectedPostId === 'all' ? null : Number(selectedPostId) || null;
    const totalPostPages = Math.max(Math.ceil(postTotal / postPageSize), 1);
    const totalPages = Math.max(Math.ceil(total / pageSize), 1);

    const loadPosts = useCallback(async () => {
        setPostLoading(true);
        try {
            const res = await adminFetchPosts({
                keyword: postKeywordInput.trim() || undefined,
                page: postPage,
                size: postPageSize
            });
            const data = res.data || res;
            setPostOptions(data?.records || []);
            setPostTotal(data?.total || 0);
        } catch (error) {
            console.warn('load posts failed', error);
        } finally {
            setPostLoading(false);
        }
    }, [postKeywordInput, postPage, postPageSize]);

    useEffect(() => {
        loadPosts();
    }, [loadPosts]);

    useEffect(() => {
        if (!form.postId && postOptions.length) {
            setForm((prev) => ({ ...prev, postId: prev.postId || String(postOptions[0].id) }));
        }
    }, [postOptions, form.postId]);

    useEffect(() => {
        if (selectedPostId !== 'all') {
            setForm((prev) => ({ ...prev, postId: String(selectedPostId) }));
        }
    }, [selectedPostId]);

    useEffect(() => {
        if (replyTarget && form.postId && Number(form.postId) !== replyTarget.postId) {
            setReplyTarget(null);
            setForm((prev) => ({ ...prev, parentId: '' }));
        }
    }, [form.postId, replyTarget]);

    const loadComments = useCallback(async () => {
        if (!canView) return;
        setLoadingComments(true);
        setCommentsError('');
        try {
            const res = await adminFetchComments({
                postId: normalizedPostId || undefined,
                keyword: commentKeyword || undefined,
                status: statusFilter,
                page,
                size: pageSize
            });
            const data = res.data || res;
            setComments(data?.records || []);
            setTotal(data?.total || 0);
        } catch (error) {
            setComments([]);
            setCommentsError(error.message || '加载评论失败');
        } finally {
            setLoadingComments(false);
        }
    }, [canView, normalizedPostId, commentKeyword, statusFilter, page, pageSize]);

    useEffect(() => {
        loadComments();
    }, [loadComments]);

    useEffect(() => {
        setPage(1);
    }, [statusFilter, normalizedPostId]);

    const scopeSummary = useMemo(() => {
        const scope = normalizedPostId ? `文章 #${normalizedPostId}` : '全部文章';
        const status = COMMENT_STATUS_OPTIONS.find((item) => item.value === statusFilter)?.label || '全部状态';
        return { scope, status };
    }, [normalizedPostId, statusFilter]);

    const renderStatusBadge = (status) => {
        const map = {
            APPROVED: { label: '已通过', className: 'bg-emerald-100 text-emerald-700' },
            PENDING: { label: '待审核', className: 'bg-amber-100 text-amber-700' },
            REJECTED: { label: '已拒绝', className: 'bg-red-100 text-red-600' },
            SPAM: { label: '垃圾', className: 'bg-gray-200 text-gray-700' },
        };
        const info = map[status] || { label: status || '未知', className: 'bg-gray-200 text-gray-700' };
        return <span className={`px-2 py-0.5 text-[11px] font-bold rounded-full ${info.className}`}>{info.label}</span>;
    };

    const handleCommentSearch = () => {
        setCommentKeyword(commentKeywordInput.trim());
        setPage(1);
    };

    const handleSubmitForm = async (event) => {
        event.preventDefault();
        setFormError('');
        setFormSuccess('');
        if (!canCreate) {
            setFormError('当前账号无权发布后台评论');
            return;
        }
        const postId = Number(form.postId || normalizedPostId);
        if (!postId) {
            setFormError('请先选择文章');
            return;
        }
        if (!form.content.trim()) {
            setFormError('请输入评论内容');
            return;
        }
        setSubmitting(true);
        try {
            await createComment(postId, {
                authorName: form.authorName.trim() || undefined,
                content: form.content.trim(),
                parentId: form.parentId ? Number(form.parentId) : undefined,
            });
            setForm((prev) => ({ ...prev, content: '', parentId: '' }));
            setReplyTarget(null);
            setFormSuccess('评论已提交');
            loadComments();
        } catch (error) {
            setFormError(error.message || '提交失败');
        } finally {
            setSubmitting(false);
        }
    };

    const handlePickReply = (comment) => {
        if (!canReply) return;
        setReplyTarget(comment);
        setForm((prev) => ({ ...prev, postId: String(comment.postId), parentId: String(comment.id) }));
    };

    const handleSaveEdit = async () => {
        if (!editingId || !canReview) return;
        if (!editContent.trim()) {
            setEditError('内容不能为空');
            return;
        }
        setSavingEdit(true);
        setEditError('');
        try {
            await adminUpdateComment(editingId, {
                content: editContent.trim(),
                status: editStatus
            });
            setEditingId(null);
            setEditContent('');
            loadComments();
        } catch (error) {
            setEditError(error.message || '更新失败');
        } finally {
            setSavingEdit(false);
        }
    };

    const handleDeleteComment = async (comment) => {
        if (!canDelete) return;
        if (!window.confirm(`确认删除评论 #${comment.id} 吗？`)) return;
        setDeletingId(comment.id);
        try {
            await adminDeleteComment(comment.id);
            loadComments();
        } catch (error) {
            setCommentsError(error.message || '删除失败');
        } finally {
            setDeletingId(null);
        }
    };

    if (permLoading) {
        return <div className="p-10 text-center text-sm text-gray-500">权限信息加载中...</div>;
    }

    if (!canView) {
        return (
            <PermissionNotice
                title="无法访问评论管理"
                description="当前账号未被授予“评论管理”权限，请联系超级管理员调整权限配置。"
            />
        );
    }

    return (
        <div className="space-y-8">
            <div className={`${cardBg} p-6 rounded-2xl shadow-lg space-y-4`}>
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <label className="text-xs uppercase tracking-[0.3em] text-gray-400">评论来源</label>
                        <select
                            className={inputClass}
                            value={selectedPostId}
                            onChange={(e) => setSelectedPostId(e.target.value)}
                        >
                            <option value="all">全部文章</option>
                            {postOptions.map((post) => (
                                <option key={post.id} value={post.id}>{post.title}</option>
                            ))}
                        </select>
                        <p className="text-[11px] text-gray-500">可通过下方列表加载更多文章后再刷新评论。</p>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs uppercase tracking-[0.3em] text-gray-400">状态筛选</label>
                        <select
                            className={inputClass}
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            {COMMENT_STATUS_OPTIONS.map((item) => (
                                <option key={item.value} value={item.value}>{item.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="grid gap-4 md:grid-cols-[2fr_1fr] items-end">
                    <div>
                        <label className="text-xs uppercase tracking-[0.3em] text-gray-400">关键字</label>
                        <div className="flex gap-2 mt-1">
                            <input
                                className={inputClass}
                                placeholder="按内容或作者搜索"
                                value={commentKeywordInput}
                                onChange={(e) => setCommentKeywordInput(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={handleCommentSearch}
                                className="px-4 py-2 border-2 border-black font-bold text-sm hover:-translate-y-0.5 transition"
                            >
                                搜索
                            </button>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => loadComments()}
                        className="w-full md:w-auto px-4 py-2 border-2 border-black font-bold bg-[#FFD700] text-black rounded-full flex items-center justify-center gap-2 hover:-translate-y-0.5 transition"
                    >
                        <RefreshCw size={14} /> 刷新
                    </button>
                </div>
            </div>

            <div className={`${cardBg} p-6 rounded-2xl shadow-lg space-y-3`}>
                <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>文章共 {postTotal} 篇 · 第 {postPage} / {totalPostPages} 页</span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPostPage((prev) => Math.max(prev - 1, 1))}
                            disabled={postPage === 1 || postLoading}
                            className="px-3 py-1 border border-black rounded disabled:opacity-40"
                        >
                            上一页
                        </button>
                        <button
                            onClick={() => setPostPage((prev) => Math.min(prev + 1, totalPostPages))}
                            disabled={postPage >= totalPostPages || postLoading}
                            className="px-3 py-1 border border-black rounded disabled:opacity-40"
                        >
                            下一页
                        </button>
                    </div>
                </div>
                <div className="flex gap-2">
                    <input
                        className={inputClass}
                        placeholder="输入标题或 Slug"
                        value={postKeywordInput}
                        onChange={(e) => setPostKeywordInput(e.target.value)}
                    />
                    <button
                        type="button"
                        onClick={() => {
                            setPostPage(1);
                            loadPosts();
                        }}
                        className="px-4 py-2 border-2 border-black font-bold text-sm hover:-translate-y-0.5 transition"
                    >
                        查询文章
                    </button>
                </div>
                {postLoading && <p className="text-xs text-gray-500">文章列表加载中...</p>}
            </div>

            <div className={`${cardBg} p-6 rounded-2xl shadow-lg space-y-4`}>
                <div className="grid gap-4 md:grid-cols-3">
                    <div className={`${statsBg} rounded-xl p-4`}>
                        <p className="text-xs uppercase tracking-[0.3em] text-gray-400">当前范围</p>
                        <p className="text-lg font-black mt-1">{scopeSummary.scope}</p>
                    </div>
                    <div className={`${statsBg} rounded-xl p-4`}>
                        <p className="text-xs uppercase tracking-[0.3em] text-gray-400">筛选状态</p>
                        <p className="text-lg font-black mt-1">{scopeSummary.status}</p>
                    </div>
                    <div className={`${statsBg} rounded-xl p-4`}>
                        <p className="text-xs uppercase tracking-[0.3em] text-gray-400">符合条件</p>
                        <p className="text-lg font-black mt-1">{total}</p>
                    </div>
                </div>
                {commentsError && (
                    <div className="text-sm text-red-500 border-l-4 border-red-500 pl-3">
                        {commentsError}
                    </div>
                )}
                {loadingComments ? (
                    <p className="text-center py-10 text-sm text-gray-500">评论加载中...</p>
                ) : comments.length === 0 ? (
                    <p className="text-center py-10 text-sm text-gray-500">暂无符合条件的评论</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className={isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-600'}>
                                    <th className="px-4 py-2 text-left">ID</th>
                                    <th className="px-4 py-2 text-left">所属文章</th>
                                    <th className="px-4 py-2 text-left">作者 / IP</th>
                                    <th className="px-4 py-2 text-left w-1/3">内容</th>
                                    <th className="px-4 py-2 text-left">状态</th>
                                    <th className="px-4 py-2 text-left w-48">操作</th>
                                </tr>
                            </thead>
                            <tbody className={isDarkMode ? 'divide-y divide-gray-800 text-gray-100' : 'divide-y divide-gray-200 text-gray-800'}>
                                {comments.map((comment) => (
                                    <tr key={comment.id} className="align-top">
                                        <td className="px-4 py-3 font-mono text-xs">#{comment.id}</td>
                                        <td className="px-4 py-3">
                                            <p className="font-semibold">{comment.postTitle || '未关联文章'}</p>
                                            {comment.postSlug && (
                                                <p className="text-xs text-gray-500">/{comment.postSlug}</p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="font-semibold">{comment.authorName || '访客'}</p>
                                            <p className="text-xs text-gray-500">{comment.authorIp || '未知 IP'}</p>
                                            <p className="text-xs text-gray-400 mt-1">{comment.createdAt || ''}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            {editingId === comment.id ? (
                                                <div className="space-y-2">
                                                    <textarea
                                                        className={`${inputClass} font-medium`}
                                                        rows={4}
                                                        value={editContent}
                                                        onChange={(e) => setEditContent(e.target.value)}
                                                    />
                                                    <select
                                                        className={inputClass}
                                                        value={editStatus}
                                                        onChange={(e) => setEditStatus(e.target.value)}
                                                    >
                                                        {REVIEW_STATUS_OPTIONS.map((option) => (
                                                            <option key={option.value} value={option.value}>{option.label}</option>
                                                        ))}
                                                    </select>
                                                    {editError && <p className="text-xs text-red-500">{editError}</p>}
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={handleSaveEdit}
                                                            disabled={savingEdit}
                                                            className="px-4 py-2 border-2 border-black font-bold bg-[#00E096] text-black rounded-full text-xs disabled:opacity-50"
                                                        >
                                                            {savingEdit ? '保存中...' : '保存审核'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setEditingId(null);
                                                                setEditContent('');
                                                                setEditStatus('APPROVED');
                                                                setEditError('');
                                                            }}
                                                            className="px-4 py-2 border-2 border-black font-bold rounded-full text-xs"
                                                        >
                                                            取消
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="whitespace-pre-line break-words">{comment.content || '-'}</p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {renderStatusBadge(comment.status)}
                                            {comment.parentId && (
                                                <p className="text-[11px] text-gray-500 mt-1">回复 #{comment.parentId}</p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 space-y-2">
                                            {editingId !== comment.id && (
                                                <>
                                                    {canReview && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setEditingId(comment.id);
                                                                setEditContent(comment.content || '');
                                                                setEditStatus(comment.status || 'APPROVED');
                                                                setEditError('');
                                                            }}
                                                            className="w-full px-3 py-1 border-2 border-indigo-500 text-indigo-600 font-bold text-xs rounded"
                                                        >
                                                            审核/编辑
                                                        </button>
                                                    )}
                                                    {canReply && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handlePickReply(comment)}
                                                            className="w-full px-3 py-1 border-2 border-purple-500 text-purple-600 font-bold text-xs rounded"
                                                        >
                                                            回复
                                                        </button>
                                                    )}
                                                    {canDelete && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteComment(comment)}
                                                            disabled={deletingId === comment.id}
                                                            className="w-full px-3 py-1 border-2 border-red-500 text-red-600 font-bold text-xs rounded disabled:opacity-50"
                                                        >
                                                            {deletingId === comment.id ? '删除中...' : '删除'}
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="flex flex-col md:flex-row items-center justify-between mt-2 gap-3">
                    <p className="text-sm text-gray-500">第 {page} / {totalPages} 页（共 {total} 条）</p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                            disabled={page === 1 || loadingComments}
                            className="px-4 py-1 border-2 border-black font-bold rounded disabled:opacity-50"
                        >
                            上一页
                        </button>
                        <button
                            onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                            disabled={page >= totalPages || loadingComments}
                            className="px-4 py-1 border-2 border-black font-bold rounded disabled:opacity-50"
                        >
                            下一页
                        </button>
                    </div>
                </div>
            </div>

            {canCreate && (
                <div className={`${cardBg} p-6 rounded-2xl shadow-lg space-y-4`}>
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <MessageSquare size={18} /> 发布后台回复
                    </h3>
                    {formError && <div className="text-sm text-red-500">{formError}</div>}
                    {formSuccess && <div className="text-sm text-emerald-500">{formSuccess}</div>}
                    <form onSubmit={handleSubmitForm} className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="text-xs uppercase tracking-[0.3em] text-gray-400">文章</label>
                                <select
                                    className={inputClass}
                                    value={form.postId}
                                    onChange={(e) => setForm((prev) => ({ ...prev, postId: e.target.value }))}
                                >
                                    <option value="">请选择文章</option>
                                    {postOptions.map((post) => (
                                        <option key={post.id} value={post.id}>{post.title}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs uppercase tracking-[0.3em] text-gray-400">显示作者</label>
                                <input
                                    className={inputClass}
                                    placeholder="默认使用账号昵称"
                                    value={form.authorName}
                                    onChange={(e) => setForm((prev) => ({ ...prev, authorName: e.target.value }))}
                                />
                            </div>
                        </div>
                        {replyTarget && (
                            <div className="flex items-center justify-between text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                                <span>将回复 #{replyTarget.id} · {replyTarget.authorName || '访客'}</span>
                                <button
                                    type="button"
                                    className="font-bold underline"
                                    onClick={() => {
                                        setReplyTarget(null);
                                        setForm((prev) => ({ ...prev, parentId: '' }));
                                    }}
                                >
                                    取消
                                </button>
                            </div>
                        )}
                        <div>
                            <label className="text-xs uppercase tracking-[0.3em] text-gray-400">回复内容</label>
                            <textarea
                                className={`${inputClass} mt-2`}
                                rows={4}
                                value={form.content}
                                onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
                                placeholder="请输入要发布的评论内容..."
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setForm({ postId: '', authorName: '', content: '', parentId: '' });
                                    setReplyTarget(null);
                                    setFormError('');
                                    setFormSuccess('');
                                }}
                                className="px-5 py-2 border-2 border-black font-bold rounded-full text-sm"
                            >
                                重置
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="px-6 py-2 border-2 border-black font-bold bg-[#FFD700] text-black rounded-full text-sm disabled:opacity-60"
                            >
                                {submitting ? '提交中...' : '发布评论'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

const UserManagementView = ({ isDarkMode }) => {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [keyword, setKeyword] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [size, setSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [formMode, setFormMode] = useState("create");
    const [selectedUserId, setSelectedUserId] = useState(null);
    const emptyForm = {
        username: "",
        displayName: "",
        email: "",
        title: "",
        bio: "",
        githubUrl: "",
        wechatQrUrl: "",
        status: "ACTIVE",
        roleCode: "USER",
        password: "",
        avatarUrl: "",
    };
    const [form, setForm] = useState(emptyForm);
    const [meta, setMeta] = useState({ id: null, createdAt: null, lastLoginAt: null });
    const [saving, setSaving] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const formRef = useRef(null);
    const avatarInputRef = useRef(null);
    const usersFetchTokenRef = useRef(0);
    const [avatarUploading, setAvatarUploading] = useState(false);
    const scrollFormIntoView = useCallback(() => {
        requestAnimationFrame(() => {
            formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }, []);

    const cardBg = isDarkMode ? "bg-gray-900 border border-gray-800" : "bg-white border border-gray-200";
    const inputClass = `w-full px-3 py-2 border-2 rounded font-medium outline-none transition-colors ${isDarkMode ? 'bg-gray-900 border-gray-700 text-white focus:border-indigo-400' : 'bg-white border-gray-200 text-gray-900 focus:border-indigo-500'}`;
    const STATUS_OPTIONS = [
        { value: 'ACTIVE', label: '正常' },
        { value: 'DISABLED', label: '已禁用' },
    ];

    const getDefaultRoleCode = (roleList) => {
        if (!Array.isArray(roleList) || roleList.length === 0) return 'USER';
        const preferred = roleList.find((role) => (role.code || '').toUpperCase() === 'USER');
        return preferred?.code || roleList[0].code;
    };

    const resolveMediaUrl = (path) => buildAssetUrl(path, '');
    const resolveUserAvatar = (user) => resolveMediaUrl(user?.avatar || user?.avatarUrl || user?.avatar_url);

    const loadRoles = useCallback(async () => {
        try {
            const res = await adminFetchRoles();
            const data = res.data || res || [];
            setRoles(data);
            const defaultRole = getDefaultRoleCode(data);
            setForm((prev) => ({ ...prev, roleCode: prev.roleCode || defaultRole }));
        } catch (err) {
            setFeedback({ type: 'error', text: err.message || '无法加载角色列表' });
        }
    }, []);

    const loadUsers = useCallback(async () => {
        const token = ++usersFetchTokenRef.current;
        setLoading(true);
        try {
            const params = { page, size };
            if (roleFilter !== 'all') params.role = roleFilter;
            const trimmedKeyword = keyword.trim();
            if (trimmedKeyword) params.keyword = trimmedKeyword;
            const res = await adminFetchUsers(params);
            const data = res.data || res;
            if (usersFetchTokenRef.current !== token) {
                return;
            }
            setUsers(data?.records || []);
            setTotal(data?.total || 0);
        } catch (err) {
            if (usersFetchTokenRef.current === token) {
                setFeedback({ type: 'error', text: err.message || '加载用户失败' });
            }
        } finally {
            if (usersFetchTokenRef.current === token) {
                setLoading(false);
            }
        }
    }, [keyword, page, size, roleFilter]);

    useEffect(() => {
        loadRoles();
    }, [loadRoles]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const resetForm = useCallback(() => {
        const defaultRole = getDefaultRoleCode(roles);
        setForm({
            ...emptyForm,
            roleCode: defaultRole,
        });
        setMeta({ id: null, createdAt: null, lastLoginAt: null });
        setSelectedUserId(null);
        setFormMode('create');
        setFeedback(null);
        scrollFormIntoView();
    }, [roles, scrollFormIntoView]);

    const formatDate = (value) => (value ? new Date(value).toLocaleString() : '—');

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleAvatarUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setFeedback({ type: 'error', text: '请上传图片文件' });
            event.target.value = '';
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            setFeedback({ type: 'error', text: '头像需小于 2MB' });
            event.target.value = '';
            return;
        }
        setAvatarUploading(true);
        try {
            const response = await uploadAvatar(file);
            const newPath = response?.data?.url
                || response?.url
                || response?.avatar
                || response?.avatarUrl
                || response?.avatar_url
                || response?.path;
            if (!newPath) {
                throw new Error('上传结果为空');
            }
            setForm((prev) => ({ ...prev, avatarUrl: newPath }));
            setFeedback({ type: 'success', text: '头像已更新' });
        } catch (err) {
            setFeedback({ type: 'error', text: err.message || '头像上传失败' });
        } finally {
            setAvatarUploading(false);
            event.target.value = '';
        }
    };

    const handleEdit = async (id) => {
        setFormMode('edit');
        setSelectedUserId(id);
        setFormLoading(true);
        try {
            const res = await adminFetchUserDetail(id);
            const data = res.data || res;
            setForm({
                username: data.username || '',
                displayName: data.displayName || '',
                email: data.email || '',
                title: data.title || '',
                bio: data.bio || '',
                githubUrl: data.githubUrl || '',
                wechatQrUrl: data.wechatQrUrl || '',
                status: data.status || 'ACTIVE',
                roleCode: data.roleCode || getDefaultRoleCode(roles),
                password: '',
                avatarUrl: data.avatar || data.avatarUrl || data.avatar_url || '',
            });
            setMeta({ id: data.id, createdAt: data.createdAt, lastLoginAt: data.lastLoginAt });
            setFeedback(null);
            requestAnimationFrame(() => {
                formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        } catch (err) {
            setFeedback({ type: 'error', text: err.message || '加载用户详情失败' });
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (user) => {
        if (!window.confirm(`确认删除 ${user.username} 吗？`)) return;
        try {
            await adminDeleteUser(user.id);
            if (selectedUserId === user.id) {
                resetForm();
            }
            setFeedback({ type: 'success', text: '用户已删除' });
            loadUsers();
        } catch (err) {
            setFeedback({ type: 'error', text: err.message || '删除失败' });
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
            const payload = {
                username: form.username.trim(),
                displayName: form.displayName.trim(),
                email: form.email?.trim() || null,
                title: form.title?.trim() || null,
                bio: form.bio?.trim() || null,
                githubUrl: form.githubUrl?.trim() || null,
                wechatQrUrl: form.wechatQrUrl?.trim() || null,
                status: form.status,
                roleCode: form.roleCode,
                avatarUrl: form.avatarUrl || null,
            };
            if (form.password?.trim()) {
                payload.password = form.password.trim();
            }
            let result;
            if (formMode === 'create') {
                if (!payload.password) {
                    throw new Error('请先设置初始密码');
                }
                result = await adminCreateUser(payload);
                setFeedback({ type: 'success', text: '新用户已创建' });
                resetForm();
            } else if (selectedUserId) {
                result = await adminUpdateUser(selectedUserId, payload);
                const data = result.data || result;
                setFeedback({ type: 'success', text: '用户资料已更新' });
                setMeta({ id: data.id, createdAt: data.createdAt, lastLoginAt: data.lastLoginAt });
                setForm((prev) => ({ ...prev, password: '' }));
            }
            loadUsers();
        } catch (err) {
            setFeedback({ type: 'error', text: err.message || '保存失败' });
        } finally {
            setSaving(false);
        }
    };

    const InfoBadge = ({ label, value }) => (
        <div
            className={`p-3 rounded-lg border ${isDarkMode ? 'border-gray-700 bg-gray-900/50' : 'border-gray-200 bg-gray-50'}`}>
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-sm font-mono">{value || '—'}</p>
        </div>
    );
    const avatarPreviewSrc = resolveMediaUrl(form.avatarUrl);

    return (
        <div className="space-y-8">
            <div className={`${cardBg} rounded-xl p-6 shadow-lg`}>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2"><Users size={20} /> 用户列表</h2>
                        <p className="text-sm text-gray-500 mt-1">可筛选查看所有后台账号，对敏感操作前请仔细核对。</p>
                    </div>
                    <button
                        onClick={resetForm}
                        className="px-4 py-2 border-2 border-black font-bold text-sm bg-[#FFD700] text-black hover:-translate-y-0.5 transition"
                    >
                        新建用户
                    </button>
                </div>
                <div className="flex flex-col md:flex-row gap-3 mb-4">
                    <input
                        className={inputClass}
                        placeholder="搜索用户名或邮箱"
                        value={keyword}
                        onChange={(e) => {
                            setKeyword(e.target.value);
                            setPage(1);
                        }}
                    />
                    <select
                        className={inputClass}
                        value={roleFilter}
                        onChange={(e) => {
                            setRoleFilter(e.target.value);
                            setPage(1);
                        }}
                    >
                        <option value="all">所有角色</option>
                        {roles.map((role) => (
                            <option key={role.code} value={role.code}>{role.name}</option>
                        ))}
                    </select>
                    <select
                        className={inputClass}
                        value={size}
                        onChange={(e) => {
                            setSize(Number(e.target.value));
                            setPage(1);
                        }}
                    >
                        {[5, 10, 20].map((option) => (
                            <option key={option} value={option}>每页 {option} 条</option>
                        ))}
                    </select>
                </div>
                {loading ? (
                    <p className="text-center py-10 text-gray-500">数据加载中...</p>
                ) : users.length === 0 ? (
                    <p className="text-center py-10 text-gray-500">暂无用户</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className={isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-gray-100 text-gray-600'}>
                                    <th className="px-4 py-2 text-left">头像</th>
                                    <th className="px-4 py-2 text-left">用户名</th>
                                    <th className="px-4 py-2 text-left">显示名</th>
                                    <th className="px-4 py-2 text-left">邮箱</th>
                                    <th className="px-4 py-2 text-left">角色</th>
                                    <th className="px-4 py-2 text-left">状态</th>
                                    <th className="px-4 py-2 text-left">最近登录</th>
                                    <th className="px-4 py-2 text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody
                                className={isDarkMode ? 'divide-y divide-gray-800 text-gray-100' : 'divide-y divide-gray-200 text-gray-700'}>
                                {users.map((user) => {
                                    const avatarSrc = resolveUserAvatar(user);
                                    const avatarFallback = (user.displayName || user.username || 'U').charAt(0).toUpperCase();
                                    return (
                                        <tr
                                            key={user.id}
                                            className={`${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'} ${selectedUserId === user.id ? (isDarkMode ? 'bg-gray-800/60' : 'bg-indigo-50') : ''}`}
                                        >
                                            <td className="px-4 py-3">
                                                <div
                                                    className={`w-12 h-12 rounded-full border-2 border-black overflow-hidden flex items-center justify-center text-sm font-bold ${isDarkMode ? 'bg-gray-900 text-gray-200' : 'bg-gray-100 text-gray-600'}`}>
                                                    {avatarSrc ? (
                                                        <img src={avatarSrc} alt={`${user.username} avatar`}
                                                            className="w-full h-full object-cover" />
                                                    ) : (
                                                        avatarFallback
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">{user.username}</td>
                                            <td className="px-4 py-3">{user.displayName || '—'}</td>
                                            <td className="px-4 py-3">{user.email || '—'}</td>
                                            <td className="px-4 py-3">{user.roleName || user.roleCode}</td>
                                            <td className="px-4 py-3">{STATUS_OPTIONS.find((s) => s.value === user.status)?.label || '—'}</td>
                                            <td className="px-4 py-3 text-gray-500">{formatDate(user.lastLoginAt)}</td>
                                            <td className="px-4 py-3 text-right space-x-2">
                                                <button
                                                    onClick={() => handleEdit(user.id)}
                                                    className="px-3 py-1 border-2 border-indigo-500 text-indigo-600 font-bold text-xs"
                                                >
                                                    编辑
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user)}
                                                    className="px-3 py-1 border-2 border-red-500 text-red-600 font-bold text-xs"
                                                >
                                                    删除
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="flex flex-col md:flex-row items-center justify-between mt-4 gap-3">
                    <p className="text-sm text-gray-500">第 {page} / {Math.max(Math.ceil(total / size), 1)} 页（共 {total} 个账号）</p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage((p) => Math.max(p - 1, 1))}
                            disabled={page === 1}
                            className="px-3 py-1 border-2 border-black font-bold disabled:opacity-50"
                        >
                            上一页
                        </button>
                        <button
                            onClick={() => setPage((p) => Math.min(p + 1, Math.max(Math.ceil(total / size), 1)))}
                            disabled={page >= Math.max(Math.ceil(total / size), 1)}
                            className="px-3 py-1 border-2 border-black font-bold disabled:opacity-50"
                        >
                            下一页
                        </button>
                    </div>
                </div>
            </div>

            <div className={`${cardBg} rounded-xl p-6 shadow-lg`} ref={formRef}>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
                    <div>
                        <h2 className="text-2xl font-bold">{formMode === 'create' ? '创建新用户' : '编辑用户'}</h2>
                        <p className="text-sm text-gray-500">参照个人资料页，可直接修改角色与密码。</p>
                    </div>
                    {formMode === 'edit' && (
                        <button
                            onClick={resetForm}
                            className="px-4 py-2 border-2 border-black font-bold text-sm bg-white text-black hover:-translate-y-0.5 transition"
                        >
                            切换到创建模式
                        </button>
                    )}
                </div>
                {feedback?.text && (
                    <div
                        className={`mb-4 border-l-4 p-4 ${feedback.type === 'error' ? 'border-red-500 bg-red-50 text-red-600' : 'border-emerald-500 bg-emerald-50 text-emerald-600'}`}>
                        {feedback.text}
                    </div>
                )}
                {formLoading && <p className="mb-4 text-sm text-gray-500">正在加载用户详情...</p>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">用户头像</label>
                        <div className="flex items-center gap-4 mt-3">
                            <div
                                className={`w-20 h-20 rounded-full border-2 border-black overflow-hidden flex items-center justify-center ${isDarkMode ? 'bg-gray-900 text-gray-200' : 'bg-gray-100 text-gray-600'}`}>
                                {avatarPreviewSrc ? (
                                    <img src={avatarPreviewSrc} alt="avatar preview"
                                        className="w-full h-full object-cover" />
                                ) : (
                                    <User size={24} />
                                )}
                            </div>
                            <div className="space-y-2">
                                <input
                                    ref={avatarInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleAvatarUpload}
                                />
                                <button
                                    type="button"
                                    onClick={() => avatarInputRef.current?.click()}
                                    disabled={avatarUploading}
                                    className="px-4 py-2 border-2 border-black font-bold text-sm bg-[#6366F1] text-white rounded-full disabled:opacity-50"
                                >
                                    {avatarUploading ? '上传中...' : '上传头像'}
                                </button>
                                <p className="text-xs text-gray-500 dark:text-gray-400">支持 JPG/PNG，大小不超过 2MB。</p>
                                {form.avatarUrl && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 break-all">当前路径：{form.avatarUrl}</p>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">用户名</label>
                            <input className={inputClass} name="username" value={form.username}
                                onChange={handleInputChange} required />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">显示名</label>
                            <input className={inputClass} name="displayName" value={form.displayName}
                                onChange={handleInputChange} required />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">邮箱</label>
                            <input className={inputClass} name="email" value={form.email} onChange={handleInputChange}
                                type="email" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">头衔</label>
                            <input className={inputClass} name="title" value={form.title} onChange={handleInputChange} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">GitHub</label>
                            <input className={inputClass} name="githubUrl" value={form.githubUrl}
                                onChange={handleInputChange} />
                        </div>
                        <div>
                            <label
                                className="text-xs font-semibold text-gray-500 dark:text-gray-400">微信二维码地址</label>
                            <input className={inputClass} name="wechatQrUrl" value={form.wechatQrUrl}
                                onChange={handleInputChange} />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">个人简介</label>
                        <textarea className={`${inputClass} mt-2`} rows={3} name="bio" value={form.bio}
                            onChange={handleInputChange} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">角色</label>
                            <select className={`${inputClass} mt-2`} name="roleCode" value={form.roleCode}
                                onChange={handleInputChange}>
                                {roles.map((role) => (
                                    <option key={role.code} value={role.code}>{role.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">状态</label>
                            <select className={`${inputClass} mt-2`} name="status" value={form.status}
                                onChange={handleInputChange}>
                                {STATUS_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label
                            className="text-xs font-semibold text-gray-500 dark:text-gray-400">{formMode === 'create' ? '初始密码' : '重置密码（留空不改）'}</label>
                        <input
                            className={`${inputClass} mt-2`}
                            type="password"
                            name="password"
                            value={form.password}
                            onChange={handleInputChange}
                            placeholder={formMode === 'create' ? '请设置初始密码' : '若需要重置请输入新密码'}
                        />
                    </div>
                    {formMode === 'edit' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <InfoBadge label="用户 ID" value={meta.id} />
                            <InfoBadge label="创建时间" value={formatDate(meta.createdAt)} />
                            <InfoBadge label="最近登录" value={formatDate(meta.lastLoginAt)} />
                        </div>
                    )}
                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={saving || formLoading}
                            className="px-6 py-2 border-2 border-black font-bold bg-[#00E096] text-black rounded-full hover:-translate-y-0.5 transition disabled:opacity-50"
                        >
                            {saving ? '保存中...' : '保存设置'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// 4.4 Sub-Component: Permissions View (Super Admin Only)
const PermissionsView = ({ isDarkMode }) => {
    const surface = isDarkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200';
    const text = isDarkMode ? 'text-gray-200' : 'text-gray-800';
    const [matrix, setMatrix] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [roleSelections, setRoleSelections] = useState({
        ADMIN: new Set(),
        USER: new Set()
    });
    const [savingRole, setSavingRole] = useState(null);
    const { notice, showNotice, hideNotice } = useTimedNotice();
    const { hasPermission } = usePermissionContext();

    const fetchMatrix = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await adminFetchPermissionMatrix();
            const data = res.data || res;
            setMatrix(data?.modules || []);
            const adminSet = new Set();
            const userSet = new Set();
            (data?.modules || []).forEach((module) => {
                module.actions.forEach((action) => {
                    if (action.admin) adminSet.add(action.code);
                    if (action.user) userSet.add(action.code);
                });
            });
            setRoleSelections({ ADMIN: adminSet, USER: userSet });
        } catch (err) {
            setError(err.message || '加载权限矩阵失败');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMatrix();
    }, [fetchMatrix]);

    const togglePermission = (role, code) => {
        setRoleSelections((prev) => {
            const next = new Set(prev[role]);
            if (next.has(code)) {
                next.delete(code);
            } else {
                next.add(code);
            }
            return { ...prev, [role]: next };
        });
    };

    const handleSaveRole = async (role) => {
        setSavingRole(role);
        setError('');
        try {
            await adminUpdateRolePermissions(role, Array.from(roleSelections[role]));
            showNotice(`${role === 'ADMIN' ? '管理员' : '用户'}权限已更新`);
        } catch (err) {
            setError(err.message || '保存失败');
        } finally {
            setSavingRole(null);
        }
    };

    const roleCards = [
        { role: 'SUPER_ADMIN', label: '超级管理员', description: '拥有所有模块的最高权限，可配置其余角色权限。' },
        { role: 'ADMIN', label: '管理员', description: '负责内容与互动管理，可通过矩阵勾选需要开放的模块动作。' },
        { role: 'USER', label: '用户', description: '普通登录用户，通常仅开放浏览与发表评论。' }
    ];

    if (!hasPermission('PERMISSION_MANAGE')) {
        return (
            <PermissionNotice
                title="仅超级管理员可访问"
                description="只有超级管理员才能调整权限矩阵，请使用拥有最高权限的账号登录。"
            />
        );
    }

    // 权限矩阵页面只负责权限配置，系统维护/游戏管理已迁移到 SystemSettingsView（/admin/settings）。
    return (
        <div className="space-y-8">
            <AdminNoticeBar notice={notice} onClose={hideNotice} />
            <div className={`${surface} rounded-2xl shadow-lg p-6 space-y-6`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h3 className="text-2xl font-bold">权限矩阵</h3>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                            勾选后保存即可生效，超级管理员默认拥有全部权限。
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={fetchMatrix}
                        disabled={loading}
                        className="px-4 py-2 border-2 border-black rounded-full text-sm font-bold bg-white text-black shadow-[4px_4px_0px_0px_#000] disabled:opacity-60"
                    >
                        {loading ? '刷新中...' : '刷新矩阵'}
                    </button>
                </div>

                {error && (
                    <div className="px-4 py-3 border-2 border-red-400 bg-red-50 text-red-700 font-semibold rounded-xl">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="p-8 text-center text-sm text-gray-500">加载中，请稍候...</div>
                ) : (
                    <div className="space-y-6">
                        <div className="grid md:grid-cols-3 gap-4">
                            {roleCards.map((card) => (
                                <div
                                    key={card.role}
                                    className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-black'} border-2 rounded-xl p-4 shadow-[4px_6px_0px_rgba(0,0,0,0.25)] space-y-2`}
                                >
                                    <h4 className="text-lg font-bold">{card.label}</h4>
                                    <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{card.description}</p>
                                    {card.role === 'SUPER_ADMIN' ? (
                                        <div className={`text-xs font-semibold ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>
                                            默认全选，不可修改
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => handleSaveRole(card.role)}
                                            disabled={savingRole === card.role}
                                            className="mt-2 px-4 py-1.5 border-2 border-black rounded-full text-xs font-bold bg-black text-white shadow-[3px_3px_0px_0px_#000] disabled:opacity-60"
                                        >
                                            {savingRole === card.role ? '保存中...' : '保存该角色'}
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {matrix.length === 0 ? (
                            <div className="p-8 text-center text-sm text-gray-500">暂无可配置权限。</div>
                        ) : (
                            <div className="space-y-5">
                                {matrix.map((module) => (
                                    <div key={module.module} className={`${surface} rounded-xl p-4 space-y-3`}>
                                        <div>
                                            <h5 className="text-lg font-bold">{module.label || module.module}</h5>
                                            {module.description && (
                                                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                                                    {module.description}
                                                </p>
                                            )}
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm border-collapse">
                                                <thead>
                                                    <tr className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                        <th className="text-left py-2 pr-3">动作</th>
                                                        <th className="text-center py-2 px-3">管理员</th>
                                                        <th className="text-center py-2 px-3">用户</th>
                                                        <th className="text-left py-2 pl-3">说明</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(module.actions || []).map((action) => {
                                                        const code = action.code;
                                                        return (
                                                            <tr
                                                                key={code}
                                                                className={`border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}
                                                            >
                                                                <td className="py-2 pr-3 font-semibold">{action.label || code}</td>
                                                                <td className="py-2 px-3 text-center">
                                                                    <input
                                                                        type="checkbox"
                                                                        className="w-4 h-4 accent-black"
                                                                        checked={roleSelections.ADMIN.has(code)}
                                                                        onChange={() => togglePermission('ADMIN', code)}
                                                                    />
                                                                </td>
                                                                <td className="py-2 px-3 text-center">
                                                                    <input
                                                                        type="checkbox"
                                                                        className="w-4 h-4 accent-black"
                                                                        checked={roleSelections.USER.has(code)}
                                                                        onChange={() => togglePermission('USER', code)}
                                                                    />
                                                                </td>
                                                                <td className={`py-2 pl-3 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                                    {action.description || '--'}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    // 旧版系统维护 UI（已迁移到 /admin/settings），保留但不再执行。
};


// 4.5 Sub-Component: System Settings (Super Admin) — 仅游戏管理精简版
const SystemSettingsView = ({ isDarkMode, user, notification, setNotification, onGameChanged }) => {
    const [gameList, setGameList] = useState([]);
    const [gameLoading, setGameLoading] = useState(false);
    const [gameError, setGameError] = useState('');
    const [gameForm, setGameForm] = useState({ title: '', description: '', status: 'ACTIVE', sortOrder: 0, file: null });
    const [gameEditingId, setGameEditingId] = useState(null);
    const [gameSaving, setGameSaving] = useState(false);
    const [gameDeletingId, setGameDeletingId] = useState(null);
    const { hasPermission } = usePermissionContext();
    const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : '--');

    const loadGames = useCallback(async () => {
        setGameLoading(true);
        setGameError('');
        try {
            const res = await adminFetchGames({ page: 1, size: 200 });
            const data = res?.data || res;
            setGameList((data && data.records) ? data.records : (data || []));
        } catch (err) {
            setGameError(err?.message || '加载页面列表失败');
        } finally {
            setGameLoading(false);
        }
    }, []);

    useEffect(() => {
        loadGames();
    }, [loadGames]);

    const resetGameForm = useCallback((defaults = {}, clearEditing = true) => {
        setGameForm({
            title: '',
            description: '',
            status: 'ACTIVE',
            sortOrder: 0,
            file: null,
            ...defaults
        });
        if (clearEditing) setGameEditingId(null);
    }, []);

    const handleGameSubmit = useCallback(async () => {
        if (!gameForm.title) {
            setGameError('请填写标题');
            return;
        }
        if (!gameEditingId && !gameForm.file) {
            setGameError('请先选择要上传的 HTML 文件');
            return;
        }
        setGameSaving(true);
        setGameError('');
        try {
            if (gameEditingId) {
                await adminUpdateGame(gameEditingId, gameForm);
            } else {
                await adminCreateGame(gameForm);
            }
            await loadGames();
            resetGameForm({}, true);
            onGameChanged && onGameChanged();
        } catch (err) {
            setGameError(err?.message || '保存失败');
        } finally {
            setGameSaving(false);
        }
    }, [gameForm, gameEditingId, adminUpdateGame, adminCreateGame, loadGames, resetGameForm, onGameChanged]);

    const handleGameEdit = useCallback((game) => {
        if (!game) return;
        resetGameForm({
            title: game.title || '',
            description: game.description || '',
            status: game.status || 'ACTIVE',
            sortOrder: game.sortOrder ?? 0,
        }, false);
        setGameEditingId(game.id);
    }, [resetGameForm]);

    const handleGameDelete = useCallback(async (id) => {
        if (!id) return;
        const ok = typeof window !== 'undefined' ? window.confirm('确认删除该 HTML 页面吗？此操作不可恢复。') : true;
        if (!ok) return;
        setGameDeletingId(id);
        setGameError('');
        try {
            await adminDeleteGame(id);
            await loadGames();
            if (gameEditingId === id) resetGameForm({}, true);
            onGameChanged && onGameChanged();
        } catch (err) {
            setGameError(err?.message || '删除失败');
        } finally {
            setGameDeletingId(null);
        }
    }, [adminDeleteGame, loadGames, onGameChanged, gameEditingId, resetGameForm]);

    const handleGameOpen = useCallback((game) => {
        if (!game) return;
        const targetUrl = game.url ? buildAssetUrl(game.url) : '';
        if (targetUrl && typeof window !== 'undefined') {
            window.open(targetUrl, '_blank', 'noopener,noreferrer');
        }
    }, []);

    // --- 维护模块：未引用图片清理（SUPER_ADMIN） ---
    const [assets, setAssets] = useState([]);
    const [assetLoading, setAssetLoading] = useState(false);
    const [assetError, setAssetError] = useState('');
    const [assetTotalSize, setAssetTotalSize] = useState(0);
    const [selectedAssets, setSelectedAssets] = useState(new Set());
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmChecked, setConfirmChecked] = useState(false);
    const [assetDeleting, setAssetDeleting] = useState(false);
    const [previewSrc, setPreviewSrc] = useState('');

    const scanUnusedAssets = useCallback(async () => {
        setAssetLoading(true);
        setAssetError('');
        setSelectedAssets(new Set());
        try {
            const res = await adminScanUnusedAssets();
            const data = res?.data || res;
            const list = data?.unused || [];
            setAssets(list);
            setAssetTotalSize(data?.totalSize || 0);
        } catch (err) {
            setAssetError(err?.message || '扫描未引用图片失败');
        } finally {
            setAssetLoading(false);
        }
    }, []);

    const toggleSelectAsset = useCallback((path) => {
        if (!path) return;
        setSelectedAssets((prev) => {
            const next = new Set(prev);
            if (next.has(path)) next.delete(path);
            else next.add(path);
            return next;
        });
    }, []);

    const toggleSelectAllAssets = useCallback(() => {
        setSelectedAssets((prev) => {
            if (assets.length === 0) return prev;
            if (prev.size === assets.length) return new Set();
            return new Set(assets.map((a) => a.path));
        });
    }, [assets]);

    const handleDeleteSelectedAssets = useCallback(() => {
        if (!selectedAssets.size) return;
        setConfirmChecked(false);
        setConfirmOpen(true);
    }, [selectedAssets]);

    const handleConfirmDeleteAssets = useCallback(async () => {
        if (!selectedAssets.size) return;
        setAssetDeleting(true);
        setAssetError('');
        try {
            await adminDeleteUnusedAssets(Array.from(selectedAssets));
            setConfirmOpen(false);
            setConfirmChecked(false);
            await scanUnusedAssets();
        } catch (err) {
            setAssetError(err?.message || '删除未引用图片失败');
        } finally {
            setAssetDeleting(false);
        }
    }, [selectedAssets, scanUnusedAssets]);

    // --- 维护模块：空目录清理（SUPER_ADMIN） ---
    const [emptyFolders, setEmptyFolders] = useState([]);
    const [emptyLoading, setEmptyLoading] = useState(false);
    const [emptyError, setEmptyError] = useState('');
    const [emptySelected, setEmptySelected] = useState(new Set());
    const [emptyDeleting, setEmptyDeleting] = useState(false);

    const loadEmptyFolders = useCallback(async () => {
        setEmptyLoading(true);
        setEmptyError('');
        setEmptySelected(new Set());
        try {
            const res = await adminScanEmptyFolders();
            const data = res?.data || res;
            setEmptyFolders(data?.emptyFolders || []);
        } catch (err) {
            setEmptyError(err?.message || '扫描空目录失败');
        } finally {
            setEmptyLoading(false);
        }
    }, []);

    const toggleSelectEmpty = useCallback((path) => {
        if (!path) return;
        setEmptySelected((prev) => {
            const next = new Set(prev);
            if (next.has(path)) next.delete(path);
            else next.add(path);
            return next;
        });
    }, []);

    const toggleSelectAllEmpty = useCallback(() => {
        setEmptySelected((prev) => {
            if (emptyFolders.length === 0) return prev;
            if (prev.size === emptyFolders.length) return new Set();
            return new Set(emptyFolders);
        });
    }, [emptyFolders]);

    const handleDeleteEmptyFolders = useCallback(async () => {
        if (!emptySelected.size) return;
        const ok = typeof window !== 'undefined'
            ? window.confirm(`确认删除选中的 ${emptySelected.size} 个空目录吗？此操作不可恢复。`)
            : true;
        if (!ok) return;
        setEmptyDeleting(true);
        setEmptyError('');
        try {
            await adminDeleteEmptyFolders(Array.from(emptySelected));
            await loadEmptyFolders();
        } catch (err) {
            setEmptyError(err?.message || '删除空目录失败');
        } finally {
            setEmptyDeleting(false);
        }
    }, [emptySelected, loadEmptyFolders]);

    useEffect(() => {
        scanUnusedAssets();
        loadEmptyFolders();
    }, [scanUnusedAssets, loadEmptyFolders]);

    if (!hasPermission('SYSTEM_CLEAN_STORAGE') || user?.role !== 'SUPER_ADMIN') {
        return <PermissionNotice title="仅超级管理员可用" description="系统设置仅限超级管理员访问。" />;
    }

    const surface = isDarkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200';

    const formatBytes = useCallback((bytes) => {
        if (!bytes || Number.isNaN(bytes)) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let value = bytes;
        let idx = 0;
        while (value >= 1024 && idx < units.length - 1) {
            value /= 1024;
            idx += 1;
        }
        return `${value % 1 === 0 ? value : value.toFixed(1)} ${units[idx]}`;
    }, []);

    return (
        <div className="space-y-6">
            <div className={`${surface} rounded-2xl shadow-lg p-6 space-y-4`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h3 className="text-xl font-bold">游戏页面管理（game_pages）</h3>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>上传、替换或下线独立 HTML 页面，前台 /games 仅展示 ACTIVE 项。</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={loadGames}
                            disabled={gameLoading}
                            className="px-4 py-2 border-2 border-black rounded-full text-sm font-bold bg-white text-black shadow-[4px_4px_0px_0px_#000] disabled:opacity-60"
                        >
                            {gameLoading ? '刷新中...' : '刷新列表'}
                        </button>
                        <button
                            type="button"
                            onClick={() => resetGameForm()}
                            className="px-4 py-2 border-2 border-black rounded-full text-sm font-bold bg-[#FFD700] text-black shadow-[4px_4px_0px_0px_#000]"
                        >
                            {gameEditingId ? '退出编辑' : '新建页面'}
                        </button>
                    </div>
                </div>

                {gameError && (
                    <div className="px-4 py-3 border-2 border-red-400 bg-red-50 text-red-700 font-semibold rounded-xl">
                        {gameError}
                    </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold">标题</label>
                        <input
                            value={gameForm.title}
                            onChange={(e) => setGameForm((prev) => ({ ...prev, title: e.target.value }))}
                            className="border-2 border-black px-3 py-2 rounded"
                            placeholder="例如：像素跑酷 / H5 Demo"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold">状态</label>
                        <select
                            value={gameForm.status}
                            onChange={(e) => setGameForm((prev) => ({ ...prev, status: e.target.value }))}
                            className="border-2 border-black px-3 py-2 rounded"
                        >
                            <option value="ACTIVE">ACTIVE - 对所有人可见</option>
                            <option value="DISABLED">DISABLED - 仅管理端可见</option>
                            <option value="DRAFT">DRAFT - 草稿</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-2 md:col-span-2">
                        <label className="text-sm font-semibold">描述（可选）</label>
                        <textarea
                            value={gameForm.description}
                            onChange={(e) => setGameForm((prev) => ({ ...prev, description: e.target.value }))}
                            rows={3}
                            className="border-2 border-black px-3 py-2 rounded"
                            placeholder="一句话给运营或访客的提示"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold">排序权重（小在前）</label>
                        <input
                            type="number"
                            value={gameForm.sortOrder ?? 0}
                            onChange={(e) => setGameForm((prev) => ({ ...prev, sortOrder: Number(e.target.value) }))}
                            className="border-2 border-black px-3 py-2 rounded"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold">HTML 文件 {gameEditingId ? '（不更换可留空）' : ''}</label>
                        <input
                            key={gameEditingId ? `edit-${gameEditingId}` : 'new-game'}
                            type="file"
                            accept=".html,.htm,text/html"
                            onChange={(e) => setGameForm((prev) => ({ ...prev, file: e.target.files?.[0] || null }))}
                            className="border-2 border-black px-3 py-2 rounded bg-white"
                        />
                        {gameForm.file && <span className="text-xs text-gray-500">已选择：{gameForm.file.name}</span>}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={handleGameSubmit}
                        disabled={gameSaving}
                        className="px-5 py-2 border-2 border-black rounded-full text-sm font-bold bg-black text-white shadow-[4px_4px_0px_0px_#000] disabled:opacity-60"
                    >
                        {gameSaving ? '保存中...' : (gameEditingId ? '保存修改' : '上传页面')}
                    </button>
                    <button
                        type="button"
                        onClick={() => resetGameForm()}
                        className="px-4 py-2 border-2 border-black rounded-full text-sm font-bold bg-white text-black shadow-[3px_3px_0px_0px_#000]"
                    >
                        重置表单
                    </button>
                    {gameEditingId && <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-xs`}>当前编辑 ID：{gameEditingId}</span>}
                </div>

                <div className="border-t border-dashed border-gray-300 dark:border-gray-700 pt-4 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                        <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>共 {gameList.length} 个页面</span>
                    </div>
                    {gameLoading ? (
                        <div className="grid gap-3 md:grid-cols-2">
                            {Array.from({ length: 2 }).map((_, idx) => (
                                <div key={`game-skeleton-${idx}`} className="border-2 border-dashed border-gray-400/70 rounded-xl p-4 animate-pulse">
                                    <div className="h-4 bg-gray-300/70 rounded w-2/3 mb-3"></div>
                                    <div className="h-3 bg-gray-200/70 rounded w-5/6 mb-2"></div>
                                    <div className="h-3 bg-gray-200/50 rounded w-1/2"></div>
                                </div>
                            ))}
                        </div>
                    ) : gameList.length === 0 ? (
                        <div className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-sm`}>暂无数据，先上传一个吧。</div>
                    ) : (
                        <div className="grid gap-3 md:grid-cols-2">
                            {gameList.map((game) => (
                                <div
                                    key={game.id}
                                    className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-black'} border-2 rounded-xl p-4 space-y-3 shadow-[4px_6px_0px_rgba(0,0,0,0.25)]`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="space-y-1">
                                            <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>ID #{game.id}</div>
                                            <h4 className="text-lg font-bold leading-tight">{game.title}</h4>
                                            <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} text-sm line-clamp-2`}>{game.description || '暂无描述'}</p>
                                            <p className={`text-[11px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>状态：{game.status || '--'} · 更新：{formatDateTime(game.updatedAt || game.createdAt)}</p>
                                        </div>
                                        <span className="text-[11px] px-2 py-0.5 rounded-full border border-black/40 bg-white/70 text-black font-bold">{game.status || '--'}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        <button
                                            type="button"
                                            onClick={() => handleGameOpen(game)}
                                            className="px-3 py-1 border-2 border-black rounded-full text-xs font-bold bg-[#FFD700] text-black hover:-translate-y-0.5 transition-transform"
                                        >
                                            预览
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleGameEdit(game)}
                                            className="px-3 py-1 border-2 border-black rounded-full text-xs font-bold bg-white text-black hover:-translate-y-0.5 transition-transform"
                                        >
                                            编辑
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleGameDelete(game.id)}
                                            disabled={gameDeletingId === game.id}
                                            className="px-3 py-1 border-2 border-black rounded-full text-xs font-bold bg-red-500 text-white hover:-translate-y-0.5 transition-transform disabled:opacity-60"
                                        >
                                            {gameDeletingId === game.id ? '删除中...' : '删除'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className={`${surface} rounded-2xl shadow-lg p-6 space-y-4`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h3 className="text-xl font-bold">存储清理 · 未引用图片</h3>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                            扫描文章与关于页引用的图片，找出上传目录中未被引用的文件，仅超级管理员可删除。
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={scanUnusedAssets}
                            disabled={assetLoading}
                            className="px-4 py-2 border-2 border-black rounded-full text-sm font-bold bg-white text-black shadow-[4px_4px_0px_0px_#000] disabled:opacity-60"
                        >
                            {assetLoading ? '扫描中...' : '重新扫描'}
                        </button>
                        <button
                            type="button"
                            onClick={toggleSelectAllAssets}
                            disabled={!assets.length}
                            className="px-4 py-2 border-2 border-black rounded-full text-sm font-bold bg-[#C7F36B] text-black shadow-[4px_4px_0px_0px_#000] disabled:opacity-60"
                        >
                            {selectedAssets.size === assets.length && assets.length ? '取消全选' : '全选'}
                        </button>
                        <button
                            type="button"
                            onClick={handleDeleteSelectedAssets}
                            disabled={!selectedAssets.size}
                            className="px-4 py-2 border-2 border-black rounded-full text-sm font-bold bg-red-500 text-white shadow-[4px_4px_0px_0px_#000] disabled:opacity-60"
                        >
                            {selectedAssets.size ? `删除选中（${selectedAssets.size}）` : '删除选中'}
                        </button>
                    </div>
                </div>

                {assetError && (
                    <div className="px-4 py-3 border-2 border-red-400 bg-red-50 text-red-700 font-semibold rounded-xl">
                        {assetError}
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>找到 {assets.length} 张未引用图片</span>
                    <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>预计可释放 {formatBytes(assetTotalSize)}</span>
                </div>

                <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl overflow-hidden">
                    {assetLoading ? (
                        <div className="p-6 text-sm text-gray-500">扫描中，请稍候...</div>
                    ) : assets.length === 0 ? (
                        <div className="p-6 text-sm text-gray-500">暂无未引用图片，保持良好。</div>
                    ) : (
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                            {assets.map((asset) => (
                                <div key={asset.path} className="flex items-center justify-between gap-4 p-4">
                                    <div className="flex items-center gap-3 min-w-0">
                                        {asset.url || asset.path ? (
                                            <img
                                                src={buildAssetUrl(asset.url || asset.path)}
                                                alt={asset.path}
                                                className="w-14 h-14 rounded-lg object-cover border border-gray-200 dark:border-gray-700 bg-gray-50 cursor-zoom-in"
                                                loading="lazy"
                                                onClick={() => {
                                                    const target = buildAssetUrl(asset.url || asset.path);
                                                    if (target) setPreviewSrc(target);
                                                }}
                                            />
                                        ) : (
                                            <div className="w-14 h-14 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center text-xs text-gray-400">
                                                无预览
                                            </div>
                                        )}
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 border-2 border-black rounded"
                                            checked={selectedAssets.has(asset.path)}
                                            onChange={() => toggleSelectAsset(asset.path)}
                                        />
                                        <div className="min-w-0">
                                    <div className="font-mono text-sm break-all">{asset.path}</div>
                                    <div className="flex items-center gap-3 text-xs text-indigo-600 dark:text-indigo-300">
                                        <a
                                            href={buildAssetUrl(asset.url || asset.path)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="underline"
                                        >
                                            在新标签中查看
                                        </a>
                                    </div>
                                        </div>
                                    </div>
                                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-100">{formatBytes(asset.size)}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className={`${surface} rounded-2xl shadow-lg p-6 space-y-4`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h3 className="text-xl font-bold">存储清理 · 空目录</h3>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                            扫描上传目录下的空文件夹，可批量删除以保持目录整洁。
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={loadEmptyFolders}
                            disabled={emptyLoading}
                            className="px-4 py-2 border-2 border-black rounded-full text-sm font-bold bg-white text-black shadow-[4px_4px_0px_0px_#000] disabled:opacity-60"
                        >
                            {emptyLoading ? '扫描中...' : '重新扫描'}
                        </button>
                        <button
                            type="button"
                            onClick={toggleSelectAllEmpty}
                            disabled={!emptyFolders.length}
                            className="px-4 py-2 border-2 border-black rounded-full text-sm font-bold bg-[#C7F36B] text-black shadow-[4px_4px_0px_0px_#000] disabled:opacity-60"
                        >
                            {emptySelected.size === emptyFolders.length && emptyFolders.length ? '取消全选' : '全选'}
                        </button>
                        <button
                            type="button"
                            onClick={handleDeleteEmptyFolders}
                            disabled={!emptySelected.size}
                            className="px-4 py-2 border-2 border-black rounded-full text-sm font-bold bg-red-500 text-white shadow-[4px_4px_0px_0px_#000] disabled:opacity-60"
                        >
                            {emptySelected.size ? `删除选中（${emptySelected.size}）` : '删除选中'}
                        </button>
                    </div>
                </div>

                {emptyError && (
                    <div className="px-4 py-3 border-2 border-red-400 bg-red-50 text-red-700 font-semibold rounded-xl">
                        {emptyError}
                    </div>
                )}

                <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl overflow-hidden">
                    {emptyLoading ? (
                        <div className="p-6 text-sm text-gray-500">扫描中，请稍候...</div>
                    ) : emptyFolders.length === 0 ? (
                        <div className="p-6 text-sm text-gray-500">暂无空目录，状态良好。</div>
                    ) : (
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                            {emptyFolders.map((path) => (
                                <label key={path} className="flex items-center justify-between gap-4 p-4 cursor-pointer">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 border-2 border-black rounded"
                                            checked={emptySelected.has(path)}
                                            onChange={() => toggleSelectEmpty(path)}
                                        />
                                        <div className="font-mono text-sm break-all">{path}</div>
                                    </div>
                                    <span className="text-xs px-2 py-1 rounded-full border border-black/30 bg-white text-gray-700 dark:text-gray-100">
                                        空目录
                                    </span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {confirmOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
                    <div className={`${surface} max-w-lg w-full rounded-2xl shadow-2xl p-6 space-y-4`}>
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h4 className="text-lg font-bold">确认删除未引用图片</h4>
                                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                                    共 {selectedAssets.size} 项，将从存储中彻底移除，操作不可恢复。
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setConfirmOpen(false)}
                                className="text-gray-500 hover:text-black"
                                aria-label="关闭"
                            >
                                ✕
                            </button>
                        </div>

                        <label className="flex items-center gap-3 text-sm font-medium">
                            <input
                                type="checkbox"
                                className="h-4 w-4 border-2 border-black rounded"
                                checked={confirmChecked}
                                onChange={(e) => setConfirmChecked(e.target.checked)}
                            />
                            <span>我已确认备份必要图片，删除后无需恢复。</span>
                        </label>

                        <div className="grid gap-3 md:grid-cols-3 max-h-[50vh] overflow-auto pr-1">
                            {Array.from(selectedAssets).map((path) => {
                                const item = assets.find((a) => a.path === path);
                                const target = item ? buildAssetUrl(item.url || item.path) : '';
                                return (
                                    <div key={path} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white">
                                        {target && (
                                            <img
                                                src={target}
                                                alt={path}
                                                className="w-full h-32 object-cover bg-gray-100 cursor-zoom-in"
                                                onClick={() => setPreviewSrc(target)}
                                            />
                                        )}
                                        <div className="p-2 text-xs font-mono break-all">{path}</div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setConfirmOpen(false)}
                                className="px-4 py-2 border-2 border-black rounded-full text-sm font-bold bg-white text-black shadow-[3px_3px_0px_0px_#000]"
                            >
                                取消
                            </button>
                            <button
                                type="button"
                                disabled={!confirmChecked || assetDeleting}
                                onClick={handleConfirmDeleteAssets}
                                className="px-5 py-2 border-2 border-black rounded-full text-sm font-bold bg-red-500 text-white shadow-[4px_4px_0px_0px_#000] disabled:opacity-60"
                            >
                                {assetDeleting ? '删除中...' : '确认删除'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {previewSrc && (
                <div
                    className="fixed inset-0 z-[150] bg-black/80 flex items-center justify-center p-4 cursor-zoom-out"
                    onClick={() => setPreviewSrc('')}
                >
                    <img
                        src={previewSrc}
                        alt="preview"
                        className="max-h-[80vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
                    />
                </div>
            )}
        </div>
    );
};

// 4.5 The main Admin Panel structure
// 4.5 The main Admin Panel structure
const AdminPanel = ({ setView, notification, setNotification, user, isDarkMode, handleLogout, onAboutSaved, loadGameList }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const [broadcastSaving, setBroadcastSaving] = useState(false);
    const BROADCAST_STYLES = [
        { value: "ALERT", label: "紧急红色告警" },
        { value: "ANNOUNCE", label: "温和庆典公告" }
    ];
    const [analyticsSummary, setAnalyticsSummary] = useState(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [analyticsError, setAnalyticsError] = useState('');
    const [analyticsRange, setAnalyticsRange] = useState(7);
    const { loading: permissionLoading, error: permissionError, hasPermission } = usePermissionContext();
    const { headerHeight } = useLayoutOffsets();

    const pathSegments = location.pathname.split('/').filter(Boolean);
    const lastSegment = pathSegments[pathSegments.length - 1] || 'dashboard';
    let activeTab = lastSegment === 'admin' ? 'dashboard' : lastSegment;
    if (pathSegments.includes('posts')) {
        activeTab = 'posts';
    }

    const tabDefinitions = useMemo(() => ([
        { key: 'dashboard', label: '仪表盘', icon: Home, permissions: ['ANALYTICS_VIEW'] },
        { key: 'create-post', label: '发布文章', icon: Edit, permissions: ['POST_CREATE'] },
        { key: 'posts', label: '文章列表', icon: FileText, permissions: ['POST_VIEW'] },
        { key: 'analytics', label: '访问日志', icon: BarChart3, permissions: ['ANALYTICS_VIEW'] },
        { key: 'comments', label: '评论管理', icon: MessageCircle, permissions: ['COMMENT_VIEW'] },
        { key: 'categories', label: '二级分类', icon: Layers, permissions: ['CATEGORY_MANAGE'] },
        { key: 'taxonomy', label: '标签管理', icon: Tag, permissions: ['TAG_MANAGE'] },
        { key: 'about', label: '关于站点', icon: BookOpen, permissions: [], role: 'SUPER_ADMIN' },
        { key: 'users', label: '用户管理', icon: Users, permissions: ['USER_MANAGE'] },
        { key: 'permissions', label: '权限管理', icon: Shield, permissions: ['PERMISSION_MANAGE'] },
        { key: 'settings', label: '系统设置', icon: Settings, permissions: ['SYSTEM_CLEAN_STORAGE'] },
        { key: 'profile', label: '个人资料', icon: User, permissions: ['PROFILE_UPDATE'] },
    ]), []);

    const tabs = useMemo(() => {
        if (permissionLoading) {
            return tabDefinitions;
        }
        return tabDefinitions.filter((tab) => {
            if (tab.role && user?.role !== tab.role) return false;
            if (!tab.permissions || tab.permissions.length === 0) return true;
            return tab.permissions.some((code) => hasPermission(code));
        });
    }, [tabDefinitions, permissionLoading, hasPermission, user]);

    const navSections = useMemo(() => {
        const groups = [
            { title: '创作管理', keys: ['create-post', 'posts'] },
            { title: '内容体系', keys: ['categories', 'taxonomy', 'about'] },
            { title: '运营互动', keys: ['analytics', 'comments'] },
            { title: '用户与权限', keys: ['users', 'permissions'] },
            { title: '个人与系统', keys: ['profile', 'settings'] },
        ];

        const groupedSections = groups
            .map((group) => ({
                ...group,
                items: group.keys
                    .map((key) => tabs.find((tab) => tab.key === key))
                    .filter(Boolean)
            }))
            .filter((group) => group.items.length > 0);

        const dashboardSection = tabs.find((tab) => tab.key === 'dashboard')
            ? [{ title: null, items: tabs.filter((tab) => tab.key === 'dashboard') }]
            : [];

        return [...dashboardSection, ...groupedSections];
    }, [tabs]);

    useEffect(() => {
        if (permissionLoading) return;
        if (!tabs.length) return;
        if (!tabs.some((tab) => tab.key === activeTab)) {
            const fallback = tabs.find((tab) => tab.key === 'profile') || tabs[0];
            if (!fallback) return;
            const target = fallback.key === 'dashboard' ? '/admin' : `/admin/${fallback.key}`;
            navigate(target, { replace: true });
        }
    }, [permissionLoading, tabs, activeTab, navigate]);

    const activeLabel = tabs.find(t => t.key === activeTab)?.label || tabs[0]?.label || '仪表盘';

    const bgClass = isDarkMode ? THEME.colors.bgDark : 'bg-gray-100';
    const sidebarBg = isDarkMode ? 'bg-gray-900' : 'bg-white';
    const textClass = isDarkMode ? 'text-gray-100' : 'text-gray-800';
    const sidebarBorder = isDarkMode ? 'border-gray-700' : 'border-gray-200';
    const topbarBg = isDarkMode ? 'bg-gray-900' : 'bg-white';

    const fetchAnalyticsSummary = useCallback(async (daysValue) => {
        const targetDays = daysValue || analyticsRange;
        setAnalyticsLoading(true);
        setAnalyticsError('');
        try {
            const res = await adminFetchAnalyticsSummary({ days: targetDays });
            const data = res.data || res;
            setAnalyticsSummary(data);
        } catch (error) {
            setAnalyticsError(error.message || '获取分析数据失败');
        } finally {
            setAnalyticsLoading(false);
        }
    }, [analyticsRange]);

    useEffect(() => {
        fetchAnalyticsSummary(analyticsRange);
    }, [analyticsRange, fetchAnalyticsSummary]);

    const reloadAnalytics = useCallback((daysValue) => {
        if (daysValue && daysValue !== analyticsRange) {
            setAnalyticsRange(daysValue);
        } else {
            fetchAnalyticsSummary(daysValue || analyticsRange);
        }
    }, [analyticsRange, fetchAnalyticsSummary]);

    const analyticsRangeValue = typeof analyticsSummary?.overview?.rangeDays === 'number'
        ? analyticsSummary.overview.rangeDays
        : analyticsRange;

    const analyticsContextValue = useMemo(() => ({
        summary: analyticsSummary,
        loading: analyticsLoading,
        error: analyticsError,
        rangeDays: analyticsRangeValue,
        reload: reloadAnalytics
    }), [analyticsSummary, analyticsLoading, analyticsError, analyticsRangeValue, reloadAnalytics]);

    const handleBroadcastToggle = async () => {
        if (broadcastSaving) return;
        const previousState = notification.isOpen;
        const nextState = !previousState;
        const payloadContent = notification.content;

        setNotification((prev) => ({ ...prev, isOpen: nextState }));
        setBroadcastSaving(true);
        try {
            await updateBroadcast({
                content: payloadContent,
                active: nextState,
                style: notification.style || "ALERT"
            });
            alert(nextState ? "紧急广播已开启并保存" : "紧急广播已关闭并保存");
        } catch (error) {
            console.error("Failed to toggle broadcast", error);
            alert("同步广播状态失败，请稍后重试");
            setNotification((prev) => ({ ...prev, isOpen: previousState }));
        } finally {
            setBroadcastSaving(false);
        }
    };

    return (
        <div className={`min-h-screen flex ${bgClass} ${textClass}`}>
            {/* Sidebar */}
            <aside
                className={`w-64 flex-shrink-0 ${sidebarBg} border-r ${sidebarBorder} flex flex-col fixed h-full z-40 transition-colors`}>
                <nav className="flex-1 p-4 pt-6 space-y-6 overflow-y-auto">
                    {navSections.map((section, idx) => (
                        <div key={section.title || `section-${idx}`} className="space-y-2">
                            {section.title && (
                                <div className={`px-2 text-[11px] font-semibold uppercase tracking-[0.08em] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {section.title}
                                </div>
                            )}
                            <div className={`space-y-1 ${section.title ? (isDarkMode ? 'pl-2 border-l border-gray-800' : 'pl-2 border-l border-gray-200') : ''}`}>
                                {section.items.map(({ key, label, icon: Icon }) => (
                                    <Link
                                        key={key}
                                        to={key === 'dashboard' ? '/admin' : `/admin/${key}`}
                                        className={`group w-full text-left pl-3 pr-3 py-2 rounded text-sm font-medium flex items-center gap-3 transition-colors ${activeTab === key
                                            ? 'bg-indigo-500 text-white shadow-lg'
                                            : `hover:bg-indigo-100 hover:text-indigo-600 ${isDarkMode ? 'text-gray-300 hover:bg-gray-800 hover:text-white' : 'text-gray-800'}`
                                            }`}
                                    >
                                        <Icon size={18} className="shrink-0" />
                                        <span>{label}</span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>
                <div className="p-4 border-t border-gray-100">
                    <button onClick={() => setView('home')}
                        className="text-sm text-gray-500 hover:text-black flex items-center gap-2"><LogOut
                            size={14} /> 返回前台
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 ml-64 flex flex-col">
                {/* Top Bar */}
                <header
                    className={`sticky z-30 h-16 flex items-center justify-between px-8 ${topbarBg} border-b ${sidebarBorder} shadow-sm`}
                    style={{ top: headerHeight }}>
                    <h1 className="text-xl font-bold">{activeLabel}</h1>
                    <div className="flex items-center space-x-4">
                        <span className={`text-xs px-3 py-1 rounded font-bold text-white ${ROLES[user.role].color}`}>
                            {ROLES[user.role].label}
                        </span>
                        <button onClick={handleLogout}
                            className="text-sm text-gray-500 hover:text-red-500 flex items-center gap-1">
                            <LogOut size={16} /> 退出登录
                        </button>
                    </div>
                </header>

                <main className="flex-1 p-8">
                    <AnalyticsSummaryContext.Provider value={analyticsContextValue}>
                        {permissionError && (
                            <div
                                className="mb-4 border-l-4 border-amber-500 bg-amber-50 text-amber-700 px-4 py-3 text-sm">
                                权限数据加载失败：{permissionError}
                            </div>
                        )}
                        {permissionLoading && (
                            <div className="mb-4 text-sm text-gray-500">权限信息加载中，请稍候...</div>
                        )}
                        {!permissionLoading && tabs.length === 0 && (
                            <PermissionNotice
                                title="暂无可访问模块"
                                description="当前账号尚未被授予任何后台权限，请联系超级管理员配置。"
                            />
                        )}
                        <Routes>
                            <Route index element={<DashboardView isDarkMode={isDarkMode} user={user} />} />
                            <Route path="dashboard" element={<DashboardView isDarkMode={isDarkMode} user={user} />} />
                            <Route path="create-post" element={<CreatePostView isDarkMode={isDarkMode} user={user} />} />
                            <Route path="analytics" element={<AnalyticsView isDarkMode={isDarkMode} user={user} />} />
                            <Route path="comments" element={<CommentsAdminView isDarkMode={isDarkMode} />} />
                            <Route path="categories" element={<CategoriesView isDarkMode={isDarkMode} />} />
                            <Route path="taxonomy" element={<TaxonomyView isDarkMode={isDarkMode} />} />
                            <Route path="about" element={<AboutAdminView isDarkMode={isDarkMode} user={user} onSaved={onAboutSaved} />} />
                            <Route path="posts" element={<PostsView isDarkMode={isDarkMode} />} />
                            <Route path="posts/edit" element={<EditPostView isDarkMode={isDarkMode} />} />
                            <Route path="users" element={<UserManagementView isDarkMode={isDarkMode} />} />
                            <Route path="permissions" element={<PermissionsView isDarkMode={isDarkMode} />} />
                            <Route path="settings" element={<SystemSettingsView isDarkMode={isDarkMode} user={user} notification={notification} setNotification={setNotification} onGameChanged={loadGameList} />} />
                            <Route path="profile" element={<AdminProfile isDarkMode={isDarkMode} />} />
                            <Route path="*" element={<div className="text-xl p-8 text-center">功能开发中...</div>} />
                        </Routes>
                    </AnalyticsSummaryContext.Provider>

                </main>
            </div>
        </div>
    );
};


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
        } catch (e) {
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
        return () => {
            sparkTimersRef.current.forEach((timer) => clearTimeout(timer));
        };
    }, []);

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
        if (scrollPercent > 0.95) {
            spawnSparkles();
        }
        scrollToTop();
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
                    onTouchStart={startDrag}
                    onClick={handleClick}
                    style={{ left: `${position.x}px`, top: `${position.y}px` }}
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
    }, [isDarkMode, triggerThemeOverdrive, themeOverdriveLock, showThemeMessage]);
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
    const siteVersion = meta?.version || '';
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
        fetch('https://api.ipify.org?format=json', { cache: 'no-store' })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (cancelled || !data || !data.ip) return;
                clientIpRef.current = data.ip;
                if (typeof window !== 'undefined') {
                    window.__SG_CLIENT_IP__ = data.ip;
                }
            })
            .catch(() => {
                /* 忽略 IP 查询失败 */
            });
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
    }, [view, articleId, gameId]);

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
    }, [view, sendPageView]);

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
                                <span>游戏中心</span>
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
                                toggleMenu={() => setMenuOpen(!menuOpen)}
                                isDarkMode={isDarkMode}
                                onToggleTheme={handleThemeToggle}
                                onProfileClick={handleProfileNav}
                                backgroundEnabled={backgroundEnabled}
                                onToggleBackground={handleBackgroundToggle}
                                themeLockActive={themeOverdriveLock}
                                pageSize={homePageSize}
                                onPageSizeChange={handleHomePageSizeChange}
                                pageSizeOptions={PAGE_SIZE_OPTIONS}
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
            <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
                <div className="flex items-center gap-2 mr-8 flex-shrink-0">
                    <Activity className="text-[#00E096] animate-pulse" />
                    <span className="font-black tracking-widest uppercase">System Status</span>
                </div>

                <div className="flex items-center gap-8 md:gap-12 overflow-visible">
                    {items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 flex-shrink-0 group cursor-default relative">
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
    const KONAMI_CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
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
    }, [activeParent, scrollToPostsTop]);

    const handleSubClick = useCallback((subId) => {
        setActiveSub(subId);
        scrollToPostsTop();
    }, [scrollToPostsTop]);

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
                    <div className="w-full lg:w-1/4 space-y-8">
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
                            className={`mb-8 border-2 border-black rounded-xl shadow-[6px_6px_0px_0px_#000] overflow-hidden ${isDarkMode ? 'bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white' : 'bg-gradient-to-r from-[#FFF3A3] via-white to-[#FFE4E6] text-black'}`}>
                            <div className="flex flex-col md:flex-row md:items-center gap-3 px-5 py-4">
                                <div className="flex items-center gap-2 font-black text-lg tracking-tight">
                                    <Search size={18} />
                                    <span>文章搜索</span>
                                </div>
                                <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3">
                                    <div
                                        className={`flex items-center gap-2 flex-1 px-3 py-2 border-2 border-black rounded-lg shadow-[3px_3px_0px_0px_#000] ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}`}>
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
                                                className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md border-2 border-black shadow-[2px_2px_0px_0px_#000] ${isDarkMode ? 'bg-white text-black hover:-translate-y-0.5' : 'bg-black text-white hover:bg-[#FF0080]'}`}
                                            >
                                                <X size={14} /> 清空
                                            </button>
                                        )}
                                    </div>
                                    <div
                                        className={`text-[11px] font-mono font-bold px-3 py-2 border-2 border-dashed border-black rounded-lg ${isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-black/5 text-gray-800'}`}>
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
                                    return (
                                        <motion.div
                                            key={post.id}
                                            initial={{ opacity: 0, y: 50 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.1, duration: 0.5 }}
                                            whileHover="hover"
                                        >
                                            <TiltCard onClick={() => {
                                                setArticleId(post.id);
                                                setView('article');
                                            }}>
                                                <div className="flex flex-col md:flex-row">
                                                    <div
                                                        className={`md:w-1/3 h-48 md:h-auto ${post.color} border-b-2 md:border-b-0 md:border-r-2 border-black p-6 flex flex-col justify-between text-white relative overflow-hidden group`}>
                                                        <motion.div
                                                            className="absolute top-0 right-0 p-4"
                                                            initial="rest"
                                                            animate="rest"
                                                            variants={{
                                                                rest: { opacity: 0.2, scale: 1 },
                                                                hover: { opacity: 0.4, scale: 1.08 }
                                                            }}
                                                            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
                                                        >
                                                            <Code size={120} />
                                                        </motion.div>
                                                        <span className="relative z-10 font-black text-5xl opacity-50">
                                                            {(idx + 1 + (currentPage - 1) * pageSize).toString().padStart(2, '0')}
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
                                                                    <Sparkles size={14} strokeWidth={3} />
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
                                                                        size={18} /> {viewCount}</span>
                                                                <span
                                                                    className="flex items-center gap-1 hover:text-[#6366F1]"><MessageSquare
                                                                        size={18} /> {commentCount}</span>
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
                                                className={`h-10 px-3 inline-flex items-center justify-center rounded-full text-sm font-black tracking-[0.35em] border-2 border-black opacity-90 hover:opacity-100 transition-opacity ${isDarkMode
                                                    ? 'bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800 text-gray-200 shadow-[4px_4px_0px_0px_#000]'
                                                    : 'bg-gradient-to-r from-[#FFF3A3] via-white to-[#FFE066] text-gray-800 shadow-[4px_4px_0px_0px_#000]'}`}
                                            >
                                                ···
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
    const handleMonthJump = useCallback((anchorId) => {
        if (typeof document === 'undefined' || !anchorId) return;
        const el = document.getElementById(anchorId);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, []);
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

                <div className="mt-12 flex flex-col lg:flex-row gap-8">
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
                                                    const category = post.category || post.parentCategory || post?.summary?.category || '未分类';
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
                                                            <div className="flex flex-wrap gap-3 text-xs font-bold">
                                                                <span className="px-2 py-1 border-2 border-black rounded-full bg-[#FFF5C0] text-black">{category}</span>
                                                                {tags.slice(0, 4).map((tag) => (
                                                                    <span key={`${post.id}-${tag}`} className="px-2 py-1 border-2 border-black rounded-full bg-[#FFF5C0] text-black">
                                                                        {tag}
                                                                    </span>
                                                                ))}
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
                            <div className={`${cardBg} border-2 ${borderColor} rounded-2xl p-5 sticky top-32 shadow-[6px_6px_0px_0px_#000]`}>
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
            return (
                <div
                    className={`not-prose my-6 rounded-2xl border-2 border-black overflow-hidden shadow-[6px_6px_0px_0px_#000] ${isDarkMode ? 'border-gray-600' : ''}`}>
                    <div
                        className={`flex items-center gap-2 px-4 py-2 border-b-2 border-black ${isDarkMode ? 'bg-[#0B1221] text-gray-200 border-gray-700' : 'bg-gray-100 text-gray-600'}`}>
                        <div className="w-4 h-4 rounded-full bg-[#FF5F56] border border-black/10"></div>
                        <div className="w-4 h-4 rounded-full bg-[#FFBD2E] border border-black/10"></div>
                        <div className="w-4 h-4 rounded-full bg-[#27C93F] border border-black/10"></div>
                        <span className="ml-2 text-[10px] font-black tracking-[0.2em]">CODE</span>
                    </div>
                    <pre
                        className={`p-5 overflow-auto m-0 ${isDarkMode ? 'bg-[#0B1221] text-gray-100' : 'bg-white text-gray-900'}`}>
                        <code className={`${className} !bg-transparent !p-0 !border-none font-mono text-sm`} {...props}>
                            {textContent}
                        </code>
                    </pre>
                </div>
            );
        }
    }), [inlineCodeBg, isDarkMode]);

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

function AboutAdminView({ isDarkMode, user, onSaved }) {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [assetsFolder, setAssetsFolder] = useState('');
    const fileInputRef = useRef(null);
    const imageInputRef = useRef(null);

    const loadAboutAdmin = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await adminFetchAbout();
            const data = res.data || res;
            setContent(data?.contentMd || '');
        } catch (e) {
            setError(e.message || '加载关于页失败');
            setContent('');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAboutAdmin();
    }, [loadAboutAdmin]);

    const ensureAssetsSlug = useCallback(async () => {
        if (assetsFolder) return assetsFolder;
        const res = await reservePostAssetsFolder();
        const data = res.data || res;
        if (!data?.folder) throw new Error('未获取到资源目录');
        setAssetsFolder(data.folder);
        return data.folder;
    }, [assetsFolder]);

    const insertImagesAtCursor = (urls = []) => {
        if (!urls.length) return;
        const snippet = urls.map((url, idx) => `![about-${idx + 1}](${url})`).join('\n') + '\n';
        setContent((prev) => {
            const textarea = document.getElementById('about-md-editor');
            if (!textarea) return `${prev}${prev.endsWith('\n') ? '' : '\n'}${snippet}`;
            const start = textarea.selectionStart ?? prev.length;
            const end = textarea.selectionEnd ?? start;
            const before = prev.slice(0, start);
            const after = prev.slice(end);
            return `${before}${snippet}${after}`;
        });
    };

    const handleInlineImageUpload = async (event) => {
        const files = Array.from(event.target.files || []);
        if (!files.length) return;
        setMessage('图片上传中…');
        setError('');
        try {
            const slug = await ensureAssetsSlug();
            const res = await uploadPostAssets(files, slug);
            const data = res.data || res;
            const urls = data?.urls || [];
            if (urls.length) insertImagesAtCursor(urls);
            setMessage('图片已上传并插入 Markdown');
        } catch (e) {
            setError(e.message || '图片上传失败');
        } finally {
            setSaving(false);
            event.target.value = null;
        }
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            const text = await file.text();
            setContent(text);
            setMessage(`已载入文件：${file.name}`);
        } catch (e) {
            setError(e.message || '读取文件失败');
        } finally {
            event.target.value = null;
        }
    };

    const handleSave = async () => {
        if (!content.trim()) {
            setError('正文不能为空');
            setMessage('');
            return;
        }
        setSaving(true);
        setError('');
        setMessage('');
        try {
            await adminSaveAbout({ contentMd: content });
            setMessage('已保存');
            if (typeof onSaved === 'function') {
                onSaved();
            }
            await loadAboutAdmin();
        } catch (e) {
            setError(e.message || '保存失败');
        } finally {
            setSaving(false);
        }
    };

    if (!user || user.role !== 'SUPER_ADMIN') {
        return <PermissionNotice title="无权限" description="仅超级管理员可以编辑“关于本站”页面" />;
    }

    const surface = isDarkMode ? THEME.colors.surfaceDark : THEME.colors.surfaceLight;
    const text = isDarkMode ? 'text-gray-100' : 'text-gray-900';
    const inputClass = `w-full p-3 border-2 rounded-lg ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-black'} focus:border-indigo-500 outline-none`;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[#FF0080]">About Page</p>
                    <h2 className="text-3xl font-black">关于本站单页</h2>
                    <p className="text-sm text-gray-500 mt-1">只需填写 Markdown 正文或上传 .md 文件，其余元信息全部省略。</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={loadAboutAdmin}
                        className={`px-4 py-2 border-2 border-black rounded-full text-sm font-bold shadow-[4px_4px_0px_0px_#000] ${isDarkMode ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-white text-black hover:bg-gray-100'}`}
                    >刷新</button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={`px-4 py-2 border-2 border-black rounded-full text-sm font-bold shadow-[4px_4px_0px_0px_#000] ${saving ? 'opacity-60 cursor-not-allowed' : 'bg-[#00E096] hover:-translate-y-0.5'} `}
                    >{saving ? '保存中…' : '保存'}</button>
                </div>
            </div>

            {(loading || error || message) && (
                <div className="flex gap-3 items-center text-sm">
                    {loading && <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 font-bold">加载中…</span>}
                    {message && <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-bold">{message}</span>}
                    {error && <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 font-bold">{error}</span>}
                </div>
            )}

            <div className={`${surface} ${text} border-2 border-black rounded-2xl p-4 space-y-4 shadow-[8px_8px_0px_0px_#000]`}>
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black">Markdown 正文</h3>
                    <div className="flex gap-2">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".md,.markdown,.txt"
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                        <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleInlineImageUpload}
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-3 py-1 border-2 border-black rounded-full text-xs font-bold bg-white text-black shadow-[3px_3px_0px_0px_#000]"
                        >上传 MD</button>
                        <button
                            onClick={() => imageInputRef.current?.click()}
                            className="px-3 py-1 border-2 border-black rounded-full text-xs font-bold bg-white text-black shadow-[3px_3px_0px_0px_#000]"
                        >上传图片</button>
                    </div>
                </div>
                <textarea
                    id="about-md-editor"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={28}
                    className={`${inputClass} font-mono text-sm leading-6 min-h-[520px]`}
                    placeholder="在此粘贴或输入 Markdown 内容…"
                />
                <div className="text-xs text-gray-500">提示：图片上传会自动将 Markdown 链接插入光标处，资源目录自动生成。</div>
            </div>
        </div>
    );
}

const LoginView = ({ setView, setUser, isDarkMode, doLogin }) => {
    const navigate = useNavigate();
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
            if (window.history.length > 1) {
                navigate(-1);
            } else {
                setView('home');
            }
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
