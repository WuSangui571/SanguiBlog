import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Hero from './Hero.jsx';
import SiteFooter from '../ui/SiteFooter.jsx';
import { DEFAULT_HERO_TAGLINE, DEFAULT_HOME_QUOTE } from '../shared.js';

const ArticleList = React.lazy(() => import('./ArticleList.jsx'));

function HomeArticleListPlaceholder({ isDarkMode, articleListGateRef }) {
    return (
        <section
            id="posts"
            ref={articleListGateRef}
            className={`relative z-20 w-full px-4 py-14 md:px-8 ${isDarkMode ? 'bg-[#09111d] text-gray-100' : 'bg-[#f8f8fa] text-gray-900'}`}
        >
            <div
                className={`mx-auto max-w-7xl rounded-[28px] border px-5 py-6 text-center backdrop-blur-xl ${
                    isDarkMode
                        ? 'border-white/10 bg-white/[0.04] shadow-[0_18px_60px_rgba(0,0,0,0.24)]'
                        : 'border-white/70 bg-white/52 shadow-[0_18px_50px_rgba(15,23,42,0.08)]'
                }`}
            >
                <p className="text-xs font-black uppercase tracking-[0.24em] opacity-60">
                    Articles Preparing
                </p>
                <p className="mt-2 text-sm font-bold opacity-75">
                    文章区正在准备中，滚动后会自动加载。
                </p>
            </div>
        </section>
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
    pageSize
}) {
    const [articleListEnabled, setArticleListEnabled] = useState(false);
    const [pendingFirstPostScroll, setPendingFirstPostScroll] = useState(false);
    const articleListGateRef = useRef(null);
    const footerInfo = meta?.footer || {};
    const footerYear = footerInfo.year || new Date().getFullYear();
    const footerBrand = footerInfo.brand || 'SANGUI BLOG';
    const footerCopyright = footerInfo.copyrightText
        || `Copyright (c) ${footerYear} ${footerBrand} All rights reserved.`;
    const footerIcpNumber = footerInfo.icpNumber;
    const footerIcpLink = footerInfo.icpLink || 'https://beian.miit.gov.cn/';
    const footerPoweredBy = footerInfo.poweredBy || 'Powered by Spring Boot 3 & React 19';

    const siteVersion = meta?.version || 'V2.2.7';
    const heroTagline = meta?.heroTagline || DEFAULT_HERO_TAGLINE;
    const homeQuote = meta?.homeQuote || DEFAULT_HOME_QUOTE;
    const homeBackgroundUrl = meta?.homeBackgroundUrl || null;

    const enableArticleList = useCallback(() => {
        setArticleListEnabled(true);
    }, []);

    useEffect(() => {
        if (articleListEnabled) return undefined;
        if (typeof window === 'undefined') {
            enableArticleList();
            return undefined;
        }

        let cancelled = false;
        let observer = null;
        let idleHandle = null;
        let idleFallbackTimer = null;
        const activate = () => {
            if (cancelled) return;
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
    }, [articleListEnabled, enableArticleList]);

    const handleHeroStartReading = useCallback(() => {
        const isMobileViewport = typeof window !== 'undefined'
            && typeof window.matchMedia === 'function'
            && window.matchMedia('(max-width: 768px)').matches;

        enableArticleList();

        if (isMobileViewport) {
            setPendingFirstPostScroll(true);
        }

        if (typeof window !== 'undefined') {
            window.requestAnimationFrame(() => {
                if (isMobileViewport) {
                    const firstPostElement = document.getElementById('home-first-post');
                    if (firstPostElement) {
                        firstPostElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        setPendingFirstPostScroll(false);
                        return;
                    }
                }
                if (typeof onScrollToPosts === 'function') {
                    onScrollToPosts();
                } else {
                    document.getElementById('posts')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
            return;
        }

        if (typeof onScrollToPosts === 'function') {
            onScrollToPosts();
        }
    }, [enableArticleList, onScrollToPosts]);

    useEffect(() => {
        if (!pendingFirstPostScroll || postsLoading) return;
        const records = Array.isArray(postsPage?.records) ? postsPage.records : [];
        if (!records.length || typeof document === 'undefined') return;
        const firstPostElement = document.getElementById('home-first-post');
        if (!firstPostElement) return;
        firstPostElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setPendingFirstPostScroll(false);
    }, [pendingFirstPostScroll, postsLoading, postsPage?.records]);

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
            {articleListEnabled ? (
                <Suspense fallback={<HomeArticleListPlaceholder isDarkMode={isDarkMode} articleListGateRef={articleListGateRef} />}>
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
                    />
                </Suspense>
            ) : (
                <HomeArticleListPlaceholder isDarkMode={isDarkMode} articleListGateRef={articleListGateRef} />
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
