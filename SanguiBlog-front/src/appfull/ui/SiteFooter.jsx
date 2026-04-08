import React from 'react';

export default function SiteFooter({
    isDarkMode,
    brand = 'SANGUI BLOG',
    copyrightText,
    icpNumber,
    icpLink = 'https://beian.miit.gov.cn/',
    poweredBy
}) {
    const shellClass = `home-ios-card home-ios-card--static mx-auto w-[min(1120px,calc(100%-2rem))] px-6 py-8 md:px-10 md:py-10 ${
        isDarkMode
            ? 'home-ios-card--dark text-slate-100'
            : 'text-slate-900'
    }`;
    const metaTextClass = isDarkMode ? 'text-slate-300' : 'text-slate-600';
    const linkClass = isDarkMode
        ? 'border-white/12 bg-white/6 text-slate-100 hover:bg-white/10'
        : 'border-black/8 bg-white/58 text-slate-800 hover:bg-white/72';

    return (
        <footer className="px-4 pt-14 pb-14">
            <div className={shellClass}>
                <div className="flex flex-col items-center text-center">
                    <div className={`mb-3 inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] ${
                        isDarkMode
                            ? 'border-white/12 bg-white/6 text-slate-300'
                            : 'border-black/8 bg-white/58 text-slate-500'
                    }`}>
                        Site Footer
                    </div>
                    <h2 className="mb-3 text-2xl font-black tracking-[-0.04em] md:text-3xl">{brand}</h2>
                    {copyrightText && (
                        <p className={`max-w-3xl text-sm leading-6 ${metaTextClass}`}>{copyrightText}</p>
                    )}
                    {icpNumber && (
                        <a
                            href={icpLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`mt-4 inline-flex items-center justify-center rounded-full border px-4 py-2 text-xs font-semibold tracking-[0.16em] transition-colors ${linkClass}`}
                        >
                            {icpNumber}
                        </a>
                    )}
                    {poweredBy && (
                        <p className={`mt-4 text-xs tracking-[0.16em] ${metaTextClass}`}>
                            {poweredBy}
                        </p>
                    )}
                </div>
            </div>
        </footer>
    );
}
