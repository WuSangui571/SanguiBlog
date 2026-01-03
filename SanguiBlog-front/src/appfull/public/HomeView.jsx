import React from 'react';
import Hero from './Hero.jsx';
import ArticleList from './ArticleList.jsx';
import SiteFooter from '../ui/SiteFooter.jsx';
import { DEFAULT_HERO_TAGLINE, DEFAULT_HOME_QUOTE } from '../shared.js';

export default function HomeView({
    meta,
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
    activeParent,
    setActiveParent,
    activeSub,
    setActiveSub,
    pageSize
}) {
    const footerInfo = meta?.footer || {};
    const footerYear = footerInfo.year || new Date().getFullYear();
    const footerBrand = footerInfo.brand || 'SANGUI BLOG';
    const footerCopyright = footerInfo.copyrightText
        || `Copyright (c) ${footerYear} ${footerBrand} All rights reserved.`;
    const footerIcpNumber = footerInfo.icpNumber;
    const footerIcpLink = footerInfo.icpLink || 'https://beian.miit.gov.cn/';
    const footerPoweredBy = footerInfo.poweredBy || 'Powered by Spring Boot 3 & React 19';

    const siteVersion = meta?.version || 'V2.1.278';
    const heroTagline = meta?.heroTagline || DEFAULT_HERO_TAGLINE;
    const homeQuote = meta?.homeQuote || DEFAULT_HOME_QUOTE;

    return (
        <>
            <Hero
                setView={setView}
                isDarkMode={isDarkMode}
                onStartReading={onScrollToPosts}
                version={siteVersion}
                tagline={heroTagline}
            />
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
                stats={meta?.stats}
                author={meta?.author}
                activeParent={activeParent}
                setActiveParent={setActiveParent}
                activeSub={activeSub}
                setActiveSub={setActiveSub}
                homeQuote={homeQuote}
                pageSize={pageSize}
            />
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
