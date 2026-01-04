import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useBlog } from "../../hooks/useBlogData";
import CommentsSection from "../../components/comments/CommentsSection.jsx";
import ImageWithFallback from "../../components/common/ImageWithFallback.jsx";
import { buildAssetUrl } from "../../utils/asset.js";
import { fetchPostNeighbors } from "../../api";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { motion, AnimatePresence } from 'framer-motion';
import { useLayoutOffsets } from "../../contexts/LayoutOffsetContext.jsx";
import sanitizeHtml from "../../utils/sanitize.js";
import { rehypeSanitize, SG_REHYPE_SANITIZE_SCHEMA } from "../../utils/rehypeSanitizeSchema.js";
import {
    THEME,
    MOCK_POSTS,
    DEFAULT_AVATAR,
    remarkHighlight
} from "../shared.js";
import {
    BookOpen,
    CheckCircle,
    ChevronRight,
    Clock,
    Code,
    Copy,
    Edit,
    Eye,
    FileText,
    Hash,
    Home,
    List,
    MessageCircle,
    Share2,
    Tag,
    X
} from 'lucide-react';
const ArticleDetail = ({
    id,
    setView,
    setArticleId,
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
    const postSource = summary || MOCK_POSTS.find(p => p.id === id) || {
        id,
        title: '文章加载中…',
        excerpt: '',
        parentCategory: '',
        category: '',
        tags: [],
        views: 0,
        date: '',
        color: 'shadow-[8px_8px_0px_0px_#000]'
    };

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
    const formatPostDate = useCallback((input) => {
        if (!input) return '';
        if (input instanceof Date) return input.toLocaleDateString();
        const text = String(input).trim();
        if (!text) return '';
        const parsed = new Date(text);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed.toLocaleDateString();
        }
        return text;
    }, []);

    const [neighbors, setNeighbors] = useState({ prev: null, next: null, related: [] });

    useEffect(() => {
        if (!id) return;
        let active = true;
        fetchPostNeighbors(id)
            .then((res) => {
                if (!active) return;
                const data = res?.data || res || {};
                setNeighbors({
                    prev: data?.prev || null,
                    next: data?.next || null,
                    related: Array.isArray(data?.related) ? data.related : []
                });
            })
            .catch(() => {
                if (!active) return;
                setNeighbors({ prev: null, next: null, related: [] });
            });
        return () => {
            active = false;
        };
    }, [id]);

    const relatedPosts = useMemo(() => (
        Array.isArray(neighbors?.related) ? neighbors.related : []
    ), [neighbors?.related]);
    const buildNavMeta = useCallback((item) => {
        if (!item) return null;
        const rawDate = item.date || item.publishedAt || item.published_at || item.updatedAt || item.createdAt;
        return {
            id: item.id,
            title: item.title || item.name || '未命名文章',
            excerpt: item.excerpt || item.summary || item.description || '暂无摘要',
            date: formatPostDate(rawDate),
            category: item.category || item.categoryName || '',
            parentCategory: item.parentCategory || item.parentName || '',
            views: item.views ?? item.viewsCount ?? null
        };
    }, [formatPostDate]);
    const prevMeta = useMemo(() => buildNavMeta(neighbors?.prev), [neighbors?.prev, buildNavMeta]);
    const nextMeta = useMemo(() => buildNavMeta(neighbors?.next), [neighbors?.next, buildNavMeta]);

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
    const [previewZoom, setPreviewZoom] = useState(1);
    const [previewPan, setPreviewPan] = useState({ x: 0, y: 0 });
    const previewPanRef = useRef({
        active: false,
        pointerId: null,
        startX: 0,
        startY: 0,
        originX: 0,
        originY: 0,
        dragged: false
    });
    const [activeTocId, setActiveTocId] = useState(null);
    const tocDesktopListRef = useRef(null);
    const tocDrawerListRef = useRef(null);
    const tocHeadingsRef = useRef([]);
    const tocRafRef = useRef(0);
    const [tocItems, setTocItems] = useState([]);
    const [tocDrawerOpen, setTocDrawerOpen] = useState(false);
    const [tocCollapsed, setTocCollapsed] = useState(false);
    const [tocLeft, setTocLeft] = useState(null);
    const [entryReady, setEntryReady] = useState(false);
    const commentJumpRef = useRef(null);
    const tocScrollbarClass = isDarkMode ? 'sg-scrollbar sg-scrollbar-dark' : 'sg-scrollbar';
    const tocTextClass = useCallback((level) => {
        if (level === 1) return 'text-[12px] font-black';
        if (level === 2) return 'text-[12px] font-bold opacity-95';
        return 'text-[11px] font-semibold opacity-90';
    }, []);
    const TocTreeGutter = useCallback(({ level }) => {
        const trunk = isDarkMode ? 'bg-gray-600/80' : 'bg-black/20';
        const branch = isDarkMode ? 'bg-gray-400/80' : 'bg-black/30';
        const dot = isDarkMode ? 'bg-gray-200' : 'bg-black/50';
        const x1 = 8;
        const x2 = 20;
        const x3 = 32;
        const pivot = level === 1 ? x1 : (level === 2 ? x2 : x3);
        const connectorFrom = level === 1 ? x1 : (level === 2 ? x2 : x3);
        const connectorWidth = 12;

        return (
            <div className="relative w-10 shrink-0 pt-1">
                {level >= 1 && (
                    <span className={`absolute top-0 bottom-0 w-px ${trunk}`} style={{ left: x1 }} />
                )}
                {level >= 2 && (
                    <span className={`absolute top-0 bottom-0 w-px ${trunk}`} style={{ left: x2 }} />
                )}
                {level >= 3 && (
                    <span className={`absolute top-0 bottom-0 w-px ${trunk}`} style={{ left: x3 }} />
                )}
                <span
                    className={`absolute h-px ${branch}`}
                    style={{ left: connectorFrom, top: 12, width: connectorWidth }}
                />
                <span
                    className={`absolute rounded-full ${dot}`}
                    style={{ left: pivot - 2, top: 10, width: 5, height: 5 }}
                />
            </div>
        );
    }, [isDarkMode]);
    const handleImagePreview = useCallback((src) => {
        if (!src) return;
        setPreviewZoom(1);
        setPreviewPan({ x: 0, y: 0 });
        previewPanRef.current.active = false;
        previewPanRef.current.pointerId = null;
        previewPanRef.current.dragged = false;
        setPreviewImage(src);
    }, []);
    const closeImagePreview = useCallback(() => {
        setPreviewImage(null);
        setPreviewZoom(1);
        setPreviewPan({ x: 0, y: 0 });
        previewPanRef.current.active = false;
        previewPanRef.current.pointerId = null;
        previewPanRef.current.dragged = false;
    }, []);
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
    const navSurface = isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-white text-black';
    const navMuted = isDarkMode ? 'text-gray-400' : 'text-gray-600';

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

    const safeHtml = useMemo(() => {
        const html = resolvedHtml || contentHtml;
        return sanitizeHtml(html);
    }, [resolvedHtml, contentHtml]);

    const scrollToComments = useCallback(() => {
        if (typeof document === 'undefined' || typeof window === 'undefined') return;
        const commentsEl = document.getElementById('comments-section');
        if (!commentsEl) return;
        const offset = fixedTopOffset + 12;
        const scrollToTarget = () => {
            const rect = commentsEl.getBoundingClientRect();
            const top = rect.top + window.pageYOffset - offset;
            window.scrollTo({ top: top > 0 ? top : 0, behavior: 'smooth' });
        };
        scrollToTarget();
        setTimeout(scrollToTarget, 220);
    }, [fixedTopOffset]);
    const handleTocJump = useCallback((targetId) => {
        if (!targetId || typeof document === 'undefined' || typeof window === 'undefined') return;
        const target = document.getElementById(targetId);
        if (!target) return;
        const offset = fixedTopOffset + 12;
        const rect = target.getBoundingClientRect();
        const top = rect.top + window.pageYOffset - offset;
        window.scrollTo({ top: top > 0 ? top : 0, behavior: 'smooth' });
        setTocDrawerOpen(false);
        setActiveTocId(targetId);
    }, [fixedTopOffset]);

    const recomputeTocHeadings = useCallback(() => {
        if (typeof document === 'undefined' || typeof window === 'undefined') return;
        const list = (tocItems || [])
            .map((i) => i?.id)
            .filter(Boolean)
            .map((id) => {
                const el = document.getElementById(id);
                if (!el) return null;
                const rect = el.getBoundingClientRect();
                const top = rect.top + window.pageYOffset;
                return { id, top };
            })
            .filter(Boolean);
        tocHeadingsRef.current = list;
    }, [tocItems]);

    const updateActiveTocFromScroll = useCallback(() => {
        if (typeof window === 'undefined') return;
        const headings = tocHeadingsRef.current || [];
        if (!headings.length) {
            recomputeTocHeadings();
        }
        const list = tocHeadingsRef.current || [];
        if (!list.length) return;

        const isAtBottom = window.pageYOffset + window.innerHeight >= (document.documentElement?.scrollHeight || document.body.scrollHeight) - 8;
        if (isAtBottom) {
            const last = list[list.length - 1];
            if (last?.id && last.id !== activeTocId) setActiveTocId(last.id);
            return;
        }

        const cursor = window.pageYOffset + fixedTopOffset + 24;
        let current = list[0]?.id || null;
        for (let i = 0; i < list.length; i++) {
            if (list[i].top <= cursor) {
                current = list[i].id;
            } else {
                break;
            }
        }
        if (current && current !== activeTocId) {
            setActiveTocId(current);
        }
    }, [activeTocId, fixedTopOffset, recomputeTocHeadings]);

    useEffect(() => {
        if (!entryReady) return;
        recomputeTocHeadings();
        if (!activeTocId && tocItems && tocItems.length > 0) {
            setActiveTocId(tocItems[0].id);
        }
        const t1 = setTimeout(recomputeTocHeadings, 600);
        const t2 = setTimeout(recomputeTocHeadings, 1800);
        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, [entryReady, tocItems, activeTocId, recomputeTocHeadings]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!entryReady) return;

        const schedule = () => {
            if (tocRafRef.current) return;
            tocRafRef.current = window.requestAnimationFrame(() => {
                tocRafRef.current = 0;
                updateActiveTocFromScroll();
            });
        };

        window.addEventListener('scroll', schedule, { passive: true });
        window.addEventListener('resize', schedule);
        schedule();
        return () => {
            window.removeEventListener('scroll', schedule);
            window.removeEventListener('resize', schedule);
            if (tocRafRef.current) {
                window.cancelAnimationFrame(tocRafRef.current);
                tocRafRef.current = 0;
            }
        };
    }, [entryReady, updateActiveTocFromScroll]);

    useEffect(() => {
        if (!activeTocId) return;
        const escapeAttr = (value) => String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        const selector = `[data-toc-id="${escapeAttr(activeTocId)}"]`;

        if (!tocCollapsed && tocDesktopListRef.current) {
            const el = tocDesktopListRef.current.querySelector(selector);
            el?.scrollIntoView?.({ block: 'nearest' });
        }
        if (tocDrawerOpen && tocDrawerListRef.current) {
            const el = tocDrawerListRef.current.querySelector(selector);
            el?.scrollIntoView?.({ block: 'nearest' });
        }
    }, [activeTocId, tocCollapsed, tocDrawerOpen]);

    const clamp = useCallback((value, min, max) => Math.min(max, Math.max(min, value)), []);

    const handlePreviewWheel = useCallback((event) => {
        if (!previewImage) return;
        event.preventDefault();
        const delta = event.deltaY;
        const step = event.ctrlKey ? 1.08 : 1.12;
        const factor = delta < 0 ? step : (1 / step);
        setPreviewZoom((prev) => {
            const next = clamp(prev * factor, 1, 4);
            if (next === 1) {
                setPreviewPan({ x: 0, y: 0 });
            }
            return next;
        });
    }, [clamp, previewImage]);

    const handlePreviewPointerDown = useCallback((event) => {
        if (!previewImage) return;
        if (previewZoom <= 1) return;
        const el = event.currentTarget;
        if (!el?.setPointerCapture) return;
        try {
            el.setPointerCapture(event.pointerId);
        } catch {
            return;
        }
        previewPanRef.current.active = true;
        previewPanRef.current.pointerId = event.pointerId;
        previewPanRef.current.startX = event.clientX;
        previewPanRef.current.startY = event.clientY;
        previewPanRef.current.originX = previewPan.x;
        previewPanRef.current.originY = previewPan.y;
        previewPanRef.current.dragged = false;
    }, [previewImage, previewPan.x, previewPan.y, previewZoom]);

    const handlePreviewPointerMove = useCallback((event) => {
        if (!previewPanRef.current.active) return;
        if (previewPanRef.current.pointerId !== event.pointerId) return;
        const dx = event.clientX - previewPanRef.current.startX;
        const dy = event.clientY - previewPanRef.current.startY;
        if (Math.abs(dx) + Math.abs(dy) > 4) {
            previewPanRef.current.dragged = true;
        }
        setPreviewPan({
            x: previewPanRef.current.originX + dx,
            y: previewPanRef.current.originY + dy
        });
    }, []);

    const handlePreviewPointerUp = useCallback((event) => {
        if (previewPanRef.current.pointerId !== event.pointerId) return;
        previewPanRef.current.active = false;
        previewPanRef.current.pointerId = null;
        setTimeout(() => {
            previewPanRef.current.dragged = false;
        }, 0);
    }, []);

    const handlePreviewImageClick = useCallback((event) => {
        event.preventDefault();
        event.stopPropagation();
        if (previewPanRef.current.dragged) {
            return;
        }
        closeImagePreview();
    }, [closeImagePreview]);

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
    useEffect(() => {
        if (typeof document === 'undefined') return;
        const container = articleContentRef.current;
        if (!container) return;
        const headings = Array.from(container.querySelectorAll('h1, h2, h3'));
        const slugCounter = {};
        const items = headings.map((node) => {
            const text = (node.textContent || '').trim();
            if (!text) return null;
            if (!node.id) {
                const base = slugifyHeading(text);
                const count = slugCounter[base] || 0;
                slugCounter[base] = count + 1;
                node.id = count === 0 ? base : `${base}-${count + 1}`;
            }
            const tag = node.tagName;
            const level = tag === 'H1' ? 1 : (tag === 'H3' ? 3 : 2);
            return {
                id: node.id,
                text,
                level
            };
        }).filter(Boolean);
        setTocItems(items);
    }, [resolvedHtml, contentMd, slugifyHeading]);

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

    const excerptMarkdownComponents = useMemo(() => ({
        ...markdownComponents,
        p: ({ children }) => <p className="m-0">{children}</p>,
    }), [markdownComponents]);

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
    useEffect(() => {
        setTocDrawerOpen(false);
    }, [id]);
    useEffect(() => {
        if (!entryReady || typeof window === 'undefined') return;
        const tocWidth = 256;
        const margin = 16;
        const updatePosition = () => {
            const target = commentJumpRef.current;
            if (!target) return;
            const rect = target.getBoundingClientRect();
            let nextLeft = rect.left;
            const maxLeft = window.innerWidth - tocWidth - margin;
            nextLeft = Math.max(margin, Math.min(nextLeft, maxLeft));
            setTocLeft(nextLeft);
        };
        updatePosition();
        window.addEventListener('resize', updatePosition);
        return () => window.removeEventListener('resize', updatePosition);
    }, [entryReady, fixedTopOffset, tocItems.length]);

    const handleShare = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            setShowShareToast(true);
            setTimeout(() => setShowShareToast(false), 3000);
        });
    };
    const handleOpenSibling = useCallback((target) => {
        if (!target?.id) return;
        if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, behavior: 'auto' });
        }
        if (typeof setArticleId === 'function') {
            setArticleId(target.id);
        }
        setView('article');
    }, [setArticleId, setView]);
    const handleOpenRelated = useCallback((target) => {
        if (!target?.id) return;
        if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, behavior: 'auto' });
        }
        if (typeof setArticleId === 'function') {
            setArticleId(target.id);
        }
        setView('article');
    }, [setArticleId, setView]);
    const renderRelatedCard = (item) => {
        if (!item?.id) return null;
        const title = item.title || item.name || '未命名文章';
        const rawDate = item.date || item.publishedAt || item.published_at || item.updatedAt || item.createdAt;
        const date = formatPostDate(rawDate);
        const views = item.views ?? item.viewsCount ?? null;
        return (
            <button
                key={`related-${item.id}`}
                type="button"
                onClick={() => handleOpenRelated(item)}
                title={`跳转文章：${title}`}
                className={`w-full text-left border-2 border-black rounded-none p-4 shadow-[4px_4px_0px_0px_#000] transition-all hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_#000] ${navSurface}`}
            >
                <h4 className="text-lg font-black leading-snug line-clamp-2">{title}</h4>
                <div className={`mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold ${navMuted}`}>
                    {date && (
                        <span className="inline-flex items-center gap-1">
                            <Clock size={12} />
                            {date}
                        </span>
                    )}
                    {views !== null && views !== undefined && (
                        <span className="inline-flex items-center gap-1">
                            <Eye size={12} />
                            {views} 阅读
                        </span>
                    )}
                </div>
            </button>
        );
    };

    const getAvatarUrl = (avatarPath) => {
        if (!avatarPath) return DEFAULT_AVATAR;
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
    const renderNavCard = (meta, direction) => {
        const isPrev = direction === 'prev';
        const label = isPrev ? '上一篇' : '下一篇';
        const disabled = !meta?.id;
        const badgeClass = isPrev
            ? (isDarkMode ? 'bg-gray-700 text-gray-100' : 'bg-black text-white')
            : (isDarkMode ? 'bg-yellow-500 text-black' : 'bg-[#FFD700] text-black');
        return (
            <button
                type="button"
                disabled={disabled}
                onClick={() => handleOpenSibling(meta)}
                title={disabled ? `暂无${label}` : `跳转${label}：${meta.title}`}
                className={`border-2 border-black rounded-none p-5 shadow-[6px_6px_0px_0px_#000] transition-all h-full flex flex-col text-left ${
                    disabled
                        ? 'opacity-50 cursor-not-allowed'
                        : `hover:-translate-y-0.5 hover:shadow-[8px_8px_0px_0px_#000] ${isDarkMode ? 'hover:bg-gray-800/60' : 'hover:bg-[#FFF7E1]'}`
                } ${navSurface}`}
            >
                <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-2 px-2 py-1 text-[10px] font-black uppercase tracking-[0.3em] border-2 border-black ${badgeClass}`}>
                        {label}
                    </span>
                </div>
                <div className="mt-4 min-h-[56px]">
                    <h4 className="text-lg font-black leading-snug line-clamp-2">
                        {disabled ? '暂无可跳转文章' : meta.title}
                    </h4>
                </div>
                <div className={`mt-4 min-h-[20px] flex flex-wrap items-center gap-3 text-xs font-semibold ${navMuted}`}>
                    {!disabled && (meta?.parentCategory || meta?.category) && (
                        <span className="inline-flex items-center gap-1">
                            <Tag size={12} />
                            {meta.parentCategory ? `${meta.parentCategory} / ${meta.category}` : meta.category}
                        </span>
                    )}
                    {!disabled && meta?.date && (
                        <span className="inline-flex items-center gap-1">
                            <Clock size={12} />
                            {meta.date}
                        </span>
                    )}
                    {!disabled && meta?.views !== null && meta?.views !== undefined && (
                        <span className="inline-flex items-center gap-1">
                            <Eye size={12} />
                            {meta.views} 阅读
                        </span>
                    )}
                    {disabled && (
                        <span className="inline-flex items-center gap-1">
                            <FileText size={12} />
                            {isPrev ? '已到最早' : '已是最新'}
                        </span>
                    )}
                </div>
            </button>
        );
    };

    return (
        <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onAnimationComplete={() => setEntryReady(true)}
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

            {tocItems.length > 0 && (
                <div
                    className="hidden xl:block fixed z-40"
                    style={{
                        top: fixedTopOffset + 80,
                        left: tocLeft ?? 'auto',
                        right: tocLeft === null ? '1.5rem' : 'auto'
                    }}
                >
                    <div className={`w-64 border-2 border-black rounded-none p-4 shadow-[6px_6px_0px_0px_#000] ${navSurface}`}>
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black uppercase tracking-[0.3em]">目录</span>
                            <button
                                type="button"
                                onClick={() => setTocCollapsed((prev) => !prev)}
                                className={`px-2 py-1 border-2 border-black text-xs font-black ${isDarkMode ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-white text-black hover:bg-gray-100'}`}
                            >
                                {tocCollapsed ? '展开' : '收起'}
                            </button>
                        </div>
                        {!tocCollapsed && (
                            <div ref={tocDesktopListRef} className={`mt-3 space-y-2 max-h-[60vh] overflow-y-auto overflow-x-hidden pr-2 ${tocScrollbarClass}`}>
                                {tocItems.map((item) => {
                                    const isActive = item.id === activeTocId;
                                    const activeBg = isDarkMode ? 'bg-white/10' : 'bg-black/5';
                                    const activeRing = isDarkMode ? 'ring-2 ring-white/15' : 'ring-2 ring-black/10';
                                    return (
                                        <button
                                            key={`toc-${item.id}`}
                                            type="button"
                                            onClick={() => handleTocJump(item.id)}
                                            data-toc-id={item.id}
                                            aria-current={isActive ? 'location' : undefined}
                                            className={`w-full text-left py-1 px-1 rounded-md transition-colors ${isActive ? `${activeBg} ${activeRing}` : ''} ${isDarkMode ? 'text-gray-200 hover:text-white' : 'text-gray-700 hover:text-black'}`}
                                        >
                                            <div className="flex items-start gap-2">
                                                <TocTreeGutter level={item.level} />
                                                <span className={`block flex-1 leading-snug ${tocTextClass(item.level)} ${isActive ? (isDarkMode ? 'text-white opacity-100' : 'text-black opacity-100') : ''}`}>
                                                    {item.text}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {tocItems.length > 0 && (
                <button
                    type="button"
                    onClick={() => setTocDrawerOpen(true)}
                    className={`md:hidden fixed bottom-24 right-4 z-[60] px-4 py-2 border-2 border-black font-black shadow-[4px_4px_0px_0px_#000] inline-flex items-center gap-2 ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}`}
                >
                    <List size={16} />
                    目录
                </button>
            )}

            <AnimatePresence>
                {tocDrawerOpen && (
                    <motion.div
                        className="fixed inset-0 z-[70] md:hidden"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="absolute inset-0 bg-black/50"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setTocDrawerOpen(false)}
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', stiffness: 240, damping: 28 }}
                            className={`absolute right-0 top-0 h-full w-[80vw] max-w-xs border-l-2 border-black ${navSurface}`}
                        >
                            <div className={`flex items-center justify-between px-4 py-3 border-b-2 border-black ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
                                <div className="flex items-center gap-2 font-black">
                                    <List size={16} />
                                    目录
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setTocDrawerOpen(false)}
                                    className={`p-2 border-2 border-black ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}`}
                                >
                                    <X size={14} />
                                </button>
                            </div>
                            <div ref={tocDrawerListRef} className={`p-4 space-y-3 overflow-y-auto overflow-x-hidden ${tocScrollbarClass}`}>
                                {tocItems.map((item) => {
                                    const isActive = item.id === activeTocId;
                                    const activeBg = isDarkMode ? 'bg-white/10' : 'bg-black/5';
                                    const activeRing = isDarkMode ? 'ring-2 ring-white/15' : 'ring-2 ring-black/10';
                                    return (
                                        <button
                                            key={`toc-drawer-${item.id}`}
                                            type="button"
                                            onClick={() => handleTocJump(item.id)}
                                            data-toc-id={item.id}
                                            aria-current={isActive ? 'location' : undefined}
                                            className={`w-full text-left py-1 px-1 rounded-md transition-colors ${isActive ? `${activeBg} ${activeRing}` : ''} ${isDarkMode ? 'text-gray-200 hover:text-white' : 'text-gray-700 hover:text-black'}`}
                                        >
                                            <div className="flex items-start gap-2">
                                                <TocTreeGutter level={item.level} />
                                                <span className={`block flex-1 leading-snug ${tocTextClass(item.level)} ${isActive ? (isDarkMode ? 'text-white opacity-100' : 'text-black opacity-100') : ''}`}>
                                                    {item.text}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
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
                        ref={commentJumpRef}
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
                                        e.target.src = DEFAULT_AVATAR;
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

                    <article className={`${proseClass} sg-article-markdown`} ref={articleContentRef}>
                        <div
                            className={`sg-article-excerpt p-6 border-l-8 border-[#FFD700] font-serif italic text-xl mb-8 ${quoteBg} ${quoteText}`}>
                            {post.excerpt ? (
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm, remarkHighlight]}
                                    rehypePlugins={[[rehypeSanitize, SG_REHYPE_SANITIZE_SCHEMA]]}
                                    components={excerptMarkdownComponents}
                                >
                                    {post.excerpt}
                                </ReactMarkdown>
                            ) : null}
                        </div>
                        {shouldRenderMarkdown ? (
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm, remarkMath, remarkHighlight]}
                                rehypePlugins={[rehypeKatex, [rehypeSanitize, SG_REHYPE_SANITIZE_SCHEMA]]}
                                components={markdownComponents}
                            >
                                {contentMd}
                            </ReactMarkdown>
                        ) : contentHtml ? (
                            <div
                                dangerouslySetInnerHTML={{ __html: safeHtml }}
                            />
                        ) : (
                            <p className="font-semibold">暂无正文内容</p>
                        )}
                    </article>

                    <div className="mt-10 mb-8">
                        <div className="flex items-center gap-4">
                            <div className={`h-[2px] flex-1 ${isDarkMode ? 'bg-gray-700' : 'bg-black'}`}></div>
                            <span className={`px-4 py-1 border-2 border-black text-xs font-black uppercase tracking-[0.4em] ${isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-black'}`}>
                                正文到此结束
                            </span>
                            <div className={`h-[2px] flex-1 ${isDarkMode ? 'bg-gray-700' : 'bg-black'}`}></div>
                        </div>
                    </div>

                    {relatedPosts.length > 0 && (
                        <div className="mt-8">
                            <div className="flex items-center gap-3">
                                <span className={`inline-flex items-center gap-2 px-3 py-1 text-[11px] font-black uppercase tracking-[0.3em] border-2 border-black ${isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-black text-white'}`}>
                                    同分类推荐
                                </span>
                                <span className={`text-xs font-semibold ${navMuted}`}>继续阅读别的精彩内容</span>
                            </div>
                            <div className="grid gap-4 md:grid-cols-3 mt-4">
                                {relatedPosts.map((item) => renderRelatedCard(item))}
                            </div>
                        </div>
                    )}

                    <div className="mt-10">
                        <div className="flex items-center gap-3">
                            <span className={`inline-flex items-center gap-2 px-3 py-1 text-[11px] font-black uppercase tracking-[0.3em] border-2 border-black ${isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-black text-white'}`}>
                                继续阅读
                            </span>
                            <span className={`text-xs font-semibold ${navMuted}`}>前后篇快速跳转</span>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 mt-4">
                            {renderNavCard(prevMeta, 'prev')}
                            {renderNavCard(nextMeta, 'next')}
                        </div>
                    </div>

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
                        className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center p-0"
                        onClick={closeImagePreview}
                        onWheel={handlePreviewWheel}
                    >
                        <motion.img
                            src={previewImage}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className={`max-w-[92vw] max-h-[92vh] rounded-lg shadow-[8px_8px_0px_0px_#000] border-4 border-white select-none ${previewZoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-out'}`}
                            style={{
                                transform: `translate(${previewPan.x}px, ${previewPan.y}px) scale(${previewZoom})`,
                                transformOrigin: 'center center',
                                willChange: 'transform'
                            }}
                            onClick={handlePreviewImageClick}
                            onPointerDown={handlePreviewPointerDown}
                            onPointerMove={handlePreviewPointerMove}
                            onPointerUp={handlePreviewPointerUp}
                            onPointerCancel={handlePreviewPointerUp}
                            draggable={false}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// --- 2. 炫酷 UI 组件库 (不变) ---

export default ArticleDetail;
