import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Filter, Search } from 'lucide-react';
import Hero from './Hero.jsx';
import StatsStrip from './StatsStrip.jsx';
import SiteFooter from '../ui/SiteFooter.jsx';
import { DEFAULT_HERO_TAGLINE, DEFAULT_HOME_QUOTE, DEFAULT_PAGE_SIZE, MOCK_USER } from '../shared.js';

const ArticleList = React.lazy(() => import('./ArticleList.jsx'));

function HomeArticleListPlaceholder({ isDarkMode, stats, author, homeQuote }) {
    const displayAuthor = author || MOCK_USER;
    const quote = (typeof homeQuote === 'string' && homeQuote.trim().length > 0) ? homeQuote : DEFAULT_HOME_QUOTE;
    const text = isDarkMode ? 'text-gray-100' : 'text-gray-900';
    const subText = isDarkMode ? 'text-gray-400' : 'text-gray-600';
    const surface = `home-ios-card home-ios-card--static ${isDarkMode ? 'home-ios-card--dark text-gray-100' : 'text-gray-900'}`;
    const inner = isDarkMode
        ? 'border border-white/10 bg-white/[0.04]'
        : 'border border-white/70 bg-white/55';

    return (
        <div className={`relative z-20 home-redesign-surface ${isDarkMode ? 'bg-[#09111d] is-dark' : 'bg-[#f8f8fa]'}`}>
            <StatsStrip isDarkMode={isDarkMode} stats={stats} />
            <section id="posts" className="relative w-full min-h-screen pt-12 pb-16 overflow-hidden">
                <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 flex flex-col lg:flex-row gap-12">
                    <aside className="hidden lg:block w-full lg:w-1/4 space-y-8" aria-hidden="true">
                        <div className={`${surface} p-6 text-center relative`}>
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full border border-white/60 bg-[#FFD700] shadow-[0_8px_20px_rgba(0,0,0,0.16)] overflow-hidden">
                                <img src={displayAuthor.avatar || MOCK_USER.avatar} alt="" className="w-full h-full object-cover" />
                            </div>
                            <h3 className={`mt-12 font-black text-2xl ${text}`}>
                                {displayAuthor.displayName || displayAuthor.username}
                            </h3>
                            <p className={`text-sm font-bold mb-4 leading-relaxed ${subText}`}>
                                {displayAuthor.title || '保持热爱，持续创作。'}
                            </p>
                            <div className="flex justify-center gap-2">
                                <span className={`h-9 w-9 rounded-2xl ${inner}`} />
                                <span className={`h-9 w-9 rounded-2xl ${inner}`} />
                            </div>
                        </div>

                        <div>
                            <h4 className="font-black text-xl mb-4 flex items-center gap-2 bg-black text-white p-2 transform -rotate-1 w-max">
                                <Filter size={20} /> NAVIGATOR
                            </h4>
                            <div className="flex flex-col gap-3">
                                {['全部', '编程', '研究生', '其他'].map((label, index) => (
                                    <div
                                        key={label}
                                        className={`w-full p-3 font-bold rounded-2xl flex justify-between items-center ${
                                            index === 0
                                                ? 'bg-[#FFD700]/90 text-black border border-[#FFD700]/90'
                                                : `${inner} ${text}`
                                        }`}
                                    >
                                        <span>{label}</span>
                                        <span className="text-sm">›</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className={`${surface} p-5`}>
                            <div className="flex items-center justify-between gap-3">
                                <h4 className={`font-black text-lg ${text}`}>最新评论</h4>
                                <span className={`text-[10px] font-mono ${subText}`}>LOADING</span>
                            </div>
                            <div className="mt-4 space-y-3">
                                <div className={`h-16 rounded-2xl ${inner}`} />
                                <div className={`h-16 rounded-2xl ${inner}`} />
                            </div>
                        </div>
                    </aside>

                    <div className="flex-1 flex flex-col">
                        <div className={`mb-8 ${surface} overflow-hidden ${text}`}>
                            <div className="flex flex-col md:flex-row md:items-center gap-3 px-5 py-4">
                                <div className="flex items-center justify-between gap-3 font-black text-lg tracking-tight">
                                    <div className="flex items-center gap-2">
                                        <Search size={18} />
                                        <span>文章搜索</span>
                                    </div>
                                    <div className={`md:hidden text-[11px] font-mono font-black px-3 py-2 border border-white/70 rounded-xl ${isDarkMode ? 'bg-[#111827]/75 text-gray-100' : 'bg-[#FFD700]/90 text-black'}`}>
                                        加载中
                                    </div>
                                </div>
                                <div className="flex-1 flex flex-col md:flex-row md:items-center gap-3">
                                    <div className={`flex items-center gap-2 flex-1 min-w-0 px-3 py-2 rounded-xl ${inner} ${text}`}>
                                        <Search size={16} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                                        <span className="text-sm font-semibold text-gray-400">请输入关键词搜索</span>
                                    </div>
                                    <div className={`hidden md:block text-[11px] font-mono font-black px-3 py-2 border border-white/70 rounded-xl ${isDarkMode ? 'bg-[#111827]/75 text-gray-100' : 'bg-[#FFD700]/90 text-black'}`}>
                                        加载中
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-8">
                            <div className={`p-10 text-center ${surface}`}>
                                <p className={`text-xl font-black ${subText}`}>文章加载中…</p>
                            </div>
                        </div>
                        <div className="flex justify-center mt-20">
                            <div className={`${surface} px-8 py-4 text-center text-xl md:text-2xl font-black italic ${text}`}>
                                {quote}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default function HomeView({
    meta,
    metaLoaded,
    setView,
    setArticleId,
    isDarkMode,
    postsPage,
    postsLoading,
    postsError,
    onQueryChange,
    categoriesData,
    tagsData,
    recentComments,
    onScrollToPosts,
    backgroundEnabled,
    activeParent,
    setActiveParent,
    activeSub,
    setActiveSub,
    pageSize = DEFAULT_PAGE_SIZE
}) {
    const [articleListEnabled, setArticleListEnabled] = useState(false);
    const [initialArticleListReady, setInitialArticleListReady] = useState(false);
    const [initialArticleQueryRequested, setInitialArticleQueryRequested] = useState(false);
    const articleListGateRef = useRef(null);
    const heroCtaScrollInProgressRef = useRef(false);
    const initialArticleQueryRequestedRef = useRef(false);
    const initialArticleLoadingStartedRef = useRef(false);
    const footerInfo = meta?.footer || {};
    const footerYear = footerInfo.year || new Date().getFullYear();
    const footerBrand = footerInfo.brand || 'SANGUI BLOG';
    const footerCopyright = footerInfo.copyrightText
        || `Copyright (c) ${footerYear} ${footerBrand} All rights reserved.`;
    const footerIcpNumber = footerInfo.icpNumber;
    const footerIcpLink = footerInfo.icpLink || 'https://beian.miit.gov.cn/';
    const footerPoweredBy = footerInfo.poweredBy || 'Powered by Spring Boot 3 & React 19';

    const siteVersion = meta?.version || 'V2.2.22';
    const heroTagline = meta?.heroTagline || DEFAULT_HERO_TAGLINE;
    const homeQuote = meta?.homeQuote || DEFAULT_HOME_QUOTE;
    const homeBackgroundUrl = meta?.homeBackgroundUrl || null;

    const requestInitialArticleList = useCallback(() => {
        if (initialArticleQueryRequestedRef.current) return;
        if (typeof onQueryChange !== 'function') {
            setInitialArticleListReady(true);
            return;
        }
        initialArticleQueryRequestedRef.current = true;
        initialArticleLoadingStartedRef.current = false;
        setInitialArticleQueryRequested(true);
        setInitialArticleListReady(false);
        onQueryChange({ page: 1, size: pageSize });
    }, [onQueryChange, pageSize]);

    const enableArticleList = useCallback(() => {
        setArticleListEnabled(true);
    }, []);

    useEffect(() => {
        if (articleListEnabled) return undefined;
        if (typeof window === 'undefined') {
            setInitialArticleListReady(true);
            enableArticleList();
            return undefined;
        }

        let cancelled = false;
        let observer = null;
        let idleHandle = null;
        let idleFallbackTimer = null;
        const activate = () => {
            if (cancelled) return;
            if (heroCtaScrollInProgressRef.current) return;
            requestInitialArticleList();
            enableArticleList();
            observer?.disconnect();
            window.removeEventListener('scroll', activate);
        };

        const scheduleIdleWarmup = () => {
            if (cancelled) return;
            if (typeof window.requestIdleCallback === 'function') {
                idleHandle = window.requestIdleCallback(activate, { timeout: 1200 });
            } else {
                idleFallbackTimer = window.setTimeout(activate, 700);
            }
        };

        const warmupDelayTimer = window.setTimeout(scheduleIdleWarmup, 1400);
        window.addEventListener('scroll', activate, { passive: true, once: true });

        if (typeof window.IntersectionObserver === 'function' && articleListGateRef.current) {
            observer = new window.IntersectionObserver((entries) => {
                const shouldActivate = entries.some((entry) => (
                    entry.isIntersecting
                    && (window.scrollY > 12 || entry.boundingClientRect.top < window.innerHeight * 0.92)
                ));
                if (shouldActivate) {
                    activate();
                }
            }, { root: null, rootMargin: '160px 0px', threshold: 0 });
            observer.observe(articleListGateRef.current);
        }

        return () => {
            cancelled = true;
            window.clearTimeout(warmupDelayTimer);
            window.removeEventListener('scroll', activate);
            observer?.disconnect();
            if (idleHandle !== null && typeof window.cancelIdleCallback === 'function') {
                window.cancelIdleCallback(idleHandle);
            }
            if (idleFallbackTimer !== null) {
                window.clearTimeout(idleFallbackTimer);
            }
        };
    }, [articleListEnabled, enableArticleList, requestInitialArticleList]);

    useEffect(() => {
        if (!initialArticleQueryRequestedRef.current) {
            return;
        }
        if (postsLoading) {
            initialArticleLoadingStartedRef.current = true;
            return;
        }
        if (initialArticleLoadingStartedRef.current) {
            setInitialArticleListReady(true);
        }
    }, [initialArticleListReady, postsLoading]);

    const handleHeroStartReading = useCallback(() => {
        if (typeof window !== 'undefined') {
            heroCtaScrollInProgressRef.current = true;
            requestInitialArticleList();
            if (articleListGateRef.current) {
                articleListGateRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else if (typeof onScrollToPosts === 'function') {
                onScrollToPosts();
            } else {
                document.getElementById('posts')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            window.setTimeout(() => {
                heroCtaScrollInProgressRef.current = false;
                enableArticleList();
            }, 720);
            return;
        }

        requestInitialArticleList();
        enableArticleList();
        if (typeof onScrollToPosts === 'function') {
            onScrollToPosts();
        }
    }, [enableArticleList, onScrollToPosts, requestInitialArticleList]);

    const shouldRenderArticleList = articleListEnabled && initialArticleListReady;

    return (
        <>
            <Hero
                setView={setView}
                isDarkMode={isDarkMode}
                onStartReading={handleHeroStartReading}
                version={siteVersion}
                tagline={heroTagline}
                backgroundResolved={metaLoaded}
                backgroundUrl={homeBackgroundUrl}
            />
            <div
                id="home-deferred-posts-anchor"
                ref={articleListGateRef}
                className={`relative z-20 h-px scroll-mt-0 ${isDarkMode ? 'bg-[#09111d]' : 'bg-[#f8f8fa]'}`}
                aria-hidden="true"
            />
            {shouldRenderArticleList ? (
                <Suspense fallback={<HomeArticleListPlaceholder isDarkMode={isDarkMode} stats={meta?.stats} author={meta?.author} homeQuote={homeQuote} />}>
                    <ArticleList
                        setView={setView}
                        setArticleId={setArticleId}
                        isDarkMode={isDarkMode}
                        postsPage={postsPage}
                        postsLoading={postsLoading}
                        postsError={postsError}
                        onQueryChange={onQueryChange}
                        categoriesData={categoriesData}
                        tagsData={tagsData}
                        recentComments={recentComments}
                        onScrollToPosts={onScrollToPosts}
                        backgroundEnabled={backgroundEnabled}
                        stats={meta?.stats}
                        author={meta?.author}
                        activeParent={activeParent}
                        setActiveParent={setActiveParent}
                        activeSub={activeSub}
                        setActiveSub={setActiveSub}
                        homeQuote={homeQuote}
                        pageSize={pageSize}
                        skipInitialQuery={initialArticleQueryRequested}
                    />
                </Suspense>
            ) : (
                <HomeArticleListPlaceholder isDarkMode={isDarkMode} stats={meta?.stats} author={meta?.author} homeQuote={homeQuote} />
            )}
            <SiteFooter
                isDarkMode={isDarkMode}
                brand={footerBrand}
                copyrightText={footerCopyright}
                icpNumber={footerIcpNumber}
                icpLink={footerIcpLink}
                poweredBy={footerPoweredBy}
            />
        </>
    );
}
