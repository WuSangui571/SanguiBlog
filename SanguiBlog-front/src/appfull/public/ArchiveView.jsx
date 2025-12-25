import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PopButton from "../../components/common/PopButton.jsx";
import { useLayoutOffsets } from "../../contexts/LayoutOffsetContext.jsx";
import { ARCHIVE_MONTH_LABELS, MOCK_POSTS } from "../shared.js";
import { ChevronRight, Clock, FolderPlus, Grid, Tag } from 'lucide-react';

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
                    <div className={`mt-10 ${cardBg} border-2 ${borderColor} rounded-2xl px-6 py-5 shadow-[6px_6px_0px_0px_#000]`}>
                        <div className="flex items-center gap-3 text-sm font-bold text-gray-500">
                            <Grid size={16} />
                            <span>归档加载中…</span>
                        </div>
                        <p className={`mt-2 text-xs ${secondaryText}`}>正在获取最新文章时间线，请稍候。</p>
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

export default ArchiveView;
