import React from 'react';

export default function SiteFooter({
    isDarkMode,
    brand = 'SANGUI BLOG',
    copyrightText,
    icpNumber,
    icpLink = 'https://beian.miit.gov.cn/',
    poweredBy
}) {
    const borderClass = isDarkMode ? 'border-white/10' : 'border-slate-900/10';
    const metaTextClass = isDarkMode ? 'text-slate-400' : 'text-slate-500';
    const linkClass = isDarkMode
        ? 'text-slate-300 hover:text-slate-100'
        : 'text-slate-600 hover:text-slate-900';
    const resolvedIcpLink = (() => {
        const rawLink = typeof icpLink === 'string' ? icpLink.trim() : '';
        if (!rawLink) return 'https://beian.miit.gov.cn/';
        if (/^https?:\/\//i.test(rawLink)) return rawLink;
        if (rawLink.startsWith('//')) return `https:${rawLink}`;
        return `https://${rawLink.replace(/^\/+/, '')}`;
    })();
    const handleIcpClick = (event) => {
        if (typeof window === 'undefined') return;
        event.preventDefault();
        window.open(resolvedIcpLink, '_blank', 'noopener,noreferrer');
    };

    void brand;
    void poweredBy;

    return (
        <footer className="px-4 pt-0 pb-14">
            <div className={`mx-auto max-w-5xl border-t ${borderClass}`}>
                <div className="flex flex-col items-center gap-4 pt-8 text-center md:pt-10">
                    {copyrightText && (
                        <p className={`max-w-3xl text-sm leading-7 ${metaTextClass}`}>{copyrightText}</p>
                    )}
                    {icpNumber && (
                        <a
                            href={resolvedIcpLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={handleIcpClick}
                            className={`relative z-10 pointer-events-auto inline-flex items-center justify-center text-xs font-medium tracking-[0.14em] underline decoration-current/30 underline-offset-4 transition-colors ${linkClass}`}
                        >
                            {icpNumber}
                        </a>
                    )}
                </div>
            </div>
        </footer>
    );
}
